// SPDX-License-Identifier: MIT
pragma solidity =0.8.26;
interface IGame {
    struct Dungeon {
        address owner;
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
        address user; // [0]
        uint tokenId; // [1]
        uint feeDeposited; // [2]
        uint rewardAmount; // [3]
        bool gameCompleted; // [4]
        uint dungeonId; // [5]
        uint startedAt; // [6]
        uint endedAt; // [7]
        uint claimAmount; // [8]
        uint claimAt; // [9]
        uint availableRewards; // [10]
        uint claimedRewards; // [11]
        uint termDate; // [12]
        address operator; // [13] allow operator to claim
    }
    // Events
    event NewSession(address user, uint tokenId, uint feeDeposited, uint termDate, uint rewardAmount, bool gameCompleted);
    event EndSession(uint tokenId, uint claimAmount);
    event EndSessionBunusTooHigh(uint tokenId, uint avail, uint requested);
    event Claim(uint tokenId, uint claimAmount);
    event DungeonAdded(uint dungeonId, string name, uint startIn, uint endIn, uint minTermDate, uint maxTermDate, uint minMintFee, uint difficulty, uint availableRewards);
    event DungeonUpdated(uint dungeonId, string name, uint startIn, uint endIn, uint minTermDate, uint maxTermDate, uint minMintFee, uint difficulty, bool active);
    event NewSigner(address newSigner);
    event NewBaseURI(string newBaseURI);
    // Errors
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
    error InvalidBaseURI();
    error InvalidSignature();
    error InvalidSignatureInvalidTimestamp();
    error NotOwner();
    error Paused();
    error InvalidGameCompleted();
    // Callable Functions
    function start(uint _dungeonId, address operator) external payable;
    function end(uint _tokenId, bool completed, uint ts, bytes memory _signature) external;
    function claim(uint _tokenId) external;
    function addDungeon(string memory _name, uint _startIn, uint _endIn, uint _minTermDate, uint _maxTermDate, uint _minMintFee, uint _difficulty, uint _availableRewards) external;
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
    ) external;
    function getDungeonInfo(uint _dungeonId) external view returns (Dungeon memory);
    function getSessionInfo(uint _tokenId) external view returns (Session memory);
    function getUserSessions(address _user) external view returns (uint[] memory);
    function getUserFinishedSessions(address _user) external view returns (uint[] memory);
    function getDungeonSessions(uint _dungeonId) external view returns (uint[] memory);
    function getDungeonFinishedSessions(uint _dungeonId) external view returns (uint[] memory);
    function getAllDungeons() external view returns (uint[] memory);
    function setSigner(address _newSigner) external;
}
