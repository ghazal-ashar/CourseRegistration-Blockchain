// Updated Student Dashboard Script - Session Integration

// Global variables
let courses = [];
let registeredCourses = [];
let cartCourses = [];
let tokenRequests = [];
let walletBalance = 250.00; // Default balance
let userSession = null;

// Dummy data for available courses (same as before)
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

// Dummy data for registered courses (paid only)
const dummyRegisteredCourses = [
    {
        id: "101",
        name: "Introduction to Blockchain",
        description: "Learn the fundamentals of blockchain technology and its applications.",
        creditHours: "3",
        fee: "100000000000000000000", // 100 tokens in wei
        capacity: "30",
        enrolled: "12",
        isActive: true,
        registrationDate: Math.floor(Date.now() / 1000) - 604800 // 7 days ago
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
        student: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
        amount: "50000000000000000000", // 50 tokens in wei
        reason: "For additional course materials",
        isPending: false,
        isApproved: true,
        timestamp: Math.floor(Date.now() / 1000) - 172800 // 2 days ago
    }
];

// Initialize the student dashboard
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing Student Portal...');
    
    // Verify user session
    if (!verifyStudentSession()) {
        return; // Will redirect to login
    }
    
    // Initialize the dashboard with prefilled data
    initializeDashboard();
    
    // Setup event listeners
    setupEventListeners();
    
    console.log('✅ Student Portal initialized successfully');
});

// Verify student session using the new session system
function verifyStudentSession() {
    try {
        // Use the session verification from login.js
        userSession = verifySession();
        
        if (!userSession) {
            return false; // verifySession will handle redirect
        }
        
        console.log('✅ Valid student session found:', userSession.email);
        
        // Update UI with session data
        updateUserUI();
        
        return true;
        
    } catch (error) {
        console.error('❌ Session verification failed:', error);
        window.location.href = 'login.html';
        return false;
    }
}

// Update UI with user session data
function updateUserUI() {
    // Update wallet address display in navigation
    const walletAddressElement = document.getElementById('wallet-address');
    if (walletAddressElement) {
        const shortAddress = `${userSession.walletAddress.slice(0, 6)}...${userSession.walletAddress.slice(-4)}`;
        walletAddressElement.textContent = shortAddress;
        walletAddressElement.title = userSession.walletAddress; // Full address on hover
    }
    
    // Show blockchain integration status
    if (userSession.usingBlockchain) {
        console.log('✅ Blockchain integration active');
    } else {
        console.log('⚠️ Demo mode - no blockchain integration');
    }
    
    // Update the wallet connection UI to show as connected
    updateWalletConnectionUI();
}

function updateWalletConnectionUI() {
    // Hide connect wallet button and show balance
    const connectBtn = document.getElementById('connect-wallet');
    if (connectBtn) {
        connectBtn.style.display = 'none';
    }
    
    // Show token balance
    const tokenBalanceElement = document.getElementById('token-balance');
    if (tokenBalanceElement) {
        tokenBalanceElement.textContent = `${walletBalance.toFixed(2)} CRST`;
    }
    
    // Hide wallet alert and show course content
    const walletAlert = document.getElementById('wallet-alert');
    const studentInfo = document.getElementById('student-info');
    
    if (walletAlert) walletAlert.classList.add('d-none');
    if (studentInfo) studentInfo.classList.remove('d-none');
}

// Setup event listeners
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
    
    // Connect wallet button (fallback)
    const connectButton = document.getElementById('connect-wallet');
    if (connectButton) {
        connectButton.addEventListener('click', function() {
            showMessage('Wallet is already connected via login!', 'info');
        });
    }
}

// Initialize dashboard with prefilled data
function initializeDashboard() {
    console.log('📊 Loading student dashboard data...');
    
    // Load data
    courses = [...dummyCourses];
    registeredCourses = [...dummyRegisteredCourses];
    tokenRequests = [...dummyTokenRequests];
    cartCourses = []; // Initialize empty cart
    
    // Render all data
    renderAvailableCourses();
    renderRegisteredCourses();
    renderTokenRequests();
    updateCartBadge();
    renderCartCourses();
    
    console.log('✅ Student dashboard loaded successfully');
}

// Render available courses in the table
function renderAvailableCourses() {
    const tableBody = document.getElementById('available-courses');
    if (!tableBody) return;
    
    // Clear existing content
    tableBody.innerHTML = '';
    
    if (courses.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="7" class="text-center py-3">
                <i class="fas fa-info-circle me-2"></i>No courses available at this time.
            </td>
        `;
        tableBody.appendChild(row);
        return;
    }
    
    // Render each course
    courses.forEach(course => {
        if (course.isActive) {
            const row = document.createElement('tr');
            
            // Check if user is already registered for this course
            const isRegistered = registeredCourses.some(rc => rc.id === course.id);
            
            // Check if course is already in cart
            const isInCart = cartCourses.some(cc => cc.id === course.id);
            
            // Create fee display with proper formatting
            const feeInEther = parseFloat(course.fee) / 1e18; // Convert wei to ether
            
            // Calculate availability
            const availability = `${course.enrolled}/${course.capacity}`;
            
            row.innerHTML = `
                <td>${course.id}</td>
                <td>${course.name}</td>
                <td>${course.description}</td>
                <td>${course.creditHours}</td>
                <td>${feeInEther} CRST</td>
                <td>${availability}</td>
                <td>
                    ${!isRegistered && !isInCart ? 
                        `<button class="btn btn-sm btn-primary add-to-cart-btn" data-course-id="${course.id}">
                            <i class="fas fa-cart-plus me-1"></i>Add to Cart
                        </button>` : 
                        isRegistered ? 
                        `<span class="badge bg-success">
                            <i class="fas fa-check me-1"></i>Registered
                        </span>` :
                        `<span class="badge bg-info">
                            <i class="fas fa-shopping-cart me-1"></i>In Cart
                        </span>`
                    }
                </td>
            `;
            
            tableBody.appendChild(row);
        }
    });
    
    // Add event listeners to add to cart buttons
    document.querySelectorAll('.add-to-cart-btn').forEach(button => {
        button.addEventListener('click', function() {
            const courseId = this.getAttribute('data-course-id');
            addToCart(courseId);
        });
    });
}

// Render student's registered courses (only paid courses)
function renderRegisteredCourses() {
    const tableBody = document.getElementById('registered-courses');
    if (!tableBody) return;
    
    // Clear existing content
    tableBody.innerHTML = '';
    
    if (registeredCourses.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="6" class="text-center py-3">
                <i class="fas fa-info-circle me-2"></i>You haven't registered for any courses yet.
            </td>
        `;
        tableBody.appendChild(row);
        return;
    }
    
    // Render each registered course
    registeredCourses.forEach(course => {
        const row = document.createElement('tr');
        
        // Create fee display with proper formatting
        const feeInEther = parseFloat(course.fee) / 1e18; // Convert wei to ether
        
        // Format date
        const registrationDate = new Date(course.registrationDate * 1000).toLocaleDateString();
        
        row.innerHTML = `
            <td>${course.id}</td>
            <td>${course.name}</td>
            <td>${course.creditHours}</td>
            <td>${feeInEther} CRST</td>
            <td>${registrationDate}</td>
            <td>
                <span class="badge bg-success">
                    <i class="fas fa-check-circle me-1"></i>Registered
                </span>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Render courses in the cart
function renderCartCourses() {
    const cartList = document.getElementById('cart-courses');
    if (!cartList) return;
    
    // Clear existing content
    cartList.innerHTML = '';
    
    if (cartCourses.length === 0) {
        cartList.innerHTML = `
             <div class="alert alert-warning">
                 <i class="fas fa-info-circle me-2"></i>Your cart is empty. Browse available courses and add them to your cart.
             </div>
        `;
        
        // Disable checkout button
        const checkoutButton = document.getElementById('proceed-to-checkout-btn');
        if (checkoutButton) checkoutButton.disabled = true;
        
        return;
    }
    
    // Enable checkout button
    const checkoutButton = document.getElementById('proceed-to-checkout-btn');
    if (checkoutButton) checkoutButton.disabled = false;
    
    // Calculate total fees
    let totalFees = 0;
    
    // Render each course in cart
    cartCourses.forEach(course => {
        const feeInEther = parseFloat(course.fee) / 1e18; // Convert wei to ether
        totalFees += feeInEther;
        
        const listItem = document.createElement('div');
        listItem.className = 'card mb-2';
        listItem.innerHTML = `
            <div class="card-body py-2">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-0">${course.name}</h6>
                        <small class="text-muted">${course.creditHours} credits | ${feeInEther} CRST</small>
                    </div>
                    <button class="btn btn-sm btn-danger remove-from-cart-btn" data-course-id="${course.id}">
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
                <h6 class="mb-0">${totalFees.toFixed(2)} CRST</h6>
            </div>
        </div>
    `;
    cartList.appendChild(totalSection);
    
    // Add event listeners to remove buttons
    document.querySelectorAll('.remove-from-cart-btn').forEach(button => {
        button.addEventListener('click', function() {
            const courseId = this.getAttribute('data-course-id');
            removeFromCart(courseId);
        });
    });
}

// Render token requests
function renderTokenRequests() {
    const tableBody = document.getElementById('token-requests');
    if (!tableBody) return;
    
    // Clear existing content
    tableBody.innerHTML = '';
    
    if (tokenRequests.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="3" class="text-center py-3">
                <i class="fas fa-info-circle me-2"></i>No token requests.
            </td>
        `;
        tableBody.appendChild(row);
        return;
    }
    
    // Render each token request
    tokenRequests.forEach(request => {
        const row = document.createElement('tr');
        
        // Create amount display with proper formatting
        const amountInEther = parseFloat(request.amount) / 1e18; // Convert wei to ether
        
        // Format date
        const date = new Date(request.timestamp * 1000).toLocaleDateString();
        
        // Determine status badge
        let statusBadge = '';
        if (request.isPending) {
            statusBadge = `<span class="badge bg-warning">Pending</span>`;
        } else if (request.isApproved) {
            statusBadge = `<span class="badge bg-success">Approved</span>`;
        } else {
            statusBadge = `<span class="badge bg-danger">Rejected</span>`;
        }
        
        row.innerHTML = `
            <td>${amountInEther} CRST</td>
            <td>${date}</td>
            <td>${statusBadge}</td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Add course to cart
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
    
    // Add to cart
    cartCourses.push(course);
    
    // Update UI
    renderAvailableCourses();
    updateCartBadge();
    renderCartCourses();
    
    // Show success message
    showMessage(`"${course.name}" has been added to your cart`, 'success');
}

// Remove course from cart
function removeFromCart(courseId) {
    cartCourses = cartCourses.filter(c => c.id !== courseId);
    
    // Update UI
    renderAvailableCourses();
    updateCartBadge();
    renderCartCourses();
}

// Update cart badge count
function updateCartBadge() {
    const cartCountElements = document.querySelectorAll('.cart-count');
    cartCountElements.forEach(element => {
        element.textContent = cartCourses.length;
    });
}

// Show cart payment modal
function showCartPaymentModal() {
    if (cartCourses.length === 0) {
        showMessage("Your cart is empty", 'warning');
        return;
    }
    
    // Calculate total fee
    let totalFee = 0;
    
    // Update payment courses list
    const paymentCoursesList = document.getElementById('payment-courses-list');
    if (paymentCoursesList) {
        paymentCoursesList.innerHTML = '';
        
        cartCourses.forEach(course => {
            const feeInEther = parseFloat(course.fee) / 1e18; // Convert wei to ether
            totalFee += feeInEther;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${course.name}</td>
                <td class="text-end">${feeInEther.toFixed(2)} CRST</td>
            `;
            
            paymentCoursesList.appendChild(row);
        });
    }
    
    // Update total amount
    const totalAmountElement = document.getElementById('payment-total-amount');
    if (totalAmountElement) {
        totalAmountElement.textContent = `${totalFee.toFixed(2)} CRST`;
    }
    
    // Get user's balance
    const balanceElement = document.getElementById('cart-payment-balance');
    if (balanceElement) {
        balanceElement.textContent = `${walletBalance.toFixed(2)} CRST`;
    }
    
    // Check if user has enough tokens
    const insufficientFunds = document.getElementById('cart-insufficient-funds');
    const confirmButton = document.getElementById('confirm-cart-payment');
    
    if (walletBalance < totalFee) {
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

// Process cart payment
function processCartPayment() {
    if (cartCourses.length === 0) {
        showMessage("Cart is empty", 'error');
        return;
    }
    
    // Get cart courses and total fee
    let totalFee = 0;
    cartCourses.forEach(course => {
        totalFee += parseFloat(course.fee) / 1e18;
    });
    
    // Check sufficient balance
    if (walletBalance < totalFee) {
        showMessage("Insufficient funds", 'error');
        return;
    }
    
    // Deduct balance
    walletBalance -= totalFee;
    
    // Register each course
    const timestamp = Math.floor(Date.now() / 1000);
    cartCourses.forEach(course => {
        // Prevent duplicate registration
        if (!registeredCourses.some(rc => rc.id === course.id)) {
            registeredCourses.push({
                ...course,
                registrationDate: timestamp
            });
        }
        
        // Update enrolled count
        const courseIndex = courses.findIndex(c => c.id === course.id);
        if (courseIndex !== -1) {
            courses[courseIndex].enrolled = (parseInt(courses[courseIndex].enrolled) + 1).toString();
        }
    });
    
    // Clear cart
    cartCourses = [];
    
    // Update UI
    renderCartCourses();
    renderAvailableCourses();
    renderRegisteredCourses();
    updateCartBadge();
    
    // Update balance display
    const tokenBalanceElement = document.getElementById('token-balance');
    if (tokenBalanceElement) tokenBalanceElement.textContent = `${walletBalance.toFixed(2)} CRST`;
    
    // Hide modal
    const cartPaymentModal = bootstrap.Modal.getInstance(document.getElementById('cartPaymentModal'));
    if (cartPaymentModal) cartPaymentModal.hide();
    
    showMessage("Payment successful! You have been registered for all courses.", 'success');
}

// Submit token request
function submitTokenRequest() {
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
    
    if (reason.trim().length < 10) {
        showMessage("Please provide a more detailed reason (at least 10 characters)", 'error');
        return;
    }
    
    console.log(`Requesting ${amount} tokens with reason: ${reason}`);
    
    // For dummy data, add a new token request
    const newRequest = {
        id: (tokenRequests.length + 1).toString(),
        student: userSession.walletAddress,
        amount: (parseFloat(amount) * 1e18).toString(), // Convert to wei
        reason: reason,
        isPending: true,
        isApproved: false,
        timestamp: Math.floor(Date.now() / 1000)
    };
    
    tokenRequests.push(newRequest);
    
    // Hide modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('requestTokensModal'));
    if (modal) modal.hide();
    
    // Reset form
    document.getElementById('request-tokens-form').reset();
    
    // Update UI
    renderTokenRequests();
    
    // Show success message
    showMessage("Token request submitted successfully! An administrator will review your request.", 'success');
}

// Utility functions
function showMessage(message, type = 'info') {
    console.log('💬', message);
    
    // Create a temporary toast-like notification
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
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 4000);
}

// Global functions for compatibility
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.showCartPaymentModal = showCartPaymentModal;
window.processCartPayment = processCartPayment;
window.submitTokenRequest = submitTokenRequest;