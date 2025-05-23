// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

// Import the CRSTToken contract from the separate file
// Make sure this path matches your file structure in Remix
import "./CRSTToken.sol";

/**
 * @title Course Registration System
 * @dev Smart contract for managing course registration and fee payments using CRST tokens
 * Inherits from CRSTToken to have direct access to all token functions
 * @author Ghazal E Ashar & Shahzeb Ahmed Iqbal
 */
contract CourseRegistration is CRSTToken, ReentrancyGuard, Pausable {

    address public beneficiary;
    
    struct Course {
        uint256 id;
        string name;
        string description;
        uint8 creditHours;
        uint256 feeInTokens;
        uint16 capacity;
        uint16 enrolled;
        bool isActive;
        uint256 createdAt;
        address createdBy;
    }
    
    struct UserProfile {
        string email;
        address walletAddress;
        bool isRegistered;
        uint256 registeredAt;
    }
    
    struct Registration {
        address student;
        uint256 courseId;
        uint256 timestamp;
        bool hasPaid;
        uint256 paidAmount;
        uint256 paidAt;
    }
    
    struct TokenRequest {
        uint256 id;
        address student;
        uint256 amountInTokens;
        string reason;
        bool isPending;
        bool isApproved;
        uint256 timestamp;
        uint256 processedAt;
        address processedBy;
    }
    
    mapping(uint256 => Course) public courses;
    mapping(address => mapping(uint256 => Registration)) public registrations;
    mapping(address => uint256[]) public studentCourses;
    mapping(uint256 => TokenRequest) public tokenRequests;
    mapping(address => UserProfile) public userProfiles;
    mapping(string => address) public emailToAddress;
    
    uint256[] public courseIds;
    uint256 public nextCourseId = 100;
    uint256 public tokenRequestCounter;
    uint256 public totalFeesCollected;
    uint256 public totalStudentsRegistered;
    
    uint256 public constant MAX_COURSE_FEE = 10000;
    uint256 public constant MAX_COURSE_CAPACITY = 1000;
    uint8 public constant MAX_CREDIT_HOURS = 6;
    
    event CourseAdded(uint256 indexed courseId, string name, uint256 feeInTokens, address indexed admin);
    event CourseUpdated(uint256 indexed courseId, string name, uint256 feeInTokens, address indexed admin);
    event CourseDeactivated(uint256 indexed courseId, address indexed admin);
    event CourseActivated(uint256 indexed courseId, address indexed admin);
    
    event StudentRegistered(address indexed student, uint256 indexed courseId, uint256 timestamp);
    event FeesPaid(address indexed student, uint256 indexed courseId, uint256 amount, uint256 timestamp);
    
    event TokenRequested(uint256 indexed requestId, address indexed student, uint256 amountInTokens, string reason, uint256 timestamp);
    event TokenRequestApproved(uint256 indexed requestId, address indexed student, uint256 amountInTokens, address indexed admin);
    event TokenRequestRejected(uint256 indexed requestId, address indexed student, address indexed admin);
    
    event UserProfileCreated(address indexed user, string email, uint256 timestamp);
    event FeesWithdrawn(address indexed beneficiary, uint256 amount, address indexed withdrawnBy);
    event BeneficiaryUpdated(address indexed oldBeneficiary, address indexed newBeneficiary, address indexed updatedBy);
    
    modifier validCourseId(uint256 courseId) {
        require(courseId >= 100 && courseId <= 999 && courses[courseId].isActive, "Invalid/inactive course");
        _;
    }
    
    modifier courseExists(uint256 courseId) {
        require(courseId >= 100 && courseId <= 999 && courses[courseId].id != 0, "Course not found");
        _;
    }
    
    modifier notRegistered(address student, uint256 courseId) {
        require(registrations[student][courseId].student == address(0), "Already registered");
        _;
    }
    
    modifier isRegistered(address student, uint256 courseId) {
        require(registrations[student][courseId].student != address(0), "Not registered");
        _;
    }
    
    modifier hasNotPaid(address student, uint256 courseId) {
        require(!registrations[student][courseId].hasPaid, "Already paid");
        _;
    }
    
    modifier validTokenRequest(uint256 requestId) {
        require(requestId > 0 && requestId <= tokenRequestCounter && tokenRequests[requestId].isPending, "Invalid/processed request");
        _;
    }
    
    modifier onlyRegisteredUser() {
        require(userProfiles[msg.sender].isRegistered, "Not registered");
        _;
    }
    
    constructor(address initialOwner, address _beneficiary) CRSTToken(initialOwner) {
        require(_beneficiary != address(0), "Invalid beneficiary");
        beneficiary = _beneficiary;
    }
    
    function registerUserProfile(string memory email) external {
        require(!userProfiles[msg.sender].isRegistered && emailToAddress[email] == address(0) && bytes(email).length > 4, "Invalid registration");
        require(_isValidEmail(email), "Invalid email");
        
        userProfiles[msg.sender] = UserProfile(email, msg.sender, true, block.timestamp);
        emailToAddress[email] = msg.sender;
        emit UserProfileCreated(msg.sender, email, block.timestamp);
    }
    
    function loginWithWallet(string memory email) external view returns (bool) {
        address expectedAddress = emailToAddress[email];
        require(expectedAddress == msg.sender && userProfiles[msg.sender].isRegistered, "Login failed");
        return true;
    }
    
    function _isValidEmail(string memory email) internal pure returns (bool) {
        bytes memory emailBytes = bytes(email);
        if (emailBytes.length < 5) return false;
        
        bool hasAt = false;
        bool hasDot = false;
        
        for (uint i = 0; i < emailBytes.length; i++) {
            if (emailBytes[i] == "@") {
                if (hasAt) return false;
                hasAt = true;
            }
            if (emailBytes[i] == "." && hasAt) {
                hasDot = true;
            }
        }
        return hasAt && hasDot;
    }
    
    function addCourse(string memory name, string memory description, uint8 creditHours, uint256 feeInTokens, uint16 capacity) external onlyOwner whenNotPaused {
        require(bytes(name).length > 0 && creditHours > 0 && creditHours <= MAX_CREDIT_HOURS && feeInTokens > 0 && feeInTokens <= MAX_COURSE_FEE && capacity > 0 && capacity <= MAX_COURSE_CAPACITY && nextCourseId <= 999, "Invalid params");
        
        uint256 courseId = nextCourseId++;
        courses[courseId] = Course(courseId, name, description, creditHours, feeInTokens, capacity, 0, true, block.timestamp, msg.sender);
        courseIds.push(courseId);
        emit CourseAdded(courseId, name, feeInTokens, msg.sender);
    }
    
    function updateCourse(uint256 courseId, string memory name, string memory description, uint8 creditHours, uint256 feeInTokens, uint16 capacity) external onlyOwner whenNotPaused courseExists(courseId) {
        require(bytes(name).length > 0 && creditHours > 0 && creditHours <= MAX_CREDIT_HOURS && feeInTokens > 0 && feeInTokens <= MAX_COURSE_FEE && capacity > 0 && capacity <= MAX_COURSE_CAPACITY, "Invalid params");
        
        Course storage course = courses[courseId];
        require(capacity >= course.enrolled, "Capacity too low");
        
        course.name = name;
        course.description = description;
        course.creditHours = creditHours;
        course.feeInTokens = feeInTokens;
        course.capacity = capacity;
        
        emit CourseUpdated(courseId, name, feeInTokens, msg.sender);
    }
    
    function deactivateCourse(uint256 courseId) external onlyOwner courseExists(courseId) {
        require(courses[courseId].isActive, "Already inactive");
        courses[courseId].isActive = false;
        emit CourseDeactivated(courseId, msg.sender);
    }
    
    function activateCourse(uint256 courseId) external onlyOwner courseExists(courseId) {
        require(!courses[courseId].isActive, "Already active");
        courses[courseId].isActive = true;
        emit CourseActivated(courseId, msg.sender);
    }
    
    function registerForCourse(uint256 courseId) external whenNotPaused onlyRegisteredUser validCourseId(courseId) notRegistered(msg.sender, courseId) {
        Course storage course = courses[courseId];
        require(course.enrolled < course.capacity, "Course full");
        
        registrations[msg.sender][courseId] = Registration(msg.sender, courseId, block.timestamp, false, 0, 0);
        studentCourses[msg.sender].push(courseId);
        course.enrolled++;
        
        if (studentCourses[msg.sender].length == 1) {
            totalStudentsRegistered++;
        }
        
        emit StudentRegistered(msg.sender, courseId, block.timestamp);
    }
    
    function payFee(uint256 courseId) external nonReentrant whenNotPaused onlyRegisteredUser courseExists(courseId) isRegistered(msg.sender, courseId) hasNotPaid(msg.sender, courseId) {
        Course memory course = courses[courseId];
        Registration storage registration = registrations[msg.sender][courseId];
        
        uint256 requiredFee = course.feeInTokens * 10**18;
        require(balanceOf(msg.sender) >= requiredFee && allowance(msg.sender, address(this)) >= requiredFee, "Insufficient balance/approval");
        
        _transfer(msg.sender, address(this), requiredFee);
        
        registration.hasPaid = true;
        registration.paidAmount = requiredFee;
        registration.paidAt = block.timestamp;
        
        totalFeesCollected += requiredFee;
        emit FeesPaid(msg.sender, courseId, requiredFee, block.timestamp);
    }
    
    // Token Request Functions
    
    function requestTokens(uint256 amountInTokens, string memory reason) external whenNotPaused onlyRegisteredUser {
        require(amountInTokens > 0, "Zero amount");
        require(amountInTokens <= 10000, "Too much");
        require(bytes(reason).length > 0, "Empty reason");
        require(bytes(reason).length <= 500, "Reason too long");
        
        tokenRequestCounter++;
        
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
    
    function approveTokenRequest(uint256 requestId) external onlyOwner validTokenRequest(requestId) {
        TokenRequest storage request = tokenRequests[requestId];
        uint256 amountInWei = request.amountInTokens * 10**18;
        
        request.isPending = false;
        request.isApproved = true;
        request.processedAt = block.timestamp;
        request.processedBy = msg.sender;
        
        // Use inherited _mint function directly (no interface needed!)
        _mint(request.student, amountInWei);
        emit TokensMinted(request.student, amountInWei);
        
        emit TokenRequestApproved(requestId, request.student, request.amountInTokens, msg.sender);
    }
    
    function rejectTokenRequest(uint256 requestId) external onlyOwner validTokenRequest(requestId) {
        TokenRequest storage request = tokenRequests[requestId];
        
        request.isPending = false;
        request.isApproved = false;
        request.processedAt = block.timestamp;
        request.processedBy = msg.sender;
        
        emit TokenRequestRejected(requestId, request.student, msg.sender);
    }
    
    // View Functions
    
    function getCourse(uint256 courseId) external view returns (Course memory) {
        require(courses[courseId].id != 0, "Course not found");
        return courses[courseId];
    }
    
    function getActiveCourseIds() external view returns (uint256[] memory) {
        uint256 activeCount = 0;
        for (uint256 i = 0; i < courseIds.length; i++) {
            if (courses[courseIds[i]].isActive) {
                activeCount++;
            }
        }
        
        uint256[] memory activeCourses = new uint256[](activeCount);
        uint256 index = 0;
        for (uint256 i = 0; i < courseIds.length; i++) {
            if (courses[courseIds[i]].isActive) {
                activeCourses[index] = courseIds[i];
                index++;
            }
        }
        return activeCourses;
    }
    
    function getAllCourseIds() external view returns (uint256[] memory) {
        return courseIds;
    }
    
    function getRegistration(address student, uint256 courseId) external view returns (Registration memory) {
        return registrations[student][courseId];
    }
    
    function getStudentCourses(address student) external view returns (uint256[] memory) {
        return studentCourses[student];
    }
    
    function getTokenRequest(uint256 requestId) external view returns (TokenRequest memory) {
        require(requestId > 0 && requestId <= tokenRequestCounter, "Invalid ID");
        return tokenRequests[requestId];
    }
    
    function getPendingTokenRequests() external view returns (TokenRequest[] memory) {
        uint256 pendingCount = 0;
        for (uint256 i = 1; i <= tokenRequestCounter; i++) {
            if (tokenRequests[i].isPending) {
                pendingCount++;
            }
        }
        
        TokenRequest[] memory result = new TokenRequest[](pendingCount);
        uint256 resultIndex = 0;
        for (uint256 i = 1; i <= tokenRequestCounter; i++) {
            if (tokenRequests[i].isPending) {
                result[resultIndex] = tokenRequests[i];
                resultIndex++;
            }
        }
        return result;
    }
    
    function isUserRegistered(address user) external view returns (bool) {
        return userProfiles[user].isRegistered;
    }
    
    function getUserProfile(address user) external view returns (
        string memory email,
        address walletAddress,
        bool registered,
        uint256 registeredAt
    ) {
        UserProfile memory profile = userProfiles[user];
        return (profile.email, profile.walletAddress, profile.isRegistered, profile.registeredAt);
    }
    
    function getUserProfileByEmail(string memory email) external view returns (
        address walletAddress,
        bool registered,
        uint256 registeredAt
    ) {
        address userAddress = emailToAddress[email];
        if (userAddress == address(0)) {
            return (address(0), false, 0);
        }
        
        UserProfile memory profile = userProfiles[userAddress];
        return (profile.walletAddress, profile.isRegistered, profile.registeredAt);
    }
    
    function getSystemStats() external view returns (
        uint256 totalCourses,
        uint256 activeCourses,
        uint256 totalStudents,
        uint256 totalRegistrations,
        uint256 totalFeesCollectedAmount,
        uint256 totalTokenRequests,
        uint256 pendingTokenRequests
    ) {
        uint256 active = 0;
        uint256 totalRegs = 0;
        uint256 pending = 0;
        
        for (uint256 i = 0; i < courseIds.length; i++) {
            if (courses[courseIds[i]].isActive) {
                active++;
            }
            totalRegs += courses[courseIds[i]].enrolled;
        }
        
        for (uint256 i = 1; i <= tokenRequestCounter; i++) {
            if (tokenRequests[i].isPending) {
                pending++;
            }
        }
        
        return (
            courseIds.length,
            active,
            totalStudentsRegistered,
            totalRegs,
            totalFeesCollected,
            tokenRequestCounter,
            pending
        );
    }
    
    function getBeneficiary() external view returns (address) {
        return beneficiary;
    }
    
    // Use inherited balanceOf instead of custom function
    // Use inherited allowance instead of hasApprovedCRST
    // Use inherited approve instead of approveCRSTSpending
    
    // Admin Functions
    
    function setBeneficiary(address _beneficiary) external onlyOwner {
        require(_beneficiary != address(0), "Invalid address");
        require(_beneficiary != beneficiary, "Same address");
        
        address oldBeneficiary = beneficiary;
        beneficiary = _beneficiary;
        emit BeneficiaryUpdated(oldBeneficiary, _beneficiary, msg.sender);
    }
    
    function withdrawFees(uint256 amountInTokens) external onlyOwner {
        require(amountInTokens > 0, "Zero amount");
        require(beneficiary != address(0), "No beneficiary");
        
        uint256 amountInWei = amountInTokens * 10**18;
        // Use inherited balanceOf function
        require(amountInWei <= balanceOf(address(this)), "Insufficient balance");
        
        // Use inherited _transfer function
        _transfer(address(this), beneficiary, amountInWei);
        emit FeesWithdrawn(beneficiary, amountInWei, msg.sender);
    }
    
    function withdrawAllFees() external onlyOwner {
        require(beneficiary != address(0), "No beneficiary");
        
        // Use inherited balanceOf function
        uint256 contractBalance = balanceOf(address(this));
        require(contractBalance > 0, "No fees");
        
        // Use inherited _transfer function
        _transfer(address(this), beneficiary, contractBalance);
        emit FeesWithdrawn(beneficiary, contractBalance, msg.sender);
    }
    
    function getContractBalance() external view returns (uint256) {
        // Use inherited balanceOf function
        return balanceOf(address(this)) / 10**18;
    }
    
    function withdrawETH() external onlyOwner {
        uint256 ethBalance = address(this).balance;
        require(ethBalance > 0, "No ETH");
        payable(owner()).transfer(ethBalance);
    }
    
    function withdrawETHAmount(uint256 amountInWei) external onlyOwner {
        require(amountInWei > 0, "Zero amount");
        require(address(this).balance >= amountInWei, "Insufficient ETH");
        payable(owner()).transfer(amountInWei);
    }
    
    function getETHBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    receive() external payable {}
    fallback() external payable {}
}