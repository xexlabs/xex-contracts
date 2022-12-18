const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const lz = JSON.parse(fs.readFileSync('lz.json'));
  const network = await hre.ethers.provider.getNetwork();
  const cfg = lz[network.chainId];
  let contracts = JSON.parse( fs.readFileSync('contracts.json') );
  const res = await deploy(cfg.fee, cfg.endpoint);
  if( res ){
    contracts[network.chainId] = res;
    fs.writeFileSync( 'contracts.json', JSON.stringify(contracts) );
    console.log(`verify main: ${res.main}(${cfg.fee}, ${cfg.endpoint})`);
    await hre.run("verify:verify", {
      address: res.main,
      contract: "contracts/Main.sol:Main",
      constructorArguments: [cfg.fee, cfg.endpoint],
      libraries: { Math: res.math }
    });
    console.log(`verify factory: ${res.factory}(${res.main})`);
    await hre.run("verify:verify", {
      address: res.factory,
      contract: "contracts/Minter.sol:Factory",
      constructorArguments: [res.main]
    });

  }
}
async function deploy(fee, endpoint) {
  const Math = await hre.ethers.getContractFactory("Math");
  const math = await Math.deploy();
  await math.deployed();

  console.log(`math ${math.address}`);

  const Main = await hre.ethers.getContractFactory("Main", {
    libraries: {
      Math: math.address,
    },
  });
  const main = await Main.deploy(fee, endpoint);
  await main.deployed();
  await main.deployTransaction.wait(3);
  console.log(`main ${main.address}`);

  const Factory = await hre.ethers.getContractFactory("Factory");
  const factory = await Factory.deploy(main.address);
  await factory.deployed();
  await factory.deployTransaction.wait(6);
  console.log(`factory ${factory.address}`);

  console.log(`setTreasure ${process.env.TREASURE}`);
  await main.setTreasure(process.env.TREASURE);

  return {math: math.address, main: main.address, factory: factory.address, build: new Date().toISOString() };

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
