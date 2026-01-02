# ERC20 Airdrop

## Overview

This example demonstrates an ERC20 token airdrop system powered by Chainlink CRE (Chainlink Runtime Environment). The system uses merkle proofs for efficient on-chain verification and integrates with a backend server for claim management.

## Components

### contracts/

Foundry project containing:

- **AirdropToken.sol** - ERC20 token with airdrop functionality
- **ERC20Airdrop.sol** - Abstract contract handling merkle-based claims
- **ReceiverTemplate.sol** - CRE report receiver with permission controls

Key features:
- Merkle proof verification (OZ StandardMerkleTree format)
- Incremental claiming (users can claim partial amounts as allocations increase)
- Two action types: `ACTION_SET_MERKLE_ROOT` (0) and `ACTION_CLAIM` (1)

### workflows/

Two CRE workflows:

#### token-airdrop-prover/

Triggered via HTTP to sync allocations and update the merkle root:

1. Fetches allocations from Google Spreadsheet
2. Builds merkle tree from allocation data
3. Uploads proofs to backend server
4. Posts new merkle root on-chain

#### token-airdrop-claimer/

Two triggers:

1. **HTTP Trigger** - Receives claim requests from backend:
   - Validates merkle root matches contract
   - Executes claim transaction on-chain

2. **EVMLog Trigger** - Monitors `Claimed` events:
   - Notifies backend when claim is confirmed on-chain

## Setup

### Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation)
- [Bun](https://bun.sh/)
- Google Sheets API key
- Backend server running

### Environment Variables

Copy `.env.example` to `.env` in the `workflows/` directory:

```bash
CRE_ETH_PRIVATE_KEY=<your-private-key>
CRE_TARGET=demo
GOOGLE_SHEETS_API_KEY=<your-google-api-key>
AIRDROP_SERVER_API_KEY=<your-backend-api-key>
```

### Deploy Contract

```bash
cd contracts
forge build
forge script script/Deploy.s.sol --rpc-url sepolia --broadcast
```

Update `tokenAddress` in workflow configs with the deployed address.

### Run Workflows

```bash
cd workflows

# Install dependencies
bun install

# Run prover (syncs allocations and posts merkle root)
cd token-airdrop-prover
bun run simulate

# Run claimer (processes claims)
cd ../token-airdrop-claimer
bun run simulate
```

## Claim Payload Format

When triggering a claim via HTTP:

```json
{
  "address": "0x...",
  "amount": "100",
  "proof": ["0x...", "0x..."],
  "root": "0x..."
}
```

## Google Spreadsheet Format

The spreadsheet should have columns:
- `address` - Recipient wallet address
- `amount` - Token amount to allocate