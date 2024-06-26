# ROADMAP

Xexaverse Smart Contracts Project

---

## ✅ 1. XEX: Updated emissions for predictable inflation

-   20% APR enabled
-   Batch Minting required
-   No fee for claiming or staking XEX

> _IMPORTANT: Test XEX minting thoroughly_

## ✅ 2. Xexaverse Game Contracts: XEX rewards are gamified

**Overview**: This document outlines the contracts required for the XEX in-game rewards. These contracts should be SEPARATE from the XEX Minting Contracts for INTERNAL TESTING, but should be integrated into XEX Minting contracts so that users MUST PLAY THE GAME to mint XEX on testnet / mainnet.

**Contract Flow**: The user initiates a contract call before playing the game. This contract call creates a single XEX mint with a term date depending on the game's difficulty and requires the user to pay for gas. Users can have multiple ongoing mints. The contract mints XEX associated with the wallet and waits for the game's result to allow the user to claim. The potential results:

-   User Completes the Game Successfully
-   User Loses the Game
    -   Character Dies
    -   The time limit is reached

**Success**: If the user completes the game successfully, they can claim their initial XEX mint PLUS an additional bonus from the rewardsPool after their term date is reached. The additional bonus should be NO MORE than 2x the initial XEX mint value (MAX amount a user should earn is 100 XEX.

**Failure**: If the user fails to complete the game by dying OR by reaching the time limit, they can claim 20% of their initial XEX mint once their term date is reached. The remaining XEX goes to the rewardsPool contract. This percentage should be adjustable after deployment.

**Example #1**: The user begins a dungeon by paying gas for an XEX mint with a 1-day term date. They complete the dungeon in 5 minutes. The contract allows the user to claim their XEX mint AND the bonus XEX 24 hours later (Should be about 10 XEX with 2x bonus). If they claim later, they are subject to the decaying rewards on the XEX mint, but the bonus XEX does not decay.

**Example #2**: The user begins a dungeon by paying gas for an XEX mint with a 1-day term date. They fail to complete the dungeon and die after playing for 10 minutes. The contract allows the user to claim 20% of their XEX mint in a single transaction, 24 hours later (Should be about 1 XEX). The remaining 80% of the XEX is sent to the rewardsPool contract at the time of the claim.

#### 📝 CHANGELOG

-   Integrated XEX minting by changing the reward token to an IXEX interface that includes a mint function.
-   Updated the IXEX interface to include the `mint` function.
-   Changed the `_xex` variable type from `IERC20` to `IXEX`.
-   Updated the `claim` function to use the `mint` function instead of a transfer.
-   Implemented new game mechanics with dynamic term dates, bonus rewards, and rewards pool management.
-   Each dungeon has its own reward amounts now. Once depleted, users can't play on the dungeon anymore.
-   Added difficulty factor to calculate term date for new game sessions.
-   Setted the failure claim percentage to exactly 20%.
-   Added check to ensure that the claim amount does not exceed 2x the initial mint.
-   Added max bonus as max deposit.

## ✅ 3. Xexadons: Simplified staking with scalable rewards

**Overview**: This document outlines the Staking mechanisms for Xexadon NFTs. This document will outline the process for staking, the 'Boost' variable and how it is obtained, and the process for a new NFT given to a user when staking each Xexadon NFT.

**Process of Staking Xexadons**

A user can stake up to 25 Xexadons per wallet. The process for staking requires a user to deposit their Xexadon NFT into a staking contract. For each Xexadon deposited, the user receives a new NFT. Once deposited, there is a lockup, where the user must wait 7 Days until they can withdraw their Xexadon. A user can withdraw a single, multiple, or all Xexadons from staking in a single transaction. Unstaking any amount of Xexadons resets that wallet address's 'Boost' to the initial value of 0.

**Boost Variable**

The 'Boost' variable is a state-based, callable variable, unique to each chain for user's the wallet address. It will be used to determine a user's Staking APR and Fee for XEX to ELX refinement. The default value of 'Boost' is '0'.

When an Xexadon is staked, the variable known as 'Boost' begins to increase in value for each Day (24 Hours) that passes. The Day is calculated at 23:59 UTC, not when the user stakes.

The Boost variable increases in value per Day depending on how many Xexadons the user has staked. Both of these values are adjustable after deployment:

-   1 Xexadon: + 1 Point Per Day, Per Xexadon
-   10 Xexadons: + 2 Points Per Day, Per Xexadon
-   25 Xexadons: + 4 Points Per Day, Per Xexadon

There is a MAXIMUM VALUE that the 'Boost' variable can reach, which is a value of 50,000. This maximum value is adjustable after deployment.

**New NFT**

For each Xexadon staked, the user will receive a new NFT. This NFT is meant to serve as a 'Receipt' that keeps a record of their staked Xexadon. It should not be able to be transferred. In order to unstake an Xexadon, this NFT must be burned.

#### 📝 CHANGELOG

-   1 Added a \_transfer function override to prevent the transfer of staking receipt NFTs.
-   2 Implemented a new updateBoost function that can only be called at 23:59 UTC to update the boost value.
-   3 Added a lastBoostUpdate mapping to keep track of when each user's boost was last updated.
-   4 Modified the getBoostOf function to calculate boost based on the time since the last update, aligned with daily intervals.
-   5 Updated the stake and unstake functions to set the lastBoostUpdate timestamp.

## 4. ELX Refinement: Lottery-style token conversion

[Detailed ELX Refinement process and tiers]

## 5. ELX Jackpot: Luck-based token distribution

[Detailed ELX Jackpot mechanics and boosts]

## 6. ELX Staking: Earn protocol fees

[Detailed ELX Staking mechanics]

_Questions to consider:_

1. Do we lock users for a certain time due to boosts?
2. Can we use the same gauge mechanism from Curve/Solidly?
3. Should we use epochs to pay rewards (e.g., every 7 days)?

## 7. MIGRATION: No longer multichain, migration to Fantom Sonic

### XEX Migration

-   Snapshot of total XEX supply on ETH, BSC, MATIC, AVAX, ARB, and FTM
-   Airdrop to EVM address on Sonic
-   12hrs for snapshot extraction
-   12hrs for contract + tests

### Xexadons Migration

-   Snapshot of Xexadon holders on multiple chains
-   Airdrop to EVM address on Sonic
-   Remove images from other chains
-   Ordinals holders can claim Sonic assets via signup
-   Updated traits at deployment on Sonic
-   8hrs for snapshot data preparation
-   4hrs for image manipulation on AWS
-   16hrs for ordinal contract preparation
-   12hrs for trait updates (JSON + image data)

## 8. AIRDROP: ELX token to community members

-   10% Liquidity
-   17.5% Team Allocation (2 Year Vesting)
-   10% XEX Holders (Excluding Treasury)
-   20% Xexadon Holders (Excluding Treasury)
-   35% Jackpot Allocation (Distributed over 4 Years)
-   5% to ELX Stakers (Distributed over 1 Year)
-   2.5% to Bootstrap ELX rewardsPool

## 9. OTHER

### Whitelisted DEX for FTM/ELX

-   Only through UI (Prevent MEV)
-   Uni v3 fork, full range, to collect fees from volume
-   Xexadon / FTM AMM
-   Community-built, almost done

### Transfer Functionality

-   Transfer Xexadons / XEX / ELX from Desktop Wallet to Xexaverse App Wallet
-   One-click transfer

### FTM Daily Claim

-   Only through UI, reduce Sybil
-   Small amount claimable each day per wallet (5 Games)
-   Funded From: Grant, Gas refund, Staked FTM, LP fees

### Off-chain Tasks for FTM Claims

-   Social media tasks: Twitter, Discord, TikTok, IG Posts
-   In-Game tasks: Complete 10 Levels, Earn 1000 Crystals, Forest Biome, etc.

### Fantom Validator for FTM Staking
# ROADMAP

Xexaverse Smart Contracts Project

---

## ✅ 1. XEX: Updated emissions for predictable inflation

-   20% APR enabled
-   Batch Minting required
-   No fee for claiming or staking XEX

> _IMPORTANT: Test XEX minting thoroughly_

## ✅ 2. Xexaverse Game Contracts: XEX rewards are gamified

**Overview**: This document outlines the contracts required for the XEX in-game rewards. These contracts should be SEPARATE from the XEX Minting Contracts for INTERNAL TESTING, but should be integrated into XEX Minting contracts so that users MUST PLAY THE GAME to mint XEX on testnet / mainnet.

**Contract Flow**: The user initiates a contract call before playing the game. This contract call creates a single XEX mint with a term date depending on the game's difficulty and requires the user to pay for gas. Users can have multiple ongoing mints. The contract mints XEX associated with the wallet and waits for the game's result to allow the user to claim. The potential results:

-   User Completes the Game Successfully
-   User Loses the Game
    -   Character Dies
    -   The time limit is reached

**Success**: If the user completes the game successfully, they can claim their initial XEX mint PLUS an additional bonus from the rewardsPool after their term date is reached. The additional bonus should be NO MORE than 2x the initial XEX mint value (MAX amount a user should earn is 100 XEX.

**Failure**: If the user fails to complete the game by dying OR by reaching the time limit, they can claim 20% of their initial XEX mint once their term date is reached. The remaining XEX goes to the rewardsPool contract. This percentage should be adjustable after deployment.

**Example #1**: The user begins a dungeon by paying gas for an XEX mint with a 1-day term date. They complete the dungeon in 5 minutes. The contract allows the user to claim their XEX mint AND the bonus XEX 24 hours later (Should be about 10 XEX with 2x bonus). If they claim later, they are subject to the decaying rewards on the XEX mint, but the bonus XEX does not decay.

**Example #2**: The user begins a dungeon by paying gas for an XEX mint with a 1-day term date. They fail to complete the dungeon and die after playing for 10 minutes. The contract allows the user to claim 20% of their XEX mint in a single transaction, 24 hours later (Should be about 1 XEX). The remaining 80% of the XEX is sent to the rewardsPool contract at the time of the claim.

#### 📝 CHANGELOG

-   Integrated XEX minting by changing the reward token to an IXEX interface that includes a mint function.
-   Updated the IXEX interface to include the `mint` function.
-   Changed the `_xex` variable type from `IERC20` to `IXEX`.
-   Updated the `claim` function to use the `mint` function instead of a transfer.
-   Implemented new game mechanics with dynamic term dates, bonus rewards, and rewards pool management.
-   Each dungeon has its own reward amounts now. Once depleted, users can't play on the dungeon anymore.
-   Added difficulty factor to calculate term date for new game sessions.
-   Setted the failure claim percentage to exactly 20%.
-   Added check to ensure that the claim amount does not exceed 2x the initial mint.
-   Added max bonus as max deposit.

## ✅ 3. Xexadons: Simplified staking with scalable rewards

**Overview**: This document outlines the Staking mechanisms for Xexadon NFTs. This document will outline the process for staking, the 'Boost' variable and how it is obtained, and the process for a new NFT given to a user when staking each Xexadon NFT.

**Process of Staking Xexadons**

A user can stake up to 25 Xexadons per wallet. The process for staking requires a user to deposit their Xexadon NFT into a staking contract. For each Xexadon deposited, the user receives a new NFT. Once deposited, there is a lockup, where the user must wait 7 Days until they can withdraw their Xexadon. A user can withdraw a single, multiple, or all Xexadons from staking in a single transaction. Unstaking any amount of Xexadons resets that wallet address's 'Boost' to the initial value of 0.

**Boost Variable**

The 'Boost' variable is a state-based, callable variable, unique to each chain for user's the wallet address. It will be used to determine a user's Staking APR and Fee for XEX to ELX refinement. The default value of 'Boost' is '0'.

When an Xexadon is staked, the variable known as 'Boost' begins to increase in value for each Day (24 Hours) that passes. The Day is calculated at 23:59 UTC, not when the user stakes.

The Boost variable increases in value per Day depending on how many Xexadons the user has staked. Both of these values are adjustable after deployment:

-   1 Xexadon: + 1 Point Per Day, Per Xexadon
-   10 Xexadons: + 2 Points Per Day, Per Xexadon
-   25 Xexadons: + 4 Points Per Day, Per Xexadon

There is a MAXIMUM VALUE that the 'Boost' variable can reach, which is a value of 50,000. This maximum value is adjustable after deployment.

**New NFT**

For each Xexadon staked, the user will receive a new NFT. This NFT is meant to serve as a 'Receipt' that keeps a record of their staked Xexadon. It should not be able to be transferred. In order to unstake an Xexadon, this NFT must be burned.

#### 📝 CHANGELOG

-   1 Added a \_transfer function override to prevent the transfer of staking receipt NFTs.
-   2 Implemented a new updateBoost function that can only be called at 23:59 UTC to update the boost value.
-   3 Added a lastBoostUpdate mapping to keep track of when each user's boost was last updated.
-   4 Modified the getBoostOf function to calculate boost based on the time since the last update, aligned with daily intervals.
-   5 Updated the stake and unstake functions to set the lastBoostUpdate timestamp.

## 4. ELX Refinement: Lottery-style token conversion

[Detailed ELX Refinement process and tiers]

## 5. ELX Jackpot: Luck-based token distribution

[Detailed ELX Jackpot mechanics and boosts]

## 6. ELX Staking: Earn protocol fees

[Detailed ELX Staking mechanics]

_Questions to consider:_

1. Do we lock users for a certain time due to boosts?
2. Can we use the same gauge mechanism from Curve/Solidly?
3. Should we use epochs to pay rewards (e.g., every 7 days)?

## 7. MIGRATION: No longer multichain, migration to Fantom Sonic

### XEX Migration

-   Snapshot of total XEX supply on ETH, BSC, MATIC, AVAX, ARB, and FTM
-   Airdrop to EVM address on Sonic
-   12hrs for snapshot extraction
-   12hrs for contract + tests

### Xexadons Migration

-   Snapshot of Xexadon holders on multiple chains
-   Airdrop to EVM address on Sonic
-   Remove images from other chains
-   Ordinals holders can claim Sonic assets via signup
-   Updated traits at deployment on Sonic
-   8hrs for snapshot data preparation
-   4hrs for image manipulation on AWS
-   16hrs for ordinal contract preparation
-   12hrs for trait updates (JSON + image data)

## 8. AIRDROP: ELX token to community members

-   10% Liquidity
-   17.5% Team Allocation (2 Year Vesting)
-   10% XEX Holders (Excluding Treasury)
-   20% Xexadon Holders (Excluding Treasury)
-   35% Jackpot Allocation (Distributed over 4 Years)
-   5% to ELX Stakers (Distributed over 1 Year)
-   2.5% to Bootstrap ELX rewardsPool

## 9. OTHER

### Whitelisted DEX for FTM/ELX

-   Only through UI (Prevent MEV)
-   Uni v3 fork, full range, to collect fees from volume
-   Xexadon / FTM AMM
-   Community-built, almost done

### Transfer Functionality

-   Transfer Xexadons / XEX / ELX from Desktop Wallet to Xexaverse App Wallet
-   One-click transfer

### FTM Daily Claim

-   Only through UI, reduce Sybil
-   Small amount claimable each day per wallet (5 Games)
-   Funded From: Grant, Gas refund, Staked FTM, LP fees

### Off-chain Tasks for FTM Claims

-   Social media tasks: Twitter, Discord, TikTok, IG Posts
-   In-Game tasks: Complete 10 Levels, Earn 1000 Crystals, Forest Biome, etc.

### Fantom Validator for FTM Staking
