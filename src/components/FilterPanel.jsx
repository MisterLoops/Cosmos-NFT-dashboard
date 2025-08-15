
import React, { useState } from 'react';
import { X, ChevronDown, ChevronUp, Search } from 'lucide-react';

export default function FilterPanel({ filters, setFilters, nfts }) {
  const [showAllCollections, setShowAllCollections] = useState(false);
  const [showCollectionSearch, setShowCollectionSearch] = useState(false);
  const [collectionSearchTerm, setCollectionSearchTerm] = useState('');
  
  const availableChains = [...new Set(nfts.map(nft => nft.chain))];
  
  // Sort collections by total USD value (descending)
  const availableCollections = [...new Set(nfts.map(nft => nft.collection))]
    .map(collection => {
      const collectionNfts = nfts.filter(nft => nft.collection === collection);
      const totalValue = collectionNfts.reduce((total, nft) => {
        const floorUsd = parseFloat(nft.floor?.amountUsd) || 0;
        return total + floorUsd;
      }, 0);
      return { name: collection, totalValue };
    })
    .sort((a, b) => b.totalValue - a.totalValue)
    .map(item => item.name);

  // Filter collections based on search term
  const filteredCollections = collectionSearchTerm
    ? availableCollections.filter(collection =>
        collection.toLowerCase().includes(collectionSearchTerm.toLowerCase())
      )
    : availableCollections;

  // Helper function to calculate NFT count and USD value for a category
  const getFilterStats = (filterType, filterValue) => {
    let filteredNfts = [];
    
    if (filterType === 'chain') {
      filteredNfts = nfts.filter(nft => nft.chain === filterValue);
    } else if (filterType === 'collection') {
      filteredNfts = nfts.filter(nft => nft.collection === filterValue);
    } else if (filterType === 'listed') {
      filteredNfts = nfts.filter(nft => nft.listed === true);
    } else if (filterType === 'staked') {
      filteredNfts = nfts.filter(nft => nft.staked === true || nft.daoStaked === true);
    } else if (filterType === 'address') {
      filteredNfts = nfts.filter(nft => nft.sourceAddress === filterValue);
    }

    const count = filteredNfts.length;
    const totalValue = filteredNfts.reduce((total, nft) => {
      const floorUsd = parseFloat(nft.floor?.amountUsd) || 0;
      return total + floorUsd;
    }, 0);

    return { count, totalValue };
  };

  // Helper function to format USD value
  const formatUSD = (value) => {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  // Helper function to capitalize first letter and handle special cases
  const capitalize = (str) => {
    if (str === 'initia') return 'Intergaze';
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const handleChainToggle = (chain) => {
    const newChains = filters.chains.includes(chain)
      ? filters.chains.filter(c => c !== chain)
      : [...filters.chains, chain];
    
    setFilters({ ...filters, chains: newChains });
  };

  const handleCollectionToggle = (collection) => {
    const newCollections = filters.collections.includes(collection)
      ? filters.collections.filter(c => c !== collection)
      : [...filters.collections, collection];
    
    setFilters({ ...filters, collections: newCollections });
  };

  const clearFilters = () => {
    setFilters({
      chains: [],
      collections: [],
      daos: [],
      listed: false,
      staked: false,
      addresses: []
    });
  };

  const hasActiveFilters = filters.chains.length > 0 || 
                          filters.collections.length > 0 || 
                          filters.listed || 
                          filters.staked ||
                          (filters.addresses && filters.addresses.length > 0);

  return (
    <div className="filter-panel">
      <div className="mobile-filter-header">
        <h3 className="mobile-filter-title">Filters</h3>
        <button 
          onClick={() => window.dispatchEvent(new CustomEvent('closeMobileFilters'))}
          className="mobile-filter-close"
          aria-label="Close filters"
        >
          <X size={20} />
        </button>
      </div>
      
      <div className="filter-header">
        <h3>Filters</h3>
        {hasActiveFilters && (
          <button onClick={clearFilters} className="clear-filters">
            Clear All
          </button>
        )}
      </div>
      
      {hasActiveFilters && (
        <div className="filter-selected-stats">
          <div className="filter-selected-stats-title">SELECTED</div>
          <div className="filter-selected-stats-grid">
            <div className="filter-selected-stat">
              <span className="filter-selected-stat-value">
                ${(() => {
                  // Calculate total value of filtered NFTs
                  let filteredNfts = nfts;
                  
                  if (filters.chains.length > 0) {
                    filteredNfts = filteredNfts.filter(nft => filters.chains.includes(nft.chain));
                  }
                  if (filters.collections.length > 0) {
                    filteredNfts = filteredNfts.filter(nft => filters.collections.includes(nft.collection));
                  }
                  if (filters.listed) {
                    filteredNfts = filteredNfts.filter(nft => nft.listed === true);
                  }
                  if (filters.staked) {
                    filteredNfts = filteredNfts.filter(nft => nft.staked === true || nft.daoStaked === true);
                  }
                  if (filters.addresses && filters.addresses.length > 0) {
                    filteredNfts = filteredNfts.filter(nft => filters.addresses.includes(nft.sourceAddress));
                  }
                  
                  return filteredNfts.reduce((total, nft) => {
                    const floorUsd = parseFloat(nft.floor?.amountUsd) || 0;
                    return total + floorUsd;
                  }, 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
                })()}
              </span>
              <span className="filter-selected-stat-label">Value</span>
            </div>
            <div className="filter-selected-stat">
              <span className="filter-selected-stat-value">
                {(() => {
                  // Calculate total count of filtered NFTs
                  let filteredNfts = nfts;
                  
                  if (filters.chains.length > 0) {
                    filteredNfts = filteredNfts.filter(nft => filters.chains.includes(nft.chain));
                  }
                  if (filters.collections.length > 0) {
                    filteredNfts = filteredNfts.filter(nft => filters.collections.includes(nft.collection));
                  }
                  if (filters.listed) {
                    filteredNfts = filteredNfts.filter(nft => nft.listed === true);
                  }
                  if (filters.staked) {
                    filteredNfts = filteredNfts.filter(nft => nft.staked === true || nft.daoStaked === true);
                  }
                  if (filters.addresses && filters.addresses.length > 0) {
                    filteredNfts = filteredNfts.filter(nft => filters.addresses.includes(nft.sourceAddress));
                  }
                  
                  return filteredNfts.length;
                })()}
              </span>
              <span className="filter-selected-stat-label">NFTs</span>
            </div>
            <div className="filter-selected-stat">
              <span className="filter-selected-stat-value">
                {(() => {
                  // Calculate unique collections count
                  let filteredNfts = nfts;
                  
                  if (filters.chains.length > 0) {
                    filteredNfts = filteredNfts.filter(nft => filters.chains.includes(nft.chain));
                  }
                  if (filters.collections.length > 0) {
                    filteredNfts = filteredNfts.filter(nft => filters.collections.includes(nft.collection));
                  }
                  if (filters.listed) {
                    filteredNfts = filteredNfts.filter(nft => nft.listed === true);
                  }
                  if (filters.staked) {
                    filteredNfts = filteredNfts.filter(nft => nft.staked === true || nft.daoStaked === true);
                  }
                  if (filters.addresses && filters.addresses.length > 0) {
                    filteredNfts = filteredNfts.filter(nft => filters.addresses.includes(nft.sourceAddress));
                  }
                  
                  return new Set(filteredNfts.map(n => n.collection)).size;
                })()}
              </span>
              <span className="filter-selected-stat-label">Collections</span>
            </div>
          </div>
        </div>
      )}
      
      <div className="filter-section">
        <h4>Status</h4>
        <div className="filter-options">
          <label className="filter-checkbox">
            <input
              type="checkbox"
              checked={filters.listed}
              onChange={(e) => setFilters({ ...filters, listed: e.target.checked })}
            />
            <span className="checkmark"></span>
            <div className="filter-label">
              <span className="filter-name">Listed for Sale</span>
              <span className="filter-stats">
                {(() => {
                  const stats = getFilterStats('listed');
                  return `${stats.count} NFTs • $${formatUSD(stats.totalValue)}`;
                })()}
              </span>
            </div>
          </label>
          
          <label className="filter-checkbox">
            <input
              type="checkbox"
              checked={filters.staked}
              onChange={(e) => setFilters({ ...filters, staked: e.target.checked })}
            />
            <span className="checkmark"></span>
            <div className="filter-label">
              <span className="filter-name">Staked in DAOs</span>
              <span className="filter-stats">
                {(() => {
                  const stats = getFilterStats('staked');
                  return `${stats.count} NFTs • $${formatUSD(stats.totalValue)}`;
                })()}
              </span>
            </div>
          </label>
        </div>
      </div>
      
      <div className="filter-section">
        <h4>Chains</h4>
        <div className="filter-options">
          {availableChains.map(chain => {
            const stats = getFilterStats('chain', chain);
            return (
              <label key={chain} className="filter-checkbox">
                <input
                  type="checkbox"
                  checked={filters.chains.includes(chain)}
                  onChange={() => handleChainToggle(chain)}
                />
                <span className="checkmark"></span>
                <div className="filter-label">
                  <span className="filter-name">{capitalize(chain)}</span>
                  <span className="filter-stats">{stats.count} NFTs • ${formatUSD(stats.totalValue)}</span>
                </div>
              </label>
            );
          })}
        </div>
      </div>
      
      <div className="filter-section">
        <div className="collections-header">
          <h4>Collections</h4>
          <div className="collections-header-actions">
            {showAllCollections && filteredCollections.length > 5 && (
              <button 
                className="show-less-btn-header"
                onClick={() => setShowAllCollections(false)}
                title="Show less collections"
              >
                <ChevronUp size={14} />
                Show Less
              </button>
            )}
            <button
              onClick={() => setShowCollectionSearch(!showCollectionSearch)}
              className={`search-btn ${showCollectionSearch ? 'active' : ''}`}
              title="Search collections"
            >
              <Search size={14} />
            </button>
          </div>
        </div>
        
        {showCollectionSearch && (
          <div className="collection-search">
            <input
              type="text"
              placeholder="Search collections..."
              value={collectionSearchTerm}
              onChange={(e) => setCollectionSearchTerm(e.target.value)}
              className="search-input"
            />
            {collectionSearchTerm && (
              <button
                onClick={() => setCollectionSearchTerm('')}
                className="clear-search"
                title="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>
        )}
        
        <div className="filter-options">
          {filteredCollections.slice(0, 5).map(collection => {
            const stats = getFilterStats('collection', collection);
            return (
              <label key={collection} className="filter-checkbox">
                <input
                  type="checkbox"
                  checked={filters.collections.includes(collection)}
                  onChange={() => handleCollectionToggle(collection)}
                />
                <span className="checkmark"></span>
                <div className="filter-label">
                  <span className="filter-name">{collection}</span>
                  <span className="filter-stats">{stats.count} NFTs • ${formatUSD(stats.totalValue)}</span>
                </div>
              </label>
            );
          })}
          
          {showAllCollections && filteredCollections.slice(5).map(collection => {
            const stats = getFilterStats('collection', collection);
            return (
              <label key={collection} className="filter-checkbox">
                <input
                  type="checkbox"
                  checked={filters.collections.includes(collection)}
                  onChange={() => handleCollectionToggle(collection)}
                />
                <span className="checkmark"></span>
                <div className="filter-label">
                  <span className="filter-name">{collection}</span>
                  <span className="filter-stats">{stats.count} NFTs • ${formatUSD(stats.totalValue)}</span>
                </div>
              </label>
            );
          })}
          
          {filteredCollections.length > 5 && (
            <button 
              className="show-more-btn"
              onClick={() => setShowAllCollections(!showAllCollections)}
            >
              {showAllCollections ? (
                <>
                  <ChevronUp size={16} />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown size={16} />
                  Show {filteredCollections.length - 5} More
                </>
              )}
            </button>
          )}
        </div>
      </div>
      
      <div className="filter-section">
        <h4>Addresses</h4>
        <div className="filter-options">
          {(() => {
            // Get unique source addresses from NFTs
            const sourceAddresses = [...new Set(nfts.map(nft => nft.sourceAddress).filter(Boolean))];
            
            return sourceAddresses.map(address => {
              const stats = getFilterStats('address', address);
              // Truncate address for display (show first 6 and last 4 characters)
              const displayAddress = address.length > 16 
                ? `${address.slice(0, 6)}...${address.slice(-4)}`
                : address;
              
              return (
                <label key={address} className="filter-checkbox">
                  <input
                    type="checkbox"
                    checked={filters.addresses?.includes(address) || false}
                    onChange={(e) => {
                      const newAddresses = e.target.checked
                        ? [...(filters.addresses || []), address]
                        : (filters.addresses || []).filter(a => a !== address);
                      setFilters({ ...filters, addresses: newAddresses });
                    }}
                  />
                  <span className="checkmark"></span>
                  <div className="filter-label">
                    <span className="filter-name" title={address}>{displayAddress}</span>
                    <span className="filter-stats">{stats.count} NFTs • ${formatUSD(stats.totalValue)}</span>
                  </div>
                </label>
              );
            });
          })()}
        </div>
      </div>
    </div>
  );
}
