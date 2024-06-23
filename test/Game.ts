Error.stackTraceLimit = Infinity
import { time, loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { expect } from 'chai'
import { ethers } from 'hardhat'
const toWei = ethers.parseEther
describe('Game', function () {
	const depositAmount = toWei('100')
	async function deploy() {
		const [owner, gamer1, gamer2] = await ethers.getSigners()
		const XEX = await ethers.getContractFactory('XEX')
		const Game = await ethers.getContractFactory('GameNFT')
		const xex = await XEX.deploy()
		const game = await Game.deploy()
		await xex.addMinter(game.target)
		return { game, owner, gamer1, gamer2, xex }
	}

	describe('Dungeon Management', function () {
		it('should add a new dungeon', async function () {
			const { game, owner, xex } = await loadFixture(deploy)
			const startIn = await time.latest()
			const endIn = startIn + 1
			const minMintFee = 100
			const minTermDate = 1000
			const maxTermDate = 10000
			const failurePercentage = 20
			const name = 'Dungeon 1'
			const rewardAmount = depositAmount

			await game.addDungeon(name, startIn, endIn, minMintFee, minTermDate, maxTermDate, failurePercentage, xex.target, rewardAmount)

			const dungeon = await game.getDungeonInfo(0)

			expect(dungeon.name).to.equal(name)
			expect(dungeon.startIn).to.equal(startIn)
			expect(dungeon.endIn).to.equal(endIn)
			expect(dungeon.minMintFee).to.equal(minMintFee)
			expect(dungeon.minTermDate).to.equal(minTermDate)
			expect(dungeon.maxTermDate).to.equal(maxTermDate)
			expect(dungeon.failurePercentage).to.equal(failurePercentage)
			expect(dungeon.active).to.equal(true)
			expect(dungeon.rewardToken).to.equal(xex.target)
			expect(dungeon.rewardAmount).to.equal(rewardAmount)
		})

		it('should remove a dungeon', async function () {
			const { game, xex, owner } = await loadFixture(deploy)
			const startIn = await time.latest()
			const endIn = startIn + 1
			const minMintFee = 100
			const minTermDate = 1000
			const maxTermDate = 10000
			const failurePercentage = 20
			const name = 'Dungeon 1'
			const rewardAmount = depositAmount

			await game.addDungeon(name, startIn, endIn, minMintFee, minTermDate, maxTermDate, failurePercentage, xex.target, rewardAmount)

			await game.removeDungeon(0)
			await expect(game.getDungeonInfo(0)).to.be.revertedWithCustomError(game, 'DungeonNotFound')
		})

		it('should set a dungeon status', async function () {
			const { game, xex } = await loadFixture(deploy)
			const startIn = await time.latest()
			const endIn = startIn + 1
			const minMintFee = 100
			const minTermDate = 1000
			const maxTermDate = 10000
			const failurePercentage = 20
			const name = 'Dungeon 1'
			const rewardAmount = depositAmount

			await game.addDungeon(name, startIn, endIn, minMintFee, minTermDate, maxTermDate, failurePercentage, xex.target, rewardAmount)

			await game.setDungeonStatus(0, false)
			const dungeon = await game.getDungeonInfo(0)
			expect(dungeon.active).to.equal(false)
		})
	})

	describe('Game Play', function () {
		it('should start a new session', async function () {
			const { game, xex, gamer1 } = await loadFixture(deploy)
			const startIn = await time.latest()
			const endIn = startIn + 1
			const minMintFee = 100
			const minTermDate = 1000
			const maxTermDate = 10000
			const failurePercentage = 20
			const name = 'Dungeon 1'
			const rewardAmount = depositAmount

			await game.addDungeon(name, startIn, endIn, minMintFee, minTermDate, maxTermDate, failurePercentage, xex.target, rewardAmount)

			await expect(game.connect(gamer1).start(0, { value: minMintFee })).to.emit(game, 'NewSession')
		})

		it('should end a session', async function () {
			const { game, xex, gamer1 } = await loadFixture(deploy)
			const startIn = await time.latest()
			const endIn = startIn + 10
			const minMintFee = 100
			const minTermDate = 1000
			const maxTermDate = 10000
			const failurePercentage = 20
			const name = 'Dungeon 1'
			const rewardAmount = depositAmount

			await game.addDungeon(name, startIn, endIn, minMintFee, minTermDate, maxTermDate, failurePercentage, xex.target, rewardAmount)
			
			// advance time to start the game
			await time.increaseTo(startIn + 5)
			await game.connect(gamer1).start(0, { value: minMintFee })
			await expect(game.connect(gamer1).end(0, true)).to.emit(game, 'EndSession')
		})

		it('should claim a session', async function () {
			const { game, xex, gamer1 } = await loadFixture(deploy)
			const startIn = await time.latest()
			const endIn = startIn + 10
			const minMintFee = 100
			const minTermDate = 1000
			const maxTermDate = 10000
			const failurePercentage = 20
			const name = 'Dungeon 1'
			const rewardAmount = depositAmount

			await game.addDungeon(name, startIn, endIn, minMintFee, minTermDate, maxTermDate, failurePercentage, xex.target, rewardAmount)
			
			// advance time to start the game
			await time.increaseTo(startIn + 5)
			await game.connect(gamer1).start(0, { value: minMintFee })
			await game.connect(gamer1).end(0, true)
			await expect(game.connect(gamer1).claim(0)).to.emit(game, 'Claim')
		})
	})
})
