# Risk‑Balanced “Vault Mix” Dashboard (5‑Asset Risk Budgets) — Implementation Spec Card

**Product summary:** A website displays **three portfolio allocations** (“Low”, “Balanced”, “High”) across **BTC, ETH, LINK, sDAI (native share price), SHIB**, where allocations are determined by **on-chain volatility + correlation metrics** computed off-chain by **CRE workflows** and pushed on-chain to a consumer contract. No vault deployment is required.

**Key design choices (locked in):**

* 5 assets: **BTC, ETH, LINK, sDAI, SHIB**
* Prices in USD; **sDAI uses native share price** (`convertToAssets`) multiplied by **DAI/USD** for USD conversion
* **SHIB price sourced from BNB Chain** (Chainlink feed) — “Path B”
* **Risk budgeting (Option 2)** used to generate weights, but **risk budgets are defined in the front end** for three profiles
* Caps/floors applied to stabilize output
* Front end reads committed on-chain metrics and computes/validates portfolio allocations client-side (pie charts + validation)

---

## Smart Contract

### Overview and goals

* Provide a single on-chain “source of truth” for:

  * latest normalized USD prices (for transparency/debugging),
  * rolling return window (for auditability),
  * computed **annualized volatilities** and **pairwise correlations** (the metrics that drive allocations).
* Accept metric updates **only** from a CRE-delivered report (via an authorized forwarder).
* Expose lightweight read APIs for the front end:

  * latest vol vector,
  * correlation matrix (flattened),
  * metadata (timestamp, sample count, source blocks).

### Deliverable functionality

* **Receive reports** via `onReport(bytes metadata, bytes report)`:

  * update last prices,
  * write the newest return vector into a ring buffer,
  * store latest vol/corr outputs,
  * store provenance (update timestamp).
* **View functions**:

  * `latestMetrics()` → vols + correlations + timestamps + sampleCount
  * `latestPrices()` → 5 USD prices (1e18)
  * `getReturnWindow()` → flattened ring buffer (optional; useful for debugging/demo transparency)
* **Events**:

  * `MetricsUpdated(...)` emitted on each report
* **Safety controls (demo-grade)**:

  * only-forwarder gating for `onReport`

### High-level architecture

* Contract: `RiskMetricsOracle5`
* Pattern: **Receiver** contract that stores state, updated only by a trusted forwarder
* Storage:

  * `lastPricesE18[5]` (USD, 1e18)
  * `returnsE18[WINDOW][5]` ring buffer (log returns, 1e18)
  * `idx`, `count`, `windowSize` (fixed constant, e.g., 30)
  * `volBps[5]` annualized vols (basis points, where 10,000 = 100%)
  * `corrBps[10]` pairwise correlations (basis points, where 10,000 = 1.0)
  * `updatedAt`, `ethSourceBlock`, `bnbSourceBlock`, `modelVersion`

**Asset ordering (fixed):**

```
0: BTC
1: ETH
2: LINK
3: sDAI
4: SHIB
```

**Correlation pair ordering (fixed, 10 values for 5 assets):**

```
0: (BTC, ETH)
1: (BTC, LINK)
2: (BTC, sDAI)
3: (BTC, SHIB)
4: (ETH, LINK)
5: (ETH, sDAI)
6: (ETH, SHIB)
7: (LINK, sDAI)
8: (LINK, SHIB)
9: (sDAI, SHIB)
```

### Libraries, functions used

* **Solidity**

  * `abi.decode(...)` for report decoding
  * fixed-size arrays for compact state
* **Recommended OpenZeppelin**

  * `Ownable` (admin controls)
* **Chainlink/Keystone receiver interface**

  * `IReceiver` (interface with `onReport` entrypoint)

### Sample impl for important parts

#### 1) Report payload definition + decoding

> Keep the report simple. Use `int256` arrays to avoid ABI packing complexity; payload remains well under common size limits.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IReceiver {
  function onReport(bytes calldata metadata, bytes calldata report) external;
}

contract RiskMetricsOracle5 is IReceiver {
  uint8 public constant ASSET_COUNT = 5;
  uint8 public constant PAIR_COUNT  = 10;
  uint8 public constant WINDOW      = 30;

  address public immutable forwarder; // KeystoneForwarder (or equivalent authorized sender)

  uint32 public idx;
  uint32 public count;
  uint64 public updatedAt;

  bytes32 public modelVersion;

  // USD prices scaled to 1e18
  uint256[ASSET_COUNT] public lastPricesE18;

  // Log returns scaled to 1e18
  int256[ASSET_COUNT][WINDOW] private returnsE18;

  // Annualized vols in bps (10000 = 100%)
  uint256[ASSET_COUNT] public volBps;

  // Pairwise correlations in bps (-10000..10000)
  int256[PAIR_COUNT] public corrBps;

  event MetricsUpdated(
    uint64 updatedAt,
    uint32 count,
    uint32 idx
  );

  modifier onlyForwarder() {
    require(msg.sender == forwarder, "not forwarder");
    _;
  }

  constructor(address _forwarder, bytes32 _modelVersion) {
    forwarder = _forwarder;
    modelVersion = _modelVersion;
  }

  struct ReportData {
    uint256 ethBlock;
    uint256 bnbBlock;
    uint64  ts;

    uint256[ASSET_COUNT] pricesE18;
    int256[ASSET_COUNT]  returnsE18New;

    uint256[ASSET_COUNT] volBpsNew;
    int256[PAIR_COUNT]   corrBpsNew;
  }

  function onReport(bytes calldata /*metadata*/, bytes calldata report)
    external
    onlyForwarder
  {
    ReportData memory r = abi.decode(report, (ReportData));

    // Store provenance + timestamp
    updatedAt = r.ts;

    // Update ring buffer (overwrite slot idx)
    returnsE18[idx] = r.returnsE18New;

    // Advance pointer
    idx = (idx + 1) % WINDOW;
    if (count < WINDOW) count++;

    // Store latest prices and metrics
    lastPricesE18 = r.pricesE18;
    volBps = r.volBpsNew;
    corrBps = r.corrBpsNew;

    emit MetricsUpdated(updatedAt, ethSourceBlock, bnbSourceBlock, count, idx);
  }

  // Flattened return window for debugging / transparency
  function getReturnWindow() external view returns (int256[] memory out) {
    out = new int256[](WINDOW * ASSET_COUNT);
    uint256 k = 0;
    for (uint256 w = 0; w < WINDOW; w++) {
      for (uint256 a = 0; a < ASSET_COUNT; a++) {
        out[k++] = returnsE18[w][a];
      }
    }
  }

  function latestMetrics()
    external
    view
    returns (
      uint64 _updatedAt,
      uint32 _count,
      uint32 _idx,
      uint256[ASSET_COUNT] memory _volBps,
      int256[PAIR_COUNT] memory _corrBps
    )
  {
    return (updatedAt, count, idx, volBps, corrBps);
  }
}
```

#### 2) Integration-time ABI contract surfaces (minimal)

* `latestMetrics()`
* `lastPricesE18(uint8 assetIndex)`
* `getReturnWindow()` (optional)

### Integration surfaces

* **Write path**

  * `onReport(metadata, report)` called by the authorized **Forwarder** only
  * report encoding must match `ReportData` struct
* **Read path (front end)**

  * `latestMetrics()`
  * `lastPricesE18(i)` for i=0..4
  * `updatedAt`
* **Observability**

  * `MetricsUpdated` event for indexing (optional subgraph not required for demo)

---

## CRE Workflow

### Overview and goals

* On a **cron schedule**, compute and publish:

  * USD price vector (1e18),
  * return vector for the newest period (log returns, 1e18),
  * annualized vol (bps) per asset,
  * correlation (bps) between pairs.
* Use **Ethereum mainnet** for BTC/ETH/LINK/DAI + sDAI share price and **BNB Chain** for SHIB/USD.
* Keep the workflow deterministic and stable by:

  * using finalized blocks (recommended),
  * applying caps/floors to avoid degenerate metrics (especially for sDAI),
  * optionally regularizing the covariance/correlation estimate to avoid numerical instability.

### Deliverable functionality

* Daily run (recommended):

  1. Read on-chain state from `RiskMetricsOracle5` (prices + return window + count/idx).
  2. Read oracle/contract sources:

     * ETH mainnet: BTC/USD, ETH/USD, LINK/USD, DAI/USD (Chainlink feeds)
     * ETH mainnet: sDAI ERC‑4626 `convertToAssets(1e18)`
     * BNB mainnet: SHIB/USD (Chainlink feed)
  3. Normalize all prices to USD 1e18.
  4. Compute new log returns vs stored `lastPricesE18`.
  5. Construct the updated return window in memory (overwrite slot `idx`).
  6. Compute sample covariance → annualized vol + correlations.
  7. Apply:

     * **vol floor** for sDAI (and optionally for any asset),
     * correlation clamp to [-1, 1],
     * optional covariance regularization (recommended).
  8. Encode report and call `runtime.report()` + `evmClient.writeReport()`.

### High-level architecture

**Modules**

* `sources/`:

  * chainlink feed reader (AggregatorV3-style)
  * ERC‑4626 share price reader for sDAI
* `math/`:

  * fixed-point normalization utilities
  * return computation
  * covariance/correlation computation
  * regularization utilities
* `encode/`:

  * ABI encoding of `ReportData`
* `workflow.ts`:

  * cron trigger handler
  * orchestrates reads → compute → write

**Networks**

* Read networks:

  * `ethereumMainnet` (BTC/ETH/LINK/DAI feeds + sDAI)
  * `bnbMainnet` (SHIB/USD feed)
* Write network:

  * your chosen destination chain where `RiskMetricsOracle5` is deployed (testnet recommended for demo)

### Libraries, functions used

* CRE workflow runtime:

  * `runtime.report(...)`
  * `evmClient.writeReport(...)`
  * EVM read helpers (contract calls on ETH and BNB)
* Math:

  * `decimal.js` or `bignumber.js` for safe log/variance calculations
  * optionally `ml-matrix` for covariance regularization / eigenvalue clipping
* ABI encoding:

  * `ethers` (ABI coder) or equivalent

### Sample impl for important parts

#### 1) Reading Chainlink feed prices and normalizing to 1e18

```ts
// Pseudocode / important parts only

type RoundData = {
  answer: bigint;      // int256 in contract, but treat as bigint
  updatedAt: bigint;   // uint256
};

async function readChainlinkUsdPriceE18(
  client: EvmClient,
  aggregator: `0x${string}`,
  decimals: number,              // configure once (do not read every run)
  blockTag: bigint | number
): Promise<bigint> {
  const { answer } = await client.readContract<RoundData>({
    address: aggregator,
    abi: AGGREGATOR_V3_ABI,
    functionName: "latestRoundData",
    args: [],
    blockTag,
  });

  if (answer <= 0n) throw new Error("invalid answer");

  const scale = 10n ** BigInt(18 - decimals);
  return answer * scale; // USD 1e18
}
```

#### 2) sDAI native share price in USD (1e18)

```ts
async function readSDAIUsdPriceE18(
  ethClient: EvmClient,
  sDai: `0x${string}`,
  daiUsdE18: bigint,
  blockTag: bigint | number
): Promise<bigint> {
  // convertToAssets(1e18) returns DAI amount for 1e18 shares (DAI has 18 decimals)
  const daiPerShareE18 = await ethClient.readContract<bigint>({
    address: sDai,
    abi: ERC4626_ABI,
    functionName: "convertToAssets",
    args: [10n ** 18n],
    blockTag,
  });

  // sDAI_USD = (DAI/share) * (DAI/USD)
  // both are 1e18, so divide by 1e18
  return (daiPerShareE18 * daiUsdE18) / (10n ** 18n);
}
```

#### 3) Compute log return (1e18)

```ts
import Decimal from "decimal.js";

function logReturnE18(priceNewE18: bigint, priceOldE18: bigint): bigint {
  if (priceOldE18 <= 0n || priceNewE18 <= 0n) throw new Error("bad price");

  const pn = new Decimal(priceNewE18.toString());
  const po = new Decimal(priceOldE18.toString());

  // r = ln(pn/po)
  const r = pn.div(po).ln();

  // scale to 1e18
  const rE18 = r.mul("1e18").toFixed(0, Decimal.ROUND_HALF_EVEN);
  return BigInt(rE18);
}
```

#### 4) Covariance → annualized vol + correlation

Assume you have `windowReturns[WINDOW][5]` of scaled 1e18 log returns, and `n = count` samples.

```ts
function computeVolCorrFromReturns(
  returnsE18: bigint[][], // shape: n x 5 (use only n valid samples)
  annualization: number,  // 365 for daily
  volFloorBpsByAsset: number[] // e.g. [0,0,0,50,0] => sDAI >= 0.50%
) {
  const n = returnsE18.length;
  if (n < 5) throw new Error("not enough samples");

  // Convert to Decimal for clarity (demo-grade)
  const R = returnsE18.map(row => row.map(x => new Decimal(x.toString()).div("1e18")));

  const mean = (col: number) =>
    R.reduce((acc, row) => acc.plus(row[col]), new Decimal(0)).div(n);

  const mu = [0,1,2,3,4].map(mean);

  // Sample covariance (daily)
  const covDaily: Decimal[][] = Array.from({ length: 5 }, () => Array(5).fill(new Decimal(0)));
  for (let i = 0; i < 5; i++) {
    for (let j = i; j < 5; j++) {
      let s = new Decimal(0);
      for (let t = 0; t < n; t++) {
        s = s.plus(R[t][i].minus(mu[i]).mul(R[t][j].minus(mu[j])));
      }
      const c = s.div(n - 1);
      covDaily[i][j] = c;
      covDaily[j][i] = c;
    }
  }

  // Annualize covariance
  const A = new Decimal(annualization);
  const covAnn = covDaily.map(row => row.map(c => c.mul(A)));

  // Vols (annualized)
  const vol = covAnn.map((row, i) => row[i].max(0).sqrt()); // guard negative due to noise

  // Apply vol floors (bps)
  const volBps = vol.map((v, i) => {
    const bps = v.mul(10000).toNumber(); // 1.0 => 10000 bps
    return Math.max(bps, volFloorBpsByAsset[i] ?? 0);
  });

  // Correlations (bps)
  const corrBps: number[] = [];
  const pairs: [number, number][] = [
    [0,1],[0,2],[0,3],[0,4],
    [1,2],[1,3],[1,4],
    [2,3],[2,4],
    [3,4],
  ];

  for (const [i,j] of pairs) {
    const denom = vol[i].mul(vol[j]);
    const rho = denom.eq(0) ? new Decimal(0) : covAnn[i][j].div(denom);
    const rhoClamped = Decimal.min(Decimal.max(rho, -1), 1);
    corrBps.push(rhoClamped.mul(10000).toNearest(1).toNumber());
  }

  return { volBps, corrBps, covAnn };
}
```

#### 5) Encode and write report (important shape only)

```ts
async function writeMetricsReport({
  writeClient,
  consumer,
  ethBlock,
  bnbBlock,
  ts,
  pricesE18,
  returnsE18New,
  volBps,
  corrBps,
}: {
  writeClient: EvmClient;
  consumer: `0x${string}`;
  ethBlock: bigint;
  bnbBlock: bigint;
  ts: number;
  pricesE18: bigint[];      // length 5
  returnsE18New: bigint[];  // length 5
  volBps: number[];         // length 5
  corrBps: number[];        // length 10
}) {
  const report = abiEncodeReportData({
    ethBlock,
    bnbBlock,
    ts,
    pricesE18,
    returnsE18New,
    volBps,
    corrBps,
  });

  // CRE primitives (adapt to your SDK version)
  const signed = await runtime.report({ report });
  await writeClient.writeReport({
    receiver: consumer,
    report: signed.report,
    metadata: signed.metadata,
  });
}
```

### Integration surfaces

* **Inputs (reads)**

  * Ethereum mainnet:

    * Chainlink feeds: BTC/USD, ETH/USD, LINK/USD, DAI/USD
    * sDAI: `convertToAssets(1e18)`
  * BNB chain:

    * Chainlink feed: SHIB/USD
  * Destination chain:

    * `RiskMetricsOracle5.latestMetrics()`, `getReturnWindow()`, `lastPricesE18[]`
* **Outputs (writes)**

  * Destination chain:

    * report write to `RiskMetricsOracle5.onReport(...)` via forwarder
* **Config**

  * cron cadence (daily)
  * window size (30)
  * annualization factor (365)
  * vol floors and correlation clamps
  * feed addresses + decimals (configured constants)

---

## Front End

### Overview and goals

* Display **three allocations** (“Low”, “Balanced”, “High”) as pie charts derived from:

  * on-chain **vol** vector and **correlation** matrix (written by CRE),
  * **risk budgets defined in the front end**.
* Provide user confidence via:

  * visual correlation heatmap,
  * asset vols,
  * portfolio risk contribution breakdown,
  * data freshness.

### Deliverable functionality

* Read from `RiskMetricsOracle5`:

  * `volBps[5]`, `corrBps[10]`, `updatedAt`, `count`
* Compute on the client:

  * covariance matrix Σ from vols + correlations
  * three weight vectors (low/balanced/high) via **risk budgeting solver**
  * validation:

    * weights sum to 100% (within tolerance)
    * weights obey caps/floors
* Render:

  * three pie charts (Low/Balanced/High)
  * vols bar chart
  * correlation heatmap
  * “risk contribution” chart per portfolio (explains why weights differ)

### High-level architecture

* Framework: Next.js or Vite + React (either is fine)
* Wallet + reads:

  * `viem` + `wagmi` (recommended) or `ethers`
* Data fetching:

  * `@tanstack/react-query` for caching + polling (e.g., refresh every 30–60s)
* Compute layer:

  * `mathjs` or plain TS for matrix ops (5x5 is small)
  * optional `ml-matrix` for stable numeric operations
* UI:

  * Pie charts: `recharts` or `chart.js`
  * Heatmap: simple grid + CSS or a chart lib

### Libraries, functions used

* `wagmi` (wallet connection + public client)
* `viem` (contract reads)
* `react-query` (cache/polling)
* `decimal.js` (optional; helps keep solver stable)
* Charting: `recharts` (simple) or `chart.js`

### Sample impl for important parts

#### 1) Risk budgets (defined in front end)

> These are **risk contribution budgets**, not weight targets. They must sum to 1.0.

```ts
// Asset order: [BTC, ETH, LINK, sDAI, SHIB]

export const RISK_BUDGETS = {
  low:      [0.20, 0.20, 0.15, 0.35, 0.10],
  balanced: [0.25, 0.25, 0.20, 0.15, 0.15],
  high:     [0.25, 0.25, 0.20, 0.05, 0.25],
} as const;

// Caps/floors (weights, not risk budgets)
export const WEIGHT_FLOOR = [0.02, 0.02, 0.02, 0.02, 0.01]; // 1–2% floors
export const WEIGHT_CAP   = [0.40, 0.40, 0.30, 0.60, 0.15]; // allow higher sDAI in Low
```

#### 2) Build covariance matrix Σ from on-chain vols + corrs

```ts
type Metrics = {
  volBps: number[];   // length 5
  corrBps: number[];  // length 10
};

function buildCovarianceMatrix(metrics: Metrics): number[][] {
  const vol = metrics.volBps.map(bps => bps / 10000); // annualized sigma
  const pairs: [number, number][] = [
    [0,1],[0,2],[0,3],[0,4],
    [1,2],[1,3],[1,4],
    [2,3],[2,4],
    [3,4],
  ];

  // initialize 5x5
  const cov = Array.from({ length: 5 }, () => Array(5).fill(0));

  // diagonal
  for (let i = 0; i < 5; i++) cov[i][i] = vol[i] * vol[i];

  // off-diagonals from correlation
  for (let k = 0; k < pairs.length; k++) {
    const [i, j] = pairs[k];
    const rho = metrics.corrBps[k] / 10000;
    cov[i][j] = rho * vol[i] * vol[j];
    cov[j][i] = cov[i][j];
  }

  return cov;
}
```

#### 3) Risk budgeting solver (iterative; constraints enforced)

This solver finds weights whose **risk contributions** match the chosen budget vector, subject to caps/floors.

```ts
function dot(a: number[], b: number[]) {
  return a.reduce((s, x, i) => s + x * b[i], 0);
}

function matVec(M: number[][], v: number[]) {
  return M.map(row => dot(row, v));
}

function portfolioVariance(cov: number[][], w: number[]) {
  return dot(w, matVec(cov, w));
}

function normalize(w: number[]) {
  const s = w.reduce((a,b) => a + b, 0);
  return s === 0 ? w : w.map(x => x / s);
}

function projectCapsFloors(w: number[], floor: number[], cap: number[]) {
  const out = w.map((x,i) => Math.min(Math.max(x, floor[i]), cap[i]));
  return normalize(out);
}

/**
 * Risk budgeting: target RC_i = budget_i * V, where:
 *  V = w^T Σ w
 *  RC_i = w_i * (Σ w)_i
 */
export function computeRiskBudgetWeights(
  cov: number[][],
  budgets: number[],         // sum=1
  floor: number[],
  cap: number[],
  iters = 200,
  step = 0.5
) {
  // start equal-weight, then project
  let w = projectCapsFloors(normalize([1,1,1,1,1]), floor, cap);

  for (let t = 0; t < iters; t++) {
    const m = matVec(cov, w);
    const V = Math.max(portfolioVariance(cov, w), 1e-12);

    // RC_i sum to V (for PSD cov and nonnegative weights)
    const RC = w.map((wi, i) => wi * m[i]);

    // multiplicative update toward target RC
    const wNew = w.map((wi, i) => {
      const target = budgets[i] * V;
      const denom = Math.max(RC[i], 1e-12);
      const ratio = target / denom;
      return wi * Math.pow(ratio, step);
    });

    w = projectCapsFloors(wNew, floor, cap);
  }

  return w;
}
```

#### 4) Generate the three portfolios from on-chain metrics

```ts
function computeAllPortfolios(metrics: Metrics) {
  const cov = buildCovarianceMatrix(metrics);

  const low      = computeRiskBudgetWeights(cov, RISK_BUDGETS.low,      WEIGHT_FLOOR, WEIGHT_CAP);
  const balanced = computeRiskBudgetWeights(cov, RISK_BUDGETS.balanced, WEIGHT_FLOOR, WEIGHT_CAP);
  const high     = computeRiskBudgetWeights(cov, RISK_BUDGETS.high,     WEIGHT_FLOOR, WEIGHT_CAP);

  return { low, balanced, high, cov };
}
```

### Integration surfaces

* **On-chain reads**

  * `RiskMetricsOracle5.latestMetrics()` (primary)
  * optionally `lastPricesE18(i)` for price display / provenance
* **UI configuration (front-end owned)**

  * risk budgets for Low/Balanced/High
  * caps/floors (can be global or per profile)
* **Network / environment**

  * RPC URL(s) for the destination chain
  * Contract address + ABI
* **Validation / monitoring**

  * Use `updatedAt` and `count` to show:

    * “warming up” until `count >= WINDOW`
    * “stale data” if `now - updatedAt > threshold`

---

### Notes for a smooth demo

* **Warm-up UX:** For the first 30 days (or first 30 runs), correlations/vols are less stable. Your UI should show “warming up” until `count == WINDOW`.
* **Determinism:** Display `ethSourceBlock` and `bnbSourceBlock` to emphasize that the metric was computed from specific on-chain states.
* **Explainability:** Add a small panel: “We compute 30-day realized vol + correlations on-chain (via CRE) and allocate weights so risk contribution matches the chosen budget.”

