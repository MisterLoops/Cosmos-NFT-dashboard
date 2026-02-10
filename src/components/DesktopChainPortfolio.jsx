import React, { useState, useEffect, useRef } from "react";
import {
  TOKEN_LOGOS,
  SYMBOL_TO_LOGO, 
  CHAIN_CONFIGS
} from "../utils/constants.js";

// Desktop Chain-Based Portfolio Summary
export default function DesktopChainPortfolio({ chainBalances, showDollarBalances, setShowDollarBalances, nftOffers, onBalanceClick }) {
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
    Intergaze: '/Intergaze.png',
    "Backbonelabs Dungeon": '/BackBoneLabs.png'
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

  const sendDefaultRoute = (chainName) => {
  if (typeof onBalanceClick === "function") {
    onBalanceClick({
      destChainId: CHAIN_CONFIGS[chainName].chainId,
      destAssetDenom: CHAIN_CONFIGS[chainName].denom,
    });
  } else {
    console.error("onBalanceClick is not a function");
  }
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
                onClick={()=> sendDefaultRoute(chainName)}
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
          <span className="token-summary-total-label">{"Tokens Total Value: "}</span>
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
            <div className="offers-section" onClick={() => setShowOffersExpanded(!showOffersExpanded)}>
              <span
                className="offers-value"
              >
                + ${showDollarBalances ? totalOffersValue.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }) : "*****"}
              </span>
              <span className="offers-section-label"> in NFT offers </span>
              <div className="offers-toggle-arrow" onClick={() => setShowOffersExpanded(!showOffersExpanded)} style={{ cursor: "pointer" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: "white" }}>
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
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: "white" }}>
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