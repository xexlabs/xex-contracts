const BigNumber = require('bignumber.js');
require('dotenv').config()
const {time} = require("@nomicfoundation/hardhat-network-helpers");
const {expect} = require("chai");

async function timeIncreaseTo(seconds) {
    await time.increaseTo(seconds);
}

async function rewardOnClaim(term, user, main) {
    await main.connect(user).claimRank(term);
    // let now = (await ethers.provider.getBlock("latest")).timestamp;
    // const to = now + 1;
    // await timeIncreaseTo(to);
    await showReward(user, main);
}

async function rewardAfterTimeIncreased(user, main) {
    await showReward(user, main);
}

async function showReward(user, main){
    const r = await main.userMints(user.address);
    const globalRank = await main.globalRank();
    const reward = await main.getMintReward(r.rank, r.term, r.maturityTs, r.amplifier, r.eaaRate);
    console.log(`- ${user.address}, reward: ${reward.toString()}, globalRank: ${globalRank}`);
}

describe("Test", function () {
    describe("default", function () {
        it("all", async function () {
            this.timeout(140000);
            // await run(100);
        });
        it("10 contract mint", async function () {
            this.timeout(140000);
            const Math = await ethers.getContractFactory("Math");
            const math = await Math.deploy()
            const Main = await ethers.getContractFactory("Main", {
                libraries: {
                    Math: math.address,
                }
            });
            const FEE = 1e18.toString();
            //const main = await Main.deploy();
            const ENDPOINT = '0x0000000000000000000000000000000000000000';
            const main = await Main.deploy(FEE, ENDPOINT, "test", "test", "0");
            await main.setTreasure("0x0000000000000000000000000000000000000001");
            const [a, b, c, d, e, f, g, h, i, j] = await ethers.getSigners();
            await rewardOnClaim(100, a, main);
            await rewardOnClaim(100, b, main);
            await rewardOnClaim(100, c, main);
            await rewardOnClaim(100, d, main);
            await rewardOnClaim(100, e, main);
            await rewardOnClaim(100, f, main);
            await rewardOnClaim(100, g, main);
            await rewardOnClaim(100, h, main);
            await rewardOnClaim(100, i, main);
            await rewardOnClaim(100, j, main);
            // let now = (await ethers.provider.getBlock("latest")).timestamp;
            // const to = now + (86900*100) + 1;
            // await timeIncreaseTo(to);
            console.log('---');
            await rewardAfterTimeIncreased(a, main);
            await rewardAfterTimeIncreased(b, main);
            await rewardAfterTimeIncreased(c, main);
            await rewardAfterTimeIncreased(d, main);
            await rewardAfterTimeIncreased(e, main);
            await rewardAfterTimeIncreased(f, main);
            await rewardAfterTimeIncreased(g, main);
            await rewardAfterTimeIncreased(h, main);
            await rewardAfterTimeIncreased(i, main);
            await rewardAfterTimeIncreased(j, main);
        });
    });
});
