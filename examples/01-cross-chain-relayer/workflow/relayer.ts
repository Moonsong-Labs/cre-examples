import {
	cre,
	decodeJson,
	getNetwork,
	type HTTPPayload,
	prepareReportRequest,
	type Report,
	Runner,
	type Runtime,
	TxStatus,
} from "@chainlink/cre-sdk";
import invariant from "tiny-invariant";
import { bytesToHex, encodeAbiParameters, type Hex } from "viem";
import { type CREConfig, relayInputSchema } from "./schema";

const ENVIRONMENT_INFO = {
	0: {
		name: "Sepolia",
		relayerAddress: "0x9f430E32ffbbe270F48048BBe64F0D8d35127D10",
		chainSelector: "ethereum-testnet-sepolia",
		blockExplorerUrl: "https://sepolia.etherscan.io",
	},
	3: {
		name: "Arbitrum Sepolia",
		relayerAddress: "0xf4D3aBEA2360D4f5f614F375fAd8d5d00F32be36",
		chainSelector: "ethereum-testnet-sepolia-arbitrum-1",
		blockExplorerUrl: "https://sepolia.arbiscan.io",
	},
	6: {
		name: "Base Sepolia",
		relayerAddress: "0x8762FCCfF9b5C32F1FDAa31AA70c1D9d99734417",
		chainSelector: "ethereum-testnet-sepolia-base-1",
		blockExplorerUrl: "https://sepolia.basescan.org",
	},
} as const;

type DestinationDomain = keyof typeof ENVIRONMENT_INFO;

const onHttpTrigger = (
	runtime: Runtime<CREConfig>,
	payload: HTTPPayload,
): string => {
	runtime.log("Relayer workflow triggered via HTTP.");

	const rawInput = decodeJson(payload.input) as unknown;
	const parsed = relayInputSchema.safeParse(rawInput);
	if (!parsed.success) {
		const errorMsg = `Invalid input: ${parsed.error.message}`;
		runtime.log(errorMsg);
		return errorMsg;
	}

	const input = parsed.data;
	runtime.log(
		`Relay request: destinationDomain=${input.destinationDomain}, message=${input.message.slice(0, 20)}...`,
	);

	const encodedPayload = encodeAbiParameters(
		[
			{ name: "message", type: "bytes" },
			{ name: "attestation", type: "bytes" },
		],
		[input.message, input.attestation],
	);

	runtime.log(`Generated relay payload: ${encodedPayload.length / 2} bytes`);

	const signedReport = generateSignedReport(runtime, encodedPayload);

	invariant(
		Object.keys(ENVIRONMENT_INFO).includes(String(input.destinationDomain)),
		`Unsupported destination domain ${input.destinationDomain}`,
	);

	submitSignedReport(
		runtime,
		signedReport,
		input.destinationDomain as DestinationDomain,
	);

	return "Relay submitted successfully";
};

const generateSignedReport = (runtime: Runtime<CREConfig>, payload: Hex) =>
	runtime.report(prepareReportRequest(payload)).result();

const submitSignedReport = (
	runtime: Runtime<CREConfig>,
	signedReport: Report,
	destinationDomain: DestinationDomain,
) => {
	if (!(destinationDomain in ENVIRONMENT_INFO)) {
		runtime.log(
			`Unsupported destination domain ${destinationDomain}, skipping chain write.`,
		);
		return;
	}

	const chainSelectorName = ENVIRONMENT_INFO[destinationDomain].chainSelector;
	const evm = runtime.config.evms.find(
		(e) => e.chainSelectorName === chainSelectorName,
	);
	if (!evm) {
		runtime.log(`No EVM target configured for ${chainSelectorName}, skipping.`);
		return;
	}

	const network = getNetwork({
		chainFamily: "evm",
		chainSelectorName: evm.chainSelectorName,
		isTestnet: true,
	});
	if (!network) {
		runtime.log(`Network not found for ${evm.chainSelectorName}, skipping.`);
		return;
	}

	const receiver = ENVIRONMENT_INFO[destinationDomain].relayerAddress;

	const evmClient = new cre.capabilities.EVMClient(
		network.chainSelector.selector,
	);
	const writeReportResult = evmClient
		.writeReport(runtime, {
			receiver,
			report: signedReport,
			gasConfig: evm.gasLimit ? { gasLimit: evm.gasLimit } : undefined,
		})
		.result();

	const txHash = bytesToHex(writeReportResult.txHash || new Uint8Array(32));
	const txStatus = writeReportResult.txStatus;
	const errorMessage = writeReportResult.errorMessage;

	runtime.log(`Transaction status: ${TxStatus[txStatus]}`);

	if (txStatus === TxStatus.SUCCESS) {
		runtime.log(`Write report transaction succeeded: ${txHash}`);
		runtime.log(
			`View transaction at ${ENVIRONMENT_INFO[destinationDomain].blockExplorerUrl}/tx/${txHash}`,
		);
	} else {
		runtime.log(`Write report transaction FAILED: ${txHash}`);
		runtime.log(`Error: ${errorMessage ?? "unknown"}`);
		runtime.log(
			`View failed tx at ${ENVIRONMENT_INFO[destinationDomain].blockExplorerUrl}/tx/${txHash}`,
		);
	}

	runtime.log(`Submitted report to ${evm.chainSelectorName}.`);
};

const initWorkflow = (config: CREConfig) => {
	const httpTrigger = new cre.capabilities.HTTPCapability();

	return [
		cre.handler(
			httpTrigger.trigger({
				authorizedKeys: [
					{
						type: "KEY_TYPE_ECDSA_EVM",
						publicKey: config.authorizedAddress,
					},
				],
			}),
			onHttpTrigger,
		),
	];
};

export async function main() {
	const runner = await Runner.newRunner<CREConfig>();
	await runner.run(initWorkflow);
}

main();
