const hre = require("hardhat");
const fs = require("fs");
const BigNumber = require("bignumber.js");

async function main() {
    const lz = JSON.parse(fs.readFileSync('lz-testnet.json'));
    const network = await hre.ethers.provider.getNetwork();
    const cfg = lz[network.chainId];
    if (!cfg) {
        return console.log(`Deployment for chain ${network.chainId} not implemented.`);
    }
    let contracts = JSON.parse(fs.readFileSync('contracts-testnet.json'));
    let contract = contracts[network.chainId];
    const Factory = await hre.ethers.getContractFactory("MinterFactory");
    const factory = await Factory.deploy(contract.main);
    await factory.deployed();
    if (cfg.chain !== 'localhost') {
        await factory.deployTransaction.wait(10);
    }
    console.log(`factory ${factory.address}`);
    const res = {math: contract.math, main: contract.main, factory: factory.address, build: new Date().toISOString()};

    if (res) {
        contracts[network.chainId] = res;
        fs.writeFileSync('contracts-testnet.json', JSON.stringify(contracts, undefined, '     '));
        try {
            if (cfg.chain !== 'localhost') {
                console.log(`verify factory: ${res.factory}(${res.main})`);
                await hre.run("verify:verify", {
                    address: res.factory,
                    constructorArguments: [res.main]
                });
            }
        } catch (e) {
            console.log(`factory verification error: ${e.toString()}`);
        }
    }
}


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
