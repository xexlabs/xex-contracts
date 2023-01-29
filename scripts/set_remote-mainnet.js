const hre = require("hardhat");
const fs = require("fs");
async function main() {
    const [_dev] = await ethers.getSigners();
    const dev = _dev.address;
    const network = await hre.ethers.provider.getNetwork();
    const lz = JSON.parse(fs.readFileSync('lz-mainnet.json'));
    const contracts = JSON.parse(fs.readFileSync('contracts-mainnet.json'));
    const contract = contracts[network.chainId];
    const Main = await ethers.getContractFactory("Main", {libraries: {Math: contract.math}})
    const main = Main.attach(contract.main);
    console.log(`Set trust on chain ${network.chainId}, contract: ${contract.main}:`);
    let baseNonce = ethers.provider.getTransactionCount(dev);
    let nonceOffset = 0;
    function getNonce() {
        return baseNonce.then((nonce) => (nonce + (nonceOffset++)));
    }
    for (let id in contracts) {
        const r = contracts[id];
        const cfg = lz[id];
        if (id == network.chainId) continue;
        if (cfg.id == "0") continue;
        const tx = await main.setTrustedRemoteAddress(cfg.id, r.main, {nonce: getNonce()});
        await tx.wait();
        console.log(`  - ${id}: ${r.main} (${cfg.id})`);
    }
}

async function eth() {
    const [_dev] = await ethers.getSigners();
    const dev = _dev.address;
    const network = await hre.ethers.provider.getNetwork();
    const lz = JSON.parse(fs.readFileSync('lz-mainnet.json'));
    const contracts = JSON.parse(fs.readFileSync('contracts-mainnet.json'));
    const contract = contracts[network.chainId];
    const Main = await ethers.getContractFactory("Main", {libraries: {Math: contract.math}})
    const main = Main.attach(contract.main);
    console.log(`Set trust on chain ${network.chainId}, contract: ${contract.main}:`);
    let baseNonce = ethers.provider.getTransactionCount(dev);
    let nonceOffset = 0;
    function getNonce() {
        return baseNonce.then((nonce) => (nonce + (nonceOffset++)));
    }

    const r = contracts[1];
    const cfg = lz[1];
    const tx = await main.setTrustedRemoteAddress(cfg.id, r.main, {nonce: getNonce()});
    await tx.wait();
    console.log(`  - ${r.main} (${cfg.id})`);

}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
