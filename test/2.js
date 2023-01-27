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
            const initialMint = new BigNumber("100").multipliedBy(1e18).toString();
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
            const minter = await Factory.deploy(main.address);

            const initialBalanceOfDev = (await main.balanceOf(dev)).toString();
            console.log('MINTED BALANCE: ', ethers.utils.formatEther(initialBalanceOfDev));
            expect(initialBalanceOfDev).to.be.equal(initialMint);

            const fee = (await main.fee()).toString();
            const feeBN = new BigNumber(fee);
            await main.claimRank(term, {from: dev});
            const userMints = await main.userMints(dev);
            // console.log('userMints', userMints);
            let ts = parseInt(userMints.maturityTs) + 1;
            // const timestamp = (await ethers.provider.getBlock("latest")).timestamp;
            // console.log('ts', ts, timestamp);
            await timeIncreaseTo(ts);

            await main.claimMintReward({from: dev, value: fee});


            const totalMinters = 6;
            for( let i = 0; i < totalMinters; i ++ ) {
                await minter.minterFactory(totalMinters, term);
                await minter.minterFactory(totalMinters, term);
                await minter.minterFactory(totalMinters, term);
                await minter.minterFactory(totalMinters, term);
                await minter.minterFactory(totalMinters, term);
                await minter.minterFactory(totalMinters, term);
                await minter.minterFactory(totalMinters, term);
                await minter.minterFactory(totalMinters, term);
                await minter.minterFactory(totalMinters, term);
                await minter.minterFactory(totalMinters, term);
            }

            let minterInfo = await minter.getUserMinterInfo(dev);
            ts = parseInt( minterInfo[0].maturityTs.toString() );
            await timeIncreaseTo(ts + 1);
            const maxClaim = 10;


            const minters = minterInfo.length;
            const step = parseInt(minters/maxClaim);
            console.log(`minters: ${minters}, step: ${step}`);
            for (let i = 0; i < step ; i++) {
                console.log(`claimRank step: ${i} of ${step}`);
                await minter.claimRank(maxClaim.toString() );
            }


            let totalFeeBN = feeBN.multipliedBy(maxClaim.toString());
            let now = (await ethers.provider.getBlock("latest")).timestamp;
            const to = now + 86900 + 1;
            await timeIncreaseTo(to);

            for (let i = 0; i < step ; i++) {
                console.log(`claimMintReward step: ${i} of ${step}`);
                await minter.claimMintReward(maxClaim, {value: totalFeeBN.toString()});
                console.log(' - balance: ', ethers.utils.formatEther((await main.balanceOf(dev)).toString()));
            }

        });
    });
});
