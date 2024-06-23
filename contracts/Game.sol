// SPDX-License-Identifier: MIT
pragma solidity =0.8.26;
import {console} from "hardhat/console.sol";
import {GameNFT} from "./GameNFT.sol";
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

    GameNFT public _nft;
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

    constructor(address _nft_, address _signer_, address _rewardToken_) Ownable(msg.sender) {
        _nft = GameNFT(_nft_);
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
        // check owner of token is msg.sender
        if (_nft.ownerOf(_tokenId) != msg.sender) revert InvalidOwner();
        // check timestamp is within 1 minute of now
        if (_ts > block.timestamp + 1 minutes) revert InvalidTimestamp();
        //        bytes memory messageHash = abi.encodePacked(_tokenId, _completed, _ts);
        //        bytes32 signature = MessageHashUtils.toEthSignedMessageHash(messageHash);
        //        address ok = ECDSA.recover(messageHash, signature) == _signer;
        //        if (ok) revert InvalidSigner();
        console.log("checkProof!");
        _;
    }

    function addReward(uint _dungeonId, uint _amount) internal {
        _dungeonInfo[_dungeonId].availableRewards += _amount;
        _rewardToken.transferFrom(msg.sender, address(this), _amount);
    }

    function start(uint _dungeonId) external payable {
        Dungeon memory dungeon = _dungeonInfo[_dungeonId];

        // checks:
        if (!dungeon.active) revert DungeonNotActive();
        // check dungeon start/end:
        if (block.timestamp < dungeon.startIn) revert DungeonNotStarted();
        if (block.timestamp > dungeon.endIn) revert DungeonEnded();
        if (msg.value < dungeon.minMintFee) revert InvalidMintAmount();

        // sets:
        // get termDate froms tart and end:
        uint timeLeft = dungeon.endIn - block.timestamp;
        uint randomTime = uint(keccak256(abi.encodePacked(block.timestamp, msg.sender))) % timeLeft;
        uint termDate = block.timestamp + dungeon.minTermDate + randomTime;
        // we mint the nft and store it here:
        uint tokenId = _nft.mint(address(this));
        Session memory session = _sessions[tokenId];
        session.startedAt = block.timestamp;
        _sessionIds[_dungeonId].add(tokenId);
        _userSessionIds[msg.sender].add(tokenId);
        _sessions[tokenId] = Session(msg.sender, tokenId, msg.value, 0, false, _dungeonId, block.timestamp, 0, 0, 0, 0, 0, termDate);
        emit NewSession(msg.sender, tokenId, msg.value, termDate, 0, false);
    }

    // proof is a signed message from the game server
    function end(uint _tokenId, bool completed, uint ts) external checkProof(_tokenId, completed, ts) checkOwner(_tokenId) {
        // sets:
        Session memory session = _sessions[_tokenId];
        uint dungeonId = session.dungeonId;
        Dungeon memory dungeon = _dungeonInfo[dungeonId];
        session.endedAt = block.timestamp;
        session.gameCompleted = completed;
        bool completedInTime = block.timestamp < session.startedAt + dungeon.maxTermDate;
        _sessionIds[dungeonId].remove(_tokenId);
        _sessionFinished[dungeonId].add(_tokenId);
        session.rewardAmount = (session.feeDeposited * dungeon.failurePercentage) / 100;
        if (!completed || !completedInTime) {
            uint rewardForThePool = (session.feeDeposited * dungeon.failurePercentage) / 100;
            session.claimAmount = session.feeDeposited - rewardForThePool;
            addReward(dungeonId, rewardForThePool);
        } else {
            session.claimAmount = session.feeDeposited;
        }
        _sessions[_tokenId] = session;
    }

    function claim(uint _tokenId) external checkOwner(_tokenId) {
        Session memory session = _sessions[_tokenId];
        uint dungeonId = session.dungeonId;
        Dungeon memory dungeon = _dungeonInfo[dungeonId];
        // checks:
        if (_sessions[_tokenId].rewardAmount == 0) revert InvalidRewardAmount();
        if (session.endedAt == 0) revert NotFinished();
        if (session.claimAt != 0) revert AlreadyClaimed();
        // sets:
        session.claimAt = block.timestamp;
        // compute the amount of xex to claim:
        uint claimAmount = session.claimAmount;
        if (!session.gameCompleted) {
            //REVIEW
            uint timeLeft = session.endedAt - session.startedAt;
            uint timePassed = session.claimAt - session.startedAt;
            uint timePercentage = (timePassed * 100) / timeLeft;
            uint decay = (claimAmount * timePercentage) / 100;
            claimAmount -= decay;
        }
        _rewardToken.transfer(msg.sender, session.rewardAmount);
        dungeon.availableRewards -= session.rewardAmount;
        dungeon.claimedRewards += session.rewardAmount;

        _sessions[_tokenId] = session;
        _dungeonInfo[dungeonId] = dungeon;
        _nft.transferFrom(address(this), msg.sender, _tokenId);
        emit EndSession(session);
    }

    function addDungeon(
        string memory _name,
        uint _startIn,
        uint _endIn,
        uint _minMintFee,
        uint _minTermDate,
        uint _maxTermDate,
        uint _failurePercentage,
        uint _rewardAmount
    ) external onlyOwner {
        uint dungeonId = _dungeons.length();
        _dungeons.add(dungeonId);
        // start > end
        if (_startIn > _endIn) revert InvalidTermPeriod();
        _dungeonInfo[dungeonId] = Dungeon(_name, _startIn, _endIn, _minTermDate, _maxTermDate, _minMintFee, _failurePercentage, true, _rewardAmount, 0);
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

    function setRewardPercentage(uint _dungeonId, uint _failurePercentage) external onlyOwner {
        _dungeonInfo[_dungeonId].failurePercentage = _failurePercentage;
    }

    function setSigner(address _signer_) external onlyOwner {
        _signer = _signer_;
    }

    function claimEther() external onlyOwner {
        //REVIEW: what to do with deposited ether?
        (bool success, ) = msg.sender.call{value: address(this).balance}("");
        require(success, "Transfer failed.");
    }

    // VIEW's:
    function getOnlyActiveDungeons() external view returns (uint[] memory) {
        uint[] memory dungeons = new uint[](_dungeons.length());
        for (uint i = 0; i < _dungeons.length(); i++) {
            uint id = _dungeons.at(i);
            if (_dungeonInfo[id].active) {
                dungeons[i] = id;
            }
        }
        return dungeons;
    }

    function getActiveSessions(uint _dungeonId) external view returns (uint[] memory) {
        uint[] memory sessions = new uint[](_sessionIds[_dungeonId].length());
        for (uint i = 0; i < _sessionIds[_dungeonId].length(); i++) {
            sessions[i] = _sessionIds[_dungeonId].at(i);
        }
        return sessions;
    }

    function getActiveSessionsByUser(address _user) external view returns (uint[] memory) {
        uint size = _userSessionIds[_user].length();
        uint[] memory sessions = new uint[](size);
        for (uint i = 0; i < size; i++) {
            sessions[i] = _userSessionIds[_user].at(i);
        }
        return sessions;
    }

    function getFinishedSessions(uint _dungeonId) external view returns (uint[] memory) {
        uint[] memory sessions = new uint[](_sessionFinished[_dungeonId].length());
        for (uint i = 0; i < _sessionFinished[_dungeonId].length(); i++) {
            sessions[i] = _sessionFinished[_dungeonId].at(i);
        }
        return sessions;
    }

    function getFinishedSessionsByUser(address _user) external view returns (uint[] memory) {
        uint size = _userSessionFinished[_user].length();
        uint[] memory sessions = new uint[](size);
        for (uint i = 0; i < size; i++) {
            sessions[i] = _userSessionFinished[_user].at(i);
        }
        return sessions;
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
