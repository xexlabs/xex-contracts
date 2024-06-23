// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import {Math} from "./utils/Math.sol";
import {ABDKMath64x64} from "abdk-libraries-solidity/ABDKMath64x64.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Constants} from "./Constants.sol";
import {Minter} from "./Minter.sol";
import {IXEX} from "./interfaces/IXEX.sol";

contract XEX is ERC20, AccessControl, Constants, IXEX {
    using Math for uint;
    using ABDKMath64x64 for int128;
    using ABDKMath64x64 for uint;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    error UserNotFound();
    error NoStakedAmount();
    error NotAdmin();
    error NotMinter();
    uint public immutable genesisTs;
    uint public globalRank = GENESIS_RANK;
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
    event Staked(address indexed user, uint amount, uint term, uint apy);
    event Withdrawn(address indexed user, uint amount, uint reward);

    address public treasury;
    // CONSTRUCTOR
    constructor() ERC20("XEX", "XEX") {
        genesisTs = block.timestamp;
        treasury = msg.sender;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    modifier onlyAdmin() {
        if (!hasRole(ADMIN_ROLE, msg.sender)) revert NotAdmin();
        _;
    }

    modifier onlyMinter() {
        if (!hasRole(MINTER_ROLE, msg.sender)) revert NotMinter();
        _;
    }

    function setTreasury(address account) public onlyAdmin {
        treasury = account;
    }

    function addAdmin(address account) public onlyAdmin {
        grantRole(ADMIN_ROLE, account);
    }

    function removeAdmin(address account) public onlyAdmin {
        revokeRole(ADMIN_ROLE, account);
    }

    function addMinter(address account) public onlyAdmin {
        grantRole(MINTER_ROLE, account);
    }

    function removeMinter(address account) public onlyAdmin {
        revokeRole(MINTER_ROLE, account);
    }

    // PRIVATE METHODS
    function getMaxTerm() external view returns (uint) {
        return calculateMaxTerm();
    }
    function getMinTerm() external pure returns (uint) {
        return MIN_TERM;
    }
    /**
     * @dev calculates current MaxTerm based on Global Rank
     *      (if Global Rank crosses over TERM_AMPLIFIER_THRESHOLD)
     */
    function calculateMaxTerm() public view returns (uint) {
        if (globalRank > TERM_AMPLIFIER_THRESHOLD) {
            uint delta = globalRank.fromUInt().log_2().mul(TERM_AMPLIFIER.fromUInt()).toUInt();
            uint newMax = MAX_TERM_START + delta * SECONDS_IN_DAY;
            return Math.min(newMax, MAX_TERM_END);
        }
        return MAX_TERM_START;
    }

    /**
     * @dev calculates Withdrawal Penalty depending on lateness
     */
    function penalty(uint secsLate) public pure returns (uint) {
        // =MIN(2^(daysLate+3)/window-1,99)
        uint daysLate = secsLate / SECONDS_IN_DAY;
        if (daysLate > WITHDRAWAL_WINDOW_DAYS - 1) return MAX_PENALTY_PCT;
        uint _penalty = (uint(1) << (daysLate + 3)) / WITHDRAWAL_WINDOW_DAYS - 1;
        return Math.min(_penalty, MAX_PENALTY_PCT);
    }

    /**
     * @dev calculates net Mint Reward (adjusted for Penalty)
     */
    function calculateMintReward(uint cRank, uint term, uint maturityTs, uint amplifier, uint eeaRate) public view returns (uint) {
        uint secsLate = block.timestamp - maturityTs;
        uint _penalty = penalty(secsLate);
        uint rankDelta = Math.max(globalRank - cRank, 2);
        uint EAA = (1_000 + eeaRate);
        uint reward = getGrossReward(rankDelta, amplifier, term, EAA);
        return (reward * (100 - _penalty)) / 100;
    }

    /**
     * @dev cleans up User Mint storage (gets some Gas credit;))
     */
    function _cleanUpUserMint() private {
        delete userMints[msg.sender];
        activeMinters--;
    }

    /**
     * @dev calculates Reward Amplifier
     */
    function calculateRewardAmplifier() public view returns (uint) {
        uint amplifierDecrease = (block.timestamp - genesisTs) / SECONDS_IN_DAY;
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
    function calculateEAARate() public view returns (uint) {
        uint decrease = (EAA_PM_STEP * globalRank) / EAA_RANK_STEP;
        if (decrease > EAA_PM_START) return 0;
        return EAA_PM_START - decrease;
    }

    /**
     * @dev calculates APY (in %)
     */
    function calculateAPY() public view returns (uint) {
        return XEX_APR;
    }

    /**
     * @dev creates User Stake
     */
    function _createStake(uint amount, uint term) private {
        uint apy = calculateAPY();
        userStakes[msg.sender] = StakeInfo({term: term, maturityTs: block.timestamp + term * SECONDS_IN_DAY, amount: amount, apy: apy});
        activeStakes++;
        totalXexStaked += amount;
        emit Staked(msg.sender, amount, term, apy);
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
    function getUserMint(address user) external view returns (MintInfo memory) {
        return userMints[user];
    }

    /**
     * @dev returns XEX Stake object associated with User account address
     */
    function getUserStake(address user) external view returns (uint term, uint maturityTs, uint amount, uint apy) {
        StakeInfo memory userStake = userStakes[user];
        return (userStake.term, userStake.maturityTs, userStake.amount, userStake.apy);
    }

    /**
     * @dev returns current AMP
     */
    function getCurrentAMP() public view returns (uint) {
        return calculateRewardAmplifier();
    }

    /**
     * @dev returns current EAA Rate
     */
    function getCurrentEAAR() external view returns (uint) {
        return calculateEAARate();
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
        uint termSec = term * SECONDS_IN_DAY;
        require(termSec > MIN_TERM, "CRank: Term too short");
        require(termSec < calculateMaxTerm() + 1, "CRank: Term too long");
        require(userMints[msg.sender].rank == 0, "CRank: Already claimed");
        // create and store new MintInfo
        MintInfo memory mintInfo = MintInfo({
            user: msg.sender,
            term: term,
            maturityTs: block.timestamp + termSec,
            rank: globalRank,
            amplifier: calculateRewardAmplifier(),
            eaaRate: calculateEAARate()
        });
        userMints[msg.sender] = mintInfo;
        activeMinters++;
        globalRank++;
        emit RankClaimed(msg.sender, term, globalRank, getCurrentAMP(), mintInfo.eaaRate, mintInfo.maturityTs);
    }

    /**
     * @dev ends minting upon maturity (and within permitted Withdrawal Time Window), gets minted XEX
     */
    function claimMintRewardTo(address to) public returns (uint rewardAmount) {
        MintInfo memory mintInfo = userMints[msg.sender];
        require(mintInfo.rank > 0, "Mint: Not claimed");
        require(block.timestamp > mintInfo.maturityTs, "Mint: Not mature");
        // calculate reward and mint tokens
        rewardAmount = calculateMintReward(mintInfo.rank, mintInfo.term, mintInfo.maturityTs, mintInfo.amplifier, mintInfo.eaaRate) * 1 ether;
        _mint(to, rewardAmount);
        _mint(treasury, rewardAmount / 100);

        _cleanUpUserMint();
        emit MintClaimed(msg.sender, to, rewardAmount);
    }
    function claimMintReward() external returns (uint rewardAmount) {
        return claimMintRewardTo(msg.sender);
    }
    /**
     * @dev  ends minting upon maturity (and within permitted Withdrawal time Window)
     *       mints XEX coins and stakes 'pct' of it for 'term'
     */
    function claimMintRewardAndStake(uint pct, uint term) external {
        MintInfo memory mintInfo = userMints[msg.sender];
        // require(pct > 0, "CRank: Cannot share zero percent");
        require(pct < 101, "Mint: Cannot share more than 100%");
        require(mintInfo.rank > 0, "Mint: Not claimed");
        require(block.timestamp > mintInfo.maturityTs, "Mint: Not mature");
        // calculate reward
        uint rewardAmount = calculateMintReward(mintInfo.rank, mintInfo.term, mintInfo.maturityTs, mintInfo.amplifier, mintInfo.eaaRate) * 1 ether;
        uint stakedReward = (rewardAmount * pct) / 100;
        uint ownReward = rewardAmount - stakedReward;

        // mint reward tokens part
        _mint(msg.sender, ownReward);
        _mint(treasury, rewardAmount / 100);
        _cleanUpUserMint();
        emit MintClaimed(msg.sender, msg.sender, rewardAmount);

        // nothing to burn since we haven't minted this part yet
        // stake extra tokens part
        require(stakedReward > XEX_MIN_STAKE, "Mint: Staked reward too low");
        require(term * SECONDS_IN_DAY > MIN_TERM, "Mint: Term too short");
        require(term * SECONDS_IN_DAY < MAX_TERM_END + 1, "Mint: Term too long");
        require(userStakes[msg.sender].amount == 0, "Mint: Already staked");

        _createStake(stakedReward, term);
    }

    /**
     * @dev initiates XEX Stake in amount for a term (days)
     */
    function stake(uint amount, uint term) external {
        require(balanceOf(msg.sender) >= amount, "Stake: Insufficient balance");
        require(amount > XEX_MIN_STAKE, "Stake: Amount too low");
        require(term * SECONDS_IN_DAY > MIN_TERM, "Stake: Term too short");
        require(term * SECONDS_IN_DAY < MAX_TERM_END + 1, "Stake: Term too long");
        require(userStakes[msg.sender].amount == 0, "Stake: Already staked");
        // burn staked XEX
        _burn(msg.sender, amount);
        // create XEX Stake
        _createStake(amount, term);
        emit Staked(msg.sender, amount, term, userStakes[msg.sender].apy);
    }

    /**
     * @dev ends XEX Stake and gets reward if the Stake is mature
     */
    function withdraw() external {
        StakeInfo memory userStake = userStakes[msg.sender];
        require(userStake.amount > 0, "Withdraw: No stake");
        uint xenReward = calculateStakeReward(msg.sender);
        activeStakes--;
        totalXexStaked -= userStake.amount;

        // mint staked XEX (+ reward)
        _mint(msg.sender, userStake.amount + xenReward);
        _mint(treasury, xenReward / 100);

        emit Withdrawn(msg.sender, userStake.amount, xenReward);
        delete userStakes[msg.sender];
    }

    /**
     * dev calculate mint reward without penalty.
     */
    function getMintReward(uint cRank, uint term, uint maturityTs, uint amplifier, uint eeaRate) public view returns (uint) {
        if (block.timestamp > maturityTs) {
            // maturity passed, we can apply the fee
            uint secsLate = block.timestamp - maturityTs;
            uint _penalty = penalty(secsLate);
            uint rankDelta = Math.max(globalRank - cRank, 2);
            uint EAA = (1_000 + eeaRate);
            uint reward = getGrossReward(rankDelta, amplifier, term, EAA);
            return (reward * (100 - _penalty)) / 100;
        } else {
            // maturity hasn't passed, return without fee
            uint rankDelta = Math.max(globalRank - cRank, 2);
            uint EAA = (1_000 + eeaRate);
            return getGrossReward(rankDelta, amplifier, term, EAA);
        }
    }

    function getUserMintInfo(address user) public view returns (MintInfo memory) {
        if (userMints[user].user == address(0)) revert UserNotFound();
        return userMints[user];
    }
    function rewardsOf(address user) external view returns (uint mintReward, uint stakeReward) {
        MintInfo memory r = userMints[user];
        mintReward = getMintReward(r.rank, r.term, r.maturityTs, r.amplifier, r.eaaRate);
        stakeReward = stakeRewardOf(user);
    }
    function isMature(address user) public view returns (bool mature, uint ts) {
        StakeInfo memory r = userStakes[user];
        if (r.amount == 0) revert NoStakedAmount();
        mature = block.timestamp > r.maturityTs;
        ts = mature ? block.timestamp - r.maturityTs : r.maturityTs - block.timestamp;
    }

    // MINT FACTORY
    mapping(address => address[]) minters;
    event MintersClaimed(uint claims);
    function minter_create(uint amount, uint term) external {
        for (uint i = 0; i < amount; ++i) {
            Minter minter = new Minter(address(this));
            minters[msg.sender].push(address(minter));
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
    function calculateStakeReward(address user) public view returns (uint) {
        StakeInfo memory userStake = userStakes[user];
        return (block.timestamp > userStake.maturityTs) ? stakeRewardOf(user) : 0;
    }
    function stakeRewardOf(address user) public view returns (uint reward) {
        StakeInfo memory userStake = userStakes[user];
        if (userStake.amount == 0) return 0;
        uint rate = (userStake.apy * userStake.term * 1_000_000) / DAYS_IN_YEAR;
        reward = (userStake.amount * rate) / 100_000_000;
        reward = reward / 1e18;
    }
    function mint(address to, uint256 amount) external onlyMinter {
        _mint(to, amount);
    }
}
