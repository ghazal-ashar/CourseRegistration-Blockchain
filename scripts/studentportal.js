// Student Dashboard Script with Pre-filled Data (Wallet Connected)

// Global variables
let courses = [];
let registeredCourses = [];
let courseIdToPay = null;
let walletConnected = true; // Pre-set to true for demonstration
let tokenRequests = [];

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

// Dummy data for registered courses
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
        hasPaid: true
    },
    {
        id: "103",
        name: "Decentralized Applications",
        description: "Build DApps using Web3.js, React, and Ethereum.",
        creditHours: "3",
        fee: "125000000000000000000", // 125 tokens in wei
        capacity: "20",
        enrolled: "15",
        isActive: true,
        hasPaid: false
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
    document.getElementById('confirm-payment').addEventListener('click', payCourseFee);
    document.getElementById('confirm-bulk-payment').addEventListener('click', confirmBulkPayment);
    document.getElementById('final-confirm-payment').addEventListener('click', processBulkPayment);
    
    // Add event listener for connect wallet button (for real implementation)
    const connectButton = document.getElementById('connect-wallet');
    if (connectButton) {
        connectButton.addEventListener('click', connectWallet);
    }
    
    // Add event listener for pay all fees button
    const payAllFeesBtn = document.getElementById('pay-all-fees-btn');
    if (payAllFeesBtn) {
        payAllFeesBtn.addEventListener('click', showBulkPaymentModal);
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
    
    // Update UI to show connected wallet
    updateWalletUI();
    
    // Render all data
    renderAvailableCourses();
    renderRegisteredCourses();
    renderTokenRequests();
    
    // Show/hide pay all fees button based on unpaid courses
    updatePayAllFeesButton();
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
    
    if (walletAlert) walletAlert.classList.add('d-none');
    if (studentInfo) studentInfo.classList.remove('d-none');
    if (availableCoursesCard) availableCoursesCard.classList.remove('d-none');
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

// Load blockchain data for real implementation
function loadBlockchainData() {
    /* REAL BLOCKCHAIN DATA LOADING:
    
    // Create contract instances
    const courseRegistrationContract = new web3.eth.Contract(registrationABI, registrationAddress);
    
    // Load courses
    courseRegistrationContract.methods.getCourseCount().call()
        .then(courseCount => {
            // Get all course IDs
            const coursePromises = [];
            for (let i = 0; i < courseCount; i++) {
                coursePromises.push(courseRegistrationContract.methods.courseIds(i).call());
            }
            return Promise.all(coursePromises);
        })
        .then(courseIds => {
            // Get course details
            const courseDetailPromises = [];
            courseIds.forEach(id => {
                courseDetailPromises.push(courseRegistrationContract.methods.courses(id).call());
            });
            return Promise.all(courseDetailPromises);
        })
        .then(coursesData => {
            courses = coursesData;
            renderAvailableCourses();
            
            // Load registrations
            return loadRegistrations(courseRegistrationContract);
        })
        .catch(error => {
            console.error("Error loading blockchain data:", error);
        });
    */
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
                    ${!isRegistered ? 
                        `<button class="btn btn-sm btn-primary register-btn" data-course-id="${course.id}">
                            <i class="fas fa-plus-circle me-1"></i>Register
                        </button>` : 
                        `<span class="badge bg-success">
                            <i class="fas fa-check me-1"></i>Registered
                        </span>`
                    }
                </td>
            `;
            
            tableBody.appendChild(row);
        }
    });
    
    // Add event listeners to register buttons
    document.querySelectorAll('.register-btn').forEach(button => {
        button.addEventListener('click', function() {
            const courseId = this.getAttribute('data-course-id');
            registerForCourse(courseId);
        });
    });
}

// Render student's registered courses
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
        
        row.innerHTML = `
            <td>${course.id}</td>
            <td>${course.name}</td>
            <td>${course.creditHours}</td>
            <td>${feeInEther} CRST</td>
            <td>
                ${course.hasPaid ? 
                    `<span class="badge bg-success">
                        <i class="fas fa-check-circle me-1"></i>Paid
                    </span>` : 
                    `<span class="badge bg-warning">
                        <i class="fas fa-exclamation-circle me-1"></i>Unpaid
                    </span>`
                }
            </td>
            <td>
                ${!course.hasPaid ? 
                    `<button class="btn btn-sm btn-success pay-btn" data-course-id="${course.id}">
                        <i class="fas fa-money-bill-wave me-1"></i>Pay Fee
                    </button>` : 
                    `<span class="badge bg-secondary">
                        <i class="fas fa-check me-1"></i>Completed
                    </span>`
                }
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Add event listeners to pay buttons
    document.querySelectorAll('.pay-btn').forEach(button => {
        button.addEventListener('click', function() {
            const courseId = this.getAttribute('data-course-id');
            showPaymentModal(courseId);
        });
    });
    
    // Update pay all fees button
    updatePayAllFeesButton();
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

// Register for a course directly
function registerForCourse(courseId) {
    console.log(`Registering for course ${courseId}`);
    
    // Find course
    const course = courses.find(c => c.id === courseId);
    if (!course) {
        alert("Course not found");
        return;
    }
    
    // Add to registered courses with hasPaid = false
    registeredCourses.push({
        ...course,
        hasPaid: false
    });
    
    // Update course enrollment
    const courseIndex = courses.findIndex(c => c.id === courseId);
    if (courseIndex !== -1) {
        courses[courseIndex].enrolled = (parseInt(courses[courseIndex].enrolled) + 1).toString();
    }
    
    // Update UI
    renderRegisteredCourses();
    renderAvailableCourses();
    
    // Show success message
    alert(`Successfully registered for ${course.name}. Please pay the course fee.`);
    
    /* REAL BLOCKCHAIN IMPLEMENTATION:
    
    // Get contract instance
    const courseRegistrationContract = new web3.eth.Contract(registrationABI, registrationAddress);
    
    // Call registerForCourse method
    courseRegistrationContract.methods.registerForCourse(courseId)
        .send({ from: walletAddress })
        .then(receipt => {
            console.log("Registration transaction receipt:", receipt);
            
            // Reload data from blockchain
            loadBlockchainData();
            
            // Show success message
            alert(`Successfully registered for ${course.name}. Please pay the course fee.`);
        })
        .catch(error => {
            console.error("Error registering for course:", error);
            alert("Failed to register for course. Please try again.");
        });
    
    */
}

// Update pay all fees button visibility
function updatePayAllFeesButton() {
    const payAllFeesBtn = document.getElementById('pay-all-fees-btn');
    if (!payAllFeesBtn) return;
    
    // Check if there are any unpaid courses
    const hasUnpaidCourses = registeredCourses.some(course => !course.hasPaid);
    
    // Show/hide button
    if (hasUnpaidCourses) {
        payAllFeesBtn.classList.remove('d-none');
    } else {
        payAllFeesBtn.classList.add('d-none');
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
    
    /* REAL BLOCKCHAIN IMPLEMENTATION:
    
    // Get contract instance
    const courseRegistrationContract = new web3.eth.Contract(registrationABI, registrationAddress);
    
    // Convert amount to wei
    const amountInWei = web3.utils.toWei(amount.toString(), 'ether');
    
    // Call requestTokens method
    courseRegistrationContract.methods.requestTokens(amountInWei, reason)
        .send({ from: walletAddress })
        .then(receipt => {
            console.log("Token request transaction receipt:", receipt);
            
            // Hide modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('requestTokensModal'));
            if (modal) modal.hide();
            
            // Reset form
            document.getElementById('request-tokens-form').reset();
            
            // Reload token requests
            loadTokenRequests();
            
            // Show success message
            alert("Token request submitted successfully!");
        })
        .catch(error => {
            console.error("Error requesting tokens:", error);
            alert("Failed to submit token request. Please try again.");
        });
    
    */
}

// Show payment modal
function showPaymentModal(courseId) {
    const course = registeredCourses.find(c => c.id === courseId);
    if (!course) return;
    
    // Store course ID for payment
    courseIdToPay = courseId;
    
    // Update modal content
    document.getElementById('payment-course-name').textContent = course.name;
    
    // Format fee from wei to ether
    const feeInEther = parseFloat(course.fee) / 1e18; // Convert wei to ether
    document.getElementById('payment-fee').textContent = feeInEther;
    
    // Get user's balance
    document.getElementById('payment-balance').textContent = walletBalance.toFixed(2);
    
    // Check if user has enough tokens
    const insufficientFunds = document.getElementById('insufficient-funds');
    const confirmButton = document.getElementById('confirm-payment');
    
    if (walletBalance < feeInEther) {
        insufficientFunds.style.display = 'block';
        confirmButton.disabled = true;
    } else {
        insufficientFunds.style.display = 'none';
        confirmButton.disabled = false;
    }
    
    // Show modal
    const paymentModal = new bootstrap.Modal(document.getElementById('paymentModal'));
    paymentModal.show();
}

// Pay course fee
function payCourseFee() {
    if (!courseIdToPay) return;
    
    console.log(`Paying fee for course ${courseIdToPay}`);
    
    // Find course
    const course = registeredCourses.find(c => c.id === courseIdToPay);
    if (!course) return;
    
    // Calculate fee
    const feeInEther = parseFloat(course.fee) / 1e18;
    
    // Check if user has enough tokens
    if (walletBalance < feeInEther) {
        alert("Insufficient funds");
        return;
    }
    
    // Deduct balance for demo
    walletBalance -= feeInEther;
    
    // Mark course as paid in dummy data
    const courseIndex = registeredCourses.findIndex(c => c.id === courseIdToPay);
    if (courseIndex !== -1) {
        registeredCourses[courseIndex].hasPaid = true;
    }
    
    // Hide modal
    const paymentModal = bootstrap.Modal.getInstance(document.getElementById('paymentModal'));
    if (paymentModal) paymentModal.hide();
    
    // Update UI
    renderRegisteredCourses();
    
    // Update token balance
    const tokenBalanceElement = document.getElementById('token-balance');
    if (tokenBalanceElement) tokenBalanceElement.textContent = `${walletBalance.toFixed(2)} CRST`;
    
    // Show success message
    alert("Fee payment successful!");
    
    /* REAL BLOCKCHAIN IMPLEMENTATION:
    
    // Get contract instances
    const courseRegistrationContract = new web3.eth.Contract(registrationABI, registrationAddress);
    const tokenContract = new web3.eth.Contract(tokenABI, tokenAddress);
    
    // First approve token spending
    tokenContract.methods.approve(registrationAddress, course.fee)
        .send({ from: walletAddress })
        .then(receipt => {
            console.log("Token approval receipt:", receipt);
            
            // Then pay the fee
            return courseRegistrationContract.methods.payFee(courseIdToPay)
                .send({ from: walletAddress });
        })
        .then(receipt => {
            console.log("Payment transaction receipt:", receipt);
            
            // Hide modal
            const paymentModal = bootstrap.Modal.getInstance(document.getElementById('paymentModal'));
            if (paymentModal) paymentModal.hide();
            
            // Reload data
            loadBlockchainData();
            
            // Get updated token balance
            return tokenContract.methods.balanceOf(walletAddress).call();
        })
        .then(balance => {
            // Update token balance
            walletBalance = web3.utils.fromWei(balance, 'ether');
            const tokenBalanceElement = document.getElementById('token-balance');
            if (tokenBalanceElement) tokenBalanceElement.textContent = `${walletBalance} CRST`;
            
            // Show success message
            alert("Fee payment successful!");
        })
        .catch(error => {
            console.error("Error paying fee:", error);
            alert("Failed to pay fee. Please try again.");
        });
    
    */
}

// Show bulk payment modal
function showBulkPaymentModal() {
    // Get unpaid courses
    const unpaidCourses = registeredCourses.filter(course => !course.hasPaid);
    
    if (unpaidCourses.length === 0) {
        alert("You don't have any unpaid courses.");
        return;
    }
    
    // Calculate total fee
    let totalFee = 0;
    
    // Update payment courses list
    const paymentCoursesList = document.getElementById('payment-courses-list');
    if (paymentCoursesList) {
        paymentCoursesList.innerHTML = '';
        
        unpaidCourses.forEach(course => {
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
    const balanceElement = document.getElementById('bulk-payment-balance');
    if (balanceElement) {
        balanceElement.textContent = `${walletBalance.toFixed(2)} CRST`;
    }
    
    // Check if user has enough tokens
    const insufficientFunds = document.getElementById('bulk-insufficient-funds');
    const confirmButton = document.getElementById('confirm-bulk-payment');
    
    if (walletBalance < totalFee) {
        insufficientFunds.style.display = 'block';
        confirmButton.disabled = true;
    } else {
        insufficientFunds.style.display = 'none';
        confirmButton.disabled = false;
    }
    
    // Show modal
    const bulkPaymentModal = new bootstrap.Modal(document.getElementById('bulkPaymentModal'));
    bulkPaymentModal.show();
}

// Show payment confirmation modal
function confirmBulkPayment() {
    // Get total amount
    const totalAmountElement = document.getElementById('payment-total-amount');
    const totalAmount = totalAmountElement ? totalAmountElement.textContent : '0 CRST';
    
    // Update confirmation amount
    const confirmationAmountElement = document.getElementById('confirmation-amount');
    if (confirmationAmountElement) {
        confirmationAmountElement.textContent = totalAmount;
    }
    
    // Hide bulk payment modal
    const bulkPaymentModal = bootstrap.Modal.getInstance(document.getElementById('bulkPaymentModal'));
    if (bulkPaymentModal) bulkPaymentModal.hide();
    
    // Show confirmation modal
    const confirmationModal = new bootstrap.Modal(document.getElementById('paymentConfirmationModal'));
    confirmationModal.show();
}

// Process bulk payment
function processBulkPayment() {
    console.log('Processing bulk payment');
    
    // Get unpaid courses and total fee
    const unpaidCourses = registeredCourses.filter(course => !course.hasPaid);
    let totalFee = 0;
    
    unpaidCourses.forEach(course => {
        const feeInEther = parseFloat(course.fee) / 1e18; // Convert wei to ether
        totalFee += feeInEther;
    });
    
    // Check if user has enough tokens
    if (walletBalance < totalFee) {
        alert("Insufficient funds for bulk payment");
        
        // Hide confirmation modal
        const confirmationModal = bootstrap.Modal.getInstance(document.getElementById('paymentConfirmationModal'));
        if (confirmationModal) confirmationModal.hide();
        
        return;
    }
    
    // Deduct balance for demo
    walletBalance -= totalFee;
    
    // Mark all unpaid courses as paid
    registeredCourses.forEach(course => {
        if (!course.hasPaid) {
            course.hasPaid = true;
        }
    });
    
    // Get total amount for success message
    const totalAmountElement = document.getElementById('payment-total-amount');
    const totalAmount = totalAmountElement ? totalAmountElement.textContent : '0 CRST';
    
    // Update success amount
    const successAmountElement = document.getElementById('success-amount');
    if (successAmountElement) {
        successAmountElement.textContent = totalAmount;
    }
    
    // Hide confirmation modal
    const confirmationModal = bootstrap.Modal.getInstance(document.getElementById('paymentConfirmationModal'));
    if (confirmationModal) confirmationModal.hide();
    
    // Show success modal
    const successModal = new bootstrap.Modal(document.getElementById('paymentSuccessModal'));
    successModal.show();
    
    // Update UI
    renderRegisteredCourses();
    
    // Update token balance
    const tokenBalanceElement = document.getElementById('token-balance');
    if (tokenBalanceElement) tokenBalanceElement.textContent = `${walletBalance.toFixed(2)} CRST`;
    
    /* REAL BLOCKCHAIN IMPLEMENTATION:
    
    // This would be more complex in a real implementation
    // You would need to loop through each course and make a payment transaction for each
    // Or have a bulk payment method in your smart contract
    
    // Get contract instances
    const courseRegistrationContract = new web3.eth.Contract(registrationABI, registrationAddress);
    const tokenContract = new web3.eth.Contract(tokenABI, tokenAddress);
    
    // Calculate total fee in wei
    const totalFeeWei = unpaidCourses.reduce((total, course) => {
        return total.add(web3.utils.toBN(course.fee));
    }, web3.utils.toBN(0));
    
    // First approve token spending
    tokenContract.methods.approve(registrationAddress, totalFeeWei.toString())
        .send({ from: walletAddress })
        .then(receipt => {
            console.log("Token approval receipt:", receipt);
            
            // Create array of payment promises
            const paymentPromises = unpaidCourses.map(course => {
                return courseRegistrationContract.methods.payFee(course.id)
                    .send({ from: walletAddress });
            });
            
            // Execute all payments
            return Promise.all(paymentPromises);
        })
        .then(receipts => {
            console.log("Payment transaction receipts:", receipts);
            
            // Hide confirmation modal
            const confirmationModal = bootstrap.Modal.getInstance(document.getElementById('paymentConfirmationModal'));
            if (confirmationModal) confirmationModal.hide();
            
            // Reload data
            loadBlockchainData();
            
            // Get updated token balance
            return tokenContract.methods.balanceOf(walletAddress).call();
        })
        .then(balance => {
            // Update token balance
            walletBalance = web3.utils.fromWei(balance, 'ether');
            
            // Update token balance UI
            const tokenBalanceElement = document.getElementById('token-balance');
            if (tokenBalanceElement) tokenBalanceElement.textContent = `${walletBalance} CRST`;
            
            // Show success modal
            const successModal = new bootstrap.Modal(document.getElementById('paymentSuccessModal'));
            successModal.show();
        })
        .catch(error => {
            console.error("Error processing bulk payment:", error);
            alert("Failed to process bulk payment. Please try again.");
        });
    
    */
}