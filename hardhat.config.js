require("@nomicfoundation/hardhat-toolbox");
const dotenv = require("dotenv");
dotenv.config()
require("@nomiclabs/hardhat-etherscan");
const fs = require("fs");

task("setTreasure", "set treasure address")
    .addParam("contract", "contract to set the treasure")
    .addParam("wallet", "wallet to set as treasure")
    .setAction(async (taskArgs) => {
        const Main = await ethers.getContractFactory("Main")
        const main = Main.attach(taskArgs.contract);
        await main.setTreasure(taskArgs.wallet);
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


/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    networks: {
        bsc: {
            url: `https://rpc.ankr.com/bsc`,
            accounts: [`${process.env.PRIVATE_KEY}`],
            live: true,
            saveDeployments: true,
        },
        avax: {
            url: `https://rpc.ankr.com/avalanche`,
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
        polygon: {
            url: `https://rpc.ankr.com/polygon`,
            accounts: [`${process.env.PRIVATE_KEY}`],
            live: true,
            saveDeployments: true,
        },
        ftm: {
            url: `https://rpc.ankr.com/fantom`,
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
        eth_testnet: {
            url: `https://goerli.infura.io/v3/${process.env.INFURA}`,
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
