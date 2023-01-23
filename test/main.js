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


            const totalMinters = 10;
            for( let i = 0; i < totalMinters; i ++ ) {
                await minter.minterFactory(totalMinters, term);
            }
            const minterInfo = await minter.getUserMinterInfo(dev);
            //console.log(minterInfo);
            ts = parseInt( minterInfo[0].maturityTs.toString() );
            await timeIncreaseTo(ts + 1);

            let readyToClaim = 0;
            for (let i in minterInfo) {
                const info = minterInfo[i];
                ts = parseInt( info.maturityTs.toString() );
                if (ts === 0)
                    continue;
                ++readyToClaim;
            }
            expect(readyToClaim).to.gt(0);
            let totalFeeBN = feeBN.multipliedBy(readyToClaim.toString());
            await minter.claimRank(readyToClaim.toString() );

            console.log('balance before', ethers.utils.formatEther((await main.balanceOf(dev)).toString()));
            readyToClaim = 0;

            let now = (await ethers.provider.getBlock("latest")).timestamp;
            const to = now + 86900 + 1;
            await timeIncreaseTo(to);

            for (let i in minterInfo) {
                const info = minterInfo[i];
                const ts = parseInt(info.maturityTs.toString());
                if (to > ts)
                    ++readyToClaim;
            }


            totalFeeBN = feeBN.multipliedBy(readyToClaim.toString());
            console.log('readyToClaim', readyToClaim, readyToClaim, totalFeeBN.toString() );
            await minter.claimMintReward(readyToClaim, {value: totalFeeBN.toString()});
            console.log('balance after', ethers.utils.formatEther((await main.balanceOf(dev)).toString()));


        });
    });
});
