Error.stackTraceLimit = Infinity;
import {
    time,
    loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import {anyValue} from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import {expect} from "chai";
import {ethers} from "hardhat";
const toWei = ethers.parseEther;
describe("Game", function () {
    const depositAmount = toWei("100");
    async function deploy() {
        const [owner, gamer1, gamer2] = await ethers.getSigners();
        const NFT = await ethers.getContractFactory("NFT");
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        const Game = await ethers.getContractFactory("Game");

        const rewardToken = await MockERC20.deploy("Reward Token", "RWD", 18);
        const nft = await NFT.deploy();
        const game = await Game.deploy(nft.target, owner.address, rewardToken.target);
        // allow game to mint nft via acl:
        const MINTER_ROLE = await nft.MINTER_ROLE();
        await nft.grantRole(MINTER_ROLE, game.target);
        // let's pre-mint 100 tokens:
        await rewardToken.mint(owner.address, depositAmount);
        return {game, owner, gamer1, gamer2, rewardToken};
    }
    /*
    describe("Dugeon Management", function () {
        it("should add a new dungeon", async function () {
            const {game, rewardToken, owner} = await loadFixture(deploy);
            const startIn = await time.latest();
            const endIn = startIn + 1;
            const minMintFee = 100;
            const minTermDate = 1000;
            const maxTermDate = 10000;
            const failurePercentage = 20;
            const name = "Dungeon 1";
            const rewardAmount = depositAmount;
            // approve:
            await rewardToken.approve(game.target, rewardAmount);
            await game.addDungeon(
                name,
                startIn,
                endIn,
                minMintFee,
                minTermDate,
                maxTermDate,
                failurePercentage,
                rewardToken
            );

            const dungeon = await game.getDungeonInfo(0);

            expect(dungeon.name).to.equal(name);
            expect(dungeon.startIn).to.equal(startIn);
            expect(dungeon.endIn).to.equal(endIn);
            expect(dungeon.minMintFee).to.equal(minMintFee);
            expect(dungeon.minTermDate).to.equal(minTermDate);
            expect(dungeon.maxTermDate).to.equal(maxTermDate);
            expect(dungeon.failurePercentage).to.equal(failurePercentage);
            expect(dungeon.active).to.equal(true);
        });

        it("should remove a dungeon", async function () {
            const {game, rewardToken, owner} = await loadFixture(deploy);
            const startIn = await time.latest();
            const endIn = startIn + 1;
            const minMintFee = 100;
            const minTermDate = 1000;
            const maxTermDate = 10000;
            const failurePercentage = 20;
            const name = "Dungeon 1";
            const rewardAmount = depositAmount;
            // approve:
            await rewardToken.approve(game.target, rewardAmount);
            await game.addDungeon(
                name,
                startIn,
                endIn,
                minMintFee,
                minTermDate,
                maxTermDate,
                failurePercentage,
                rewardToken
            );

            await game.removeDungeon(0);
            await expect(game.getDungeonInfo(0)).to.be.revertedWithCustomError(
                game, "DungeonNotFound"
            );
        });

        it("should set a dungeon status", async function () {
            const {game, rewardToken} = await loadFixture(deploy);
            const startIn = await time.latest();
            const endIn = startIn + 1;
            const minMintFee = 100;
            const minTermDate = 1000;
            const maxTermDate = 10000;
            const failurePercentage = 20;
            const name = "Dungeon 1";
            const rewardAmount = depositAmount;
            rewardToken.approve(game.target, rewardAmount);
            await game.addDungeon(
                name,
                startIn,
                endIn,
                minMintFee,
                minTermDate,
                maxTermDate,
                failurePercentage,
                rewardToken
            );

            await game.setDungeonStatus(0, false);
        });
    });
    */


    describe("Game Play", function () {
        it("should start a new session", async function () {
            const {game, rewardToken, gamer1} = await loadFixture(deploy);
            const startIn = await time.latest();
            const endIn = startIn + 1;
            const minMintFee = 100;
            const minTermDate = 1000;
            const maxTermDate = 10000;
            const failurePercentage = 20;
            const name = "Dungeon 1";
            const rewardAmount = depositAmount;
            // approve:
            await rewardToken.approve(game.target, rewardAmount);
            await game.addDungeon(
                name,
                startIn,
                endIn,
                minMintFee,
                minTermDate,
                maxTermDate,
                failurePercentage,
                rewardAmount
            );

            await expect(game.connect(gamer1).start(0, {value: 100})).to.emit(game, "NewSession");
        });

        it("should end a session", async function () {
            const {game, rewardToken, gamer1} = await loadFixture(deploy);
            const startIn = await time.latest();
            const endIn = startIn + 10;
            const minMintFee = 100;
            const minTermDate = 1000;
            const maxTermDate = 10000;
            const failurePercentage = 20;
            const name = "Dungeon 1";
            const rewardAmount = depositAmount;
            await rewardToken.approve(game.target, rewardAmount);
            await game.addDungeon(
                name,
                startIn,
                endIn,
                minMintFee,
                minTermDate,
                maxTermDate,
                failurePercentage,
                rewardToken
            );
            // advance time to start the game
            await time.increaseTo(startIn + 5);
            await game.connect(gamer1).start(0, {value: 100});
            await expect(game.connect(gamer1).end(0, true, await time.latest())).to.emit(game, "EndSession");
        });

        it("should claim a session", async function () {
            const {game, rewardToken, gamer1} = await loadFixture(deploy);
            const startIn = await time.latest();
            const endIn = startIn + 10;
            const minMintFee = 100;
            const minTermDate = 1000;
            const maxTermDate = 10000;
            const failurePercentage = 20;
            const name = "Dungeon 1";
            const rewardAmount = depositAmount;
            await rewardToken.approve(game.target, rewardAmount);
            await game.addDungeon(
                name,
                startIn,
                endIn,
                minMintFee,
                minTermDate,
                maxTermDate,
                failurePercentage,
                rewardAmount
            );
            // advance time to start the game
            await time.increaseTo(startIn + 5);
            await game.connect(gamer1).start(0, {value: 100});
            await game.connect(gamer1).end(0, true, await time.latest());
            await expect(game.connect(gamer1).claim(0)).to.emit(game, "Claim");
        });
    });

});
