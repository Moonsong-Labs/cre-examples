# Cross Chain Relayer

## Overview

This example shows using the Chainlink Runtime Environment for workflow automation - relaying an attestation message from Off-chain (Circle's IRIS attestation service), and submitting a transaction on a destination chain to complete the bridging transfer action.

---
## Setup

```sh
bun install
bun <cre instructions go here>
```

## Usage

Simulate the workflow with: `bun simulate` (interactive prompt)

Start the FE with: `bun start:fe`

Navigate to [http://localhost:5173](http://localhost:5173) and follow instructions

## Deployed Contracts

- `Sepolia`: [0x9f430E32ffbbe270F48048BBe64F0D8d35127D10](https://sepolia.etherscan.io/address/0x9f430e32ffbbe270f48048bbe64f0d8d35127d10#code)
- `Base Sepolia`: [0x8762FCCfF9b5C32F1FDAa31AA70c1D9d99734417](https://sepolia.basescan.org/address/0x8762fccff9b5c32f1fdaa31aa70c1d9d99734417#code)
- `Arbitrum Sepolia`: [0xf4D3aBEA2360D4f5f614F375fAd8d5d00F32be36](https://sepolia.arbiscan.io/address/0xf4d3abea2360d4f5f614f375fad8d5d00f32be36#code)

## Screenshots

## References

- [CCTP docs](https://developers.circle.com/cctp)
- [BridgeKit](https://developers.circle.com/bridge-kit/quickstarts/transfer-usdc-from-base-to-ethereum)
- [RainbowKit](https://rainbowkit.com/docs/installation)
- [Wagmi hooks](https://wagmi.sh/react/getting-started)
- [Viem Docs](https://viem.sh/docs/getting-started)
