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

# 4 ELX Refinement: **Lottery-style token conversion**

-   **User Must ‘Unlock’ the Refinery Using XEX**
    -   ✅ User deposits XEX into Refinery to ‘Unlock’ and ‘Upgrade’
        -   `upgradeRefinery(uint256 amount)`
    -   ✅ XEX is sent to the Refinery and cannot withdraw. Is essentially locked.
        -   `upgradeRefinery(uint256 amount)`
    -   ✅ **TOTAL** XEX required in Refinery for Upgrade (Adjustable After Deploy).
        -   `via the setMaxRefineryTier function`
    -   ✅ User cannot deposit more than 10,000 XEX:
        -   **1 XEX: Unlock Refinery, Bronze Tier Unlocked**
            -   10 XEX: Boost Lottery Tickets by + 0.2x Multiplier
            -   15 XEX: Boost Referral by + 1%
            -   20 XEX: Fee Reduced by 0.05%
        -   **40 XEX: Silver Tier Unlocked**
            -   60 XEX: Boost Lottery Tickets by + 0.25x Multiplier
            -   80 XEX: Boost Referral by + 2%
            -   100 XEX: Fee Reduced by 0.06%
        -   **125 XEX: Gold Tier Unlocked**
            -   250 XEX: Boost Lottery Tickets by + 0.3x Multiplier
            -   375 XEX: Boost Referral by + 3%
            -   500 XEX: Fee Reduced by 0.07%
        -   **750 XEX: Diamond Tier Unlocked**
            -   1000 XEX: Boost Lottery Tickets by + 0.35x Multiplier
            -   1250 XEX: Boost Referral by + 4%
            -   1500 XEX: Fee Reduced by 0.08%
            -   2000 XEX: Boost Lottery Tickets by + 0.4x Multiplier
            -   2500 XEX: Boost Referral by + 5%
            -   3000 XEX: Fee Reduced by 0.09%
            -   5000 XEX: Boost Lottery Tickets by + 0.5x Multiplier
            -   7500 XEX: Boost Referral by + 10%
            -   10000 XEX: Fee Reduced by 0.15%
    -   Total Lottery Ticket Multiplier: +2x
    -   Total Referral Boost: +25%
    -   Total Fee Reduction: -0.5%
-   **Refine Process**
    -   **Step #1)** User enters the amount of FTM
        -   **MIN - MAX:** 0.01 FTM - 100 FTM
        -   Each 0.01 FTM earns 1 Lottery Ticket (Without any Boost)
    -   **Step #2)** User enters the amount of repeated bets
        -   Up to 10x repeats of the value entered previously
    -   **Step #3)** User chooses their risk category
        -   **4 Options:** Bronze, Silver, Gold, Diamond. Each tier has a different range for potential outcomes.
    -   SUBMIT in 1 TX and RECEIVE ELX & Lottery Tickets
-   Fee of 2% is taken from the FTM amount. Of this fee: 45% goes to the team as FTM, 5% goes to rewardsPool as ELX (buys off market), and 50% to ELX stakers as FTM.
    -   This 2% fee is reduced depending on staked Xexadon Boost & XEX Refinery.
        -   At 50,000 points (max boost), the fee is reduced by 0.5% to 1.5% **(fee reduction adjustable after deploy)**. Between 0 to 50,000 points, the fee is reduced linearly (between 0% to 0.5% fee reduction).
        -   At Max XEX Refinery, this fee is also reduced by another **0.5%. The increments can be found above.**
    -   The lowest the fee can be, with a max Xexadon Boost and Max Refinery Upgrade, is **1%.**
-   Remaining FTM paid by the user buys ELX off the market and deposits it in a ELX rewardsPool contract.
-   Depending on the risk category, the user has different odds of winning. Example: 0.9 means receiving 0.9x the amount of ELX that the users bet amount purchased (minus the fee). Probability is the % chance of that outcome happening. (**Outcome & Probability adjustable after deploy)**
    -   Bronze
        -   Outcomes: \[0.9,1.1\]
        -   Probabilities: \[0.5,0.5\]
    -   Silver
        -   Outcomes: \[0.7,1.0,1.2,1.5\]
        -   Probabilities: \[0.35,0.35,0.2,0.1\]
    -   Gold
        -   Outcomes: \[0.5,0.9,1.1,1.3,1.5,1.7,2.0,3.0\]
        -   Probabilities: \[0.35,0.25,0.15,0.1,0.05,0.05,0.025,0.025\]
    -   Diamond
        -   Outcomes: \[0.1,0.3,0.5,0.8,0.9,1.0,1.2,1.5,2.0,3.0,5.0,10.0\]
        -   Probabilities: \[0.2,0.15,0.1,0.1,0.1,0.1,0.07,0.07,0.05,0.03,0.02,0.01\]
-   Contract calls to determine which outcome the user receives. **Important: User earns rewards determined by the amount of ELX they have bought off the market and the outcome they receive.**
-   **Example #1:**
    -   User bets 100 FTM and repeats 10x. User chooses the Gold risk tier. User pays 1k FTM total (100 FTM times 10 repeats).
    -   2% or 20 FTM, is taken as a fee
        -   9 FTM goes to the team
        -   11 FTM buys ELX off the market
            -   1 FTM worth of ELX goes to rewardsPool
            -   10 FTM worth of ELX goes to ELX stakers.
    -   Remaining 980 FTM buys ELX off the market.
    -   If 1 ELX = $0.1, then 9,800 ELX is bought.
    -   Contract calls a random number, with the probabilities and outcomes matching the Gold Tier.
    -   Contract returns Outcome of 1.1, which has a 0.15 or 15% chance in Gold Tier.
    -   Users receive their outcome of 1.1x 9,800 ELX, which is 10,780 ELX. The extra rewards come from rewardsPool.

> _Lottery is something to be done very very carefully with random oracles etc, here, needs to confirm that the chain already have it (chainlink)._

> _Seems to be that we need like 3 (2 for coding + 1 for testing) weeks of work to get this tested._

> _The good thing is, as always, the description of the features needed are quite good._

# 5 ELX Jackpot: Luck-based token distribution

-   Every 7 days, an on-chain contract selects one winner to receive 0.00162% of the total ELX supply: 35% allocation to jackpot / (52 Weeks x 4 years).
-   Lottery resets each week, where all users start at zero tickets.
-   Winners gain 1 ticket for the lottery for each 0.01 FTM they use in ELX refining (**Example #1** above would mean the user gets 100,000 tickets from 1,000 FTM).
-   Starting Lottery ticket multiplier for each wallet is 1x. If the user **GETS REFERRED** by another user’s referral code, they start at a 1.1x boost. Upgrading the Refinery or Xexadon Boost increases this multiplier. **Max multiplier is 5.1x (Start at 1x, + 0.1 if Referred, + 2x Max Xexadon Boost, + 2x Max Refinery Upgrade).**
    -   **At 50,000 points (max Xexadon Boost), there is a + 2x lottery multiplier (adjustable after deploy).** Between 0 to 50,000 points, the multiplier is increased linearly between + 0x to 2x.
    -   At 10,000 XEX (max Refinery Boost), there is a + 2x lottery multiplier **(adjustable after deploy).** See above list of upgrades for when this boost is incremented, from + 0x to 2x.
-   Starting Referral percent for each wallet is 1% (meaning you earn 1% of the lottery tickets that your referrals earn. This percent is **NOT** subtracted from the amount earned from the referred user). Upgrading the Refinery or Xexadon Boost increases this percent. **Max boost is 51% (Start at 1%, + 25% Max Xexadon Boost, + 25% Max Refinery Upgrade).**
    -   **At 50,000 points (max xexadon boost), users earn an extra 25% of their referral’s lottery tickets in addition to their own).** Between 0 to 50,000 points, the multiplier is increased linearly between 0% to 25%.
    -   At 10,000 XEX (max Refinery Boost), **users earn an extra 25% of their referral’s lottery tickets in addition to their own).** See above list of upgrades for when this boost is incremented, from + 0% to 25%.
-   Each wallet can only hold a **Max of 1% of the total lottery tickets per week** (adjustable after deploy), including their own tickets and their referrals. This MAX is enforced at the **TIME OF THE DRAWING**.

_It safe to consider also 2 weeks too for this contract._

**#6) ELX Staking: Earn protocol fees**

-   Stake ELX to earn fees generated. Rewards are accrued and claimable per block.
-   FTM accrues in a contract that distributes total amount held over a rolling 365 day basis.
-   Users choose how long they lock their ELX up-front.
    -   Choose between 1 - 365 Days and the amount of ELX.
    -   The longer you stake, the higher % of the available yields you earn.
    -   Once staked, cannot remove until your time is up.
    -   Users can add additional ELX, or extend their staked time, but cannot reduce it.
-   Somewhat similar to Curve / Solidly staking, not sure if we can use those as a framework or not. Up to you.
-   ELX stakers earn their % of staking rewards based on the total amount of ELX staked, their time entered, the amount of ELX they have staked, with a multiplier from their Xexadon Boost. **At 50,000 points (max boost), there is a + 50% staking multiplier (multiplier adjustable after deploy).** Between 0 - 50,000 points, the multiplier is increased linearly between 0% - 50%.

_Also, consider 2 weeks of work here, some questions: as we are dealing with boost, do we lock the user for a certain time? If so, can we use the same gauge mechanism from Curve/Solidly for example?_

_Also, do we use epochs to pay reward? For example: pay rewards every 7 days?_

**#7) MIGRATION: No longer multichain, migration to Fantom Sonic**

-   **XEX**: Snapshot of the total XEX supply on ETH, BSC, MATIC, AVAX, ARB, and FTM will be taken and airdropped to the EVM address on Sonic.
    -   _12hs for snapshot extraction._
-   _12hs for contract + tests._
-   **Xexadons**: Snapshot of Xexadon holders on ETH, BSC, MATIC, AVAX, ARB, and FTM will be taken and airdropped to the EVM address on Sonic. Xexadons on all other chains will have images removed. Xexadon ordinals holders can claim their Sonic assets via a signup. Xexadons on Sonic will have their updated traits at the time of deployment.
    -   _8hs for snapshot data preparation (we already have the data) erc20._
    -   _4hs for image manipulation on aws._
    -   _16hs for ordinal contract preparation._
    -   _12hs for any extra update on traits json+image data._

**#8) AIRDROP: ELX token to community members**

-   10% Liquidity
-   17.5% Team Allocation (2 Year Vesting)
-   10% XEX Holders (Excluding Treasury)
-   20% Xexadon Holders (Excluding Treasury)
-   35% Jackpot Allocation (Distributed over 4 Years)
-   5% to Early Users (Distributed Over 4 Seasons)
-   2.5% to Bootstrap ELX rewardsPool

_Seems like the case of data extraction and preparation from various sources._

_Consider around 72hs at minimum for this data preparation._

**#9) OTHER**

-   Whitelisted DEX for FTM/ELX, only through UI (Prevent MEV)
    -   Uni v3 fork, full range, so we can collect fees from volume
-   Xexadon / FTM AMM
    -   Community-built, almost done
-   Transfer Xexadons / XEX / ELX from Desktop Wallet to Xexaverse App Wallet
    -   Once click transfer
-   Claim FTM Daily (only through UI, reduce Sybil)
    -   Small amount claimable each day per wallet (5 Games)
    -   Funded From: Grant, Gas refund, Staked FTM, LP fees
    -   Off-chain tasks that allow users to claim FTM
        -   Twitter, Discord, TikTok, IG Posts
        -   In-Game tasks: Complete 10 Levels, Earn 1000 Crystals, Forest Biome, etc.
-   Fantom Validator for FTM Staking
