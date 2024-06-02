// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface IXEX {
    // INTERNAL TYPE TO DESCRIBE A XEX MINT INFO
    struct MintInfo {
        address user;
        uint term;
        uint maturityTs;
        uint rank;
        uint amplifier;
        uint eaaRate;
    }

    // INTERNAL TYPE TO DESCRIBE A XEX STAKE
    struct StakeInfo {
        uint term;
        uint maturityTs;
        uint amount;
        uint apy;
    }
    function getMintReward(uint cRank, uint term, uint maturityTs, uint amplifier, uint eeaRate) external view returns (uint _reward);
    function claimRank(uint256 limit) external;
    function getUserMintInfo(address user) external view returns (MintInfo memory);
    function claimMintReward(address to) external;
    function calculateMaxTerm() external view returns (uint);
}
