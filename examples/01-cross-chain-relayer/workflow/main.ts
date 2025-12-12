/** biome-ignore-all lint/suspicious/noExplicitAny: boilerplate */
import {
	consensusIdenticalAggregation,
	cre,
	getNetwork,
	type NodeRuntime,
	prepareReportRequest,
	Runner,
	type Runtime,
	json as toJson,
} from "@chainlink/cre-sdk";
import {
	type Address,
	encodeAbiParameters,
	parseAbiParameters,
	zeroAddress,
} from "viem";
import {
	type CREConfig,
	type IrisAttestation,
	irisErrorSchema,
	irisResponseSchema,
} from "./schema";

// const CIRCLE_DOMAIN_TO_CHAIN_SELECTOR: Record<
// 	number,
// 	`${string}-${string}-${string}`
// > = {
// 	0: "ethereum-testnet-sepolia",
// 	3: "ethereum-testnet-sepolia-arbitrum-1",
// 	6: "ethereum-testnet-sepolia-base-1",
// };

// - `Sepolia`: [0x9f430E32ffbbe270F48048BBe64F0D8d35127D10](https://sepolia.etherscan.io/address/0x9f430e32ffbbe270f48048bbe64f0d8d35127d10#code)
// - `Base Sepolia`: [0x8762FCCfF9b5C32F1FDAa31AA70c1D9d99734417](https://sepolia.basescan.org/address/0x8762fccff9b5c32f1fdaa31aa70c1d9d99734417#code)
// - `Arbitrum Sepolia`: [0xf4D3aBEA2360D4f5f614F375fAd8d5d00F32be36](https://sepolia.arbiscan.io/address/0xf4d3abea2360d4f5f614f375fad8d5d00f32be36#code)

const ENVIRONMENT_INFO = {
	0: {
		name: "Sepolia",
		relayerAddress: "0x9f430E32ffbbe270F48048BBe64F0D8d35127D10",
		chainSelector: "ethereum-testnet-sepolia",
	},
	3: {
		name: "Arbitrum Sepolia",
		relayerAddress: "0xf4D3aBEA2360D4f5f614F375fAd8d5d00F32be36",
		chainSelector: "ethereum-testnet-sepolia-arbitrum-1",
	},
	6: {
		name: "Base Sepolia",
		relayerAddress: "0x8762FCCfF9b5C32F1FDAa31AA70c1D9d99734417",
		chainSelector: "ethereum-testnet-sepolia-base-1",
	},
} as const

type DestinationDomain = keyof typeof ENVIRONMENT_INFO;

const onCronTrigger = (runtime: Runtime<CREConfig>): IrisAttestation => {
	runtime.log("Workflow triggered.");

	const result = runtime
		.runInNodeMode(fetchIrisAttestation, consensusIdenticalAggregation())()
		.result();

	runtime.log(`Fetched Iris attestation message: ${result.message}`);

	if (
		result.destinationDomain === undefined ||
		result.message === "0x" ||
		result.attestation === "0x"
	) {
		runtime.log("IRIS attestation not ready, skipping chain write.");
		return result;
	}

	if (!(result.destinationDomain in ENVIRONMENT_INFO)) {
		runtime.log(
			`Unsupported destination domain ${result.destinationDomain}, skipping chain write.`,
		);
		return result;
	}

	const chainSelectorName =
		ENVIRONMENT_INFO[result.destinationDomain as DestinationDomain].chainSelector;
	if (!chainSelectorName) {
		runtime.log(
			`Unknown destination domain ${result.destinationDomain}, skipping chain write.`,
		);
		return result;
	}

	const evm = runtime.config.evms.find(
		(e) => e.chainSelectorName === chainSelectorName,
	);
	if (!evm) {
		runtime.log(`No EVM target configured for ${chainSelectorName}, skipping.`);
		return result;
	}

	const encodedPayload = encodeAbiParameters(
		parseAbiParameters("bytes message, bytes attestation"),
		[result.message, result.attestation],
	);

	const signedReport = runtime
		.report(prepareReportRequest(encodedPayload))
		.result();

	const network = getNetwork({
		chainFamily: "evm",
		chainSelectorName: evm.chainSelectorName,
		isTestnet: true,
	});
	if (!network) {
		runtime.log(`Network not found for ${evm.chainSelectorName}, skipping.`);
		return result;
	}

	const receiver = evm.relayerAddress as Address;
	if (receiver === zeroAddress) {
		runtime.log(
			`Relayer address not set for ${evm.chainSelectorName}, skipping.`,
		);
		return result;
	}

	const evmClient = new cre.capabilities.EVMClient(
		network.chainSelector.selector,
	);
	evmClient
		.writeReport(runtime, {
			receiver,
			report: signedReport,
			gasConfig: evm.gasLimit ? { gasLimit: evm.gasLimit } : undefined,
		})
		.result();

	runtime.log(`Submitted report to ${evm.chainSelectorName}.`);

	return result;
};

const fetchIrisAttestation = (
	nodeRuntime: NodeRuntime<CREConfig>,
): IrisAttestation => {
	const httpClient = new cre.capabilities.HTTPClient();

	// TODO: derive domain
	const domain = "0";
	const burnHash =
		"0x4ac3dfd2aeffd7a1ad0508d97a0a0a18447c7fc60be14c0ca6d7048a28566e4e";
	// TODO: derive burn hash
	nodeRuntime.log(`Using endpoint: ${nodeRuntime.config.irisUrl}`);
	const fullUrl = `${nodeRuntime.config.irisUrl}/messages/${domain}?transactionHash=${burnHash}`;
	// https://iris-api-sandbox.circle.com/v2/messages/0?transactionHash=0xd47fba15747f389e59a73ed87e4c2424b7c80d96d3b9f2bd649a4b265150de1d'
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

	const first = parsed.data.messages[0];
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

const initWorkflow = (config: CREConfig) => {
	const cron = new cre.capabilities.CronCapability();

	return [
		cre.handler(cron.trigger({ schedule: config.schedule }), onCronTrigger),
	];
};

export async function main() {
	const runner = await Runner.newRunner<CREConfig>();
	await runner.run(initWorkflow);
}

main();
