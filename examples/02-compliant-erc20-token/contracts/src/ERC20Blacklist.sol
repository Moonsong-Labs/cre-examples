// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { ReceiverTemplate } from "./ReceiverTemplate.sol";
import { ERC20 } from "@openzeppelin-contracts/token/ERC20/ERC20.sol";
import { EnumerableSet } from "@openzeppelin-contracts/utils/structs/EnumerableSet.sol";

/// @dev Extension of {ERC20} that allows blacklisting addresses from transferring tokens.
/// Blacklisted addresses cannot send or receive tokens. Useful for regulatory compliance
/// scenarios where certain addresses must be restricted from token transfers.
abstract contract ERC20Blacklist is ERC20, ReceiverTemplate {
    using EnumerableSet for EnumerableSet.AddressSet;

    EnumerableSet.AddressSet private _blacklist;

    /// @dev The operation failed because `account` is blacklisted.
    error ERC20BlacklistedAccount(address account);

    /// @dev Emitted when `account` is added to the blacklist.
    event AddedToBlacklist(address indexed account);

    /// @dev Emitted when `account` is removed from the blacklist.
    event RemovedFromBlacklist(address indexed account);

    /// @dev Returns true if `account` is blacklisted from sending or receiving tokens.
    /// @param account The address to check.
    function isBlacklisted(address account) public view returns (bool) {
        return _blacklist.contains(account);
    }

    /// @dev Returns all blacklisted addresses.
    function blacklist() public view returns (address[] memory) {
        return _blacklist.values();
    }

    /// @dev See {ERC20-_update}.
    function _update(address from, address to, uint256 value) internal virtual override {
        require(!isBlacklisted(from), ERC20BlacklistedAccount(from));
        require(!isBlacklisted(to), ERC20BlacklistedAccount(to));
        super._update(from, to, value);
    }

    /// @dev Adds `accounts` to the blacklist. Skips zero address.
    function _addToBlacklist(address[] memory accounts) private {
        uint256 length = accounts.length;
        for (uint256 i; i < length; ++i) {
            if (accounts[i] != address(0) && _blacklist.add(accounts[i])) emit AddedToBlacklist(accounts[i]);
        }
    }

    /// @dev Removes `accounts` from the blacklist.
    function _removeFromBlacklist(address[] memory accounts) private {
        uint256 length = accounts.length;
        for (uint256 i; i < length; ++i) {
            if (_blacklist.remove(accounts[i])) emit RemovedFromBlacklist(accounts[i]);
        }
    }

    /// @dev Processes the report containing accounts to be removed and added to the blacklist.
    /// @param report Encoded report.
    function _processReport(bytes calldata report) internal override {
        (address[] memory accountsToRemove, address[] memory accountsToAdd) = abi.decode(report, (address[], address[]));
        _removeFromBlacklist(accountsToRemove);
        _addToBlacklist(accountsToAdd);
    }
}
