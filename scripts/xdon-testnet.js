const hre = require("hardhat");
const fs = require("fs");
function toWei(v) {
    return hre.ethers.utils.parseUnits(v, 'ether').toString();
}
async function main() {
    const lz = JSON.parse(fs.readFileSync('lz-testnet.json'));
    const network = await hre.ethers.provider.getNetwork();
    const cfg = lz[network.chainId];
    if (!cfg) {
        return console.log(`Deployment for chain ${network.chainId} not implemented.`);
    }
    let contracts = JSON.parse(fs.readFileSync('contracts-testnet.json'));
    if( ! contracts[network.chainId] ){
        contracts[network.chainId] = {};
    }
    const Main = await hre.ethers.getContractFactory("XDON");

    const minGas = cfg.minGas;
    const endpoint = cfg.endpoint;
    const startMintId = cfg.startMintId;
    const maxMintId = cfg.maxMintId;
    const startDate = cfg.startDate;
    const endDate = cfg.endDate;
    const root = cfg.root;
    const mintPrice = toWei(cfg.mintPrice);
    const treasure = cfg.treasure;

    const main = await Main.deploy(minGas, endpoint, startMintId, maxMintId, startDate, endDate, root, mintPrice, treasure);
    await main.deployed();
    if (cfg.chain !== 'localhost') {
        await main.deployTransaction.wait(10);
    }
    console.log(`main ${main.address}`);

    contracts[network.chainId].XDON = main.address;
    fs.writeFileSync('contracts-testnet.json', JSON.stringify(contracts, undefined, '     '));

    try {
        if (cfg.chain !== 'localhost') {
            console.log(`verify XDON...`);
            const args = [minGas, endpoint, startMintId, maxMintId, startDate, endDate, root, mintPrice, treasure];
            await hre.run("verify:verify", {
                address: main.address,
                contract: "contracts/XDON.sol:XDON",
                constructorArguments: args
            });
        }
    } catch (e) {
        console.log(`main verification error: ${e.toString()}`);
    }

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
