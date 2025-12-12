import {
	consensusIdenticalAggregation,
	cre,
	type EVMLog,
	getNetwork,
	hexToBase64,
	type NodeRuntime,
	prepareReportRequest,
	type Report,
	Runner,
	type Runtime,
	json as toJson
} from "@chainlink/cre-sdk";
import invariant from "tiny-invariant";
import {
	bytesToHex,
	decodeEventLog,
	encodeFunctionData,
	type Hex,
	keccak256,
	pad,
	toHex
} from "viem";
import { abi } from "../contracts/out/Relayer.sol/IMessageTransmitterV2.json" with {
	type: "json"
};
import { tokenMessengerV2Abi } from "./abi";
import {
	type CREConfig,
	type IrisAttestation,
	irisErrorSchema,
	irisResponseSchema,
} from "./schema";

const ENVIRONMENT_INFO = {
	0: {
		name: "Sepolia",
		relayerAddress: "0x9f430E32ffbbe270F48048BBe64F0D8d35127D10",
		chainSelector: "ethereum-testnet-sepolia",
		usdcAddress: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
		blockExplorerUrl: "https://sepolia.etherscan.io",
	},
	3: {
		name: "Arbitrum Sepolia",
		relayerAddress: "0xf4D3aBEA2360D4f5f614F375fAd8d5d00F32be36",
		chainSelector: "ethereum-testnet-sepolia-arbitrum-1",
		usdcAddress: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
		blockExplorerUrl: "https://sepolia.arbiscan.io",
	},
	6: {
		name: "Base Sepolia",
		relayerAddress: "0x8762FCCfF9b5C32F1FDAa31AA70c1D9d99734417",
		chainSelector: "ethereum-testnet-sepolia-base-1",
		usdcAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
		blockExplorerUrl: "https://sepolia.basescan.org",
	},
} as const;

const TOKEN_MESSENGER_V2_TESTNET =
	"0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA" as const;

type DestinationDomain = keyof typeof ENVIRONMENT_INFO;

const onLogTrigger = (
	runtime: Runtime<CREConfig>,
	log: EVMLog,
	sourceDomain: DestinationDomain,
): IrisAttestation => {
	runtime.log("Workflow triggered.");
	const rawTopics = log.topics.map((t) => bytesToHex(t));

	const burnTx = bytesToHex(log.txHash);

	const event = decodeEventLog({
		abi: tokenMessengerV2Abi,
		data: bytesToHex(log.data),
		eventName: "DepositForBurn",
		// biome-ignore lint/suspicious/noExplicitAny: gd enough for now
		topics: rawTopics as any,
	});

	runtime.log(
		`Detected DepositForBurn event for burnToken: ${event.args.burnToken} for tx: ${burnTx}`,
	);

	// #1: Fetch bridge attestation from IRIS
	const attestation = fetchIrisAttestation(runtime, sourceDomain, burnTx);
	runtime.log(`Fetched Iris attestation message: ${attestation.message}`);

	if (
		attestation.destinationDomain === undefined ||
		attestation.message === "0x" ||
		attestation.attestation === "0x"
	) {
		runtime.log("IRIS attestation not ready, skipping chain write.");
		return attestation;
	}

	// #2: Generate MessageTransmitterV2.ReceiveMessage function call data
	const payload = encodeFunctionData({
		abi,
		functionName: "receiveMessage",
		args: [attestation.message, attestation.attestation],
	});

	runtime.log(
		`Generated MessageTransmitterV2.receiveMessage payload: ${payload.length / 2} bytes`,
	);

	// #3: Generate signed report for CRE submission
	const signedReport = generateSignedReport(runtime, payload);

	// #4: Submit signed report to target chains
	invariant(
		Object.keys(ENVIRONMENT_INFO).includes(
			String(attestation.destinationDomain),
		),
		`Unsupported destination domain ${attestation.destinationDomain}`,
	);
	submitSignedReport(
		runtime,
		signedReport,
		attestation.destinationDomain as DestinationDomain,
	);

	return attestation;
};

const fetchIrisAttestation = (
	runtime: Runtime<CREConfig>,
	sourceDomain: DestinationDomain,
	burnTx: Hex,
): IrisAttestation =>
	runtime
		.runInNodeMode(
			fetchIrisAttestationFromApi,
			consensusIdenticalAggregation(),
		)(sourceDomain, burnTx)
		.result();

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
	runtime.log(`Write report transaction succeeded: ${txHash}`);
	runtime.log(
		`View transaction at ${ENVIRONMENT_INFO[destinationDomain].blockExplorerUrl}/tx/${txHash}`,
	);

	runtime.log(`Submitted report to ${evm.chainSelectorName}.`);
};

const fetchIrisAttestationFromApi = (
	nodeRuntime: NodeRuntime<CREConfig>,
	sourceDomain: DestinationDomain,
	burnTx: Hex,
): IrisAttestation => {
	const httpClient = new cre.capabilities.HTTPClient();
	nodeRuntime.log(`Using endpoint: ${nodeRuntime.config.irisUrl}`);
	const fullUrl = `${nodeRuntime.config.irisUrl}/messages/${sourceDomain}?transactionHash=${burnTx}`;
	nodeRuntime.log(`Fetching Iris attestation from URL: ${fullUrl}`);
	const req = {
		url: fullUrl,
		method: "GET" as const,
	};

	const resp = httpClient.sendRequest(nodeRuntime, req).result();

	nodeRuntime.log(`Iris response status: ${resp.statusCode}`);

	const body = toJson(resp) as unknown;

	if (resp.statusCode !== 200) {
		const err = irisErrorSchema.safeParse(body);
		if (err.success) {
			throw new Error(`IRIS error ${err.data.code}: ${err.data.message}`);
		}
		throw new Error(`IRIS request failed with status ${resp.statusCode}`);
	}

	const parsed = irisResponseSchema.safeParse(body);
	if (!parsed.success || parsed.data.messages.length === 0) {
		throw new Error("Invalid IRIS response");
	}

	const [first] = parsed.data.messages;
	invariant(first, "Invalid IRIS response");
	if (first.attestation === "PENDING" || first.message === "0x") {
		nodeRuntime.log(
			`IRIS attestation pending (status: ${first.status ?? "unknown"}).`,
		);
		return {
			attestation: "0x",
			message: first.message,
		};
	}

	const destinationDomain = first.decodedMessage
		? Number.parseInt(first.decodedMessage.destinationDomain, 10)
		: undefined;

	nodeRuntime.log(`Attestation: ${first.attestation}`);
	nodeRuntime.log(`Message: ${first.message}`);

	return {
		attestation: first.attestation,
		message: first.message,
		destinationDomain,
	};
};

const initWorkflow = (config: CREConfig) =>
	config.evms.map(({ chainSelectorName, domain }) => {
		const network = getNetwork({
			chainFamily: "evm",
			chainSelectorName,
			isTestnet: true,
		});
		invariant(network, `Network not found for ${chainSelectorName}`);
		const evmClient = new cre.capabilities.EVMClient(
			network.chainSelector.selector,
		);
		const sourceDomain = domain as DestinationDomain;
		const env = ENVIRONMENT_INFO[sourceDomain];
		invariant(env, `Unsupported domain ${domain} for ${chainSelectorName}`);

		const depositForBurnEventHash = keccak256(
			toHex(
				"DepositForBurn(address,uint256,address,bytes32,uint32,bytes32,bytes32,uint256,uint32,bytes)"
			),
		);
		const topic1 = pad(env.usdcAddress);

		return cre.handler(
			evmClient.logTrigger({
				addresses: [hexToBase64(TOKEN_MESSENGER_V2_TESTNET)],
				confidence: "CONFIDENCE_LEVEL_LATEST",
				topics: [
					{
						values: [hexToBase64(depositForBurnEventHash)],
					},
					{
						values: [hexToBase64(topic1)],
					},
				],
			}),
			(runtime: Runtime<CREConfig>, log: EVMLog) =>
				onLogTrigger(runtime, log, sourceDomain),
		);
	});

export async function main() {
	const runner = await Runner.newRunner<CREConfig>();
	await runner.run(initWorkflow);
}

main();
