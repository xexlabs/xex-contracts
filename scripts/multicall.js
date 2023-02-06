const hre = require("hardhat");
const fs = require("fs");
const BigNumber = require("bignumber.js");

async function main() {
    const Multicall = await hre.ethers.getContractFactory("Multicall");
    const multicall = await Multicall.deploy();
    await multicall.deployed();
    await multicall.deployTransaction.wait(10);
    console.log(`multicall ${multicall.address}`);
    await hre.run("verify:verify", {
        address: multicall.address,
        constructorArguments: []
    });
}


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
