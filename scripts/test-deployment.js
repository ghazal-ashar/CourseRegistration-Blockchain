// scripts/test-deployment.js
// Run this script to test all functionalities after deployment

const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Starting Course Registration System Testing...\n");

    // Get contract addresses (update these after deployment)
    const CRST_TOKEN_ADDRESS = process.env.CRST_TOKEN_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    const COURSE_REGISTRATION_ADDRESS = process.env.COURSE_REGISTRATION_ADDRESS || "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

    // Get signers
    const [admin, student1, student2] = await ethers.getSigners();
    console.log("👤 Admin address:", admin.address);
    console.log("👨‍🎓 Student1 address:", student1.address);
    console.log("👩‍🎓 Student2 address:", student2.address);
    console.log("");

    // Get contract instances
    const crstToken = await ethers.getContractAt("CRSTToken", CRST_TOKEN_ADDRESS);
    const courseRegistration = await ethers.getContractAt("CourseRegistration", COURSE_REGISTRATION_ADDRESS);

    console.log("📋 Contract addresses:");
    console.log("CRST Token:", await crstToken.getAddress());
    console.log("Course Registration:", await courseRegistration.getAddress());
    console.log("");

    try {
        // Test 1: Verify Initial State
        console.log("🔍 Test 1: Verifying Initial State...");
        const initialSupply = await crstToken.totalSupply();
        const nextCourseId = await courseRegistration.nextCourseId();
        const totalStudents = await courseRegistration.totalStudentsRegistered();
        
        console.log("✅ Initial CRST supply:", ethers.formatEther(initialSupply), "CRST");
        console.log("✅ Next course ID:", nextCourseId.toString());
        console.log("✅ Total students registered:", totalStudents.toString());
        console.log("");

        // Test 2: Register Student Profiles
        console.log("🔍 Test 2: Registering Student Profiles...");
        
        await courseRegistration.connect(student1).registerUserProfile("student1@university.edu");
        console.log("✅ Student1 profile registered");
        
        await courseRegistration.connect(student2).registerUserProfile("student2@university.edu");
        console.log("✅ Student2 profile registered");
        
        // Verify profiles
        const profile1 = await courseRegistration.getUserProfile(student1.address);
        const profile2 = await courseRegistration.getUserProfile(student2.address);
        
        console.log("✅ Student1 email:", profile1.email);
        console.log("✅ Student2 email:", profile2.email);
        console.log("");

        // Test 3: Add Courses
        console.log("🔍 Test 3: Adding Courses...");
        
        // Add multiple courses
        const courses = [
            ["Blockchain Fundamentals", "Learn the basics of blockchain technology", 3, 100, 30],
            ["Smart Contract Development", "Advanced Solidity programming", 4, 150, 25],
            ["DeFi Protocols", "Understanding decentralized finance", 3, 200, 20],
            ["NFT Development", "Creating and deploying NFT contracts", 2, 120, 15]
        ];

        for (let i = 0; i < courses.length; i++) {
            const [name, description, credits, fee, capacity] = courses[i];
            await courseRegistration.addCourse(name, description, credits, fee, capacity);
            console.log(`✅ Added course: ${name} (ID: ${100 + i})`);
        }
        
        // Verify courses
        const totalCourses = await courseRegistration.getAllCourseIds();
        console.log("✅ Total courses added:", totalCourses.length);
        console.log("");

        // Test 4: Student Course Registration
        console.log("🔍 Test 4: Student Course Registration...");
        
        // Student1 registers for multiple courses
        await courseRegistration.connect(student1).registerForCourse(100);
        console.log("✅ Student1 registered for course 100");
        
        await courseRegistration.connect(student1).registerForCourse(101);
        console.log("✅ Student1 registered for course 101");
        
        // Student2 registers for one course
        await courseRegistration.connect(student2).registerForCourse(100);
        console.log("✅ Student2 registered for course 100");
        
        // Verify registrations
        const student1Courses = await courseRegistration.getStudentCourses(student1.address);
        const student2Courses = await courseRegistration.getStudentCourses(student2.address);
        
        console.log("✅ Student1 courses:", student1Courses.map(id => id.toString()));
        console.log("✅ Student2 courses:", student2Courses.map(id => id.toString()));
        console.log("");

        // Test 5: Token Requests
        console.log("🔍 Test 5: Token Request System...");
        
        // Students request tokens
        await courseRegistration.connect(student1).requestTokens(300, "Need tokens for course fees and materials");
        console.log("✅ Student1 requested 300 tokens");
        
        await courseRegistration.connect(student2).requestTokens(150, "Required for blockchain course fee");
        console.log("✅ Student2 requested 150 tokens");
        
        // Admin approves requests
        await courseRegistration.approveTokenRequest(1);
        console.log("✅ Admin approved request 1");
        
        await courseRegistration.approveTokenRequest(2);
        console.log("✅ Admin approved request 2");
        
        // Check token balances
        const balance1 = await crstToken.balanceOf(student1.address);
        const balance2 = await crstToken.balanceOf(student2.address);
        
        console.log("✅ Student1 token balance:", ethers.formatEther(balance1), "CRST");
        console.log("✅ Student2 token balance:", ethers.formatEther(balance2), "CRST");
        console.log("");

        // Test 6: Fee Payments
        console.log("🔍 Test 6: Fee Payment System...");
        
        // Student1 pays for course 100 (100 CRST)
        const fee1 = ethers.parseEther("100");
        await crstToken.connect(student1).approve(courseRegistration.getAddress(), fee1);
        await courseRegistration.connect(student1).payFee(100);
        console.log("✅ Student1 paid fee for course 100");
        
        // Student1 pays for course 101 (150 CRST)
        const fee2 = ethers.parseEther("150");
        await crstToken.connect(student1).approve(courseRegistration.getAddress(), fee2);
        await courseRegistration.connect(student1).payFee(101);
        console.log("✅ Student1 paid fee for course 101");
        
        // Student2 pays for course 100 (100 CRST)
        const fee3 = ethers.parseEther("100");
        await crstToken.connect(student2).approve(courseRegistration.getAddress(), fee3);
        await courseRegistration.connect(student2).payFee(100);
        console.log("✅ Student2 paid fee for course 100");
        
        // Check remaining balances
        const newBalance1 = await crstToken.balanceOf(student1.address);
        const newBalance2 = await crstToken.balanceOf(student2.address);
        
        console.log("✅ Student1 remaining balance:", ethers.formatEther(newBalance1), "CRST");
        console.log("✅ Student2 remaining balance:", ethers.formatEther(newBalance2), "CRST");
        console.log("");

        // Test 7: System Statistics
        console.log("🔍 Test 7: System Statistics...");
        
        const stats = await courseRegistration.getSystemStats();
        console.log("✅ Total courses:", stats.totalCourses.toString());
        console.log("✅ Active courses:", stats.activeCourses.toString());
        console.log("✅ Total students:", stats.totalStudents.toString());
        console.log("✅ Total registrations:", stats.totalRegistrations.toString());
        console.log("✅ Total fees collected:", ethers.formatEther(stats.totalFeesCollectedAmount), "CRST");
        console.log("✅ Total token requests:", stats.totalTokenRequests.toString());
        console.log("");

        // Test 8: Admin Operations
        console.log("🔍 Test 8: Admin Operations...");
        
        // Admin mints additional tokens
        await courseRegistration.mint(student1.address, ethers.parseEther("100"));
        console.log("✅ Admin minted 100 CRST to student1");
        
        // Check contract balance
        const contractBalance = await courseRegistration.getContractBalance();
        console.log("✅ Contract balance:", contractBalance.toString(), "CRST");
        
        // Admin withdraws some fees
        await courseRegistration.withdrawFees(200);
        console.log("✅ Admin withdrew 200 CRST");
        
        const newContractBalance = await courseRegistration.getContractBalance();
        console.log("✅ New contract balance:", newContractBalance.toString(), "CRST");
        console.log("");

        // Test 9: Course Information
        console.log("🔍 Test 9: Course Information...");
        
        for (let i = 0; i < 4; i++) {
            const courseId = 100 + i;
            const course = await courseRegistration.getCourse(courseId);
            console.log(`✅ Course ${courseId}: ${course.name}`);
            console.log(`   - Enrolled: ${course.enrolled}/${course.capacity}`);
            console.log(`   - Fee: ${course.feeInTokens} CRST`);
            console.log(`   - Active: ${course.isActive}`);
        }
        console.log("");

        // Test 10: Registration Verification
        console.log("🔍 Test 10: Registration Verification...");
        
        const reg1 = await courseRegistration.getRegistration(student1.address, 100);
        const reg2 = await courseRegistration.getRegistration(student1.address, 101);
        const reg3 = await courseRegistration.getRegistration(student2.address, 100);
        
        console.log("✅ Student1 Course 100 - Paid:", reg1.hasPaid);
        console.log("✅ Student1 Course 101 - Paid:", reg2.hasPaid);
        console.log("✅ Student2 Course 100 - Paid:", reg3.hasPaid);
        console.log("");

        // Final Summary
        console.log("🎉 ALL TESTS COMPLETED SUCCESSFULLY!");
        console.log("================================================");
        console.log("📊 Final System State:");
        console.log("• Total Courses:", stats.totalCourses.toString());
        console.log("• Total Students:", stats.totalStudents.toString());
        console.log("• Total Fees Collected:", ethers.formatEther(stats.totalFeesCollectedAmount), "CRST");
        console.log("• Student1 Balance:", ethers.formatEther(await crstToken.balanceOf(student1.address)), "CRST");
        console.log("• Student2 Balance:", ethers.formatEther(await crstToken.balanceOf(student2.address)), "CRST");
        console.log("• Contract Balance:", (await courseRegistration.getContractBalance()).toString(), "CRST");
        console.log("================================================");

    } catch (error) {
        console.error("❌ Test failed:", error.message);
        console.error("Error details:", error);
        process.exit(1);
    }
}

// Error handling
main()
    .then(() => {
        console.log("\n✅ All tests completed successfully!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("\n❌ Testing failed:", error);
        process.exit(1);
    });