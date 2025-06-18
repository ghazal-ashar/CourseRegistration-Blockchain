// login.js - Fixed to force MetaMask popup and match contract functions
let provider = null;
let signer = null;
let connectedAccount = null;
let courseRegistrationContract = null;
let crstTokenContract = null;
let isProcessing = false;

document.addEventListener('DOMContentLoaded', function() {
    
    // Check if CONTRACT_CONFIG is available
    if (typeof CONTRACT_CONFIG === 'undefined') {
        console.warn('CONTRACT_CONFIG not found. Make sure config.js is loaded.');
    } else {
        console.log('CONTRACT_CONFIG loaded:', CONTRACT_CONFIG);
    }
    
    if (window.location.pathname.includes('login.html')) {
        handleLoginPage();
    } else {
        checkExistingSession();
    }
});

function handleLoginPage() {
    console.log('Handling login page');
    
    const existingSession = getStoredSession();
    if (existingSession) {
        try {
            const session = JSON.parse(existingSession);
            if (session.walletAddress && session.role) {
                console.log('Existing session found');
                
                if (!sessionStorage.getItem('loginRedirecting')) {
                    sessionStorage.setItem('loginRedirecting', 'true');
                    setTimeout(() => {
                        sessionStorage.removeItem('loginRedirecting');
                        redirectToRole(session.role);
                    }, 1000);
                }
                return;
            }
        } catch (e) {
            console.log('Invalid session data. Clearing');
            removeStoredSession();
        }
    }
    
    setupWalletConnection();
}

function setupWalletConnection() {
    const connectBtn = document.getElementById('connect-metamask');
    if (connectBtn) {
        console.log('Setting up wallet connection button');
        connectBtn.addEventListener('click', connectMetaMask);
    } else {
        console.log('Connect button not found');
    }
}

async function connectMetaMask() {
    if (isProcessing) {
        console.log('Already processing, ignoring click');
        return;
    }
    
    isProcessing = true;
    const btn = document.getElementById('connect-metamask');
    const originalText = btn ? btn.innerHTML : 'Connect MetaMask';
    
    try {
        if (btn) {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Connecting...';
            btn.disabled = true;
        }
        
        // Step 1: Check if MetaMask is installed
        if (typeof window.ethereum === 'undefined') {
            throw new Error('MetaMask is not installed. Please install MetaMask extension from https://metamask.io/');
        }
        
        console.log('MetaMask detected');
        
        // Step 2: Check if ethers.js is loaded
        if (typeof ethers === 'undefined') {
            throw new Error('Ethers.js library not loaded. Please ensure ethers.js is included in your HTML.');
        }
        
        console.log('Ethers.js loaded');
        
        // Step 3: FORCE MetaMask to show account selection popup
        console.log('Forcing MetaMask account selection');
        
        // First disconnect any existing connections
        if (window.ethereum.selectedAddress) {
            console.log('Disconnecting existing connection.');
        }
        
        // Force MetaMask to show account selection by requesting permissions
        const accounts = await window.ethereum.request({
            method: 'wallet_requestPermissions',
            params: [{
                eth_accounts: {}
            }]
        });
        
        console.log('Permissions granted:', accounts);
        
        // Now request account access (for popup isse)
        const accountsList = await window.ethereum.request({ 
            method: 'eth_requestAccounts' 
        });
        
        if (!accountsList || accountsList.length === 0) {
            throw new Error('No accounts found. Please unlock MetaMask and try again.');
        }
        
        console.log('Accounts received:', accountsList);
        
        // Step 4: Create provider
        console.log('Creating ethers provider...');
        provider = new ethers.providers.Web3Provider(window.ethereum);
        
        // Step 5: Get signer and account
        signer = provider.getSigner();
        connectedAccount = await signer.getAddress();
        
        console.log('Connected account:', connectedAccount);

        // STORE PROVIDER/SIGNER GLOBALLY FOR OTHER PAGES TO REUSE
        window.provider = provider;
        window.signer = signer;
        window.connectedAccount = connectedAccount;
        
        // Step 6: Check network
        const network = await provider.getNetwork();
        console.log('Connected to network:', network);
        
        if (network.chainId !== 31337) {
            console.warn('Not connected to localhost network. Current chain:', network.chainId);
            showMessage(`You're connected to chain ${network.chainId}. Please switch to localhost (31337) for full functionality.`, 'warning');
            
            // Try to switch to localhost network
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0x7A69' }], // 31337 in hex
                });
                
                // Refresh the network info after switching
                const newNetwork = await provider.getNetwork();
                console.log('Switched to network:', newNetwork);
                
            } catch (switchError) {
                console.log('Could not switch network:', switchError);
                // If switching fails, try adding the network
                try {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: '0x7A69',
                            chainName: 'Localhost 8545',
                            nativeCurrency: {
                                name: 'Ethereum',
                                symbol: 'ETH',
                                decimals: 18
                            },
                            rpcUrls: ['http://127.0.0.1:8545'],
                            blockExplorerUrls: null
                        }]
                    });
                } catch (addError) {
                    console.log('Could not add network:', addError);
                }
            }
        }
        
        // Step 7: Try to initialize contracts (but don't fail if it doesn't work)
        await initializeContractsWithEthers();
        
        // Step 8: Handle wallet authentication
        await handleWalletAuthentication(connectedAccount);
        
    } catch (error) {
        console.error('MetaMask connection failed:', error);
        
        let errorMessage = error.message;
        
        // Handle specific error types
        if (error.code === 4001) {
            errorMessage = 'Connection request was rejected. Please try again and accept the connection request.';
        } else if (error.code === -32002) {
            errorMessage = 'Connection request is already pending. Please check MetaMask and accept the connection.';
        } else if (error.message.includes('JSON-RPC')) {
            errorMessage = 'Network connection error. Please ensure your local blockchain is running on http://127.0.0.1:8545';
        } else if (error.message.includes('wallet_requestPermissions')) {
            errorMessage = 'Permission request failed. Please try connecting manually through MetaMask.';
        }
        
        showMessage(errorMessage, 'error');
    } finally {
        if (btn) {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
        isProcessing = false;
    }
}

async function initializeContractsWithEthers() {

    // Skip if CONTRACT_CONFIG is not available
    if (typeof CONTRACT_CONFIG === 'undefined') {
        console.warn('CONTRACT_CONFIG not available - contracts will not be initialized');
        return;
    }
    
    if (!CONTRACT_CONFIG?.ADDRESSES?.COURSE_REGISTRATION) {
        console.warn('Contract addresses not configured properly');
        return;
    }
    
    try {
        console.log('Initializing contracts...');
        console.log('Contract address:', CONTRACT_CONFIG.ADDRESSES.COURSE_REGISTRATION);
        
        // Test with a simple call

        // Initialize contracts with ethers.js
        courseRegistrationContract = new ethers.Contract(
            CONTRACT_CONFIG.ADDRESSES.COURSE_REGISTRATION,
            CONTRACT_CONFIG.ABIS.COURSE_REGISTRATION,
            signer
        );
        
        if (CONTRACT_CONFIG.ADDRESSES.CRST_TOKEN) {
            crstTokenContract = new ethers.Contract(
                CONTRACT_CONFIG.ADDRESSES.CRST_TOKEN,
                CONTRACT_CONFIG.ABIS.CRST_TOKEN,
                signer
            );
        }
        
        console.log('Contracts initialized successfully with ethers.js');

        // STORE GLOBALLY FOR OTHER PAGES TO REUSE
        window.provider = provider;
        window.signer = signer;
        window.connectedAccount = connectedAccount;
        window.courseRegistrationContract = courseRegistrationContract;
        window.crstTokenContract = crstTokenContract;
        
        // Test contract connection with a simple read call instead of getCode
        try {
            console.log('Testing contract connection...');
            const owner = await courseRegistrationContract.owner();
            console.log('Contract connection test successful. Owner:', owner);
            console.log('Blockchain integration is working!');
        } catch (testError) {
            console.warn('⚠️ Contract connection test failed:', testError.message);
            // If the owner() call fails, the contract probably doesn't exist
            if (testError.message.includes('revert') || testError.message.includes('call exception')) {
                console.warn('Contract seems to exist but call failed - continuing with blockchain mode');
            } else {
                console.warn('Contract probably doesn\'t exist - falling back to demo mode');
                courseRegistrationContract = null;
                crstTokenContract = null;
            }
        }
        
    } catch (contractError) {
        console.warn('Contract initialization failed:', contractError.message);
        courseRegistrationContract = null;
        crstTokenContract = null;
        
        console.log('Demo mode, no blockchain');
    }
}

async function registerAsStudent() {
    if (isProcessing) return;
    isProcessing = true;
    
    try {
        const studentRegisterBtn = document.querySelector('.btn-student-register');
        const adminRequestBtn = document.querySelector('.btn-admin-request');
        
        if (studentRegisterBtn) studentRegisterBtn.disabled = true;
        if (adminRequestBtn) adminRequestBtn.disabled = true;
        
        showRegistrationMessage('Registering as student', 'info');
        
        if (courseRegistrationContract) {
            try {
                // Test the contract connection first
                console.log('Testing contract connection...');
                const owner = await courseRegistrationContract.owner();
                console.log('Contract owner:', owner);
                
                showRegistrationMessage('⏳ Please confirm the transaction in MetaMask', 'info');
                
                // Try the registration transaction
                const tx = await courseRegistrationContract.registerAsStudent({
                    gasLimit: 300000
                });
                
                console.log('Transaction sent:', tx.hash);
                showRegistrationMessage('Transaction sent! Waiting for confirmation.', 'info');
                
                // Wait for transaction to be mined
                const receipt = await tx.wait();
                console.log('Student registration successful:', receipt.transactionHash);
                showRegistrationMessage('Registration successful! Redirecting.', 'success');
                
                // Wait a moment for the blockchain to update, then redirect
                setTimeout(() => {
                    createSessionAndRedirect(connectedAccount, 'student', true, false);
                }, 1000);
                
            } catch (contractError) {
                console.error('❌ Contract call failed:', contractError);
                
                if (contractError.code === 4001) {
                    showRegistrationMessage('❌ Transaction cancelled by user', 'error');
                } else if (contractError.message && contractError.message.includes('User already registered')) {
                    console.log('✅ User already registered, proceeding...');
                    showRegistrationMessage('✅ Already registered! Redirecting to student portal...', 'success');
                    createSessionAndRedirect(connectedAccount, 'student', true, false);
                    return;
                } else {
                    showRegistrationMessage('❌ Registration failed: ' + contractError.message, 'error');
                }
            }
        } else {
            // Demo mode
            showRegistrationMessage('ℹ️ Demo mode: Simulating student registration...', 'info');
            setTimeout(() => {
                showRegistrationMessage('✅ Demo registration successful! Redirecting...', 'success');
                createSessionAndRedirect(connectedAccount, 'student', true, false);
            }, 2000);
        }
        
    } catch (error) {
        console.error('❌ Student registration failed:', error);
        showRegistrationMessage('❌ Registration failed: ' + error.message, 'error');
        
        // Re-enable buttons on error
        const studentRegisterBtn = document.querySelector('.btn-student-register');
        const adminRequestBtn = document.querySelector('.btn-admin-request');
        if (studentRegisterBtn) studentRegisterBtn.disabled = false;
        if (adminRequestBtn) adminRequestBtn.disabled = false;
        
    } finally {
        isProcessing = false;
    }
}

// Also update the handleWalletAuthentication function to better handle RPC errors:
async function handleWalletAuthentication(account) {
    try {
        let userRole = 'student';
        
        // Check if this is the contract owner (hardhat account 0)
        if (account.toLowerCase() === '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266') {
            console.log('Contract Owner detected');
            userRole = 'admin';
            createSessionAndRedirect(account, userRole, false, true);
            return;
        }
        
        // Check if user is registered (only if contracts are available and working)
        if (courseRegistrationContract) {
            try {
                console.log('🔍 Checking user registration...');
                
                // Test contract connection first
                await courseRegistrationContract.owner();
                console.log('Contract connection confirmed');
                
                // FIXED: Use userProfiles mapping directly instead of getUserProfile function
                console.log('📋 Checking user profile...');
                const profile = await courseRegistrationContract.userProfiles(account);
                
                console.log('📋 Profile data:', {
                    walletAddress: profile.walletAddress,
                    role: profile.role.toString(),
                    isActive: profile.isActive,
                    registeredAt: profile.registeredAt.toString()
                });
                
                // Check if user is active and has a valid profile
                if (profile.isActive && profile.walletAddress !== '0x0000000000000000000000000000000000000000') {
                    // profile.role: 0 = Student, 1 = Admin
                    const role = profile.role.toString() === '0' ? 'student' : 'admin';
                    console.log('👤 Existing user found with role:', role);
                    console.log('📅 Registered at:', new Date(profile.registeredAt.toNumber() * 1000).toLocaleString());
                    
                    showMessage(`Welcome back! Redirecting to ${role} portal...`, 'success');
                    createSessionAndRedirect(account, role, false, false);
                    return;
                } else {
                    console.log('📝 User profile not found or not active');
                }
                
            } catch (profileError) {
                console.log('📝 User profile check failed:', profileError.message);
                
                // If it's a revert error, the user probably doesn't exist
                if (profileError.message.includes('revert') || profileError.message.includes('call exception')) {
                    console.log('📝 User not registered in contract - showing registration options');
                } else if (profileError.code === -32603 || profileError.message.includes('JSON-RPC')) {
                    console.log('⚠️ RPC error during profile check - registration will use demo mode');
                } else {
                    console.warn('⚠️ Unexpected error during profile check:', profileError);
                }
            }
        }
        
        // New user or profile check failed - show registration options
        showWalletConnected(account);
        showRegistrationOptions(account);
        
    } catch (error) {
        console.error('Authentication error:', error);
        showMessage('Authentication failed: ' + error.message, 'error');
    }
}

// Add a function to test contract connection
async function testContractConnection() {
    if (!courseRegistrationContract) {
        return false;
    }
    
    try {
        await courseRegistrationContract.owner();
        return true;
    } catch (error) {
        console.log('Contract connection test failed:', error.message);
        return false;
    }
}

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

/**
 * Check if a user is registered and active in the smart contract
 * Add this helper function to login.js
 */
async function checkUserProfile(walletAddress) {
    try {
        if (!courseRegistrationContract) {
            return { isRegistered: false, role: 'unknown', isActive: false, profile: null };
        }
        
        // Get user profile from contract with circuit breaker handling
        const profile = await testContractCall(async () => {
            return await courseRegistrationContract.userProfiles(walletAddress);
        });
        
        // Check if profile exists (walletAddress will be 0x0 if not registered)
        const isRegistered = profile.walletAddress !== '0x0000000000000000000000000000000000000000';
        const isActive = profile.isActive;
        const role = isRegistered ? (profile.role.toString() === '0' ? 'student' : 'admin') : 'unknown';
        
        return {
            isRegistered,
            role,
            isActive,
            profile: isRegistered ? {
                walletAddress: profile.walletAddress,
                role: profile.role.toString(),
                isActive: profile.isActive,
                registeredAt: profile.registeredAt.toNumber(),
                approvedBy: profile.approvedBy
            } : null
        };
        
    } catch (error) {
        console.warn('Failed to check user profile:', error.message);
        return { isRegistered: false, role: 'unknown', isActive: false, profile: null };
    }
}

async function requestAdminAccess() {
    if (isProcessing) return;
    isProcessing = true;
    
    try {
        const studentRegBtn = document.querySelector('.btn-student-register');
        const adminReqBtn = document.querySelector('.btn-admin-request');
        
        if (studentRegBtn) studentRegBtn.disabled = true;
        if (adminReqBtn) adminReqBtn.disabled = true;
        
        showRegistrationMessage('👨‍💼 Requesting admin access...', 'info');
        
        if (courseRegistrationContract) {
            showRegistrationMessage('⏳ Please confirm the transaction in MetaMask...', 'info');
            
            const tx = await courseRegistrationContract.requestAdminAccess({
                gasLimit: 300000
            });
            
            console.log('⏳ Transaction sent:', tx.hash);
            showRegistrationMessage('⏳ Transaction sent! Waiting for confirmation...', 'info');
            
            const receipt = await tx.wait();
            console.log('✅ Admin access request submitted:', receipt.transactionHash);
            showRegistrationMessage('⏳ Admin access requested! An admin will review your request.', 'warning');
            
            // Don't auto-redirect for admin requests - they need approval
            setTimeout(() => {
                showRegistrationMessage('ℹ️ Your admin request is pending approval. Check back later.', 'info');
            }, 3000);
            
        } else {
            // Demo mode
            showRegistrationMessage('ℹ️ Demo mode: Simulating admin request...', 'warning');
            
            setTimeout(() => {
                showRegistrationMessage('✅ Demo admin access approved! Redirecting...', 'success');
                createSessionAndRedirect(connectedAccount, 'admin', true, false);
            }, 3000);
        }
        
    } catch (error) {
        console.error('❌ Admin request failed:', error);
        
        if (error.code === 4001) {
            showRegistrationMessage('❌ Transaction cancelled by user', 'error');
        } else {
            showRegistrationMessage('❌ Admin request failed: ' + error.message, 'error');
        }
        
        // Re-enable buttons on error
        const studentRegBtn = document.querySelector('.btn-student-register');
        const adminReqBtn = document.querySelector('.btn-admin-request');
        if (studentRegBtn) studentRegBtn.disabled = false;
        if (adminReqBtn) adminReqBtn.disabled = false;
        
    } finally {
        isProcessing = false;
    }
}

// Add function to manually disconnect and reconnect
async function forceReconnect() {
    try {
        // Clear any existing sessions
        removeStoredSession();
        
        // Reset global variables
        provider = null;
        signer = null;
        connectedAccount = null;
        courseRegistrationContract = null;
        crstTokenContract = null;
        
        // Show the connect button again
        const connectBtn = document.getElementById('connect-metamask');
        if (connectBtn) {
            connectBtn.style.display = 'block';
            connectBtn.disabled = false;
        }
        
        // Hide any existing registration options
        const messagesDiv = document.getElementById('messages');
        if (messagesDiv) {
            messagesDiv.innerHTML = `
                <div class="text-center mb-4">
                    <i class="fas fa-link fa-3x text-primary mb-3"></i>
                    <h5>Connect Your Wallet</h5>
                    <p class="text-muted">Click the button above to connect with a different account</p>
                </div>
            `;
        }
        
        console.log('🔄 Ready to reconnect with different account');
        
    } catch (error) {
        console.error('Error during force reconnect:', error);
    }
}

// Storage and utility functions (same as before but with better error handling)
function getStoredSession() {
    try {
        return localStorage.getItem('user');
    } catch (e) {
        console.warn('localStorage not available, using session storage');
        return sessionStorage.getItem('user');
    }
}

function setStoredSession(data) {
    try {
        localStorage.setItem('user', data);
    } catch (e) {
        console.warn('localStorage not available, using session storage');
        sessionStorage.setItem('user', data);
    }
}

function removeStoredSession() {
    try {
        localStorage.removeItem('user');
        sessionStorage.removeItem('loginRedirecting');
    } catch (e) {
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('loginRedirecting');
    }
}

function redirectToRole(role) {
    console.log('🔄 Redirecting to:', role, 'portal');
    
    if (role === 'admin' && window.location.pathname.includes('adminportal.html')) {
        console.log('✅ Already on admin portal');
        return;
    }
    if (role === 'student' && window.location.pathname.includes('studentportal.html')) {
        console.log('✅ Already on student portal');
        return;
    }
    
    if (role === 'admin') {
        window.location.href = 'adminportal.html';
    } else {
        window.location.href = 'studentportal.html';
    }
}

function checkExistingSession() {
    const storedUser = getStoredSession();
    if (storedUser) {
        try {
            const session = JSON.parse(storedUser);
            if (session.walletAddress && session.role) {
                console.log('✅ Valid session found:', session.email);
                return session;
            }
        } catch (e) {
            console.log('❌ Invalid session, clearing');
            removeStoredSession();
        }
    }
    
    console.log('❌ No valid session, redirecting to login');
    window.location.href = 'login.html';
    return null;
}

function createSessionAndRedirect(account, role, isNewUser, isOwner) {
    const accountTypeMessage = isOwner ? '👑 Contract Owner detected! Redirecting to Admin Portal...' :
                             role === 'admin' ? '👨‍💼 Admin account detected! Redirecting to Admin Portal...' :
                             '👨‍🎓 Student account detected! Redirecting to Student Portal...';
    
    showMessage(accountTypeMessage, 'success');
    
    const userSession = {
        walletAddress: account,
        email: `${account.slice(0, 8)}@wallet.local`,
        role: role,
        loginTime: Date.now(),
        isNewUser: isNewUser,
        usingBlockchain: !!courseRegistrationContract,
        isContractOwner: isOwner
    };
    
    setStoredSession(JSON.stringify(userSession));
    console.log('💾 Session created:', userSession);
    
    if (!sessionStorage.getItem('loginRedirecting')) {
        sessionStorage.setItem('loginRedirecting', 'true');
        setTimeout(() => {
            sessionStorage.removeItem('loginRedirecting');
            redirectToRole(role);
        }, 2000);
    }
}

function showWalletConnected(address) {
    const statusDiv = document.getElementById('wallet-connected-status');
    const addressSpan = document.getElementById('connected-address');
    
    if (statusDiv && addressSpan) {
        const shortAddress = `${address.slice(0, 8)}...${address.slice(-6)}`;
        addressSpan.textContent = shortAddress;
        addressSpan.title = address;
        statusDiv.classList.remove('d-none');
    }
}

function showRegistrationOptions(account) {
    const connectBtn = document.getElementById('connect-metamask');
    if (connectBtn) {
        connectBtn.style.display = 'none';
    }
    
    const blockchainStatus = courseRegistrationContract ? 
        '🔗 Blockchain Connected' : 
        'ℹ️ Demo Mode (No Blockchain)';
    
    showMessage(`Wallet connected! ${blockchainStatus}`, 'info');
    
    const registrationHTML = `
        <div class="text-center mb-4">
            <i class="fas fa-user-plus fa-3x text-success mb-3"></i>
            <h5>Complete Registration</h5>
            <p class="text-muted">Choose your role to complete registration</p>
            <small class="text-muted">${blockchainStatus}</small>
        </div>
        
        <div class="row g-3 mb-4">
            <div class="col-md-6">
                <div class="card h-100 border-primary">
                    <div class="card-body text-center">
                        <i class="fas fa-user-graduate fa-2x text-primary mb-3"></i>
                        <h6>Student</h6>
                        <p class="small text-muted">Register for courses and manage payments</p>
                        <button class="btn btn-primary btn-student-register" onclick="registerAsStudent()">
                            Register as Student
                        </button>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="card h-100 border-warning">
                    <div class="card-body text-center">
                        <i class="fas fa-user-shield fa-2x text-warning mb-3"></i>
                        <h6>Administrator</h6>
                        <p class="small text-muted">Manage courses and approve requests</p>
                        <button class="btn btn-warning btn-admin-request" onclick="requestAdminAccess()">
                            Request Admin Access
                        </button>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="row g-3 mb-3">
            <div class="col-12">
                <button class="btn btn-outline-secondary btn-sm w-100" onclick="forceReconnect()">
                    <i class="fas fa-refresh me-2"></i>Connect with Different Account
                </button>
            </div>
        </div>
        
        <div id="registration-messages"></div>
    `;
    
    const messagesDiv = document.getElementById('messages');
    if (messagesDiv) {
        messagesDiv.innerHTML = registrationHTML;
    }
}

function showMessage(message, type) {
    const messagesDiv = document.getElementById('messages');
    if (!messagesDiv) return;
    
    const alertClass = type === 'error' ? 'alert-danger' : 
                     type === 'success' ? 'alert-success' : 
                     type === 'info' ? 'alert-info' : 
                     type === 'warning' ? 'alert-warning' : 'alert-info';
    
    const iconClass = type === 'error' ? 'fa-exclamation-circle' : 
                     type === 'success' ? 'fa-check-circle' : 
                     type === 'info' ? 'fa-info-circle' : 
                     type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle';
    
    messagesDiv.innerHTML = `
        <div class="alert ${alertClass} mb-3">
            <i class="fas ${iconClass} me-2"></i>${message}
        </div>
    `;
}

function showRegistrationMessage(message, type) {
    const messagesDiv = document.getElementById('registration-messages');
    if (messagesDiv) {
        const alertClass = type === 'error' ? 'alert-danger' : 
                         type === 'success' ? 'alert-success' : 
                         type === 'info' ? 'alert-info' : 
                         type === 'warning' ? 'alert-warning' : 'alert-primary';
        
        const iconClass = type === 'error' ? 'fa-exclamation-circle' : 
                         type === 'success' ? 'fa-check-circle' : 
                         type === 'info' ? 'fa-info-circle' : 
                         type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle';
        
        messagesDiv.innerHTML = `
            <div class="alert ${alertClass}">
                <i class="fas ${iconClass} me-2"></i>${message}
            </div>
        `;
    }
}

function verifySession() {
    const storedUser = getStoredSession();
    if (!storedUser) {
        console.log('❌ No session found, redirecting to login');
        window.location.href = 'login.html';
        return false;
    }
    
    try {
        const session = JSON.parse(storedUser);
        if (!session.walletAddress || !session.email) {
            console.log('❌ Invalid session data, redirecting to login');
            removeStoredSession();
            window.location.href = 'login.html';
            return false;
        }
        
        console.log('✅ Session verified for:', session.email);
        
        const userEmail = document.getElementById('user-email');
        if (userEmail) userEmail.textContent = session.email;
        
        const walletAddress = document.getElementById('wallet-address');
        if (walletAddress) {
            const shortAddress = `${session.walletAddress.slice(0, 6)}...${session.walletAddress.slice(-4)}`;
            walletAddress.textContent = shortAddress;
            walletAddress.title = session.walletAddress;
        }
        
        return session;
    } catch (e) {
        console.log('❌ Error parsing session, redirecting to login');
        removeStoredSession();
        window.location.href = 'login.html';
        return false;
    }
}

function logout() {
    console.log('🚪 Logging out user...');
    removeStoredSession();
    console.log('🔄 Redirecting to login page...');
    window.location.href = 'login.html';
}

// Add logout event listeners
document.addEventListener('DOMContentLoaded', function() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }
    
    const logoutLinks = document.querySelectorAll('a[href="login.html"]');
    logoutLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    });
});

// Export functions for use in other scripts
if (typeof window !== 'undefined') {
    window.verifySession = verifySession;
    window.logout = logout;
    window.redirectToRole = redirectToRole;
    window.checkExistingSession = checkExistingSession;
    window.registerAsStudent = registerAsStudent;
    window.requestAdminAccess = requestAdminAccess;
    window.forceReconnect = forceReconnect;
}