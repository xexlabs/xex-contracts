# XEX Contract Documentation

This document provides a comprehensive guide for React developers to interact with the XEX smart contract.

## Contract Overview

XEX is an ERC20 token with additional functionality for minting, staking, and reward calculation. It implements a unique economic model with features such as rank claiming, minting rewards, and staking mechanisms.

## Key Features

1. ERC20 token functionality
2. Rank claiming system
3. Minting rewards
4. Staking mechanism
5. APY calculation
6. Minter factory

## Contract Functions

### View Functions

#### `getMaxTerm() -> uint`

-   Returns the maximum allowed term for minting or staking.
-   Use this to set the upper limit for term input fields in the UI.
-   Example return value: `10` (representing 10 days)
-   This value may change based on the global rank, so it should be queried regularly.

#### `getMinTerm() -> uint`

-   Returns the minimum allowed term for minting or staking.
-   Use this to set the lower limit for term input fields in the UI.
-   Example return value: `1` (representing 1 day)
-   This is a constant value defined in the contract.

#### `getCurrentAMP() -> uint`

-   Returns the current Reward Amplifier.
-   Can be displayed in the UI to show the current minting reward multiplier.
-   Example return value: `5` (representing a 5x amplifier)
-   This value is constant in the current implementation, starting and ending at 5.

#### `getCurrentEAAR() -> uint`

-   Returns the current Early Adopter Amplifier Rate.
-   Can be used to display the current early adopter bonus.
-   Example return value: `1` (representing a 0.1% bonus)
-   This value decreases as the global rank increases, providing higher rewards for early adopters.

#### `getCurrentMaxTerm() -> uint`

-   Returns the current maximum term, which may change based on the global rank.
-   Use this to dynamically update the maximum allowed term in the UI.
-   Example return value: `10` (representing 10 days)
-   This value is constant in the current implementation.

#### `getUserMint(address user) -> MintInfo`

-   Returns the MintInfo struct for a given user.
-   Use this to display a user's current minting status.
-   Example return value:
    ```
    {
      user: "0x1234...5678",
      term: 10,
      maturityTs: 1672531200,
      rank: 1,
      amplifier: 5,
      eaaRate: 1
    }
    ```
-   This information is crucial for calculating potential rewards and determining when a mint is mature.

#### `getUserStake(address user) -> (uint term, uint maturityTs, uint amount, uint apy)`

-   Returns the stake information for a given user.
-   Use this to display a user's current stake details.
-   Example return value: `[10, 1672531200, 1000000000000000000000, 20000000000000000000]` (representing a 10-day stake of 1000 XEX with 20% APY, maturing on 2023-01-01)
-   This information is essential for showing users their current stakes and when they can withdraw.
-   the apy is in 1e18 format, so you need to convert it to percentage, back.

#### `calculateAPY() -> uint`

-   Returns the current Annual Percentage Yield (APY) for staking.
-   Display this in the UI to show the current staking rewards rate.
-   Example return value: `20000000000000000000` (representing 20% APY)
-   The APY is fixed at 20% in the current implementation.
-   The APY is in 1e18 format, so you need to convert it to percentage, back.

#### `rewardsOf(address user) -> (uint mintReward, uint stakeReward)`

-   Returns the current minting and staking rewards for a user.
-   Use this to display a user's potential rewards.
-   Example return value: `[500000000000000000000, 100000000000000000000]` (representing 500 XEX minting reward and 100 XEX staking reward)
-   This function combines both minting and staking rewards, providing a comprehensive view of a user's potential earnings.

#### `isMature(address user) -> (bool mature, uint ts)`

-   Checks if a user's stake is mature and returns the time difference.
-   Use this to show if a user can withdraw their stake and how much time is left.
-   Example return value: `[true, 86400]` (representing a mature stake that matured 1 day ago)
-   This function is useful for enabling/disabling withdrawal buttons and showing countdown timers.

#### `mintersOf(address user) -> address[]`

-   Returns an array of minter contract addresses for a user.
-   Use this to display a list of a user's minter contracts.
-   Example return value: `["0xabcd...1234", "0xefgh...5678"]`
-   This function is part of the minter factory feature, allowing users to manage multiple minting contracts.

#### `minterInfoOf(address user) -> MintInfo[]`

-   Returns an array of MintInfo structs for a user's minters.
-   Use this to display detailed information about a user's minter contracts.
-   Example return value:
    ```
    [
      {
        user: "0x1234...5678",
        term: 10,
        maturityTs: 1672531200,
        rank: 1,
        amplifier: 5,
        eaaRate: 1
      },
      {
        user: "0x1234...5678",
        term: 10,
        maturityTs: 1672617600,
        rank: 2,
        amplifier: 5,
        eaaRate: 1
      }
    ]
    ```
-   This function provides detailed information about each minter, useful for displaying in a table or list view.

#### `minterInfoOfByOffset(address user, uint offset, uint limit) -> MintInfo[]`

-   Returns an array of MintInfo structs for a user's minters, starting from a specific offset and up to a specified limit.
-   Use this for pagination when displaying minter information, especially for users with many minters.
-   Parameters:
    -   `user`: The address of the user whose minter information is being queried.
    -   `offset`: The starting index in the user's minter array.
    -   `limit`: The maximum number of minter infos to return.
-   Example usage: `minterInfoOfByOffset(userAddress, 10, 5)` would return information for minters 11-15 (if they exist).
-   Example return value:
    ```
    [
      {
        user: "0x1234...5678",
        term: 10,
        maturityTs: 1672531200,
        rank: 11,
        amplifier: 5,
        eaaRate: 1
      },
      {
        user: "0x1234...5678",
        term: 10,
        maturityTs: 1672617600,
        rank: 12,
        amplifier: 5,
        eaaRate: 1
      }
    ]
    ```
-   This function is particularly useful for implementing efficient loading of minter data in the UI, especially for users with a large number of minters.

#### `minter_getMintReward(address user) -> uint[]`

-   Returns an array of mint rewards for a user's minters.
-   Use this to show potential rewards for each of a user's minter contracts.
-   Example return value: `[500000000000000000000, 750000000000000000000]` (representing 500 XEX and 750 XEX rewards for two minters)
-   This function allows users to see the potential rewards for each of their minters, helping them decide when to claim.

### State-Changing Functions

#### `claimRank(uint term)`

-   Allows a user to claim a rank for minting.
-   Implement a form in the UI that takes a term input and calls this function.
-   The term must be between the minimum (1 day) and maximum (10 days) allowed terms.
-   This function increases the global rank and creates a new MintInfo for the user.

#### `claimMintReward()`

-   Claims the minting reward for a user.
-   Add a button in the UI that calls this function when a user's mint is mature.
-   This function calculates the reward based on the user's rank, term, and other factors, then mints new XEX tokens.

#### `claimMintRewardTo(address to)`

-   Claims the minting reward and sends it to a specified address.
-   Implement a form that takes an address input and calls this function.
-   This function is similar to `claimMintReward()` but allows sending the reward to a different address.

#### `claimMintRewardAndStake(uint pct, uint term)`

-   Claims the minting reward and stakes a percentage of it.
-   Create a form that takes percentage and term inputs and calls this function.
-   This function combines claiming and staking in one transaction, which can be more gas-efficient.

#### `stake(uint amount, uint term)`

-   Allows a user to stake XEX tokens.
-   Implement a staking form with amount and term inputs.
-   The amount must be greater than the minimum stake amount (0 XEX), and the term must be within the allowed range (1-10 days).
-   This function burns the staked tokens and creates a new StakeInfo for the user.

#### `withdraw()`

-   Withdraws staked XEX tokens and rewards.
-   Add a withdrawal button that becomes active when a stake is mature.
-   This function calculates the stake reward, mints new tokens for the original stake and the reward, and deletes the StakeInfo.

#### `minter_create(uint amount, uint term)`

-   Creates multiple minter contracts for a user.
-   Implement a form that takes amount and term inputs to create minters.
-   This function deploys new Minter contracts and claims ranks for them, allowing users to manage multiple mints.

#### `minter_claimRank(uint limit)`

-   Claims ranks for multiple minter contracts.
-   Add a button that takes a limit input and calls this function.
-   This function iterates through the user's minters and claims ranks for those that haven't claimed yet, up to the specified limit.

#### `minter_claimMintReward(uint limit, address to)`

-   Claims rewards from multiple minter contracts.
-   Implement a form with limit and address inputs to claim minter rewards.
-   This function iterates through the user's minters and claims rewards for those that are mature, up to the specified limit.

#### `minter_claimRankByOffset(uint offset, uint limit)`

-   Claims ranks for multiple minter contracts starting from a specific offset.
-   Add a button that takes offset and limit inputs and calls this function.
-   This function iterates through the user's minters starting from the offset and claims ranks for those that haven't claimed yet, up to the specified limit.
