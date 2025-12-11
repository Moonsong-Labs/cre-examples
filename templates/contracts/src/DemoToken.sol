// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { ReceiverTemplate } from "./ReceiverTemplate.sol";
import { ERC20 } from "@openzeppelin-contracts/token/ERC20/ERC20.sol";

contract DemoToken is ERC20, ReceiverTemplate {
    constructor(uint256 initialSupply) ERC20("CRE Demo Token", "CREDT") {
        _mint(msg.sender, initialSupply);
    }

    function _processReport(bytes calldata report) internal override {
        (address recipient, uint256 amount) = abi.decode(report, (address, uint256));
        _mint(recipient, amount);
    }
}
