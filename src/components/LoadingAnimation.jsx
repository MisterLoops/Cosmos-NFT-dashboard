
import React, { useState, useEffect } from 'react';
import { TOKEN_LOGOS } from '../utils/constants.js';

export default function LoadingAnimation({ fetchingStatus = [], isVisible = true }) {
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  
  const funTexts = ["BM", "LM", "MM", "gOM", "Everything is an experiment", "OMies always show up", "If you're a whale, patience...😅"];
  
  const chainLogos = [
    { name: 'stargaze', logo: TOKEN_LOGOS.stargaze },
    { name: 'osmosis', logo: TOKEN_LOGOS.osmosis },
    { name: 'cosmoshub', logo: TOKEN_LOGOS.cosmoshub },
    { name: 'injective', logo: TOKEN_LOGOS.injective },
    { name: 'initia', logo: TOKEN_LOGOS.initia },
    { name: 'neutron', logo: TOKEN_LOGOS.neutron }
  ];

  // Rotate fun text every 2 seconds
  useEffect(() => {
    if (!isVisible) return;
    
    const interval = setInterval(() => {
      setCurrentTextIndex((prev) => (prev + 1) % funTexts.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [isVisible, funTexts.length]);

  if (!isVisible) return null;

  return (
    <div className="loading-animation-container">
      <div className="atom-container">
        {/* Central nucleus */}
        <div className="atom-nucleus"></div>
        
        {/* Electron orbits with chain logos */}
        {chainLogos.map((chain, index) => (
          <div 
            key={chain.name} 
            className={`electron-orbit orbit-${index + 1}`}
            style={{ 
              '--orbit-delay': `${index * 0.3}s`,
              '--orbit-duration': `${3 + index * 0.5}s`
            }}
          >
            <div className="electron">
              <img 
                src={chain.logo} 
                alt={chain.name}
                className="electron-logo"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Fun rotating text */}
      <div className="fun-text">
        {funTexts[currentTextIndex]}
      </div>

      {/* Fetching status messages */}
      {fetchingStatus.length > 0 && (
        <div className="fetching-status">
          {fetchingStatus.map((status, index) => (
            <div key={index} className="status-message">
              {status}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
