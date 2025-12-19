// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Test } from "forge-std/Test.sol";
import { RiskMetricsOracle } from "src/RiskMetricsOracle.sol";

contract RiskMetricsOracleTest is Test {
    RiskMetricsOracle public oracle;

    address public owner;
    address public forwarder;

    // Sample data matching realistic values
    // Vols: BTC=50%, ETH=60%, LINK=80%, sDAI=0.5%, SHIB=150%
    uint16[5] sampleVols = [uint16(5000), uint16(6000), uint16(8000), uint16(50), uint16(15_000)];

    // Correlations (basis points): typical crypto correlations
    int16[10] sampleCorrs = [
        int16(8000), // BTC-ETH: 0.80
        int16(6000), // BTC-LINK: 0.60
        int16(500), // BTC-sDAI: 0.05
        int16(3000), // BTC-SHIB: 0.30
        int16(7000), // ETH-LINK: 0.70
        int16(400), // ETH-sDAI: 0.04
        int16(4000), // ETH-SHIB: 0.40
        int16(200), // LINK-sDAI: 0.02
        int16(5000), // LINK-SHIB: 0.50
        int16(100) // sDAI-SHIB: 0.01
    ];

    function setUp() public {
        owner = makeAddr("owner");
        forwarder = makeAddr("forwarder");

        vm.prank(owner);
        oracle = new RiskMetricsOracle();
    }

    // ============ Initial State ============

    function test_InitialState() public view {
        assertEq(oracle.updatedAt(), 0);
        assertEq(oracle.packedVols(), 0);
        assertEq(oracle.packedCorrs(), 0);
        assertEq(oracle.ASSET_COUNT(), 5);
        assertEq(oracle.PAIR_COUNT(), 10);
    }

    function test_Owner_IsDeployer() public view {
        assertEq(oracle.owner(), owner);
    }

    // ============ Report Processing ============

    function test_ProcessReport_UpdatesAllState() public {
        bytes memory report = _encodeReport(1000);

        oracle.onReport("", report);

        assertEq(oracle.updatedAt(), 1000);

        RiskMetricsOracle.Metrics memory m = oracle.latestMetrics();
        assertEq(m.updatedAt, 1000);

        // Verify all vols
        assertEq(m.vols[0], 5000); // BTC
        assertEq(m.vols[1], 6000); // ETH
        assertEq(m.vols[2], 8000); // LINK
        assertEq(m.vols[3], 50); // sDAI
        assertEq(m.vols[4], 15_000); // SHIB

        // Verify all correlations
        assertEq(m.corrs[0], 8000); // BTC-ETH
        assertEq(m.corrs[1], 6000); // BTC-LINK
        assertEq(m.corrs[2], 500); // BTC-sDAI
        assertEq(m.corrs[3], 3000); // BTC-SHIB
        assertEq(m.corrs[4], 7000); // ETH-LINK
        assertEq(m.corrs[5], 400); // ETH-sDAI
        assertEq(m.corrs[6], 4000); // ETH-SHIB
        assertEq(m.corrs[7], 200); // LINK-sDAI
        assertEq(m.corrs[8], 5000); // LINK-SHIB
        assertEq(m.corrs[9], 100); // sDAI-SHIB
    }

    function test_ProcessReport_EmitsEvent() public {
        bytes memory report = _encodeReport(1234);

        vm.expectEmit(true, false, false, false);
        emit RiskMetricsOracle.MetricsUpdated(1234);

        oracle.onReport("", report);
    }

    function test_ProcessReport_OverwritesPreviousData() public {
        oracle.onReport("", _encodeReport(1000));
        assertEq(oracle.updatedAt(), 1000);

        oracle.onReport("", _encodeReport(2000));
        assertEq(oracle.updatedAt(), 2000);
    }

    // ============ Packing / Unpacking ============

    function test_PackUnpackVols_RoundTrips() public view {
        uint256 packed = oracle.packVols(sampleVols);
        uint16[5] memory unpacked = oracle.unpackVols(packed);

        for (uint256 i = 0; i < 5; i++) {
            assertEq(unpacked[i], sampleVols[i]);
        }
    }

    function test_PackUnpackCorrs_RoundTrips() public view {
        uint256 packed = oracle.packCorrs(sampleCorrs);
        int16[10] memory unpacked = oracle.unpackCorrs(packed);

        for (uint256 i = 0; i < 10; i++) {
            assertEq(unpacked[i], sampleCorrs[i]);
        }
    }

    function test_PackCorrs_HandlesNegativeValues() public view {
        int16[10] memory negativeCorrs = [
            int16(-5000), // -0.50
            int16(-3000),
            int16(-1000),
            int16(0),
            int16(1000),
            int16(3000),
            int16(5000),
            int16(-10_000), // -1.00 (min)
            int16(10_000), // +1.00 (max)
            int16(-1)
        ];

        uint256 packed = oracle.packCorrs(negativeCorrs);
        int16[10] memory unpacked = oracle.unpackCorrs(packed);

        for (uint256 i = 0; i < 10; i++) {
            assertEq(unpacked[i], negativeCorrs[i]);
        }
    }

    function test_PackVols_MaxValues() public view {
        uint16[5] memory maxVols =
            [type(uint16).max, type(uint16).max, type(uint16).max, type(uint16).max, type(uint16).max];

        uint256 packed = oracle.packVols(maxVols);
        uint16[5] memory unpacked = oracle.unpackVols(packed);

        for (uint256 i = 0; i < 5; i++) {
            assertEq(unpacked[i], type(uint16).max);
        }
    }

    // ============ Access Control ============

    function test_ForwarderRestriction_BlocksUnauthorized() public {
        vm.prank(owner);
        oracle.setForwarderAddress(forwarder);

        address attacker = makeAddr("attacker");
        bytes memory report = _encodeReport(1000);

        vm.prank(attacker);
        vm.expectRevert();
        oracle.onReport("", report);
    }

    function test_ForwarderRestriction_AllowsAuthorized() public {
        vm.prank(owner);
        oracle.setForwarderAddress(forwarder);

        bytes memory report = _encodeReport(1000);

        vm.prank(forwarder);
        oracle.onReport("", report);

        assertEq(oracle.updatedAt(), 1000);
    }

    // ============ Gas Consistency ============

    function test_MultipleUpdates_ConsistentGas() public {
        // First update (cold storage)
        oracle.onReport("", _encodeReport(1000));

        // Subsequent updates should have consistent gas
        for (uint64 i = 2; i <= 10; i++) {
            oracle.onReport("", _encodeReport(i * 1000));
        }

        assertEq(oracle.updatedAt(), 10_000);
    }

    // ============ Helpers ============

    function _encodeReport(uint64 ts) internal view returns (bytes memory) {
        RiskMetricsOracle.ReportData memory data = RiskMetricsOracle.ReportData({
            timestamp: ts, packedVols: oracle.packVols(sampleVols), packedCorrs: oracle.packCorrs(sampleCorrs)
        });
        return abi.encode(data);
    }
}
