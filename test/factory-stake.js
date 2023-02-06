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
            this.timeout(640000);
            const initialMint = new BigNumber("10000").multipliedBy(1e18).toFixed();
            let term = 244;
            const [DEV] = await ethers.getSigners();
            const dev = DEV.address;
            const Math = await ethers.getContractFactory("Math");
            const math = await Math.deploy()
            const Main = await ethers.getContractFactory("Main", {
                libraries: {
                    Math: math.address,
                }
            });
            const FEE = 0.01e18.toString();

            const ENDPOINT = "0x0000000000000000000000000000000000000000";
            const Factory = await ethers.getContractFactory("StakeFactory");
            const main = await Main.deploy(FEE, ENDPOINT, "test", "test", initialMint);
            const factory = await Factory.deploy(main.address);
            const fee = (await main.fee()).toString();
            const feeBN = new BigNumber(fee);
            const totalStakers = 100;
            const amount = new BigNumber("100").multipliedBy(1e18).toFixed();
            const feeByFactory = feeBN.multipliedBy(totalStakers);
            for( let i = 0; i < totalStakers; i ++ ) {
                const createFee = feeByFactory.toString();
                await main.approve(factory.address, amount);
                await factory.stakeFactory(amount, term, {value: createFee});
            }

            const stakers = await factory.getUserStakes(dev);
            let factoryInfo = await factory.getUserStakeInfo(dev, 0, stakers.length);

            let ts = parseInt( factoryInfo[0].maturityTs.toString() );
            await timeIncreaseTo(ts + 1);


            let balanceOfDev1 = (await main.balanceOf(dev)).toString();
            await factory.withdraw(0, stakers.length, {value: feeByFactory.toString()});
            let balanceOfDev2 = (await main.balanceOf(dev)).toString();
            console.log('balanceOfDev1', balanceOfDev1/1e18);
            console.log('balanceOfDev2', balanceOfDev2/1e18);

            /*
            for (let i = 0; i < stakers.length ; i++) {
                console.log(`claimMintReward step: ${i} of ${step}`);
                await factory.claimMintReward(maxClaim, {value: totalFeeBN.toString()});
                console.log(' - balance: ', ethers.utils.formatEther((await main.balanceOf(dev)).toString()));
            }
            */
        });
    });
});
