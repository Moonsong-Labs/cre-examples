import {
	bytesToHex,
	cre,
	getNetwork,
	hexToBase64,
	Runner,
	type Runtime,
	TxStatus,
} from "@chainlink/cre-sdk";
import { encodeAbiParameters } from "viem";
import { type Config, ConfigSchema } from "./config";
import { getBootstrapReturns } from "./lib/bootstrap";
import { computeMetricsFromReturns } from "./lib/math";
import { packCorrs, packVols } from "./lib/pack";
import { fetchAllPrices } from "./lib/prices";
import { AssetNames } from "./types";

const onCronTrigger = (runtime: Runtime<Config>): string => {
	runtime.log("Risk Portfolio workflow triggered");

	runtime.log("Step 1: Fetching live prices from Chainlink feeds...");
	const priceData = fetchAllPrices(runtime);

	for (let i = 0; i < priceData.prices.length; i++) {
		runtime.log(
			`  ${AssetNames[i]}: ${priceData.prices[i].toString()} (1e18 USD)`,
		);
	}

	runtime.log("Step 2: Loading bootstrap returns data...");
	const returns = getBootstrapReturns();
	runtime.log(`  Loaded ${returns.length} days of historical returns`);

	runtime.log("Step 3: Computing volatility and correlation metrics...");
	const metrics = computeMetricsFromReturns(returns);

	runtime.log("  Volatilities (bps):");
	for (let i = 0; i < metrics.volsBps.length; i++) {
		const volPercent = (metrics.volsBps[i] / 100).toFixed(2);
		runtime.log(
			`    ${AssetNames[i]}: ${metrics.volsBps[i]} bps (${volPercent}%)`,
		);
	}

	runtime.log("  Correlations (bps):");
	const pairNames = [
		"BTC-ETH",
		"BTC-LINK",
		"BTC-sDAI",
		"BTC-UNI",
		"ETH-LINK",
		"ETH-sDAI",
		"ETH-UNI",
		"LINK-sDAI",
		"LINK-UNI",
		"sDAI-UNI",
	];
	for (let i = 0; i < metrics.corrsBps.length; i++) {
		const corrPercent = (metrics.corrsBps[i] / 100).toFixed(2);
		runtime.log(
			`    ${pairNames[i]}: ${metrics.corrsBps[i]} bps (${corrPercent})`,
		);
	}

	runtime.log("Step 4: Packing metrics for on-chain storage...");
	const packedVols = packVols(metrics.volsBps);
	const packedCorrs = packCorrs(metrics.corrsBps);
	runtime.log(`  packedVols: ${packedVols.toString()}`);
	runtime.log(`  packedCorrs: ${packedCorrs.toString()}`);

	runtime.log("Step 5: Encoding and signing report...");
	const timestamp = BigInt(Math.floor(Date.now() / 1000));

	const encodedPayload = encodeAbiParameters(
		[
			{ name: "timestamp", type: "uint64" },
			{ name: "packedVols", type: "uint256" },
			{ name: "packedCorrs", type: "uint256" },
		],
		[timestamp, packedVols, packedCorrs],
	);

	const reportResponse = runtime
		.report({
			encodedPayload: hexToBase64(encodedPayload),
			encoderName: "evm",
			signingAlgo: "ecdsa",
			hashingAlgo: "keccak256",
		})
		.result();

	runtime.log("Step 6: Writing report to RiskMetricsOracle contract...");

	const network = getNetwork({
		chainFamily: "evm",
		chainSelectorName: runtime.config.chainSelectorName,
		isTestnet: true,
	});

	if (!network) {
		throw new Error(`Network not found: ${runtime.config.chainSelectorName}`);
	}

	const evmClient = new cre.capabilities.EVMClient(
		network.chainSelector.selector,
	);

	const writeResult = evmClient
		.writeReport(runtime, {
			receiver: runtime.config.oracleAddress,
			report: reportResponse,
			gasConfig: {
				gasLimit: runtime.config.gasLimit,
			},
		})
		.result();

	if (writeResult.txStatus !== TxStatus.SUCCESS) {
		throw new Error(
			`Failed to write report: ${writeResult.errorMessage || writeResult.txStatus}`,
		);
	}

	const txHash = bytesToHex(writeResult.txHash || new Uint8Array(32));
	runtime.log(`Report written successfully!`);
	runtime.log(`  Transaction hash: ${txHash}`);
	runtime.log(`  Timestamp: ${timestamp.toString()}`);

	return txHash;
};

const initWorkflow = (config: Config) => {
	const cron = new cre.capabilities.CronCapability();

	return [
		cre.handler(cron.trigger({ schedule: config.schedule }), onCronTrigger),
	];
};

export async function main() {
	const runner = await Runner.newRunner<Config>({ configSchema: ConfigSchema });
	await runner.run(initWorkflow);
}

main();
