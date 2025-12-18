import {
	bytesToHex,
	cre,
	encodeCallMsg,
	getNetwork,
	LATEST_BLOCK_NUMBER,
	type Runtime,
} from "@chainlink/cre-sdk";
import {
	type Address,
	decodeFunctionResult,
	encodeFunctionData,
	zeroAddress,
} from "viem";
import { AggregatorV3ABI } from "../abi/AggregatorV3";
import type { Config } from "../config";
import { ASSET_COUNT, type PriceData } from "../types";
import {
	ChainlinkFeeds,
	ETH_MAINNET_CHAIN_SELECTOR,
	FeedDecimals,
} from "./constants";

function scaleToE18(answer: bigint, decimals: number): bigint {
	const scale = 10n ** BigInt(18 - decimals);
	return answer * scale;
}

function readPriceFeed(
	runtime: Runtime<Config>,
	evmClient: InstanceType<typeof cre.capabilities.EVMClient>,
	feedAddress: Address,
): bigint {
	const result = evmClient
		.callContract(runtime, {
			call: encodeCallMsg({
				from: zeroAddress,
				to: feedAddress,
				data: encodeFunctionData({
					abi: AggregatorV3ABI,
					functionName: "latestRoundData",
				}),
			}),
			blockNumber: LATEST_BLOCK_NUMBER,
		})
		.result();

	const [, answer] = decodeFunctionResult({
		abi: AggregatorV3ABI,
		functionName: "latestRoundData",
		data: bytesToHex(result.data),
	});

	if (answer <= 0n) {
		throw new Error(`Invalid price from feed ${feedAddress}: ${answer}`);
	}

	return answer;
}

export function fetchAllPrices(runtime: Runtime<Config>): PriceData {
	const ethNetwork = getNetwork({
		chainFamily: "evm",
		chainSelectorName: ETH_MAINNET_CHAIN_SELECTOR,
		isTestnet: false,
	});

	if (!ethNetwork)
		throw new Error(`Network not found: ${ETH_MAINNET_CHAIN_SELECTOR}`);

	const ethClient = new cre.capabilities.EVMClient(
		ethNetwork.chainSelector.selector,
	);

	const btcAnswer = readPriceFeed(
		runtime,
		ethClient,
		ChainlinkFeeds.ethMainnet.btcUsd,
	);
	const ethAnswer = readPriceFeed(
		runtime,
		ethClient,
		ChainlinkFeeds.ethMainnet.ethUsd,
	);
	const linkAnswer = readPriceFeed(
		runtime,
		ethClient,
		ChainlinkFeeds.ethMainnet.linkUsd,
	);
	const daiAnswer = readPriceFeed(
		runtime,
		ethClient,
		ChainlinkFeeds.ethMainnet.daiUsd,
	);
	const uniAnswer = readPriceFeed(
		runtime,
		ethClient,
		ChainlinkFeeds.ethMainnet.uniUsd,
	);

	const prices: bigint[] = [
		scaleToE18(btcAnswer, FeedDecimals.btcUsd),
		scaleToE18(ethAnswer, FeedDecimals.ethUsd),
		scaleToE18(linkAnswer, FeedDecimals.linkUsd),
		scaleToE18(daiAnswer, FeedDecimals.daiUsd),
		scaleToE18(uniAnswer, FeedDecimals.uniUsd),
	];

	if (prices.length !== ASSET_COUNT) {
		throw new Error(`Expected ${ASSET_COUNT} prices, got ${prices.length}`);
	}

	return {
		prices,
		timestamp: BigInt(Math.floor(Date.now() / 1000)),
	};
}
