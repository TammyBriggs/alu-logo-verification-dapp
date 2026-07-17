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
  const [isConnecting, setIsConnecting] = useState(false);

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

  const connectWallet = async () => {
    setError("");
    setIsConnecting(true);
    if (!window.ethereum) {
      setError("No Web3 wallet detected. Please install MetaMask.");
      setIsConnecting(false);
      return;
    }
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        await fetchDashboardData(accounts[0]);
      }
    } catch (err) {
      setError("Connection request rejected.");
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setBalance("0");
    setUserPercentage("0");
    setContractOwner("");
    setError("");
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

  const handleRegister = async (event) => {
    event.preventDefault();
    setIsRegistering(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const registryContract = new ethers.Contract(REGISTRY_CONTRACT_ADDRESS, REGISTRY_ABI, signer);
      const tx = await registryContract.registerAsset(assetName, fileType, fileHash);
      await tx.wait();
      setTxStatus({ type: "success", message: "Success! Asset registered." });
      setAssetName("");
    } catch (err) {
      setTxStatus({ type: "error", message: "Registration failed." });
    } finally {
      setIsRegistering(false);
    }
  };

  const executeVerification = async (hashToVerify) => {
    if (!hashToVerify) return;
    setIsVerifying(true);
    try {
      const publicProvider = new ethers.JsonRpcProvider("http://localhost:8545");
      const registryContract = new ethers.Contract(REGISTRY_CONTRACT_ADDRESS, REGISTRY_ABI, publicProvider);
      const [authentic] = await registryContract.verifyLogoIntegrity(1, hashToVerify);
      let metadata = null;
      if (authentic) {
        const asset = await registryContract.getAsset(1);
        metadata = { name: asset.assetName, type: asset.fileType, registeredBy: asset.registeredBy, date: new Date(Number(asset.registrationTimestamp) * 1000).toLocaleString() };
      }
      setVerifyResult({ authentic, metadata });
    } catch (err) {
      setVerifyResult({ authentic: false, message: "Error verifying." });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDistribute = async (e) => {
    e.preventDefault();
    setIsDistributing(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const tokenContract = new ethers.Contract(TOKEN_CONTRACT_ADDRESS, TOKEN_ABI, signer);
      const tx = await tokenContract.distributeShares(distRecipient, BigInt(distAmount));
      await tx.wait();
      setDistStatus({ type: "success", message: "Distribution successful." });
      fetchDashboardData(account);
    } catch (err) {
      setDistStatus({ type: "error", message: "Distribution failed." });
    } finally {
      setIsDistributing(false);
    }
  };

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accs) => accs.length > 0 ? (setAccount(accs[0]), fetchDashboardData(accs[0])) : disconnectWallet());
    }
  }, [fetchDashboardData]);

  const isOwner = account && contractOwner && account.toLowerCase() === contractOwner;

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: "1000px", margin: "0 auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #ccc", paddingBottom: "1rem" }}>
        <h1>ALU Logo Tokenization Portal</h1>
        {account ? (
          <button onClick={disconnectWallet}>Disconnect {formatAddress(account)}</button>
        ) : (
          <button onClick={connectWallet}>Connect Wallet</button>
        )}
      </header>

      <main style={{ marginTop: "2rem" }}>
        {/* SECTION 1: Public Logo Verification */}
        <section style={{ padding: "2rem", border: "2px solid #0070f3", borderRadius: "8px", marginBottom: "2rem" }}>
          <h2>🔍 Public Logo Verification</h2>
          <p style={{ color: "#666" }}>Upload a logo file to check its cryptographic authenticity against the ALU blockchain registry without using gas.</p>
          <input type="file" onChange={(e) => { const f = e.target.files[0]; const reader = new FileReader(); reader.onload = async (ev) => { const h = await crypto.subtle.digest("SHA-256", ev.target.result); const hx = Array.from(new Uint8Array(h)).map(b=>b.toString(16).padStart(2,'0')).join(''); executeVerification("0x"+hx); }; reader.readAsArrayBuffer(f); }} />
          {verifyResult && (
            <div style={{ marginTop: "1rem", padding: "1rem", borderRadius: "4px", background: verifyResult.authentic ? "#f0fff4" : "#fff0f0", border: verifyResult.authentic ? "1px solid #cdfaf3" : "1px solid #f8d7da" }}>
              {verifyResult.authentic ? `✅ Authenticated: ${verifyResult.metadata.name} (${verifyResult.metadata.type})` : "❌ Warning: This file hash does not match any official ALU asset registry record."}
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
            </section>

            {/* SECTION 3: Missing Asset Registration Form */}
            <section style={{ padding: "2rem", border: "1px solid #ccc", borderRadius: "8px", marginBottom: "2rem" }}>
              <h2>📝 Register New Asset / Logo Variant</h2>
              <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "400px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem" }}>Asset Name:</label>
                  <input type="text" placeholder="e.g., ALU Graduation Logo 2026" value={assetName} onChange={(e) => setAssetName(e.target.value)} required style={{ width: "100%", padding: "0.5rem" }} />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem" }}>Upload File to Hash:</label>
                  <input type="file" onChange={handleFileUpload} required />
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
                <p style={{ marginTop: "1rem", color: txStatus.type === "success" ? "green" : "red" }}>{txStatus.message}</p>
              )}
            </section>

            {/* SECTION 4: Admin Controls */}
            {isOwner && (
              <section style={{ padding: "2rem", background: "#fffaf0", border: "1px solid #ffeeba", borderRadius: "8px" }}>
                <h3>👑 Admin Dashboard: Distribute Shares</h3>
                <p style={{ fontSize: "0.9rem", color: "#856404" }}>Authorized action: distribute token shares of the verified ALU logo to stakeholders.</p>
                <form onSubmit={handleDistribute} style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                  <input placeholder="Recipient Wallet Address (0x...)" value={distRecipient} onChange={(e) => setDistRecipient(e.target.value)} required style={{ padding: "0.5rem", flex: 2 }} />
                  <input type="number" placeholder="Amount (raw units)" value={distAmount} onChange={(e) => setDistAmount(e.target.value)} required style={{ padding: "0.5rem", flex: 1 }} />
                  <button type="submit" disabled={isDistributing} style={{ padding: "0.5rem 1rem", background: "#28a745", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
                    {isDistributing ? "Sending..." : "Distribute"}
                  </button>
                </form>
                {distStatus.message && (
                  <p style={{ marginTop: "1rem", color: distStatus.type === "success" ? "green" : "red" }}>{distStatus.message}</p>
                )}
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
