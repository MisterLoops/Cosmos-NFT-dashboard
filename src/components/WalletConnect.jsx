import React, { useState, useEffect } from "react";
import { fromBech32 } from "@cosmjs/encoding";
import { Wallet } from "lucide-react";
import '../App.css';

export default function WalletConnect({
  onConnect,
  error,
}) {
  const [connecting, setConnecting] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [manualStargazeAddress, setManualStargazeAddress] = useState("");
  const [manualInjectiveAddress, setManualInjectiveAddress] = useState("");
  const [manualInitiaAddress, setManualInitiaAddress] = useState("");
  const [manualMode, setManualMode] = useState(false);
  const [errors, setErrors] = useState({
    stargaze: "",
    injective: "",
    initia: "",
  });
const validateBech32 = (addr, prefix) => {
  try {
    const { prefix: decodedPrefix } = fromBech32(addr.toLowerCase());
    return decodedPrefix === prefix;
  } catch {
    return false;
  }
};

// Specific validators
const validateStargaze = (addr) => validateBech32(addr, "stars");
const validateInjective = (addr) => validateBech32(addr, "inj");
const validateInitia = (addr) => validateBech32(addr, "init");
  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const connectKeplr = async () => {
    if (!window.keplr) {
      alert("Please install Keplr wallet extension");
      return;
    }

    try {
      setConnecting(true);
      setSelectedWallet("keplr");

      // Enable all chains first
      const chainIds = [
        "stargaze-1",
        "osmosis-1",
        "cosmoshub-4",
        "injective-1",
        "interwoven-1",
        "neutron-1",
        "mantra-1",
        "akashnet-2",
        "dungeon-1"
      ];

      await window.keplr.enable(chainIds);

      // Get signers for all chains
      const signers = {};
      for (const chainId of chainIds) {
        const offlineSigner = window.keplr.getOfflineSigner(chainId);
        signers[chainId] = offlineSigner;
      }

      // Get wallet info from Stargaze
      const key = await window.keplr.getKey("stargaze-1");

      const walletInfo = {
        name: key.name,
        type: "keplr",
        address: "", // Will be populated with all addresses in App.jsx
        publicKey: key.pubKey,
      };

      onConnect(walletInfo);
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

    try {
      setConnecting(true);
      setSelectedWallet("leap");

      // Enable all chains first
      const chainIds = [
        "stargaze-1",
        "osmosis-1",
        "cosmoshub-4",
        "injective-1",
        "interwoven-1",
        "neutron-1",
        "mantra-1",
        "akashnet-2"
      ];

      await window.leap.enable(chainIds);

      // Get signers for all chains
      const signers = {};
      for (const chainId of chainIds) {
        const offlineSigner = window.leap.getOfflineSigner(chainId);
        signers[chainId] = offlineSigner;
      }

      // Get wallet info from Stargaze
      const key = await window.leap.getKey("stargaze-1");

      const walletInfo = {
        name: key.name,
        type: "leap",
        address: "", // Will be populated with all addresses in App.jsx
        publicKey: key.pubKey,
      };

      onConnect(walletInfo);
    } catch (error) {
      console.error("Failed to connect Leap wallet:", error);
    } finally {
      setConnecting(false);
      setSelectedWallet(null);
    }
  };

  // NEW: Manual address connect
  const connectManualAddress = () => {
    if (!manualStargazeAddress.trim()) {
      alert("Please enter a Stargaze address");
      return;
    }
    if (!manualInjectiveAddress.trim()) {
      alert("Please enter a Stargaze address");
      return;
    }
    if (!manualInitiaAddress.trim()) {
      alert("Please enter a Stargaze address");
      return;
    }

    const walletInfo = {
      name: "Wallet",
      type: "manual", // keep "keplr" type for consistency
      stargazeAddress: manualStargazeAddress,
      injectiveAddress: manualInjectiveAddress,
      initiaAddress: manualInitiaAddress,
      publicKey: null, // no pubKey available in manual mode
    };

    onConnect(walletInfo);
  };

  return (
    <div className="wallet-connect">
      <h1 className="welcome-text">Welcome to the Cosmos NFTHUB!</h1>
      {/* <div className="testing-container">
        <div className="testing-message">
          <h3>V1</h3>
          <span className="testing-message-bold">
          <h2>
            Welcome the to the V1 of Cosmos NFTHUB.
          </h2>
          <br></br>
          </span>
          <p>A dashboard that displays all your NFTs holdings (including those staked in DAOS), tokens and NFT offers on marketplaces across Cosmos chains.</p>
          <p>Your feedback is important to report anything that doesn't
                work properly, what DAOs, chains and features you'd like to be added.</p>
          <p>It's a simple app that runs in your browser, nothing's stored in a database, 
          and the connection is an offline connection, so, you're safe!</p>
          <p>
            Please reach out to me on X for feedbacks.
          </p>
          <span className="testing-message-bold">
          <p>
            Thanks for trying it, hope you'll like using it!
          </p><br></br>
          </span>
          <span className="testing-message-bold">
          <p>🧪 EVERYTHING IS AN EXPERIMENT 🧪</p>
          </span><br></br>
          <p><strong><a href="https://x.com/MisterLoops" target="_blank" rel="noopener noreferrer">MisterLoops</a></strong></p>
        </div>
      </div> */}

      <div className="connect-container">
        <Wallet size={64} className="wallet-icon" />
        <h1>Connect Your Wallet</h1>
        <p>
          ... to admire your interchain NFT portfolio on 7 cosmos chains from one single place.
        </p>
        {/* <p>
          Watch all your offers and sort your NFTs with filters.
        </p> */}
        <p>
          The app simply runs in your browser, nothing's stored in a database.
        </p>
        <p className="offline-message">
          It's an offline connection, no transaction EVER, you're safe 😉
        </p>
        <p className="connect-experiment">🧪 EVERYTHING IS AN EXPERIMENT 🧪</p>

        {isMobile && (
          <div className="mobile-disclaimer">
            <p>
              It seems that you're on mobile, you should open this page directly in your wallet app browser to be able to connect...
            </p>
          </div>
        )}

        {!manualMode ? (
          <>
            <div className="wallet-options">
              <button onClick={connectKeplr} disabled={connecting} className="wallet-option-btn">
                <div className="wallet-option-content" title="Keplr wallet">
                  <div className="wallet-logo keplr-logo">
                    <img
                      src="https://cdn.prod.website-files.com/667dc891bc7b863b5397495b/66a8b2095086e8b326351bd3_logo-icon.svg"
                      alt="Keplr"
                      onError={(e) => { e.target.style.display = "none"; e.target.parentElement.innerHTML = '<span class="logo-text">K</span>'; }}
                    />
                  </div>
                </div>
              </button>

              <button onClick={connectLeap} disabled={connecting} className="wallet-option-btn">
                <div className="wallet-option-content" title="Leap wallet">
                  <div className="wallet-logo leap-logo">
                    <img
                      src="https://assets.leapwallet.io/logos/leap-cosmos-logo.png"
                      alt="Leap"
                      onError={(e) => { e.target.style.display = "none"; e.target.parentElement.innerHTML = '<span class="logo-text">L</span>'; }}
                    />
                  </div>
                </div>
              </button>
            </div>

            {/* Clickable text to toggle manual mode */}
            <p
              className="manual-toggle-text"
              style={{ cursor: "pointer", marginTop: "1rem", marginBottom: "0", textDecoration: "underline" }}
              onClick={() => setManualMode(true)}
            >
              Or enter your addresses manually (more tedious)
            </p>
          </>
        ) : (
          <>
            {/* Manual address form */}
            <div className="manual-address">
              <div className="manual-field">
                <input
                  type="text"
                  placeholder="Your Stargaze address (stars...)"
                  value={manualStargazeAddress}
                  onChange={(e) => {
                    const val = e.target.value;
                    setManualStargazeAddress(val);
                    setErrors(prev => ({ ...prev, stargaze: validateStargaze(val) ? "" : "Invalid Stargaze address" }));
                  }}
                  className="manual-input"
                />
                {errors.stargaze && <span className="manual-error">{errors.stargaze}</span>}
              </div>

              <div className="manual-field">
                <input
                  type="text"
                  placeholder="Your Injective address (inj...)"
                  value={manualInjectiveAddress}
                  onChange={(e) => {
                    const val = e.target.value;
                    setManualInjectiveAddress(val);
                    setErrors(prev => ({ ...prev, injective: validateInjective(val) ? "" : "Invalid Injective address" }));
                  }}
                  className="manual-input"
                />
                {errors.injective && <span className="manual-error">{errors.injective}</span>}
              </div>

              <div className="manual-field">
                <input
                  type="text"
                  placeholder="Your Initia address (initia...)"
                  value={manualInitiaAddress}
                  onChange={(e) => {
                    const val = e.target.value;
                    setManualInitiaAddress(val);
                    setErrors(prev => ({ ...prev, initia: validateInitia(val) ? "" : "Invalid Initia address" }));
                  }}
                  className="manual-input"
                />
                {errors.initia && <span className="manual-error">{errors.initia}</span>}
              </div>

              <button
                onClick={connectManualAddress}
                className="manual-submit-btn"
                disabled={
                  !manualStargazeAddress || !manualInjectiveAddress || !manualInitiaAddress ||
                  errors.stargaze || errors.injective || errors.initia
                }
              >
                Connect
              </button>
            </div>

            <p
              className="manual-toggle-text"
              style={{ cursor: "pointer", marginTop: "1rem", marginBottom: "0", textDecoration: "underline" }}
              onClick={() => setManualMode(false)}
            >
              Back to wallet connection
            </p>
          </>
        )}

        {connecting && (
          <div className="connecting-message">
            Connecting to {selectedWallet === "keplr" ? "Keplr" : "Leap"}{" "}
            wallet...
          </div>
        )}

        {error && <div className="error">{error}</div>}
      </div>


    </div>
  );
}