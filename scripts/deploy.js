// scripts/deploy.js 
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

    // FIRST: Generate some blocks to prevent MetaMask sync issues
    console.log("\n🔧 Generating initial blocks for MetaMask compatibility...");
    for (let i = 0; i < 25; i++) {
        await deployer.sendTransaction({
            to: deployer.address,
            value: 0,
            gasLimit: 21000
        });
    }
    
    const currentBlock = await ethers.provider.getBlockNumber();
    console.log(`Generated ${currentBlock} blocks for MetaMask compatibility`);

    // Deploy CRSTToken first
    const CRSTToken = await ethers.getContractFactory("CRSTToken");
    const crstToken = await CRSTToken.deploy(deployer.address);
    await crstToken.waitForDeployment();
    
    const tokenAddress = await crstToken.getAddress();
    console.log("CRSTToken deployed to:", tokenAddress);

    // Deploy CourseRegistration
    const CourseRegistration = await ethers.getContractFactory("CourseRegistration");
    const courseRegistration = await CourseRegistration.deploy(
        tokenAddress,
        deployer.address,
        deployer.address
    );
    await courseRegistration.waitForDeployment();
    
    const registrationAddress = await courseRegistration.getAddress();
    console.log("CourseRegistration deployed to:", registrationAddress);

    // Transfer CRSTToken ownership to CourseRegistration contract
    const transferTx = await crstToken.transferOwnership(registrationAddress);
    await transferTx.wait();

    console.log("CRSTToken ownership transferred to CourseRegistration contract!");

    //Transfer initial tokens to CourseRegistration contract
    console.log("Transferring initial token supply to CourseRegistration contract...");
    const initialBalance = await crstToken.balanceOf(deployer.address);
    const transferTokensTx = await crstToken.transfer(registrationAddress, initialBalance);
    await transferTokensTx.wait();

    console.log(`Transferred ${ethers.formatEther(initialBalance)} CRST tokens to CourseRegistration contract!`);

    // Verify the transfer
    const contractBalance = await crstToken.balanceOf(registrationAddress);
    const deployerBalance = await crstToken.balanceOf(deployer.address);
    console.log(`Contract CRST balance: ${ethers.formatEther(contractBalance)} CRST`);
    console.log(`Deployer CRST balance: ${ethers.formatEther(deployerBalance)} CRST`);

    
    // Generate more blocks after deployment
    console.log("\n🔧 Generating post-deployment blocks");
    for (let i = 0; i < 10; i++) {
        await deployer.sendTransaction({
            to: deployer.address,
            value: 0,
            gasLimit: 21000
        });
    }
    
    const finalBlock = await ethers.provider.getBlockNumber();
    console.log(`Final block number: ${finalBlock}`);
    
    // AUTO-GENERATE CONFIG.JS FILE
    console.log("\nAuto-generating config.js...");
    
    try {
        const crstTokenArtifact = JSON.parse(
            fs.readFileSync('./artifacts/contracts/CRSTToken.sol/CRSTToken.json', 'utf8')
        );
        
        const courseRegistrationArtifact = JSON.parse(
            fs.readFileSync('./artifacts/contracts/CourseRegistration.sol/CourseRegistration.json', 'utf8')
        );
        
        const configContent = `const CONTRACT_CONFIG = {
    NETWORK: {
        chainId: '0x7A69', // 31337 in hex (localhost)
        chainName: 'Localhost 8545',
        rpcUrls: ['http://127.0.0.1:8545'],
        blockExplorerUrls: ['']
    },
    
    ADDRESSES: {
        CRST_TOKEN: '${tokenAddress}',
        COURSE_REGISTRATION: '${registrationAddress}'
    },
    
    ABIS: {
        CRST_TOKEN: ${JSON.stringify(crstTokenArtifact.abi, null, 8)},
        
        COURSE_REGISTRATION: ${JSON.stringify(courseRegistrationArtifact.abi, null, 8)}
    }
};`;

        const configPath = path.join(__dirname, '../frontend/scripts/config.js');
        fs.writeFileSync(configPath, configContent);
        
        console.log("Config.js updated successfully!");
        
    } catch (error) {
        console.log("Config generation failed (manual needed):", error.message);
        console.log(`CRST_TOKEN: '${tokenAddress}'`);
        console.log(`COURSE_REGISTRATION: '${registrationAddress}'`);
    }
    
    console.log("\n Deployment complete!");
    console.log(`Final blockchain state: ${finalBlock} blocks`);
    
    return {
        crstToken: tokenAddress,
        courseRegistration: registrationAddress
    };
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });