# XexadonStaking Contract Documentation

The XexadonStaking contract allows users to stake their XDON tokens and earn boost rewards over time. This document describes the main functions of the contract, their return values, and provides examples of how to use them.

## Contract Functions

### 1. stakeAll()

Stakes all XDON tokens owned by the caller.

**Returns:** None

**Example:**
```javascript
const stakingContract = await ethers.getContractAt("XexadonStaking", stakingContractAddress);
await stakingContract.stakeAll();
```

### 2. stake(uint[] memory assets)

Stakes specific XDON tokens.

**Parameters:**
- `assets`: An array of XDON token IDs to stake

**Returns:** None

**Example:**
```javascript
const stakingContract = await ethers.getContractAt("XexadonStaking", stakingContractAddress);
const tokenIds = [1, 2, 3];
await stakingContract.stake(tokenIds);
```

### 3. unstakeAll(uint tokenId)

Unstakes all XDON tokens associated with a specific staking position.

**Parameters:**
- `tokenId`: The ID of the staking position NFT

**Returns:** None

**Example:**
```javascript
const stakingContract = await ethers.getContractAt("XexadonStaking", stakingContractAddress);
const stakingPositionId = 1;
await stakingContract.unstakeAll(stakingPositionId);
```

### 4. unstake(uint tokenId, uint[] memory assets)

Unstakes specific XDON tokens from a staking position.

**Parameters:**
- `tokenId`: The ID of the staking position NFT
- `assets`: An array of XDON token IDs to unstake

**Returns:** None

**Example:**
```javascript
const stakingContract = await ethers.getContractAt("XexadonStaking", stakingContractAddress);
const stakingPositionId = 1;
const tokenIdsToUnstake = [1, 2];
await stakingContract.unstake(stakingPositionId, tokenIdsToUnstake);
```

### 5. getBoostOf(address user)

Calculates the current boost for a user.

**Parameters:**
- `user`: The address of the user

**Returns:** 
- `uint`: The current boost value

**Example:**
```javascript
const stakingContract = await ethers.getContractAt("XexadonStaking", stakingContractAddress);
const userAddress = "0x...";
const boost = await stakingContract.getBoostOf(userAddress);
console.log("User's boost:", boost.toString());
```

### 6. getStakeOf(address user)

Retrieves staking information for a user.

**Parameters:**
- `user`: The address of the user

**Returns:** 
- `StakedXexadon`: A struct containing staking information
- `uint[]`: An array of staked XDON token IDs

**Example:**
```javascript
const stakingContract = await ethers.getContractAt("XexadonStaking", stakingContractAddress);
const userAddress = "0x...";
const [stakeInfo, stakedTokenIds] = await stakingContract.getStakeOf(userAddress);
console.log("Staking info:", stakeInfo);
console.log("Staked token IDs:", stakedTokenIds);
```

### 7. updateBoost()

Updates the boost for the caller, considering the last 24 hours.

**Returns:** None

**Example:**
```javascript
const stakingContract = await ethers.getContractAt("XexadonStaking", stakingContractAddress);
await stakingContract.updateBoost();
```

## Admin Functions

These functions can only be called by the contract owner:

### 8. setMaxBoost(uint _maxBoost)

Sets the maximum boost value.

### 9. setMaxStake(uint _maxStake)

Sets the maximum number of tokens that can be staked.

### 10. setLockupPeriod(uint _lockupPeriod)

Sets the lockup period for staked tokens.

### 11. setBaseUriPrefix(string memory uriPrefix)

Sets the base URI prefix for the staking position NFTs.

### 12. setAllowTransfer(address user, bool allow)

Allows or disallows transfer of staking position NFTs for a specific user.

## Events

The contract emits the following events:

- `Stake(uint256 id, address indexed user, uint256[] assets, uint256 lockupEndTime, uint256 boost)`
- `Unstake(uint256 id, address indexed user, uint256[] assets, uint256 lockupEndTime, uint256 boost)`
- `MaxBoostChanged(uint256 newMaxBoost)`
- `MaxStakeChanged(uint256 newMaxStake)`
- `LockupPeriodChanged(uint256 newLockupPeriod)`
- `BaseUriPrefixChanged(string newBaseUriPrefix)`
- `BoostUpdated(address indexed user, uint256 newBoost)`

These events can be used to track important actions and changes in the contract.
