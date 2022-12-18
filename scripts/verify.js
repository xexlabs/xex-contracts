const hre = require("hardhat");
const fs = require("fs");

async function main() {
    const lz = JSON.parse(fs.readFileSync('lz.json'));
    const network = await hre.ethers.provider.getNetwork();
    const cfg = lz[network.chainId];
    let contracts = JSON.parse(fs.readFileSync('contracts.json'));
    const contract = contracts[network.chainId];
    /*
    await hre.run("verify:verify", {
        address: contract.main,
        constructorArguments: [cfg.fee, cfg.endpoint],
        libraries: { Math: contract.math }
    });
    */
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
