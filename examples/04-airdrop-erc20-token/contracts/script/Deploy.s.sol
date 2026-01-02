// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { BaseScript } from "./Base.s.sol";
import { AirdropToken } from "src/AirdropToken.sol";

contract Deploy is BaseScript {
    function run() public broadcast {
        printAddress("Deployer:", deployer);

        AirdropToken token = new AirdropToken();

        printAddress("AirdropToken deployed at:", address(token));
    }
}
