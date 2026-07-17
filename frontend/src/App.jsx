import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { TOKEN_CONTRACT_ADDRESS, TOKEN_ABI, REGISTRY_CONTRACT_ADDRESS, REGISTRY_ABI } from "./constants";

const EXAMPLE_WALLETS = [
  "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
  "0x90F79bf6EB2c4f870365E785982E1f101E93b906"
];

function App() {
  const [account, setAccount] = useState(null);
  const [balance, setBalance] = useState("0");
  const [error, setError] = useState("");
  const [networkError, setNetworkError] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRightNetwork, setIsRightNetwork] = useState(true);

  const [filePreview, setFilePreview] = useState(null);
  const [fileHash, setFileHash] = useState("");
  const [assetName, setAssetName] = useState("");
  const [fileType, setFileType] = useState("");
  const [txStatus, setTxStatus] = useState({ type: "", message: "" });
  const [isRegistering, setIsRegistering] = useState(false);

  const [verifyInputHash, setVerifyInputHash] = useState("");
  const [verifyResult, setVerifyResult] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const [totalSupply, setTotalSupply] = useState("0");
  const [contractOwner, setContractOwner] = useState("");
  const [userPercentage, setUserPercentage] = useState("0");
  const [examplePercentages, setExamplePercentages] = useState([]);
  const [distRecipient, setDistRecipient] = useState("");
  const [distAmount, setDistAmount] = useState("");
  const [isDistributing, setIsDistributing] = useState(false);
  const [distStatus, setDistStatus] = useState({ type: "", message: "" });

  const formatAddress = (addr) => {
    if (!addr) return "";
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const fetchDashboardData = useCallback(async (userAddress) => {
    if (!window.ethereum) return;
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const tokenContract = new ethers.Contract(TOKEN_CONTRACT_ADDRESS, TOKEN_ABI, provider);
      
      const rawBalance = await tokenContract.balanceOf(userAddress);
      setBalance(rawBalance.toString());
      
      const rawSupply = await tokenContract.totalSupply();
      setTotalSupply(rawSupply.toString());

      const ownerAddr = await tokenContract.owner();
      setContractOwner(ownerAddr.toLowerCase());

      const userPct = await tokenContract.ownershipPercentage(userAddress);
      setUserPercentage(userPct.toString());

      const examplesData = await Promise.all(
        EXAMPLE_WALLETS.map(async (wallet) => {
          const pct = await tokenContract.ownershipPercentage(wallet);
          return { address: wallet, percentage: pct.toString() };
        })
      );
      setExamplePercentages(examplesData);

    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError("Failed to sync dashboard data.");
    }
  }, []);

  const switchNetwork = async () => {
    if (!window.ethereum) {
      setError("❌ No Web3 wallet detected.");
      return;
    }
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x7a69' }], // 31337 in hex (Localhost)
      });
      setNetworkError("");
      setIsRightNetwork(true);
    } catch (switchError) {
      setNetworkError("Please manually add and switch to the Localhost 8545 network in MetaMask.");
    }
  };

  const connectWallet = async () => {
    setError("");
    setNetworkError("");
    setIsConnecting(true);
    
    if (!window.ethereum) {
      setError("❌ No Web3 wallet detected. Please install the MetaMask extension to use this application.");
      setIsConnecting(false);
      return;
    }
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const { chainId } = await provider.getNetwork();
      
      if (chainId !== 31337n) {
         await switchNetwork();
      } else {
         setIsRightNetwork(true);
      }

      const accounts = await provider.send("eth_requestAccounts", []);
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        await fetchDashboardData(accounts[0]);
      }
    } catch (err) {
      setError("Connection request rejected or failed.");
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    alert("Wallet successfully disconnected from the application state.");
    window.location.reload();
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setFilePreview(URL.createObjectURL(file));
    setFileType(file.name.split('.').pop().toUpperCase());
    try {
      const arrayBuffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      setFileHash(`0x${hashHex}`);
    } catch (err) {
      setTxStatus({ type: "error", message: "Hashing failed." });
    }
  };

  const handleVerificationFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const h = await crypto.subtle.digest("SHA-256", ev.target.result);
      const hx = Array.from(new Uint8Array(h)).map(b=>b.toString(16).padStart(2,'0')).join('');
      const hash = "0x" + hx;
      setVerifyInputHash(hash);
      executeVerification(hash);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setIsRegistering(true);
    setTxStatus({ type: "", message: "" });
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const registryContract = new ethers.Contract(REGISTRY_CONTRACT_ADDRESS, REGISTRY_ABI, signer);
      const tx = await registryContract.registerAsset(assetName, fileType, fileHash);
      await tx.wait();
      setTxStatus({ type: "success", message: "Success! Asset successfully registered to the blockchain." });
      setAssetName("");
      setFilePreview(null);
      setFileHash("");
    } catch (err) {
      let msg = "Registration failed. ";
      if (err.message.includes("user rejected")) {
        msg += "You rejected the transaction in MetaMask.";
      } else {
        msg += "This hash may already be registered on the blockchain, or the input data is invalid.";
      }
      setTxStatus({ type: "error", message: msg });
    } finally {
      setIsRegistering(false);
    }
  };

  const executeVerification = async (hashToVerify) => {
    if (!hashToVerify) return;
    setIsVerifying(true);
    setVerifyResult(null);
    try {
      const publicProvider = new ethers.JsonRpcProvider("http://localhost:8545");
      const registryContract = new ethers.Contract(REGISTRY_CONTRACT_ADDRESS, REGISTRY_ABI, publicProvider);
      const [authentic] = await registryContract.verifyLogoIntegrity(1, hashToVerify);
      let metadata = null;
      if (authentic) {
        const asset = await registryContract.getAsset(1);
        metadata = { 
          name: asset.assetName, 
          type: asset.fileType, 
          registeredBy: asset.registeredBy, 
          date: new Date(Number(asset.registrationTimestamp) * 1000).toLocaleString() 
        };
      }
      setVerifyResult({ authentic, metadata });
    } catch (err) {
      setVerifyResult({ authentic: false, message: "Error communicating with the blockchain." });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDistribute = async (e) => {
    e.preventDefault();
    setDistStatus({ type: "", message: "" });

    if (!isOwner) {
      setDistStatus({ type: "error", message: "Unauthorized action: Only the official contract owner can distribute token shares." });
      return;
    }
    if (!ethers.isAddress(distRecipient)) {
      setDistStatus({ type: "error", message: "Invalid wallet address. Please ensure the recipient address is formatted correctly (0x...)." });
      return;
    }
    if (Number(distAmount) <= 0) {
      setDistStatus({ type: "error", message: "Distribution failed. Please put in an amount greater than 0." });
      return;
    }

    setIsDistributing(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const tokenContract = new ethers.Contract(TOKEN_CONTRACT_ADDRESS, TOKEN_ABI, signer);
      const tx = await tokenContract.distributeShares(distRecipient, BigInt(distAmount));
      await tx.wait();
      setDistStatus({ type: "success", message: "Distribution successful. The recipient's balance has been updated." });
      fetchDashboardData(account);
      setDistRecipient("");
      setDistAmount("");
    } catch (err) {
      setDistStatus({ type: "error", message: "Distribution failed. Ensure you have enough token supply to execute this transfer." });
    } finally {
      setIsDistributing(false);
    }
  };

  useEffect(() => {
    const checkCurrentChain = async () => {
      if (window.ethereum) {
        try {
          const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
          setIsRightNetwork(currentChainId === '0x7a69'); // '0x7a69' is 31337 in hex
        } catch (err) {
          console.error("Chain check failed:", err);
        }
      }
    };
    
    checkCurrentChain();

    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accs) => accs.length > 0 ? (setAccount(accs[0]), fetchDashboardData(accs[0])) : disconnectWallet());
      window.ethereum.on("chainChanged", () => window.location.reload());
    }
  }, [fetchDashboardData]);

  const isOwner = account && contractOwner && account.toLowerCase() === contractOwner;

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: "1000px", margin: "0 auto" }}>
      
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #ccc", paddingBottom: "1rem" }}>
        <h1>ALU Logo Tokenization Portal</h1>
        <div style={{ display: "flex", gap: "1rem" }}>
          {!isRightNetwork && (
            <button onClick={switchNetwork} style={{ padding: "0.5rem 1rem", cursor: "pointer", background: "#f0ad4e", color: "white", border: "1px solid #eea236", borderRadius: "4px" }}>
              Switch to Localhost
            </button>
          )}
          {account ? (
            <button onClick={disconnectWallet} style={{ padding: "0.5rem 1rem", cursor: "pointer", background: "#f8f9fa", border: "1px solid #ccc", borderRadius: "4px" }}>
              Disconnect {formatAddress(account)}
            </button>
          ) : (
            <button onClick={connectWallet} disabled={isConnecting} style={{ padding: "0.5rem 1rem", cursor: "pointer", background: "#0070f3", color: "white", border: "none", borderRadius: "4px" }}>
              {isConnecting ? "Connecting..." : "Connect Wallet"}
            </button>
          )}
        </div>
      </header>

      {error && <div style={{ color: "red", padding: "1rem", background: "#fff0f0", marginTop: "1rem", border: "1px solid red", borderRadius: "4px" }}>{error}</div>}
      {networkError && <div style={{ color: "#856404", padding: "1rem", background: "#fff3cd", marginTop: "1rem", border: "1px solid #ffeeba", borderRadius: "4px" }}>⚠️ {networkError}</div>}

      <main style={{ marginTop: "2rem" }}>
        {/* SECTION 1: Public Logo Verification */}
        <section style={{ padding: "2rem", border: "2px solid #0070f3", borderRadius: "8px", marginBottom: "2rem" }}>
          <h2>🔍 Public Logo Verification</h2>
          <p style={{ color: "#666", marginBottom: "1rem" }}>Upload a file or paste a SHA-256 hash to cryptographically verify authenticity.</p>
          
          <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginBottom: "1rem" }}>
            <input type="file" onChange={handleVerificationFileUpload} />
          </div>
          
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <input 
              type="text" 
              placeholder="Or paste SHA-256 hash here (0x...)" 
              value={verifyInputHash} 
              onChange={(e) => setVerifyInputHash(e.target.value)} 
              style={{ padding: "0.5rem", flex: 1 }} 
            />
            <button onClick={() => executeVerification(verifyInputHash)} disabled={!verifyInputHash || isVerifying} style={{ padding: "0.5rem 1rem", cursor: "pointer" }}>
              {isVerifying ? "Verifying..." : "Verify Pasted Hash"}
            </button>
          </div>

          {verifyResult && (
            <div style={{ marginTop: "1rem", padding: "1rem", borderRadius: "4px", background: verifyResult.authentic ? "#f0fff4" : "#fff0f0", border: verifyResult.authentic ? "1px solid #cdfaf3" : "1px solid #f8d7da" }}>
              {verifyResult.authentic ? (
                <>
                  <h4 style={{ color: "green", margin: "0 0 0.5rem 0" }}>✅ Authenticated Record Found</h4>
                  <p style={{ margin: "0.25rem 0" }}><strong>Asset Name:</strong> {verifyResult.metadata.name}</p>
                  <p style={{ margin: "0.25rem 0" }}><strong>File Type:</strong> {verifyResult.metadata.type}</p>
                  <p style={{ margin: "0.25rem 0" }}><strong>Registration Date:</strong> {verifyResult.metadata.date}</p>
                  <p style={{ margin: "0.25rem 0", wordBreak: "break-all" }}><strong>Registered By:</strong> {verifyResult.metadata.registeredBy}</p>
                </>
              ) : (
                <p style={{ color: "red", margin: 0 }}>❌ Warning: This hash does not match the official ALU registry.</p>
              )}
            </div>
          )}
        </section>

        {account && (
          <div style={{ marginTop: "2rem" }}>
            {/* SECTION 2: Token Dashboard */}
            <section style={{ padding: "1.5rem", background: "#f8f9fa", borderRadius: "8px", marginBottom: "2rem" }}>
              <h3>📈 ALUT Token Dashboard</h3>
              <p><strong>Total Supply:</strong> {totalSupply} ALUT</p>
              <p><strong>Your Balance:</strong> {balance} ALUT</p>
              <p><strong>Your Fractional Share:</strong> {userPercentage}%</p>
              
              <div style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid #dee2e6" }}>
                <h4 style={{ marginBottom: "0.5rem" }}>Network Example Wallets</h4>
                <ul style={{ listStyleType: "none", padding: 0 }}>
                  {examplePercentages.map((ex, index) => (
                    <li key={index} style={{ padding: "0.25rem 0", display: "flex", gap: "10px", alignItems: "center" }}>
                      <span style={{ fontFamily: "monospace", background: "#e9ecef", padding: "2px 6px", borderRadius: "4px" }}>{formatAddress(ex.address)}</span>
                      <span><strong>{ex.percentage}%</strong> share</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* SECTION 3: Asset Registration Form */}
            <section style={{ padding: "2rem", border: "1px solid #ccc", borderRadius: "8px", marginBottom: "2rem" }}>
              <h2>📝 Register New Asset / Logo Variant</h2>
              <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "500px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem" }}>Asset Name:</label>
                  <input type="text" placeholder="e.g., ALU Graduation Logo 2026" value={assetName} onChange={(e) => setAssetName(e.target.value)} required style={{ width: "100%", padding: "0.5rem" }} />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem" }}>Upload File to Hash:</label>
                  <input type="file" onChange={handleFileUpload} required />
                  {filePreview && (
                    <div style={{ marginTop: "1rem" }}>
                      <p style={{ fontSize: "0.85rem", color: "#666", marginBottom: "0.5rem" }}>Image Preview:</p>
                      <img src={filePreview} alt="Upload Preview" style={{ maxWidth: "200px", border: "1px solid #ccc", borderRadius: "4px" }} />
                    </div>
                  )}
                </div>
                {fileHash && (
                  <div style={{ fontSize: "0.85rem", background: "#eee", padding: "0.5rem", wordBreak: "break-all" }}>
                    <strong>Generated SHA-256 Payload:</strong> {fileHash}
                  </div>
                )}
                <button type="submit" disabled={isRegistering || !fileHash} style={{ padding: "0.75rem", background: "#0070f3", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
                  {isRegistering ? "Signing Transaction..." : "Register Asset on Blockchain"}
                </button>
              </form>
              {txStatus.message && (
                <p style={{ marginTop: "1rem", fontWeight: "bold", color: txStatus.type === "success" ? "green" : "red" }}>{txStatus.message}</p>
              )}
            </section>

            {/* SECTION 4: Admin Controls */}
            <section style={{ padding: "2rem", background: "#fffaf0", border: "1px solid #ffeeba", borderRadius: "8px", opacity: isOwner ? 1 : 0.6 }}>
              <h3>👑 Admin Dashboard: Distribute Shares</h3>
              <p style={{ fontSize: "0.9rem", color: "#856404", marginBottom: "1rem" }}>Authorized action: distribute token shares of the verified ALU logo to stakeholders.</p>
              
              {!isOwner && (
                <div style={{ padding: "0.75rem", background: "#f8d7da", color: "#721c24", borderRadius: "4px", marginBottom: "1rem", border: "1px solid #f5c6cb" }}>
                  🔒 View-only mode. Only the official contract owner can distribute token shares.
                </div>
              )}

              <form onSubmit={handleDistribute} style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
                <input placeholder="Recipient Wallet Address (0x...)" value={distRecipient} onChange={(e) => setDistRecipient(e.target.value)} disabled={!isOwner} style={{ padding: "0.5rem", flex: 2, minWidth: "250px" }} />
                <input type="number" placeholder="Amount (raw units)" value={distAmount} onChange={(e) => setDistAmount(e.target.value)} disabled={!isOwner} style={{ padding: "0.5rem", flex: 1, minWidth: "120px" }} />
                <button type="submit" disabled={isDistributing || !isOwner} style={{ padding: "0.5rem 1rem", background: isOwner ? "#28a745" : "#ccc", color: "white", border: "none", borderRadius: "4px", cursor: isOwner ? "pointer" : "not-allowed" }}>
                  {isDistributing ? "Sending..." : "Distribute"}
                </button>
              </form>
              {distStatus.message && (
                <p style={{ marginTop: "1rem", fontWeight: "bold", color: distStatus.type === "success" ? "green" : "red" }}>{distStatus.message}</p>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
