pragma solidity ^0.8.0;

/// @title ELX Token Contract
/// @notice This contract handles the ELX Refinement process, including the lottery-style token conversion and the various tiers of upgrades.
/// @dev Uses Chainlink VRF for randomness and OpenZeppelin libraries for ERC20 and Ownable functionalities.

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {VRFConsumerBase} from "@chainlink/contracts/src/v0.8/VRFConsumerBase.sol";
import {ILEX} from "./interfaces/ILEX.sol";
import {IXEX} from "./interfaces/IXEX.sol";

contract ELX is ERC20, AccessControl, VRFConsumerBase, ILEX {
    using SafeERC20 for IXEX;
    uint public MAX_REFINERY_TIER = 10000 ether;
    uint public constant MAX_XEX_REFINERY = 10000 ether;
    uint public constant MAX_XEXADON_BOOST = 50000 ether;
    uint public constant MAX_LOTTERY_MULTIPLIER = 5.1 ether;
    uint public constant MAX_REFERRAL_PERCENT = 51;
    uint public constant MAX_LOTTERY_TICKETS = 1 ether;

    mapping(address => User) public users;
    mapping(bytes32 => address) private requestIdToUser;

    bytes32 internal keyHash;
    uint internal fee;

    using SafeERC20 for IXEX;
    IXEX public xex;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    constructor(
        string memory name,
        string memory symbol,
        address vrfCoordinator,
        address linkToken,
        bytes32 _keyHash,
        address xexToken,
        uint _fee
    ) ERC20(name, symbol) VRFConsumerBase(vrfCoordinator, linkToken) {
        keyHash = _keyHash;
        fee = _fee;
        _setupRole(ADMIN_ROLE, msg.sender);
    }

    modifier onlyAdmin() {
        if (!hasRole(ADMIN_ROLE, msg.sender)) revert NotAdmin();
        _;
    }

    /**
     * @notice Upgrades the user's refinery tier by depositing XEX tokens.
     * @dev This function allows users to upgrade their refinery tier by depositing a specified amount of XEX tokens.
     * The user's refinery tier is incremented by the deposited amount.
     * The user's deposit time is updated to the current block timestamp.
     * Emits a {RefineryUpgraded} event.
     * @param amount The amount of XEX tokens to deposit for upgrading the refinery tier.
     * Expected behavior:
     * - The user's refinery tier is increased by the deposited amount.
     * - The deposited XEX tokens are transferred to the contract.
     * - The user's deposit time is updated to the current block timestamp.
     * - A {RefineryUpgraded} event is emitted with the user's address and the new refinery tier.
     */
    function upgradeRefinery(uint amount) external {
        User memory user = users[msg.sender];
        uint totalUserAmount = user.refineryTier;
        if (amount == 0 || totalUserAmount + amount > MAX_REFINERY_TIER) {
            revert InvalidAmount();
        }
        if (xex.balanceOf(msg.sender) < amount) {
            revert InsufficientXEXBalance();
        }
        if (xex.allowance(msg.sender, address(this)) < amount) {
            revert InsufficientXEXAllowance();
        }
        xex.safeTransferFrom(msg.sender, address(this), amount);
        user.deposit += amount;
        user.refineryTier += getRefineryTier(user.deposit);
        user.refineryBoost += getRefineryBoost(user.deposit);
        user.userDepositTime = block.timestamp;
        users[msg.sender] = user;
        emit RefineryUpgraded(msg.sender, user.refineryTier);
    }
    function getRefineryTier(address user) external view returns (uint) {}
    function getRefineryBoost(address user) external view returns (uint) {}

    function enterLottery(uint ftmAmount, uint repeats, uint riskTier) external payable {
        if (ftmAmount < 0.01 ether || ftmAmount > 100 ether) {
            revert InvalidFTMAmount();
        }
        if (repeats <= 0 || repeats > 10) {
            revert InvalidRepeats();
        }
        if (riskTier < 1 || riskTier > 4) {
            revert InvalidRiskTier();
        }

        uint totalFTM = ftmAmount * repeats;
        if (msg.value != totalFTM) {
            revert IncorrectFTMAmount();
        }

        uint feeAmount = (totalFTM * 2) / 100;
        uint remainingFTM = totalFTM - feeAmount;

        // Distribute fee
        uint teamFee = (feeAmount * 45) / 100;
        uint rewardsPoolFee = (feeAmount * 5) / 100;
        uint stakersFee = (feeAmount * 50) / 100;

        // Implement fee distribution logic here

        // Buy ELX off the market
        uint elxAmount = buyELX(remainingFTM);

        // Enter lottery
        bytes32 requestId = requestRandomness(keyHash, fee);
        requestIdToUser[requestId] = msg.sender;

        User storage user = users[msg.sender];
        user.lotteryTickets += (ftmAmount * repeats * 100);
        if (user.lotteryTickets > MAX_LOTTERY_TICKETS) {
            revert ExceedsMaxTickets();
        }

        emit LotteryEntered(msg.sender, user.lotteryTickets);
    }

    function fulfillRandomness(bytes32 requestId, uint randomness) internal override {
        address userAddress = requestIdToUser[requestId];
        User storage user = users[userAddress];

        uint outcome = determineOutcome(randomness, user.lotteryMultiplier);
        uint reward = calculateReward(outcome, user.lotteryTickets);

        _mint(userAddress, reward);
        emit LotteryWon(userAddress, reward);
    }

    function determineOutcome(uint randomness, uint multiplier) internal pure returns (uint) {
        // Implement outcome determination logic based on randomness and multiplier
        return randomness % 100; // Placeholder logic
    }

    function calculateReward(uint outcome, uint tickets) internal pure returns (uint) {
        // Implement reward calculation logic based on outcome and tickets
        return outcome * tickets; // Placeholder logic
    }

    function buyELX(uint ftmAmount) internal returns (uint) {
        // Implement logic to buy ELX off the market
        return ftmAmount * 100; // Placeholder logic
    }

    function setMaxRefineryTier(uint amountDecimal) external onlyAdmin {
        if (amountDecimal > 10000 || amountDecimal < 1) {
            revert InvalidMaxRefineryTier();
        }
        MAX_REFINERY_TIER = amountDecimal * 10 ** 18;
        emit SetMaxRefineryTier(amountDecimal);
    }
}
