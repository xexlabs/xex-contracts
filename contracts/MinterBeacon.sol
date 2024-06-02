// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;
import {BeaconProxy} from "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";

contract MinterBeacon is BeaconProxy {
    // Doing so the CREATE2 hash is easier to calculate
    constructor() payable BeaconProxy(msg.sender, "") {}
}
