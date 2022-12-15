require("@nomicfoundation/hardhat-toolbox");
const dotenv = require("dotenv");
// const hre = require("hardhat");
const fs = require("fs");
dotenv.config()
const liveNetworkPK = process.env.PRIVATE_KEY || ''
const PRIVATE_KEY = [liveNetworkPK]

task("setTreasure", "set treasure address")
    .addParam("contract", "contract to set the treasure")
    .addParam("wallet", "wallet to set as treasure")
    .setAction(async (taskArgs) => {
        const Main = await ethers.getContractFactory("Main")
        const main = Main.attach(taskArgs.contract);
        await main.setTreasure(taskArgs.wallet);
    });


/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    networks: {
        canto_testnet: {
            url: `https://eth.plexnode.wtf/`,
            accounts: [`${PRIVATE_KEY}`],
            live: true,
            saveDeployments: true,
        },
        bsc_testnet: {
            url: `https://data-seed-prebsc-1-s1.binance.org:8545`,
            accounts: [`${PRIVATE_KEY}`],
            live: true,
            saveDeployments: true,
        },
        avax_testnet: {
            url: `https://api.avax-test.network/ext/bc/C/rpc`,
            accounts: [`${PRIVATE_KEY}`],
            live: true,
            saveDeployments: true,
        },
        eth_testnet: {
            url: `https://rpc.ankr.com/eth_goerli`,
            accounts: [`${PRIVATE_KEY}`],
            live: true,
            saveDeployments: true,
            gas: 7064000
        },
        polygon_testnet: {
            url: `https://rpc.ankr.com/polygon_mumbai`,
            accounts: [`${PRIVATE_KEY}`],
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
    etherscan: {
        apiKey: `${process.env.API_KEY}`
    },
    solidity: {
        compilers: [
            {
                version: '0.8.4',
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 1
                    },
                },
            },
            {
                version: '0.8.17',
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 1
                    },
                },
            },
        ],
    },
};
