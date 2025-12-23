// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Test } from "forge-std/Test.sol";
import { AirdropToken } from "src/AirdropToken.sol";

contract AirdropTokenTest is Test {
    AirdropToken public token;
    address public deployer;
    address public alice;

    function setUp() public {
        deployer = makeAddr("deployer");
        alice = makeAddr("alice");

        vm.prank(deployer);
        token = new AirdropToken();
    }

    function test_Metadata() public view {
        assertEq(token.name(), "Test Airdrop Token");
        assertEq(token.symbol(), "TAT");
        assertEq(token.decimals(), 0);
    }
}
