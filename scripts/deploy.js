const { ethers } = require("hardhat");

async function main() {
  // Get the deployer's wallet account
  const [deployer] = await ethers.getSigners();
  console.log("==========================================================");
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());
  console.log("==========================================================");

  // 1. Deploy ALUAssetRegistry
  const ALUAssetRegistry = await ethers.getContractFactory("ALUAssetRegistry");
  const assetRegistry = await ALUAssetRegistry.deploy();
  await assetRegistry.deployed();

  console.log(`ALUAssetRegistry deployed to: ${assetRegistry.address}`);

  // 2. Automatically register the official ALU logo during deployment
  const assetName = "ALU Official Logo";
  const fileType = "png";
  
  // The exact hex hash generated from the alu-logo.png file
  const logoContentHash = "0xac588b92aaed6542a2c537fe0e4ad264095811768e017f74228535d8ad9ecc9b";

  console.log(`Registering asset: "${assetName}" with hash: ${logoContentHash}...`);
  
  const tx = await assetRegistry.registerAsset(assetName, fileType, logoContentHash);
  const receipt = await tx.wait();

  // Find the AssetRegistered event from the logs to extract the Token ID
  const event = receipt.events?.find(e => e.event === 'AssetRegistered');
  const tokenId = event?.args?.tokenId;

  console.log(`✔ Success! ALU Logo successfully registered on-chain.`);
  console.log(`Generated Token ID: ${tokenId.toString()}`);

  // 3. Deploy ALULogoToken
  console.log("Deploying ALULogoToken...");
  const ALULogoToken = await ethers.getContractFactory("ALULogoToken");
  
  // Pass the deployer's address to the constructor as the logoOwner
  const logoToken = await ALULogoToken.deploy(deployer.address);
  await logoToken.deployed(); // or .waitForDeployment() if using ethers v6 here as well

  console.log(`ALULogoToken deployed to: ${logoToken.address}`);
  console.log(`1,000,000 ALUT minted to owner: ${deployer.address}`);
  console.log("==========================================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
