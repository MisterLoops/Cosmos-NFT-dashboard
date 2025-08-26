import React, { useState, useEffect, useRef } from "react";
import {
  TOKEN_LOGOS,
  SYMBOL_TO_LOGO
} from "../utils/constants.js";

// NFT Offers Card component for Mobile - styled differently
export default function NFTOffersCard({ nftOffers, totalOffersValue }) {
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