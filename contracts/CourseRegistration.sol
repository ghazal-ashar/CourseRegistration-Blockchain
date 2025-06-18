// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

// Interface for CRST token with dual auto-burn functionality
interface ICRSTTokenAutoBurn {
    function mint(address to, uint256 amount) external;
    function burn(uint256 amount) external;
    function burnForEthWithdrawal(uint256 ethAmount) external;
    function balanceOf(address account) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function willAutoBurnTrigger() external view returns (bool, uint256);
    function getRemainingSupply() external view returns (uint256);
}

/**
 * Course Registration System with Dual Auto-Burn Token Economics and Cart Functionality
 * Features:
 * - Wallet-only authentication (no email required)
 * - Course registration and fee payment system
 * - Token request system with ETH payment
 * - Automatic token burning to maintain supply balance
 * - Shopping cart functionality for multiple course payments
 * - 25,000 CRST token supply cap 
 * 
 * Authors: Ghazal E Ashar & Shahzeb Ahmed Iqbal
 */
contract CourseRegistration is ReentrancyGuard, Pausable, Ownable {

    // Reference to auto-burn token contract - cannot be changed after deployment
    ICRSTTokenAutoBurn public immutable crstToken;
    
    // Address that receives withdrawn ETH and fees
    address public beneficiary;
    
    // Exchange rate: 1 ETH = 1000 CRST tokens
    uint256 public constant ETH_TO_CRST_RATE = 1000;
    
    // Return fee: 0.5% deduction when students return CRST for ETH
    uint256 public constant RETURN_FEE_PERCENT = 50; // 0.5% = 50/10000
    
    // Simple role system - either Student or Admin
    enum UserRole { Student, Admin }
    
    // Token request status - simplified to 2-step process
    enum RequestStatus { Pending, Completed, Rejected }
    
    // Stores all information about a course
    struct Course {
        uint256 id;              // Unique course ID (100-999)
        string name;             // Course name
        string description;      // Course description
        uint8 creditHours;       // Number of credit hours (1-6)
        uint256 feeInTokens;     // Fee in CRST tokens (without 18 decimals)
        uint16 capacity;         // Maximum students allowed
        uint16 enrolled;         // Current number of enrolled students
        bool isActive;           // Whether course is active for registration
        uint256 createdAt;       // When course was created
        address createdBy;       // Who created the course
    }
    
    // Stores user account information - wallet address only
    struct UserProfile {
        address walletAddress;   // User's wallet address
        UserRole role;           // Either Student or Admin
        bool isActive;           // Whether account is active
        uint256 registeredAt;    // When user registered
        address approvedBy;      // Who approved this user (for admins only)
    }
    
    // Stores information about a student's course registration
    struct Registration {
        address student;         // Student's wallet address
        uint256 courseId;        // Which course they registered for
        uint256 timestamp;       // When they registered
        bool hasPaid;           // Whether they've paid the fee
        uint256 paidAmount;     // Amount they paid (in wei)
        uint256 paidAt;         // When they paid
    }
    
    // Stores token purchase requests - 2-step process: request → approve/reject
    struct TokenRequest {
        uint256 id;             // Unique request ID
        address student;        // Who requested tokens
        uint256 amountInTokens; // How many CRST tokens requested (without 18 decimals)
        uint256 ethRequired;    // ETH amount required for this request
        string reason;          // Why they need tokens
        RequestStatus status;   // Current status of request
        uint256 timestamp;      // When request was made
        uint256 processedAt;    // When request was processed by admin
        address processedBy;    // Who processed the request
    }
    
    // Course ID => Course information
    mapping(uint256 => Course) public courses;
    
    // Student address => Course ID => Registration details
    mapping(address => mapping(uint256 => Registration)) public registrations;
    
    // Student address => Array of course IDs they're registered for
    mapping(address => uint256[]) public studentCourses;
    
    // Request ID => Token request details
    mapping(uint256 => TokenRequest) public tokenRequests;
    
    // User address => Their profile information
    mapping(address => UserProfile) public userProfiles;
    
    // Address => Whether they're waiting for admin approval
    mapping(address => bool) public pendingAdmins;
    
    // Array of all course IDs for easy iteration
    uint256[] public courseIds;
    
    // Next course ID to assign (starts at 100)
    uint256 public nextCourseId = 100;
    
    // Counter for token requests (starts at 1)
    uint256 public tokenRequestCounter;
    
    // Total fees collected by the contract (in CRST tokens)
    uint256 public totalFeesCollected;
    
    // Total ETH collected from token purchases
    uint256 public totalEthCollected;
    
    // Total ETH paid out to students for CRST returns
    uint256 public totalEthReturned;
    
    // Total fees collected from CRST returns (0.5%)
    uint256 public totalReturnFees;
    
    // Total number of unique students registered
    uint256 public totalStudentsRegistered;
    
    // Maximum fee a course can charge (in tokens, without decimals)
    uint256 public constant MAX_COURSE_FEE = 10000;
    
    // Maximum capacity for any course
    uint256 public constant MAX_COURSE_CAPACITY = 1000;
    
    // Maximum credit hours for any course
    uint8 public constant MAX_CREDIT_HOURS = 6;
    
    // Events
    // Course management events
    event CourseAdded(uint256 indexed courseId, string name, uint256 feeInTokens, address indexed admin);
    event CourseUpdated(uint256 indexed courseId, string name, uint256 feeInTokens, address indexed admin);
    event CourseDeactivated(uint256 indexed courseId, address indexed admin);
    event CourseActivated(uint256 indexed courseId, address indexed admin);
    
    // Student activity events
    event StudentRegistered(address indexed student, uint256 indexed courseId, uint256 timestamp);
    event FeesPaid(address indexed student, uint256 indexed courseId, uint256 amount, uint256 timestamp);
    event BatchFeePaid(address indexed student, uint256[] courseIds, uint256 totalAmount, uint256 timestamp);
    
    // Token request events - 2-step process tracking
    event TokenRequested(uint256 indexed requestId, address indexed student, uint256 amountInTokens, uint256 ethRequired, string reason, uint256 timestamp);
    event TokenRequestApproved(uint256 indexed requestId, address indexed student, uint256 amountInTokens, address indexed admin);
    event TokenRequestRejected(uint256 indexed requestId, address indexed student, address indexed admin);
    event TokenPurchaseCompleted(uint256 indexed requestId, address indexed student, uint256 amountInTokens, uint256 ethPaid);
    event CRSTReturned(address indexed student, uint256 crstAmount, uint256 ethReturned, uint256 feeDeducted);
    
    // User management events
    event UserProfileCreated(address indexed user, UserRole role, uint256 timestamp);
    event AdminRequested(address indexed pendingAdmin);
    event AdminApproved(address indexed admin, address indexed approvedBy);
    event AdminRejected(address indexed admin, address indexed rejectedBy);
    event UserDeactivated(address indexed user, address indexed deactivatedBy);
    
    // Financial events - separate ETH and token withdrawals
    event EthWithdrawn(address indexed beneficiary, uint256 amount, address indexed withdrawnBy, uint256 tokensBurned);
    event TokenFeesWithdrawn(address indexed beneficiary, uint256 amount, address indexed withdrawnBy);
    event BeneficiaryUpdated(address indexed oldBeneficiary, address indexed newBeneficiary, address indexed updatedBy);
    
    // Auto-burn events
    event AutoBurnTriggered(string reason);
    
    // Ensures user has an active account
    modifier onlyActiveUser() {
        require(userProfiles[msg.sender].isActive, "User not active");
        _;
    }
    
    // Ensures caller is an active student
    modifier onlyStudent() {
        require(
            userProfiles[msg.sender].isActive && 
            userProfiles[msg.sender].role == UserRole.Student,
            "Only active students allowed"
        );
        _;
    }
    
    // Ensures caller is either contract owner or an active admin
    modifier onlyOwnerOrAdmin() {
        require(
            msg.sender == owner() || 
            (userProfiles[msg.sender].isActive && userProfiles[msg.sender].role == UserRole.Admin),
            "Only owner or active admins allowed"
        );
        _;
    }
    
    // Initialize the contract with token address and beneficiary
    constructor(address _tokenAddress, address initialOwner, address _beneficiary) Ownable(initialOwner) {
        require(_tokenAddress != address(0), "Invalid token address");
        require(_beneficiary != address(0), "Invalid beneficiary");
        crstToken = ICRSTTokenAutoBurn(_tokenAddress);
        beneficiary = _beneficiary;
    }
    
    // Register as a student - wallet address only, no automatic allowances
    function registerAsStudent() external {
        require(!userProfiles[msg.sender].isActive, "User already registered");
        require(!pendingAdmins[msg.sender], "Admin request pending");
        
        // Create student profile
        userProfiles[msg.sender] = UserProfile({
            walletAddress: msg.sender,
            role: UserRole.Student,
            isActive: true,
            registeredAt: block.timestamp,
            approvedBy: address(0) // Students auto-approved
        });
        
        emit UserProfileCreated(msg.sender, UserRole.Student, block.timestamp);
    }
    
    // Request admin privileges - requires approval from owner
    function requestAdminAccess() external {
        require(!userProfiles[msg.sender].isActive, "User already registered");
        require(!pendingAdmins[msg.sender], "Admin request already pending");
        
        // Mark as pending admin
        pendingAdmins[msg.sender] = true;
        emit AdminRequested(msg.sender);
    }
    
    // Approve a pending admin request (only owner)
    function approveAdmin(address adminAddress) external onlyOwner {
        require(pendingAdmins[adminAddress], "No pending admin request");
        require(!userProfiles[adminAddress].isActive, "User already registered");
        
        // Create admin profile
        userProfiles[adminAddress] = UserProfile({
            walletAddress: adminAddress,
            role: UserRole.Admin,
            isActive: true,
            registeredAt: block.timestamp,
            approvedBy: msg.sender
        });
        
        // Clean up pending status
        pendingAdmins[adminAddress] = false;
        
        emit AdminApproved(adminAddress, msg.sender);
        emit UserProfileCreated(adminAddress, UserRole.Admin, block.timestamp);
    }
    
    // Reject a pending admin request (only owner)
    function rejectAdmin(address adminAddress) external onlyOwner {
        require(pendingAdmins[adminAddress], "No pending admin request");
        
        // Clean up pending status
        pendingAdmins[adminAddress] = false;
        emit AdminRejected(adminAddress, msg.sender);
    }
    
    // Add course
    function addCourse(
        string calldata name, 
        string calldata description, 
        uint8 creditHours, 
        uint256 feeInTokens, 
        uint16 capacity
    ) external onlyOwnerOrAdmin whenNotPaused {
        require(bytes(name).length > 0, "Course name required");
        require(creditHours > 0 && creditHours <= MAX_CREDIT_HOURS, "Invalid credit hours");
        require(feeInTokens > 0 && feeInTokens <= MAX_COURSE_FEE, "Invalid fee");
        require(capacity > 0 && capacity <= MAX_COURSE_CAPACITY, "Invalid capacity");
        require(nextCourseId <= 999, "Maximum courses reached");
        
        uint256 courseId = nextCourseId++;
        
        courses[courseId] = Course({
            id: courseId,
            name: name,
            description: description,
            creditHours: creditHours,
            feeInTokens: feeInTokens,
            capacity: capacity,
            enrolled: 0,
            isActive: true,
            createdAt: block.timestamp,
            createdBy: msg.sender
        });
        
        courseIds.push(courseId);
        emit CourseAdded(courseId, name, feeInTokens, msg.sender);
    }

    function updateCourse(
        uint256 courseId,
        string calldata name, 
        string calldata description, 
        uint8 creditHours, 
        uint256 feeInTokens, 
        uint16 capacity
    ) external onlyOwnerOrAdmin whenNotPaused {
        require(courseId >= 100 && courseId <= 999 && courses[courseId].id != 0, "Course not found");
        require(bytes(name).length > 0, "Course name required");
        require(creditHours > 0 && creditHours <= MAX_CREDIT_HOURS, "Invalid credit hours");
        require(feeInTokens > 0 && feeInTokens <= MAX_COURSE_FEE, "Invalid fee");
        require(capacity > 0 && capacity <= MAX_COURSE_CAPACITY, "Invalid capacity");
        
        Course storage course = courses[courseId];
        
        // Cannot reduce capacity below current enrollment
        require(capacity >= course.enrolled, "Cannot reduce capacity below enrolled students");
        
        // Update course details
        course.name = name;
        course.description = description;
        course.creditHours = creditHours;
        course.feeInTokens = feeInTokens;
        course.capacity = capacity;
        
        emit CourseUpdated(courseId, name, feeInTokens, msg.sender);
    }

    /**
    * Deactivate a course (stop new registrations)
    * @param courseId The ID of the course to deactivate
    */
    function deactivateCourse(uint256 courseId) external onlyOwnerOrAdmin whenNotPaused {
        require(courseId >= 100 && courseId <= 999 && courses[courseId].id != 0, "Course not found");
        require(courses[courseId].isActive, "Course already inactive");
        
        courses[courseId].isActive = false;
        emit CourseDeactivated(courseId, msg.sender);
    }

    /**
    * Activate a course (allow new registrations)
    * @param courseId The ID of the course to activate
    */
    function activateCourse(uint256 courseId) external onlyOwnerOrAdmin whenNotPaused {
        require(courseId >= 100 && courseId <= 999 && courses[courseId].id != 0, "Course not found");
        require(!courses[courseId].isActive, "Course already active");
        
        courses[courseId].isActive = true;
        emit CourseActivated(courseId, msg.sender);
    }

    /**
    * Get detailed course information including financial metrics
    * @param courseId The ID of the course
    * @return course The course struct
    * @return revenue Total revenue generated (in wei)
    * @return enrollmentRate Enrollment rate percentage (0-100)
    */
    function getCourseDetails(uint256 courseId) external view returns (
        Course memory course,
        uint256 revenue,
        uint256 enrollmentRate
    ) {
        require(courseId >= 100 && courseId <= 999 && courses[courseId].id != 0, "Course not found");
        
        course = courses[courseId];
        revenue = course.feeInTokens * course.enrolled * 10**18; // Convert to wei
        enrollmentRate = course.capacity > 0 ? (course.enrolled * 100) / course.capacity : 0;
        
        return (course, revenue, enrollmentRate);
    }

    /**
    * Check if a student is registered for a course
    * @param student Student address
    * @param courseId Course ID
    * @return isRegistered Whether student is registered
    * @return hasPaid Whether student has paid fees
    */
    function isStudentRegistered(address student, uint256 courseId) external view returns (
        bool isRegistered, 
        bool hasPaid
    ) {
        Registration memory registration = registrations[student][courseId];
        isRegistered = (registration.student != address(0));
        hasPaid = registration.hasPaid;
        
        return (isRegistered, hasPaid);
    }

    /**
    * Get registration details for a student and course
    * @param student Student address
    * @param courseId Course ID
    * @return registration The registration struct
    */
    function getRegistration(address student, uint256 courseId) external view returns (Registration memory registration) {
        require(courses[courseId].id != 0, "Course not found");
        return registrations[student][courseId];
    }
    
    // Register for course
    function registerForCourse(uint256 courseId) external whenNotPaused onlyStudent {
        require(courseId >= 100 && courseId <= 999 && courses[courseId].isActive, "Invalid/inactive course");
        require(registrations[msg.sender][courseId].student == address(0), "Already registered");
        
        Course storage course = courses[courseId];
        require(course.enrolled < course.capacity, "Course is full");
        
        registrations[msg.sender][courseId] = Registration({
            student: msg.sender,
            courseId: courseId,
            timestamp: block.timestamp,
            hasPaid: false,
            paidAmount: 0,
            paidAt: 0
        });
        
        studentCourses[msg.sender].push(courseId);
        course.enrolled++;
        
        if (studentCourses[msg.sender].length == 1) {
            totalStudentsRegistered++;
        }
        
        emit StudentRegistered(msg.sender, courseId, block.timestamp);
    }
    
    // Pay course fee - student must have approved contract first
    function payFee(uint256 courseId) external nonReentrant whenNotPaused onlyStudent {
        require(registrations[msg.sender][courseId].student != address(0), "Not registered");
        require(!registrations[msg.sender][courseId].hasPaid, "Already paid");
        
        Course memory course = courses[courseId];
        Registration storage registration = registrations[msg.sender][courseId];
        
        uint256 requiredFee = course.feeInTokens * 10**18;
        
        // Check student has enough CRST tokens
        require(crstToken.balanceOf(msg.sender) >= requiredFee, "Insufficient CRST balance");
        
        // Check student has approved contract to spend their CRST
        // Student must call: crstToken.approve(courseRegistrationAddress, courseFee) first
        require(crstToken.allowance(msg.sender, address(this)) >= requiredFee, "Please approve contract to spend your CRST tokens first");
        
        // Contract pulls CRST from student to contract
        require(crstToken.transferFrom(msg.sender, address(this), requiredFee), "Token transfer failed");
        
        registration.hasPaid = true;
        registration.paidAmount = requiredFee;
        registration.paidAt = block.timestamp;
        
        totalFeesCollected += requiredFee;
        
        // Auto-burn excess tokens happens automatically when tokens are transferred to contract
        emit AutoBurnTriggered("Fee payment - auto-burn check triggered");
        
        emit FeesPaid(msg.sender, courseId, requiredFee, block.timestamp);
    }
    
    // Pay fees for multiple courses at once (CART FUNCTIONALITY)
    function payFeesForCourses(uint256[] calldata courseIds) external nonReentrant whenNotPaused onlyStudent {
        require(courseIds.length > 0, "No courses provided");
        require(courseIds.length <= 10, "Maximum 10 courses per transaction");
        
        uint256 totalFeeRequired = 0;
        
        // First pass: validate all courses and calculate total fee
        for (uint256 i = 0; i < courseIds.length; i++) {
            uint256 courseId = courseIds[i];
            
            // Validate course registration and payment status
            require(registrations[msg.sender][courseId].student != address(0), "Not registered for all courses");
            require(!registrations[msg.sender][courseId].hasPaid, "Already paid for some courses");
            
            // Add to total fee
            Course memory course = courses[courseId];
            totalFeeRequired += course.feeInTokens * 10**18;
        }
        
        // Check student has enough CRST tokens for all courses
        require(crstToken.balanceOf(msg.sender) >= totalFeeRequired, "Insufficient CRST balance for all courses");
        
        // Check student has approved contract to spend total amount
        require(crstToken.allowance(msg.sender, address(this)) >= totalFeeRequired, "Please approve contract to spend enough CRST tokens for all courses");
        
        // Transfer total amount once
        require(crstToken.transferFrom(msg.sender, address(this), totalFeeRequired), "Batch token transfer failed");
        
        // Second pass: update all registrations
        for (uint256 i = 0; i < courseIds.length; i++) {
            uint256 courseId = courseIds[i];
            Course memory course = courses[courseId];
            Registration storage registration = registrations[msg.sender][courseId];
            
            uint256 courseFee = course.feeInTokens * 10**18;
            
            registration.hasPaid = true;
            registration.paidAmount = courseFee;
            registration.paidAt = block.timestamp;
            
            emit FeesPaid(msg.sender, courseId, courseFee, block.timestamp);
        }
        
        totalFeesCollected += totalFeeRequired;
        
        // Auto-burn excess tokens happens automatically when tokens are transferred to contract
        emit AutoBurnTriggered("Batch fee payment - auto-burn check triggered");
        emit BatchFeePaid(msg.sender, courseIds, totalFeeRequired, block.timestamp);
    }
    
    // Step 1: Student requests tokens - pays ETH upfront now
    function requestTokens(uint256 amountInTokens, string calldata reason) 
        external 
        payable
        whenNotPaused 
        onlyStudent 
    {
        require(amountInTokens > 0 && amountInTokens <= 10000, "Invalid token amount (1-10000)");
        require(bytes(reason).length > 0 && bytes(reason).length <= 500, "Invalid reason");
        
        // Calculate required ETH
        uint256 ethRequired = (amountInTokens * 10**18) / ETH_TO_CRST_RATE;
        require(msg.value >= ethRequired, "Insufficient ETH sent");
        
        tokenRequestCounter++;
        
        // Create token request with ETH already paid
        tokenRequests[tokenRequestCounter] = TokenRequest({
            id: tokenRequestCounter,
            student: msg.sender,
            amountInTokens: amountInTokens,
            ethRequired: ethRequired,
            reason: reason,
            status: RequestStatus.Pending,
            timestamp: block.timestamp,
            processedAt: 0,
            processedBy: address(0)
        });
        
        // Update ETH collected
        totalEthCollected += ethRequired;
        
        // Refund excess ETH if any
        if (msg.value > ethRequired) {
            payable(msg.sender).transfer(msg.value - ethRequired);
        }
        
        emit TokenRequested(tokenRequestCounter, msg.sender, amountInTokens, ethRequired, reason, block.timestamp);
    }
    
    // Step 2: Admin approves request and tokens are transferred immediately
    function approveTokenRequest(uint256 requestId) external onlyOwnerOrAdmin {
        require(requestId > 0 && requestId <= tokenRequestCounter, "Invalid request ID");
        TokenRequest storage request = tokenRequests[requestId];
        require(request.status == RequestStatus.Pending, "Request not pending");
        require(userProfiles[request.student].isActive && userProfiles[request.student].role == UserRole.Student, "Student must be active");
        
        uint256 amountInWei = request.amountInTokens * 10**18;
        uint256 contractBalance = crstToken.balanceOf(address(this));
        
        // Mint tokens if needed
        if (contractBalance < amountInWei) {
            uint256 remainingSupply = crstToken.getRemainingSupply();
            uint256 neededTokens = amountInWei - contractBalance;
            require(neededTokens <= remainingSupply, "Not enough tokens available");
            
            crstToken.mint(address(this), neededTokens);
        }
        
        // Transfer tokens immediately to student
        require(crstToken.transfer(request.student, amountInWei), "Token transfer failed");
        
        // Update request status
        request.status = RequestStatus.Completed;
        request.processedAt = block.timestamp;
        request.processedBy = msg.sender;
        
        emit TokenRequestApproved(requestId, request.student, request.amountInTokens, msg.sender);
        emit TokenPurchaseCompleted(requestId, request.student, request.amountInTokens, request.ethRequired);
    }
    
    // Reject token request and refund ETH
    function rejectTokenRequest(uint256 requestId) external onlyOwnerOrAdmin {
        require(requestId > 0 && requestId <= tokenRequestCounter, "Invalid request ID");
        TokenRequest storage request = tokenRequests[requestId];
        require(request.status == RequestStatus.Pending, "Request not pending");
        
        // Update request status
        request.status = RequestStatus.Rejected;
        request.processedAt = block.timestamp;
        request.processedBy = msg.sender;
        
        // Refund ETH to student
        totalEthCollected -= request.ethRequired;
        payable(request.student).transfer(request.ethRequired);
        
        emit TokenRequestRejected(requestId, request.student, msg.sender);
    }
    
    // NEW: Students can return CRST tokens for ETH (with 0.5% fee)
    function returnCRSTForETH(uint256 crstAmount) external nonReentrant whenNotPaused onlyStudent {
        require(crstAmount > 0, "Amount must be greater than 0");
        require(crstToken.balanceOf(msg.sender) >= crstAmount, "Insufficient CRST balance");
        
        // Calculate ETH equivalent
        uint256 ethEquivalent = crstAmount / ETH_TO_CRST_RATE;
        require(ethEquivalent > 0, "CRST amount too small");
        
        // Calculate 0.5% fee
        uint256 feeAmount = (ethEquivalent * RETURN_FEE_PERCENT) / 10000;
        uint256 ethToReturn = ethEquivalent - feeAmount;
        
        // Check contract has enough ETH
        require(address(this).balance >= ethToReturn, "Insufficient contract ETH balance");
        
        // Check student has approved contract to take their CRST
        require(crstToken.allowance(msg.sender, address(this)) >= crstAmount, "Please approve contract to spend your CRST tokens");
        
        // Transfer CRST from student to contract
        require(crstToken.transferFrom(msg.sender, address(this), crstAmount), "CRST transfer failed");
        
        // Transfer ETH to student (minus fee)
        payable(msg.sender).transfer(ethToReturn);
        
        // Update tracking
        totalEthReturned += ethToReturn;
        totalReturnFees += feeAmount;
        
        // Auto-burn excess CRST happens automatically when tokens are transferred to contract
        emit CRSTReturned(msg.sender, crstAmount, ethToReturn, feeAmount);
        emit AutoBurnTriggered("CRST return - auto-burn check triggered");
    }
    
    // AUTO-BURN APPROACH 1: Withdraw ETH and burn equivalent CRST tokens
    function withdrawEth(uint256 amountInWei) external onlyOwner {
        require(amountInWei > 0, "Amount must be greater than zero");
        require(beneficiary != address(0), "No beneficiary set");
        require(amountInWei <= address(this).balance, "Insufficient contract ETH balance");
        
        // AUTO-BURN APPROACH 1: Burn equivalent CRST tokens when withdrawing ETH
        crstToken.burnForEthWithdrawal(amountInWei);
        uint256 tokensBurned = amountInWei * ETH_TO_CRST_RATE;
        
        payable(beneficiary).transfer(amountInWei);
        
        emit EthWithdrawn(beneficiary, amountInWei, msg.sender, tokensBurned);
        emit AutoBurnTriggered("ETH withdrawal - burned equivalent CRST");
    }
    
    // AUTO-BURN APPROACH 1: Withdraw all ETH and burn equivalent CRST tokens
    function withdrawAllEth() external onlyOwner {
        uint256 contractBalance = address(this).balance;
        require(contractBalance > 0, "No ETH to withdraw");
        require(beneficiary != address(0), "No beneficiary set");
        
        // AUTO-BURN APPROACH 1: Burn equivalent CRST tokens
        crstToken.burnForEthWithdrawal(contractBalance);
        uint256 tokensBurned = contractBalance * ETH_TO_CRST_RATE;
        
        payable(beneficiary).transfer(contractBalance);
        
        emit EthWithdrawn(beneficiary, contractBalance, msg.sender, tokensBurned);
        emit AutoBurnTriggered("All ETH withdrawal - burned equivalent CRST");
    }
    
    // Withdraw token fees to beneficiary
    function withdrawTokenFees(uint256 amountInTokens) external onlyOwner {
        require(amountInTokens > 0, "Amount must be greater than zero");
        require(beneficiary != address(0), "No beneficiary set");
        
        uint256 amountInWei = amountInTokens * 10**18;
        uint256 contractBalance = crstToken.balanceOf(address(this));
        require(amountInWei <= contractBalance, "Insufficient contract token balance");
        
        require(crstToken.transfer(beneficiary, amountInWei), "Token transfer failed");
        
        // Auto-burn happens automatically when contract balance changes
        emit TokenFeesWithdrawn(beneficiary, amountInWei, msg.sender);
        emit AutoBurnTriggered("Token fee withdrawal - auto-burn check triggered");
    }
    
    // Remove manual trigger function since auto-burn is automatic
    
    // Set beneficiary
    function setBeneficiary(address _beneficiary) external onlyOwner {
        require(_beneficiary != address(0), "Invalid beneficiary address");
        require(_beneficiary != beneficiary, "Same beneficiary");
        
        address oldBeneficiary = beneficiary;
        beneficiary = _beneficiary;
        
        emit BeneficiaryUpdated(oldBeneficiary, _beneficiary, msg.sender);
    }
    
    // View functions
    function getCourse(uint256 courseId) external view returns (Course memory) {
        require(courses[courseId].id != 0, "Course not found");
        return courses[courseId];
    }
    
    function getAllCourseIds() external view returns (uint256[] memory) {
        return courseIds;
    }
    
    function getStudentCourses(address student) external view returns (uint256[] memory) {
        return studentCourses[student];
    }
    
    function getTokenRequest(uint256 requestId) external view returns (TokenRequest memory) {
        require(requestId > 0 && requestId <= tokenRequestCounter, "Invalid request ID");
        return tokenRequests[requestId];
    }
    
    function getPendingTokenRequests() external view returns (TokenRequest[] memory) {
        uint256 pendingCount = 0;
        for (uint256 i = 1; i <= tokenRequestCounter; i++) {
            if (tokenRequests[i].status == RequestStatus.Pending) {
                pendingCount++;
            }
        }
        
        TokenRequest[] memory pendingRequests = new TokenRequest[](pendingCount);
        uint256 index = 0;
        
        for (uint256 i = 1; i <= tokenRequestCounter; i++) {
            if (tokenRequests[i].status == RequestStatus.Pending) {
                pendingRequests[index] = tokenRequests[i];
                index++;
            }
        }
        
        return pendingRequests;
    }
    
    // Get approved token requests waiting for finalization (REMOVED - no longer needed)
    // This function is no longer needed since tokens are transferred immediately on approval
    
    // Get system statistics including supply info
    function getSystemStats() external view returns (
        uint256 totalCourses,
        uint256 totalStudents,
        uint256 totalFeesCollectedAmount,
        uint256 totalEthCollectedAmount,
        uint256 totalEthReturnedAmount,
        uint256 totalReturnFeesAmount,
        uint256 totalTokenRequests,
        uint256 currentSupply,
        uint256 contractTokenBalance,
        bool willAutoBurn,
        uint256 autoBurnAmount
    ) {
        (willAutoBurn, autoBurnAmount) = crstToken.willAutoBurnTrigger();
        
        return (
            courseIds.length,
            totalStudentsRegistered,
            totalFeesCollected,
            totalEthCollected,
            totalEthReturned,
            totalReturnFees,
            tokenRequestCounter,
            crstToken.totalSupply(),
            crstToken.balanceOf(address(this)),
            willAutoBurn,
            autoBurnAmount
        );
    }
    
    function getContractTokenBalance() external view returns (uint256) {
        return crstToken.balanceOf(address(this));
    }
    
    function getContractEthBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    function getRequiredEthForTokens(uint256 amountInTokens) external pure returns (uint256) {
        return (amountInTokens * 10**18) / ETH_TO_CRST_RATE;
    }
    
    // Helper function to calculate total fees for multiple courses (CART HELPER)
    function calculateTotalFeesForCourses(uint256[] calldata courseIds) external view returns (uint256 totalFee, bool allValid, string memory errorMessage) {
        if (courseIds.length == 0) {
            return (0, false, "No courses provided");
        }
        
        if (courseIds.length > 10) {
            return (0, false, "Maximum 10 courses per transaction");
        }
        
        totalFee = 0;
        
        for (uint256 i = 0; i < courseIds.length; i++) {
            uint256 courseId = courseIds[i];
            
            // Check if course exists
            if (courses[courseId].id == 0) {
                return (0, false, "One or more courses do not exist");
            }
            
            // Check if course is active
            if (!courses[courseId].isActive) {
                return (0, false, "One or more courses are inactive");
            }
            
            totalFee += courses[courseId].feeInTokens * 10**18;
        }
        
        return (totalFee, true, "");
    }
    
    // Helper function to check if student can pay for courses (CART VALIDATION)
    function canStudentPayForCourses(address student, uint256[] calldata courseIds) external view returns (bool canPay, string memory reason, uint256 totalRequired, uint256 studentBalance, uint256 studentAllowance) {
        // Check if student is active
        if (!userProfiles[student].isActive || userProfiles[student].role != UserRole.Student) {
            return (false, "Student not active", 0, 0, 0);
        }
        
        // Calculate total required and validate registrations
        (uint256 totalFee, bool allValid, string memory errorMsg) = this.calculateTotalFeesForCourses(courseIds);
        
        if (!allValid) {
            return (false, errorMsg, 0, 0, 0);
        }
        
        // Check registrations and payment status
        for (uint256 i = 0; i < courseIds.length; i++) {
            uint256 courseId = courseIds[i];
            
            if (registrations[student][courseId].student == address(0)) {
                return (false, "Not registered for all courses", totalFee, 0, 0);
            }
            
            if (registrations[student][courseId].hasPaid) {
                return (false, "Already paid for some courses", totalFee, 0, 0);
            }
        }
        
        // Check balances
        studentBalance = crstToken.balanceOf(student);
        studentAllowance = crstToken.allowance(student, address(this));
        
        if (studentBalance < totalFee) {
            return (false, "Insufficient CRST balance", totalFee, studentBalance, studentAllowance);
        }
        
        if (studentAllowance < totalFee) {
            return (false, "Insufficient allowance - please approve more CRST", totalFee, studentBalance, studentAllowance);
        }
        
        return (true, "Ready to pay", totalFee, studentBalance, studentAllowance);
    }
    
    // Get student's unpaid registered courses (for cart display)
    function getStudentUnpaidCourses(address student) external view returns (uint256[] memory unpaidCourseIds, uint256[] memory fees) {
        uint256[] memory studentCourseIds = studentCourses[student];
        uint256 unpaidCount = 0;
        
        // Count unpaid courses
        for (uint256 i = 0; i < studentCourseIds.length; i++) {
            uint256 courseId = studentCourseIds[i];
            if (!registrations[student][courseId].hasPaid) {
                unpaidCount++;
            }
        }
        
        // Create arrays for unpaid courses
        unpaidCourseIds = new uint256[](unpaidCount);
        fees = new uint256[](unpaidCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < studentCourseIds.length; i++) {
            uint256 courseId = studentCourseIds[i];
            if (!registrations[student][courseId].hasPaid) {
                unpaidCourseIds[index] = courseId;
                fees[index] = courses[courseId].feeInTokens;
                index++;
            }
        }
        
        return (unpaidCourseIds, fees);
    }
    
    // Emergency pause
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    // Receive ETH
    receive() external payable {}
    fallback() external payable {}
}