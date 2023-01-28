const hre = require("hardhat");
const fs = require("fs");
const BigNumber = require("bignumber.js");

async function main() {
    const lz = JSON.parse(fs.readFileSync('lz-mainnet.json'));
    const network = await hre.ethers.provider.getNetwork();
    const cfg = lz[network.chainId];
    let contracts = JSON.parse(fs.readFileSync('contracts-mainnet.json'));
    const contract = contracts[network.chainId];
    const initialMint = new BigNumber(cfg.initialMint).multipliedBy(1e18).toFixed();
    await hre.run("verify:verify", {
        address: contract.main,
        constructorArguments: [cfg.fee, cfg.endpoint, cfg.tokenSymbol, cfg.tokenName, initialMint],
        libraries: { Math: contract.math }
    });

    await hre.run("verify:verify", {
        address: contract.factory, constructorArguments: [contract.main],
    });

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
