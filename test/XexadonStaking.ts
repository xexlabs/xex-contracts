import { expect } from 'chai'
import hre from 'hardhat'
import { XexadonStaking } from '../typechain-types/contracts/XexadonStaking'
import { XDON } from '../typechain-types/contracts/XDON'
import moment from 'moment'

describe('XexadonStaking', function () {
	let xdon: XDON
	const ethers = hre.ethers
	const fromWei = (value: any, decimals: number = 18) => parseFloat(ethers.formatUnits(value.toString(), decimals))
	const d = (value: any, decimals: number = 18, truncate: number = 2) => parseFloat(fromWei(value, decimals).toFixed(truncate))
	const toWei = (value: any, decimals: number = 18) => ethers.parseUnits(value.toString(), decimals)
	const getTimestamp = async () => {
		const block = await ethers.provider.getBlock('latest')
		return block?.timestamp
	}
	const adv = async (ts: bigint) => {
		await ethers.provider.send('evm_setNextBlockTimestamp', [ts.toString()])
		await ethers.provider.send('evm_mine', [])
	}
	const warp = async (seconds: bigint) => {
		await ethers.provider.send('evm_increaseTime', [seconds.toString()])
		await ethers.provider.send('evm_mine', [])
	}
	let main: XexadonStaking, dev: any, user1: any, user2: any
	beforeEach(async function () {
		;[dev, user1, user2] = await hre.ethers.getSigners()
		const xexadonStakingFactory = await hre.ethers.getContractFactory('XexadonStaking')
		const xdontFactory = await hre.ethers.getContractFactory('XDON')
		xdon = (await xdontFactory.deploy()) as XDON
		main = (await xexadonStakingFactory.deploy(xdon.target)) as XexadonStaking
		await xdon.connect(user1).setApprovalForAll(main.target, true)
	})
	describe('Stake & Unstake', function () {
		let tokenId: bigint
		let stakeId: bigint
		beforeEach(async function () {
			await xdon.ownerMint(user1.address)
			const balanceOf = await xdon.balanceOf(user1.address)
			expect(balanceOf).to.equal(1)
			tokenId = await xdon.tokenOfOwnerByIndex(user1.address, 0)
		})
		it(`stakeAll`, async function () {
			await main.connect(user1).stakeAll()
			const balance = await main.balanceOf(user1.address)
			expect(balance).to.equal(1)
		})
		it(`unstakeAll`, async function () {
			for (let i = 0; i < 9; i++) {
				await xdon.ownerMint(user1.address)
			}
			await main.connect(user1).stakeAll()
			const balance = await main.balanceOf(user1.address)
			expect(balance).to.equal(1n)
			const stakedBalance = await main.balanceOf(user1.address)
			expect(stakedBalance).to.equal(1n)
			stakeId = await main.tokenOfOwnerByIndex(user1.address, stakedBalance - 1n)
			expect(stakeId).to.equal(1n)
			const [StakedXexadon, assets] = await main.getStakeOf(user1.address)
			expect(assets[0]).to.equal(stakeId)
			expect(StakedXexadon[0]).to.equal(user1.address)
			const lockupEndTime = StakedXexadon[1]
			await warp(lockupEndTime)
			await main.connect(user1).unstakeAll(stakeId)
			const balance2 = await main.balanceOf(user1.address)
			expect(balance2).to.equal(0)
			const balance3 = await xdon.balanceOf(user1.address)
			expect(balance3).to.equal(10n)
		})
	})
	describe('Security Checks', function () {
		it('should revert if non-owner tries to call onlyOwner functions', async function () {
			await expect(main.connect(user1).setMaxBoost(10000)).to.be.reverted
			await expect(main.connect(user1).setMaxStake(10)).to.be.reverted
			await expect(main.connect(user1).setLockupPeriod(1)).to.be.reverted
			await expect(main.connect(user1).setBaseUriPrefix('newUri')).to.be.reverted
		})

		it('should allow owner to call onlyOwner functions', async function () {
			await main.connect(dev).setMaxBoost(10000)
			expect(await main.MAX_BOOST()).to.equal(10000)

			await main.connect(dev).setMaxStake(10)
			expect(await main.MAX_STAKE()).to.equal(10)

			await main.connect(dev).setLockupPeriod(1)
			expect(await main.LOCKUP_PERIOD()).to.equal(1)

			await main.connect(dev).setBaseUriPrefix('newUri')
			expect(await main.getBaseURI()).to.equal('newUri')
		})
	})

	describe('Boost Variable', function () {
		let LOCKUP_PERIOD: bigint
		beforeEach(async function () {
			LOCKUP_PERIOD = await main.LOCKUP_PERIOD()
			expect(Number(LOCKUP_PERIOD) / (24 * 60 * 60)).to.equal(7)
			for (let i = 0; i < 10; i++) {
				await xdon.ownerMint(user1.address)
			}
			await xdon.connect(user1).setApprovalForAll(main.target, true)
			await main.connect(user1).stakeAll()
			const [StakedXexadon, assets] = await main.getStakeOf(user1.address)
			expect(assets.length).to.equal(10)
			expect(StakedXexadon[0]).to.equal(user1.address)
		})

		it('should increase boost correctly for 1 Xexadon per day', async function () {
			let [r] = await main.getStakeOf(user1.address)
			let lockupEndTime = r.lockupEndTime.toString()
			for (let i = 0; i < 30; i++) {
				await warp(BigInt((i + 1) * 24 * 60 * 60))
				const boost = await main.getBoostOf(user1.address)
				let [rr] = await main.getStakeOf(user1.address)
				lockupEndTime = rr.lockupEndTime.toString()
				const ts = moment.unix(Number(await getTimestamp())).format('YYYY-MM-DD')
				//console.log(`days=${i + 1} date=${ts} boost=${boost}`)
			}
		})

		it('should increase boost correctly for 10 Xexadons per day', async function () {
			const boost = await main.getBoostOf(user1.address)
			expect(boost).to.equal(20) // 10 Xexadons * 2 points per day
		})

		it('should increase boost correctly for 25 Xexadons per day', async function () {
			for (let i = 0; i < 15; i++) {
				await xdon.ownerMint(user1.address)
			}
			await main.connect(user1).stakeAll()
			const [StakedXexadon, assets] = await main.getStakeOf(user1.address)
			expect(assets.length).to.equal(25)
			expect(StakedXexadon[0]).to.equal(user1.address)
			const lockupEndTime = StakedXexadon[1]
			await warp(lockupEndTime)
			const boost = await main.getBoostOf(user1.address)
			expect(boost).to.equal(100) // 25 Xexadons * 4 points per day
		})

		it('should reset boost to initial value when unstaking', async function () {
			await main.connect(user1).unstakeAll(1n)
			const boost = await main.getBoostOf(user1.address)
			expect(boost).to.equal(0)
		})

		it('should not exceed maximum boost value', async function () {
			for (let i = 0; i < 15; i++) {
				await xdon.ownerMint(user1.address)
			}
			await main.connect(user1).stakeAll()
			const [StakedXexadon, assets] = await main.getStakeOf(user1.address)
			expect(assets.length).to.equal(10)
			expect(StakedXexadon[0]).to.equal(user1.address)
			const lockupEndTime = StakedXexadon[1]
			await warp(lockupEndTime)
			const boost = await main.getBoostOf(user1.address)
			expect(boost).to.equal(50000) // MAX_BOOST
		})
	})
	describe('Stake & Unstake', function () {
		it('should revert if non-owner tries to call onlyOwner functions', async function () {
			await expect(main.connect(user1).setMaxBoost(10000)).to.be.reverted
		})
	})
})
