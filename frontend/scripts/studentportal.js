/*
 * Enhanced Student Portal with Circuit Breaker Handling - blockchain-based course registration system.
 * Authors: Ghazal E Ashar & Shahzeb Ahmed Iqbal
 */

// 1. GLOBAL VARIABLES & CONFIGURATION

// Session and authentication state
let userSession = null;              // Stores user session data from login.js
let isInitialized = false;           // Prevents multiple initializations

// Blockchain connection objects
let provider = null;                 // Ethers.js provider for blockchain connection
let signer = null;                   // Signer for sending transactions
let courseRegistrationContract = null; // Main contract instance
let crstTokenContract = null;        // Token contract instance

// UI state management
let currentPaymentCourseId = null;   // ID of currently selected course for payment
let refreshInterval = null;          // Timer for periodic data refresh

// Data containers - these hold all the information displayed on the dashboard
let courses = [];                    // Array of all available courses
let registeredCourses = [];          // Array of courses student is registered for
let cartCourses = [];               // Array of courses in shopping cart
let tokenRequests = [];             // Array of student's token requests

// Balance information for display
let balances = {
    crst: '0.00',                   // Student's CRST balance
    eth: '0.000'                    // Student's ETH balance
};

// Contract constants (loaded dynamically from contracts)
let contractConstants = {
    exchangeRate: '1000',           // ETH to CRST exchange rate (loaded from contract)
    maxCourseFee: '10000',          // Maximum course fee (loaded from contract)
    returnFeePercent: '50'          // Return fee percentage (loaded from contract)
};

// 2. CIRCUIT BREAKER & ERROR HANDLING

/**
 * Test contract connection with retry logic for MetaMask circuit breaker
 * This handles MetaMask's circuit breaker issue by retrying failed calls
 */
async function testContractCall(contractCallFunction, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await contractCallFunction();
        } catch (error) {
            // Check for MetaMask circuit breaker error
            if (error.message && (
                error.message.includes('circuit breaker') ||
                error.message.includes('rate limit') ||
                error.message.includes('too many requests') ||
                error.code === -32603
            )) {
                console.warn(`⚠️ MetaMask circuit breaker detected, attempt ${attempt}/${maxRetries}`);
                
                if (attempt < maxRetries) {
                    // Wait 2 seconds before retrying
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    continue;
                } else {
                    throw new Error('MetaMask is temporarily overloaded. Please wait a moment and try again.');
                }
            }
            
            // For other errors, throw immediately
            throw error;
        }
    }
}

// 3. INITIALIZATION & STARTUP

/**
 * Main initialization function - runs when page loads
 * Sets up the entire student portal including blockchain connections and UI
 */
document.addEventListener('DOMContentLoaded', function() {
    // Prevent multiple initializations
    if (isInitialized) {
        console.log('Student portal already initialized');
        return;
    }
    
    // Prevent multiple initializations with DOM flag
    if (document.body.dataset.studentInit === 'true') {
        console.log('⚠️ Student portal already initializing, skipping...');
        return;
    }
    document.body.dataset.studentInit = 'true';
    
    console.log('🚀 Initializing Enhanced Student Portal v2.3...');
    
    // Check for redirect loops
    const redirectCount = parseInt(sessionStorage.getItem('studentRedirectCount') || '0');
    if (redirectCount > 3) {
        console.error('❌ Too many redirects detected, clearing session');
        removeStoredSession();
        sessionStorage.removeItem('studentRedirectCount');
        showMessage('Multiple redirects detected. Please login again.', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        return;
    }
    
    // Verify student session first
    if (!verifyStudentSession()) {
        console.log('❌ Student session verification failed, stopping initialization');
        sessionStorage.setItem('studentRedirectCount', (redirectCount + 1).toString());
        return;
    }
    
    // Clear redirect counter on successful verification
    sessionStorage.removeItem('studentRedirectCount');
    
    // Initialize blockchain contracts and dashboard
    initializeContracts().then(() => {
        initializeDashboard();      // Load all dashboard data
        setupEventListeners();      // Set up button clicks and modal events
        startPeriodicRefresh();     // Start auto-refresh timer
        isInitialized = true;
        console.log('✅ Student Portal v2.3 initialized successfully');
    }).catch(error => {
        console.error('❌ Failed to initialize student portal:', error);
        showMessage('Failed to connect to blockchain. Using demo mode.', 'warning');
        // Fall back to demo mode
        initializeDemoMode();
        setupEventListeners();
        isInitialized = true;
    });
});

/**
 * Verify student session using login.js session system
 * This checks if the user has valid student credentials
 */
function verifyStudentSession() {
    try {
        console.log('🔍 Checking student session...');
        
        const storedUser = getStoredSession();
        if (!storedUser) {
            console.log('❌ No session found');
            showMessage('No active session. Redirecting to login...', 'error');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
            return false;
        }
        
        try {
            userSession = JSON.parse(storedUser);
        } catch (e) {
            console.log('❌ Invalid session JSON, clearing and redirecting');
            removeStoredSession();
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
            return false;
        }
        
        // Validate session data
        if (!userSession.walletAddress || !userSession.role) {
            console.log('❌ Invalid session data:', userSession);
            removeStoredSession();
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
            return false;
        }
        
        // Check if user has student role (redirecting admins to admin portal)
        if (userSession.role === 'admin') {
            console.log('🔄 Admin detected, redirecting to admin portal');
            setTimeout(() => {
                window.location.href = 'adminportal.html';
            }, 1500);
            return false;
        }
        
        if (userSession.role !== 'student') {
            console.log('❌ User is not a student. Role:', userSession.role);
            showMessage('Access denied. Student role required.', 'error');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
            return false;
        }
        
        console.log('✅ Valid student session found:', userSession.email || userSession.walletAddress);
        updateUserUI();
        return true;
        
    } catch (error) {
        console.error('❌ Session verification failed:', error);
        showMessage('Session verification error. Redirecting to login...', 'error');
        removeStoredSession();
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        return false;
    }
}

// 4. SESSION MANAGEMENT HELPERS

/**
 * Get stored session from localStorage (with fallback to sessionStorage)
 * This matches the behavior in login.js
 */
function getStoredSession() {
    try {
        return localStorage.getItem('user');
    } catch (e) {
        console.warn('localStorage not available, using session storage');
        return sessionStorage.getItem('user');
    }
}

/**
 * Remove stored session data (used during logout)
 * This matches the cleanup behavior in login.js
 */
function removeStoredSession() {
    try {
        localStorage.removeItem('user');
        sessionStorage.removeItem('loginRedirecting');
    } catch (e) {
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('loginRedirecting');
    }
}

// 5. BLOCKCHAIN INTEGRATION

/**
 * Initialize blockchain contracts using existing connection from login.js
 * This reuses the connection instead of creating a new one
 */
async function initializeContracts() {
    // Check if user is using blockchain (from login.js session)
    if (!userSession || !userSession.usingBlockchain) {
        throw new Error('No blockchain integration available');
    }
    
    try {
        // FIRST: Try to reuse existing connection from login.js
        if (typeof window.provider !== 'undefined' && window.provider) {
            console.log('🔄 Reusing existing blockchain connection from login...');
            provider = window.provider;
            signer = window.signer;
            
            // Try to reuse contracts if they exist
            if (window.courseRegistrationContract && window.crstTokenContract) {
                console.log('📦 Reusing existing contract instances...');
                courseRegistrationContract = window.courseRegistrationContract;
                crstTokenContract = window.crstTokenContract;
                
                // Test the existing contracts with circuit breaker handling
                try {
                    await testContractCall(async () => {
                        const owner = await courseRegistrationContract.owner();
                        const symbol = await crstTokenContract.symbol();
                        return { owner, symbol };
                    });
                    console.log('✅ Reused contracts working with circuit breaker protection');
                    await loadContractConstants();
                    await verifyStudentRegistration();
                    return;
                } catch (testError) {
                    console.warn('⚠️ Existing contracts failed, will recreate...', testError.message);
                }
            }
        }
        
        // SECOND: Connect to MetaMask if no existing connection
        if (typeof window.ethereum !== 'undefined') {
            console.log('🔌 Creating new blockchain connection...');
            provider = new ethers.providers.Web3Provider(window.ethereum);
            signer = provider.getSigner();
            
            // Store for other pages to reuse
            window.provider = provider;
            window.signer = signer;
            
            // Verify we're connected to the right account
            const connectedAddress = await signer.getAddress();
            if (connectedAddress.toLowerCase() !== userSession.walletAddress.toLowerCase()) {
                console.warn('⚠️ MetaMask account mismatch:', {
                    session: userSession.walletAddress,
                    metamask: connectedAddress
                });
                showMessage('Warning: MetaMask account differs from session. Some functions may not work.', 'warning');
            }
            
            // Check if contract configuration is available
            if (typeof CONTRACT_CONFIG === 'undefined') {
                throw new Error('CONTRACT_CONFIG not found. Make sure config.js is loaded.');
            }
            
            if (!CONTRACT_CONFIG.ADDRESSES.COURSE_REGISTRATION || !CONTRACT_CONFIG.ADDRESSES.CRST_TOKEN) {
                throw new Error('Contract addresses not configured in CONTRACT_CONFIG');
            }
            
            console.log('🔧 Initializing contracts with addresses:', {
                courseRegistration: CONTRACT_CONFIG.ADDRESSES.COURSE_REGISTRATION,
                crstToken: CONTRACT_CONFIG.ADDRESSES.CRST_TOKEN
            });
            
            // Create contract instances using ethers.js
            courseRegistrationContract = new ethers.Contract(
                CONTRACT_CONFIG.ADDRESSES.COURSE_REGISTRATION,
                CONTRACT_CONFIG.ABIS.COURSE_REGISTRATION,
                signer
            );
            
            crstTokenContract = new ethers.Contract(
                CONTRACT_CONFIG.ADDRESSES.CRST_TOKEN,
                CONTRACT_CONFIG.ABIS.CRST_TOKEN,
                signer
            );
            
            // Store for other pages to reuse
            window.courseRegistrationContract = courseRegistrationContract;
            window.crstTokenContract = crstTokenContract;
            
            // Test contract connections with circuit breaker handling
            console.log('🧪 Testing contract connections...');
            
            try {
                await testContractCall(async () => {
                    const owner = await courseRegistrationContract.owner();
                    console.log('✅ CourseRegistration contract owner:', owner);
                    return owner;
                });
            } catch (ownerError) {
                console.error('❌ CourseRegistration contract test failed:', ownerError.message);
                throw new Error(`CourseRegistration contract not deployed or wrong address. Error: ${ownerError.message}`);
            }
            
            try {
                await testContractCall(async () => {
                    const symbol = await crstTokenContract.symbol();
                    console.log('✅ CRST token symbol:', symbol);
                    return symbol;
                });
            } catch (symbolError) {
                console.error('❌ CRST token contract test failed:', symbolError.message);
                throw new Error(`CRST token contract not deployed or wrong address. Error: ${symbolError.message}`);
            }
            
            console.log('✅ Contracts initialized successfully with circuit breaker protection');
            
            // Load contract constants dynamically
            await loadContractConstants();
            
            // Verify student registration on the blockchain
            await verifyStudentRegistration();
            
        } else {
            throw new Error('MetaMask not found');
        }
    } catch (error) {
        console.error('❌ Contract initialization failed:', error);
        
        let userMessage = 'Blockchain connection failed.';
        
        // Provide specific error messages for common issues
        if (error.message.includes('MetaMask is temporarily overloaded')) {
            userMessage = 'MetaMask is temporarily overloaded. Please wait a moment and try refreshing the page.';
        } else if (error.message.includes('circuit breaker')) {
            userMessage = 'MetaMask rate limit hit. Please wait a moment and try again.';
        } else if (error.message.includes('invalid block tag')) {
            userMessage = 'Your local blockchain is out of sync. Please restart your blockchain and redeploy contracts.';
        } else if (error.message.includes('not deployed')) {
            userMessage = 'Smart contracts not found. Please deploy contracts to your local blockchain.';
        } else if (error.message.includes('wrong address')) {
            userMessage = 'Contract addresses in config.js are incorrect. Please update after redeploying.';
        } else if (error.message.includes('JSON-RPC')) {
            userMessage = 'Cannot connect to blockchain. Make sure your local blockchain is running on http://127.0.0.1:8545';
        }
        
        showMessage(userMessage, 'error');
        throw error;
    }
}

/**
 * Load contract constants dynamically from smart contracts
 * This replaces hardcoded values with actual contract values
 */
async function loadContractConstants() {
    try {
        console.log('🔧 Loading contract constants...');
        
        if (courseRegistrationContract && crstTokenContract) {
            // Try to fetch contract constants with circuit breaker handling
            try {
                const constants = await testContractCall(async () => {
                    const exchangeRate = await courseRegistrationContract.ETH_TO_CRST_RATE();
                    const maxCourseFee = await courseRegistrationContract.MAX_COURSE_FEE();
                    const returnFeePercent = await courseRegistrationContract.RETURN_FEE_PERCENT();
                    return { exchangeRate, maxCourseFee, returnFeePercent };
                });
                
                contractConstants = {
                    exchangeRate: constants.exchangeRate.toString(),
                    maxCourseFee: constants.maxCourseFee.toString(),
                    returnFeePercent: constants.returnFeePercent.toString()
                };
                
                console.log('✅ Contract constants loaded:', contractConstants);
                
            } catch (error) {
                console.warn('⚠️ Could not fetch contract constants, using fallback values:', error.message);
                // Keep default fallback values if contract doesn't expose these constants
                contractConstants = {
                    exchangeRate: '1000',
                    maxCourseFee: '10000',
                    returnFeePercent: '50'
                };
            }
        }
        
    } catch (error) {
        console.error('❌ Failed to load contract constants:', error);
        // Use fallback values
        contractConstants = {
            exchangeRate: '1000',
            maxCourseFee: '10000',
            returnFeePercent: '50'
        };
    }
}

/**
 * Verify student registration on the smart contract
 * This checks if the connected wallet is registered as a student
 */
async function verifyStudentRegistration() {
    try {
        const walletAddress = await signer.getAddress();
        
        // Check if user has student profile in contract with circuit breaker handling
        try {
            const userProfile = await testContractCall(async () => {
                return await courseRegistrationContract.userProfiles(walletAddress);
            });
            
            const isActive = userProfile.isActive;
            const role = userProfile.role.toString(); // UserRole.Student = 0, UserRole.Admin = 1
            
            console.log('✅ Student profile verification:', { 
                isActive, 
                role: role === '0' ? 'Student' : 'Admin',
                walletAddress: walletAddress.slice(0, 6) + '...' + walletAddress.slice(-4)
            });
            
            if (!isActive) {
                console.warn('⚠️ Student is not active in smart contract');
                showMessage('Warning: Your account is not active on the blockchain. You may need to register again.', 'warning');
            } else if (role !== '0') {
                console.warn('⚠️ User role mismatch - expected student but got admin');
                showMessage('Role mismatch detected. Redirecting to appropriate portal...', 'info');
                setTimeout(() => {
                    window.location.href = 'adminportal.html';
                }, 2000);
                return;
            } else {
                console.log('✅ Student registration verified on blockchain');
            }
            
        } catch (error) {
            console.log('📝 No user profile found in contract or verification failed:', error.message);
            showMessage('Warning: Blockchain registration not verified. Some functions may be limited.', 'warning');
        }
        
    } catch (error) {
        console.error('❌ Student registration verification failed:', error);
        if (error.message.includes('MetaMask is temporarily overloaded')) {
            showMessage('MetaMask overloaded during verification. Some functions may be limited.', 'warning');
        } else {
            showMessage('Warning: Could not verify blockchain registration. Some functions may be limited.', 'warning');
        }
    }
}

/**
 * Initialize demo mode when blockchain is not available
 * This provides a functional experience without blockchain connectivity
 */
function initializeDemoMode() {
    console.log('📺 Initializing demo mode...');
    
    // Set demo data
    courses = [
        {
            id: "101",
            name: "Introduction to Blockchain",
            description: "Learn the fundamentals of blockchain technology and its applications.",
            creditHours: "3",
            feeInTokens: "100",
            capacity: "30",
            enrolled: "12",
            isActive: true
        },
        {
            id: "102",
            name: "Smart Contract Development",
            description: "An in-depth course on developing secure smart contracts with Solidity.",
            creditHours: "4",
            feeInTokens: "150",
            capacity: "25",
            enrolled: "20",
            isActive: true
        },
        {
            id: "103",
            name: "Decentralized Applications",
            description: "Build DApps using Web3.js, React, and Ethereum.",
            creditHours: "3",
            feeInTokens: "125",
            capacity: "20",
            enrolled: "15",
            isActive: true
        }
    ];
    
    registeredCourses = [
        {
            id: "101",
            name: "Introduction to Blockchain",
            creditHours: "3",
            feeInTokens: "100",
            registrationDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
            hasPaid: true
        }
    ];
    
    tokenRequests = [
        {
            id: "1",
            amountInTokens: "100",
            reason: "Need tokens for course fees",
            status: 0, // Pending
            timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000) // Yesterday
        }
    ];
    
    balances = {
        crst: '250.00',
        eth: '1.500'
    };
    
    cartCourses = [];
    
    // Update UI to show demo mode
    showMessage('Running in demo mode - blockchain features simulated', 'info');
    
    initializeDashboard();
    console.log('✅ Demo mode initialized');
}

// 6. DATA LOADING FUNCTIONS

/**
 * Initialize dashboard by loading all necessary data
 * This loads all the information displayed on the student dashboard
 */
async function initializeDashboard() {
    console.log('📊 Loading student dashboard data...');
    
    try {
        // Load all data concurrently for better performance
        await Promise.all([
            loadBalances(),         // Load wallet balances
            loadCourses(),          // Load all available courses
            loadRegisteredCourses(), // Load student's registered courses
            loadTokenRequests()     // Load student's token requests
        ]);
        
        // Update all UI components with loaded data
        updateBalanceDisplays();
        renderCourses();
        renderRegisteredCourses();
        renderTokenRequests();
        updateCartUI();
        updateWalletConnectionUI();
        
        console.log('✅ Dashboard loaded successfully');
    } catch (error) {
        console.error('❌ Dashboard loading failed:', error);
        showMessage('Some data failed to load. Check console for details.', 'warning');
    }
}

/**
 * Load wallet balances from blockchain
 * This gets CRST and ETH balances for display in the dashboard
 */
async function loadBalances() {
    try {
        if (provider && signer && crstTokenContract) {
            const walletAddress = await signer.getAddress();
            
            console.log('💰 Loading balances for:', walletAddress);
            
            // Get CRST balance with circuit breaker handling
            const crstBalanceWei = await testContractCall(async () => {
                return await crstTokenContract.balanceOf(walletAddress);
            });
            balances.crst = parseFloat(ethers.utils.formatEther(crstBalanceWei)).toFixed(2);
            
            // Get ETH balance with circuit breaker handling
            const ethBalanceWei = await testContractCall(async () => {
                return await provider.getBalance(walletAddress);
            });
            balances.eth = parseFloat(ethers.utils.formatEther(ethBalanceWei)).toFixed(3);
            
            console.log('💰 Balances loaded:', balances);
        } else {
            throw new Error('Contracts not available');
        }
    } catch (error) {
        console.error('❌ Failed to load balances:', error);
        if (error.message.includes('MetaMask is temporarily overloaded')) {
            showMessage('MetaMask overloaded while loading balances. Will retry automatically.', 'warning');
        }
        // Keep demo/error values
        balances = {
            crst: 'Error',
            eth: 'Error'
        };
    }
}

/**
 * Load all available courses from smart contract
 * This gets all courses that students can register for
 */
async function loadCourses() {
    try {
        if (courseRegistrationContract) {
            // Get list of all course IDs with circuit breaker handling
            const courseIds = await testContractCall(async () => {
                return await courseRegistrationContract.getAllCourseIds();
            });
            courses = [];
            
            // Load each course individually
            for (const courseId of courseIds) {
                try {
                    const course = await testContractCall(async () => {
                        return await courseRegistrationContract.getCourse(courseId);
                    });
                    
                    courses.push({
                        id: course.id.toString(),
                        name: course.name,
                        description: course.description,
                        creditHours: course.creditHours.toString(),
                        feeInTokens: course.feeInTokens.toString(),
                        capacity: course.capacity.toString(),
                        enrolled: course.enrolled.toString(),
                        isActive: course.isActive,
                        createdAt: new Date(course.createdAt.toNumber() * 1000),
                        createdBy: course.createdBy
                    });
                } catch (courseError) {
                    console.warn(`Failed to load course ${courseId}:`, courseError.message);
                }
            }
        } else {
            throw new Error('Course registration contract not available');
        }
    } catch (error) {
        console.error('❌ Failed to load courses:', error);
        if (error.message.includes('MetaMask is temporarily overloaded')) {
            console.log('📝 Using cached courses due to MetaMask overload');
        }
        // courses array will remain empty or use demo data
    }
}

/**
 * Load student's registered courses from smart contract
 * This gets courses the student has registered for and their payment status
 */
async function loadRegisteredCourses() {
    try {
        if (courseRegistrationContract && signer) {
            const walletAddress = await signer.getAddress();
            
            // Get student's registered course IDs with circuit breaker handling
            const studentCourseIds = await testContractCall(async () => {
                return await courseRegistrationContract.getStudentCourses(walletAddress);
            });
            
            registeredCourses = [];
            
            // Load details for each registered course
            for (const courseId of studentCourseIds) {
                try {
                    const [course, registration] = await testContractCall(async () => {
                        const courseData = await courseRegistrationContract.getCourse(courseId);
                        const registrationData = await courseRegistrationContract.getRegistration(walletAddress, courseId);
                        return [courseData, registrationData];
                    });
                    
                    registeredCourses.push({
                        id: course.id.toString(),
                        name: course.name,
                        description: course.description,
                        creditHours: course.creditHours.toString(),
                        feeInTokens: course.feeInTokens.toString(),
                        capacity: course.capacity.toString(),
                        enrolled: course.enrolled.toString(),
                        isActive: course.isActive,
                        registrationDate: new Date(registration.timestamp.toNumber() * 1000),
                        hasPaid: registration.hasPaid,
                        paidAmount: registration.paidAmount.toString(),
                        paidAt: registration.paidAt.toNumber() > 0 ? new Date(registration.paidAt.toNumber() * 1000) : null
                    });
                } catch (registrationError) {
                    console.warn(`Failed to load registration for course ${courseId}:`, registrationError.message);
                }
            }
        } else {
            throw new Error('Course registration contract not available');
        }
    } catch (error) {
        console.error('❌ Failed to load registered courses:', error);
        if (error.message.includes('MetaMask is temporarily overloaded')) {
            console.log('📝 Using cached registered courses due to MetaMask overload');
        }
        // registeredCourses array will remain empty or use demo data
    }
}

/**
 * Load student's token requests from smart contract
 * This gets all token requests made by the student
 */
async function loadTokenRequests() {
    try {
        if (courseRegistrationContract && signer) {
            const walletAddress = await signer.getAddress();
            
            // Get all token requests and filter for this student with circuit breaker handling
            const allRequests = await testContractCall(async () => {
                const counter = await courseRegistrationContract.tokenRequestCounter();
                const requests = [];
                
                // Load requests individually to avoid large array issues
                for (let i = 1; i <= counter.toNumber(); i++) {
                    try {
                        const request = await courseRegistrationContract.getTokenRequest(i);
                        if (request.student.toLowerCase() === walletAddress.toLowerCase()) {
                            requests.push(request);
                        }
                    } catch (requestError) {
                        console.warn(`Failed to load token request ${i}:`, requestError.message);
                    }
                }
                
                return requests;
            });
            
            tokenRequests = allRequests.map(request => ({
                id: request.id.toString(),
                amountInTokens: request.amountInTokens.toString(),
                ethRequired: parseFloat(ethers.utils.formatEther(request.ethRequired)).toFixed(4),
                reason: request.reason,
                status: request.status, // 0=Pending, 1=Completed, 2=Rejected
                timestamp: new Date(request.timestamp.toNumber() * 1000),
                processedAt: request.processedAt.toNumber() > 0 ? new Date(request.processedAt.toNumber() * 1000) : null,
                processedBy: request.processedBy
            }));
        } else {
            throw new Error('Course registration contract not available');
        }
    } catch (error) {
        console.error('❌ Failed to load token requests:', error);
        if (error.message.includes('MetaMask is temporarily overloaded')) {
            console.log('📝 Using cached token requests due to MetaMask overload');
        }
        // tokenRequests array will remain empty or use demo data
    }
}

// 7. UI UPDATE & RENDERING FUNCTIONS

/**
 * Update UI elements with user session data
 * This displays the wallet address in the navigation bar
 */
function updateUserUI() {
    const walletAddressElement = document.getElementById('wallet-address');
    if (walletAddressElement && userSession.walletAddress) {
        // Show shortened version of wallet address (first 6 and last 4 characters)
        const shortAddress = `${userSession.walletAddress.slice(0, 6)}...${userSession.walletAddress.slice(-4)}`;
        walletAddressElement.textContent = shortAddress;
        walletAddressElement.title = userSession.walletAddress; // Full address on hover
    }
}

/**
 * Update balance displays in the UI
 * This updates the balance cards with current CRST and ETH amounts
 */
function updateBalanceDisplays() {
    const tokenBalanceElement = document.getElementById('token-balance');
    if (tokenBalanceElement) {
        tokenBalanceElement.textContent = `${balances.crst} CRST`;
    }
    
    // Update balance in payment modals
    const paymentBalanceElements = document.querySelectorAll('#payment-balance, #cart-payment-balance');
    paymentBalanceElements.forEach(element => {
        if (element) {
            element.textContent = `${balances.crst} CRST`;
        }
    });
}

/**
 * Update wallet connection UI to show connected state
 * This hides connect button and shows wallet as connected
 */
function updateWalletConnectionUI() {
    // Hide connect wallet button and show as connected
    const connectBtn = document.getElementById('connect-wallet');
    if (connectBtn) {
        connectBtn.style.display = 'none';
    }
    
    // Hide wallet alert and show student info
    const walletAlert = document.getElementById('wallet-alert');
    const studentInfo = document.getElementById('student-info');
    
    if (walletAlert) walletAlert.classList.add('d-none');
    if (studentInfo) studentInfo.classList.remove('d-none');
    
    // Update wallet status in navigation
    const walletStatus = document.getElementById('wallet-status');
    if (walletStatus) {
        walletStatus.classList.remove('d-none');
    }
}

/**
 * Render available courses table with registration and cart options
 * This creates the table rows showing all courses students can register for
 */
function renderCourses() {
    const tableBody = document.getElementById('available-courses');
    if (!tableBody) return;
    
    // Clear existing content
    tableBody.innerHTML = '';
    
    // Show message if no courses found
    if (courses.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-3">
                    <i class="fas fa-info-circle me-2"></i>No courses available at this time.
                </td>
            </tr>
        `;
        return;
    }
    
    // Create a row for each course
    courses.forEach(course => {
        if (course.isActive) {
            const row = document.createElement('tr');
            
            // Check if user is already registered for this course
            const isRegistered = registeredCourses.some(rc => rc.id === course.id);
            
            // Check if course is already in cart
            const isInCart = cartCourses.some(cc => cc.id === course.id);
            
            // Calculate availability
            const availableSpots = parseInt(course.capacity) - parseInt(course.enrolled);
            const availability = `${course.enrolled}/${course.capacity}`;
            const availabilityClass = availableSpots === 0 ? 'text-danger' : availableSpots < 5 ? 'text-warning' : 'text-success';
            
            // Build the HTML for this course row
            row.innerHTML = `
                <td>${course.id}</td>
                <td>
                    <div class="fw-bold">${course.name}</div>
                    <small class="text-muted">${course.description.substring(0, 50)}${course.description.length > 50 ? '...' : ''}</small>
                </td>
                <td>${course.description}</td>
                <td>${course.creditHours}</td>
                <td>${course.feeInTokens} CRST</td>
                <td class="${availabilityClass}">${availability}</td>
                <td>
                    ${!isRegistered && !isInCart && availableSpots > 0 ? 
                        `<div class="btn-group" role="group">
                            <button class="btn btn-sm btn-success" onclick="registerForCourse('${course.id}')">
                                <i class="fas fa-user-plus me-1"></i>Register
                            </button>
                            <button class="btn btn-sm btn-primary" onclick="addToCart('${course.id}')">
                                <i class="fas fa-cart-plus me-1"></i>Cart
                            </button>
                        </div>` : 
                        isRegistered ? 
                        `<span class="badge bg-success">
                            <i class="fas fa-check me-1"></i>Registered
                        </span>` :
                        isInCart ?
                        `<span class="badge bg-info">
                            <i class="fas fa-shopping-cart me-1"></i>In Cart
                        </span>` :
                        availableSpots === 0 ?
                        `<span class="badge bg-danger">
                            <i class="fas fa-times me-1"></i>Full
                        </span>` : ''
                    }
                </td>
            `;
            
            tableBody.appendChild(row);
        }
    });
}

/**
 * Render student's registered courses table with payment status
 * This shows all courses the student has registered for and their payment status
 */
function renderRegisteredCourses() {
    const tableBody = document.getElementById('registered-courses');
    if (!tableBody) return;
    
    // Clear existing content
    tableBody.innerHTML = '';
    
    // Show message if no registered courses
    if (registeredCourses.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-3">
                    <i class="fas fa-info-circle me-2"></i>You haven't registered for any courses yet.
                </td>
            </tr>
        `;
        return;
    }
    
    // Create a row for each registered course
    registeredCourses.forEach(course => {
        const row = document.createElement('tr');
        
        // Format dates
        const registrationDate = course.registrationDate.toLocaleDateString();
        
        // Create status badge and action button based on payment status
        let statusBadge = '';
        let actionButton = '';
        
        if (course.hasPaid) {
            statusBadge = `<span class="badge bg-success">
                <i class="fas fa-check-circle me-1"></i>Paid
            </span>`;
            actionButton = `<span class="text-muted">Complete</span>`;
        } else {
            statusBadge = `<span class="badge bg-warning">
                <i class="fas fa-clock me-1"></i>Payment Pending
            </span>`;
            actionButton = `<button class="btn btn-sm btn-primary" onclick="showPaymentModal('${course.id}')">
                <i class="fas fa-credit-card me-1"></i>Pay Fee
            </button>`;
        }
        
        // Build the HTML for this course row
        row.innerHTML = `
            <td>${course.id}</td>
            <td>
                <div class="fw-bold">${course.name}</div>
                <small class="text-muted">${registrationDate}</small>
            </td>
            <td>${course.creditHours}</td>
            <td>${course.feeInTokens} CRST</td>
            <td>${statusBadge}</td>
            <td>${actionButton}</td>
        `;
        
        tableBody.appendChild(row);
    });
}

/**
 * Render shopping cart with courses and total
 * This displays all courses added to cart with remove options
 */
function renderCartCourses() {
    const cartList = document.getElementById('cart-courses');
    if (!cartList) return;
    
    // Clear existing content
    cartList.innerHTML = '';
    
    if (cartCourses.length === 0) {
        cartList.innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i>Your cart is empty. Browse available courses and add them to your cart.
            </div>
        `;
        return;
    }
    
    // Calculate total fees
    let totalFees = 0;
    
    // Render each course in cart
    cartCourses.forEach(course => {
        const feeAmount = parseFloat(course.feeInTokens);
        totalFees += feeAmount;
        
        const listItem = document.createElement('div');
        listItem.className = 'card mb-2';
        listItem.innerHTML = `
            <div class="card-body py-2">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-0">${course.name}</h6>
                        <small class="text-muted">${course.creditHours} credits | ${course.feeInTokens} CRST</small>
                    </div>
                    <button class="btn btn-sm btn-danger" onclick="removeFromCart('${course.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
        
        cartList.appendChild(listItem);
    });
    
    // Add total section
    const totalSection = document.createElement('div');
    totalSection.className = 'card bg-light mt-3';
    totalSection.innerHTML = `
        <div class="card-body">
            <div class="d-flex justify-content-between align-items-center">
                <h6 class="mb-0">Total:</h6>
                <h6 class="mb-0 text-primary">${totalFees.toFixed(2)} CRST</h6>
            </div>
        </div>
    `;
    cartList.appendChild(totalSection);
}

/**
 * Update cart UI elements (badge counts, checkout button)
 * This updates cart-related UI elements when cart changes
 */
function updateCartUI() {
    // Update cart badge
    const cartBadge = document.querySelector('.cart-count');
    if (cartBadge) {
        cartBadge.textContent = cartCourses.length;
    }
    
    // Update checkout button state
    const checkoutButton = document.getElementById('proceed-to-checkout-btn');
    if (checkoutButton) {
        checkoutButton.disabled = cartCourses.length === 0;
    }
    
    // Render cart courses
    renderCartCourses();
}

/**
 * Render student's token requests with status
 * This displays all token requests made by the student
 */
function renderTokenRequests() {
    const tableBody = document.getElementById('token-requests');
    if (!tableBody) return;
    
    // Clear existing content
    tableBody.innerHTML = '';
    
    // Show message if no token requests
    if (tokenRequests.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="3" class="text-center py-3">
                    <i class="fas fa-info-circle me-2"></i>No token requests found.
                </td>
            </tr>
        `;
        return;
    }
    
    // Create a row for each token request
    tokenRequests.forEach(request => {
        const row = document.createElement('tr');
        
        // Format date
        const date = request.timestamp.toLocaleDateString();
        
        // Determine status badge based on status value
        let statusBadge = '';
        switch (request.status) {
            case 0: // Pending
                statusBadge = `<span class="badge bg-warning">
                    <i class="fas fa-clock me-1"></i>Pending
                </span>`;
                break;
            case 1: // Completed
                statusBadge = `<span class="badge bg-success">
                    <i class="fas fa-check me-1"></i>Approved
                </span>`;
                break;
            case 2: // Rejected
                statusBadge = `<span class="badge bg-danger">
                    <i class="fas fa-times me-1"></i>Rejected
                </span>`;
                break;
            default:
                statusBadge = `<span class="badge bg-secondary">Unknown</span>`;
        }
        
        // Build the HTML for this request row
        row.innerHTML = `
            <td>${request.amountInTokens} CRST</td>
            <td>${date}</td>
            <td>${statusBadge}</td>
        `;
        
        tableBody.appendChild(row);
    });
}

// 8. EVENT LISTENER SETUP

/**
 * Setup all event listeners for buttons and modals
 * This connects HTML buttons to JavaScript functions
 */
function setupEventListeners() {
    // Token request submission
    const submitTokenRequestBtn = document.getElementById('submit-token-request');
    if (submitTokenRequestBtn) {
        submitTokenRequestBtn.addEventListener('click', submitTokenRequest);
    }
    
    // Cart checkout
    const proceedToCheckoutBtn = document.getElementById('proceed-to-checkout-btn');
    if (proceedToCheckoutBtn) {
        proceedToCheckoutBtn.addEventListener('click', showCartPaymentModal);
    }
    
    // Cart payment confirmation
    const confirmCartPaymentBtn = document.getElementById('confirm-cart-payment');
    if (confirmCartPaymentBtn) {
        confirmCartPaymentBtn.addEventListener('click', processCartPayment);
    }
    
    // Individual course payment
    const confirmPaymentBtn = document.getElementById('confirm-payment');
    if (confirmPaymentBtn) {
        confirmPaymentBtn.addEventListener('click', processIndividualPayment);
    }
    
    // Connect wallet button (fallback - should already be connected via login)
    const connectButton = document.getElementById('connect-wallet');
    if (connectButton) {
        connectButton.addEventListener('click', function() {
            showMessage('Wallet is already connected via login!', 'info');
        });
    }
}

// 9. COURSE MANAGEMENT FUNCTIONS

/**
 * Register for a single course
 * This registers the student for a course (no payment yet)
 */
async function registerForCourse(courseId) {
    try {
        showLoadingState(`register-btn-${courseId}`, true);
        
        if (courseRegistrationContract) {
            console.log(`📝 Registering for course ${courseId}...`);
            
            // Call contract function to register with circuit breaker handling
            const tx = await testContractCall(async () => {
                return await courseRegistrationContract.registerForCourse(parseInt(courseId));
            });
            
            showMessage('Transaction sent! Waiting for confirmation...', 'info');
            
            // Wait for transaction confirmation
            const receipt = await tx.wait();
            console.log('✅ Course registration successful:', receipt.transactionHash);
            
            showMessage(`Successfully registered for course! You can now pay the course fee.`, 'success');
            
            // Refresh data to show new registration
            await loadCourses();
            await loadRegisteredCourses();
            renderCourses();
            renderRegisteredCourses();
            
        } else {
            // Demo mode
            console.log('📺 Demo mode: Simulating course registration...');
            
            const course = courses.find(c => c.id === courseId);
            if (course) {
                // Add to registered courses
                registeredCourses.push({
                    ...course,
                    registrationDate: new Date(),
                    hasPaid: false,
                    paidAmount: '0',
                    paidAt: null
                });
                
                // Update enrolled count
                course.enrolled = (parseInt(course.enrolled) + 1).toString();
                
                // Update UI
                renderCourses();
                renderRegisteredCourses();
                
                showMessage(`Successfully registered for "${course.name}"! You can now pay the course fee.`, 'success');
            }
        }
        
    } catch (error) {
        console.error('❌ Failed to register for course:', error);
        let errorMessage = error.message;
        
        // Handle specific contract errors
        if (error.message.includes('MetaMask is temporarily overloaded')) {
            errorMessage = 'MetaMask is temporarily overloaded. Please wait a moment and try again.';
        } else if (error.code === 4001) {
            errorMessage = 'Transaction cancelled by user';
        } else if (error.message.includes('Already registered')) {
            errorMessage = 'You are already registered for this course';
        } else if (error.message.includes('Course is full')) {
            errorMessage = 'This course is full - no more spots available';
        } else if (error.message.includes('Invalid/inactive course')) {
            errorMessage = 'This course is not available for registration';
        }
        
        showMessage('Failed to register: ' + errorMessage, 'error');
    } finally {
        showLoadingState(`register-btn-${courseId}`, false);
    }
}

/**
 * Add course to shopping cart
 * This adds a course to the cart for batch payment later
 */
function addToCart(courseId) {
    const course = courses.find(c => c.id === courseId);
    if (!course) {
        showMessage("Course not found", 'error');
        return;
    }
    
    // Check if already in cart
    if (cartCourses.some(c => c.id === courseId)) {
        showMessage("Course is already in your cart", 'warning');
        return;
    }
    
    // Check if already registered
    if (registeredCourses.some(c => c.id === courseId)) {
        showMessage("You are already registered for this course", 'warning');
        return;
    }
    
    // Check if course is full
    const availableSpots = parseInt(course.capacity) - parseInt(course.enrolled);
    if (availableSpots <= 0) {
        showMessage("This course is full", 'error');
        return;
    }
    
    // Add to cart
    cartCourses.push(course);
    
    // Update UI
    renderCourses();
    updateCartUI();
    
    // Show success message
    showMessage(`"${course.name}" has been added to your cart`, 'success');
}

/**
 * Remove course from shopping cart
 * This removes a course from the cart
 */
function removeFromCart(courseId) {
    cartCourses = cartCourses.filter(c => c.id !== courseId);
    
    // Update UI
    renderCourses();
    updateCartUI();
    
    showMessage('Course removed from cart', 'info');
}

// 10. PAYMENT FUNCTIONS

/**
 * Show individual course payment modal
 * This displays a payment modal for a single course fee
 */
function showPaymentModal(courseId) {
    const course = registeredCourses.find(c => c.id === courseId);
    if (!course) {
        showMessage("Course not found", 'error');
        return;
    }
    
    if (course.hasPaid) {
        showMessage("You have already paid for this course", 'info');
        return;
    }
    
    // Store current course ID for payment processing
    currentPaymentCourseId = courseId;
    
    // Update modal content
    document.getElementById('payment-course-name').textContent = course.name;
    document.getElementById('payment-balance').textContent = balances.crst;
    document.getElementById('payment-fee').textContent = course.feeInTokens;
    
    // Check if user has enough balance
    const courseFee = parseFloat(course.feeInTokens);
    const userBalance = parseFloat(balances.crst);
    
    const insufficientFunds = document.getElementById('insufficient-funds');
    const confirmButton = document.getElementById('confirm-payment');
    
    if (userBalance < courseFee) {
        insufficientFunds.style.display = 'block';
        confirmButton.disabled = true;
    } else {
        insufficientFunds.style.display = 'none';
        confirmButton.disabled = false;
    }
    
    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('paymentModal'));
    modal.show();
}

/**
 * Process individual course payment
 * This handles payment for a single course
 */
async function processIndividualPayment() {
    if (!currentPaymentCourseId) {
        showMessage("No course selected for payment", 'error');
        return;
    }
    
    const course = registeredCourses.find(c => c.id === currentPaymentCourseId);
    if (!course) {
        showMessage("Course not found", 'error');
        return;
    }
    
    try {
        showLoadingState('confirm-payment', true);
        
        if (courseRegistrationContract && crstTokenContract) {
            console.log(`💳 Processing payment for course ${currentPaymentCourseId}...`);
            
            const courseFeeWei = ethers.utils.parseEther(course.feeInTokens);
            
            // First, check current allowance with circuit breaker handling
            const currentAllowance = await testContractCall(async () => {
                const walletAddress = await signer.getAddress();
                return await crstTokenContract.allowance(walletAddress, courseRegistrationContract.address);
            });
            
            // If allowance is insufficient, request approval first
            if (currentAllowance.lt(courseFeeWei)) {
                console.log('📝 Requesting token approval...');
                showMessage('Please approve the contract to spend your CRST tokens...', 'info');
                
                const approveTx = await testContractCall(async () => {
                    return await crstTokenContract.approve(courseRegistrationContract.address, courseFeeWei);
                });
                
                showMessage('Approval transaction sent! Waiting for confirmation...', 'info');
                await approveTx.wait();
                console.log('✅ Token approval confirmed');
            }
            
            // Now process the payment
            showMessage('Processing payment transaction...', 'info');
            
            const paymentTx = await testContractCall(async () => {
                return await courseRegistrationContract.payFee(parseInt(currentPaymentCourseId));
            });
            
            showMessage('Payment transaction sent! Waiting for confirmation...', 'info');
            
            const receipt = await paymentTx.wait();
            console.log('✅ Payment successful:', receipt.transactionHash);
            
            showMessage('Payment successful! Course fee paid.', 'success');
            
            // Refresh data to show updated payment status
            await loadBalances();
            await loadRegisteredCourses();
            updateBalanceDisplays();
            renderRegisteredCourses();
            
        } else {
            // Demo mode
            console.log('📺 Demo mode: Simulating payment...');
            
            const courseFee = parseFloat(course.feeInTokens);
            const currentBalance = parseFloat(balances.crst);
            
            if (currentBalance >= courseFee) {
                // Update balances
                balances.crst = (currentBalance - courseFee).toFixed(2);
                
                // Update course payment status
                course.hasPaid = true;
                course.paidAt = new Date();
                course.paidAmount = ethers.utils.parseEther(course.feeInTokens).toString();
                
                // Update UI
                updateBalanceDisplays();
                renderRegisteredCourses();
                
                showMessage('Payment successful! Course fee paid.', 'success');
            } else {
                throw new Error('Insufficient balance');
            }
        }
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('paymentModal'));
        if (modal) modal.hide();
        
        currentPaymentCourseId = null;
        
    } catch (error) {
        console.error('❌ Payment failed:', error);
        let errorMessage = error.message;
        
        // Handle specific contract errors
        if (error.message.includes('MetaMask is temporarily overloaded')) {
            errorMessage = 'MetaMask is temporarily overloaded. Please wait a moment and try again.';
        } else if (error.code === 4001) {
            errorMessage = 'Transaction cancelled by user';
        } else if (error.message.includes('Insufficient CRST balance')) {
            errorMessage = 'You don\'t have enough CRST tokens to pay this fee';
        } else if (error.message.includes('Please approve contract')) {
            errorMessage = 'Please approve the contract to spend your CRST tokens first';
        } else if (error.message.includes('Already paid')) {
            errorMessage = 'You have already paid for this course';
        }
        
        showMessage('Payment failed: ' + errorMessage, 'error');
    } finally {
        showLoadingState('confirm-payment', false);
    }
}

/**
 * Show cart payment modal
 * This displays a payment modal for all courses in cart
 */
function showCartPaymentModal() {
    if (cartCourses.length === 0) {
        showMessage("Your cart is empty", 'warning');
        return;
    }
    
    // Calculate total fee and populate course list
    let totalFee = 0;
    const paymentCoursesList = document.getElementById('payment-courses-list');
    if (paymentCoursesList) {
        paymentCoursesList.innerHTML = '';
        
        cartCourses.forEach(course => {
            const courseFee = parseFloat(course.feeInTokens);
            totalFee += courseFee;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${course.name}</td>
                <td class="text-end">${course.feeInTokens} CRST</td>
            `;
            
            paymentCoursesList.appendChild(row);
        });
    }
    
    // Update total amount
    const totalAmountElement = document.getElementById('payment-total-amount');
    if (totalAmountElement) {
        totalAmountElement.textContent = `${totalFee.toFixed(2)} CRST`;
    }
    
    // Update user's balance display
    const balanceElement = document.getElementById('cart-payment-balance');
    if (balanceElement) {
        balanceElement.textContent = `${balances.crst} CRST`;
    }
    
    // Check if user has enough tokens
    const userBalance = parseFloat(balances.crst);
    const insufficientFunds = document.getElementById('cart-insufficient-funds');
    const confirmButton = document.getElementById('confirm-cart-payment');
    
    if (userBalance < totalFee) {
        insufficientFunds.style.display = 'block';
        confirmButton.disabled = true;
    } else {
        insufficientFunds.style.display = 'none';
        confirmButton.disabled = false;
    }
    
    // Show modal
    const cartPaymentModal = new bootstrap.Modal(document.getElementById('cartPaymentModal'));
    cartPaymentModal.show();
}

/**
 * Process cart payment for multiple courses
 * This handles batch payment for all courses in cart
 */
async function processCartPayment() {
    if (cartCourses.length === 0) {
        showMessage("Cart is empty", 'error');
        return;
    }
    
    try {
        showLoadingState('confirm-cart-payment', true);
        
        if (courseRegistrationContract && crstTokenContract) {
            console.log(`💳 Processing cart payment for ${cartCourses.length} courses...`);
            
            // First, register for all courses in cart
            for (const course of cartCourses) {
                try {
                    console.log(`📝 Registering for course ${course.id}...`);
                    
                    const registerTx = await testContractCall(async () => {
                        return await courseRegistrationContract.registerForCourse(parseInt(course.id));
                    });
                    
                    await registerTx.wait();
                    console.log(`✅ Registered for course ${course.id}`);
                    
                } catch (regError) {
                    if (regError.message.includes('Already registered')) {
                        console.log(`ℹ️ Already registered for course ${course.id}, continuing...`);
                    } else {
                        throw regError;
                    }
                }
            }
            
            // Calculate total fee needed
            const courseIds = cartCourses.map(c => parseInt(c.id));
            let totalFeeWei = ethers.BigNumber.from(0);
            
            cartCourses.forEach(course => {
                const courseFeeWei = ethers.utils.parseEther(course.feeInTokens);
                totalFeeWei = totalFeeWei.add(courseFeeWei);
            });
            
            // Check current allowance with circuit breaker handling
            const currentAllowance = await testContractCall(async () => {
                const walletAddress = await signer.getAddress();
                return await crstTokenContract.allowance(walletAddress, courseRegistrationContract.address);
            });
            
            // If allowance is insufficient, request approval
            if (currentAllowance.lt(totalFeeWei)) {
                console.log('📝 Requesting token approval for batch payment...');
                showMessage('Please approve the contract to spend your CRST tokens for all courses...', 'info');
                
                const approveTx = await testContractCall(async () => {
                    return await crstTokenContract.approve(courseRegistrationContract.address, totalFeeWei);
                });
                
                showMessage('Approval transaction sent! Waiting for confirmation...', 'info');
                await approveTx.wait();
                console.log('✅ Token approval confirmed for batch payment');
            }
            
            // Process batch payment
            showMessage('Processing batch payment transaction...', 'info');
            
            const paymentTx = await testContractCall(async () => {
                return await courseRegistrationContract.payFeesForCourses(courseIds);
            });
            
            showMessage('Batch payment transaction sent! Waiting for confirmation...', 'info');
            
            const receipt = await paymentTx.wait();
            console.log('✅ Batch payment successful:', receipt.transactionHash);
            
            showMessage(`Successfully paid for ${cartCourses.length} courses!`, 'success');
            
            // Clear cart and refresh data
            cartCourses = [];
            await loadBalances();
            await loadRegisteredCourses();
            await loadCourses();
            updateBalanceDisplays();
            renderCourses();
            renderRegisteredCourses();
            updateCartUI();
            
        } else {
            // Demo mode
            console.log('📺 Demo mode: Simulating cart payment...');
            
            let totalFee = 0;
            cartCourses.forEach(course => {
                totalFee += parseFloat(course.feeInTokens);
            });
            
            const currentBalance = parseFloat(balances.crst);
            
            if (currentBalance >= totalFee) {
                // Update balance
                balances.crst = (currentBalance - totalFee).toFixed(2);
                
                // Move courses from cart to registered courses
                const timestamp = new Date();
                cartCourses.forEach(course => {
                    // Check if not already registered
                    if (!registeredCourses.some(rc => rc.id === course.id)) {
                        registeredCourses.push({
                            ...course,
                            registrationDate: timestamp,
                            hasPaid: true,
                            paidAmount: ethers.utils.parseEther(course.feeInTokens).toString(),
                            paidAt: timestamp
                        });
                        
                        // Update enrolled count
                        const courseIndex = courses.findIndex(c => c.id === course.id);
                        if (courseIndex !== -1) {
                            courses[courseIndex].enrolled = (parseInt(courses[courseIndex].enrolled) + 1).toString();
                        }
                    }
                });
                
                // Clear cart
                cartCourses = [];
                
                // Update UI
                updateBalanceDisplays();
                renderCourses();
                renderRegisteredCourses();
                updateCartUI();
                
                showMessage(`Successfully paid for ${cartCourses.length} courses!`, 'success');
            } else {
                throw new Error('Insufficient balance for cart payment');
            }
        }
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('cartPaymentModal'));
        if (modal) modal.hide();
        
    } catch (error) {
        console.error('❌ Cart payment failed:', error);
        let errorMessage = error.message;
        
        // Handle specific contract errors
        if (error.message.includes('MetaMask is temporarily overloaded')) {
            errorMessage = 'MetaMask is temporarily overloaded. Please wait a moment and try again.';
        } else if (error.code === 4001) {
            errorMessage = 'Transaction cancelled by user';
        } else if (error.message.includes('Insufficient CRST balance')) {
            errorMessage = 'You don\'t have enough CRST tokens to pay for all courses';
        } else if (error.message.includes('Please approve contract')) {
            errorMessage = 'Please approve the contract to spend enough CRST tokens for all courses';
        } else if (error.message.includes('Not registered for all courses')) {
            errorMessage = 'Please register for all courses before payment';
        } else if (error.message.includes('Maximum 10 courses')) {
            errorMessage = 'You can only pay for up to 10 courses at once';
        }
        
        showMessage('Cart payment failed: ' + errorMessage, 'error');
    } finally {
        showLoadingState('confirm-cart-payment', false);
    }
}

// 11. TOKEN REQUEST FUNCTIONS

/**
 * Submit token request with ETH payment
 * This creates a new token request and pays ETH upfront
 */
async function submitTokenRequest() {
    // Get form values
    const amount = document.getElementById('token-amount').value;
    const reason = document.getElementById('request-reason').value;
    
    // Validation
    if (!amount || !reason) {
        showMessage("Please fill in all fields", 'error');
        return;
    }
    
    if (parseFloat(amount) <= 0) {
        showMessage("Token amount must be greater than 0", 'error');
        return;
    }
    
    if (parseFloat(amount) > parseInt(contractConstants.maxCourseFee)) {
        showMessage(`Token amount cannot exceed ${contractConstants.maxCourseFee} CRST`, 'error');
        return;
    }
    
    if (reason.trim().length < 10) {
        showMessage("Please provide a more detailed reason (at least 10 characters)", 'error');
        return;
    }
    
    try {
        showLoadingState('submit-token-request', true);
        
        if (courseRegistrationContract) {
            console.log(`💰 Requesting ${amount} CRST tokens...`);
            
            // Calculate required ETH with circuit breaker handling
            const ethRequired = await testContractCall(async () => {
                return await courseRegistrationContract.getRequiredEthForTokens(parseInt(amount));
            });
            
            console.log(`💳 ETH required: ${ethers.utils.formatEther(ethRequired)} ETH`);
            
            // Check if user has enough ETH
            const userEthBalance = await testContractCall(async () => {
                const walletAddress = await signer.getAddress();
                return await provider.getBalance(walletAddress);
            });
            
            if (userEthBalance.lt(ethRequired)) {
                throw new Error(`Insufficient ETH balance. Required: ${ethers.utils.formatEther(ethRequired)} ETH`);
            }
            
            showMessage('Please confirm the transaction to request tokens...', 'info');
            
            // Submit token request with ETH payment
            const tx = await testContractCall(async () => {
                return await courseRegistrationContract.requestTokens(parseInt(amount), reason, {
                    value: ethRequired
                });
            });
            
            showMessage('Token request submitted! Waiting for confirmation...', 'info');
            
            const receipt = await tx.wait();
            console.log('✅ Token request submitted:', receipt.transactionHash);
            
            showMessage('Token request submitted successfully! An administrator will review your request.', 'success');
            
            // Refresh data
            await loadTokenRequests();
            await loadBalances();
            renderTokenRequests();
            updateBalanceDisplays();
            
        } else {
            // Demo mode
            console.log('📺 Demo mode: Simulating token request...');
            
            const newRequest = {
                id: (tokenRequests.length + 1).toString(),
                amountInTokens: amount,
                ethRequired: (parseFloat(amount) / parseFloat(contractConstants.exchangeRate)).toFixed(4),
                reason: reason,
                status: 0, // Pending
                timestamp: new Date(),
                processedAt: null,
                processedBy: null
            };
            
            tokenRequests.push(newRequest);
            renderTokenRequests();
            
            showMessage('Token request submitted successfully! An administrator will review your request.', 'success');
        }
        
        // Hide modal and reset form
        const modal = bootstrap.Modal.getInstance(document.getElementById('requestTokensModal'));
        if (modal) modal.hide();
        document.getElementById('request-tokens-form').reset();
        
    } catch (error) {
        console.error('❌ Token request failed:', error);
        let errorMessage = error.message;
        
        // Handle specific contract errors
        if (error.message.includes('MetaMask is temporarily overloaded')) {
            errorMessage = 'MetaMask is temporarily overloaded. Please wait a moment and try again.';
        } else if (error.code === 4001) {
            errorMessage = 'Transaction cancelled by user';
        } else if (error.message.includes('Insufficient ETH')) {
            errorMessage = 'You don\'t have enough ETH to request these tokens';
        } else if (error.message.includes('Invalid token amount')) {
            errorMessage = 'Token amount must be between 1 and 10,000 CRST';
        } else if (error.message.includes('Invalid reason')) {
            errorMessage = 'Please provide a valid reason (1-500 characters)';
        }
        
        showMessage('Token request failed: ' + errorMessage, 'error');
    } finally {
        showLoadingState('submit-token-request', false);
    }
}

// 12. PERIODIC REFRESH & UTILITY FUNCTIONS

/**
 * Start periodic refresh of dashboard data
 * This refreshes critical data every 30 seconds to keep the dashboard current
 */
function startPeriodicRefresh() {
    // Refresh every 30 seconds to keep data current
    refreshInterval = setInterval(async () => {
        try {
            // Only refresh critical data to avoid overwhelming the UI
            await Promise.all([
                loadBalances(),
                loadTokenRequests()
            ]);
            
            updateBalanceDisplays();
            renderTokenRequests();
            
        } catch (error) {
            console.warn('Periodic refresh failed:', error.message);
            // Don't show error messages for automatic refresh failures
        }
    }, 30000); // 30 seconds
}

/**
 * Stop periodic refresh when leaving page
 * This cleans up the refresh timer
 */
function stopPeriodicRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
    }
}

/**
 * Manual refresh function for refresh button
 * This reloads all dashboard data when user requests it
 */
async function refreshAllData() {
    try {
        showMessage('Refreshing all data...', 'info');
        
        // Reload all dashboard data
        await Promise.all([
            loadBalances(),
            loadCourses(),
            loadRegisteredCourses(),
            loadTokenRequests()
        ]);
        
        // Update all UI components
        updateBalanceDisplays();
        renderCourses();
        renderRegisteredCourses();
        renderTokenRequests();
        updateCartUI();
        
        showMessage('✅ All data refreshed successfully!', 'success');
        
    } catch (error) {
        console.error('❌ Failed to refresh data:', error);
        if (error.message.includes('MetaMask is temporarily overloaded')) {
            showMessage('MetaMask is temporarily overloaded. Please wait a moment and try again.', 'warning');
        } else {
            showMessage('Failed to refresh some data. Check console for details.', 'warning');
        }
    }
}

/**
 * Logout function - uses login.js logout system
 * This cleans up the session and redirects to login page
 */
function logout() {
    try {
        console.log('🚪 Student portal logout initiated...');
        
        // Stop periodic refresh
        stopPeriodicRefresh();
        
        // Clear local contract data
        userSession = null;
        provider = null;
        signer = null;
        courseRegistrationContract = null;
        crstTokenContract = null;
        currentPaymentCourseId = null;
        
        // Clear data arrays
        courses = [];
        registeredCourses = [];
        cartCourses = [];
        tokenRequests = [];
        
        // Clear initialization flag
        document.body.removeAttribute('data-student-init');
        isInitialized = false;
        
        // Clear session data (same as login.js)
        removeStoredSession();
        sessionStorage.removeItem('studentRedirectCount');
        
        console.log('🔄 Redirecting to login page...');
        window.location.href = 'login.html';
        
    } catch (error) {
        console.error('❌ Logout failed:', error);
        // Force redirect on logout failure
        removeStoredSession();
        window.location.href = 'login.html';
    }
}

/**
 * Utility function to show loading state on buttons
 * This provides visual feedback during blockchain transactions
 */
function showLoadingState(buttonId, loading) {
    const button = document.getElementById(buttonId);
    if (!button) return;
    
    if (loading) {
        button.disabled = true;
        // Store original text and show loading spinner
        const originalText = button.innerHTML;
        button.setAttribute('data-original-text', originalText);
        button.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Processing...';
    } else {
        button.disabled = false;
        // Restore original button text
        const originalText = button.getAttribute('data-original-text');
        if (originalText) {
            button.innerHTML = originalText;
        }
    }
}

/**
 * Utility function to show toast messages
 * This displays temporary notifications to the user
 */
function showMessage(message, type = 'info') {
    console.log(`💬 ${type.toUpperCase()}:`, message);
    
    // Determine alert styling based on message type
    const alertClass = type === 'error' ? 'alert-danger' : 
                     type === 'success' ? 'alert-success' : 
                     type === 'warning' ? 'alert-warning' : 'alert-info';
    
    const iconClass = type === 'error' ? 'fa-exclamation-circle' : 
                     type === 'success' ? 'fa-check-circle' : 
                     type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle';
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `alert ${alertClass} alert-dismissible fade show position-fixed`;
    toast.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px; max-width: 400px;';
    toast.innerHTML = `
        <i class="fas ${iconClass} me-2"></i>${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    // Add to page
    document.body.appendChild(toast);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 5000);
}

/**
 * Cleanup function for page unload
 * This ensures proper cleanup when user leaves the page
 */
function cleanup() {
    stopPeriodicRefresh();
}

// 13. GLOBAL EXPORTS & EVENT SETUP

// Export functions for HTML onclick handlers
window.registerForCourse = registerForCourse;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.showPaymentModal = showPaymentModal;
window.showCartPaymentModal = showCartPaymentModal;
window.processCartPayment = processCartPayment;
window.submitTokenRequest = submitTokenRequest;
window.refreshAllData = refreshAllData;
window.logout = logout;

// Setup cleanup on page unload
window.addEventListener('beforeunload', cleanup);