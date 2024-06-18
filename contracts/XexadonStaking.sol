// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IXDON} from "./interfaces/IXDON.sol";
import {IXexadonStaking} from "./interfaces/IXexadonStaking.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
contract XexadonStaking is ERC721, IXexadonStaking, Ownable {
    using EnumerableSet for EnumerableSet.UintSet;
    uint public MAX_BOOST = 50000;
    uint public MAX_STAKE = 25;
    uint public LOCKUP_PERIOD = 7 days;
    mapping(address => StakedXexadon) internal stakeOf;
    mapping(address => EnumerableSet.UintSet) internal assetsOf;
    uint internal _nextId;
    IXDON public asset;
    string private _baseUriPrefix;
    constructor(address _asset) ERC721("Xexadon Staking", "XEX") Ownable(msg.sender) {
        _nextId = 1;
        asset = IXDON(_asset);
        asset.balanceOf(address(this));
    }
    function stakeAll() external {
        uint balanceOf = asset.balanceOf(msg.sender);
        uint[] memory assets = new uint[](balanceOf);
        for (uint i = 0; i < balanceOf; i++) {
            assets[i] = i;
        }
        stake(assets);
    }
    function stake(uint[] memory assets) public {
        if (assetsOf[msg.sender].length() + assets.length > MAX_STAKE) {
            revert MaxStakeReached();
        }
        uint id = _nextId++;
        for (uint i = 0; i < assets.length; i++) {
            uint tokenId = assets[i];
            bool isApproved = asset.getApproved(tokenId) == address(this);
            bool isApprovedAll = asset.isApprovedForAll(msg.sender, address(this));
            if (!isApproved && !isApprovedAll) {
                revert AssetNotApproved(tokenId, asset.getApproved(tokenId));
            }
            asset.transferFrom(msg.sender, address(this), tokenId);
        }
        uint boost = getBoostOf(msg.sender);
        uint lockupEndTime = block.timestamp + LOCKUP_PERIOD;
        stakeOf[msg.sender].user = msg.sender;
        stakeOf[msg.sender].lockupEndTime = lockupEndTime;
        for (uint i = 0; i < assets.length; i++) {
            assetsOf[msg.sender].add(assets[i]);
        }
        if (balanceOf(msg.sender) == 0) {
            _safeMint(msg.sender, id);
        }
        emit Stake(id, msg.sender, assets, lockupEndTime, boost);
    }
    function unstakeAll(uint tokenId) external {
        uint[] memory assets = assetsOf[msg.sender].values();
        unstake(tokenId, assets);
    }
    function unstake(uint tokenId, uint[] memory assets) public {
        StakedXexadon memory r = stakeOf[msg.sender];
        if (ownerOf(tokenId) != msg.sender) {
            revert PositionNotFound();
        }
        bool isApproved = asset.getApproved(tokenId) == msg.sender;
        bool isApprovedAll = asset.isApprovedForAll(msg.sender, address(this));
        if (!isApproved && !isApprovedAll) revert AssetNotApproved(tokenId, asset.getApproved(tokenId));
        if (block.timestamp < r.lockupEndTime) revert LockupPeriodNotOver();
        for (uint i = 0; i < assets.length; i++) {
            uint assetId = assets[i];
            asset.transferFrom(address(this), msg.sender, assetId);
            assetsOf[msg.sender].remove(assetId);
        }
        if (assetsOf[msg.sender].length() == 0) {
            delete stakeOf[msg.sender];
            _burn(tokenId);
        }
        emit Unstake(tokenId, msg.sender, assets, r.lockupEndTime, getBoostOf(msg.sender));
    }

    // VIEWS:
    function getBoostOf(address user) public view returns (uint boost) {
        uint boostPerDay;
        uint elapsedDays = (block.timestamp - stakeOf[user].lockupEndTime) / 1 days;
        if (elapsedDays == 1) boostPerDay = 1;
        else if (elapsedDays <= 10) boostPerDay = 2;
        else boostPerDay = 4;
        uint numStaked = assetsOf[user].length();
        boost = boostPerDay * numStaked * elapsedDays;
        if (boost > MAX_BOOST) boost = MAX_BOOST;
    }
    function getStakeOf(address user) external view returns (StakedXexadon memory, uint[] memory) {
        StakedXexadon memory stakes = stakeOf[user];
        return (stakes, assetsOf[user].values());
    }
    function _baseURI() internal view override returns (string memory) {
        return _baseUriPrefix;
    }
    function supportsInterface(bytes4 interfaceId) public view override returns (bool) {
        return interfaceId == type(IXexadonStaking).interfaceId || super.supportsInterface(interfaceId);
    }

    // ADMIN:
    function setMaxBoost(uint _maxBoost) external onlyOwner {
        MAX_BOOST = _maxBoost;
        emit MaxBoostChanged(_maxBoost);
    }
    function setMaxStake(uint _maxStake) external onlyOwner {
        MAX_STAKE = _maxStake;
        emit MaxStakeChanged(_maxStake);
    }
    function setLockupPeriod(uint _lockupPeriod) external onlyOwner {
        LOCKUP_PERIOD = _lockupPeriod;
        emit LockupPeriodChanged(_lockupPeriod);
    }
    function setBaseUriPrefix(string memory uriPrefix) external onlyOwner {
        _baseUriPrefix = uriPrefix;
        emit BaseUriPrefixChanged(uriPrefix);
    }
}