pragma solidity ^0.8.0;

interface ILEX {
    struct User {
        uint256 refineryTier;
        uint256 xexRefinery;
        uint256 xexadonBoost;
        uint256 lotteryMultiplier;
        uint256 referralPercent;
        uint256 lotteryTickets;
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

    event RefineryUpgraded(address indexed user, uint256 tier);
    event LotteryEntered(address indexed user, uint256 tickets);
    event LotteryWon(address indexed user, uint256 amount);

    function upgradeRefinery(uint256 amount) external;
    function enterLottery(uint256 ftmAmount, uint256 repeats, uint256 riskTier) external payable;
    function fulfillRandomness(bytes32 requestId, uint256 randomness) external;
    function determineOutcome(uint256 randomness, uint256 multiplier) external pure returns (uint256);
    function calculateReward(uint256 outcome, uint256 tickets) external pure returns (uint256);
    function buyELX(uint256 ftmAmount) external returns (uint256);
}
