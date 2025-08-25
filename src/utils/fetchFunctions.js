// Utility functions for fetching NFT data from various sources
import daosConfig from "../daos.json";

import {
  API_ENDPOINTS,
  CORS_PROXIES,
  REQUEST_CONFIG,
  PAGINATION_CONFIG,
} from "./constants.js";
import pLimit from './pLimit.js';

const limit = pLimit(20);
// --- Caching and Deduplication Logic ---

// Store for active requests and their promises
const activeRequests = new Map();
// Store for cached results
const cache = new Map();

// Helper function for delays
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Function to generate a unique key for caching based on function name and arguments
const generateCacheKey = (functionName, ...args) => {
  return `${functionName}:${JSON.stringify(args)}`;
};

// Generic cached request function
const cachedRequest = async (functionName, fetchFunction, ...args) => {
  const cacheKey = generateCacheKey(functionName, ...args);

  // 1. Check cache
  if (cache.has(cacheKey)) {
    // console.log(`[CACHE HIT] ${functionName} for key: ${cacheKey}`);
    return cache.get(cacheKey);
  }

  // 2. Check if request is already active
  if (activeRequests.has(cacheKey)) {
    // console.log(
    //   `[REQUEST ACTIVE] ${functionName} for key: ${cacheKey}, waiting...`,
    // );
    return activeRequests.get(cacheKey); // Return the promise of the ongoing request
  }

  // 3. If not in cache and not active, initiate the request
  // console.log(
  //   `[CACHE MISS] ${functionName} for key: ${cacheKey}, initiating fetch...`,
  // );
  const requestPromise = fetchFunction(...args)
    .then((result) => {
      // Cache the result on success
      // console.log(`[CACHE SET] ${functionName} for key: ${cacheKey}`);
      cache.set(cacheKey, result);
      // Remove from active requests
      activeRequests.delete(cacheKey);
      return result;
    })
    .catch((error) => {
      console.error(
        `[FETCH ERROR] ${functionName} for key: ${cacheKey}`,
        error,
      );
      // Remove from active requests on error, do not cache errors
      activeRequests.delete(cacheKey);
      throw error; // Re-throw the error to be handled by the caller
    });

  // Store the promise in active requests
  activeRequests.set(cacheKey, requestPromise);

  return requestPromise;
};

// Helper function to get collection name from contract address
const getCollectionNameFromContract = (contractAddress) => {
  // Search through all chains and DAOs to find the collection name
  for (const [chainId, daos] of Object.entries(daosConfig.DAOS)) {
    for (const [daoName, daoConfig] of Object.entries(daos)) {
      if (daoConfig.collection === contractAddress) {
        // Remove "DAO" suffix and return clean collection name
        return daoName.replace(" DAO", "");
      }
    }
  }

  // Fallback to last 8 chars of contract address if not found
  return `Collection ${contractAddress.slice(-8)}`;
};

// Fetch metadata for listed NFTs from BackboneLabs API (Original function)
const _fetchListedNFTMetadata = async (collectionAddress, tokenId, chain) => {
  try {
    // console.log(
    //   `[DEBUG] Fetching listed NFT metadata from BackboneLabs API: ${collectionAddress}/${tokenId} on ${chain}`,
    // );

    const url = `${API_ENDPOINTS.BACKBONE_LABS_API}/dapps/necropolis/collections/${collectionAddress}/${tokenId}`;

    let retries = 0;
    const maxRetries = REQUEST_CONFIG.MAX_RETRIES;

    while (retries <= maxRetries) {
      try {
        // Try multiple CORS proxies
        const corsProxies = CORS_PROXIES;

        let proxiedUrl;
        const proxyUrl = corsProxies[retries % corsProxies.length];

        if (proxyUrl.includes("codetabs.com")) {
          proxiedUrl = proxyUrl + encodeURIComponent(url);
        } else if (proxyUrl.includes("thingproxy.freeboard.io")) {
          proxiedUrl = proxyUrl + encodeURIComponent(url);
        } else {
          proxiedUrl = proxyUrl + url;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          REQUEST_CONFIG.TIMEOUT,
        );

        const response = await fetch(proxiedUrl, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const metadata = await response.json();
          // console.log(
          //   `[DEBUG] ✓ Fetched listed NFT metadata from BackboneLabs API for ${tokenId}:`,
          //   metadata,
          // );

          // Transform the metadata to our standard format
          const processedTraits = (
            metadata.attributes ||
            metadata.traits ||
            []
          ).map((trait) => ({
            trait_type: trait.trait_type || trait.name,
            value: trait.value,
            name: trait.trait_type || trait.name,
          }));

          return {
            name: metadata.name || `NFT #${tokenId}`,
            description: metadata.description || "",
            attributes: processedTraits,
            traits: processedTraits,
            image: metadata.image || metadata.image_url,
          };
        } else if (
          response.status === 408 ||
          response.status === 429 ||
          response.status >= 500
        ) {
          retries++;
          if (retries <= maxRetries) {
            const retryDelay = Math.min(
              REQUEST_CONFIG.RETRY_DELAY_BASE * Math.pow(2, retries - 1),
              REQUEST_CONFIG.MAX_RETRY_DELAY,
            );
            console.log(
              `[DEBUG] BackboneLabs API error ${response.status}, retrying in ${retryDelay}ms (attempt ${retries}/${maxRetries})`,
            );
            await delay(retryDelay);
            continue;
          }
        }

        console.warn(
          `[WARNING] Failed to fetch listed NFT metadata from BackboneLabs API: ${response.status} ${response.statusText}`,
        );
        return null;
      } catch (error) {
        retries++;
        if (retries <= maxRetries) {
          const retryDelay = Math.min(
            REQUEST_CONFIG.RETRY_DELAY_BASE * Math.pow(2, retries - 1),
            REQUEST_CONFIG.MAX_RETRY_DELAY,
          );
          console.log(
            `[DEBUG] BackboneLabs API network error, retrying in ${retryDelay}ms (attempt ${retries}/${maxRetries}):`,
            error.name === "AbortError" ? "Request timeout" : error.message,
          );
          await delay(retryDelay);
          continue;
        }

        console.error(
          `[ERROR] Error fetching listed NFT metadata from BackboneLabs API after ${maxRetries} retries:`,
          error,
        );
        return null;
      }
    }

    return null;
  } catch (error) {
    console.error(
      `Error fetching listed NFT metadata from BackboneLabs API ${collectionAddress}/${tokenId}:`,
      {
        error: error.message,
        name: error.name,
        stack: error.stack,
      },
    );
    return null;
  }
};

// Fetch metadata for listed NFTs from BackboneLabs API (with caching)
export const fetchListedNFTMetadata = async (
  collectionAddress,
  tokenId,
  chain,
) => {
  return cachedRequest(
    "fetchListedNFTMetadata",
    _fetchListedNFTMetadata,
    collectionAddress,
    tokenId,
    chain,
  );
};

// Fetch staked NFTs from DAO (Original function)
const _fetchStakedNFTs = async (chain, contract, userAddress) => {
  try {
    // First try the DAO DAO indexer
    const url = `${API_ENDPOINTS.DAO_DAO_INDEXER}/${chain}/contract/${contract}/daoVotingCw721Staked/stakedNfts?address=${userAddress}`;
    const response = await fetch(url);

    if (response.ok) {
      const data = await response.json();
      if (data && Array.isArray(data)) {
        // console.log(
        //   `[DEBUG] Successfully fetched staked NFTs from indexer for ${chain}/${contract}`,
        // );
        return data;
      }
    }

    console.warn(
      `DAO DAO indexer failed for ${chain}/${contract}: ${response.status}. Trying direct contract query...`,
    );

    // Fallback: Query contract directly
    const stakedNFTs = await fetchStakedNFTsDirectly(
      chain,
      contract,
      userAddress,
    );
    return stakedNFTs;
  } catch (error) {
    console.error(
      `Error with DAO DAO indexer for ${chain}/${contract}:`,
      error,
    );

    // Fallback: Query contract directly
    try {
      console.log(
        `[DEBUG] Attempting direct contract query fallback for ${chain}/${contract}`,
      );
      const stakedNFTs = await fetchStakedNFTsDirectly(
        chain,
        contract,
        userAddress,
      );
      return stakedNFTs;
    } catch (fallbackError) {
      console.error(
        `Both indexer and direct contract query failed for ${chain}/${contract}:`,
        fallbackError,
      );
      return [];
    }
  }
};

// Direct contract query fallback function
const fetchStakedNFTsDirectly = async (chain, contract, userAddress) => {
  try {
    console.log(
      `[DEBUG] Querying contract directly: ${chain}/${contract} for address ${userAddress}`,
    );

    const query = {
      staked_nfts: {
        address: userAddress,
      },
    };
    const queryString = JSON.stringify(query);
    const encodedQuery = btoa(queryString);

    // Select appropriate LCD endpoint based on chain
    let lcdEndpoint;
    switch (chain) {
      case "stargaze-1":
        lcdEndpoint = API_ENDPOINTS.STARGAZE_INDEXER;
        break;
      case "osmosis-1":
        lcdEndpoint = API_ENDPOINTS.OSMOSIS_LCD;
        break;
      case "cosmoshub-4":
        lcdEndpoint = API_ENDPOINTS.COSMOS_HUB_LCD;
        break;
      case "neutron-1":
        lcdEndpoint = API_ENDPOINTS.NEUTRON_INDEXER;
        break;
      default:
        throw new Error(`Unsupported chain: ${chain}`);
    }

    const url = `${lcdEndpoint}/cosmwasm/wasm/v1/contract/${contract}/smart/${encodedQuery}`;

    let retries = 0;
    const maxRetries = REQUEST_CONFIG.MAX_RETRIES;

    while (retries <= maxRetries) {
      try {
        console.log(
          `[DEBUG] Direct contract query attempt ${retries + 1}/${maxRetries + 1}: ${url}`,
        );

        const response = await fetch(url, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        });

        if (response.ok) {
          const responseData = await response.json();
          // console.log(
          //   `[DEBUG] Direct contract query response for ${chain}/${contract}:`,
          //   responseData,
          // );

          // Extract staked NFT data from response
          const stakedData = responseData.data || responseData;

          // The response should contain an array of staked NFT token IDs
          if (Array.isArray(stakedData)) {
            console.log(
              `[DEBUG] Direct contract query found ${stakedData.length} staked NFTs`,
            );
            return stakedData;
          } else if (stakedData && Array.isArray(stakedData.tokens)) {
            console.log(
              `[DEBUG] Direct contract query found ${stakedData.tokens.length} staked NFTs`,
            );
            return stakedData.tokens;
          } else {
            console.log(`[DEBUG] Direct contract query found no staked NFTs`);
            return [];
          }
        } else if (
          response.status === 408 ||
          response.status === 429 ||
          response.status >= 500
        ) {
          retries++;
          if (retries <= maxRetries) {
            const retryDelay = Math.min(
              REQUEST_CONFIG.RETRY_DELAY_BASE * Math.pow(2, retries - 1),
              REQUEST_CONFIG.MAX_RETRY_DELAY,
            );
            console.log(
              `[DEBUG] Direct contract query error ${response.status}, retrying in ${retryDelay}ms (attempt ${retries}/${maxRetries})`,
            );
            await delay(retryDelay);
            continue;
          }
        }

        console.warn(
          `[WARNING] Direct contract query failed: ${response.status} ${response.statusText}`,
        );
        return [];
      } catch (error) {
        retries++;
        if (retries <= maxRetries) {
          const retryDelay = Math.min(
            REQUEST_CONFIG.RETRY_DELAY_BASE * Math.pow(2, retries - 1),
            REQUEST_CONFIG.MAX_RETRY_DELAY,
          );
          console.log(
            `[DEBUG] Direct contract query network error, retrying in ${retryDelay}ms (attempt ${retries}/${maxRetries}):`,
            error.name === "AbortError" ? "Request timeout" : error.message,
          );
          await delay(retryDelay);
          continue;
        }

        throw error;
      }
    }

    return [];
  } catch (error) {
    console.error(`Error in direct contract query for ${chain}/${contract}:`, {
      error: error.message,
      name: error.name,
      stack: error.stack,
    });
    return [];
  }
};

// Fetch staked NFTs from DAO (with caching)
export const fetchStakedNFTs = async (chain, contract, userAddress) => {
  return cachedRequest(
    "fetchStakedNFTs",
    _fetchStakedNFTs,
    chain,
    contract,
    userAddress,
  );
};

// Fetch single NFT data from Stargaze (Original function)
const _fetchStargazeSingleNFT = async (collectionAddr, tokenId) => {
  try {
    const query = `
      query ($collectionAddr: String!, $tokenId: String!) {
        token(collectionAddr: $collectionAddr, tokenId: $tokenId) {
          name
          tokenId
          imageUrl
          collection {
            floor {
              denom
              amount
              amountUsd
              symbol
              exponent
            }
            name
            contractAddress
            highestOffer {
                offerPrice {
                  amount
                  amountUsd
                  exponent
                  denom
                  symbol
                  }
                }
          }
          traits {
            rarity
            name
            value
          }
          isEscrowed
          listPrice {
            amount
            denom
            symbol
            amountUsd
            exponent
          }
          lastSalePrice {
          amount
          denom
          amountUsd
          symbol
          exponent
          }
          highestOffer {
            offerPrice {
              amount
              amountUsd
              denom
              exponent
              symbol
              }
            }
          rarityOrder
          media {
            visualAssets {
              md {
                url
                type

              }
            }
          }
        }
      }
    `;

    const variables = {
      collectionAddr: collectionAddr,
      tokenId: tokenId,
    };

    const response = await fetch(API_ENDPOINTS.STARGAZE_GRAPHQL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    const data = await response.json();

    if (data.errors) {
      console.error(
        `[ERROR] GraphQL errors for ${collectionAddr}/${tokenId}:`,
        {
          errors: data.errors,
          collection: collectionAddr,
          tokenId: tokenId,
        },
      );
      return null;
    }

    const token = data.data?.token;
    if (!token) {
      console.warn(
        `[WARNING] No token data found for ${collectionAddr}/${tokenId}`,
      );
      return null;
    }

    return token;
  } catch (error) {
    console.error(
      `[ERROR] Failed to fetch Stargaze NFT ${collectionAddr}/${tokenId}:`,
      {
        collection: collectionAddr,
        tokenId: tokenId,
        error: error.message,
        stack: error.stack,
        networkError:
          error.name === "TypeError" ? "Network/CORS issue" : "Unknown",
      },
    );
    return null;
  }
};

// Fetch single NFT data from Stargaze (with caching)
export const fetchStargazeSingleNFT = async (collectionAddr, tokenId) => {
  return cachedRequest(
    "fetchStargazeSingleNFT",
    _fetchStargazeSingleNFT,
    collectionAddr,
    tokenId,
  );
};

// Fetch single NFT data from Osmosis using collection-specific metadata URLs (Original function)
const _fetchOsmosisSingleNFT = async (
  collection,
  tokenId,
  metadataUrl = null,
) => {
  try {
    // console.log(
    //   `[DEBUG] Fetching Osmosis NFT metadata: ${collection}/${tokenId}`,
    // );

    if (!metadataUrl) {
      console.warn(`[WARNING] No metadata URL provided for ${tokenId}`);
      return null;
    }

    // Use provided metadata URL (from DAO config)
    let url = metadataUrl
      .replace("{tokenId}", tokenId)
      .replace("{collection}", collection);

    // Convert IPFS URLs to HTTP gateway URLs for better accessibility
    if (url.startsWith("ipfs://")) {
      url = url.replace("ipfs://", API_ENDPOINTS.IPFS_GATEWAY_PRIMARY);
    }

    // console.log(`[DEBUG] Using metadata URL: ${url}`);

    // No rate limiting delays - fetch immediately

    let nftMetadata = null;

    let retries = 0;
    const maxRetries = REQUEST_CONFIG.MAX_RETRIES;

    while (retries <= maxRetries) {
      try {
        // Try multiple CORS proxies
        const corsProxies = CORS_PROXIES;

        let proxiedUrl;
        const proxyUrl = corsProxies[retries % corsProxies.length];

        if (proxyUrl.includes("codetabs.com")) {
          proxiedUrl = proxyUrl + encodeURIComponent(url);
        } else if (proxyUrl.includes("thingproxy.freeboard.io")) {
          proxiedUrl = proxyUrl + encodeURIComponent(url);
        } else {
          proxiedUrl = proxyUrl + url;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          REQUEST_CONFIG.TIMEOUT,
        ); // 15 second timeout

        const response = await fetch(proxiedUrl, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          nftMetadata = await response.json();
          console.log(
            `[DEBUG] Fetched metadata from API for ${tokenId}:`,
            nftMetadata,
          );
          break; // Success, exit retry loop
        } else if (
          response.status === 408 ||
          response.status === 429 ||
          response.status >= 500
        ) {
          // Timeout, rate limited or server error, retry with longer delay
          retries++;
          if (retries <= maxRetries) {
            const retryDelay = Math.min(
              REQUEST_CONFIG.RETRY_DELAY_BASE * Math.pow(2, retries - 1),
              REQUEST_CONFIG.MAX_RETRY_DELAY,
            );
            console.log(
              `[DEBUG] API error ${response.status} (${response.status === 408 ? "Timeout" : "Server Error"}), retrying in ${retryDelay}ms (attempt ${retries}/${maxRetries})`,
            );
            await delay(retryDelay);
            continue;
          }
        }

        console.warn(
          `[WARNING] Failed to fetch metadata from API: ${response.status} ${response.statusText}`,
        );
        return null;
      } catch (error) {
        retries++;
        if (retries <= maxRetries) {
          const retryDelay = Math.min(
            REQUEST_CONFIG.RETRY_DELAY_BASE * Math.pow(2, retries - 1),
            REQUEST_CONFIG.MAX_RETRY_DELAY,
          );
          console.log(
            `[DEBUG] Network error, retrying in ${retryDelay}ms (attempt ${retries}/${maxRetries}):`,
            error.name === "AbortError" ? "Request timeout" : error.message,
          );
          await delay(retryDelay);
          continue;
        }

        console.error(
          `[ERROR] Error fetching metadata from API after ${maxRetries} retries:`,
          error,
        );
        return null;
      }
    }

    if (!nftMetadata) {
      console.warn(`[WARNING] No metadata found for ${tokenId}`);
      return null;
    }

    // console.log(`[DEBUG] Processing metadata for ${tokenId}:`, nftMetadata);

    // Process image URL with better handling for different formats
    let imageUrl =
      nftMetadata.image || nftMetadata.image_url || nftMetadata.cf_url;
    if (imageUrl && imageUrl.startsWith("ipfs://")) {
      imageUrl = imageUrl.replace(
        "ipfs://",
        API_ENDPOINTS.IPFS_GATEWAY_PRIMARY,
      );
    }

    // Process traits with proper structure and comprehensive null checking
    const rawTraits = (nftMetadata && Array.isArray(nftMetadata.attributes))
      ? nftMetadata.attributes
      : (nftMetadata && Array.isArray(nftMetadata.traits))
        ? nftMetadata.traits
        : [];

    const processedTraits = rawTraits
      .filter((trait) => trait && typeof trait === "object") // ensure not null/undefined
      .map((trait) => ({
        trait_type: trait.trait_type || trait.name || "Unknown",
        value: trait.value !== undefined && trait.value !== null ? trait.value : "Unknown",
        name: trait.trait_type || trait.name || "Unknown",
      }));

    // Define base data with defaults for safety
    const baseData = {
      name: `Token #${tokenId}`,
      tokenId: String(tokenId),
      image_url: null,
      cf_url: null,
      traits: [],
      attributes: [],
      rank: null,
      rarity: null,
      description: "",
      collection: {
        name: getCollectionNameFromContract(collection),
      },
    };

    // Transform to our standard format with proper type checking and safe property access
    const safeName = (nftMetadata && typeof nftMetadata.name === "string")
      ? nftMetadata.name
      : `Token #${tokenId}`;

    const safeDescription = (nftMetadata && typeof nftMetadata.description === "string")
      ? nftMetadata.description
      : "";

    const safeRank = (nftMetadata && typeof nftMetadata.rank === "number")
      ? nftMetadata.rank
      : null;

    const safeRarity = (nftMetadata && typeof nftMetadata.rarityScore === "number")
      ? nftMetadata.rarityScore
      : null;

    const transformedData = {
      ...baseData, // Start with safe defaults
      name: safeName,
      image_url: typeof imageUrl === "string" ? imageUrl : null,
      cf_url: typeof imageUrl === "string" ? imageUrl : null,
      traits: processedTraits,
      attributes: processedTraits,
      rank: safeRank,
      rarity: safeRarity,
      description: safeDescription,
    };

    // console.log(
    //   `[DEBUG] Transformed Osmosis NFT data for ${tokenId}:`,
    //   transformedData,
    // );
    return transformedData;
  } catch (error) {
    console.error(`Error fetching Osmosis NFT ${collection}/${tokenId}:`, {
      error: error.message,
      name: error.name,
      stack: error.stack,
    });

    return null;
  }
};

// Fetch single NFT data from Osmosis using collection-specific metadata URLs (with caching)
export const fetchOsmosisSingleNFT = async (
  collection,
  tokenId,
  metadataUrl = null,
) => {
  return cachedRequest(
    "fetchOsmosisSingleNFT",
    _fetchOsmosisSingleNFT,
    collection,
    tokenId,
    metadataUrl,
  );
};

// Fetch collection floor price for Osmosis (Original function)
const _fetchOsmosisCollectionFloor = async (collection) => {
  try {
    const url = `${API_ENDPOINTS.BACKBONE_LABS_API}/dapps/necropolis/collections/${collection}`;
    // console.log(`[DEBUG] Fetching Osmosis collection floor from: ${url}`);

    // No rate limiting delays - fetch immediately

    let retries = 0;
    const maxRetries = REQUEST_CONFIG.MAX_RETRIES;

    while (retries <= maxRetries) {
      try {
        // Try multiple CORS proxies
        const corsProxies = CORS_PROXIES;

        let proxiedUrl;
        const proxyUrl = corsProxies[retries % corsProxies.length];

        if (proxyUrl.includes("codetabs.com")) {
          proxiedUrl = proxyUrl + encodeURIComponent(url);
        } else if (proxyUrl.includes("thingproxy.freeboard.io")) {
          proxiedUrl = proxyUrl + encodeURIComponent(url);
        } else {
          proxiedUrl = proxyUrl + url;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          REQUEST_CONFIG.TIMEOUT,
        );

        const response = await fetch(proxiedUrl, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          // console.log(
          //   `[DEBUG] Osmosis collection floor data for ${collection}:`,
          //   data,
          // );

          // Handle different response formats
          let floorPrice = 0;

          // Check if data is a direct number (price in bOSMO)
          if (typeof data === "number") {
            floorPrice = data;
          } else if (data?.floor) {
            // Handle object with floor property
            floorPrice = data.floor.price || data.floor.amount || data.floor;
          } else if (data?.floorPrice) {
            // Handle object with floorPrice property
            floorPrice =
              data.floorPrice.price ||
              data.floorPrice.amount ||
              data.floorPrice;
          }

          // console.log(
          //   `[DEBUG] Extracted floor price for ${collection}: ${floorPrice} bOSMO`,
          // );

          if (floorPrice > 0) {
            return {
              price: floorPrice, // Floor price is already in bOSMO
              usd_price: 0, // USD calculation will be done later with bOSMO price
              denom:
                "factory/osmo1s3l0lcqc7tu0vpj6wdjz9wqpxv8nk6eraevje4fuwkyjnwuy82qsx3lduv/boneOsmo",
              symbol: "bOSMO",
            };
          }

          console.log(`[DEBUG] No valid floor price found for ${collection}`);

          // Return null to indicate no floor data available
          return null;
        } else if (
          response.status === 408 ||
          response.status === 429 ||
          response.status >= 500
        ) {
          retries++;
          if (retries <= maxRetries) {
            const retryDelay = Math.min(
              REQUEST_CONFIG.RETRY_DELAY_BASE * Math.pow(2, retries - 1),
              REQUEST_CONFIG.MAX_RETRY_DELAY,
            );
            console.log(
              `[DEBUG] Collection floor API error ${response.status}, retrying in ${retryDelay}ms (attempt ${retries}/${maxRetries})`,
            );
            await delay(retryDelay);
            continue;
          }
        }

        console.warn(
          `Failed to fetch Osmosis collection ${collection}: ${response.status} ${response.statusText}`,
        );
        return null;
      } catch (error) {
        retries++;
        if (retries <= maxRetries) {
          const retryDelay = Math.min(
            REQUEST_CONFIG.RETRY_DELAY_BASE * Math.pow(2, retries - 1),
            REQUEST_CONFIG.MAX_RETRY_DELAY,
          );
          console.log(
            `[DEBUG] Collection floor network error, retrying in ${retryDelay}ms (attempt ${retries}/${maxRetries}):`,
            error.name === "AbortError" ? "Request timeout" : error.message,
          );
          await delay(retryDelay);
          continue;
        }

        throw error; // Re-throw after max retries
      }
    }

    return null;
  } catch (error) {
    console.error(`Error fetching Osmosis collection ${collection}:`, {
      error: error.message,
      name: error.name,
      stack: error.stack,
      url: `${API_ENDPOINTS.BACKBONE_LABS_API}/dapps/necropolis/collections/${collection}`,
    });

    if (error.name === "TypeError" && error.message.includes("fetch")) {
      console.error(
        `[ERROR] Network/CORS error for Osmosis collection ${collection}`,
      );
    }

    // Return null to indicate no floor data available
    return null;
  }
};

// Fetch Osmosis collection floor price (with caching)
export const fetchOsmosisCollectionFloor = async (collection) => {
  return cachedRequest(
    "fetchOsmosisCollectionFloor",
    _fetchOsmosisCollectionFloor,
    collection,
  );
};

// Fetch single NFT data from Cosmos Hub contract (Original function)
const _fetchCosmosHubSingleNFT = async (contractAddress, tokenId) => {
  try {
    // console.log(
    //   `[DEBUG] Fetching Cosmos Hub NFT metadata: ${contractAddress}/${tokenId}`,
    // );

    // Validate inputs
    if (!contractAddress || !tokenId) {
      console.error(
        `[ERROR] Missing contract address or token ID: ${contractAddress}/${tokenId}`,
      );
      return null;
    }

    const query = { nft_info: { token_id: tokenId.toString() } };
    const queryString = JSON.stringify(query);
    // console.log(`[DEBUG] Query for ${tokenId}:`, queryString);
    const encodedQuery = btoa(queryString);

    // Use only Keplr LCD endpoint
    const url = `${API_ENDPOINTS.COSMOS_HUB_LCD}/cosmwasm/wasm/v1/contract/${contractAddress}/smart/${encodedQuery}`;

    let nftData = null;
    let retries = 0;
    const maxRetries = REQUEST_CONFIG.MAX_RETRIES;

    while (retries <= maxRetries) {
      try {
        // console.log(`[DEBUG] Attempting to fetch from: ${url}`);

        const response = await fetch(url, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        });

        if (response.ok) {
          const responseData = await response.json();
          // console.log(
          //   `[DEBUG] NFT data response for ${tokenId}:`,
          //   responseData,
          // );

          // Handle response format - extract from data field
          nftData = responseData.data;
          break; // Success, exit retry loop
        } else {
          // Log the error response for debugging
          try {
            const errorData = await response.json();
            console.error(
              `[ERROR] API error ${response.status} for ${contractAddress}/${tokenId}:`,
              errorData,
            );
          } catch (parseError) {
            console.error(
              `[ERROR] API error ${response.status} for ${contractAddress}/${tokenId}: ${response.statusText}`,
            );
          }

          if (
            response.status === 408 ||
            response.status === 429 ||
            response.status >= 500
          ) {
            retries++;
            if (retries <= maxRetries) {
              const retryDelay = Math.min(
                REQUEST_CONFIG.RETRY_DELAY_BASE * Math.pow(2, retries - 1),
                REQUEST_CONFIG.MAX_RETRY_DELAY,
              );
              console.log(
                `[DEBUG] API error ${response.status}, retrying in ${retryDelay}ms (attempt ${retries}/${maxRetries})`,
              );
              await delay(retryDelay);
              continue;
            }
          }

          console.warn(
            `[WARNING] Failed to fetch from ${url}: ${response.status} ${response.statusText}`,
          );
          break;
        }
      } catch (error) {
        retries++;
        if (retries <= maxRetries) {
          const retryDelay = Math.min(
            REQUEST_CONFIG.RETRY_DELAY_BASE * Math.pow(2, retries - 1),
            REQUEST_CONFIG.MAX_RETRY_DELAY,
          );
          console.log(
            `[DEBUG] Network error, retrying in ${retryDelay}ms (attempt ${retries}/${maxRetries}):`,
            error.name === "AbortError" ? "Request timeout" : error.message,
          );
          await delay(retryDelay);
          continue;
        }
        console.error(`[ERROR] Error fetching from ${url}:`, error);
        break;
      }
    }

    if (!nftData) {
      console.warn(
        `[WARNING] No NFT data found for ${contractAddress}/${tokenId}`,
      );
      return null;
    }

    // Extract metadata from extension field
    const extension = nftData.extension || {};

    // Process image URL - prioritize extension.image over token_uri
    let imageUrl = extension.image;
    if (imageUrl && imageUrl.startsWith("ipfs://")) {
      imageUrl = imageUrl.replace(
        "ipfs://",
        API_ENDPOINTS.IPFS_GATEWAY_PRIMARY,
      );
    }

    // Process traits/attributes from extension
    const rawTraits = Array.isArray(extension.attributes)
      ? extension.attributes
      : Array.isArray(extension.traits)
        ? extension.traits
        : [];

    const processedTraits = rawTraits.map((trait) => ({
      trait_type: trait.trait_type || trait.name || trait.key,
      value: trait.value,
      name: trait.trait_type || trait.name || trait.key,
    }));

    return {
      name: extension.name || `Token #${tokenId}`,
      tokenId: String(tokenId),
      image: imageUrl,
      traits: processedTraits,
      attributes: processedTraits,
      description: extension.description || "",
      contract: contractAddress,
      token_uri: nftData.token_uri, // Include token_uri for reference
    };
  } catch (error) {
    console.error(
      `Error fetching Cosmos Hub NFT ${contractAddress}/${tokenId}:`,
      {
        error: error.message,
        name: error.name,
        stack: error.stack,
      },
    );
    return null;
  }
};

// Fetch single NFT data from Cosmos Hub contract (with caching)
export const fetchCosmosHubSingleNFT = async (contractAddress, tokenId) => {
  return cachedRequest(
    "fetchCosmosHubSingleNFT",
    _fetchCosmosHubSingleNFT,
    contractAddress,
    tokenId,
  );
};

// Fetch single NFT data from Cosmos Hub (IPFS) (Original function)
const _fetchCosmosHubSingleNFTFromIPFS = async (tokenId) => {
  try {
    const url = `${API_ENDPOINTS.IPFS_DAO_DAO_ZONE}${tokenId}.json`;
    const response = await fetch(url);

    if (!response.ok) {
      console.warn(
        `Failed to fetch Cosmos Hub NFT ${tokenId}: ${response.status}`,
      );
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching Cosmos Hub NFT ${tokenId}:`, error);
    return null;
  }
};

// Fetch single NFT data from Cosmos Hub (IPFS) (with caching)
export const fetchCosmosHubSingleNFTFromIPFS = async (tokenId) => {
  return cachedRequest(
    "fetchCosmosHubSingleNFTFromIPFS",
    _fetchCosmosHubSingleNFTFromIPFS,
    tokenId,
  );
};

// Fetch Cosmos Hub collection floor price from Stargaze (Original function)
const _fetchCosmosHubFloorPrice = async () => {
  try {
    const query = `
      query ExampleQuery($address: String!) {
        collection(address: $address) {
          floor {
            amount
            amountUsd
            symbol
            denom
          }
        }
      }
    `;

    const variables = {
      address:
        "stars16z4gyrlek2sgspatqs0q7yueltrnqha3ssvsyv7zwndupz4d00eshfssda",
    };

    const response = await fetch(API_ENDPOINTS.STARGAZE_GRAPHQL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    const data = await response.json();

    if (data.errors) {
      console.error("GraphQL errors:", data.errors);
      return null;
    }

    return data.data?.collection?.floor || null;
  } catch (error) {
    console.error("Error fetching Cosmos Hub floor price:", error);
    return null;
  }
};

// Fetch Cosmos Hub collection floor price from Stargaze (with caching)
export const fetchCosmosHubFloorPrice = async () => {
  return cachedRequest("fetchCosmosHubFloorPrice", _fetchCosmosHubFloorPrice);
};

// Fetch Stargaze collection floor price (Original function)
const _fetchStargazeCollectionFloorAndOffer = async (collection) => {
  try {
    const query = `
      query ($address: String!) {
        collection(address: $address) {
          floor {
            amount
            symbol
            denom
            amountUsd
          }
          highestOffer {
            offerPrice {
            amount
            amountUsd
            denom
            exponent
            symbol
            }
          }
        }
      }
    `;

    const variables = {
      address: collection,
    };

    const response = await fetch(API_ENDPOINTS.STARGAZE_GRAPHQL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    const data = await response.json();

    if (data.errors) {
      console.error(
        `[ERROR] GraphQL errors for Stargaze collection ${collection}:`,
        data.errors,
      );
      return null;
    }

    return data.data?.collection || null;
  } catch (error) {
    console.error(
      `[ERROR] Error fetching Stargaze collection floor for ${collection}:`,
      error,
    );
    return null;
  }
};

// Fetch Stargaze collection floor price (with caching)
export const fetchStargazeCollectionFloorAndOffer = async (collection) => {
  return cachedRequest(
    "fetchStargazeCollectionFloorAndOffer",
    _fetchStargazeCollectionFloorAndOffer,
    collection,
  );
};

// Fetch single NFT data from Neutron (Original function)
const _fetchNeutronSingleNFT = async (collectionAddr, tokenId) => {
  try {
    const query = `
      query ($where: Nft_searchWhereInput, $orderBy: [Nft_searchOrderByWithRelationInput!], $take: Int, $denom: String!) {
        nft_searches(where: $where, orderBy: $orderBy, take: $take) {
          nft {
            nft_id
            name
            image
            rank
            collection {
              collection_id
              name
              floor_price_in(denom: $denom) {
                amount
                amount_usd
              }
              offers {
                amount
                amount_usd
              }
            }
            auction: active_auction {
              chain_auction_id
              is_buy_now
              created
              price_in(denom: $denom) {
                amount
                amount_usd
                denom
              }
            }
            trait {
              trait_type
              value
              trait_stats {
                rarity
              }
            }
            offer {
              amount
              amount_usd
              denom
            }
            ownership_histories {
              type
              amount
              denom
            } 
          }
        }
      }
    `;

    const variables = {
      where: {
        AND: [
          {
            collection: {
              is: {
                collection_id: {
                  equals: collectionAddr,
                },
              },
            },
          },
          {
            nft_id: {
              equals: tokenId,
            },
          },
        ],
      },
      orderBy: [{ nft: { nft_id_padded: "asc" } }],
      denom: "untrn",
      take: 100,
    };

    let retries = 0;
    const maxRetries = REQUEST_CONFIG.MAX_RETRIES;

    while (retries <= maxRetries) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          REQUEST_CONFIG.TIMEOUT,
        );

        // console.log(
        //   `[DEBUG] Making individual Neutron NFT API call for ${collectionAddr}/${tokenId}`,
        // );

        // Use CORS proxy directly since Superbolt API doesn't allow direct requests from this origin
        const corsProxies = CORS_PROXIES;
        let response;
        const proxyUrl = corsProxies[retries % corsProxies.length];
        let proxiedUrl;

        if (proxyUrl.includes("codetabs.com")) {
          proxiedUrl =
            proxyUrl + encodeURIComponent(API_ENDPOINTS.SUPERBOLT_API);
        } else if (proxyUrl.includes("thingproxy.freeboard.io")) {
          proxiedUrl =
            proxyUrl + encodeURIComponent(API_ENDPOINTS.SUPERBOLT_API);
        } else {
          proxiedUrl = proxyUrl + API_ENDPOINTS.SUPERBOLT_API;
        }

        response = await fetch(proxiedUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: query,
            variables: variables,
          }),
          signal: controller.signal,
        });

        // console.log(
        //   `[DEBUG] Individual Neutron NFT API response status: ${response.status} for ${collectionAddr}/${tokenId}`,
        // );

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          // console.log(
          //   `[DEBUG] Individual Neutron NFT GraphQL response for ${collectionAddr}/${tokenId}:`,
          //   data,
          // );

          if (data.errors) {
            console.error(
              `[ERROR] GraphQL errors for ${collectionAddr}/${tokenId}:`,
              {
                errors: data.errors,
                collection: collectionAddr,
                tokenId: tokenId,
              },
            );
            break;
          }

          const nftSearches = data.data?.nft_searches || [];
          if (nftSearches.length === 0) {
            console.warn(
              `[WARNING] No NFT data found for ${collectionAddr}/${tokenId}`,
            );
            break;
          }

          const nft = nftSearches[0].nft;
          const collection = nft.collection;
          const auction = nft.auction;

          // Process the same way as in fetchNeutronNFTs
          const floorAmountNtrn = collection.floor_price_in?.amount
            ? parseFloat(collection.floor_price_in.amount)
            : 0;
          const floorAmountUsd = collection.floor_price_in?.amount_usd
            ? parseFloat(collection.floor_price_in.amount_usd)
            : 0;

          // Handle listing price if NFT is listed
          let listPrice = null;
          const isListed = auction !== null;

          if (isListed) {
            const listAmountNtrn = auction.price_in?.amount
              ? parseFloat(auction.price_in.amount)
              : 0;
            const listAmountUsd = auction.price_in?.amount_usd || 0;

            listPrice = {
              amount: listAmountNtrn,
              denom: "untrn",
              symbol: "NTRN",
              amountUsd: listAmountUsd,
            };
          }

          // Process image URL
          let imageUrl = nft.image;
          if (imageUrl) {
            if (imageUrl.startsWith("ipfs://")) {
              const ipfsHash = imageUrl.replace("ipfs://", "");

              // Check if the URL ends with a common image extension
              const imageExtensions = [
                ".png",
                ".jpg",
                ".jpeg",
                ".gif",
                ".webp",
                ".svg",
              ];
              const hasImageExtension = imageExtensions.some((ext) =>
                ipfsHash.toLowerCase().endsWith(ext),
              );

              if (hasImageExtension) {
                // Use ipfs.io for image files
                imageUrl = `${API_ENDPOINTS.IPFS_GATEWAY_PRIMARY}${ipfsHash}`;
                // console.log(
                //   `[DEBUG] Converted IPFS image URL: ${nft.image} -> ${imageUrl}`,
                // );
              } else {
                // Use nft-storage CDN for other files
                imageUrl = `${API_ENDPOINTS.IPFS_GATEWAY_NFT_STORAGE}${ipfsHash}_0`;
                // console.log(
                //   `[DEBUG] Converted IPFS URL: ${nft.image} -> ${imageUrl}`,
                // );
              }
            } else if (imageUrl.startsWith("https://ipfs.superbolt.wtf/")) {
              // Keep Superbolt IPFS URLs as they are - they should work
              imageUrl = imageUrl;
            }
          }

          // Process traits from the GraphQL response
          const processedTraits = nft.trait
            ? nft.trait.map((trait) => ({
              trait_type: trait.trait_type,
              value: trait.value,
              rarity: trait.trait_stats?.rarity
                ? `${(trait.trait_stats.rarity * 100).toFixed(2)}%`
                : undefined,
            }))
            : [];
          // Process offers - similar to Stargaze logic
          const offers = collection.offers || [];
          let highestOffer = null;
          let highestOfferType = null;
          let highestOfferAmount = 0;
          let highestOfferAmountUsd = 0;
          let hasOffer = false;

          // Check for token-specific offer first
          // Check for token-specific offer first
          if (nft.offer && nft.offer.amount) {
            hasOffer = true;
            highestOfferType = "token";
            highestOfferAmount = parseFloat(nft.offer.amount) / Math.pow(10, 6); // scale by 6 decimals
            highestOfferAmountUsd = parseFloat(nft.offer.amount_usd) || 0;
            highestOffer = nft.offer;
          } else if (offers.length > 0) {
            // Fall back to collection offers
            hasOffer = true;
            highestOfferType = "collection";
            const collectionOffer = offers[0]; // Assuming offers are sorted by amount
            highestOfferAmount = parseFloat(collectionOffer.amount) / Math.pow(10, 6); // scale by 6 decimals
            highestOfferAmountUsd = parseFloat(collectionOffer.amount_usd) || 0;
            highestOffer = collectionOffer;
          }


          // Process last sale price from ownership histories
          let lastSalePrice = null;
          let lastSalePriceSpecified = false;
          const ownershipHistories = nft.ownership_histories || [];

          if (ownershipHistories.length > 0) {
            // Sort by most recent first (assuming they're chronologically ordered)
            const saleTransactions = ownershipHistories.filter(history =>
              history.type === "sale" && history.amount
            )
            lastSalePriceSpecified = true;

            // Only set lastSalePrice if last activity type is NOT "mint"
            if (saleTransactions.length > 0) {
              // Get the most recent sale (assuming array is chronologically ordered)
              const lastSale = saleTransactions[saleTransactions.length - 1];
              const saleAmount = parseFloat(lastSale.amount);
              lastSalePrice = {
                amount: saleAmount,
                denom: lastSale.denom || "untrn",
                symbol: lastSale.denom === "untrn" ? "NTRN" : lastSale.denom,
                amountUsd: 0, // Would need USD conversion logic here
              };
            }
          }
          // Return in the same format as fetchNeutronNFTs
          return {
            name: nft.name || `NFT #${nft.nft_id}`,
            tokenId: nft.nft_id?.toString() || "unknown",
            chain: "neutron",
            contract: collection.collection_id || "unknown-contract",
            collection: collection.name || "Unknown Collection",
            image: imageUrl,
            listed: isListed,
            listPrice,
            rarity: nft.rank || null,
            traits: processedTraits,
            floor: {
              amount: floorAmountNtrn,
              amountUsd: floorAmountUsd,
              denom: "untrn",
              symbol: "NTRN",
            },
            hasOffer: hasOffer,
            highestOffer: {
              highestOfferType: highestOfferType,
              amount: highestOfferAmount,
              amountUsd: highestOfferAmountUsd,
              denom: highestOffer?.denom || null,
              symbol: "NTRN"
            },
            lastSalePriceSpecified: lastSalePriceSpecified,
            lastSalePrice: lastSalePrice,
            sortUsd: listPrice ? listPrice.amountUsd : floorAmountUsd,
            daoStaked: false,
          };
        } else if (
          response.status === 408 ||
          response.status === 429 ||
          response.status >= 500
        ) {
          retries++;
          if (retries <= maxRetries) {
            const retryDelay = Math.min(
              REQUEST_CONFIG.RETRY_DELAY_BASE * Math.pow(2, retries - 1),
              REQUEST_CONFIG.MAX_RETRY_DELAY,
            );
            console.log(
              `[DEBUG] Individual Neutron NFT API error ${response.status}, retrying in ${retryDelay}ms (attempt ${retries}/${maxRetries}) for ${collectionAddr}/${tokenId}`,
            );
            await delay(retryDelay);
            continue;
          }
        }

        console.warn(
          `Failed to fetch individual Neutron NFT ${collectionAddr}/${tokenId}: ${response.status} ${response.statusText}`,
        );
        break;
      } catch (error) {
        retries++;
        if (retries <= maxRetries) {
          const retryDelay = Math.min(
            REQUEST_CONFIG.RETRY_DELAY_BASE * Math.pow(2, retries - 1),
            REQUEST_CONFIG.MAX_RETRY_DELAY,
          );
          console.log(
            `[DEBUG] Individual Neutron NFT network error, retrying in ${retryDelay}ms (attempt ${retries}/${maxRetries}) for ${collectionAddr}/${tokenId}:`,
            error.name === "AbortError" ? "Request timeout" : error.message,
          );
          await delay(retryDelay);
          continue;
        }

        console.error(
          `[ERROR] Failed to fetch individual Neutron NFT ${collectionAddr}/${tokenId}:`,
          {
            collection: collectionAddr,
            tokenId: tokenId,
            error: error.message,
            stack: error.stack,
            networkError:
              error.name === "TypeError" ? "Network/CORS issue" : "Unknown",
          },
        );
        break;
      }
    }

    return null;
  } catch (error) {
    console.error(
      `[ERROR] Failed to fetch Neutron NFT ${collectionAddr}/${tokenId}:`,
      {
        collection: collectionAddr,
        tokenId: tokenId,
        error: error.message,
        stack: error.stack,
        networkError:
          error.name === "TypeError" ? "Network/CORS issue" : "Unknown",
      },
    );
    return null;
  }
};

// Fetch single NFT data from Neutron (with caching)
export const fetchNeutronSingleNFT = async (collectionAddr, tokenId) => {
  return cachedRequest(
    "fetchNeutronSingleNFT",
    _fetchNeutronSingleNFT,
    collectionAddr,
    tokenId,
  );
};

// Fetch Neutron NFTs using GraphQL (Original function)
const _fetchNeutronNFTs = async (addresses) => {
  console.log(`[DEBUG] Fetching Neutron NFTs for addresses:`, addresses);

  try {
    const stakedNFTs = [];
    const regularNFTs = [];
    const neutronDAOs = daosConfig.DAOs["neutron-1"];

    //
    // === FETCH STAKED NFTs (fixed to match Stargaze pattern) ===
    //
    if (neutronDAOs) {
      console.log(`[DEBUG] Starting staked NFTs fetch for ${Object.keys(neutronDAOs).length} Neutron DAOs`);

      const daoResults = await Promise.allSettled(
        Object.entries(neutronDAOs).map(([daoName, daoConfig]) =>
          limit(async () => {  // ✅ This returns a promise (matching Stargaze pattern)
            try {
              let allStakedTokenIds = [];

              // Limit concurrent fetches per address (matching Stargaze pattern)
              const addressResults = await Promise.allSettled(
                addresses.map((address) =>
                  limit(async () => {  // ✅ This also returns a promise
                    try {
                      const stakedTokenIds = await fetchStakedNFTs(
                        "neutron-1",
                        daoConfig.contract,
                        address,
                      );
                      const ids = Array.isArray(stakedTokenIds) ? stakedTokenIds : [];
                      if (ids.length > 0) {
                        console.log(`[DEBUG] Found ${ids.length} staked NFTs for ${address} in ${daoName}`);
                      }
                      return ids;
                    } catch (error) {
                      console.error(
                        `[ERROR] ✗ Failed to fetch staked NFTs for Neutron address ${address}:`,
                        error,
                      );
                      return [];
                    }
                  })
                )
              );

              // Collect all staked token IDs
              addressResults.forEach((res) => {
                if (res.status === "fulfilled" && res.value.length > 0) {
                  allStakedTokenIds.push(...res.value);
                }
              });

              // Remove duplicates
              const stakedTokenIds = [...new Set(allStakedTokenIds)];

              if (stakedTokenIds.length > 0) {
                console.log(`[DEBUG] Processing ${stakedTokenIds.length} unique staked NFTs for ${daoName}`);

                // Limit concurrent NFT fetches (matching Stargaze pattern)
                const nftResults = await Promise.allSettled(
                  stakedTokenIds.map((tokenId) =>
                    limit(async () => {  // ✅ This also returns a promise
                      try {
                        const nftData = await fetchNeutronSingleNFT(
                          daoConfig.collection,
                          tokenId.toString(),
                        );
                        if (nftData) {
                          console.log(`[DEBUG] ✓ Fetched staked NFT ${tokenId} from ${daoName}`);
                          return {
                            ...nftData,
                            daoStaked: true,
                            daoName,
                            daoAddress: daoConfig.DAO,
                          };
                        }
                        console.warn(`[WARNING] No data returned for staked NFT ${tokenId} from ${daoName}`);
                        return null;
                      } catch (error) {
                        console.error(
                          `[ERROR] ✗ Failed to fetch staked NFT ${tokenId} from ${daoName}:`,
                          error,
                        );
                        return null;
                      }
                    })
                  )
                );

                // Collect successful NFT results
                nftResults.forEach((res) => {
                  if (res.status === "fulfilled" && res.value) {
                    stakedNFTs.push(res.value);
                  }
                });

                console.log(`[DEBUG] Successfully fetched ${stakedNFTs.filter(nft => nft.daoName === daoName).length} staked NFTs for DAO ${daoName}`);
              } else {
                console.log(`[DEBUG] No staked NFTs found for DAO ${daoName}`);
              }
            } catch (error) {
              console.error(`[ERROR] Failed to fetch staked NFTs from ${daoName}:`, error);
            }
          })
        )
      );

      // Check for DAO-level failures (matching Stargaze pattern)
      daoResults.forEach((res, idx) => {
        if (res.status === "rejected") {
          const daoName = Object.keys(neutronDAOs)[idx];
          console.error(`[ERROR] DAO ${daoName} failed:`, res.reason);
        }
      });

      console.log(`[DEBUG] Total staked NFTs collected: ${stakedNFTs.length}`);
    }

    //
    // === FETCH REGULAR NFTs (keep existing logic but with improved offer processing) ===
    //
    for (const address of addresses) {
      try {
        console.log(`[DEBUG] Fetching regular NFTs for address: ${address}`);

        const query = `
  query SearchNFT(
    $where: Nft_searchWhereInput
    $orderBy: [Nft_searchOrderByWithRelationInput!]
    $take: Int
    $denom: String!
    $offersWhere2: OfferWhereInput
  ) {
    nft_searches(where: $where, orderBy: $orderBy, take: $take) {
      nft {
        nft_id
        name
        image
        rank
        collection {
          collection_id
          name
          floor_price_in(denom: $denom) {
            amount
            amount_usd
          }
          offers(where: $offersWhere2) {
            amount
            amount_usd
            nft_id
            denom
          }
        }
        auction: active_auction {
          chain_auction_id
          is_buy_now
          created
          price_in(denom: $denom) {
            amount
            amount_usd
            denom
          }
        }
        trait {
          trait_type
          value
          trait_stats { rarity }
        }
        offer(where: $offersWhere2) {
          amount
          amount_usd
          denom
          nft_id
        }
        ownership_histories {
          type
          amount
          denom
        }
      }
    }
  }
`;

        const variables = {
          where: {
            AND: [
              {
                collection: {
                  is: {
                    removed: { equals: false },
                    draftcollection_id: { not: { equals: null } },
                    verified: { equals: true },
                  },
                },
              },
              {
                OR: [
                  { nft: { is: { owner_id: { equals: address } } } },
                  {
                    nft: {
                      is: {
                        active_auction: {
                          is: {
                            seller_id: { equals: address },
                            settled: { equals: false },
                            cancelled: { equals: false }
                          },
                        },
                      },
                    },
                  },
                ],
              },
            ],
          },
          orderBy: [
            { nft: { active_auction: { amount_usd: { sort: "asc" } } } },
            { nft: { nft_id_padded: "asc" } },
          ],
          denom: "untrn",
          take: 100,

          // Fetch all active offers
          offersWhere2: {
            cancelled: { equals: false },
            settled: { equals: false },
          },
        };

        let retries = 0;
        const maxRetries = REQUEST_CONFIG.MAX_RETRIES;

        while (retries <= maxRetries) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(
              () => controller.abort(),
              REQUEST_CONFIG.TIMEOUT,
            );

            const corsProxies = CORS_PROXIES;
            const proxyUrl = corsProxies[retries % corsProxies.length];
            const proxiedUrl = proxyUrl.includes("codetabs.com") || proxyUrl.includes("thingproxy.freeboard.io")
              ? proxyUrl + encodeURIComponent(API_ENDPOINTS.SUPERBOLT_API)
              : proxyUrl + API_ENDPOINTS.SUPERBOLT_API;

            const response = await fetch(proxiedUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ query, variables }),
              signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (response.ok) {
              const data = await response.json();

              if (data.errors) {
                console.error(`[ERROR] GraphQL errors for Neutron NFTs:`, data.errors);
                break;
              }

              const nftSearches = data.data?.nft_searches || [];

              nftSearches.forEach((search) => {
                const nft = search.nft;
                const collection = nft.collection;
                const auction = nft.auction;

                const floorAmountNtrn = collection.floor_price_in?.amount
                  ? parseFloat(collection.floor_price_in.amount)
                  : 0;
                const floorAmountUsd = collection.floor_price_in?.amount_usd
                  ? parseFloat(collection.floor_price_in.amount_usd)
                  : 0;

                let listPrice = null;
                const isListed = auction !== null;

                if (isListed) {
                  const listAmountNtrn = auction.price_in?.amount
                    ? parseFloat(auction.price_in.amount)
                    : 0;
                  const listAmountUsd = auction.price_in?.amount_usd || 0;

                  listPrice = {
                    amount: listAmountNtrn,
                    denom: "untrn",
                    symbol: "NTRN",
                    amountUsd: listAmountUsd,
                  };
                }

                let imageUrl = nft.image;
                if (imageUrl?.startsWith("ipfs://")) {
                  const ipfsHash = imageUrl.replace("ipfs://", "");
                  const exts = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"];
                  const hasExt = exts.some((ext) => ipfsHash.toLowerCase().endsWith(ext));
                  imageUrl = hasExt
                    ? `${API_ENDPOINTS.IPFS_GATEWAY_PRIMARY}${ipfsHash}`
                    : `${API_ENDPOINTS.IPFS_GATEWAY_NFT_STORAGE}${ipfsHash}_0`;
                }

                const processedTraits = [];
                if (Array.isArray(nft.trait)) {
                  processedTraits.push(
                    ...nft.trait.map((trait) => ({
                      trait_type: trait.trait_type,
                      value: trait.value,
                      name: trait.trait_type,
                      rarity: trait.trait_stats?.rarity
                        ? `${(trait.trait_stats.rarity * 100).toFixed(2)}%`
                        : undefined,
                    })),
                  );
                }

                // === IMPROVED OFFER PROCESSING (matching the logic from our earlier fix) ===
                const currentNftId = nft.nft_id?.toString();
                const collectionOffers = collection.offers || [];
                let hasOffer = false;
                let highestOffer = {
                  highestOfferType: null,
                  amount: 0,
                  amountUsd: 0,
                  denom: null,
                  symbol: "NTRN",
                };

                // 1. Check for token-specific offer first (highest priority)
                if (nft.offer && nft.offer.amount) {
                  // Verify this is actually for this NFT (if nft_id field exists)
                  if (!nft.offer.nft_id || nft.offer.nft_id.toString() === currentNftId) {
                    hasOffer = true;
                    highestOffer = {
                      highestOfferType: "token",
                      amount: parseFloat(nft.offer.amount) / Math.pow(10, 6),
                      amountUsd: parseFloat(nft.offer.amount_usd) || 0,
                      denom: nft.offer.denom,
                      symbol: "NTRN",
                    };
                  }
                }

                // 2. If no token offer, check for collection offers
                if (!hasOffer && collectionOffers.length > 0) {
                  // Filter for true collection offers (nft_id should be null/undefined)
                  const trueCollectionOffers = collectionOffers.filter(offer => 
                    !offer.nft_id && offer.amount
                  );

                  if (trueCollectionOffers.length > 0) {
                    // Sort by USD amount descending to get highest offer
                    const sortedOffers = trueCollectionOffers.sort((a, b) => 
                      parseFloat(b.amount_usd || 0) - parseFloat(a.amount_usd || 0)
                    );

                    const topOffer = sortedOffers[0];
                    hasOffer = true;
                    highestOffer = {
                      highestOfferType: "collection",
                      amount: parseFloat(topOffer.amount) / Math.pow(10, 6),
                      amountUsd: parseFloat(topOffer.amount_usd) || 0,
                      denom: topOffer.denom,
                      symbol: "NTRN",
                    };
                  }
                }

                // Process last sale price from ownership histories
                let lastSalePrice = null;
                let lastSalePriceSpecified = false;
                const ownershipHistories = nft.ownership_histories || [];

                if (ownershipHistories.length > 0) {
                  const saleTransactions = ownershipHistories.filter(history =>
                    history.type === "sale" && history.amount
                  );
                  lastSalePriceSpecified = true;

                  if (saleTransactions.length > 0) {
                    const lastSale = saleTransactions[saleTransactions.length - 1];
                    const saleAmount = parseFloat(lastSale.amount);
                    lastSalePrice = {
                      amount: saleAmount,
                      denom: lastSale.denom || "untrn",
                      symbol: lastSale.denom === "untrn" ? "NTRN" : lastSale.denom,
                      amountUsd: 0,
                    };
                  }
                }

                regularNFTs.push({
                  name: nft.name || `NFT #${nft.nft_id}`,
                  tokenId: nft.nft_id?.toString() || "unknown",
                  chain: "neutron",
                  contract: collection.collection_id || "unknown-contract",
                  collection: collection.name || "Unknown Collection",
                  image: imageUrl,
                  listed: isListed,
                  listPrice,
                  rarity: nft.rank || null,
                  traits: processedTraits,
                  floor: {
                    amount: floorAmountNtrn,
                    amountUsd: floorAmountUsd,
                    denom: "untrn",
                    symbol: "NTRN",
                  },
                  hasOffer: hasOffer,
                  highestOffer: highestOffer,
                  lastSalePriceSpecified: lastSalePriceSpecified,
                  lastSalePrice: lastSalePrice,
                  sortUsd: listPrice ? listPrice.amountUsd : floorAmountUsd,
                  daoStaked: false,
                  sourceAddress: address,
                });
              });

              break; // success
            } else if (
              response.status === 408 ||
              response.status === 429 ||
              response.status >= 500
            ) {
              retries++;
              if (retries <= maxRetries) {
                const retryDelay = Math.min(
                  REQUEST_CONFIG.RETRY_DELAY_BASE * Math.pow(2, retries - 1),
                  REQUEST_CONFIG.MAX_RETRY_DELAY,
                );
                console.log(
                  `[DEBUG] Neutron API error ${response.status}, retrying in ${retryDelay}ms (attempt ${retries}/${maxRetries})`,
                );
                await delay(retryDelay);
                continue;
              }
            }

            console.warn(
              `Failed to fetch Neutron NFTs for ${address}: ${response.status} ${response.statusText}`,
            );
            break;
          } catch (error) {
            retries++;
            if (retries <= maxRetries) {
              const retryDelay = Math.min(
                REQUEST_CONFIG.RETRY_DELAY_BASE * Math.pow(2, retries - 1),
                REQUEST_CONFIG.MAX_RETRY_DELAY,
              );
              console.log(
                `[DEBUG] Neutron network error, retrying in ${retryDelay}ms (attempt ${retries}/${maxRetries}):`,
                error.name === "AbortError" ? "Request timeout" : error.message,
              );
              await delay(retryDelay);
              continue;
            }
            console.error(`Error fetching Neutron NFTs for ${address}:`, error);
            break;
          }
        }
      } catch (err) {
        console.error(`Error in regular NFT fetch for ${address}:`, err);
      }
    }

    //
    // === MERGE + DEDUPLICATE (improved with better logging like Stargaze) ===
    //
    const uniqueNFTs = new Map();

    // Add regular NFTs first
    regularNFTs.forEach((nft) => {
      const key = `${nft.contract}-${nft.tokenId}`;
      uniqueNFTs.set(key, nft);
    });

    // Add staked NFTs - properly merge or add them (matching Stargaze pattern)
    let mergedCount = 0;
    let newStakedCount = 0;
    
    stakedNFTs.forEach((nft) => {
      const key = `${nft.contract}-${nft.tokenId}`;
      if (uniqueNFTs.has(key)) {
        // If NFT exists in wallet, mark it as also staked
        const existingNFT = uniqueNFTs.get(key);
        uniqueNFTs.set(key, {
          ...existingNFT,
          daoStaked: true,
          daoName: nft.daoName,
          daoAddress: nft.daoAddress,
        });
        mergedCount++;
      } else {
        // If NFT is only staked (not in wallet), add it as staked-only
        uniqueNFTs.set(key, nft);
        newStakedCount++;
      }
    });

    const finalNFTsArray = Array.from(uniqueNFTs.values());
    
    // Enhanced logging (matching Stargaze style)
    console.log(`[DEBUG] === DEDUPLICATION SUMMARY ===`);
    console.log(`  - Regular NFTs fetched: ${regularNFTs.length}`);
    console.log(`  - Staked NFTs fetched: ${stakedNFTs.length}`);
    console.log(`  - Staked NFTs merged with existing: ${mergedCount}`);
    console.log(`  - New staked NFTs added: ${newStakedCount}`);
    console.log(`[DEBUG] Total unique Neutron NFTs after deduplication: ${finalNFTsArray.length}`);

    return finalNFTsArray;
  } catch (error) {
    console.error("Error fetching Neutron NFTs:", error);
    return [];
  }
};


// Fetch Neutron NFTs using GraphQL (with caching)
export const fetchNeutronNFTs = async (addresses) => {
  return cachedRequest("fetchNeutronNFTs", _fetchNeutronNFTs, addresses);
};

// Fetch Initia NFTs using Intergaze API (Original function)
const _fetchInitiaNFTs = async (address, initPrice = 0.428077) => {
  try {
    console.log(`[DEBUG] Fetching Initia NFTs for address: ${address}`);

    const response = await fetch(
      `${API_ENDPOINTS.INTERGAZE_API}/profiles/${address}/tokens?limit=100&sort=price%3Adesc`,
    );

    if (!response.ok) {
      console.warn(`[WARNING] HTTP error for ${address}! status: ${response.status}`);
      return [];
    }

    const data = await response.json();

    if (!data || !data.tokens || !Array.isArray(data.tokens)) {
      console.warn(`[WARNING] No valid tokens data for ${address}`);
      return [];
    }

    // Limit concurrency for trait fetching
    const limit = pLimit(20); // max 20 concurrent fetches

    const results = await Promise.allSettled(
      data.tokens.map((token) =>
        limit(async () => {
          try {
            const collectionFloor = token.collection?.floorPrice;
            let floorAmountMicroInit = 0;
            let floorAmountInit = 0;
            let floorAmountUsd = 0;

            if (collectionFloor) {
              floorAmountMicroInit = parseInt(collectionFloor.amount) || 0;
              floorAmountInit = floorAmountMicroInit / 1_000_000;
              floorAmountUsd = floorAmountInit * initPrice;
            }

            let listPrice = null;
            const isListed = token.isEscrowed || false;

            if (isListed && token.price) {
              const listAmountMicroInit = parseInt(token.price.amount) || 0;
              const listAmountInit = listAmountMicroInit / 1_000_000;
              const listAmountUsd = listAmountInit * initPrice;

              listPrice = {
                amount: listAmountInit,
                denom: token.price.denom,
                symbol: token.price.symbol,
                amountUsd: listAmountUsd,
              };
            }
            const highestOffer = token.highestOffer || null;
            const highestOfferType = token.highestOffer?.type || null;
            let highestOfferAmount = 0;
            let highestOfferAmountUsd = 0;
            let hasOffer = false;

            if (highestOffer) {
              hasOffer = true;
              const exponent = highestOffer.price.exponent;
              highestOfferAmount = parseFloat(highestOffer.price.amount) / Math.pow(10, exponent);
              highestOfferAmountUsd = parseFloat(highestOfferAmount * initPrice) || 0;
            }
            // Fetch traits with concurrency limit
            let traits = [];
            try {
              traits = await fetchInitiaSingleNFTTraits(
                token.collection?.contractAddress,
                token.tokenId,
                address,
              );
            } catch (traitsError) {
              console.error(`[ERROR] Failed to fetch traits for ${token.tokenId}:`, traitsError);
            }

            return {
              name: token.name || `Token #${token.tokenId}`,
              tokenId: token.tokenId?.toString() || "unknown",
              chain: "initia",
              contract: token.collection?.contractAddress || "unknown-contract",
              collection: token.collection?.name || "Unknown Collection",
              image: token.media?.visualAssets?.md?.url,
              listed: isListed,
              listPrice,
              rarity: token.rarityRank || null,
              traits,
              floor: {
                amount: floorAmountInit,
                amountUsd: floorAmountUsd,
                denom:
                  "l2/fb936ffef4eb4019d82941992cc09ae2788ce7197fcb08cb00c4fe6f5e79184e",
                symbol: "INIT",
              },
              hasOffer: hasOffer,
              highestOffer: {
                highestOfferType: highestOfferType,
                amount: highestOfferAmount,
                amountUsd: highestOfferAmountUsd,
                denom: highestOffer?.price?.denom || null,
                symbol: highestOffer?.price?.symbol || null,
              },
              lastSalePriceSpecified: false,
              lastSalePrice: null,
              sortUsd: listPrice ? listPrice.amountUsd : floorAmountUsd,
              daoStaked: false,
              sourceAddress: address,
            };
          } catch (tokenError) {
            console.error(`[ERROR] Error processing Initia token ${token.tokenId}:`, tokenError);
            return null;
          }
        })
      )
    );

    const initiaNFTs = results
      .filter((res) => res.status === "fulfilled" && res.value)
      .map((res) => res.value);

    console.log(`[DEBUG] Found ${initiaNFTs.length} NFTs for initia`);
    return initiaNFTs;
  } catch (error) {
    console.error(`[ERROR] Error fetching Initia NFTs for ${address}:`, error);
    return [];
  }
};


// Fetch Initia NFTs using Intergaze API (with caching)
export const fetchInitiaNFTs = async (address, initPrice = 0.428077) => {
  return cachedRequest("fetchInitiaNFTs", _fetchInitiaNFTs, address, initPrice);
};

// Fetch traits for a specific Initia NFT (Original function)
const _fetchInitiaSingleNFTTraits = async (
  collection,
  tokenId,
  userAddress,
) => {
  try {
    // console.log(
    //   `[DEBUG] Fetching Initia traits for ${collection}/${tokenId} with wallet ${userAddress}`,
    // );

    const url = `${API_ENDPOINTS.INTERGAZE_API}/tokens/${collection}/${tokenId}?wallet=${userAddress}`;

    let retries = 0;
    const maxRetries = REQUEST_CONFIG.MAX_RETRIES;

    while (retries <= maxRetries) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          REQUEST_CONFIG.TIMEOUT,
        ); // 15 second timeout

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
          // console.log(`[DEBUG] Initia traits response for ${tokenId}:`, data);

          if (data.traits && Array.isArray(data.traits)) {
            // Transform traits array to standard format
            const traitsArray = data.traits.map((trait) => ({
              trait_type: trait.name,
              value: trait.value,
              name: trait.name,
            }));

            // console.log(
            //   `[DEBUG] Processed ${traitsArray.length} traits for ${tokenId}`,
            // );
            return traitsArray;
          } else {
            // console.log(`[DEBUG] No traits found in response for ${tokenId}`);
            return [];
          }
        } else if (
          response.status === 408 ||
          response.status === 429 ||
          response.status >= 500
        ) {
          retries++;
          if (retries <= maxRetries) {
            const retryDelay = Math.min(
              REQUEST_CONFIG.RETRY_DELAY_BASE * Math.pow(2, retries - 1),
              REQUEST_CONFIG.MAX_RETRY_DELAY,
            );
            console.log(
              `[DEBUG] Initia traits API error ${response.status}, retrying in ${retryDelay}ms (attempt ${retries}/${maxRetries})`,
            );
            await delay(retryDelay);
            continue;
          }
        }

        console.warn(
          `[WARNING] Failed to fetch Initia traits for ${collection}/${tokenId}: ${response.status} ${response.statusText}`,
        );
        return [];
      } catch (error) {
        retries++;
        if (retries <= maxRetries) {
          const retryDelay = Math.min(
            REQUEST_CONFIG.RETRY_DELAY_BASE * Math.pow(2, retries - 1),
            REQUEST_CONFIG.MAX_RETRY_DELAY,
          );
          console.log(
            `[DEBUG] Initia traits network error, retrying in ${retryDelay}ms (attempt ${retries}/${maxRetries}):`,
            error.name === "AbortError" ? "Request timeout" : error.message,
          );
          await delay(retryDelay);
          continue;
        }

        console.error(
          `[ERROR] Error fetching Initia traits for ${collection}/${tokenId}:`,
          error,
        );
        return [];
      }
    }

    return [];
  } catch (error) {
    console.error(
      `[ERROR] Error fetching Initia traits for ${collection}/${tokenId}:`,
      error,
    );
    return [];
  }
};

// Fetch traits for a specific Initia NFT (with caching)
export const fetchInitiaSingleNFTTraits = async (
  collection,
  tokenId,
  userAddress,
) => {
  return cachedRequest(
    "fetchInitiaSingleNFTTraits",
    _fetchInitiaSingleNFTTraits,
    collection,
    tokenId,
    userAddress,
  );
};

// Fetch Stargaze NFTs with DAO integration (Original function)
const _fetchStargazeNFTs = async (addresses) => {
  console.log(`[DEBUG] Fetching Stargaze NFTs for addresses:`, addresses);
  try {
    // First, fetch staked NFTs from all Stargaze DAOs
    const stakedNFTs = [];
    const stargazeDAOs = daosConfig.DAOs["stargaze-1"];

    // console.log(`[DEBUG] === STARTING STAKED NFT FETCH ===`);
    // console.log(
    //   `[DEBUG] Starting staked NFTs fetch for ${Object.keys(stargazeDAOs).length} Stargaze DAOs`,
    // );

    const daoResults = await Promise.allSettled(
      Object.entries(stargazeDAOs).map(([daoName, daoConfig]) =>
        limit(async () => {
          try {
            let allStakedTokenIds = [];

            // Limit concurrent fetches per address
            const addressResults = await Promise.allSettled(
              addresses.map((address) =>
                limit(async () => {
                  try {
                    const ids = await fetchStakedNFTs("stargaze-1", daoConfig.contract, address);
                    return Array.isArray(ids) ? ids : [];
                  } catch (error) {
                    console.error(
                      `[ERROR] ✗ Failed to fetch staked NFTs for Stargaze address ${address}:`,
                      error,
                    );
                    return [];
                  }
                })
              )
            );

            addressResults.forEach((res) => {
              if (res.status === "fulfilled" && res.value.length > 0) {
                allStakedTokenIds.push(...res.value);
              }
            });

            const stakedTokenIds = [...new Set(allStakedTokenIds)];

            if (stakedTokenIds.length > 0) {
              // Limit concurrent NFT fetches
              const nftResults = await Promise.allSettled(
                stakedTokenIds.map((tokenId) =>
                  limit(async () => {
                    try {
                      const nftData = await fetchStargazeSingleNFT(
                        daoConfig.collection,
                        tokenId.toString()
                      );
                      if (nftData) {
                        return {
                          ...nftData,
                          daoStaked: true,
                          daoName,
                          daoAddress: daoConfig.DAO,
                        };
                      }
                      return null;
                    } catch (error) {
                      console.error(
                        `[ERROR] ✗ Failed to fetch staked NFT ${tokenId} from ${daoName}:`,
                        error,
                      );
                      return null;
                    }
                  })
                )
              );

              nftResults.forEach((res) => {
                if (res.status === "fulfilled" && res.value) {
                  stakedNFTs.push(res.value);
                }
              });
            }
          } catch (error) {
            console.error(`[ERROR] Failed to fetch staked NFTs from ${daoName}:`, error);
          }
        })
      )
    );

    // Optionally inspect DAO-level results
    daoResults.forEach((res, idx) => {
      if (res.status === "rejected") {
        const daoName = Object.keys(stargazeDAOs)[idx];
        console.error(`[ERROR] DAO ${daoName} failed:`, res.reason);
      }
    });


    // console.log(`[DEBUG] === STAKED NFT FETCH COMPLETE ===`);
    // console.log(`[DEBUG] Total staked NFTs collected: ${stakedNFTs.length}`);

    const query = `
      query ExampleQuery($ownerAddrOrName: String, $sortBy: TokenSort, $limit: Int, $offset: Int) {
        tokens(ownerAddrOrName: $ownerAddrOrName, sortBy:$sortBy, limit:$limit, offset:$offset) {
          tokens {
            name
            tokenId
            traits {
              rarity
              name
              value
            }
            isEscrowed
            listPrice {
              amount
              denom
              symbol
              amountUsd
              exponent
            }
            lastSalePrice {
            amount
            denom
            amountUsd
            symbol
            exponent
            }
            highestOffer {
              offerPrice {
                amount
                amountUsd
                denom
                exponent
                symbol
                }
              }
            rarityOrder
            imageUrl
            collection {
              floor {
                denom
                amount
                amountUsd
                symbol
                exponent
              }
              highestOffer {
                offerPrice {
                  amount
                  amountUsd
                  exponent
                  denom
                  symbol
                  }
                }
              name
              contractAddress
            }
            media {
              visualAssets {
                md {
                  type
                  url
                }
              }
            }
          }
        }
      }
    `;

    // Fetch regular NFTs from Stargaze
    const regularNFTs = [];

    for (const address of addresses) {
      let stargazeOffset = 0;
      let stargazeHasMore = true;

      while (stargazeHasMore) {
        const variables = {
          ownerAddrOrName: address,
          sortBy: "PRICE_USD_DESC",
          limit: 100,
          offset: stargazeOffset,
        };

        const response = await fetch(API_ENDPOINTS.STARGAZE_GRAPHQL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query,
            variables,
          }),
        });

        const data = await response.json();

        if (data.errors) {
          console.error("GraphQL errors:", data.errors);
          break;
        }

        const tokens = data.data?.tokens?.tokens || [];

        if (tokens.length < 100) {
          stargazeHasMore = false;
        }

        regularNFTs.push(...tokens);
        stargazeOffset += 100;
      }
    }

    // Process regular NFTs
    const processedNFTs = [];
    for (const address of addresses) {
      const addressNFTs = regularNFTs
        .filter(
          (token) =>
            // This would need to be determined by the API response or context
            // For now, we'll add all NFTs but track which address they came from
            true,
        )
        .map((token) => {
          const floor = token.collection?.floor;
          let floorAmount = 0;
          let floorAmountUsd = 0;

          if (floor) {
            const exponent = floor.exponent ?? 6;
            floorAmount = parseFloat(floor.amount) / Math.pow(10, exponent);
            floorAmountUsd = parseFloat(floor.amountUsd) || 0;
          }

          let listPrice = null;
          if (token.isEscrowed && token.listPrice) {
            const exponent = token.listPrice.exponent ?? 6;
            const listAmount = parseFloat(token.listPrice.amount) / Math.pow(10, exponent);
            listPrice = {
              amount: listAmount,
              denom: token.listPrice.denom,
              symbol: token.listPrice.symbol,
              amountUsd: parseFloat(token.listPrice.amountUsd) || 0,
            };
          }

          const highestOffer = token.highestOffer || token.collection.highestOffer || null;
          const highestOfferType = token.highestOffer ? "token" : token.collection.highestOffer ? "collection" : null;
          let highestOfferAmount = 0;
          let highestOfferAmountUsd = 0;
          let hasOffer = false;

          if (highestOffer) {
            hasOffer = true;
            const exponent = highestOffer.offerPrice.exponent ?? 6;
            highestOfferAmount = parseFloat(highestOffer.offerPrice.amount) / Math.pow(10, exponent);
            highestOfferAmountUsd = parseFloat(highestOffer.offerPrice.amountUsd) || 0;
          }

          let lastSalePrice = null;
          if (token.lastSalePrice) {
            const exponent = token.lastSalePrice.exponent || token.collection.floor.exponent || 6;
            const saleAmount = parseFloat(token.lastSalePrice.amount) / Math.pow(10, exponent);
            lastSalePrice = {
              amount: saleAmount,
              denom: token.lastSalePrice.denom || token.collection.floor.denom,
              symbol: token.lastSalePrice.symbol || token.collection.floor.symbol,
              amountUsd: parseFloat(token.lastSalePrice.amountUsd) || 0,
            };
          }

          // Process image URL
          let baseImageUrl = token.imageUrl;
          let lightImageUrl = token.media.visualAssets.md.url;
          let finalImageUrl = null;
          let imageType = token.media.visualAssets.md.type;
          if (lightImageUrl && imageType) {
            const isVideoToGif = lightImageUrl.toLowerCase().includes("f:mp4");
            if (imageType === "video" || isVideoToGif) {
              finalImageUrl = baseImageUrl;
            } else {
              finalImageUrl = lightImageUrl;
            }
            // Check if it's a GIF


            // // Handle Stargaze image service URLs with IPFS for GIFs
            // if (
            //   isGif &&
            //   imageUrl.includes("i.stargaze-apis.com") &&
            //   imageUrl.includes("ipfs://")
            // ) {
            //   const ipfsMatch = imageUrl.match(
            //     /ipfs:\/\/([a-zA-Z0-9]+\/[^)]+)/,
            //   );
            //   if (ipfsMatch) {
            //     imageUrl = `${API_ENDPOINTS.IPFS_GATEWAY_PRIMARY}${ipfsMatch[1]}`;
            //   }
            // }

            // Handle generic IPFS URLs
            // if (imageUrl.startsWith("ipfs://")) {
            //   imageUrl = imageUrl.replace(
            //     "ipfs://",
            //     API_ENDPOINTS.IPFS_GATEWAY_PRIMARY,
            //   );
            // }
          }

          return {
            name: token.name || "Unnamed NFT",
            tokenId: token.tokenId || "unknown",
            chain: "stargaze",
            contract: token.collection?.contractAddress || "unknown-contract",
            collection: token.collection?.name || "Unknown Collection",
            image: finalImageUrl,
            listed: token.isEscrowed,
            listPrice,
            rarity: token.rarityOrder,
            traits: token.traits || [],
            floor: {
              amount: floorAmount,
              amountUsd: floorAmountUsd,
              denom: floor?.denom,
              symbol: floor?.symbol,
            },
            hasOffer: hasOffer,
            highestOffer: {
              highestOfferType: highestOfferType,
              amount: highestOfferAmount,
              amountUsd: highestOfferAmountUsd,
              denom: highestOffer?.offerPrice?.denom || null,
              symbol: highestOffer?.offerPrice?.symbol || null,
            },
            lastSalePriceSpecified: true,
            lastSalePrice: lastSalePrice,
            sortUsd: listPrice ? listPrice.amountUsd : floorAmountUsd,
            daoStaked: false,
            sourceAddress: address,
          };
        });

      // Since we're fetching all addresses together, we need to distribute NFTs
      // This is a simplified approach - in reality you'd need the API to tell you
      // which NFTs belong to which address
      const nftsPerAddress = Math.ceil(addressNFTs.length / addresses.length);
      const startIndex = addresses.indexOf(address) * nftsPerAddress;
      const endIndex = startIndex + nftsPerAddress;
      processedNFTs.push(...addressNFTs.slice(startIndex, endIndex));
    }

    // Process staked NFTs
    const processedStakedNFTs = stakedNFTs.map((token) => {
      const floor = token.collection?.floor;
      let floorAmount = 0;
      let floorAmountUsd = 0;

      if (floor) {
        const exponent = floor.exponent ?? 6;
        floorAmount = parseFloat(floor.amount) / Math.pow(10, exponent);
        floorAmountUsd = parseFloat(floor.amountUsd) || 0;
      }

      let listPrice = null;
      if (token.isEscrowed && token.listPrice) {
        const exponent = token.listPrice.exponent ?? 6;
        const listAmount = parseFloat(token.listPrice.amount) / Math.pow(10, exponent);
        listPrice = {
          amount: listAmount,
          denom: token.listPrice.denom,
          symbol: token.listPrice.symbol,
          amountUsd: parseFloat(token.listPrice.amountUsd) || 0,
        };
      }

      const highestOffer = token.highestOffer || token.collection.highestOffer || null;
      const highestOfferType = token.highestOffer ? "token" : token.collection.highestOffer ? "collection" : null;
      let highestOfferAmount = 0;
      let highestOfferAmountUsd = 0;
      let hasOffer = false;

      if (highestOffer) {
        hasOffer = true;
        const exponent = highestOffer.offerPrice.exponent ?? 6;
        highestOfferAmount = parseFloat(highestOffer.offerPrice.amount) / Math.pow(10, exponent);
        highestOfferAmountUsd = parseFloat(highestOffer.offerPrice.amountUsd) || 0;
      }

      let lastSalePrice = null;
      if (token.lastSalePrice) {
        const exponent = token.lastSalePrice.exponent || token.collection.floor.exponent || 6;
        const saleAmount = parseFloat(token.lastSalePrice.amount) / Math.pow(10, exponent);
        lastSalePrice = {
          amount: saleAmount,
          denom: token.lastSalePrice.denom,
          symbol: token.lastSalePrice.symbol,
          amountUsd: parseFloat(token.lastSalePrice.amountUsd) || 0,
        };
      }

      // Process image URL
      let baseImageUrl = token.imageUrl;
      let lightImageUrl = token.media.visualAssets.md.url;
      let finalImageUrl = null;
      let imageType = token.media.visualAssets.md.type;
      if (lightImageUrl && imageType) {
        const isVideoToGif = lightImageUrl.toLowerCase().includes("f:mp4");
        if (imageType === "video" || isVideoToGif) {
          finalImageUrl = baseImageUrl;
        } else {
          finalImageUrl = lightImageUrl;
        }
        // Check if it's a GIF
        // const isGif = imageUrl.toLowerCase().includes(".gif");

        // // Handle Stargaze image service URLs with IPFS for GIFs
        // if (
        //   isGif &&
        //   imageUrl.includes("i.stargaze-apis.com") &&
        //   imageUrl.includes("ipfs://")
        // ) {
        //   const ipfsMatch = imageUrl.match(/ipfs:\/\/([a-zA-Z0-9]+\/[^)]+)/);
        //   if (ipfsMatch) {
        //     imageUrl = `${API_ENDPOINTS.IPFS_GATEWAY_PRIMARY}${ipfsMatch[1]}`;
        //   }
        // }

        // Handle generic IPFS URLs
        // if (imageUrl.startsWith("ipfs://")) {
        //   imageUrl = imageUrl.replace(
        //     "ipfs://",
        //     API_ENDPOINTS.IPFS_GATEWAY_PRIMARY,
        //   );
        // }
      }

      return {
        name: token.name || "Unnamed NFT",
        tokenId: token.tokenId || "unknown",
        chain: "stargaze",
        contract: token.collection?.contractAddress || "unknown-contract",
        collection: token.collection?.name || "Unknown Collection",
        image: finalImageUrl,
        listed: token.isEscrowed,
        listPrice,
        rarity: token.rarityOrder,
        traits: token.traits || [],
        floor: {
          amount: floorAmount,
          amountUsd: floorAmountUsd,
          denom: floor?.denom,
          symbol: floor?.symbol,
        },
        hasOffer: hasOffer,
        highestOffer: {
          highestOfferType: highestOfferType,
          amount: highestOfferAmount,
          amountUsd: highestOfferAmountUsd,
          denom: highestOffer?.offerPrice?.denom || null,
          symbol: highestOffer?.offerPrice?.symbol || null,
        },
        lastSalePriceSpecified: true,
        lastSalePrice: lastSalePrice,
        sortUsd: listPrice ? listPrice.amountUsd : floorAmountUsd,
        daoStaked: true,
        daoName: token.daoName,
        daoAddress: token.daoAddress,
        sourceAddress: addresses[0], // Staked NFTs are associated with first address for simplicity
      };
    });

    // Deduplicate NFTs
    const uniqueNFTs = new Map();

    // Add wallet NFTs first
    processedNFTs.forEach((nft) => {
      const key = `${nft.contract}-${nft.tokenId}`;
      uniqueNFTs.set(key, nft);
    });

    // Add staked NFTs - properly merge or add them
    processedStakedNFTs.forEach((nft) => {
      const key = `${nft.contract}-${nft.tokenId}`;
      if (uniqueNFTs.has(key)) {
        // If NFT exists in wallet, mark it as both staked
        const existingNFT = uniqueNFTs.get(key);
        uniqueNFTs.set(key, {
          ...existingNFT,
          daoStaked: true,
          daoName: nft.daoName,
          daoAddress: nft.daoAddress,
        });
      } else {
        // If NFT is only staked (not in wallet), add it as staked-only
        uniqueNFTs.set(key, nft);
      }
    });

    const finalNFTsArray = Array.from(uniqueNFTs.values());
    // console.log(`[DEBUG] === DEDUPLICATION SUMMARY ===`);
    console.log(
      `[DEBUG] Total unique NFTs for Stargaze after deduplication: ${uniqueNFTs.size}`,
    );

    return finalNFTsArray;
  } catch (error) {
    console.error("Error fetching Stargaze NFTs:", error);
    return [];
  }
};

// Fetch Stargaze NFTs with DAO integration (with caching)
export const fetchStargazeNFTs = async (addresses) => {
  return cachedRequest("fetchStargazeNFTs", _fetchStargazeNFTs, addresses);
};

// Helper function to fetch NFT metadata with multiple CORS proxy fallbacks
const fetchOsmosisNFTMetadata = async (
  tokenId,
  contract,
  tokenUri = null,
  useMyGateway = true,
) => {
  // console.log(`[DEBUG] Fetching metadata for NFT ${tokenId} from ${contract}`);

  // Try MyGateway first for non-listed/non-staked NFTs
  if (useMyGateway && tokenUri) {
    try {
      // console.log(`[DEBUG] Trying MyGateway for ${tokenId}`);
      const myGatewayUrl = tokenUri.replace(
        "ipfs://",
        API_ENDPOINTS.IPFS_GATEWAY_PRIMARY,
      );

      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        REQUEST_CONFIG.TIMEOUT,
      ); // 10 second timeout

      const response = await fetch(myGatewayUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const metadata = await response.json();
        // console.log(`[DEBUG] ✓ MyGateway success for ${tokenId}`);
        return metadata;
      } else {
        console.log(
          `[DEBUG] MyGateway failed for ${tokenId}: ${response.status}`,
        );
      }
    } catch (error) {
      console.log(
        `[DEBUG] MyGateway error for ${tokenId}:`,
        error.name === "AbortError" ? "Request timeout" : error.message,
      );
    }
  }

  // Try multiple CORS proxies as fallback
  if (tokenUri) {
    for (let i = 0; i < CORS_PROXIES.length; i++) {
      const proxyUrl = CORS_PROXIES[i];
      try {
        // console.log(
        //   `[DEBUG] Trying CORS proxy ${i + 1}/${CORS_PROXIES.length} for ${tokenId}: ${proxyUrl}`,
        // );

        let proxiedUrl;
        if (proxyUrl.includes("codetabs.com")) {
          proxiedUrl = proxyUrl + encodeURIComponent(tokenUri);
        } else if (proxyUrl.includes("thingproxy.freeboard.io")) {
          proxiedUrl = proxyUrl + encodeURIComponent(tokenUri);
        } else {
          proxiedUrl = proxyUrl + tokenUri;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          REQUEST_CONFIG.TIMEOUT,
        ); // 15 second timeout

        const response = await fetch(proxiedUrl, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const metadata = await response.json();
          // console.log(`[DEBUG] ✓ CORS proxy ${i + 1} success for ${tokenId}`);
          return metadata;
        } else {
          console.log(
            `[DEBUG] CORS proxy ${i + 1} failed for ${tokenId}: ${response.status}`,
          );
        }
      } catch (error) {
        console.log(
          `[DEBUG] CORS proxy ${i + 1} error for ${tokenId}:`,
          error.name === "AbortError" ? "Request timeout" : error.message,
        );
      }
    }
  }

  console.warn(`[WARNING] All metadata fetch methods failed for ${tokenId}`);
  return null;
};

// Fetch Osmosis NFTs with simplified staked NFTs approach (Original function)
const _fetchOsmosisNFTs = async (addresses, bosmoPrice = 1.0) => {
  try {
    console.log(`[DEBUG] Fetching Osmosis NFTs for addresses:`, addresses);

    // Pre-fetch collection floors once to avoid duplicate requests
    const collectionFloors = new Map();
    const stargazeOffers = new Map(); // Cache for Stargaze offers by collection
    const osmosisDAOs = daosConfig.DAOs["osmosis-1"];

    if (osmosisDAOs) {
      for (const [daoName, daoConfig] of Object.entries(osmosisDAOs)) {
        try {
          const collectionFloor = await fetchOsmosisCollectionFloor(
            daoConfig.collection,
          );
          collectionFloors.set(daoConfig.collection, collectionFloor);
          console.log(
            `[DEBUG] Floor for ${daoName}: ${collectionFloor?.price || 0} bOSMO`,
          );
        } catch (error) {
          console.error(`[ERROR] Failed to fetch floor for ${daoName}:`, error);
        }
      }
    }

    // Helper function to get Stargaze contract from collection name
    const getStargazeContract = async (collectionName) => {
      try {
        // Load interchain collections contracts from public folder
        const response = await fetch('/interchainCollectionsContracts.json');
        if (!response.ok) {
          console.error('[ERROR] Failed to load interchainCollectionsContracts.json');
          return null;
        }

        const interchainCollectionsContracts = await response.json();
        const collections = interchainCollectionsContracts.Collections;

        for (const [name, contracts] of Object.entries(collections)) {
          if (name === collectionName && contracts["stargaze-1"]) {
            return contracts["stargaze-1"];
          }
        }
        return null;
      } catch (error) {
        console.error(`[ERROR] Failed to get Stargaze contract for ${collectionName}:`, error);
        return null;
      }
    };

    // Helper function to check Stargaze offers for a collection
    const checkStargazeOffers = async (collectionName) => {
      try {
        // Check cache first
        if (stargazeOffers.has(collectionName)) {
          return stargazeOffers.get(collectionName);
        }

        const stargazeContract = await getStargazeContract(collectionName);
        if (!stargazeContract) {
          console.log(`[DEBUG] No Stargaze contract found for collection: ${collectionName}`);
          stargazeOffers.set(collectionName, null);
          return null;
        }

        const stargazeData = await _fetchStargazeCollectionFloorAndOffer(stargazeContract);
        stargazeOffers.set(collectionName, stargazeData);

        return stargazeData;
      } catch (error) {
        console.error(`[ERROR] Failed to check Stargaze offers for ${collectionName}:`, error);
        stargazeOffers.set(collectionName, null);
        return null;
      }
    };

    // Helper function to check NFT offers
    const checkNFTOffers = async (contract, tokenId) => {
      try {
        const contractQuery = {
          nft_auction: {
            nft_contract: contract,
            token_id: tokenId
          }
        };
        const queryString = JSON.stringify(contractQuery);
        // console.log(`[DEBUG] Query for ${tokenId}:`, queryString);
        const encodedQuery = btoa(queryString);

        // Query the BackboneLabs marketplace smart contract
        const queryUrl = `${API_ENDPOINTS.OSMOSIS_LCD}/cosmwasm/wasm/v1/contract/osmo1d538dlgllprz0hh32x0qvcx5c9pp7xxr3lr06z5k95vfr4njhppsy0w0k3/smart/${encodedQuery}`
        const response = await fetch(queryUrl, {
          method: "GET",
          headers: { Accept: "application/json" },
        });

        if (response.ok) {
          const data = await response.json();

          if (data.data && data.data.offers && data.data.offers.length > 0) {
            // Find the highest offer
            const highestOffer = data.data.offers.reduce((max, offer) => {
              const offerAmount = parseInt(offer.amount);
              const maxAmount = parseInt(max.amount);
              return offerAmount > maxAmount ? offer : max;
            });

            // Calculate amounts with exponent 6
            const highestOfferAmount = parseInt(highestOffer.amount) / 1_000_000;
            const highestOfferAmountUsd = bosmoPrice && highestOfferAmount > 0 ?
              highestOfferAmount * bosmoPrice : 0;

            return {
              hasOffer: true,
              highestOffer: {
                highestOfferType: "token",
                amount: highestOfferAmount,
                amountUsd: highestOfferAmountUsd,
                denom: "factory/osmo1s3l0lcqc7tu0vpj6wdjz9wqpxv8nk6eraevje4fuwkyjnwuy82qsx3lduv/boneOsmo",
                symbol: "bOSMO",
              },
            };
          }
        }
      } catch (error) {
        console.error(`[ERROR] Failed to check offers for ${contract}:${tokenId}:`, error);
      }

      // Return default values if no offers or error
      return {
        hasOffer: false,
        highestOffer: null,
      };
    };

    // Helper function to process offer data including Stargaze check
    const processOfferData = async (nft, osmosisOfferData, collectionName) => {
      let finalOfferData = { ...osmosisOfferData };

      // If no Osmosis offer, check Stargaze
      if (!osmosisOfferData.hasOffer) {
        const stargazeData = await checkStargazeOffers(collectionName);

        // FIX: Stargaze offer lives under collection.highestOffer.offerPrice
        const stargazeOffer = stargazeData?.highestOffer?.offerPrice;

        if (stargazeOffer && stargazeOffer.amount && parseFloat(stargazeOffer.amount) > 0) {
          const exponent = stargazeOffer.exponent ?? 6;
          const stargazeOfferAmount =
            parseFloat(stargazeOffer.amount) / Math.pow(10, exponent);
          const stargazeOfferUsd = parseFloat(stargazeOffer.amountUsd) || 0;
          finalOfferData = {
            hasOffer: true,
            highestOffer: {
              highestOfferType: "collection", // or "token" if you prefer
              amount: stargazeOfferAmount,
              amountUsd: stargazeOfferUsd,
              denom: stargazeOffer.denom,
              symbol: stargazeOffer.symbol,
            },
            offerFromStargaze: true,
          };
        }
      }

      if (!finalOfferData.offerFromStargaze) {
        finalOfferData.offerFromStargaze = false;
      }

      return finalOfferData;
    };



    // Fetch staked NFTs using simplified BackboneLabs API approach
    const stakedNFTs = [];

    for (const address of addresses) {
      try {
        let page = 1;
        let hasMorePages = true;
        const allStakedNfts = [];

        while (hasMorePages) {
          const stakedUrl = `https://warlock.backbonelabs.io/api/v1/dapps/necropolis/nfts/address/${address}/staked?page=${page}&perPage=24&chainId=osmosis-1`;

          const corsProxies = CORS_PROXIES;
          let proxiedUrl;
          const proxyUrl = corsProxies[0];

          if (proxyUrl.includes("codetabs.com")) {
            proxiedUrl = proxyUrl + encodeURIComponent(stakedUrl);
          } else if (proxyUrl.includes("thingproxy.freeboard.io")) {
            proxiedUrl = proxyUrl + encodeURIComponent(stakedUrl);
          } else {
            proxiedUrl = proxyUrl + stakedUrl;
          }

          const response = await fetch(proxiedUrl, {
            method: "GET",
            headers: { Accept: "application/json" },
          });

          if (response.ok) {
            const stakedData = await response.json();

            if (stakedData.nfts && Array.isArray(stakedData.nfts)) {
              allStakedNfts.push(...stakedData.nfts);

              if (stakedData.nfts.length < 24) {
                hasMorePages = false;
              } else {
                page++;
              }
            } else {
              hasMorePages = false;
            }
          } else {
            hasMorePages = false;
          }
        }

        if (allStakedNfts.length > 0) {
          const stakedPromises = allStakedNfts.map((nft) =>
            limit(async () => {
              try {
                // Get collection floor from cache or fetch
                let collectionFloor = collectionFloors.get(nft.collection.contract);
                if (!collectionFloor) {
                  collectionFloor = await fetchOsmosisCollectionFloor(nft.collection.contract);
                  collectionFloors.set(nft.collection.contract, collectionFloor);
                }

                // Fetch metadata
                let metadata = null;
                if (nft.token_uri) {
                  metadata = await fetchOsmosisNFTMetadata(
                    nft.nft_token_id,
                    nft.collection.contract,
                    nft.token_uri,
                    true,
                  );
                } else {
                  metadata = await fetchListedNFTMetadata(
                    nft.collection.contract,
                    nft.nft_token_id,
                    "osmosis",
                  );
                }

                // Process image URL
                let processedImageUrl = nft.cf_url || nft.image_url || metadata?.image;
                if (processedImageUrl && processedImageUrl.startsWith("ipfs://")) {
                  processedImageUrl = processedImageUrl.replace(
                    "ipfs://",
                    API_ENDPOINTS.IPFS_GATEWAY_PRIMARY,
                  );
                }

                // Calculate floor price
                const floorPriceBosmo = collectionFloor ? parseFloat(collectionFloor.price || 0) : 0;
                const floorPriceUsd = bosmoPrice && floorPriceBosmo > 0 ? floorPriceBosmo * bosmoPrice : 0;

                // Get collection info
                const getCollectionInfo = (contractAddress) => {
                  for (const [daoName, daoConfig] of Object.entries(osmosisDAOs || {})) {
                    if (daoConfig.collection === contractAddress) {
                      return {
                        name: daoName.replace(" DAO", ""),
                        daoName: daoName,
                        daoAddress: daoConfig.DAO,
                      };
                    }
                  }
                  return {
                    name: nft.collection.name || "Unknown Collection",
                    daoName: null,
                    daoAddress: null,
                  };
                };
                const collectionInfo = getCollectionInfo(nft.collection.contract);

                // Process traits
                const rawTraits = metadata?.attributes || metadata?.traits || [];
                const processedTraits = rawTraits.map((trait) => ({
                  name: trait.trait_type || trait.name,
                  value: trait.value,
                  rarity: undefined,
                }));

                // Check offers including Stargaze
                const osmosisOfferData = {
                  hasOffer: false,
                  highestOffer: null,
                };
                const offerData = await processOfferData(nft, osmosisOfferData, collectionInfo.name);

                return {
                  name: nft.nft_name || metadata?.name || `NFT #${nft.nft_token_id}`,
                  tokenId: nft.nft_token_id.toString(),
                  chain: "osmosis",
                  contract: nft.collection.contract,
                  collection: collectionInfo.name,
                  image: processedImageUrl,
                  listed: false,
                  listPrice: null,
                  rarity: nft.rank || null,
                  traits: processedTraits,
                  floor: {
                    amount: floorPriceBosmo,
                    amountUsd: floorPriceUsd,
                    denom: "factory/osmo1s3l0lcqc7tu0vpj6wdjz9wqpxv8nk6eraevje4fuwkyjnwuy82qsx3lduv/boneOsmo",
                    symbol: "bOSMO",
                  },
                  sortUsd: floorPriceUsd,
                  staked: true,
                  daoStaked: true,
                  daoName: collectionInfo.daoName,
                  daoAddress: collectionInfo.daoAddress,
                  sourceAddress: address,
                  ...offerData,
                };
              } catch (error) {
                console.error(`[ERROR] Failed to process staked NFT ${nft.nft_token_id}:`, error);
                return null;
              }
            }),
          );

          const stakedResults = await Promise.all(stakedPromises);
          stakedResults.forEach((nftData) => {
            if (nftData) stakedNFTs.push(nftData);
          });
        }
      } catch (error) {
        console.error(`[ERROR] Failed to fetch staked NFTs for ${address}:`, error);
      }
    }

    // Fetch wallet NFTs using optimized approach
    const walletNFTs = [];

    for (const address of addresses) {
      // Fetch not listed NFTs
      try {
        let page = 1;
        let hasMorePages = true;
        const allNotListedNfts = [];

        while (hasMorePages) {
          const notListedUrl = `${API_ENDPOINTS.BACKBONE_LABS_API}/dapps/necropolis/nfts/address/${address}/not_listed?page=${page}&perPage=${PAGINATION_CONFIG.BACKBONE_API_PER_PAGE}&chainId=osmosis-1`;

          const corsProxies = CORS_PROXIES;
          let proxiedUrl;
          const proxyUrl = corsProxies[0];

          if (proxyUrl.includes("codetabs.com")) {
            proxiedUrl = proxyUrl + encodeURIComponent(notListedUrl);
          } else if (proxyUrl.includes("thingproxy.freeboard.io")) {
            proxiedUrl = proxyUrl + encodeURIComponent(notListedUrl);
          } else {
            proxiedUrl = proxyUrl + notListedUrl;
          }

          const response = await fetch(proxiedUrl, {
            method: "GET",
            headers: { Accept: "application/json" },
          });

          if (response.ok) {
            const notListedData = await response.json();

            if (notListedData.nfts && Array.isArray(notListedData.nfts)) {
              allNotListedNfts.push(...notListedData.nfts);

              if (notListedData.nfts.length < PAGINATION_CONFIG.BACKBONE_API_PER_PAGE) {
                hasMorePages = false;
              } else {
                page++;
              }
            } else {
              hasMorePages = false;
            }
          } else {
            hasMorePages = false;
          }
        }

        if (allNotListedNfts.length > 0) {
          const notListedPromises = allNotListedNfts.map((nft) =>
            limit(async () => {
              try {
                // Get collection floor from cache or fetch
                let collectionFloor = collectionFloors.get(nft.collection.contract);
                if (!collectionFloor) {
                  collectionFloor = await fetchOsmosisCollectionFloor(nft.collection.contract);
                  collectionFloors.set(nft.collection.contract, collectionFloor);
                }

                // Fetch metadata with MyGateway priority
                const metadata = await fetchOsmosisNFTMetadata(
                  nft.nft_token_id,
                  nft.collection.contract,
                  nft.token_uri,
                  true,
                );

                // Process image URL
                let processedImageUrl = nft.cf_url || nft.image_url || metadata?.image_url;
                if (processedImageUrl && processedImageUrl.startsWith("ipfs://")) {
                  processedImageUrl = processedImageUrl.replace(
                    "ipfs://",
                    API_ENDPOINTS.IPFS_GATEWAY_PRIMARY,
                  );
                }

                // Calculate floor price
                const floorPriceBosmo = collectionFloor ? parseFloat(collectionFloor.price || 0) : 0;
                const floorPriceUsd = bosmoPrice && floorPriceBosmo > 0 ? floorPriceBosmo * bosmoPrice : 0;

                // Get collection name
                const getCollectionName = (contractAddress) => {
                  for (const [daoName, daoConfig] of Object.entries(osmosisDAOs || {})) {
                    if (daoConfig.collection === contractAddress) {
                      return daoName.replace(" DAO", "");
                    }
                  }
                  return nft.collection.name || "Unknown Collection";
                };

                // Process traits
                const rawTraits = metadata?.attributes || metadata?.traits || [];
                const processedTraits = rawTraits.map((trait) => ({
                  name: trait.trait_type || trait.name,
                  value: trait.value,
                  rarity: undefined,
                }));

                // Check offers including Stargaze
                const osmosisOfferData = {
                  hasOffer: false,
                  highestOffer: null,
                };
                const offerData = await processOfferData(nft, osmosisOfferData, getCollectionName(nft.collection.contract));

                return {
                  name: nft.nft_name || metadata?.name || `NFT #${nft.nft_token_id}`,
                  tokenId: nft.nft_token_id.toString(),
                  chain: "osmosis",
                  contract: nft.collection.contract,
                  collection: getCollectionName(nft.collection.contract),
                  image: processedImageUrl,
                  listed: false,
                  listPrice: null,
                  rarity: nft.rank || null,
                  traits: processedTraits,
                  floor: {
                    amount: floorPriceBosmo,
                    amountUsd: floorPriceUsd,
                    denom: "factory/osmo1s3l0lcqc7tu0vpj6wdjz9wqpxv8nk6eraevje4fuwkyjnwuy82qsx3lduv/boneOsmo",
                    symbol: "bOSMO",
                  },
                  sortUsd: floorPriceUsd,
                  daoStaked: false,
                  sourceAddress: address,
                  ...offerData,
                };
              } catch (error) {
                console.error(`[ERROR] Failed to process not listed NFT ${nft.nft_token_id}:`, error);
                return null;
              }
            }),
          );

          const notListedResults = await Promise.all(notListedPromises);
          notListedResults.forEach((nftData) => {
            if (nftData) walletNFTs.push(nftData);
          });
        }
      } catch (error) {
        console.error(`[ERROR] Failed to fetch not listed NFTs for ${address}:`, error);
      }

      // Fetch listed NFTs
      try {
        let page = 1;
        let hasMorePages = true;
        const allListedNfts = [];

        while (hasMorePages) {
          const listedUrl = `${API_ENDPOINTS.BACKBONE_LABS_API}/dapps/necropolis/nfts/address/${address}/listed?page=${page}&perPage=${PAGINATION_CONFIG.BACKBONE_API_PER_PAGE}&chainId=osmosis-1`;

          const corsProxies = CORS_PROXIES;
          let proxiedUrl;
          const proxyUrl = corsProxies[0];

          if (proxyUrl.includes("codetabs.com")) {
            proxiedUrl = proxyUrl + encodeURIComponent(listedUrl);
          } else if (proxyUrl.includes("thingproxy.freeboard.io")) {
            proxiedUrl = proxyUrl + encodeURIComponent(listedUrl);
          } else {
            proxiedUrl = proxyUrl + listedUrl;
          }

          const response = await fetch(proxiedUrl, {
            method: "GET",
            headers: { Accept: "application/json" },
          });

          if (response.ok) {
            const listedData = await response.json();

            if (listedData.nfts && Array.isArray(listedData.nfts)) {
              allListedNfts.push(...listedData.nfts);

              if (listedData.nfts.length < PAGINATION_CONFIG.BACKBONE_API_PER_PAGE) {
                hasMorePages = false;
              } else {
                page++;
              }
            } else {
              hasMorePages = false;
            }
          } else {
            hasMorePages = false;
          }
        }

        if (allListedNfts.length > 0) {
          const listedPromises = allListedNfts.map((nft) =>
            limit(async () => {
              try {
                // Get collection floor from cache or fetch
                let collectionFloor = collectionFloors.get(nft.collection.contract);
                if (!collectionFloor) {
                  collectionFloor = await fetchOsmosisCollectionFloor(nft.collection.contract);
                  collectionFloors.set(nft.collection.contract, collectionFloor);
                }

                // Fetch metadata from BackboneLabs API for listed NFTs
                const metadata = await fetchListedNFTMetadata(
                  nft.collection.contract,
                  nft.nft_token_id,
                  "osmosis",
                );

                // Check for offers on listed NFTs (Osmosis first, then Stargaze if none)
                const osmosisOfferData = await checkNFTOffers(nft.collection.contract, nft.nft_token_id);
                const offerData = await processOfferData(nft, osmosisOfferData, getCollectionName(nft.collection.contract));

                // Process image URL
                let processedImageUrl = nft.cf_url || nft.image_url || metadata?.image_url;
                if (processedImageUrl && processedImageUrl.startsWith("ipfs://")) {
                  processedImageUrl = processedImageUrl.replace(
                    "ipfs://",
                    API_ENDPOINTS.IPFS_GATEWAY_PRIMARY,
                  );
                }

                // Process list price from auction data
                let listPrice = null;
                if (nft.auction && nft.auction.reserve_price) {
                  const priceAmount = parseFloat(nft.auction.reserve_price) / 1_000_000;
                  const priceUsd = bosmoPrice && priceAmount > 0 ? priceAmount * bosmoPrice : 0;

                  listPrice = {
                    amount: priceAmount,
                    denom: nft.auction.denom || "factory/osmo1s3l0lcqc7tu0vpj6wdjz9wqpxv8nk6eraevje4fuwkyjnwuy82qsx3lduv/boneOsmo",
                    symbol: "bOSMO",
                    amountUsd: priceUsd,
                  };
                }

                // Calculate floor price
                const floorPriceBosmo = collectionFloor
                  ? parseFloat(collectionFloor.price || 0)
                  : listPrice ? listPrice.amount : 0;

                const floorPriceUsd = bosmoPrice && floorPriceBosmo > 0
                  ? floorPriceBosmo * bosmoPrice
                  : listPrice ? listPrice.amountUsd : 0;

                // Get collection name
                const getCollectionName = (contractAddress) => {
                  for (const [daoName, daoConfig] of Object.entries(osmosisDAOs || {})) {
                    if (daoConfig.collection === contractAddress) {
                      return daoName.replace(" DAO", "");
                    }
                  }
                  return nft.collection.name || "Unknown Collection";
                };

                // Process traits
                const rawTraits = metadata?.attributes || metadata?.traits || [];
                const processedTraits = rawTraits.map((trait) => ({
                  name: trait.trait_type || trait.name,
                  value: trait.value,
                  rarity: undefined,
                }));

                return {
                  name: nft.nft_name || metadata?.name || `NFT #${nft.nft_token_id}`,
                  tokenId: nft.nft_token_id.toString(),
                  chain: "osmosis",
                  contract: nft.collection.contract,
                  collection: getCollectionName(nft.collection.contract),
                  image: processedImageUrl,
                  listed: true,
                  listPrice,
                  rarity: nft.rank || null,
                  traits: processedTraits,
                  floor: {
                    amount: floorPriceBosmo,
                    amountUsd: floorPriceUsd,
                    denom: "factory/osmo1s3l0lcqc7tu0vpj6wdjz9wqpxv8nk6eraevje4fuwkyjnwuy82qsx3lduv/boneOsmo",
                    symbol: "bOSMO",
                  },
                  sortUsd: listPrice ? listPrice.amountUsd : floorPriceUsd,
                  daoStaked: false,
                  sourceAddress: address,
                  ...offerData,
                };
              } catch (error) {
                console.error(`[ERROR] Failed to process listed NFT ${nft.nft_token_id}:`, error);
                return null;
              }
            }),
          );

          const listedResults = await Promise.all(listedPromises);
          listedResults.forEach((nftData) => {
            if (nftData) walletNFTs.push(nftData);
          });
        }
      } catch (error) {
        console.error(`[ERROR] Failed to fetch listed NFTs for ${address}:`, error);
      }
    }

    // Combine staked and wallet NFTs with deduplication
    const uniqueNFTs = new Map();

    // Add wallet NFTs first
    walletNFTs.forEach((nft) => {
      const key = `${nft.contract}-${nft.tokenId}`;
      uniqueNFTs.set(key, nft);
    });

    // Add staked NFTs - properly merge or add them
    stakedNFTs.forEach((nft) => {
      const key = `${nft.contract}-${nft.tokenId}`;
      if (uniqueNFTs.has(key)) {
        // If NFT exists in wallet, mark it as both staked
        const existingNFT = uniqueNFTs.get(key);
        uniqueNFTs.set(key, {
          ...existingNFT,
          daoStaked: true,
          daoName: nft.daoName,
          daoAddress: nft.daoAddress,
        });
      } else {
        // If NFT is only staked (not in wallet), add it as staked-only
        uniqueNFTs.set(key, nft);
      }
    });

    const finalNFTsArray = Array.from(uniqueNFTs.values());
    console.log(
      `[DEBUG] Total unique Osmosis NFTs after deduplication: ${finalNFTsArray.length}`,
    );

    return finalNFTsArray;
  } catch (error) {
    console.error("Error fetching Osmosis NFTs:", error);
    return [];
  }
};

// Fetch Osmosis NFTs with DAO integration (with caching)
export const fetchOsmosisNFTs = async (addresses, bosmoPrice = 1.0) => {
  return cachedRequest(
    "fetchOsmosisNFTs",
    _fetchOsmosisNFTs,
    addresses,
    bosmoPrice,
  );
};

// Fetch Injective NFTs with DAO integration (Original function)
const _fetchInjectiveNFTs = async (addresses, injPrice = 1.0) => {
  try {
    console.log(`[DEBUG] Fetching Injective NFTs for addresses:`, addresses);

    // Create a unique cache key for this specific addresses and injPrice combination
    const addressesCacheKey = `injective-staked-${addresses.sort().join("-")}-${injPrice}`;

    // Pre-fetch collection floors once to avoid duplicate requests
    const collectionFloors = new Map();
    const injectiveDAOs = daosConfig.DAOs["injective-1"];

    if (injectiveDAOs) {
      // console.log(
      //   `[DEBUG] Pre-fetching collection floors for ${Object.keys(injectiveDAOs).length} collections`,
      // );
      for (const [daoName, daoConfig] of Object.entries(injectiveDAOs)) {
        try {
          const collectionFloor = await fetchInjectiveCollectionFloor(
            daoConfig.collection,
          );
          collectionFloors.set(daoConfig.collection, collectionFloor);
          console.log(
            `[DEBUG] Floor for ${daoName}: ${collectionFloor?.price || 0} INJ`,
          );
        } catch (error) {
          console.error(`[ERROR] Failed to fetch floor for ${daoName}:`, error);
        }
      }
    }

    const checkNFTOffers = async (contract, tokenId, injPrice = 1.0) => {
      try {
        const contractQuery = {
          nft_auction: {
            nft_contract: contract,
            token_id: tokenId
          }
        };
        const queryString = JSON.stringify(contractQuery);
        const encodedQuery = btoa(queryString);

        // Query the Injective marketplace smart contract
        const queryUrl = `${API_ENDPOINTS.INJECTIVE_LCD}/cosmwasm/wasm/v1/contract/inj144rr3dyhrpuhmx2c520g0ucv3cctzqepn0w8cu/smart/${encodedQuery}`;

        const response = await fetch(queryUrl, {
          method: "GET",
          headers: { Accept: "application/json" },
        });

        if (response.ok) {
          const data = await response.json();

          if (data.data && data.data.offers && data.data.offers.length > 0) {
            // Find the highest offer
            const highestOffer = data.data.offers.reduce((max, offer) => {
              const offerAmount = parseInt(offer.amount);
              const maxAmount = parseInt(max.amount);
              return offerAmount > maxAmount ? offer : max;
            });

            // Calculate amounts with exponent 18 for Injective (Wei to INJ)
            const highestOfferAmount = parseInt(highestOffer.amount) / 1000000000000000000;
            const highestOfferAmountUsd = injPrice && highestOfferAmount > 0 ?
              highestOfferAmount * injPrice : 0;

            return {
              hasOffer: true,
              highestOffer: {
                highestOfferType: "token",
                amount: highestOfferAmount,
                amountUsd: highestOfferAmountUsd,
                denom: "factory/inj1xtel2knkt8hmc9dnzpjz6kdmacgcfmlv5f308w/ninja",
                symbol: "bINJ",
              },
            };
          }
        }
      } catch (error) {
        console.error(`[ERROR] Failed to check offers for ${contract}:${tokenId}:`, error);
      }

      // Return default values if no offers or error
      return {
        hasOffer: false,
        highestOffer: null,
      };
    };

    // Check if we already have staked NFTs cached for these addresses
    let stakedNFTs = [];
    if (cache.has(addressesCacheKey)) {
      // console.log(
      //   `[DEBUG] Using cached staked NFTs for addresses: ${addresses.join(", ")}`,
      // );
      stakedNFTs = cache.get(addressesCacheKey);
    } else if (injectiveDAOs) {
      // console.log(
      //   `[DEBUG] Starting staked NFTs fetch for ${Object.keys(injectiveDAOs).length} Injective DAOs`,
      // );

      // Track processed staked NFTs to avoid duplicates
      const processedStakedNFTs = new Set();

      for (const [daoName, daoConfig] of Object.entries(injectiveDAOs)) {
        try {
          // console.log(
          //   `[DEBUG] Fetching staked NFTs for Injective DAO: ${daoName}`,
          // );

          // Collect staked NFTs from all Injective addresses
          let allStakedTokenIds = [];
          for (const address of addresses) {
            if (
              !address ||
              typeof address !== "string" ||
              !address.startsWith("inj")
            ) {
              console.warn(
                `[WARNING] Skipping invalid Injective address: ${address}`,
              );
              continue;
            }

            const stakedTokenIds = await fetchStakedNFTs(
              "injective-1",
              daoConfig.contract,
              address,
            );
            if (Array.isArray(stakedTokenIds)) {
              allStakedTokenIds.push(...stakedTokenIds);
            }
          }

          // Remove duplicates
          const stakedTokenIds = [...new Set(allStakedTokenIds)];
          // console.log(
          //   `[DEBUG] Staked NFTs for ${daoName}: ${stakedTokenIds.length} tokens`,
          // );

          if (stakedTokenIds.length > 0) {
            const collectionFloor = collectionFloors.get(daoConfig.collection);

            // Get token_uri pattern by querying the first staked NFT
            let tokenUriPattern = null;
            if (stakedTokenIds.length > 0) {
              try {
                const query = {
                  nft_info: {
                    token_id: stakedTokenIds[0].toString(),
                  },
                };
                const queryString = JSON.stringify(query);
                const encodedQuery = btoa(queryString);

                const contractQueryUrl = `https://lcd-injective.keplr.app/cosmwasm/wasm/v1/contract/${daoConfig.collection}/smart/${encodedQuery}`;

                const contractResponse = await fetch(contractQueryUrl, {
                  method: "GET",
                  headers: { Accept: "application/json" },
                });

                if (contractResponse.ok) {
                  const contractData = await contractResponse.json();
                  const tokenUri = contractData.data?.token_uri;

                  if (tokenUri) {
                    tokenUriPattern = tokenUri.replace(
                      stakedTokenIds[0].toString(),
                      "{tokenId}",
                    );
                  } else {
                    console.warn(`[WARNING] No token_uri found in contract response for ${daoName}`);
                  }
                } else {
                  console.warn(`[WARNING] Failed to query contract for token_uri: ${contractResponse.status}`);
                }
              } catch (error) {
                console.error(`[ERROR] Failed to get token_uri pattern for ${daoName}:`, error);
              }
            }

            // Fallback to configured metadata_url if contract query failed
            const metadataUrlToUse = tokenUriPattern || daoConfig.metadata_url;
            if (!metadataUrlToUse) {
              console.warn(`[WARNING] No metadata URL available for ${daoName}, skipping staked NFTs`);
              continue;
            }

            // Parallelize with concurrency limit
            const stakedResults = await Promise.allSettled(
              stakedTokenIds.map((tokenId) =>
                limit(async () => {
                  const nftKey = `${daoConfig.collection}-${tokenId}`;

                  if (processedStakedNFTs.has(nftKey)) return null;

                  try {
                    const nftApiData = await fetchInjectiveSingleNFT(
                      daoConfig.collection,
                      tokenId,
                      metadataUrlToUse,
                    );

                    if (!nftApiData) return null;

                    // Process image URL
                    let processedImageUrl =
                      nftApiData.image_url || nftApiData.cf_url || nftApiData.image;
                    if (processedImageUrl?.startsWith("ipfs://")) {
                      processedImageUrl = processedImageUrl.replace(
                        "ipfs://",
                        API_ENDPOINTS.IPFS_GATEWAY_PRIMARY,
                      );
                    }

                    // Calculate floor price in INJ and USD
                    const floorPriceInj = collectionFloor
                      ? parseFloat(collectionFloor.price || 0)
                      : 0;
                    const floorPriceUsd =
                      injPrice && floorPriceInj > 0 ? floorPriceInj * injPrice : 0;

                    // Traits
                    const processedTraits = (
                      nftApiData.traits || nftApiData.attributes || []
                    ).map((trait) => ({
                      name: trait.trait_type || trait.name,
                      value: trait.value,
                      rarity: undefined,
                    }));

                    const nftData = {
                      name: nftApiData.name || `${daoName.replace(" DAO", "")} #${tokenId}`,
                      tokenId: tokenId.toString(),
                      chain: "injective",
                      contract: daoConfig.collection,
                      collection:
                        nftApiData.collection?.name || daoName.replace(" DAO", ""),
                      image: processedImageUrl,
                      listed: false,
                      listPrice: null,
                      rarity: nftApiData.rank || null,
                      traits: processedTraits,
                      floor: {
                        amount: floorPriceInj,
                        amountUsd: floorPriceUsd,
                        denom:
                          "factory/inj1xtel2knkt8hmc9dnzpjz6kdmacgcfmlv5f308w/ninja",
                        symbol: "bINJ",
                      },
                      lastSalePriceSpecified: false,
                      sortUsd: floorPriceUsd,
                      daoStaked: true,
                      daoName: daoName,
                      daoAddress: daoConfig.DAO,
                      sourceAddress: addresses[0],
                      hasOffer: false, // Staked NFTs don't have offers
                      highestOffer: null,
                    };

                    processedStakedNFTs.add(nftKey);
                    return nftData;
                  } catch (error) {
                    console.error(`[ERROR] Failed to process staked NFT ${tokenId}:`, error);
                    return null;
                  }
                }),
              ),
            );

            stakedResults.forEach((res) => {
              if (res.status === "fulfilled" && res.value) {
                stakedNFTs.push(res.value);
              }
            });
          }

        } catch (error) {
          console.error(
            `[ERROR] Failed to fetch staked NFTs from ${daoName}:`,
            error,
          );
        }
      }

      // Cache the staked NFTs for this addresses combination
      cache.set(addressesCacheKey, stakedNFTs);
    }

    // console.log(`[DEBUG] Total Injective staked NFTs: ${stakedNFTs.length}`);

    // Fetch wallet NFTs using the same approach as Osmosis
    const walletNFTs = [];

    for (const address of addresses) {
      // console.log(
      //   `[DEBUG] Fetching wallet NFTs for Injective address: ${address}`,
      // );

      // Fetch not listed NFTs
      try {
        // console.log(`[DEBUG] Fetching not listed NFTs for ${address}`);

        let page = 1;
        let hasMorePages = true;
        const allNotListedNfts = [];

        while (hasMorePages) {
          const notListedUrl = `${API_ENDPOINTS.BACKBONE_LABS_API}/dapps/necropolis/nfts/address/${address}/not_listed?page=${page}&perPage=${PAGINATION_CONFIG.BACKBONE_API_PER_PAGE}&chainId=injective-1`;

          let response = null;
          let success = false;

          // Try multiple CORS proxies
          const corsProxies = CORS_PROXIES;
          for (let proxyIndex = 0; proxyIndex < corsProxies.length && !success; proxyIndex++) {
            const proxyUrl = corsProxies[proxyIndex];

            let proxiedUrl;
            if (proxyUrl.includes("codetabs.com")) {
              proxiedUrl = proxyUrl + encodeURIComponent(notListedUrl);
            } else if (proxyUrl.includes("thingproxy.freeboard.io")) {
              proxiedUrl = proxyUrl + encodeURIComponent(notListedUrl);
            } else {
              proxiedUrl = proxyUrl + notListedUrl;
            }

            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(
                () => controller.abort(),
                REQUEST_CONFIG.TIMEOUT,
              );

              response = await fetch(proxiedUrl, {
                method: "GET",
                headers: { Accept: "application/json" },
                signal: controller.signal,
              });

              clearTimeout(timeoutId);
              success = true;
            } catch (error) {
              console.log(
                `[DEBUG] Proxy ${proxyIndex + 1}/${corsProxies.length} failed for not listed NFTs:`,
                error.name === "AbortError" ? "Request timeout" : error.message,
              );
              if (proxyIndex === corsProxies.length - 1) {
                throw error; // Re-throw if all proxies failed
              }
            }
          }

          if (response.ok) {
            const notListedData = await response.json();
            // console.log(
            //   `[DEBUG] Found ${notListedData.nfts?.length || 0} not listed NFTs for ${address} on page ${page}`,
            // );

            if (notListedData.nfts && Array.isArray(notListedData.nfts)) {
              allNotListedNfts.push(...notListedData.nfts);

              // Check if we need to fetch more pages
              if (
                notListedData.nfts.length <
                PAGINATION_CONFIG.BACKBONE_API_PER_PAGE
              ) {
                hasMorePages = false;
              } else {
                page++;
              }
            } else {
              // Empty response is normal - address just doesn't have NFTs
              // console.log(
              //   `[DEBUG] No not listed NFTs found for ${address} on page ${page} - this is normal`,
              // );
              hasMorePages = false;
            }
          } else {
            // console.log(
            //   `[DEBUG] No not listed NFTs found for ${address} - this is normal`,
            // );
            hasMorePages = false;
            // Don't throw error - continue processing other chains
          }
        }

        // console.log(
        //   `[DEBUG] Total not listed NFTs found for ${address}: ${allNotListedNfts.length}`,
        // );

        if (allNotListedNfts.length > 0) {
          // Process not listed NFTs
          await Promise.all(
            allNotListedNfts.map((nft) =>
              limit(async () => {
                try {
                  // Get collection floor from pre-fetched cache or fetch if not already cached
                  let collectionFloor = collectionFloors.get(nft.collection.contract);

                  if (!collectionFloor) {
                    // console.log(
                    //   `[DEBUG] Fetching floor for uncached Injective collection: ${nft.collection.contract}`,
                    // );
                    collectionFloor = await fetchInjectiveCollectionFloor(
                      nft.collection.contract,
                    );
                    collectionFloors.set(nft.collection.contract, collectionFloor);
                  }

                  // Fetch metadata from BackboneLabs API for not listed NFTs (same as listed NFTs)
                  const metadata = await fetchListedNFTMetadata(
                    nft.collection.contract,
                    nft.nft_token_id,
                    "injective",
                  );

                  // Process image URL
                  let processedImageUrl =
                    nft.cf_url || nft.image_url || metadata?.image_url;
                  if (processedImageUrl && processedImageUrl.startsWith("ipfs://")) {
                    processedImageUrl = processedImageUrl.replace(
                      "ipfs://",
                      API_ENDPOINTS.IPFS_GATEWAY_PRIMARY,
                    );
                  }

                  // Calculate floor price
                  const floorPriceInj = collectionFloor
                    ? parseFloat(collectionFloor.price || 0)
                    : 0;
                  const floorPriceUsd =
                    injPrice && floorPriceInj > 0 ? floorPriceInj * injPrice : 0;

                  // Get collection name
                  const getCollectionName = (contractAddress) => {
                    for (const [daoName, daoConfig] of Object.entries(
                      injectiveDAOs || {},
                    )) {
                      if (daoConfig.collection === contractAddress) {
                        return daoName.replace(" DAO", "");
                      }
                    }
                    return nft.collection.name || "Unknown Collection";
                  };

                  // Process traits
                  const rawTraits = metadata?.attributes || metadata?.traits || [];
                  const processedTraits = rawTraits.map((trait) => ({
                    name: trait.trait_type || trait.name,
                    value: trait.value,
                    rarity: undefined,
                  }));

                  const nftData = {
                    name:
                      nft.nft_name || metadata?.name || `NFT #${nft.nft_token_id}`,
                    tokenId: nft.nft_token_id.toString(),
                    chain: "injective",
                    contract: nft.collection.contract,
                    collection: getCollectionName(nft.collection.contract),
                    image: processedImageUrl,
                    listed: false,
                    listPrice: null,
                    rarity: nft.rank || null,
                    traits: processedTraits,
                    floor: {
                      amount: floorPriceInj,
                      amountUsd: floorPriceUsd,
                      denom:
                        "factory/inj1xtel2knkt8hmc9dnzpjz6kdmacgcfmlv5f308w/ninja",
                      symbol: "bINJ",
                    },
                    lastSalePriceSpecified: false,
                    sortUsd: floorPriceUsd,
                    daoStaked: false,
                    sourceAddress: address,
                    hasOffer: false, // Not listed NFTs don't have offers
                    highestOffer: null,
                  };

                  walletNFTs.push(nftData);
                  // console.log(`[DEBUG] ✓ Added not listed NFT ${nft.nft_token_id}`);
                } catch (error) {
                  console.error(
                    `[ERROR] Failed to process not listed NFT ${nft.nft_token_id}:`,
                    error,
                  );
                }
              }),
            ),
          );
        }

      } catch (error) {
        console.error(
          `[ERROR] Failed to fetch not listed NFTs for ${address}:`,
          error,
        );
      }

      // Fetch listed NFTs
      try {
        // console.log(`[DEBUG] Fetching listed NFTs for ${address}`);

        let page = 1;
        let hasMorePages = true;
        const allListedNfts = [];

        while (hasMorePages) {
          const listedUrl = `${API_ENDPOINTS.BACKBONE_LABS_API}/dapps/necropolis/nfts/address/${address}/listed?page=${page}&perPage=${PAGINATION_CONFIG.BACKBONE_API_PER_PAGE}&chainId=injective-1`;

          let response = null;
          let success = false;

          // Try multiple CORS proxies
          const corsProxies = CORS_PROXIES;
          for (let proxyIndex = 0; proxyIndex < corsProxies.length && !success; proxyIndex++) {
            const proxyUrl = corsProxies[proxyIndex];

            let proxiedUrl;
            if (proxyUrl.includes("codetabs.com")) {
              proxiedUrl = proxyUrl + encodeURIComponent(listedUrl);
            } else if (proxyUrl.includes("thingproxy.freeboard.io")) {
              proxiedUrl = proxyUrl + encodeURIComponent(listedUrl);
            } else {
              proxiedUrl = proxyUrl + listedUrl;
            }

            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(
                () => controller.abort(),
                REQUEST_CONFIG.TIMEOUT,
              );

              response = await fetch(proxiedUrl, {
                method: "GET",
                headers: { Accept: "application/json" },
                signal: controller.signal,
              });

              clearTimeout(timeoutId);
              success = true;
            } catch (error) {
              console.log(
                `[DEBUG] Proxy ${proxyIndex + 1}/${corsProxies.length} failed for listed NFTs:`,
                error.name === "AbortError" ? "Request timeout" : error.message,
              );
              if (proxyIndex === corsProxies.length - 1) {
                throw error; // Re-throw if all proxies failed
              }
            }
          }

          if (response.ok) {
            const listedData = await response.json();
            // console.log(
            //   `[DEBUG] Found ${listedData.nfts?.length || 0} listed NFTs for ${address} on page ${page}`,
            // );

            if (listedData.nfts && Array.isArray(listedData.nfts)) {
              allListedNfts.push(...listedData.nfts);

              // Check if we need to fetch more pages
              if (
                listedData.nfts.length < PAGINATION_CONFIG.BACKBONE_API_PER_PAGE
              ) {
                hasMorePages = false;
              } else {
                page++;
              }
            } else {
              // Empty response is normal - address just doesn't have NFTs
              // console.log(
              //   `[DEBUG] No listed NFTs found for ${address} on page ${page} - this is normal`,
              // );
              hasMorePages = false;
            }
          } else {
            // console.log(
            //   `[DEBUG] No listed NFTs found for ${address} - this is normal`,
            // );
            hasMorePages = false;
            // Don't throw error - continue processing other chains
          }
        }

        // console.log(
        //   `[DEBUG] Total listed NFTs found for ${address}: ${allListedNfts.length}`,
        // );

        if (allListedNfts.length > 0) {
          // Process listed NFTs
          await Promise.all(
            allListedNfts.map((nft) =>
              limit(async () => {
                try {
                  const offerData = await checkNFTOffers(
                    nft.collection.contract,
                    nft.nft_token_id,
                    injPrice
                  );
                  // Get collection floor from pre-fetched cache or fetch if not already cached
                  let collectionFloor = collectionFloors.get(nft.collection.contract);

                  if (!collectionFloor) {
                    // console.log(
                    //   `[DEBUG] Fetching floor for uncached Injective collection: ${nft.collection.contract}`,
                    // );
                    collectionFloor = await fetchInjectiveCollectionFloor(
                      nft.collection.contract,
                    );
                    collectionFloors.set(nft.collection.contract, collectionFloor);
                  }

                  // Fetch metadata from BackboneLabs API for listed NFTs
                  const metadata = await fetchListedNFTMetadata(
                    nft.collection.contract,
                    nft.nft_token_id,
                    "injective",
                  );

                  // Process image URL
                  let processedImageUrl =
                    nft.cf_url || nft.image_url || metadata?.image_url;
                  if (processedImageUrl && processedImageUrl.startsWith("ipfs://")) {
                    processedImageUrl = processedImageUrl.replace(
                      "ipfs://",
                      API_ENDPOINTS.IPFS_GATEWAY_PRIMARY,
                    );
                  }

                  // Process list price from auction data
                  let listPrice = null;
                  if (nft.auction && nft.auction.reserve_price) {
                    const priceAmount =
                      parseFloat(nft.auction.reserve_price) / 1000000000000000000; // Convert from Wei to INJ
                    const priceUsd =
                      injPrice && priceAmount > 0 ? priceAmount * injPrice : 0;

                    listPrice = {
                      amount: priceAmount,
                      denom:
                        nft.auction.denom ||
                        "factory/inj1xtel2knkt8hmc9dnzpjz6kdmacgcfmlv5f308w/ninja",
                      symbol: "bINJ",
                      amountUsd: priceUsd,
                    };
                  }

                  // Calculate floor price
                  const floorPriceInj = collectionFloor
                    ? parseFloat(collectionFloor.price || 0)
                    : listPrice
                      ? listPrice.amount
                      : 0;
                  const floorPriceUsd =
                    injPrice && floorPriceInj > 0
                      ? floorPriceInj * injPrice
                      : listPrice
                        ? listPrice.amountUsd
                        : 0;

                  // Get collection name
                  const getCollectionName = (contractAddress) => {
                    for (const [daoName, daoConfig] of Object.entries(
                      injectiveDAOs || {},
                    )) {
                      if (daoConfig.collection === contractAddress) {
                        return daoName.replace(" DAO", "");
                      }
                    }
                    return nft.collection.name || "Unknown Collection";
                  };

                  // Process traits
                  const rawTraits = metadata?.attributes || metadata?.traits || [];
                  const processedTraits = rawTraits.map((trait) => ({
                    name: trait.trait_type || trait.name,
                    value: trait.value,
                    rarity: undefined,
                  }));

                  const nftData = {
                    name: nft.nft_name || metadata?.name || `NFT #${nft.nft_token_id}`,
                    tokenId: nft.nft_token_id.toString(),
                    chain: "injective",
                    contract: nft.collection.contract,
                    collection: getCollectionName(nft.collection.contract),
                    image: processedImageUrl,
                    listed: true,
                    listPrice: listPrice,
                    rarity: nft.rank || null,
                    traits: processedTraits,
                    floor: {
                      amount: floorPriceInj,
                      amountUsd: floorPriceUsd,
                      denom:
                        "factory/inj1xtel2knkt8hmc9dnzpjz6kdmacgcfmlv5f308w/ninja",
                      symbol: "bINJ",
                    },
                    lastSalePriceSpecified: false,
                    sortUsd: listPrice ? listPrice.amountUsd : floorPriceUsd,
                    daoStaked: false,
                    sourceAddress: address,
                    hasOffer: offerData.hasOffer,
                    highestOffer: offerData.highestOffer,
                  };

                  walletNFTs.push(nftData);
                  // console.log(
                  //   `[DEBUG] ✓ Added listed NFT ${nft.nft_token_id} (${listPrice?.amount || 0} INJ)`,
                  // );
                } catch (error) {
                  console.error(
                    `[ERROR] Failed to process listed NFT ${nft.nft_token_id}:`,
                    error,
                  );
                }
              }),
            ),
          );
        }

      } catch (error) {
        console.error(
          `[ERROR] Failed to fetch listed NFTs for ${address}:`,
          error,
        );
      }
    }

    // console.log(`[DEBUG] Total Injective wallet NFTs: ${walletNFTs.length}`);

    // Combine staked and wallet NFTs with deduplication
    const uniqueNFTs = new Map();

    // Add wallet NFTs first
    walletNFTs.forEach((nft) => {
      const key = `${nft.contract}-${nft.tokenId}`;
      uniqueNFTs.set(key, nft);
    });

    // Add staked NFTs - properly merge or add them
    stakedNFTs.forEach((nft) => {
      const key = `${nft.contract}-${nft.tokenId}`;
      if (uniqueNFTs.has(key)) {
        // If NFT exists in wallet, mark it as both staked
        const existingNFT = uniqueNFTs.get(key);
        uniqueNFTs.set(key, {
          ...existingNFT,
          daoStaked: true,
          daoName: nft.daoName,
          daoAddress: nft.daoAddress,
        });
      } else {
        // If NFT is only staked (not in wallet), add it as staked-only
        uniqueNFTs.set(key, nft);
      }
    });

    const finalNFTsArray = Array.from(uniqueNFTs.values());
    console.log(
      `[DEBUG] Total unique Injective NFTs after deduplication: ${finalNFTsArray.length}`,
    );

    return finalNFTsArray;
  } catch (error) {
    console.error("Error fetching Injective NFTs:", error);
    return [];
  }
};

// Fetch Injective NFTs with DAO integration (with caching)
export const fetchInjectiveNFTs = async (addresses, injPrice = 1.0) => {
  return cachedRequest(
    "fetchInjectiveNFTs",
    _fetchInjectiveNFTs,
    addresses,
    injPrice,
  );
};

// Helper function to fetch NFT metadata with multiple CORS proxy fallbacks for Injective
const fetchInjectiveNFTMetadata = async (
  tokenId,
  contract,
  tokenUri = null,
  useGateway = true,
) => {
  // console.log(`[DEBUG] Fetching metadata for NFT ${tokenId} from ${contract}`);

  // Try gateway first for non-listed/non-staked NFTs
  if (useGateway && tokenUri) {
    try {
      // console.log(`[DEBUG] Trying gateway for ${tokenId}`);
      const gatewayUrl = tokenUri.replace(
        "ipfs://",
        API_ENDPOINTS.IPFS_GATEWAY_PRIMARY,
      );

      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        REQUEST_CONFIG.TIMEOUT,
      );

      const response = await fetch(gatewayUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const metadata = await response.json();
        // console.log(`[DEBUG] ✓ Gateway success for ${tokenId}`);
        return metadata;
      } else {
        console.log(
          `[DEBUG] Gateway failed for ${tokenId}: ${response.status}`,
        );
      }
    } catch (error) {
      console.log(
        `[DEBUG] Gateway error for ${tokenId}:`,
        error.name === "AbortError" ? "Request timeout" : error.message,
      );
    }
  }

  // Try multiple CORS proxies as fallback
  if (tokenUri) {
    for (let i = 0; i < CORS_PROXIES.length; i++) {
      const proxyUrl = CORS_PROXIES[i];
      try {
        // console.log(
        //   `[DEBUG] Trying CORS proxy ${i + 1}/${CORS_PROXIES.length} for ${tokenId}: ${proxyUrl}`,
        // );

        let proxiedUrl;
        if (proxyUrl.includes("codetabs.com")) {
          proxiedUrl = proxyUrl + encodeURIComponent(tokenUri);
        } else if (proxyUrl.includes("thingproxy.freeboard.io")) {
          proxiedUrl = proxyUrl + encodeURIComponent(tokenUri);
        } else {
          proxiedUrl = proxyUrl + tokenUri;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          REQUEST_CONFIG.TIMEOUT,
        );

        const response = await fetch(proxiedUrl, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const metadata = await response.json();
          // console.log(`[DEBUG] ✓ CORS proxy ${i + 1} success for ${tokenId}`);
          return metadata;
        } else {
          console.log(
            `[DEBUG] CORS proxy ${i + 1} failed for ${tokenId}: ${response.status}`,
          );
        }
      } catch (error) {
        console.log(
          `[DEBUG] CORS proxy ${i + 1} error for ${tokenId}:`,
          error.name === "AbortError" ? "Request timeout" : error.message,
        );
      }
    }
  }

  console.warn(`[WARNING] All metadata fetch methods failed for ${tokenId}`);
  return null;
};

// Fetch single NFT data from Injective using collection-specific metadata URLs (Original function)
const _fetchInjectiveSingleNFT = async (
  collection,
  tokenId,
  metadataUrl = null,
) => {
  try {
    // console.log(
    //   `[DEBUG] Fetching Injective NFT metadata: ${collection}/${tokenId}`,
    // );

    if (!metadataUrl) {
      console.warn(`[WARNING] No metadata URL provided for ${tokenId}`);
      return null;
    }

    // Use provided metadata URL (from DAO config)
    let url = metadataUrl
      .replace("{tokenId}", tokenId)
      .replace("{collection}", collection);

    // Convert IPFS URLs to HTTP gateway URLs for better accessibility
    if (url.startsWith("ipfs://")) {
      url = url.replace("ipfs://", API_ENDPOINTS.IPFS_GATEWAY_PRIMARY);
    }

    // console.log(`[DEBUG] Using metadata URL: ${url}`);

    let nftMetadata = null;

    let retries = 0;
    const maxRetries = REQUEST_CONFIG.MAX_RETRIES;

    while (retries <= maxRetries) {
      try {
        // Try multiple CORS proxies
        const corsProxies = CORS_PROXIES;

        let proxiedUrl;
        const proxyUrl = corsProxies[retries % corsProxies.length];

        if (proxyUrl.includes("codetabs.com")) {
          proxiedUrl = proxyUrl + encodeURIComponent(url);
        } else if (proxyUrl.includes("thingproxy.freeboard.io")) {
          proxiedUrl = proxyUrl + encodeURIComponent(url);
        } else {
          proxiedUrl = proxyUrl + url;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          REQUEST_CONFIG.TIMEOUT,
        );

        const response = await fetch(proxiedUrl, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          nftMetadata = await response.json();
          // console.log(
          //   `[DEBUG] Fetched metadata from API for ${tokenId}:`,
          //   nftMetadata,
          // );
          break; // Success, exit retry loop
        } else if (
          response.status === 408 ||
          response.status === 429 ||
          response.status >= 500
        ) {
          // Timeout, rate limited or server error, retry with longer delay
          retries++;
          if (retries <= maxRetries) {
            const retryDelay = Math.min(
              REQUEST_CONFIG.RETRY_DELAY_BASE * Math.pow(2, retries - 1),
              REQUEST_CONFIG.MAX_RETRY_DELAY,
            );
            console.log(
              `[DEBUG] API error ${response.status} (${response.status === 408 ? "Timeout" : "Server Error"}), retrying in ${retryDelay}ms (attempt ${retries}/${maxRetries})`,
            );
            await delay(retryDelay);
            continue;
          }
        }

        console.warn(
          `[WARNING] Failed to fetch metadata from API: ${response.status} ${response.statusText}`,
        );
        return null;
      } catch (error) {
        retries++;
        if (retries <= maxRetries) {
          const retryDelay = Math.min(
            REQUEST_CONFIG.RETRY_DELAY_BASE * Math.pow(2, retries - 1),
            REQUEST_CONFIG.MAX_RETRY_DELAY,
          );
          console.log(
            `[DEBUG] Network error, retrying in ${retryDelay}ms (attempt ${retries}/${maxRetries}):`,
            error.name === "AbortError" ? "Request timeout" : error.message,
          );
          await delay(retryDelay);
          continue;
        }

        console.error(
          `[ERROR] Error fetching metadata from API after ${maxRetries} retries:`,
          error,
        );
        return null;
      }
    }

    if (!nftMetadata) {
      console.warn(`[WARNING] No metadata found for ${tokenId}`);
      return null;
    }

    // console.log(`[DEBUG] Processing metadata for ${tokenId}:`, nftMetadata);

    // Process image URL with better handling for different formats
    let imageUrl =
      nftMetadata.image || nftMetadata.image_url || nftMetadata.cf_url;
    if (imageUrl && imageUrl.startsWith("ipfs://")) {
      imageUrl = imageUrl.replace(
        "ipfs://",
        API_ENDPOINTS.IPFS_GATEWAY_PRIMARY,
      );
    }

    // Process traits with proper structure
    const rawTraits = Array.isArray(nftMetadata.attributes)
      ? nftMetadata.attributes
      : Array.isArray(nftMetadata.traits)
        ? nftMetadata.traits
        : [];

    const processedTraits = rawTraits.map((trait) => ({
      trait_type: trait.trait_type || trait.name,
      value: trait.value,
      name: trait.trait_type || trait.name,
    }));

    // Transform to our standard format with proper type checking
    const transformedData = {
      name:
        (typeof nftMetadata.name === "string" ? nftMetadata.name : null) ||
        `Token #${tokenId}`,
      tokenId: String(tokenId),
      image_url: typeof imageUrl === "string" ? imageUrl : null,
      cf_url: typeof imageUrl === "string" ? imageUrl : null, // Use same image for cf_url
      traits: processedTraits,
      attributes: processedTraits, // Also provide as attributes for compatibility
      rank: typeof nftMetadata.rank === "number" ? nftMetadata.rank : null,
      rarity:
        typeof nftMetadata.rarityScore === "number"
          ? nftMetadata.rarityScore
          : null,
      description:
        (typeof nftMetadata.description === "string"
          ? nftMetadata.description
          : null) || "",
      collection: {
        name: getCollectionNameFromContract(collection),
      },
    };

    // console.log(
    //   `[DEBUG] Transformed Injective NFT data for ${tokenId}:`,
    //   transformedData,
    // );
    return transformedData;
  } catch (error) {
    console.error(`Error fetching Injective NFT ${collection}/${tokenId}:`, {
      error: error.message,
      name: error.name,
      stack: error.stack,
    });

    return null;
  }
};

// Fetch single NFT data from Injective using collection-specific metadata URLs (with caching)
export const fetchInjectiveSingleNFT = async (
  collection,
  tokenId,
  metadataUrl = null,
) => {
  return cachedRequest(
    "fetchInjectiveSingleNFT",
    _fetchInjectiveSingleNFT,
    collection,
    tokenId,
    metadataUrl,
  );
};

// Fetch collection floor price for Injective (Original function)
const _fetchInjectiveCollectionFloor = async (collection) => {
  try {
    const url = `${API_ENDPOINTS.BACKBONE_LABS_API}/dapps/necropolis/collections/${collection}`;
    // console.log(`[DEBUG] Fetching Injective collection floor from: ${url}`);

    let retries = 0;
    const maxRetries = REQUEST_CONFIG.MAX_RETRIES;

    while (retries <= maxRetries) {
      try {
        // Try multiple CORS proxies
        const corsProxies = CORS_PROXIES;

        let proxiedUrl;
        const proxyUrl = corsProxies[retries % corsProxies.length];

        if (proxyUrl.includes("codetabs.com")) {
          proxiedUrl = proxyUrl + encodeURIComponent(url);
        } else if (proxyUrl.includes("thingproxy.freeboard.io")) {
          proxiedUrl = proxyUrl + encodeURIComponent(url);
        } else {
          proxiedUrl = proxyUrl + url;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          REQUEST_CONFIG.TIMEOUT,
        );

        const response = await fetch(proxiedUrl, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          // console.log(
          //   `[DEBUG] Injective collection floor data for ${collection}:`,
          //   data,
          // );

          // Handle different response formats
          let floorPrice = 0;

          // Check if data is a direct number (price in INJ)
          if (typeof data === "number") {
            floorPrice = data;
          } else if (data?.floor) {
            // Handle object with floor property
            floorPrice = data.floor.price || data.floor.amount || data.floor;
          } else if (data?.floorPrice) {
            // Handle object with floorPrice property
            floorPrice =
              data.floorPrice.price ||
              data.floorPrice.amount ||
              data.floorPrice;
          }

          // console.log(
          //   `[DEBUG] Extracted floor price for ${collection}: ${floorPrice} INJ`,
          // );

          if (floorPrice > 0) {
            return {
              price: floorPrice, // Floor price is in bINJ
              usd_price: 0, // USD calculation will be done later with bINJ price
              denom:
                "factory/inj1xtel2knkt8hmc9dnzpjz6kdmacgcfmlv5f308w/ninja",
              symbol: "bINJ",
            };
          }

          console.log(`[DEBUG] No valid floor price found for ${collection}`);

          // Return null to indicate no floor data available
          return null;
        } else if (
          response.status === 408 ||
          response.status === 429 ||
          response.status >= 500
        ) {
          retries++;
          if (retries <= maxRetries) {
            const retryDelay = Math.min(
              REQUEST_CONFIG.RETRY_DELAY_BASE * Math.pow(2, retries - 1),
              REQUEST_CONFIG.MAX_RETRY_DELAY,
            );
            console.log(
              `[DEBUG] Collection floor API error ${response.status}, retrying in ${retryDelay}ms (attempt ${retries}/${maxRetries})`,
            );
            await delay(retryDelay);
            continue;
          }
        }

        console.warn(
          `Failed to fetch Injective collection ${collection}: ${response.status} ${response.statusText}`,
        );
        return null;
      } catch (error) {
        retries++;
        if (retries <= maxRetries) {
          const retryDelay = Math.min(
            REQUEST_CONFIG.RETRY_DELAY_BASE * Math.pow(2, retries - 1),
            REQUEST_CONFIG.MAX_RETRY_DELAY,
          );
          console.log(
            `[DEBUG] Collection floor network error, retrying in ${retryDelay}ms (attempt ${retries}/${maxRetries}):`,
            error.name === "AbortError" ? "Request timeout" : error.message,
          );
          await delay(retryDelay);
          continue;
        }

        throw error; // Re-throw after max retries
      }
    }

    return null;
  } catch (error) {
    console.error(`Error fetching Injective collection ${collection}:`, {
      error: error.message,
      name: error.name,
      stack: error.stack,
      url: `${API_ENDPOINTS.BACKBONE_LABS_API}/dapps/necropolis/collections/${collection}`,
    });

    if (error.name === "TypeError" && error.message.includes("fetch")) {
      console.error(
        `[ERROR] Network/CORS error for Injective collection ${collection}`,
      );
    }

    // Return null to indicate no floor data available
    return null;
  }
};

// Fetch Injective collection floor price (with caching)
export const fetchInjectiveCollectionFloor = async (collection) => {
  return cachedRequest(
    "fetchInjectiveCollectionFloor",
    _fetchInjectiveCollectionFloor,
    collection,
  );
};

// Fetch Cosmos Hub NFTs with DAO integration (Original function)
const _fetchCosmosHubNFTs = async (addresses) => {
  console.log(`[DEBUG] Fetching Cosmos Hub NFTs for addresses:`, addresses);

  try {
    // Load collections from the JSON file
    let collectionsConfig;
    try {
      const response = await fetch("/interchainCollectionsContracts.json");
      collectionsConfig = await response.json();
    } catch (error) {
      console.error(
        `[ERROR] Failed to load Cosmos Hub collections config:`,
        error,
      );
      return [];
    }

    // First, fetch staked NFTs from all Cosmos Hub DAOs
    const stakedNFTs = [];
    const cosmosHubDAOs = daosConfig.DAOs["cosmoshub-4"];

    // console.log(`[DEBUG] === STARTING STAKED NFT FETCH ===`);
    if (cosmosHubDAOs) {
      // console.log(
      //   `[DEBUG] Starting staked NFTs fetch for ${Object.keys(cosmosHubDAOs).length} Cosmos Hub DAOs`,
      // );

      for (const [daoName, daoConfig] of Object.entries(cosmosHubDAOs)) {
        try {
          // console.log(
          //   `[DEBUG] Fetching staked NFTs for DAO: ${daoName}, contract: ${daoConfig.contract}`,
          // );

          let allStakedTokenIds = [];
          for (const address of addresses) {
            // console.log(
            //   `[DEBUG] Fetching staked NFTs for Cosmos Hub address: ${address}`,
            // );
            const stakedTokenIds = await fetchStakedNFTs(
              "cosmoshub-4",
              daoConfig.contract,
              address,
            );
            if (Array.isArray(stakedTokenIds)) {
              allStakedTokenIds.push(...stakedTokenIds);
            }
          }

          // Remove duplicates
          const stakedTokenIds = [...new Set(allStakedTokenIds)];
          // console.log(
          //   `[DEBUG] Raw staked response for ${daoName}:`,
          //   stakedTokenIds,
          // );

          // Fetch detailed NFT data for each staked token ID
          if (Array.isArray(stakedTokenIds) && stakedTokenIds.length > 0) {
            // console.log(
            //   `[DEBUG] === PROCESSING ${stakedTokenIds.length} STAKED NFTs FOR ${daoName} ===`,
            // );

            const stakedNftPromises = stakedTokenIds.map((tokenId) =>
              limit(async () => {
                try {
                  const nftData = await fetchCosmosHubSingleNFT(
                    daoConfig.collection,
                    tokenId.toString()
                  );

                  if (!nftData) return null;

                  // Determine collection name
                  const collectionEntry = Object.entries(collectionsConfig.Collections || {}).find(
                    ([name, contracts]) =>
                      (typeof contracts === "string" && contracts === daoConfig.collection) ||
                      (typeof contracts === "object" && contracts["cosmoshub-4"] === daoConfig.collection)
                  );

                  const collectionName = collectionEntry?.[0] || daoName.replace(" DAO", "");
                  const collectionData = collectionEntry?.[1];

                  // Defaults
                  let floorPrice = {
                    amount: 0,
                    amountUsd: 0,
                    denom: "uatom",
                    symbol: "ATOM",
                  };
                  let highestOffer = null;

                  // Fetch Stargaze floor + offer if available
                  if (typeof collectionData === "object" && collectionData["stargaze-1"]) {
                    try {
                      const stargazeData = await fetchStargazeCollectionFloorAndOffer(
                        collectionData["stargaze-1"]
                      );

                      if (stargazeData) {
                        // Floor
                        const stargazeFloor = stargazeData.floor;
                        if (stargazeFloor && stargazeFloor.amount) {
                          const exp = stargazeFloor.exponent ?? 6;
                          floorPrice = {
                            amount: parseFloat(stargazeFloor.amount) / Math.pow(10, exp),
                            amountUsd: parseFloat(stargazeFloor.amountUsd) || 0,
                            denom: stargazeFloor.denom,
                            symbol: stargazeFloor.symbol,
                            isStargaze: true,
                          };
                        }

                        // Highest Offer
                        const stargazeOffer = stargazeData.highestOffer?.offerPrice;
                        if (stargazeOffer && stargazeOffer.amount) {
                          const exp = stargazeOffer.exponent ?? 6;
                          highestOffer = {
                            amount: parseFloat(stargazeOffer.amount) / Math.pow(10, exp),
                            amountUsd: parseFloat(stargazeOffer.amountUsd) || 0,
                            denom: stargazeOffer.denom,
                            symbol: stargazeOffer.symbol,
                            isStargaze: true,
                          };
                        }
                      }
                    } catch (error) {
                      console.error(
                        `[ERROR] Failed to fetch Stargaze floor/offer for staked ${collectionName}:`,
                        error
                      );
                    }
                  }

                  // Normalize image
                  let imageUrl = nftData.image;
                  if (imageUrl && imageUrl.includes("ipfs.io/ipfs/")) {
                    const ipfsPath = imageUrl.split("/ipfs/")[1];
                    imageUrl = `https://gateway.pinata.cloud/ipfs/${ipfsPath}`;
                  }

                  // Return enriched NFT object
                  return {
                    name: nftData.name,
                    tokenId: nftData.tokenId,
                    chain: "cosmoshub",
                    contract: daoConfig.collection,
                    collection: collectionName,
                    image: imageUrl,
                    listed: false,
                    listPrice: null,
                    rarity: null,
                    traits: nftData.traits || [],
                    floor: floorPrice,
                    highestOffer,
                    offerFromStargaze: true,
                    sortUsd: floorPrice.amountUsd,
                    daoStaked: true,
                    daoName: daoName,
                    daoAddress: daoConfig.DAO,
                    sourceAddress: addresses[0],
                  };
                } catch (error) {
                  console.error(
                    `[ERROR] ✗ Failed to fetch staked NFT ${tokenId} from ${daoName}:`,
                    error
                  );
                  return null;
                }
              })
            );


            // Wait for all limited parallel fetches
            const stakedNFTResults = await Promise.allSettled(stakedNftPromises);

            // Push fulfilled results into stakedNFTs
            stakedNFTResults.forEach((res) => {
              if (res.status === "fulfilled" && res.value) {
                stakedNFTs.push(res.value);
              }
            });
          } else {
            // console.log(`[DEBUG] No staked NFTs found for ${daoName}`);
          }
        } catch (error) {
          console.error(
            `[ERROR] Failed to fetch staked NFTs from ${daoName}:`,
            error,
          );
        }
      }
    }

    // console.log(`[DEBUG] === STAKED NFT FETCH COMPLETE ===`);
    // console.log(`[DEBUG] Total staked NFTs collected: ${stakedNFTs.length}`);

    // Fetch regular NFTs from Cosmos Hub
    const regularNFTs = [];

    for (const address of addresses) {
      // console.log(`[DEBUG] Fetching Cosmos Hub NFTs for address: ${address}`);

      // Query each collection for tokens owned by this address
      for (const [collectionName, collectionData] of Object.entries(
        collectionsConfig.Collections || {},
      )) {
        try {
          // Get the cosmoshub-4 contract address
          let contractAddress;
          if (typeof collectionData === "string") {
            contractAddress = collectionData;
          } else if (
            typeof collectionData === "object" &&
            collectionData["cosmoshub-4"]
          ) {
            contractAddress = collectionData["cosmoshub-4"];
          } else {
            // console.log(
            //   `[DEBUG] No cosmoshub-4 contract address found for ${collectionName}`,
            // );
            continue;
          }

          // console.log(
          //   `[DEBUG] Querying collection ${collectionName} (${contractAddress}) for address ${address}`,
          // );

          const query = { tokens: { owner: address } };
          const encodedQuery = btoa(JSON.stringify(query));

          // Use only Keplr LCD endpoint
          const url = `${API_ENDPOINTS.COSMOS_HUB_LCD}/cosmwasm/wasm/v1/contract/${contractAddress}/smart/${encodedQuery}`;

          let tokensData = null;
          let retries = 0;
          const maxRetries = REQUEST_CONFIG.MAX_RETRIES;

          while (retries <= maxRetries) {
            try {
              // console.log(`[DEBUG] Querying tokens from: ${url}`);

              const response = await fetch(url, {
                method: "GET",
                headers: {
                  Accept: "application/json",
                },
              });

              if (response.ok) {
                const data = await response.json();
                // console.log(
                //   `[DEBUG] Tokens response for ${collectionName}:`,
                //   data,
                // );

                // Handle response format
                tokensData = data.data || data;
                break; // Success, exit retry loop
              } else if (
                response.status === 408 ||
                response.status === 429 ||
                response.status >= 500
              ) {
                retries++;
                if (retries <= maxRetries) {
                  const retryDelay = Math.min(
                    REQUEST_CONFIG.RETRY_DELAY_BASE * Math.pow(2, retries - 1),
                    REQUEST_CONFIG.MAX_RETRY_DELAY,
                  );
                  console.log(
                    `[DEBUG] API error ${response.status}, retrying in ${retryDelay}ms (attempt ${retries}/${maxRetries})`,
                  );
                  await delay(retryDelay);
                  continue;
                }
              }

              console.warn(
                `[WARNING] Failed to fetch tokens from ${url}: ${response.status} ${response.statusText}`,
              );
              break;
            } catch (error) {
              retries++;
              if (retries <= maxRetries) {
                const retryDelay = Math.min(
                  REQUEST_CONFIG.RETRY_DELAY_BASE * Math.pow(2, retries - 1),
                  REQUEST_CONFIG.MAX_RETRY_DELAY,
                );
                console.log(
                  `[DEBUG] Network error, retrying in ${retryDelay}ms (attempt ${retries}/${maxRetries}):`,
                  error.name === "AbortError"
                    ? "Request timeout"
                    : error.message,
                );
                await delay(retryDelay);
                continue;
              }
              console.error(
                `[ERROR] Error fetching tokens from ${url}:`,
                error,
              );
              break;
            }
          }

          if (
            tokensData &&
            tokensData.tokens &&
            Array.isArray(tokensData.tokens)
          ) {
            // console.log(
            //   `[DEBUG] Found ${tokensData.tokens.length} tokens in ${collectionName} for ${address}`,
            // );

            // Get floor price from Stargaze if available
            let floorPrice = {
              amount: 0,
              amountUsd: 0,
              denom: "uatom",
              symbol: "ATOM",
            };
            let highestOffer = null;              // <-- declare per-collection iteration
            let offerFromStargaze = false;

            if (typeof collectionData === "object" && collectionData["stargaze-1"]) {
              try {
                const stargazeData = await fetchStargazeCollectionFloorAndOffer(
                  collectionData["stargaze-1"]
                );

                if (stargazeData) {
                  // Floor
                  const stargazeFloor = stargazeData.floor;
                  if (stargazeFloor && stargazeFloor.amount) {
                    const exp = stargazeFloor.exponent ?? 6;
                    floorPrice = {
                      amount: parseFloat(stargazeFloor.amount) / Math.pow(10, exp),
                      amountUsd: parseFloat(stargazeFloor.amountUsd) || 0,
                      denom: stargazeFloor.denom,
                      symbol: stargazeFloor.symbol,
                      isStargaze: true,
                    };
                  }

                  // Highest Offer
                  const stargazeOffer = stargazeData.highestOffer?.offerPrice;
                  if (stargazeOffer && stargazeOffer.amount) {
                    const exp = stargazeOffer.exponent ?? 6;
                    highestOffer = {
                      amount: parseFloat(stargazeOffer.amount) / Math.pow(10, exp),
                      amountUsd: parseFloat(stargazeOffer.amountUsd) || 0,
                      denom: stargazeOffer.denom,
                      symbol: stargazeOffer.symbol,
                      isStargaze: true,
                    };
                    offerFromStargaze = true;
                  }
                }
              } catch (error) {
                console.error(
                  `[ERROR] Failed to fetch Stargaze floor/offer for staked ${collectionName}:`,
                  error
                );
              }
            }

            // Fetch detailed NFT data for each token
            const results = await Promise.allSettled(
              tokensData.tokens.map((tokenId) =>
                limit(async () => {
                  try {
                    const nftData = await fetchCosmosHubSingleNFT(contractAddress, tokenId);

                    if (!nftData) return null;

                    return {
                      name: nftData.name,
                      tokenId: nftData.tokenId,
                      chain: "cosmoshub",
                      contract: contractAddress,
                      collection: collectionName,
                      image: nftData.image,
                      listed: false, // No marketplace on Cosmos Hub
                      listPrice: null,
                      rarity: null,
                      traits: nftData.traits || [],
                      floor: floorPrice,
                      highestOffer,
                      offerFromStargaze: true,
                      sortUsd: floorPrice.amountUsd,
                      daoStaked: false,
                      sourceAddress: address,
                    };
                  } catch (error) {
                    console.error(`[ERROR] Failed to fetch NFT data for ${tokenId}:`, error);
                    return null;
                  }
                })
              )
            );

            // Push successful results
            results.forEach((res) => {
              if (res.status === "fulfilled" && res.value) {
                regularNFTs.push(res.value);
                // console.log(`[DEBUG] ✓ Added NFT ${res.value.tokenId} from ${collectionName}`);
              }
            });

          } else {
            // console.log(
            //   `[DEBUG] No tokens found in ${collectionName} for ${address}`,
            // );
          }
        } catch (error) {
          console.error(
            `[ERROR] Failed to query collection ${collectionName}:`,
            error,
          );
        }
      }
    }

    // Combine staked and regular NFTs with deduplication
    const uniqueNFTs = new Map();

    // Add regular NFTs first
    regularNFTs.forEach((nft) => {
      const key = `${nft.contract}-${nft.tokenId}`;
      uniqueNFTs.set(key, nft);
    });

    // Add staked NFTs - properly merge or add them
    stakedNFTs.forEach((nft) => {
      const key = `${nft.contract}-${nft.tokenId}`;
      if (uniqueNFTs.has(key)) {
        // If NFT exists in wallet, mark it as both staked
        const existingNFT = uniqueNFTs.get(key);
        uniqueNFTs.set(key, {
          ...existingNFT,
          daoStaked: true,
          daoName: nft.daoName,
          daoAddress: nft.daoAddress,
        });
      } else {
        // If NFT is only staked (not in wallet), add it as staked-only
        uniqueNFTs.set(key, nft);
      }
    });

    const finalNFTsArray = Array.from(uniqueNFTs.values());
    console.log(
      `[DEBUG] Total unique Cosmos Hub NFTs after deduplication: ${finalNFTsArray.length}`,
    );

    return finalNFTsArray;
  } catch (error) {
    console.error("Error fetching Cosmos Hub NFTs:", error);
    return [];
  }
};

// Fetch Cosmos Hub NFTs with DAO integration (with caching)
export const fetchCosmosHubNFTs = async (addresses) => {
  return cachedRequest("fetchCosmosHubNFTs", _fetchCosmosHubNFTs, addresses);
};

// Get bOSMO price (placeholder - you'll need to implement this with a price API)
export const getBOSMOPrice = async () => {
  try {
    // This is a placeholder - you'll need to implement actual price fetching
    // For now, returning a default value
    return 1.0; // USD per bOSMO
  } catch (error) {
    console.error("Error fetching bOSMO price:", error);
    return 1.0;
  }
};

// Get bINJ price (placeholder - you'll need to implement this with a price API)
export const getBINJPrice = async () => {
  try {
    // This is a placeholder - you'll need to implement actual price fetching
    // For now, returning a default value
    // Example: Fetching from a hypothetical price API
    // const response = await fetch('https://api.example.com/price/binj');
    // const data = await response.json();
    // return data.price;
    return 16.62; // Example USD per bINJ (updated to reflect current market price)
  } catch (error) {
    console.error("Error fetching bINJ price:", error);
    return 16.62; // Default to example price if fetching fails
  }
};