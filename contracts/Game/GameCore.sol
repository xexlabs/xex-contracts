// SPDX-License-Identifier: MIT
pragma solidity =0.8.26;
import {console} from "hardhat/console.sol";
import {GameNFT} from "./GameNFT.sol";
import {IXEX} from "../interfaces/IXEX.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {IGame} from "./IGame.sol";
import {GameNFT} from "./GameNFT.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
abstract contract GameCore is IGame, GameNFT {
    using ECDSA for bytes32;
    using SafeERC20 for IXEX;
    using EnumerableSet for EnumerableSet.UintSet;

    IXEX public _xex;
    address internal _signer;
    bool public requireSignature;
    bool public paused;

    uint256 public constant MAX_BONUS_MULTIPLIER = 2;
    uint256 public constant FAILURE_CLAIM_PERCENTAGE = 20;
    uint256 public rewardsPool;

    mapping(uint => Dungeon) internal _dungeonInfo;
    EnumerableSet.UintSet internal _dungeons; // user => uint[]
    mapping(address => EnumerableSet.UintSet) internal _dungeonsByUser; // user => uint[]

    // by dungeonId:
    mapping(uint => EnumerableSet.UintSet) internal _allActiveTokens; // dungeonId => tokenId[]
    // by user:
    mapping(address => EnumerableSet.UintSet) internal _tokensByUser; // user => tokenId[]

    // by dungeonId:
    mapping(uint => EnumerableSet.UintSet) internal _sessionFinished; // dungeonId => tokenId[]
    // by user:
    mapping(address => EnumerableSet.UintSet) internal _userSessionFinished; // user => tokenId[]

    // by tokenId:
    mapping(uint => Session) internal _sessions; // tokenId => Session

    constructor(address _xex_) {
        _signer = msg.sender;
        _xex = IXEX(_xex_);
    }

    modifier whenNotPaused() {
        if (paused) revert Paused();
        _;
    }
    function checkSignature(address _signer_, bytes32 _messageHash, bytes memory _signature) public view {
        if (requireSignature) {
            address signer = ECDSA.recover(_messageHash, _signature);
            if (_signer_ != signer) revert InvalidSignature();
        }
    }

    function getChainId() public view returns (uint) {
        uint chainId;
        assembly {
            chainId := chainid()
        }
        return chainId;
    }
    function endHash(uint _tokenId, bool _completed, uint _ts) public view returns (bytes32) {
        return keccak256(abi.encodePacked(getChainId(), _tokenId, _completed, _ts));
    }
    modifier endCheck(
        uint _tokenId,
        bool _completed,
        uint _ts,
        bytes memory _signature
    ) {
        Session memory session = _sessions[_tokenId];
        if (session.user != msg.sender && session.operator != msg.sender) revert InvalidOwner();
        if (session.gameCompleted) revert InvalidGameCompleted();
        if (_ts > block.timestamp + 1 minutes) revert InvalidTimestamp();
        checkSignature(_signer, endHash(_tokenId, _completed, _ts), _signature);
        _;
    }

    function start(uint _dungeonId, address operator) external payable whenNotPaused {
        Dungeon memory dungeon = _dungeonInfo[_dungeonId];
        if (!dungeon.active) revert DungeonNotActive();
        if (block.timestamp < dungeon.startIn) revert DungeonNotStarted();
        if (block.timestamp > dungeon.endIn) revert DungeonEnded();
        if (msg.value < dungeon.minMintFee) revert InvalidMintAmount();
        uint timeLeft = dungeon.endIn - block.timestamp;
        uint randomTime = uint(keccak256(abi.encodePacked(block.timestamp, msg.sender))) % timeLeft;
        uint termDateRange = dungeon.maxTermDate - dungeon.minTermDate;
        uint termDate = block.timestamp + dungeon.minTermDate + ((randomTime * termDateRange * dungeon.difficulty) / (100 * timeLeft));
        uint tokenId = _internal_mint(address(this));
        Session memory session = Session(msg.sender, tokenId, msg.value, 0, false, _dungeonId, block.timestamp, 0, 0, 0, 0, 0, termDate, operator);
        _allActiveTokens[_dungeonId].add(tokenId);
        _tokensByUser[msg.sender].add(tokenId);
        _sessions[tokenId] = session;
        emit NewSession(msg.sender, tokenId, msg.value, termDate, 0, false);
    }

    function end(uint _tokenId, bool completed, uint ts, bytes memory _signature) external endCheck(_tokenId, completed, ts, _signature) whenNotPaused {
        _end(_tokenId, completed);
    }
    function _end(uint _tokenId, bool completed) internal {
        Session memory session = _sessions[_tokenId];
        uint dungeonId = session.dungeonId;
        Dungeon memory dungeon = _dungeonInfo[dungeonId];
        session.endedAt = block.timestamp;
        session.gameCompleted = completed;
        bool completedInTime = block.timestamp < session.startedAt + dungeon.maxTermDate;
        _allActiveTokens[dungeonId].remove(_tokenId);
        _sessionFinished[dungeonId].add(_tokenId);

        if (!completed || !completedInTime) {
            session.claimAmount = (session.feeDeposited * FAILURE_CLAIM_PERCENTAGE) / 100;
            uint rewardForThePool = session.feeDeposited - session.claimAmount;
            dungeon.availableRewards += rewardForThePool;
        } else {
            uint bonus = (session.feeDeposited * (MAX_BONUS_MULTIPLIER - 1));
            session.claimAmount = session.feeDeposited + bonus;
            if (session.claimAmount > dungeon.availableRewards) {
                emit EndSessionBunusTooHigh(_tokenId, dungeon.availableRewards, session.claimAmount);
                session.claimAmount = dungeon.availableRewards;
            }
        }
        session.rewardAmount = session.claimAmount;
        _sessions[_tokenId] = session;
        _tokensByUser[session.user].remove(_tokenId);
        _userSessionFinished[session.user].add(_tokenId);
        emit EndSession(_tokenId, session.claimAmount);
    }

    function claim(uint _tokenId) external whenNotPaused {
        Session memory session = _sessions[_tokenId];
        if (session.user != msg.sender && session.operator != msg.sender) revert InvalidOwner();
        if (session.rewardAmount == 0) revert InvalidRewardAmount();
        if (session.endedAt == 0) revert NotFinished();
        if (session.claimAt != 0) revert AlreadyClaimed();
        if (block.timestamp <= session.termDate) revert InvalidTimestamp();
        _claim(_tokenId);
    }
    function _claim(uint _tokenId) internal {
        Session memory session = _sessions[_tokenId];
        uint dungeonId = session.dungeonId;
        Dungeon memory dungeon = _dungeonInfo[dungeonId];
        session.claimAt = block.timestamp; // security control, revert if already claimed
        uint claimAmount = session.claimAmount;
        uint initialMint = session.feeDeposited;
        if (!session.gameCompleted) {
            uint timeLeft = session.termDate - session.startedAt;
            uint timePassed = block.timestamp - session.startedAt;
            uint timePercentage = (timePassed * 100) / timeLeft;
            uint decay = (claimAmount * timePercentage) / 100;
            claimAmount -= decay; // decay the amount based on the time passed
            uint availableBonus = dungeon.availableRewards > initialMint ? initialMint : dungeon.availableRewards;
            claimAmount += availableBonus; // add the available bonus to the claim amount
        }
        if (claimAmount > 2 * initialMint) {
            claimAmount = 2 * initialMint;
        }
        _xex.mint(session.user, claimAmount);
        // Check if the dungeon has sufficient balance to pay out the claim
        if (dungeon.availableRewards < claimAmount) {
            revert InsufficientDungeonBalance(dungeon.availableRewards, claimAmount);
        }
        dungeon.availableRewards -= claimAmount;
        dungeon.claimedRewards += claimAmount;
        session.claimAmount = claimAmount;
        _sessions[_tokenId] = session;
        _tokensByUser[session.user].remove(_tokenId);
        _userSessionFinished[session.user].add(_tokenId);
        // Check if the contract has sufficient balance to pay out the claim
        uint256 contractBalance = IERC20(address(_xex)).balanceOf(address(this));
        if (contractBalance < claimAmount) {
            revert InsufficientContractBalance(contractBalance, claimAmount);
        }
        _transfer(address(this), session.user, _tokenId);
        emit Claim(_tokenId, claimAmount);
    }

    function getDungeonInfo(uint _dungeonId) external view returns (Dungeon memory) {
        if (!_dungeons.contains(_dungeonId)) revert DungeonNotFound();
        return _dungeonInfo[_dungeonId];
    }

    function getSessionInfo(uint _tokenId) external view returns (Session memory) {
        return _sessions[_tokenId];
    }

    function getUserSessions(address _user) external view returns (uint[] memory) {
        return _tokensByUser[_user].values();
    }

    function getUserFinishedSessions(address _user) external view returns (uint[] memory) {
        return _userSessionFinished[_user].values();
    }

    function getDungeonSessions(uint _dungeonId) external view returns (uint[] memory) {
        return _allActiveTokens[_dungeonId].values();
    }

    function getDungeonFinishedSessions(uint _dungeonId) external view returns (uint[] memory) {
        return _sessionFinished[_dungeonId].values();
    }

    function getAllDungeons() external view returns (uint[] memory) {
        return _dungeons.values();
    }
    function getAllActiveDungeons() external view returns (uint[] memory) {
        uint active = 0;
        for (uint i = 0; i < _dungeons.length(); i++) {
            uint dungeonId = _dungeons.at(i);
            Dungeon memory dungeon = _dungeonInfo[dungeonId];
            if (dungeon.active) {
                active++;
            }
        }
        uint[] memory activeDungeons = new uint[](active);
        for (uint i = 0; i < _dungeons.length(); i++) {
            uint dungeonId = _dungeons.at(i);
            Dungeon memory dungeon = _dungeonInfo[dungeonId];
            if (dungeon.active) {
                activeDungeons[active] = dungeonId;
                active++;
            }
        }
        return activeDungeons;
    }
    function dungeonsOf(address _user) external view returns (uint[] memory) {
        return _dungeonsByUser[_user].values();
    }
    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }
}
