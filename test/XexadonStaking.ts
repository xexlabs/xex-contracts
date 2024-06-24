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
			//await main.connect(dev).setAllowTransferTo(user1.address, true)
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

	describe('Boost Calculation', function () {
		let LOCKUP_PERIOD: bigint
		beforeEach(async function () {
			LOCKUP_PERIOD = await main.LOCKUP_PERIOD()
			for (let i = 0; i < 10; i++) {
				await xdon.ownerMint(user1.address)
			}
			await xdon.connect(user1).setApprovalForAll(main.target, true)
			await main.connect(user1).stakeAll()
			const [StakedXexadon, assets] = await main.getStakeOf(user1.address)
			expect(assets.length).to.equal(10)
			expect(StakedXexadon[0]).to.equal(user1.address)
		})
		it('should calculate boost correctly for different numbers of staked assets', async function () {
			for (let i = 0; i < 5; i++) {
				await xdon.ownerMint(user1.address)
			}
			await main.connect(user1).stakeAll()
			const boost = await main.getBoostOf(user1.address)
			expect(boost).to.be.eq(0)
			await warp(7n * 24n * 60n * 60n) // 7 days
			expect(await main.getBoostOf(user1.address)).to.be.eq(420)
			await warp(30n * 24n * 60n * 60n) // 30 days
			expect(await main.getBoostOf(user1.address)).to.be.eq(2220)
			await warp(90n * 24n * 60n * 60n) // 90 days
			expect(await main.getBoostOf(user1.address)).to.be.eq(7620)
			await warp(365n * 24n * 60n * 60n) // 365 days
			expect(await main.getBoostOf(user1.address)).to.be.eq(29520)
			await warp(2n * 365n * 24n * 60n * 60n) // 2 years
			expect(await main.getBoostOf(user1.address)).to.be.eq(50000)
		})

		it('should reset boost correctly after unstaking', async function () {
			for (let i = 0; i < 5; i++) {
				await xdon.ownerMint(user1.address)
			}
			await main.connect(user1).stakeAll()
			await warp(LOCKUP_PERIOD)
			await main.connect(user1).unstakeAll(1n)
			const boost = await main.getBoostOf(user1.address)
			expect(boost).to.equal(0)
		})
	})
	describe('Lockup Period', function () {
		let LOCKUP_PERIOD: bigint
		let MAX_BOOST: bigint
		beforeEach(async function () {
			LOCKUP_PERIOD = await main.LOCKUP_PERIOD()
			MAX_BOOST = await main.MAX_BOOST()
			for (let i = 0; i < 10; i++) {
				await xdon.ownerMint(user1.address)
			}
			await xdon.connect(user1).setApprovalForAll(main.target, true)
			await main.connect(user1).stakeAll()
			const [StakedXexadon, assets] = await main.getStakeOf(user1.address)
			expect(assets.length).to.equal(10)
			expect(StakedXexadon[0]).to.equal(user1.address)
		})
		it('should revert if unstaking before lockup period ends', async function () {
			for (let i = 0; i < 5; i++) {
				await xdon.ownerMint(user1.address)
			}
			await main.connect(user1).stakeAll()
			await expect(main.connect(user1).unstakeAll(1n)).to.be.reverted
		})

		it('should allow unstaking after lockup period ends', async function () {
			for (let i = 0; i < 5; i++) {
				await xdon.ownerMint(user1.address)
			}
			await main.connect(user1).stakeAll()
			await warp(LOCKUP_PERIOD)
			await main.connect(user1).unstakeAll(1n)
			const balance = await xdon.balanceOf(user1.address)
			expect(balance).to.equal(15)
		})
	})
	describe('Transfer Restrictions', function () {
		it('should restrict transfer of staking receipt NFTs', async function () {
			await main.connect(user1).stakeAll()
			const allowTransfer = await main.allowTransfer(user1.address)
			expect(allowTransfer).to.be.eq(false)
			await expect(main.connect(user1).transferFrom(user1.address, user2.address, 1)).to.be.reverted
		})

		it('should allow transfer of staking receipt NFTs if allowed', async function () {
			await xdon.ownerMint(user1.address)
			await main.connect(user1).stakeAll()
			await main.connect(dev).setAllowTransfer(user1.address, true)
			await main.connect(user1).transferFrom(user1.address, user2.address, 1)
			const newOwner = await main.ownerOf(1)
			expect(newOwner).to.equal(user2.address)
		})
	})
	describe('Edge Cases', function () {
		let LOCKUP_PERIOD: bigint
		beforeEach(async function () {
			LOCKUP_PERIOD = await main.LOCKUP_PERIOD()
		})
		it('should handle staking and unstaking with maximum number of assets', async function () {
			for (let i = 0; i < 25; i++) {
				await xdon.ownerMint(user1.address)
			}
			await main.connect(user1).stakeAll()
			const balance = await main.balanceOf(user1.address)
			expect(balance).to.equal(1)
			await warp(LOCKUP_PERIOD)
			await main.connect(user1).unstakeAll(1n)
			const balanceAfter = await xdon.balanceOf(user1.address)
			expect(balanceAfter).to.equal(25)
		})

		it('should handle multiple staking and unstaking actions', async function () {
			for (let i = 0; i < 5; i++) {
				await xdon.ownerMint(user1.address)
			}
			await main.connect(user1).stakeAll()
			await warp(LOCKUP_PERIOD)
			await main.connect(user1).unstakeAll(1n)
			for (let i = 0; i < 5; i++) {
				await xdon.ownerMint(user1.address)
			}
			await main.connect(user1).stakeAll()
			const balance = await main.balanceOf(user1.address)
			expect(balance).to.equal(1)
		})
	})
})
