import React, { useState } from 'react';
import { API_ENDPOINTS } from "../utils/constants.js";
import LoadingSpinner from "./LoadingSpinner";

const WLCheckerComponent = ({ addresses }) => {
  const [showWLModal, setShowWLModal] = useState(false);
  const [isLoadingWLs, setIsLoadingWLs] = useState(false);
  const [wlResults, setWLResults] = useState([]);
  const [wlResultsFetched, setWLResultsFetched] = useState(false);
  const [selectedMarketplaces, setSelectedMarketplaces] = useState({
    stargaze: true,
  });

  const fetchGraphQL = async (query, variables, operationName) => {
    const res = await fetch(API_ENDPOINTS.STARGAZE_GRAPHQL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables, operationName }),
    });
    const json = await res.json();
    if (json.errors) {
      console.error("GraphQL errors:", json.errors);
      throw new Error("GraphQL query failed");
    }
    return json.data;
  };

  const getTimeRangeNs = () => {
    const nowMs = Date.now();
    const minDate = new Date(nowMs);
    minDate.setMonth(minDate.getMonth() - 1); // 1 month ago
    const maxDate = new Date(nowMs + 14 * 24 * 60 * 60 * 1000); // 2 weeks ahead
    return {
      minNs: (minDate.getTime() * 1e6).toString(),
      maxNs: (maxDate.getTime() * 1e6).toString(),
    };
  };

  const fetchMinters = async () => {
    const { minNs, maxNs } = getTimeRangeNs();
    const query = `
      query Minters($offset: Int, $limit: Int, $sortBy: CollectionSort, $minMaxFilters: CollectionMinMaxFilters, $filterByMinterType: [MinterV2Type!]) {
        collections(offset: $offset, limit: $limit, sortBy: $sortBy, minMaxFilters: $minMaxFilters, filterByMinterType: $filterByMinterType) {
          collections {
            contractAddress
            minterAddress
            name
          }
        }
      }
    `;
    const variables = {
      offset: 0,
      limit: 96,
      sortBy: "MINT_START_TIME_DESC",
      minMaxFilters: {
        mintStartTimeMin: minNs,
        mintStartTimeMax: maxNs,
      },
      filterByMinterType: ["VENDING", "OPEN_EDITION", "LIMITED_EDITION", "BURN_TO_MINT"],
    };
    const data = await fetchGraphQL(query, variables, "Minters");
    return data.collections.collections;
  };

  const fetchCollectionWL = async (contractAddress, walletAddress) => {
    const query = `
    query MinterData($address: String!, $walletAddress: String) {
      collection(address: $address) {
        minterV2(walletAddress: $walletAddress) {
          minterType
          minterAddress
          mintStages {
            id
            name
            type
            isMember
            startTime
            endTime
            salePrice {
              amount
              amountUsd
              denom
              symbol
              exponent
            }
            addressTokenCounts {
              mintable
            }
          }
        }
      }
    }
  `;

    const variables = { address: contractAddress, walletAddress };
    const data = await fetchGraphQL(query, variables, "MinterData");
    const minter = data.collection?.minterV2;
    if (!minter) return { status: "No WL" };

    // Find a whitelist stage
    const wlStage = minter.mintStages.find(s => s.type !== "PUBLIC" && s.isMember);

    if (!wlStage) return null;

    const now = Date.now();
    const startMs = parseInt(wlStage.startTime) / 1e6;
    const endMs = wlStage.endTime ? parseInt(wlStage.endTime) / 1e6 : null;

    let timeLabel = "";
    if (now < startMs) {
      const diff = startMs - now;
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      timeLabel = `Starts in ${hours}h ${minutes}m`;
    } else if (!endMs || (now >= startMs && now <= endMs)) {
      timeLabel = "Mint now";
    } else {
      return null; // 🚨 skip ended
    }

    if (!wlStage.addressTokenCounts?.mintable || wlStage.addressTokenCounts.mintable <= 0) {
      return null; // 🚨 skip if not WL
    }

    return {
      status: "WL'ed",
      price: {
        amount: wlStage.salePrice.amount,
        exponent: wlStage.salePrice.exponent,
        symbol: wlStage.salePrice.symbol,
        amountUsd: wlStage.salePrice.amountUsd,
      },
      maxMint: wlStage.addressTokenCounts.mintable,
      timeLabel,
    };
  };


  const fetchWLs = async () => {
    setIsLoadingWLs(true);
    setWLResultsFetched(false);
    try {
      const minters = await fetchMinters();
      const promises = minters.map(async ({ minterAddress, name, contractAddress }) => {
        const wlInfo = await fetchCollectionWL(minterAddress, addresses["stargaze"]);
        if (!wlInfo) return null; // skip invalid/ended/no-WL
        return { name, contractAddress, wlInfo };
      });

      const results = (await Promise.all(promises)).filter(Boolean); // filter out nulls
      setWLResults(results);
      console.log("WL results:", results);
    } catch (err) {
      console.error("Error fetching WLs:", err);
    } finally {
      setIsLoadingWLs(false);
      setWLResultsFetched(true);
    }
  };

  const handleMarketplaceChange = (marketplace) => {
    setSelectedMarketplaces(prev => ({
      ...prev,
      [marketplace]: !prev[marketplace]
    }));
  };

  return (
    <>
      <div className="wl-checker-container">
        <button
          onClick={() => setShowWLModal(true)}
          className="wl-checker-btn"
          title="Whitelist Checker"
        >
          WL checker
          <span className="new-badge">NEW</span>
        </button>
      </div>

      {showWLModal && (
        <div className="wl-modal-overlay">
          <div className="modal-container">
            <button onClick={() => setShowWLModal(false)} className="close-btn" disabled={isLoadingWLs}>×</button>
            <div className="wl-modal-header">
              <h3>Whitelist Checker</h3>
            </div>
            <div className="marketplace-section">
              <label className="marketplace-checkbox">
                <input
                  type="checkbox"
                  checked={selectedMarketplaces.stargaze}
                  onChange={() => handleMarketplaceChange('stargaze')}
                  disabled={isLoadingWLs}
                />
                <span className="WLcheckmark"></span>
                Stargaze Marketplace
              </label>
            </div>
            <div className="wl-modal-actions">
              <button
                onClick={fetchWLs}
                className="check-btn"
                disabled={isLoadingWLs || !Object.values(selectedMarketplaces).some(Boolean)}
              >
                {isLoadingWLs ? <LoadingSpinner /> : 'Check Whitelists'}
              </button>
            </div>

            {wlResultsFetched && (
              wlResults.length > 0 ? (
                <div className="wl-results">
                  <table>
                    <thead>
                      <tr>
                        <th>Collection</th>
                        <th>Max Mint</th>
                        <th>Price</th>
                        <th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {wlResults.map(({ name, contractAddress, wlInfo }) => (
                        <tr key={contractAddress}>
                          <td>
                            <a
                              href={`https://www.stargaze.zone/l/${contractAddress}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {name}
                            </a>
                          </td>
                          <td>{wlInfo.maxMint || "-"}</td>
                          <td>
                            {wlInfo.price
                              ? `${wlInfo.price.amount / 10 ** wlInfo.price.exponent} ${wlInfo.price.symbol}`
                              : "-"}
                          </td>
                          <td>{wlInfo.timeLabel || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ textAlign: "center", marginTop: "1rem" }}>
                  No WL at this time.
                </p>
              )
            )}




          </div>
        </div>
      )}

      <style jsx>{`
        .wl-checker-container {
          position: absolute;
          right: 20px;
          z-index: 999;
        }
        .wl-checker-btn {
          position: relative;
          padding: 12px 20px;
          border-radius: 50px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          border: none;
          cursor: pointer;
          color: #fff;
          font-weight: bold;
          font-size: 14px;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
          transition: transform 0.3s;
        }
        .wl-checker-btn:hover {
          transform: translateY(-2px);
        }
        .new-badge {
          position: absolute;
          top: -6px;
          right: -6px;
          background: linear-gradient(45deg, #ff6b6b, #ff8e8e);
          color: white;
          border-radius: 12px;
          padding: 2px 6px;
          font-size: 10px;
          font-weight: bold;
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        .wl-modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10;
        }

        .modal-container {
          text-align: center;
          background: rgba(15, 15, 30, 0.7);
          backdrop-filter: blur(12px) saturate(130%);
          border-radius: 16px;
          padding: 2rem;
          border: 1px solid rgba(120, 80, 200, 0.3);
          min-width: 50%;
          box-shadow: 0 0 10px rgba(0, 68, 34, 0.4);
          color: white;
        }

        .wl-modal-header {
          display: flex;
          justify-content: center; /* center the header content horizontally */
          align-items: center;
          margin-bottom: 1rem;
          position: relative; /* needed for absolute positioning of close button */
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 24px;
          color: #888;
          cursor: pointer;
        }
        .close-btn:hover { color: white; }
        .marketplace-section {
          display: flex;
          flex-direction: column; /* stack vertically */
          align-items: center; /* center horizontally */
          gap: 12px; /* spacing between options */
          margin-bottom: 1.5rem;
        }

        .marketplace-options {
          display: flex;
          flex-direction: column; /* stack checkboxes vertically */
          align-items: center; /* center each checkbox + label */
          gap: 8px;
        }

      .marketplace-checkbox {
        display: flex;
        align-items: center;
        justify-content: center; /* centers checkbox + label horizontally */
        cursor: pointer;
        color: white;
        font-size: 16px;
        user-select: none;
        gap: 8px; /* space between checkmark and label */
      }

      .marketplace-checkbox input {
        display: none; /* hide native checkbox */
      }

      .WLcheckmark {
        width: 20px;
        height: 20px;
        border: 2px solid #667eea;
        border-radius: 4px;
        position: relative;
        display: flex;
        align-items: center; /* center ::after vertically */
        justify-content: center; /* center ::after horizontally */
      }

      .WLcheckmark::after {
        content: '';
        display: none; /* hide by default */
        width: 6px;
        height: 10px;
        border: solid white;
        border-width: 0 2px 2px 0;
        transform: rotate(45deg);
      }

      .marketplace-checkbox input:checked + .WLcheckmark::after {
        display: block; /* show check only when checked */
      }
        .check-btn {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          border: none;
          padding: 12px 25px;
          border-radius: 25px;
          font-weight: 600;
          cursor: pointer;
          margin-bottom: 1rem;
        }

        .check-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 1rem;
          color: white;
        }
        th, td {
          padding: 0.75rem 1rem;
          text-align: left;
        }
        th {
          border-bottom: 1px solid rgba(255,255,255,0.3);
        }
        tbody tr {
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        a { color: #76d6ff; text-decoration: none; }
        a:hover { text-decoration: underline; }

        .loading-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top: 2px solid white;
          animation: spin 1s linear infinite;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </>
  );
};

export default WLCheckerComponent;
