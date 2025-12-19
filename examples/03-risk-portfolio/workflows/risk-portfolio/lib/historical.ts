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
	type Hex,
	zeroAddress,
} from "viem";
import { AggregatorV3ABI } from "../abi/AggregatorV3";
import { MULTICALL3_ADDRESS, Multicall3ABI } from "../abi/Multicall3";
import type { Config } from "../config";
import { type AlignedObservation, ASSET_COUNT, type RoundData } from "../types";
import {
	ALIGNMENT_TOLERANCE_SECONDS,
	ANCHOR_LOOKBACK_DAYS,
	ChainlinkFeeds,
	EstimatedRoundsPerDay,
	ETH_MAINNET_CHAIN_SELECTOR,
	FeedDecimals,
	PHASE_OFFSET,
	TARGET_OBSERVATIONS,
} from "./constants";
import { computeLogReturn } from "./math";

type FeedConfig = {
	address: Address;
	decimals: number;
	name: string;
	key: string;
};

type MulticallResult = {
	success: boolean;
	returnData: Hex;
};

const FEEDS: FeedConfig[] = [
	{
		address: ChainlinkFeeds.ethMainnet.btcUsd,
		decimals: FeedDecimals.btcUsd,
		name: "BTC",
		key: "btcUsd",
	},
	{
		address: ChainlinkFeeds.ethMainnet.ethUsd,
		decimals: FeedDecimals.ethUsd,
		name: "ETH",
		key: "ethUsd",
	},
	{
		address: ChainlinkFeeds.ethMainnet.linkUsd,
		decimals: FeedDecimals.linkUsd,
		name: "LINK",
		key: "linkUsd",
	},
	{
		address: ChainlinkFeeds.ethMainnet.daiUsd,
		decimals: FeedDecimals.daiUsd,
		name: "sDAI",
		key: "daiUsd",
	},
	{
		address: ChainlinkFeeds.ethMainnet.uniUsd,
		decimals: FeedDecimals.uniUsd,
		name: "UNI",
		key: "uniUsd",
	},
];

function parseRoundId(roundId: bigint): {
	phaseId: bigint;
	aggregatorRoundId: bigint;
} {
	const phaseId = roundId >> PHASE_OFFSET;
	const aggregatorRoundId = roundId & ((1n << PHASE_OFFSET) - 1n);
	return { phaseId, aggregatorRoundId };
}

function makeRoundId(phaseId: bigint, aggregatorRoundId: bigint): bigint {
	return (phaseId << PHASE_OFFSET) | aggregatorRoundId;
}

function scaleToE18(answer: bigint, decimals: number): bigint {
	return answer * 10n ** BigInt(18 - decimals);
}

function executeMulticall(
	runtime: Runtime<Config>,
	evmClient: InstanceType<typeof cre.capabilities.EVMClient>,
	calls: Array<{ target: Address; allowFailure: boolean; callData: Hex }>,
): MulticallResult[] {
	if (calls.length === 0) return [];

	const result = evmClient
		.callContract(runtime, {
			call: encodeCallMsg({
				from: zeroAddress,
				to: MULTICALL3_ADDRESS,
				data: encodeFunctionData({
					abi: Multicall3ABI,
					functionName: "aggregate3",
					args: [calls],
				}),
			}),
			blockNumber: LATEST_BLOCK_NUMBER,
		})
		.result();

	const decoded = decodeFunctionResult({
		abi: Multicall3ABI,
		functionName: "aggregate3",
		data: bytesToHex(result.data),
	});

	return decoded as MulticallResult[];
}

function fetchSpacedRoundsForAllFeeds(
	runtime: Runtime<Config>,
	evmClient: InstanceType<typeof cre.capabilities.EVMClient>,
	lookbackDays: number,
	targetCount: number,
): Map<Address, RoundData[]> {
	const latestCalls = FEEDS.map((feed) => ({
		target: feed.address,
		allowFailure: false,
		callData: encodeFunctionData({
			abi: AggregatorV3ABI,
			functionName: "latestRoundData",
		}),
	}));

	const latestResults = executeMulticall(runtime, evmClient, latestCalls);
	const latestRounds: Map<Address, RoundData> = new Map();

	for (let i = 0; i < FEEDS.length; i++) {
		const [roundId, answer, , updatedAt] = decodeFunctionResult({
			abi: AggregatorV3ABI,
			functionName: "latestRoundData",
			data: latestResults[i].returnData,
		});
		latestRounds.set(FEEDS[i].address, { roundId, answer, updatedAt });
	}

	// Fetch more rounds than needed to have good coverage for alignment
	const oversampleFactor = 3;
	type CallMeta = { feedIndex: number };
	const historicalCalls: Array<{
		target: Address;
		allowFailure: boolean;
		callData: Hex;
	}> = [];
	const callMeta: CallMeta[] = [];

	for (let fi = 0; fi < FEEDS.length; fi++) {
		const feed = FEEDS[fi];
		const latest = latestRounds.get(feed.address)!;
		const { phaseId, aggregatorRoundId } = parseRoundId(latest.roundId);
		const estimatedRoundsPerDay = EstimatedRoundsPerDay[feed.key] || 30;
		const totalRoundsInPeriod = Math.ceil(lookbackDays * estimatedRoundsPerDay);
		const roundStep = Math.max(
			1,
			Math.floor(totalRoundsInPeriod / (targetCount * oversampleFactor)),
		);

		for (let i = 0; i < targetCount * oversampleFactor; i++) {
			const targetAggRound = aggregatorRoundId - BigInt(i * roundStep);
			if (targetAggRound < 1n) break;

			historicalCalls.push({
				target: feed.address,
				allowFailure: true,
				callData: encodeFunctionData({
					abi: AggregatorV3ABI,
					functionName: "getRoundData",
					args: [makeRoundId(phaseId, targetAggRound)],
				}),
			});
			callMeta.push({ feedIndex: fi });
		}
	}

	const historicalResults = executeMulticall(
		runtime,
		evmClient,
		historicalCalls,
	);
	const allRounds: Map<Address, RoundData[]> = new Map();

	for (const feed of FEEDS) {
		allRounds.set(feed.address, []);
	}

	for (let i = 0; i < historicalResults.length; i++) {
		if (!historicalResults[i].success) continue;

		const feedAddr = FEEDS[callMeta[i].feedIndex].address;
		const [roundId, answer, , updatedAt] = decodeFunctionResult({
			abi: AggregatorV3ABI,
			functionName: "getRoundData",
			data: historicalResults[i].returnData,
		});

		if (answer > 0n) {
			allRounds.get(feedAddr)?.push({ roundId, answer, updatedAt });
		}
	}

	for (const feed of FEEDS) {
		allRounds
			.get(feed.address)
			?.sort((a, b) => Number(a.updatedAt - b.updatedAt));
	}

	return allRounds;
}

function alignToFixedDailyIntervals(
	allRounds: Map<Address, RoundData[]>,
	tolerance: bigint,
	lookbackDays: number,
): AlignedObservation[] {
	const feedAddresses = FEEDS.map((f) => f.address);

	const nowSeconds = Math.floor(Date.now() / 1000);
	const todayMidnight = Math.floor(nowSeconds / 86400) * 86400;

	const targetTimestamps: bigint[] = [];
	for (let d = 0; d < lookbackDays; d++) {
		targetTimestamps.push(BigInt(todayMidnight - d * 86400));
	}
	targetTimestamps.reverse();

	const aligned: AlignedObservation[] = [];

	for (const targetTs of targetTimestamps) {
		const prices: bigint[] = [];
		const actualTimestamps: bigint[] = [];
		let allFound = true;

		for (let fi = 0; fi < FEEDS.length; fi++) {
			const feedRounds = allRounds.get(feedAddresses[fi])!;
			let closest: RoundData | null = null;
			let minDiff = tolerance + 1n;

			for (const round of feedRounds) {
				const diff =
					round.updatedAt > targetTs
						? round.updatedAt - targetTs
						: targetTs - round.updatedAt;

				if (diff < minDiff) {
					minDiff = diff;
					closest = round;
				}
			}

			if (closest && minDiff <= tolerance) {
				prices.push(scaleToE18(closest.answer, FEEDS[fi].decimals));
				actualTimestamps.push(closest.updatedAt);
			} else {
				allFound = false;
				break;
			}
		}

		if (allFound) {
			aligned.push({
				anchorTimestamp: targetTs,
				prices,
				actualTimestamps,
			});
		}
	}

	return aligned;
}

export type HistoricalReturnsResult = {
	returns: Decimal[][];
	annualizationFactor: number;
};

export function fetchHistoricalReturns(
	runtime: Runtime<Config>,
): HistoricalReturnsResult {
	const ethNetwork = getNetwork({
		chainFamily: "evm",
		chainSelectorName: ETH_MAINNET_CHAIN_SELECTOR,
		isTestnet: false,
	});

	if (!ethNetwork) {
		throw new Error(`Network not found: ${ETH_MAINNET_CHAIN_SELECTOR}`);
	}

	const ethClient = new cre.capabilities.EVMClient(
		ethNetwork.chainSelector.selector,
	);

	runtime.log("Fetching historical prices with timestamp-aligned sampling...");

	const allRounds = fetchSpacedRoundsForAllFeeds(
		runtime,
		ethClient,
		ANCHOR_LOOKBACK_DAYS,
		TARGET_OBSERVATIONS,
	);

	for (const feed of FEEDS) {
		const rounds = allRounds.get(feed.address)!;
		runtime.log(`  ${feed.name}: ${rounds.length} sampled rounds`);
	}

	runtime.log(
		"Aligning observations to fixed daily intervals (midnight UTC)...",
	);
	const aligned = alignToFixedDailyIntervals(
		allRounds,
		ALIGNMENT_TOLERANCE_SECONDS,
		ANCHOR_LOOKBACK_DAYS,
	);
	runtime.log(
		`  Got ${aligned.length} aligned observations (targeting ${ANCHOR_LOOKBACK_DAYS} daily closes)`,
	);

	if (aligned.length < 6) {
		throw new Error(
			`Insufficient aligned observations: ${aligned.length} (need at least 6)`,
		);
	}

	for (let i = 0; i < FEEDS.length; i++) {
		const feed = FEEDS[i];
		let maxDriftHours = 0;
		for (const obs of aligned) {
			const drift =
				Math.abs(Number(obs.actualTimestamps[i] - obs.anchorTimestamp)) / 3600;
			if (drift > maxDriftHours) maxDriftHours = drift;
		}
		runtime.log(
			`  ${feed.name}: max drift ${maxDriftHours.toFixed(1)} hours from anchor`,
		);
	}

	const returns: Decimal[][] = [];
	for (let i = 0; i < aligned.length - 1; i++) {
		const periodReturns: Decimal[] = [];
		for (let asset = 0; asset < ASSET_COUNT; asset++) {
			const priceOld = new Decimal(aligned[i].prices[asset].toString());
			const priceNew = new Decimal(aligned[i + 1].prices[asset].toString());
			periodReturns.push(computeLogReturn(priceNew, priceOld));
		}
		returns.push(periodReturns);
	}

	const firstTs = aligned[0].anchorTimestamp;
	const lastTs = aligned[aligned.length - 1].anchorTimestamp;
	const totalDays = Number(lastTs - firstTs) / 86400;
	const observationsPerYear = (returns.length / totalDays) * 365;

	runtime.log(
		`Computed ${returns.length} return observations over ${totalDays.toFixed(1)} days`,
	);
	runtime.log(
		`Annualization factor: ${observationsPerYear.toFixed(2)} observations/year`,
	);

	return { returns, annualizationFactor: observationsPerYear };
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

	const ethClient = new cre.capabilities.EVMClient(
		ethNetwork.chainSelector.selector,
	);

	const calls = FEEDS.map((feed) => ({
		target: feed.address,
		allowFailure: false,
		callData: encodeFunctionData({
			abi: AggregatorV3ABI,
			functionName: "latestRoundData",
		}),
	}));

	const results = executeMulticall(runtime, ethClient, calls);

	return FEEDS.map((feed, i) => {
		const [, answer] = decodeFunctionResult({
			abi: AggregatorV3ABI,
			functionName: "latestRoundData",
			data: results[i].returnData,
		});
		return scaleToE18(answer, feed.decimals);
	});
}
