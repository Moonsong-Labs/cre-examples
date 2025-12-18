import type { Address } from "viem";

export const ETH_MAINNET_CHAIN_SELECTOR = "ethereum_mainnet";
export const BNB_MAINNET_CHAIN_SELECTOR = "bnb_mainnet";

export const ChainlinkFeeds = {
  ethMainnet: {
    btcUsd: "0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c" as Address,
    ethUsd: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419" as Address,
    linkUsd: "0x2c1d072e956AFFC0D435Cb7AC38EF18d24d9127c" as Address,
    daiUsd: "0xAed0c38402a5d19df6E4c03F4E2DceD6e29c1ee9" as Address,
  },
  bnbMainnet: {
    shibUsd: "0xA615Be6cb0f3F36A641E1DaC8E0a5c4fd52dBBd2" as Address,
  },
} as const;

export const FeedDecimals = {
  btcUsd: 8,
  ethUsd: 8,
  linkUsd: 8,
  daiUsd: 8,
  shibUsd: 8,
} as const;

export const ANNUALIZATION_FACTOR = 365;

export const VolFloorBps: readonly number[] = [0, 0, 0, 50, 0];
