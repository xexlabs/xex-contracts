# XexadonStaking Contract Documentation

The XexadonStaking contract allows users to stake their XDON tokens and earn boost rewards over time. This document describes the main functions of the contract, their return values, and provides examples of how to use them.

## Contract Functions

### 1. stakeAll()

Stakes all XDON tokens owned by the caller.

**Returns:** None

**Example:**

```javascript
await stakingContract.stakeAll()
```

**Example Output:**

```javascript
// Transaction receipt
{
  transactionHash: '0x123...abc',
  events: {
    Stake: {
      id: '1',
      user: '0xUserAddress...',
      assets: ['1', '2', '3'],
      lockupEndTime: '1234567890',
      boost: '0'
    }
  }
}
```

### 2. stake(uint[] memory assets)

Stakes specific XDON tokens.

**Parameters:**

-   `assets`: An array of XDON token IDs to stake

**Returns:** None

**Example:**

```javascript
const tokenIds = [1, 2, 3]
await stakingContract.stake(tokenIds)
```

**Example Output:**

```javascript
// Transaction receipt
{
  transactionHash: '0x456...def',
  events: {
    Stake: {
      id: '2', // the id of the staking position NFT
      user: '0xUserAddress...', // the address of the user
      assets: ['1', '2', '3'], // the array of XDON token IDs that are staked
      lockupEndTime: '1234567890', // the lockup end time
      boost: '150' // the current user boost value
    }
  }
}
```

### 3. unstakeAll(uint tokenId)

Unstakes all XDON tokens associated with a specific staking position.

**Parameters:**

-   `tokenId`: The ID of the staking position NFT

**Returns:** None

**Example:**

```javascript
const stakingPositionId = 1
await stakingContract.unstakeAll(stakingPositionId)
```

**Example Output:**

```javascript
// Transaction receipt
{
  transactionHash: '0x789...ghi',
  events: {
    Unstake: {
      id: '1', // the id of the staking position NFT
      user: '0xUserAddress...', // the address of the user
      assets: ['1', '2', '3', '4', '5'], // the array of XDON token IDs that are unstaked
      lockupEndTime: '1234567890', // the lockup end time
      boost: '100' // the current user boost value
    }
  }
}
```

### 4. unstake(uint tokenId, uint[] memory assets)

Unstakes specific XDON tokens from a staking position.

**Parameters:**

-   `tokenId`: The ID of the staking position NFT
-   `assets`: An array of XDON token IDs to unstake

**Returns:** None

**Example:**

```javascript
const stakingPositionId = 1
const tokenIdsToUnstake = [1, 2]
await stakingContract.unstake(stakingPositionId, tokenIdsToUnstake)
```

**Example Output:**

```javascript
// Transaction receipt
{
  transactionHash: '0xabc...123',
  events: {
    Unstake: {
      id: '1',
      user: '0xUserAddress...',
      assets: ['1', '2'],
      lockupEndTime: '1234567890',
      boost: '80'
    }
  }
}
```

### 5. getBoostOf(address user)

Calculates the current boost for a user.

**Parameters:**

-   `user`: The address of the user

**Returns:**

-   `uint`: The current boost value

**Example:**

```javascript
const userAddress = '0x...'
const boost = await stakingContract.getBoostOf(userAddress)
console.log("User's boost:", boost.toString())
```

**Example Output:**

```javascript
User's boost: 150
```

### 6. getStakeOf(address user)

Retrieves staking information for a user.

**Parameters:**

-   `user`: The address of the user

**Returns:**

-   `StakedXexadon`: A struct containing staking information
-   `uint[]`: An array of staked XDON token IDs

**Example:**

```javascript
const userAddress = '0x...'
const [stakeInfo, stakedTokenIds] = await stakingContract.getStakeOf(userAddress)
console.log('Staking info:', stakeInfo)
console.log('Staked token IDs:', stakedTokenIds)
```

**Example Output:**

```javascript
Staking info: {
  user: '0xUserAddress...',
  lockupEndTime: '1234567890',
  boost: '150'
}
Staked token IDs: ['1', '2', '3', '4', '5']
```

## Events

The contract emits the following events:

-   `Stake(uint256 id, address indexed user, uint256[] assets, uint256 lockupEndTime, uint256 boost)`
-   `Unstake(uint256 id, address indexed user, uint256[] assets, uint256 lockupEndTime, uint256 boost)`
-   `MaxBoostChanged(uint256 newMaxBoost)`
-   `MaxStakeChanged(uint256 newMaxStake)`
-   `LockupPeriodChanged(uint256 newLockupPeriod)`
-   `BaseUriPrefixChanged(string newBaseUriPrefix)`
-   `BoostUpdated(address indexed user, uint256 newBoost)`

These events can be used to track important actions and changes in the contract.
