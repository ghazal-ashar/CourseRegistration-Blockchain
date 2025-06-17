/*
 * Enhanced Admin Portal with Circuit Breaker Handling - blockchain-based course registration system.
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
let currentRequestId = null;         // ID of currently selected token request
let refreshInterval = null;          // Timer for periodic data refresh

// Data containers - these hold all the information displayed on the dashboard
let courses = [];                    // Array of course objects
let tokenRequests = [];              // Array of pending token requests
let pendingAdmins = [];              // Array of pending admin requests
let systemStats = {};               // System-wide statistics
let supplyInfo = {};                // Token supply information

// Balance information for display
let balances = {
    eth: '0.000',                   // Admin's ETH balance
    contractBalance: '0',           // Contract's CRST balance (collected fees)
    contractEthBalance: '0'         // Contract's ETH balance (from token purchases)
};

// Contract constants (loaded dynamically from contracts)
let contractConstants = {
    maxSupply: '25000.00',          // Maximum CRST supply (loaded from contract)
    exchangeRate: '1000',           // ETH to CRST exchange rate (loaded from contract)
    autoBurnThreshold: '5000.00'    // Auto-burn threshold (loaded from contract)
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
 * Sets up the entire admin portal including blockchain connections and UI
 */
document.addEventListener('DOMContentLoaded', function() {
    // Prevent multiple initializations
    if (isInitialized) {
        console.log('Admin portal already initialized');
        return;
    }
    
    // Prevent multiple initializations with DOM flag
    if (document.body.dataset.adminInit === 'true') {
        console.log('⚠️ Admin portal already initializing, skipping...');
        return;
    }
    document.body.dataset.adminInit = 'true';
    
    console.log('🚀 Initializing Enhanced Admin Portal v2.3...');
    
    // Check for redirect loops
    const redirectCount = parseInt(sessionStorage.getItem('adminRedirectCount') || '0');
    if (redirectCount > 3) {
        console.error('❌ Too many redirects detected, clearing session');
        removeStoredSession();
        sessionStorage.removeItem('adminRedirectCount');
        showMessage('Multiple redirects detected. Please login again.', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        return;
    }
    
    // Verify admin session first
    if (!verifyAdminSession()) {
        console.log('❌ Admin session verification failed, stopping initialization');
        sessionStorage.setItem('adminRedirectCount', (redirectCount + 1).toString());
        return;
    }
    
    // Clear redirect counter on successful verification
    sessionStorage.removeItem('adminRedirectCount');
    
    // Initialize blockchain contracts and dashboard
    initializeContracts().then(() => {
        initializeDashboard();      // Load all dashboard data
        setupEventListeners();      // Set up button clicks and modal events
        startPeriodicRefresh();     // Start auto-refresh timer
        isInitialized = true;
        console.log('✅ Admin Portal v2.3 initialized successfully');
    }).catch(error => {
        console.error('❌ Failed to initialize admin portal:', error);
        showMessage('Failed to connect to blockchain. Please check your connection and refresh.', 'error');
        // Don't fall back to demo mode - require blockchain connection
    });
});

/**
 * Verify admin session using login.js session system
 * This checks if the user has valid admin credentials
 */
function verifyAdminSession() {
    try {
        console.log('🔍 Checking admin session...');
        
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
        
        // Check if user has admin role (using your login.js format)
        const isAdmin = userSession.role === 'admin';
        const isOwner = userSession.isContractOwner === true;
        
        if (!isAdmin && !isOwner) {
            console.log('❌ User is not an admin. Role:', userSession.role, 'Owner:', isOwner);
            showMessage('Access denied. Admin privileges required.', 'error');
            setTimeout(() => {
                window.location.href = 'studentportal.html';
            }, 2000);
            return false;
        }
        
        console.log('✅ Valid admin session found:', userSession.email || userSession.walletAddress);
        console.log('👑 Is owner:', isOwner, '| Is admin:', isAdmin);
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
                    updateBlockchainStatus('✅ Blockchain Connected (Reused)');
                    await loadContractConstants();
                    await verifyContractAdminRights();
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
            updateBlockchainStatus('✅ Blockchain Connected');
            
            // Load contract constants dynamically
            await loadContractConstants();
            
            // Verify admin privileges on the blockchain
            await verifyContractAdminRights();
            
        } else {
            throw new Error('MetaMask not found');
        }
    } catch (error) {
        console.error('❌ Contract initialization failed:', error);
        
        let statusMessage = '❌ Connection Failed';
        let userMessage = 'Blockchain connection failed.';
        
        // Provide specific error messages for common issues
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
        
        if (crstTokenContract) {
            // Try to fetch contract constants with circuit breaker handling
            try {
                const constants = await testContractCall(async () => {
                    const maxSupply = await crstTokenContract.MAX_SUPPLY();
                    const exchangeRate = await crstTokenContract.ETH_TO_CRST_RATE();
                    const autoBurnThreshold = await crstTokenContract.AUTO_BURN_THRESHOLD();
                    return { maxSupply, exchangeRate, autoBurnThreshold };
                });
                
                contractConstants = {
                    maxSupply: parseFloat(ethers.utils.formatEther(constants.maxSupply)).toFixed(2),
                    exchangeRate: constants.exchangeRate.toString(),
                    autoBurnThreshold: parseFloat(ethers.utils.formatEther(constants.autoBurnThreshold)).toFixed(2)
                };
                
                console.log('✅ Contract constants loaded:', contractConstants);
                
            } catch (error) {
                console.warn('⚠️ Could not fetch contract constants, using fallback values:', error.message);
                // Keep default fallback values if contract doesn't expose these constants
                contractConstants = {
                    maxSupply: '25000.00',
                    exchangeRate: '1000',
                    autoBurnThreshold: '5000.00'
                };
            }
        }
        
        // Also try to get constants from CourseRegistration contract
        if (courseRegistrationContract) {
            try {
                const courseExchangeRate = await testContractCall(async () => {
                    return await courseRegistrationContract.ETH_TO_CRST_RATE();
                });
                if (courseExchangeRate) {
                    contractConstants.exchangeRate = courseExchangeRate.toString();
                }
            } catch (error) {
                // This is fine - not all contracts may expose all constants
                console.log('📝 CourseRegistration constants not available, using token contract values');
            }
        }
        
    } catch (error) {
        console.error('❌ Failed to load contract constants:', error);
        // Use fallback values
        contractConstants = {
            maxSupply: '25000.00',
            exchangeRate: '1000',
            autoBurnThreshold: '5000.00'
        };
    }
}

/**
 * Verify admin rights on the smart contract
 * This checks if the connected wallet has admin privileges
 */
async function verifyContractAdminRights() {
    try {
        const walletAddress = await signer.getAddress();
        
        // Check if user is contract owner with circuit breaker handling
        const contractOwner = await testContractCall(async () => {
            return await courseRegistrationContract.owner();
        });
        const isOwner = walletAddress.toLowerCase() === contractOwner.toLowerCase();
        
        // Also check token contract ownership
        let isTokenOwner = false;
        try {
            const tokenOwner = await testContractCall(async () => {
                return await crstTokenContract.owner();
            });
            isTokenOwner = walletAddress.toLowerCase() === tokenOwner.toLowerCase();
        } catch (tokenError) {
            console.warn('Could not verify token contract ownership:', tokenError.message);
        }
        
        // Check if user has admin profile in contract
        let isAdmin = false;
        try {
            const userProfile = await testContractCall(async () => {
                return await courseRegistrationContract.userProfiles(walletAddress);
            });
            isAdmin = userProfile.isActive && userProfile.role.toString() === '1'; // UserRole.Admin = 1
        } catch (error) {
            console.log('No user profile found in contract');
        }
        
        console.log('✅ Admin rights verification:', { 
            isOwner, 
            isTokenOwner, 
            isAdmin,
            walletAddress: walletAddress.slice(0, 6) + '...' + walletAddress.slice(-4),
            contractOwner: contractOwner.slice(0, 6) + '...' + contractOwner.slice(-4)
        });
        
        if (!isOwner && !isAdmin && !isTokenOwner) {
            console.warn('⚠️ Wallet address is not registered as admin in smart contract');
            showMessage('Warning: Admin rights not verified on blockchain. Some functions may fail.', 'warning');
        } else {
            let rightsMessage = 'Blockchain admin rights verified: ';
            const rights = [];
            if (isOwner) rights.push('Contract Owner');
            if (isTokenOwner) rights.push('Token Owner');
            if (isAdmin) rights.push('Admin Profile');
            rightsMessage += rights.join(', ');
            console.log('✅ ' + rightsMessage);
        }
        
    } catch (error) {
        console.error('❌ Admin rights verification failed:', error);
        if (error.message.includes('MetaMask is temporarily overloaded')) {
            showMessage('MetaMask overloaded during admin verification. Some functions may be limited.', 'warning');
        } else {
            showMessage('Warning: Admin rights not verified on blockchain. Some functions may fail.', 'warning');
        }
    }
}

// 6. DATA LOADING FUNCTIONS

/**
 * Initialize dashboard by loading all necessary data
 * This loads all the information displayed on the admin dashboard
 */
async function initializeDashboard() {
    console.log('📊 Loading admin dashboard data...');
    
    try {
        // Load all data concurrently for better performance
        await Promise.all([
            loadBalances(),         // Load wallet and contract balances
            loadSystemStats(),      // Load system-wide statistics
            loadSupplyInfo(),       // Load token supply information
            loadCourses(),          // Load all courses
            loadTokenRequests(),    // Load pending token requests
            loadPendingAdmins()     // Load pending admin requests
        ]);
        
        // Update all UI components with loaded data
        updateBalanceDisplays();
        renderSystemStats();
        renderSupplyInfo();
        renderCourses();
        renderTokenRequests();
        renderPendingAdmins();
        
        // Update auto-burn status after everything is loaded
        await updateAutoBurnStatus();
        
        console.log('✅ Dashboard loaded successfully');
    } catch (error) {
        console.error('❌ Dashboard loading failed:', error);
        showMessage('Some data failed to load. Check console for details.', 'warning');
    }
}

/**
 * Load wallet and contract balances from blockchain
 * This gets ETH and contract balances for display in the dashboard
 */
async function loadBalances() {
    try {
        if (provider && signer && courseRegistrationContract && crstTokenContract) {
            const walletAddress = await signer.getAddress();
            
            console.log('💰 Loading balances for:', walletAddress);
            
            // Get ETH balance from admin's wallet with circuit breaker handling
            const ethBalanceWei = await testContractCall(async () => {
                return await provider.getBalance(walletAddress);
            });
            balances.eth = parseFloat(ethers.utils.formatEther(ethBalanceWei)).toFixed(3);
            
            // Get contract's CRST balance (collected fees) with circuit breaker handling
            const contractCrstBalance = await testContractCall(async () => {
                return await courseRegistrationContract.getContractTokenBalance();
            });
            balances.contractBalance = parseFloat(ethers.utils.formatEther(contractCrstBalance)).toFixed(2);
            
            // Get contract's ETH balance (from token purchases) with circuit breaker handling
            const contractEthBalance = await testContractCall(async () => {
                return await courseRegistrationContract.getContractEthBalance();
            });
            balances.contractEthBalance = parseFloat(ethers.utils.formatEther(contractEthBalance)).toFixed(3);
            
            console.log('💰 Balances loaded:', balances);
        } else {
            throw new Error('Contracts not available');
        }
    } catch (error) {
        console.error('❌ Failed to load balances:', error);
        if (error.message.includes('MetaMask is temporarily overloaded')) {
            showMessage('MetaMask overloaded while loading balances. Will retry automatically.', 'warning');
        }
        // Set error values instead of demo data
        balances = {
            eth: 'Error',
            contractBalance: 'Error',
            contractEthBalance: 'Error'
        };
    }
}

/**
 * Load system statistics from smart contract with enhanced three-tier fallback
 * This gets overall system metrics like total courses, students, etc.
 */
async function loadSystemStats() {
    try {
        if (courseRegistrationContract) {
            console.log('🔄 Attempting to load system stats...');
            
            // TIER 1: Try the full getSystemStats function first
            try {
                const stats = await testContractCall(async () => {
                    return await courseRegistrationContract.getSystemStats();
                });
                
                systemStats = {
                    totalCourses: stats.totalCourses.toString(),
                    totalStudents: stats.totalStudents.toString(),
                    totalFeesCollected: parseFloat(ethers.utils.formatEther(stats.totalFeesCollectedAmount)).toFixed(2),
                    totalEthCollected: parseFloat(ethers.utils.formatEther(stats.totalEthCollectedAmount)).toFixed(3),
                    totalEthReturned: parseFloat(ethers.utils.formatEther(stats.totalEthReturnedAmount)).toFixed(3),
                    totalReturnFees: parseFloat(ethers.utils.formatEther(stats.totalReturnFeesAmount)).toFixed(3),
                    totalTokenRequests: stats.totalTokenRequests.toString(),
                    currentSupply: parseFloat(ethers.utils.formatEther(stats.currentSupply)).toFixed(2),
                    contractTokenBalance: parseFloat(ethers.utils.formatEther(stats.contractTokenBalance)).toFixed(2)
                };
                
                console.log('✅ System stats loaded successfully (Tier 1)');
                return;
                
            } catch (getSystemStatsError) {
                console.warn('⚠️ getSystemStats() failed, trying individual approach (Tier 2):', getSystemStatsError.message);
                
                // TIER 2: If getSystemStats fails, try loading stats individually
                await loadSystemStatsIndividually();
                return;
            }
        } else {
            throw new Error('No contract available');
        }
    } catch (error) {
        console.error('❌ Failed to load system stats completely, using Tier 3:', error);
        
        // TIER 3: Final fallback - use already loaded data
        await loadSystemStatsManually();
    }
}

/**
 * TIER 2: Load system stats individually when getSystemStats() fails
 */
async function loadSystemStatsIndividually() {
    console.log('🔄 Loading system stats individually (Tier 2)...');
    
    try {
        // Initialize with safe defaults
        systemStats = {
            totalCourses: '0',
            totalStudents: '0',
            totalFeesCollected: '0.00',
            totalEthCollected: '0.000',
            totalEthReturned: '0.000',
            totalReturnFees: '0.000',
            totalTokenRequests: '0',
            currentSupply: '0.00',
            contractTokenBalance: '0.00'
        };
        
        // Try to get course count
        try {
            const courseIds = await testContractCall(async () => {
                return await courseRegistrationContract.getAllCourseIds();
            });
            systemStats.totalCourses = courseIds.length.toString();
            console.log('✅ Course count loaded:', systemStats.totalCourses);
        } catch (error) {
            console.warn('Could not get course count:', error.message);
            systemStats.totalCourses = courses.length.toString(); // Use local data
        }
        
        // Try to get token request counter
        try {
            const tokenRequestCounter = await testContractCall(async () => {
                return await courseRegistrationContract.tokenRequestCounter();
            });
            systemStats.totalTokenRequests = tokenRequestCounter.toString();
            console.log('✅ Token request count loaded:', systemStats.totalTokenRequests);
        } catch (error) {
            console.warn('Could not get token request count:', error.message);
            systemStats.totalTokenRequests = tokenRequests.length.toString(); // Use local data
        }
        
        // Try to get student count
        try {
            const totalStudentsRegistered = await testContractCall(async () => {
                return await courseRegistrationContract.totalStudentsRegistered();
            });
            systemStats.totalStudents = totalStudentsRegistered.toString();
            console.log('✅ Student count loaded:', systemStats.totalStudents);
        } catch (error) {
            console.warn('Could not get student count:', error.message);
        }
        
        // Try to get fees collected
        try {
            const totalFeesCollected = await testContractCall(async () => {
                return await courseRegistrationContract.totalFeesCollected();
            });
            systemStats.totalFeesCollected = parseFloat(ethers.utils.formatEther(totalFeesCollected)).toFixed(2);
            console.log('✅ Fees collected loaded:', systemStats.totalFeesCollected);
        } catch (error) {
            console.warn('Could not get fees collected:', error.message);
        }
        
        // Try to get current supply from token contract
        try {
            const currentSupply = await testContractCall(async () => {
                return await crstTokenContract.totalSupply();
            });
            systemStats.currentSupply = parseFloat(ethers.utils.formatEther(currentSupply)).toFixed(2);
            console.log('✅ Current supply loaded:', systemStats.currentSupply);
        } catch (error) {
            console.warn('Could not get current supply:', error.message);
            systemStats.currentSupply = supplyInfo.totalSupply || '0.00';
        }
        
        // Try to get contract token balance
        try {
            const contractTokenBalance = await testContractCall(async () => {
                return await courseRegistrationContract.getContractTokenBalance();
            });
            systemStats.contractTokenBalance = parseFloat(ethers.utils.formatEther(contractTokenBalance)).toFixed(2);
            console.log('✅ Contract token balance loaded:', systemStats.contractTokenBalance);
        } catch (error) {
            console.warn('Could not get contract token balance:', error.message);
            systemStats.contractTokenBalance = balances.contractBalance || '0.00';
        }
        
        console.log('✅ Individual stats loaded successfully (Tier 2)');
    } catch (error) {
        console.error('❌ Individual stats loading failed:', error);
        await loadSystemStatsManually();
    }
}

/**
 * TIER 3: Load system stats manually from already loaded data
 */
async function loadSystemStatsManually() {
    console.log('🔄 Using manual stats calculation (Tier 3)...');
    
    systemStats = {
        totalCourses: courses.length.toString(),
        totalStudents: '0', // Would need to calculate from registrations
        totalFeesCollected: '0.00',
        totalEthCollected: '0.000',
        totalEthReturned: '0.000',
        totalReturnFees: '0.000',
        totalTokenRequests: tokenRequests.length.toString(),
        currentSupply: supplyInfo.totalSupply || '0.00',
        contractTokenBalance: balances.contractBalance || '0.00'
    };
    
    console.log('✅ Manual stats calculation completed (Tier 3)');
}

/**
 * Load token supply information and auto-burn status
 * This shows how many tokens exist vs the maximum supply (fetched from contract)
 */
async function loadSupplyInfo() {
    try {
        if (crstTokenContract) {
            // Get supply information from token contract with circuit breaker handling
            const supplyData = await testContractCall(async () => {
                const totalSupply = await crstTokenContract.totalSupply();
                const remainingSupply = await crstTokenContract.getRemainingSupply();
                const utilizationPercent = await crstTokenContract.getSupplyUtilization();
                return { totalSupply, remainingSupply, utilizationPercent };
            });
            
            supplyInfo = {
                totalSupply: parseFloat(ethers.utils.formatEther(supplyData.totalSupply)).toFixed(2),
                maxSupply: contractConstants.maxSupply, // Now using dynamic value
                remainingSupply: parseFloat(ethers.utils.formatEther(supplyData.remainingSupply)).toFixed(2),
                utilizationPercent: supplyData.utilizationPercent.toString(),
                exchangeRate: contractConstants.exchangeRate,
                autoBurnThreshold: contractConstants.autoBurnThreshold
            };
            
            console.log('📊 Supply info loaded with contract constants:', {
                totalSupply: supplyInfo.totalSupply,
                maxSupply: supplyInfo.maxSupply,
                exchangeRate: supplyInfo.exchangeRate,
                autoBurnThreshold: supplyInfo.autoBurnThreshold
            });
        } else {
            throw new Error('Token contract not available');
        }
    } catch (error) {
        console.error('❌ Failed to load supply info:', error);
        if (error.message.includes('MetaMask is temporarily overloaded')) {
            console.log('📝 Using cached supply info due to MetaMask overload');
        }
        supplyInfo = {
            totalSupply: 'Error',
            maxSupply: contractConstants.maxSupply,
            remainingSupply: 'Error',
            utilizationPercent: '0',
            exchangeRate: contractConstants.exchangeRate,
            autoBurnThreshold: contractConstants.autoBurnThreshold
        };
    }
}

/**
 * Load courses from smart contract
 * This gets all courses and their details for the course management table
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
        courses = [];
    }
}

/**
 * Load pending token requests from smart contract
 * This gets requests where students have paid ETH and are waiting for CRST tokens
 */
async function loadTokenRequests() {
    try {
        if (courseRegistrationContract) {
            // Get all pending token requests with circuit breaker handling
            const pendingRequests = await testContractCall(async () => {
                return await courseRegistrationContract.getPendingTokenRequests();
            });
            
            tokenRequests = pendingRequests.map(request => ({
                id: request.id.toString(),
                student: request.student,
                amountInTokens: request.amountInTokens.toString(),
                ethRequired: parseFloat(ethers.utils.formatEther(request.ethRequired)).toFixed(4),
                reason: request.reason,
                status: request.status,
                timestamp: new Date(request.timestamp.toNumber() * 1000)
            }));
        } else {
            throw new Error('Course registration contract not available');
        }
    } catch (error) {
        console.error('❌ Failed to load token requests:', error);
        if (error.message.includes('MetaMask is temporarily overloaded')) {
            console.log('📝 Using cached token requests due to MetaMask overload');
        }
        tokenRequests = [];
    }
}

/**
 * Load pending admin requests from smart contract events
 * This gets all users who have requested admin access but are still pending
 */
async function loadPendingAdmins() {
    try {
        if (courseRegistrationContract) {
            console.log('🔍 Loading pending admin requests...');
            
            // Get AdminRequested events from the contract with circuit breaker handling
            const events = await testContractCall(async () => {
                const filter = courseRegistrationContract.filters.AdminRequested();
                return await courseRegistrationContract.queryFilter(filter, -10000); // Last ~10k blocks
            });
            
            pendingAdmins = [];
            
            // Check each admin request to see if it's still pending
            for (const event of events) {
                const adminAddress = event.args.pendingAdmin;
                
                try {
                    // Check if still pending (not approved or rejected yet) with circuit breaker handling
                    const statusCheck = await testContractCall(async () => {
                        const isPending = await courseRegistrationContract.pendingAdmins(adminAddress);
                        const userProfile = await courseRegistrationContract.userProfiles(adminAddress);
                        return { isPending, userProfile };
                    });
                    
                    if (statusCheck.isPending && !statusCheck.userProfile.isActive) {
                        pendingAdmins.push({
                            address: adminAddress,
                            requestedAt: new Date(event.args.timestamp ? event.args.timestamp.toNumber() * 1000 : Date.now()),
                            blockNumber: event.blockNumber,
                            transactionHash: event.transactionHash
                        });
                    }
                } catch (error) {
                    console.warn(`Could not check status for ${adminAddress}:`, error.message);
                }
            }
            
            console.log('📋 Found pending admin requests:', pendingAdmins.length);
            
        } else {
            throw new Error('Course registration contract not available');
        }
    } catch (error) {
        console.error('❌ Failed to load pending admin requests:', error);
        if (error.message.includes('MetaMask is temporarily overloaded')) {
            console.log('📝 Using cached admin requests due to MetaMask overload');
        }
        pendingAdmins = [];
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
 * Update blockchain connection status indicator
 * This shows whether we're connected to blockchain or in demo mode
 */
function updateBlockchainStatus(status) {
    const statusElement = document.getElementById('blockchain-status');
    if (statusElement) {
        statusElement.textContent = status;
    }
}

/**
 * Update balance displays in the UI
 * This updates the balance cards with current ETH and contract amounts
 */
function updateBalanceDisplays() {
    const elements = {
        'eth-balance': `${balances.eth} ETH`,
        'contract-balance': `${balances.contractBalance} CRST`,
        'contract-eth-balance': `${balances.contractEthBalance} ETH`
    };
    
    // Update each balance display element
    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    });
}

/**
 * Render system statistics in the dashboard
 * This updates the system stats cards with current numbers
 */
function renderSystemStats() {
    const elements = {
        'total-courses': systemStats.totalCourses || '0',
        'total-students': systemStats.totalStudents || '0',
        'total-registrations': systemStats.totalTokenRequests || '0',
        'total-fees': `${systemStats.totalFeesCollected || '0'} CRST`,
        'pending-requests-badge': tokenRequests.length
    };
    
    // Update each statistic display element
    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    });
}

/**
 * Render token supply information and progress bar with auto-burn status
 * This shows how much of the maximum supply has been used (dynamically fetched from contract)
 */
function renderSupplyInfo() {
    const supplyElements = {
        'current-supply': `${supplyInfo.totalSupply || '0'} CRST`,
        'max-supply': `${supplyInfo.maxSupply || contractConstants.maxSupply} CRST`,
        'remaining-supply': `${supplyInfo.remainingSupply || '0'} CRST remaining`,
        'utilization-percent': `${supplyInfo.utilizationPercent || '0'}%`
    };
    
    // Update each supply display element
    Object.entries(supplyElements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    });
    
    // Update progress bar visual
    const progressBar = document.getElementById('supply-progress');
    if (progressBar && supplyInfo.utilizationPercent) {
        progressBar.style.width = `${supplyInfo.utilizationPercent}%`;
    }
    
    // Update auto-burn status
    updateAutoBurnStatus();
}

/**
 * Enhanced auto-burn status display with willAutoBurnTrigger() support
 * Shows current auto-burn threshold and detailed status
 */
async function updateAutoBurnStatus() {
    const autoBurnInfo = document.getElementById('auto-burn-info');
    const autoBurnStatus = document.getElementById('auto-burn-status');
    
    if (!autoBurnInfo) return;
    
    try {
        const contractBalance = parseFloat(balances.contractBalance) || 0;
        const threshold = parseFloat(contractConstants.autoBurnThreshold) || 5000;
        
        // First, try to get detailed info from willAutoBurnTrigger function
        if (crstTokenContract) {
            try {
                const [willAutoBurn, autoBurnAmount] = await testContractCall(async () => {
                    return await crstTokenContract.willAutoBurnTrigger();
                });
                
                if (willAutoBurn && autoBurnAmount.gt(0)) {
                    const burnAmountFormatted = parseFloat(ethers.utils.formatEther(autoBurnAmount)).toFixed(2);
                    autoBurnInfo.innerHTML = `⚠️ Auto-burn pending: ${burnAmountFormatted} CRST will be burned when contract balance changes`;
                    if (autoBurnStatus) autoBurnStatus.className = 'alert alert-warning';
                    return;
                }
            } catch (error) {
                console.log('📝 willAutoBurnTrigger() not available, using simple threshold check');
                // Continue with simple calculation below
            }
        }
        
        // Fallback to simple threshold calculation
        if (contractBalance > threshold) {
            const excess = (contractBalance - threshold).toFixed(2);
            autoBurnInfo.innerHTML = `🔥 Auto-burn active: Contract balance (${contractBalance} CRST) exceeds threshold (${threshold} CRST). Excess: ${excess} CRST`;
            if (autoBurnStatus) autoBurnStatus.className = 'alert alert-warning';
        } else {
            const remaining = (threshold - contractBalance).toFixed(2);
            autoBurnInfo.innerHTML = `✅ Auto-burn threshold: ${remaining} CRST remaining before auto-burn (Threshold: ${threshold} CRST)`;
            if (autoBurnStatus) autoBurnStatus.className = 'alert alert-success';
        }
        
    } catch (error) {
        console.warn('Could not load auto-burn status:', error.message);
        autoBurnInfo.innerHTML = `ℹ️ Auto-burn: Tokens automatically burned when contract balance > ${contractConstants.autoBurnThreshold} CRST`;
        if (autoBurnStatus) autoBurnStatus.className = 'alert alert-info';
    }
}

/**
 * Render courses table with enrollment progress
 * This creates the table rows showing all courses and their status
 */
function renderCourses() {
    const tableBody = document.getElementById('course-list');
    if (!tableBody) return;
    
    // Clear existing content
    tableBody.innerHTML = '';
    
    // Show message if no courses found
    if (courses.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-3">
                    <i class="fas fa-info-circle me-2"></i>No courses found.
                </td>
            </tr>
        `;
        return;
    }
    
    // Create a row for each course
    courses.forEach(course => {
        const row = document.createElement('tr');
        
        // Create status badge (green for active, gray for inactive)
        const statusBadge = course.isActive ? 
            `<span class="badge bg-success">Active</span>` : 
            `<span class="badge bg-secondary">Inactive</span>`;
        
        // Calculate enrollment percentage for progress bar
        const enrollmentProgress = Math.round((parseInt(course.enrolled) / parseInt(course.capacity)) * 100);
        
        // Build the HTML for this course row with enhanced action buttons
        row.innerHTML = `
            <td>${course.id}</td>
            <td>
                <div class="fw-bold">${course.name}</div>
                <small class="text-muted">${course.description.substring(0, 50)}${course.description.length > 50 ? '...' : ''}</small>
            </td>
            <td>${course.creditHours}</td>
            <td>${course.feeInTokens}</td>
            <td>${course.capacity}</td>
            <td>
                ${course.enrolled}/${course.capacity}
                <div class="progress mt-1" style="height: 4px;">
                    <div class="progress-bar ${enrollmentProgress > 80 ? 'bg-warning' : 'bg-success'}" 
                         style="width: ${enrollmentProgress}%"></div>
                </div>
            </td>
            <td>${statusBadge}</td>
            <td>
                <div class="btn-group" role="group">
                    <button class="btn btn-sm btn-info" 
                            onclick="viewCourseDetails('${course.id}')"
                            title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-primary" 
                            onclick="editCourse('${course.id}')"
                            title="Edit Course">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${course.isActive ? 
                        `<button class="btn btn-sm btn-warning" 
                                onclick="deactivateCourse('${course.id}')"
                                title="Deactivate Course">
                            <i class="fas fa-pause"></i>
                        </button>` :
                        `<button class="btn btn-sm btn-success" 
                                onclick="activateCourse('${course.id}')"
                                title="Activate Course">
                            <i class="fas fa-play"></i>
                        </button>`
                    }

                </div>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}


/**
 * Render token requests list with enhanced information
 * This shows all pending token requests that need admin approval
 */
function renderTokenRequests() {
    const requestsList = document.getElementById('token-requests-list');
    if (!requestsList) return;
    
    // Clear existing content
    requestsList.innerHTML = '';
    
    // Show message if no pending requests
    if (tokenRequests.length === 0) {
        requestsList.innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i>
                No pending token requests.
            </div>
        `;
        return;
    }
    
    // Create list group container
    const listGroup = document.createElement('div');
    listGroup.className = 'list-group';
    
    // Create a list item for each token request
    tokenRequests.forEach(request => {
        const listItem = document.createElement('a');
        listItem.href = '#';
        listItem.className = 'list-group-item list-group-item-action';
        listItem.onclick = () => showTokenRequestModal(request.id);
        
        // Build the HTML for this request
        listItem.innerHTML = `
            <div class="d-flex w-100 justify-content-between">
                <h6 class="mb-1">${request.amountInTokens} CRST</h6>
                <small>${request.timestamp.toLocaleDateString()}</small>
            </div>
            <p class="mb-1">
                From: <span class="font-monospace">${request.student.slice(0, 6)}...${request.student.slice(-4)}</span>
                <span class="badge bg-success ms-2">${request.ethRequired} ETH Paid</span>
            </p>
            <small class="text-truncate d-block">${request.reason.substring(0, 50)}${request.reason.length > 50 ? '...' : ''}</small>
        `;
        
        listGroup.appendChild(listItem);
    });
    
    requestsList.appendChild(listGroup);
}

/**
 * Render pending admin requests with action buttons
 * This displays all users waiting for admin approval
 */
function renderPendingAdmins() {
    const adminRequestsList = document.getElementById('pending-admin-requests-list');
    if (!adminRequestsList) {
        console.log('📝 Admin requests list element not found - add to HTML');
        return;
    }
    
    // Clear existing content
    adminRequestsList.innerHTML = '';
    
    // Show message if no pending requests
    if (pendingAdmins.length === 0) {
        adminRequestsList.innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i>
                No pending admin requests.
            </div>
        `;
        return;
    }
    
    // Create list group container
    const listGroup = document.createElement('div');
    listGroup.className = 'list-group';
    
    // Create a list item for each admin request
    pendingAdmins.forEach(request => {
        const listItem = document.createElement('div');
        listItem.className = 'list-group-item';
        
        // Build the HTML for this request
        listItem.innerHTML = `
            <div class="d-flex w-100 justify-content-between align-items-center">
                <div class="flex-grow-1">
                    <h6 class="mb-1">Admin Access Request</h6>
                    <p class="mb-1">
                        <span class="font-monospace">${request.address.slice(0, 8)}...${request.address.slice(-6)}</span>
                        <small class="text-muted ms-2">• ${request.requestedAt.toLocaleDateString()}</small>
                    </p>
                    <small class="text-muted">Block: ${request.blockNumber}</small>
                </div>
                <div class="btn-group" role="group">
                    <button class="btn btn-sm btn-success" 
                            onclick="approveAdminRequest('${request.address}')"
                            title="Approve Admin Request">
                        <i class="fas fa-check me-1"></i>Approve
                    </button>
                    <button class="btn btn-sm btn-danger" 
                            onclick="rejectAdminRequest('${request.address}')"
                            title="Reject Admin Request">
                        <i class="fas fa-times me-1"></i>Reject
                    </button>
                </div>
            </div>
        `;
        
        listGroup.appendChild(listItem);
    });
    
    adminRequestsList.appendChild(listGroup);
    
    // Update pending requests count badge if it exists
    const pendingAdminsBadge = document.getElementById('pending-admins-badge');
    if (pendingAdminsBadge) {
        pendingAdminsBadge.textContent = pendingAdmins.length;
    }
}

// 8. EVENT LISTENER SETUP

/**
 * Setup all event listeners for buttons and modals
 * This connects HTML buttons to JavaScript functions
 */
function setupEventListeners() {
    // Logout button in navigation
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Course management buttons
    const addCourseBtn = document.getElementById('add-course-btn');
    if (addCourseBtn) {
        addCourseBtn.addEventListener('click', addNewCourse);
    }
    const updateCourseBtn = document.getElementById('update-course-btn');
    if (updateCourseBtn) {
        updateCourseBtn.addEventListener('click', updateCourse);
    }
    
    // Token request management buttons
    const approveTokenBtn = document.getElementById('approve-token-btn');
    const rejectRequestBtn = document.getElementById('reject-request-btn');
    
    if (approveTokenBtn) approveTokenBtn.addEventListener('click', approveTokenRequest);
    if (rejectRequestBtn) rejectRequestBtn.addEventListener('click', rejectTokenRequest);
    
    // Fund withdrawal buttons
    const withdrawEthBtn = document.getElementById('withdraw-eth-btn');
    const withdrawAllEthBtn = document.getElementById('withdraw-all-eth-btn');
    const withdrawTokensBtn = document.getElementById('withdraw-tokens-btn');
    
    if (withdrawEthBtn) withdrawEthBtn.addEventListener('click', () => withdrawEth(false));
    if (withdrawAllEthBtn) withdrawAllEthBtn.addEventListener('click', () => withdrawEth(true));
    if (withdrawTokensBtn) withdrawTokensBtn.addEventListener('click', withdrawTokenFees);
    
    // Beneficiary management button
    const setBeneficiaryBtn = document.getElementById('set-beneficiary-btn');
    if (setBeneficiaryBtn) setBeneficiaryBtn.addEventListener('click', setBeneficiary);
    
    // Modal update events
    const modalIds = ['withdrawFeesModal', 'setBeneficiaryModal'];
    modalIds.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.addEventListener('show.bs.modal', () => updateModalData(modalId));
        }
    });
}

// 9. MODAL FUNCTIONS

/**
 * Show token request modal with detailed information
 * This displays a popup with full details of a token request for admin review
 */
function showTokenRequestModal(requestId) {
    const request = tokenRequests.find(r => r.id === requestId);
    if (!request) return;
    
    // Store current request ID for approve/reject functions
    currentRequestId = requestId;
    
    // Populate modal with request details
    document.getElementById('request-student').textContent = request.student;
    document.getElementById('request-amount').textContent = `${request.amountInTokens} CRST`;
    document.getElementById('request-eth-paid').textContent = `${request.ethRequired} ETH`;
    document.getElementById('request-date').textContent = request.timestamp.toLocaleDateString();
    document.getElementById('request-reason').textContent = request.reason;
    
    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('tokenRequestModal'));
    modal.show();
}

/**
 * Update modal data when modals are shown
 * This refreshes contract balances and beneficiary info for modals
 */
async function updateModalData(modalId) {
    try {
        switch (modalId) {
            case 'withdrawFeesModal':
                // Refresh and update contract balances for withdraw modal
                await loadBalances();
                
                const contractEthBalanceDisplay = document.getElementById('contract-eth-balance-display');
                const contractTokenBalanceDisplay = document.getElementById('contract-token-balance-display');
                
                if (contractEthBalanceDisplay) {
                    contractEthBalanceDisplay.textContent = `${balances.contractEthBalance} ETH`;
                }
                if (contractTokenBalanceDisplay) {
                    contractTokenBalanceDisplay.textContent = `${balances.contractBalance} CRST`;
                }
                
                // Get and display current beneficiary with circuit breaker handling
                if (courseRegistrationContract) {
                    try {
                        const beneficiary = await testContractCall(async () => {
                            return await courseRegistrationContract.beneficiary();
                        });
                        const beneficiaryElement = document.getElementById('current-beneficiary');
                        if (beneficiaryElement) {
                            const shortAddress = `${beneficiary.slice(0, 6)}...${beneficiary.slice(-4)}`;
                            beneficiaryElement.textContent = shortAddress;
                            beneficiaryElement.title = beneficiary;
                        }
                    } catch (error) {
                        console.warn('Could not get beneficiary:', error.message);
                        const beneficiaryElement = document.getElementById('current-beneficiary');
                        if (beneficiaryElement) {
                            beneficiaryElement.textContent = 'Not set';
                        }
                    }
                }
                break;
                
            case 'setBeneficiaryModal':
                // Get and display current beneficiary for comparison in set beneficiary modal
                if (courseRegistrationContract) {
                    try {
                        const beneficiary = await testContractCall(async () => {
                            return await courseRegistrationContract.beneficiary();
                        });
                        const currentBeneficiaryDisplay = document.getElementById('current-beneficiary-display');
                        if (currentBeneficiaryDisplay) {
                            const shortAddress = `${beneficiary.slice(0, 6)}...${beneficiary.slice(-4)}`;
                            currentBeneficiaryDisplay.textContent = shortAddress;
                            currentBeneficiaryDisplay.title = beneficiary;
                        }
                    } catch (error) {
                        console.warn('Could not get beneficiary:', error.message);
                        const currentBeneficiaryDisplay = document.getElementById('current-beneficiary-display');
                        if (currentBeneficiaryDisplay) {
                            currentBeneficiaryDisplay.textContent = 'Not set';
                        }
                    }
                }
                break;
        }
    } catch (error) {
        console.error('❌ Failed to update modal data:', error);
        if (error.message.includes('MetaMask is temporarily overloaded')) {
            showMessage('MetaMask overloaded while updating modal data. Please try again in a moment.', 'warning');
        }
    }
}

// 10. COURSE MANAGEMENT FUNCTIONS

/**
 * Add new course to the smart contract
 * This creates a new course with the provided details
 */
async function addNewCourse() {
    // Get form values
    const name = document.getElementById('course-name').value;
    const description = document.getElementById('course-description').value;
    const creditHours = document.getElementById('credit-hours').value;
    const fee = document.getElementById('course-fee').value;
    const capacity = document.getElementById('course-capacity').value;
    
    // Validate form inputs
    if (!name || !description || !creditHours || !fee || !capacity) {
        showMessage('Please fill in all fields', 'error');
        return;
    }
    
    // Validate ranges according to contract limits
    if (parseInt(creditHours) < 1 || parseInt(creditHours) > 6) {
        showMessage('Credit hours must be between 1 and 6', 'error');
        return;
    }
    
    if (parseInt(fee) < 1 || parseInt(fee) > 10000) {
        showMessage('Fee must be between 1 and 10,000 CRST', 'error');
        return;
    }
    
    if (parseInt(capacity) < 1 || parseInt(capacity) > 1000) {
        showMessage('Capacity must be between 1 and 1,000 students', 'error');
        return;
    }
    
    try {
        // Show loading state on button
        showLoadingState('add-course-btn', true);
        
        if (courseRegistrationContract) {
            console.log('📝 Adding course to blockchain...');
            
            // Call contract function to add course with circuit breaker handling
            const tx = await testContractCall(async () => {
                return await courseRegistrationContract.addCourse(
                    name, 
                    description, 
                    parseInt(creditHours), 
                    parseInt(fee), 
                    parseInt(capacity)
                );
            });
            
            showMessage('Transaction sent! Waiting for confirmation...', 'info');
            
            // Wait for transaction confirmation
            const receipt = await tx.wait();
            console.log('✅ Course added:', receipt.transactionHash);
            
            showMessage('Course added successfully!', 'success');
            
            // Refresh data to show new course
            await loadCourses();
            await loadSystemStats();
            renderCourses();
            renderSystemStats();
            
        } else {
            throw new Error('Contract not available');
        }
        
        // Close modal and reset form
        const modal = bootstrap.Modal.getInstance(document.getElementById('addCourseModal'));
        if (modal) modal.hide();
        document.getElementById('add-course-form').reset();
        
    } catch (error) {
        console.error('❌ Failed to add course:', error);
        let errorMessage = error.message;
        
        // Handle specific contract errors
        if (error.message.includes('MetaMask is temporarily overloaded')) {
            errorMessage = 'MetaMask is temporarily overloaded. Please wait a moment and try again.';
        } else if (error.message.includes('Maximum courses reached')) {
            errorMessage = 'Maximum number of courses (900) reached';
        } else if (error.message.includes('Invalid')) {
            errorMessage = 'Invalid course parameters';
        }
        
        showMessage('Failed to add course: ' + errorMessage, 'error');
    } finally {
        // Restore button state
        showLoadingState('add-course-btn', false);
    }
}

/**
 * View detailed course information
 * This shows a popup with comprehensive course details and metrics
 */
function viewCourseDetails(courseId) {
    const course = courses.find(c => c.id === courseId);
    if (!course) return;
    
    // Calculate additional metrics
    const enrollmentRate = Math.round((parseInt(course.enrolled) / parseInt(course.capacity)) * 100);
    const revenue = parseInt(course.feeInTokens) * parseInt(course.enrolled);
    
    const details = `
Course Details:

📋 Basic Information:
• ID: ${course.id}
• Name: ${course.name}
• Description: ${course.description}
• Credit Hours: ${course.creditHours}

💰 Financial Information:
• Fee: ${course.feeInTokens} CRST per student
• Revenue Generated: ${revenue} CRST (${course.enrolled} students)

👥 Enrollment Information:
• Capacity: ${course.capacity} students
• Currently Enrolled: ${course.enrolled} students
• Enrollment Rate: ${enrollmentRate}%
• Available Spots: ${parseInt(course.capacity) - parseInt(course.enrolled)}

📅 Administrative Information:
• Status: ${course.isActive ? 'Active ✅' : 'Inactive ❌'}
• Created: ${course.createdAt.toLocaleDateString()}
• Created By: ${course.createdBy.slice(0, 6)}...${course.createdBy.slice(-4)}

🔧 System Information:
• Exchange Rate: 1 ETH = ${contractConstants.exchangeRate} CRST
• Max Supply: ${contractConstants.maxSupply} CRST
• Auto-burn Threshold: ${contractConstants.autoBurnThreshold} CRST
    `;
    
    alert(details);
}


function editCourse(courseId) {
    const course = courses.find(c => c.id === courseId);
    if (!course) {
        showMessage('Course not found', 'error');
        return;
    }
    
    // Populate edit modal with current course data
    document.getElementById('edit-course-id').value = course.id;
    document.getElementById('edit-course-name').value = course.name;
    document.getElementById('edit-course-description').value = course.description;
    document.getElementById('edit-credit-hours').value = course.creditHours;
    document.getElementById('edit-course-fee').value = course.feeInTokens;
    document.getElementById('edit-course-capacity').value = course.capacity;
    
    // Show current enrollment info
    document.getElementById('current-enrollment').textContent = `${course.enrolled} students currently enrolled`;
    
    // Show the edit modal
    const modal = new bootstrap.Modal(document.getElementById('editCourseModal'));
    modal.show();
}

/**
 * Update course with new details
 */
async function updateCourse() {
    const courseId = document.getElementById('edit-course-id').value;
    const name = document.getElementById('edit-course-name').value;
    const description = document.getElementById('edit-course-description').value;
    const creditHours = document.getElementById('edit-credit-hours').value;
    const fee = document.getElementById('edit-course-fee').value;
    const capacity = document.getElementById('edit-course-capacity').value;
    
    // Validate form inputs
    if (!name || !description || !creditHours || !fee || !capacity) {
        showMessage('Please fill in all fields', 'error');
        return;
    }
    
    // Validate ranges according to contract limits
    if (parseInt(creditHours) < 1 || parseInt(creditHours) > 6) {
        showMessage('Credit hours must be between 1 and 6', 'error');
        return;
    }
    
    if (parseInt(fee) < 1 || parseInt(fee) > 10000) {
        showMessage('Fee must be between 1 and 10,000 CRST', 'error');
        return;
    }
    
    if (parseInt(capacity) < 1 || parseInt(capacity) > 1000) {
        showMessage('Capacity must be between 1 and 1,000 students', 'error');
        return;
    }
    
    try {
        showLoadingState('update-course-btn', true);
        
        if (courseRegistrationContract) {
            console.log(`📝 Updating course ${courseId}...`);
            
            // Call contract function to update course with circuit breaker handling
            const tx = await testContractCall(async () => {
                return await courseRegistrationContract.updateCourse(
                    parseInt(courseId),
                    name, 
                    description, 
                    parseInt(creditHours), 
                    parseInt(fee), 
                    parseInt(capacity)
                );
            });
            
            showMessage('Transaction sent! Waiting for confirmation...', 'info');
            
            // Wait for transaction confirmation
            const receipt = await tx.wait();
            console.log('✅ Course updated:', receipt.transactionHash);
            
            showMessage('Course updated successfully!', 'success');
            
            // Refresh data to show updated course
            await loadCourses();
            renderCourses();
            
        } else {
            throw new Error('Contract not available');
        }
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('editCourseModal'));
        if (modal) modal.hide();
        
    } catch (error) {
        console.error('❌ Failed to update course:', error);
        let errorMessage = error.message;
        
        // Handle specific contract errors
        if (error.message.includes('MetaMask is temporarily overloaded')) {
            errorMessage = 'MetaMask is temporarily overloaded. Please wait a moment and try again.';
        } else if (error.message.includes('Course not found')) {
            errorMessage = 'Course not found or invalid course ID';
        } else if (error.message.includes('Cannot reduce capacity below enrolled')) {
            errorMessage = 'Cannot reduce capacity below current enrollment';
        }
        
        showMessage('Failed to update course: ' + errorMessage, 'error');
    } finally {
        showLoadingState('update-course-btn', false);
    }
}

/**
 * Deactivate a course
 */
async function deactivateCourse(courseId) {
    const course = courses.find(c => c.id === courseId);
    if (!course) {
        showMessage('Course not found', 'error');
        return;
    }
    
    // Confirm deactivation
    if (!confirm(`Are you sure you want to deactivate "${course.name}"?\n\nStudents will no longer be able to register for this course.`)) {
        return;
    }
    
    try {
        if (courseRegistrationContract) {
            console.log(`⏸️ Deactivating course ${courseId}...`);
            
            // Call contract function to deactivate course
            const tx = await testContractCall(async () => {
                return await courseRegistrationContract.deactivateCourse(parseInt(courseId));
            });
            
            showMessage('Transaction sent! Waiting for confirmation...', 'info');
            
            const receipt = await tx.wait();
            console.log('✅ Course deactivated:', receipt.transactionHash);
            
            showMessage(`Course "${course.name}" deactivated successfully!`, 'success');
            
            // Refresh data to show updated status
            await loadCourses();
            renderCourses();
            
        } else {
            throw new Error('Contract not available');
        }
        
    } catch (error) {
        console.error('❌ Failed to deactivate course:', error);
        let errorMessage = error.message;
        
        if (error.message.includes('MetaMask is temporarily overloaded')) {
            errorMessage = 'MetaMask is temporarily overloaded. Please wait a moment and try again.';
        } else if (error.message.includes('Course not found')) {
            errorMessage = 'Course not found';
        } else if (error.message.includes('Course already inactive')) {
            errorMessage = 'Course is already inactive';
        }
        
        showMessage('Failed to deactivate course: ' + errorMessage, 'error');
    }
}

/**
 * Activate a course
 */
async function activateCourse(courseId) {
    const course = courses.find(c => c.id === courseId);
    if (!course) {
        showMessage('Course not found', 'error');
        return;
    }
    
    try {
        if (courseRegistrationContract) {
            console.log(`▶️ Activating course ${courseId}...`);
            
            // Call contract function to activate course
            const tx = await testContractCall(async () => {
                return await courseRegistrationContract.activateCourse(parseInt(courseId));
            });
            
            showMessage('Transaction sent! Waiting for confirmation...', 'info');
            
            const receipt = await tx.wait();
            console.log('✅ Course activated:', receipt.transactionHash);
            
            showMessage(`Course "${course.name}" activated successfully!`, 'success');
            
            // Refresh data to show updated status
            await loadCourses();
            renderCourses();
            
        } else {
            throw new Error('Contract not available');
        }
        
    } catch (error) {
        console.error('❌ Failed to activate course:', error);
        let errorMessage = error.message;
        
        if (error.message.includes('MetaMask is temporarily overloaded')) {
            errorMessage = 'MetaMask is temporarily overloaded. Please wait a moment and try again.';
        } else if (error.message.includes('Course not found')) {
            errorMessage = 'Course not found';
        } else if (error.message.includes('Course already active')) {
            errorMessage = 'Course is already active';
        }
        
        showMessage('Failed to activate course: ' + errorMessage, 'error');
    }
}

// 11. TOKEN REQUEST MANAGEMENT

/**
 * Approve token request - transfers tokens immediately
 * This approves a student's token request and transfers CRST tokens to them
 */
async function approveTokenRequest() {
    if (!currentRequestId) return;
    
    const request = tokenRequests.find(r => r.id === currentRequestId);
    if (!request) return;
    
    try {
        showLoadingState('approve-token-btn', true);
        
        if (courseRegistrationContract) {
            console.log(`💰 Approving token request ${currentRequestId}...`);
            
            // Call contract function to approve request with circuit breaker handling
            const tx = await testContractCall(async () => {
                return await courseRegistrationContract.approveTokenRequest(parseInt(currentRequestId));
            });
            
            showMessage('Transaction sent! Waiting for confirmation...', 'info');
            
            const receipt = await tx.wait();
            console.log('✅ Token request approved:', receipt.transactionHash);
            
            showMessage(`✅ ${request.amountInTokens} CRST sent to student successfully!`, 'success');
            
            // Refresh data to update pending requests
            await Promise.all([
                loadTokenRequests(),
                loadBalances(),
                loadSystemStats(),
                loadSupplyInfo()
            ]);
            
            renderTokenRequests();
            updateBalanceDisplays();
            renderSystemStats();
            renderSupplyInfo();
            
        } else {
            throw new Error('Contract not available');
        }
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('tokenRequestModal'));
        if (modal) modal.hide();
        
    } catch (error) {
        console.error('❌ Failed to approve token request:', error);
        let errorMessage = error.message;
        
        // Handle specific contract errors
        if (error.message.includes('MetaMask is temporarily overloaded')) {
            errorMessage = 'MetaMask is temporarily overloaded. Please wait a moment and try again.';
        } else if (error.code === 4001) {
            errorMessage = 'Transaction cancelled by user';
        } else if (error.message.includes('insufficient funds')) {
            errorMessage = 'Insufficient funds for transaction';
        } else if (error.message.includes('Not enough tokens available')) {
            errorMessage = 'Not enough tokens available to mint';
        }
        
        showMessage('Failed to approve request: ' + errorMessage, 'error');
    } finally {
        showLoadingState('approve-token-btn', false);
    }
}

/**
 * Reject token request - refunds ETH to student
 * This rejects a student's token request and refunds their ETH payment
 */
async function rejectTokenRequest() {
    if (!currentRequestId) return;
    
    const request = tokenRequests.find(r => r.id === currentRequestId);
    if (!request) return;
    
    try {
        showLoadingState('reject-request-btn', true);
        
        if (courseRegistrationContract) {
            console.log('❌ Rejecting token request...');
            
            // Call contract function to reject request with circuit breaker handling
            const tx = await testContractCall(async () => {
                return await courseRegistrationContract.rejectTokenRequest(parseInt(currentRequestId));
            });
            
            showMessage('Transaction sent! Waiting for confirmation...', 'info');
            
            const receipt = await tx.wait();
            console.log('✅ Token request rejected:', receipt.transactionHash);
            
            showMessage(`Token request rejected. ${request.ethRequired} ETH refunded to student.`, 'info');
            
            // Refresh data to update pending requests
            await loadTokenRequests();
            await loadSystemStats();
            renderTokenRequests();
            renderSystemStats();
            
        } else {
            throw new Error('Contract not available');
        }
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('tokenRequestModal'));
        if (modal) modal.hide();
        
    } catch (error) {
        console.error('❌ Failed to reject token request:', error);
        let errorMessage = error.message;
        
        if (error.message.includes('MetaMask is temporarily overloaded')) {
            errorMessage = 'MetaMask is temporarily overloaded. Please wait a moment and try again.';
        }
        
        showMessage('Failed to reject request: ' + errorMessage, 'error');
    } finally {
        showLoadingState('reject-request-btn', false);
    }
}

// 12. FINANCIAL OPERATIONS

/**
 * Withdraw ETH from contract (burns equivalent CRST automatically)
 * This withdraws ETH collected from token purchases and automatically burns equivalent CRST
 */
async function withdrawEth(withdrawAll) {
    try {
        const buttonId = withdrawAll ? 'withdraw-all-eth-btn' : 'withdraw-eth-btn';
        showLoadingState(buttonId, true);
        
        if (courseRegistrationContract) {
            let tx;
            
            if (withdrawAll) {
                console.log('💰 Withdrawing all ETH from contract...');
                tx = await testContractCall(async () => {
                    return await courseRegistrationContract.withdrawAllEth();
                });
            } else {
                const specificAmount = document.getElementById('withdraw-eth-amount').value;
                if (!specificAmount || parseFloat(specificAmount) <= 0) {
                    showMessage('Please enter a valid ETH amount', 'error');
                    return;
                }
                
                const amountInWei = ethers.utils.parseEther(specificAmount);
                console.log(`💰 Withdrawing ${specificAmount} ETH from contract...`);
                tx = await testContractCall(async () => {
                    return await courseRegistrationContract.withdrawEth(amountInWei);
                });
            }
            
            showMessage('Transaction sent! Waiting for confirmation...', 'info');
            
            const receipt = await tx.wait();
            console.log('✅ ETH withdrawn:', receipt.transactionHash);
            
            showMessage('✅ ETH withdrawn successfully! Equivalent CRST tokens were automatically burned.', 'success');
            
            // Refresh balances and supply info
            await loadBalances();
            await loadSupplyInfo();
            updateBalanceDisplays();
            renderSupplyInfo();
            
        } else {
            throw new Error('Contract not available');
        }
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('withdrawFeesModal'));
        if (modal) modal.hide();
        
    } catch (error) {
        console.error('❌ Failed to withdraw ETH:', error);
        let errorMessage = error.message;
        
        // Handle specific contract errors
        if (error.message.includes('MetaMask is temporarily overloaded')) {
            errorMessage = 'MetaMask is temporarily overloaded. Please wait a moment and try again.';
        } else if (error.message.includes('No beneficiary set')) {
            errorMessage = 'No beneficiary address set. Please set a beneficiary first.';
        } else if (error.message.includes('Insufficient contract ETH balance')) {
            errorMessage = 'Insufficient ETH in contract to withdraw.';
        }
        
        showMessage('Failed to withdraw ETH: ' + errorMessage, 'error');
    } finally {
        const buttonId = withdrawAll ? 'withdraw-all-eth-btn' : 'withdraw-eth-btn';
        showLoadingState(buttonId, false);
    }
}

/**
 * Withdraw CRST token fees from contract to beneficiary
 * This withdraws CRST tokens collected as course fees and sends them to the beneficiary
 */
async function withdrawTokenFees() {
    const amount = document.getElementById('withdraw-token-amount').value;
    
    if (!amount || parseInt(amount) <= 0) {
        showMessage('Please enter a valid token amount', 'error');
        return;
    }
    
    try {
        showLoadingState('withdraw-tokens-btn', true);
        
        if (courseRegistrationContract) {
            console.log(`💰 Withdrawing ${amount} CRST from contract...`);
            
            // Call contract function to withdraw token fees with circuit breaker handling
            const tx = await testContractCall(async () => {
                return await courseRegistrationContract.withdrawTokenFees(parseInt(amount));
            });
            
            showMessage('Transaction sent! Waiting for confirmation...', 'info');
            
            const receipt = await tx.wait();
            console.log('✅ Token fees withdrawn:', receipt.transactionHash);
            
            showMessage('✅ Token fees withdrawn successfully!', 'success');
            
            // Refresh contract balances
            await loadBalances();
            updateBalanceDisplays();
            
        } else {
            throw new Error('Contract not available');
        }
        
        // Close modal and reset form
        const modal = bootstrap.Modal.getInstance(document.getElementById('withdrawFeesModal'));
        if (modal) modal.hide();
        document.getElementById('withdraw-token-amount').value = '';
        
    } catch (error) {
        console.error('❌ Failed to withdraw token fees:', error);
        let errorMessage = error.message;
        
        // Handle specific contract errors
        if (error.message.includes('MetaMask is temporarily overloaded')) {
            errorMessage = 'MetaMask is temporarily overloaded. Please wait a moment and try again.';
        } else if (error.message.includes('No beneficiary set')) {
            errorMessage = 'No beneficiary address set. Please set a beneficiary first.';
        } else if (error.message.includes('Insufficient contract token balance')) {
            errorMessage = 'Insufficient tokens in contract to withdraw.';
        }
        
        showMessage('Failed to withdraw token fees: ' + errorMessage, 'error');
    } finally {
        showLoadingState('withdraw-tokens-btn', false);
    }
}

/**
 * Set beneficiary address for receiving withdrawn funds
 * This sets the wallet address that will receive all withdrawn ETH and CRST
 */
async function setBeneficiary() {
    const beneficiaryAddress = document.getElementById('beneficiary-address').value;
    
    // Validate beneficiary address
    if (!beneficiaryAddress) {
        showMessage('Please enter a beneficiary address', 'error');
        return;
    }
    
    if (!ethers.utils.isAddress(beneficiaryAddress)) {
        showMessage('Invalid beneficiary address', 'error');
        return;
    }
    
    try {
        showLoadingState('set-beneficiary-btn', true);
        
        if (courseRegistrationContract) {
            console.log(`🏦 Setting beneficiary to ${beneficiaryAddress}...`);
            
            // Call contract function to set beneficiary with circuit breaker handling
            const tx = await testContractCall(async () => {
                return await courseRegistrationContract.setBeneficiary(beneficiaryAddress);
            });
            
            showMessage('Transaction sent! Waiting for confirmation...', 'info');
            
            const receipt = await tx.wait();
            console.log('✅ Beneficiary set:', receipt.transactionHash);
            
            showMessage('✅ Beneficiary address updated successfully!', 'success');
            
        } else {
            throw new Error('Contract not available');
        }
        
        // Close modal and reset form
        const modal = bootstrap.Modal.getInstance(document.getElementById('setBeneficiaryModal'));
        if (modal) modal.hide();
        document.getElementById('set-beneficiary-form').reset();
        
    } catch (error) {
        console.error('❌ Failed to set beneficiary:', error);
        let errorMessage = error.message;
        
        // Handle specific contract errors
        if (error.message.includes('MetaMask is temporarily overloaded')) {
            errorMessage = 'MetaMask is temporarily overloaded. Please wait a moment and try again.';
        } else if (error.message.includes('Only owner')) {
            errorMessage = 'Only the contract owner can set the beneficiary address.';
        }
        
        showMessage('Failed to set beneficiary: ' + errorMessage, 'error');
    } finally {
        showLoadingState('set-beneficiary-btn', false);
    }
}

// 13. ADMIN REQUEST MANAGEMENT

/**
 * Approve an admin access request
 * This grants admin privileges to a user who requested them
 */
async function approveAdminRequest(adminAddress) {
    if (!adminAddress || !ethers.utils.isAddress(adminAddress)) {
        showMessage('Invalid admin address', 'error');
        return;
    }
    
    try {
        console.log(`👨‍💼 Approving admin request for ${adminAddress}...`);
        
        if (courseRegistrationContract) {
            // Call contract function to approve admin with circuit breaker handling
            const tx = await testContractCall(async () => {
                return await courseRegistrationContract.approveAdmin(adminAddress);
            });
            
            showMessage('Transaction sent! Waiting for confirmation...', 'info');
            
            const receipt = await tx.wait();
            console.log('✅ Admin request approved:', receipt.transactionHash);
            
            showMessage(`✅ Admin access granted to ${adminAddress.slice(0, 8)}...${adminAddress.slice(-6)}`, 'success');
            
            // Refresh data to update pending requests
            await loadPendingAdmins();
            await loadSystemStats();
            renderPendingAdmins();
            renderSystemStats();
            
        } else {
            throw new Error('Contract not available');
        }
        
    } catch (error) {
        console.error('❌ Failed to approve admin request:', error);
        let errorMessage = error.message;
        
        // Handle specific contract errors
        if (error.message.includes('MetaMask is temporarily overloaded')) {
            errorMessage = 'MetaMask is temporarily overloaded. Please wait a moment and try again.';
        } else if (error.code === 4001) {
            errorMessage = 'Transaction cancelled by user';
        } else if (error.message.includes('No pending admin request')) {
            errorMessage = 'No pending admin request found for this address';
        } else if (error.message.includes('User already registered')) {
            errorMessage = 'User is already registered in the system';
        }
        
        showMessage('Failed to approve admin request: ' + errorMessage, 'error');
    }
}

/**
 * Reject an admin access request
 * This denies admin privileges and removes them from pending list
 */
async function rejectAdminRequest(adminAddress) {
    if (!adminAddress || !ethers.utils.isAddress(adminAddress)) {
        showMessage('Invalid admin address', 'error');
        return;
    }
    
    // Confirm rejection
    if (!confirm(`Are you sure you want to reject the admin request from ${adminAddress.slice(0, 8)}...${adminAddress.slice(-6)}?`)) {
        return;
    }
    
    try {
        console.log(`❌ Rejecting admin request for ${adminAddress}...`);
        
        if (courseRegistrationContract) {
            // Call contract function to reject admin with circuit breaker handling
            const tx = await testContractCall(async () => {
                return await courseRegistrationContract.rejectAdmin(adminAddress);
            });
            
            showMessage('Transaction sent! Waiting for confirmation...', 'info');
            
            const receipt = await tx.wait();
            console.log('✅ Admin request rejected:', receipt.transactionHash);
            
            showMessage(`Admin request rejected for ${adminAddress.slice(0, 8)}...${adminAddress.slice(-6)}`, 'info');
            
            // Refresh data to update pending requests
            await loadPendingAdmins();
            await loadSystemStats();
            renderPendingAdmins();
            renderSystemStats();
            
        } else {
            throw new Error('Contract not available');
        }
        
    } catch (error) {
        console.error('❌ Failed to reject admin request:', error);
        let errorMessage = error.message;
        
        // Handle specific contract errors
        if (error.message.includes('MetaMask is temporarily overloaded')) {
            errorMessage = 'MetaMask is temporarily overloaded. Please wait a moment and try again.';
        } else if (error.code === 4001) {
            errorMessage = 'Transaction cancelled by user';
        } else if (error.message.includes('No pending admin request')) {
            errorMessage = 'No pending admin request found for this address';
        }
        
        showMessage('Failed to reject admin request: ' + errorMessage, 'error');
    }
}

// 14. PERIODIC REFRESH & UTILITY FUNCTIONS

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
                loadTokenRequests(),
                loadSystemStats()
            ]);
            
            updateBalanceDisplays();
            renderTokenRequests();
            renderSystemStats();
            
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
 * This reloads all dashboard data when user clicks refresh
 */
async function refreshAllData() {
    try {
        showMessage('Refreshing all data...', 'info');
        
        // Reload all dashboard data
        await Promise.all([
            loadBalances(),
            loadSystemStats(),
            loadSupplyInfo(),
            loadCourses(),
            loadTokenRequests(),
            loadPendingAdmins()
        ]);
        
        // Update all UI components
        updateBalanceDisplays();
        renderSystemStats();
        renderSupplyInfo();
        renderCourses();
        renderTokenRequests();
        renderPendingAdmins();
        
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
        console.log('🚪 Admin portal logout initiated...');
        
        // Stop periodic refresh
        stopPeriodicRefresh();
        
        // Clear local contract data
        userSession = null;
        provider = null;
        signer = null;
        courseRegistrationContract = null;
        crstTokenContract = null;
        
        // Clear initialization flag
        document.body.removeAttribute('data-admin-init');
        isInitialized = false;
        
        // Clear session data (same as login.js)
        removeStoredSession();
        sessionStorage.removeItem('adminRedirectCount');
        
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

// 15. GLOBAL EXPORTS & EVENT SETUP

// Export functions for HTML onclick handlers
window.viewCourseDetails = viewCourseDetails;
window.showTokenRequestModal = showTokenRequestModal;
window.refreshAllData = refreshAllData;
window.logout = logout;
window.approveAdminRequest = approveAdminRequest;
window.rejectAdminRequest = rejectAdminRequest;
window.editCourse = editCourse;
window.updateCourse = updateCourse;
window.deactivateCourse = deactivateCourse;
window.activateCourse = activateCourse;

// Setup cleanup on page unload
window.addEventListener('beforeunload', cleanup);