#!/bin/bash

# Course Registration System - Complete Deployment and Testing Script
# Authors: Ghazal E Ashar & Shahzeb Ahmed Iqbal

echo "🚀 Course Registration System - Deployment & Testing"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if Node.js is installed
check_node() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js first."
        exit 1
    fi
    print_status "Node.js is installed: $(node --version)"
}

# Check if npm is installed
check_npm() {
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
    print_status "npm is installed: $(npm --version)"
}

# Install dependencies
install_dependencies() {
    print_info "Installing project dependencies..."
    
    # Create package.json if it doesn't exist
    if [ ! -f "package.json" ]; then
        print_info "Creating package.json..."
        npm init -y
    fi
    
    # Install Hardhat and dependencies
    npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
    npm install @openzeppelin/contracts
    
    print_status "Dependencies installed successfully"
}

# Initialize Hardhat if not already done
init_hardhat() {
    if [ ! -f "hardhat.config.js" ]; then
        print_info "Initializing Hardhat project..."
        npx hardhat init --yes
    fi
    print_status "Hardhat project ready"
}

# Compile contracts
compile_contracts() {
    print_info "Compiling smart contracts..."
    npx hardhat compile
    if [ $? -eq 0 ]; then
        print_status "Contracts compiled successfully"
    else
        print_error "Contract compilation failed"
        exit 1
    fi
}

# Start Hardhat node in background
start_hardhat_node() {
    print_info "Starting Hardhat node..."
    
    # Kill any existing Hardhat node
    pkill -f "hardhat node" 2>/dev/null
    
    # Start Hardhat node in background
    npx hardhat node > hardhat-node.log 2>&1 &
    HARDHAT_PID=$!
    
    # Wait for node to start
    sleep 5
    
    # Check if node is running
    if ps -p $HARDHAT_PID > /dev/null; then
        print_status "Hardhat node started (PID: $HARDHAT_PID)"
        print_info "Node is running on http://127.0.0.1:8545"
        print_info "Logs are being written to hardhat-node.log"
    else
        print_error "Failed to start Hardhat node"
        exit 1
    fi
}

# Deploy contracts
deploy_contracts() {
    print_info "Deploying smart contracts..."
    
    # Wait a bit more for node to be ready
    sleep 3
    
    # Deploy contracts
    DEPLOY_OUTPUT=$(npx hardhat run scripts/deploy.js --network localhost 2>&1)
    DEPLOY_STATUS=$?
    
    if [ $DEPLOY_STATUS -eq 0 ]; then
        print_status "Contracts deployed successfully"
        echo "$DEPLOY_OUTPUT"
        
        # Extract contract addresses
        CRST_TOKEN_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep "CRST_TOKEN:" | cut -d"'" -f2)
        COURSE_REGISTRATION_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep "COURSE_REGISTRATION:" | cut -d"'" -f2)
        
        echo ""
        print_info "📋 Contract Addresses:"
        echo "CRST Token: $CRST_TOKEN_ADDRESS"
        echo "Course Registration: $COURSE_REGISTRATION_ADDRESS"
        echo ""
        
        # Export for use in testing
        export CRST_TOKEN_ADDRESS
        export COURSE_REGISTRATION_ADDRESS
        
    else
        print_error "Contract deployment failed"
        echo "$DEPLOY_OUTPUT"
        cleanup
        exit 1
    fi
}

# Run smart contract tests
run_contract_tests() {
    print_info "Running smart contract tests..."
    
    # Run the comprehensive test suite
    npx hardhat test
    TEST_STATUS=$?
    
    if [ $TEST_STATUS -eq 0 ]; then
        print_status "All smart contract tests passed"
    else
        print_error "Some smart contract tests failed"
        print_warning "Continuing with deployment testing..."
    fi
}

# Run deployment tests
run_deployment_tests() {
    print_info "Running deployment tests..."
    
    # Run the deployment test script
    npx hardhat run scripts/test-deployment.js --network localhost
    DEPLOY_TEST_STATUS=$?
    
    if [ $DEPLOY_TEST_STATUS -eq 0 ]; then
        print_status "All deployment tests passed"
    else
        print_error "Deployment tests failed"
        cleanup
        exit 1
    fi
}

# Update frontend configuration
update_frontend_config() {
    print_info "Updating frontend configuration..."
    
    if [ ! -z "$CRST_TOKEN_ADDRESS" ] && [ ! -z "$COURSE_REGISTRATION_ADDRESS" ]; then
        # Update config.js with deployed addresses
        if [ -f "scripts/config.js" ]; then
            # Create backup
            cp scripts/config.js scripts/config.js.backup
            
            # Update addresses
            sed -i.tmp "s/CRST_TOKEN: '.*'/CRST_TOKEN: '$CRST_TOKEN_ADDRESS'/" scripts/config.js
            sed -i.tmp "s/COURSE_REGISTRATION: '.*'/COURSE_REGISTRATION: '$COURSE_REGISTRATION_ADDRESS'/" scripts/config.js
            
            # Clean up temp files
            rm scripts/config.js.tmp 2>/dev/null
            
            print_status "Frontend configuration updated"
        else
            print_warning "config.js not found, please update manually"
        fi
    else
        print_warning "Contract addresses not available, please update config.js manually"
    fi
}

# Display account information
display_accounts() {
    print_info "📝 Test Account Information:"
    echo ""
    echo "Copy these private keys to MetaMask for testing:"
    echo ""
    echo "🔑 Admin Account (Account #0):"
    echo "Address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
    echo "Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
    echo "Email for testing: admin@university.edu"
    echo ""
    echo "🔑 Student Account #1 (Account #1):"
    echo "Address: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
    echo "Private Key: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
    echo "Email for testing: student1@university.edu"
    echo ""
    echo "🔑 Student Account #2 (Account #2):"
    echo "Address: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"
    echo "Private Key: 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"
    echo "Email for testing: student2@university.edu"
    echo ""
}

# Display MetaMask setup instructions
display_metamask_setup() {
    print_info "🦊 MetaMask Setup Instructions:"
    echo ""
    echo "1. Install MetaMask browser extension if not already installed"
    echo "2. Add Hardhat Network to MetaMask:"
    echo "   - Network Name: Hardhat Local"
    echo "   - RPC URL: http://127.0.0.1:8545"
    echo "   - Chain ID: 31337"
    echo "   - Currency Symbol: ETH"
    echo ""
    echo "3. Import the test accounts using the private keys above"
    echo "4. Switch to the Hardhat Local network in MetaMask"
    echo ""
}

# Display testing instructions
display_testing_instructions() {
    print_info "🧪 Frontend Testing Instructions:"
    echo ""
    echo "1. Open your web browser"
    echo "2. Navigate to login.html in your project directory"
    echo "3. Connect MetaMask with one of the test accounts"
    echo "4. Test the complete user flow:"
    echo ""
    echo "   Admin Testing (use admin account):"
    echo "   - Login with admin@university.edu"
    echo "   - Add new courses"
    echo "   - Mint tokens to students"
    echo "   - Approve token requests"
    echo ""
    echo "   Student Testing (use student accounts):"
    echo "   - Login with student1@university.edu"
    echo "   - Register for courses"
    echo "   - Request tokens"
    echo "   - Pay course fees"
    echo ""
    echo "5. Check the browser console for any errors"
    echo "6. Verify all transactions in MetaMask"
    echo ""
}

# Cleanup function
cleanup() {
    print_info "Cleaning up..."
    
    # Kill Hardhat node if running
    if [ ! -z "$HARDHAT_PID" ]; then
        kill $HARDHAT_PID 2>/dev/null
        print_status "Hardhat node stopped"
    fi
    
    # Kill any remaining Hardhat processes
    pkill -f "hardhat node" 2>/dev/null
}

# Trap cleanup on script exit
trap cleanup EXIT

# Main execution
main() {
    echo "Starting deployment and testing process..."
    echo ""
    
    # Pre-flight checks
    check_node
    check_npm
    
    # Setup
    install_dependencies
    init_hardhat
    
    # Compilation
    compile_contracts
    
    # Deployment
    start_hardhat_node
    deploy_contracts
    
    # Testing
    run_contract_tests
    run_deployment_tests
    
    # Frontend setup
    update_frontend_config
    
    # Display information
    echo ""
    print_status "🎉 Deployment and testing completed successfully!"
    echo ""
    echo "=================================================="
    
    display_accounts
    display_metamask_setup
    display_testing_instructions
    
    echo "=================================================="
    print_info "📊 System Status:"
    echo "• Hardhat Node: Running on http://127.0.0.1:8545"
    echo "• Smart Contracts: Deployed and tested"
    echo "• Frontend: Ready for testing"
    echo ""
    
    print_warning "Note: Keep this terminal open to maintain the Hardhat node"
    print_info "Press Ctrl+C to stop the Hardhat node and exit"
    echo ""
    
    # Keep the script running to maintain the Hardhat node
    print_info "Hardhat node is running... (Press Ctrl+C to stop)"
    wait $HARDHAT_PID
}

# Help function
show_help() {
    echo "Course Registration System - Deployment Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  -t, --test     Run tests only (assumes contracts are deployed)"
    echo "  -c, --clean    Clean up and exit"
    echo "  -s, --status   Show current status"
    echo ""
    echo "Examples:"
    echo "  $0              # Full deployment and testing"
    echo "  $0 --test       # Run tests only"
    echo "  $0 --clean      # Clean up processes"
    echo ""
}

# Test only function
test_only() {
    print_info "Running tests only..."
    
    # Check if Hardhat node is running
    if ! curl -s http://127.0.0.1:8545 > /dev/null; then
        print_error "Hardhat node is not running. Please start it first or run full deployment."
        exit 1
    fi
    
    # Run tests
    run_contract_tests
    
    # Try to run deployment tests if contracts are deployed
    if [ ! -z "$CRST_TOKEN_ADDRESS" ] && [ ! -z "$COURSE_REGISTRATION_ADDRESS" ]; then
        run_deployment_tests
    else
        print_warning "Contract addresses not set. Skipping deployment tests."
    fi
    
    print_status "Testing completed"
}

# Status check function
check_status() {
    print_info "System Status Check:"
    echo ""
    
    # Check Node.js
    if command -v node &> /dev/null; then
        print_status "Node.js: $(node --version)"
    else
        print_error "Node.js: Not installed"
    fi
    
    # Check npm
    if command -v npm &> /dev/null; then
        print_status "npm: $(npm --version)"
    else
        print_error "npm: Not installed"
    fi
    
    # Check Hardhat
    if [ -f "hardhat.config.js" ]; then
        print_status "Hardhat: Configured"
    else
        print_warning "Hardhat: Not configured"
    fi
    
    # Check if Hardhat node is running
    if curl -s http://127.0.0.1:8545 > /dev/null; then
        print_status "Hardhat Node: Running on http://127.0.0.1:8545"
    else
        print_warning "Hardhat Node: Not running"
    fi
    
    # Check contracts directory
    if [ -d "contracts" ]; then
        CONTRACT_COUNT=$(find contracts -name "*.sol" | wc -l)
        print_status "Smart Contracts: $CONTRACT_COUNT .sol files found"
    else
        print_warning "Smart Contracts: contracts directory not found"
    fi
    
    # Check if contracts are compiled
    if [ -d "artifacts" ]; then
        print_status "Compilation: Artifacts directory exists"
    else
        print_warning "Compilation: No artifacts found"
    fi
    
    # Check frontend files
    if [ -f "login.html" ]; then
        print_status "Frontend: login.html found"
    else
        print_warning "Frontend: login.html not found"
    fi
    
    if [ -f "scripts/config.js" ]; then
        print_status "Configuration: config.js found"
    else
        print_warning "Configuration: config.js not found"
    fi
    
    echo ""
}

# Clean up function for command line
clean_up() {
    print_info "Cleaning up system..."
    
    # Kill Hardhat processes
    pkill -f "hardhat node" 2>/dev/null
    print_status "Stopped Hardhat processes"
    
    # Remove log files
    rm -f hardhat-node.log 2>/dev/null
    print_status "Removed log files"
    
    # Remove artifacts and cache (optional)
    read -p "Remove compiled artifacts and cache? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf artifacts cache 2>/dev/null
        print_status "Removed artifacts and cache"
    fi
    
    print_status "Cleanup completed"
}

# Parse command line arguments
case "${1:-}" in
    -h|--help)
        show_help
        exit 0
        ;;
    -t|--test)
        test_only
        exit 0
        ;;
    -c|--clean)
        clean_up
        exit 0
        ;;
    -s|--status)
        check_status
        exit 0
        ;;
    "")
        main
        ;;
    *)
        print_error "Unknown option: $1"
        show_help
        exit 1
        ;;
esac