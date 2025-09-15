import React, { useState, useEffect, useMemo, useRef } from 'react';
import { API_ENDPOINTS, CORS_PROXIES } from "../utils/constants.js";
import LoadingSpinner from "./LoadingSpinner";
import Countdown from "./Countdown";

const WLCheckerComponent = ({ addresses, hasProofOfSupport }) => {
  const [showWLModal, setShowWLModal] = useState(false);
  const [isLoadingWLs, setIsLoadingWLs] = useState(false);
  const [hasAlertBeenClicked, setHasAlertBeenClicked] = useState(false);
  const [wlResults, setWLResults] = useState([]);
  const [wlAlertTime, setWLAlertTime] = useState(null);
  const [wlResultsFetched, setWLResultsFetched] = useState(false);
  const [selectedMarketplaces, setSelectedMarketplaces] = useState({
    stargaze: true,
    superbolt: true,
  });
  const fetchedOnceRef = useRef(false);

  useEffect(() => {
    if (hasProofOfSupport && !fetchedOnceRef.current) {
    fetchWLs();
    fetchedOnceRef.current = true;
  }
  }, []);

  const urgentWL = useMemo(() => {
    const now = Date.now();
    let isUrgent = false;
    let nextAlert = null;

    wlResults.forEach(({ wlInfo }) => {
      // Case 1: upcoming within 30 min
      if (wlInfo.startMs && now < wlInfo.startMs) {
        const diff = wlInfo.startMs - now;
        if (diff <= 30 * 60 * 1000) {
          isUrgent = true;
          if (!nextAlert || wlInfo.startMs < nextAlert) {
            nextAlert = wlInfo.startMs; // soonest upcoming
          }
        }
      }

      // Case 2: ongoing, but only if end time exists AND ends within 1 week
      if (wlInfo.startMs && now >= wlInfo.startMs && wlInfo.endMs) {
        const timeLeft = wlInfo.endMs - now;
        if (timeLeft > 0 && timeLeft <= 7 * 24 * 60 * 60 * 1000) { // ≤ 1 week
          isUrgent = true;
          if (!nextAlert || wlInfo.endMs < nextAlert) {
            nextAlert = wlInfo.endMs; // soonest ending within a week
          }
        }
      }
    });

    // Update state safely outside the loop
    if (isUrgent && nextAlert) {
      setWLAlertTime(nextAlert);
    } else {
      setWLAlertTime(null);
    }

    return isUrgent;
  }, [wlResults]);


  const fetchGraphQL = async (endpoint, query, variables, operationName) => {
    // Stargaze works fine → fetch directly
    if (endpoint === API_ENDPOINTS.STARGAZE_GRAPHQL) {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables, operationName }),
      });
      const json = await res.json();
      if (json.errors) throw new Error(JSON.stringify(json.errors));
      return json.data;
    }

    // Superbolt needs CORS proxy
    let retries = 0;
    const maxRetries = 3;

    while (retries <= maxRetries) {
      try {
        const proxyUrl = CORS_PROXIES[retries % CORS_PROXIES.length];
        let proxiedUrl;

        if (proxyUrl.includes("codetabs.com") || proxyUrl.includes("thingproxy")) {
          proxiedUrl = proxyUrl + encodeURIComponent(endpoint);
        } else {
          proxiedUrl = proxyUrl + endpoint;
        }

        const res = await fetch(proxiedUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, variables, operationName }),
        });

        if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
        const json = await res.json();
        if (json.errors) throw new Error(JSON.stringify(json.errors));
        return json.data;
      } catch (err) {
        console.warn(`[Superbolt CORS Proxy Retry ${retries}]`, err);
        retries++;
      }
    }

    throw new Error("All CORS proxies failed for Superbolt GraphQL query");
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

  // ----------- STARGAZE -----------
  const fetchStargazeMinters = async () => {
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
      filterByMinterType: ["VENDING", "OPEN_EDITION", "LIMITED_EDITION"],
    };
    const data = await fetchGraphQL(API_ENDPOINTS.STARGAZE_GRAPHQL, query, variables, "Minters");
    return data.collections.collections;
  };

  const fetchStargazeCollectionWL = async (contractAddress, walletAddress) => {
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
            status
            addressTokenCounts {
              mintable
            }
          }
        }
      }
    }
  `;

    const variables = { address: contractAddress, walletAddress };
    const data = await fetchGraphQL(API_ENDPOINTS.STARGAZE_GRAPHQL, query, variables, "MinterData");
    const minter = data.collection?.minterV2;
    if (!minter || minter.minterType === "BURN_TO_MINT") return [];

    let wlStages = minter.mintStages.filter(
      s => s.isMember && s.status !== "SOLD_OUT" && s.type !== "PUBLIC"
    );

    if (minter.minterAddress === "stars1cmgqc78wz2etqf89ggh7xe9gyl5mj3y8f2e6payyt5sv5t4plprq4jzpzu") {
      wlStages = [...wlStages, ...minter.mintStages];
    }

    if (!wlStages.length) return [];

    const now = Date.now();
    const validStages = wlStages
      .map(stage => {
        const startMs = parseInt(stage.startTime) / 1e6;
        const endMs = stage.endTime ? parseInt(stage.endTime) / 1e6 : null;

        let timeLabel = "";
        if (now < startMs) {
          const diff = startMs - now;
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          timeLabel = `Starts in ${hours}h ${minutes}m`;
        } else if (!endMs || (now >= startMs && now <= endMs)) {
          timeLabel = "Now";
        } else {
          return null;
        }

        if (!stage.addressTokenCounts?.mintable || stage.addressTokenCounts.mintable <= 0) {
          return null;
        }

        return {
          status: "WL'ed",
          price: {
            amount: stage.salePrice.amount,
            exponent: stage.salePrice.exponent,
            symbol: stage.salePrice.symbol,
            amountUsd: stage.salePrice.amountUsd,
          },
          maxMint: stage.addressTokenCounts.mintable,
          stageName: stage.name,
          startMs,
          endMs,
        };
      })
      .filter(Boolean);
    // 🚨 Add fake WL stage (starts in 15min, lasts 1h)
    // const fakeStart = now -5 * 60 * 1000;
    // const fakeEnd = fakeStart + 60 * 60 * 1000;

    // validStages.push({
    //   status: "WL'ed",
    //   price: {
    //     amount: 1000000, // 1 token (depends on exponent below)
    //     exponent: 6,
    //     symbol: "STARS",
    //     amountUsd: 1, // fake $ value
    //   },
    //   maxMint: 2,
    //   stageName: "🚨 Fake WL Test Stage",
    //   startMs: fakeStart,
    //   endMs: fakeEnd,
    // });


    return validStages;
  };

  // ----------- SUPERBOLT -----------
  const fetchSuperboltMinters = async () => {
    const query = `query SearchMintCollections($where: CollectionWhereInput, $take: Int, $skip: Int, $orderBy: [CollectionOrderByWithRelationInput!]) {
      collections(where: $where, take: $take, skip: $skip, orderBy: $orderBy) {
        collection_id
        name
      }
    }`;

    const variables = {
      orderBy: [
        { total_volume: { volume: "desc" } },
        { name: { sort: "desc" } },
      ],
      where: {
        AND: [
          { draftcollection_id: { not: { equals: null } } },
          { computed_mint_state: { in: ["MINTING", "UPCOMING"] } },
          { removed: { equals: false } },
          { verified: { equals: true } },
          { computed_mint_state: { notIn: ["NONE"] } },
        ],
      },
      skip: 0,
      take: 30,
    };

    const data = await fetchGraphQL(API_ENDPOINTS.SUPERBOLT_API, query, variables, "SearchMintCollections");
    return data.collections || [];
  };

  const fetchSuperboltCollectionWL = async (collectionId, walletAddress) => {
    const query = `query CollectionDetail($denom: String!, $collection_id: String!, $address_id: String, $loadwhitelist: Boolean!) {
      collection(where: {collection_id: $collection_id}) {
        name
        candy_phase(where: {candy: {is: {active: {equals: true}}}}) {
          use_whitelist
          mint_limit
          start_time
          end_time
          mint_fee_in(denom: $denom) {
            amount
            amount_usd
            denom
          }
          candy {
            name
            candy_whitelist(where: {address_id: {equals: $address_id}}) @include(if: $loadwhitelist) {
              address_id
            }
          }
        }
      }
    }`;

    const variables = {
      denom: "untrn",
      collection_id: collectionId,
      address_id: walletAddress,
      loadwhitelist: true,
    };

    const data = await fetchGraphQL(API_ENDPOINTS.SUPERBOLT_API, query, variables, "CollectionDetail");
    const phases = data.collection?.candy_phase || [];
    const now = Date.now();

    return phases
      .filter(p => p.use_whitelist && p.candy.candy_whitelist?.length > 0)
      .map(p => {
        const startMs = new Date(p.start_time).getTime();
        const endMs = p.end_time ? new Date(p.end_time).getTime() : null;
        let timeLabel = "";
        if (now < startMs) {
          const diff = startMs - now;
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          timeLabel = `Starts in ${hours}h ${minutes}m`;
        } else if (!endMs || (now >= startMs && now <= endMs)) {
          timeLabel = "Now";
        } else {
          return null;
        }

        return {
          status: "WL'ed",
          price: p.mint_fee_in,
          maxMint: p.mint_limit,
          stageName: p.candy.name,
          startMs,
          endMs,
        };
      })
      .filter(Boolean);
  };

  // ----------- FETCH WLs -----------
  const fetchWLs = async () => {
    setIsLoadingWLs(true);
    setWLResultsFetched(false);
    try {
      let results = [];

      if (selectedMarketplaces.stargaze) {
        const minters = await fetchStargazeMinters();
        const promises = minters.map(async ({ minterAddress, name, contractAddress }) => {
          const wlInfos = await fetchStargazeCollectionWL(minterAddress, addresses["stargaze"]);
          if (!wlInfos || wlInfos.length === 0) return null;
          return wlInfos.map(wlInfo => ({ name, contractAddress, wlInfo, marketplace: "stargaze" }));
        });
        const resultsNested = await Promise.all(promises);
        results.push(...resultsNested.flat().filter(Boolean));
      }

      if (selectedMarketplaces.superbolt) {
        const minters = await fetchSuperboltMinters();
        const promises = minters.map(async (c) => {
          const wlInfos = await fetchSuperboltCollectionWL(c.collection_id, addresses["neutron"]);
          if (!wlInfos || wlInfos.length === 0) return null;
          return wlInfos.map(wlInfo => ({ name: c.name, contractAddress: c.collection_id, wlInfo, marketplace: "superbolt" }));
        });
        const resultsNested = await Promise.all(promises);
        results.push(...resultsNested.flat().filter(Boolean));
      }

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
          onClick={() => { setShowWLModal(true); setHasAlertBeenClicked(true) }}
          className={`wl-checker-btn ${urgentWL && !hasAlertBeenClicked ? "wl-alert" : ""}`}
          title="Whitelist Checker"
        >
          {urgentWL && hasProofOfSupport ? (
            <span>
              WL Mint{" "}
              {wlAlertTime && (
                <Countdown targetTime={wlAlertTime} prefix="(" suffix=")" />
              )}
            </span>
          ) : (
            <>
              <span className="wl-btn-text-desktop">WL checker</span>
              <span className="wl-btn-text-mobile">WL</span>
              <span className="new-badge">NEW</span>
            </>
          )}
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
                <img
                  src="./Stargaze.svg"
                  alt="Stargaze"
                  style={{ width: "20px", height: "20px" }}
                />
              </label>
              <label className="marketplace-checkbox">
                <input
                  type="checkbox"
                  checked={selectedMarketplaces.superbolt}
                  onChange={() => handleMarketplaceChange('superbolt')}
                  disabled={isLoadingWLs}
                />
                <span className="WLcheckmark"></span>
                Superbolt Marketplace
                <img
                  src="./Superbolt.png"
                  alt="Superbolt"
                  style={{ width: "20px", height: "20px" }}
                />
              </label>
            </div>
            <div className="wl-modal-actions">
              <button
                onClick={fetchWLs}
                className="check-btn"
                disabled={isLoadingWLs || !Object.values(selectedMarketplaces).some(Boolean)}
              >
                {isLoadingWLs ? <LoadingSpinner message={""} /> : 'Check Whitelists'}
              </button>
            </div>

            {wlResultsFetched && (
              wlResults.length > 0 ? (
                <div className="wl-results">
                  <table>
                    <thead>
                      <tr>
                        <th></th>
                        <th>Collection</th>
                        <th>Stage</th>
                        <th>Max Mint</th>
                        <th>Price</th>
                        <th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {wlResults.map(({ name, contractAddress, wlInfo, marketplace }) => (
                        <tr key={`${marketplace}-${contractAddress}`}>
                          <td>
                            {marketplace === "stargaze" ? (
                              <img
                                src="./Stargaze.svg"
                                alt="Stargaze"
                                style={{ width: "20px", height: "20px" }}
                              />
                            ) : (
                              <img
                                src="./Superbolt.png"
                                alt="Superbolt"
                                style={{ width: "20px", height: "20px" }}
                              />
                            )}
                          </td>

                          <td>
                            {marketplace === "stargaze" ? (
                              <a
                                href={`https://www.stargaze.zone/l/${contractAddress}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Go to Mint Page"
                              >
                                {name === "NFTHUB Proof of Support" ? "🌟 " + name + " 🌟" : name}
                              </a>
                            ) : (
                              <a
                                href={`https://app.superbolt.wtf/browse/${contractAddress}/mint`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Go to Mint Page"
                              >
                                {name}
                              </a>
                            )}
                          </td>
                          <td>{wlInfo.stageName || "-"}</td>
                          <td>{wlInfo.maxMint || "-"}</td>
                          <td>
                            {wlInfo.price ? (
                              marketplace === "stargaze" ? (
                                `${wlInfo.price.amount / 10 ** wlInfo.price.exponent} ${wlInfo.price.symbol}` +
                                (wlInfo.price.amountUsd
                                  ? ` ($${Number(wlInfo.price.amountUsd).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })})`
                                  : "")
                              ) : (
                                `${wlInfo.price.amount} NTRN` +
                                (wlInfo.price.amount_usd
                                  ? ` ($${Number(wlInfo.price.amount_usd).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })})`
                                  : "")
                              )
                            ) : "-"}
                          </td>
                          <td>
                            {wlInfo.startMs && Date.now() < wlInfo.startMs ? (
                              Date.now() + 30 * 60 * 1000 > wlInfo.startMs ? (
                                // Starts within 30min → RED
                                <span style={{ color: "red" }}>
                                  <Countdown targetTime={wlInfo.startMs} prefix="Starts in " />
                                </span>
                              ) : (
                                <Countdown targetTime={wlInfo.startMs} prefix="Starts in " />
                              )
                            ) : wlInfo.endMs ? (
                              Date.now() + 1000 * 60 * 60 * 24 * 60 < wlInfo.endMs ? ( // > 2 months
                                "Now"
                              ) : (
                                // Ongoing + has end → RED
                                <span style={{ color: "red" }}>
                                  <Countdown targetTime={wlInfo.endMs} prefix="Now (" suffix=")" />
                                </span>
                              )
                            ) : (
                              "Now"
                            )}
                          </td>
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

      <style>{`
      .wl-checker-container {
        position: absolute;
        right: 20px;
        z-index: 999;
      }

      .wl-checker-btn {
        position: relative;
        padding: 12px 20px;
        border-radius: 50px;
        background: linear-gradient(135deg, #1e2a47, #2d3b5c);
        border: 1px solid rgba(255, 255, 255, 0.1);
        cursor: pointer;
        color: #ffffff;
        font-weight: bold;
        font-size: 14px;
        box-shadow: 0 4px 15px rgba(30, 42, 71, 0.4);
        transition: transform 0.3s, box-shadow 0.3s, border-color 0.3s;
      }
        .wl-checker-btn.wl-alert {
          background: linear-gradient(135deg, #1e2a47, #2d3b5c);
          animation: pulse-alert 1s infinite;
          color: white;
          font-weight: bold;
          font-size: 15px;
        }

        @keyframes pulse-alert {
          0%, 100% { transform: scale(1); box-shadow: 0 0 10px #ff4b4b; }
          50% { transform: scale(1.1); box-shadow: 0 0 25px #ff8c42; }
        }
      /* Desktop / default */
      .wl-btn-text-desktop { display: inline; }
      .wl-btn-text-mobile  { display: none; }

      /* Mobile override */
      @media (max-width: 600px) {
        .wl-btn-text-desktop { display: none; }
        .wl-btn-text-mobile  { display: inline; }

        .wl-checker-btn {
          padding: 10px 16px;
          font-size: 13px;
          border-radius: 40px;
        }
      }

      .wl-checker-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(45, 59, 92, 0.6);
        border-color: rgba(255, 255, 255, 0.2);
        background: linear-gradient(135deg, #2d3b5c, #3a4a6b);
      }

      .wl-checker-btn:active {
        transform: translateY(0px);
        box-shadow: 0 2px 10px rgba(30, 42, 71, 0.3);
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
        z-index: 1000;
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
      /* Mobile responsiveness */
      @media (max-width: 600px) {
        .modal-container {
          max-width: 95vw;      /* cap width to screen */
          width: auto;          /* let it size naturally */
          min-width: unset;
          padding: 1rem;
          border-radius: 12px;
          box-sizing: border-box;
        }

        .modal-overlay {
          align-items: flex-start;
          justify-content: center; /* centers horizontally */
          padding-top: 10vh;
          overflow-y: auto;
        }

        .wl-modal-header h3 {
          font-size: 18px;
        }

        .marketplace-checkbox {
          font-size: 14px;
        }

        .check-btn {
          width: 100%;
          padding: 10px;
          font-size: 14px;
          border-radius: 20px;
        }

        table {
          display: block;      /* allow horizontal scrolling */
          overflow-x: auto;
          white-space: nowrap;
        }

        th, td {
          padding: 0.5rem;
          font-size: 13px;
        }

        .close-btn {
          font-size: 20px;
          position: absolute;
          top: 10px;
          right: 10px;
        }
      }

      `}</style>
    </>
  );
};

export default WLCheckerComponent;
