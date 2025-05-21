// Student Dashboard Script with Cart System

// Global variables
let courses = [];
let registeredCourses = []; // Only paid courses
let cartCourses = []; // Cart courses awaiting payment
let tokenRequests = [];
let walletConnected = true; // Pre-set to true for demonstration

// Dummy account data
const walletAddress = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";
const walletBalance = 250.00; // CRST tokens

// Dummy data for available courses
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
        student: walletAddress,
        amount: "100000000000000000000", // 100 tokens in wei
        reason: "Need tokens for Smart Contract Development course fee",
        isPending: true,
        isApproved: false,
        timestamp: Math.floor(Date.now() / 1000) - 86400 // Yesterday
    },
    {
        id: "2",
        student: walletAddress,
        amount: "50000000000000000000", // 50 tokens in wei
        reason: "For additional course materials",
        isPending: false,
        isApproved: true,
        timestamp: Math.floor(Date.now() / 1000) - 172800 // 2 days ago
    }
];

// Initialize the student dashboard
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the dashboard with prefilled data
    initializeDashboard();
    
    // Event listeners for actions
    document.getElementById('submit-token-request').addEventListener('click', submitTokenRequest);
    document.getElementById('proceed-to-checkout-btn').addEventListener('click', showCartPaymentModal);
    document.getElementById('confirm-cart-payment').addEventListener('click', processCartPayment);
    
    // Add event listener for connect wallet button (for real implementation)
    const connectButton = document.getElementById('connect-wallet');
    if (connectButton) {
        connectButton.addEventListener('click', connectWallet);
    }
    
    // Add event listener for view cart button
    const viewCartBtn = document.getElementById('view-cart-btn');
    if (viewCartBtn) {
        viewCartBtn.addEventListener('click', function() {
            // Update cart badge count
            updateCartBadge();
            
            // Show/hide cart based on current state
            const cartSection = document.getElementById('cart-section');
            if (cartSection.classList.contains('d-none')) {
                cartSection.classList.remove('d-none');
                this.innerHTML = '<i class="fas fa-shopping-cart me-1"></i>Hide Cart';
            } else {
                cartSection.classList.add('d-none');
                this.innerHTML = '<i class="fas fa-shopping-cart me-1"></i>View Cart <span class="badge bg-danger cart-count">0</span>';
            }
        });
    }
});

// Initialize dashboard with prefilled data
function initializeDashboard() {
    // Set wallet as connected
    walletConnected = true;
    
    // Load data
    courses = [...dummyCourses];
    registeredCourses = [...dummyRegisteredCourses];
    tokenRequests = [...dummyTokenRequests];
    cartCourses = []; // Initialize empty cart
    
    // Update UI to show connected wallet
    updateWalletUI();
    
    // Render all data
    renderAvailableCourses();
    renderRegisteredCourses();
    renderTokenRequests();
    updateCartBadge();
    renderCartCourses();
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
    
    // Show course content
    const walletAlert = document.getElementById('wallet-alert');
    const studentInfo = document.getElementById('student-info');
    const availableCoursesCard = document.getElementById('available-courses-card');
    const viewCartBtn = document.getElementById('view-cart-btn');
    
    if (walletAlert) walletAlert.classList.add('d-none');
    if (studentInfo) studentInfo.classList.remove('d-none');
    if (availableCoursesCard) availableCoursesCard.classList.remove('d-none');
    if (viewCartBtn) viewCartBtn.classList.remove('d-none');
}

// Connect wallet function for real implementation
function connectWallet() {
    // This function would normally connect to MetaMask
    
    /* REAL WALLET CONNECTION CODE:
    
    if (typeof window.ethereum !== 'undefined') {
        // MetaMask is installed
        window.ethereum.request({ method: 'eth_requestAccounts' })
            .then(accounts => {
                if (accounts.length > 0) {
                    // Store wallet address
                    walletAddress = accounts[0];
                    walletConnected = true;
                    
                    // Get token balance
                    const tokenContract = new web3.eth.Contract(tokenABI, tokenAddress);
                    return tokenContract.methods.balanceOf(walletAddress).call();
                }
            })
            .then(balance => {
                // Convert balance from wei to ether
                walletBalance = web3.utils.fromWei(balance, 'ether');
                
                // Update UI
                updateWalletUI();
                
                // Load blockchain data
                loadBlockchainData();
            })
            .catch(error => {
                console.error("Error connecting to wallet:", error);
                alert("Failed to connect wallet. Please try again.");
            });
    } else {
        alert("MetaMask is not installed. Please install MetaMask to use this application.");
    }
    */
    
    // For the prefilled demo, just update UI as if wallet is connected
    updateWalletUI();
}

// Render available courses in the table
function renderAvailableCourses() {
    const tableBody = document.getElementById('available-courses');
    if (!tableBody) return;
    
    // Clear existing content
    tableBody.innerHTML = '';
    
    if (courses.length === 0) {
        // No courses available
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
        // No registrations
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
        // No courses in cart
        cartList.innerHTML = `
            <div class="alert alert-info">
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
        // No requests
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
    // Find course
    const course = courses.find(c => c.id === courseId);
    if (!course) {
        alert("Course not found");
        return;
    }
    
    // Check if already in cart
    if (cartCourses.some(c => c.id === courseId)) {
        alert("Course is already in your cart");
        return;
    }
    
    // Check if already registered
    if (registeredCourses.some(c => c.id === courseId)) {
        alert("You are already registered for this course");
        return;
    }
    
    // Add to cart
    cartCourses.push(course);
    
    // Update UI
    renderAvailableCourses();
    updateCartBadge();
    renderCartCourses();
    
    // Show success message
    alert(`"${course.name}" has been added to your cart`);
}

// Remove course from cart
function removeFromCart(courseId) {
    // Remove from cart
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
        alert("Your cart is empty");
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
        alert("Cart is empty");
        return;
    }
    
    // Calculate total fee
    let totalFee = 0;
    cartCourses.forEach(course => {
        const feeInEther = parseFloat(course.fee) / 1e18;
        totalFee += feeInEther;
    });
    
    // Check if user has enough tokens
    if (walletBalance < totalFee) {
        alert("Insufficient funds");
        return;
    }
    
    // Deduct balance for demo
    walletBalance -= totalFee;
    
    // Get current timestamp
    const registrationTimestamp = Math.floor(Date.now() / 1000);
    
    // Move courses from cart to registered courses
    cartCourses.forEach(course => {
        // Add to registered courses (with registration date)
        registeredCourses.push({
            ...course,
            registrationDate: registrationTimestamp
        });
        
        // Update course enrollment
        const courseIndex = courses.findIndex(c => c.id === course.id);
        if (courseIndex !== -1) {
            courses[courseIndex].enrolled = (parseInt(courses[courseIndex].enrolled) + 1).toString();
        }
    });
    
    // Clear cart
    cartCourses = [];
    
    // Hide modal
    const cartPaymentModal = bootstrap.Modal.getInstance(document.getElementById('cartPaymentModal'));
    if (cartPaymentModal) cartPaymentModal.hide();
    
    // Update UI
    renderAvailableCourses();
    renderRegisteredCourses();
    updateCartBadge();
    renderCartCourses();
    
    // Update token balance
    const tokenBalanceElement = document.getElementById('token-balance');
    if (tokenBalanceElement) tokenBalanceElement.textContent = `${walletBalance.toFixed(2)} CRST`;
    
    // Show success message
    alert("Payment successful! You have been registered for all courses.");
    
    // Close cart section if open
    const cartSection = document.getElementById('cart-section');
    if (!cartSection.classList.contains('d-none')) {
        cartSection.classList.add('d-none');
        const viewCartBtn = document.getElementById('view-cart-btn');
        if (viewCartBtn) {
            viewCartBtn.innerHTML = '<i class="fas fa-shopping-cart me-1"></i>View Cart <span class="badge bg-danger cart-count">0</span>';
        }
    }
}

// Submit token request
function submitTokenRequest() {
    // Get form values
    const amount = document.getElementById('token-amount').value;
    const reason = document.getElementById('request-reason').value;
    
    // Validation
    if (!amount || !reason) {
        alert("Please fill in all fields");
        return;
    }
    
    console.log(`Requesting ${amount} tokens with reason: ${reason}`);
    
    // For dummy data, add a new token request
    const newRequest = {
        id: (tokenRequests.length + 1).toString(),
        student: walletAddress,
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
    alert("Token request submitted successfully!");
}