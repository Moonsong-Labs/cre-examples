import Decimal from "decimal.js";
import { ASSET_COUNT, PAIR_COUNT, CorrelationPairs, type ComputedMetrics } from "../types";
import { ANNUALIZATION_FACTOR, VolFloorBps } from "./constants";

Decimal.set({ precision: 50 });

export function computeLogReturn(priceNew: Decimal, priceOld: Decimal): Decimal {
  if (priceOld.lte(0) || priceNew.lte(0)) {
    throw new Error("Prices must be positive");
  }
  return priceNew.div(priceOld).ln();
}

export function computeMetricsFromReturns(returns: Decimal[][]): ComputedMetrics {
  const n = returns.length;
  if (n < 5) {
    throw new Error(`Need at least 5 samples, got ${n}`);
  }

  const means = computeMeans(returns);
  const covDaily = computeCovarianceMatrix(returns, means);
  const covAnn = annualizeCovarianceMatrix(covDaily);
  const vols = extractVolatilities(covAnn);
  const corrs = extractCorrelations(covAnn, vols);

  const volsBps = vols.map((v, i) => Math.max(v.mul(10000).toNumber(), VolFloorBps[i]));
  const corrsBps = corrs.map((c) => {
    const clamped = Decimal.max(Decimal.min(c, 1), -1);
    return Math.round(clamped.mul(10000).toNumber());
  });

  return { volsBps, corrsBps };
}

function computeMeans(returns: Decimal[][]): Decimal[] {
  const n = returns.length;
  const means: Decimal[] = [];

  for (let asset = 0; asset < ASSET_COUNT; asset++) {
    let sum = new Decimal(0);
    for (let t = 0; t < n; t++) {
      sum = sum.plus(returns[t][asset]);
    }
    means.push(sum.div(n));
  }

  return means;
}

function computeCovarianceMatrix(returns: Decimal[][], means: Decimal[]): Decimal[][] {
  const n = returns.length;
  const cov: Decimal[][] = Array.from({ length: ASSET_COUNT }, () =>
    Array.from({ length: ASSET_COUNT }, () => new Decimal(0))
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

function annualizeCovarianceMatrix(covDaily: Decimal[][]): Decimal[][] {
  const A = new Decimal(ANNUALIZATION_FACTOR);
  return covDaily.map((row) => row.map((c) => c.mul(A)));
}

function extractVolatilities(covAnn: Decimal[][]): Decimal[] {
  return covAnn.map((row, i) => {
    const variance = row[i];
    return variance.lte(0) ? new Decimal(0) : variance.sqrt();
  });
}

function extractCorrelations(covAnn: Decimal[][], vols: Decimal[]): Decimal[] {
  const corrs: Decimal[] = [];

  for (const [i, j] of CorrelationPairs) {
    const denom = vols[i].mul(vols[j]);
    if (denom.eq(0)) {
      corrs.push(new Decimal(0));
    } else {
      corrs.push(covAnn[i][j].div(denom));
    }
  }

  return corrs;
}
