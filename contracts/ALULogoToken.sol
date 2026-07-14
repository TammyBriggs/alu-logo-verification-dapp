// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ALULogoToken
 * @dev ERC-20 contract to fractionalise ownership of the ALU logo NFT.
 */
contract ALULogoToken is ERC20, Ownable {
    
    // Fixed total supply of exactly 1,000,000 tokens
    uint256 private constant _MAX_SUPPLY = 1000000;

    /**
     * @dev Constructor mints the entire supply to the initial logo owner.
     * @param logoOwner The wallet address that will receive the 1,000,000 tokens.
     */
    constructor(address logoOwner) ERC20("ALU Logo Token", "ALUT") Ownable(logoOwner) {
        require(logoOwner != address(0), "Owner cannot be the zero address");
        // Mint the full 1,000,000 supply to the designated owner
        _mint(logoOwner, _MAX_SUPPLY);
    }

    /**
     * @notice Overrides standard 18 decimals to 0 for whole-number token math.
     * This makes 1 token exactly equal to 1 token unit, not 1 * 10^18.
     */
    function decimals() public view virtual override returns (uint8) {
        return 0;
    }

    /**
     * @notice Distributes ownership shares to a recipient.
     * @dev Only the contract owner can execute this transfer.
     * @param recipient The wallet address receiving the shares.
     * @param amount The number of tokens to transfer.
     */
    function distributeShares(address recipient, uint256 amount) external onlyOwner {
        require(amount > 0, "Transfer amount must be greater than zero");
        require(recipient != address(0), "Cannot transfer to the zero address");
        
        // Transfer tokens from the owner's balance to the recipient
        _transfer(msg.sender, recipient, amount);
    }

    /**
     * @notice Calculates the ownership percentage of a given wallet.
     * @param wallet The address to query.
     * @return The ownership percentage as a whole number (0 to 100).
     */
    function ownershipPercentage(address wallet) external view returns (uint256) {
        uint256 balance = balanceOf(wallet);
        if (balance == 0) return 0;
        
        // Calculate percentage: (Balance * 100) / Total Supply
        return (balance * 100) / totalSupply();
    }
}
