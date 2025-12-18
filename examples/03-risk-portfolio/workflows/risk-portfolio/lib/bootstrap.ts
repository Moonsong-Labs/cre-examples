import Decimal from "decimal.js";
import { WINDOW_SIZE, ASSET_COUNT } from "../types";

// 30 days of pre-computed log returns for demo purposes
// Asset order: [BTC, ETH, LINK, sDAI, SHIB]
// Values represent daily log returns (not scaled)
// Generated to reflect realistic crypto volatility patterns:
// - BTC: ~45% annualized vol
// - ETH: ~55% annualized vol, high correlation with BTC
// - LINK: ~65% annualized vol, moderate correlation with BTC/ETH
// - sDAI: ~0.5% annualized vol (stablecoin)
// - SHIB: ~85% annualized vol, moderate correlation with market

const BOOTSTRAP_RETURNS_RAW: readonly (readonly string[])[] = [
  ["0.0123", "0.0156", "0.0189", "0.0001", "0.0312"],
  ["-0.0089", "-0.0112", "-0.0145", "0.0002", "-0.0234"],
  ["0.0234", "0.0289", "0.0345", "-0.0001", "0.0456"],
  ["-0.0156", "-0.0198", "-0.0267", "0.0001", "-0.0389"],
  ["0.0067", "0.0089", "0.0112", "0.0001", "0.0178"],
  ["0.0189", "0.0223", "0.0278", "-0.0002", "0.0367"],
  ["-0.0234", "-0.0278", "-0.0334", "0.0001", "-0.0445"],
  ["0.0145", "0.0178", "0.0223", "0.0002", "0.0289"],
  ["-0.0078", "-0.0098", "-0.0134", "-0.0001", "-0.0189"],
  ["0.0312", "0.0367", "0.0423", "0.0001", "0.0534"],
  ["-0.0178", "-0.0212", "-0.0267", "0.0002", "-0.0356"],
  ["0.0089", "0.0112", "0.0145", "-0.0001", "0.0212"],
  ["0.0056", "0.0067", "0.0089", "0.0001", "0.0134"],
  ["-0.0289", "-0.0334", "-0.0389", "-0.0002", "-0.0489"],
  ["0.0201", "0.0245", "0.0301", "0.0001", "0.0378"],
  ["-0.0112", "-0.0134", "-0.0178", "0.0001", "-0.0245"],
  ["0.0267", "0.0312", "0.0367", "-0.0001", "0.0456"],
  ["-0.0045", "-0.0056", "-0.0078", "0.0002", "-0.0112"],
  ["0.0178", "0.0212", "0.0256", "0.0001", "0.0323"],
  ["-0.0201", "-0.0245", "-0.0289", "-0.0001", "-0.0389"],
  ["0.0134", "0.0167", "0.0212", "0.0001", "0.0278"],
  ["-0.0067", "-0.0089", "-0.0112", "0.0002", "-0.0156"],
  ["0.0223", "0.0267", "0.0323", "-0.0002", "0.0412"],
  ["-0.0145", "-0.0178", "-0.0223", "0.0001", "-0.0289"],
  ["0.0098", "0.0123", "0.0156", "0.0001", "0.0201"],
  ["0.0034", "0.0045", "0.0056", "-0.0001", "0.0089"],
  ["-0.0256", "-0.0301", "-0.0356", "0.0002", "-0.0445"],
  ["0.0189", "0.0223", "0.0278", "0.0001", "0.0345"],
  ["-0.0123", "-0.0156", "-0.0189", "-0.0001", "-0.0267"],
  ["0.0156", "0.0189", "0.0234", "0.0001", "0.0301"],
] as const;

export function getBootstrapReturns(): Decimal[][] {
  if (BOOTSTRAP_RETURNS_RAW.length !== WINDOW_SIZE) {
    throw new Error(
      `Bootstrap data must have ${WINDOW_SIZE} rows, got ${BOOTSTRAP_RETURNS_RAW.length}`
    );
  }

  return BOOTSTRAP_RETURNS_RAW.map((row, dayIdx) => {
    if (row.length !== ASSET_COUNT) {
      throw new Error(
        `Day ${dayIdx} must have ${ASSET_COUNT} returns, got ${row.length}`
      );
    }
    return row.map((r) => new Decimal(r));
  });
}

export function injectLiveReturn(
  bootstrapReturns: Decimal[][],
  liveReturn: Decimal[]
): Decimal[][] {
  if (liveReturn.length !== ASSET_COUNT) {
    throw new Error(`Live return must have ${ASSET_COUNT} values`);
  }
  const updated = [...bootstrapReturns];
  updated[updated.length - 1] = liveReturn;
  return updated;
}
