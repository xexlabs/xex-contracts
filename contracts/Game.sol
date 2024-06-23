// SPDX-License-Identifier: MIT
pragma solidity =0.8.26;
import {console} from "hardhat/console.sol";
import {XDON} from "./XDON.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

contract Game is Ownable {
    using SafeERC20 for IERC20;
    using EnumerableSet for EnumerableSet.UintSet;
    using ECDSA for bytes32;

    XDON public _nft;
    IERC20 public _rewardToken;
    address private _signer;

    struct Dungeon {
        string name;
        uint startIn;
        uint endIn;
        uint minTermDate;
        uint maxTermDate;
        uint minMintFee;
        uint failurePercentage;
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

    uint public constant MAX_BONUS_MULTIPLIER = 2;
    uint public failurePercentage = 20;
    uint public rewardsPool;

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
    error TermDateNotReached();

    // EVENTS:
    event NewSession(address user, uint tokenId, uint feeDeposited, uint termDate, uint rewardAmount, bool gameCompleted);
    event EndSession(Session session);
    event Claim(address user, uint tokenId, uint claimAmount, uint bonusAmount);

    constructor(address _nft_, address _signer_, address _rewardToken_) Ownable(msg.sender) {
        _nft = XDON(_nft_);
        _signer = _signer_;
        _rewardToken = IERC20(_rewardToken_);
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
        bytes memory messageHash = abi.encodePacked(_tokenId, _completed, _ts);
        bytes32 signature = MessageHashUtils.toEthSignedMessageHash(messageHash);
        if (ECDSA.recover(signature, messageHash) != _signer) revert InvalidSigner();
        _;
    }

    function addReward(uint _dungeonId, uint _amount) internal {
        _dungeonInfo[_dungeonId].availableRewards += _amount;
        _rewardToken.transferFrom(msg.sender, address(this), _amount);
    }

    function start(uint _dungeonId) external payable {
        Dungeon memory dungeon = _dungeonInfo[_dungeonId];

        if (!dungeon.active) revert DungeonNotActive();
        if (block.timestamp < dungeon.startIn) revert DungeonNotStarted();
        if (block.timestamp > dungeon.endIn) revert DungeonEnded();
        if (msg.value < dungeon.minMintFee) revert InvalidMintAmount();

        uint timeLeft = dungeon.endIn - block.timestamp;
        uint randomTime = uint(keccak256(abi.encodePacked(block.timestamp, msg.sender))) % timeLeft;
        uint termDate = block.timestamp + dungeon.minTermDate + randomTime;
        uint tokenId = _nft.mint(address(this));
        
        Session memory session = Session(
            msg.sender,
            tokenId,
            msg.value,
            0,
            false,
            _dungeonId,
            block.timestamp,
            0,
            0,
            0,
            0,
            0,
            termDate
        );
        
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
        
        _sessionIds[dungeonId].remove(_tokenId);
        _sessionFinished[dungeonId].add(_tokenId);
        _userSessionIds[msg.sender].remove(_tokenId);
        _userSessionFinished[msg.sender].add(_tokenId);
        
        if (!completed) {
            uint rewardForThePool = (session.feeDeposited * failurePercentage) / 100;
            session.claimAmount = session.feeDeposited - rewardForThePool;
            rewardsPool += rewardForThePool;
        } else {
            session.claimAmount = session.feeDeposited;
            uint bonusAmount = (session.feeDeposited * MAX_BONUS_MULTIPLIER) - session.feeDeposited;
            if (bonusAmount > rewardsPool) {
                bonusAmount = rewardsPool;
            }
            session.rewardAmount = bonusAmount;
            rewardsPool -= bonusAmount;
        }
        
        emit EndSession(session);
    }

    function claim(uint _tokenId) external checkOwner(_tokenId) {
        Session storage session = _sessions[_tokenId];
        
        if (session.endedAt == 0) revert NotFinished();
        if (session.claimAt != 0) revert AlreadyClaimed();
        if (block.timestamp < session.termDate) revert TermDateNotReached();
        
        session.claimAt = block.timestamp;
        uint claimAmount = session.claimAmount;
        uint bonusAmount = session.rewardAmount;
        
        if (!session.gameCompleted) {
            uint timeLeft = session.termDate - session.startedAt;
            uint timePassed = session.claimAt - session.startedAt;
            uint timePercentage = (timePassed * 100) / timeLeft;
            uint decay = (claimAmount * timePercentage) / 100;
            claimAmount -= decay;
            rewardsPool += decay;
        }
        
        _rewardToken.transfer(msg.sender, claimAmount + bonusAmount);
        _nft.transferFrom(address(this), msg.sender, _tokenId);
        
        emit Claim(msg.sender, _tokenId, claimAmount, bonusAmount);
    }

    function addDungeon(
        string memory _name,
        uint _startIn,
        uint _endIn,
        uint _minMintFee,
        uint _minTermDate,
        uint _maxTermDate,
        uint _rewardAmount
    ) external onlyOwner {
        uint dungeonId = _dungeons.length();
        _dungeons.add(dungeonId);
        if (_startIn > _endIn) revert InvalidTermPeriod();
        _dungeonInfo[dungeonId] = Dungeon(_name, _startIn, _endIn, _minTermDate, _maxTermDate, _minMintFee, failurePercentage, true, _rewardAmount, 0);
        addReward(dungeonId, _rewardAmount);
    }

    function removeDungeon(uint _dungeonId) external onlyOwner {
        _dungeons.remove(_dungeonId);
        delete _dungeonInfo[_dungeonId];
    }

    function setDungeonStatus(uint _dungeonId, bool _status) external onlyOwner {
        _dungeonInfo[_dungeonId].active = _status;
    }

    function setMinMintFee(uint _dungeonId, uint _minMintFee) external onlyOwner {
        _dungeonInfo[_dungeonId].minMintFee = _minMintFee;
    }

    function setFailurePercentage(uint _failurePercentage) external onlyOwner {
        failurePercentage = _failurePercentage;
    }

    function setSigner(address _signer_) external onlyOwner {
        _signer = _signer_;
    }

    function claimEther() external onlyOwner {
        (bool success, ) = msg.sender.call{value: address(this).balance}("");
        require(success, "Transfer failed.");
    }

    // VIEW's:
    function getOnlyActiveDungeons() external view returns (uint[] memory) {
        uint[] memory dungeons = new uint[](_dungeons.length());
        uint count = 0;
        for (uint i = 0; i < _dungeons.length(); i++) {
            uint id = _dungeons.at(i);
            if (_dungeonInfo[id].active) {
                dungeons[count] = id;
                count++;
            }
        }
        assembly {
            mstore(dungeons, count)
        }
        return dungeons;
    }

    function getActiveSessions(uint _dungeonId) external view returns (uint[] memory) {
        return _sessionIds[_dungeonId].values();
    }

    function getActiveSessionsByUser(address _user) external view returns (uint[] memory) {
        return _userSessionIds[_user].values();
    }

    function getFinishedSessions(uint _dungeonId) external view returns (uint[] memory) {
        return _sessionFinished[_dungeonId].values();
    }

    function getFinishedSessionsByUser(address _user) external view returns (uint[] memory) {
        return _userSessionFinished[_user].values();
    }

    function getDungeonInfo(uint _dungeonId) external view returns (Dungeon memory) {
        if (bytes(_dungeonInfo[_dungeonId].name).length == 0) revert DungeonNotFound();
        return _dungeonInfo[_dungeonId];
    }

    function getSession(uint _tokenId) external view returns (Session memory) {
        return _sessions[_tokenId];
    }

    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }
}
