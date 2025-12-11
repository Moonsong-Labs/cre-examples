// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Test } from "forge-std/Test.sol";
import { DemoToken } from "src/DemoToken.sol";

contract DemoTokenTest is Test {
    DemoToken public token;
    address public deployer;
    address public alice;

    uint256 constant INITIAL_SUPPLY = 1_000_000 ether;

    function setUp() public {
        deployer = makeAddr("deployer");
        alice = makeAddr("alice");

        vm.prank(deployer);
        token = new DemoToken(INITIAL_SUPPLY);
    }

    function test_InitialSupply() public view {
        assertEq(token.totalSupply(), INITIAL_SUPPLY);
        assertEq(token.balanceOf(deployer), INITIAL_SUPPLY);
    }

    function test_Metadata() public view {
        assertEq(token.name(), "CRE Demo Token");
        assertEq(token.symbol(), "CREDT");
        assertEq(token.decimals(), 18);
    }
}
