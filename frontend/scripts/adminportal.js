// Global variables
let courses = [];
let registrations = [];
let tokenRequests = [];
let pendingAdmins = [];
let totalFeesCollected = 0;
let currentRequestId = null;
let currentAdminAddress = null;
let isAdmin = false;
let userSession = null;
let isInitialized = false;
let web3 = null;
let courseRegistrationContract = null;
let crstTokenContract = null;

// Initialize the admin dashboard
document.addEventListener('DOMContentLoaded', function() {
    if (isInitialized) {
        console.log('Admin portal already initialized');
        return;
    }
    
    console.log('🚀 Initializing Enhanced Admin Portal...');
    
    // Verify user session and admin role
    if (!verifyAdminSession()) {
        return; // Will redirect to login
    }
    
    // Initialize contracts and dashboard
    initializeContracts().then(() => {
        initializeDashboard();
        setupEventListeners();
        isInitialized = true;
        console.log('✅ Enhanced Admin Portal initialized successfully');
    }).catch(error => {
        console.error('❌ Failed to initialize admin portal:', error);
        showMessage('Failed to connect to blockchain. Using demo mode.', 'warning');
        initializeDashboard();
        setupEventListeners();
        isInitialized = true;
    });
});

// Verify admin session
function verifyAdminSession() {
    try {
        userSession = verifySession();
        
        if (!userSession) {
            return false; // verifySession will handle redirect
        }
        
        // Check if user is admin
        if (userSession.role !== 'admin') {
            console.log('❌ User is not an admin, redirecting to student portal');
            window.location.href = 'studentportal.html';
            return false;
        }
        
        console.log('✅ Valid admin session found:', userSession.email);
        updateUserUI();
        isAdmin = true;
        return true;
        
    } catch (error) {
        console.error('❌ Session verification failed:', error);
        window.location.href = 'login.html';
        return false;
    }
}

// Initialize blockchain contracts
async function initializeContracts() {
    if (!userSession.usingBlockchain) {
        console.log('⚠️ No blockchain integration - using demo mode');
        return;
    }
    
    try {
        if (typeof window.ethereum !== 'undefined') {
            web3 = new Web3(window.ethereum);
            
            courseRegistrationContract = new web3.eth.Contract(
                CONTRACT_CONFIG.ABIS.COURSE_REGISTRATION,
                CONTRACT_CONFIG.ADDRESSES.COURSE_REGISTRATION
            );
            
            crstTokenContract = new web3.eth.Contract(
                CONTRACT_CONFIG.ABIS.CRST_TOKEN,
                CONTRACT_CONFIG.ADDRESSES.CRST_TOKEN
            );
            
            console.log('✅ Contracts initialized successfully');
        }
    } catch (error) {
        console.error('❌ Contract initialization failed:', error);
        throw error;
    }
}

// Update UI with user session data
function updateUserUI() {
    // Update email display
    const userEmailElement = document.getElementById('user-email');
    if (userEmailElement) {
        userEmailElement.textContent = userSession.email;
    }
    
    // Update wallet address display
    const walletAddressElement = document.getElementById('wallet-address');
    if (walletAddressElement) {
        const shortAddress = `${userSession.walletAddress.slice(0, 6)}...${userSession.walletAddress.slice(-4)}`;
        walletAddressElement.textContent = shortAddress;
        walletAddressElement.title = userSession.walletAddress;
    }
    
    // Show blockchain integration status
    if (userSession.usingBlockchain) {
        console.log('✅ Blockchain integration active');
    } else {
        console.log('⚠️ Demo mode - no blockchain integration');
    }
}

// Initialize dashboard with real or dummy data
async function initializeDashboard() {
    console.log('📊 Loading dashboard data...');
    
    if (courseRegistrationContract) {
        await loadBlockchainData();
    } else {
        loadDummyData();
    }
    
    // Update all UI components
    loadSystemStats();
    renderCourseList();
    renderRegistrationList();
    renderTokenRequests();
    renderPendingAdmins();
    
    console.log('✅ Dashboard loaded successfully');
}

// Load real data from blockchain
async function loadBlockchainData() {
    try {
        console.log('🔗 Loading data from blockchain...');
        
        // Load active courses
        const activeCourseIds = await courseRegistrationContract.methods.getActiveCourseIds().call();
        courses = [];
        
        for (const courseId of activeCourseIds) {
            try {
                const course = await courseRegistrationContract.methods.getCourse(courseId).call();
                courses.push({
                    id: course.id.toString(),
                    name: course.name,
                    description: course.description,
                    creditHours: course.creditHours.toString(),
                    fee: course.feeInTokens.toString(),
                    capacity: course.capacity.toString(),
                    enrolled: course.enrolled.toString(),
                    isActive: course.isActive
                });
            } catch (error) {
                console.warn(`Failed to load course ${courseId}:`, error);
            }
        }
        
        // Load pending token requests
        const pendingTokenRequests = await courseRegistrationContract.methods.getPendingTokenRequests().call();
        tokenRequests = pendingTokenRequests.map(request => ({
            id: request.id.toString(),
            student: request.student,
            amount: request.amountInTokens.toString(),
            reason: request.reason,
            isPending: request.isPending,
            isApproved: request.isApproved,
            timestamp: parseInt(request.timestamp)
        }));
        
        // Load pending admin requests (this would need to be added to contract if needed)
        pendingAdmins = []; // For now, empty
        
        console.log('✅ Blockchain data loaded successfully');
        
    } catch (error) {
        console.error('❌ Failed to load blockchain data:', error);
        loadDummyData();
    }
}

// Load dummy data for demo mode
function loadDummyData() {
    console.log('📝 Loading dummy data...');
    
    courses = [
        {
            id: "101",
            name: "Introduction to Blockchain",
            description: "Learn the fundamentals of blockchain technology and its applications.",
            creditHours: "3",
            fee: "100",
            capacity: "30",
            enrolled: "12",
            isActive: true
        },
        {
            id: "102",
            name: "Smart Contract Development",
            description: "An in-depth course on developing secure smart contracts with Solidity.",
            creditHours: "4",
            fee: "150",
            capacity: "25",
            enrolled: "20",
            isActive: true
        },
        {
            id: "103",
            name: "Decentralized Applications",
            description: "Build DApps using Web3.js, React, and Ethereum.",
            creditHours: "3",
            fee: "125",
            capacity: "20",
            enrolled: "15",
            isActive: true
        }
    ];
    
    tokenRequests = [
        {
            id: "1",
            student: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
            amount: "100",
            reason: "Need tokens for Smart Contract Development course fee",
            isPending: true,
            isApproved: false,
            timestamp: Math.floor(Date.now() / 1000) - 86400
        },
        {
            id: "2",
            student: "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4",
            amount: "150",
            reason: "For multiple course registrations this semester",
            isPending: true,
            isApproved: false,
            timestamp: Math.floor(Date.now() / 1000) - 43200
        }
    ];
    
    pendingAdmins = [
        {
            address: "0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2",
            email: "john.admin@university.edu",
            requestedAt: Math.floor(Date.now() / 1000) - 172800
        }
    ];
    
    registrations = [
        {
            studentAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
            courseId: "101",
            courseName: "Introduction to Blockchain",
            timestamp: Math.floor(Date.now() / 1000) - 604800,
            hasPaid: true
        },
        {
            studentAddress: "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4",
            courseId: "102",
            courseName: "Smart Contract Development",
            timestamp: Math.floor(Date.now() / 1000) - 432000,
            hasPaid: false
        }
    ];
    
    totalFeesCollected = 250;
}

// Setup event listeners
function setupEventListeners() {
    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Modal buttons
    const addCourseBtn = document.getElementById('add-course');
    if (addCourseBtn) {
        addCourseBtn.addEventListener('click', addNewCourse);
    }
    
    const approveRequestBtn = document.getElementById('approve-request');
    if (approveRequestBtn) {
        approveRequestBtn.addEventListener('click', approveTokenRequest);
    }
    
    const rejectRequestBtn = document.getElementById('reject-request');
    if (rejectRequestBtn) {
        rejectRequestBtn.addEventListener('click', rejectTokenRequest);
    }
    
    // Admin approval buttons
    const approveAdminBtn = document.getElementById('approve-admin');
    if (approveAdminBtn) {
        approveAdminBtn.addEventListener('click', approveAdminRequest);
    }
    
    const rejectAdminBtn = document.getElementById('reject-admin');
    if (rejectAdminBtn) {
        rejectAdminBtn.addEventListener('click', rejectAdminRequest);
    }
}

// Load system statistics
function loadSystemStats() {
    const totalCoursesElement = document.getElementById('total-courses');
    const totalStudentsElement = document.getElementById('total-students');
    const totalRegistrationsElement = document.getElementById('total-registrations');
    const totalFeesElement = document.getElementById('total-fees');
    
    const uniqueStudents = [...new Set(registrations.map(reg => reg.studentAddress))].length;
    
    if (totalCoursesElement) totalCoursesElement.textContent = courses.length;
    if (totalStudentsElement) totalStudentsElement.textContent = uniqueStudents;
    if (totalRegistrationsElement) totalRegistrationsElement.textContent = registrations.length;
    if (totalFeesElement) totalFeesElement.textContent = `${totalFeesCollected} CRST`;
}

// Render course list
function renderCourseList() {
    const tableBody = document.getElementById('course-list');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    if (courses.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="8" class="text-center py-3">
                <i class="fas fa-info-circle me-2"></i>No courses have been added yet.
            </td>
        `;
        tableBody.appendChild(row);
        return;
    }
    
    courses.forEach(course => {
        const row = document.createElement('tr');
        const statusBadge = course.isActive ? 
            `<span class="badge bg-success">Active</span>` : 
            `<span class="badge bg-secondary">Inactive</span>`;
        
        row.innerHTML = `
            <td>${course.id}</td>
            <td>${course.name}</td>
            <td>${course.creditHours}</td>
            <td>${course.fee} CRST</td>
            <td>${course.capacity}</td>
            <td>${course.enrolled}/${course.capacity}</td>
            <td>${statusBadge}</td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-warning" onclick="editCourse('${course.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-${course.isActive ? 'danger' : 'success'}" onclick="toggleCourse('${course.id}')">
                        <i class="fas fa-${course.isActive ? 'ban' : 'check'}"></i>
                    </button>
                </div>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Render token requests
function renderTokenRequests() {
    const requestsList = document.getElementById('token-requests-list');
    if (!requestsList) return;
    
    requestsList.innerHTML = '';
    
    const pendingRequests = tokenRequests.filter(request => request.isPending);
    
    if (pendingRequests.length === 0) {
        requestsList.innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i>
                No pending token requests.
            </div>
        `;
        return;
    }
    
    const listGroup = document.createElement('div');
    listGroup.className = 'list-group';
    
    pendingRequests.forEach(request => {
        const date = new Date(request.timestamp * 1000).toLocaleDateString();
        
        const listItem = document.createElement('a');
        listItem.href = '#';
        listItem.className = 'list-group-item list-group-item-action';
        listItem.onclick = () => showTokenRequestModal(request.id);
        listItem.innerHTML = `
            <div class="d-flex w-100 justify-content-between">
                <h6 class="mb-1">${request.amount} CRST</h6>
                <small>${date}</small>
            </div>
            <p class="mb-1">From: <span class="font-monospace">${request.student.slice(0, 6)}...${request.student.slice(-4)}</span></p>
            <small class="text-truncate d-block">${request.reason.substring(0, 50)}${request.reason.length > 50 ? '...' : ''}</small>
        `;
        
        listGroup.appendChild(listItem);
    });
    
    requestsList.appendChild(listGroup);
}

// Render pending admin requests
function renderPendingAdmins() {
    const adminRequestsList = document.getElementById('admin-requests-list');
    if (!adminRequestsList) {
        // Create admin requests section if it doesn't exist
        const tokenRequestsCard = document.querySelector('.card .card-header:contains("Token Requests")');
        if (tokenRequestsCard) {
            const adminCard = document.createElement('div');
            adminCard.className = 'card shadow-sm mt-4';
            adminCard.innerHTML = `
                <div class="card-header bg-warning text-dark">
                    <h5 class="mb-0"><i class="fas fa-user-shield me-2"></i>Pending Admin Requests</h5>
                </div>
                <div class="card-body">
                    <div id="admin-requests-list">
                        <!-- Admin requests will be populated here -->
                    </div>
                </div>
            `;
            tokenRequestsCard.closest('.card').parentNode.insertBefore(adminCard, tokenRequestsCard.closest('.card').nextSibling);
        }
        return;
    }
    
    adminRequestsList.innerHTML = '';
    
    if (pendingAdmins.length === 0) {
        adminRequestsList.innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i>
                No pending admin requests.
            </div>
        `;
        return;
    }
    
    const listGroup = document.createElement('div');
    listGroup.className = 'list-group';
    
    pendingAdmins.forEach(admin => {
        const date = new Date(admin.requestedAt * 1000).toLocaleDateString();
        
        const listItem = document.createElement('div');
        listItem.className = 'list-group-item';
        listItem.innerHTML = `
            <div class="d-flex w-100 justify-content-between align-items-center">
                <div>
                    <h6 class="mb-1">${admin.email}</h6>
                    <p class="mb-1">Wallet: <span class="font-monospace">${admin.address.slice(0, 6)}...${admin.address.slice(-4)}</span></p>
                    <small>Requested: ${date}</small>
                </div>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-success" onclick="showAdminApprovalModal('${admin.address}', '${admin.email}')">
                        <i class="fas fa-check me-1"></i>Approve
                    </button>
                    <button class="btn btn-danger" onclick="showAdminRejectionModal('${admin.address}', '${admin.email}')">
                        <i class="fas fa-times me-1"></i>Reject
                    </button>
                </div>
            </div>
        `;
        
        listGroup.appendChild(listItem);
    });
    
    adminRequestsList.appendChild(listGroup);
}

// Render registration list
function renderRegistrationList() {
    const tableBody = document.getElementById('registration-list');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    if (registrations.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="5" class="text-center py-3">
                <i class="fas fa-info-circle me-2"></i>No student registrations yet.
            </td>
        `;
        tableBody.appendChild(row);
        return;
    }
    
    registrations.forEach(reg => {
        const row = document.createElement('tr');
        const registrationDate = new Date(reg.timestamp * 1000).toLocaleDateString();
        const paymentStatus = reg.hasPaid ? 
            `<span class="badge bg-success">Paid</span>` : 
            `<span class="badge bg-warning">Unpaid</span>`;
        const shortAddress = `${reg.studentAddress.slice(0, 6)}...${reg.studentAddress.slice(-4)}`;
        
        row.innerHTML = `
            <td>
                <span class="font-monospace" title="${reg.studentAddress}">${shortAddress}</span>
            </td>
            <td>${reg.courseId}</td>
            <td>${reg.courseName}</td>
            <td>${registrationDate}</td>
            <td>${paymentStatus}</td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Show token request modal
function showTokenRequestModal(requestId) {
    const request = tokenRequests.find(r => r.id === requestId);
    if (!request) return;
    
    currentRequestId = requestId;
    
    document.getElementById('request-student').textContent = request.student;
    document.getElementById('request-amount').textContent = `${request.amount} CRST`;
    document.getElementById('request-date').textContent = new Date(request.timestamp * 1000).toLocaleDateString();
    document.getElementById('request-reason').textContent = request.reason;
    
    if (typeof bootstrap !== 'undefined') {
        const modal = new bootstrap.Modal(document.getElementById('tokenRequestModal'));
        modal.show();
    }
}

// Show admin approval modal
function showAdminApprovalModal(address, email) {
    currentAdminAddress = address;
    
    if (confirm(`Approve admin request for ${email} (${address.slice(0, 8)}...)?`)) {
        approveAdminRequest();
    }
}

// Show admin rejection modal
function showAdminRejectionModal(address, email) {
    currentAdminAddress = address;
    
    if (confirm(`Reject admin request for ${email} (${address.slice(0, 8)}...)?`)) {
        rejectAdminRequest();
    }
}

// Course management functions
function editCourse(courseId) {
    showMessage(`Edit course ${courseId} functionality would be implemented here.`, 'info');
}

function toggleCourse(courseId) {
    const course = courses.find(c => c.id === courseId);
    if (course) {
        course.isActive = !course.isActive;
        renderCourseList();
        showMessage(`Course ${courseId} ${course.isActive ? 'activated' : 'deactivated'} successfully!`, 'success');
    }
}

// Add new course
async function addNewCourse() {
    const name = document.getElementById('course-name').value;
    const description = document.getElementById('course-description').value;
    const creditHours = document.getElementById('credit-hours').value;
    const fee = document.getElementById('course-fee').value;
    const capacity = document.getElementById('course-capacity').value;
    
    if (!name || !description || !creditHours || !fee || !capacity) {
        showMessage('Please fill in all fields', 'error');
        return;
    }
    
    try {
        if (courseRegistrationContract && userSession.usingBlockchain) {
            console.log('📝 Adding course to blockchain...');
            
            const tx = await courseRegistrationContract.methods
                .addCourse(name, description, parseInt(creditHours), parseInt(fee), parseInt(capacity))
                .send({ 
                    from: userSession.walletAddress,
                    gas: 500000
                });
            
            console.log('✅ Course added to blockchain:', tx.transactionHash);
            showMessage('Course added successfully!', 'success');
            
            // Reload data
            await loadBlockchainData();
            renderCourseList();
            
        } else {
            // Demo mode
            const newCourse = {
                id: (courses.length + 100).toString(),
                name: name,
                description: description,
                creditHours: creditHours,
                fee: fee,
                capacity: capacity,
                enrolled: "0",
                isActive: true
            };
            
            courses.push(newCourse);
            renderCourseList();
            showMessage('Course added successfully! (Demo mode)', 'success');
        }
        
        // Close modal and reset form
        const modal = bootstrap.Modal.getInstance(document.getElementById('addCourseModal'));
        if (modal) modal.hide();
        document.getElementById('add-course-form').reset();
        
    } catch (error) {
        console.error('❌ Failed to add course:', error);
        showMessage('Failed to add course: ' + error.message, 'error');
    }
}

// Approve token request
async function approveTokenRequest() {
    if (!currentRequestId) return;
    
    try {
        if (courseRegistrationContract && userSession.usingBlockchain) {
            console.log('✅ Approving token request on blockchain...');
            
            const tx = await courseRegistrationContract.methods
                .approveTokenRequest(parseInt(currentRequestId))
                .send({ 
                    from: userSession.walletAddress,
                    gas: 500000
                });
            
            console.log('✅ Token request approved:', tx.transactionHash);
            showMessage('Token request approved successfully!', 'success');
            
            // Reload data
            await loadBlockchainData();
            renderTokenRequests();
            
        } else {
            // Demo mode
            const request = tokenRequests.find(r => r.id === currentRequestId);
            if (request) {
                request.isPending = false;
                request.isApproved = true;
                renderTokenRequests();
                showMessage('Token request approved! (Demo mode)', 'success');
            }
        }
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('tokenRequestModal'));
        if (modal) modal.hide();
        
    } catch (error) {
        console.error('❌ Failed to approve token request:', error);
        showMessage('Failed to approve token request: ' + error.message, 'error');
    }
}

// Reject token request
async function rejectTokenRequest() {
    if (!currentRequestId) return;
    
    try {
        if (courseRegistrationContract && userSession.usingBlockchain) {
            console.log('❌ Rejecting token request on blockchain...');
            
            const tx = await courseRegistrationContract.methods
                .rejectTokenRequest(parseInt(currentRequestId))
                .send({ 
                    from: userSession.walletAddress,
                    gas: 500000
                });
            
            console.log('✅ Token request rejected:', tx.transactionHash);
            showMessage('Token request rejected.', 'info');
            
            // Reload data
            await loadBlockchainData();
            renderTokenRequests();
            
        } else {
            // Demo mode
            const request = tokenRequests.find(r => r.id === currentRequestId);
            if (request) {
                request.isPending = false;
                request.isApproved = false;
                renderTokenRequests();
                showMessage('Token request rejected. (Demo mode)', 'info');
            }
        }
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('tokenRequestModal'));
        if (modal) modal.hide();
        
    } catch (error) {
        console.error('❌ Failed to reject token request:', error);
        showMessage('Failed to reject token request: ' + error.message, 'error');
    }
}

// Approve admin request
async function approveAdminRequest() {
    if (!currentAdminAddress) return;
    
    try {
        if (courseRegistrationContract && userSession.usingBlockchain) {
            console.log('✅ Approving admin request on blockchain...');
            
            const tx = await courseRegistrationContract.methods
                .approveAdmin(currentAdminAddress)
                .send({ 
                    from: userSession.walletAddress,
                    gas: 500000
                });
            
            console.log('✅ Admin request approved:', tx.transactionHash);
            showMessage('Admin request approved successfully!', 'success');
            
            // Remove from pending list
            pendingAdmins = pendingAdmins.filter(admin => admin.address !== currentAdminAddress);
            renderPendingAdmins();
            
        } else {
            // Demo mode
            pendingAdmins = pendingAdmins.filter(admin => admin.address !== currentAdminAddress);
            renderPendingAdmins();
            showMessage('Admin request approved! (Demo mode)', 'success');
        }
        
        currentAdminAddress = null;
        
    } catch (error) {
        console.error('❌ Failed to approve admin request:', error);
        showMessage('Failed to approve admin request: ' + error.message, 'error');
    }
}

// Reject admin request
async function rejectAdminRequest() {
    if (!currentAdminAddress) return;
    
    try {
        if (courseRegistrationContract && userSession.usingBlockchain) {
            console.log('❌ Rejecting admin request on blockchain...');
            
            const tx = await courseRegistrationContract.methods
                .rejectAdmin(currentAdminAddress)
                .send({ 
                    from: userSession.walletAddress,
                    gas: 500000
                });
            
            console.log('✅ Admin request rejected:', tx.transactionHash);
            showMessage('Admin request rejected.', 'info');
            
            // Remove from pending list
            pendingAdmins = pendingAdmins.filter(admin => admin.address !== currentAdminAddress);
            renderPendingAdmins();
            
        } else {
            // Demo mode
            pendingAdmins = pendingAdmins.filter(admin => admin.address !== currentAdminAddress);
            renderPendingAdmins();
            showMessage('Admin request rejected. (Demo mode)', 'info');
        }
        
        currentAdminAddress = null;
        
    } catch (error) {
        console.error('❌ Failed to reject admin request:', error);
        showMessage('Failed to reject admin request: ' + error.message, 'error');
    }
}

// Utility function to show messages
function showMessage(message, type = 'info') {
    console.log('💬', message);
    
    const alertClass = type === 'error' ? 'alert-danger' : 
                     type === 'success' ? 'alert-success' : 
                     type === 'warning' ? 'alert-warning' : 'alert-info';
    
    const iconClass = type === 'error' ? 'fa-exclamation-circle' : 
                     type === 'success' ? 'fa-check-circle' : 
                     type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle';
    
    const toast = document.createElement('div');
    toast.className = `alert ${alertClass} alert-dismissible fade show position-fixed`;
    toast.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    toast.innerHTML = `
        <i class="fas ${iconClass} me-2"></i>${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 4000);
}

// Global functions for HTML onclick handlers
window.editCourse = editCourse;
window.toggleCourse = toggleCourse;
window.showTokenRequestModal = showTokenRequestModal;
window.showAdminApprovalModal = showAdminApprovalModal;
window.showAdminRejectionModal = showAdminRejectionModal;
window.addNewCourse = addNewCourse;
window.approveTokenRequest = approveTokenRequest;
window.rejectTokenRequest = rejectTokenRequest;
window.approveAdminRequest = approveAdminRequest;
window.rejectAdminRequest = rejectAdminRequest;