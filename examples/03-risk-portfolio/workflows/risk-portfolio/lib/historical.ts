import {
	bytesToHex,
	cre,
	encodeCallMsg,
	getNetwork,
	LATEST_BLOCK_NUMBER,
	type Runtime,
} from "@chainlink/cre-sdk";
import Decimal from "decimal.js";
import {
	type Address,
	decodeFunctionResult,
	encodeFunctionData,
	zeroAddress,
} from "viem";
import { AggregatorV3ABI } from "../abi/AggregatorV3";
import type { Config } from "../config";
import { ASSET_COUNT, WINDOW_SIZE } from "../types";
import {
	ChainlinkFeeds,
	ETH_MAINNET_CHAIN_SELECTOR,
	FeedDecimals,
} from "./constants";
import { computeLogReturn } from "./math";

const SECONDS_PER_DAY = 86400n;
const PHASE_OFFSET = 64n;
const ANCHOR_STEP = 100n;
const LOCAL_SEARCH_RANGE = 5n;
const MAX_TIMESTAMP_DRIFT = SECONDS_PER_DAY; // 24 hours acceptable drift

type RoundData = {
	roundId: bigint;
	answer: bigint;
	updatedAt: bigint;
};

type AnchorPoint = {
	roundId: bigint;
	timestamp: bigint;
	price: bigint;
};

type FeedConfig = {
	address: Address;
	decimals: number;
	name: string;
};

function parseRoundId(roundId: bigint): { phaseId: bigint; aggregatorRoundId: bigint } {
	const phaseId = roundId >> PHASE_OFFSET;
	const aggregatorRoundId = roundId & ((1n << PHASE_OFFSET) - 1n);
	return { phaseId, aggregatorRoundId };
}

function makeRoundId(phaseId: bigint, aggregatorRoundId: bigint): bigint {
	return (phaseId << PHASE_OFFSET) | aggregatorRoundId;
}

const FEEDS: FeedConfig[] = [
	{ address: ChainlinkFeeds.ethMainnet.btcUsd, decimals: FeedDecimals.btcUsd, name: "BTC" },
	{ address: ChainlinkFeeds.ethMainnet.ethUsd, decimals: FeedDecimals.ethUsd, name: "ETH" },
	{ address: ChainlinkFeeds.ethMainnet.linkUsd, decimals: FeedDecimals.linkUsd, name: "LINK" },
	{ address: ChainlinkFeeds.ethMainnet.daiUsd, decimals: FeedDecimals.daiUsd, name: "sDAI" },
	{ address: ChainlinkFeeds.ethMainnet.uniUsd, decimals: FeedDecimals.uniUsd, name: "UNI" },
];

function scaleToE18(answer: bigint, decimals: number): bigint {
	return answer * 10n ** BigInt(18 - decimals);
}

function callGetRoundData(
	runtime: Runtime<Config>,
	evmClient: InstanceType<typeof cre.capabilities.EVMClient>,
	feedAddress: Address,
	roundId: bigint,
): RoundData | null {
	try {
		const result = evmClient
			.callContract(runtime, {
				call: encodeCallMsg({
					from: zeroAddress,
					to: feedAddress,
					data: encodeFunctionData({
						abi: AggregatorV3ABI,
						functionName: "getRoundData",
						args: [roundId],
					}),
				}),
				blockNumber: LATEST_BLOCK_NUMBER,
			})
			.result();

		const [returnedRoundId, answer, , updatedAt] = decodeFunctionResult({
			abi: AggregatorV3ABI,
			functionName: "getRoundData",
			data: bytesToHex(result.data),
		});

		if (answer <= 0n) return null;

		return { roundId: returnedRoundId, answer, updatedAt };
	} catch {
		return null;
	}
}

function callLatestRoundData(
	runtime: Runtime<Config>,
	evmClient: InstanceType<typeof cre.capabilities.EVMClient>,
	feedAddress: Address,
): RoundData {
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

	const [roundId, answer, , updatedAt] = decodeFunctionResult({
		abi: AggregatorV3ABI,
		functionName: "latestRoundData",
		data: bytesToHex(result.data),
	});

	if (answer <= 0n) {
		throw new Error(`Invalid latest price from feed ${feedAddress}`);
	}

	return { roundId, answer, updatedAt };
}

function collectAnchorPoints(
	runtime: Runtime<Config>,
	evmClient: InstanceType<typeof cre.capabilities.EVMClient>,
	feed: FeedConfig,
): AnchorPoint[] {
	const latest = callLatestRoundData(runtime, evmClient, feed.address);
	const anchors: AnchorPoint[] = [{
		roundId: latest.roundId,
		timestamp: latest.updatedAt,
		price: latest.answer,
	}];

	const { phaseId, aggregatorRoundId } = parseRoundId(latest.roundId);
	let currentAggRound = aggregatorRoundId;
	const targetOldestTs = latest.updatedAt - BigInt(WINDOW_SIZE + 2) * SECONDS_PER_DAY;

	while (anchors[anchors.length - 1].timestamp > targetOldestTs && currentAggRound > ANCHOR_STEP) {
		currentAggRound -= ANCHOR_STEP;
		const round = callGetRoundData(runtime, evmClient, feed.address, makeRoundId(phaseId, currentAggRound));
		if (round) {
			anchors.push({
				roundId: round.roundId,
				timestamp: round.updatedAt,
				price: round.answer,
			});
		}
	}

	// Get round 1 as final anchor if we haven't gone far enough back
	if (anchors[anchors.length - 1].timestamp > targetOldestTs) {
		const firstRound = callGetRoundData(runtime, evmClient, feed.address, makeRoundId(phaseId, 1n));
		if (firstRound) {
			anchors.push({
				roundId: firstRound.roundId,
				timestamp: firstRound.updatedAt,
				price: firstRound.answer,
			});
		}
	}

	runtime.log(`    ${feed.name}: collected ${anchors.length} anchor points`);
	return anchors;
}

function findSurroundingAnchors(
	anchors: AnchorPoint[],
	targetTs: bigint,
): { before: AnchorPoint; after: AnchorPoint } {
	// Anchors are sorted newest to oldest
	for (let i = 0; i < anchors.length - 1; i++) {
		const newer = anchors[i];
		const older = anchors[i + 1];
		if (targetTs <= newer.timestamp && targetTs >= older.timestamp) {
			return { before: older, after: newer };
		}
	}
	// Target is outside our range - use closest anchors
	if (targetTs > anchors[0].timestamp) {
		return { before: anchors[1] || anchors[0], after: anchors[0] };
	}
	const last = anchors[anchors.length - 1];
	const secondLast = anchors[anchors.length - 2] || last;
	return { before: last, after: secondLast };
}

function localSearch(
	runtime: Runtime<Config>,
	evmClient: InstanceType<typeof cre.capabilities.EVMClient>,
	feed: FeedConfig,
	phaseId: bigint,
	startAggRound: bigint,
	targetTs: bigint,
): RoundData | null {
	let bestRound: RoundData | null = null;
	let bestDiff = BigInt(Number.MAX_SAFE_INTEGER);

	for (let offset = -LOCAL_SEARCH_RANGE; offset <= LOCAL_SEARCH_RANGE; offset++) {
		const aggRound = startAggRound + offset;
		if (aggRound < 1n) continue;

		const round = callGetRoundData(runtime, evmClient, feed.address, makeRoundId(phaseId, aggRound));
		if (round) {
			const diff = round.updatedAt > targetTs
				? round.updatedAt - targetTs
				: targetTs - round.updatedAt;
			if (diff < bestDiff) {
				bestDiff = diff;
				bestRound = round;
			}
		}
	}

	return bestRound;
}

function findPriceAtTimestamp(
	runtime: Runtime<Config>,
	evmClient: InstanceType<typeof cre.capabilities.EVMClient>,
	feed: FeedConfig,
	anchors: AnchorPoint[],
	targetTs: bigint,
): { price: bigint; actualTs: bigint } {
	const { before, after } = findSurroundingAnchors(anchors, targetTs);

	// Interpolate round ID between anchors
	const timeRange = after.timestamp - before.timestamp;
	const targetOffset = targetTs - before.timestamp;
	const timeFraction = timeRange > 0n ? Number(targetOffset) / Number(timeRange) : 0.5;

	const { aggregatorRoundId: beforeAgg, phaseId } = parseRoundId(before.roundId);
	const { aggregatorRoundId: afterAgg } = parseRoundId(after.roundId);
	const roundRange = afterAgg - beforeAgg;
	const estimatedAgg = beforeAgg + BigInt(Math.round(Number(roundRange) * timeFraction));

	// Fetch estimated round
	const round = callGetRoundData(runtime, evmClient, feed.address, makeRoundId(phaseId, estimatedAgg));

	if (round) {
		const drift = round.updatedAt > targetTs
			? round.updatedAt - targetTs
			: targetTs - round.updatedAt;

		if (drift <= MAX_TIMESTAMP_DRIFT) {
			return { price: scaleToE18(round.answer, feed.decimals), actualTs: round.updatedAt };
		}

		// Estimate is off, do local search
		const better = localSearch(runtime, evmClient, feed, phaseId, estimatedAgg, targetTs);
		if (better) {
			return { price: scaleToE18(better.answer, feed.decimals), actualTs: better.updatedAt };
		}
	}

	// Fallback: use closest anchor
	const closerAnchor = (targetTs - before.timestamp < after.timestamp - targetTs) ? before : after;
	return { price: scaleToE18(closerAnchor.price, feed.decimals), actualTs: closerAnchor.timestamp };
}

function fetchHistoricalPricesForFeed(
	runtime: Runtime<Config>,
	evmClient: InstanceType<typeof cre.capabilities.EVMClient>,
	feed: FeedConfig,
): bigint[] {
	// Phase 1: Collect anchor points
	const anchors = collectAnchorPoints(runtime, evmClient, feed);

	if (anchors.length < 2) {
		throw new Error(`Insufficient anchor points for ${feed.name}`);
	}

	const nowTs = anchors[0].timestamp;
	const prices: bigint[] = [];

	// Phase 2: Find price at each target timestamp
	for (let i = WINDOW_SIZE; i >= 0; i--) {
		const targetTs = nowTs - BigInt(i) * SECONDS_PER_DAY;
		const { price, actualTs } = findPriceAtTimestamp(runtime, evmClient, feed, anchors, targetTs);

		const driftHours = Math.abs(Number(actualTs - targetTs)) / 3600;
		if (driftHours > 6) {
			runtime.log(`    ${feed.name} day ${WINDOW_SIZE - i}: drift ${driftHours.toFixed(1)}h`);
		}

		prices.push(price);
	}

	return prices;
}

export function fetchHistoricalReturns(runtime: Runtime<Config>): Decimal[][] {
	const ethNetwork = getNetwork({
		chainFamily: "evm",
		chainSelectorName: ETH_MAINNET_CHAIN_SELECTOR,
		isTestnet: false,
	});

	if (!ethNetwork) {
		throw new Error(`Network not found: ${ETH_MAINNET_CHAIN_SELECTOR}`);
	}

	const ethClient = new cre.capabilities.EVMClient(ethNetwork.chainSelector.selector);

	runtime.log("Fetching historical prices using anchor-based interpolation...");

	// Fetch historical prices for each asset
	const allPrices: bigint[][] = [];
	for (const feed of FEEDS) {
		const prices = fetchHistoricalPricesForFeed(runtime, ethClient, feed);
		allPrices.push(prices);
	}

	// Convert prices to log returns
	const returns: Decimal[][] = [];

	for (let day = 0; day < WINDOW_SIZE; day++) {
		const dayReturns: Decimal[] = [];
		for (let asset = 0; asset < ASSET_COUNT; asset++) {
			const priceOld = new Decimal(allPrices[asset][day].toString());
			const priceNew = new Decimal(allPrices[asset][day + 1].toString());
			const logReturn = computeLogReturn(priceNew, priceOld);
			dayReturns.push(logReturn);
		}
		returns.push(dayReturns);
	}

	return returns;
}

export function getLatestPricesFromHistory(runtime: Runtime<Config>): bigint[] {
	const ethNetwork = getNetwork({
		chainFamily: "evm",
		chainSelectorName: ETH_MAINNET_CHAIN_SELECTOR,
		isTestnet: false,
	});

	if (!ethNetwork) {
		throw new Error(`Network not found: ${ETH_MAINNET_CHAIN_SELECTOR}`);
	}

	const ethClient = new cre.capabilities.EVMClient(ethNetwork.chainSelector.selector);

	return FEEDS.map((feed) => {
		const latest = callLatestRoundData(runtime, ethClient, feed.address);
		return scaleToE18(latest.answer, feed.decimals);
	});
}
