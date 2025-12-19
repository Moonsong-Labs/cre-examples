import Decimal from "decimal.js";
import { ASSET_COUNT, type ComputedMetrics, CorrelationPairs } from "../types";
import { VolFloorBps } from "./constants";

Decimal.set({ precision: 50 });

export function computeLogReturn(
	priceNew: Decimal,
	priceOld: Decimal,
): Decimal {
	if (priceOld.lte(0) || priceNew.lte(0)) {
		throw new Error("Prices must be positive");
	}
	return priceNew.div(priceOld).ln();
}

export function computeMetricsFromReturns(
	returns: Decimal[][],
	annualizationFactor: number,
): ComputedMetrics {
	const n = returns.length;
	if (n < 5) {
		throw new Error(`Need at least 5 samples, got ${n}`);
	}

	const means = computeMeans(returns);
	const covPeriod = computeCovarianceMatrix(returns, means);
	const covAnn = annualizeCovarianceMatrix(covPeriod, annualizationFactor);
	const vols = extractVolatilities(covAnn);
	const corrs = extractCorrelations(covAnn, vols);

	const volsBps = vols.map((v, i) =>
		Math.max(v.mul(10000).toNumber(), VolFloorBps[i]),
	);
	const corrsBps = corrs.map((c) => {
		const clamped = Decimal.max(Decimal.min(c, 1), -1);
		return Math.round(clamped.mul(10000).toNumber());
	});

	return { volsBps, corrsBps };
}

function computeMeans(returns: Decimal[][]): Decimal[] {
	const n = returns.length;
	return Array.from({ length: ASSET_COUNT }, (_, asset) =>
		Decimal.sum(...returns.map((row) => row[asset])).div(n),
	);
}

function computeCovarianceMatrix(
	returns: Decimal[][],
	means: Decimal[],
): Decimal[][] {
	const n = returns.length;
	const cov: Decimal[][] = Array.from({ length: ASSET_COUNT }, () =>
		Array.from({ length: ASSET_COUNT }, () => new Decimal(0)),
	);

	for (let i = 0; i < ASSET_COUNT; i++) {
		for (let j = i; j < ASSET_COUNT; j++) {
			let sum = new Decimal(0);
			for (let t = 0; t < n; t++) {
				const di = returns[t][i].minus(means[i]);
				const dj = returns[t][j].minus(means[j]);
				sum = sum.plus(di.mul(dj));
			}
			const c = sum.div(n - 1);
			cov[i][j] = c;
			cov[j][i] = c;
		}
	}

	return cov;
}

function annualizeCovarianceMatrix(
	covPeriod: Decimal[][],
	annualizationFactor: number,
): Decimal[][] {
	const A = new Decimal(annualizationFactor);
	return covPeriod.map((row) => row.map((c) => c.mul(A)));
}

function extractVolatilities(covAnn: Decimal[][]): Decimal[] {
	return covAnn.map((row, i) => {
		const variance = row[i];
		return variance.lte(0) ? new Decimal(0) : variance.sqrt();
	});
}

function extractCorrelations(covAnn: Decimal[][], vols: Decimal[]): Decimal[] {
	return CorrelationPairs.map(([i, j]) => {
		const denom = vols[i].mul(vols[j]);
		return denom.eq(0) ? new Decimal(0) : covAnn[i][j].div(denom);
	});
}
