// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20.sol";
import "./Minter.sol";

//import "hardhat/console.sol";

contract MinterFactory {
    address public main;
    mapping(address => address[]) minters;

    constructor(address _main) {
        main = _main;
    }

    function minterFactory(uint256 amount, uint256 term) external {
        for (uint256 i = 0; i < amount; ++i) {
            Minter minter = new Minter(msg.sender, main);
            minters[msg.sender].push(address(minter));
            minter.claimRank(term);
        }
    }

    function getUserMinters(address user) public view returns (address[] memory) {
        return minters[user];
    }

    function getUserMinterInfo(address user) public view returns (IXEX.MintInfo[] memory) {
        uint256 t = minters[user].length;
        IXEX.MintInfo[] memory minterInfo = new IXEX.MintInfo[](t);
        for (uint256 i = 0; i < t; ++i) {
            Minter minter = Minter(minters[user][i]);
            minterInfo[i] = minter.getUserMintInfo();
        }
        return minterInfo;
    }

    function claimRank(uint256 limit) external {
        uint256 t = minters[msg.sender].length;
        uint256 j;
        for (uint256 i = t; i > 0; --i) {
            if (j == limit) break;
            Minter minter = Minter(minters[msg.sender][i - 1]);
            IXEX.MintInfo memory info = minter.getUserMintInfo();
            if (info.maturityTs > 0) {
                continue;
            }
            minter.claimRank(minter.term());
            ++j;
        }
    }

    function claimMintReward(uint256 limit) external payable {
        uint256 fee = IXEX(main).fee();
        uint256 t = minters[msg.sender].length;
        uint256 j;
        for (uint256 i = t; i > 0; --i) {
            if (j == limit) break;
            Minter minter = Minter(minters[msg.sender][i - 1]);
            IXEX.MintInfo memory info = minter.getUserMintInfo();
            if (block.timestamp > info.maturityTs && info.rank > 0) {
                minter.claimMintReward{value: fee}();
                ++j;
            }
        }
    }

    function getMintReward(address user) public view returns (uint256[] memory) {
        uint256 t = minters[user].length;
        uint256[] memory reward = new uint256[](t);
        for (uint256 i = 0; i < t; ++i) {
            Minter minter = Minter(minters[user][i]);
            reward[i] = minter.getMintReward();
        }
        return reward;
    }
}
