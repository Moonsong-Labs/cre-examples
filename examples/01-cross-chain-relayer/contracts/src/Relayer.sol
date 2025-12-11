// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ReceiverTemplate} from "./ReceiverTemplate.sol";
import {ERC20} from "@openzeppelin-contracts/token/ERC20/ERC20.sol";

contract Relayer is ReceiverTemplate {
    constructor() {}

    function _processReport(bytes calldata report) internal override {
      
    }
}
