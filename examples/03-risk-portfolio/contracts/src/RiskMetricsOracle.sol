// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { ReceiverTemplate } from "./ReceiverTemplate.sol";

/// @title RiskMetricsOracle
/// @notice On-chain storage for 5-asset portfolio risk metrics, updated by CRE workflows
/// @dev Gas-optimized: vols and correlations are bit-packed into single uint256 slots
///
/// Asset ordering (fixed):
///   0: BTC    1: ETH    2: LINK    3: sDAI    4: SHIB
///
/// Correlation pair ordering (10 pairs, upper triangle):
///   0: BTC-ETH   1: BTC-LINK   2: BTC-sDAI   3: BTC-SHIB
///   4: ETH-LINK  5: ETH-sDAI   6: ETH-SHIB
///   7: LINK-sDAI 8: LINK-SHIB
///   9: sDAI-SHIB
contract RiskMetricsOracle is ReceiverTemplate {
    uint8 public constant ASSET_COUNT = 5;
    uint8 public constant PAIR_COUNT = 10;

    /// @notice Report payload sent by CRE workflow via onReport()
    /// @param timestamp Unix timestamp of the report
    /// @param packedVols 5 volatilities bit-packed as uint16 (basis points, 10000 = 100%)
    /// @param packedCorrs 10 correlations bit-packed as int16 (basis points, -10000 to +10000)
    struct ReportData {
        uint64 timestamp;
        uint256 packedVols;
        uint256 packedCorrs;
    }

    /// @notice Unpacked metrics returned by latestMetrics()
    /// @param updatedAt Unix timestamp of last update
    /// @param vols Annualized volatilities in basis points [BTC, ETH, LINK, sDAI, SHIB]
    /// @param corrs Pairwise correlations in basis points (-10000 to +10000)
    struct Metrics {
        uint64 updatedAt;
        uint16[ASSET_COUNT] vols;
        int16[PAIR_COUNT] corrs;
    }

    uint64 public updatedAt;
    uint256 public packedVols;
    uint256 public packedCorrs;

    /// @notice Emitted when metrics are updated
    /// @param timestamp The timestamp from the report
    event MetricsUpdated(uint64 indexed timestamp);

    /// @inheritdoc ReceiverTemplate
    function _processReport(bytes calldata report) internal override {
        ReportData memory data = abi.decode(report, (ReportData));

        updatedAt = data.timestamp;
        packedVols = data.packedVols;
        packedCorrs = data.packedCorrs;

        emit MetricsUpdated(data.timestamp);
    }

    /// @notice Get all metrics unpacked in a single call
    /// @return metrics Struct containing timestamp, volatilities, and correlations
    function latestMetrics() external view returns (Metrics memory metrics) {
        metrics = Metrics({ updatedAt: updatedAt, vols: unpackVols(packedVols), corrs: unpackCorrs(packedCorrs) });
    }

    /// @notice Unpack volatilities from bit-packed format
    /// @param packed The packed uint256 containing 5 uint16 values
    /// @return vols Array of 5 volatilities in basis points
    function unpackVols(uint256 packed) public pure returns (uint16[ASSET_COUNT] memory vols) {
        for (uint256 i = 0; i < ASSET_COUNT; i++) {
            vols[i] = uint16(packed >> (i * 16));
        }
    }

    /// @notice Unpack correlations from bit-packed format
    /// @param packed The packed uint256 containing 10 int16 values
    /// @return corrs Array of 10 correlations in basis points
    function unpackCorrs(uint256 packed) public pure returns (int16[PAIR_COUNT] memory corrs) {
        for (uint256 i = 0; i < PAIR_COUNT; i++) {
            corrs[i] = int16(uint16(packed >> (i * 16)));
        }
    }

    /// @notice Pack volatilities into uint256 for report encoding
    /// @dev Helper for CRE workflow to encode report data
    /// @param vols Array of 5 volatilities in basis points
    /// @return packed The bit-packed uint256
    function packVols(uint16[ASSET_COUNT] memory vols) public pure returns (uint256 packed) {
        for (uint256 i = 0; i < ASSET_COUNT; i++) {
            packed |= uint256(vols[i]) << (i * 16);
        }
    }

    /// @notice Pack correlations into uint256 for report encoding
    /// @dev Helper for CRE workflow to encode report data
    /// @param corrs Array of 10 correlations in basis points
    /// @return packed The bit-packed uint256
    function packCorrs(int16[PAIR_COUNT] memory corrs) public pure returns (uint256 packed) {
        for (uint256 i = 0; i < PAIR_COUNT; i++) {
            packed |= uint256(uint16(corrs[i])) << (i * 16);
        }
    }
}
