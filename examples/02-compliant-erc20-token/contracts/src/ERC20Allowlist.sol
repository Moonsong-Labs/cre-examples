// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { ReceiverTemplate } from "./ReceiverTemplate.sol";
import { ERC20 } from "@openzeppelin-contracts/token/ERC20/ERC20.sol";
import { EnumerableSet } from "@openzeppelin-contracts/utils/structs/EnumerableSet.sol";

/// @dev Extension of {ERC20} that requires addresses to be whitelisted to transfer tokens.
/// Only allowed addresses can send or receive tokens.
abstract contract ERC20Allowlist is ERC20, ReceiverTemplate {
    using EnumerableSet for EnumerableSet.AddressSet;

    EnumerableSet.AddressSet private _allowlist;

    /// @dev The operation failed because `account` is not allowed.
    error ERC20NotAllowed(address account);

    /// @dev Emitted when `account` is allowed to send or receive tokens.
    event Allowed(address indexed account);

    /// @dev Emitted when `account` is no longer allowed to send or receive tokens.
    event Disallowed(address indexed account);

    /// @dev Returns true if `account` is allowed to send or receive tokens.
    /// @param account The address to check.
    function isAllowed(address account) public view returns (bool) {
        return _allowlist.contains(account);
    }

    /// @dev Returns all allowed addresses.
    function allowlist() public view returns (address[] memory) {
        return _allowlist.values();
    }

    /// @dev See {ERC20-_update}.
    function _update(address from, address to, uint256 value) internal virtual override {
        if (from != address(0) && to != address(0)) {
            require(isAllowed(from), ERC20NotAllowed(from));
            require(isAllowed(to), ERC20NotAllowed(to));
        } else if (from != address(0)) {
            // Burning: only sender needs to be allowed
            require(isAllowed(from), ERC20NotAllowed(from));
        } else if (to != address(0)) {
            // Minting: only recipient needs to be allowed
            require(isAllowed(to), ERC20NotAllowed(to));
        }
        super._update(from, to, value);
    }

    /// @dev Adds `accounts` to the allowlist. Skips zero address.
    function _addToAllowlist(address[] memory accounts) private {
        uint256 length = accounts.length;
        for (uint256 i; i < length; ++i) {
            if (accounts[i] != address(0) && _allowlist.add(accounts[i])) emit Allowed(accounts[i]);
        }
    }

    /// @dev Removes `accounts` from the allowlist.
    function _removeFromAllowlist(address[] memory accounts) private {
        uint256 length = accounts.length;
        for (uint256 i; i < length; ++i) {
            if (_allowlist.remove(accounts[i])) emit Disallowed(accounts[i]);
        }
    }

    /// @dev Processes the report containing accounts to be removed and added to the allowlist.
    /// @param report Encoded report containing [toRemove[], toAdd[]].
    function _processReport(bytes calldata report) internal override {
        (address[] memory toRemove, address[] memory toAdd) = abi.decode(report, (address[], address[]));

        _removeFromAllowlist(toRemove);
        _addToAllowlist(toAdd);
    }
}
