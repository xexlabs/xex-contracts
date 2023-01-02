const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const lz = JSON.parse(fs.readFileSync('lz.json'));
  const network = await hre.ethers.provider.getNetwork();
  const cfg = lz[network.chainId];
  if( ! cfg ){
    return console.log(`Deployment for chain ${network.chainId} not implemented.`);
  }
  let contracts = JSON.parse( fs.readFileSync('contracts.json') );
  const res = await deploy(cfg);
  if( res ){
    contracts[network.chainId] = res;
    fs.writeFileSync( 'contracts.json', JSON.stringify(contracts) );
    console.log(`verify main: ${res.main}(${cfg.fee}, ${cfg.endpoint})`);
    await hre.run("verify:verify", {
      address: res.main,
      contract: "contracts/Main.sol:Main",
      constructorArguments: [cfg.fee, cfg.endpoint, cfg.tokenSymbol, cfg.tokenName],
      libraries: { Math: res.math }
    });
    console.log(`verify factory: ${res.factory}(${res.main})`);
    await hre.run("verify:verify", {
      address: res.factory,
      // contract: "contracts/Minter.sol:Factory",
      constructorArguments: [res.main]
    });
    console.log(`verify math: ${math}()`);
    await hre.run("verify:verify", {
      address: res.math
    });

  }
}
async function deploy(cfg) {

  const Math = await hre.ethers.getContractFactory("Math");
  const math = await Math.deploy();
  await math.deployed();
  await main.deployTransaction.wait(10);
  console.log(`math ${math.address}`);

  const Main = await hre.ethers.getContractFactory("Main", {
    libraries: {
      Math: math.address,
    },
  });
  const main = await Main.deploy(cfg.fee, cfg.endpoint, , cfg.tokenSymbol, cfg.tokenName);
  await main.deployed();
  await main.deployTransaction.wait(10);
  console.log(`main ${main.address}`);

  const Factory = await hre.ethers.getContractFactory("Factory");
  const factory = await Factory.deploy(main.address);
  await factory.deployed();
  await factory.deployTransaction.wait(10);
  console.log(`factory ${factory.address}`);

  console.log(`setTreasure ${process.env.TREASURE}`);
  const tx = await main.setTreasure(process.env.TREASURE);
  await tx.wait()

  return {math: math.address, main: main.address, factory: factory.address, build: new Date().toISOString() };

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
