# ALU Logo Verification dApp

## Project Description
The ALU Logo Verification dApp is a decentralized application designed to bridge the gap between blockchain-based smart contract logic and non-technical users. It allows students, faculty, and administrators to verify the authenticity of the ALU logo using the blockchain, register new assets, and manage ownership shares via the `ALUAssetRegistry` (ERC-721) and `ALULogoToken` (ERC-20) smart contracts.

The frontend communicates with these contracts using ethers.js, facilitating:

* **Contract Interaction:** Direct state-read and state-write operations via contract ABIs.
* **Wallet Integration:** Seamless connection to MetaMask or other Web3 wallets for secure transaction signing.
* **Trustless Verification:** In-browser SHA-256 hashing to ensure logo integrity without server-side processing.

## Registered ALU Logo Hash
The official ALU logo registered in Formative 1 has the following SHA-256 hash: `0xac588b92aaed6542a2c537fe0e4ad264095811768e017f74228535d8ad9ecc9b`

## Technical Stack

* **Node.js:** v20.x
* **Hardhat:** v2.22.15
* **Frontend Framework:** React (via Vite)
* **Web3 Library:** ethers.js (v6)

## Setup and Installation

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org/) (v20 or higher) installed.

### 2. Install Dependencies
Navigate to the root directory and the frontend directory to install necessary packages:

```bash
# Install hardhat dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
```

### 3. Environment Setup
Create a `.env` file in the root directory and add your development configurations:

```
PRIVATE_KEY=your_development_wallet_private_key
RPC_URL=http://localhost:8545
```

## Running the Application

### 1. Start the Local Blockchain
```bash
npx hardhat node
```

### 2. Deploy the Contracts
In a new terminal window:
```bash
npx hardhat run scripts/deploy.js --network localhost
```

### 3. Run the Development Server
```bash
cd frontend
npm run dev
```

## Usage Instructions

### Connecting a Wallet
1. Open the dApp in your browser at the local URL provided by Vite.
2. Click the "Connect Wallet" button in the header.
3. Approve the connection request in your MetaMask extension.

### Features

* **Logo Verification:** Upload an image file or paste a SHA-256 hash directly into the Public Verification Area. The dApp automatically computes the hash and queries the registry, displaying a clear green (authentic) or red (warning) result.
* **Asset Registration:** Once connected, use the Register New Logo form to upload an image and name your asset. This triggers a transaction that you must sign via your wallet.
* **Token Dashboard:** Connected users can view their ALUT balance and total supply. If the connected wallet is the Contract Owner, a form appears allowing the distribution of ALUT tokens to other addresses.

## Known Issues and Limitations

* **Network Synchronization:** The dApp is optimized for local Hardhat development; network switching to public testnets requires updating the RPC configuration in `constants.js`.
* **Token Decimals:** This implementation treats ALUT tokens as raw integers (no decimal places).
* **Browser Compatibility:** Requires a modern browser with `crypto.subtle` (Web Crypto API) support.
