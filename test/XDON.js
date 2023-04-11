const BigNumber = require('bignumber.js');
require('dotenv').config()
const {time, loadFixture} = require("@nomicfoundation/hardhat-network-helpers");
const {expect} = require("chai");
const merkle = require("@openzeppelin/merkle-tree");
const hre = require("hardhat");
const minGas = '150000';
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

    const airdrop_data = [[DEV.address, chainId], [A.address, chainId], [B.address, chainId], [C.address, chainId]];
    const tree = merkle.StandardMerkleTree.of(airdrop_data, ["address", "uint256"]);
    const TREE = tree.dump();

    const Main = await ethers.getContractFactory("XDON");
    const startDate = (await time.latest()) + 86_400;
    const endDate = (await time.latest()) + (86_400 * 2);
    const endpoint = await LZEndpointMock.deploy(chainId);
    const main = await Main.deploy(
        minGas,
        endpoint.address,
        startMintId,
        maxMintId,
        startDate,
        endDate,
        tree.root,
        toWei(mintPrice),
        '0x0000000000000000000000000000000000000001'
    );
    return {DEV, A, B, C, main, TREE, endpoint}
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
            const network = await hre.ethers.provider.getNetwork();
            const {DEV, A, B, C, main, TREE} = await deploy(network.chainId, '1', '2', '0.05');
            const proof = getProof(TREE, DEV);
            expect(proof.length).to.be.gt(0);

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
            const network = await hre.ethers.provider.getNetwork();
            this.timeout(640000);
            const {DEV, A, B, C, main, TREE} = await deploy(network.chainId, '1', '1990', '0.05');
            const treasure = await main.treasure();
            const preBalanceOfTreasure = await balanceOf(treasure);

            const proof = getProof(TREE, DEV);

            const mintStart = (await time.latest()) + 86_401;
            await timeIncreaseTo(mintStart);

            const payment = (await main.mintPrice()).toString();

            await main.claim(proof, {value: payment});
            await main.connect(A).claim(getProof(TREE, A), {value: payment});
            await main.connect(B).claim(getProof(TREE, B), {value: payment});
            await main.connect(C).claim(getProof(TREE, C), {value: payment});

            await expect(main.mint(proof, {value: payment})).to.be.revertedWithCustomError(main, "PublicMintNotStarted");

            const publicMintStart = (await time.latest()) + (86_401*2);
            await timeIncreaseTo(publicMintStart);

            await main.mint(proof, {value: payment});
            await main.connect(A).mint(getProof(TREE, A), {value: payment});
            await main.connect(B).mint(getProof(TREE, B), {value: payment});
            await main.connect(C).mint(getProof(TREE, C), {value: payment});


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
            const network = await hre.ethers.provider.getNetwork();
            this.timeout(640000);
            const {DEV, A, B, C, main} = await deploy(network.chainId, '1', '1990', '0.05');

            const treasure = await main.treasure();
            const preBalanceOfTreasure = await balanceOf(treasure);

            const mintStart = (await time.latest()) + 86_401;
            await timeIncreaseTo(mintStart);

            const payment = (await main.mintPrice()).toString();

            await expect(main.mint([], {value: payment})).to.be.revertedWithCustomError(main, "PublicMintNotStarted");

            const publicMintStart = (await time.latest()) + (86_401*2);
            await timeIncreaseTo(publicMintStart);

            await main.mint([], {value: payment});
            await main.connect(A).mint([], {value: payment});
            await main.connect(B).mint([], {value: payment});
            await main.connect(C).mint([], {value: payment});


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

        it("bridge test", async function () {
            const network = await hre.ethers.provider.getNetwork();
            this.timeout(640000);

            const eth_config = await deploy(network.chainId, '1', '1990', '0.05');
            const ftm_config = await deploy('2', '1991', '3981', '0.05');
            const polygon_config = await deploy('3', '3982', '5972', '0.05');
            const bsc_config = await deploy('4', '5973', '7963', '0.05');
            const avax_config = await deploy('5', '7964', '9954', '0.05');

            const DEV = eth_config.DEV;
            const eth = eth_config.main;
            const eth_endpoint = eth_config.endpoint;
            const ftm = ftm_config.main;
            const ftm_endpoint = ftm_config.endpoint;
            const polygon = polygon_config.main;
            const bsc = bsc_config.main;
            const avax = avax_config.main;

            const payment = (await eth.mintPrice()).toString();

            const publicMintStart = (await time.latest()) + (86_401*2);
            await timeIncreaseTo(publicMintStart);

            await eth.mint([], {value: payment});
            await ftm.mint([], {value: payment});
            await polygon.mint([], {value: payment});
            await bsc.mint([], {value: payment});
            await avax.mint([], {value: payment});


            expect(await eth.balanceOf(DEV.address)).to.be.eq('1');
            expect(await ftm.balanceOf(DEV.address)).to.be.eq('1');
            expect(await polygon.balanceOf(DEV.address)).to.be.eq('1');
            expect(await bsc.balanceOf(DEV.address)).to.be.eq('1');
            expect(await avax.balanceOf(DEV.address)).to.be.eq('1');

            expect( await eth.tokenOfOwnerByIndex(DEV.address, 0) ).to.be.eq('1');
            expect( await ftm.tokenOfOwnerByIndex(DEV.address, 0) ).to.be.eq('1991');
            expect( await polygon.tokenOfOwnerByIndex(DEV.address, 0) ).to.be.eq('3982');
            expect( await bsc.tokenOfOwnerByIndex(DEV.address, 0) ).to.be.eq('5973');
            expect( await avax.tokenOfOwnerByIndex(DEV.address, 0) ).to.be.eq('7964');

            const paddedAddress = DEV.address;

            const adapterParams = ethers.utils.solidityPack(
                [ 'uint16', 'uint', 'uint', 'address' ],
                [
                    2, // version number
                    250_000, // amount of gas
                    0, // pay fee in LZ token amount
                    DEV.address, // fee refund address
                ]
            );
            const bridgeFee = await eth.estimateSendFee('2', paddedAddress, '1', false, adapterParams);
            const nativeFee = bridgeFee.nativeFee;
            const dstChain = '2', srcChain = network.chainId;
            const FUNCTION_TYPE_SEND = '1';
            await eth.setMinDstGas(dstChain, FUNCTION_TYPE_SEND, minGas);
            await eth.setTrustedRemoteAddress(dstChain, ftm.address);
            await ftm.setTrustedRemoteAddress(srcChain, eth.address);
            await eth_endpoint.setDestLzEndpoint(ftm.address, ftm_endpoint.address);
            await eth.sendFrom(DEV.address, dstChain, paddedAddress, '1', DEV.address, DEV.address, adapterParams, {value: nativeFee});

            expect( (await ftm.totalSupply()) ).to.be.eq('2');
            const ftmOwnerOf1 = await ftm.ownerOf('1');
            expect( (await ftm.balanceOf(DEV.address)) ).to.be.eq('2');
            expect(ftmOwnerOf1).to.be.eq(DEV.address);

        });

    });
});
