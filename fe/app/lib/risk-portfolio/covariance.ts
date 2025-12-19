import { CORRELATION_PAIRS } from "./constants";
import type { NormalizedMetrics } from "./types";

export function buildCovarianceMatrix(metrics: NormalizedMetrics): number[][] {
	const vol = metrics.volBps.map((bps) => bps / 10000);
	const cov = Array.from({ length: 5 }, () => Array(5).fill(0) as number[]);

	for (let i = 0; i < 5; i++) {
		cov[i][i] = vol[i] * vol[i];
	}

	for (let k = 0; k < CORRELATION_PAIRS.length; k++) {
		const [i, j] = CORRELATION_PAIRS[k];
		const rho = metrics.corrBps[k] / 10000;
		cov[i][j] = rho * vol[i] * vol[j];
		cov[j][i] = cov[i][j];
	}

	return cov;
}

export function normalizeMetrics(
	volBps: readonly bigint[],
	corrBps: readonly bigint[],
): NormalizedMetrics {
	return {
		volBps: volBps.map((v) => Number(v)),
		corrBps: corrBps.map((c) => Number(c)),
	};
}

export function buildCorrelationMatrix(corrBps: number[]): number[][] {
	const corr = Array.from({ length: 5 }, () => Array(5).fill(0) as number[]);

	for (let i = 0; i < 5; i++) {
		corr[i][i] = 1;
	}

	for (let k = 0; k < CORRELATION_PAIRS.length; k++) {
		const [i, j] = CORRELATION_PAIRS[k];
		const rho = corrBps[k] / 10000;
		corr[i][j] = rho;
		corr[j][i] = rho;
	}

	return corr;
}
