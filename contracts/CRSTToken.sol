// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
  Follows wrapped ETH concept: 1 ETH = 1 CRST ratio
  @author Ghazal E Ashar & Shahzeb Ahmed Iqbal
 */
contract CRSTToken is ERC20, Ownable {
    
    // Initial supply: 1 million tokens minted to admin
    uint256 public constant INITIAL_SUPPLY = 1000000 * 10**18;
    
    // Events
    event TokensMinted(address indexed to, uint256 amount);
    
    constructor(address initialOwner) ERC20("Course Registration Token", "CRST") Ownable(initialOwner) {
        // Mint initial supply to the owner (admin)
        _mint(initialOwner, INITIAL_SUPPLY);
        emit TokensMinted(initialOwner, INITIAL_SUPPLY);
    }
    
    /**
     Mint tokens to specified address (only owner)
    */
    function mint(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than 0");
        
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }
}