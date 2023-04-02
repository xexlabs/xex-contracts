const hre = require("hardhat");
const fs = require("fs");
async function main() {
    const FUNCTION_TYPE_SEND = '1';
    const minGas = '150000';
    const [_dev] = await ethers.getSigners();
    const dev = _dev.address;
    const network = await hre.ethers.provider.getNetwork();
    const lz = JSON.parse(fs.readFileSync('lz-testnet.json'));
    const contracts = JSON.parse(fs.readFileSync('contracts-testnet.json'));
    const contract = contracts[network.chainId];
    const Main = await ethers.getContractFactory("XDON")
    const main = Main.attach(contract.XDON);
    console.log(`Set trust on chain ${network.chainId}, contract: ${contract.XDON}:`);
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
        console.log(`  - network=${id} -> allow ${r.XDON} from ${cfg.id}.`);
        let tx = await main.setTrustedRemoteAddress(cfg.id, r.XDON, {nonce: getNonce()});
        await tx.wait();
        console.log(`    setTrustedRemoteAddress`);
        tx = await main.setMinDstGas(cfg.id, FUNCTION_TYPE_SEND, minGas, {nonce: getNonce()});
        await tx.wait();
        console.log(`    setMinDstGas`);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
