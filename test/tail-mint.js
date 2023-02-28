const BigNumber = require('bignumber.js');
require('dotenv').config()
const {time} = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");

async function timeIncreaseTo(seconds) {
    await time.increaseTo(seconds);
}
function fromWei(v) {
    return ethers.utils.formatUnits(v, 'ether').toString();
}
describe("Test", function () {
    describe("default", function () {
        it("all", async function () {
            this.timeout(640000);
            const initialMint = new BigNumber("10000").multipliedBy(1e18).toFixed();
            const [DEV] = await ethers.getSigners();
            const dev = DEV.address;
            const Math = await ethers.getContractFactory("contracts/Math.sol:Math");
            const math = await Math.deploy()
            const Main = await ethers.getContractFactory("Main", {
                libraries: {
                    Math: math.address,
                }
            });
            const FEE = 0.01e18.toString();

            const ENDPOINT = "0x0000000000000000000000000000000000000000";
            const main = await Main.deploy(FEE, ENDPOINT, "test", "test", initialMint);
            const fee = (await main.fee()).toString();
            const genesisTs = (await main.genesisTs()).toString();
            for( let i = 30 ; i < 30*24; i+=30 ) {
                if( i > 244 ) break;
                const term = (await main.getCurrentMaxTerm()).toString() / 86400;
                const globalRank = (await main.globalRank()).toString();
                await main.claimRank(i);
                const info = await main.userMints(dev);
                let ts = parseInt(info.maturityTs.toString());
                const days = parseInt( (ts - genesisTs)/86400);
                await timeIncreaseTo(ts + 1);
                let balanceInitial = await main.balanceOf(dev);
                await main.claimMintReward({value: fee});
                const balance = await main.balanceOf(dev);
                const reward = parseInt((balance - balanceInitial) / 1e18);
                console.log(`reward: ${reward}, term: ${term}, rank: ${globalRank}, balance: ${balanceInitial/1e18}, days: ${days} (${parseFloat(days/365).toFixed(1)}y)`);
                // expect((balanceAfterFirstClaim-balanceInitial)/1e18 ).to.be.equal(141602);
            }

        });
    });
});
