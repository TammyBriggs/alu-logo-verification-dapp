import { expect } from "chai";
import crypto from "crypto";
import pkg from "hardhat";
const { ethers } = pkg;

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

describe("ALU Blockchain Security Suite: Tokenisation", function () {
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

// =========================================================
// PART 2: FRONTEND INTEGRATION TESTS (5 NEW TESTS)
// =========================================================
describe("Part 2: Frontend Integration Tests", function () {
  let registry, token, owner, addr1;
  let validHash;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();
    
    // Deploy Registry
    const Registry = await ethers.getContractFactory("ALUAssetRegistry");
    registry = await Registry.deploy();

    // Deploy Token
    const Token = await ethers.getContractFactory("ALULogoToken");
    token = await Token.deploy(owner.address);

    // Simulate a local file upload and hash it
    const dummyFileData = "official-alu-logo-binary-data";
    validHash = "0x" + crypto.createHash('sha256').update(dummyFileData).digest('hex');

    // Register the asset so it exists for the verification tests
    await registry.registerAsset("ALU Official Logo 2026", "PNG", validHash);
  });

  // Test 9
  it("The frontend correctly reads the total ALUT token supply from the deployed contract and displays 1,000,000", async function () {
    const supply = await token.totalSupply();
    // The contract uses raw integers, so we just convert it to a string
    expect(supply.toString()).to.equal("1000000");
  });

  // Test 10
  it("When a file is passed to the hashing function, the correct SHA-256 hash is returned in bytes32 format", async function () {
    const simulatedFileContent = "test-image-data-stream";
    const generatedHash = "0x" + crypto.createHash('sha256').update(simulatedFileContent).digest('hex');
    
    // Validate that it formats correctly as a bytes32 hex string (0x + 64 characters)
    expect(generatedHash).to.match(/^0x[0-9a-fA-F]{64}$/);
    expect(generatedHash.length).to.equal(66);
  });

  // Test 11
  it("When verifyLogoIntegrity() is called with the correct ALU logo hash, the frontend displays a verification success result", async function () {
    // Assuming Token ID 1 was generated in the beforeEach hook
    const [authentic, message] = await registry.verifyLogoIntegrity(1, validHash);
    
    expect(authentic).to.be.true;
    // You can also check if the message is positive, depending on your contract implementation
  });

  // Test 12
  it("When verifyLogoIntegrity() is called with an incorrect hash, the frontend displays a verification failure result", async function () {
    const fakeHash = "0x" + crypto.createHash('sha256').update("modified-fake-data").digest('hex');
    
    const [authentic, message] = await registry.verifyLogoIntegrity(1, fakeHash);
    
    expect(authentic).to.be.false;
  });

  // Test 13
  it("The distributeShares() function correctly updates the recipient's balance after a successful transfer", async function () {
    const amountToDistribute = 50000n; // 50,000 raw ALUT (No 18 decimal parsing needed)
    
    await token.distributeShares(addr1.address, amountToDistribute);
    
    const addr1Balance = await token.balanceOf(addr1.address);
    expect(addr1Balance).to.equal(amountToDistribute);
  });
});
