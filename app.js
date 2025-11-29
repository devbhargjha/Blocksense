// app.js (paste this file in same folder as index.html)
console.log("app.js loaded ✓");

async function connectWalletSafe() {
  try {
    if (!window.ethereum) {
      alert("MetaMask not found. Install/Unlock MetaMask and reload.");
      return;
    }

    // create provider using ethers (make sure ethers is loaded before this file)
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    console.log("Provider created:", !!provider);

    // request accounts (this prompts MetaMask)
    const accounts = await provider.send("eth_requestAccounts", []);
    console.log("accounts:", accounts);
    if (!accounts || accounts.length === 0) {
      alert("No accounts returned.");
      return;
    }

    const signer = provider.getSigner();
    const addr = await signer.getAddress();
    console.log("Connected address:", addr);

    // update UI
    const btn = document.getElementById("connectBtn");
    if (btn) {
      btn.textContent = "Connected: " + addr.slice(0,6) + "..." + addr.slice(-4);
      btn.disabled = true;
      btn.classList.add("connected");
    }
    const span = document.getElementById("walletAddress");
    if (span) span.textContent = addr;

    const net = await provider.getNetwork();
    console.log("Network:", net.chainId, net.name);

  } catch (err) {
    console.error("connectWalletSafe error:", err);
    alert("Connect error: " + (err?.message || err));
  }
}

// Attach handler once DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  const b = document.getElementById("connectBtn");
  if (!b) console.warn("connectBtn not found in DOM");
  else b.addEventListener("click", connectWalletSafe);
});