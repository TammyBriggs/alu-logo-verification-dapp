const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ALU Blockchain Security Suite - Part 1", function () {
  let ALUAssetRegistry;
  let assetRegistry;
  let owner;
  let addr1;
  
  // Sample test parameters
  const assetName = "ALU Official Logo";
  const fileType = "png";
  
  // Updated for Ethers.js v6 compatibility
  const sampleHash = ethers.solidityPackedKeccak256(["string"], ["alu-logo-fingerprint-data-1"]);
  const alternateHash = ethers.solidityPackedKeccak256(["string"], ["alu-logo-fingerprint-data-2"]);

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();
    ALUAssetRegistry = await ethers.getContractFactory("ALUAssetRegistry");
    assetRegistry = await ALUAssetRegistry.deploy();
    // In Ethers v6, .waitForDeployment() replaces .deployed()
    await assetRegistry.waitForDeployment(); 
  });

  // Test 1: Successful Registration
  it("Should successfully register the ALU logo asset and return token ID 1", async function () {
    const tx = await assetRegistry.registerAsset(assetName, fileType, sampleHash);
    const receipt = await tx.wait();
    
    // In Ethers v6, event logs are parsed differently
    const event = receipt.logs.find(log => log.eventName === "AssetRegistered");
    expect(event.args[0]).to.equal(1); // tokenId
    expect(event.args[3]).to.equal(owner.address); // registeredBy
  });

  // Test 2: Preventing Duplicate Registrations
  it("Should reject duplicate attempts to register an identical file hash", async function () {
    await assetRegistry.registerAsset(assetName, fileType, sampleHash);
    
    await expect(
      assetRegistry.registerAsset("Fake ALU Logo", "png", sampleHash)
    ).to.be.revertedWith("Duplicate asset error: This logo hash has already been registered.");
  });

  // Test 3: Verification of a valid matching hash
  it("verifyLogoIntegrity() should return true and confirm authenticity when supplied the correct hash", async function () {
    await assetRegistry.registerAsset(assetName, fileType, sampleHash);
    
    const [isAuthentic, message] = await assetRegistry.verifyLogoIntegrity(1, sampleHash);
    expect(isAuthentic).to.be.true;
    expect(message).to.equal("Logo is authentic.");
  });

  // Test 4: Rejection of an invalid non-matching hash
  it("verifyLogoIntegrity() should return false and issue a warning when supplied an incorrect modified hash", async function () {
    await assetRegistry.registerAsset(assetName, fileType, sampleHash);
    
    const [isAuthentic, message] = await assetRegistry.verifyLogoIntegrity(1, alternateHash);
    expect(isAuthentic).to.be.false;
    expect(message).to.equal("Warning: logo does not match.");
  });

  // Test 5: Accurate Metadata Retrieval
  it("getAsset() should correctly retrieve the exact asset name, type, and registry mapping fields", async function () {
    await assetRegistry.registerAsset(assetName, fileType, sampleHash);
    
    const metadata = await assetRegistry.getAsset(1);
    expect(metadata.assetName).to.equal(assetName);
    expect(metadata.fileType).to.equal(fileType);
    expect(metadata.contentHash).to.equal(sampleHash);
    expect(metadata.registeredBy).to.equal(owner.address);
  });
});

describe("ALU Blockchain Security Suite - Part 2: Tokenisation", function () {
  let ALULogoToken;
  let logoToken;
  let owner;
  let addr1;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();
    ALULogoToken = await ethers.getContractFactory("ALULogoToken");
    logoToken = await ALULogoToken.deploy(owner.address);
    await logoToken.waitForDeployment();
  });

  // Test 6: Initial Supply Minting
  it("Should mint the full supply of 1,000,000 ALUT tokens to the logo owner on deployment", async function () {
    const ownerBalance = await logoToken.balanceOf(owner.address);
    const totalSupply = await logoToken.totalSupply();
    
    expect(totalSupply).to.equal(1000000n); // Ethers v6 uses BigInt (the 'n' suffix)
    expect(ownerBalance).to.equal(1000000n);
  });

  // Test 7: Distributing Shares
  it("distributeShares() should correctly transfer the specified number of tokens to a recipient", async function () {
    const transferAmount = 250000n;
    
    await logoToken.distributeShares(addr1.address, transferAmount);
    
    const recipientBalance = await logoToken.balanceOf(addr1.address);
    const ownerBalance = await logoToken.balanceOf(owner.address);
    
    expect(recipientBalance).to.equal(transferAmount);
    expect(ownerBalance).to.equal(750000n);
  });

  // Test 8: Percentage Calculation
  it("ownershipPercentage() should return the correct whole number percentage for a wallet", async function () {
    await logoToken.distributeShares(addr1.address, 150000n);
    
    const ownerPercentage = await logoToken.ownershipPercentage(owner.address);
    const recipientPercentage = await logoToken.ownershipPercentage(addr1.address);
    
    expect(recipientPercentage).to.equal(15n);
    expect(ownerPercentage).to.equal(85n);
  });
});
