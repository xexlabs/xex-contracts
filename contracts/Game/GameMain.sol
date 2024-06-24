// SPDX-License-Identifier: MIT
pragma solidity =0.8.26;

import {GameCore} from "./GameCore.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

contract GameMain is GameCore {
    using EnumerableSet for EnumerableSet.UintSet;
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant DUGEON_ROLE = keccak256("DUGEON_ROLE");
    bool private enableProofChecking = false;

    constructor(address _xex_) GameCore(_xex_) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(DUGEON_ROLE, msg.sender);
    }

    function setAdmin(address account, bool isAdmin) external onlyRole(ADMIN_ROLE) {
        if (isAdmin) {
            grantRole(ADMIN_ROLE, account);
        } else {
            revokeRole(ADMIN_ROLE, account);
        }
    }

    function setMinter(address account, bool isMinter) external onlyRole(ADMIN_ROLE) {
        if (isMinter) {
            grantRole(MINTER_ROLE, account);
        } else {
            revokeRole(MINTER_ROLE, account);
        }
    }

    using EnumerableSet for EnumerableSet.UintSet;

    function addDungeon(
        string memory _name,
        uint _startIn,
        uint _endIn,
        uint _minTermDate,
        uint _maxTermDate,
        uint _minMintFee,
        uint _difficulty,
        uint _availableRewards
    ) external onlyRole(DUGEON_ROLE) {
        uint dungeonId = _dungeons.length() + 1;
        _dungeons.add(dungeonId);
        _dungeonInfo[dungeonId] = Dungeon(msg.sender, _name, _startIn, _endIn, _minTermDate, _maxTermDate, _minMintFee, _difficulty, true, _availableRewards, 0);
        rewardsPool += _availableRewards;
        _dungeonsByUser[msg.sender].add(dungeonId);
        emit DungeonAdded(dungeonId, _name, _startIn, _endIn, _minTermDate, _maxTermDate, _minMintFee, _difficulty, _availableRewards);
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
    ) external {
        if (!_dungeons.contains(_dungeonId)) revert DungeonNotFound();
        Dungeon storage dungeon = _dungeonInfo[_dungeonId];
        if (dungeon.owner != msg.sender && !hasRole(ADMIN_ROLE, msg.sender)) revert NotOwner();
        dungeon.name = _name;
        dungeon.startIn = _startIn;
        dungeon.endIn = _endIn;
        dungeon.minTermDate = _minTermDate;
        dungeon.maxTermDate = _maxTermDate;
        dungeon.minMintFee = _minMintFee;
        dungeon.difficulty = _difficulty;
        dungeon.active = _active;
        emit DungeonUpdated(_dungeonId, _name, _startIn, _endIn, _minTermDate, _maxTermDate, _minMintFee, _difficulty, _active);
    }

    function setSigner(address _newSigner) external onlyRole(ADMIN_ROLE) {
        if (_newSigner == address(0)) revert InvalidSigner();
        _signer = _newSigner;
        emit NewSigner(_newSigner);
    }

    function setBaseURI(string memory newBaseURI) external onlyRole(ADMIN_ROLE) {
        if (keccak256(bytes(baseURI_)) == keccak256(bytes(newBaseURI))) revert InvalidBaseURI();
        if (bytes(newBaseURI).length == 0) revert InvalidBaseURI();
        baseURI_ = newBaseURI;
        emit NewBaseURI(newBaseURI);
    }
}
