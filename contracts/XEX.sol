// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
import "hardhat/console.sol";
import {Math} from "./utils/Math.sol";
import {ABDKMath64x64} from "abdk-libraries-solidity/ABDKMath64x64.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Minter} from "./Minter.sol";
import {MinterBeacon} from "./MinterBeacon.sol";
import {IXEX} from "./interfaces/IXEX.sol";
contract XEX is ERC20, Ownable, IXEX {
    using Math for uint;
    using ABDKMath64x64 for int128;
    using ABDKMath64x64 for uint;

    address public treasure;

    // PUBLIC CONSTANTS
    uint public DAYS_IN_YEAR = 365;
    uint public GENESIS_RANK = 1;
    uint public MIN_TERM = 1 days - 1;
    uint public MAX_TERM_START = 10 days; // 100 * 1 days;
    uint public MAX_TERM_END = 365 days; // 244 * 1 days;
    uint public TERM_AMPLIFIER = 1; // 15;
    uint public TERM_AMPLIFIER_THRESHOLD = 1; //5_000;
    uint public REWARD_AMPLIFIER_START = 1; //701;
    uint public REWARD_AMPLIFIER_END = 1; //1;
    uint public EAA_PM_START = 1; //1_000;
    uint public EAA_PM_STEP = 1; //10;
    uint public EAA_RANK_STEP = 1; //10_000;
    uint public WITHDRAWAL_WINDOW_DAYS = 7;
    uint public MAX_PENALTY_PCT = 90; // 99;
    uint public XEX_MIN_STAKE = 0;
    uint public XEX_MIN_BURN = 0;
    uint public XEX_APR = 20 ether; // 20%;
    uint public XEX_APY_DAYS_STEP = 1; // 14; //REVIEW: XEX_APY_DAYS_STEP can't be 0, setting to 1.
    string public AUTHORS_XEN = "@MrJackLevin @lbelyaev faircrypto.org t.me/bitdeep";

    // PUBLIC STATE, READABLE VIA NAMESAKE GETTERS

    uint public genesisTs;
    uint public globalRank;
    uint public activeMinters;
    uint public activeStakes;
    uint public totalXexStaked;
    // user address => XEX mint info
    mapping(address => MintInfo) public userMints;
    // user address => XEX stake info
    mapping(address => StakeInfo) public userStakes;
    // user address => XEX burn amount
    mapping(address => uint) public userBurns;

    event Redeemed(address indexed user, address indexed xenContract, address indexed tokenContract, uint xenAmount, uint tokenAmount);
    event RankClaimed(address indexed user, uint term, uint rank, uint AMP, uint EAA, uint maturity);
    event MintClaimed(address indexed user, address indexed to, uint rewardAmount);
    event Staked(address indexed user, uint amount, uint term);
    event Withdrawn(address indexed user, uint amount, uint reward);
    event MintersClaimed(uint claims);

    error TermTooShort();
    error TermTooLong();
    error StakeTermTooLong();
    error UserAlreadyHasRank();
    error UserDoesNotHaveRank();
    error RankTooLow();
    error NotMature();
    error NotEnoughXEX();
    error AlreadyStaked();
    error NotEnoughStaked();
    error AprIsZero(uint term);
    error UserNotFound();
    error NoStakedAmount();
    error BeaconAlreadyInitialized();
    mapping(address => address[]) minters;

    address public implementation;
    // CONSTRUCTOR
    constructor() ERC20("XEX", "XEX") Ownable(msg.sender) {
        treasure = msg.sender;
        genesisTs = block.timestamp;
        globalRank = TERM_AMPLIFIER_THRESHOLD;
    }
    function setup() public {
        if (implementation != address(0)) revert BeaconAlreadyInitialized();
        implementation = address(new Minter(address(this)));
    }

    /**
     * @dev calculates current MaxTerm based on Global Rank
     *      (if Global Rank crosses over TERM_AMPLIFIER_THRESHOLD)
     */
    function calculateMaxTerm() public view returns (uint) {
        if (globalRank > TERM_AMPLIFIER_THRESHOLD) {
            uint delta = globalRank.fromUInt().log_2().mul(TERM_AMPLIFIER.fromUInt()).toUInt();
            uint newMax = MAX_TERM_START + delta * 1 days;
            return Math.min(newMax, MAX_TERM_END);
        }

        return MAX_TERM_START;
    }

    /**
     * @dev calculates Withdrawal Penalty depending on lateness
     */
    function getPenalty(uint secsLate) public view returns (uint) {
        // =MIN(2^(daysLate+3)/window-1,99)
        uint daysLate = secsLate / 1 days;
        if (daysLate > WITHDRAWAL_WINDOW_DAYS - 1) return MAX_PENALTY_PCT;
        uint penalty = (uint(1) << (daysLate + 3)) / WITHDRAWAL_WINDOW_DAYS - 1;
        return Math.min(penalty, MAX_PENALTY_PCT);
    }

    /**
     * @dev calculates net Mint Reward (adjusted for Penalty)
     */
    function _calculateMintReward(uint cRank, uint term, uint maturityTs, uint amplifier, uint eeaRate) private view returns (uint) {
        uint secsLate = block.timestamp - maturityTs;
        uint penalty = getPenalty(secsLate);
        uint rankDelta = Math.max(globalRank - cRank, 2);
        uint EAA = (1_000 + eeaRate);
        uint reward = getGrossReward(rankDelta, amplifier, term, EAA);
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
    function calculateStakeReward(uint amount, uint term, uint maturityTs, uint apy) public view returns (uint) {
        if (block.timestamp > maturityTs) {
            uint rate = (apy * term) / DAYS_IN_YEAR;
            return (amount * rate) / 1 ether / 100;
        }
        return 0;
    }

    /**
     * @dev calculates Reward Amplifier
     */
    function _calculateRewardAmplifier() private view returns (uint) {
        uint amplifierDecrease = (block.timestamp - genesisTs) / 1 days;
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
    function _calculateEAARate() private view returns (uint) {
        uint decrease = (EAA_PM_STEP * globalRank) / EAA_RANK_STEP;
        if (decrease > EAA_PM_START) return 0;
        return EAA_PM_START - decrease;
    }

    /**
     * @dev calculates APY (in %)
     */
    function calculateAPR(uint termInDays) public view returns (uint) {
        // the default rate is 20% yearly.
        return (termInDays * XEX_APR) / (MAX_TERM_END / 1 days);
    }

    /**
     * @dev creates User Stake
     */
    function _createStake(uint amount, uint term) private {
        uint apr = calculateAPR(term);
        if (apr == 0) revert AprIsZero(term);
        userStakes[msg.sender].term = term;
        userStakes[msg.sender].maturityTs = block.timestamp + term * 1 days; //REVIEW: mature increase?
        userStakes[msg.sender].amount += amount;
        userStakes[msg.sender].apy = apr;
        activeStakes++;
        totalXexStaked += amount;
    }

    // PUBLIC CONVENIENCE GETTERS

    /**
     * @dev calculates gross Mint Reward
     */
    function getGrossReward(uint rankDelta, uint amplifier, uint term, uint eaa) public pure returns (uint) {
        int128 log128 = rankDelta.fromUInt().log_2();
        int128 reward128 = log128.mul(amplifier.fromUInt()).mul(term.fromUInt()).mul(eaa.fromUInt());
        return reward128.div(uint(1_000).fromUInt()).toUInt();
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
    function getCurrentAMP() public view returns (uint) {
        return _calculateRewardAmplifier();
    }

    /**
     * @dev returns current EAA Rate
     */
    function getCurrentEAAR() external view returns (uint) {
        return _calculateEAARate();
    }

    /**
     * @dev returns current APY
     */
    function getCurrentAPR() external view returns (uint) {
        return XEX_APR;
    }

    /**
     * @dev returns current MaxTerm
     */
    function getCurrentMaxTerm() external view returns (uint) {
        return calculateMaxTerm();
    }

    // PUBLIC STATE-CHANGING METHODS

    /**
     * @dev accepts User cRank claim provided all checks pass (incl. no current claim exists)
     */
    function claimRank(uint term) external {
        uint termSec = term * 1 days;
        if (termSec < MIN_TERM) revert TermTooShort();
        if (termSec >= calculateMaxTerm() + 1) revert TermTooLong();
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
    function claimMintReward(address to) public {
        MintInfo memory mintInfo = userMints[msg.sender];
        if (mintInfo.rank == 0) revert RankTooLow();
        if (block.timestamp < mintInfo.maturityTs) revert NotMature();
        // calculate reward and mint tokens
        uint rewardAmount = _calculateMintReward(mintInfo.rank, mintInfo.term, mintInfo.maturityTs, mintInfo.amplifier, mintInfo.eaaRate) * 1 ether;
        _mint(to, rewardAmount);
        _mint(treasure, rewardAmount / 100);

        _cleanUpUserMint();
        emit MintClaimed(msg.sender, to, rewardAmount);
    }

    /**
     * @dev  ends minting upon maturity (and within permitted Withdrawal time Window)
     *       mints XEX coins and stakes 'pct' of it for 'term'
     */
    function claimMintRewardAndStake(uint pct, uint term) external {
        MintInfo memory mintInfo = userMints[msg.sender];
        // require(pct > 0, "CRank: Cannot share zero percent");
        require(pct < 101);
        require(mintInfo.rank > 0);
        require(block.timestamp > mintInfo.maturityTs);
        // calculate reward
        uint rewardAmount = _calculateMintReward(mintInfo.rank, mintInfo.term, mintInfo.maturityTs, mintInfo.amplifier, mintInfo.eaaRate) * 1 ether;
        uint stakedReward = (rewardAmount * pct) / 100;
        uint ownReward = rewardAmount - stakedReward;

        // mint reward tokens part
        _mint(msg.sender, ownReward);
        _mint(treasure, rewardAmount / 100);
        _cleanUpUserMint();
        emit MintClaimed(msg.sender, address(msg.sender), rewardAmount);
        if (stakedReward <= XEX_MIN_STAKE) revert NotEnoughXEX();
        if (term * 1 days < MIN_TERM) revert TermTooShort();
        if (term * 1 days > MAX_TERM_END + 1) revert TermTooLong();
        _createStake(stakedReward, term);
        emit Staked(msg.sender, stakedReward, term);
    }

    /**
     * @dev initiates XEX Stake in amount for a term (days)
     */
    function stake(uint amount, uint term) external {
        // require(balanceOf(msg.sender) >= amount);
        if (balanceOf(msg.sender) < amount) revert NotEnoughXEX();

        // require(amount > XEX_MIN_STAKE);
        if (amount <= XEX_MIN_STAKE) revert NotEnoughXEX();

        // require(term * 1 days > MIN_TERM);
        if (term * 1 days < MIN_TERM) revert TermTooShort();

        // require(term * 1 days < MAX_TERM_END + 1);
        if (term * 1 days > MAX_TERM_END + 1) revert StakeTermTooLong();

        _burn(msg.sender, amount); // burn staked XEX
        _createStake(amount, term); // create XEX Stake
        emit Staked(msg.sender, amount, term);
    }

    /**
     * @dev ends XEX Stake and gets reward if the Stake is mature
     */

    function withdraw() external {
        StakeInfo memory userStake = userStakes[msg.sender];
        if (userStake.amount == 0) revert NoStakedAmount();
        uint xenReward = getStakedReward(msg.sender);
        activeStakes--;
        totalXexStaked -= userStake.amount;
        _mint(msg.sender, userStake.amount + xenReward);
        _mint(treasure, xenReward / 100);
        emit Withdrawn(msg.sender, userStake.amount, xenReward);
        delete userStakes[msg.sender];
    }
    function getStakedReward(address user) public view returns (uint) {
        StakeInfo memory userStake = userStakes[user];
        if (userStake.amount == 0) return 0;
        return calculateStakeReward(userStake.amount, userStake.term, userStake.maturityTs, userStake.apy);
    }

    /**
     * dev calculate mint reward without penalty.
     */
    function getMintReward(uint cRank, uint term, uint maturityTs, uint amplifier, uint eeaRate) public view returns (uint _reward) {
        if (block.timestamp > maturityTs) {
            // maturity passed, we can apply the fee
            uint secsLate = block.timestamp - maturityTs;
            uint penalty = getPenalty(secsLate);
            uint rankDelta = Math.max(globalRank - cRank, 2);
            uint EAA = (1_000 + eeaRate);
            uint reward = getGrossReward(rankDelta, amplifier, term, EAA);
            _reward = (reward * (100 - penalty)) / 100;
        } else {
            // maturity hasn't passed, return without fee
            uint rankDelta = Math.max(globalRank - cRank, 2);
            uint EAA = (1_000 + eeaRate);
            _reward = getGrossReward(rankDelta, amplifier, term, EAA);
        }
    }

    function getUserMintInfo(address user) public view returns (MintInfo memory) {
        if (userMints[user].user == address(0)) revert UserNotFound();
        return userMints[user];
    }

    function rewardsOf(address user) external view returns (uint mintReward, uint stakeReward) {
        MintInfo memory r = userMints[user];
        mintReward = getMintReward(r.rank, r.term, r.maturityTs, r.amplifier, r.eaaRate);
        stakeReward = getStakedReward(user);
    }
    function isMature(address user) public view returns (bool mature, uint ts) {
        StakeInfo memory r = userStakes[user];
        if (r.amount == 0) revert NoStakedAmount();
        mature = block.timestamp > r.maturityTs;
        ts = mature ? block.timestamp - r.maturityTs : r.maturityTs - block.timestamp;
    }

    // MINT FACTORY
    function minter_create(uint amount, uint term) external {
        for (uint i = 0; i < amount; ++i) {
            Minter minter = Minter(address(new MinterBeacon()));
            minters[msg.sender].push(address(minter));
            minter.initialize(msg.sender, term);
            minter.claimRank(term);
        }
    }

    function mintersOf(address user) public view returns (address[] memory) {
        return minters[user];
    }

    function minterInfoOf(address user) public view returns (MintInfo[] memory) {
        uint t = minters[user].length;
        MintInfo[] memory minterInfo = new MintInfo[](t);
        for (uint i = 0; i < t; ++i) {
            Minter minter = Minter(minters[user][i]);
            minterInfo[i] = minter.getUserMintInfo();
        }
        return minterInfo;
    }

    function minter_claimRank(uint limit) external {
        uint t = minters[msg.sender].length;
        uint claimed = 0;
        for (uint i = t; i > 0; --i) {
            if (claimed == limit) break;
            Minter minter = Minter(minters[msg.sender][i - 1]);
            MintInfo memory info = minter.getUserMintInfo();
            if (info.maturityTs > 0) continue;
            minter.claimRank(minter.term());
            ++claimed;
        }
        emit MintersClaimed(claimed);
    }

    function minter_claimMintReward(uint limit, address to) external {
        uint t = minters[msg.sender].length;
        uint j;
        for (uint i = t; i > 0; --i) {
            if (j == limit) break;
            Minter minter = Minter(minters[msg.sender][i - 1]);
            MintInfo memory info = minter.getUserMintInfo();
            if (block.timestamp > info.maturityTs && info.rank > 0) {
                minter.claimMintReward(to);
                ++j;
            }
        }
    }

    function minter_getMintReward(address user) public view returns (uint[] memory) {
        uint t = minters[user].length;
        uint[] memory reward = new uint[](t);
        for (uint i = 0; i < t; ++i) {
            Minter minter = Minter(minters[user][i]);
            reward[i] = minter.getMintReward();
        }
        return reward;
    }
}
