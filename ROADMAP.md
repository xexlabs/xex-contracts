## #4) ELX Refinement: Lottery-style token conversion

### User Must ‘Unlock’ the Refinery Using XEX

- User deposits XEX into Refinery to ‘Unlock’ and ‘Upgrade’
- XEX is sent to the Refinery and cannot withdraw. Is essentially locked.
- **TOTAL XEX required in Refinery for Upgrade (Adjustable After Deploy). User cannot deposit more than 10,000 XEX:**

| XEX Amount | Benefit |
|------------|---------|
| 1 XEX      | Unlock Refinery, Bronze Tier Unlocked |
| 10 XEX     | Boost Lottery Tickets by + 0.2x Multiplier |
| 15 XEX     | Boost Referral by + 1% |
| 20 XEX     | Fee Reduced by 0.05% |
| 40 XEX     | Silver Tier Unlocked |
| 60 XEX     | Boost Lottery Tickets by + 0.25x Multiplier |
| 80 XEX     | Boost Referral by + 2% |
| 100 XEX    | Fee Reduced by 0.06% |
| 125 XEX    | Gold Tier Unlocked |
| 250 XEX    | Boost Lottery Tickets by + 0.3x Multiplier |
| 375 XEX    | Boost Referral by + 3% |
| 500 XEX    | Fee Reduced by 0.07% |
| 750 XEX    | Diamond Tier Unlocked |
| 1000 XEX   | Boost Lottery Tickets by + 0.35x Multiplier |
| 1250 XEX   | Boost Referral by + 4% |
| 1500 XEX   | Fee Reduced by 0.08% |
| 2000 XEX   | Boost Lottery Tickets by + 0.4x Multiplier |
| 2500 XEX   | Boost Referral by + 5% |
| 3000 XEX   | Fee Reduced by 0.09% |
| 5000 XEX   | Boost Lottery Tickets by + 0.5x Multiplier |
| 7500 XEX   | Boost Referral by + 10% |
| 10000 XEX  | Fee Reduced by 0.15% |

- **Total Lottery Ticket Multiplier:** +2x
- **Total Referral Boost:** +25%
- **Total Fee Reduction:** -0.5%

### Refine Process

1. **Step #1:** User enters the amount of FTM
   - **MIN - MAX:** 0.01 FTM - 100 FTM
   - Each 0.01 FTM earns 1 Lottery Ticket (Without any Boost)
2. **Step #2:** User enters the amount of repeated bets
   - Up to 10x repeats of the value entered previously
3. **Step #3:** User chooses their risk category
   - **4 Options:** Bronze, Silver, Gold, Diamond. Each tier has a different range for potential outcomes.

- **SUBMIT in 1 TX and RECEIVE ELX & Lottery Tickets**

- Fee of 2% is taken from the FTM amount. Of this fee:
  - 45% goes to the team as FTM
  - 5% goes to rewardsPool as ELX (buys off market)
  - 50% to ELX stakers as FTM.

- This 2% fee is reduced depending on staked Xexadon Boost & XEX Refinery.
  - At 50,000 points (max boost), the fee is reduced by 0.5% to 1.5% (fee reduction adjustable after deploy). Between 0 to 50,000 points, the fee is reduced linearly (between 0% to 0.5% fee reduction).
  - At Max XEX Refinery, this fee is also reduced by another 0.5%. The increments can be found above.
  - The lowest the fee can be, with a max Xexadon Boost and Max Refinery Upgrade, is 1%.

- Remaining FTM paid by the user buys ELX off the market and deposits it in a ELX rewardsPool contract.
- Depending on the risk category, the user has different odds of winning. Example: 0.9 means receiving 0.9x the amount of ELX that the users bet amount purchased (minus the fee). Probability is the % chance of that outcome happening. (Outcome & Probability adjustable after deploy)

| Risk Tier | Outcomes | Probabilities |
|-----------|----------|---------------|
| Bronze    | [0.9,1.1] | [0.5,0.5] |
| Silver    | [0.7,1.0,1.2,1.5] | [0.35,0.35,0.2,0.1] |
| Gold      | [0.5,0.9,1.1,1.3,1.5,1.7,2.0,3.0] | [0.35,0.25,0.15,0.1,0.05,0.05,0.025,0.025] |
| Diamond   | [0.1,0.3,0.5,0.8,0.9,1.0,1.2,1.5,2.0,3.0,5.0,10.0] | [0.2,0.15,0.1,0.1,0.1,0.1,0.07,0.07,0.05,0.03,0.02,0.01] |

- Contract calls to determine which outcome the user receives. **Important:** User earns rewards determined by the amount of ELX they have bought off the market and the outcome they receive.

#### Example #1:

- User bets 100 FTM and repeats 10x. User chooses the Gold risk tier. User pays 1k FTM total (100 FTM times 10 repeats).
- 2% or 20 FTM, is taken as a fee
  - 9 FTM goes to the team
  - 11 FTM buys ELX off the market
    - 1 FTM worth of ELX goes to rewardsPool
    - 10 FTM worth of ELX goes to ELX stakers.
- Remaining 980 FTM buys ELX off the market.
- If 1 ELX = $0.1, then 9,800 ELX is bought.
- Contract calls a random number, with the probabilities and outcomes matching the Gold Tier.
- Contract returns Outcome of 1.1, which has a 0.15 or 15% chance in Gold Tier.
- Users receive their outcome of 1.1x 9,800 ELX, which is 10,780 ELX. The extra rewards come from rewardsPool.

## #5) ELX Jackpot: Luck-based token distribution

- Every 7 days, an on-chain contract selects one winner to receive 0.00162% of the total ELX supply: 35% allocation to jackpot / (52 Weeks x 4 years).
- Lottery resets each week, where all users start at zero tickets.
- Winners gain 1 ticket for the lottery for each 0.01 FTM they use in ELX refining (Example #1 above would mean the user gets 100,000 tickets from 1,000 FTM).

- Starting Lottery ticket multiplier for each wallet is 1x. If the user **GETS REFERRED** by another user’s referral code, they start at a 1.1x boost. Upgrading the Refinery or Xexadon Boost increases this multiplier. **Max multiplier is 5.1x (Start at 1x, + 0.1 if Referred, + 2x Max Xexadon Boost, + 2x Max Refinery Upgrade).**

| Boost Type | Max Boost | Description |
|------------|-----------|-------------|
| Xexadon Boost | +2x | At 50,000 points (max Xexadon Boost), there is a + 2x lottery multiplier (adjustable after deploy). Between 0 to 50,000 points, the multiplier is increased linearly between + 0x to 2x. |
| Refinery Boost | +2x | At 10,000 XEX (max Refinery Boost), there is a + 2x lottery multiplier (adjustable after deploy). See above list of upgrades for when this boost is incremented, from + 0x to 2x. |

- Starting Referral percent for each wallet is 1% (meaning you earn 1% of the lottery tickets that your referrals earn. This percent is **NOT** subtracted from the amount earned from the referred user). Upgrading the Refinery or Xexadon Boost increases this percent. **Max boost is 51% (Start at 1%, + 25% Max Xexadon Boost, + 25% Max Refinery Upgrade).**

| Boost Type | Max Boost | Description |
|------------|-----------|-------------|
| Xexadon Boost | +25% | At 50,000 points (max xexadon boost), users earn an extra 25% of their referral’s lottery tickets in addition to their own). Between 0 to 50,000 points, the multiplier is increased linearly between 0% to 25%. |
| Refinery Boost | +25% | At 10,000 XEX (max Refinery Boost), users earn an extra 25% of their referral’s lottery tickets in addition to their own). See above list of upgrades for when this boost is incremented, from + 0% to 25%. |

- Each wallet can only hold a **Max of 1% of the total lottery tickets per week** (adjustable after deploy), including their own tickets and their referrals. This MAX is enforced at the **TIME OF THE DRAWING**.

## #6) ELX Staking: Earn protocol fees

- Stake ELX to earn fees generated. Rewards are accrued and claimable per block.
- FTM accrues in a contract that distributes total amount held over a rolling 365 day basis.
- Users choose how long they lock their ELX up-front.
  - Choose between 1 - 365 Days and the amount of ELX.
  - The longer you stake, the higher % of the available yields you earn.
  - Once staked, cannot remove until your time is up.
  - Users can add additional ELX, or extend their staked time, but cannot reduce it.

- Somewhat similar to Curve / Solidly staking, not sure if we can use those as a framework or not. Up to you.

- ELX stakers earn their % of staking rewards based on the total amount of ELX staked, their time entered, the amount of ELX they have staked, with a multiplier from their Xexadon Boost. **At 50,000 points (max boost), there is a + 50% staking multiplier (multiplier adjustable after deploy). Between 0 - 50,000 points, the multiplier is increased linearly between 0% - 50%.**
