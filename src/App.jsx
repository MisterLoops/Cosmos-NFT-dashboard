import React, { useState, useEffect, useRef } from "react";
import "./App.css";
import WalletConnect from "./components/WalletConnect";
import NFTDashboard from "./components/NFTDashboard";
import { Trash2, Copy, Check } from "lucide-react";
import {
  CHAIN_CONFIGS,
  TOKEN_LOGOS,
  CHAIN_ENDPOINTS,
  CORS_PROXIES,
  API_ENDPOINTS,
} from "./utils/constants.js";

export default function App() {
  const [wallet, setWallet] = useState(null);
  const [addresses, setAddresses] = useState({});
  const [hasAccess, setHasAccess] = useState(false);
  const [error, setError] = useState("");
  const [showTokens, setShowTokens] = useState(false);
  const [tokenBalancesClosing, setTokenBalancesClosing] = useState(false);
  const [tokenBalances, setTokenBalances] = useState({});
  const [showWalletDropdown, setShowWalletDropdown] = useState(false);
  const [walletDropdownClosing, setWalletDropdownClosing] = useState(false);
  const [showManualAddressForm, setShowManualAddressForm] = useState(false);
  const [manualAddress, setManualAddress] = useState("");
  const [selectedChain, setSelectedChain] = useState("stargaze");
  const [manualAddresses, setManualAddresses] = useState({});
  const [addressLoading, setAddressLoading] = useState({});
  // Token prices for wallet display
  const [bosmoPrice, setBosmoPrice] = useState(0.2);
  const [initPrice, setInitPrice] = useState(0.43);
  const [binjPrice, setBinjPrice] = useState(1.0);
  const [tokenPrices, setTokenPrices] = useState({});
  const [confirmingRemoval, setConfirmingRemoval] = useState(null);
  const [isFetchingNFTs, setIsFetchingNFTs] = useState(true);
  const [hasCompletedInitialLoad, setHasCompletedInitialLoad] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(null);
  const [scrollState, setScrollState] = useState({
    canScrollUp: false,
    canScrollDown: false,
    isScrollable: false,
  });

  // Refs to track if prices have been fetched to prevent duplicates
  const bosmoFetchedRef = useRef(false);
  const initFetchedRef = useRef(false);
  const binjFetchedRef = useRef(false); // Ref for bINJ price
  const bosmoFetchingRef = useRef(false);
  const initFetchingRef = useRef(false);
  const binjFetchingRef = useRef(false); // Ref for bINJ price

  // Fetch bOSMO price on app load
  useEffect(() => {
    if (bosmoFetchedRef.current || bosmoFetchingRef.current) return;

    const fetchBosmoPrice = async () => {
      bosmoFetchingRef.current = true;
      bosmoFetchedRef.current = true;

      try {
        // console.log("[DEBUG] Fetching bOSMO price...");
        const bosmoApiUrl = API_ENDPOINTS.BOSMO_API;

        let proxiedUrl;
        const proxyUrl = CORS_PROXIES[0]; // Start with first proxy

        if (proxyUrl.includes("codetabs.com")) {
          proxiedUrl = proxyUrl + encodeURIComponent(bosmoApiUrl);
        } else if (proxyUrl.includes("thingproxy.freeboard.io")) {
          proxiedUrl = proxyUrl + encodeURIComponent(bosmoApiUrl);
        } else {
          proxiedUrl = proxyUrl + bosmoApiUrl;
        }

        const response = await fetch(proxiedUrl, {
          method: "GET",
          headers: { Accept: "application/json" },
        });

        if (response.ok) {
          const data = await response.json();
          const extractedPrice = data?.data?.price || data?.price || 1.0;
          // console.log("[DEBUG] bOSMO price extracted:", extractedPrice);
          setBosmoPrice(extractedPrice);
        } else {
          console.warn(
            "[WARNING] Failed to fetch bOSMO price:",
            response.status,
          );
          setBosmoPrice(0.2);
        }
      } catch (error) {
        console.error("[ERROR] Error fetching bOSMO price:", error);
        setBosmoPrice(0.2);
      } finally {
        bosmoFetchingRef.current = false;
      }
    };

    fetchBosmoPrice();
  }, []);

  // Fetch INIT price on app load
  useEffect(() => {
    if (initFetchedRef.current || initFetchingRef.current) return;

    const fetchInitPrice = async () => {
      initFetchingRef.current = true;
      initFetchedRef.current = true;

      try {
        // console.log("[DEBUG] Fetching INIT price...");

        // Try first API
        try {
          const response = await fetch(API_ENDPOINTS.LLAMA_FI_INITIA);
          if (response.ok) {
            const data = await response.json();
            const extractedPrice = data?.coins?.["coingecko:initia"]?.price;
            if (extractedPrice && extractedPrice > 0) {
              // console.log("[DEBUG] INIT price from llama.fi:", extractedPrice);
              setInitPrice(extractedPrice);
              return;
            }
          }
        } catch (error) {
          // console.log("[DEBUG] First INIT API failed, trying second...");
        }

        // Try second API if first fails
        try {
          const response = await fetch(API_ENDPOINTS.COINGECKO_INITIA);
          if (response.ok) {
            const data = await response.json();
            const extractedPrice = data?.initia?.usd;
            if (extractedPrice && extractedPrice > 0) {
              // console.log("[DEBUG] INIT price from coingecko:", extractedPrice);
              setInitPrice(extractedPrice);
              return;
            }
          }
        } catch (error) {
          console.error("[ERROR] Second INIT API also failed:", error);
        }

        console.warn("[WARNING] Failed to fetch INIT price from both APIs");
        setInitPrice(0.43); // Fallback price
      } catch (error) {
        console.error("[ERROR] Error fetching INIT price:", error);
        setInitPrice(0.43);
      } finally {
        initFetchingRef.current = false;
      }
    };

    fetchInitPrice();
  }, []);

  // Fetch bINJ price on app load
  useEffect(() => {
    if (binjFetchedRef.current || binjFetchingRef.current) return;

    const fetchBinjPrice = async () => {
      binjFetchingRef.current = true;
      binjFetchedRef.current = true;

      try {
        // console.log("[DEBUG] Fetching bINJ price...");
        const binjApiUrl = API_ENDPOINTS.BINJ_API; // Assuming you have this defined

        let proxiedUrl;
        const proxyUrl = CORS_PROXIES[0]; // Start with first proxy

        if (proxyUrl.includes("codetabs.com")) {
          proxiedUrl = proxyUrl + encodeURIComponent(binjApiUrl);
        } else if (proxyUrl.includes("thingproxy.freeboard.io")) {
          proxiedUrl = proxyUrl + encodeURIComponent(binjApiUrl);
        } else {
          proxiedUrl = proxyUrl + binjApiUrl;
        }

        const response = await fetch(proxiedUrl, {
          method: "GET",
          headers: { Accept: "application/json" },
        });

        if (response.ok) {
          const data = await response.json();
          // Adjust the data extraction based on the actual API response for bINJ
          const extractedPrice = data?.data?.price || data?.price || 1.0;
          // console.log("[DEBUG] bINJ price extracted:", extractedPrice);
          setBinjPrice(extractedPrice);
        } else {
          console.warn(
            "[WARNING] Failed to fetch bINJ price:",
            response.status,
          );
          setBinjPrice(1.0); // Fallback price
        }
      } catch (error) {
        console.error("[ERROR] Error fetching bINJ price:", error);
        setBinjPrice(1.0); // Fallback price
      } finally {
        binjFetchingRef.current = false;
      }
    };

    fetchBinjPrice();
  }, []);

  // Function to fetch prices for multiple tokens
  const fetchTokenPrices = async (balances) => {
    // console.log("[DEBUG] Fetching token prices for balances:", balances);
    const prices = {};
    const tokensToFetch = [];

    // Determine which tokens need prices fetched
    if (balances.osmosis && balances.osmosis.symbol === "OSMO") {
      tokensToFetch.push({
        id: "osmosis",
        symbol: "OSMO",
        coingeckoId: "osmosis",
      });
    }
    if (balances.stargaze && balances.stargaze.symbol === "STARS") {
      tokensToFetch.push({
        id: "stargaze",
        symbol: "STARS",
        coingeckoId: "stargaze",
      });
    }
    if (balances.cosmoshub && balances.cosmoshub.symbol === "ATOM") {
      tokensToFetch.push({
        id: "cosmoshub",
        symbol: "ATOM",
        coingeckoId: "cosmos",
      });
    }
    if (balances.injective && balances.injective.symbol === "INJ") {
      tokensToFetch.push({
        id: "injective",
        symbol: "INJ",
        coingeckoId: "injective-protocol",
      });
    }
    if (balances.initia && balances.initia.symbol === "INIT") {
      tokensToFetch.push({
        id: "initia",
        symbol: "INIT",
        coingeckoId: "initia",
      });
    }
    if (balances.neutron && balances.neutron.symbol === "NTRN") {
      tokensToFetch.push({
        id: "neutron",
        symbol: "NTRN",
        coingeckoId: "neutron-3",
      });
    }
    if (balances.mantra && balances.mantra.symbol === "OM") {
      tokensToFetch.push({
        id: "mantra",
        symbol: "OM",
        coingeckoId: "mantra-dao",
      });
    }
    if (balances.akash && balances.akash.symbol === "AKT") {
      tokensToFetch.push({
        id: "akash",
        symbol: "AKT",
        coingeckoId: "akash-network",
      });
    }

    // console.log("[DEBUG] Tokens to fetch:", tokensToFetch);

    // Fetch prices from CoinGecko first
    if (tokensToFetch.length > 0) {
      const coingeckoIds = tokensToFetch
        .map((token) => token.coingeckoId)
        .join(",");
      try {
        // console.log("[DEBUG] Fetching from CoinGecko:", coingeckoIds);
        const coingeckoResponse = await fetch(
          `${API_ENDPOINTS.COINGECKO_SIMPLE_PRICE}?ids=${coingeckoIds}&vs_currencies=usd`,
        );
        if (coingeckoResponse.ok) {
          const coingeckoData = await coingeckoResponse.json();
          // console.log("[DEBUG] CoinGecko response:", coingeckoData);
          tokensToFetch.forEach((token) => {
            if (coingeckoData[token.coingeckoId]?.usd) {
              prices[token.id] = coingeckoData[token.coingeckoId].usd;
              // console.log(
              //   `[DEBUG] Set price for ${token.symbol}: $${prices[token.id]}`,
              // );
            }
          });
        } else {
          console.warn(
            "[WARNING] Failed to fetch prices from CoinGecko:",
            coingeckoResponse.status,
          );
        }
      } catch (error) {
        console.error("[ERROR] Error fetching prices from CoinGecko:", error);
      }
    }

    // Fallback to Llama.fi for tokens that didn't get a price from CoinGecko
    const tokensWithoutPrice = tokensToFetch.filter(
      (token) => !prices[token.id],
    );
    if (tokensWithoutPrice.length > 0) {
      // console.log(
      //   "[DEBUG] Fetching missing prices from Llama.fi:",
      //   tokensWithoutPrice.map((t) => t.symbol),
      // );
      for (const token of tokensWithoutPrice) {
        try {
          const llamaResponse = await fetch(
            `${API_ENDPOINTS.LLAMA_FI_BASE}${token.coingeckoId}`,
          );
          if (llamaResponse.ok) {
            const llamaData = await llamaResponse.json();
            const price =
              llamaData?.coins?.[`coingecko:${token.coingeckoId}`]?.price;
            if (price && price > 0) {
              prices[token.id] = price;
              // console.log(
              //   `[DEBUG] Set price from Llama.fi for ${token.symbol}: $${prices[token.id]}`,
              // );
            } else {
              console.warn(
                `[WARNING] Llama.fi price for ${token.symbol} is zero or missing.`,
              );
            }
          } else {
            console.warn(
              `[WARNING] Failed to fetch price from Llama.fi for ${token.symbol}: ${llamaResponse.status}`,
            );
          }
        } catch (error) {
          console.error(
            `[ERROR] Error fetching price from Llama.fi for ${token.symbol}:`,
            error,
          );
        }
      }
    }

    // console.log("[DEBUG] Final token prices:", prices);
    setTokenPrices(prices);
  };

  const getAddressesFromChains = async (walletType = "keplr") => {
    const addresses = {};

    try {
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
      ];

      const walletInstance = walletType === "leap" ? window.leap : window.keplr;

      if (!walletInstance) {
        throw new Error(
          `${walletType === "leap" ? "Leap" : "Keplr"} wallet not found. Please install the extension.`,
        );
      }

      await walletInstance.enable(chainIds);

      // Get addresses for all chains directly from the wallet
      for (const [chainName, config] of Object.entries(CHAIN_CONFIGS)) {
        const key = await walletInstance.getKey(config.chainId);
        addresses[chainName] = key.bech32Address;
        // console.log(
        //   `${chainName} address (${walletType}): ${key.bech32Address}`,
        // );
      }
    } catch (error) {
      console.error("Failed to connect to chains:", error);
      throw new Error(
        `Failed to connect to chains. Please try again or check your ${walletType === "leap" ? "Leap" : "Keplr"} wallet.`,
      );
    }

    return addresses;
  };

  const fetchTokenBalances = async (addresses) => {
    const balances = {};

    const balancePromises = Object.entries(addresses).map(
      async ([chainName, address]) => {
        if (CHAIN_ENDPOINTS[chainName]) {
          try {
            const endpoint = CHAIN_ENDPOINTS[chainName];
            const url = `${endpoint.rest}/cosmos/bank/v1beta1/balances/${address}`;

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

            const response = await fetch(url, {
              method: "GET",
              headers: {
                Accept: "application/json",
              },
              signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (response.ok) {
              const data = await response.json();
              // console.log(`Balance data for ${chainName}:`, data);

              let balance;
              if (data.balances && Array.isArray(data.balances)) {
                balance = data.balances.find((b) => b.denom === endpoint.denom);
              }

              return [
                chainName,
                {
                  amount: balance?.amount || "0",
                  denom: endpoint.denom,
                  symbol: endpoint.symbol,
                  decimals: endpoint.decimals,
                },
              ];
            } else {
              console.warn(
                `Failed to fetch balance for ${chainName}: ${response.status} ${response.statusText}`,
              );
              return [
                chainName,
                {
                  amount: "0",
                  denom: CHAIN_ENDPOINTS[chainName].denom,
                  symbol: CHAIN_ENDPOINTS[chainName].symbol,
                  decimals: CHAIN_ENDPOINTS[chainName].decimals,
                },
              ];
            }
          } catch (error) {
            console.error(`Error fetching balance for ${chainName}:`, error);
            return [
              chainName,
              {
                amount: "0",
                denom: CHAIN_ENDPOINTS[chainName].denom,
                symbol: CHAIN_ENDPOINTS[chainName].symbol,
                decimals: CHAIN_ENDPOINTS[chainName].decimals,
              },
            ];
          }
        }
        return null;
      },
    );

    const results = await Promise.all(balancePromises);
    results
      .filter((result) => result !== null)
      .forEach(([chainName, balance]) => {
        balances[chainName] = balance;
      });

    setTokenBalances(balances);
    // Fetch token prices after balances are set
    fetchTokenPrices(balances);
  };

  const formatBalance = (balance) => {
    if (!balance || !balance.amount) return "0";
    const decimals = balance.decimals || 6;
    const divisor = Math.pow(10, decimals);
    const amount = parseFloat(balance.amount) / divisor;
    return amount.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  const formatAddress = (address) => {
    if (!address) return "";
    const parts = address.split("1");
    if (parts.length < 2) return address;
    const prefix = parts[0] + "1";
    const mainPart = parts[1];
    if (mainPart.length <= 7) return address;
    return `${prefix}${mainPart.slice(0, 4)}...${mainPart.slice(-3)}`;
  };

  const handleWalletConnect = async (walletInfo) => {
    setWallet(walletInfo);

    try {
      const allAddresses = await getAddressesFromChains(walletInfo.type);
      setAddresses(allAddresses);

      // No longer gating, so set hasAccess to true directly
      setHasAccess(true);

      // Fetch token balances
      fetchTokenBalances(allAddresses);
    } catch (error) {
      console.error("Error connecting to chains:", error);
      setError("Failed to connect to all chains");
    }
  };

  const handleDisconnect = () => {
    setWallet(null);
    setAddresses({});
    setManualAddresses({});
    setHasAccess(false);
    setError("");
    setShowTokens(false);
    setTokenBalances({});
    setTokenPrices({});
    setShowWalletDropdown(false);
    setShowManualAddressForm(false);
    setManualAddress("");
    setSelectedChain("stargaze");
    setAddressLoading({});
    setConfirmingRemoval(null);
    setIsFetchingNFTs(true);
    setCopiedAddress(null);
    setScrollState({
      canScrollUp: false,
      canScrollDown: false,
      isScrollable: false,
    });

    // Reset any dropdown states
    setTokenBalancesClosing(false);
    setWalletDropdownClosing(false);
  };

  const isAddressValid = (address, chainPrefix) => {
    // Handle special case for Neutron addresses which use "neutron1" prefix
    const expectedPrefix = chainPrefix === "neutron" ? "neutron1" : chainPrefix;
    
    // Basic check for prefix and length (typical length is 39-65 characters for Neutron)
    const minLength = chainPrefix === "neutron" ? 39 : 39;
    const maxLength = chainPrefix === "neutron" ? 65 : 45;
    
    return (
      address.startsWith(expectedPrefix) &&
      address.length >= minLength &&
      address.length <= maxLength
    );
  };

  const handleAddManualAddress = () => {
    if (!manualAddress.trim()) {
      setError("Please enter an address.");
      return;
    }

    if (!selectedChain) {
      setError("Please select a chain.");
      return;
    }

    const prefix = CHAIN_CONFIGS[selectedChain]?.prefix;
    const trimmedAddress = manualAddress.trim();

    if (!prefix) {
      setError(`Chain configuration not found for ${selectedChain}.`);
      return;
    }

    if (!isAddressValid(trimmedAddress, prefix)) {
      setError(
        `Invalid address format for ${selectedChain.toUpperCase()}. Address should start with "${prefix}" and be 39-45 characters long.`,
      );
      return;
    }

    // Clear any previous errors
    setError("");

    // Add the valid address
    setAddressLoading((prev) => ({ ...prev, [selectedChain]: true }));
    setManualAddresses((prev) => ({
      ...prev,
      [selectedChain]: trimmedAddress,
    }));
    setManualAddress("");
    setShowManualAddressForm(false);
    setShowWalletDropdown(false);
  };

  const handleRemovalConfirmation = (chain) => {
    setConfirmingRemoval(chain);
  };

  const confirmRemovalAddress = (chain) => {
    const addressToRemove = manualAddresses[chain];
    console.log(
      `[DEBUG] Removing manual address for ${chain}: ${addressToRemove}`,
    );

    // Call the NFT removal function if it exists
    if (
      typeof window !== "undefined" &&
      window.removeNFTsByManualAddress &&
      addressToRemove
    ) {
      window.removeNFTsByManualAddress(chain, addressToRemove);
    }

    setManualAddresses((prev) => {
      const newAddresses = { ...prev };
      delete newAddresses[chain];
      return newAddresses;
    });
    setAddressLoading((prev) => {
      const newLoading = { ...prev };
      delete newLoading[chain];
      return newLoading;
    });

    setConfirmingRemoval(null);
  };

  const cancelRemoval = () => {
    setConfirmingRemoval(null);
  };

  const clearAddressLoading = (chainName) => {
    setAddressLoading((prev) => {
      const newLoading = { ...prev };
      delete newLoading[chainName];
      return newLoading;
    });
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedAddress(text);
      setTimeout(() => setCopiedAddress(null), 1500);
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  const handleAddressListScroll = (e) => {
    const element = e.target;
    const canScrollUp = element.scrollTop > 0;
    const canScrollDown =
      element.scrollTop < element.scrollHeight - element.clientHeight;
    const isScrollable = element.scrollHeight > element.clientHeight;

    setScrollState({
      canScrollUp,
      canScrollDown,
      isScrollable,
    });
  };

  // Initialize scroll state when dropdown opens
  const checkScrollState = (element) => {
    if (element) {
      const canScrollUp = element.scrollTop > 0;
      const canScrollDown =
        element.scrollTop < element.scrollHeight - element.clientHeight;
      const isScrollable = element.scrollHeight > element.clientHeight;

      setScrollState({
        canScrollUp,
        canScrollDown,
        isScrollable,
      });
    }
  };

  // Function to handle removal of NFTs for a manual address
  const handleManualAddressRemoved = (addressToRemove) => {
    // console.log(
    //   `NFTs for manual address ${addressToRemove} have been cleared.`,
    // );
  };

  // Combine connected and manual addresses for NFT fetching
  const getAllAddresses = () => {
    const combined = { ...addresses };

    // Add manual addresses to their respective chains
    Object.entries(manualAddresses).forEach(([chain, address]) => {
      if (!combined[chain]) {
        combined[chain] = address;
      } else {
        // If there's already a connected address, we'll handle both in fetchAllNFTs
        combined[`${chain}_manual`] = address;
      }
    });

    return combined;
  };

  // Close wallet dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showWalletDropdown &&
        !event.target.closest(".wallet-dropdown-container")
      ) {
        setWalletDropdownClosing(true);
        setTimeout(() => {
          setShowWalletDropdown(false);
          setWalletDropdownClosing(false);
        }, 200);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showWalletDropdown]);

  if (!wallet) {
    return <WalletConnect onConnect={handleWalletConnect} error={error} />;
  }

  // Removed gating logic, access is granted if wallet is connected.
  // The "Access Denied" view is removed.

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-title-container">
          <img src="/favicon.svg" alt="Logo" className="app-logo" />
          <div className="app-title">
            <div className="title-main">NFTHUB</div>
            <div className="title-sub">COSMOS</div>
          </div>
        </div>
        <div className="wallet-info">
          <button
            onClick={() => {
              if (showTokens) {
                setTokenBalancesClosing(true);
                setTimeout(() => {
                  setShowTokens(false);
                  setTokenBalancesClosing(false);
                }, 250);
              } else {
                setShowTokens(true);
              }
            }}
            className="tokens-btn mobile-only"
            disabled={
              Object.keys(tokenBalances).length === 0 ||
              Object.keys(tokenPrices).length === 0
            }
          >
            Portfolio
          </button>
          <div className="wallet-dropdown-container">
            <button
              onClick={() => {
                if (showWalletDropdown) {
                  setWalletDropdownClosing(true);
                  setTimeout(() => {
                    setShowWalletDropdown(false);
                    setWalletDropdownClosing(false);
                  }, 200);
                } else {
                  setShowWalletDropdown(true);
                }
              }}
              className="wallet-btn"
            >
              {wallet.name}
            </button>

            {(showWalletDropdown || walletDropdownClosing) && (
              <div
                className={`wallet-dropdown ${showWalletDropdown && !walletDropdownClosing ? "visible" : ""} ${walletDropdownClosing ? "closing" : ""}`}
              >
                <div className="dropdown-header">
                  <h4>Connected Addresses</h4>
                </div>

                <div
                  className={`addresses-list ${scrollState.isScrollable ? "scrollable" : ""} ${scrollState.canScrollUp ? "can-scroll-up" : ""} ${scrollState.canScrollDown ? "can-scroll-down" : ""}`}
                  onScroll={handleAddressListScroll}
                  ref={(el) => {
                    if (el && showWalletDropdown) {
                      // Check scroll state when dropdown opens
                      setTimeout(() => checkScrollState(el), 100);
                    }
                  }}
                >
                  <div className="address-category">
                    <div className="category-title">Connected Wallet</div>
                    {Object.entries(addresses).map(([chain, address]) => (
                      <div key={chain} className="address-item connected">
                        <div className="address-details">
                          <div className="chain-label">
                            {chain.toUpperCase()}
                          </div>
                          <div className="address-value">
                            {formatAddress(address)}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(address);
                          }}
                          className={`copy-address-btn ${copiedAddress === address ? "copied" : ""}`}
                          title="Copy address"
                        >
                          <Copy size={14} className="copy-icon" />
                          <Check size={14} className="check-icon" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {Object.keys(manualAddresses).length > 0 && (
                    <div className="address-category">
                      <div className="category-title">Manual Addresses</div>
                      {Object.entries(manualAddresses).map(
                        ([chain, address]) => (
                          <div key={chain} className="address-item-container">
                            <div
                              className={`address-item manual ${addressLoading[chain] ? "loading" : ""}`}
                            >
                              <div className="address-details">
                                <div className="chain-label">
                                  {chain.toUpperCase()}
                                </div>
                                <div className="address-value">
                                  {formatAddress(address)}
                                </div>
                              </div>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(address);
                                }}
                                className={`copy-address-btn ${copiedAddress === address ? "copied" : ""}`}
                                title="Copy address"
                              >
                                <Copy size={14} className="copy-icon" />
                                <Check size={14} className="check-icon" />
                              </button>

                              {addressLoading[chain] && (
                                <div className="address-loading">
                                  <div className="spinner"></div>
                                </div>
                              )}

                              {!addressLoading[chain] && (
                                <div
                                  className="remove-overlay"
                                  onClick={() =>
                                    handleRemovalConfirmation(chain)
                                  }
                                >
                                  <Trash2 size={24} />
                                </div>
                              )}
                            </div>

                            {confirmingRemoval === chain && (
                              <div className="removal-confirmation">
                                <div
                                  className="confirmation-backdrop"
                                  onClick={cancelRemoval}
                                ></div>
                                <div className="confirmation-popup">
                                  <p>
                                    Remove address{" "}
                                    <strong>{formatAddress(address)}</strong>?
                                  </p>
                                  <div className="confirmation-buttons">
                                    <button
                                      className="confirm-btn"
                                      onClick={() =>
                                        confirmRemovalAddress(chain)
                                      }
                                    >
                                      Yes
                                    </button>
                                    <button
                                      className="cancel-btn"
                                      onClick={cancelRemoval}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </div>

                <div className="dropdown-actions">
                  <button
                    onClick={() =>
                      setShowManualAddressForm(!showManualAddressForm)
                    }
                    className={`add-address-btn ${isFetchingNFTs ? "disabled" : ""}`}
                    disabled={isFetchingNFTs}
                  >
                    {isFetchingNFTs
                      ? "Fetching NFTs..."
                      : "Add Address Manually"}
                  </button>

                  <button
                    onClick={handleDisconnect}
                    className="disconnect-btn-dropdown"
                  >
                    <span>Disconnect</span>
                  </button>
                </div>

                {showManualAddressForm && (
                  <div className="manual-address-form">
                    <h5>Add Manual Address</h5>
                    <select
                      value={selectedChain}
                      onChange={(e) => setSelectedChain(e.target.value)}
                      className="chain-select"
                    >
                      {Object.keys(CHAIN_CONFIGS)
                        .filter(
                          (chain) => chain !== "akash" && chain !== "mantra",
                        )
                        .map((chain) => (
                          <option key={chain} value={chain}>
                            {chain.toUpperCase()}
                          </option>
                        ))}
                    </select>
                    <input
                      type="text"
                      value={manualAddress}
                      onChange={(e) => setManualAddress(e.target.value)}
                      placeholder="Paste address here..."
                      className="address-input"
                    />
                    {error && <div className="error-message">{error}</div>}
                    <div className="form-actions">
                      <button
                        onClick={handleAddManualAddress}
                        className="add-btn"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => setShowManualAddressForm(false)}
                        className="cancel-btn"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {(showTokens || tokenBalancesClosing) && !isFetchingNFTs && (
        <div
          className={`token-balances ${showTokens && !tokenBalancesClosing ? "visible" : ""} ${tokenBalancesClosing ? "closing" : ""}`}
        >
          <div className="token-balances-header">
            <h3>Portfolio</h3>
            <div className="total-value">
              Total: $
              {Object.entries(tokenBalances)
                .reduce((total, [chain, balance]) => {
                  if (!balance || !balance.amount) return total;
                  const decimals = balance.decimals || 6;
                  const amount =
                    parseFloat(balance.amount) / Math.pow(10, decimals);
                  const price = tokenPrices[chain] || 0;
                  return total + amount * price;
                }, 0)
                .toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
            </div>
          </div>
          <div className="balances-grid">
            {Object.entries(tokenBalances).map(([chain, balance]) => {
              if (!balance || !balance.amount) return null;
              const decimals = balance.decimals || 6;
              const amount =
                parseFloat(balance.amount) / Math.pow(10, decimals);
              const price = tokenPrices[chain] || 0;
              const usdValue = amount * price;

              return (
                <div key={chain} className="balance-card">
                  <div className="balance-header">
                    <div className="token-info">
                      <img
                        src={TOKEN_LOGOS[chain]}
                        alt={balance.symbol}
                        className="token-logo"
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                      <div className="token-details">
                        <span className="token-symbol">{balance.symbol}</span>
                        <span className="chain-name">{chain}</span>
                      </div>
                    </div>
                    {price > 0 && (
                      <div className="token-price">
                        $
                        {price.toLocaleString(undefined, {
                          minimumFractionDigits: 4,
                          maximumFractionDigits: 4,
                        })}
                      </div>
                    )}
                  </div>
                  <div className="balance-content">
                    <div className="balance-amount">
                      {amount.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}
                    </div>
                    {price > 0 && (
                      <div className="usd-value">
                        $
                        {usdValue.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Desktop Token Balances Display */}

        {Object.keys(tokenBalances).length > 0 &&
          Object.keys(tokenPrices).length > 0 && 
          !isFetchingNFTs && (
            <div className="desktop-token-balances">
            <div className="token-summary">
              <div className="token-summary-list">
                {/* Render tokens in specific order: Mantra, Akash, Osmosis, Cosmos, Initia, then others */}
                {[
                  "mantra",
                  "akash",
                  "osmosis",
                  "cosmoshub",
                  "initia",
                  "stargaze",
                  "neutron",
                  "injective",
                ]
                  .filter(
                    (chain) =>
                      tokenBalances[chain] && tokenBalances[chain].amount,
                  )
                  .map((chain) => {
                    const balance = tokenBalances[chain];
                    const decimals = balance.decimals || 6;
                    const amount =
                      parseFloat(balance.amount) / Math.pow(10, decimals);
                    const price = tokenPrices[chain] || 0;
                    const usdValue = amount * price;

                    return (
                      <div key={chain} className="token-summary-item">
                        <img
                          src={TOKEN_LOGOS[chain]}
                          alt={balance.symbol}
                          className="token-summary-logo"
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                        <span className="token-summary-symbol">
                          {balance.symbol}
                        </span>
                        <span className="token-summary-amount">
                          {amount.toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })}
                        </span>
                        {price > 0 && (
                          <span className="token-summary-value">
                            $
                            {usdValue.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        )}
                        <div className="token-summary-tooltip">
                          <div className="tooltip-content">
                            <img
                              src={TOKEN_LOGOS[chain]}
                              alt={balance.symbol}
                              className="tooltip-logo"
                              onError={(e) => {
                                e.target.style.display = "none";
                              }}
                            />
                            <div className="tooltip-info">
                              <span className="tooltip-symbol">
                                {balance.symbol}
                              </span>
                              <span className="tooltip-price">
                                {price > 0
                                  ? `$${price.toLocaleString(undefined, {
                                      minimumFractionDigits: 4,
                                      maximumFractionDigits: 4,
                                    })}`
                                  : "Price loading..."}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
              <div className="token-summary-total">
                $
                {Object.entries(tokenBalances)
                  .reduce((total, [chain, balance]) => {
                    if (!balance || !balance.amount) return total;
                    const decimals = balance.decimals || 6;
                    const amount =
                      parseFloat(balance.amount) / Math.pow(10, decimals);
                    const price = tokenPrices[chain] || 0;
                    return total + amount * price;
                  }, 0)
                  .toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
              </div>
            </div>
              </div>
          )}


      

      {wallet && Object.keys(tokenBalances).length > 0 && (
        <NFTDashboard
          addresses={getAllAddresses()}
          onAddressFetched={clearAddressLoading}
          bosmoPrice={bosmoPrice}
          initPrice={initPrice}
          binjPrice={binjPrice}
          onManualAddressRemoved={handleManualAddressRemoved}
          onFetchStatusChange={(isFetching) => {
            // Only allow setting to false after initial load, never back to true
            if (!isFetching || !hasCompletedInitialLoad) {
              setIsFetchingNFTs(isFetching);
              if (!isFetching && !hasCompletedInitialLoad) {
                setHasCompletedInitialLoad(true);
              }
            }
          }}
          
        />
      )}
    </div>
  );
}