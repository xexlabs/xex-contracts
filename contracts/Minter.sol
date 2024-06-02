// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IXEX} from "./interfaces/IXEX.sol";

contract Minter {
    address public owner;
    IXEX main;
    uint public term;
    error Minter__Initialized();
    event Minter__Created();
    event Minter__ClaimRank(uint term);
    event Minter__ClaimMintReward(address owner, address to);
    constructor() {
        main = IXEX(msg.sender);
    }

    function initialize() external {
        if (owner != address(0)) revert Minter__Initialized();
        owner = msg.sender;
        emit Minter__Created();
    }

    function claimRank(uint _term) external {
        term = _term;
        main.claimRank(term);
        emit Minter__ClaimRank(term);
    }

    function claimMintReward(address to) external {
        main.claimMintReward(to);
        emit Minter__ClaimMintReward(owner, to);
    }

    function getUserMintInfo() public view returns (IXEX.MintInfo memory) {
        return main.getUserMintInfo(address(this));
    }

    function getMintReward() external view returns (uint) {
        IXEX.MintInfo memory r = getUserMintInfo();
        return main.getMintReward(r.rank, r.term, r.maturityTs, r.amplifier, r.eaaRate);
    }
}
