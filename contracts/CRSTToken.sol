// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 *  Ghazal E Ashar & Shahzeb Ahmed Iqbal
 */

contract CRSTToken is ERC20, Ownable {
    
    // Maximum supply: 25,000 tokens
    uint256 public constant MAX_SUPPLY = 25000 * 10**18;
    
    // Auto-burn threshold: if contract balance > 5000 CRST, burn excess
    uint256 public constant AUTO_BURN_THRESHOLD = 5000 * 10**18;
    
    // Exchange rate: 1 ETH = 1000 CRST
    uint256 public constant ETH_TO_CRST_RATE = 1000;
    
    // Events
    event TokensMinted(address indexed to, uint256 amount);
    event TokensBurned(uint256 amount, string reason);
    event AutoBurnTriggered(uint256 burnedAmount, uint256 newBalance);
    
    constructor(address initialOwner) ERC20("Course Registration Token", "CRST") Ownable(initialOwner) {
        // Start with minimal supply - mint 5000 tokens to contract owner initially
        uint256 initialMint = 5000 * 10**18;
        _mint(initialOwner, initialMint);
        emit TokensMinted(initialOwner, initialMint);
    }
    
    /**
     * Mint tokens to specified address (only owner)
     * Includes auto-burn check after minting
     */
    function mint(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than 0");
        require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds maximum supply");
        
        _mint(to, amount);
        emit TokensMinted(to, amount);
        
        // Trigger auto-burn check if minting to contract
        if (to == owner()) {
            _checkAndAutoBurn();
        }
    }
    
    /**
     * Burn tokens from contract balance (only owner)
     */
    function burn(uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be greater than 0");
        require(balanceOf(owner()) >= amount, "Insufficient balance to burn");
        
        _burn(owner(), amount);
        emit TokensBurned(amount, "Manual burn by owner");
    }
    
    /**
     * Auto-burn excess tokens when contract balance exceeds threshold
     * This prevents token accumulation and maintains healthy circulation
     * Automatically triggered on mints, transfers to contract, and manual calls
     */
    function _checkAndAutoBurn() internal {
        uint256 contractBalance = balanceOf(owner());
        
        if (contractBalance > AUTO_BURN_THRESHOLD) {
            uint256 excessAmount = contractBalance - AUTO_BURN_THRESHOLD;
            _burn(owner(), excessAmount);
            
            emit TokensBurned(excessAmount, "Auto-burn: excess threshold exceeded");
            emit AutoBurnTriggered(excessAmount, balanceOf(owner()));
        }
    }
    
    /**
     * Burn equivalent CRST when ETH is withdrawn
     * Call this from CourseRegistration contract when withdrawing ETH
     * Maintains 1:1000 ETH:CRST ratio by burning tokens when ETH leaves system
     */
    function burnForEthWithdrawal(uint256 ethAmount) external onlyOwner {
        uint256 tokensToBurn = ethAmount * ETH_TO_CRST_RATE;
        uint256 contractBalance = balanceOf(owner());
        
        if (contractBalance >= tokensToBurn) {
            _burn(owner(), tokensToBurn);
            emit TokensBurned(tokensToBurn, "Auto-burn: ETH withdrawal");
        } else if (contractBalance > 0) {
            // Burn whatever is available if not enough for full amount
            _burn(owner(), contractBalance);
            emit TokensBurned(contractBalance, "Auto-burn: ETH withdrawal (partial)");
        }
    }
    
    /**
     * Get current supply utilization percentage
     */
    function getSupplyUtilization() external view returns (uint256) {
        return (totalSupply() * 100) / MAX_SUPPLY;
    }
    
    /**
     * Check if auto-burn would trigger
     */
     
    function willAutoBurnTrigger() external view returns (bool, uint256) {
        uint256 contractBalance = balanceOf(owner());
        if (contractBalance > AUTO_BURN_THRESHOLD) {
            return (true, contractBalance - AUTO_BURN_THRESHOLD);
        }
        return (false, 0);
    }
    
    /**
     * Get remaining mintable supply
     */
    function getRemainingSupply() external view returns (uint256) {
        return MAX_SUPPLY - totalSupply();
    }
    
    /**
     * Override transfer to trigger auto-burn check when tokens are sent to contract
     */
    function transfer(address to, uint256 amount) public override returns (bool) {
        bool success = super.transfer(to, amount);
        
        // If tokens are being sent to the contract, check for auto-burn
        if (success && to == owner()) {
            _checkAndAutoBurn();
        }
        
        return success;
    }
    
    /**
     * Override transferFrom to trigger auto-burn check
     */
    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        bool success = super.transferFrom(from, to, amount);
        
        // If tokens are being sent to the contract, check for auto-burn
        if (success && to == owner()) {
            _checkAndAutoBurn();
        }
        
        return success;
    }
}