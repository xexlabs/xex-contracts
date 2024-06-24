Error.stackTraceLimit = Infinity
import { time, loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { expect } from 'chai'
import { ethers } from 'hardhat'
import { GameMain, XEX } from '../typechain-types'
import { Signer } from 'ethers'

const toWei = ethers.parseEther
const warp = async (_seconds: bigint) => {
	const seconds = parseInt(_seconds.toString())
	try {
		await time.increase(seconds)
	} catch (e) {
		console.log('_seconds', _seconds)
		console.log('seconds', seconds)
		console.log(e)
		throw e
	}
}
const getEndSig = async (game: GameMain, dungeonId: bigint, completed: boolean, ts: bigint) => {
	const messageHash: string = await game.endHash(dungeonId, completed, ts)
	return await signature(messageHash)
}
const signature = async (messageHash: string) => {
	const signer = (await ethers.getSigners())[0]
	const signature = await signer.signMessage(messageHash)
	return signature
}
describe('Game', function () {
	let xex: XEX
	async function deploy() {
		const [owner, gamer1, gamer2] = await ethers.getSigners()
		const XEX = await ethers.getContractFactory('XEX')
		const GameMain = await ethers.getContractFactory('GameMain')
		xex = (await XEX.deploy()) as XEX
		const game = (await GameMain.deploy(xex.target)) as GameMain
		await xex.addMinter(game.target)
		return { game, owner, gamer1, gamer2, xex }
	}

	async function addDungeon(
		game: GameMain,
		owner: Signer,
		name: string,
		startIn: bigint,
		endIn: bigint,
		minTermDate: bigint,
		maxTermDate: bigint,
		minMintFee: bigint,
		difficulty: bigint,
		availableRewards: bigint
	) {
		const tx = await game.connect(owner).addDungeon(name, startIn, endIn, minTermDate, maxTermDate, minMintFee, difficulty, availableRewards)
		const dugeonsOf = await game.dungeonsOf(await owner.getAddress())
		const dugeonId = dugeonsOf[dugeonsOf.length - 1]
		await expect(tx).to.emit(game, 'DungeonAdded').withArgs(dugeonId, name, startIn, endIn, minTermDate, maxTermDate, minMintFee, difficulty, availableRewards)
		return dugeonId
	}
	async function start(game: GameMain, gamer: Signer, dungeonId: bigint, value: bigint) {
		const tx = game.connect(gamer).start(dungeonId, await gamer.getAddress(), { value })
		await expect(tx).to.emit(game, 'NewSession')
		const sessions = await game.getUserSessions(await gamer.getAddress())
		return await game.getSessionInfo(sessions[sessions.length - 1])
	}
	async function end(game: GameMain, gamer: Signer, dungeonId: bigint, proof: string = '0x', expectRevert: boolean = false) {
		if (expectRevert) {
			await expect(game.connect(gamer).end(dungeonId, true, BigInt(await time.latest()), proof)).to.be.revertedWithCustomError(game, 'InvalidGameCompleted')
		} else {
			await expect(game.connect(gamer).end(dungeonId, true, BigInt(await time.latest()), proof)).to.emit(game, 'EndSession')
		}
	}
	async function claim(game: GameMain, gamer: Signer, tokenId: bigint) {
		const session = await game.getSessionInfo(tokenId)
		const termDate = session[12]
		const secs = termDate - BigInt(await time.latest()) + 1n
		if (secs > 0n) await warp(secs)
		const tx = game.connect(gamer).claim(tokenId)
		//await expect(tx).to.emit(game, 'Claimed').to.emit(xex, 'Transfer')
		return await tx
	}
	describe('addDungeon', function () {
		it('should add a new dungeon correctly', async function () {
			const { game, owner } = await loadFixture(deploy)
			const startIn = BigInt(await time.latest()) + 3600n // 1 hour from now
			const endIn = startIn + 86400n // 1 day after start
			const minTermDate = 3600n // 1 hour
			const maxTermDate = 86400n // 1 day
			const minMintFee = toWei('0.1') // 0.1 ETH
			const difficulty = 50n // Medium difficulty
			const name = 'Test Dungeon'
			const availableRewards = toWei('1000') // 1000 XEX tokens

			const dungeonId = await addDungeon(game, owner, name, startIn, endIn, minTermDate, maxTermDate, minMintFee, difficulty, availableRewards)
			const dungeon = await game.getDungeonInfo(dungeonId)
			const [
				dungeonOwner,
				dungeonName,
				dungeonStartIn,
				dungeonEndIn,
				dungeonMinTermDate,
				dungeonMaxTermDate,
				dungeonMinMintFee,
				dungeonDifficulty,
				dungeonActive,
				dungeonAvailableRewards,
				dungeonClaimedRewards
			] = dungeon
			expect(dungeonOwner).to.equal(await owner.getAddress())
			expect(dungeonName).to.equal(name)
			expect(dungeonStartIn).to.equal(startIn)
			expect(dungeonEndIn).to.equal(endIn)
			expect(dungeonMinTermDate).to.equal(minTermDate)
			expect(dungeonMaxTermDate).to.equal(maxTermDate)
			expect(dungeonMinMintFee).to.equal(minMintFee)
			expect(dungeonDifficulty).to.equal(difficulty)
			expect(dungeonActive).to.be.true
			expect(dungeonAvailableRewards).to.equal(availableRewards)
			expect(dungeonClaimedRewards).to.equal(0n)

			expect(await game.rewardsPool()).to.equal(availableRewards)
		})

		it('should only allow DUGEON_ROLE to add a dungeon', async function () {
			const { game, gamer1 } = await loadFixture(deploy)
			const startIn = BigInt(await time.latest()) + 3600n
			const endIn = startIn + 86400n
			await expect(addDungeon(game, gamer1, 'Test Dungeon', startIn, endIn, 3600n, 86400n, toWei('0.1'), 50n, toWei('1000'))).to.be.reverted
		})

		it('should increment dungeon ID correctly', async function () {
			const { game, owner } = await loadFixture(deploy)
			const startIn = BigInt(await time.latest()) + 3600n
			const endIn = startIn + 86400n

			const id1 = await addDungeon(game, owner, 'Dungeon 1', startIn, endIn, 3600n, 86400n, toWei('0.1'), 50n, toWei('1000'))
			const id2 = await addDungeon(game, owner, 'Dungeon 2', startIn, endIn, 3600n, 86400n, toWei('0.1'), 50n, toWei('1000'))
			expect(id1).to.equal(1n)
			expect(id2).to.equal(2n)
		})
	})

	describe('Game Play', function () {
		it('should start a new session', async function () {
			const { game, owner, gamer1 } = await loadFixture(deploy)
			const startIn = BigInt(await time.latest())
			const endIn = startIn + 86400n
			const minTermDate = 3600n
			const maxTermDate = 86400n
			const minMintFee = toWei('0.1')
			const difficulty = 50n
			const name = 'Dungeon 1'
			const availableRewards = toWei('1000')
			const id = await addDungeon(game, owner, name, startIn, endIn, minTermDate, maxTermDate, minMintFee, difficulty, availableRewards)
			await start(game, gamer1, id, minMintFee)
		})

		it('should end a session', async function () {
			const { game, owner, gamer1 } = await loadFixture(deploy)
			const startIn = BigInt(await time.latest())
			const endIn = startIn + 86400n
			const minTermDate = 3600n
			const maxTermDate = 86400n
			const minMintFee = toWei('0.1')
			const difficulty = 50n
			const name = 'Dungeon 1'
			const availableRewards = toWei('1000')

			const id = await addDungeon(game, owner, name, startIn, endIn, minTermDate, maxTermDate, minMintFee, difficulty, availableRewards)

			const session = await start(game, gamer1, id, minMintFee)
			const tokenId = session[1]
			await warp(3600n)
			const sig = await getEndSig(game, tokenId, true, BigInt(await time.latest()))
			await end(game, gamer1, tokenId, sig)
		})

		it('should claim a session', async function () {
			const { game, owner, gamer1 } = await loadFixture(deploy)
			const startIn = BigInt(await time.latest())
			const endIn = startIn + 86400n
			const minTermDate = 3600n
			const maxTermDate = 86400n
			const minMintFee = toWei('0.1')
			const difficulty = 50n
			const name = 'Dungeon 1'
			const availableRewards = toWei('1000')
			const id = await addDungeon(game, owner, name, startIn, endIn, minTermDate, maxTermDate, minMintFee, difficulty, availableRewards)
			const r = await start(game, gamer1, id, minMintFee)
			const tokenId = r[1]
			await end(game, gamer1, tokenId)
			await warp(3600n)
			await end(game, gamer1, tokenId, '0x', true)
			await warp(3600n)
			await claim(game, gamer1, tokenId)
		})
	})

	describe('Security', function () {
		describe('DUNGEON_ROLE', function () {
			it('should only allow DUNGEON_ROLE to add a dungeon', async function () {
				const { game, owner, gamer1 } = await loadFixture(deploy)
				const startIn = BigInt(await time.latest()) + 3600n
				const endIn = startIn + 86400n

				// Owner should be able to add a dungeon
				await expect(addDungeon(game, owner, 'Dungeon 1', startIn, endIn, 3600n, 86400n, toWei('0.1'), 50n, toWei('1000'))).to.not.be.reverted

				// Gamer1 should not be able to add a dungeon
				await expect(addDungeon(game, gamer1, 'Dungeon 2', startIn, endIn, 3600n, 86400n, toWei('0.1'), 50n, toWei('1000'))).to.be.reverted
			})

			it('should allow ADMIN_ROLE to grant DUNGEON_ROLE', async function () {
				const { game, owner, gamer1 } = await loadFixture(deploy)
				const DUNGEON_ROLE = await game.DUGEON_ROLE()

				// Grant DUNGEON_ROLE to gamer1
				await game.connect(owner).grantRole(DUNGEON_ROLE, await gamer1.getAddress())

				// Now gamer1 should be able to add a dungeon
				const startIn = BigInt(await time.latest()) + 3600n
				const endIn = startIn + 86400n
				await expect(addDungeon(game, gamer1, 'Dungeon 1', startIn, endIn, 3600n, 86400n, toWei('0.1'), 50n, toWei('1000'))).to.not.be.reverted
			})

			it('should allow ADMIN_ROLE to revoke DUNGEON_ROLE', async function () {
				const { game, owner, gamer1 } = await loadFixture(deploy)
				const DUNGEON_ROLE = await game.DUGEON_ROLE()

				// Grant DUNGEON_ROLE to gamer1
				await game.connect(owner).grantRole(DUNGEON_ROLE, await gamer1.getAddress())

				// Revoke DUNGEON_ROLE from gamer1
				await game.connect(owner).revokeRole(DUNGEON_ROLE, await gamer1.getAddress())

				// Now gamer1 should not be able to add a dungeon
				const startIn = BigInt(await time.latest()) + 3600n
				const endIn = startIn + 86400n
				await expect(addDungeon(game, gamer1, 'Dungeon 1', startIn, endIn, 3600n, 86400n, toWei('0.1'), 50n, toWei('1000'))).to.be.reverted
			})

			it('should not allow non-ADMIN_ROLE to grant or revoke DUNGEON_ROLE', async function () {
				const { game, gamer1, gamer2 } = await loadFixture(deploy)
				const DUNGEON_ROLE = await game.DUGEON_ROLE()

				// gamer1 should not be able to grant DUNGEON_ROLE to gamer2
				await expect(game.connect(gamer1).grantRole(DUNGEON_ROLE, await gamer2.getAddress())).to.be.reverted

				// gamer1 should not be able to revoke DUNGEON_ROLE from gamer2
				await expect(game.connect(gamer1).revokeRole(DUNGEON_ROLE, await gamer2.getAddress())).to.be.reverted
			})
		})
	})
})
