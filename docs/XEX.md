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
- Returns the maximum allowed term for minting or staking.
- Use this to set the upper limit for term input fields in the UI.
- Example return value: `1095` (representing 1095 days or 3 years)

#### `getMinTerm() -> uint`
- Returns the minimum allowed term for minting or staking.
- Use this to set the lower limit for term input fields in the UI.
- Example return value: `1` (representing 1 day)

#### `getCurrentAMP() -> uint`
- Returns the current Reward Amplifier.
- Can be displayed in the UI to show the current minting reward multiplier.
- Example return value: `2000` (representing a 2x amplifier)

#### `getCurrentEAAR() -> uint`
- Returns the current Early Adopter Amplifier Rate.
- Can be used to display the current early adopter bonus.
- Example return value: `500` (representing a 50% bonus)

#### `getCurrentMaxTerm() -> uint`
- Returns the current maximum term, which may change based on the global rank.
- Use this to dynamically update the maximum allowed term in the UI.
- Example return value: `1460` (representing 1460 days or 4 years)

#### `getUserMint(address user) -> MintInfo`
- Returns the MintInfo struct for a given user.
- Use this to display a user's current minting status.
- Example return value: 
  ```
  {
    user: "0x1234...5678",
    term: 100,
    maturityTs: 1672531200,
    rank: 1000,
    amplifier: 2000,
    eaaRate: 500
  }
  ```

#### `getUserStake(address user) -> (uint term, uint maturityTs, uint amount, uint apy)`
- Returns the stake information for a given user.
- Use this to display a user's current stake details.
- Example return value: `[365, 1672531200, 1000000000000000000000, 1000]` (representing a 365-day stake of 1000 XEX with 10% APY, maturing on 2023-01-01)

#### `calculateAPY() -> uint`
- Returns the current Annual Percentage Yield (APY) for staking.
- Display this in the UI to show the current staking rewards rate.
- Example return value: `1000` (representing 10% APY)

#### `rewardsOf(address user) -> (uint mintReward, uint stakeReward)`
- Returns the current minting and staking rewards for a user.
- Use this to display a user's potential rewards.
- Example return value: `[500000000000000000000, 100000000000000000000]` (representing 500 XEX minting reward and 100 XEX staking reward)

#### `isMature(address user) -> (bool mature, uint ts)`
- Checks if a user's stake is mature and returns the time difference.
- Use this to show if a user can withdraw their stake and how much time is left.
- Example return value: `[true, 86400]` (representing a mature stake that matured 1 day ago)

#### `mintersOf(address user) -> address[]`
- Returns an array of minter contract addresses for a user.
- Use this to display a list of a user's minter contracts.
- Example return value: `["0xabcd...1234", "0xefgh...5678"]`

#### `minterInfoOf(address user) -> MintInfo[]`
- Returns an array of MintInfo structs for a user's minters.
- Use this to display detailed information about a user's minter contracts.
- Example return value:
  ```
  [
    {
      user: "0x1234...5678",
      term: 100,
      maturityTs: 1672531200,
      rank: 1000,
      amplifier: 2000,
      eaaRate: 500
    },
    {
      user: "0x1234...5678",
      term: 200,
      maturityTs: 1688169600,
      rank: 1001,
      amplifier: 1950,
      eaaRate: 490
    }
  ]
  ```

#### `minter_getMintReward(address user) -> uint[]`
- Returns an array of mint rewards for a user's minters.
- Use this to show potential rewards for each of a user's minter contracts.
- Example return value: `[500000000000000000000, 750000000000000000000]` (representing 500 XEX and 750 XEX rewards for two minters)

### State-Changing Functions

#### `claimRank(uint term)`
- Allows a user to claim a rank for minting.
- Implement a form in the UI that takes a term input and calls this function.

#### `claimMintReward()`
- Claims the minting reward for a user.
- Add a button in the UI that calls this function when a user's mint is mature.

#### `claimMintRewardTo(address to)`
- Claims the minting reward and sends it to a specified address.
- Implement a form that takes an address input and calls this function.

#### `claimMintRewardAndStake(uint pct, uint term)`
- Claims the minting reward and stakes a percentage of it.
- Create a form that takes percentage and term inputs and calls this function.

#### `stake(uint amount, uint term)`
- Allows a user to stake XEX tokens.
- Implement a staking form with amount and term inputs.

#### `withdraw()`
- Withdraws staked XEX tokens and rewards.
- Add a withdrawal button that becomes active when a stake is mature.

#### `minter_create(uint amount, uint term)`
- Creates multiple minter contracts for a user.
- Implement a form that takes amount and term inputs to create minters.

#### `minter_claimRank(uint limit)`
- Claims ranks for multiple minter contracts.
- Add a button that takes a limit input and calls this function.

#### `minter_claimMintReward(uint limit, address to)`
- Claims rewards from multiple minter contracts.
- Implement a form with limit and address inputs to claim minter rewards.

## Implementation Guidelines

1. **Connection**: Use a Web3 library like ethers.js or web3.js to connect to the Ethereum network and interact with the contract.

2. **State Management**: Use React state or a state management library to keep track of user balances, stakes, and mints.

3. **Forms**: Implement forms for rank claiming, staking, and minter creation. Use the view functions to set appropriate limits and display current rates.

4. **Displays**: Create displays for user balances, current stakes, potential rewards, and minter information.

5. **Notifications**: Implement a notification system to alert users of transaction success or failure.

6. **Error Handling**: Handle errors gracefully, displaying user-friendly error messages when transactions fail.

7. **Gas Estimation**: Implement gas estimation for transactions to give users an idea of the transaction cost.

8. **Responsive Design**: Ensure the UI is responsive and works well on both desktop and mobile devices.

9. **Wallet Connection**: Implement wallet connection functionality (e.g., MetaMask) to allow users to interact with the contract.

10. **Real-time Updates**: Use event listeners to update the UI in real-time when contract state changes.

By following these guidelines and utilizing the provided functions, you can create a comprehensive and user-friendly interface for interacting with the XEX contract.
