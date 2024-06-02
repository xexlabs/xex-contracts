// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IXEX} from "./interfaces/IXEX.sol";

contract Minter {
    address public owner;
    IXEX main;
    uint public term;
    error Minter__Initialized();
    event Minter__Created(address minter, address owner, uint term);
    event Minter__ClaimRank(address minter, address owner, uint term);
    event Minter__ClaimMintReward(address minter, address owner, address to);
    constructor(address _main) {
        main = IXEX(_main);
        main.calculateMaxTerm();
    }

    function initialize(address _owner, uint _term) external {
        if (owner != address(0)) revert Minter__Initialized();
        owner = _owner;
        emit Minter__Created(address(this), _owner, _term);
        claimRank(_term);
    }

    function claimRank(uint _term) public {
        term = _term;
        main.claimRank(term);
        emit Minter__ClaimRank(address(this), owner, _term);
    }

    function claimMintReward(address to) external {
        main.claimMintReward(to);
        emit Minter__ClaimMintReward(address(this), owner, to);
    }

    function getUserMintInfo() public view returns (IXEX.MintInfo memory) {
        return main.getUserMintInfo(address(this));
    }

    function getMintReward() external view returns (uint) {
        IXEX.MintInfo memory r = getUserMintInfo();
        return main.getMintReward(r.rank, r.term, r.maturityTs, r.amplifier, r.eaaRate);
    }
}
