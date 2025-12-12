// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { BaseScript } from "./Base.s.sol";
import { Relayer } from "../src/Relayer.sol";

contract Deploy is BaseScript {
    function run() public broadcast {
        printAddress("Deployer:", deployer);

        address messageTransmitterV2 = address(0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275); 

        Relayer relayer = new Relayer(messageTransmitterV2);

        printAddress("Relayer deployed at:", address(relayer));
    }
}
