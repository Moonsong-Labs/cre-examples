// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ReceiverTemplate} from "./ReceiverTemplate.sol";

interface IMessageTransmitterV2 {
    function receiveMessage(bytes calldata message, bytes calldata attestation) external returns (bool success);
}

contract Relayer is ReceiverTemplate {
    address public messageTransmitterV2;

    error MessageTransmitterNotSet();
    error ReceiveMessageFailed();

    constructor(address transmitter) {
        messageTransmitterV2 = transmitter;
    }

    function _processReport(bytes calldata report) internal override {
        if (messageTransmitterV2 == address(0)) revert MessageTransmitterNotSet();

        (bytes memory message, bytes memory attestation) = abi.decode(report, (bytes, bytes));
        bool ok = IMessageTransmitterV2(messageTransmitterV2).receiveMessage(message, attestation);
        if (!ok) revert ReceiveMessageFailed();
    }
}
