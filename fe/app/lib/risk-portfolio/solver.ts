import { RISK_BUDGETS, WEIGHT_CAP, WEIGHT_FLOOR } from "./constants";
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

function normalize(w: number[]): number[] {
	const s = w.reduce((a, b) => a + b, 0);
	return s === 0 ? w : w.map((x) => x / s);
}

function projectCapsFloors(
	w: number[],
	floor: number[],
	cap: number[],
): number[] {
	const out = w.map((x, i) => Math.min(Math.max(x, floor[i]), cap[i]));
	return normalize(out);
}

export function computeRiskBudgetWeights(
	cov: number[][],
	budgets: readonly number[],
	floor: number[] = WEIGHT_FLOOR,
	cap: number[] = WEIGHT_CAP,
	iters = 200,
	step = 0.5,
): number[] {
	let w = projectCapsFloors(normalize([1, 1, 1, 1, 1]), floor, cap);

	for (let t = 0; t < iters; t++) {
		const m = matVec(cov, w);
		const V = Math.max(portfolioVariance(cov, w), 1e-12);
		const RC = w.map((wi, i) => wi * m[i]);

		const wNew = w.map((wi, i) => {
			const target = budgets[i] * V;
			const denom = Math.max(RC[i], 1e-12);
			const ratio = target / denom;
			return wi * ratio ** step;
		});

		w = projectCapsFloors(wNew, floor, cap);
	}

	return w;
}

export function computeAllPortfolios(cov: number[][]): {
	low: number[];
	balanced: number[];
	high: number[];
} {
	return {
		low: computeRiskBudgetWeights(cov, RISK_BUDGETS.low),
		balanced: computeRiskBudgetWeights(cov, RISK_BUDGETS.balanced),
		high: computeRiskBudgetWeights(cov, RISK_BUDGETS.high),
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
