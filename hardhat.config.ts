Error.stackTraceLimit = Infinity
process.env.NODE_NO_WARNINGS = '1'

import { HardhatUserConfig } from 'hardhat/config'
import '@nomicfoundation/hardhat-toolbox'
import dotenv from 'dotenv'
dotenv.config({ path: '/media/veracrypt1/xex/.env' })
import '@openzeppelin/hardhat-upgrades'
const FTMSCAN = process.env.FTMSCAN as string
const PRIVATE_KEY = process.env.PRIVATE_KEY as string
const ANKR = process.env.ANKR as string
if (!FTMSCAN) throw new Error('Please set your FTMSCAN API key in a .env file')
if (!PRIVATE_KEY) throw new Error('Please set your PRIVATE_KEY in a .env file')
if (!ANKR) throw new Error('Please set your ANKR API key in a .env file')
const config: HardhatUserConfig = {
	networks: {
		ftm: {
			url: `https://rpc.ankr.com/fantom/${ANKR}`,
			accounts: [PRIVATE_KEY]
		},
		ftm_testnet: {
			url: `https://rpc.ankr.com/fantom_testnet/${ANKR}`,
			accounts: [PRIVATE_KEY]
		}
	},
	solidity: {
		compilers: [
			{
				version: '0.8.24',
				settings: {
					optimizer: {
						enabled: true,
						runs: 200
					}
				}
			}
		]
	},
	etherscan: {
		apiKey: {
			ftm: FTMSCAN,
			ftmTestnet: FTMSCAN
		}
	}
}

export default config
