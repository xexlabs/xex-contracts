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
    uint256 public constant MAX_REFINERY_TIER = 10000;
    uint256 public constant MAX_XEX_REFINERY = 10000;
    uint256 public constant MAX_XEXADON_BOOST = 50000;
    uint256 public constant MAX_LOTTERY_MULTIPLIER = 5.1 ether;
    uint256 public constant MAX_REFERRAL_PERCENT = 51;
    uint256 public constant MAX_LOTTERY_TICKETS = 1 ether;

    mapping(address => User) public users;
    mapping(bytes32 => address) private requestIdToUser;

    bytes32 internal keyHash;
    uint256 internal fee;

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
        uint256 _fee
    ) ERC20(name, symbol) VRFConsumerBase(vrfCoordinator, linkToken) {
        keyHash = _keyHash;
        fee = _fee;
        _setupRole(ADMIN_ROLE, msg.sender);
    }

    /**
     * @notice Upgrades the user's refinery tier by depositing XEX tokens.
     * @dev This function allows users to upgrade their refinery tier by depositing a specified amount of XEX tokens.
     * The function checks for sufficient XEX balance and allowance before transferring the tokens.
     * The user's refinery tier is incremented by the deposited amount.
     * Emits a {RefineryUpgraded} event.
     * @param amount The amount of XEX tokens to deposit for upgrading the refinery tier.
     * Requirements:
     * - `amount` must be greater than 0 and the total refinery tier after the upgrade must not exceed MAX_REFINERY_TIER.
     * - The caller must have a sufficient XEX balance and allowance.
     * Expected behavior:
     * - The user's refinery tier is increased by the deposited amount.
     * - The deposited XEX tokens are transferred to the contract.
     * - A {RefineryUpgraded} event is emitted with the user's address and the new refinery tier.
     */
    function upgradeRefinery(uint256 amount) external {
        uint totalUserAmount = users[msg.sender].refineryTier;
        if (amount == 0 || totalUserAmount + amount > MAX_REFINERY_TIER) {
            revert InvalidAmount();
        }
        User storage user = users[msg.sender];
        if (xex.balanceOf(msg.sender) < amount) {
            revert InsufficientXEXBalance();
        }
        if (xex.allowance(msg.sender, address(this)) < amount) {
            revert InsufficientXEXAllowance();
        }

        xex.safeTransferFrom(msg.sender, address(this), amount);
        user.refineryTier += amount;
        emit RefineryUpgraded(msg.sender, user.refineryTier);
    }

    function enterLottery(uint256 ftmAmount, uint256 repeats, uint256 riskTier) external payable {
        if (ftmAmount < 0.01 ether || ftmAmount > 100 ether) {
            revert InvalidFTMAmount();
        }
        if (repeats <= 0 || repeats > 10) {
            revert InvalidRepeats();
        }
        if (riskTier < 1 || riskTier > 4) {
            revert InvalidRiskTier();
        }

        uint256 totalFTM = ftmAmount * repeats;
        if (msg.value != totalFTM) {
            revert IncorrectFTMAmount();
        }

        uint256 feeAmount = (totalFTM * 2) / 100;
        uint256 remainingFTM = totalFTM - feeAmount;

        // Distribute fee
        uint256 teamFee = (feeAmount * 45) / 100;
        uint256 rewardsPoolFee = (feeAmount * 5) / 100;
        uint256 stakersFee = (feeAmount * 50) / 100;

        // Implement fee distribution logic here

        // Buy ELX off the market
        uint256 elxAmount = buyELX(remainingFTM);

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

    function fulfillRandomness(bytes32 requestId, uint256 randomness) internal override {
        address userAddress = requestIdToUser[requestId];
        User storage user = users[userAddress];

        uint256 outcome = determineOutcome(randomness, user.lotteryMultiplier);
        uint256 reward = calculateReward(outcome, user.lotteryTickets);

        _mint(userAddress, reward);
        emit LotteryWon(userAddress, reward);
    }

    function determineOutcome(uint256 randomness, uint256 multiplier) internal pure returns (uint256) {
        // Implement outcome determination logic based on randomness and multiplier
        return randomness % 100; // Placeholder logic
    }

    function calculateReward(uint256 outcome, uint256 tickets) internal pure returns (uint256) {
        // Implement reward calculation logic based on outcome and tickets
        return outcome * tickets; // Placeholder logic
    }

    function buyELX(uint256 ftmAmount) internal returns (uint256) {
        // Implement logic to buy ELX off the market
        return ftmAmount * 100; // Placeholder logic
    }
}
