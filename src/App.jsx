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
  IBC_TOKEN_MAPPINGS,
  REQUEST_CONFIG,
  SYMBOL_TO_LOGO,
  MARKETPLACES
} from "./utils/constants.js";

// Enhanced Portfolio Display Component for Mobile
const ChainBasedPortfolio = ({ chainBalances, showTokens, tokenBalancesClosing, nftOffers }) => {
  const [showOffersCard, setShowOffersCard] = useState(false);
  
  // Calculate total portfolio value
  const totalPortfolioValue = Object.values(chainBalances).reduce(
    (total, chainData) => total + (chainData.totalValue || 0),
    0
  );

  // Calculate total offers value - with better error handling
  const totalOffersValue = nftOffers?.offers_total_value_usd || 0;

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

      {/* Offers Tab Button */}
      {totalOffersValue > 0 && (
        <div className="offers-tab-container">
          <button 
            className={`offers-tab-btn ${showOffersCard ? 'active' : ''}`}
            onClick={() => setShowOffersCard(!showOffersCard)}
          >
            <span className="offers-tab-text">Offers</span>
            <span className="offers-tab-value">
              ${totalOffersValue.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })} in offers
            </span>
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg" 
              className={`offers-tab-arrow ${showOffersCard ? 'rotated' : ''}`}
            >
              <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      )}

      <div className="balances-grid">
        {/* NFT Offers Card - shown at top when active */}
        {showOffersCard && totalOffersValue > 0 && (
          <NFTOffersCard nftOffers={nftOffers} totalOffersValue={totalOffersValue} />
        )}

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

// NFT Offers Card component for Mobile - styled differently
const NFTOffersCard = ({ nftOffers, totalOffersValue }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  // Platform logo mapping
  const platformLogos = {
    Stargaze: '/Stargaze.svg',
    Superbolt: '/Superbolt.png',
    "Backbonelabs Injective": '/BackBoneLabs.png',
    "Backbonelabs Osmosis": '/BackBoneLabs.png',
    Intergaze: '/Intergaze.png'
  };

  // Get platforms data and sort by value
  const platformsData = Object.entries(nftOffers)
    .filter(([key]) => key !== 'offers_total_value_usd')
    .map(([platform, platformData]) => ({
      platform,
      ...platformData
    }))
    .sort((a, b) => b.offers_total_platform_value_usd - a.offers_total_platform_value_usd);

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
      className={`balance-card nft-offers-card ${showTooltip ? 'tooltip-active' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        setShowTooltip(!showTooltip);
      }}
    >
      {/* Default view: NFT icon, "NFT Offers", Total value */}
      <div className="balance-header">
        <div className="token-info">
          <div className="token-details">
            <span className="chain-name">NFT OFFERS</span>
            <span className="offers-count">{platformsData.reduce((sum, p) => sum + p.offers.length, 0)} active offers</span>
          </div>
        </div>
      </div>

      <div className="balance-content">
        <div className="usd-value offers-total-value">
          ${totalOffersValue.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </div>
      </div>

      {/* Expanded tooltip view */}
      {showTooltip && (
        <div className="chain-tooltip nft-offers-tooltip">
          <div className="tooltip-header">
            <div className="asset-details">
              <span className="asset-symbol">Active NFT Offers</span>
              <span className="asset-amount">{platformsData.length} platform{platformsData.length !== 1 ? 's' : ''}</span>
            </div>
          </div>

          {/* Platforms list */}
          <div className="tooltip-assets">
            {platformsData.map((platformData, index) => (
              <div key={index} className="tooltip-asset platform-section">
                <div className="asset-info platform-header-mobile">
                  <img
                    src={platformLogos[platformData.platform]}
                    alt={platformData.platform}
                    className="asset-logo"
                    onError={(e) => e.target.style.display = "none"}
                  />
                  <div className="asset-details">
                    <span className="asset-symbol">{platformData.platform}</span>
                    <span className="asset-amount">{platformData.offers.length} offer{platformData.offers.length !== 1 ? 's' : ''}</span>
                  </div>
                  <span className="asset-value">
                    ${platformData.offers_total_platform_value_usd.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                
                {/* Individual offers */}
                <div className="platform-offers-mobile">
                  {platformData.offers.map((offer, offerIndex) => (
                    <div
                      key={offerIndex}
                      className="mobile-offer-item"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (offer.link) {
                          window.open(offer.link, '_blank');
                        }
                      }}
                    >
                      <div className="offer-collection-mobile">
                        {offer.collection.image && (
                          <img
                            src={offer.collection.image}
                            alt={offer.collection.name}
                            className="collection-image-small"
                            onError={(e) => e.target.style.display = "none"}
                          />
                        )}
                        <span className="collection-name-mobile">{offer.collection.name}</span>
                      </div>
                      <div className="offer-amount-mobile">
                        <div className="offer-token-info">
                          <span className="offer-amount-text">
                            {offer.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })} {offer.symbol}
                          </span>
                          <img
                            src={TOKEN_LOGOS[SYMBOL_TO_LOGO[offer.symbol]]}
                            alt={offer.symbol}
                            className="token-logo-tiny"
                            onError={(e) => e.target.style.display = "none"}
                          />
                        </div>
                        <span className="offer-usd-mobile">
                          ${offer.amount_usd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Chain-based balance card component for Mobile (unchanged)
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
                  {(() => {
                    const amount = nativeAsset.formattedAmount;
                    if (amount === 0) return "0";
                    if (amount < 0.00001) return amount.toExponential(2);
                    if (amount < 0.01) return amount.toFixed(4);
                    if (amount < 1) return amount.toFixed(2);
                    return amount.toLocaleString(undefined, { maximumFractionDigits: 2 });
                  })()}
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
                        {(() => {
                          const amount = asset.formattedAmount;
                          if (amount === 0) return "0";
                          if (amount < 0.00001) return amount.toExponential(2);
                          if (amount < 0.01) return amount.toFixed(4);
                          if (amount < 1) return amount.toFixed(2);
                          return amount.toLocaleString(undefined, { maximumFractionDigits: 2 });
                        })()}
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
const DesktopChainPortfolio = ({ chainBalances, showDollarBalances, setShowDollarBalances, nftOffers }) => {
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [showOffersExpanded, setShowOffersExpanded] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Calculate total portfolio value
  const totalPortfolioValue = Object.values(chainBalances).reduce(
    (total, chainData) => total + (chainData.totalValue || 0),
    0
  );

  // Calculate total offers value
  const totalOffersValue = nftOffers?.offers_total_value_usd || 0;

  // Platform logo mapping
  const platformLogos = {
    Stargaze: '/Stargaze.svg',
    Superbolt: '/Superbolt.png',
    "Backbonelabs Injective": '/BackBoneLabs.png',
    "Backbonelabs Osmosis": '/BackBoneLabs.png',
    Intergaze: '/Intergaze.png'
  };

  // Handle tooltip positioning
  const handleMouseEnter = (chainName, event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.bottom + 10
    });
    setActiveTooltip(chainName);
  };

  // Filter and sort chains with assets
  const chainsWithAssets = Object.entries(chainBalances)
    .filter(([_, chainData]) => chainData.assets && chainData.assets.length > 0)
    .sort(([, a], [, b]) => b.totalValue - a.totalValue);

  // Render in specific order
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

  const finalOrder = [...orderedChains.filter(Boolean), ...otherChains];

  return (
    <div className={`desktop-token-balances ${showOffersExpanded ? 'expanded' : ''}`}>
      <div className="token-summary">
        <div className="token-summary-list">
          {finalOrder.map(([chainName, chainData]) => {
            const nativeAsset = chainData.assets.find(asset => asset.isNative);
            const assets = chainData.assets;

            return (
              <div
                key={chainName}
                className="token-summary-item"
                onMouseEnter={(e) => handleMouseEnter(chainName, e)}
                onMouseLeave={() => setActiveTooltip(null)}
              >
                <div>
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
                </div>
                <div>
                  <span className="token-summary-value">
                    {showDollarBalances ? (
                      `$${chainData.totalValue.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}`
                    ) : (
                      "******"
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="token-summary-total">
          <span className="token-summary-total-clickable" onClick={() => setShowDollarBalances(!showDollarBalances)}>
            {showDollarBalances ? (
              `$${totalPortfolioValue.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`
            ) : (
              "*****"
            )}
          </span>

          {/* NFT Offers Section */}
          {totalOffersValue > 0 && (
            <div className="offers-section">
              <span
                className="offers-value"
                onClick={() => setShowOffersExpanded(!showOffersExpanded)}
              >
                + ${showDollarBalances ? totalOffersValue.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }) : "*****"} in offers
              </span>
              <div className="offers-toggle-arrow" onClick={() => setShowOffersExpanded(!showOffersExpanded)} style={{ cursor: "pointer" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: "#10b981" }}>
                  <path d={showOffersExpanded ? "M18 15L12 9L6 15" : "M6 9L12 15L18 9"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Expanded Offers Section */}
      {showOffersExpanded && totalOffersValue > 0 && (
        <div className="offers-expanded-section">
          <div className="offers-close-arrow" onClick={() => setShowOffersExpanded(false)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: "#10b981" }}>
              <path d="M18 15L12 9L6 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="offers-expanded-content">
            <h4>Your active NFT Offers</h4>

            {/* Platform breakdown */}
            <div className="offers-platforms">
              {Object.entries(nftOffers).filter(([key]) => key !== 'offers_total_value_usd').map(([platform, platformData]) => (
                <div key={platform} className="offers-platform">
                  <div className="platform-header">
                    <div className="platform-info">
                      <img
                        src={platformLogos[platform]}
                        alt={platform}
                        className="platform-logo"
                        onError={(e) => e.target.style.display = "none"}
                      />
                      <span className="platform-name">{platform}</span>
                    </div>
                    <span className="platform-total">
                      ${platformData.offers_total_platform_value_usd.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>

                  {/* Individual offers */}
                  <div className="platform-offers">
                    {platformData.offers.map((offer, index) => (
                      <div
                        key={index}
                        className="offer-item"
                        onClick={() => offer.link && window.open(offer.link, '_blank')}
                        style={{ cursor: offer.link ? 'pointer' : 'default' }}
                      >
                        <div className="offer-collection">
                          {offer.collection.image && (
                            <img
                              src={offer.collection.image}
                              alt={offer.collection.name}
                              className="collection-image"
                              onError={(e) => e.target.style.display = "none"}
                            />
                          )}
                          <span className="collection-name">{offer.collection.name}</span>
                        </div>
                        <div className="offer-details">
                          <div className="offer-amount-section">
                            <span className="offer-amount">
                              {offer.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })} {offer.symbol}
                            </span>
                            <img
                              src={TOKEN_LOGOS[SYMBOL_TO_LOGO[offer.symbol]]}
                              alt={offer.symbol}
                              className="token-logo-small"
                              onError={(e) => e.target.style.display = "none"}
                            />
                          </div>
                        </div>
                        <span className="offer-usd">
                          ${offer.amount_usd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tooltips rendered with fixed positioning */}
      {activeTooltip && (
        <div
          className="token-summary-tooltip"
          style={{
            position: 'fixed',
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            transform: 'translateX(-50%)',
            zIndex: 9999,
            pointerEvents: 'none',
            background: "rgba(30, 30, 47, 0.95)",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            borderRadius: "8px",
            padding: "1rem",
            backdropFilter: "blur(15px)",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
            minWidth: "200px",
            whiteSpace: "nowrap",
            padding: "1rem"
          }}
        >
          {(() => {
            const chainData = finalOrder.find(([chainName]) => chainName === activeTooltip)?.[1];
            if (!chainData) return null;

            const nativeAsset = chainData.assets.find(asset => asset.isNative);
            const assets = chainData.assets;

            return (
              <div className="tooltip-content">
                {nativeAsset && (
                  <div className="tooltip-native-section">
                    <img
                      src={TOKEN_LOGOS[activeTooltip]}
                      alt={nativeAsset.symbol}
                      className="tooltip-logo"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                    <div className="tooltip-info">
                      <span className="tooltip-symbol">
                        1 {nativeAsset.symbol}
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

                {assets.length > 0 && (
                  <div className="tooltip-assets-breakdown">
                    {assets.map((asset, index) => (
                      <div key={index} className="tooltip-asset-line">
                        <div className="asset-line-info">
                          <img
                            src={TOKEN_LOGOS[asset.originChain] || TOKEN_LOGOS[activeTooltip]}
                            alt={asset.symbol}
                            className="asset-line-logo"
                            onError={(e) => e.target.style.display = "none"}
                          />
                          <span className="asset-line-amount">
                            {(() => {
                              const amount = asset.formattedAmount;
                              if (amount === 0) return "0";
                              if (amount < 0.00001) return amount.toExponential(2);
                              if (amount < 0.01) return amount.toFixed(4);
                              if (amount < 1) return amount.toFixed(2);
                              return amount.toLocaleString(undefined, { maximumFractionDigits: 2 });
                            })()}
                          </span>
                          <span className="asset-line-symbol">{asset.symbol}</span>
                        </div>
                        <span className="asset-line-value">
                          ${asset.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}
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
  const [showDollarBalances, setShowDollarBalances] = useState(true);
  const [assetPrices, setAssetPrices] = useState({});
  const [nftOffers, setNftOffers] = useState({});
  const [offersLoading, setOffersLoading] = useState(false);
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
              // console.log(`All balances for ${chainName}:`, data);

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
    // console.log("[DEBUG] Fetching prices for all supported assets");
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
        // console.log("[DEBUG] Fetching from CoinGecko:", coingeckoIds);
        const coingeckoResponse = await fetch(
          `${API_ENDPOINTS.COINGECKO_SIMPLE_PRICE}?ids=${coingeckoIds}&vs_currencies=usd`,
        );

        if (coingeckoResponse.ok) {
          const coingeckoData = await coingeckoResponse.json();
          // console.log("[DEBUG] CoinGecko response:", coingeckoData);

          // Map prices back to symbols
          Object.entries(symbolToCoinGeckoId).forEach(([symbol, coingeckoId]) => {
            if (coingeckoData[coingeckoId]?.usd) {
              prices[symbol] = coingeckoData[coingeckoId].usd;
              // console.log(`[DEBUG] Set price for ${symbol}: $${prices[symbol]}`);
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
        // console.log(`[DEBUG] Applied fallback price for ${symbol}: $${fallbackPrice}`);
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

  async function fetchAllOffers(addresses, allAssetPrices) {
    console.log('🚀 Starting parallel fetches for NFT offers...');
    console.log('📍 Addresses:', addresses);
    console.log('💰 Asset Prices:', allAssetPrices);

    // Assuming these constants are defined elsewhere
    const REQUEST_CONFIG = {
      MAX_RETRIES: 3,
      TIMEOUT: 10000
    };

    // Helper function to handle CORS proxy URL construction
    const buildProxiedUrl = (proxyUrl, targetUrl) => {
      if (proxyUrl.includes("codetabs.com") || proxyUrl.includes("thingproxy.freeboard.io")) {
        return proxyUrl + encodeURIComponent(targetUrl);
      }
      return proxyUrl + targetUrl;
    };

    // Helper function to calculate USD value
    const calculateUsdValue = (amount, symbol, decimals = 6) => {
      const price = allAssetPrices[symbol];
      if (!price) return 0;
      return (parseFloat(amount) / Math.pow(10, decimals)) * price;
    };

    // Helper function for fetching with retry logic and timeout
    const fetchWithRetry = async (url, options = {}, useProxy = false) => {
      const maxRetries = REQUEST_CONFIG.MAX_RETRIES;
      let lastError = null;

      if (!useProxy) {
        // Direct fetch without proxy
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_CONFIG.TIMEOUT);

        try {
          const response = await fetch(url, {
            ...options,
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          return response;
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      }

      // Proxy fetch with retry logic
      for (let retries = 0; retries <= maxRetries; retries++) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), REQUEST_CONFIG.TIMEOUT);

          const proxyUrl = CORS_PROXIES[retries % CORS_PROXIES.length];
          const proxiedUrl = buildProxiedUrl(proxyUrl, url);

          const response = await fetch(proxiedUrl, {
            ...options,
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            return response;
          }

          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        } catch (error) {
          lastError = error;
          console.warn(`❌ Retry ${retries + 1}/${maxRetries + 1} failed:`, error.message);

          if (retries === maxRetries) {
            throw lastError;
          }
        }
      }
    };

    // Fetch 1: Stargaze Wallet Name
    const fetchWalletName = async () => {
      console.log('🔍 Fetch 1: Getting wallet name from Stargaze...');
      try {
        const response = await fetchWithRetry(API_ENDPOINTS.STARGAZE_GRAPHQL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `query ExampleQuery($address: String!) {
            wallet(address: $address) {
              name {
                name
              }
            }
          }`,
            variables: { address: addresses.stargaze }
          })
        }, false); // Direct fetch, no proxy needed for Stargaze

        const data = await response.json();
        console.log('✅ Fetch 1 response:', data);

        if (data.data?.wallet?.name?.name) {
          setWallet(prev => ({ ...prev, name: data.data.wallet.name.name }));
        }
        return data;
      } catch (error) {
        console.error('❌ Fetch 1 error:', error);
        return null;
      }
    };

    // Fetch 2: Stargaze Offers
    const fetchStargazeOffers = async () => {
      console.log('🔍 Fetch 2: Getting Stargaze offers...');
      try {
        const response = await fetchWithRetry(API_ENDPOINTS.STARGAZE_GRAPHQL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `query ExampleQuery($fromAddr: String) {
            offers(fromAddr: $fromAddr) {
              offers {
                collection {
                  contractAddress
                  name
                  media {
                    visualAssets {
                      xs {
                        url
                      }
                    }
                  }
                }
                offerPrice {
                  amount
                  amountUsd
                  denom
                  exponent
                  symbol
                }
                tokenId
                token {
                imageUrl
                name
                }
                type
              }
            }
          }`,
            variables: { fromAddr: addresses.stargaze }
          })
        }, false); // Direct fetch, no proxy needed for Stargaze

        const data = await response.json();
        console.log('✅ Fetch 2 response:', data);

        return {
          platform: 'Stargaze',
          offers: data.data?.offers?.offers?.map(offer => {
            // Handle image URL with IPFS check
            const getImageUrl = (imageUrl) => {
              if (!imageUrl) return '';
              return imageUrl.startsWith('ipfs://')
                ? `https://ipfs.io/ipfs/${imageUrl.slice(7)}`
                : imageUrl;
            };

            // Determine name, image, and link based on offer type
            const isToken = offer.type === "token";
            const name = isToken ? offer.token?.name : offer.collection?.name;
            const imageUrl = isToken ? offer.token?.imageUrl : offer.collection?.media?.visualAssets?.xs?.url;
            const link = isToken
              ? `${MARKETPLACES["stargaze"]}${offer.collection.contractAddress}/${offer.tokenId}`
              : `${MARKETPLACES["stargaze"]}${offer.collection.contractAddress}/tokens`;

            return {
              amount: parseFloat(offer.offerPrice.amount) / Math.pow(10, offer.offerPrice.exponent || 6),
              symbol: offer.offerPrice.symbol,
              amount_usd: offer.offerPrice.amountUsd || 0,
              collection: {
                name: name || 'Unknown',
                image: getImageUrl(imageUrl)
              },
              link: link
            };
          }) || []
        };
      } catch (error) {
        console.error('❌ Fetch 2 error:', error);
        return { platform: 'stargaze', offers: [] };
      }
    };

    // Fetch 3: Superbolt Offers (with retry logic like Neutron)
    const fetchSuperboltOffers = async () => {
      console.log('🔍 Fetch 3: Getting Superbolt offers...');
      try {
        const response = await fetchWithRetry(API_ENDPOINTS.SUPERBOLT_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `query ExampleQuery($where: OfferWhereInput) {
            offers(where: $where) {
              amount
              amount_usd
              collection {
                name
                collection_id
              }
              nft_id
              denom
            }
          }`,
            variables: {
              where: {
                creator: {
                  is: {
                    address_id: {
                      equals: addresses.neutron
                    }
                  }
                }
              }
            }
          })
        }, true); // Use proxy with retry logic

        const data = await response.json();
        console.log('✅ Fetch 3 response:', data);

        return {
          platform: 'Superbolt',
          offers: data.data?.offers?.map(offer => {
            // Handle IPFS URLs
            const getImageUrl = (imageUrl) => {
              if (!imageUrl) return '';
              return imageUrl.startsWith('ipfs://')
                ? `https://ipfs.io/ipfs/${imageUrl.slice(7)}`
                : imageUrl;
            };

            return {
              amount: parseFloat(offer.amount) / Math.pow(10, 6),
              symbol: 'NTRN',
              amount_usd: offer.amount_usd || calculateUsdValue(offer.amount, 'NTRN', 6),
              collection: {
                name: offer.collection.name,
                image: getImageUrl(offer.pfp_image)
              },
              link: `${MARKETPLACES["superbolt"]}${offer.collection.collection_id}/nfts?search.displayAs=grid&search.keyword=&search.open=false&search.sortBy=listing_price,asc`
            };
          }) || []
        };
      } catch (error) {
        console.error('❌ Fetch 3 error:', error);
        return { platform: 'superbolt', offers: [] };
      }
    };

    // Fetch 4: BackboneLabs Injective Offers (with proxy iteration like Injective)
    const fetchBackboneInjectiveOffers = async () => {
      console.log('🔍 Fetch 4: Getting BackboneLabs Injective offers...');
      try {
        const offersUrl = `${API_ENDPOINTS.BACKBONE_LABS_API}/dapps/necropolis/offers/made?addresses=${addresses.injective}`;
        const response = await fetchWithRetry(
          offersUrl,
          {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
          },
          true // Use proxy with retry logic
        );

        const data = await response.json();
        console.log('✅ Fetch 4 response:', data);

        const offersWithCollections = await Promise.all(
          (data.offers || []).map(async (offer) => {
            try {
              // fetch token info instead of collection
              const tokenUrl = `${API_ENDPOINTS.BACKBONE_LABS_API}/dapps/necropolis/collections/${offer.nft_contract}/${offer.token_id}`;
              const tokenResponse = await fetchWithRetry(
                tokenUrl,
                {
                  method: 'GET',
                  headers: { 'Accept': 'application/json' }
                },
                true
              );
              const tokenData = await tokenResponse.json();

              return {
                amount: parseFloat(offer.offer_amount) / Math.pow(10, 6),
                symbol: 'bINJ',
                amount_usd: calculateUsdValue(offer.offer_amount, 'bOSMO', 6),
                collection: {
                  name: tokenData.name || 'Unknown Token',
                  image: tokenData.image_url
                    ? (tokenData.image_url.startsWith('ipfs://')
                      ? `https://ipfs.io/ipfs/${tokenData.image_url.slice(7)}`
                      : tokenData.image_url)
                    : ''
                },
                link: `${MARKETPLACES["backbonelabs"]}/nfts/marketplace/collections/${offer.nft_contract}/${offer.token_id}`
              };
            } catch (error) {
              console.error('❌ Error fetching token for offer:', error);
              return {
                amount: parseFloat(offer.offer_amount) / Math.pow(10, 18),
                symbol: 'bINJ',
                amount_usd: calculateUsdValue(offer.offer_amount, 'bINJ', 18),
                collection: {
                  name: 'Unknown Token',
                  image: ''
                },
                link: `${MARKETPLACES["backbonelabs"]}/marketplace/collections/${offer.nft_contract}/${offer.token_id}`
              };
            }
          })
        );

        return {
          platform: 'Backbonelabs Injective',
          offers: offersWithCollections
        };
      } catch (error) {
        console.error('❌ Fetch 4 error:', error);
        return { platform: 'Backbonelabs Injective', offers: [] };
      }
    };


    // Fetch 5: BackboneLabs Osmosis Offers (with single proxy like Osmosis)
    const fetchBackboneOsmosisOffers = async () => {
      console.log('🔍 Fetch 5: Getting BackboneLabs Osmosis offers...');
      try {
        const offersUrl = `${API_ENDPOINTS.BACKBONE_LABS_API}/dapps/necropolis/offers/made?addresses=${addresses.osmosis}`;

        // Use first proxy like Osmosis pattern
        const proxyUrl = CORS_PROXIES[0];
        const proxiedUrl = buildProxiedUrl(proxyUrl, offersUrl);

        const response = await fetch(proxiedUrl, {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        });

        const data = await response.json();
        console.log('✅ Fetch 5 response:', data);

        const offersWithCollections = await Promise.all(
          (data.offers || []).map(async (offer) => {
            try {
              // Fetch token info instead of collection
              const tokenUrl = `${API_ENDPOINTS.BACKBONE_LABS_API}/dapps/necropolis/collections/${offer.nft_contract}/${offer.token_id}`;
              const tokenProxiedUrl = buildProxiedUrl(proxyUrl, tokenUrl);

              const tokenResponse = await fetch(tokenProxiedUrl, {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
              });

              const tokenData = await tokenResponse.json();

              return {
                amount: parseFloat(offer.offer_amount) / Math.pow(10, 6),
                symbol: 'bOSMO',
                amount_usd: calculateUsdValue(offer.offer_amount, 'bOSMO', 6),
                collection: {
                  name: tokenData.name || 'Unknown Token',
                  image: tokenData.image_url
                    ? (tokenData.image_url.startsWith('ipfs://')
                      ? `https://ipfs.io/ipfs/${tokenData.image_url.slice(7)}`
                      : tokenData.image_url)
                    : ''
                },
                link: `${MARKETPLACES["backbonelabs"]}/nfts/marketplace/collections/${offer.nft_contract}/${offer.token_id}`
              };
            } catch (error) {
              console.error('❌ Error fetching token for offer:', error);
              return {
                amount: parseFloat(offer.offer_amount) / Math.pow(10, 6),
                symbol: 'bOSMO',
                amount_usd: calculateUsdValue(offer.offer_amount, 'bOSMO', 6),
                collection: {
                  name: 'Unknown Token',
                  image: ''
                },
                link: `${MARKETPLACES["backbonelabs"]}/nfts/marketplace/collections/${offer.nft_contract}/${offer.token_id}`
              };
            }
          })
        );

        return {
          platform: 'Backbonelabs Osmosis',
          offers: offersWithCollections
        };
      } catch (error) {
        console.error('❌ Fetch 5 error:', error);
        return { platform: 'Backbonelabs Osmosis', offers: [] };
      }
    };


    // Fetch 6: Intergaze Offers
    const fetchIntergazeOffers = async () => {
      console.log('🔍 Fetch 6: Getting Intergaze offers...');
      try {
        const response = await fetchWithRetry(
          `${API_ENDPOINTS.INTERGAZE_API}/profiles/${addresses.initia}/offers/made?offset=0&limit=100`,
          {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
          },
          false // Assuming Intergaze doesn't need proxy
        );

        const data = await response.json();
        console.log('✅ Fetch 6 response:', data);

        return {
          platform: 'Intergaze',
          offers: (data.offers || []).map(offer => {
            const baseUrl = MARKETPLACES["intergaze"];
            const contractAddr = offer.collection?.contractAddress;

            let link;
            if (offer.type === "token") {
              link = `${baseUrl}/m/${contractAddr}/${offer.token?.tokenId}`;
            } else {
              link = `${baseUrl}/m/${contractAddr}`;
            }

            return {
              amount: parseFloat(offer.price.amount) / Math.pow(10, offer.price.exponent || 6),
              symbol: offer.price.symbol,
              amount_usd: calculateUsdValue(
                offer.price.amount,
                offer.price.symbol,
                offer.price.exponent || 6
              ),
              collection: {
                name: offer.type === "token"
                  ? (offer.token?.name || 'Unknown Token')
                  : (offer.collection?.name || 'Unknown Collection'),
                image: offer.type === "token"
                  ? (offer.token?.media?.visualAssets?.xs?.url || '')
                  : (offer.collection?.media?.visualAssets?.xs?.url || '')
              },
              link
            };
          })
        };
      } catch (error) {
        console.error('❌ Fetch 6 error:', error);
        return { platform: 'Intergaze', offers: [] };
      }
    };


    try {
      const [
        walletResult,
        stargazeResult,
        superboltResult,
        backboneInjectiveResult,
        backboneOsmosisResult,
        intergazeResult
      ] = await Promise.all([
        fetchWalletName(),
        fetchStargazeOffers(),
        fetchSuperboltOffers(),
        fetchBackboneInjectiveOffers(),
        fetchBackboneOsmosisOffers(),
        fetchIntergazeOffers()
      ]);

      console.log('🎉 All offers fetches completed!');

      const platforms = [stargazeResult, superboltResult, backboneInjectiveResult, backboneOsmosisResult, intergazeResult];

      const processedPlatforms = platforms
        .map(platform => {
          const offers_total_platform_value_usd = platform.offers.reduce((sum, offer) => sum + offer.amount_usd, 0);
          return {
            platform: platform.platform,
            offers_total_platform_value_usd,
            offers: platform.offers
          };
        })
        .sort((a, b) => b.offers_total_platform_value_usd - a.offers_total_platform_value_usd)
        .map(platform => ({
          [platform.platform]: {
            offers_total_platform_value_usd: platform.offers_total_platform_value_usd,
            offers: platform.offers
          }
        }));

      const offers_total_value_usd = platforms.reduce((total, platform) => {
        return total + platform.offers.reduce((sum, offer) => sum + offer.amount_usd, 0);
      }, 0);

      const result = {
        offers_total_value_usd,
        ...processedPlatforms.reduce((acc, platform) => ({ ...acc, ...platform }), {})
      };

      console.log('📊 Final NFT offers result:', result);
      return result;

    } catch (error) {
      console.error('❌ Error in fetchAllOffers:', error);
      throw error;
    }
  }

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
      setOffersLoading(true);

      // Fetch all chain balances
      const allChainBalances = await fetchAllChainBalances(addresses);

      // Fetch all asset prices
      const allAssetPrices = await fetchAllAssetPrices();

      // Calculate values for each chain
      const balancesWithValues = calculateChainValues(allChainBalances, allAssetPrices);

      setChainBalances(balancesWithValues);
      setAssetPrices(allAssetPrices);

      // Fetch NFT offers only on initial load
      if (!hasCompletedInitialLoad) {
        try {
          const offersData = await fetchAllOffers(addresses, allAssetPrices);
          setNftOffers(offersData);
        } catch (error) {
          console.error('Error fetching NFT offers:', error);
          setNftOffers({});
        }
      }

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
    } finally {
      setOffersLoading(false);
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
        <div className="marketplace-links desktop-only">
          <div className="marketplace-logos">
            <a href="https://www.madscientists.io/" target="_blank" rel="noopener noreferrer" data-tooltip="Mad Scientists, OSMOSIS genesis collection on Osmosis/Stargaze">
              <img src="/MadScientist.png" alt="Mad Scientist" className="header-character" style={{ height: '70px', opacity: 1 }} />
            </a>

            <a href="https://www.stargaze.zone" target="_blank" rel="noopener noreferrer" data-tooltip="Stargaze Marketplace on Stargaze">
              <img src="/Stargaze.svg" alt="Stargaze" />
            </a>
            <a href="https://intergaze.xyz" target="_blank" rel="noopener noreferrer" data-tooltip="Intergaze Marketplace on Initia">
              <img src="/Intergaze.png" alt="Intergaze" />
            </a>
            <a href="https://app.backbonelabs.io" target="_blank" rel="noopener noreferrer" data-tooltip="BackBoneLabs Marketplace on Osmosis and Injective">
              <img src="/BackBoneLabs.png" alt="BackBoneLabs" />
            </a>
            <a href="https://app.superbolt.wtf" target="_blank" rel="noopener noreferrer" data-tooltip="Superbolt Marketplace on Neutron">
              <img src="/Superbolt.png" alt="Superbolt" />
            </a>
            <a href="https://app.arkprotocol.io/" target="_blank" rel="noopener noreferrer" data-tooltip="Ark Protocol, Interchain NFT transfers">
              <img src="/Ark.png" alt="Ark Protocol" />
            </a>
            <a href="https://daodao.zone" target="_blank" rel="noopener noreferrer" data-tooltip="DAODAO, DAOs on Cosmos chains">
              <img src="/DAODAO.png" alt="DAODAO" />
            </a>
            <a href="https://www.stargaze.zone/m/onchain-omies/tokens" target="_blank" rel="noopener noreferrer" data-tooltip="Onchain OMies, MANTRA genesis collection on Stargaze">
              <img src="/OMie.png" alt="Omie" className="header-character" style={{ height: '70px', opacity: 1 }} />
            </a>
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
          nftOffers={nftOffers}
        />
      )}

      {/* Desktop Chain-Based Portfolio */}
      {Object.keys(chainBalances).length > 0 && !isFetchingNFTs && (
        <DesktopChainPortfolio chainBalances={chainBalances} showDollarBalances={showDollarBalances}
          setShowDollarBalances={setShowDollarBalances} nftOffers={nftOffers} />
      )}

      {wallet && Object.keys(tokenBalances).length > 0 && (
        <NFTDashboard
          addresses={getAllAddresses()}
          onAddressFetched={clearAddressLoading}
          bosmoPrice={bosmoPrice}
          initPrice={initPrice}
          binjPrice={binjPrice}
          showDollarBalances={showDollarBalances}
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