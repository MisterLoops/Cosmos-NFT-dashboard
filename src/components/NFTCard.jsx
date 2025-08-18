import React, { useState, useRef, useCallback } from "react";
import { ExternalLink, Star } from "lucide-react";
import { CHAIN_CONFIGS } from "../utils/constants.js";

export default function NFTCard({ nft, marketplaceLink, viewMode }) {
  const chainColors = {
    stargaze: "#ff6b9d",
    osmosis: "#750BBB",
    cosmoshub: "#2e3148",
    injective: "#00d2ff",
    initia: "#4f46e5",
    neutron: "#000000",
  };

  // Import chain display names from constants
  const chainDisplayNames = Object.fromEntries(
    Object.entries(CHAIN_CONFIGS || {}).map(([key, config]) => [
      key,
      key === 'initia' ? 'intergaze' : key
    ])
  );

  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [showTraits, setShowTraits] = useState(false);
  const imgRef = useRef(null);

  // Progressive intersection observer for staggered loading
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Add a small random delay to stagger loading
          const delay = Math.random() * 200; // 0-200ms random delay
          setTimeout(() => {
            setIsVisible(true);
          }, delay);
          observer.disconnect();
        }
      },
      { 
        threshold: 0.05, // Start loading earlier
        rootMargin: '100px' // Load when 100px away from viewport
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleImageError = useCallback((e) => {
    console.log("Media failed to load:", e.target.src, "Element type:", e.target.tagName);

    // For Cloudflare IPFS URLs that failed, try ipfs.io
    if (e.target.src.includes("cloudflare-ipfs.com") && !e.target.src.includes("ipfs.io")) {
      console.log("Trying ipfs.io gateway as fallback");
      const ipfsMatch = e.target.src.match(/ipfs\/([^\/?\s]+)/);
      if (ipfsMatch) {
        e.target.src = `https://ipfs.io/ipfs/${ipfsMatch[1]}`;
        return;
      }
    }

    // If it's an IPFS URL that failed, try another gateway
    if (e.target.src.includes("ipfs.io") && !e.target.src.includes("gateway.pinata.cloud")) {
      console.log("Trying Pinata gateway as fallback");
      const ipfsMatch = e.target.src.match(/ipfs\/([^\/?\s]+)/);
      if (ipfsMatch) {
        e.target.src = `https://gateway.pinata.cloud/ipfs/${ipfsMatch[1]}`;
        return;
      }
    }

    // Try dweb.link gateway as final fallback
    if (e.target.src.includes("gateway.pinata.cloud") && !e.target.src.includes("dweb.link")) {
      console.log("Trying dweb.link gateway as final fallback");
      const ipfsMatch = e.target.src.match(/ipfs\/([^\/?\s]+)/);
      if (ipfsMatch) {
        e.target.src = `https://dweb.link/ipfs/${ipfsMatch[1]}`;
        return;
      }
    }

    // For videos, try cloudflare-ipfs.com as final attempt
    if (e.target.tagName === "VIDEO" && e.target.src.includes("dweb.link") && !e.target.src.includes("cloudflare-ipfs.com")) {
      console.log("Trying cloudflare-ipfs.com gateway for video");
      const ipfsMatch = e.target.src.match(/ipfs\/([^\/?\s]+)/);
      if (ipfsMatch) {
        e.target.src = `https://cloudflare-ipfs.com/ipfs/${ipfsMatch[1]}`;
        return;
      }
    }

    setImageError(true);
    if (!e.target.src.includes("placeholder")) {
      e.target.src = "https://via.placeholder.com/300x300/1a1a1a/666?text=NFT";
    }

    // Dispatch custom event for error tracking
    document.dispatchEvent(new CustomEvent('nftImageError'));
  }, []);

  const handleImageLoad = useCallback((e) => {
    setImageLoaded(true);

    // For GIFs and other animated content, ensure they play
    if (e.target.src.toLowerCase().includes(".gif")) {
      e.target.style.objectFit = "contain";
    }

    // Dispatch custom event for loading tracking
    document.dispatchEvent(new CustomEvent('nftImageLoaded'));
  }, []);

  const isVideoFile = (url) => {
    if (!url) return false;

    // Check for direct video extensions - more comprehensive list
    const videoExtensions = [".mp4", ".webm", ".ogg", ".mov", ".avi", ".mkv", ".m4v", ".3gp", ".flv"];
    if (videoExtensions.some((ext) => url.toLowerCase().includes(ext))) {
      return true;
    }

    // Check for Stargaze processed URLs that contain video files
    if (url.includes("i.stargaze-apis.com") && url.includes("f:mp4")) {
      const ipfsMatch = url.match(/\/plain\/ipfs:\/\/([^\/]+\/[^)]+)/);
      if (ipfsMatch && ipfsMatch[1]) {
        return videoExtensions.some((ext) => ipfsMatch[1].toLowerCase().includes(ext));
      }
    }

    // Check for IPFS video files
    if (url.includes("ipfs://") || url.includes("/ipfs/")) {
      return videoExtensions.some((ext) => url.toLowerCase().includes(ext));
    }

    return false;
  };

  const getVideoSrc = (url) => {
    if (!url) return url;

    // For Stargaze processed video URLs, extract the original IPFS URL
    if (url.includes("i.stargaze-apis.com") && url.includes("/plain/ipfs://")) {
      const ipfsMatch = url.match(/\/plain\/(ipfs:\/\/[^\/]+\/[^)]+)/);
      if (ipfsMatch && ipfsMatch[1]) {
        const ipfsUrl = ipfsMatch[1];
        const ipfsHash = ipfsUrl.replace("ipfs://", "");
        return `https://ipfs.io/ipfs/${ipfsHash}`;
      }
    }

    // Convert IPFS URLs to HTTP gateway URLs
    if (url.startsWith("ipfs://")) {
      return url.replace("ipfs://", "https://ipfs.io/ipfs/");
    }

    // For Intergaze/Initia, use URL as-is (don't modify)
    return url;
  };

  const formatRarity = (rarity) => {
    if (!rarity) return null;
    return `#${rarity}`;
  };

  const formatPrice = (amount, decimals = 8) => {
    if (!amount) return "0";
    if (amount > 1) {
      return parseFloat(amount).toLocaleString(undefined, {
      maximumFractionDigits: 2,
    });
    }
    return parseFloat(amount).toLocaleString(undefined, {
      maximumFractionDigits: decimals,
    });
  };

  const formatPriceUsd = (amount) => {
    if (!amount) return "0";
    return parseFloat(amount).toLocaleString(undefined, {
      maximumFractionDigits: 2,
    });
  };

  const collectionToOnlyNumberName = (nft) => {
    const isNumberOnly = (str) => /^\d+$/.test(str);
    if (isNumberOnly(nft.name)) {
      return `${nft.collection} #${nft.name}`;
    }
    return nft.name;
  }

  return (
    <div 
      className={`nft-card ${viewMode}`}
      onClick={() => {
        // On mobile, make the entire card clickable
        if (window.innerWidth <= 768 && marketplaceLink) {
          window.open(marketplaceLink, '_blank', 'noopener,noreferrer');
        }
      }}
      style={{
        cursor: window.innerWidth <= 768 ? 'pointer' : 'default'
      }}
    >
      <div className="nft-image-container" ref={imgRef}>
        {/* Loading placeholder - only show when not loaded and no error */}
        {!imageLoaded && !imageError && isVisible && (
          <div className="nft-image-placeholder">
            <div className="nft-loading-spinner"></div>
          </div>
        )}

        {/* Image/Video content - only show when no error */}
        {!imageError && isVisible && (
          <>
            {isVideoFile(nft.image) ? (
              <video
                src={getVideoSrc(nft.image)}
                className={`nft-image nft-video ${imageLoaded ? 'loaded' : ''}`}
                muted
                loop
                playsInline
                preload="metadata"
                controls={false}
                onError={handleImageError}
                onLoadedData={handleImageLoad}
                onMouseEnter={(e) => {
                  e.target.play().catch(console.error);
                }}
                onMouseLeave={(e) => {
                  e.target.pause();
                }}
                referrerPolicy="no-referrer"
              >
                Your browser does not support the video tag.
              </video>
            ) : (
              <img
                src={nft.image}
                alt={nft.name}
                onError={handleImageError}
                onLoad={handleImageLoad}
                className={`nft-image ${imageLoaded ? 'loaded' : ''} ${nft.image?.toLowerCase().endsWith(".gif") ? "is-gif" : ""}`}
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
              />
            )}
          </>
        )}

        {/* Error state */}
        {imageError && (
          <div className="nft-image-error">
            <div className="error-placeholder">
              <Star size={24} />
              <span>Image unavailable</span>
            </div>
          </div>
        )}

        {/* Slide-up info panel */}
        <div className="nft-hover-overlay">
          <div className="marketplace-link-info">
            <div className="marketplace-link-text">
              {nft.chain === "cosmoshub" ? "View on Ark Protocol" : "View on Marketplace"}
            </div>
            <div className="marketplace-link-subtext">
              {nft.chain === "stargaze" && "Stargaze"}
              {nft.chain === "osmosis" && "BackboneLabs"}
              {nft.chain === "injective" && "BackboneLabs"}
              {nft.chain === "neutron" && "Superbolt"}
              {nft.chain === "initia" && "Intergaze"}
              {nft.chain === "cosmoshub" && "Ark Protocol"}
            </div>
          </div>
          <a
            href={marketplaceLink}
            target="_blank"
            rel="noopener noreferrer"
            className="marketplace-link-button"
            title="View on marketplace"
          >
            <ExternalLink size={20} />
          </a>
        </div>
      </div>

      <div className="nft-info">
        <div className="nft-header">
          <h3 className="nft-name">{collectionToOnlyNumberName(nft)}</h3>
          {viewMode === 'grid' ? (
            <div
              className={`nft-rarity ${(nft.traits && nft.traits.length > 0) || (nft.attributes && nft.attributes.length > 0) ? 'has-traits' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                if ((nft.traits && nft.traits.length > 0) || (nft.attributes && nft.attributes.length > 0)) {
                  setShowTraits(!showTraits);
                }
              }}
              title={`${nft.rarity ? `Rarity rank: ${nft.rarity}` : 'NFT details'}${(nft.traits && nft.traits.length > 0) || (nft.attributes && nft.attributes.length > 0) ? ' - Click to view traits' : ''}`}
            >
              <Star size={12} />
              {nft.rarity ? formatRarity(nft.rarity) : 'Details'}
              {((nft.traits && nft.traits.length > 0) || (nft.attributes && nft.attributes.length > 0)) && (
                <span className="rarity-arrow">›</span>
              )}
            </div>
          ) : (
            <div className="nft-rarity">
              <Star size={12} />
              {nft.rarity ? formatRarity(nft.rarity) : 'Details'}
            </div>
          )}
        </div>

        <div className="nft-meta">
          <div
            className="chain-badge"
            style={{ backgroundColor: chainColors[nft.chain] }}
          >
            {chainDisplayNames[nft.chain] || nft.chain}
          </div>

          {nft.listed && (
            <div
              className="status-badge listed"
              title={
                nft.listPrice
                  ? `Listed for ${formatPrice(nft.listPrice.amount)} ${nft.listPrice.symbol}`
                  : "Listed"
              }
            >
              {viewMode === 'grid' && nft.listPrice
                ? `Listed | ${formatPrice(nft.listPrice.amount)} ${nft.listPrice.symbol} ($${formatPriceUsd(nft.listPrice.amountUsd)})`
                : "Listed"}
            </div>
          )}

          {(nft.staked || nft.daoStaked) && (
            <div className="status-badge staked">
              {viewMode === 'grid' ? (
                nft.daoStaked ? (
                  <a
                    href={`https://daodao.zone/dao/${nft.daoAddress}/home`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="dao-link"
                  >
                    Staked in {nft.daoName}
                    <ExternalLink size={12} style={{ marginLeft: '4px' }} />
                  </a>
                ) : (
                  "Staked"
                )
              ) : (
                "Staked"
              )}
            </div>
          )}
        </div>

        {viewMode === "grid" && nft.description && (
          <p className="nft-description">{nft.description}</p>
        )}

        {/* Traits overlay - only in grid view */}
        {viewMode === 'grid' && ((nft.traits && nft.traits.length > 0) || (nft.attributes && nft.attributes.length > 0)) && (
          <div className={`traits-overlay ${showTraits ? 'visible' : ''}`}>
            <div className="traits-backdrop" onClick={(e) => {
              e.stopPropagation();
              setShowTraits(false);
            }} />
            <div className="traits-content">
              <div className="traits-header">
                <h4>Traits</h4>
                <button 
                  className="traits-close-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowTraits(false);
                  }}
                  aria-label="Close traits"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m18 6-12 12M6 6l12 12"/>
                  </svg>
                </button>
              </div>
              <div className="traits-list">
                {(nft.traits || nft.attributes || []).map((trait, index) => (
                  <div key={index} className="trait-pill">
                    <span className="trait-type">{trait.trait_type || trait.name}</span>
                    <span className="trait-val">{trait.value}</span>
                    {trait.rarity && (
                      <span className="trait-rarity-badge">{trait.rarity}%</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {viewMode === 'grid' && nft.floor && nft.floor.amount > 0 && (
          <div className="nft-floor">
            <div className="floor-info">
              <span className="floor-label">
                {nft.floor.isStargaze ? "Floor (Stargaze):" : "Floor:"}
              </span>
              <span className="floor-amount">
                {formatPrice(nft.floor.amount)} {nft.floor.symbol}
              </span>
              {nft.floor.amountUsd > 0 && (
                <span className="floor-usd">
                  (${formatPriceUsd(nft.floor.amountUsd)})
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}