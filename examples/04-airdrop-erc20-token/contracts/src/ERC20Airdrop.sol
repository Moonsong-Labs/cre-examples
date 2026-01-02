// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { ReceiverTemplate } from "./ReceiverTemplate.sol";
import { ERC20 } from "@openzeppelin-contracts/token/ERC20/ERC20.sol";
import { MerkleProof } from "@openzeppelin-contracts/utils/cryptography/MerkleProof.sol";

/// @dev Extension of {ERC20} that handles airdrop functionality.
abstract contract ERC20Airdrop is ERC20, ReceiverTemplate {

    /// @dev Action types for airdrop operations.
    uint8 public constant ACTION_SET_MERKLE_ROOT = 0;
    uint8 public constant ACTION_CLAIM = 1;

    /// @dev The merkle root for verifying airdrop eligibility.
    bytes32 private _merkleRoot;

    /// @dev Tracks total amount claimed per account.
    mapping(address account => uint256 totalClaimed) private _claimed;

    /// @dev Emitted when an unknown action is received.
    error UnknownAction(uint8 action);

    /// @dev Emitted when the merkle root is updated.
    event MerkleRootSet(bytes32 indexed newRoot);

    /// @dev Emitted when tokens are claimed.
    event Claimed(address indexed account, uint256 amount, bytes32 indexed root);

    /// @dev The proof verification failed.
    error InvalidProof();

    /// @dev Nothing to claim (already fully claimed).
    error NothingToClaim();

    /// @dev Returns the current merkle root.
    function merkleRoot() public view returns (bytes32) {
        return _merkleRoot;
    }

    /// @dev Returns the total amount claimed by an account.
    /// @param account The address to check.
    function totalClaimed(address account) public view returns (uint256) {
        return _claimed[account];
    }

    /// @dev Processes the report containing airdrop data.
    /// @param report Encoded report containing [action, payload].
    function _processReport(bytes calldata report) internal override {
        (uint8 action, bytes memory payload) = abi.decode(report, (uint8, bytes));

        if (action == ACTION_SET_MERKLE_ROOT) {
            _handleSetMerkleRoot(payload);
        } else if (action == ACTION_CLAIM) {
            _handleClaim(payload);
        } else {
            revert UnknownAction(action);
        }
    }

    /// @dev Handles setting the merkle root for airdrop eligibility.
    /// @param payload Encoded new merkle root (bytes32).
    function _handleSetMerkleRoot(bytes memory payload) internal virtual {
        bytes32 newRoot = abi.decode(payload, (bytes32));
        _merkleRoot = newRoot;
        emit MerkleRootSet(newRoot);
    }

    /// @dev Handles processing a claim.
    /// @param payload Encoded claim data (account, amount, proofs).
    function _handleClaim(bytes memory payload) internal virtual {
        (address account, uint256 amount, bytes32[] memory proofs) =
            abi.decode(payload, (address, uint256, bytes32[]));

        // Verify merkle proof
        bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(account, amount))));
        require(MerkleProof.verify(proofs, _merkleRoot, leaf), InvalidProof());

        // Calculate claimable amount
        uint256 alreadyClaimed = _claimed[account];
        require(amount > alreadyClaimed, NothingToClaim());
        uint256 claimable = amount - alreadyClaimed;

        // Update claimed amount and mint tokens
        _claimed[account] = amount;
        _mint(account, claimable);

        emit Claimed(account, claimable, _merkleRoot);
    }
}
