const BigNumber = require('bignumber.js');
require('dotenv').config()
const {time, loadFixture} = require("@nomicfoundation/hardhat-network-helpers");
const {expect} = require("chai");
const merkle = require("@openzeppelin/merkle-tree");

async function timeIncreaseTo(seconds) {
    await time.increaseTo(seconds);
}

function toWei(v) {
    return ethers.utils.parseUnits(v, 'ether').toString();
}

function fromWei(v) {
    return ethers.utils.formatUnits(v, 'ether').toString();
}

async function balanceOf(address) {
    const balance = (await ethers.provider.getBalance(address)).toString();
    return balance;
}

async function deploy(chainId, startMintId, maxMintId, mintPrice) {
    const [DEV, A, B, C] = await ethers.getSigners();
    const LZEndpointMock = await ethers.getContractFactory("LZEndpointMock");

    const airdrop_data = [[DEV.address], [A.address], [B.address], [C.address]];
    const tree = merkle.StandardMerkleTree.of(airdrop_data, ["address"]);
    const TREE = tree.dump();

    const Main = await ethers.getContractFactory("XexBasedOFT");
    const startDate = (await time.latest()) + 86_400;
    const endDate = (await time.latest()) + (86_400 * 2);
    const endpoint = await LZEndpointMock.deploy(chainId);
    const main = await Main.deploy(
        '10000000000000',
        endpoint.address,
        startMintId,
        maxMintId,
        startDate,
        endDate,
        tree.root,
        toWei(mintPrice),
        '0x0000000000000000000000000000000000000001'
    );
    return {DEV, A, B, C, main, TREE}
}

function getProof(TREE, wallet) {
    const MerkleTreeData = merkle.StandardMerkleTree.load(TREE);
    let proof, address = wallet.address.toLowerCase();
    for (const [i, v] of MerkleTreeData.entries()) {
        if (v[0].toLowerCase() === address) {
            proof = MerkleTreeData.getProof(i);
            // console.log('Proof:', proof);
        }
    }
    return proof;
}

describe("XexBasedOFT", function () {
    describe("Security", function () {
        it("whitelisted security checks", async function () {
            this.timeout(640000);
            const {DEV, A, B, C, main, TREE} = await deploy('1', '1', '2', '0.05');
            const proof = getProof(TREE, DEV);
            expect(proof.length).to.be.gt(0);
            await expect(main.claim(proof)).to.be.revertedWithCustomError(main, "MintIsPaused");
            await main.toggle();
            await expect(main.claim(proof)).to.be.revertedWithCustomError(main, "MintPeriodNotStarted");

            const mintStart = (await time.latest()) + 86_401;
            await timeIncreaseTo(mintStart);

            const invalidProof = [];
            await expect(main.claim(invalidProof)).to.be.revertedWithCustomError(main, "InvalidProof");

            await expect(main.claim(proof)).to.be.revertedWithCustomError(main, "InvalidMintPayment");

            const payment = (await main.mintPrice()).toString();
            await main.claim(proof, {value: payment});

            await expect(main.claim(proof)).to.be.revertedWithCustomError(main, "MaxAllowedForWhitelisted");

            const treasure = await main.treasure();
            expect(await balanceOf(treasure)).to.be.eq(payment);

            await main.connect(A).claim(getProof(TREE, A), {value: payment});

            await expect(main.connect(B).claim(getProof(TREE, B), {value: payment})).to.be.revertedWithCustomError(main, "MaxMintReached");
            await expect(main.connect(C).claim(getProof(TREE, C), {value: payment})).to.be.revertedWithCustomError(main, "MaxMintReached");

        });

        it("whitelisted mint and check ownership", async function () {

            this.timeout(640000);
            const {DEV, A, B, C, main, TREE} = await deploy('1', '1', '1990', '0.05');
            const treasure = await main.treasure();
            const preBalanceOfTreasure = await balanceOf(treasure);

            const proof = getProof(TREE, DEV);
            await main.toggle();
            const mintStart = (await time.latest()) + 86_401;
            await timeIncreaseTo(mintStart);

            const payment = (await main.mintPrice()).toString();

            await main.claim(proof, {value: payment});
            await main.connect(A).claim(getProof(TREE, A), {value: payment});
            await main.connect(B).claim(getProof(TREE, B), {value: payment});
            await main.connect(C).claim(getProof(TREE, C), {value: payment});

            await expect(main.mint({value: payment})).to.be.revertedWithCustomError(main, "PublicMintNotStarted");

            const publicMintStart = (await time.latest()) + (86_401*2);
            await timeIncreaseTo(publicMintStart);

            await main.mint({value: payment});
            await main.connect(A).mint({value: payment});
            await main.connect(B).mint({value: payment});
            await main.connect(C).mint({value: payment});


            expect(await main.balanceOf(DEV.address)).to.be.eq('2');
            expect(await main.balanceOf(A.address)).to.be.eq('2');
            expect(await main.balanceOf(B.address)).to.be.eq('2');
            expect(await main.balanceOf(C.address)).to.be.eq('2');

            const totalSupply = await main.totalSupply();
            expect(totalSupply).to.be.eq('8');

            const balanceOfDev = await main.balanceOf(DEV.address);
            for( let i = 0 ; i < balanceOfDev; i ++ ){
                const tokenId = await main.tokenOfOwnerByIndex(DEV.address, i);
                const ownerOf = await main.ownerOf(tokenId);
                expect(ownerOf).to.be.eq(DEV.address);
            }


            const totalTreasureCollected = new BigNumber(payment).multipliedBy('8').toFixed();
            const balanceOfTreasure = new BigNumber(await balanceOf(treasure)).minus(preBalanceOfTreasure);

            expect(balanceOfTreasure).to.be.eq(totalTreasureCollected);

        });

        it("check public mint security", async function () {

            this.timeout(640000);
            const {DEV, A, B, C, main, TREE} = await deploy('1', '1', '1990', '0.05');

            const treasure = await main.treasure();
            const preBalanceOfTreasure = await balanceOf(treasure);
            await main.toggle();
            const mintStart = (await time.latest()) + 86_401;
            await timeIncreaseTo(mintStart);

            const payment = (await main.mintPrice()).toString();

            await expect(main.mint({value: payment})).to.be.revertedWithCustomError(main, "PublicMintNotStarted");

            const publicMintStart = (await time.latest()) + (86_401*2);
            await timeIncreaseTo(publicMintStart);

            await main.mint({value: payment});
            await main.connect(A).mint({value: payment});
            await main.connect(B).mint({value: payment});
            await main.connect(C).mint({value: payment});


            expect(await main.balanceOf(DEV.address)).to.be.eq('1');
            expect(await main.balanceOf(A.address)).to.be.eq('1');
            expect(await main.balanceOf(B.address)).to.be.eq('1');
            expect(await main.balanceOf(C.address)).to.be.eq('1');

            const totalSupply = await main.totalSupply();
            expect(totalSupply).to.be.eq('4');

            const balanceOfDev = await main.balanceOf(DEV.address);
            for( let i = 0 ; i < balanceOfDev; i ++ ){
                const tokenId = await main.tokenOfOwnerByIndex(DEV.address, i);
                const ownerOf = await main.ownerOf(tokenId);
                expect(ownerOf).to.be.eq(DEV.address);
            }

            const totalTreasureCollected = new BigNumber(payment).multipliedBy('4').toFixed();
            const balanceOfTreasure = new BigNumber(await balanceOf(treasure)).minus(preBalanceOfTreasure);

            expect(balanceOfTreasure).to.be.eq(totalTreasureCollected);

        });

    });
});
