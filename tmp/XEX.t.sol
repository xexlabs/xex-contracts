// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {XEX} from "../contracts/XEX.sol";
import {XEX0} from "../contracts/XEX0.sol";
import {MinterFactory} from "../contracts/MinterFactory.sol";
import {Minter} from "../contracts/Minter.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
contract XEXTest is Test {
    using Strings for uint;
    using Strings for address;
    XEX public xex;
    XEX0 public xex0;
    MinterFactory public minterFactory;
    Minter public minter;
    function setUp() public {
        xex = new XEX();
        xex0 = new XEX0();
        minter = new Minter(address(xex));
        minterFactory = new MinterFactory(address(xex));
    }

    function test_GetMintReward() public {
        for (uint i = 1; i <= 10; i++) {
            address user = vm.addr(i);
            uint term = xex._calculateMaxTerm() / 1 days;
            uint term0 = xex0._calculateMaxTerm() / 1 days;
            vm.startPrank(user);
            xex.claimRank(term);
            xex0.claimRank(term0);

            XEX.MintInfo memory mintInfo = xex.getUserMint(user);
            XEX0.MintInfo memory mintInfo0 = xex0.getUserMint(user);
            vm.warp(mintInfo.maturityTs + 1);
            uint mintReward = xex.claimMintReward();

            vm.warp(mintInfo0.maturityTs + 1);
            uint mintReward0 = xex0.claimMintReward();
            vm.stopPrank();
            string memory str = string(
                abi.encodePacked(
                    i.toString(),
                    ")",
                    user.toHexString(),
                    " days=",
                    term.toString(),
                    "/",
                    term0.toString(),
                    " reward=",
                    (mintReward / 1e18).toString(),
                    "/",
                    (mintReward0 / 1e18).toString()
                )
            );
            console.log(str);
        }
    }
}
