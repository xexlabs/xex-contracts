import { ethers } from 'hardhat'
import { red, green, yellow, blue } from '../node_modules/colors'
import fs from 'fs'
import path from 'path'

let networkId: string
let networkName: string
let contracts: any = {}
let contractsFile: string
let deploymentDir: string

function save() {
	fs.writeFileSync(contractsFile, JSON.stringify(contracts, null, 4))
}

async function verify(contractName: string, address: string, args: any[]) {
	if (networkId === '31337') return
	let r = contracts[contractName]
	if (!r) throw new Error(`Contract ${contractName} not deployed`)
	if (r.verified) {
		console.log(green(` - Contract ${contractName} already verified`))
		return
	}
	const { timestamp } = r
	const currentTime = Math.floor(Date.now() / 1000)
	if (currentTime - timestamp < 60) {
		console.log(yellow(` - Contract ${contractName} not verified yet, waiting for 60 seconds`))
		await new Promise(resolve => setTimeout(resolve, (60 - (currentTime - timestamp)) * 1000))
	}
	try {
		console.log(yellow(` - Verifying ${contractName} @ ${address}...`))
		// @ts-ignore
		await hre.run('verify:verify', { address, constructorArguments: args })
		r.verified = true
		save()
		console.log(green(` - Contract ${contractName} verified`))
	} catch (e: any) {
		console.log(red(`${e.toString()}`))
	}
}

async function deploy(id: string, args: any[] = [], options: any = {}) {
	if (!contracts) contracts = {}
	if (contracts[id] && networkId !== '31337') {
		let address = contracts[id].address
		if (!(await ethers.provider.getCode(address))) {
			delete contracts[id]
			save()
			console.log(red(`contract ${id} @ ${address} not found, re-deploying`))
		} else {
			console.log(green(`contract ${id} @ ${address} found, re-using`))
			await verify(id, address, args)
			if (!address) throw new Error(`Contract ${id} not deployed`)
			return address
		}
	}

	// Check if deployer has sufficient balance
	const deployer = await ethers.provider.getSigner()
	const deployerBalance = await ethers.provider.getBalance(deployer.getAddress())
	const minimumBalance = ethers.parseEther('0.1')

	if (deployerBalance < minimumBalance) {
		console.log(red(`Insufficient balance. Deployer needs at least 0.1 ETH. Current balance: ${ethers.formatEther(deployerBalance)} ETH`))
		process.exit(1)
	} else {
		console.log(blue(`Deployer address: ${await deployer.getAddress()}`))
		console.log(blue(`Deployer balance: ${ethers.formatEther(deployerBalance)} ETH`))
	}

	let factory, ctx, address
	try {
		factory = await ethers.getContractFactory(id, options)
		ctx = await factory.deploy(...args, options)
		await ctx.waitForDeployment()
		address = await ctx.getAddress()
		console.log(green(`deployed ${id} @ ${address}`))
		contracts[id] = { address, args, options, timestamp: Math.floor(Date.now() / 1000) }
		save()
		await verify(id, address, args)
	} catch (e: any) {
		console.log('id', id)
		console.log('args', args)
		console.log('options', options)
		console.log(red(`${e.toString()}`))
		process.exit(1)
	}
	return address
}

async function main() {
	const network = await ethers.provider.getNetwork()
	networkId = network.chainId.toString()
	networkName = network.name
	deploymentDir = path.join(__dirname, `../deployments/${networkName}`)
	if (!fs.existsSync(deploymentDir)) {
		fs.mkdirSync(deploymentDir, { recursive: true })
	}
	contractsFile = path.join(deploymentDir, `contracts.json`)
	if (!fs.existsSync(contractsFile)) {
		fs.writeFileSync(contractsFile, '{}')
	}
	contracts = JSON.parse(fs.readFileSync(contractsFile, 'utf8'))
	const mockNFTAddress = await deploy('XDON', [])
	const xexAddress = await deploy('XEX', [])
	const xexadonStakingAddress = await deploy('XexadonStaking', [mockNFTAddress])
	const gameMainAddress = await deploy('GameMain', [xexAddress])

	console.log(green('All contracts deployed successfully'))
	console.log(green(`XEX: ${xexAddress}`))
	console.log(green(`XexadonStaking: ${xexadonStakingAddress}`))
	console.log(green(`GameMain: ${gameMainAddress}`))
	console.log(green(`XDON: ${mockNFTAddress}`))

	save()
	process.exit(0)
}

main().catch(error => {
	console.error(red('Deployment failed:'), error)
	process.exit(1)
})
