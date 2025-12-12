# Compliant ERC20 Token

## Overview

This example demonstrates a compliant ERC20 token with automated blacklist management powered by Chainlink CRE (Chainlink Runtime Environment).

The workflow monitors a Google Spreadsheet for blacklisted addresses and automatically syncs them to the on-chain token contract. When addresses are added or removed from the spreadsheet, the workflow computes the delta and submits a signed report to update the contract's blacklist.

### Components

- **contracts/** - Solidity smart contracts (Foundry project)
  - `CompliantToken.sol` - ERC20 token with blacklist functionality
  - `ERC20Blacklist.sol` - Blacklist extension for ERC20
  - `ReceiverTemplate.sol` - CRE report receiver base contract

- **workflows/** - CRE workflow (TypeScript)
  - Fetches blacklist from Google Spreadsheet
  - Reads current blacklist from on-chain contract
  - Computes delta and publishes signed report to update the contract