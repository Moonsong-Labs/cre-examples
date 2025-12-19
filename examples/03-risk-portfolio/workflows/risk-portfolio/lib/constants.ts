import type { Address } from "viem";

export const ETH_MAINNET_CHAIN_SELECTOR = "ethereum-mainnet";

export const ChainlinkFeeds = {
	ethMainnet: {
		btcUsd: "0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c" as Address,
		ethUsd: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419" as Address,
		linkUsd: "0x2c1d072e956AFFC0D435Cb7AC38EF18d24d9127c" as Address,
		daiUsd: "0xAed0c38402a5d19df6E4c03F4E2DceD6e29c1ee9" as Address,
		uniUsd: "0x553303d460EE0afB37EdFf9bE42922D8FF63220e" as Address,
	},
} as const;

export const FeedDecimals = {
	btcUsd: 8,
	ethUsd: 8,
	linkUsd: 8,
	daiUsd: 8,
	uniUsd: 8,
} as const;

export const VolFloorBps: readonly number[] = [0, 0, 0, 50, 0];

export const ALIGNMENT_TOLERANCE_SECONDS = 4n * 24n * 60n * 60n; // 4 days
export const ANCHOR_LOOKBACK_DAYS = 90;
export const FREQUENCY_ESTIMATION_DAYS = 30;
export const PHASE_OFFSET = 64n;
export const MAX_ANCHOR_ROUNDS = 20;
export const TARGET_OBSERVATIONS = 25;

export const EstimatedRoundsPerDay: Record<string, number> = {
	btcUsd: 47,
	ethUsd: 73,
	linkUsd: 51,
	daiUsd: 24,
	uniUsd: 30,
};
