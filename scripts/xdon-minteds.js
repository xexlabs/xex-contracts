Error.stackTraceLimit = Infinity;
const hre = require('hardhat');
const fs = require('fs');
const file = 'minted.json';
const csvFile = 'minted.csv';
const htmlFile = 'minted.html';
let data = [];
let html = [];
let csv = [];
csv.push(
  `id, networkId, count, tokenId, pct, owner, uri, image, ownerLink, tokenLink`,
);
html.push(`
  <!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<title>xdon</title>
		<link
			rel="stylesheet"
			href="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css"
			integrity="sha384-ggOyR0iXCbMQv3Xipma34MD+dH/1fQ784/j6cY/iJTQUOhcWr7x9JvoRxT2MZw1T"
			crossorigin="anonymous"
		/>
		<style>
			body {
				padding: 50px;
				background-color: #f8f9fa;
			}
		</style>

		<script src="https://cdnjs.cloudflare.com/ajax/libs/web3/3.0.0-rc.5/web3.min.js"></script>
		<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.6.0/jquery.min.js"></script>
		<link
			rel="stylesheet"
			href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
			integrity="sha512-DTOQO9RWCH3ppGqcWaEA1BIZOC6xxalwEsw9c2QQeAIftl+Vegovlnee1c9QX4TctnWMn13TZye+giMm8e2LwA=="
			crossorigin="anonymous"
			referrerpolicy="no-referrer"
		/>
		<script
			src="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/js/all.min.js"
			integrity="sha512-GWzVrcGlo0TxTRvz9ttioyYJ+Wwk9Ck0G81D+eO63BaqHaJ3YZX9wuqjwgfcV/MrB2PhaVX9DkYVhbFpStnqpQ=="
			crossorigin="anonymous"
			referrerpolicy="no-referrer"
		></script>
		
    <body >
		
  `);

async function scan(addr, networkId, ctx, id, explorer) {
  const totalSupply = (await ctx.totalSupply()).toNumber();
  let _html = [];
  let _csv = [];
  let json = {
    addr,
    networkId,
    id,
    explorer,
    totalSupply,
    tokens: [],
  };

  _html.push(`<h1 class="display-4">${id} (chain id: ${networkId})</h1>`);
  _html.push(`<p class="lead">Supply: ${totalSupply}</p>`);
  _html.push(`<ul class="list-group">`);
  for (let i = 0; i < totalSupply; i++) {
    const tokenId = (await ctx.tokenByIndex(i)).toNumber();
    const owner = await ctx.ownerOf(tokenId);
    const uri = await ctx.tokenURI(tokenId);
    const image = uri.replace('.json', '.png');
    const count = i + 1;
    const ownerLink = `${explorer}/address/${owner}`;
    const tokenLink = `${explorer}/token/${addr}?a=${tokenId}`;

    const htmlStr = `
<li class="list-group-item">
  <h5>(${count}) - Token ID: <a href="${tokenLink}">${tokenId}</a></h5>
  <ul>
    <li>Owner: <a href="${ownerLink}">${owner}</a></li>
    <li>Metadata: <a href="${uri}">${uri}</a></li>
    <li>Image: <a href="${image}">${image}</a></li>
  </ul>
</li>`;
    const pct = parseFloat(((count / totalSupply) * 100).toFixed(2));
    console.log(totalSupply, id, count, tokenId, pct);
    _html.push(htmlStr);
    json.tokens.push({
      count,
      tokenId,
      owner,
      uri,
      image,
      ownerLink,
      tokenLink,
    });

    const csvLine = `${id}, ${networkId}, ${count}, ${tokenId}, ${pct}, ${owner}, ${uri}, ${image}, ${ownerLink}, ${tokenLink}`;
    _csv.push(csvLine);
  }
  _html.push(`</ul>`);
  _csv.sort();
  _html.sort();
  return {
    html: _html.join('\n'),
    csv: _csv.join('\n'),
    json: json,
  };
}
function save() {
  fs.writeFileSync(
    file,
    JSON.stringify(data, null, 4, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value,
    ),
  );
  fs.writeFileSync(htmlFile, html.join('\n'));
  fs.writeFileSync(csvFile, csv.join('\n'));
}

async function main() {
  const contracts = JSON.parse(fs.readFileSync('contracts-mainnet.json'));
  const lz = JSON.parse(fs.readFileSync('lz-mainnet.json'));
  let promisses = [];
  for (let id in hre.userConfig.networks) {
    const cfg = hre.userConfig.networks[id];
    const url = cfg.url;
    if (!url) continue;
    if (!url || id.includes('testnet') || id.includes('localhost')) continue;
    const provider = new hre.ethers.providers.JsonRpcProvider(url);
    const wallet = new ethers.Wallet(cfg.accounts[0], provider);
    const network = await provider.getNetwork();
    const networkId = network.chainId;
    const ctx = contracts[networkId];
    const addr = ctx.XDON.trim();
    if (!ethers.utils.isAddress(addr)) {
      console.log(`INVALID ADDR: id=${id} networkId=${networkId} addr=${addr}`);
      process.exit(0);
    }
    if (!addr) {
      console.log(`NO ADDR: id=${id} networkId=${networkId} addr=${addr}`);
      process.exit(0);
    }
    const XDON = await ethers.getContractFactory('XDON', wallet);
    const xdon = XDON.attach(addr);
    try {
      const explorer = lz[networkId].explorer;
      if (!explorer) {
        console.log(
          `NO EXPLORER: id=${id} networkId=${networkId} addr=${addr}`,
        );
        process.exit(0);
      }
      const promisse = scan(addr, networkId, xdon, id, explorer);
      promisses.push(promisse);
    } catch (e) {
      console.log('error>');
      console.log(` - id=${id} networkId=${networkId} ${addr} `);
      console.log(e.toString());
      process.exit(0);
    }
  }
  const allData = await Promise.all(promisses);
  for (let r of allData) {
    html.push(r.html);
    csv.push(r.csv);
    data.push(r.json);
  }

  html.push(`
      
    </body>
  </html>
  `);
  save();
}

main().catch((error) => {
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(data));

  console.error(error);
  process.exitCode = 1;
});
