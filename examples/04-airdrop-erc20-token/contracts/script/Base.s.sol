// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Strings } from "@openzeppelin-contracts/utils/Strings.sol";
import { Script } from "forge-std/Script.sol";
import { StdStyle } from "forge-std/StdStyle.sol";
import { console2 } from "forge-std/console2.sol";

contract BaseScript is Script {
    using StdStyle for *;
    using Strings for uint256;

    address public deployer;

    modifier broadcast() {
        vm.startBroadcast(deployer);
        _;
        vm.stopBroadcast();
    }

    constructor() {
        uint256 privateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        require(privateKey != 0, "BaseScript: DEPLOYER_PRIVATE_KEY environment variable is not set");

        deployer = vm.rememberKey(privateKey);
    }

    function printAddress(string memory label, address addr) public pure {
        console2.log(label.magenta(), addr.yellow());
    }
}
