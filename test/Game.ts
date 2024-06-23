Error.stackTraceLimit = Infinity
import { time, loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { expect } from 'chai'
import { ethers } from 'hardhat'
import { GameMain, XEX } from '../typechain-types'
import { Signer } from 'ethers'

const toWei = ethers.parseEther

describe('Game', function () {
    const depositAmount = toWei('100')

    async function deploy() {
        const [owner, gamer1, gamer2] = await ethers.getSigners()
        const XEX = await ethers.getContractFactory('XEX')
        const GameMain = await ethers.getContractFactory('GameMain')
        const xex = await XEX.deploy() as XEX
        const game = await GameMain.deploy(xex.address) as GameMain
        await xex.addMinter(game.address)
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
        await expect(game.connect(owner).addDungeon(name, startIn, endIn, minTermDate, maxTermDate, minMintFee, difficulty, availableRewards))
            .to.emit(game, 'DungeonAdded')
            .withArgs(1, name, startIn, endIn, minTermDate, maxTermDate, minMintFee, difficulty, availableRewards)

        return await game.getDungeonInfo(1)
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

        it('should only allow DUGEON_ROLE to add a dungeon', async function () {
            const { game, gamer1 } = await loadFixture(deploy)
            const startIn = BigInt(await time.latest()) + 3600n
            const endIn = startIn + 86400n
            await expect(game.connect(gamer1).addDungeon('Test Dungeon', startIn, endIn, 3600n, 86400n, toWei('0.1'), 50n, toWei('1000')))
                .to.be.revertedWith('AccessControl: account 0x70997970c51812dc3a010c7d01b50e0d17dc79c8 is missing role 0x7f3e7d8e0a6f5d0d5e8d5d5e8d5d5e8d5d5e8d5d5e8d5d5e8d5d5e8d5d5e8d')
        })

        it('should increment dungeon ID correctly', async function () {
            const { game, owner } = await loadFixture(deploy)
            const startIn = BigInt(await time.latest()) + 3600n
            const endIn = startIn + 86400n

            await game.connect(owner).addDungeon('Dungeon 1', startIn, endIn, 3600n, 86400n, toWei('0.1'), 50n, toWei('1000'))
            await game.connect(owner).addDungeon('Dungeon 2', startIn, endIn, 3600n, 86400n, toWei('0.1'), 50n, toWei('1000'))

            expect(await game.getDungeonInfo(1)).to.have.property('name', 'Dungeon 1')
            expect(await game.getDungeonInfo(2)).to.have.property('name', 'Dungeon 2')
        })
    })

    describe('Game Play', function () {
        it('should start a new session', async function () {
            const { game, gamer1 } = await loadFixture(deploy)
            const startIn = BigInt(await time.latest())
            const endIn = startIn + 86400n
            const minTermDate = 3600n
            const maxTermDate = 86400n
            const minMintFee = toWei('0.1')
            const difficulty = 50n
            const name = 'Dungeon 1'
            const availableRewards = toWei('1000')

            await game.addDungeon(name, startIn, endIn, minTermDate, maxTermDate, minMintFee, difficulty, availableRewards)

            await time.increaseTo(startIn)
            await expect(game.connect(gamer1).start(1, { value: minMintFee })).to.emit(game, 'NewSession')
        })

        it('should end a session', async function () {
            const { game, gamer1 } = await loadFixture(deploy)
            const startIn = BigInt(await time.latest())
            const endIn = startIn + 86400n
            const minTermDate = 3600n
            const maxTermDate = 86400n
            const minMintFee = toWei('0.1')
            const difficulty = 50n
            const name = 'Dungeon 1'
            const availableRewards = toWei('1000')

            await game.addDungeon(name, startIn, endIn, minTermDate, maxTermDate, minMintFee, difficulty, availableRewards)

            await time.increaseTo(startIn)
            await game.connect(gamer1).start(1, { value: minMintFee })
            const tokenId = await game.tokenOfOwnerByIndex(game.address, 0)
            
            // Mock the checkProof function
            await game.setCheckProofMock(true)

            await time.increase(3600)
            await expect(game.connect(gamer1).end(tokenId, true, BigInt(await time.latest()))).to.emit(game, 'EndSession')
        })

        it('should claim a session', async function () {
            const { game, gamer1, xex } = await loadFixture(deploy)
            const startIn = BigInt(await time.latest())
            const endIn = startIn + 86400n
            const minTermDate = 3600n
            const maxTermDate = 86400n
            const minMintFee = toWei('0.1')
            const difficulty = 50n
            const name = 'Dungeon 1'
            const availableRewards = toWei('1000')

            await game.addDungeon(name, startIn, endIn, minTermDate, maxTermDate, minMintFee, difficulty, availableRewards)

            await time.increaseTo(startIn)
            await game.connect(gamer1).start(1, { value: minMintFee })
            const tokenId = await game.tokenOfOwnerByIndex(game.address, 0)
            
            // Mock the checkProof function
            await game.setCheckProofMock(true)

            await time.increase(3600)
            await game.connect(gamer1).end(tokenId, true, BigInt(await time.latest()))
            
            await time.increase(3600)
            await expect(game.connect(gamer1).claim(tokenId))
                .to.emit(game, 'EndSession')
                .to.emit(xex, 'Transfer')
        })
    })
})
