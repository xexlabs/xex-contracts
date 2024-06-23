Error.stackTraceLimit = Infinity
process.env.NODE_NO_WARNINGS = '1'

import { HardhatUserConfig } from 'hardhat/config'
import '@nomicfoundation/hardhat-toolbox'
import dotenv from 'dotenv'
dotenv.config({ path: '/media/veracrypt1/xex/.env' })
import '@openzeppelin/hardhat-upgrades'
import 'hardhat-tracer'

const FTMSCAN = process.env.FTMSCAN as string
const PRIVATE_KEY = process.env.PRIVATE_KEY as string
const ANKR = process.env.ANKR as string
if (!FTMSCAN) throw new Error('Please set your FTMSCAN API key in a .env file')
if (!PRIVATE_KEY) throw new Error('Please set your PRIVATE_KEY in a .env file')
if (!ANKR) throw new Error('Please set your ANKR API key in a .env file')
const config: HardhatUserConfig = {
	networks: {
		hardhat: {
			forking: {
				url: `https://rpc.sonic.fantom.network/`,
				blockNumber: 55165384
			}
		},
		sonic: {
			url: 'https://rpc.sonic.fantom.network/',
			accounts: [PRIVATE_KEY]
		}
	},
	solidity: {
		compilers: [
			{
				version: '0.8.26',
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
