const BigNumber = require('bignumber.js');
require('dotenv').config()
const {time} = require("@nomicfoundation/hardhat-network-helpers");
const {expect} = require("chai");

async function timeIncreaseTo(seconds) {
    await time.increaseTo(seconds);
}

describe("Test", function () {
    describe("default", function () {
        it("all", async function () {
            this.timeout(640000);
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
            const Multicall = await ethers.getContractFactory("Multicall");
            const Factory = await ethers.getContractFactory("MinterFactory");
            const main = await Main.deploy(FEE, ENDPOINT, "test", "test", initialMint);
            const factory = await Factory.deploy(main.address);
            const multicall = await Multicall.deploy();

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


            const totalMinters = 10;
            for (let i = 0; i < totalMinters; i++) {
                await factory.minterFactory(totalMinters, term);
                // await factory.minterFactory(totalMinters, term);
                // await factory.minterFactory(totalMinters, term);
                // await factory.minterFactory(totalMinters, term);
                // await factory.minterFactory(totalMinters, term);
                // await factory.minterFactory(totalMinters, term);
                // await factory.minterFactory(totalMinters, term);
                // await factory.minterFactory(totalMinters, term);
                // await factory.minterFactory(totalMinters, term);
                // await factory.minterFactory(totalMinters, term);
            }

            let minterInfo = await factory.getUserMinters(dev);
            await timeIncreaseTo((await time.latest()) + 86400 + 1);
            const maxClaim = 10;
            console.log(minterInfo);

            const minters = minterInfo.length;
            const step = parseInt(minters / maxClaim);
            console.log(`minters: ${minters}, step: ${step}`);
            let l = 0;
            let ABI = ["function claimMintReward()"];
            let iface = new ethers.utils.Interface(ABI);
            const encoded = iface.encodeFunctionData("claimMintReward", []);
            for (let i = 0; i < step; i++) {
                let data = [];
                for (let j = 0; j < step; j++) {
                    const addr = minterInfo[l];
                    console.log(l, addr);
                    data.push({target: addr, callData: encoded, fee: feeBN.toString()});
                    ++l;
                }
                const totalFee = feeBN.multipliedBy(step);
                await multicall.run(data, {value: totalFee.toString()});
                data = [];
            }


        });
    });
});
