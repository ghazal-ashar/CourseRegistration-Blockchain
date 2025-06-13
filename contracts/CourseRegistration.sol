// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

// Interface to interact with CRST token contract
interface ICRSTToken {
    function mint(address to, uint256 amount) external;
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
}

/**
 * Course Registration System with Wallet-Only Authentication
 * Handles course registration, payments, and user management using only wallet addresses
 * Authors: Ghazal E Ashar & Shahzeb Ahmed Iqbal
 */
contract CourseRegistration is ReentrancyGuard, Pausable, Ownable {

    // Reference to token contract - cannot be changed after deployment
    ICRSTToken public immutable crstToken;
    
    // Address that receives withdrawn fees
    address public beneficiary;
    
    // Simple role system - either Student or Admin
    enum UserRole { Student, Admin }
    
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
    
    // Stores requests for additional tokens
    struct TokenRequest {
        uint256 id;             // Unique request ID
        address student;        // Who requested tokens
        uint256 amountInTokens; // How many tokens requested (without 18 decimals)
        string reason;          // Why they need tokens
        bool isPending;         // Whether request is still pending
        bool isApproved;        // Whether request was approved (only valid if not pending)
        uint256 timestamp;      // When request was made
        uint256 processedAt;    // When request was processed
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
    
    // Total fees collected by the contract
    uint256 public totalFeesCollected;
    
    // Total number of unique students registered
    uint256 public totalStudentsRegistered;
    
    // Maximum fee a course can charge (in tokens, without decimals)
    uint256 public constant MAX_COURSE_FEE = 10000;
    
    // Maximum capacity for any course
    uint256 public constant MAX_COURSE_CAPACITY = 1000;
    
    // Maximum credit hours for any course
    uint8 public constant MAX_CREDIT_HOURS = 6;
    
    // Course management events
    event CourseAdded(uint256 indexed courseId, string name, uint256 feeInTokens, address indexed admin);
    event CourseUpdated(uint256 indexed courseId, string name, uint256 feeInTokens, address indexed admin);
    event CourseDeactivated(uint256 indexed courseId, address indexed admin);
    event CourseActivated(uint256 indexed courseId, address indexed admin);
    
    // Student activity events
    event StudentRegistered(address indexed student, uint256 indexed courseId, uint256 timestamp);
    event FeesPaid(address indexed student, uint256 indexed courseId, uint256 amount, uint256 timestamp);
    
    // Token request events
    event TokenRequested(uint256 indexed requestId, address indexed student, uint256 amountInTokens, string reason, uint256 timestamp);
    event TokenRequestApproved(uint256 indexed requestId, address indexed student, uint256 amountInTokens, address indexed admin);
    event TokenRequestRejected(uint256 indexed requestId, address indexed student, address indexed admin);
    event TokensMinted(address indexed to, uint256 amount);
    
    // User management events
    event UserProfileCreated(address indexed user, UserRole role, uint256 timestamp);
    event AdminRequested(address indexed pendingAdmin);
    event AdminApproved(address indexed admin, address indexed approvedBy);
    event AdminRejected(address indexed admin, address indexed rejectedBy);
    event UserDeactivated(address indexed user, address indexed deactivatedBy);
    
    // Financial events
    event FeesWithdrawn(address indexed beneficiary, uint256 amount, address indexed withdrawnBy);
    event BeneficiaryUpdated(address indexed oldBeneficiary, address indexed newBeneficiary, address indexed updatedBy);
    
    // Ensures course ID is valid and course is active
    modifier validCourseId(uint256 courseId) {
        require(courseId >= 100 && courseId <= 999 && courses[courseId].isActive, "Invalid/inactive course");
        _;
    }
    
    // Ensures course exists (regardless of active status)
    modifier courseExists(uint256 courseId) {
        require(courseId >= 100 && courseId <= 999 && courses[courseId].id != 0, "Course not found");
        _;
    }
    
    // Ensures student is not already registered for this course
    modifier notRegistered(address student, uint256 courseId) {
        require(registrations[student][courseId].student == address(0), "Already registered");
        _;
    }
    
    // Ensures student is registered for this course
    modifier isRegistered(address student, uint256 courseId) {
        require(registrations[student][courseId].student != address(0), "Not registered");
        _;
    }
    
    // Ensures student hasn't paid for this course yet
    modifier hasNotPaid(address student, uint256 courseId) {
        require(!registrations[student][courseId].hasPaid, "Already paid");
        _;
    }
    
    // Ensures token request is valid and still pending
    modifier validTokenRequest(uint256 requestId) {
        require(requestId > 0 && requestId <= tokenRequestCounter && tokenRequests[requestId].isPending, "Invalid/processed request");
        _;
    }
    
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
    
    // Ensures caller is an active admin
    modifier onlyAdmin() {
        require(
            userProfiles[msg.sender].isActive && 
            userProfiles[msg.sender].role == UserRole.Admin,
            "Only active admins allowed"
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
        crstToken = ICRSTToken(_tokenAddress);
        beneficiary = _beneficiary;
    }
    
    // Register as a student - wallet address only
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
    
    // Check if user is registered and active
    function isUserActive(address user) external view returns (bool) {
        return userProfiles[user].isActive;
    }
    
    // Deactivate a user account (only owner or admins)
    function deactivateUser(address userAddress) external onlyOwnerOrAdmin {
        require(userProfiles[userAddress].isActive, "User already inactive");
        require(userAddress != owner(), "Cannot deactivate contract owner");
        
        userProfiles[userAddress].isActive = false;
        emit UserDeactivated(userAddress, msg.sender);
    }
    
    // Create a new course (only owner or admins)
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
        
        // Create the course
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
    
    // Update course details (only owner or admins)
    function updateCourse(
        uint256 courseId, 
        string calldata name, 
        string calldata description, 
        uint8 creditHours, 
        uint256 feeInTokens, 
        uint16 capacity
    ) external onlyOwnerOrAdmin courseExists(courseId) {
        require(bytes(name).length > 0, "Course name required");
        require(creditHours > 0 && creditHours <= MAX_CREDIT_HOURS, "Invalid credit hours");
        require(feeInTokens > 0 && feeInTokens <= MAX_COURSE_FEE, "Invalid fee");
        require(capacity > 0 && capacity <= MAX_COURSE_CAPACITY, "Invalid capacity");
        
        Course storage course = courses[courseId];
        require(capacity >= course.enrolled, "Capacity cannot be less than enrolled students");
        
        // Update course details
        course.name = name;
        course.description = description;
        course.creditHours = creditHours;
        course.feeInTokens = feeInTokens;
        course.capacity = capacity;
        
        emit CourseUpdated(courseId, name, feeInTokens, msg.sender);
    }
    
    // Deactivate a course (only owner or admins)
    function deactivateCourse(uint256 courseId) external onlyOwnerOrAdmin courseExists(courseId) {
        courses[courseId].isActive = false;
        emit CourseDeactivated(courseId, msg.sender);
    }
    
    // Reactivate a course (only owner or admins)
    function activateCourse(uint256 courseId) external onlyOwnerOrAdmin courseExists(courseId) {
        courses[courseId].isActive = true;
        emit CourseActivated(courseId, msg.sender);
    }
    
    // Register for a course (students only)
    function registerForCourse(uint256 courseId) 
        external 
        whenNotPaused 
        onlyStudent 
        validCourseId(courseId) 
        notRegistered(msg.sender, courseId) 
    {
        Course storage course = courses[courseId];
        require(course.enrolled < course.capacity, "Course is full");
        
        // Create registration record
        registrations[msg.sender][courseId] = Registration({
            student: msg.sender,
            courseId: courseId,
            timestamp: block.timestamp,
            hasPaid: false,
            paidAmount: 0,
            paidAt: 0
        });
        
        // Add to student's course list
        studentCourses[msg.sender].push(courseId);
        course.enrolled++;
        
        // Track unique students
        if (studentCourses[msg.sender].length == 1) {
            totalStudentsRegistered++;
        }
        
        emit StudentRegistered(msg.sender, courseId, block.timestamp);
    }
    
    // Pay course fee (students only)
    function payFee(uint256 courseId) 
        external 
        nonReentrant 
        whenNotPaused 
        onlyStudent 
        courseExists(courseId) 
        isRegistered(msg.sender, courseId) 
        hasNotPaid(msg.sender, courseId) 
    {
        Course memory course = courses[courseId];
        Registration storage registration = registrations[msg.sender][courseId];
        
        // Calculate required fee (convert to wei)
        uint256 requiredFee = course.feeInTokens * 10**18;
        
        // Check balance and allowance
        require(crstToken.balanceOf(msg.sender) >= requiredFee, "Insufficient token balance");
        require(crstToken.allowance(msg.sender, address(this)) >= requiredFee, "Insufficient token allowance");
        
        // Transfer tokens from student to contract
        require(crstToken.transferFrom(msg.sender, address(this), requiredFee), "Token transfer failed");
        
        // Update registration record
        registration.hasPaid = true;
        registration.paidAmount = requiredFee;
        registration.paidAt = block.timestamp;
        
        // Update contract totals
        totalFeesCollected += requiredFee;
        
        emit FeesPaid(msg.sender, courseId, requiredFee, block.timestamp);
    }
    
    // Request additional tokens (students only)
    function requestTokens(uint256 amountInTokens, string calldata reason) 
        external 
        whenNotPaused 
        onlyStudent 
    {
        require(amountInTokens > 0 && amountInTokens <= 10000, "Invalid token amount");
        require(bytes(reason).length > 0 && bytes(reason).length <= 500, "Invalid reason");
        
        tokenRequestCounter++;
        
        // Create token request
        tokenRequests[tokenRequestCounter] = TokenRequest({
            id: tokenRequestCounter,
            student: msg.sender,
            amountInTokens: amountInTokens,
            reason: reason,
            isPending: true,
            isApproved: false,
            timestamp: block.timestamp,
            processedAt: 0,
            processedBy: address(0)
        });
        
        emit TokenRequested(tokenRequestCounter, msg.sender, amountInTokens, reason, block.timestamp);
    }
    
    // Mint tokens directly to admin's wallet (only owner or admins)
    function mintTokensToSelf(uint256 amountInTokens) external onlyOwnerOrAdmin {
        require(amountInTokens > 0, "Amount must be greater than 0");
        require(amountInTokens <= 100000, "Cannot mint more than 100,000 tokens at once");
        
        uint256 amountInWei = amountInTokens * 10**18;
        
        // Mint tokens directly to the admin's wallet
        crstToken.mint(msg.sender, amountInWei);
        
        emit TokensMinted(msg.sender, amountInWei);
    }
    
    // Transfer tokens from admin to student (only owner or admins)
    function transferTokensToStudent(address student, uint256 amountInTokens) external onlyOwnerOrAdmin {
        require(student != address(0), "Invalid student address");
        require(amountInTokens > 0, "Amount must be greater than 0");
        require(userProfiles[student].isActive && userProfiles[student].role == UserRole.Student, "Student must be registered and active");
        
        uint256 amountInWei = amountInTokens * 10**18;
        
        // Check admin has enough balance
        require(crstToken.balanceOf(msg.sender) >= amountInWei, "Insufficient admin token balance");
        
        // Transfer tokens from admin to student
        require(crstToken.transferFrom(msg.sender, student, amountInWei), "Token transfer failed");
        
        emit TokensMinted(student, amountInWei); // Using same event for consistency
    }
    
    // Approve token request with choice of mint or transfer (only owner or admins)
    function approveTokenRequest(uint256 requestId, bool mintNew) 
        external 
        onlyOwnerOrAdmin 
        validTokenRequest(requestId) 
    {
        TokenRequest storage request = tokenRequests[requestId];
        uint256 amountInWei = request.amountInTokens * 10**18;
        
        // Verify student is still active
        require(userProfiles[request.student].isActive && userProfiles[request.student].role == UserRole.Student, "Student must be active");
        
        // Update request status
        request.isPending = false;
        request.isApproved = true;
        request.processedAt = block.timestamp;
        request.processedBy = msg.sender;
        
        if (mintNew) {
            // Mint new tokens to student
            crstToken.mint(request.student, amountInWei);
        } else {
            // Transfer from admin's wallet
            require(crstToken.balanceOf(msg.sender) >= amountInWei, "Insufficient admin token balance");
            require(crstToken.transferFrom(msg.sender, request.student, amountInWei), "Token transfer failed");
        }
        
        emit TokensMinted(request.student, amountInWei);
        emit TokenRequestApproved(requestId, request.student, request.amountInTokens, msg.sender);
    }
    
    // Simple approve token request (always mints new tokens)
    function approveTokenRequestMint(uint256 requestId) 
        external 
        onlyOwnerOrAdmin 
        validTokenRequest(requestId) 
    {
        TokenRequest storage request = tokenRequests[requestId];
        uint256 amountInWei = request.amountInTokens * 10**18;
        
        // Verify student is still active
        require(userProfiles[request.student].isActive && userProfiles[request.student].role == UserRole.Student, "Student must be active");
        
        // Update request status
        request.isPending = false;
        request.isApproved = true;
        request.processedAt = block.timestamp;
        request.processedBy = msg.sender;
        
        // Mint tokens to student
        crstToken.mint(request.student, amountInWei);
        
        emit TokensMinted(request.student, amountInWei);
        emit TokenRequestApproved(requestId, request.student, request.amountInTokens, msg.sender);
    }
    
    // Reject a token request (only owner or admins)
    function rejectTokenRequest(uint256 requestId) 
        external 
        onlyOwnerOrAdmin 
        validTokenRequest(requestId) 
    {
        TokenRequest storage request = tokenRequests[requestId];
        
        // Update request status
        request.isPending = false;
        request.isApproved = false;
        request.processedAt = block.timestamp;
        request.processedBy = msg.sender;
        
        emit TokenRequestRejected(requestId, request.student, msg.sender);
    }
    
    // Get course details
    function getCourse(uint256 courseId) external view returns (Course memory) {
        require(courses[courseId].id != 0, "Course not found");
        return courses[courseId];
    }
    
    // Get all course IDs
    function getAllCourseIds() external view returns (uint256[] memory) {
        return courseIds;
    }
    
    // Get only active course IDs
    function getActiveCourseIds() external view returns (uint256[] memory) {
        uint256 activeCount = 0;
        uint256 length = courseIds.length;
        
        for (uint256 i = 0; i < length; i++) {
            if (courses[courseIds[i]].isActive) {
                activeCount++;
            }
        }
        
        uint256[] memory activeCourses = new uint256[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < length; i++) {
            if (courses[courseIds[i]].isActive) {
                activeCourses[index] = courseIds[i];
                index++;
            }
        }
        
        return activeCourses;
    }
    
    // Get courses a student is registered for
    function getStudentCourses(address student) external view returns (uint256[] memory) {
        return studentCourses[student];
    }
    
    // Get registration details
    function getRegistration(address student, uint256 courseId) external view returns (Registration memory) {
        require(registrations[student][courseId].student != address(0), "Registration not found");
        return registrations[student][courseId];
    }
    
    // Get token request details
    function getTokenRequest(uint256 requestId) external view returns (TokenRequest memory) {
        require(requestId > 0 && requestId <= tokenRequestCounter, "Invalid request ID");
        return tokenRequests[requestId];
    }
    
    // Get user profile by address - simplified without email
    function getUserProfile(address user) external view returns (
        address walletAddress,
        UserRole role,
        bool isActive,
        uint256 registeredAt
    ) {
        UserProfile memory profile = userProfiles[user];
        return (profile.walletAddress, profile.role, profile.isActive, profile.registeredAt);
    }
    
    // Get pending token requests (for admin review)
    function getPendingTokenRequests() external view returns (TokenRequest[] memory) {
        uint256 pendingCount = 0;
        for (uint256 i = 1; i <= tokenRequestCounter; i++) {
            if (tokenRequests[i].isPending) {
                pendingCount++;
            }
        }
        
        TokenRequest[] memory pendingRequests = new TokenRequest[](pendingCount);
        uint256 index = 0;
        
        for (uint256 i = 1; i <= tokenRequestCounter; i++) {
            if (tokenRequests[i].isPending) {
                pendingRequests[index] = tokenRequests[i];
                index++;
            }
        }
        
        return pendingRequests;
    }
    
    // Get system statistics
    function getSystemStats() external view returns (
        uint256 totalCourses,
        uint256 activeCourses,
        uint256 totalStudents,
        uint256 totalRegistrations,
        uint256 totalFeesCollectedAmount,
        uint256 totalTokenRequests,
        uint256 pendingTokenRequests
    ) {
        uint256 activeCount = 0;
        uint256 registrationCount = 0;
        uint256 pendingCount = 0;
        
        uint256 courseLength = courseIds.length;
        for (uint256 i = 0; i < courseLength; i++) {
            if (courses[courseIds[i]].isActive) {
                activeCount++;
            }
            registrationCount += courses[courseIds[i]].enrolled;
        }
        
        for (uint256 i = 1; i <= tokenRequestCounter; i++) {
            if (tokenRequests[i].isPending) {
                pendingCount++;
            }
        }
        
        return (
            courseLength,
            activeCount,
            totalStudentsRegistered,
            registrationCount,
            totalFeesCollected,
            tokenRequestCounter,
            pendingCount
        );
    }
    
    // Get contract's token balance
    function getContractBalance() external view returns (uint256) {
        return crstToken.balanceOf(address(this));
    }
    
    // Set new beneficiary address (only owner)
    function setBeneficiary(address _beneficiary) external onlyOwner {
        require(_beneficiary != address(0), "Invalid beneficiary address");
        require(_beneficiary != beneficiary, "Same beneficiary");
        
        address oldBeneficiary = beneficiary;
        beneficiary = _beneficiary;
        
        emit BeneficiaryUpdated(oldBeneficiary, _beneficiary, msg.sender);
    }
    
    // Withdraw specific amount of fees to beneficiary (only owner)
    function withdrawFees(uint256 amountInTokens) external onlyOwner {
        require(amountInTokens > 0, "Amount must be greater than zero");
        require(beneficiary != address(0), "No beneficiary set");
        
        uint256 amountInWei = amountInTokens * 10**18;
        uint256 contractBalance = crstToken.balanceOf(address(this));
        require(amountInWei <= contractBalance, "Insufficient contract balance");
        
        require(crstToken.transfer(beneficiary, amountInWei), "Token transfer failed");
        
        emit FeesWithdrawn(beneficiary, amountInWei, msg.sender);
    }
    
    // Withdraw all fees to beneficiary (only owner)
    function withdrawAllFees() external onlyOwner {
        uint256 contractBalance = crstToken.balanceOf(address(this));
        require(contractBalance > 0, "No fees to withdraw");
        require(beneficiary != address(0), "No beneficiary set");
        
        require(crstToken.transfer(beneficiary, contractBalance), "Token transfer failed");
        
        emit FeesWithdrawn(beneficiary, contractBalance, msg.sender);
    }
    
    // Pause the contract (only owner)
    function pause() external onlyOwner {
        _pause();
    }
    
    // Unpause the contract (only owner)
    function unpause() external onlyOwner {
        _unpause();
    }
    
    // Fallback function to receive ETH
    fallback() external payable {}
    
    // Receive function to accept ETH transfers
    receive() external payable {}
}