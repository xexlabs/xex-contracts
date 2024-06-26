// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Holder} from "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IXDON} from "./interfaces/IXDON.sol";
import {IXexadonStaking} from "./interfaces/IXexadonStaking.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {IERC721Metadata} from "@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
//import {console} from "hardhat/console.sol";
contract XexadonStaking is IXexadonStaking, Ownable, IERC721Metadata, ERC721Enumerable, ERC721Holder {
    using EnumerableSet for EnumerableSet.UintSet;
    uint public MAX_BOOST = 50000;
    uint public MAX_STAKE = 25;
    uint public LOCKUP_PERIOD = 7 days;
    mapping(address => StakedXexadon) internal stakeOf;
    mapping(address => EnumerableSet.UintSet) internal assetsOf;
    mapping(address => uint) public lastBoostUpdate;
    uint internal _nextId;
    IXDON public asset;
    string private _baseUriPrefix;
    constructor(address _asset) ERC721("Xexadon Staking", "XEX") Ownable(msg.sender) ERC721Enumerable() {
        _nextId = 1;
        asset = IXDON(_asset);
        asset.balanceOf(address(this));
        allowTransfer[address(this)] = true;
        allowTransfer[address(0)] = true;
    }

    function stakeAll() external {
        uint balanceOf = asset.balanceOf(msg.sender);
        uint[] memory assets = new uint[](balanceOf);
        for (uint i = 0; i < balanceOf; i++) {
            assets[i] = asset.tokenOfOwnerByIndex(msg.sender, i);
        }
        stake(assets);
    }
    function stake(uint[] memory assets) public {
        if (assetsOf[msg.sender].length() + assets.length > MAX_STAKE) {
            revert MaxStakeReached();
        }
        uint id = _nextId;
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
        _nextId++;
        lastBoostUpdate[msg.sender] = block.timestamp;
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
        lastBoostUpdate[msg.sender] = block.timestamp;
        emit Unstake(tokenId, msg.sender, assets, r.lockupEndTime, getBoostOf(msg.sender));
    }

    // VIEWS:
    function getBoostOf(address user) public view returns (uint boost) {
        uint boostPerDay;
        uint elapsedDays;
        uint lastUpdate = lastBoostUpdate[user];
        uint currentDay = (block.timestamp / 1 days) * 1 days;
        uint lastUpdateDay = (lastUpdate / 1 days) * 1 days;
        if (currentDay > lastUpdateDay) {
            elapsedDays = (currentDay - lastUpdateDay) / 1 days;
        }
        uint numStaked = assetsOf[user].length();
        if (numStaked <= 1) boostPerDay = 1;
        else if (numStaked <= 10) boostPerDay = 2;
        else boostPerDay = 4;
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
    function getBaseURI() external view returns (string memory) {
        return _baseUriPrefix;
    }
    function supportsInterface(bytes4 interfaceId) public view override(ERC721Enumerable, IERC165) returns (bool) {
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

    // Prevent transfer of staking receipt NFT
    error TransferNotAllowed();
    mapping(address => bool) public allowTransfer;
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        if (!allowTransfer[to] && !allowTransfer[auth]) {
            revert TransferNotAllowed();
        }
        return super._update(to, tokenId, auth);
    }
    function setAllowTransfer(address user, bool allow) external onlyOwner {
        allowTransfer[user] = allow;
    }
    function onERC721Received(address, address, uint256, bytes memory) public pure override returns (bytes4) {
        return this.onERC721Received.selector;
    }
}
