// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { BaseScript } from "./Base.s.sol";
import { DemoToken } from "src/DemoToken.sol";

contract Deploy is BaseScript {
    function run() public broadcast {
        printAddress("Deployer:", deployer);

        DemoToken token = new DemoToken(1_000_000 ether);

        printAddress("DemoToken deployed at:", address(token));
    }
}
