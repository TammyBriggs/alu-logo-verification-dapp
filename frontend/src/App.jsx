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
        <section style={{ padding: "2rem", border: "2px solid #0070f3", borderRadius: "8px" }}>
          <h2>🔍 Public Logo Verification</h2>
          <input type="file" onChange={(e) => { const f = e.target.files[0]; const reader = new FileReader(); reader.onload = async (ev) => { const h = await crypto.subtle.digest("SHA-256", ev.target.result); const hx = Array.from(new Uint8Array(h)).map(b=>b.toString(16).padStart(2,'0')).join(''); executeVerification("0x"+hx); }; reader.readAsArrayBuffer(f); }} />
          {verifyResult && (
            <div style={{ marginTop: "1rem", padding: "1rem", background: verifyResult.authentic ? "#f0fff4" : "#fff0f0" }}>
              {verifyResult.authentic ? `✅ Authenticated: ${verifyResult.metadata.name}` : "❌ Warning: Not Authentic"}
            </div>
          )}
        </section>

        {account && (
          <div style={{ marginTop: "2rem" }}>
            <section>
              <h3>Token Dashboard</h3>
              <p>Total Supply: {totalSupply} | Your Share: {userPercentage}%</p>
            </section>

            {isOwner && (
              <section style={{ marginTop: "2rem", padding: "1rem", background: "#f9f9f9" }}>
                <h3>Admin: Distribute Shares</h3>
                <form onSubmit={handleDistribute}>
                  <input placeholder="Recipient" value={distRecipient} onChange={(e) => setDistRecipient(e.target.value)} required />
                  <input type="number" placeholder="Amount" value={distAmount} onChange={(e) => setDistAmount(e.target.value)} required />
                  <button type="submit" disabled={isDistributing}>{isDistributing ? "Sending..." : "Distribute"}</button>
                </form>
                {distStatus.message && <p>{distStatus.message}</p>}
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
