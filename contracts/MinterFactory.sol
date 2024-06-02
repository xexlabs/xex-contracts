// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {Minter} from "./Minter.sol";
import {Minter} from "./Minter.sol";
import {MinterBeacon} from "./MinterBeacon.sol";
import {IXEX} from "./interfaces/IXEX.sol";
//import {console} from "forge-std/Test.sol";
contract MinterFactory is Initializable {
    mapping(address => address[]) minters;
    event MintersClaimed(uint claims);
    address public xex;
    constructor(address _xex) {
        xex = _xex;
    }

    function minter_create(uint amount, uint term) external {
        for (uint i = 0; i < amount; ++i) {
            //Minter minter = Minter(address(new MinterBeacon()));
            Minter minter = Minter(new Minter(xex));
            minters[msg.sender].push(address(minter));
            minter.initialize(msg.sender, term);
        }
    }

    function mintersOf(address user) public view returns (address[] memory) {
        return minters[user];
    }

    function minterInfoOf(address user) public view returns (IXEX.MintInfo[] memory) {
        uint t = minters[user].length;
        IXEX.MintInfo[] memory minterInfo = new IXEX.MintInfo[](t);
        for (uint i = 0; i < t; ++i) {
            Minter minter = Minter(minters[user][i]);
            minterInfo[i] = minter.getUserMintInfo();
        }
        return minterInfo;
    }

    function minter_claimRank(uint limit) external {
        uint t = minters[msg.sender].length;
        uint claimed = 0;
        for (uint i = t; i > 0; --i) {
            if (claimed == limit) break;
            Minter minter = Minter(minters[msg.sender][i - 1]);
            IXEX.MintInfo memory info = minter.getUserMintInfo();
            if (info.maturityTs > 0) continue;
            minter.claimRank(minter.term());
            ++claimed;
        }
        emit MintersClaimed(claimed);
    }

    function minter_claimMintReward(uint limit, address to) external {
        uint t = minters[msg.sender].length;
        uint j;
        for (uint i = t; i > 0; --i) {
            if (j == limit) break;
            Minter minter = Minter(minters[msg.sender][i - 1]);
            IXEX.MintInfo memory info = minter.getUserMintInfo();
            if (block.timestamp > info.maturityTs && info.rank > 0) {
                minter.claimMintReward(to);
                ++j;
            }
        }
    }

    function minter_getMintReward(address user) public view returns (uint[] memory) {
        uint t = minters[user].length;
        uint[] memory reward = new uint[](t);
        for (uint i = 0; i < t; ++i) {
            Minter minter = Minter(minters[user][i]);
            reward[i] = minter.getMintReward();
        }
        return reward;
    }
}
