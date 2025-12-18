export const ASSETS = ["BTC", "ETH", "LINK", "sDAI", "UNI"] as const;
export type Asset = (typeof ASSETS)[number];

export const ASSET_COLORS: Record<Asset, string> = {
	BTC: "#F7931A",
	ETH: "#627EEA",
	LINK: "#2A5ADA",
	sDAI: "#4CAF50",
	UNI: "#FF007A",
};

export const CORRELATION_PAIRS: [number, number][] = [
	[0, 1],
	[0, 2],
	[0, 3],
	[0, 4],
	[1, 2],
	[1, 3],
	[1, 4],
	[2, 3],
	[2, 4],
	[3, 4],
];

export const RISK_BUDGETS = {
	low: [0.2, 0.2, 0.15, 0.35, 0.1],
	balanced: [0.25, 0.25, 0.2, 0.15, 0.15],
	high: [0.25, 0.25, 0.2, 0.05, 0.25],
} as const;

export type RiskProfile = keyof typeof RISK_BUDGETS;

export const WEIGHT_FLOOR = [0.02, 0.02, 0.02, 0.02, 0.01];
export const WEIGHT_CAP = [0.4, 0.4, 0.3, 0.3, 0.15];

export const STALE_THRESHOLD_SECONDS = 86400 * 2; // 2 days

export const MOCK_METRICS = {
	updatedAt: BigInt(Math.floor(Date.now() / 1000)),
	volBps: [4500n, 5200n, 6800n, 50n, 5500n] as readonly bigint[],
	corrBps: [
		8500n,
		7200n,
		500n,
		6000n,
		7800n,
		300n,
		5500n,
		200n,
		4800n,
		100n,
	] as readonly bigint[],
};

export const MOCK_PRICES = [
	67000n * 10n ** 18n, // BTC ~$67k
	3500n * 10n ** 18n, // ETH ~$3.5k
	15n * 10n ** 18n, // LINK ~$15
	1n * 10n ** 18n, // sDAI ~$1
	5n * 10n ** 18n, // UNI ~$5
] as readonly bigint[];
