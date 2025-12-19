export interface OnChainMetrics {
	updatedAt: bigint;
	volBps: readonly bigint[];
	corrBps: readonly bigint[];
}

export interface NormalizedMetrics {
	volBps: number[];
	corrBps: number[];
}

export interface PortfolioWeights {
	low: number[];
	balanced: number[];
	high: number[];
}

export interface RiskContribution {
	weights: number[];
	marginalRisk: number[];
	riskContrib: number[];
	portfolioVol: number;
}

export type DataStatus = "loading" | "stale" | "ready";
