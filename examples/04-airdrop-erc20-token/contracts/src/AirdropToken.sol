// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { ERC20Airdrop } from "./ERC20Airdrop.sol";
import { ERC20 } from "@openzeppelin-contracts/token/ERC20/ERC20.sol";

/// @title Test Airdrop Token
/// @dev A simple ERC20 token with airdrop functionality.
contract AirdropToken is ERC20Airdrop {
    constructor() ERC20("Test Airdrop Token", "TAT") { }

    /// @dev Returns 0 decimals.
    function decimals() public pure override returns (uint8) {
        return 0;
    }
}
