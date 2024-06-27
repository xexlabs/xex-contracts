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
    error ArrayLengthMismatch();
    error DepositExceedsMaxTier();
    error TierExceedsMaxTier();
    using SafeERC20 for IXEX;
    uint public MAX_REFINERY_TIER = 10000 ether;
    uint public constant MAX_XEX_REFINERY = 10000 ether;
    uint public constant MAX_XEXADON_BOOST = 50000 ether;
    uint public constant MAX_LOTTERY_MULTIPLIER = 5.1 ether;
    uint public constant MAX_REFERRAL_PERCENT = 51;
    uint public constant MAX_LOTTERY_TICKETS = 1 ether;

    mapping(address => User) public users;
    mapping(bytes32 => address) private requestIdToUser;
    mapping(uint256 => uint256) public refineryBoostMap;
    mapping(uint256 => uint256) public refineryTierMap;
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
        if (amount == 0 || totalUserAmount + amount > MAX_REFINERY_TIER) revert InvalidAmount();
        if (xex.balanceOf(msg.sender) < amount) revert InsufficientXEXBalance();
        if (xex.allowance(msg.sender, address(this)) < amount) revert InsufficientXEXAllowance();
        xex.safeTransferFrom(msg.sender, address(this), amount);
        user.deposit += amount;
        user.refineryTier += getRefineryTier(user.deposit);
        user.refineryBoost += getRefineryBoost(user.deposit);
        user.userDepositTime = block.timestamp;
        users[msg.sender] = user;
        emit RefineryUpgraded(msg.sender, user.refineryTier);
    }

    function getRefineryTier(uint256 deposit) public view returns (uint256) {
        uint256 highestTier = 0;

        for (uint256 i = 1; i <= MAX_REFINERY_TIER / 1 ether; i++) {
            if (deposit >= i * 1 ether && refineryTierMap[i] > 0) {
                highestTier = refineryTierMap[i];
            }
        }

        return highestTier;
    }

    function getRefineryBoost(uint256 deposit) public view returns (uint256) {
        uint256 highestTier = 0;
        uint256 boost = 0;

        for (uint256 i = 1; i <= MAX_REFINERY_TIER / 1 ether; i++) {
            if (deposit >= i * 1 ether && refineryBoostMap[i] > 0) {
                highestTier = i;
                boost = refineryBoostMap[i];
            }
        }

        return boost;
    }

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

    /**
     * @notice Sets the maximum refinery tier
     * @dev This function can only be called by an admin
     * @param amountDecimal The new maximum refinery tier in decimal format (1-10000)
     * @custom:input-format The input should be a decimal number between 1 and 10000, representing the desired max tier in whole XEX tokens.
     * For example, to set the max tier to 5000 XEX, input 5000. The function will convert this to 5000 * 10^18 wei internally.
     */
    function setMaxRefineryTier(uint amountDecimal) external onlyAdmin {
        if (amountDecimal > 10000 || amountDecimal < 1) revert InvalidMaxRefineryTier();
        MAX_REFINERY_TIER = amountDecimal * 10 ** 18;
        emit SetMaxRefineryTier(amountDecimal);
        emit RefineryBoostUpdated(tiers, boosts);
        emit RefineryTierUpdated(deposits, tiers);
    }

    /**
     * @notice Sets the refinery boost values for different tiers
     * @dev This function can only be called by an admin
     * @param tiers An array of tier values (in XEX) for which to set boosts
     * @param boosts An array of boost values corresponding to each tier
     * @custom:input-format Both input arrays should have the same length.
     * Tiers should be in ascending order and represent XEX amounts (1 = 1 XEX).
     * Boosts are the corresponding boost values for each tier.
     * Example: 
     * tiers = [1, 10, 100, 1000]
     * boosts = [100, 200, 300, 400]
     * This sets a boost of 100 for 1 XEX, 200 for 10 XEX, 300 for 100 XEX, and 400 for 1000 XEX.
     */
    function setRefineryBoost(uint256[] memory tiers, uint256[] memory boosts) external onlyAdmin {
        if (tiers.length != boosts.length) revert ArrayLengthMismatch();
        for (uint256 i = 0; i < tiers.length; i++) {
            if (tiers[i] > MAX_REFINERY_TIER / 1 ether) revert TierExceedsMaxTier();
            refineryBoostMap[tiers[i]] = boosts[i];
        }
        emit RefineryBoostUpdated(tiers, boosts);
    }
    /**
     * @notice Sets the refinery tier values for different deposit amounts
     * @dev This function can only be called by an admin
     * @param deposits An array of deposit amounts (in wei) for which to set tiers
     * @param tiers An array of tier values corresponding to each deposit amount
     * @custom:input-format Both input arrays should have the same length.
     * Deposits should be in ascending order and represent wei amounts.
     * Tiers are the corresponding tier values for each deposit amount.
     * Example: 
     * deposits = [1 ether, 10 ether, 100 ether, 1000 ether]
     * tiers = [1, 2, 3, 4]
     * This sets tier 1 for 1 XEX deposit, tier 2 for 10 XEX deposit, tier 3 for 100 XEX deposit, and tier 4 for 1000 XEX deposit.
     */
    function setRefineryTier(uint256[] memory deposits, uint256[] memory tiers) external onlyAdmin {
        if (deposits.length != tiers.length) revert ArrayLengthMismatch();
        for (uint256 i = 0; i < deposits.length; i++) {
            if (deposits[i] > MAX_REFINERY_TIER) revert DepositExceedsMaxTier();
            refineryTierMap[deposits[i] / 1 ether] = tiers[i];
        }
        emit RefineryTierUpdated(deposits, tiers);
    }
}
