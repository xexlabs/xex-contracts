// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {XEX} from "../contracts/XEX.sol";
import {MinterFactory} from "../contracts/MinterFactory.sol";
import {Minter} from "../contracts/Minter.sol";

contract XEXTest is Test {
    XEX public xex;
    MinterFactory public minterFactory;
    Minter public minter;
    function setUp() public {
        xex = new XEX();
        minter = new Minter(address(xex));
        minterFactory = new MinterFactory(address(xex));
    }

    function test_Main() public {
        minterFactory.minter_create(10, 10);
    }
}
