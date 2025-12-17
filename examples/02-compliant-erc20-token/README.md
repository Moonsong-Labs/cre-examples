# Compliant ERC20 Token

## Overview

This example demonstrates a compliant ERC20 token with allowlist management powered by Chainlink CRE (Chainlink Runtime Environment).

The workflow syncs allowed addresses from a Google Spreadsheet to the on-chain token contract. When triggered via HTTP from the UI, it fetches the current allowlist from the spreadsheet, compares it with the on-chain allowlist, computes the delta, and submits a signed report to update the contract.

### Components

- **contracts/** - Solidity smart contracts (Foundry project)
  - `CompliantToken.sol` - ERC20 token with allowlist functionality
  - `ERC20Allowlist.sol` - Allowlist extension for ERC20
  - `ReceiverTemplate.sol` - CRE report receiver base contract

- **workflows/** - CRE workflow (TypeScript)
  - Fetches allowlist from Google Spreadsheet
  - Reads current allowlist from on-chain contract
  - Computes delta and publishes signed report to update the contract