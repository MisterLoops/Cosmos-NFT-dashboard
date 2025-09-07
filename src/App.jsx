import React, { useState, useEffect, useRef } from "react";
import { fromBech32, toBech32 } from "@cosmjs/encoding";
import "./App.css";
import WalletConnect from "./components/WalletConnect";
import NFTDashboard from "./components/NFTDashboard";
import ChainBasedPortfolio from "./components/ChainBasedPortfolio";
import DesktopChainPortfolio from "./components/DesktopChainPortfolio";
import SkipWidget from "./components/SkipWidget";
import { Trash2, Copy, Check, Heart, X } from "lucide-react";
import {
  CHAIN_CONFIGS,
  CHAIN_ENDPOINTS,
  CORS_PROXIES,
  API_ENDPOINTS,
  IBC_TOKEN_MAPPINGS,
  MARKETPLACES,
  DONATION_ADDRESSES
} from "./utils/constants.js";
import { clearCache } from "./utils/fetchFunctions";


export default function App() {
  const [wallet, setWallet] = useState(null);
  const [addresses, setAddresses] = useState({});
  const [addressesForSkip, setAddressesForSkip] = useState({});
  const [signers, setSigners] = useState(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [error, setError] = useState("");
  const [showTokens, setShowTokens] = useState(false);
  const [tokenBalancesClosing, setTokenBalancesClosing] = useState(false);
  const [tokenBalances, setTokenBalances] = useState({});
  const [chainBalances, setChainBalances] = useState({});
  const [showDollarBalances, setShowDollarBalances] = useState(true);
  const [assetPrices, setAssetPrices] = useState({});
  const [nftOffers, setNftOffers] = useState({});
  const [offersLoading, setOffersLoading] = useState(false);
  const [hasLoadedBalances, setHasLoadedBalances] = useState(false);
  const [hasLoadedNFTs, setHasLoadedNFTs] = useState(false);
  const [showWalletDropdown, setShowWalletDropdown] = useState(false);
  const [walletDropdownClosing, setWalletDropdownClosing] = useState(false);
  const [showManualAddressForm, setShowManualAddressForm] = useState(false);
  const [manualAddress, setManualAddress] = useState("");
  const [selectedChain, setSelectedChain] = useState("stargaze");
  const [manualAddresses, setManualAddresses] = useState({});
  const [addressLoading, setAddressLoading] = useState({});
  // Token prices for wallet display
  const [bosmoPrice, setBosmoPrice] = useState(0.2);
  const [initPrice, setInitPrice] = useState(0.43);
  const [binjPrice, setBinjPrice] = useState(1.0);
  const [tokenPrices, setTokenPrices] = useState({});
  const [omGendrop, setOmGendrop] = useState({ amount: 0, usdValue: 0 });
  const [confirmingRemoval, setConfirmingRemoval] = useState(null);
  const [isFetchingNFTs, setIsFetchingNFTs] = useState(false);
  const [hasCompletedInitialLoad, setHasCompletedInitialLoad] = useState(false);
  const [nftDashboardKey, setNftDashboardKey] = useState(0);
  const [copiedAddress, setCopiedAddress] = useState(null);
  const [scrollState, setScrollState] = useState({
    canScrollUp: false,
    canScrollDown: false,
    isScrollable: false,
  });
  const [showDonation, setShowDonation] = useState(false);
  const [showSkipWidget, setShowSkipWidget] = useState(false);
  const [skipDefaultRoute, setSkipDefaultRoute] = useState(undefined);
  const [copiedChain, setCopiedChain] = useState(null);

  // Refs to track if prices have been fetched to prevent duplicates
  const bosmoFetchedRef = useRef(false);
  const initFetchedRef = useRef(false);
  const binjFetchedRef = useRef(false); // Ref for bINJ price
  const bosmoFetchingRef = useRef(false);
  const initFetchingRef = useRef(false);
  const binjFetchingRef = useRef(false); // Ref for bINJ price
  const allAssetsFetchedRef = useRef(false);

  const resetAllStates = () => {
    setWallet(null);
    setAddresses({});
    setAddressesForSkip({});
    setSigners(null);
    setHasAccess(false);
    setError("");
    setShowTokens(false);
    setTokenBalancesClosing(false);
    setTokenBalances({});
    setChainBalances({});
    setShowDollarBalances(true);
    setNftOffers({});
    setOffersLoading(false);
    setHasLoadedBalances(false);
    setHasLoadedNFTs(false);
    setShowWalletDropdown(false);
    setWalletDropdownClosing(false);
    setShowManualAddressForm(false);
    setManualAddress("");
    setManualAddresses({});
    setAddressLoading({});
    setConfirmingRemoval(null);
    setIsFetchingNFTs(false);
    setHasCompletedInitialLoad(false);
    setCopiedAddress(null);
    setScrollState({ canScrollUp: false, canScrollDown: false, isScrollable: false });
    setShowDonation(false);
    setShowSkipWidget(false);
    setSkipDefaultRoute(undefined);
    setCopiedChain(null);
    setNftDashboardKey((k) => {
      return k + 1;
    });
    clearCache();
  };
  // Fetch bOSMO price on app load
  useEffect(() => {
    if (bosmoFetchedRef.current || bosmoFetchingRef.current) return;

    const fetchBosmoPrice = async () => {
      bosmoFetchingRef.current = true;
      bosmoFetchedRef.current = true;

      try {
        // console.log("[DEBUG] Fetching bOSMO price...");
        const bosmoApiUrl = API_ENDPOINTS.BOSMO_API;

        let proxiedUrl;
        const proxyUrl = CORS_PROXIES[0]; // Start with first proxy

        if (proxyUrl.includes("codetabs.com")) {
          proxiedUrl = proxyUrl + encodeURIComponent(bosmoApiUrl);
        } else if (proxyUrl.includes("thingproxy.freeboard.io")) {
          proxiedUrl = proxyUrl + encodeURIComponent(bosmoApiUrl);
        } else {
          proxiedUrl = proxyUrl + bosmoApiUrl;
        }

        const response = await fetch(proxiedUrl, {
          method: "GET",
          headers: { Accept: "application/json" },
        });

        if (response.ok) {
          const data = await response.json();
          const extractedPrice = data?.data?.price || data?.price || 1.0;
          // console.log("[DEBUG] bOSMO price extracted:", extractedPrice);
          setBosmoPrice(extractedPrice);
        } else {
          console.warn(
            "[WARNING] Failed to fetch bOSMO price:",
            response.status,
          );
          setBosmoPrice(0.2);
        }
      } catch (error) {
        console.error("[ERROR] Error fetching bOSMO price:", error);
        setBosmoPrice(0.2);
      } finally {
        bosmoFetchingRef.current = false;
      }
    };

    fetchBosmoPrice();
  }, []);

  // Fetch INIT price on app load
  useEffect(() => {
    if (initFetchedRef.current || initFetchingRef.current) return;

    const fetchInitPrice = async () => {
      initFetchingRef.current = true;
      initFetchedRef.current = true;

      try {
        // console.log("[DEBUG] Fetching INIT price...");

        // Try first API
        try {
          const response = await fetch(API_ENDPOINTS.LLAMA_FI_INITIA);
          if (response.ok) {
            const data = await response.json();
            const extractedPrice = data?.coins?.["coingecko:initia"]?.price;
            if (extractedPrice && extractedPrice > 0) {
              // console.log("[DEBUG] INIT price from llama.fi:", extractedPrice);
              setInitPrice(extractedPrice);
              return;
            }
          }
        } catch (error) {
          // console.log("[DEBUG] First INIT API failed, trying second...");
        }

        // Try second API if first fails
        try {
          const response = await fetch(API_ENDPOINTS.COINGECKO_INITIA);
          if (response.ok) {
            const data = await response.json();
            const extractedPrice = data?.initia?.usd;
            if (extractedPrice && extractedPrice > 0) {
              // console.log("[DEBUG] INIT price from coingecko:", extractedPrice);
              setInitPrice(extractedPrice);
              return;
            }
          }
        } catch (error) {
          console.error("[ERROR] Second INIT API also failed:", error);
        }

        console.warn("[WARNING] Failed to fetch INIT price from both APIs");
        setInitPrice(0.43); // Fallback price
      } catch (error) {
        console.error("[ERROR] Error fetching INIT price:", error);
        setInitPrice(0.43);
      } finally {
        initFetchingRef.current = false;
      }
    };

    fetchInitPrice();
  }, []);

  // Fetch bINJ price on app load
  useEffect(() => {
    if (binjFetchedRef.current || binjFetchingRef.current) return;

    const fetchBinjPrice = async () => {
      binjFetchingRef.current = true;
      binjFetchedRef.current = true;

      try {
        // console.log("[DEBUG] Fetching bINJ price...");
        const binjApiUrl = API_ENDPOINTS.BINJ_API; // Assuming you have this defined

        let proxiedUrl;
        const proxyUrl = CORS_PROXIES[0]; // Start with first proxy

        if (proxyUrl.includes("codetabs.com")) {
          proxiedUrl = proxyUrl + encodeURIComponent(binjApiUrl);
        } else if (proxyUrl.includes("thingproxy.freeboard.io")) {
          proxiedUrl = proxyUrl + encodeURIComponent(binjApiUrl);
        } else {
          proxiedUrl = proxyUrl + binjApiUrl;
        }

        const response = await fetch(proxiedUrl, {
          method: "GET",
          headers: { Accept: "application/json" },
        });

        if (response.ok) {
          const data = await response.json();
          // Adjust the data extraction based on the actual API response for bINJ
          const extractedPrice = data?.data?.price || data?.price || 1.0;
          // console.log("[DEBUG] bINJ price extracted:", extractedPrice);
          setBinjPrice(extractedPrice);
        } else {
          console.warn(
            "[WARNING] Failed to fetch bINJ price:",
            response.status,
          );
          setBinjPrice(1.0); // Fallback price
        }
      } catch (error) {
        console.error("[ERROR] Error fetching bINJ price:", error);
        setBinjPrice(1.0); // Fallback price
      } finally {
        binjFetchingRef.current = false;
      }
    };

    fetchBinjPrice();
  }, []);


  useEffect(() => {
    if (allAssetsFetchedRef.current) return; // skip if already fetched
    allAssetsFetchedRef.current = true;

    const fetchAndSetAssetPrices = async () => {
      try {
        const prices = await fetchAllAssetPrices();
        setAssetPrices(prices); // immediately update assetPrices with fetched prices
      } catch (error) {
        console.error("[ERROR] Failed to fetch other asset prices:", error);
      }
    };

    fetchAndSetAssetPrices();
  }, []);

  useEffect(() => {
    if (hasLoadedBalances && hasLoadedNFTs && !hasCompletedInitialLoad) {
      setHasCompletedInitialLoad(true);
    }
  }, [hasLoadedBalances, hasLoadedNFTs, hasCompletedInitialLoad]);

  const fetchAllChainBalances = async (addresses) => {
    const chainBalances = {}; // Structure: { chainName: { assets: [...], totalValue: 0 } }

    const balancePromises = Object.entries(addresses).filter(([chainName]) => chainName !== "mantra_dukong_1").map(
      async ([chainName, address]) => {
        if (CHAIN_ENDPOINTS[chainName]) {
          try {
            const endpoint = CHAIN_ENDPOINTS[chainName];
            const url = `${endpoint.rest}/cosmos/bank/v1beta1/balances/${address}`;

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

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
              // console.log(`All balances for ${chainName}:`, data);

              const assets = [];

              if (data.balances && Array.isArray(data.balances)) {
                // Process all token balances
                data.balances.forEach(balance => {
                  const denom = balance.denom;
                  const amount = balance.amount;

                  // Skip zero balances
                  if (!amount || amount === '0') return;

                  // Check native token
                  if (denom === endpoint.denom) {
                    assets.push({
                      symbol: endpoint.symbol,
                      amount: amount,
                      denom: denom,
                      decimals: endpoint.decimals,
                      isNative: true,
                      originChain: chainName,
                    });
                  } else {
                    // Check IBC tokens
                    const tokenInfo = IBC_TOKEN_MAPPINGS[denom];
                    if (tokenInfo) {
                      assets.push({
                        symbol: tokenInfo.symbol,
                        amount: amount,
                        denom: denom,
                        decimals: tokenInfo.decimals,
                        isNative: false,
                        originChain: tokenInfo.originChain,
                      });
                    }
                  }
                });
              }

              return [chainName, { assets, totalValue: 0 }];
            } else {
              console.warn(`Failed to fetch balances for ${chainName}: ${response.status}`);
              return [chainName, { assets: [], totalValue: 0 }];
            }
          } catch (error) {
            console.error(`Error fetching balances for ${chainName}:`, error);
            return [chainName, { assets: [], totalValue: 0 }];
          }
        }
        return [chainName, { assets: [], totalValue: 0 }];
      },
    );

    const results = await Promise.all(balancePromises);

    results.forEach(([chainName, chainData]) => {
      chainBalances[chainName] = chainData;
    });

    return chainBalances;
  };

  useEffect(() => {
    const handleKeystoreChange = () => {
      console.log("Wallet account changed, clearing state...");

      // Clear everything related to the old account
      resetAllStates();
    };

    window.addEventListener("keplr_keystorechange", handleKeystoreChange);
    window.addEventListener("leap_keystorechange", handleKeystoreChange);

    return () => {
      window.removeEventListener("keplr_keystorechange", handleKeystoreChange);
      window.removeEventListener("leap_keystorechange", handleKeystoreChange);
    };
  }, []);

  const copyAddress = async (chain, address) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedChain(chain);

      // reset after 2s
      setTimeout(() => {
        setCopiedChain(null);
      }, 2000);
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  const fetchAllAssetPrices = async () => {
    // console.log("[DEBUG] Fetching prices for all supported assets");
    const prices = {};

    // Symbol to CoinGecko ID mapping
    const symbolToCoinGeckoId = {
      'OSMO': 'osmosis',
      'STARS': 'stargaze',
      'ATOM': 'cosmos',
      'INJ': 'injective-protocol',
      'INIT': 'initia',
      'NTRN': 'neutron-3',
      'OM': 'mantra-dao',
      'AKT': 'akash-network',
      'TIA': 'celestia',
      'BTC': 'bitcoin',
      'USDC': 'usd-coin',
      'BIKE': 'bike',
      'DGN': 'dragon-coin-2',
      'FLIX': 'omniflix-network',
      'SPICE': 'spice-2',
      'LAB': 'mad-scientists',
      'YGATA': 'yield-gata'
    };

    const coingeckoIds = Object.values(symbolToCoinGeckoId)
      .join(',');

    if (coingeckoIds) {
      try {
        // console.log("[DEBUG] Fetching from CoinGecko:", coingeckoIds);
        const coingeckoResponse = await fetch(
          `${API_ENDPOINTS.COINGECKO_SIMPLE_PRICE}?ids=${coingeckoIds}&vs_currencies=usd`,
        );

        if (coingeckoResponse.ok) {
          const coingeckoData = await coingeckoResponse.json();
          // console.log("[DEBUG] CoinGecko response:", coingeckoData);

          // Map prices back to symbols
          Object.entries(symbolToCoinGeckoId).forEach(([symbol, coingeckoId]) => {
            if (coingeckoData[coingeckoId]?.usd) {
              prices[symbol] = coingeckoData[coingeckoId].usd;
              // console.log(`[DEBUG] Set price for ${symbol}: $${prices[symbol]}`);
            }
          });
        } else {
          console.warn("[WARNING] Failed to fetch prices from CoinGecko:", coingeckoResponse.status);
        }
      } catch (error) {
        console.error("[ERROR] Error fetching prices from CoinGecko:", error);
      }
    }

    // Fallback prices for missing tokens
    const fallbackPrices = {
      'OSMO': 0.5,
      'STARS': 0.02,
      'ATOM': 11.5,
      'INJ': 25.0,
      'INIT': 0.43,
      'NTRN': 0.4,
      'OM': 3.8,
      'AKT': 3.2,
      'TIA': 5.5,
      'BTC': 95000,
      'USDC': 1.0,
      'BIKE': 0,
      'DGN': 0
    };

    // Apply fallbacks for missing prices
    Object.entries(fallbackPrices).forEach(([symbol, fallbackPrice]) => {
      if (!prices[symbol] || prices[symbol] === 0) {
        prices[symbol] = fallbackPrice;
        // console.log(`[DEBUG] Applied fallback price for ${symbol}: $${fallbackPrice}`);
      }
    });

    if (bosmoPrice) {
      prices['bOSMO'] = bosmoPrice;
    }
    if (binjPrice) {
      prices['bINJ'] = binjPrice;
    }
    return prices;
  };

  async function fetchAllOffers(addresses, allAssetPrices) {

    // Assuming these constants are defined elsewhere
    const REQUEST_CONFIG = {
      MAX_RETRIES: 3,
      TIMEOUT: 10000
    };

    // Helper function to handle CORS proxy URL construction
    const buildProxiedUrl = (proxyUrl, targetUrl) => {
      if (proxyUrl.includes("codetabs.com") || proxyUrl.includes("thingproxy.freeboard.io")) {
        return proxyUrl + encodeURIComponent(targetUrl);
      }
      return proxyUrl + targetUrl;
    };

    // Helper function to calculate USD value
    const calculateUsdValue = (amount, symbol, decimals = 6) => {
      const price = allAssetPrices[symbol];
      if (!price) return 0;
      return (parseFloat(amount) / Math.pow(10, decimals)) * price;
    };

    // Helper function for fetching with retry logic and timeout
    const fetchWithRetry = async (url, options = {}, useProxy = false) => {
      const maxRetries = REQUEST_CONFIG.MAX_RETRIES;
      let lastError = null;

      if (!useProxy) {
        // Direct fetch without proxy
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_CONFIG.TIMEOUT);

        try {
          const response = await fetch(url, {
            ...options,
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          return response;
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      }

      // Proxy fetch with retry logic
      for (let retries = 0; retries <= maxRetries; retries++) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), REQUEST_CONFIG.TIMEOUT);

          const proxyUrl = CORS_PROXIES[retries % CORS_PROXIES.length];
          const proxiedUrl = buildProxiedUrl(proxyUrl, url);

          const response = await fetch(proxiedUrl, {
            ...options,
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            return response;
          }

          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        } catch (error) {
          lastError = error;
          console.warn(`❌ Retry ${retries + 1}/${maxRetries + 1} failed:`, error.message);

          if (retries === maxRetries) {
            throw lastError;
          }
        }
      }
    };

    // Fetch 1: Stargaze Wallet Name
    const fetchWalletName = async () => {
      try {
        const response = await fetchWithRetry(API_ENDPOINTS.STARGAZE_GRAPHQL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `query ExampleQuery($address: String!) {
            wallet(address: $address) {
              name {
                name
              }
            }
          }`,
            variables: { address: addresses.stargaze }
          })
        }, false); // Direct fetch, no proxy needed for Stargaze

        const data = await response.json();

        if (data.data?.wallet?.name?.name) {
          setWallet(prev => ({ ...prev, name: data.data.wallet.name.name }));
        }
        return data;
      } catch (error) {
        console.error('❌ Fetch 1 error:', error);
        return null;
      }
    };

    // Fetch 2: Stargaze Offers
    const fetchStargazeOffers = async () => {
      try {
        const response = await fetchWithRetry(API_ENDPOINTS.STARGAZE_GRAPHQL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `query ExampleQuery($fromAddr: String) {
            offers(fromAddr: $fromAddr) {
              offers {
                collection {
                  contractAddress
                  name
                  media {
                    visualAssets {
                      xs {
                        url
                      }
                    }
                  }
                }
                offerPrice {
                  amount
                  amountUsd
                  denom
                  exponent
                  symbol
                }
                tokenId
                token {
                imageUrl
                name
                }
                type
              }
            }
          }`,
            variables: { fromAddr: addresses.stargaze }
          })
        }, false); // Direct fetch, no proxy needed for Stargaze

        const data = await response.json();

        return {
          platform: 'Stargaze',
          offers: data.data?.offers?.offers?.map(offer => {
            // Handle image URL with IPFS check
            const getImageUrl = (imageUrl) => {
              if (!imageUrl) return '';
              return imageUrl.startsWith('ipfs://')
                ? `https://ipfs.io/ipfs/${imageUrl.slice(7)}`
                : imageUrl;
            };

            // Determine name, image, and link based on offer type
            const isToken = offer.type === "token";
            const name = isToken ? offer.token?.name : offer.collection?.name;
            const imageUrl = isToken ? offer.token?.imageUrl : offer.collection?.media?.visualAssets?.xs?.url;
            const link = isToken
              ? `${MARKETPLACES["stargaze"]}${offer.collection.contractAddress}/${offer.tokenId}`
              : `${MARKETPLACES["stargaze"]}${offer.collection.contractAddress}/tokens`;

            return {
              amount: parseFloat(offer.offerPrice.amount) / Math.pow(10, offer.offerPrice.exponent || 6),
              symbol: offer.offerPrice.symbol,
              amount_usd: offer.offerPrice.amountUsd || 0,
              collection: {
                name: name || 'Unknown',
                image: getImageUrl(imageUrl)
              },
              link: link
            };
          }) || []
        };
      } catch (error) {
        console.error('❌ Fetch 2 error:', error);
        return { platform: 'stargaze', offers: [] };
      }
    };

    // Fetch 3: Superbolt Offers (with retry logic like Neutron)
    const fetchSuperboltOffers = async () => {
      try {
        const response = await fetchWithRetry(API_ENDPOINTS.SUPERBOLT_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `query ExampleQuery($where: OfferWhereInput) {
            offers(where: $where) {
              amount
              amount_usd
              collection {
                name
                collection_id
              }
              nft_id
              denom
            }
          }`,
            variables: {
              where: {
                creator: {
                  is: {
                    address_id: {
                      equals: addresses.neutron
                    }
                  }
                }
              }
            }
          })
        }, true); // Use proxy with retry logic

        const data = await response.json();

        return {
          platform: 'Superbolt',
          offers: data.data?.offers?.map(offer => {
            // Handle IPFS URLs
            const getImageUrl = (imageUrl) => {
              if (!imageUrl) return '';
              return imageUrl.startsWith('ipfs://')
                ? `https://ipfs.io/ipfs/${imageUrl.slice(7)}`
                : imageUrl;
            };

            return {
              amount: parseFloat(offer.amount) / Math.pow(10, 6),
              symbol: 'NTRN',
              amount_usd: offer.amount_usd || calculateUsdValue(offer.amount, 'NTRN', 6),
              collection: {
                name: offer.collection.name,
                image: getImageUrl(offer.pfp_image)
              },
              link: `${MARKETPLACES["superbolt"]}${offer.collection.collection_id}/nfts?search.displayAs=grid&search.keyword=&search.open=false&search.sortBy=listing_price,asc`
            };
          }) || []
        };
      } catch (error) {
        console.error('❌ Fetch 3 error:', error);
        return { platform: 'superbolt', offers: [] };
      }
    };

    // Fetch 4: BackboneLabs Injective Offers (with proxy iteration like Injective)
    const fetchBackboneInjectiveOffers = async () => {
      try {
        const offersUrl = `${API_ENDPOINTS.BACKBONE_LABS_API}/dapps/necropolis/offers/made?addresses=${addresses.injective}`;
        const response = await fetchWithRetry(
          offersUrl,
          {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
          },
          true // Use proxy with retry logic
        );

        const data = await response.json();

        const offersWithCollections = await Promise.all(
          (data.offers || []).map(async (offer) => {
            try {
              // fetch token info instead of collection
              const tokenUrl = `${API_ENDPOINTS.BACKBONE_LABS_API}/dapps/necropolis/collections/${offer.nft_contract}/${offer.token_id}`;
              const tokenResponse = await fetchWithRetry(
                tokenUrl,
                {
                  method: 'GET',
                  headers: { 'Accept': 'application/json' }
                },
                true
              );
              const tokenData = await tokenResponse.json();

              return {
                amount: parseFloat(offer.offer_amount) / Math.pow(10, 6),
                symbol: 'bINJ',
                amount_usd: calculateUsdValue(offer.offer_amount, 'bOSMO', 6),
                collection: {
                  name: tokenData.name || 'Unknown Token',
                  image: tokenData.image_url
                    ? (tokenData.image_url.startsWith('ipfs://')
                      ? `https://ipfs.io/ipfs/${tokenData.image_url.slice(7)}`
                      : tokenData.image_url)
                    : ''
                },
                link: `${MARKETPLACES["backbonelabs"]}/nfts/marketplace/collections/${offer.nft_contract}/${offer.token_id}`
              };
            } catch (error) {
              console.error('❌ Error fetching token for offer:', error);
              return {
                amount: parseFloat(offer.offer_amount) / Math.pow(10, 18),
                symbol: 'bINJ',
                amount_usd: calculateUsdValue(offer.offer_amount, 'bINJ', 18),
                collection: {
                  name: 'Unknown Token',
                  image: ''
                },
                link: `${MARKETPLACES["backbonelabs"]}/marketplace/collections/${offer.nft_contract}/${offer.token_id}`
              };
            }
          })
        );

        return {
          platform: 'Backbonelabs Injective',
          offers: offersWithCollections
        };
      } catch (error) {
        console.error('❌ Fetch 4 error:', error);
        return { platform: 'Backbonelabs Injective', offers: [] };
      }
    };


    // Fetch 5: BackboneLabs Osmosis Offers (with single proxy like Osmosis)
    const fetchBackboneOsmosisOffers = async () => {
      try {
        const offersUrl = `${API_ENDPOINTS.BACKBONE_LABS_API}/dapps/necropolis/offers/made?addresses=${addresses.osmosis}`;

        // Use first proxy like Osmosis pattern
        const proxyUrl = CORS_PROXIES[0];
        const proxiedUrl = buildProxiedUrl(proxyUrl, offersUrl);

        const response = await fetch(proxiedUrl, {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        });

        const data = await response.json();

        const offersWithCollections = await Promise.all(
          (data.offers || []).map(async (offer) => {
            try {
              // Fetch token info instead of collection
              const tokenUrl = `${API_ENDPOINTS.BACKBONE_LABS_API}/dapps/necropolis/collections/${offer.nft_contract}/${offer.token_id}`;
              const tokenProxiedUrl = buildProxiedUrl(proxyUrl, tokenUrl);

              const tokenResponse = await fetch(tokenProxiedUrl, {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
              });

              const tokenData = await tokenResponse.json();

              return {
                amount: parseFloat(offer.offer_amount) / Math.pow(10, 6),
                symbol: 'bOSMO',
                amount_usd: calculateUsdValue(offer.offer_amount, 'bOSMO', 6),
                collection: {
                  name: tokenData.name || 'Unknown Token',
                  image: tokenData.image_url
                    ? (tokenData.image_url.startsWith('ipfs://')
                      ? `https://ipfs.io/ipfs/${tokenData.image_url.slice(7)}`
                      : tokenData.image_url)
                    : ''
                },
                link: `${MARKETPLACES["backbonelabs"]}/nfts/marketplace/collections/${offer.nft_contract}/${offer.token_id}`
              };
            } catch (error) {
              console.error('❌ Error fetching token for offer:', error);
              return {
                amount: parseFloat(offer.offer_amount) / Math.pow(10, 6),
                symbol: 'bOSMO',
                amount_usd: calculateUsdValue(offer.offer_amount, 'bOSMO', 6),
                collection: {
                  name: 'Unknown Token',
                  image: ''
                },
                link: `${MARKETPLACES["backbonelabs"]}/nfts/marketplace/collections/${offer.nft_contract}/${offer.token_id}`
              };
            }
          })
        );

        return {
          platform: 'Backbonelabs Osmosis',
          offers: offersWithCollections
        };
      } catch (error) {
        console.error('❌ Fetch 5 error:', error);
        return { platform: 'Backbonelabs Osmosis', offers: [] };
      }
    };


    // Fetch 6: Intergaze Offers
    const fetchIntergazeOffers = async () => {
      try {
        const response = await fetchWithRetry(
          `${API_ENDPOINTS.INTERGAZE_API}/profiles/${addresses.initia}/offers/made?offset=0&limit=100`,
          {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
          },
          false // Assuming Intergaze doesn't need proxy
        );

        const data = await response.json();

        return {
          platform: 'Intergaze',
          offers: (data.offers || []).map(offer => {
            const baseUrl = MARKETPLACES["intergaze"];
            const contractAddr = offer.collection?.contractAddress;

            let link;
            if (offer.type === "token") {
              link = `${baseUrl}/m/${contractAddr}/${offer.token?.tokenId}`;
            } else {
              link = `${baseUrl}/m/${contractAddr}`;
            }

            return {
              amount: parseFloat(offer.price.amount) / Math.pow(10, offer.price.exponent || 6),
              symbol: offer.price.symbol,
              amount_usd: calculateUsdValue(
                offer.price.amount,
                offer.price.symbol,
                offer.price.exponent || 6
              ),
              collection: {
                name: offer.type === "token"
                  ? (offer.token?.name || 'Unknown Token')
                  : (offer.collection?.name || 'Unknown Collection'),
                image: offer.type === "token"
                  ? (offer.token?.media?.visualAssets?.xs?.url || '')
                  : (offer.collection?.media?.visualAssets?.xs?.url || '')
              },
              link
            };
          })
        };
      } catch (error) {
        console.error('❌ Fetch 6 error:', error);
        return { platform: 'Intergaze', offers: [] };
      }
    };

    // Fetch 7: BackboneLabs Osmosis Offers (with single proxy like Osmosis)
    const fetchBackboneDungeonOffers = async () => {
      try {
        const offersUrl = `${API_ENDPOINTS.BACKBONE_LABS_API}/dapps/necropolis/offers/made?addresses=${addresses.dungeon}`;

        // Use first proxy like Osmosis pattern
        const proxyUrl = CORS_PROXIES[0];
        const proxiedUrl = buildProxiedUrl(proxyUrl, offersUrl);

        const response = await fetch(proxiedUrl, {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        });

        const data = await response.json();

        const offersWithCollections = await Promise.all(
          (data.offers || []).map(async (offer) => {
            try {
              // Fetch token info instead of collection
              const tokenUrl = `${API_ENDPOINTS.BACKBONE_LABS_API}/dapps/necropolis/collections/${offer.nft_contract}/${offer.token_id}`;
              const tokenProxiedUrl = buildProxiedUrl(proxyUrl, tokenUrl);

              const tokenResponse = await fetch(tokenProxiedUrl, {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
              });

              const tokenData = await tokenResponse.json();

              return {
                amount: parseFloat(offer.offer_amount) / Math.pow(10, 6),
                symbol: 'DGN',
                amount_usd: calculateUsdValue(offer.offer_amount, 'DGN', 6),
                collection: {
                  name: tokenData.name || 'Unknown Token',
                  image: tokenData.image_url
                    ? (tokenData.image_url.startsWith('ipfs://')
                      ? `https://ipfs.io/ipfs/${tokenData.image_url.slice(7)}`
                      : tokenData.image_url)
                    : ''
                },
                link: `${MARKETPLACES["backbonelabs"]}/nfts/marketplace/collections/${offer.nft_contract}/${offer.token_id}`
              };
            } catch (error) {
              console.error('❌ Error fetching token for offer:', error);
              return {
                amount: parseFloat(offer.offer_amount) / Math.pow(10, 6),
                symbol: 'DGN',
                amount_usd: calculateUsdValue(offer.offer_amount, 'DGN', 6),
                collection: {
                  name: 'Unknown Token',
                  image: ''
                },
                link: `${MARKETPLACES["backbonelabs"]}/nfts/marketplace/collections/${offer.nft_contract}/${offer.token_id}`
              };
            }
          })
        );

        return {
          platform: 'Backbonelabs Dungeon',
          offers: offersWithCollections
        };
      } catch (error) {
        console.error('❌ Fetch 7 error:', error);
        return { platform: 'Backbonelabs Dungeon', offers: [] };
      }
    };

    try {
      const [
        walletResult,
        stargazeResult,
        superboltResult,
        backboneInjectiveResult,
        backboneOsmosisResult,
        intergazeResult,
        backboneDungeonResult
      ] = await Promise.all([
        fetchWalletName(),
        fetchStargazeOffers(),
        fetchSuperboltOffers(),
        fetchBackboneInjectiveOffers(),
        fetchBackboneOsmosisOffers(),
        fetchIntergazeOffers(),
        fetchBackboneDungeonOffers()
      ]);


      const platforms = [stargazeResult, superboltResult, backboneInjectiveResult, backboneOsmosisResult, intergazeResult, backboneDungeonResult];

      const processedPlatforms = platforms
        .map(platform => {
          const offers_total_platform_value_usd = platform.offers.reduce((sum, offer) => sum + offer.amount_usd, 0);
          return {
            platform: platform.platform,
            offers_total_platform_value_usd,
            offers: platform.offers
          };
        })
        .sort((a, b) => b.offers_total_platform_value_usd - a.offers_total_platform_value_usd)
        .map(platform => ({
          [platform.platform]: {
            offers_total_platform_value_usd: platform.offers_total_platform_value_usd,
            offers: platform.offers
          }
        }));

      const offers_total_value_usd = platforms.reduce((total, platform) => {
        return total + platform.offers.reduce((sum, offer) => sum + offer.amount_usd, 0);
      }, 0);

      const result = {
        offers_total_value_usd,
        ...processedPlatforms.reduce((acc, platform) => ({ ...acc, ...platform }), {})
      };

      // console.log('📊 Final NFT offers result:', result);
      return result;

    } catch (error) {
      console.error('❌ Error in fetchAllOffers:', error);
      throw error;
    }
  }

  const calculateChainValues = (chainBalances, assetPrices) => {
    const updatedChainBalances = { ...chainBalances };

    Object.entries(updatedChainBalances).forEach(([chainName, chainData]) => {
      let totalValue = 0;

      chainData.assets.forEach(asset => {
        const decimals = asset.decimals || 6;
        const amount = parseFloat(asset.amount) / Math.pow(10, decimals);
        const price = assetPrices[asset.symbol] || 0;
        const value = amount * price;


        asset.formattedAmount = amount;
        asset.price = price;
        asset.value = value;

        totalValue += value;
      });

      chainData.totalValue = totalValue;

      // Sort assets by value (highest first)
      chainData.assets.sort((a, b) => b.value - a.value);
    });

    return updatedChainBalances;
  };

  // updated to accept manualAddress if walletType is "manual"
  const getAddressesFromChains = async (walletInfo) => {
    const addresses = {};

    try {
      // Handle MANUAL ENTRY directly
      if (walletInfo.type === "manual") {
        if (!walletInfo.stargazeAddress || !walletInfo.injectiveAddress || !walletInfo.initiaAddress) {
          throw new Error("Manual entry requires both Stargaze, Injective and Initia addresses");
        }

        // 1️⃣ Derive all Cosmos SDK addresses from Stargaze
        const { data: cosmosBytes } = fromBech32(walletInfo.stargazeAddress.toLowerCase());
        for (const [chainName, config] of Object.entries(CHAIN_CONFIGS)) {
          if (chainName !== "injective" && chainName !== "initia" && chainName !== "mantra_dukong_1") {
            addresses[chainName] = toBech32(config.prefix, cosmosBytes);
          }
        }

        // derive Injective and Initia bech32 addresses
        addresses.injective = walletInfo.injectiveAddress;
        addresses.initia = walletInfo.initiaAddress;

        if (walletInfo.lokiEvmAddress) {
          addresses["mantra_dukong_1"] = walletInfo.lokiEvmAddress;
        }

        return addresses;
      }
      // Otherwise, KEPLR or LEAP normal flow
      const chainIds = [
        "stargaze-1",
        "osmosis-1",
        "cosmoshub-4",
        "injective-1",
        "interwoven-1",
        "neutron-1",
        "mantra-1",
        "akashnet-2",
        "omniflixhub-1"
      ];

      const walletInstance = walletInfo.type === "leap" ? window.leap : window.keplr;

      if (!walletInstance) {
        throw new Error(
          `${walletInfo.type === "leap" ? "Leap" : "Keplr"} wallet not found. Please install the extension.`
        );
      }

      await walletInstance.enable(chainIds);

      for (const [chainName, config] of Object.entries(CHAIN_CONFIGS)) {
        // Skip dungeon for leap, derive later
        if (config.chainId === "dungeon-1" || config.chainId === "mantra-dukong-1") {
          continue;
        }

        const key = await walletInstance.getKey(config.chainId);
        addresses[chainName] = key.bech32Address;
      }

      // Derive dungeon manually if leap
      if (CHAIN_CONFIGS["dungeon"]) {
        // pick one of the other keys, cosmoshub is safe
        const baseKey = await walletInstance.getKey("cosmoshub-4");
        const dungeonAddr = toBech32(
          CHAIN_CONFIGS["dungeon"].prefix,
          baseKey.address // Uint8Array
        );
        addresses["dungeon"] = dungeonAddr;
      }
      // NEW: Add Loki EVM address if provided
      if (walletInfo.lokiEvmAddress) {
        addresses["mantra_dukong_1"] = walletInfo.lokiEvmAddress;
      }
    } catch (error) {
      console.error("Failed to connect to chains:", error);
      throw new Error(
        `Failed to connect to chains. Please try again or check your ${walletInfo.type === "leap" ? "Leap" : walletInfo.type === "manual" ? "manual address" : "Keplr"
        } wallet.`
      );
    }

    return addresses;
  };

  const fetchMantraGendrop = async (mantraAddress) => {
  try {
    const url = `https://leaderboard.mantra.zone/api/v1/portfolio/${mantraAddress}?filter_completed_campaigns=true`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch Mantra portfolio");

    const data = await response.json();
    const gendrop = parseFloat(data?.gendrop?.om?.balanceInBaseDenom || 0);
    const upgrade = parseFloat(data?.omUpgrade?.om?.balanceInBaseDenom || 0);

    const total = gendrop + upgrade;
    const decimals = 6; // OM has 6 decimals
    const amount = total / Math.pow(10, decimals);

    const price = assetPrices["OM"] || 0;
    const usdValue = amount * price;
    console.log(gendrop, upgrade);
    setOmGendrop({ amount, usdValue });
  } catch (err) {
    console.error("Error fetching Mantra portfolio:", err);
    setOmGendrop({ amount: 0, usdValue: 0 });
  }
};

  const fetchTokenBalances = async (addresses) => {
    try {
      setOffersLoading(true);
      fetchMantraGendrop(addresses["mantra"]);
      // Fetch all chain balances
      const allChainBalances = await fetchAllChainBalances(addresses);

      // Fetch all asset prices
      // const allAssetPrices = await fetchAllAssetPrices();

      // Calculate values for each chain
      const balancesWithValues = calculateChainValues(allChainBalances, assetPrices);

      setChainBalances(balancesWithValues);
      // setAssetPrices(allAssetPrices);

      // Fetch NFT offers only on initial load
      if (!hasCompletedInitialLoad) {
        try {
          const offersData = await fetchAllOffers(addresses, assetPrices);
          setNftOffers(offersData);
        } catch (error) {
          console.error('Error fetching NFT offers:', error);
          setNftOffers({});
        }
      }

      // Maintain backward compatibility for existing code
      const legacyBalances = {};
      const legacyPrices = {};

      Object.entries(balancesWithValues).forEach(([chainName, chainData]) => {
        const nativeAsset = chainData.assets.find(asset => asset.isNative);
        if (nativeAsset) {
          legacyBalances[chainName] = {
            amount: nativeAsset.amount,
            denom: nativeAsset.denom,
            symbol: nativeAsset.symbol,
            decimals: nativeAsset.decimals,
          };
          legacyPrices[chainName] = nativeAsset.price;
        }
      });
      
      setTokenBalances(legacyBalances);
      setTokenPrices(legacyPrices);

    } catch (error) {
      console.error('Error fetching token balances:', error);
    } finally {
      setOffersLoading(false);
      setHasLoadedBalances(true);
    }
  };


  const formatBalance = (balance) => {
    if (!balance || !balance.amount) return "0";
    const decimals = balance.decimals || 6;
    const divisor = Math.pow(10, decimals);
    const amount = parseFloat(balance.amount) / divisor;
    return amount.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  const formatAddress = (address) => {
    if (!address) return "";

    // ✅ Detect EVM address (0x + 40 hex chars)
    if (/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }

    // ✅ Assume Cosmos bech32 otherwise
    const parts = address.split("1");
    if (parts.length < 2) return address;
    const prefix = parts[0] + "1";
    const mainPart = parts[1];
    if (mainPart.length <= 7) return address;
    return `${prefix}${mainPart.slice(0, 4)}...${mainPart.slice(-3)}`;
  };

  const mapAddressesForSkip = (addresses) => {
    const skipAddresses = {};

    for (const [name, addr] of Object.entries(addresses)) {
      if (CHAIN_CONFIGS[name] && CHAIN_CONFIGS[name].chainId) {
        skipAddresses[CHAIN_CONFIGS[name].chainId] = addr;
      }
    }

    return skipAddresses;
  };

  const handleWalletConnect = async (walletInfo) => {
    setWallet(walletInfo);

    // ✅ Store signers in state
    setSigners(walletInfo.signers);

    try {
      const allAddresses = await getAddressesFromChains(walletInfo);
      setAddresses(allAddresses);

      if (walletInfo.type !== "manual") {
        // Convert chain names → chain IDs for Skip
        const skipReadyAddresses = mapAddressesForSkip(allAddresses);
        setAddressesForSkip(skipReadyAddresses);
      } else {
        setAddressesForSkip({});
      }
      // No longer gating, so set hasAccess to true directly
      setHasAccess(true);

      // Fetch token balances
      fetchTokenBalances(allAddresses);
    } catch (error) {
      console.error("Error connecting to chains:", error);
      setError("Failed to connect to all chains");
    }
  };

  // ✅ Create signer functions for SkipWidget
  const getCosmosSigner = async (chainId) => {
    const signer = signers?.[chainId];
    if (signer) return signer;
    console.warn(`[Skip] No signer available for chain ${chainId}`);
    return undefined; // Instead of throw

    // getEvmSigner: async () => undefined,
    // getSvmSigner: async () => undefined,
  };

  const handleDisconnect = () => {
    resetAllStates();

    // Reset any dropdown states
    setTokenBalancesClosing(false);
    setWalletDropdownClosing(false);
  };
  const isAddressValid = (addr, prefix, chainName) => {
    try {
      // Special case: mantra_dukong_1 uses EVM addresses
      if (chainName === "mantra_dukong_1") {
        return /^0x[a-fA-F0-9]{40}$/.test(addr); // ✅ EVM regex
      }

      // Otherwise: Cosmos bech32 validation
      const { prefix: decodedPrefix } = fromBech32(addr.toLowerCase());
      return decodedPrefix === prefix;
    } catch {
      return false;
    }
  };
  // const isAddressValid = (address, chainPrefix) => {
  //   // Handle special case for Neutron addresses which use "neutron1" prefix
  //   const expectedPrefix = chainPrefix === "neutron" ? "neutron1" : chainPrefix;

  //   // Basic check for prefix and length (typical length is 39-65 characters for Neutron)
  //   const minLength = chainPrefix === "neutron" ? 39 : 39;
  //   const maxLength = chainPrefix === "neutron" ? 70 : 70;

  //   return (
  //     address.startsWith(expectedPrefix) &&
  //     address.length >= minLength &&
  //     address.length <= maxLength
  //   );
  // };

  const handleAddManualAddress = () => {
    if (!manualAddress.trim()) {
      setError("Please enter an address.");
      return;
    }

    if (!selectedChain) {
      setError("Please select a chain.");
      return;
    }

    const prefix = CHAIN_CONFIGS[selectedChain]?.prefix;
    const trimmedAddress = manualAddress.trim();

    if (!prefix && selectedChain !== "mantra_dukong_1") {
      setError(`Chain configuration not found for ${selectedChain}.`);
      return;
    }

    if (!isAddressValid(trimmedAddress, prefix, selectedChain)) {
      // Handle special error message for Neutron
      setError(
        `Invalid address for ${selectedChain.toUpperCase()}.`,
      );
      return;
    }

    // Clear any previous errors
    setError("");

    // Add the valid address
    setAddressLoading((prev) => ({ ...prev, [selectedChain]: true }));
    setManualAddresses((prev) => ({
      ...prev,
      [`${selectedChain}_manual`]: trimmedAddress,
    }));
    setManualAddress("");
    setShowManualAddressForm(false);
    setShowWalletDropdown(false);
  };

  const handleRemovalConfirmation = (chain) => {
    setConfirmingRemoval(chain);
  };

  const confirmRemovalAddress = (chain) => {
    const addressToRemove = manualAddresses[chain];
    console.log(
      `[DEBUG] Removing manual address for ${chain}: ${addressToRemove}`,
    );

    // Call the NFT removal function if it exists
    if (
      typeof window !== "undefined" &&
      window.removeNFTsByManualAddress &&
      addressToRemove
    ) {
      window.removeNFTsByManualAddress(chain, addressToRemove);
    }
    if (window.clearFetchedAddress && addressToRemove) {
      window.clearFetchedAddress(`${chain}-${addressToRemove}`);
    }
    setManualAddresses((prev) => {
      const newAddresses = { ...prev };
      delete newAddresses[chain];
      return newAddresses;
    });
    setAddressLoading((prev) => {
      const newLoading = { ...prev };
      delete newLoading[chain];
      return newLoading;
    });

    setConfirmingRemoval(null);
  };

  const cancelRemoval = () => {
    setConfirmingRemoval(null);
  };

  const clearAddressLoading = (chainName) => {
    setAddressLoading((prev) => {
      const newLoading = { ...prev };
      delete newLoading[chainName];
      return newLoading;
    });
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedAddress(text);
      setTimeout(() => setCopiedAddress(null), 1500);
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  const handleAddressListScroll = (e) => {
    const element = e.target;
    const canScrollUp = element.scrollTop > 0;
    const canScrollDown =
      element.scrollTop < element.scrollHeight - element.clientHeight;
    const isScrollable = element.scrollHeight > element.clientHeight;

    setScrollState({
      canScrollUp,
      canScrollDown,
      isScrollable,
    });
  };

  // Initialize scroll state when dropdown opens
  const checkScrollState = (element) => {
    if (element) {
      const canScrollUp = element.scrollTop > 0;
      const canScrollDown =
        element.scrollTop < element.scrollHeight - element.clientHeight;
      const isScrollable = element.scrollHeight > element.clientHeight;

      setScrollState({
        canScrollUp,
        canScrollDown,
        isScrollable,
      });
    }
  };

  // Function to handle removal of NFTs for a manual address
  const handleManualAddressRemoved = (addressToRemove) => {
    // console.log(
    //   `NFTs for manual address ${addressToRemove} have been cleared.`,
    // );
  };

  // Combine connected and manual addresses for NFT fetching
  const getAllAddresses = () => {
    return { ...addresses, ...manualAddresses }


    // Add manual addresses to their respective chains
    // Object.entries(manualAddresses).forEach(([chain, address]) => {
    //   if (!combined[chain]) {
    //     combined[chain] = address;
    //   } else {
    //     // If there's already a connected address, we'll handle both in fetchAllNFTs
    //     combined[`${chain}_manual`] = address;
    //   }
    // });

    // return combined;
  };

  // Close wallet dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showWalletDropdown &&
        !event.target.closest(".wallet-dropdown-container")
      ) {
        setWalletDropdownClosing(true);
        setTimeout(() => {
          setShowWalletDropdown(false);
          setWalletDropdownClosing(false);
        }, 200);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showWalletDropdown]);

  // if (!wallet) {
  //   return <WalletConnect onConnect={handleWalletConnect} error={error} />;
  // }

  // Removed gating logic, access is granted if wallet is connected.
  // The "Access Denied" view is removed.
  const handleBalanceClick = async (defaultRoute) => {
    const safeDefaultRoute = defaultRoute?.destChainId
      ? {
        destChainId: defaultRoute.destChainId,
        destAssetDenom: defaultRoute.destAssetDenom || "",
      }
      : undefined;
    setSkipDefaultRoute(safeDefaultRoute);
    if (!showSkipWidget) {
      setShowSkipWidget(true);
    }
  };

  return (
    <div className={`${(hasCompletedInitialLoad) ? "app" : "app-connecting"}`}>
      <SkipWidget showSkipWidget={showSkipWidget}
        connectedAddresses={mapAddressesForSkip(addresses)}
        getCosmosSigner={getCosmosSigner}
        defaultRoute={skipDefaultRoute}
        onClose={() => setShowSkipWidget(false)} />
      <header className="app-header">
        <div className="app-title-container">
          <img src="/cosmosNFTHUBlogo.png" alt="Logo" className="app-logo" />
          <div className="app-title">
            <div className="title-main">NFTHUB</div>
            <div className="title-sub">COSMOS</div>
          </div>
        </div>
        <div className="marketplace-links desktop-only">
          <div className="marketplace-logos">
            <a href="https://www.madscientists.io/" target="_blank" rel="noopener noreferrer" data-tooltip="Mad Scientists, OSMOSIS genesis collection on Osmosis/Stargaze">
              <img src="/MadScientist.png" alt="Mad Scientist" className="header-character" style={{ height: '70px', opacity: 1 }} />
            </a>

            <a href="https://www.stargaze.zone" target="_blank" rel="noopener noreferrer" data-tooltip="Stargaze Marketplace on Stargaze">
              <img src="/Stargaze.svg" alt="Stargaze" />
            </a>
            <a href="https://intergaze.xyz" target="_blank" rel="noopener noreferrer" data-tooltip="Intergaze Marketplace on Initia">
              <img src="/Intergaze.png" alt="Intergaze" />
            </a>
            <a href="https://app.backbonelabs.io" target="_blank" rel="noopener noreferrer" data-tooltip="BackBoneLabs Marketplace on Osmosis, Injective and Dungeon">
              <img src="/BackBoneLabs.png" alt="BackBoneLabs" />
            </a>
            <a href="https://app.superbolt.wtf" target="_blank" rel="noopener noreferrer" data-tooltip="Superbolt Marketplace on Neutron">
              <img src="/Superbolt.png" alt="Superbolt" />
            </a>
            <a href="https://app.arkprotocol.io/" target="_blank" rel="noopener noreferrer" data-tooltip="Ark Protocol, Interchain NFT transfers">
              <img src="/Ark.png" alt="Ark Protocol" />
            </a>
            <a href="https://daodao.zone" target="_blank" rel="noopener noreferrer" data-tooltip="DAODAO, DAOs on Cosmos chains">
              <img src="/DAODAO.png" alt="DAODAO" />
            </a>
            <a href="https://www.stargaze.zone/m/onchain-omies/tokens" target="_blank" rel="noopener noreferrer" data-tooltip="Onchain OMies, MANTRA genesis collection on Stargaze">
              <img src="/OMie.png" alt="Omie" className="header-character" style={{ height: '70px', opacity: 1 }} />
            </a>
          </div>
        </div>
        <div
          className={`skip-logo ${((!hasCompletedInitialLoad && isFetchingNFTs) || (!hasLoadedNFTs && isFetchingNFTs)) ? "disabled" : ""}`}
          data-tooltip={
            isFetchingNFTs
              ? "To swap with Skip, please wait for the NFTs fetch to end 😉"
              : "Swap with Skip widget and support the NFTHUB (2% fee)"
          }
        >
          <img
            src="/skip.png"
            alt="skip_logo"
            className="skip-logo__img"
            onClick={() => {
              if (!isFetchingNFTs || hasLoadedNFTs) {
                if (!showSkipWidget) {
                  setSkipDefaultRoute(undefined);
                }
                setShowSkipWidget(!showSkipWidget);
              }
            }}
          />
        </div>
        <style>{`
        .skip-logo { position: relative; display: inline-block; }

        .skip-logo__img {
          cursor: pointer;
          max-width: 100px;
          display: block;
          transform: scale(1.05);
          transition: transform 0.25s ease;
        }

        /* Scale only if not disabled */
        .skip-logo:not(.disabled):hover .skip-logo__img {
          transform: scale(1.15);
        }

        /* Disabled state */
        .skip-logo.disabled .skip-logo__img {
          cursor: not-allowed;
          opacity: 0.6;
          pointer-events: none;
        }

        /* Tooltip */
        .skip-logo::after {
          content: attr(data-tooltip);
          position: absolute;
          bottom: -50px;
          left: 50%;
          transform: translateX(-50%);
          white-space: nowrap;
          background: rgba(30,30,47,0.95);
          padding: 6px 10px;
          border: 1px solid rgba(255,255,255,0.3);
          border-radius: 8px;
          font-size: 0.8rem;
          color: rgba(255,255,255,0.7);
          font-weight: 500;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.2s ease;
          z-index: 1000;
        }
        .skip-logo:hover::after { opacity: 1; }

        @media (max-width: 768px) {
          .skip-logo {
            display: none !important;
          }
        }
`}</style>
        {<div className="wallet-info">
          <button
            onClick={() => {
              if (showTokens) {
                setTokenBalancesClosing(true);
                setTimeout(() => {
                  setShowTokens(false);
                  setTokenBalancesClosing(false);
                }, 250);
              } else {
                setShowTokens(true);
              }
            }}
            className={`tokens-btn mobile-only ${hasCompletedInitialLoad ? "highlight" : ""}`}
            disabled={Object.keys(chainBalances).length === 0}
          >
            Portfolio
          </button>
          <div className="wallet-dropdown-container">
            <button
              onClick={() => {
                if (showWalletDropdown) {
                  setWalletDropdownClosing(true);
                  setTimeout(() => {
                    setShowWalletDropdown(false);
                    setWalletDropdownClosing(false);
                  }, 200);
                } else {
                  setShowWalletDropdown(true);
                }
              }}
              className="wallet-btn"
              disabled={(!hasCompletedInitialLoad)}
            >
              {hasCompletedInitialLoad && wallet ? wallet.name : "....."}
            </button>

            {(showWalletDropdown || walletDropdownClosing) && (
              <div
                className={`wallet-dropdown ${showWalletDropdown && !walletDropdownClosing ? "visible" : ""} ${walletDropdownClosing ? "closing" : ""}`}
              >
                <div className="dropdown-header">
                  <h4>Connected Addresses</h4>
                </div>

                <div
                  className={`addresses-list ${scrollState.isScrollable ? "scrollable" : ""} ${scrollState.canScrollUp ? "can-scroll-up" : ""} ${scrollState.canScrollDown ? "can-scroll-down" : ""}`}
                  onScroll={handleAddressListScroll}
                  ref={(el) => {
                    if (el && showWalletDropdown) {
                      // Check scroll state when dropdown opens
                      setTimeout(() => checkScrollState(el), 100);
                    }
                  }}
                >
                  <div className="address-category">
                    <div className="category-title">Connected Wallet</div>
                    {Object.entries(addresses).map(([chain, address]) => (
                      <div key={chain} className="address-item connected">
                        <div className="address-details">
                          <div className="chain-label">
                            {chain.toUpperCase()}
                          </div>
                          <div className="address-value">
                            {formatAddress(address)}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(address);
                          }}
                          className={`copy-address-btn ${copiedAddress === address ? "copied" : ""}`}
                          title="Copy address"
                        >
                          <Copy size={14} className="copy-icon" />
                          <Check size={14} className="check-icon" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {Object.keys(manualAddresses).length > 0 && (
                    <div className="address-category">
                      <div className="category-title">Manual Addresses</div>
                      {Object.entries(manualAddresses).map(
                        ([chain, address]) => (
                          <div key={chain} className="address-item-container">
                            <div
                              className={`address-item manual ${addressLoading[chain] ? "loading" : ""}`}
                            >
                              <div className="address-details">
                                <div className="chain-label">
                                  {chain.replace(/_manual$/, '').toUpperCase()}
                                </div>
                                <div className="address-value">
                                  {formatAddress(address)}
                                </div>
                              </div>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(address);
                                }}
                                className={`copy-address-btn ${copiedAddress === address ? "copied" : ""}`}
                                title="Copy address"
                              >
                                <Copy size={14} className="copy-icon" />
                                <Check size={14} className="check-icon" />
                              </button>

                              {addressLoading[chain] && (
                                <div className="address-loading">
                                  <div className="spinner"></div>
                                </div>
                              )}

                              {!addressLoading[chain] && (
                                <div
                                  className="remove-overlay"
                                  onClick={() =>
                                    handleRemovalConfirmation(chain)
                                  }
                                >
                                  <Trash2 size={24} />
                                </div>
                              )}
                            </div>

                            {confirmingRemoval === chain && (
                              <div className="removal-confirmation">
                                <div
                                  className="confirmation-backdrop"
                                  onClick={cancelRemoval}
                                ></div>
                                <div className="confirmation-popup">
                                  <p>
                                    Remove address{" "}
                                    <strong>{formatAddress(address)}</strong>?
                                  </p>
                                  <div className="confirmation-buttons">
                                    <button
                                      className="confirm-btn"
                                      onClick={() =>
                                        confirmRemovalAddress(chain)
                                      }
                                    >
                                      Yes
                                    </button>
                                    <button
                                      className="cancel-btn"
                                      onClick={cancelRemoval}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </div>

                <div className="dropdown-actions">
                  <button
                    onClick={() =>
                      setShowManualAddressForm(!showManualAddressForm)
                    }
                    className={`add-address-btn ${isFetchingNFTs ? "disabled" : ""}`}
                    disabled={isFetchingNFTs}
                  >
                    {isFetchingNFTs
                      ? "Fetching NFTs..."
                      : "Add Address Manually"}
                  </button>

                  <button
                    onClick={handleDisconnect}
                    className="disconnect-btn-dropdown"
                  >
                    <span>Disconnect</span>
                  </button>
                </div>

                {showManualAddressForm && (
                  <div className="manual-address-form">
                    <h5>Add Manual Address</h5>
                    <select
                      value={selectedChain}
                      onChange={(e) => setSelectedChain(e.target.value)}
                      className="chain-select"
                    >
                      {Object.keys(CHAIN_CONFIGS)
                        .filter(
                          (chain) => chain !== "akash" && chain !== "mantra",
                        )
                        .map((chain) => (
                          <option key={chain} value={chain}>
                            {chain.toUpperCase()}
                          </option>
                        ))}
                    </select>
                    <input
                      type="text"
                      value={manualAddress}
                      onChange={(e) => setManualAddress(e.target.value)}
                      placeholder="Paste address here..."
                      className="address-input"
                    />
                    {error && <div className="error-message">{error}</div>}
                    <div className="form-actions">
                      <button
                        onClick={handleAddManualAddress}
                        className="add-btn"
                        disabled={isFetchingNFTs || !hasCompletedInitialLoad}
                      >
                        Add
                      </button>
                      <button
                        onClick={() => setShowManualAddressForm(false)}
                        className="cancel-btn"

                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>}
      </header>

      {/* Mobile Chain-Based Portfolio */}
      {(showTokens || tokenBalancesClosing) && hasCompletedInitialLoad && (
        <ChainBasedPortfolio
          chainBalances={chainBalances}
          showTokens={showTokens}
          tokenBalancesClosing={tokenBalancesClosing}
          nftOffers={nftOffers}
          omGendrop={omGendrop}
        />
      )}

      {/* Desktop Chain-Based Portfolio */}
      {Object.keys(chainBalances).length > 0 && hasCompletedInitialLoad && (
        <DesktopChainPortfolio chainBalances={chainBalances} showDollarBalances={showDollarBalances}
          setShowDollarBalances={setShowDollarBalances} nftOffers={nftOffers} onBalanceClick={handleBalanceClick} omGendrop={omGendrop}/>
      )}


      {!wallet ? (
        <WalletConnect onConnect={handleWalletConnect} error={error} />
      ) : (
        <NFTDashboard
          key={nftDashboardKey}
          addresses={getAllAddresses()}
          onAddressFetched={clearAddressLoading}
          bosmoPrice={bosmoPrice}
          initPrice={initPrice}
          binjPrice={binjPrice}
          assetPrices={assetPrices}
          showDollarBalances={showDollarBalances}
          onManualAddressRemoved={handleManualAddressRemoved}
          onFetchStatusChange={(isFetching) => {
            setIsFetchingNFTs(isFetching);
          }}
          onInitialNFTLoadComplete={() => setHasLoadedNFTs(true)}
        />

      )}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-title">Cosmos NFTHUB DASHBOARD V1 @2025</div>
          <div className="footer-bottom">
            <div className="footer-logo">
              <span>Built with love by</span>
              <a href="https://x.com/MisterLoops" target="_blank" rel="noopener noreferrer">
                <img src="loops-logo.png" alt="Cosmonaut logo" />
              </a>
            </div>
            <button
              onClick={() => setShowDonation(true)}
              className="donate-btn"
              title="Support this project"
            >
              <Heart className="donate-icon" />
            </button>
          </div>
        </div>
      </footer>
      {/* Donation Modal */}
      {showDonation && (
        <div className="donation-overlay" onClick={() => setShowDonation(false)}>
          <div className="donation-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="close-btn"
              onClick={() => setShowDonation(false)}
            >
              <X size={20} />
            </button>

            <div className="donation-content">
              <Heart className="donation-heart" />
              <h3>Thank you for supporting!</h3>
              <p>Swap with Skip widget here to support the NFTHUB (2% fee)</p>
              {DONATION_ADDRESSES &&
                DONATION_ADDRESSES.map((info) => {
                  const isCopied = copiedChain === info.chain;

                  return (
                    <div key={info.chain} className="address-container">
                      <div className="address-box">
                        <span className="address-text">{info.chain}</span>
                        <button
                          onClick={() => copyAddress(info.chain, info.address)}
                          className="copy-btn"
                          title={isCopied ? "Copied!" : "Copy address"}
                        >
                          {isCopied ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                      </div>
                      {isCopied && (
                        <span className="copied-text">Address copied to clipboard!</span>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}