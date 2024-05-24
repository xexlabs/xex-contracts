/*
#1) XEX: Updated emissions for predictable inflation

XEX rewards are determined by the term date (1 -10 days) and how late they claim. Variable Max Term, EAA, and AMP have been nulled in order to simplify the inflation schedule. Constant 20% APR is enabled. Batch Minting Contracts are also required so users can have multiple ongoing mints. No fee for claiming or staking XEX.

*MAKE SURE TO TEST XEX MINTING, VARIABLE CHANGES MAY CREATE UNKNOWN RESULTS

*/
//import { time, loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { expect } from 'chai'
import hre from 'hardhat'
import { upgrades } from 'hardhat'
describe('XEX', function () {
	let xex: any, dev: any, user1: any, user2: any
	const ethers = hre.ethers
	beforeEach(async function () {
		;[dev, user1, user2] = await hre.ethers.getSigners()
		const XEX = await hre.ethers.getContractFactory('XEX')
		xex = await upgrades.deployProxy(XEX, [])
	})

	describe('Deployment', function () {
		it('Should set the right owner', async function () {
			expect(await xex.owner()).to.equal(dev.address)
		})

		it('Should initialize with correct values', async function () {
			// Setup: User claims a rank with a specific term
			const termDays = 10 // term in days for the mint
			const termSeconds = termDays * 24 * 3600 // convert term to seconds
			await xex.connect(user1).claimRank(termDays)

			// Move time forward to simulate passing of the term period
			await ethers.provider.send('evm_increaseTime', [termSeconds])
			await ethers.provider.send('evm_mine', [])

			// Check the number of active minters after the claim
			let activeMinters = await xex.activeMinters()
			expect(activeMinters).to.equal(1n) // Assuming this is the first active minter

			// Action: User claims their mint reward
			const tx = await xex.connect(user1).claimMintReward()

			// Verification: Check user balance and emitted event
			const rewardAmount = await xex.balanceOf(user1.address)
			expect(rewardAmount).to.be.gt(0n) // Check if the reward is greater than 0

			// Check for emitted event 'MintClaimed'
			await expect(tx).to.emit(xex, 'MintClaimed').withArgs(user1.address, rewardAmount)

			// Check global rank state after claiming
			const globalRank = await xex.globalRank()
			const TERM_AMPLIFIER_THRESHOLD = await xex.TERM_AMPLIFIER_THRESHOLD()
			const newRank = TERM_AMPLIFIER_THRESHOLD + 1n
			expect(globalRank).to.equal(newRank) // Assuming the first claim sets the global rank to 1

			// Check the number of active minters after the claim
			activeMinters = await xex.activeMinters()
			expect(activeMinters).to.equal(0n) // Assuming this is the first active minter
		})
	})

	describe('Minting Functionality', function () {
		it('Should allow users to mint correctly', async function () {
			// User claims a rank with a specific term
			const termDays = 5 // term in days for the mint
			const termSeconds = termDays * 24 * 3600 // convert term to seconds
			await xex.connect(user1).claimRank(termDays)

			// Move time forward to simulate passing of the term period
			await ethers.provider.send('evm_increaseTime', [termSeconds])
			await ethers.provider.send('evm_mine', [])

			// User claims their mint reward
			const tx = await xex.connect(user1).claimMintReward()

			// Verification: Check user balance and emitted event
			const rewardAmount = await xex.balanceOf(user1.address)
			expect(rewardAmount).to.be.gt(0n) // Check if the reward is greater than 0

			// Check for emitted event 'MintClaimed'
			await expect(tx).to.emit(xex, 'MintClaimed').withArgs(user1.address, rewardAmount)
		})

		it('Should apply penalties for late claims correctly', async function () {
			// User claims a rank with a specific term
			const termDays = 5n // term in days for the mint
			const termSeconds = termDays * 24n * 3600n // convert term to seconds
			await xex.connect(user1).claimRank(termDays)

			// Move time forward to simulate passing of the term period plus extra days for late penalty
			const lateDays = 3n // days late beyond the term period
			const lateSeconds = lateDays * 24n * 3600n // convert late days to seconds
			const ts = (termSeconds + lateSeconds).toString()
			await ethers.provider.send('evm_increaseTime', [ts])
			await ethers.provider.send('evm_mine', [])

			// User claims their mint reward after the delay
			const tx = await xex.connect(user1).claimMintReward()

			// Verification: Check user balance and emitted event
			const rewardAmount = await xex.balanceOf(user1.address)
			expect(rewardAmount).to.be.gt(0n) // Check if the reward is greater than 0

			// Check for emitted event 'MintClaimed'
			await expect(tx).to.emit(xex, 'MintClaimed').withArgs(user1.address, rewardAmount)

			// Move time forward to simulate passing of the term period
			await ethers.provider.send('evm_increaseTime', [termSeconds.toString()])
			await ethers.provider.send('evm_mine', [])

			//TODO: Calculate expected penalty
		})
	})

	describe('Staking Functionality', function () {
		it('Should handle stakes correctly', async function () {
			// User claims a rank and mints XEX
			const termDays = 5 // term in days for the mint
			const termSeconds = termDays * 24 * 3600 // convert term to seconds
			await xex.connect(user1).claimRank(termDays)

			// Move time forward to simulate passing of the term period
			await ethers.provider.send('evm_increaseTime', [termSeconds])
			await ethers.provider.send('evm_mine', [])

			// User claims their mint reward
			await xex.connect(user1).claimMintReward()

			// User decides to stake a portion of their XEX
			const stakeAmount = await xex.balanceOf(user1.address)
			const term = (await xex.MAX_TERM_END()) / 86400n // stake term in days

			// User stakes their XEX
			await xex.connect(user1).stake(stakeAmount, term)

			// Check the stake has been recorded correctly
			const userStake = await xex.getUserStake(user1.address)
			expect(userStake.amount).to.equal(stakeAmount)
			expect(userStake.term).to.equal(term)

			// Move time forward to simulate passing of the stake term
			await ethers.provider.send('evm_increaseTime', [term.toString()])
			await ethers.provider.send('evm_mine', [])

			// User withdraws their stake
			const tx = await xex.connect(user1).withdraw()

			// Verification: Check user balance and emitted event
			const finalBalance = await xex.balanceOf(user1.address)
			expect(finalBalance).to.be.gte(stakeAmount) // Check if the final balance is greater than the staked amount due to rewards

			// Check for emitted event 'Withdrawn'
			await expect(tx)
				.to.emit(xex, 'Withdrawn')
				.withArgs(user1.address, stakeAmount, finalBalance - stakeAmount)
		})

		it('Should calculate and give rewards correctly on withdrawal', async function () {
			// User claims a rank and mints XEX
			const termDays = 5n // term in days for the mint
			const termSeconds = termDays * 24n * 3600n // convert term to seconds
			await xex.connect(user1).claimRank(termDays)

			// Move time forward to simulate passing of the term period
			await ethers.provider.send('evm_increaseTime', [termSeconds.toString()])
			await ethers.provider.send('evm_mine', [])

			// User claims their mint reward
			await xex.connect(user1).claimMintReward()

			// User decides to stake a portion of their XEX
			const stakeAmount = await xex.balanceOf(user1.address)
			const stakeTermDays = (await xex.MAX_TERM_END()) / 86400n // stake term in days
			const stakeTermSeconds = stakeTermDays * 24n * 3600n // convert term to seconds

			// User stakes their XEX
			await xex.connect(user1).stake(stakeAmount, stakeTermDays)

			// Move time forward to simulate passing of the stake term
			await ethers.provider.send('evm_increaseTime', [stakeTermSeconds.toString()])
			await ethers.provider.send('evm_mine', [])

			// User withdraws their stake
			const tx = await xex.connect(user1).withdraw()
			const balanceAfter = await xex.balanceOf(user1.address)
			const reward = balanceAfter - stakeAmount
			expect(reward).to.be.gt(0n) //REVIEW: needs to be expanded
			await expect(tx).to.emit(xex, 'Withdrawn').withArgs(user1.address, stakeAmount, reward)
		})
	})
})
