// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { ERC20Allowlist } from "./ERC20Allowlist.sol";
import { ERC20 } from "@openzeppelin-contracts/token/ERC20/ERC20.sol";

/// @title Test Compliant Token
/// @dev A simple ERC20 token with allowlist functionality.
contract CompliantToken is ERC20Allowlist {
    uint256 public constant MAX_MINT_AMOUNT = 1000;

    /// @dev Emitted when mint amount exceeds the maximum allowed.
    error MintAmountExceedsMaximum(uint256 amount, uint256 maximum);

    constructor() ERC20("Test Compliant Token", "TCT") { }

    /// @dev Returns 0 decimals.
    function decimals() public pure override returns (uint8) {
        return 0;
    }

    /// @dev Mints `value` tokens to `account`. Limited to 1,000 tokens per operation.
    function mint(address account, uint256 value) public {
        require(value <= MAX_MINT_AMOUNT, MintAmountExceedsMaximum(value, MAX_MINT_AMOUNT));
        _mint(account, value);
    }
}
