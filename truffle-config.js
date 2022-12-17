const HDWalletProvider = require('@truffle/hdwallet-provider')
const dotenv = require("dotenv")

dotenv.config()
const liveNetworkPK = process.env.PRIVATE_KEY || ''
const PRIVATE_KEY = [ liveNetworkPK ]
const ADDR = process.env.ADDR;
module.exports = {
    plugins: ['truffle-plugin-verify'],
    api_keys: {
        etherscan: process.env.ETHERSCAN,
    },
    networks: {
        ganache: {
            host: "127.0.0.1",
            port: 8545,
            network_id: "222222222",
            websocket: true
        },
        canto_testnet: {
            provider: () => new HDWalletProvider({
                privateKeys: PRIVATE_KEY,
                providerOrUrl: `https://eth.plexnode.wtf/`,
                pollingInterval: 56000
            }),
            network_id:740,
            confirmations: 2,
            timeoutBlocks: 200,
            pollingInterval: 1000,
            skipDryRun: true,
            from: ADDR,
            networkCheckTimeout: 999999
            //websockets: true
        },
        bsc_testnet: {
            provider: () => new HDWalletProvider({
                privateKeys: PRIVATE_KEY,
                providerOrUrl: `https://data-seed-prebsc-1-s1.binance.org:8545`,
                pollingInterval: 56000
            }),
            network_id: 97,
            confirmations: 2,
            timeoutBlocks: 100,
            from: ADDR,
            skipDryRun: true,
            networkCheckTimeout: 999999
        },
        avax_fuji: {
            provider: () => new HDWalletProvider({
                privateKeys: PRIVATE_KEY,
                providerOrUrl: `https://api.avax-test.network/ext/bc/C/rpc`,
                pollingInterval: 56000
            }),
            network_id: 43113,
            confirmations: 2,
            timeoutBlocks: 100,
            skipDryRun: true,
            from: ADDR,
            networkCheckTimeout: 999999
        },
        eth_goerli: {
            provider: () => new HDWalletProvider({
                privateKeys: PRIVATE_KEY,
                providerOrUrl: `https://rpc.ankr.com/eth_goerli`,
                pollingInterval: 56000
            }),
            network_id: 5,
            confirmations: 2,
            timeoutBlocks: 100,
            skipDryRun: true,
            from: ADDR,
            networkCheckTimeout: 999999
        },
        polygon_mumbai: {
            provider: () => new HDWalletProvider({
                privateKeys: PRIVATE_KEY,
                providerOrUrl: `https://rpc.ankr.com/polygon_mumbai`,
                pollingInterval: 56000
            }),
            network_id: 80001,
            confirmations: 2,
            timeoutBlocks: 200,
            pollingInterval: 1000,
            skipDryRun: true,
            from: ADDR,
            networkCheckTimeout: 999999
            //websockets: true
        }
    },
    mocha: {
        timeout: 100_000
    },
    compilers: {
        solc: {
            version: "0.8.4",
            settings: {
                optimizer: {
                    enabled: true,
                    runs: 1
                },
                evmVersion: "berlin"
            }
        }
    },
    db: {
        enabled: false
    }
};
