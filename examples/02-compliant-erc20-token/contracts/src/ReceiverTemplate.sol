// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { IReceiver } from "./IReceiver.sol";
import { Ownable } from "@openzeppelin-contracts/access/Ownable.sol";
import { IERC165 } from "@openzeppelin-contracts/interfaces/IERC165.sol";

/// @title ReceiverTemplate - Abstract receiver with optional permission controls
/// @notice Provides flexible, updatable security checks for receiving workflow reports
/// @dev All permission fields default to zero (disabled). Use setter functions to enable checks.
abstract contract ReceiverTemplate is IReceiver, Ownable {
    /// @dev If set, only this address can call onReport
    address private _forwarderAddress;

    /// @dev If set, only reports from this workflow owner are accepted
    address private _expectedAuthor;

    /// @dev If set, only reports with this workflow name are accepted
    bytes10 private _expectedWorkflowName;

    /// @dev If set, only reports from this specific workflow ID are accepted
    bytes32 private _expectedWorkflowId;

    // Hex character lookup table for bytes-to-hex conversion
    bytes private constant HEX_CHARS = "0123456789abcdef";

    // Custom errors
    error InvalidSender(address sender, address expected);
    error InvalidAuthor(address received, address expected);
    error InvalidWorkflowName(bytes10 received, bytes10 expected);
    error InvalidWorkflowId(bytes32 received, bytes32 expected);

    // Events
    event ForwarderAddressUpdated(address indexed previousForwarder, address indexed newForwarder);
    event ExpectedAuthorUpdated(address indexed previousAuthor, address indexed newAuthor);
    event ExpectedWorkflowNameUpdated(bytes10 indexed previousName, bytes10 indexed newName);
    event ExpectedWorkflowIdUpdated(bytes32 indexed previousId, bytes32 indexed newId);

    /// @notice Constructor sets msg.sender as the owner
    /// @dev All permission fields are initialized to zero (disabled by default)
    constructor() Ownable(msg.sender) { }

    /// @notice Returns the configured forwarder address
    /// @return The forwarder address (address(0) if not set)
    function forwarderAddress() external view returns (address) {
        return _forwarderAddress;
    }

    /// @notice Returns the expected workflow author address
    /// @return The expected author address (address(0) if not set)
    function expectedAuthor() external view returns (address) {
        return _expectedAuthor;
    }

    /// @notice Returns the expected workflow name
    /// @return The expected workflow name (bytes10(0) if not set)
    function expectedWorkflowName() external view returns (bytes10) {
        return _expectedWorkflowName;
    }

    /// @notice Returns the expected workflow ID
    /// @return The expected workflow ID (bytes32(0) if not set)
    function expectedWorkflowId() external view returns (bytes32) {
        return _expectedWorkflowId;
    }

    /// @inheritdoc IERC165
    function supportsInterface(bytes4 interfaceId) public pure virtual override returns (bool) {
        return interfaceId == type(IReceiver).interfaceId || interfaceId == type(IERC165).interfaceId;
    }

    /// @inheritdoc IReceiver
    /// @dev Performs optional validation checks based on which permission fields are set
    function onReport(bytes calldata metadata, bytes calldata report) external override {
        // Security Check 1: Verify caller is the trusted Chainlink Forwarder (if configured)
        if (_forwarderAddress != address(0) && msg.sender != _forwarderAddress) {
            revert InvalidSender(msg.sender, _forwarderAddress);
        }

        // Security Checks 2-4: Verify workflow identity - ID, owner, and/or name (if any are configured)
        if (_expectedWorkflowId != bytes32(0) || _expectedAuthor != address(0) || _expectedWorkflowName != bytes10(0)) {
            (bytes32 workflowId, bytes10 workflowName, address workflowOwner) = _decodeMetadata(metadata);

            if (_expectedWorkflowId != bytes32(0) && workflowId != _expectedWorkflowId) {
                revert InvalidWorkflowId(workflowId, _expectedWorkflowId);
            }
            if (_expectedAuthor != address(0) && workflowOwner != _expectedAuthor) {
                revert InvalidAuthor(workflowOwner, _expectedAuthor);
            }
            if (_expectedWorkflowName != bytes10(0) && workflowName != _expectedWorkflowName) {
                revert InvalidWorkflowName(workflowName, _expectedWorkflowName);
            }
        }

        _processReport(report);
    }

    /// @notice Updates the forwarder address that is allowed to call onReport
    /// @param forwarder The new forwarder address (use address(0) to disable this check)
    function setForwarderAddress(address forwarder) external onlyOwner {
        address previousForwarder = _forwarderAddress;
        _forwarderAddress = forwarder;
        emit ForwarderAddressUpdated(previousForwarder, forwarder);
    }

    /// @notice Updates the expected workflow owner address
    /// @param author The new expected author address (use address(0) to disable this check)
    function setExpectedAuthor(address author) external onlyOwner {
        address previousAuthor = _expectedAuthor;
        _expectedAuthor = author;
        emit ExpectedAuthorUpdated(previousAuthor, author);
    }

    /// @notice Updates the expected workflow name from a plaintext string
    /// @param name The workflow name as a string (use empty string "" to disable this check)
    /// @dev The name is hashed using SHA256 and truncated
    function setExpectedWorkflowName(string calldata name) external onlyOwner {
        bytes10 previousName = _expectedWorkflowName;

        if (bytes(name).length == 0) {
            _expectedWorkflowName = bytes10(0);
            emit ExpectedWorkflowNameUpdated(previousName, bytes10(0));
            return;
        }

        // Convert workflow name to bytes10:
        // SHA256 hash → hex encode → take first 10 chars → hex encode those chars
        bytes32 hash = sha256(bytes(name));
        bytes memory hexString = _bytesToHexString(abi.encodePacked(hash));
        bytes memory first10 = new bytes(10);
        for (uint256 i = 0; i < 10; i++) {
            first10[i] = hexString[i];
        }
        _expectedWorkflowName = bytes10(first10);
        emit ExpectedWorkflowNameUpdated(previousName, _expectedWorkflowName);
    }

    /// @notice Updates the expected workflow ID
    /// @param id The new expected workflow ID (use bytes32(0) to disable this check)
    function setExpectedWorkflowId(bytes32 id) external onlyOwner {
        bytes32 previousId = _expectedWorkflowId;
        _expectedWorkflowId = id;
        emit ExpectedWorkflowIdUpdated(previousId, id);
    }

    /// @notice Helper function to convert bytes to hex string
    /// @param data The bytes to convert
    /// @return The hex string representation
    function _bytesToHexString(bytes memory data) private pure returns (bytes memory) {
        bytes memory hexString = new bytes(data.length * 2);

        for (uint256 i = 0; i < data.length; i++) {
            hexString[i * 2] = HEX_CHARS[uint8(data[i] >> 4)];
            hexString[i * 2 + 1] = HEX_CHARS[uint8(data[i] & 0x0f)];
        }

        return hexString;
    }

    /// @notice Extracts all metadata fields from the onReport metadata parameter
    /// @param metadata The metadata bytes encoded using abi.encodePacked(workflowId, workflowName, workflowOwner)
    /// @return workflowId The unique identifier of the workflow (bytes32)
    /// @return workflowName The name of the workflow (bytes10)
    /// @return workflowOwner The owner address of the workflow
    function _decodeMetadata(bytes memory metadata)
        internal
        pure
        returns (bytes32 workflowId, bytes10 workflowName, address workflowOwner)
    {
        // Metadata structure (encoded using abi.encodePacked by the Forwarder):
        // - First 32 bytes: length of the byte array (standard for dynamic bytes)
        // - Offset 32, size 32: workflow_id (bytes32)
        // - Offset 64, size 10: workflow_name (bytes10)
        // - Offset 74, size 20: workflow_owner (address)
        assembly {
            workflowId := mload(add(metadata, 32))
            workflowName := mload(add(metadata, 64))
            workflowOwner := shr(mul(12, 8), mload(add(metadata, 74)))
        }
        return (workflowId, workflowName, workflowOwner);
    }

    /// @notice Abstract function to process the report data
    /// @param report The report calldata containing your workflow's encoded data
    /// @dev Implement this function with your contract's business logic
    function _processReport(bytes calldata report) internal virtual;
}
