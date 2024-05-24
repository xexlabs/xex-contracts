// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import {Math} from "./utils/Math.sol";
import {ABDKMath64x64} from "abdk-libraries-solidity/ABDKMath64x64.sol";
import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
//import "hardhat/console.sol";
contract XEX is ERC20Upgradeable, OwnableUpgradeable {
    using Math for uint256;
    using ABDKMath64x64 for int128;
    using ABDKMath64x64 for uint256;
    // INTERNAL TYPE TO DESCRIBE A XEX MINT INFO
    struct MintInfo {
        address user;
        uint256 term;
        uint256 maturityTs;
        uint256 rank;
        uint256 amplifier;
        uint256 eaaRate;
    }

    // INTERNAL TYPE TO DESCRIBE A XEX STAKE
    struct StakeInfo {
        uint256 term;
        uint256 maturityTs;
        uint256 amount;
        uint256 apy;
    }

    // PUBLIC CONSTANTS
    uint256 public SECONDS_IN_DAY; // = 3_600 * 24;
    uint256 public DAYS_IN_YEAR; // = 365;
    uint256 public GENESIS_RANK; // = 1;
    uint256 public MIN_TERM; // = 1 * SECONDS_IN_DAY - 1;
    uint256 public MAX_TERM_START; // = 10 * SECONDS_IN_DAY; // 100 * SECONDS_IN_DAY;
    uint256 public MAX_TERM_END; // = 10 * SECONDS_IN_DAY; // 244 * SECONDS_IN_DAY;
    uint256 public TERM_AMPLIFIER; // = 1; // 15;
    uint256 public TERM_AMPLIFIER_THRESHOLD; // = 1; //5_000;
    uint256 public REWARD_AMPLIFIER_START; // = 1; //701;
    uint256 public REWARD_AMPLIFIER_END; // = 1; //1;
    uint256 public EAA_PM_START; // = 1; //1_000;
    uint256 public EAA_PM_STEP; // = 1; //10;
    uint256 public EAA_RANK_STEP; // = 1; //10_000;
    uint256 public WITHDRAWAL_WINDOW_DAYS; // = 7;
    uint256 public MAX_PENALTY_PCT; // = 90; // 99;
    uint256 public XEX_MIN_STAKE; // = 0;
    uint256 public XEX_MIN_BURN; // = 0;
    uint256 public XEX_APY_START; // = 20; // 50;
    uint256 public XEX_APY_DAYS_STEP; // = 1; // 14; //REVIEW: XEX_APY_DAYS_STEP can't be 0, setting to 1.
    uint256 public XEX_APY_END; // = 20; // 0;
    string public AUTHORS_XEN; // = "@MrJackLevin @lbelyaev faircrypto.org t.me/bitdeep";

    // PUBLIC STATE, READABLE VIA NAMESAKE GETTERS

    uint256 public genesisTs;
    uint256 public globalRank;
    uint256 public activeMinters;
    uint256 public activeStakes;
    uint256 public totalXexStaked;
    // user address => XEX mint info
    mapping(address => MintInfo) public userMints;
    // user address => XEX stake info
    mapping(address => StakeInfo) public userStakes;
    // user address => XEX burn amount
    mapping(address => uint256) public userBurns;

    event Redeemed(address indexed user, address indexed xenContract, address indexed tokenContract, uint256 xenAmount, uint256 tokenAmount);
    event RankClaimed(address indexed user, uint256 term, uint256 rank, uint256 AMP, uint256 EAA, uint256 maturity);
    event MintClaimed(address indexed user, uint256 rewardAmount);
    event Staked(address indexed user, uint256 amount, uint256 term);
    event Withdrawn(address indexed user, uint256 amount, uint256 reward);

    error TermTooShort();
    error TermTooLong();
    error StakeTermTooLong(uint256 term, uint256 maxTerm);
    error UserAlreadyHasRank();
    error UserDoesNotHaveRank();
    error RankTooLow();
    error NotMature();
    error NotEnoughXEX();
    error AlreadyStaked();
    error NotEnoughStaked();

    address public treasure;

    // CONSTRUCTOR
    function initialize() public initializer {
        treasure = msg.sender;
        genesisTs = block.timestamp;

        SECONDS_IN_DAY = 1 days;
        DAYS_IN_YEAR = 365;
        GENESIS_RANK = 1;
        MIN_TERM = 1 * 1 days - 1;
        MAX_TERM_START = 10 days; // 100 * SECONDS_IN_DAY;
        MAX_TERM_END = 10 days; // 244 * SECONDS_IN_DAY;
        TERM_AMPLIFIER = 1; // 15;
        TERM_AMPLIFIER_THRESHOLD = 1; //5_000;
        REWARD_AMPLIFIER_START = 1; //701;
        REWARD_AMPLIFIER_END = 1; //1;
        EAA_PM_START = 1; //1_000;
        EAA_PM_STEP = 1; //10;
        EAA_RANK_STEP = 1; //10_000;
        WITHDRAWAL_WINDOW_DAYS = 7;
        MAX_PENALTY_PCT = 90; // 99;
        XEX_MIN_STAKE = 0;
        XEX_MIN_BURN = 0;
        XEX_APY_START = 20; // 50;
        XEX_APY_DAYS_STEP = 1; // 14; //REVIEW: XEX_APY_DAYS_STEP can't be 0, setting to 1.
        XEX_APY_END = 20; // 0;
        AUTHORS_XEN = "@MrJackLevin @lbelyaev faircrypto.org t.me/bitdeep";
        globalRank = TERM_AMPLIFIER_THRESHOLD;

        __ERC20_init("XEX", "XEX");
        __Ownable_init(msg.sender);
    }

    // PRIVATE METHODS

    /**
     * @dev calculates current MaxTerm based on Global Rank
     *      (if Global Rank crosses over TERM_AMPLIFIER_THRESHOLD)
     */
    function _calculateMaxTerm() private view returns (uint256) {
        if (globalRank > TERM_AMPLIFIER_THRESHOLD) {
            uint256 delta = globalRank.fromUInt().log_2().mul(TERM_AMPLIFIER.fromUInt()).toUInt();
            uint256 newMax = MAX_TERM_START + delta * SECONDS_IN_DAY;
            return Math.min(newMax, MAX_TERM_END);
        }

        return MAX_TERM_START;
    }

    /**
     * @dev calculates Withdrawal Penalty depending on lateness
     */
    function getPenalty(uint256 secsLate) public view returns (uint256) {
        // =MIN(2^(daysLate+3)/window-1,99)
        uint256 daysLate = secsLate / SECONDS_IN_DAY;
        if (daysLate > WITHDRAWAL_WINDOW_DAYS - 1) return MAX_PENALTY_PCT;
        uint256 penalty = (uint256(1) << (daysLate + 3)) / WITHDRAWAL_WINDOW_DAYS - 1;
        return Math.min(penalty, MAX_PENALTY_PCT);
    }

    /**
     * @dev calculates net Mint Reward (adjusted for Penalty)
     */
    function _calculateMintReward(uint256 cRank, uint256 term, uint256 maturityTs, uint256 amplifier, uint256 eeaRate) private view returns (uint256) {
        uint256 secsLate = block.timestamp - maturityTs;
        uint256 penalty = getPenalty(secsLate);
        uint256 rankDelta = Math.max(globalRank - cRank, 2);
        uint256 EAA = (1_000 + eeaRate);
        uint256 reward = getGrossReward(rankDelta, amplifier, term, EAA);
        return (reward * (100 - penalty)) / 100;
    }

    /**
     * @dev cleans up User Mint storage (gets some Gas credit;))
     */
    function _cleanUpUserMint() private {
        delete userMints[msg.sender];
        activeMinters--;
    }

    /**
     * @dev calculates XEX Stake Reward
     */
    function calculateStakeReward(uint256 amount, uint256 term, uint256 maturityTs, uint256 apy) public view returns (uint256) {
        if (block.timestamp > maturityTs) {
            uint256 rate = (apy * term * 1_000_000) / DAYS_IN_YEAR;
            return (amount * rate) / 100_000_000;
        }
        return 0;
    }

    /**
     * @dev calculates Reward Amplifier
     */
    function _calculateRewardAmplifier() private view returns (uint256) {
        uint256 amplifierDecrease = (block.timestamp - genesisTs) / SECONDS_IN_DAY;
        if (amplifierDecrease < REWARD_AMPLIFIER_START) {
            return Math.max(REWARD_AMPLIFIER_START - amplifierDecrease, REWARD_AMPLIFIER_END);
        } else {
            return REWARD_AMPLIFIER_END;
        }
    }

    /**
     * @dev calculates Early Adopter Amplifier Rate (in 1/000ths)
     *      actual EAA is (1_000 + EAAR) / 1_000
     */
    function _calculateEAARate() private view returns (uint256) {
        uint256 decrease = (EAA_PM_STEP * globalRank) / EAA_RANK_STEP;
        if (decrease > EAA_PM_START) return 0;
        return EAA_PM_START - decrease;
    }

    /**
     * @dev calculates APY (in %)
     */
    function _calculateAPY() private view returns (uint256) {
        uint256 decrease = (block.timestamp - genesisTs) / (SECONDS_IN_DAY * XEX_APY_DAYS_STEP);
        if (XEX_APY_START - XEX_APY_END < decrease) return XEX_APY_END;
        return XEX_APY_START - decrease;
    }

    /**
     * @dev creates User Stake
     */
    function _createStake(uint256 amount, uint256 term) private {
        userStakes[msg.sender].term = term;
        userStakes[msg.sender].maturityTs = block.timestamp + term * SECONDS_IN_DAY; //REVIEW: mature increase?
        userStakes[msg.sender].amount += amount;
        userStakes[msg.sender].apy = _calculateAPY(); //REVIEW: apy increase?
        activeStakes++;
        totalXexStaked += amount;
    }

    // PUBLIC CONVENIENCE GETTERS

    /**
     * @dev calculates gross Mint Reward
     */
    function getGrossReward(uint256 rankDelta, uint256 amplifier, uint256 term, uint256 eaa) public pure returns (uint256) {
        int128 log128 = rankDelta.fromUInt().log_2();
        int128 reward128 = log128.mul(amplifier.fromUInt()).mul(term.fromUInt()).mul(eaa.fromUInt());
        return reward128.div(uint256(1_000).fromUInt()).toUInt();
    }

    /**
     * @dev returns User Mint object associated with User account address
     */
    function getUserMint() external view returns (MintInfo memory) {
        return userMints[msg.sender];
    }

    /**
     * @dev returns XEX Stake object associated with User account address
     */
    function getUserStake(address user) external view returns (StakeInfo memory) {
        return userStakes[user];
    }

    /**
     * @dev returns current AMP
     */
    function getCurrentAMP() public view returns (uint256) {
        return _calculateRewardAmplifier();
    }

    /**
     * @dev returns current EAA Rate
     */
    function getCurrentEAAR() external view returns (uint256) {
        return _calculateEAARate();
    }

    /**
     * @dev returns current APY
     */
    function getCurrentAPY() external view returns (uint256) {
        return _calculateAPY();
    }

    /**
     * @dev returns current MaxTerm
     */
    function getCurrentMaxTerm() external view returns (uint256) {
        return _calculateMaxTerm();
    }

    // PUBLIC STATE-CHANGING METHODS

    /**
     * @dev accepts User cRank claim provided all checks pass (incl. no current claim exists)
     */
    function claimRank(uint256 term) external {
        uint256 termSec = term * SECONDS_IN_DAY;
        if (termSec < MIN_TERM) revert TermTooShort();
        if (termSec >= _calculateMaxTerm() + 1) revert TermTooLong();
        if (userMints[msg.sender].rank != 0) revert UserAlreadyHasRank();
        if (globalRank == 0) revert RankTooLow();
        // create and store new MintInfo
        MintInfo memory mintInfo = MintInfo({
            user: msg.sender,
            term: term,
            maturityTs: block.timestamp + termSec,
            rank: globalRank,
            amplifier: _calculateRewardAmplifier(),
            eaaRate: _calculateEAARate()
        });
        userMints[msg.sender] = mintInfo;
        activeMinters++;
        emit RankClaimed(msg.sender, term, globalRank++, getCurrentAMP(), mintInfo.eaaRate, mintInfo.maturityTs);
    }

    /**
     * @dev ends minting upon maturity (and within permitted Withdrawal Time Window), gets minted XEX
     */
    function claimMintReward() public {
        MintInfo memory mintInfo = userMints[msg.sender];
        if (mintInfo.rank == 0) revert RankTooLow();
        if (block.timestamp < mintInfo.maturityTs) revert NotMature();
        // calculate reward and mint tokens
        uint256 rewardAmount = _calculateMintReward(mintInfo.rank, mintInfo.term, mintInfo.maturityTs, mintInfo.amplifier, mintInfo.eaaRate) * 1 ether;
        _mint(msg.sender, rewardAmount);
        _mint(treasure, rewardAmount / 100);

        _cleanUpUserMint();
        emit MintClaimed(msg.sender, rewardAmount);
    }

    /**
     * @dev  ends minting upon maturity (and within permitted Withdrawal time Window)
     *       mints XEX coins and stakes 'pct' of it for 'term'
     */
    function claimMintRewardAndStake(uint256 pct, uint256 term) external {
        MintInfo memory mintInfo = userMints[msg.sender];
        // require(pct > 0, "CRank: Cannot share zero percent");
        require(pct < 101);
        require(mintInfo.rank > 0);
        require(block.timestamp > mintInfo.maturityTs);
        // calculate reward
        uint256 rewardAmount = _calculateMintReward(mintInfo.rank, mintInfo.term, mintInfo.maturityTs, mintInfo.amplifier, mintInfo.eaaRate) * 1 ether;
        uint256 stakedReward = (rewardAmount * pct) / 100;
        uint256 ownReward = rewardAmount - stakedReward;

        // mint reward tokens part
        _mint(msg.sender, ownReward);
        _mint(treasure, rewardAmount / 100);
        _cleanUpUserMint();
        emit MintClaimed(msg.sender, rewardAmount);
        if (stakedReward <= XEX_MIN_STAKE) revert NotEnoughXEX();
        if (term * SECONDS_IN_DAY < MIN_TERM) revert TermTooShort();
        if (term * SECONDS_IN_DAY > MAX_TERM_END + 1) revert TermTooLong();
        _createStake(stakedReward, term);
        emit Staked(msg.sender, stakedReward, term);
    }

    /**
     * @dev initiates XEX Stake in amount for a term (days)
     */
    function stake(uint256 amount, uint256 term) external {
        // require(balanceOf(msg.sender) >= amount);
        if (balanceOf(msg.sender) < amount) revert NotEnoughXEX();

        // require(amount > XEX_MIN_STAKE);
        if (amount <= XEX_MIN_STAKE) revert NotEnoughXEX();

        // require(term * SECONDS_IN_DAY > MIN_TERM);
        if (term * SECONDS_IN_DAY < MIN_TERM) revert TermTooShort();

        // require(term * SECONDS_IN_DAY < MAX_TERM_END + 1);
        if (term * SECONDS_IN_DAY > MAX_TERM_END + 1) {
            revert StakeTermTooLong(term, MAX_TERM_END + 1);
        }
        _burn(msg.sender, amount); // burn staked XEX
        _createStake(amount, term); // create XEX Stake
        emit Staked(msg.sender, amount, term);
    }

    /**
     * @dev ends XEX Stake and gets reward if the Stake is mature
     */
    error NoStakedAmount();
    function withdraw() external {
        StakeInfo memory userStake = userStakes[msg.sender];
        if (userStake.amount == 0) revert NoStakedAmount();
        uint256 xenReward = getStakedReward(msg.sender);
        activeStakes--;
        totalXexStaked -= userStake.amount;
        _mint(msg.sender, userStake.amount + xenReward);
        _mint(treasure, xenReward / 100);
        emit Withdrawn(msg.sender, userStake.amount, xenReward);
        delete userStakes[msg.sender];
    }
    function getStakedReward(address user) public view returns (uint256) {
        StakeInfo memory userStake = userStakes[user];
        return calculateStakeReward(userStake.amount, userStake.term, userStake.maturityTs, userStake.apy);
    }

    /**
     * dev calculate mint reward without penalty.
     */
    function getMintReward(uint256 cRank, uint256 term, uint256 maturityTs, uint256 amplifier, uint256 eeaRate) public view returns (uint256) {
        if (block.timestamp > maturityTs) {
            // maturity passed, we can apply the fee
            uint256 secsLate = block.timestamp - maturityTs;
            uint256 penalty = getPenalty(secsLate);
            uint256 rankDelta = Math.max(globalRank - cRank, 2);
            uint256 EAA = (1_000 + eeaRate);
            uint256 reward = getGrossReward(rankDelta, amplifier, term, EAA);
            return (reward * (100 - penalty)) / 100;
        } else {
            // maturity hasn't passed, return without fee
            uint256 rankDelta = Math.max(globalRank - cRank, 2);
            uint256 EAA = (1_000 + eeaRate);
            return getGrossReward(rankDelta, amplifier, term, EAA);
        }
    }
    function getUserMintInfo(address user) public view returns (MintInfo memory) {
        return userMints[user];
    }

    function getMintReward(address user) external view returns (uint256) {
        MintInfo memory r = userMints[user];
        return getMintReward(r.rank, r.term, r.maturityTs, r.amplifier, r.eaaRate);
    }
}
