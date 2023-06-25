require("@nomicfoundation/hardhat-toolbox");
const dotenv = require("dotenv");
dotenv.config()
require("@nomiclabs/hardhat-etherscan");
const fs = require("fs");

// create a task to set default token uri:
task("seturi", "set default token URI")
    .addParam("uri", "the IPFS URI")
    .setAction(async (taskArgs) => {
        const lzFile = 'lz-mainnet.json';
        const contractsFile = 'contracts-mainnet.json';
        const lz = JSON.parse(fs.readFileSync(lzFile));
        const contracts = JSON.parse(fs.readFileSync(contractsFile));
        const network = await hre.ethers.provider.getNetwork();
        const cfg = lz[network.chainId];
        const contract = contracts[network.chainId];
        if( ! cfg ){
            return new Error(`Invalid chain ${network.chainId} (${lzFile}).`);
        }
        if( ! contract ){
            return new Error(`Invalid chain ${network.chainId} (${contractsFile}).`);
        }
        const Main = await ethers.getContractFactory("XDON")
        const main = Main.attach(contract.XDON);
        await main.setBaseURI(taskArgs.uri);
        console.log('done')
    });

task("halt", "stop minting")
    .setAction(async (taskArgs) => {
        const lzFile = 'lz-mainnet.json';
        const contractsFile = 'contracts-mainnet.json';
        const lz = JSON.parse(fs.readFileSync(lzFile));
        const contracts = JSON.parse(fs.readFileSync(contractsFile));
        const network = await hre.ethers.provider.getNetwork();
        const cfg = lz[network.chainId];
        const contract = contracts[network.chainId];
        if( ! cfg ){
            return new Error(`Invalid chain ${network.chainId} (${lzFile}).`);
        }
        if( ! contract ){
            return new Error(`Invalid chain ${network.chainId} (${contractsFile}).`);
        }
        const Main = await ethers.getContractFactory("XDON")
        const main = Main.attach(contract.XDON);
        await main.haltMint();
        console.log('done')
    });


task("setBaseURI", "set XDON URI")
    .addParam("uri", "the IPFS URI")
    .setAction(async (taskArgs) => {
        const lzFile = 'lz-mainnet.json';
        const contractsFile = 'contracts-mainnet.json';
        const lz = JSON.parse(fs.readFileSync(lzFile));
        const contracts = JSON.parse(fs.readFileSync(contractsFile));
        const network = await hre.ethers.provider.getNetwork();
        const cfg = lz[network.chainId];
        const contract = contracts[network.chainId];
        if( ! cfg ){
            return new Error(`Invalid chain ${network.chainId} (${lzFile}).`);
        }
        if( ! contract ){
            return new Error(`Invalid chain ${network.chainId} (${contractsFile}).`);
        }
        const Main = await ethers.getContractFactory("XDON")
        const main = Main.attach(contract.XDON);
        await main.setBaseURI(taskArgs.uri);
        console.log('done')
    });

task("setTreasure", "set treasure address")
    .addParam("contract", "contract to set the treasure")
    .addParam("wallet", "wallet to set as treasure")
    .setAction(async (taskArgs) => {
        const Main = await ethers.getContractFactory("Main")
        const main = Main.attach(taskArgs.contract);
        await main.setTreasure(taskArgs.wallet);
    });


task("setMintPeriods", "reset mint periods during testnet")
    .addParam("start", "start")
    .addParam("end", "end")
    .setAction(async (taskArgs) => {
        const lzFile = 'lz-testnet.json';
        const contractsFile = 'contracts-testnet.json';
        const lz = JSON.parse(fs.readFileSync(lzFile));
        const contracts = JSON.parse(fs.readFileSync(contractsFile));
        const network = await hre.ethers.provider.getNetwork();
        const cfg = lz[network.chainId];
        const contract = contracts[network.chainId];
        if( ! cfg ){
            return new Error(`Invalid chain ${network.chainId} (${lzFile}).`);
        }
        if( ! contract ){
            return new Error(`Invalid chain ${network.chainId} (${contractsFile}).`);
        }
        const Main = await ethers.getContractFactory("XDON")
        const main = Main.attach(contract.XDON);
        await main.setMintPeriods(taskArgs.start, taskArgs.end);
    });

task("claim", "execute a claim")
    .setAction(async (taskArgs) => {
        const lzFile = 'lz-testnet.json';
        const contractsFile = 'contracts-testnet.json';
        const lz = JSON.parse(fs.readFileSync(lzFile));
        const contracts = JSON.parse(fs.readFileSync(contractsFile));
        const network = await hre.ethers.provider.getNetwork();
        const cfg = lz[network.chainId];
        const contract = contracts[network.chainId];
        if( ! cfg ){
            return new Error(`Invalid chain ${network.chainId} (${lzFile}).`);
        }
        if( ! contract ){
            return new Error(`Invalid chain ${network.chainId} (${contractsFile}).`);
        }
        const proof = ["0x21f179225765b68879783a2211bbf63ca4115c86ca7411dac88086f68f087da0","0x4b9693dd7615d825eb90a35798bb959dd375e847f822809f2dd126869d045b6b","0x99951ab51b124d1f61ee20d67faf170eab94b7549078188f0a76518817fd5f1a","0x350702ef7db3ba485e4c424d8ac5924dbef297d123b3f9d8cdf48c75ed15ebf2","0x2ba1175d111f260303bdc84c5a2a7f0bc8fa18a428d4127fff0be2b0ded426a3"];
        const Main = await ethers.getContractFactory("XDON")
        const main = Main.attach(contract.XDON);
        const mintPrice = (await main.mintPrice()).toString();
        await main.claim(proof, {value: mintPrice});
    });

task("retry", "retry a stuck payload in the bridge")
    .addParam("id", "LZ source chain id")
    .addParam("contract", "LZ source chain contract")
    .addParam("payload", "LZ source chain payload")
    .setAction(async (taskArgs) => {
        const lzFile = 'lz-testnet.json';
        const contractsFile = 'contracts-testnet';
        const lz = JSON.parse(fs.readFileSync(lzFile));
        const contracts = JSON.parse(fs.readFileSync(contractsFile));
        const network = await hre.ethers.provider.getNetwork();
        const cfg = lz[network.chainId];
        const contract = contracts[network.chainId];
        if( ! cfg ){
            return new Error(`Invalid chain ${network.chainId} (${lzFile}).`);
        }
        if( ! contract ){
            return new Error(`Invalid chain ${network.chainId} (${contractsFile}).`);
        }
        const Main = await ethers.getContractFactory("ILayerZeroEndpoint")
        const main = Main.attach(cfg.endpoint);
        const tx = await main.retryPayload(taskArgs.id, taskArgs.contract, taskArgs.payload);
        console.log(`hash: ${tx.transactionHash}`);
    });


task("getUserMinters", "getUserMinters")
    .addParam("wallet", "user")
    .setAction(async (taskArgs) => {
        const lzFile = 'lz-mainnet.json';
        const contractsFile = 'contracts-mainnet.json';
        const lz = JSON.parse(fs.readFileSync(lzFile));
        const contracts = JSON.parse(fs.readFileSync(contractsFile));
        const network = await hre.ethers.provider.getNetwork();
        const cfg = lz[network.chainId];
        const contract = contracts[network.chainId];
        if( ! cfg ){
            return console.log(`Invalid chain ${network.chainId} (${lzFile}).`);
        }
        if( ! contract ){
            return console.log(`Invalid chain ${network.chainId} (${contractsFile}).`);
        }
        const Main = await ethers.getContractFactory("MinterFactory")
        const main = Main.attach(contract.factory);
        const list = await main.getUserMinters(taskArgs.wallet);
        console.log(list);
    });

task("getUserMinterInfo", "getUserMinters")
    .addParam("wallet", "user")
    .setAction(async (taskArgs) => {
        const lzFile = 'lz-mainnet.json';
        const contractsFile = 'contracts-mainnet.json';
        const lz = JSON.parse(fs.readFileSync(lzFile));
        const contracts = JSON.parse(fs.readFileSync(contractsFile));
        const network = await hre.ethers.provider.getNetwork();
        const cfg = lz[network.chainId];
        const contract = contracts[network.chainId];
        if( ! cfg ){
            return console.log(`Invalid chain ${network.chainId} (${lzFile}).`);
        }
        if( ! contract ){
            return console.log(`Invalid chain ${network.chainId} (${contractsFile}).`);
        }
        const Main = await ethers.getContractFactory("MinterFactory")
        const main = Main.attach(contract.factory);
        const list = await main.getUserMinterInfo(taskArgs.wallet);
        console.log(`list`, list);
    });

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    networks: {
        bsc: {
            url: `https://rpc.ankr.com/bsc/${process.env.ANKR}`,
            accounts: [`${process.env.PRIVATE_KEY}`],
            live: true,
            saveDeployments: true,
        },
        avax: {
            url: `https://rpc.ankr.com/avalanche/${process.env.ANKR}`,
            accounts: [`${process.env.PRIVATE_KEY}`],
            live: true,
            saveDeployments: true,
        },
        polygon: {
            url: `https://rpc.ankr.com/polygon/${process.env.ANKR}`,
            accounts: [`${process.env.PRIVATE_KEY}`],
            live: true,
            saveDeployments: true,
        },
        ftm: {
            url: `https://rpc.ankr.com/fantom/${process.env.ANKR}`,
            accounts: [`${process.env.PRIVATE_KEY}`],
            live: true,
            saveDeployments: true,
        },
        eth: {
            url: `https://mainnet.infura.io/v3/${process.env.INFURA}`,
            accounts: [`${process.env.PRIVATE_KEY}`],
            live: true,
            saveDeployments: true,
        },
        arb: {
            url: `https://arb1.arbitrum.io/rpc`,
            accounts: [`${process.env.PRIVATE_KEY}`],
            live: true,
            saveDeployments: true,
        },




        bsc_testnet: {
            url: `https://bsc-testnet.public.blastapi.io`,
            accounts: [`${process.env.PRIVATE_KEY}`],
            live: true,
            saveDeployments: true,
        },
        avax_testnet: {
            url: `https://api.avax-test.network/ext/bc/C/rpc`,
            accounts: [`${process.env.PRIVATE_KEY}`],
            live: true,
            saveDeployments: true,
        },
        polygon_testnet: {
            url: `https://rpc.ankr.com/polygon_mumbai`,
            accounts: [`${process.env.PRIVATE_KEY}`],
            live: true,
            saveDeployments: true,
        },
        ftm_testnet: {
            url: `https://rpc.ankr.com/fantom_testnet`,
            accounts: [`${process.env.PRIVATE_KEY}`],
            live: true,
            saveDeployments: true,
        },
        eth_testnet: {
            url: `https://goerli.infura.io/v3/${process.env.INFURA}`,
            accounts: [`${process.env.PRIVATE_KEY}`],
            live: true,
            saveDeployments: true,
        },
        hardhat: {
            blockGasLimit: 12_450_000,
            hardfork: "london"
        },
        localhost: {
            url: 'http://localhost:8545',
        },
    },
    solidity: {
        compilers: [
            {
                version: '0.8.4',
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 200
                    },
                },
            }
        ],
    },
    etherscan: {
        apiKey: { // npx hardhat verify --list-networks
            goerli: `${process.env.ETHERSCAN}`,
            mainnet: `${process.env.ETHERSCAN}`,
            canto_testnet: `test`,
            bsc: `${process.env.BSCSCAN}`,
            bscTestnet: `${process.env.BSCSCAN}`,
            avalanche: `${process.env.SNOWTRACE}`,
            avalancheFujiTestnet: `${process.env.SNOWTRACE}`,
            polygon: `${process.env.POLYGONSCAN}`,
            polygonMumbai: `${process.env.POLYGONSCAN}`,
            ftmTestnet: `${process.env.FTMSCAN}`,
            opera: `${process.env.FTMSCAN}`,
            arbitrumOne: `${process.env.ARBSCAN}`,
        },
        customChains: [
            {
                network: "canto_testnet",
                chainId: 740,
                urls: {
                    apiURL: "https://evm.explorer.canto-testnet.com/api",
                    browserURL: "https://eth.plexnode.wtf/"
                }
            }
        ]
    }
};
