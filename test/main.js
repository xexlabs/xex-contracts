// SPDX-License-Identifier: MIT
const { ethers } = require("ethers");
const Main = artifacts.require("Main")
const Factory = artifacts.require("Factory")
require('dotenv').config()
const { time } = require('openzeppelin-test-helpers');

async function timeIncreaseTo (seconds) {
    const delay = 1000 - new Date().getMilliseconds();
    await new Promise(resolve => setTimeout(resolve, delay));
    await time.increaseTo(seconds);
}

contract("default", async accounts => {
    let src, dst, minter;
    let term = 2;
    const dev = accounts[0];
    before(async () => {
        try {
            src = await Main.deployed()
            dst = await Main.deployed()
            minter = await Factory.deployed(src.address);
        } catch (e) {
            console.error(e)
        }
    })
    it("main", async () => {
        const chainid = (await (web3.eth.getChainId())).toString();
        const fee = (await src.fee()).toString();
        await src.claimRank(term, {from: dev, value: fee});
        const userMints = await src.userMints(dev);
        let ts = parseInt(userMints.maturityTs)+1;
        await timeIncreaseTo(ts);
        await src.claimMintReward({from: dev, value: fee});
        const srcBalance = (await src.balanceOf(dev)).toString();
        await src.burnFromBridge(srcBalance, chainid, {from: dev, value: fee});
        const burnInfo = (await src.bridgeLastUserBurn(dev));
        const signature = await web3.eth.sign(burnInfo.tx, dev);
        const { v, r, s } = ethers.utils.splitSignature(signature);
        await dst.mintFromBridge(v, r, s, srcBalance, burnInfo.id, burnInfo.src, burnInfo.timestamp, {from: dev, value: fee} );

        const totalMinters = 10;
        await minter.minterFactory(totalMinters, 1, {from: dev, value: fee*totalMinters});
        const minterInfo = await minter.getUserMinterInfo(dev);
        //console.log(minterInfo);

        let readyToClaim = 0;
        for( let i in minterInfo ) {
            const info = minterInfo[i];
            const ts = info.maturityTs.toString();
            if( ts > 0 )
                continue;
            ++readyToClaim;
            await timeIncreaseTo(ts+1);
        }
        await minter.claimRank({from: dev, value: fee*readyToClaim});


        console.log('balance before', web3.utils.fromWei( (await src.balanceOf(dev)).toString()) );
        readyToClaim = 0;

        const now = parseInt( (await minter.getTimestamp()).toString() );
        const to = now + 86900;
        await timeIncreaseTo(to);

        for( let i in minterInfo ) {
            const info = minterInfo[i];
            const ts = info.maturityTs.toString();
            if( to > ts )
                ++readyToClaim;
        }

        console.log('readyToClaim', readyToClaim);
        await minter.claimMintReward({from: dev, value: fee*readyToClaim});
        console.log('balance after', web3.utils.fromWei( (await src.balanceOf(dev)).toString()) );


    })

})

