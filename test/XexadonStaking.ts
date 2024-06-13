import { expect } from 'chai'
import hre from 'hardhat'
import { XexadonStaking } from '../typechain-types/contracts/XexadonStaking'
import { IXDON } from '../typechain-types/contracts/interfaces/IXDON'
describe('XexadonStaking', function () {
	const oneYear = 365n
	const oneMonth = 30n

	const ethers = hre.ethers
	let termInDays: bigint, termInSeconds: bigint
	const fromWei = (value: any, decimals: number = 18) => parseFloat(ethers.formatUnits(value.toString(), decimals))
	const d = (value: any, decimals: number = 18, truncate: number = 2) => parseFloat(fromWei(value, decimals).toFixed(truncate))
	const toWei = (value: any, decimals: number = 18) => ethers.parseUnits(value.toString(), decimals)
	let deposit: bigint
	let oneMonthAPR = 1.66,
		expectedYearlyAPR = 20
	const getTimestamp = async () => {
		const block = await ethers.provider.getBlock('latest')
		return block?.timestamp
	}
	const adv = async (ts: bigint) => {
		await ethers.provider.send('evm_setNextBlockTimestamp', [ts.toString()])
		await ethers.provider.send('evm_mine', [])
	}
	const warp = async (seconds: bigint) => {
		await ethers.provider.send('evm_increaseTime', [seconds.toString()])
		await ethers.provider.send('evm_mine', [])
	}
	let main: XexadonStaking, dev: any, user1: any, user2: any
	let xdon: IXDON
	beforeEach(async function () {
		const xdonAddress = process.env.XDON_ETH as string
		;[dev, user1, user2] = await hre.ethers.getSigners()
		const xexadonStakingFactory = await hre.ethers.getContractFactory('XexadonStaking')
		xdon = (await ethers.getContractAt('IXDON', xdonAddress)) as IXDON
		main = (await xexadonStakingFactory.deploy(xdonAddress)) as XexadonStaking
	})
	describe('Main', function () {
		it(`Test`, async function () {
			console.log('test')
		})
	})
})
