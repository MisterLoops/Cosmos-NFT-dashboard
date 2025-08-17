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
  IBC_TOKEN_MAPPINGS
} from "./utils/constants.js";

// Enhanced Portfolio Display Component for Mobile
const ChainBasedPortfolio = ({ chainBalances, showTokens, tokenBalancesClosing }) => {
  // Calculate total portfolio value
  const totalPortfolioValue = Object.values(chainBalances).reduce(
    (total, chainData) => total + (chainData.totalValue || 0),
    0
  );

  // Filter out chains with no assets
  const chainsWithAssets = Object.entries(chainBalances)
    .filter(([_, chainData]) => chainData.assets && chainData.assets.length > 0)
    .sort(([, a], [, b]) => b.totalValue - a.totalValue); // Sort by total value descending

  return (
    <div
      className={`token-balances ${showTokens && !tokenBalancesClosing ? "visible" : ""} ${tokenBalancesClosing ? "closing" : ""}`}
    >
      <div className="token-balances-header">
        <h3>Portfolio</h3>
        <div className="total-value">
          Total: ${totalPortfolioValue.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </div>
      </div>
      <div className="balances-grid">
        {chainsWithAssets.map(([chainName, chainData]) => (
          <ChainBalanceCard
            key={chainName}
            chainName={chainName}
            chainData={chainData}
            chainConfig={CHAIN_CONFIGS[chainName]}
          />
        ))}
      </div>
    </div>
  );
};

// Chain-based balance card component for Mobile
const ChainBalanceCard = ({ chainName, chainData, chainConfig }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const hasAssets = chainData.assets && chainData.assets.length > 0;

  if (!hasAssets) return null;

  // Get the native asset for price display
  const nativeAsset = chainData.assets.find(asset => asset.isNative);
  // Get non-native assets for the tooltip
  const assets = chainData.assets.filter(asset => !asset.isNative);

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowTooltip(false);
    };

    if (showTooltip) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showTooltip]);

  return (
    <div
      className={`balance-card ${showTooltip ? 'tooltip-active' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        setShowTooltip(!showTooltip);
      }}
    >
      {/* Default view: Logo, Chain name, Total value */}
      <div className="balance-header">
        <div className="token-info">
          <img
            src={TOKEN_LOGOS[chainName]}
            alt={chainConfig?.displayName || chainName}
            className="token-logo"
            onError={(e) => e.target.style.display = "none"}
          />
          <div className="token-details">
            <span className="chain-name">{chainName.toUpperCase()}</span>
          </div>
        </div>
      </div>

      <div className="balance-content">
        <div className="usd-value">
          ${chainData.totalValue.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </div>
      </div>

      {/* Expanded tooltip view */}
      {showTooltip && (
        <div className="chain-tooltip">
          {/* Native token price as title */}
          {nativeAsset && (
            <div className="tooltip-header">
              <img
                src={TOKEN_LOGOS[chainName]}
                alt={nativeAsset.symbol}
                className="tooltip-chain-logo"
                onError={(e) => e.target.style.display = "none"}
              />
              <div className="asset-details">
                <span className="asset-symbol">{nativeAsset.symbol}</span>
                <span className="asset-amount">
                  {nativeAsset.formattedAmount.toLocaleString(undefined, {
                    maximumFractionDigits: nativeAsset.formattedAmount < 1 ? 6 : 2,
                  })}
                </span>
              </div>
              <span className="asset-value">
                ${nativeAsset.value.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          )}

          {/* Non-native assets list */}
          {assets.length > 0 && (
            <div className="tooltip-assets">
              {assets.map((asset, index) => (
                <div key={index} className="tooltip-asset">
                  <div className="asset-info">
                    <img
                      src={TOKEN_LOGOS[asset.originChain] || TOKEN_LOGOS[chainName]}
                      alt={asset.symbol}
                      className="asset-logo"
                      onError={(e) => e.target.style.display = "none"}
                    />
                    <div className="asset-details">
                      <span className="asset-symbol">{asset.symbol}</span>
                      <span className="asset-amount">
                        {asset.formattedAmount.toLocaleString(undefined, {
                          maximumFractionDigits: asset.formattedAmount < 1 ? 6 : 2,
                        })}
                      </span>
                    </div>
                    <span className="asset-value">
                      ${asset.value.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Desktop Chain-Based Portfolio Summary
const DesktopChainPortfolio = ({ chainBalances }) => {
  const [activeTooltip, setActiveTooltip] = useState(null);

  // Calculate total portfolio value
  const totalPortfolioValue = Object.values(chainBalances).reduce(
    (total, chainData) => total + (chainData.totalValue || 0),
    0
  );

  // Filter and sort chains with assets
  const chainsWithAssets = Object.entries(chainBalances)
    .filter(([_, chainData]) => chainData.assets && chainData.assets.length > 0)
    .sort(([, a], [, b]) => b.totalValue - a.totalValue);

  // Render in specific order: Mantra, Akash, Osmosis, Cosmos, Initia, then others
  const preferredOrder = ["mantra", "akash", "osmosis", "cosmoshub", "initia", "stargaze", "neutron", "injective"];
  const orderedChains = [];
  const otherChains = [];

  chainsWithAssets.forEach(([chainName, chainData]) => {
    const index = preferredOrder.indexOf(chainName);
    if (index !== -1) {
      orderedChains[index] = [chainName, chainData];
    } else {
      otherChains.push([chainName, chainData]);
    }
  });

  // Filter out undefined values and combine with other chains
  const finalOrder = [...orderedChains.filter(Boolean), ...otherChains];

  return (
    <div className="desktop-token-balances">
      <div className="token-summary">
        <div className="token-summary-list">
          {finalOrder.map(([chainName, chainData]) => {
            const nativeAsset = chainData.assets.find(asset => asset.isNative);
            const assets = chainData.assets;
            const isTooltipActive = activeTooltip === chainName;

            return (
              <div
                key={chainName}
                className="token-summary-item"
                onMouseEnter={() => setActiveTooltip(chainName)}
                onMouseLeave={() => setActiveTooltip(null)}
              >
                {/* Default view: Logo, Chain name, Total value */}
                <img
                  src={TOKEN_LOGOS[chainName]}
                  alt={chainName}
                  className="token-summary-logo"
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
                <span className="token-summary-symbol">
                  {chainName.toUpperCase()}
                </span>
                <span className="token-summary-value">
                  ${chainData.totalValue.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>

                {/* Tooltip with native price and non-native assets */}
                {isTooltipActive && (
                  <div className="token-summary-tooltip">
                    <div className="tooltip-content">
                      {/* Native token price as title */}
                      {nativeAsset && (
                        <div className="tooltip-native-section">
                          <img
                            src={TOKEN_LOGOS[chainName]}
                            alt={nativeAsset.symbol}
                            className="tooltip-logo"
                            onError={(e) => {
                              e.target.style.display = "none";
                            }}
                          />
                          <div className="tooltip-info">
                            <span className="tooltip-symbol">
                              {nativeAsset.symbol}
                            </span>
                            <span className="tooltip-price">
                              ${nativeAsset.price.toLocaleString(undefined, {
                                minimumFractionDigits: nativeAsset.price < 1 ? 4 : 2,
                                maximumFractionDigits: nativeAsset.price < 1 ? 4 : 2,
                              })}
                            </span>
                          </div>

                        </div>
                      )}

                      {/* Non-native assets breakdown */}
                      {assets.length > 0 && (
                        <div className="tooltip-assets-breakdown">
                          {assets.map((asset, index) => (
                            <div key={index} className="tooltip-asset-line">
                              <div className="asset-line-info">
                                <img
                                  src={TOKEN_LOGOS[asset.originChain] || TOKEN_LOGOS[chainName]}
                                  alt={asset.symbol}
                                  className="asset-line-logo"
                                  onError={(e) => e.target.style.display = "none"}
                                />
                                <span className="asset-line-symbol">{asset.symbol}</span>
                                <span className="asset-line-amount">
                                  {asset.formattedAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                </span>
                              </div>
                              <span className="asset-line-value">
                                ${asset.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="token-summary-total">
          ${totalPortfolioValue.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [wallet, setWallet] = useState(null);
  const [addresses, setAddresses] = useState({});
  const [hasAccess, setHasAccess] = useState(false);
  const [error, setError] = useState("");
  const [showTokens, setShowTokens] = useState(false);
  const [tokenBalancesClosing, setTokenBalancesClosing] = useState(false);
  const [tokenBalances, setTokenBalances] = useState({});
  const [chainBalances, setChainBalances] = useState({});
  const [assetPrices, setAssetPrices] = useState({});
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

  const fetchAllChainBalances = async (addresses) => {
    const chainBalances = {}; // Structure: { chainName: { assets: [...], totalValue: 0 } }

    const balancePromises = Object.entries(addresses).map(
      async ([chainName, address]) => {
        if (CHAIN_ENDPOINTS[chainName]) {
          try {
            const endpoint = CHAIN_ENDPOINTS[chainName];
            const url = `${endpoint.rest}/cosmos/bank/v1beta1/balances/${address}`;

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

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
              console.log(`All balances for ${chainName}:`, data);

              const assets = [];

              if (data.balances && Array.isArray(data.balances)) {
                // Process all token balances
                data.balances.forEach(balance => {
                  const denom = balance.denom;
                  const amount = balance.amount;

                  // Skip zero balances
                  if (!amount || amount === '0') return;

                  // Check native token
                  if (denom === endpoint.denom) {
                    assets.push({
                      symbol: endpoint.symbol,
                      amount: amount,
                      denom: denom,
                      decimals: endpoint.decimals,
                      isNative: true,
                      originChain: chainName,
                    });
                  } else {
                    // Check IBC tokens
                    const tokenInfo = IBC_TOKEN_MAPPINGS[denom];
                    if (tokenInfo) {
                      assets.push({
                        symbol: tokenInfo.symbol,
                        amount: amount,
                        denom: denom,
                        decimals: tokenInfo.decimals,
                        isNative: false,
                        originChain: tokenInfo.originChain,
                      });
                    }
                  }
                });
              }

              return [chainName, { assets, totalValue: 0 }];
            } else {
              console.warn(`Failed to fetch balances for ${chainName}: ${response.status}`);
              return [chainName, { assets: [], totalValue: 0 }];
            }
          } catch (error) {
            console.error(`Error fetching balances for ${chainName}:`, error);
            return [chainName, { assets: [], totalValue: 0 }];
          }
        }
        return [chainName, { assets: [], totalValue: 0 }];
      },
    );

    const results = await Promise.all(balancePromises);

    results.forEach(([chainName, chainData]) => {
      chainBalances[chainName] = chainData;
    });

    return chainBalances;
  };

  const fetchAllAssetPrices = async () => {
    console.log("[DEBUG] Fetching prices for all supported assets");
    const prices = {};

    // Symbol to CoinGecko ID mapping
    const symbolToCoinGeckoId = {
      'OSMO': 'osmosis',
      'STARS': 'stargaze',
      'ATOM': 'cosmos',
      'INJ': 'injective-protocol',
      'INIT': 'initia',
      'NTRN': 'neutron-3',
      'OM': 'mantra-dao',
      'AKT': 'akash-network',
      'TIA': 'celestia',
      'BTC': 'bitcoin',
      'USDC': 'usd-coin'
    };

    const coingeckoIds = Object.values(symbolToCoinGeckoId)
      .join(',');

    if (coingeckoIds) {
      try {
        console.log("[DEBUG] Fetching from CoinGecko:", coingeckoIds);
        const coingeckoResponse = await fetch(
          `${API_ENDPOINTS.COINGECKO_SIMPLE_PRICE}?ids=${coingeckoIds}&vs_currencies=usd`,
        );

        if (coingeckoResponse.ok) {
          const coingeckoData = await coingeckoResponse.json();
          console.log("[DEBUG] CoinGecko response:", coingeckoData);

          // Map prices back to symbols
          Object.entries(symbolToCoinGeckoId).forEach(([symbol, coingeckoId]) => {
            if (coingeckoData[coingeckoId]?.usd) {
              prices[symbol] = coingeckoData[coingeckoId].usd;
              console.log(`[DEBUG] Set price for ${symbol}: $${prices[symbol]}`);
            }
          });
        } else {
          console.warn("[WARNING] Failed to fetch prices from CoinGecko:", coingeckoResponse.status);
        }
      } catch (error) {
        console.error("[ERROR] Error fetching prices from CoinGecko:", error);
      }
    }

    // Fallback prices for missing tokens
    const fallbackPrices = {
      'OSMO': 0.5,
      'STARS': 0.02,
      'ATOM': 11.5,
      'INJ': 25.0,
      'INIT': 0.43,
      'NTRN': 0.4,
      'OM': 3.8,
      'AKT': 3.2,
      'TIA': 5.5,
      'BTC': 95000,
      'USDC': 1.0
    };

    // Apply fallbacks for missing prices
    Object.entries(fallbackPrices).forEach(([symbol, fallbackPrice]) => {
      if (!prices[symbol] || prices[symbol] === 0) {
        prices[symbol] = fallbackPrice;
        console.log(`[DEBUG] Applied fallback price for ${symbol}: $${fallbackPrice}`);
      }
    });
    
    if (bosmoPrice) {
      prices['bOSMO'] = bosmoPrice;
    }
    if (binjPrice) {
      prices['bINJ'] = binjPrice;
    }
    return prices;
  };

  const calculateChainValues = (chainBalances, assetPrices) => {
    const updatedChainBalances = { ...chainBalances };

    Object.entries(updatedChainBalances).forEach(([chainName, chainData]) => {
      let totalValue = 0;

      chainData.assets.forEach(asset => {
        const decimals = asset.decimals || 6;
        const amount = parseFloat(asset.amount) / Math.pow(10, decimals);
        const price = assetPrices[asset.symbol] || 0;
        const value = amount * price;

        asset.formattedAmount = amount;
        asset.price = price;
        asset.value = value;

        totalValue += value;
      });

      chainData.totalValue = totalValue;

      // Sort assets by value (highest first)
      chainData.assets.sort((a, b) => b.value - a.value);
    });

    return updatedChainBalances;
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
    try {
      // Fetch all chain balances
      const allChainBalances = await fetchAllChainBalances(addresses);

      // Fetch all asset prices
      const allAssetPrices = await fetchAllAssetPrices();

      // Calculate values for each chain
      const balancesWithValues = calculateChainValues(allChainBalances, allAssetPrices);

      setChainBalances(balancesWithValues);
      setAssetPrices(allAssetPrices);

      // Maintain backward compatibility for existing code
      const legacyBalances = {};
      const legacyPrices = {};

      Object.entries(balancesWithValues).forEach(([chainName, chainData]) => {
        const nativeAsset = chainData.assets.find(asset => asset.isNative);
        if (nativeAsset) {
          legacyBalances[chainName] = {
            amount: nativeAsset.amount,
            denom: nativeAsset.denom,
            symbol: nativeAsset.symbol,
            decimals: nativeAsset.decimals,
          };
          legacyPrices[chainName] = nativeAsset.price;
        }
      });

      setTokenBalances(legacyBalances);
      setTokenPrices(legacyPrices);

    } catch (error) {
      console.error('Error fetching token balances:', error);
    }
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
    setChainBalances({});
    setAssetPrices({});
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
      {hasCompletedInitialLoad && (<header className="app-header">
        <div className="app-title-container">
          <img src="/cosmosNFTHUBlogo.png" alt="Logo" className="app-logo" />
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
            disabled={Object.keys(chainBalances).length === 0}
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
      </header>)}

      {/* Mobile Chain-Based Portfolio */}
      {(showTokens || tokenBalancesClosing) && !isFetchingNFTs && (
        <ChainBasedPortfolio
          chainBalances={chainBalances}
          showTokens={showTokens}
          tokenBalancesClosing={tokenBalancesClosing}
        />
      )}

      {/* Desktop Chain-Based Portfolio */}
      {Object.keys(chainBalances).length > 0 && !isFetchingNFTs && (
        <DesktopChainPortfolio chainBalances={chainBalances} />
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