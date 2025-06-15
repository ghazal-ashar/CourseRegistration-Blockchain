// scripts/deploy.js - Enhanced with block generation for MetaMask compatibility
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
        if (i % 5 === 0) {
            console.log(`Generated ${i + 1} blocks...`);
        }
    }
    
    const currentBlock = await ethers.provider.getBlockNumber();
    console.log(`✅ Generated ${currentBlock} blocks for MetaMask compatibility`);

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
    
    // Test the system
    console.log("\n🧪 Testing system...");
    
    try {
        // Register deployer as student
        const registerTx = await courseRegistration.registerAsStudent();
        await registerTx.wait();
        console.log("✅ Student registration successful!");
        
        // Add sample courses
        console.log("Adding sample courses...");
        
        await courseRegistration.addCourse(
            "Introduction to Blockchain",
            "Learn the fundamentals of blockchain technology and its applications.",
            3,
            ethers.parseEther("100"),
            30
        );
        
        await courseRegistration.addCourse(
            "Smart Contract Development", 
            "An in-depth course on developing secure smart contracts with Solidity.",
            4,
            ethers.parseEther("150"),
            25
        );
        
        await courseRegistration.addCourse(
            "Decentralized Applications",
            "Build DApps using Web3.js, React, and Ethereum.",
            3,
            ethers.parseEther("125"),
            20
        );
        
        console.log("✅ Sample courses added!");
        
        // Mint tokens to admin
        const mintTx = await courseRegistration.mintTokensToSelf(ethers.parseEther("10000"));
        await mintTx.wait();
        console.log("✅ Tokens minted to admin successfully!");
        
        // Check balance
        const balance = await crstToken.balanceOf(deployer.address);
        console.log("✅ Admin CRST balance:", ethers.formatEther(balance), "CRST");
        
    } catch (error) {
        console.log("⚠️ Testing error:", error.message);
    }
    
    // Generate more blocks after deployment
    console.log("\n🔧 Generating post-deployment blocks...");
    for (let i = 0; i < 10; i++) {
        await deployer.sendTransaction({
            to: deployer.address,
            value: 0,
            gasLimit: 21000
        });
    }
    
    const finalBlock = await ethers.provider.getBlockNumber();
    console.log(`✅ Final block number: ${finalBlock}`);
    
    // AUTO-GENERATE CONFIG.JS FILE
    console.log("\n🔧 Auto-generating config.js...");
    
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
        
        console.log("✅ Config.js updated successfully!");
        
    } catch (error) {
        console.log("❌ Config generation failed:", error.message);
        console.log("📋 Manual config needed:");
        console.log(`CRST_TOKEN: '${tokenAddress}'`);
        console.log(`COURSE_REGISTRATION: '${registrationAddress}'`);
    }
    
    console.log("\n🎉 Deployment complete!");
    console.log(`📊 Final blockchain state: ${finalBlock} blocks`);
    console.log("\n📋 Next Steps:");
    console.log("1. Clear MetaMask activity data (Settings → Advanced → Clear activity tab data)");
    console.log("2. Import this account to MetaMask:");
    console.log("   Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
    console.log("3. Refresh your browser");
    console.log("\n✅ The blockchain now has enough blocks to prevent sync issues!");
    
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