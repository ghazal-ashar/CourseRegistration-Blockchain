// login.js - Using ethers.js instead of Web3.js to fix JSON-RPC issues
let provider = null;
let signer = null;
let connectedAccount = null;
let courseRegistrationContract = null;
let crstTokenContract = null;
let isProcessing = false;

document.addEventListener('DOMContentLoaded', function() {
    console.log('🔍 Page loaded:', window.location.pathname);
    
    if (window.location.pathname.includes('login.html')) {
        handleLoginPage();
    } else {
        checkExistingSession();
    }
});

function handleLoginPage() {
    console.log('📱 Handling login page...');
    
    const existingSession = getStoredSession();
    if (existingSession) {
        try {
            const session = JSON.parse(existingSession);
            if (session.walletAddress && session.role) {
                console.log('✅ Existing session found, redirecting...');
                
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
            console.log('❌ Invalid session data, clearing...');
            removeStoredSession();
        }
    }
    
    setupWalletConnection();
}

function setupWalletConnection() {
    const connectBtn = document.getElementById('connect-metamask');
    if (connectBtn) {
        console.log('✅ Setting up wallet connection button');
        connectBtn.addEventListener('click', connectMetaMask);
    } else {
        console.log('❌ Connect button not found');
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
        
        if (typeof window.ethereum === 'undefined') {
            throw new Error('MetaMask is not installed. Please install MetaMask extension.');
        }
        
        if (typeof ethers === 'undefined') {
            throw new Error('Ethers.js library not loaded. Please ensure ethers.js is included.');
        }
        
        console.log('🔄 Requesting wallet connection...');
        
        // Use ethers.js instead of Web3.js
        provider = new ethers.providers.Web3Provider(window.ethereum);
        
        // Request account access
        await provider.send("eth_requestAccounts", []);
        signer = provider.getSigner();
        connectedAccount = await signer.getAddress();
        
        console.log('✅ Connected account:', connectedAccount);
        
        await initializeContractsWithEthers();
        await handleWalletAuthentication(connectedAccount);
        
    } catch (error) {
        console.error('MetaMask connection failed:', error);
        showMessage(error.message, 'error');
    } finally {
        if (btn) {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
        isProcessing = false;
    }
}

async function initializeContractsWithEthers() {
    if (!CONTRACT_CONFIG?.ADDRESSES?.COURSE_REGISTRATION) {
        console.warn('⚠️ Contract configuration not loaded properly');
        return;
    }
    
    try {
        // Check network
        const network = await provider.getNetwork();
        console.log('🌐 Connected to network:', network.chainId);
        
        if (network.chainId !== 31337) {
            console.warn('⚠️ Not connected to localhost network. Current chain:', network.chainId);
            showMessage(`⚠️ Connected to chain ${network.chainId}. Expected localhost (31337)`, 'warning');
        }
        
        // Check if contracts exist
        const courseRegCode = await provider.getCode(CONTRACT_CONFIG.ADDRESSES.COURSE_REGISTRATION);
        
        if (courseRegCode === '0x') {
            throw new Error('CourseRegistration contract not found. Please deploy contracts first.');
        }
        
        // Initialize contracts with ethers.js
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
        
        console.log('✅ Contracts initialized successfully with ethers.js');
        
    } catch (contractError) {
        console.warn('⚠️ Contract initialization failed:', contractError.message);
        courseRegistrationContract = null;
        crstTokenContract = null;
        showMessage('⚠️ Contract initialization failed: ' + contractError.message, 'warning');
    }
}

async function handleWalletAuthentication(account) {
    try {
        let userRole = 'student';
        
        // Check if this is the contract owner
        if (account.toLowerCase() === '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266') {
            console.log('👑 Contract Owner detected');
            userRole = 'admin';
            createSessionAndRedirect(account, userRole, false, true);
            return;
        }
        
        // Check if user is registered (only if contracts are available)
        if (courseRegistrationContract) {
            try {
                console.log('🔍 Checking user registration...');
                const profile = await courseRegistrationContract.getUserProfile(account);
                
                if (profile[2]) { // isRegistered
                    const role = profile[1] === 0 ? 'student' : 'admin';
                    console.log('👤 Existing user found with role:', role);
                    createSessionAndRedirect(account, role, false, false);
                    return;
                }
            } catch (profileError) {
                console.log('📝 New user detected or profile check failed');
            }
        }
        
        // New user - show registration options
        showWalletConnected(account);
        showRegistrationOptions(account);
        
    } catch (error) {
        console.error('Authentication error:', error);
        showMessage('Authentication failed: ' + error.message, 'error');
    }
}

async function registerAsStudent() {
    if (isProcessing) return;
    isProcessing = true;
    
    try {
        // Use different variable names to avoid conflicts
        const studentRegisterBtn = document.querySelector('.btn-student-register');
        const adminRequestBtn = document.querySelector('.btn-admin-request');
        
        if (studentRegisterBtn) studentRegisterBtn.disabled = true;
        if (adminRequestBtn) adminRequestBtn.disabled = true;
        
        showRegistrationMessage('📝 Registering as student...', 'info');
        
        if (courseRegistrationContract) {
            showRegistrationMessage('⏳ Please confirm the transaction in MetaMask...', 'info');
            
            const tx = await courseRegistrationContract.registerAsStudent({gasLimit: 200000});
            
            console.log('⏳ Transaction sent:', tx.hash);
            showRegistrationMessage('⏳ Transaction sent! Waiting for confirmation...', 'info');
            
            // Wait for transaction to be mined
            const receipt = await tx.wait();
            console.log('✅ Student registration successful:', receipt.transactionHash);
            showRegistrationMessage('✅ Registration successful! Redirecting...', 'success');
            
            createSessionAndRedirect(connectedAccount, 'student', true, false);
            
        } else {
            showRegistrationMessage('❌ Blockchain connection unavailable', 'error');
        }
        
    } catch (error) {
        console.error('❌ Student registration failed:', error);
        
        if (error.code === 4001) {
            showRegistrationMessage('❌ Transaction cancelled by user', 'error');
        } else if (error.message && error.message.includes('execution reverted')) {
            console.log('User might already be registered, proceeding...');
            showRegistrationMessage('✅ Registration completed! Redirecting...', 'success');
            createSessionAndRedirect(connectedAccount, 'student', true, false);
            return;
        } else {
            showRegistrationMessage('❌ Registration failed: ' + error.message, 'error');
        }
        
        // Re-enable buttons on error
        const studentRegisterBtn = document.querySelector('.btn-student-register');
        const adminRequestBtn = document.querySelector('.btn-admin-request');
        if (studentRegisterBtn) studentRegisterBtn.disabled = false;
        if (adminRequestBtn) adminRequestBtn.disabled = false;
        
    } finally {
        isProcessing = false;
    }
}

async function requestAdminAccess() {
    if (isProcessing) return;
    isProcessing = true;
    
    try {
        // Use different variable names to avoid conflicts
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
            
        } else {
            showRegistrationMessage('⏳ Demo admin request submitted! Simulating approval...', 'warning');
            
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

// Storage and utility functions
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
    
    showMessage('Wallet connected! Please choose your role:', 'info');
    
    const registrationHTML = `
        <div class="text-center mb-4">
            <i class="fas fa-user-plus fa-3x text-success mb-3"></i>
            <h5>Complete Registration</h5>
            <p class="text-muted">Choose your role to complete registration</p>
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
}