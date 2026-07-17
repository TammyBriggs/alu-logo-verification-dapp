const { ethers } = require("hardhat");

async function main() {
  // Get the deployer's wallet account
  const [deployer] = await ethers.getSigners();
  console.log("==========================================================");
  console.log("Deploying contracts with the account:", deployer.address);
  // FIX: Access provider from the signer in v6
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());
  console.log("==========================================================");

  // 1. Deploy ALUAssetRegistry
  const ALUAssetRegistry = await ethers.getContractFactory("ALUAssetRegistry");
  const assetRegistry = await ALUAssetRegistry.deploy();
  // FIX: v6 uses waitForDeployment()
  await assetRegistry.waitForDeployment(); 

  const registryAddress = await assetRegistry.getAddress();
  console.log(`ALUAssetRegistry deployed to: ${registryAddress}`);

  // 2. Automatically register the official ALU logo
  const assetName = "ALU Official Logo";
  const fileType = "png";
  const logoContentHash = "0xac588b92aaed6542a2c537fe0e4ad264095811768e017f74228535d8ad9ecc9b";

  console.log(`Registering asset: "${assetName}" with hash: ${logoContentHash}...`);
  
  const tx = await assetRegistry.registerAsset(assetName, fileType, logoContentHash);
  const receipt = await tx.wait();

  // FIX: v6 uses receipt.logs instead of receipt.events
  // We need to interface the event using the contract's interface
  const event = receipt.logs.find(log => {
      try {
          const parsed = assetRegistry.interface.parseLog(log);
          return parsed.name === 'AssetRegistered';
      } catch (e) {
          return false;
      }
  });

  const parsedEvent = assetRegistry.interface.parseLog(event);
  const tokenId = parsedEvent.args.tokenId;

  console.log(`✔ Success! ALU Logo successfully registered on-chain.`);
  console.log(`Generated Token ID: ${tokenId.toString()}`);

  // 3. Deploy ALULogoToken
  console.log("Deploying ALULogoToken...");
  const ALULogoToken = await ethers.getContractFactory("ALULogoToken");
  
  const logoToken = await ALULogoToken.deploy(deployer.address);
  // FIX: v6 uses waitForDeployment()
  await logoToken.waitForDeployment(); 

  const tokenAddress = await logoToken.getAddress();
  console.log(`ALULogoToken deployed to: ${tokenAddress}`);
  console.log(`1,000,000 ALUT minted to owner: ${deployer.address}`);
  console.log("==========================================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
