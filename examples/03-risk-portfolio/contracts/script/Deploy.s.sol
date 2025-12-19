// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { BaseScript } from "./Base.s.sol";
import { RiskMetricsOracle } from "src/RiskMetricsOracle.sol";

contract Deploy is BaseScript {
    function run() public broadcast {
        printAddress("Deployer:", deployer);

        RiskMetricsOracle oracle = new RiskMetricsOracle();
        printAddress("RiskMetricsOracle deployed at:", address(oracle));

        // Optional: Configure forwarder address from env
        // address forwarder = vm.envOr("FORWARDER_ADDRESS", address(0));
        // if (forwarder != address(0)) {
        //     oracle.setForwarderAddress(forwarder);
        //     printAddress("Forwarder configured:", forwarder);
        // }
    }
}
