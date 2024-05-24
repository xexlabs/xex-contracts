const hre = require('hardhat');
const fs = require('fs');
async function main() {
  const FUNCTION_TYPE_SEND = '1';
  const minGas = '150000';
  const [_dev] = await ethers.getSigners();
  const dev = _dev.address;
  const network = await hre.ethers.provider.getNetwork();
  const lz = JSON.parse(fs.readFileSync('lz-mainnet.json'));
  const contracts = JSON.parse(fs.readFileSync('contracts-mainnet.json'));
  const contract = contracts[network.chainId];
  const XEX = await ethers.getContractFactory('XDON');
  const main = XEX.attach(contract.XDON);
  console.log(
    `Set trust on chain ${network.chainId}, contract: ${contract.XDON}:`,
  );
  let baseNonce = ethers.provider.getTransactionCount(dev);
  let nonceOffset = 0;
  function getNonce() {
    return baseNonce.then((nonce) => nonce + nonceOffset++);
  }
  for (let id in contracts) {
    const r = contracts[id];
    const cfg = lz[id];
    if (id == network.chainId) continue;
    if (cfg.id == '0') continue;
    if (!r.XDON) continue;
    try {
      await main.getTrustedRemoteAddress(cfg.id);
      continue;
    } catch (e) {
      console.log(
        `  - network=${id} -> not trusted ${r.XDON} from ${cfg.id}: ${cfg.chain}.`,
      );
    }
    console.log(
      `  - network=${id} -> allow ${r.XDON} from ${cfg.id}: ${cfg.chain}...`,
    );
    let tx = await main.setTrustedRemoteAddress(cfg.id, r.XDON, {
      nonce: getNonce(),
    });
    await tx.wait();
    console.log(`    setTrustedRemoteAddress DONE`);
    tx = await main.setMinDstGas(cfg.id, FUNCTION_TYPE_SEND, minGas, {
      nonce: getNonce(),
    });
    await tx.wait();
    console.log(`    setMinDstGas DONE`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
