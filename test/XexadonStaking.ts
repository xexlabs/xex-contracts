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
		let MAX_BOOST: bigint
		beforeEach(async function () {
			LOCKUP_PERIOD = await main.LOCKUP_PERIOD()
			MAX_BOOST = await main.MAX_BOOST()
			expect(Number(LOCKUP_PERIOD) / (24 * 60 * 60)).to.equal(7)
			expect(Number(MAX_BOOST)).to.equal(50000)
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
			expect(boost).to.equal(50000)
		})

		it('should reset boost to initial value when unstaking', async function () {
			const [StakedXexadon, assets] = await main.getStakeOf(user1.address)
			expect(assets.length).to.equal(10)
			expect(StakedXexadon[0]).to.equal(user1.address)
			const lockupEndTime = StakedXexadon[1]
			await warp(lockupEndTime)
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
			expect(assets.length).to.equal(25) // 10 from before, 15 from now
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
	describe('Security - onlyOwner functions', function () {
		it('should revert if non-owner tries to call setMaxBoost', async function () {
			await expect(main.connect(user1).setMaxBoost(10000)).to.be.reverted
		})

		it('should revert if non-owner tries to call setMaxStake', async function () {
			await expect(main.connect(user1).setMaxStake(10)).to.be.reverted
		})

		it('should revert if non-owner tries to call setLockupPeriod', async function () {
			await expect(main.connect(user1).setLockupPeriod(1)).to.be.reverted
		})

		it('should revert if non-owner tries to call setBaseUriPrefix', async function () {
			await expect(main.connect(user1).setBaseUriPrefix('newUri')).to.be.reverted
		})

		it('should revert if non-owner tries to call setAllowTransferTo', async function () {
			await expect(main.connect(user1).setAllowTransferTo(1, true)).to.be.reverted
		})
	})
	describe('Boost Calculation', function () {
		it('should calculate boost correctly for different numbers of staked assets', async function () {
			for (let i = 0; i < 5; i++) {
				await xdon.ownerMint(user1.address)
			}
			await main.connect(user1).stakeAll()
			const boost = await main.getBoostOf(user1.address)
			expect(boost).to.be.gt(0)
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
		it('should revert if unstaking before lockup period ends', async function () {
			for (let i = 0; i < 5; i++) {
				await xdon.ownerMint(user1.address)
			}
			await main.connect(user1).stakeAll()
			await expect(main.connect(user1).unstakeAll(1n)).to.be.revertedWith('LockupPeriodNotOver')
		})

		it('should allow unstaking after lockup period ends', async function () {
			for (let i = 0; i < 5; i++) {
				await xdon.ownerMint(user1.address)
			}
			await main.connect(user1).stakeAll()
			await warp(LOCKUP_PERIOD)
			await main.connect(user1).unstakeAll(1n)
			const balance = await xdon.balanceOf(user1.address)
			expect(balance).to.equal(5)
		})
	})

	describe('Admin Functions', function () {
		it('should allow only owner to call admin functions', async function () {
			await expect(main.connect(user1).setMaxBoost(10000)).to.be.revertedWith('Ownable: caller is not the owner')
			await main.connect(dev).setMaxBoost(10000)
			expect(await main.MAX_BOOST()).to.equal(10000)
		})

		it('should apply changes made by admin functions', async function () {
			await main.connect(dev).setMaxBoost(10000)
			expect(await main.MAX_BOOST()).to.equal(10000)
			await main.connect(dev).setMaxStake(50)
			expect(await main.MAX_STAKE()).to.equal(50)
		})
	})

	describe('Transfer Restrictions', function () {
		it('should restrict transfer of staking receipt NFTs', async function () {
			for (let i = 0; i < 5; i++) {
				await xdon.ownerMint(user1.address)
			}
			await main.connect(user1).stakeAll()
			await expect(main.connect(user1).transferFrom(user1.address, user2.address, 1)).to.be.revertedWith('TransferNotAllowed')
		})

		it('should allow transfer of staking receipt NFTs if allowed', async function () {
			for (let i = 0; i < 5; i++) {
				await xdon.ownerMint(user1.address)
			}
			await main.connect(user1).stakeAll()
			await main.connect(dev).setAllowTransferTo(1, true)
			await main.connect(user1).transferFrom(user1.address, user2.address, 1)
			const newOwner = await main.ownerOf(1)
			expect(newOwner).to.equal(user2.address)
		})
	})

	describe('Edge Cases', function () {
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
