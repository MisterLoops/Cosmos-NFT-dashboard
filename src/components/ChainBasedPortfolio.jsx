import React, { useState, useEffect, useRef } from "react";
import NFTOffersCard from "./NFTOffersCard";
import ChainBalanceCard from "./ChainBalanceCard";
import SkipWidget from "./SkipWidget";
import {
  CHAIN_CONFIGS
} from "../utils/constants.js";

export default function ChainBasedPortfolio({ chainBalances, showTokens, tokenBalancesClosing, nftOffers, omGendrop }) {
  const [showOffersCard, setShowOffersCard] = useState(false);
  const [showSkipWidget, setShowSkipWidget] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState(null);

  useEffect(() => {
      const today = new Date();
      const deadline = new Date(today.getFullYear(), 8, 18); // Month 8 = September
      const diffTime = deadline - today;
  
      if (diffTime > 0) {
        setDaysRemaining(Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      } else {
        setDaysRemaining(0);
      }
    }, []);
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
      <SkipWidget showSkipWidget={showSkipWidget} onClose={() => setShowSkipWidget(false)} />
      <div className="token-balances-header">
        <h3>Portfolio</h3>
        <div className="total-value">
          Total: ${totalPortfolioValue.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </div>
      </div>
      {(omGendrop.amount > 0 && daysRemaining !== null) && (
          <div className="gendrop-alert-wrapper">
            <a
              href="https://mantra.zone/my-overview"
              target="_blank"
              rel="noopener noreferrer"
              className="gendrop-alert"
              title="Claim"
            >
              You have <strong>{omGendrop.usdValue.toFixed(0)} OM </strong>
              to claim from <strong>MANTRA Gendrop part 1</strong>!
              You have <strong>{daysRemaining}</strong> days left to claim.
            </a>
          </div>
        )}

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
      <div className="skip-logo-mobile" style={{ display:"flex",justifyContent:"center", alignItems:"center" }}>
        <img
          src="/skip.png"
          alt="skip_logo"
          title="Swap, Bridge to anything anywhere"
          onClick={() => setShowSkipWidget(!showSkipWidget)}
          style={{ cursor: "pointer", maxWidth: "100px", marginBottom:"10px"}}
        />
      </div>
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