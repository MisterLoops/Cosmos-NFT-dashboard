import React, { useState, useEffect, useRef } from "react";
import { Wallet } from "lucide-react";
import "../App.css";

export default function WalletConnect({ onConnect, error }) {
  const [connecting, setConnecting] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [evmEnabled, setEvmEnabled] = useState(true);
  const [evmAddress, setEvmAddress] = useState("");
  const modalRef = useRef(null);

  // ✅ Full chain list (Cosmos + EVM)
  const allChains = [
    { name: "Stargaze", id: "stargaze-1" },
    { name: "Osmosis", id: "osmosis-1" },
    { name: "Cosmos Hub", id: "cosmoshub-4" },
    { name: "Injective", id: "injective-1" },
    { name: "Intergaze", id: "interwoven-1" },
    { name: "Neutron", id: "neutron-1" },
    { name: "Omniflix", id: "omniflixhub-1" },
    { name: "Akash", id: "akashnet-2" },
    { name: "Mantra", id: "mantra-1" },
    { name: "Passage", id: "passage-2" },
    { name: "Mantra EVM Testnet", id: "mantra-dukong-1", isEvm: true },
    { name: "HyperEVM", id: "hyperevm", isEvm: true },
  ];

  // ✅ All selected by default
  const [selectedChains, setSelectedChains] = useState({});
  useEffect(() => {
    const initial = {};
    allChains.filter((chain) => chain.name !== "Akash" && chain.name !== "Mantra").forEach((c) => (initial[c.id] = true));
    setSelectedChains(initial);
  }, []);

  // ✅ Responsive detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // ✅ Close modal on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        setShowModal(false);
      }
    };
    if (showModal) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showModal]);

  // ✅ Helpers
  const toggleChain = (id) =>
    setSelectedChains((prev) => ({ ...prev, [id]: !prev[id] }));

  const selectAll = () => {
    const allSelected = {};
    allChains.filter((chain) => chain.name !== "Akash" && chain.name !== "Mantra").forEach((c) => (allSelected[c.id] = true));
    setSelectedChains(allSelected);
  };

  const deselectAll = () => {
    const noneSelected = {};
    allChains.forEach((c) => (noneSelected[c.id] = false));
    setSelectedChains(noneSelected);
  };

  const selectedCount = Object.values(selectedChains).filter(Boolean).length;
  const chainIds = allChains
    .filter((c) => !c.isEvm)
    .map((c) => c.id);
  const selectedEvmChains = allChains.filter(
    (c) => c.isEvm
  );

  // ✅ Original connection logic unchanged
  const connectKeplr = async () => {
    if (!window.keplr) {
      alert("Please install Keplr wallet extension");
      return;
    }

    // Keep your existing EVM logic intact
    let finalEvmAddress = evmAddress;
    if (selectedEvmChains.length > 0) {
      try {
        await window.keplr.ethereum.enable();
        const accounts = await window.keplr.ethereum.request({
          method: "eth_requestAccounts",
        });
        finalEvmAddress = accounts?.[0] || "";
        setEvmAddress(finalEvmAddress);
        console.log("✅ Keplr EVM address:", finalEvmAddress);
      } catch (err) {
        console.error("❌ Keplr EVM connection failed:", err);
        alert(`Failed to get EVM address:\n\n${err.message || err}`);
        return;
      }
    }

    try {
      setConnecting(true);
      setSelectedWallet("keplr");

      // ✅ Only enable selected Cosmos chains
      if (chainIds.length > 0) await window.keplr.enable(chainIds);

      const signers = {};
      for (const chainId of chainIds) {
        const offlineSigner = window.keplr.getOfflineSigner(chainId);
        signers[chainId] = offlineSigner;
      }

      const key = await window.keplr.getKey("stargaze-1");

      const walletInfo = {
        name: key.name,
        type: "keplr",
        address: "",
        publicKey: key.pubKey,
        ...(selectedEvmChains.length > 0 && { evmAddress: finalEvmAddress }),
        signers,
        walletProvider: window.keplr,
      };

      onConnect({
        ...walletInfo,
        selectedChains: Object.keys(selectedChains).filter((id) => selectedChains[id]),
      });
    } catch (error) {
      console.error("Failed to connect Keplr wallet:", error);
    } finally {
      setConnecting(false);
      setSelectedWallet(null);
    }
  };

  const connectLeap = async () => {
    if (!window.leap) {
      alert("Please install Leap wallet extension");
      return;
    }

    // Keep EVM logic same as before
    let finalEvmAddress = evmAddress;
    if (selectedEvmChains.length > 0) {
      try {
        await window.keplr.ethereum.enable();
        const accounts = await window.keplr.ethereum.request({
          method: "eth_requestAccounts",
        });
        finalEvmAddress = accounts?.[0] || "";
        setEvmAddress(finalEvmAddress);
        console.log("✅ Keplr EVM address:", finalEvmAddress);
      } catch (err) {
        console.error("❌ Keplr EVM connection failed:", err);
        alert(`Failed to get EVM address:\n\n${err.message || err}`);
        return;
      }
    }

    try {
      setConnecting(true);
      setSelectedWallet("leap");

      // ✅ Only enable selected Cosmos chains
      if (chainIds.length > 0) await window.leap.enable(chainIds);

      const signers = {};
      for (const chainId of chainIds) {
        const offlineSigner = window.leap.getOfflineSigner(chainId);
        signers[chainId] = offlineSigner;
      }

      const key = await window.leap.getKey("stargaze-1");

      const walletInfo = {
        name: key.name,
        type: "leap",
        address: "",
        publicKey: key.pubKey,
        ...(selectedEvmChains.length > 0 && { evmAddress: finalEvmAddress }),
        signers,
        walletProvider: window.leap,
      };

      onConnect({
        ...walletInfo,
        selectedChains: Object.keys(selectedChains).filter((id) => selectedChains[id]),
      });
    } catch (error) {
      console.error("Failed to connect Leap wallet:", error);
    } finally {
      setConnecting(false);
      setSelectedWallet(null);
    }
  };

  return (
    <div className="wallet-connect">
      <h1 className="welcome-text">Welcome to the Cosmos NFTHUB!</h1>

      <div className="connect-container">
        <Wallet size={64} className="wallet-icon" />
        <h1>Connect Your Wallet</h1>
        <p>
          ... to admire your interchain NFT portfolio on 10 chains from one single place.
        </p>
        <p>The app simply runs in your browser, nothing's stored in a database.</p>
        <p className="offline-message">
          Cosmos wallets connection is offline, no transactions, you're safe 😉
        </p>
        <p className="connect-experiment">🧪 EVERYTHING IS AN EXPERIMENT 🧪</p>

        {/* Chain Selector */}
        <div className="chain-selector" onClick={() => setShowModal(true)}>
          ⛓️ {selectedCount} NFT chain{selectedCount !== 1 ? "s" : ""} selected
        </div>

        {isMobile && (
          <div className="mobile-disclaimer">
            <p>
              You’re on mobile — open this page in your wallet app browser to connect.
            </p>
          </div>
        )}

        <div className="wallet-options">
          <button onClick={connectKeplr} disabled={connecting} className="wallet-option-btn" title="Keplr">
            <div className="wallet-option-content">
              <div className="wallet-logo keplr-logo">
                <img
                  src="https://cdn.prod.website-files.com/667dc891bc7b863b5397495b/66a8b2095086e8b326351bd3_logo-icon.svg"
                  alt="Keplr"
                  onError={(e) => {
                    e.target.style.display = "none";
                    e.target.parentElement.innerHTML = '<span class="logo-text">K</span>';
                  }}
                />
              </div>
            </div>
            {/* <span>Keplr</span> */}
          </button>

          <button onClick={connectLeap} disabled={connecting} className="wallet-option-btn" title="Leap">
            <div className="wallet-option-content">
              <div className="wallet-logo leap-logo">
                <img
                  src="https://assets.leapwallet.io/logos/leap-cosmos-logo.png"
                  alt="Leap"
                  onError={(e) => {
                    e.target.style.display = "none";
                    e.target.parentElement.innerHTML = '<span class="logo-text">L</span>';
                  }}
                />
              </div>
            </div>
            {/* <span>Leap</span> */}
          </button>
        </div>

        {connecting && (
          <div className="connecting-message">
            Connecting to {selectedWallet === "keplr" ? "Keplr" : "Leap"}...
          </div>
        )}
        {error && <div className="error">{error}</div>}
      </div>

      {/* Chain Selector Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div
            className="modal-dark"
            ref={modalRef}
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Select chains to fetch NFTs from</h2>

            <div className="modal-controls">
              <button onClick={selectAll}>Select All</button>
              <button onClick={deselectAll} className="danger">
                Deselect All
              </button>
            </div>

            <div className="chain-grid">
              {allChains.filter((chain) => chain.name !== "Akash" && chain.name !== "Mantra").map((chain) => (
                <label key={chain.id} className="chain-option">
                  <input
                    type="checkbox"
                    checked={!!selectedChains[chain.id]}
                    onChange={() => toggleChain(chain.id)}
                  />
                  <span>
                    {chain.name}{" "}
                    {chain.isEvm && <span className="evm-tag">(EVM)</span>}
                  </span>
                </label>
              ))}
            </div>

            <div className="modal-actions">
              <button className="cancel" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button className="apply" onClick={() => setShowModal(false)}>
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

}
