// SPDX-License-Identifier: MIT
pragma solidity =0.8.26;
//import {console} from "hardhat/console.sol";
import {GameNFT} from "./GameNFT.sol";
import {IXEX} from "./interfaces/IXEX.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

contract Game is Ownable {
    using SafeERC20 for IXEX;
    using EnumerableSet for EnumerableSet.UintSet;
    using ECDSA for bytes32;

    GameNFT public _nft;
    IXEX public _xex;
    address private _signer;
    uint256 public constant MAX_BONUS_MULTIPLIER = 2;
    uint256 public constant FAILURE_CLAIM_PERCENTAGE = 20;
    uint256 public rewardsPool;

    struct Dungeon {
        string name;
        uint startIn;
        uint endIn;
        uint minTermDate;
        uint maxTermDate;
        uint minMintFee;
        uint difficulty; // 1-100, used to determine term date
        bool active;
        uint availableRewards;
        uint claimedRewards;
    }

    struct Session {
        address user;
        uint tokenId;
        uint feeDeposited;
        uint rewardAmount;
        bool gameCompleted;
        uint dungeonId;
        uint startedAt;
        uint endedAt;
        uint claimAmount;
        uint claimAt;
        uint availableRewards;
        uint claimedRewards;
        uint termDate;
    }

    mapping(uint => Dungeon) private _dungeonInfo;

    // by dungeonId:
    mapping(uint => EnumerableSet.UintSet) private _sessionIds; // dungeonId => tokenId[]
    // by user:
    mapping(address => EnumerableSet.UintSet) private _userSessionIds; // user => tokenId[]

    // by dungeonId:
    mapping(uint => EnumerableSet.UintSet) private _sessionFinished; // dungeonId => tokenId[]
    // by user:
    mapping(address => EnumerableSet.UintSet) private _userSessionFinished; // user => tokenId[]

    // by tokenId:
    mapping(uint => Session) private _sessions; // tokenId => Session

    EnumerableSet.UintSet private _dungeons;

    // ERRORS:
    error InvalidMintAmount();
    error DungeonNotFound();
    error DungeonNotActive();
    error InvalidSigner();
    error InvalidTimestamp();
    error InvalidOwner();
    error InvalidRewardAmount();
    error NotFinished();
    error AlreadyClaimed();
    error InvalidTermPeriod();
    error DungeonNotStarted();
    error DungeonEnded();

    // EVENTS:
    event NewSession(address user, uint tokenId, uint feeDeposited, uint termDate, uint rewardAmount, bool gameCompleted);
    event EndSession(Session session);

    constructor(address _nft_, address _signer_, address _xex_) Ownable(msg.sender) {
        _nft = GameNFT(_nft_);
        _signer = _signer_;
        _xex = IXEX(_xex_);
    }

    modifier checkOwner(uint _tokenId) {
        if (_nft.ownerOf(_tokenId) != msg.sender) revert InvalidOwner();
        _;
    }

    modifier checkProof(
        uint _tokenId,
        bool _completed,
        uint _ts
    ) {
        if (_nft.ownerOf(_tokenId) != msg.sender) revert InvalidOwner();
        if (_ts > block.timestamp + 1 minutes) revert InvalidTimestamp();
        //TODO: checkProof
        _;
    }

    function start(uint _dungeonId) external payable {
        Dungeon memory dungeon = _dungeonInfo[_dungeonId];

        if (!dungeon.active) revert DungeonNotActive();
        if (block.timestamp < dungeon.startIn) revert DungeonNotStarted();
        if (block.timestamp > dungeon.endIn) revert DungeonEnded();
        if (msg.value < dungeon.minMintFee) revert InvalidMintAmount();

        uint timeLeft = dungeon.endIn - block.timestamp;
        uint randomTime = uint(keccak256(abi.encodePacked(block.timestamp, msg.sender))) % timeLeft;
        uint termDateRange = dungeon.maxTermDate - dungeon.minTermDate;
        uint termDate = block.timestamp + dungeon.minTermDate + ((randomTime * termDateRange * dungeon.difficulty) / (100 * timeLeft));
        uint tokenId = _nft.mint(address(this));
        Session memory session = Session(msg.sender, tokenId, msg.value, 0, false, _dungeonId, block.timestamp, 0, 0, 0, 0, 0, termDate);
        _sessionIds[_dungeonId].add(tokenId);
        _userSessionIds[msg.sender].add(tokenId);
        _sessions[tokenId] = session;
        emit NewSession(msg.sender, tokenId, msg.value, termDate, 0, false);
    }

    function end(uint _tokenId, bool completed, uint ts) external checkProof(_tokenId, completed, ts) checkOwner(_tokenId) {
        Session storage session = _sessions[_tokenId];
        uint dungeonId = session.dungeonId;
        Dungeon storage dungeon = _dungeonInfo[dungeonId];
        session.endedAt = block.timestamp;
        session.gameCompleted = completed;
        bool completedInTime = block.timestamp < session.startedAt + dungeon.maxTermDate;
        _sessionIds[dungeonId].remove(_tokenId);
        _sessionFinished[dungeonId].add(_tokenId);

        if (!completed || !completedInTime) {
            session.claimAmount = (session.feeDeposited * FAILURE_CLAIM_PERCENTAGE) / 100;
            uint rewardForThePool = session.feeDeposited - session.claimAmount;
            dungeon.availableRewards += rewardForThePool;
        } else {
            uint bonus = (session.feeDeposited * (MAX_BONUS_MULTIPLIER - 1));
            session.claimAmount = session.feeDeposited + bonus;
            if (session.claimAmount > dungeon.availableRewards) {
                session.claimAmount = dungeon.availableRewards;
            }
        }
        session.rewardAmount = session.claimAmount;
    }

    function claim(uint _tokenId) external checkOwner(_tokenId) {
        Session storage session = _sessions[_tokenId];
        uint dungeonId = session.dungeonId;
        Dungeon storage dungeon = _dungeonInfo[dungeonId];

        if (session.rewardAmount == 0) revert InvalidRewardAmount();
        if (session.endedAt == 0) revert NotFinished();
        if (session.claimAt != 0) revert AlreadyClaimed();
        if (block.timestamp < session.termDate) revert InvalidTimestamp();

        session.claimAt = block.timestamp;
        uint claimAmount = session.claimAmount;

        if (!session.gameCompleted) {
            uint timeLeft = session.termDate - session.startedAt;
            uint timePassed = session.claimAt - session.startedAt;
            uint timePercentage = (timePassed * 100) / timeLeft;
            uint decay = (claimAmount * timePercentage) / 100;
            claimAmount -= decay;
        }

        _xex.mint(msg.sender, claimAmount);
        dungeon.availableRewards -= claimAmount;
        dungeon.claimedRewards += claimAmount;
        dungeon.availableRewards -= claimAmount;

        _nft.transferFrom(address(this), msg.sender, _tokenId);
        emit EndSession(session);
    }

    function addDungeon(
        string memory _name,
        uint _startIn,
        uint _endIn,
        uint _minTermDate,
        uint _maxTermDate,
        uint _minMintFee,
        uint _difficulty,
        uint _availableRewards
    ) external onlyOwner {
        uint dungeonId = _dungeons.length() + 1;
        _dungeons.add(dungeonId);
        _dungeonInfo[dungeonId] = Dungeon(_name, _startIn, _endIn, _minTermDate, _maxTermDate, _minMintFee, _difficulty, true, _availableRewards, 0);
        rewardsPool += _availableRewards;
    }

    function updateDungeon(
        uint _dungeonId,
        string memory _name,
        uint _startIn,
        uint _endIn,
        uint _minTermDate,
        uint _maxTermDate,
        uint _minMintFee,
        uint _difficulty,
        bool _active
    ) external onlyOwner {
        if (!_dungeons.contains(_dungeonId)) revert DungeonNotFound();
        Dungeon storage dungeon = _dungeonInfo[_dungeonId];
        dungeon.name = _name;
        dungeon.startIn = _startIn;
        dungeon.endIn = _endIn;
        dungeon.minTermDate = _minTermDate;
        dungeon.maxTermDate = _maxTermDate;
        dungeon.minMintFee = _minMintFee;
        dungeon.difficulty = _difficulty;
        dungeon.active = _active;
    }

    function getDungeonInfo(uint _dungeonId) external view returns (Dungeon memory) {
        if (!_dungeons.contains(_dungeonId)) revert DungeonNotFound();
        return _dungeonInfo[_dungeonId];
    }

    function getSessionInfo(uint _tokenId) external view returns (Session memory) {
        return _sessions[_tokenId];
    }

    function getUserSessions(address _user) external view returns (uint[] memory) {
        return _userSessionIds[_user].values();
    }

    function getUserFinishedSessions(address _user) external view returns (uint[] memory) {
        return _userSessionFinished[_user].values();
    }

    function getDungeonSessions(uint _dungeonId) external view returns (uint[] memory) {
        return _sessionIds[_dungeonId].values();
    }

    function getDungeonFinishedSessions(uint _dungeonId) external view returns (uint[] memory) {
        return _sessionFinished[_dungeonId].values();
    }

    function getAllDungeons() external view returns (uint[] memory) {
        return _dungeons.values();
    }

    function setSigner(address _newSigner) external onlyOwner {
        _signer = _newSigner;
    }

    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }
}
