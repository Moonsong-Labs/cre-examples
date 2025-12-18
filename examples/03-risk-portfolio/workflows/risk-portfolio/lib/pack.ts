import { ASSET_COUNT, PAIR_COUNT } from "../types";

export function packVols(volsBps: number[]): bigint {
  if (volsBps.length !== ASSET_COUNT) {
    throw new Error(`Expected ${ASSET_COUNT} volatilities, got ${volsBps.length}`);
  }

  let packed = 0n;
  for (let i = 0; i < ASSET_COUNT; i++) {
    const vol = Math.round(volsBps[i]);
    if (vol < 0 || vol > 65535) {
      throw new Error(`Volatility at index ${i} out of uint16 range: ${vol}`);
    }
    packed |= BigInt(vol) << BigInt(i * 16);
  }
  return packed;
}

export function packCorrs(corrsBps: number[]): bigint {
  if (corrsBps.length !== PAIR_COUNT) {
    throw new Error(`Expected ${PAIR_COUNT} correlations, got ${corrsBps.length}`);
  }

  let packed = 0n;
  for (let i = 0; i < PAIR_COUNT; i++) {
    const corr = Math.round(corrsBps[i]);
    if (corr < -32768 || corr > 32767) {
      throw new Error(`Correlation at index ${i} out of int16 range: ${corr}`);
    }
    const unsigned = corr < 0 ? (corr + 65536) : corr;
    packed |= BigInt(unsigned) << BigInt(i * 16);
  }
  return packed;
}

export function unpackVols(packed: bigint): number[] {
  const vols: number[] = [];
  for (let i = 0; i < ASSET_COUNT; i++) {
    vols.push(Number((packed >> BigInt(i * 16)) & 0xFFFFn));
  }
  return vols;
}

export function unpackCorrs(packed: bigint): number[] {
  const corrs: number[] = [];
  for (let i = 0; i < PAIR_COUNT; i++) {
    const unsigned = Number((packed >> BigInt(i * 16)) & 0xFFFFn);
    const signed = unsigned > 32767 ? unsigned - 65536 : unsigned;
    corrs.push(signed);
  }
  return corrs;
}
