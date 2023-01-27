const BigNumber = require('bignumber.js');
require('dotenv').config()
const {time} = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");

async function timeIncreaseTo(seconds) {
    await time.increaseTo(seconds);
}

describe("Test", function () {
    describe("default", function () {
        it("all", async function () {
            this.timeout(140000);
            const initialMint = new BigNumber("0").multipliedBy(1e18).toString();
            let term = 1;
            const [DEV] = await ethers.getSigners();
            const dev = DEV.address;
            const Math = await ethers.getContractFactory("Math");
            const math = await Math.deploy()
            const Main = await ethers.getContractFactory("Main", {
                libraries: {
                    Math: math.address,
                }
            });
            const FEE = 1e18.toString();

            const ENDPOINT = "0x0000000000000000000000000000000000000000";
            const Factory = await ethers.getContractFactory("MinterFactory");
            const main = await Main.deploy(FEE, ENDPOINT, "test", "test", initialMint);
            await main.setTreasure("0x0000000000000000000000000000000000000001");
            const minter = await Factory.deploy(main.address);

            const initialBalanceOfDev = (await main.balanceOf(dev)).toString();
            console.log('MINTED BALANCE: ', ethers.utils.formatEther(initialBalanceOfDev));
            expect(initialBalanceOfDev).to.be.equal(initialMint);

            const totalMinters = 10;
            await minter.minterFactory(totalMinters, term);

            const minterInfo = await minter.getUserMinterInfo(dev);
            const getMintReward = await minter.getMintReward(dev);
            const ts = parseInt( minterInfo[0].maturityTs.toString() );
            let total = 0;
            for( let i in minterInfo ){
                const reward = parseInt(getMintReward[i].toString());
                total += reward;
                console.log(`${i} = ${reward}`);
            }
            console.log(`total: ${total}`);

            let totalFeeBN = new BigNumber(FEE).multipliedBy(totalMinters.toString());
            let now = (await ethers.provider.getBlock("latest")).timestamp;
            const to = now + 86900 + 1;
            await timeIncreaseTo(to);

            console.log(' - balance 1: ', ethers.utils.formatEther((await main.balanceOf(dev)).toString()));
            await minter.claimMintReward(totalMinters, {value: totalFeeBN.toString()});
            console.log(' - balance 2: ', ethers.utils.formatEther((await main.balanceOf(dev)).toString()));

        });
    });
});
