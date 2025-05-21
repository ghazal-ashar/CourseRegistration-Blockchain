// Admin Dashboard Script

// Global variables
let courses = [];
let registrations = [];
let tokenRequests = [];
let totalFeesCollected = 0;
let currentRequestId = null;
let isAdmin = false; 
let walletConnected = false; 

// Admin account data (will be set upon connection)
let walletAddress = "";
let walletBalance = 0; // CRST tokens

// Dummy data for courses
const dummyCourses = [
    {
        id: "101",
        name: "Introduction to Blockchain",
        description: "Learn the fundamentals of blockchain technology and its applications.",
        creditHours: "3",
        fee: "100000000000000000000", // 100 tokens in wei
        capacity: "30",
        enrolled: "12",
        isActive: true
    },
    {
        id: "102",
        name: "Smart Contract Development",
        description: "An in-depth course on developing secure smart contracts with Solidity.",
        creditHours: "4",
        fee: "150000000000000000000", // 150 tokens in wei
        capacity: "25",
        enrolled: "20",
        isActive: true
    },
    {
        id: "103",
        name: "Decentralized Applications",
        description: "Build DApps using Web3.js, React, and Ethereum.",
        creditHours: "3",
        fee: "125000000000000000000", // 125 tokens in wei
        capacity: "20",
        enrolled: "15",
        isActive: true
    },
    {
        id: "104",
        name: "Cryptocurrency Economics",
        description: "Understanding the economic principles behind cryptocurrencies.",
        creditHours: "3",
        fee: "110000000000000000000", // 110 tokens in wei
        capacity: "40",
        enrolled: "22",
        isActive: false
    }
];

// Dummy data for registrations
const dummyRegistrations = [
    {
        studentAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
        courseId: "101",
        courseName: "Introduction to Blockchain",
        timestamp: Math.floor(Date.now() / 1000) - 604800, // 7 days ago
        hasPaid: true
    },
    {
        studentAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
        courseId: "103",
        courseName: "Decentralized Applications",
        timestamp: Math.floor(Date.now() / 1000) - 345600, // 4 days ago
        hasPaid: false
    },
    {
        studentAddress: "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4",
        courseId: "101",
        courseName: "Introduction to Blockchain",
        timestamp: Math.floor(Date.now() / 1000) - 518400, // 6 days ago
        hasPaid: true
    },
    {
        studentAddress: "0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2",
        courseId: "102",
        courseName: "Smart Contract Development",
        timestamp: Math.floor(Date.now() / 1000) - 432000, // 5 days ago
        hasPaid: false
    }
];

// Dummy data for token requests
const dummyTokenRequests = [
    {
        id: "1",
        student: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
        amount: "100000000000000000000", // 100 tokens in wei
        reason: "Need tokens for Smart Contract Development course fee",
        isPending: true,
        isApproved: false,
        timestamp: Math.floor(Date.now() / 1000) - 86400 // Yesterday
    },
    {
        id: "2",
        student: "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4",
        amount: "150000000000000000000", // 150 tokens in wei
        reason: "For multiple course registrations this semester",
        isPending: true,
        isApproved: false,
        timestamp: Math.floor(Date.now() / 1000) - 43200 // 12 hours ago
    },
    {
        id: "3",
        student: "0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2",
        amount: "50000000000000000000", // 50 tokens in wei
        reason: "For additional course materials",
        isPending: false,
        isApproved: true,
        timestamp: Math.floor(Date.now() / 1000) - 172800 // 2 days ago
    }
];

// Initialize the admin dashboard
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is admin
    verifyAdmin();
    
    // Event listeners for actions
    document.getElementById('add-course').addEventListener('click', addNewCourse);
    document.getElementById('update-course').addEventListener('click', updateExistingCourse);
    document.getElementById('confirm-delete-course').addEventListener('click', deleteExistingCourse);
    document.getElementById('mint-tokens').addEventListener('click', mintTokens);
    document.getElementById('approve-request').addEventListener('click', approveTokenRequest);
    document.getElementById('reject-request').addEventListener('click', rejectTokenRequest);
    
    // Add event listener for connect wallet button
    const connectButton = document.getElementById('connect-wallet');
    if (connectButton) {
        connectButton.addEventListener('click', connectWallet);
    }
});

// Verify user is admin
function verifyAdmin() {
    // Get stored user
    const storedUser = JSON.parse(localStorage.getItem('user'));
    
    if (!storedUser || storedUser.role !== 'admin') {
        // Not admin, redirect to login
        window.location.href = '../index.html';
        return;
    }
    
    // Update email display
    const userEmail = document.getElementById('user-email');
    if (userEmail) {
        userEmail.textContent = storedUser.email;
    }
    
    // Set as admin
    isAdmin = true;
}

// Connect wallet function
function connectWallet() {
    // For demo purposes, simulate connecting to MetaMask with admin wallet
    walletAddress = "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0";
    walletBalance = 1000.00; // CRST tokens
    walletConnected = true;
    
    // Initialize the dashboard with admin data
    initializeDashboard();
}

// Initialize dashboard with admin data
function initializeDashboard() {
    // Load data
    courses = [...dummyCourses];
    registrations = [...dummyRegistrations];
    tokenRequests = [...dummyTokenRequests];
    
    // Calculate total fees collected
    totalFeesCollected = registrations
        .filter(reg => reg.hasPaid)
        .reduce((total, reg) => {
            const course = courses.find(c => c.id === reg.courseId);
            return total + (course ? parseFloat(course.fee) / 1e18 : 0);
        }, 0);
    
    // Update UI to show connected wallet
    updateWalletUI();
    
    // Render all data
    renderCourseList();
    renderRegistrationList();
    loadSystemStats();
    
    // Filter for pending requests only for the UI
    const pendingRequests = tokenRequests.filter(request => request.isPending);
    renderTokenRequests(pendingRequests);
}

// Update UI for connected wallet
function updateWalletUI() {
    // Hide wallet connection UI
    const walletNotConnected = document.getElementById('wallet-not-connected');
    if (walletNotConnected) walletNotConnected.classList.add('d-none');
    
    // Show wallet connected UI
    const walletConnectedUI = document.getElementById('wallet-connected');
    if (walletConnectedUI) walletConnectedUI.classList.remove('d-none');
    
    // Update wallet address
    const walletAddressElement = document.getElementById('wallet-address');
    if (walletAddressElement) walletAddressElement.textContent = walletAddress;
    
    // Update token balance
    const tokenBalanceElement = document.getElementById('token-balance');
    if (tokenBalanceElement) tokenBalanceElement.textContent = `${walletBalance.toFixed(2)} CRST`;
    
    // Show admin UI elements
    const welcomeMessage = document.getElementById('welcome-message');
    const adminPanelCard = document.getElementById('admin-panel-card');
    const statsCard = document.getElementById('stats-card');
    const tokenRequestsCard = document.getElementById('token-requests-card');
    const courseManagementCard = document.getElementById('course-management-card');
    const registrationsCard = document.getElementById('registrations-card');
    
    if (welcomeMessage) welcomeMessage.classList.add('d-none');
    if (adminPanelCard) adminPanelCard.classList.remove('d-none');
    if (statsCard) statsCard.classList.remove('d-none');
    if (tokenRequestsCard) tokenRequestsCard.classList.remove('d-none');
    if (courseManagementCard) courseManagementCard.classList.remove('d-none');
    if (registrationsCard) registrationsCard.classList.remove('d-none');
}

// Load system statistics
function loadSystemStats() {
    const totalCoursesElement = document.getElementById('total-courses');
    const totalStudentsElement = document.getElementById('total-students');
    const totalRegistrationsElement = document.getElementById('total-registrations');
    const totalFeesElement = document.getElementById('total-fees');
    
    // Calculate unique students
    const uniqueStudents = [...new Set(registrations.map(reg => reg.studentAddress))].length;
    
    if (totalCoursesElement) totalCoursesElement.textContent = courses.length;
    if (totalStudentsElement) totalStudentsElement.textContent = uniqueStudents;
    if (totalRegistrationsElement) totalRegistrationsElement.textContent = registrations.length;
    if (totalFeesElement) totalFeesElement.textContent = `${totalFeesCollected.toFixed(2)} CRST`;
}

// Render course list in the table
function renderCourseList() {
    const tableBody = document.getElementById('course-list');
    if (!tableBody) return;
    
    // Clear existing content
    tableBody.innerHTML = '';
    
    if (courses.length === 0) {
        // No courses available
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="8" class="text-center py-3">
                <i class="fas fa-info-circle me-2"></i>No courses have been added yet.
            </td>
        `;
        tableBody.appendChild(row);
        return;
    }
    
    // Render each course
    courses.forEach(course => {
        const row = document.createElement('tr');
        
        // Create fee display with proper formatting
        const feeInEther = parseFloat(course.fee) / 1e18; // Convert wei to ether
        
        // Determine status badge
        const statusBadge = course.isActive ? 
            `<span class="badge bg-success">Active</span>` : 
            `<span class="badge bg-secondary">Inactive</span>`;
        
        row.innerHTML = `
            <td>${course.id}</td>
            <td>${course.name}</td>
            <td>${course.creditHours}</td>
            <td>${feeInEther} CRST</td>
            <td>${course.capacity}</td>
            <td>${course.enrolled}/${course.capacity}</td>
            <td>${statusBadge}</td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-warning edit-course-btn" data-course-id="${course.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${course.isActive ? 
                        `<button class="btn btn-danger deactivate-course-btn" data-course-id="${course.id}">
                            <i class="fas fa-ban"></i>
                        </button>` : 
                        `<button class="btn btn-success activate-course-btn" data-course-id="${course.id}">
                            <i class="fas fa-check"></i>
                        </button>`
                    }
                    <button class="btn btn-danger delete-course-btn" data-course-id="${course.id}" ${course.enrolled > 0 ? 'disabled' : ''}>
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Add event listeners to action buttons
    document.querySelectorAll('.edit-course-btn').forEach(button => {
        button.addEventListener('click', function() {
            const courseId = this.getAttribute('data-course-id');
            showEditCourseModal(courseId);
        });
    });
    
    document.querySelectorAll('.deactivate-course-btn').forEach(button => {
        button.addEventListener('click', function() {
            const courseId = this.getAttribute('data-course-id');
            deactivateCourse(courseId);
        });
    });
    
    document.querySelectorAll('.activate-course-btn').forEach(button => {
        button.addEventListener('click', function() {
            const courseId = this.getAttribute('data-course-id');
            activateCourse(courseId);
        });
    });
    
    document.querySelectorAll('.delete-course-btn').forEach(button => {
        button.addEventListener('click', function() {
            const courseId = this.getAttribute('data-course-id');
            showDeleteCourseModal(courseId);
        });
    });
}

// Render token requests
function renderTokenRequests(pendingRequests) {
    const requestsList = document.getElementById('token-requests-list');
    const noRequests = document.getElementById('no-requests');
    
    if (!requestsList || !noRequests) return;
    
    // Clear existing content
    requestsList.innerHTML = '';
    
    if (pendingRequests.length === 0) {
        // No pending requests
        noRequests.classList.remove('d-none');
        return;
    }
    
    // Hide no requests message
    noRequests.classList.add('d-none');
    
    // Render each pending request
    pendingRequests.forEach(request => {
        // Create amount display with proper formatting
        const amountInEther = parseFloat(request.amount) / 1e18; // Convert wei to ether
        
        // Format date
        const date = new Date(request.timestamp * 1000).toLocaleDateString();
        
        // Create list item
        const listItem = document.createElement('a');
        listItem.href = '#';
        listItem.className = 'list-group-item list-group-item-action';
        listItem.setAttribute('data-request-id', request.id);
        listItem.innerHTML = `
            <div class="d-flex w-100 justify-content-between">
                <h5 class="mb-1">${amountInEther} CRST</h5>
                <small>${date}</small>
            </div>
            <p class="mb-1">From: <span class="eth-address">${request.student}</span></p>
            <small class="text-truncate d-block">${request.reason.substring(0, 50)}${request.reason.length > 50 ? '...' : ''}</small>
        `;
        
        requestsList.appendChild(listItem);
        
        // Add event listener
        listItem.addEventListener('click', function(e) {
            e.preventDefault();
            const requestId = this.getAttribute('data-request-id');
            showTokenRequestModal(requestId);
        });
    });
}

// Render registration list in the table
function renderRegistrationList() {
    const tableBody = document.getElementById('registration-list');
    if (!tableBody) return;
    
    // Clear existing content
    tableBody.innerHTML = '';
    
    if (registrations.length === 0) {
        // No registrations
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="5" class="text-center py-3">
                <i class="fas fa-info-circle me-2"></i>No student registrations yet.
            </td>
        `;
        tableBody.appendChild(row);
        return;
    }
    
    // Render each registration
    registrations.forEach(reg => {
        const row = document.createElement('tr');
        
        // Format date from timestamp
        const registrationDate = new Date(reg.timestamp * 1000).toLocaleDateString();
        
        // Create payment status badge
        const paymentStatus = reg.hasPaid ? 
            `<span class="badge bg-success">Paid</span>` : 
            `<span class="badge bg-warning">Unpaid</span>`;
        
        row.innerHTML = `
            <td>
                <span class="eth-address">${reg.studentAddress}</span>
            </td>
            <td>${reg.courseId}</td>
            <td>${reg.courseName}</td>
            <td>${registrationDate}</td>
            <td>${paymentStatus}</td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Show edit course modal
function showEditCourseModal(courseId) {
    const course = courses.find(c => c.id === courseId);
    if (!course) return;
    
    // Populate form fields
    document.getElementById('edit-course-id').value = course.id;
    document.getElementById('edit-course-name').value = course.name;
    document.getElementById('edit-course-description').value = course.description;
    document.getElementById('edit-credit-hours').value = course.creditHours;
    
    // Convert fee from wei to ether
    const feeInEther = parseFloat(course.fee) / 1e18; // Convert wei to ether
    document.getElementById('edit-course-fee').value = feeInEther;
    
    document.getElementById('edit-course-capacity').value = course.capacity;
    
    // Show modal
    const editModal = new bootstrap.Modal(document.getElementById('editCourseModal'));
    editModal.show();
}

// Show delete course modal
function showDeleteCourseModal(courseId) {
    const course = courses.find(c => c.id === courseId);
    if (!course) return;
    
    // Check if course has enrolled students
    if (parseInt(course.enrolled) > 0) {
        alert("Cannot delete a course with enrolled students");
        return;
    }
    
    // Populate modal fields
    document.getElementById('delete-course-id').value = course.id;
    document.getElementById('delete-course-name').textContent = course.name;
    
    // Show modal
    const deleteModal = new bootstrap.Modal(document.getElementById('deleteCourseModal'));
    deleteModal.show();
}

// Show token request modal
function showTokenRequestModal(requestId) {
    const request = tokenRequests.find(r => r.id === requestId);
    if (!request) return;
    
    // Store request ID for actions
    currentRequestId = requestId;
    
    // Populate modal fields
    document.getElementById('request-id').value = request.id;
    document.getElementById('request-student').textContent = request.student;
    
    // Format amount from wei to ether
    const amountInEther = parseFloat(request.amount) / 1e18; // Convert wei to ether
    document.getElementById('request-amount').textContent = amountInEther;
    
    // Format date
    const date = new Date(request.timestamp * 1000).toLocaleDateString();
    document.getElementById('request-date').textContent = date;
    
    document.getElementById('request-reason').textContent = request.reason;
    
    // Show modal
    const requestModal = new bootstrap.Modal(document.getElementById('tokenRequestModal'));
    requestModal.show();
}

// Add a new course
function addNewCourse() {
    // Get form values
    const courseId = document.getElementById('course-id').value;
    const name = document.getElementById('course-name').value;
    const description = document.getElementById('course-description').value;
    const creditHours = document.getElementById('credit-hours').value;
    const fee = document.getElementById('course-fee').value;
    const capacity = document.getElementById('course-capacity').value;
    
    // Validation
    if (!courseId || !name || !description || !creditHours || !fee || !capacity) {
        alert("Please fill in all fields");
        return;
    }
    
    // Check if course ID already exists
    if (courses.some(c => c.id === courseId)) {
        alert("Course ID already exists");
        return;
    }
    
    console.log(`Adding new course: ${name}`);
    
    // For dummy data, add a new course
    const newCourse = {
        id: courseId,
        name: name,
        description: description,
        creditHours: creditHours,
        fee: (parseFloat(fee) * 1e18).toString(), // Convert to wei
        capacity: capacity,
        enrolled: "0",
        isActive: true
    };
    
    courses.push(newCourse);
    
    // Hide modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('addCourseModal'));
    if (modal) modal.hide();
    
    // Reset form
    document.getElementById('add-course-form').reset();
    
    // Update UI
    renderCourseList();
    loadSystemStats();
    
    // Show success message
    alert("Course added successfully!");
}

// Update an existing course
function updateExistingCourse() {
    // Get form values
    const courseId = document.getElementById('edit-course-id').value;
    const name = document.getElementById('edit-course-name').value;
    const description = document.getElementById('edit-course-description').value;
    const creditHours = document.getElementById('edit-credit-hours').value;
    const fee = document.getElementById('edit-course-fee').value;
    const capacity = document.getElementById('edit-course-capacity').value;
    
    // Validation
    if (!courseId || !name || !description || !creditHours || !fee || !capacity) {
        alert("Please fill in all fields");
        return;
    }
    
    console.log(`Updating course: ${courseId}`);
    
    // Find course index
    const courseIndex = courses.findIndex(c => c.id === courseId);
    if (courseIndex === -1) {
        alert("Course not found");
        return;
    }
    
    // Update course in dummy data
    courses[courseIndex] = {
        ...courses[courseIndex],
        name: name,
        description: description,
        creditHours: creditHours,
        fee: (parseFloat(fee) * 1e18).toString(), // Convert to wei
        capacity: capacity
    };
    
    // Update course name in registrations
    registrations.forEach(reg => {
        if (reg.courseId === courseId) {
            reg.courseName = name;
        }
    });
    
    // Hide modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('editCourseModal'));
    if (modal) modal.hide();
    
    // Update UI
    renderCourseList();
    renderRegistrationList();
    
    // Show success message
    alert("Course updated successfully!");
}

// Delete a course
function deleteExistingCourse() {
    // Get course ID from hidden field
    const courseId = document.getElementById('delete-course-id').value;
    if (!courseId) return;
    
    console.log(`Deleting course: ${courseId}`);
    
    // Find course index
    const courseIndex = courses.findIndex(c => c.id === courseId);
    if (courseIndex === -1) {
        alert("Course not found");
        return;
    }
    
    // Check if course has enrolled students
    if (parseInt(courses[courseIndex].enrolled) > 0) {
        alert("Cannot delete a course with enrolled students");
        return;
    }
    
    // Remove course from dummy data
    courses.splice(courseIndex, 1);
    
    // Hide modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('deleteCourseModal'));
    if (modal) modal.hide();
    
    // Update UI
    renderCourseList();
    loadSystemStats();
    
    // Show success message
    alert("Course deleted successfully!");
}

// Activate a course
function activateCourse(courseId) {
    console.log(`Activating course: ${courseId}`);
    
    // Find course index
    const courseIndex = courses.findIndex(c => c.id === courseId);
    if (courseIndex === -1) {
        alert("Course not found");
        return;
    }
    
    // Update course status
    courses[courseIndex].isActive = true;
    
    // Update UI
    renderCourseList();
    
    // Show success message
    alert("Course activated successfully!");
}

// Deactivate a course
function deactivateCourse(courseId) {
    console.log(`Deactivating course: ${courseId}`);
    
    // Find course index
    const courseIndex = courses.findIndex(c => c.id === courseId);
    if (courseIndex === -1) {
        alert("Course not found");
        return;
    }
    
    // Update course status
    courses[courseIndex].isActive = false;
    
    // Update UI
    renderCourseList();
    
    // Show success message
    alert("Course deactivated successfully!");
}

// Approve a token request
function approveTokenRequest() {
    if (!currentRequestId) return;
    
    console.log(`Approving token request: ${currentRequestId}`);
    
    // Find request index
    const requestIndex = tokenRequests.findIndex(r => r.id === currentRequestId);
    if (requestIndex === -1) {
        alert("Request not found");
        return;
    }
    
    // Update request status
    tokenRequests[requestIndex].isPending = false;
    tokenRequests[requestIndex].isApproved = true;
    
    // Hide modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('tokenRequestModal'));
    if (modal) modal.hide();
    
    // Update UI
    const pendingRequests = tokenRequests.filter(request => request.isPending);
    renderTokenRequests(pendingRequests);
    
    // Show success message
    alert("Token request approved successfully!");
}

// Reject a token request
function rejectTokenRequest() {
    if (!currentRequestId) return;
    
    console.log(`Rejecting token request: ${currentRequestId}`);
    
    // Find request index
    const requestIndex = tokenRequests.findIndex(r => r.id === currentRequestId);
    if (requestIndex === -1) {
        alert("Request not found");
        return;
    }
    
    // Update request status
    tokenRequests[requestIndex].isPending = false;
    tokenRequests[requestIndex].isApproved = false;
    
    // Hide modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('tokenRequestModal'));
    if (modal) modal.hide();
    
    // Update UI
    const pendingRequests = tokenRequests.filter(request => request.isPending);
    renderTokenRequests(pendingRequests);
    
    // Show success message
    alert("Token request rejected successfully!");
}

// Mint new tokens
function mintTokens() {
    // Get form values
    const recipientAddress = document.getElementById('recipient-address').value;
    const amount = document.getElementById('token-amount').value;
    
    // Validation
    if (!recipientAddress || !amount) {
        alert("Please fill in all fields");
        return;
    }
    
    console.log(`Minting ${amount} tokens to ${recipientAddress}`);
    
    // Hide modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('mintTokensModal'));
    if (modal) modal.hide();
    
    // Reset form
    document.getElementById('mint-tokens-form').reset();
    
    // Show success message
    alert(`Successfully minted ${amount} CRST to ${recipientAddress}`);
}