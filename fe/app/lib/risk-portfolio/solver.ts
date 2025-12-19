import { RISK_APPETITES, WEIGHT_FLOOR } from "./constants";
import type { RiskContribution } from "./types";

function dot(a: number[], b: number[]): number {
	return a.reduce((s, x, i) => s + x * b[i], 0);
}

function matVec(M: number[][], v: number[]): number[] {
	return M.map((row) => dot(row, v));
}

function portfolioVariance(cov: number[][], w: number[]): number {
	return dot(w, matVec(cov, w));
}

function applyFloors(weights: number[], floor: readonly number[]): number[] {
	const floored = weights.map((w, i) => Math.max(w, floor[i]));
	const sum = floored.reduce((a, b) => a + b, 0);
	return floored.map((w) => w / sum);
}

function extractVolatilities(cov: number[][]): number[] {
	return cov.map((row, i) => Math.sqrt(row[i]));
}

function extractCorrelationMatrix(cov: number[][]): number[][] {
	const n = cov.length;
	const vols = extractVolatilities(cov);
	const corr: number[][] = [];

	for (let i = 0; i < n; i++) {
		corr[i] = [];
		for (let j = 0; j < n; j++) {
			if (i === j) {
				corr[i][j] = 1;
			} else {
				const denom = vols[i] * vols[j];
				corr[i][j] = denom > 0 ? cov[i][j] / denom : 0;
			}
		}
	}

	return corr;
}

function computeAvgCorrelation(corrMatrix: number[][]): number[] {
	const n = corrMatrix.length;
	return corrMatrix.map((row, i) => {
		let sum = 0;
		for (let j = 0; j < n; j++) {
			if (i !== j) {
				sum += Math.abs(row[j]);
			}
		}
		return sum / (n - 1);
	});
}

export function computeVolCorrWeights(
	cov: number[][],
	riskAppetite: number,
	floor: readonly number[] = WEIGHT_FLOOR,
): number[] {
	const vols = extractVolatilities(cov);
	const corrMatrix = extractCorrelationMatrix(cov);
	const avgCorr = computeAvgCorrelation(corrMatrix);

	const volFactor = vols.map((v) => Math.max(v, 0.0001) ** riskAppetite);

	const divScore = avgCorr.map((ac) => Math.max(0.05, 1 - ac));
	const corrExponent = -riskAppetite * 0.6;
	const corrFactor = divScore.map((ds) => ds ** corrExponent);

	const raw = volFactor.map((vf, i) => vf * corrFactor[i]);
	const sum = raw.reduce((a, b) => a + b, 0);
	const normalized = raw.map((r) => r / sum);

	return applyFloors(normalized, floor);
}

export function computeAllPortfolios(cov: number[][]): {
	low: number[];
	balanced: number[];
	high: number[];
} {
	return {
		low: computeVolCorrWeights(cov, RISK_APPETITES.low),
		balanced: computeVolCorrWeights(cov, RISK_APPETITES.balanced),
		high: computeVolCorrWeights(cov, RISK_APPETITES.high),
	};
}

export function computeRiskContribution(
	cov: number[][],
	weights: number[],
): RiskContribution {
	const m = matVec(cov, weights);
	const V = portfolioVariance(cov, weights);
	const portfolioVol = Math.sqrt(V);

	const marginalRisk = m.map((mi) => mi / (portfolioVol || 1e-12));
	const riskContrib = weights.map((w, i) => (w * m[i]) / (V || 1e-12));

	return { weights, marginalRisk, riskContrib, portfolioVol };
}
