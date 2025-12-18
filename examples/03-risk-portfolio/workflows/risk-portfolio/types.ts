import type { Decimal } from "decimal.js";

export const ASSET_COUNT = 5;
export const PAIR_COUNT = 10;
export const WINDOW_SIZE = 30;

export type AssetIndex = 0 | 1 | 2 | 3 | 4;

export const AssetNames = ["BTC", "ETH", "LINK", "sDAI", "SHIB"] as const;
export type AssetName = (typeof AssetNames)[number];

export const CorrelationPairs: readonly [AssetIndex, AssetIndex][] = [
  [0, 1], // BTC-ETH
  [0, 2], // BTC-LINK
  [0, 3], // BTC-sDAI
  [0, 4], // BTC-SHIB
  [1, 2], // ETH-LINK
  [1, 3], // ETH-sDAI
  [1, 4], // ETH-SHIB
  [2, 3], // LINK-sDAI
  [2, 4], // LINK-SHIB
  [3, 4], // sDAI-SHIB
] as const;

export type PriceData = {
  prices: bigint[];
  timestamp: bigint;
};

export type ReturnsWindow = Decimal[][];

export type ComputedMetrics = {
  volsBps: number[];
  corrsBps: number[];
};

export type PackedMetrics = {
  packedVols: bigint;
  packedCorrs: bigint;
};
