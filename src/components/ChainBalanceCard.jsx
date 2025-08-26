import React, { useState, useEffect, useRef } from "react";
import {
  TOKEN_LOGOS
} from "../utils/constants.js";

// Chain-based balance card component for Mobile (unchanged)
export default function ChainBalanceCard({ chainName, chainData, chainConfig }) {
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
