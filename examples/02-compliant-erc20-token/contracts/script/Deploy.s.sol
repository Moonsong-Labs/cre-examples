// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { BaseScript } from "./Base.s.sol";
import { CompliantToken } from "src/CompliantToken.sol";

contract Deploy is BaseScript {
    function run() public broadcast {
        address forwarderAddress = vm.envAddress("FORWARDER_ADDRESS");
        require(forwarderAddress != address(0), "Deploy: FORWARDER_ADDRESS environment variable is not set");

        printAddress("Deployer:", deployer);
        printAddress("Forwarder:", forwarderAddress);

        CompliantToken token = new CompliantToken();
        token.setForwarderAddress(forwarderAddress);

        printAddress("CompliantToken deployed at:", address(token));
    }
}
