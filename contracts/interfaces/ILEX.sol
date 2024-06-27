// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ILEX {
    struct User {
        uint userDepositTime;
        uint refineryTier;
        uint xexRefinery;
        uint xexadonBoost;
        uint lotteryMultiplier;
        uint referralPercent;
        uint lotteryTickets;
    }

    error InsufficientXEXBalance();
    error InsufficientXEXAllowance();
    error InvalidAmount();
    error InvalidFTMAmount();
    error InvalidRepeats();
    error InvalidRiskTier();
    error IncorrectFTMAmount();
    error ExceedsMaxTier();
    error ExceedsMaxTickets();
    error InvalidMaxRefineryTier();
    error NotAdmin();

    event SetMaxRefineryTier(uint amount);
    event RefineryUpgraded(address indexed user, uint tier);
    event LotteryEntered(address indexed user, uint tickets);
    event LotteryWon(address indexed user, uint amount);

    function upgradeRefinery(uint amount) external;
    function enterLottery(uint ftmAmount, uint repeats, uint riskTier) external payable;
    function fulfillRandomness(bytes32 requestId, uint randomness) external;
    function determineOutcome(uint randomness, uint multiplier) external pure returns (uint);
    function calculateReward(uint outcome, uint tickets) external pure returns (uint);
    function buyELX(uint ftmAmount) external returns (uint);
    function boost(address user) external view returns (uint);
}
