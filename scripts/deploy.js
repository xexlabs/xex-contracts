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
  }
}
async function deploy(fee, endpoint) {
  const Math = await hre.ethers.getContractFactory("Math");
  const math = await Math.deploy();
  await math.deployed();

  const Main = await hre.ethers.getContractFactory("Main", {
    libraries: {
      Math: math.address,
    }
  });
  const main = await Main.deploy(fee, endpoint);
  await main.deployed();

  const Factory = await hre.ethers.getContractFactory("Factory");
  const factory = await Factory.deploy(main.address);
  await factory.deployed();

  console.log(
    `
    math ${math.address}
    main ${main.address}
    factory ${factory.address}
    `
  );

  await main.setTreasure(process.env.TREASURE);

  return {math: math.address, main: main.address, factory: factory.address, build: new Date().toISOString() };

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
