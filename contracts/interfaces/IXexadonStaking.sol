// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
interface IXexadonStaking {
    struct StakedXexadon {
        address user;
        uint lockupEndTime;
    }
    error PositionNotFound();
    error InvalidAmount();
    error LockupPeriodNotOver();
    error NotTheOwnerOfTheToken();
    error TokenNotFoundInStakedTokens();
    error AssetNotApproved(uint tokenId, address approved);
    error MaxStakeReached();

    event MaxBoostChanged(uint newMaxBoost);
    event MaxStakeChanged(uint newMaxStake);
    event LockupPeriodChanged(uint newLockupPeriod);
    event BaseUriPrefixChanged(string newBaseUriPrefix);
    event Stake(uint tokenId, address user, uint[] assets, uint lockupEndTime, uint boost);
    event Unstake(uint tokenId, address user, uint[] assets, uint lockupEndTime, uint boost);
    event BoostUpdated(address user, uint newBoost);

    function MAX_BOOST() external view returns (uint);
    function stake(uint[] memory assets) external;
    function unstake(uint tokenId, uint[] memory assets) external;
    function getBoostOf(address user) external view returns (uint);
    function getStakeOf(address user) external view returns (StakedXexadon memory, uint[] memory);
}
