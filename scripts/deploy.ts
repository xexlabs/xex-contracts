import { ethers, upgrades } from 'hardhat'
import { red, green, yellow } from '../node_modules/colors'
import fs from 'fs'
import path from 'path'
let networkId: string
let networkName: string
let contracts: any = {}
let contractsFile: string
function save() {
	if (networkId !== '31337') {
		fs.writeFileSync(contractsFile, JSON.stringify(contracts, null, 4))
	}
}

async function verify(contractName: string, address: string, args: any[]) {
	if (networkId !== '31337') {
		let r = contracts[networkId][contractName]
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
}
async function deploy(id: string, as_proxy: boolean = false, args: any[] = [], options: any = {}) {
	if (options && options.unsafeAllow) {
		if (options.unsafeAllow.length > 0) options.unsafeAllow = [...new Set(options.unsafeAllow)]
	}
	if (!contracts[networkId]) contracts[networkId] = {}
	if (contracts[networkId][id] && networkId !== '31337') {
		let address = contracts[networkId][id].address
		if (!(await ethers.provider.getCode(address))) {
			delete contracts[networkId][id]
			save()
			console.log(red(`contract ${id} @ ${address} not found, re-deploying`))
		} else {
			console.log(green(`contract ${id} @ ${address} found, re-using`))
			await verify(id, address, args)
			if (!address) throw new Error(`Contract ${id} not deployed`)
			return address
		}
	}
	let factory, ctx, address
	try {
		if (as_proxy) {
			factory = await ethers.getContractFactory(id, options)
			ctx = await upgrades.deployProxy(factory, args, options)
		} else {
			factory = await ethers.getContractFactory(id, options)
			ctx = await factory.deploy(...args, options)
		}
		await ctx.waitForDeployment()
		address = ctx.target.toString()
		console.log(green(`deployed ${id} @ ${address}`))
		contracts[networkId][id] = { address, args, options, timestamp: Math.floor(Date.now() / 1000) }
		save()
		await verify(id, ctx.target.toString(), args)
	} catch (e: any) {
		console.log('id', id)
		console.log('args', args)
		console.log('options', options)
		console.log(red(`${e.toString()}`))
		process.exit(0)
	}
	return address
}
async function main() {
	const network = await ethers.provider.getNetwork()
	networkId = network.chainId.toString()
	networkName = network.name
	contractsFile = path.join(__dirname, `../artifacts/${networkName}.json`)
	if (!fs.existsSync(contractsFile)) {
		fs.writeFileSync(contractsFile, '{}')
	}
	contracts = JSON.parse(fs.readFileSync(contractsFile, 'utf8'))
	await deploy('KoiProportionalAuction', false, [])
	save()
	process.exit(0)
}

main()
