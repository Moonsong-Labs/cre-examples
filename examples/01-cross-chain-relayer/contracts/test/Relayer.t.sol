// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { IReceiver } from "../src/IReceiver.sol";
import { ReceiverTemplate } from "../src/ReceiverTemplate.sol";
import { IMessageTransmitterV2, Relayer } from "../src/Relayer.sol";
import { IERC165 } from "@openzeppelin-contracts/interfaces/IERC165.sol";
import { Test } from "forge-std/Test.sol";

contract MockMessageTransmitter is IMessageTransmitterV2 {
    bool public shouldSucceed = true;
    bytes public lastMessage;
    bytes public lastAttestation;
    uint256 public callCount;

    function setShouldSucceed(bool _shouldSucceed) external {
        shouldSucceed = _shouldSucceed;
    }

    function receiveMessage(bytes calldata message, bytes calldata attestation) external returns (bool) {
        lastMessage = message;
        lastAttestation = attestation;
        callCount++;
        return shouldSucceed;
    }
}

contract RelayerTest is Test {
    Relayer public relayer;
    MockMessageTransmitter public transmitter;

    address public owner = address(this);
    address public forwarder = makeAddr("forwarder");
    address public attacker = makeAddr("attacker");
    address public workflowOwner = makeAddr("workflowOwner");

    bytes32 public constant WORKFLOW_ID = bytes32(uint256(1));
    bytes10 public constant WORKFLOW_NAME = bytes10("abcdef1234");

    function setUp() public {
        transmitter = new MockMessageTransmitter();
        relayer = new Relayer(address(transmitter));
    }

    function _encodeMetadata(
        bytes32 workflowId,
        bytes10 workflowName,
        address wfOwner
    )
        internal
        pure
        returns (bytes memory)
    {
        return abi.encodePacked(workflowId, workflowName, wfOwner);
    }

    function _encodeReport(bytes memory message, bytes memory attestation) internal pure returns (bytes memory) {
        return abi.encode(message, attestation);
    }

    function test_constructor_setsTransmitter() public view {
        assertEq(relayer.messageTransmitterV2(), address(transmitter));
    }

    function test_constructor_setsOwner() public view {
        assertEq(relayer.owner(), owner);
    }

    function test_onReport_callsTransmitter() public {
        bytes memory message = hex"deadbeef";
        bytes memory attestation = hex"cafebabe";
        bytes memory metadata = _encodeMetadata(WORKFLOW_ID, WORKFLOW_NAME, workflowOwner);
        bytes memory report = _encodeReport(message, attestation);

        relayer.onReport(metadata, report);

        assertEq(transmitter.callCount(), 1);
        assertEq(transmitter.lastMessage(), message);
        assertEq(transmitter.lastAttestation(), attestation);
    }

    function test_onReport_revertsWhenTransmitterFails() public {
        transmitter.setShouldSucceed(false);

        bytes memory metadata = _encodeMetadata(WORKFLOW_ID, WORKFLOW_NAME, workflowOwner);
        bytes memory report = _encodeReport(hex"aa", hex"bb");

        vm.expectRevert(Relayer.ReceiveMessageFailed.selector);
        relayer.onReport(metadata, report);
    }

    function test_onReport_revertsWithZeroTransmitter() public {
        Relayer zeroRelayer = new Relayer(address(0));

        bytes memory metadata = _encodeMetadata(WORKFLOW_ID, WORKFLOW_NAME, workflowOwner);
        bytes memory report = _encodeReport(hex"aa", hex"bb");

        vm.expectRevert(Relayer.MessageTransmitterNotSet.selector);
        zeroRelayer.onReport(metadata, report);
    }

    function test_supportsInterface_IReceiver() public view {
        assertTrue(relayer.supportsInterface(type(IReceiver).interfaceId));
    }

    function test_supportsInterface_IERC165() public view {
        assertTrue(relayer.supportsInterface(type(IERC165).interfaceId));
    }

    function test_supportsInterface_returnsFalseForUnknown() public view {
        assertFalse(relayer.supportsInterface(bytes4(0xdeadbeef)));
    }

    function test_forwarderCheck_blocksUnauthorizedSender() public {
        relayer.setForwarderAddress(forwarder);

        bytes memory metadata = _encodeMetadata(WORKFLOW_ID, WORKFLOW_NAME, workflowOwner);
        bytes memory report = _encodeReport(hex"aa", hex"bb");

        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSignature("InvalidSender(address,address)", attacker, forwarder));
        relayer.onReport(metadata, report);
    }

    function test_forwarderCheck_allowsAuthorizedSender() public {
        relayer.setForwarderAddress(forwarder);

        bytes memory metadata = _encodeMetadata(WORKFLOW_ID, WORKFLOW_NAME, workflowOwner);
        bytes memory report = _encodeReport(hex"aa", hex"bb");

        vm.prank(forwarder);
        relayer.onReport(metadata, report);

        assertEq(transmitter.callCount(), 1);
    }

    function test_authorCheck_blocksWrongAuthor() public {
        relayer.setExpectedAuthor(workflowOwner);

        bytes memory metadata = _encodeMetadata(WORKFLOW_ID, WORKFLOW_NAME, attacker);
        bytes memory report = _encodeReport(hex"aa", hex"bb");

        vm.expectRevert(abi.encodeWithSignature("InvalidAuthor(address,address)", attacker, workflowOwner));
        relayer.onReport(metadata, report);
    }

    function test_authorCheck_allowsCorrectAuthor() public {
        relayer.setExpectedAuthor(workflowOwner);

        bytes memory metadata = _encodeMetadata(WORKFLOW_ID, WORKFLOW_NAME, workflowOwner);
        bytes memory report = _encodeReport(hex"aa", hex"bb");

        relayer.onReport(metadata, report);
        assertEq(transmitter.callCount(), 1);
    }

    function test_workflowIdCheck_blocksWrongId() public {
        relayer.setExpectedWorkflowId(WORKFLOW_ID);

        bytes32 wrongId = bytes32(uint256(999));
        bytes memory metadata = _encodeMetadata(wrongId, WORKFLOW_NAME, workflowOwner);
        bytes memory report = _encodeReport(hex"aa", hex"bb");

        vm.expectRevert(abi.encodeWithSignature("InvalidWorkflowId(bytes32,bytes32)", wrongId, WORKFLOW_ID));
        relayer.onReport(metadata, report);
    }

    function test_workflowIdCheck_allowsCorrectId() public {
        relayer.setExpectedWorkflowId(WORKFLOW_ID);

        bytes memory metadata = _encodeMetadata(WORKFLOW_ID, WORKFLOW_NAME, workflowOwner);
        bytes memory report = _encodeReport(hex"aa", hex"bb");

        relayer.onReport(metadata, report);
        assertEq(transmitter.callCount(), 1);
    }

    function test_workflowNameCheck_blocksWrongName() public {
        relayer.setExpectedWorkflowName("testworkflow");
        bytes10 expectedName = relayer.expectedWorkflowName();

        bytes10 wrongName = bytes10("wrongname1");
        bytes memory metadata = _encodeMetadata(WORKFLOW_ID, wrongName, workflowOwner);
        bytes memory report = _encodeReport(hex"aa", hex"bb");

        vm.expectRevert(abi.encodeWithSignature("InvalidWorkflowName(bytes10,bytes10)", wrongName, expectedName));
        relayer.onReport(metadata, report);
    }

    function test_setForwarderAddress_onlyOwner() public {
        vm.prank(attacker);
        vm.expectRevert();
        relayer.setForwarderAddress(forwarder);
    }

    function test_setForwarderAddress_emitsEvent() public {
        vm.expectEmit(true, true, false, false);
        emit ReceiverTemplate.ForwarderAddressUpdated(address(0), forwarder);
        relayer.setForwarderAddress(forwarder);
    }

    function test_setExpectedAuthor_onlyOwner() public {
        vm.prank(attacker);
        vm.expectRevert();
        relayer.setExpectedAuthor(workflowOwner);
    }

    function test_setExpectedAuthor_emitsEvent() public {
        vm.expectEmit(true, true, false, false);
        emit ReceiverTemplate.ExpectedAuthorUpdated(address(0), workflowOwner);
        relayer.setExpectedAuthor(workflowOwner);
    }

    function test_setExpectedWorkflowId_onlyOwner() public {
        vm.prank(attacker);
        vm.expectRevert();
        relayer.setExpectedWorkflowId(WORKFLOW_ID);
    }

    function test_setExpectedWorkflowId_emitsEvent() public {
        vm.expectEmit(true, true, false, false);
        emit ReceiverTemplate.ExpectedWorkflowIdUpdated(bytes32(0), WORKFLOW_ID);
        relayer.setExpectedWorkflowId(WORKFLOW_ID);
    }

    function test_setExpectedWorkflowName_onlyOwner() public {
        vm.prank(attacker);
        vm.expectRevert();
        relayer.setExpectedWorkflowName("test");
    }

    function test_setExpectedWorkflowName_emitsEvent() public {
        bytes10 previousName = relayer.expectedWorkflowName();

        relayer.setExpectedWorkflowName("testworkflow");
        bytes10 newName = relayer.expectedWorkflowName();

        assertNotEq(previousName, newName);
        assertNotEq(newName, bytes10(0));
    }

    function test_setExpectedWorkflowName_clearsWithEmptyString() public {
        relayer.setExpectedWorkflowName("testworkflow");
        assertNotEq(relayer.expectedWorkflowName(), bytes10(0));

        relayer.setExpectedWorkflowName("");
        assertEq(relayer.expectedWorkflowName(), bytes10(0));
    }

    function test_allChecks_combined() public {
        relayer.setForwarderAddress(forwarder);
        relayer.setExpectedAuthor(workflowOwner);
        relayer.setExpectedWorkflowId(WORKFLOW_ID);

        bytes memory metadata = _encodeMetadata(WORKFLOW_ID, WORKFLOW_NAME, workflowOwner);
        bytes memory report = _encodeReport(hex"aabbccdd", hex"11223344");

        vm.prank(forwarder);
        relayer.onReport(metadata, report);

        assertEq(transmitter.callCount(), 1);
    }

    function testFuzz_onReport_arbitraryData(bytes memory message, bytes memory attestation) public {
        vm.assume(message.length > 0 && attestation.length > 0);

        bytes memory metadata = _encodeMetadata(WORKFLOW_ID, WORKFLOW_NAME, workflowOwner);
        bytes memory report = _encodeReport(message, attestation);

        relayer.onReport(metadata, report);

        assertEq(transmitter.lastMessage(), message);
        assertEq(transmitter.lastAttestation(), attestation);
    }
}
