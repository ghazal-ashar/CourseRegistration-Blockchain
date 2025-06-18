/*
 * Enhanced Student Portal with Real-time Event Monitoring
 * Authors: Ghazal E Ashar & Shahzeb Ahmed Iqbal
 */

// 1. GLOBAL VARIABLES & CONFIGURATION

// Session and authentication state
let userSession = null;              // Stores user session data from login.js
let isInitialized = false;           // Prevents multiple initializations

// Blockchain connection objects - USE GLOBALS FROM LOGIN.JS
// These are declared in login.js and available globally
// let provider, signer, courseRegistrationContract, crstTokenContract are already global

// UI state management
let currentPaymentCourseId = null;   // ID of currently selected course for payment
let refreshInterval = null;          // Timer for periodic data refresh
let eventFilter = null;              // Event filter for blockchain monitoring

// Data containers - these hold all the information displayed on the dashboard
let courses = [];                    // Array of all available courses
let registeredCourses = [];          // Array of courses student is registered for
let cartCourses = [];               // Array of courses in shopping cart
let tokenRequests = [];             // Array of student's token requests

// Balance information for display
let balances = {
    crst: '0.00'                    // Student's CRST balance
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
    
    console.log('🚀 Initializing Student Portal v2.0...');
    
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
        setupEventMonitoring();     // Setup real-time event monitoring
        startPeriodicRefresh();     // Start auto-refresh timer
        isInitialized = true;
        console.log('✅ Student Portal v2.0 initialized successfully');
    }).catch(error => {
        console.error('❌ Failed to initialize student portal:', error);
        showMessage('Failed to connect to blockchain. Please check your connection and refresh.', 'error');
    });
});

/**
 * Verify student session using login.js session system
 * This checks if the user has valid student credentials
 */
function verifyStudentSession() {
    try {
        console.log('🔍 Checking student session...');
        
        // Get stored session from localStorage/sessionStorage
        const storedUser = getStoredSession();
        if (!storedUser) {
            console.log('❌ No session found');
            showMessage('No active session. Redirecting to login...', 'error');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
            return false;
        }
        
        // Parse session JSON
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
            console.log('👨‍💼 Admin detected, redirecting to admin portal');
            setTimeout(() => {
                window.location.href = 'adminportal.html';
            }, 1500);
            return false;
        }
        
        // Verify this is actually a student
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
        // FIRST: Try to reuse existing connection from login.js (like adminportal.js)
        if (typeof window.provider !== 'undefined' && window.provider) {
            console.log('🔄 Reusing existing blockchain connection from login...');
            // Use global variables directly (no assignment needed)
            
            // Try to reuse contracts if they exist
            if (window.courseRegistrationContract && window.crstTokenContract) {
                console.log('📦 Reusing existing contract instances...');
                
                // Test the existing contracts with circuit breaker handling
                try {
                    await testContractCall(async () => {
                        const owner = await courseRegistrationContract.owner();
                        const symbol = await crstTokenContract.symbol();
                        return { owner, symbol };
                    });
                    console.log('✅ Reused contracts working with circuit breaker protection');
                    updateBlockchainStatus('✅ Blockchain Connected (Reused)');
                    await loadContractConstants();
                    await verifyStudentRegistration();
                    return;
                } catch (testError) {
                    console.warn('⚠️ Existing contracts failed, will recreate...', testError.message);
                }
            }
        }
        
        // SECOND: Connect to MetaMask if no existing connection (like adminportal.js)
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
            updateBlockchainStatus('✅ Blockchain Connected');
            
            // Load contract constants dynamically
            await loadContractConstants();
            
            // Verify student registration on blockchain
            await verifyStudentRegistration();
            
        } else {
            throw new Error('MetaMask not found');
        }
    } catch (error) {
        console.error('❌ Contract initialization failed:', error);
        
        let statusMessage = '❌ Connection Failed';
        let userMessage = 'Blockchain connection failed.';
        
        // Provide specific error messages for common issues (like adminportal.js)
        if (error.message.includes('MetaMask is temporarily overloaded')) {
            statusMessage = '❌ MetaMask Overloaded';
            userMessage = 'MetaMask is temporarily overloaded. Please wait a moment and try refreshing the page.';
        } else if (error.message.includes('circuit breaker')) {
            statusMessage = '❌ Rate Limited';
            userMessage = 'MetaMask rate limit hit. Please wait a moment and try again.';
        } else if (error.message.includes('invalid block tag')) {
            statusMessage = '❌ Blockchain Out of Sync';
            userMessage = 'Your local blockchain is out of sync. Please restart your blockchain and redeploy contracts.';
        } else if (error.message.includes('not deployed')) {
            statusMessage = '❌ Contracts Not Deployed';
            userMessage = 'Smart contracts not found. Please deploy contracts to your local blockchain.';
        } else if (error.message.includes('wrong address')) {
            statusMessage = '❌ Wrong Contract Address';
            userMessage = 'Contract addresses in config.js are incorrect. Please update after redeploying.';
        } else if (error.message.includes('JSON-RPC')) {
            statusMessage = '❌ RPC Connection Failed';
            userMessage = 'Cannot connect to blockchain. Make sure your local blockchain is running on http://127.0.0.1:8545';
        }
        
        updateBlockchainStatus(statusMessage);
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
                
                // Store contract constants for use throughout the app
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

// 6. REAL-TIME EVENT MONITORING

/**
 * Setup real-time event monitoring for blockchain events
 * This listens for contract events and updates the UI automatically
 */
function setupEventMonitoring() {
    if (!courseRegistrationContract) {
        console.log('Contract not available for event monitoring');
        return;
    }
    
    try {        
        // Listen to all events from the course registration contract
        courseRegistrationContract.on("*", (event) => {
            handleBlockchainEvent(event);
        });
        
        // Also listen to token events
        if (crstTokenContract) {
            crstTokenContract.on("*", (event) => {
                handleTokenEvent(event);
            });
        }
        
        console.log('Event monitoring setup complete');
        
    } catch (error) {
        console.error('Failed to setup event monitoring:', error);
    }
}

/**
 * Handle blockchain events from course registration contract
 */
function handleBlockchainEvent(event) {
    try {
        const eventName = event.event;
        const args = event.args;
        
        console.log('Blockchain event received:', eventName, args);
        
        // Only handle events that are specifically related to the current student
        const currentUserAddress = userSession.walletAddress.toLowerCase();
        
        switch (eventName) {
            case 'StudentRegistered':
                // Only show if this event is for the current user
                if (args.student.toLowerCase() === currentUserAddress) {
                    addEventToUI('Registration', `Successfully registered for course ${args.courseId}`, 'success');
                    // Refresh registered courses data
                    loadRegisteredCourses().then(() => renderRegisteredCourses());
                    loadCourses().then(() => renderCourses()); // Update available courses to show registration status
                }
                break;
                
            case 'FeesPaid':
                // Only show if this event is for the current user
                if (args.student.toLowerCase() === currentUserAddress) {
                    const amount = parseFloat(ethers.utils.formatEther(args.amount)).toFixed(2);
                    addEventToUI('Payment', `Fee paid for course ${args.courseId}: ${amount} CRST`, 'success');
                    // Refresh balances and courses
                    loadBalances().then(() => updateBalanceDisplays());
                    loadRegisteredCourses().then(() => renderRegisteredCourses());
                }
                break;
                
            case 'BatchFeePaid':
                // Only show if this event is for the current user
                if (args.student.toLowerCase() === currentUserAddress) {
                    const totalAmount = parseFloat(ethers.utils.formatEther(args.totalAmount)).toFixed(2);
                    addEventToUI('Payment', `Batch payment completed: ${args.courseIds.length} courses, ${totalAmount} CRST total`, 'success');
                    // Refresh balances and courses
                    loadBalances().then(() => updateBalanceDisplays());
                    loadRegisteredCourses().then(() => renderRegisteredCourses());
                    loadCourses().then(() => renderCourses());
                }
                break;
                
            case 'TokenRequested':
                // Only show if this event is for the current user
                if (args.student.toLowerCase() === currentUserAddress) {
                    const ethRequired = parseFloat(ethers.utils.formatEther(args.ethRequired)).toFixed(4);
                    addEventToUI('Token Request', `Requested ${args.amountInTokens} CRST tokens (${ethRequired} ETH paid)`, 'info');
                    // Refresh token requests
                    loadTokenRequests().then(() => renderTokenRequests());
                }
                break;
                
            case 'TokenRequestApproved':
                // Only show if this event is for the current user
                if (args.student.toLowerCase() === currentUserAddress) {
                    addEventToUI('Token Request', `Token request approved: ${args.amountInTokens} CRST tokens`, 'success');
                    // Refresh balances and token requests
                    loadBalances().then(() => updateBalanceDisplays());
                    loadTokenRequests().then(() => renderTokenRequests());
                }
                break;
                
            case 'TokenRequestRejected':
                // Only show if this event is for the current user
                if (args.student.toLowerCase() === currentUserAddress) {
                    addEventToUI('Token Request', `Token request rejected - ETH refunded`, 'error');
                    // Refresh token requests
                    loadTokenRequests().then(() => renderTokenRequests());
                }
                break;
                
            case 'TokenPurchaseCompleted':
                // Only show if this event is for the current user
                if (args.student.toLowerCase() === currentUserAddress) {
                    const ethPaid = parseFloat(ethers.utils.formatEther(args.ethPaid)).toFixed(4);
                    addEventToUI('Token Purchase', `Received ${args.amountInTokens} CRST tokens (${ethPaid} ETH)`, 'success');
                    // Refresh balances
                    loadBalances().then(() => updateBalanceDisplays());
                }
                break;
                
            case 'CRSTReturned':
                // Only show if this event is for the current user
                if (args.student.toLowerCase() === currentUserAddress) {
                    const crstAmount = parseFloat(ethers.utils.formatEther(args.crstAmount)).toFixed(2);
                    const ethReturned = parseFloat(ethers.utils.formatEther(args.ethReturned)).toFixed(4);
                    const feeDeducted = parseFloat(ethers.utils.formatEther(args.feeDeducted)).toFixed(4);
                    addEventToUI('CRST Return', `Returned ${crstAmount} CRST for ${ethReturned} ETH (${feeDeducted} ETH fee)`, 'info');
                    // Refresh balances
                    loadBalances().then(() => updateBalanceDisplays());
                }
                break;
                
            case 'UserProfileCreated':
                // Only show if this event is for the current user
                if (args.user.toLowerCase() === currentUserAddress) {
                    const roleText = args.role.toString() === '0' ? 'Student' : 'Admin';
                    addEventToUI('Profile', `${roleText} profile created successfully`, 'success');
                }
                break;
            
            default:
                // Log other events for debugging
                console.log('Other event (not displayed):', eventName, args);
                break;
        }
        
    } catch (error) {
        console.error('Error handling blockchain event:', error);
    }
}

/**
 * Handle token contract events
 * This processes token-related events like transfers and minting
 */
function handleTokenEvent(event) {
    try {
        const eventName = event.event;
        const args = event.args;
        
        console.log('Token event received:', eventName, args);
        
        const currentUserAddress = userSession.walletAddress.toLowerCase();
        
        switch (eventName) {
            case 'Transfer':
                // Only show transfers TO or FROM the current user
                if (args.to.toLowerCase() === currentUserAddress) {
                    const amount = parseFloat(ethers.utils.formatEther(args.value)).toFixed(2);
                    const fromAddress = args.from === '0x0000000000000000000000000000000000000000' ? 'Contract' : 
                                       args.from.slice(0, 6) + '...' + args.from.slice(-4);
                    addEventToUI('Token Transfer', `Received ${amount} CRST from ${fromAddress}`, 'success');
                    // Refresh balance
                    loadBalances().then(() => updateBalanceDisplays());
                } else if (args.from.toLowerCase() === currentUserAddress) {
                    const amount = parseFloat(ethers.utils.formatEther(args.value)).toFixed(2);
                    const toAddress = args.to.slice(0, 6) + '...' + args.to.slice(-4);
                    addEventToUI('Token Transfer', `Sent ${amount} CRST to ${toAddress}`, 'info');
                    // Refresh balance
                    loadBalances().then(() => updateBalanceDisplays());
                }
                break;
                
            case 'TokensMinted':
                // Only show if tokens were minted TO the current user
                if (args.to.toLowerCase() === currentUserAddress) {
                    const amount = parseFloat(ethers.utils.formatEther(args.amount)).toFixed(2);
                    addEventToUI('Token Mint', `Received ${amount} newly minted CRST tokens`, 'success');
                    // Refresh balance
                    loadBalances().then(() => updateBalanceDisplays());
                }
                break;
        
            default:
                // Log other token events
                console.log('Other token event (not displayed):', eventName, args);
                break;
        }
        
    } catch (error) {
        console.error('Error handling token event:', error);
    }
}


/**
 * Add event to UI display
 * This adds a new event to the real-time events panel
 */
function addEventToUI(category, message, type = 'info') {
    const eventsContainer = document.getElementById('events-container');
    if (!eventsContainer) return;
    
    const timestamp = new Date().toLocaleTimeString();
    
    // Determine icon and color based on event type
    let icon = 'fa-info-circle';
    let colorClass = 'text-info';
    let bgClass = 'bg-light';
    
    switch (type) {
        case 'success':
            icon = 'fa-check-circle';
            colorClass = 'text-success';
            bgClass = 'bg-success bg-opacity-10';
            break;
        case 'error':
            icon = 'fa-exclamation-circle';
            colorClass = 'text-danger';
            bgClass = 'bg-danger bg-opacity-10';
            break;
        case 'warning':
            icon = 'fa-exclamation-triangle';
            colorClass = 'text-warning';
            bgClass = 'bg-warning bg-opacity-10';
            break;
        case 'info':
            icon = 'fa-info-circle';
            colorClass = 'text-info';
            bgClass = 'bg-info bg-opacity-10';
            break;
    }
    
    // Create event element with improved styling
    const eventElement = document.createElement('div');
    eventElement.className = `border-start border-3 border-${type === 'success' ? 'success' : type === 'error' ? 'danger' : type === 'warning' ? 'warning' : 'info'} ps-3 pb-2 mb-3 ${bgClass} rounded p-2`;
    eventElement.innerHTML = `
        <div class="d-flex justify-content-between align-items-start">
            <div class="flex-grow-1">
                <div class="d-flex align-items-center mb-1">
                    <i class="fas ${icon} ${colorClass} me-2"></i>
                    <strong class="${colorClass}">${category}</strong>
                    <small class="text-muted ms-auto">${timestamp}</small>
                </div>
                <div class="small">${message}</div>
            </div>
        </div>
    `;
    
    // Add to top of events container with smooth animation
    eventsContainer.insertBefore(eventElement, eventsContainer.firstChild);
    
    // Add fade-in animation
    eventElement.style.opacity = '0';
    eventElement.style.transform = 'translateY(-10px)';
    setTimeout(() => {
        eventElement.style.transition = 'all 0.3s ease-in-out';
        eventElement.style.opacity = '1';
        eventElement.style.transform = 'translateY(0)';
    }, 10);
}

// 7. DATA LOADING FUNCTIONS

/**
 * Initialize dashboard by loading all necessary data
 * This loads all the information displayed on the student dashboard
 */
async function initializeDashboard() {
    console.log('Loading student dashboard data...');
    
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
        
        console.log('Dashboard loaded successfully');
    } catch (error) {
        console.error('Dashboard loading failed:', error);
        showMessage('Some data failed to load. Check console for details.', 'warning');
    }
}

/**
 * Load wallet balances from blockchain
 * This gets CRST balance for display in the dashboard
 */
async function loadBalances() {
    try {
        if (provider && signer && crstTokenContract) {
            const walletAddress = await signer.getAddress();
            
            console.log('Loading balances for:', walletAddress);
            
            // Get CRST balance
            const crstBalanceWei = await testContractCall(async () => {
                return await crstTokenContract.balanceOf(walletAddress);
            });
            balances.crst = parseFloat(ethers.utils.formatEther(crstBalanceWei)).toFixed(2);
            
            console.log('Balances loaded:', balances);
        } else {
            throw new Error('Contracts not available');
        }
    } catch (error) {
        console.error('Failed to load balances:', error);
        if (error.message.includes('MetaMask is temporarily overloaded')) {
            showMessage('MetaMask overloaded while loading balances. Will retry automatically.', 'warning');
        }
        // Set error value instead of demo data
        balances = {
            crst: 'Error'
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
            // Get list of all course IDs
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
                    
                    // Convert contract data to JavaScript objects
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
        console.error('Failed to load courses:', error);
        if (error.message.includes('MetaMask is temporarily overloaded')) {
            console.log('Using cached courses due to MetaMask overload');
        }
        // courses array will remain empty or use existing data
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
            
            // Get student's registered course IDs
            const studentCourseIds = await testContractCall(async () => {
                return await courseRegistrationContract.getStudentCourses(walletAddress);
            });
            
            registeredCourses = [];
            const courseMap = new Map(); // Use Map to store latest registration per course
            
            // Load details for each registered course
            for (const courseId of studentCourseIds) {
                try {
                    const [course, registration] = await testContractCall(async () => {
                        const courseData = await courseRegistrationContract.getCourse(courseId);
                        const registrationData = await courseRegistrationContract.getRegistration(walletAddress, courseId);
                        return [courseData, registrationData];
                    });
                    
                    const courseIdStr = courseId.toString();
                    const registrationTime = registration.timestamp.toNumber();
                    
                    // Only keep the latest registration for each course
                    if (!courseMap.has(courseIdStr) || 
                        registrationTime > courseMap.get(courseIdStr).registrationTime) {
                        
                        courseMap.set(courseIdStr, {
                            id: course.id.toString(),
                            name: course.name,
                            description: course.description,
                            creditHours: course.creditHours.toString(),
                            feeInTokens: course.feeInTokens.toString(),
                            capacity: course.capacity.toString(),
                            enrolled: course.enrolled.toString(),
                            isActive: course.isActive,
                            registrationDate: new Date(registrationTime * 1000),
                            registrationTime: registrationTime,
                            hasPaid: registration.hasPaid,
                            paidAmount: registration.paidAmount.toString(),
                            paidAt: registration.paidAt.toNumber() > 0 ? new Date(registration.paidAt.toNumber() * 1000) : null
                        });
                    }
                } catch (registrationError) {
                    console.warn(`Failed to load registration for course ${courseId}:`, registrationError.message);
                }
            }
            
            // Convert Map values to array
            registeredCourses = Array.from(courseMap.values());
            
            console.log(`Loaded ${registeredCourses.length} unique registered courses (from ${studentCourseIds.length} total registrations)`);
            
        } else {
            throw new Error('Course registration contract not available');
        }
    } catch (error) {
        console.error('Failed to load registered courses:', error);
        if (error.message.includes('MetaMask is temporarily overloaded')) {
            console.log('Using cached registered courses due to MetaMask overload');
        }
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
            
            // Get all token requests and filter for this student
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
            
            // Convert contract data to JavaScript objects
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
        console.error('Failed to load token requests:', error);
        if (error.message.includes('MetaMask is temporarily overloaded')) {
            console.log('Using cached token requests due to MetaMask overload');
        }
        // tokenRequests array will remain empty or use existing data
    }
}

// 8. UI UPDATE & RENDERING FUNCTIONS

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
 * Update blockchain connection status indicator
 * This shows whether we're connected to blockchain
 */
function updateBlockchainStatus(status) {
    const statusElement = document.getElementById('blockchain-status');
    if (statusElement) {
        statusElement.textContent = status;
    }
}

/**
 * Update balance displays in the UI
 * This updates the balance cards with current CRST amounts
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
    
    // Create a row for each active course
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
            
            // Build the HTML for this course row with action buttons
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
    
    // Remove duplicates based on course ID
    const uniqueRegisteredCourses = registeredCourses.filter((course, index, self) => 
        index === self.findIndex(c => c.id === course.id)
    );
    
    // Show message if no registered courses
    if (uniqueRegisteredCourses.length === 0) {
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
    // Update cart badge count
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

// 9. EVENT LISTENER SETUP

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
    
    // Token amount input change for cost calculation
    const tokenAmountInput = document.getElementById('token-amount');
    if (tokenAmountInput) {
        tokenAmountInput.addEventListener('input', updateTokenRequestCost);
    }
}

/**
 * Update token request cost display when amount changes
 * This calculates and shows the ETH cost for the requested tokens
 */
function updateTokenRequestCost() {
    const tokenAmountInput = document.getElementById('token-amount');
    const ethCostDisplay = document.getElementById('eth-cost-display');
    
    if (tokenAmountInput && ethCostDisplay) {
        const tokenAmount = parseFloat(tokenAmountInput.value) || 0;
        const ethCost = tokenAmount / parseFloat(contractConstants.exchangeRate);
        ethCostDisplay.textContent = `${ethCost.toFixed(4)} ETH`;
    }
}

// 10. COURSE MANAGEMENT FUNCTIONS

/**
 * Register for a single course
 * This registers the student for a course (no payment yet)
 */
async function registerForCourse(courseId) {
    try {
        showLoadingState(`register-btn-${courseId}`, true);
        
        if (courseRegistrationContract) {
            console.log(`Registering for course ${courseId}...`);
            
            // Call contract function to register
            const tx = await testContractCall(async () => {
                return await courseRegistrationContract.registerForCourse(parseInt(courseId));
            });
            
            showMessage('Transaction sent! Waiting for confirmation...', 'info');
            
            // Wait for transaction confirmation
            const receipt = await tx.wait();
            console.log('Course registration successful:', receipt.transactionHash);
            
            showMessage(`Successfully registered for course! You can now pay the course fee.`, 'success');
            
            // Refresh data to show new registration
            await loadCourses();
            await loadRegisteredCourses();
            renderCourses();
            renderRegisteredCourses();
            
        } else {
            throw new Error('Contract not available');
        }
        
    } catch (error) {
        console.error('Failed to register for course:', error);
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
    
    // Check if already in cart (PREVENT DUPLICATES)
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
    
    // Check if course is active
    if (!course.isActive) {
        showMessage("This course is not available for registration", 'error');
        return;
    }
    
    // Check cart limit (optional - prevent too many courses at once)
    if (cartCourses.length >= 10) {
        showMessage("You can only add up to 10 courses to your cart at once", 'warning');
        return;
    }
    
    // Add to cart
    cartCourses.push(course);
    
    // Update UI immediately
    renderCourses();
    updateCartUI();
    
    // Show success message with course details
    showMessage(`"${course.name}" (${course.feeInTokens} CRST) has been added to your cart`, 'success');
    
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

// 11. PAYMENT FUNCTIONS

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
            console.log(`Processing payment for course ${currentPaymentCourseId}...`);
            
            const courseFeeWei = ethers.utils.parseEther(course.feeInTokens);
            
            // First, check current allowance
            const currentAllowance = await testContractCall(async () => {
                const walletAddress = await signer.getAddress();
                return await crstTokenContract.allowance(walletAddress, courseRegistrationContract.address);
            });
            
            // If allowance is insufficient, request approval first
            if (currentAllowance.lt(courseFeeWei)) {
                console.log('Requesting token approval...');
                showMessage('Please approve the contract to spend your CRST tokens...', 'info');
                
                const approveTx = await testContractCall(async () => {
                    return await crstTokenContract.approve(courseRegistrationContract.address, courseFeeWei);
                });
                
                showMessage('Approval transaction sent! Waiting for confirmation...', 'info');
                await approveTx.wait();
                console.log('Token approval confirmed');
            }
            
            // Now process the payment
            showMessage('Processing payment transaction...', 'info');
            
            const paymentTx = await testContractCall(async () => {
                return await courseRegistrationContract.payFee(parseInt(currentPaymentCourseId));
            });
            
            showMessage('Payment transaction sent! Waiting for confirmation...', 'info');
            
            const receipt = await paymentTx.wait();
            console.log('Payment successful:', receipt.transactionHash);
            
            showMessage('Payment successful! Course fee paid.', 'success');
            
            // Refresh data to show updated payment status
            await loadBalances();
            await loadRegisteredCourses();
            updateBalanceDisplays();
            renderRegisteredCourses();
            
        } else {
            throw new Error('Contracts not available');
        }
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('paymentModal'));
        if (modal) modal.hide();
        
        currentPaymentCourseId = null;
        
    } catch (error) {
        console.error('Payment failed:', error);
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
    
    // ADD THIS LINE TO ACTUALLY SHOW THE MODAL:
    const modal = new bootstrap.Modal(document.getElementById('cartPaymentModal'));
    modal.show();
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
            console.log(`Processing cart payment for ${cartCourses.length} courses...`);
            
            // Remove duplicates from cart before processing
            const uniqueCourseIds = [...new Set(cartCourses.map(c => c.id))];
            const uniqueCourses = uniqueCourseIds.map(id => cartCourses.find(c => c.id === id));
            
            console.log(`Processing ${uniqueCourses.length} unique courses after duplicate removal`);
            
            // First, register for all unique courses in cart
            for (const course of uniqueCourses) {
                try {
                    console.log(`Checking registration status for course ${course.id}...`);
                    
                    // Check if already registered first
                    const isAlreadyRegistered = await testContractCall(async () => {
                        const walletAddress = await signer.getAddress();
                        const [isRegistered] = await courseRegistrationContract.isStudentRegistered(walletAddress, parseInt(course.id));
                        return isRegistered;
                    });
                    
                    if (isAlreadyRegistered) {
                        console.log(`Already registered for course ${course.id}, skipping registration...`);
                        continue;
                    }
                    
                    console.log(`Registering for course ${course.id}...`);
                    showMessage(`Registering for ${course.name}...`, 'info');
                    
                    const registerTx = await testContractCall(async () => {
                        return await courseRegistrationContract.registerForCourse(parseInt(course.id));
                    });
                    
                    await registerTx.wait();
                    console.log(`Successfully registered for course ${course.id}`);
                    
                } catch (regError) {
                    if (regError.message.includes('Already registered')) {
                        console.log(`Already registered for course ${course.id}, continuing...`);
                    } else if (regError.message.includes('Course is full')) {
                        throw new Error(`Course "${course.name}" is full and cannot be registered for`);
                    } else if (regError.message.includes('Invalid/inactive course')) {
                        throw new Error(`Course "${course.name}" is no longer available for registration`);
                    } else {
                        console.error(`Registration failed for course ${course.id}:`, regError);
                        throw new Error(`Failed to register for "${course.name}": ${regError.message}`);
                    }
                }
            }
            
            // Calculate total fee needed (use unique courses)
            const courseIds = uniqueCourses.map(c => parseInt(c.id));
            let totalFeeWei = ethers.BigNumber.from(0);
            
            uniqueCourses.forEach(course => {
                const courseFeeWei = ethers.utils.parseEther(course.feeInTokens);
                totalFeeWei = totalFeeWei.add(courseFeeWei);
            });
            
            console.log(`Total fee required: ${ethers.utils.formatEther(totalFeeWei)} CRST`);
            
            // Check current allowance
            const currentAllowance = await testContractCall(async () => {
                const walletAddress = await signer.getAddress();
                return await crstTokenContract.allowance(walletAddress, courseRegistrationContract.address);
            });
            
            // If allowance is insufficient, request approval
            if (currentAllowance.lt(totalFeeWei)) {
                console.log('Requesting token approval for batch payment...');
                showMessage('Please approve the contract to spend your CRST tokens for all courses...', 'info');
                
                const approveTx = await testContractCall(async () => {
                    return await crstTokenContract.approve(courseRegistrationContract.address, totalFeeWei);
                });
                
                showMessage('Approval transaction sent! Waiting for confirmation...', 'info');
                await approveTx.wait();
                console.log('Token approval confirmed for batch payment');
            }
            
            // Process batch payment
            showMessage('Processing batch payment transaction...', 'info');
            
            const paymentTx = await testContractCall(async () => {
                return await courseRegistrationContract.payFeesForCourses(courseIds);
            });
            
            showMessage('Batch payment transaction sent! Waiting for confirmation...', 'info');
            
            const receipt = await paymentTx.wait();
            console.log('Batch payment successful:', receipt.transactionHash);
            
            showMessage(`Successfully registered and paid for ${uniqueCourses.length} courses!`, 'success');
            
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
            throw new Error('Contracts not available');
        }
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('cartPaymentModal'));
        if (modal) modal.hide();
        
    } catch (error) {
        console.error('Cart payment failed:', error);
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
        } else if (error.message.includes('Course') && error.message.includes('full')) {
            errorMessage = error.message; // Use the specific course full message
        } else if (error.message.includes('Course') && error.message.includes('no longer available')) {
            errorMessage = error.message; // Use the specific course unavailable message
        }
        
        showMessage('Cart payment failed: ' + errorMessage, 'error');
        
    } finally {
        showLoadingState('confirm-cart-payment', false);
    }
}
// 12. TOKEN REQUEST FUNCTIONS

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
            console.log(`Requesting ${amount} CRST tokens...`);
            
            // Calculate required ETH
            const ethRequired = await testContractCall(async () => {
                return await courseRegistrationContract.getRequiredEthForTokens(parseInt(amount));
            });
            
            console.log(`ETH required: ${ethers.utils.formatEther(ethRequired)} ETH`);
            
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
            console.log('Token request submitted:', receipt.transactionHash);
            
            showMessage('Token request submitted successfully! An administrator will review your request.', 'success');
            
            // Refresh data
            await loadTokenRequests();
            renderTokenRequests();
            
        } else {
            throw new Error('Contract not available');
        }
        
        // Hide modal and reset form
        const modal = bootstrap.Modal.getInstance(document.getElementById('requestTokensModal'));
        if (modal) modal.hide();
        document.getElementById('request-tokens-form').reset();
        
    } catch (error) {
        console.error('Token request failed:', error);
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

// 13. PERIODIC REFRESH & UTILITY FUNCTIONS

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
        
        showMessage('All data refreshed successfully!', 'success');
        
    } catch (error) {
        console.error('Failed to refresh data:', error);
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
        console.log('Student portal logout initiated...');
        
        // Stop periodic refresh
        stopPeriodicRefresh();
        
        // Stop event monitoring
        if (courseRegistrationContract) {
            courseRegistrationContract.removeAllListeners();
        }
        if (crstTokenContract) {
            crstTokenContract.removeAllListeners();
        }
        
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
        
        console.log('Redirecting to login page...');
        window.location.href = 'login.html';
        
    } catch (error) {
        console.error('Logout failed:', error);
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
    console.log(`${type.toUpperCase()}:`, message);
    
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
    
    // Stop event monitoring
    if (courseRegistrationContract) {
        courseRegistrationContract.removeAllListeners();
    }
    if (crstTokenContract) {
        crstTokenContract.removeAllListeners();
    }
}

// 14. GLOBAL EXPORTS & EVENT SETUP

// GLOBAL EXPORTS & EVENT SETUP
window.registerForCourse = registerForCourse;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.showPaymentModal = showPaymentModal;
window.showCartPaymentModal = showCartPaymentModal;
window.processCartPayment = processCartPayment;
window.submitTokenRequest = submitTokenRequest;
window.refreshAllData = refreshAllData; 
window.logout = logout;
window.updateTokenRequestCost = updateTokenRequestCost;

// Setup cleanup on page unload
window.addEventListener('beforeunload', cleanup);