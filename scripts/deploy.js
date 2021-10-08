const hre = require('hardhat')
const ethers = hre.ethers;
const BN = ethers.BigNumber

async function deployMainnet(tokenAddress, communityVaultAddress, startTime, daysPerEpoch) {

    const poolTokenAddresses = [
        { name: 'ILV', address: '0x767fe9edc9e0df98e07454847909b5e959d7ca0e' },
        { name: 'BOND', address: '0x0391d2021f89dc339f60fff84546ea23e337750f' },
        { name: 'XYZ', address: '0x618679df9efcd19694bb1daa8d00718eacfa2883' },
        { name: 'IONX', address: '0x02d3a27ac3f55d5d91fb0f52759842696a864217' },
        { name: 'LINK', address: '0x514910771af9ca656af840dff83e8264ecf986ca' },
        { name: 'SNX', address: '0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f' },
        { name: 'ENTR', address: '0xd779eEA9936B4e323cDdff2529eb6F13d0A4d66e' },
        { name: 'SUSHI', address: '0x6b3595068778dd592e39a122f4f5a5cf09c90fe2' }
    ];

    return deploy(tokenAddress, communityVaultAddress, startTime, daysPerEpoch, poolTokenAddresses)
}

async function deployRinkeby(tokenAddress, communityVaultAddress, startTime, daysPerEpoch) {

    const poolTokenAddresses = [
        { name: 'ILV', address: '0xe29DE2A505936f51Db19146c3d927C04F06377cF' },
        { name: 'BOND', address: '0xa3c223e51d22D935918ae78c823294760a08575C' },
        { name: 'XYZ', address: '0xd205F34d1d89db62eE6E09E32f7794fA35fE136A' },
        { name: 'IONX', address: '0x0ebb2D1609d595788f53ceB9E41bfbaCffaafD68' },
        { name: 'LINK', address: '0x21E5A30D8A325c24920570bEF1F30E48EB1bF0Ba' },
        { name: 'SNX', address: '0x1949C607b7ca4cDFe7b0BB17F603097FA7922B93' },
        { name: 'ENTR', address: '0xaE1d5311A5743De2aCaa455E0377BbAbF04C3f2a' },
        { name: 'SUSHI', address: '0x5468B27593693e79E5Bc42Af636edf17318FD0f3' }
    ];

    return deploy(tokenAddress, communityVaultAddress, startTime, daysPerEpoch, poolTokenAddresses)
}

async function deployGenericYF(communityVaultAddress, tokenAddress, stakingAddress, tokenAddress) {
    await hre.run('compile'); // We are compiling the contracts using subtask
    const [deployer] = await ethers.getSigners(); // We are getting the deployer

    console.log('Deploying contracts with the account:', deployer.address); // We are printing the address of the deployer
    console.log('Account balance:', (await deployer.getBalance()).toString()); // We are printing the account balance

    const tenPow18 = BN.from(10).pow(18)
    const cv = await ethers.getContractAt('CommunityVault', communityVaultAddress)
    const staking = await ethers.getContractAt('Staking', stakingAddress)

    const YieldFarmGenericToken = await ethers.getContractFactory('YieldFarmGenericToken')
    const yf = await YieldFarmGenericToken.deploy(tokenAddress, tokenAddress, staking.address, communityVaultAddress)
    await yf.deployTransaction.wait(5)
    console.log(`YieldFarmGenericToken pool : `, yf.address)
    await cv.setAllowance(yf.address, BN.from(10000000).mul(tenPow18))

    console.log("Manual initing epoch 0...");
    await staking.manualEpochInit([tokenAddress], 0)

    console.log(`Verifying Token ...`);
    await hre.run("verify:verify", {
        address: yf.address,
        constructorArguments: [tokenAddress, tokenAddress, staking.address, communityVaultAddress],
        contract: "contracts/YieldFarmGenericToken.sol:YieldFarmGenericToken",
    });

    console.log('Done!');
}

async function deploySushiLPYF(communityVaultAddress, tokenAddress, stakingAddress, _sushiSwapToken) {
    await hre.run('compile'); // We are compiling the contracts using subtask
    const [deployer] = await ethers.getSigners(); // We are getting the deployer

    console.log('Deploying contracts with the account:', deployer.address); // We are printing the address of the deployer
    console.log('Account balance:', (await deployer.getBalance()).toString()); // We are printing the account balance

    const tenPow18 = BN.from(10).pow(18)
    const cv = await ethers.getContractAt('CommunityVault', communityVaultAddress)
    const staking = await ethers.getContractAt('Staking', stakingAddress)

    const YieldFarmSushiLPToken = await ethers.getContractFactory('YieldFarmSushiLPToken')
    const yf = await YieldFarmSushiLPToken.deploy(_sushiSwapToken, tokenAddress, staking.address, communityVaultAddress)
    await yf.deployTransaction.wait(5)
    console.log(`YieldFarmSushiLPToken pool : `, yf.address)
    await cv.setAllowance(yf.address, BN.from(150000000).mul(tenPow18))

    console.log("Manual initing epoch 0...");
    await staking.manualEpochInit([_sushiSwapToken], 0)

    console.log(`Verifying Sushi ...`);
    await hre.run("verify:verify", {
        address: yf.address,
        constructorArguments: [_sushiSwapToken, tokenAddress, staking.address, communityVaultAddress],
        contract: "contracts/YieldFarmSushiLPToken.sol:YieldFarmSushiLPToken",
    });

    console.log('Done!');
}

async function deploy(tokenAddress, communityVaultAddress, startTime, daysPerEpoch, poolTokenAddresses) {
    await hre.run('compile'); // We are compiling the contracts using subtask
    const [deployer] = await ethers.getSigners(); // We are getting the deployer

    const deployedPoolAddresses = [];

    console.log('Deploying contracts with the account:', deployer.address); // We are printing the address of the deployer
    console.log('Account balance:', (await deployer.getBalance()).toString()); // We are printing the account balance

    const Staking = await ethers.getContractFactory('Staking')
    const epochTime = 60 * 60 * 24 * daysPerEpoch;
    const staking = await Staking.deploy(startTime, epochTime)
    await staking.deployed()

    console.log('Staking contract deployed to:', staking.address)

    const YieldFarmGenericToken = await ethers.getContractFactory('YieldFarmGenericToken')

    for (const poolTokenAddress of poolTokenAddresses) {
        console.log(`Deploy ${poolTokenAddress.name} farming`)
        const yf = await YieldFarmGenericToken.deploy(poolTokenAddress.address, tokenAddress, staking.address, communityVaultAddress)
        await yf.deployed()
        console.log(`YF pool, ${poolTokenAddress.name}: `, yf.address)
        deployedPoolAddresses.push(yf.address)
    }

    // initialize stuff
    const tenPow18 = BN.from(10).pow(18)
    const cv = await ethers.getContractAt('CommunityVault', communityVaultAddress)

    for (const deployedPoolAddress of deployedPoolAddresses) {
        console.log("Setting allowance...")
        await cv.setAllowance(deployedPoolAddress, BN.from(10000000).mul(tenPow18))
    }


    const poolTokens = poolTokenAddresses.map(x => x.address)

    console.log("Manual initing epoch 0...");
    await staking.manualEpochInit([...poolTokens], 0)

    console.log(`Verifying Staking ...`);
    await hre.run("verify:verify", {
        address: staking.address,
        constructorArguments: [startTime, epochTime],
        contract: "contracts/Staking.sol:Staking",
    });

    for (let i = 0; i < poolTokenAddresses.length; i++) {
        const poolTokenAddress = poolTokenAddresses[i];
        const deployedPoolAddress = deployedPoolAddresses[i];
        console.log(`Verifying ${poolTokenAddress.name} farming`);
        await hre.run("verify:verify", {
            address: deployedPoolAddress,
            constructorArguments: [poolTokenAddress.address, tokenAddress, staking.address, communityVaultAddress],
            contract: "contracts/YieldFarmGenericToken.sol:YieldFarmGenericToken",
        })
    }

    console.log('Done!');
}

module.exports = { deployRinkeby, deploySushiLPYF, deployGenericYF, deployMainnet }