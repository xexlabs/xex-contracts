const hre = require("hardhat");
const fs = require("fs");
const BigNumber = require("bignumber.js");

async function main() {

    const lz = JSON.parse(fs.readFileSync('lz-mainnet.json'));
    const network = await hre.ethers.provider.getNetwork();
    const cfg = lz[network.chainId];
    if (!cfg) {
        return console.log(`Deployment for chain ${network.chainId} not implemented.`);
    }

    let contracts = JSON.parse(fs.readFileSync('contracts-mainnet.json'));
    const res = await deploy(cfg);

    if (res) {
        contracts[network.chainId] = res;
        fs.writeFileSync('contracts.json', JSON.stringify(contracts, undefined, '     '));
        try {
            if( cfg.chain !== 'localhost') {
                console.log(`verify main: ${res.main}(${cfg.fee}, ${cfg.endpoint})`);
                await hre.run("verify:verify", {
                    address: res.main,
                    contract: "contracts/Main.sol:Main",
                    constructorArguments: [cfg.fee, cfg.endpoint, cfg.tokenSymbol, cfg.tokenName],
                    libraries: {Math: res.math}
                });
            }
        } catch (e) {
            console.log(`main verification error: ${e.toString()}`);
        }

        try {
            if( cfg.chain !== 'localhost') {
                console.log(`verify math: ${res.math}()`);
                await hre.run("verify:verify", {
                    address: res.math
                });
            }
        } catch (e) {
            console.log(`math verification error: ${e.toString()}`);
        }

        try {
            if( cfg.chain !== 'localhost') {
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

async function deploy(cfg) {
    const initialMint = new BigNumber(cfg.initialMint).multipliedBy(1e18).toFixed();
    console.log('initialMint', initialMint);
    const Math = await hre.ethers.getContractFactory("Math");
    const math = await Math.deploy();
    await math.deployed();
    if( cfg.chain !== 'localhost')
        await math.deployTransaction.wait(10);
    console.log(`math ${math.address}`);

    const Main = await hre.ethers.getContractFactory("Main", {
        libraries: {
            Math: math.address,
        },
    });
    const main = await Main.deploy(cfg.fee, cfg.endpoint, cfg.tokenSymbol, cfg.tokenName, initialMint);
    await main.deployed();
    if( cfg.chain !== 'localhost')
        await main.deployTransaction.wait(10);
    console.log(`main ${main.address}`);

    const Factory = await hre.ethers.getContractFactory("MinterFactory");
    const factory = await Factory.deploy(main.address);
    await factory.deployed();
    if( cfg.chain !== 'localhost')
        await factory.deployTransaction.wait(10);
    console.log(`factory ${factory.address}`);

    const treasure = cfg.treasure;
    console.log(`setTreasure ${treasure}`);
    let tx = await main.setTreasure(treasure);
    await tx.wait();

    console.log(`Transfer ${initialMint} to ${treasure}`);
    tx = await main.transfer(treasure, initialMint);
    await tx.wait()

    return {math: math.address, main: main.address, factory: factory.address, build: new Date().toISOString()};

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
