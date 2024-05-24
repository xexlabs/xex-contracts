// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20.sol";
import "./interfaces/IXEX.sol";

contract Minter {
    address public owner;
    IXEX main;
    uint256 public term;

    constructor(address user, address _main) {
        owner = user;
        main = IXEX(_main);
    }

    function claimRank(uint256 _term) external {
        term = _term;
        main.claimRank(term);
    }

    function claimMintReward() external payable {
        uint256 fee = main.fee();
        main.claimMintReward{value: fee}();
        main.transfer(owner, main.balanceOf(address(this)));
    }

    function getUserMintInfo() public view returns (IXEX.MintInfo memory) {
        return main.userMints(address(this));
    }

    function getMintReward() external view returns (uint256) {
        IXEX.MintInfo memory r = getUserMintInfo();
        return main.getMintReward(r.rank, r.term, r.maturityTs, r.amplifier, r.eaaRate);
    }
}
