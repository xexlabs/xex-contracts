const hre = require("hardhat");
const fs = require("fs");
async function main() {
    const network = await hre.ethers.provider.getNetwork();
    const lz = JSON.parse(fs.readFileSync('lz.json'));
    const contracts = JSON.parse(fs.readFileSync('contracts.json'));
    const contract = contracts[network.chainId];
    const Main = await ethers.getContractFactory("Main", {libraries: {Math: contract.math}})
    const main = Main.attach(contract.main);
    console.log(`Set trust on chain ${network.chainId}, contract: ${contract.main}:`);
    for (let id in contracts) {
        const r = contracts[id];
        const cfg = lz[id];
        if (id == network.chainId) continue;
        if (cfg.id == "0") continue;
        await main.setTrustedRemoteAddress(cfg.id, r.main);
        console.log(`  ${r.main} (${cfg.id})`);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
