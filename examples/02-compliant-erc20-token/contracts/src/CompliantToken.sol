// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { ERC20Blacklist } from "./ERC20Blacklist.sol";
import { ERC20 } from "@openzeppelin-contracts/token/ERC20/ERC20.sol";

/// @title Test Compliant Token
/// @dev A simple ERC20 token with blacklist functionality.
contract CompliantToken is ERC20Blacklist {
    constructor() ERC20("Test Compliant Token", "TCT") {
        _mint(msg.sender, 100_000);
    }

    /// @dev Returns 0 decimals.
    function decimals() public pure override returns (uint8) {
        return 0;
    }

    /// @dev Mints `value` tokens to `account`. Only callable by the owner.
    function mint(address account, uint256 value) public onlyOwner {
        _mint(account, value);
    }
}
