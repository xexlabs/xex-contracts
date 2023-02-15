const hre = require("hardhat");
const fs = require("fs");
const BigNumber = require("bignumber.js");

async function main() {
    await hre.run("verify:verify", {
        address: '0x374b4effda26320fde512c05ed85335d3486f0c4',
        constructorArguments: ['0x78B3Ec25D285F7a9EcA8Da8eb6b20Be4d5D70E84',
            '0xa41A879bcFdd75983a987FD6b68fae37777e8b28']
    });
}


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
