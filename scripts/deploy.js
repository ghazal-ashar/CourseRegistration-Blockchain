// scripts/deploy.js 
const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

    // Deploy CRSTToken first
    const CRSTToken = await ethers.getContractFactory("CRSTToken");
    const crstToken = await CRSTToken.deploy(deployer.address);
    await crstToken.waitForDeployment();
    
    console.log("CRSTToken deployed to:", await crstToken.getAddress());

    // Deploy CourseRegistration with wallet-only authentication
    const CourseRegistration = await ethers.getContractFactory("CourseRegistration");
    const courseRegistration = await CourseRegistration.deploy(
        await crstToken.getAddress(),  // _tokenAddress
        deployer.address,              // initialOwner  
        deployer.address               // _beneficiary
    );
    await courseRegistration.waitForDeployment();
    
    console.log("CourseRegistration deployed to:", await courseRegistration.getAddress());

    // Transfer CRSTToken ownership to CourseRegistration contract
    const transferTx = await crstToken.transferOwnership(await courseRegistration.getAddress());
    await transferTx.wait();
    
    console.log("CRSTToken ownership transferred to CourseRegistration contract!");
    
    // Test the wallet-only authentication system
    console.log("\n🧪 Testing Wallet-Only Authentication System...");
    
    try {
        // Test 1: Register deployer as student
        console.log("1. Registering deployer as student...");
        const registerTx = await courseRegistration.registerAsStudent();
        await registerTx.wait();
        console.log("✅ Student registration successful!");
        
        // Test 2: Check user profile
        console.log("2. Checking user profile...");
        const profile = await courseRegistration.getUserProfile(deployer.address);
        console.log("✅ User profile:", {
            wallet: profile[0],
            role: profile[1] === 0 ? 'Student' : 'Admin',
            isActive: profile[2],
            registeredAt: profile[3].toString()
        });
        
        // Test 3: Check if user is active
        console.log("3. Testing user status...");
        const isActive = await courseRegistration.isUserActive(deployer.address);
        console.log("✅ User is active:", isActive);
        
        // Test 4: Add a sample course
        console.log("4. Adding sample course...");
        const addCourseTx = await courseRegistration.addCourse(
            "Blockchain Fundamentals",
            "Learn the basics of blockchain technology",
            3, // credit hours
            100, // fee in tokens (without decimals)
            30 // capacity
        );
        await addCourseTx.wait();
        console.log("✅ Sample course added!");
        
        // Test 5: Check course
        console.log("5. Checking course...");
        const courseIds = await courseRegistration.getActiveCourseIds();
        if (courseIds.length > 0) {
            const course = await courseRegistration.getCourse(courseIds[0]);
            console.log("✅ Course details:", {
                id: course.id.toString(),
                name: course.name,
                fee: course.feeInTokens.toString(),
                capacity: course.capacity.toString()
            });
        }
        
        // Test 6: Test token minting to admin
        console.log("6. Testing admin token minting...");
        const mintTx = await courseRegistration.mintTokensToSelf(1000); // 1000 tokens
        await mintTx.wait();
        console.log("✅ Tokens minted to admin successfully!");
        
        // Test 7: Check CRST token balance
        console.log("7. Checking CRST token balance...");
        const balance = await crstToken.balanceOf(deployer.address);
        console.log("✅ Admin CRST balance:", ethers.formatEther(balance), "CRST");
        
    } catch (error) {
        console.log("⚠️ Testing error:", error.message);
    }
    
    // Log addresses for config.js
    console.log("\n📋 COPY THESE ADDRESSES TO YOUR config.js FILE:");
    console.log("==========================================");
    console.log(`CRST_TOKEN: '${await crstToken.getAddress()}'`);
    console.log(`COURSE_REGISTRATION: '${await courseRegistration.getAddress()}'`);
    console.log("==========================================\n");
    
    console.log("🔧 System Configuration:");
    console.log("✅ Contract Owner (Admin):", deployer.address);
    console.log("✅ Beneficiary:", deployer.address);
    console.log("✅ Authentication: Wallet-only (no emails)");
    console.log("✅ Token Management: Enhanced with admin mint & transfer");
    
    console.log("\n🎯 Frontend Integration:");
    console.log("👑 Contract Owner → Auto-redirect to Admin Portal");
    console.log("👨‍💼 Existing Admin → Auto-redirect to Admin Portal");  
    console.log("👨‍🎓 Existing Student → Auto-redirect to Student Portal");
    console.log("✨ New User → Show registration options (Student/Admin request)");
    
    console.log("\n🛡️ Enhanced Security Features:");
    console.log("🔐 Wallet-only authentication");
    console.log("🎫 Role-based access control");
    console.log("💰 Admin token minting capabilities");
    console.log("💸 Admin-to-student token transfers");
    console.log("✅ Student verification for token operations");
    
    console.log("\n🎉 Deployment and testing complete!");
    console.log("🌐 Ready for frontend integration with wallet-only auth");
    
    return {
        crstToken: await crstToken.getAddress(),
        courseRegistration: await courseRegistration.getAddress()
    };
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });