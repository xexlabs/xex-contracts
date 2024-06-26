import { expect } from 'chai'
import hre from 'hardhat'
import { XEX } from '../typechain-types/contracts/XEX'
import { Signer } from 'ethers'

describe('XEXv2', function () {
	this.timeout(60_000_000)
	let xex: XEX, dev: any, user1: any, user2: any
	const ethers = hre.ethers
	let termInDays: bigint, termInSeconds: bigint
	const fromWei = (value: any, decimals: number = 18) => parseFloat(ethers.formatUnits(value.toString(), decimals))
	const d = (value: any, decimals: number = 18, truncate: number = 2) => parseFloat(fromWei(value, decimals).toFixed(truncate))
	const toWei = (value: any, decimals: number = 18) => ethers.parseUnits(value.toString(), decimals)
	let deposit: bigint
	const getTimestamp = async () => {
		const block = await ethers.provider.getBlock('latest')
		return BigInt(block?.timestamp ?? 0)
	}
	const adv = async (ts: bigint) => {
		await ethers.provider.send('evm_setNextBlockTimestamp', [ts.toString()])
		await ethers.provider.send('evm_mine', [])
	}
	const warp = async (seconds: bigint) => {
		const tsBefore = await getTimestamp()
		await ethers.provider.send('evm_increaseTime', [seconds.toString()])
		await ethers.provider.send('evm_mine', [])
		const tsAfter = await getTimestamp()
		return tsAfter - tsBefore
	}
	beforeEach(async function () {
		;[dev, user1, user2] = await hre.ethers.getSigners()
		const XEX = await hre.ethers.getContractFactory('XEX')
		xex = (await XEX.deploy()) as unknown as XEX
	})
	describe('Global Tests', function () {
		async function mint(user: Signer) {
			const balanceBefore = await xex.balanceOf(await user.getAddress())
			await xex.connect(user).claimRank(10)
			await ethers.provider.send('evm_increaseTime', [86400 * 10]) // 10 days
			await ethers.provider.send('evm_mine', [])
			await xex.connect(user).claimMintReward()
			const balanceAfter = await xex.balanceOf(await user.getAddress())
			return balanceAfter - balanceBefore
		}

		it('Should deploy with correct initial values', async function () {
			expect(await xex.name()).to.equal('XEX')
			expect(await xex.symbol()).to.equal('XEX')
			expect(await xex.genesisTs()).to.be.a('bigint')
			expect(await xex.genesisTs()).to.be.at.least(Math.floor(Date.now() / 1000) - 10)
		})

		it('Should claim rank', async function () {
			await xex.connect(user1).claimRank(10)
			const mintInfo = await xex.getUserMint(await user1.getAddress())
			expect(mintInfo.rank).to.equal(1)
		})

		it('Should claim mint reward', async function () {
			await xex.connect(user1).claimRank(1)
			await ethers.provider.send('evm_increaseTime', [86400]) // 1 day
			await ethers.provider.send('evm_mine', [])
			await xex.connect(user1).claimMintReward()
			const balance = await xex.balanceOf(await user1.getAddress())
			expect(balance).to.be.gt(0)
		})

		it('Should stake tokens', async function () {
			await xex.connect(user1).claimRank(1)
			await ethers.provider.send('evm_increaseTime', [86400]) // 1 day
			await ethers.provider.send('evm_mine', [])
			await xex.connect(user1).claimMintReward()
			const balance = await xex.balanceOf(await user1.getAddress())
			await xex.connect(user1).stake(balance, 10)
			const stakeInfo = await xex.getUserStake(await user1.getAddress())
			expect(stakeInfo.amount).to.equal(balance)
		})

		it('Should withdraw staked tokens', async function () {
			await xex.connect(user1).claimRank(1)
			await ethers.provider.send('evm_increaseTime', [86400]) // 1 day
			await ethers.provider.send('evm_mine', [])
			await xex.connect(user1).claimMintReward()
			const balance = await xex.balanceOf(await user1.getAddress())
			await xex.connect(user1).stake(balance, 1)
			await ethers.provider.send('evm_increaseTime', [86400]) // 1 day
			await ethers.provider.send('evm_mine', [])
			await xex.connect(user1).withdraw()
			const finalBalance = await xex.balanceOf(await user1.getAddress())
			expect(finalBalance).to.be.gt(balance)
		})

		it('Should calculate max term', async function () {
			const maxTerm = await xex.calculateMaxTerm()
			expect(maxTerm).to.be.a('bigint')
		})

		it('Should calculate penalty', async function () {
			const penalty = await xex.penalty(86400) // 1 day late
			expect(penalty).to.be.a('bigint')
		})

		it('Should calculate mint reward', async function () {
			await xex.connect(user1).claimRank(1)
			await ethers.provider.send('evm_increaseTime', [86400]) // 1 day
			await ethers.provider.send('evm_mine', [])
			const mintInfo = await xex.getUserMint(await user1.getAddress())
			const reward = await xex.calculateMintReward(mintInfo.rank, mintInfo.term, mintInfo.maturityTs, mintInfo.amplifier, mintInfo.eaaRate)
			expect(reward).to.be.a('bigint')
		})

		it('Should calculate reward amplifier', async function () {
			const amplifier = await xex.calculateRewardAmplifier()
			expect(amplifier).to.be.a('bigint')
		})

		it('Should calculate EAA rate', async function () {
			const eaaRate = await xex.calculateEAARate()
			expect(eaaRate).to.be.a('bigint')
		})

		it('Should calculate APY', async function () {
			const apy = await xex.calculateAPY()
			expect(apy).to.be.a('bigint')
		})

		it('Should get gross reward', async function () {
			const reward = await xex.getGrossReward(10, 5, 10, 1000)
			expect(reward).to.be.a('bigint')
		})

		it('Should get user mint info', async function () {
			await xex.connect(user1).claimRank(10)
			const mintInfo = await xex.getUserMint(await user1.getAddress())
			expect(mintInfo.rank).to.equal(1)
		})

		it('Should get user stake info', async function () {
			await xex.connect(user1).claimRank(1)
			await ethers.provider.send('evm_increaseTime', [86400]) // 1 day
			await ethers.provider.send('evm_mine', [])
			await xex.connect(user1).claimMintReward()
			const balance = await xex.balanceOf(await user1.getAddress())
			await xex.connect(user1).stake(balance, 10)
			const stakeInfo = await xex.getUserStake(await user1.getAddress())
			expect(stakeInfo.amount).to.equal(balance)
		})

		it('Should get current AMP', async function () {
			const amp = await xex.getCurrentAMP()
			expect(amp).to.be.a('bigint')
		})

		it('Should get current EAA rate', async function () {
			const eaaRate = await xex.getCurrentEAAR()
			expect(eaaRate).to.be.a('bigint')
		})

		it('Should get current max term', async function () {
			const maxTerm = await xex.getCurrentMaxTerm()
			expect(maxTerm).to.be.a('bigint')
		})

		it('Should create minter', async function () {
			await xex.connect(user1).minter_create(1, 10)
			const minters = await xex.mintersOf(await user1.getAddress())
			expect(minters.length).to.equal(1)
		})

		it('Should get minter info', async function () {
			await xex.connect(user1).minter_create(1, 10)
			const minterInfo = await xex.minterInfoOf(await user1.getAddress())
			expect(minterInfo.length).to.equal(1)
		})

		it('Should claim minter rank', async function () {
			await xex.connect(user1).minter_create(1, 10)
			await xex.connect(user1).minter_claimRank(1)
			const minterInfo = await xex.minterInfoOf(await user1.getAddress())
			expect(minterInfo[0].rank).to.be.gt(0)
		})

		it('Should claim minter mint reward', async function () {
			await xex.connect(user1).minter_create(1, 1)
			await ethers.provider.send('evm_increaseTime', [86400]) // 1 day
			await ethers.provider.send('evm_mine', [])
			await xex.connect(user1).minter_claimMintReward(1, await user1.getAddress())
			const balance = await xex.balanceOf(await user1.getAddress())
			expect(balance).to.be.gt(0)
		})

		it('Should get minter mint reward', async function () {
			await xex.connect(user1).minter_create(1, 1)
			await ethers.provider.send('evm_increaseTime', [86400]) // 1 day
			await ethers.provider.send('evm_mine', [])
			const rewards = await xex.minter_getMintReward(await user1.getAddress())
			expect(rewards.length).to.equal(1)
		})

		it('Should calculate stake reward', async function () {
			await xex.connect(user1).claimRank(1)
			await ethers.provider.send('evm_increaseTime', [86400]) // 1 day
			await ethers.provider.send('evm_mine', [])
			await xex.connect(user1).claimMintReward()
			const balance = await xex.balanceOf(await user1.getAddress())
			await xex.connect(user1).stake(balance, 1)
			const reward = await xex.calculateStakeReward(await user1.getAddress())
			expect(reward).to.be.a('bigint')
		})

		it('Should get stake reward', async function () {
			await xex.connect(user1).claimRank(1)
			await ethers.provider.send('evm_increaseTime', [86400]) // 1 day
			await ethers.provider.send('evm_mine', [])
			await xex.connect(user1).claimMintReward()
			const balance = await xex.balanceOf(await user1.getAddress())
			await xex.connect(user1).stake(balance, 1)
			const reward = await xex.calculateStakeReward(await user1.getAddress())
			expect(reward).to.be.a('bigint')
		})

		it('should return correct reward if user has a stake', async function () {
			const amount = await mint(user1)
			const term = (await xex.MAX_TERM_END()) / 86400n
			await mint(user1)
			await xex.connect(user1).stake(amount, term)
			await ethers.provider.send('evm_increaseTime', [(term * 24n * 60n * 60n).toString()])
			await ethers.provider.send('evm_mine')
			const XEX_APR = await xex.XEX_APR()
			const DAYS_IN_YEAR = await xex.DAYS_IN_YEAR()
			const reward = await xex.stakeRewardOf(user1.getAddress())
			const expectedReward = (amount * XEX_APR * term * 1_000_000n) / DAYS_IN_YEAR / 100_000_000n / ethers.parseEther('1')
			expect(reward).to.equal(expectedReward)
		})

		it('should return 0 if stake is not mature', async function () {
			const term = (await xex.MAX_TERM_END()) / 86400n
			const amount = await mint(user1)
			await xex.connect(user1).stake(amount, term)
			await ethers.provider.send('evm_increaseTime', [1 * 24 * 60 * 60])
			await ethers.provider.send('evm_mine')
			const reward = await xex.calculateStakeReward(user1.getAddress())
			expect(reward).to.equal(0)
		})
	})
	describe('Minting Amounts', function () {
		const expectedMintAmounts = [
			{ term: 1, expected: toWei(5) },
			{ term: 2, expected: toWei(10) },
			{ term: 3, expected: toWei(15) },
			{ term: 4, expected: toWei(20) },
			{ term: 5, expected: toWei(25) },
			{ term: 6, expected: toWei(30) },
			{ term: 7, expected: toWei(35) },
			{ term: 8, expected: toWei(40) },
			{ term: 9, expected: toWei(45) },
			{ term: 10, expected: toWei(50) }
		]

		expectedMintAmounts.forEach(({ term, expected }) => {
			it(`should mint ${d(expected.toString())} XEX for a ${term}-day term`, async function () {
				await xex.connect(user1).claimRank(term)
				await warp(BigInt(term) * 24n * 3600n)
				await xex.connect(user1).claimMintRewardTo(user1.address)
				const balance = await xex.balanceOf(user1.address)
				expect(balance).to.equal(expected)
			})
		})
		let loop = 100
		it(`should observe the impact of global rank increase on minting amounts (${loop} loops)`, async function () {
			const initialTerm = 1
			const initialExpected = toWei(5)
			await xex.connect(user1).claimRank(initialTerm)
			await warp(BigInt(initialTerm) * 24n * 3600n)
			await xex.connect(user1).claimMintRewardTo(user1.address)
			let balance = await xex.balanceOf(user1.address)
			expect(balance).to.equal(initialExpected)
			for (let i = 0; i < loop; i++) {
				await xex.connect(user2).claimRank(1)
				await warp(24n * 3600n)
				await xex.connect(user2).claimMintRewardTo(user2.address)
			}
			const newTerm = 1
			await xex.connect(user1).claimRank(newTerm)
			await warp(BigInt(newTerm) * 24n * 3600n)
			await xex.connect(user1).claimMintRewardTo(user1.address)
			balance = await xex.balanceOf(user1.address)
			expect(balance).to.be.closeTo(toWei(9), toWei(10))
			console.log(`Interactions: ${loop}, balance: ${d(balance)}`)
		})
	})
	describe('APR', function () {
		let MAX_TERM_END: bigint
		let XEX_APR: bigint
		let APR_DAY: bigint
		let APR_MONTH: bigint
		let expectedYearlyAPR = toWei(20)
		beforeEach(async function () {
			termInDays = (await xex.calculateMaxTerm()) / 86400n // in days
			termInSeconds = termInDays * 24n * 3600n
			await xex.connect(user1).claimRank(termInDays)
			await xex.connect(user2).claimRank(termInDays)
			await warp(termInSeconds)
			await xex.connect(user1).claimMintRewardTo(user1.address)
			await xex.connect(user2).claimMintRewardTo(user1.address)
			deposit = await xex.balanceOf(user1.address)
			MAX_TERM_END = (await xex.MAX_TERM_END()) / 86400n // 10 days
			XEX_APR = await xex.XEX_APR() // 20 ether
			APR_DAY = XEX_APR / 365n // 20 ether / 365 days
			APR_MONTH = XEX_APR / 12n // 20 ether / 12 months
			expect(deposit).to.be.gte(toWei(100))
		})
		it(`should return 20% APR for 1 year lock`, async function () {
			expect(expectedYearlyAPR).to.equal(XEX_APR, '[1] APR should be 20% for 1 year lock')
			await xex.connect(user1).stake(deposit, MAX_TERM_END)
			const stakeInfo = await xex.getUserStake(user1.address)
			expect(expectedYearlyAPR).to.equal(stakeInfo.apy, '[2] APR should be 20% for 1 year lock')
		})
		it(`should return [1/12] ~1.66% APR for 1 month lock`, async function () {
			await xex.connect(user1).stake(deposit, MAX_TERM_END)
			expect(MAX_TERM_END).to.eq(10n)
			expect(XEX_APR).to.eq(toWei(20))
			expect(d(APR_MONTH)).to.eq(1.67)
			const stakeRewardOf = await xex.stakeRewardOf(user1.address)
			expect(d(stakeRewardOf)).to.eq(d(APR_DAY * 10n))
		})
	})
	describe('Deployment', function () {
		it('Should set the right owner', async function () {
			expect(await xex.treasury()).to.equal(dev.address)
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
			const tx = await xex.connect(user1).claimMintRewardTo(user1.address)

			// Verification: Check user balance and emitted event
			const rewardAmount = await xex.balanceOf(user1.address)
			expect(rewardAmount).to.be.gt(0n) // Check if the reward is greater than 0

			// Check for emitted event 'MintClaimed'
			await expect(tx).to.emit(xex, 'MintClaimed').withArgs(user1.address, user1.address, rewardAmount)

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
			const tx = await xex.connect(user1).claimMintRewardTo(user1.address)

			// Verification: Check user balance and emitted event
			const rewardAmount = await xex.balanceOf(user1.address)
			expect(rewardAmount).to.be.gt(0n) // Check if the reward is greater than 0

			// Check for emitted event 'MintClaimed'
			await expect(tx).to.emit(xex, 'MintClaimed').withArgs(user1.address, user1.address, rewardAmount)
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
			const tx = await xex.connect(user1).claimMintRewardTo(user1.address)

			// Verification: Check user balance and emitted event
			const rewardAmount = await xex.balanceOf(user1.address)
			expect(rewardAmount).to.be.gt(0n) // Check if the reward is greater than 0

			// Check for emitted event 'MintClaimed'
			await expect(tx).to.emit(xex, 'MintClaimed').withArgs(user1.address, user1.address, rewardAmount)

			// Move time forward to simulate passing of the term period
			await ethers.provider.send('evm_increaseTime', [termSeconds.toString()])
			await ethers.provider.send('evm_mine', [])

			//TODO: Calculate expected penalty
		})
	})
	describe('Staking Functionality', function () {
		let XEX_APR: bigint
		let APR_DAY: bigint
		beforeEach(async function () {
			XEX_APR = await xex.XEX_APR() // 20 ether
			APR_DAY = XEX_APR / 365n // 20 ether / 365 days
		})
		it('Should handle stakes correctly with 20% APR', async function () {
			// User claims a rank and mints XEX
			const MAX_TERM_SECONDS = await xex.calculateMaxTerm()
			const MAX_TERM = parseInt(MAX_TERM_SECONDS.toString()) / 86400
			for (let i = 0; i < 10; i++) {
				await xex.connect(user1).claimRank(MAX_TERM)
				await warp(MAX_TERM_SECONDS)
				// User claims their mint reward
				await xex.connect(user1).claimMintRewardTo(user1.address)
			}

			const MAX_TERM_END = (await xex.MAX_TERM_END()) / 86400n
			const balanceOf = await xex.balanceOf(user1.address)
			const wantStake = toWei(100)
			expect(balanceOf).to.be.gte(wantStake)
			await xex.connect(user1).stake(wantStake, MAX_TERM_END)
			const [term, maturityTs, amount, apy] = await xex.getUserStake(user1.address)
			expect(amount).to.equal(wantStake)
			expect(term).to.equal(MAX_TERM_END)
			await adv(maturityTs + 1n)
			const [mature2] = await xex.isMature(user1.address)
			expect(mature2).to.be.true
			const [mintReward, stakeReward] = await xex.rewardsOf(user1.address)
			expect(mintReward).to.be.gte(0)
			expect(wantStake).to.be.eq(toWei(100))
			expect(d(stakeReward)).to.be.eq(d(APR_DAY * 10n))
		})
		it('Should handle stakes correctly', async function () {
			// User claims a rank and mints XEX
			const termDays = 5 // term in days for the mint
			const termSeconds = termDays * 24 * 3600 // convert term to seconds
			await xex.connect(user1).claimRank(termDays)

			// Move time forward to simulate passing of the term period
			await ethers.provider.send('evm_increaseTime', [termSeconds])
			await ethers.provider.send('evm_mine', [])

			// User claims their mint reward
			await xex.connect(user1).claimMintRewardTo(user1.address)

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
			await xex.connect(user1).claimMintRewardTo(user1.address)

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
	describe('Mint Factory', function () {
		it('Should allow users to create multiple minters', async function () {
			const amount = 5
			const term = 10

			await xex.connect(user1).minter_create(amount, term)

			const minters = await xex.mintersOf(user1.address)
			expect(minters.length).to.equal(amount)
		})

		it('Should return correct minter info', async function () {
			const amount = 3
			const term = (await xex.calculateMaxTerm()) / 86400n

			await xex.connect(user1).minter_create(amount, term)

			const minterInfo = await xex.minterInfoOf(user1.address)
			expect(minterInfo.length).to.equal(amount)

			for (let info of minterInfo) {
				expect(info.term).to.equal(term)
				expect(info.maturityTs).to.be.gt(0)
			}
		})

		it('Should allow batch rank claiming for minters', async function () {
			const amount = 10
			const term = (await xex.calculateMaxTerm()) / 86400n
			await xex.connect(user1).minter_create(amount, term)
			const minterInfoOf = await xex.minterInfoOf(user1.address)
			let maturityTs = 0n
			for (let i = 0; i < minterInfoOf.length; i++) maturityTs = minterInfoOf[i].maturityTs
			await warp(maturityTs + 1n)
			const tx = await xex.connect(user1).minter_claimRank(amount)
			const r = await tx.wait()
			expect(r).to.emit(xex, 'MintersClaimed').withArgs(amount)
			const mintersOf = await xex.mintersOf(user1.address)
			expect(mintersOf.length).to.equal(amount)
			const minterInfo = await xex.minterInfoOf(user1.address)
			let claimedCount = 0
			for (let info of minterInfo) if (info.rank > 0) claimedCount++
			expect(claimedCount).to.equal(amount)
		})

		it('Should allow batch mint reward claiming', async function () {
			const amount = 10
			const term = (await xex.calculateMaxTerm()) / 86400n
			await xex.connect(user1).minter_create(amount, term)
			await xex.connect(user1).minter_claimRank(amount)
			const minterInfoOf = await xex.minterInfoOf(user1.address)
			let maturityTs = 0n
			for (let i = 0; i < minterInfoOf.length; i++) maturityTs = minterInfoOf[i].maturityTs
			await warp(maturityTs + 1n)
			const initialBalance = await xex.balanceOf(user1.address)
			await xex.connect(user1).minter_claimMintReward(amount, user1.address)
			const finalBalance = await xex.balanceOf(user1.address)
			expect(finalBalance).to.be.gt(initialBalance)
		})

		it('Should return correct mint rewards', async function () {
			const amount = 2
			const term = (await xex.calculateMaxTerm()) / 86400n
			await xex.connect(user1).minter_create(amount, term)
			await xex.connect(user1).minter_claimRank(amount)
			await ethers.provider.send('evm_increaseTime', [term.toString()])
			await ethers.provider.send('evm_mine', [])
			const rewards = await xex.minter_getMintReward(user1.address)
			expect(rewards.length).to.equal(amount)
			for (let reward of rewards) {
				expect(reward).to.be.gt(0)
			}
		})
	})
})
