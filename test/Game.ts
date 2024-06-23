Error.stackTraceLimit = Infinity
import { time, loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { expect } from 'chai'
import { ethers } from 'hardhat'
import { Game, GameNFT, XEX } from '../typechain-types/contracts'
import { Signer } from 'ethers'
const toWei = ethers.parseEther
describe('Game', function () {
	const depositAmount = toWei('100')
	const timestamp = async () => BigInt(await timestamp())
	async function deploy() {
		const [owner, gamer1, gamer2] = await ethers.getSigners()
		const XEX = await ethers.getContractFactory('XEX')
		const Game = await ethers.getContractFactory('GameMain')
		const GameNFT = await ethers.getContractFactory('GameNFT')
		const nft = (await GameNFT.deploy()) as GameNFT
		const xex = (await XEX.deploy()) as XEX
		const game = (await Game.deploy(xex.target)) as Game
		await xex.addMinter(game.target)
		return { game, owner, gamer1, gamer2, xex, nft }
	}
	async function addDungeon(
		game: Game, // the game contract to use
		owner: Signer, // the owner of the game contract
		name: string, // the name of the dungeon
		startIn: bigint, // the start date of the dungeon
		endIn: bigint, // the end date of the dungeon
		minTermDate: bigint, // the minimum term date of the dungeon
		maxTermDate: bigint, // the maximum term date of the dungeon
		minMintFee: bigint, // the minimum mint fee of the dungeon
		difficulty: bigint, // the difficulty of the dungeon
		availableRewards: bigint // the available rewards of the dungeon
	) {
		await expect(game.connect(owner).addDungeon(name, startIn, endIn, minTermDate, maxTermDate, minMintFee, difficulty, availableRewards))
			.to.emit(game, 'DungeonAdded')
			.withArgs(1, name, startIn, endIn, minTermDate, maxTermDate, minMintFee, difficulty, availableRewards)

		return await game.getDungeonInfo(1)
	}
	describe('addDungeon', function () {
		it('should add a new dungeon correctly', async function () {
			const { game, owner } = await loadFixture(deploy)
			const startIn = (await timestamp()) + 3600n // 1 hour from now
			const endIn = startIn + 86400n // 1 day after start
			const minTermDate = 36000n // 1 hour
			const maxTermDate = 86400n // 1 day
			const minMintFee = toWei('0.1') // 0.1 ETH
			const difficulty = 50n // Medium difficulty
			const name = 'Test Dungeon'
			const availableRewards = toWei('1000') // 1000 XEX tokens
			const dungeon = await addDungeon(game, owner, name, startIn, endIn, minTermDate, maxTermDate, minMintFee, difficulty, availableRewards)
			expect(dungeon.name).to.equal(name)
			expect(dungeon.startIn).to.equal(startIn)
			expect(dungeon.endIn).to.equal(endIn)
			expect(dungeon.minTermDate).to.equal(minTermDate)
			expect(dungeon.maxTermDate).to.equal(maxTermDate)
			expect(dungeon.minMintFee).to.equal(minMintFee)
			expect(dungeon.difficulty).to.equal(difficulty)
			expect(dungeon.active).to.be.true
			expect(dungeon.availableRewards).to.equal(availableRewards)
			expect(dungeon.claimedRewards).to.equal(0)

			expect(await game.rewardsPool()).to.equal(availableRewards)
		})

		it('should only allow owner to add a dungeon', async function () {
			const { game, gamer1 } = await loadFixture(deploy)
			const startIn = (await timestamp()) + 3600n
			const endIn = startIn + 86400n
			await expect(game.connect(gamer1).addDungeon('Test Dungeon', startIn, endIn, 3600n, 86400n, toWei('0.1'), 50n, toWei('1000'))).to.be.revertedWith(
				'Ownable: caller is not the owner'
			)
		})

		it('should increment dungeon ID correctly', async function () {
			const { game, owner } = await loadFixture(deploy)
			const startIn = (await timestamp()) + 3600
			const endIn = startIn + 86400

			await game.connect(owner).addDungeon('Dungeon 1', startIn, endIn, 3600, 86400, toWei('0.1'), 50, toWei('1000'))
			await game.connect(owner).addDungeon('Dungeon 2', startIn, endIn, 3600, 86400, toWei('0.1'), 50, toWei('1000'))

			expect(await game.getDungeonInfo(1)).to.have.property('name', 'Dungeon 1')
			expect(await game.getDungeonInfo(2)).to.have.property('name', 'Dungeon 2')
		})
	})
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
