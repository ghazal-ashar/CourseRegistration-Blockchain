// Login and Authentication System

// Dummy user data - in a real application, this would be checked against a database
const users = [
    {
        email: "admin@example.com",
        password: "admin123",
        role: "admin"
    },
    {
        email: "student@example.com",
        password: "student123",
        role: "student"
    },
    {
        email: "test@example.com",
        password: "test123",
        role: "student"
    }
];

// Initialize the login form
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the login page
    const loginForm = document.getElementById('login-form');
    
    if (loginForm) {
        // Add event listener for form submission
        loginForm.addEventListener('submit', handleLogin);
        
        // Add event listener for password toggle
        const togglePassword = document.getElementById('toggle-password');
        if (togglePassword) {
            togglePassword.addEventListener('click', function() {
                const passwordInput = document.getElementById('password');
                const icon = this.querySelector('i');
                
                if (passwordInput.type === 'password') {
                    passwordInput.type = 'text';
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                } else {
                    passwordInput.type = 'password';
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                }
            });
        }
        
        // Check if user is already logged in
        checkExistingSession();
    } else {
        // We're on a dashboard page - verify session
        verifySession();
    }
});

// // Check if user is already logged in
// function checkExistingSession() {
//     // Check localStorage for existing session
//     const storedUser = JSON.parse(localStorage.getItem('user'));
    
//     if (storedUser) {
//         // Redirect based on role
//         redirectToRole(storedUser.role);
//     }
// }

// Handle login form submission
function handleLogin(event) {
    event.preventDefault();
    
    // Get form values
    const email = document.getElementById('email').value.trim().toLowerCase();
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('remember-me').checked;
    
    // Find user with matching email and password
    const user = users.find(u => u.email.toLowerCase() === email && u.password === password);
    
    if (user) {
        // Successful login
        console.log(`Login successful for ${user.role}: ${email}`);
        
        // Store user info
        const userSession = {
            email: user.email,
            role: user.role
        };
        
        // Store in localStorage (we'll always use localStorage for simplicity)
        localStorage.setItem('user', JSON.stringify(userSession));
        
        // Redirect based on role
        redirectToRole(user.role);
    } else {
        // Failed login
        console.log('Login failed');
        
        // Show error message
        showLoginError("Invalid email or password. Please try again.");
    }
}

// Show login error message
function showLoginError(message) {
    const loginError = document.getElementById('login-error');
    const errorMessage = document.getElementById('error-message');
    
    if (loginError && errorMessage) {
        loginError.classList.remove('d-none');
        errorMessage.textContent = message;
        
        // Add shake animation for feedback
        loginError.classList.add('shake');
        setTimeout(() => {
            loginError.classList.remove('shake');
        }, 500);
    }
}

// Redirect based on user role
function redirectToRole(role) {
    if (role === 'admin') {
        window.location.href = 'adminportal.html';
    } else {
        window.location.href = 'studentportal.html';
    }
}

// Verify session on protected pages
function verifySession() {
    // Get stored user
    const storedUser = JSON.parse(localStorage.getItem('user'));
    
    if (!storedUser) {
        // No session found, redirect to login
        window.location.href = 'login.html';
        return;
    }
    
    // // Check if user is on the correct page for their role
    // const currentPage = window.loca
    // tion.pathname.split('/').pop();
    
    // if (storedUser.role === 'admin' && currentPage !== 'adminportal.html') {
    //     // Admin trying to access student page
    //     window.location.href = 'adminportal.html';
    // } else if (storedUser.role === 'student' && currentPage !== 'studentportal.html') {
    //     // Student trying to access admin page
    //     window.location.href = 'studentportal.html';
    // }
    
    // Add logout functionality
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Update display name if needed
    const userEmail = document.getElementById('user-email');
    if (userEmail) {
        userEmail.textContent = storedUser.email;
    }
}

// Logout function
function logout() {
    // Remove session
    localStorage.removeItem('user');
    
    // Redirect to login page
    window.location.href = 'login.html';
}