// test/CourseRegistration.test.js
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Course Registration System", function () {
    let crstToken, courseRegistration;
    let admin, student1, student2, student3;
    let adminAddress, student1Address, student2Address;

    before(async function () {
        // Get signers
        [admin, student1, student2, student3] = await ethers.getSigners();
        adminAddress = await admin.getAddress();
        student1Address = await student1.getAddress();
        student2Address = await student2.getAddress();

        console.log("Admin address:", adminAddress);
        console.log("Student1 address:", student1Address);
        console.log("Student2 address:", student2Address);
    });

    beforeEach(async function () {
        // Deploy CRSTToken
        const CRSTToken = await ethers.getContractFactory("CRSTToken");
        crstToken = await CRSTToken.deploy(adminAddress);
        await crstToken.waitForDeployment();

        // Deploy CourseRegistration
        const CourseRegistration = await ethers.getContractFactory("CourseRegistration");
        courseRegistration = await CourseRegistration.deploy(
            await crstToken.getAddress(),
            adminAddress,
            adminAddress
        );
        await courseRegistration.waitForDeployment();

        // Transfer token ownership to CourseRegistration
        await crstToken.transferOwnership(await courseRegistration.getAddress());

        console.log("CRSTToken deployed to:", await crstToken.getAddress());
        console.log("CourseRegistration deployed to:", await courseRegistration.getAddress());
    });

    describe("Deployment", function () {
        it("Should deploy contracts correctly", async function () {
            expect(await crstToken.getAddress()).to.be.properAddress;
            expect(await courseRegistration.getAddress()).to.be.properAddress;
        });

        it("Should set correct initial values", async function () {
            expect(await courseRegistration.owner()).to.equal(adminAddress);
            expect(await courseRegistration.getBeneficiary()).to.equal(adminAddress);
            expect(await courseRegistration.nextCourseId()).to.equal(100);
        });

        it("Should transfer token ownership correctly", async function () {
            expect(await crstToken.owner()).to.equal(await courseRegistration.getAddress());
        });
    });

    describe("User Profile Management", function () {
        it("Should register user profile correctly", async function () {
            await courseRegistration.connect(student1).registerUserProfile("student1@test.com");
            
            const profile = await courseRegistration.getUserProfile(student1Address);
            expect(profile.email).to.equal("student1@test.com");
            expect(profile.registered).to.be.true;
        });

        it("Should prevent duplicate email registration", async function () {
            await courseRegistration.connect(student1).registerUserProfile("student1@test.com");
            
            await expect(
                courseRegistration.connect(student2).registerUserProfile("student1@test.com")
            ).to.be.revertedWith("Invalid registration");
        });

        it("Should validate email format", async function () {
            await expect(
                courseRegistration.connect(student1).registerUserProfile("invalid-email")
            ).to.be.revertedWith("Invalid email");
        });

        it("Should allow login with correct wallet-email combination", async function () {
            await courseRegistration.connect(student1).registerUserProfile("student1@test.com");
            
            const result = await courseRegistration.connect(student1).loginWithWallet("student1@test.com");
            expect(result).to.be.true;
        });
    });

    describe("Course Management", function () {
        beforeEach(async function () {
            // Register students
            await courseRegistration.connect(student1).registerUserProfile("student1@test.com");
            await courseRegistration.connect(student2).registerUserProfile("student2@test.com");
        });

        it("Should add course correctly", async function () {
            await courseRegistration.addCourse(
                "Blockchain Basics",
                "Introduction to blockchain technology",
                3,
                100,
                30
            );

            const course = await courseRegistration.getCourse(100);
            expect(course.name).to.equal("Blockchain Basics");
            expect(course.feeInTokens).to.equal(100);
            expect(course.capacity).to.equal(30);
            expect(course.isActive).to.be.true;
        });

        it("Should prevent non-admin from adding courses", async function () {
            await expect(
                courseRegistration.connect(student1).addCourse(
                    "Unauthorized Course",
                    "Should fail",
                    3,
                    100,
                    30
                )
            ).to.be.revertedWithCustomError(courseRegistration, "OwnableUnauthorizedAccount");
        });

        it("Should validate course parameters", async function () {
            // Test invalid credit hours
            await expect(
                courseRegistration.addCourse("Test", "Test", 0, 100, 30)
            ).to.be.revertedWith("Invalid params");

            // Test invalid fee
            await expect(
                courseRegistration.addCourse("Test", "Test", 3, 0, 30)
            ).to.be.revertedWith("Invalid params");

            // Test invalid capacity
            await expect(
                courseRegistration.addCourse("Test", "Test", 3, 100, 0)
            ).to.be.revertedWith("Invalid params");
        });
    });

    describe("Course Registration", function () {
        beforeEach(async function () {
            // Register students
            await courseRegistration.connect(student1).registerUserProfile("student1@test.com");
            await courseRegistration.connect(student2).registerUserProfile("student2@test.com");

            // Add a course
            await courseRegistration.addCourse(
                "Blockchain Basics",
                "Introduction to blockchain technology",
                3,
                100,
                30
            );
        });

        it("Should register student for course", async function () {
            await courseRegistration.connect(student1).registerForCourse(100);

            const registration = await courseRegistration.getRegistration(student1Address, 100);
            expect(registration.student).to.equal(student1Address);
            expect(registration.courseId).to.equal(100);
            expect(registration.hasPaid).to.be.false;
        });

        it("Should prevent duplicate registration", async function () {
            await courseRegistration.connect(student1).registerForCourse(100);

            await expect(
                courseRegistration.connect(student1).registerForCourse(100)
            ).to.be.revertedWith("Already registered");
        });

        it("Should increment enrolled count", async function () {
            await courseRegistration.connect(student1).registerForCourse(100);
            
            const course = await courseRegistration.getCourse(100);
            expect(course.enrolled).to.equal(1);
        });

        it("Should prevent registration when course is full", async function () {
            // Add course with capacity 1
            await courseRegistration.addCourse("Small Course", "Test", 3, 100, 1);
            
            // Register first student
            await courseRegistration.connect(student1).registerForCourse(101);
            
            // Try to register second student
            await expect(
                courseRegistration.connect(student2).registerForCourse(101)
            ).to.be.revertedWith("Course full");
        });
    });

    describe("Fee Payment", function () {
        beforeEach(async function () {
            // Register students
            await courseRegistration.connect(student1).registerUserProfile("student1@test.com");
            
            // Add course
            await courseRegistration.addCourse("Paid Course", "Test", 3, 100, 30);
            
            // Register for course
            await courseRegistration.connect(student1).registerForCourse(100);
            
            // Mint tokens to student
            await courseRegistration.mint(student1Address, ethers.parseEther("500"));
        });

        it("Should allow fee payment", async function () {
            const feeAmount = ethers.parseEther("100");
            
            // Approve tokens
            await crstToken.connect(student1).approve(await courseRegistration.getAddress(), feeAmount);
            
            // Pay fee
            await courseRegistration.connect(student1).payFee(100);
            
            const registration = await courseRegistration.getRegistration(student1Address, 100);
            expect(registration.hasPaid).to.be.true;
            expect(registration.paidAmount).to.equal(feeAmount);
        });

        it("Should prevent payment without approval", async function () {
            await expect(
                courseRegistration.connect(student1).payFee(100)
            ).to.be.revertedWith("Insufficient balance/approval");
        });

        it("Should prevent duplicate payment", async function () {
            const feeAmount = ethers.parseEther("100");
            
            // First payment
            await crstToken.connect(student1).approve(await courseRegistration.getAddress(), feeAmount);
            await courseRegistration.connect(student1).payFee(100);
            
            // Try second payment
            await expect(
                courseRegistration.connect(student1).payFee(100)
            ).to.be.revertedWith("Already paid");
        });

        it("Should update total fees collected", async function () {
            const feeAmount = ethers.parseEther("100");
            
            await crstToken.connect(student1).approve(await courseRegistration.getAddress(), feeAmount);
            await courseRegistration.connect(student1).payFee(100);
            
            expect(await courseRegistration.totalFeesCollected()).to.equal(feeAmount);
        });
    });

    describe("Token Requests", function () {
        beforeEach(async function () {
            await courseRegistration.connect(student1).registerUserProfile("student1@test.com");
        });

        it("Should create token request", async function () {
            await courseRegistration.connect(student1).requestTokens(100, "Need for course fees");
            
            const request = await courseRegistration.getTokenRequest(1);
            expect(request.student).to.equal(student1Address);
            expect(request.amountInTokens).to.equal(100);
            expect(request.reason).to.equal("Need for course fees");
            expect(request.isPending).to.be.true;
        });

        it("Should approve token request", async function () {
            await courseRegistration.connect(student1).requestTokens(100, "Need for course fees");
            
            // Admin approves
            await courseRegistration.approveTokenRequest(1);
            
            const request = await courseRegistration.getTokenRequest(1);
            expect(request.isPending).to.be.false;
            expect(request.isApproved).to.be.true;
            
            // Check student received tokens
            const balance = await crstToken.balanceOf(student1Address);
            expect(balance).to.equal(ethers.parseEther("100"));
        });

        it("Should reject token request", async function () {
            await courseRegistration.connect(student1).requestTokens(100, "Need for course fees");
            
            // Admin rejects
            await courseRegistration.rejectTokenRequest(1);
            
            const request = await courseRegistration.getTokenRequest(1);
            expect(request.isPending).to.be.false;
            expect(request.isApproved).to.be.false;
            
            // Check student didn't receive tokens
            const balance = await crstToken.balanceOf(student1Address);
            expect(balance).to.equal(0);
        });

        it("Should validate token request parameters", async function () {
            await expect(
                courseRegistration.connect(student1).requestTokens(0, "Invalid amount")
            ).to.be.revertedWith("Invalid amount");

            await expect(
                courseRegistration.connect(student1).requestTokens(100, "")
            ).to.be.revertedWith("Invalid reason");
        });
    });

    describe("Admin Functions", function () {
        it("Should allow admin to mint tokens", async function () {
            await courseRegistration.mint(student1Address, ethers.parseEther("100"));
            
            const balance = await crstToken.balanceOf(student1Address);
            expect(balance).to.equal(ethers.parseEther("100"));
        });

        it("Should allow admin to withdraw fees", async function () {
            // Setup: student pays fee
            await courseRegistration.connect(student1).registerUserProfile("student1@test.com");
            await courseRegistration.addCourse("Test Course", "Test", 3, 100, 30);
            await courseRegistration.connect(student1).registerForCourse(100);
            await courseRegistration.mint(student1Address, ethers.parseEther("500"));
            
            const feeAmount = ethers.parseEther("100");
            await crstToken.connect(student1).approve(await courseRegistration.getAddress(), feeAmount);
            await courseRegistration.connect(student1).payFee(100);
            
            // Admin withdraws fees
            const initialBalance = await crstToken.balanceOf(adminAddress);
            await courseRegistration.withdrawFees(100);
            const finalBalance = await crstToken.balanceOf(adminAddress);
            
            expect(finalBalance - initialBalance).to.equal(feeAmount);
        });

        it("Should allow admin to pause/unpause", async function () {
            await courseRegistration.pause();
            expect(await courseRegistration.paused()).to.be.true;
            
            await courseRegistration.unpause();
            expect(await courseRegistration.paused()).to.be.false;
        });
    });

    describe("View Functions", function () {
        beforeEach(async function () {
            await courseRegistration.addCourse("Course 1", "Test 1", 3, 100, 30);
            await courseRegistration.addCourse("Course 2", "Test 2", 4, 150, 25);
        });

        it("Should get all course IDs", async function () {
            const courseIds = await courseRegistration.getAllCourseIds();
            expect(courseIds).to.deep.equal([100n, 101n]);
        });

        it("Should get active course IDs", async function () {
            const activeCourseIds = await courseRegistration.getActiveCourseIds();
            expect(activeCourseIds).to.deep.equal([100n, 101n]);
        });

        it("Should get system stats", async function () {
            const stats = await courseRegistration.getSystemStats();
            expect(stats.totalCourses).to.equal(2);
            expect(stats.activeCourses).to.equal(2);
        });
    });

    describe("Integration Tests", function () {
        it("Should handle complete student workflow", async function () {
            // 1. Register student profile
            await courseRegistration.connect(student1).registerUserProfile("student1@test.com");
            
            // 2. Admin adds course
            await courseRegistration.addCourse("Full Course", "Complete test", 3, 100, 30);
            
            // 3. Student registers for course
            await courseRegistration.connect(student1).registerForCourse(100);
            
            // 4. Student requests tokens
            await courseRegistration.connect(student1).requestTokens(200, "Need for course fees");
            
            // 5. Admin approves token request
            await courseRegistration.approveTokenRequest(1);
            
            // 6. Student pays fee
            const feeAmount = ethers.parseEther("100");
            await crstToken.connect(student1).approve(await courseRegistration.getAddress(), feeAmount);
            await courseRegistration.connect(student1).payFee(100);
            
            // Verify final state
            const registration = await courseRegistration.getRegistration(student1Address, 100);
            expect(registration.hasPaid).to.be.true;
            
            const studentBalance = await crstToken.balanceOf(student1Address);
            expect(studentBalance).to.equal(ethers.parseEther("100")); // 200 - 100
            
            const totalFees = await courseRegistration.totalFeesCollected();
            expect(totalFees).to.equal(feeAmount);
        });
    });
});