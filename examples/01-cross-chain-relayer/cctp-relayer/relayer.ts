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
import {
	type Domain,
	ENVIRONMENT_INFO,
	type RelayerConfig,
	relayInputSchema,
} from "../common";

const onHttpTrigger = (
	runtime: Runtime<RelayerConfig>,
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

	submitSignedReport(runtime, signedReport, input.destinationDomain as Domain);

	return "Relay submitted successfully";
};

const generateSignedReport = (runtime: Runtime<RelayerConfig>, payload: Hex) =>
	runtime.report(prepareReportRequest(payload)).result();

const submitSignedReport = (
	runtime: Runtime<RelayerConfig>,
	signedReport: Report,
	destinationDomain: Domain,
) => {
	if (!(destinationDomain in ENVIRONMENT_INFO)) {
		runtime.log(
			`Unsupported destination domain ${destinationDomain}, skipping chain write.`,
		);
		return;
	}

	const chainSelectorName = ENVIRONMENT_INFO[destinationDomain].chainSelector;
	const evm = runtime.config.evms.find(
		(e: any) => e.chainSelectorName === chainSelectorName,
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

const initWorkflow = (config: RelayerConfig) => {
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
	const runner = await Runner.newRunner<RelayerConfig>();
	await runner.run(initWorkflow);
}

main();
