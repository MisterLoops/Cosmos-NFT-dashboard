import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Filter,
  Grid,
  List,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  DollarSign,
  Award,

} from "lucide-react";
import NFTCard from "./NFTCard";
import FilterPanel from "./FilterPanel";
import LoadingAnimation from "./LoadingAnimation";
import {
  fetchStargazeNFTs,
  fetchOsmosisNFTs,
  fetchInjectiveNFTs,
  fetchNeutronNFTs,
  fetchInitiaNFTs,
  fetchCosmosHubNFTs,
  fetchDungeonNFTs,
  fetchOmniFlixNFTs,
  fetchLokiNFTs
} from "../utils/fetchFunctions";
import { CHAIN_CONFIGS, CHAINS, PAGINATION_CONFIG } from "../utils/constants.js";

// Function to process image URLs, handling potential GIF and IPFS cases
const processImageUrl = (originalSrc) => {
  if (!originalSrc) return originalSrc;

  // // Check if it's a GIF
  // const isGif = originalSrc.toLowerCase().includes(".gif");

  // // Handle Stargaze image service URLs with IPFS for GIFs
  // if (
  //   isGif &&
  //   (originalSrc.includes("i.stargaze-apis.com") ||
  //     originalSrc.includes("ipfs-gw.stargaze-apis.com")) &&
  //   originalSrc.includes("ipfs://")
  // ) {
  //   const ipfsMatch = originalSrc.match(/ipfs:\/\/([a-zA-Z0-9]+\/[^)]+)/);
  //   if (ipfsMatch) {
  //     return `https://ipfs.io/ipfs/${ipfsMatch[1]}`;
  //   }
  // }

  // // Handle Stargaze IPFS gateway URLs - extract IPFS hash and use ipfs.io for better compatibility
  // if (originalSrc.includes("ipfs-gw.stargaze-apis.com/ipfs/")) {
  //   const ipfsMatch = originalSrc.match(
  //     /ipfs-gw\.stargaze-apis\.com\/ipfs\/(.+)/,
  //   );
  //   if (ipfsMatch) {
  //     return `https://ipfs.io/ipfs/${ipfsMatch[1]}`;
  //   }
  // }

  // // Handle generic IPFS URLs
  // if (originalSrc.startsWith("ipfs://")) {
  //   return originalSrc.replace("ipfs://", "https://ipfs.io/ipfs/");
  // }

  // Return original if it's not a GIF needing special handling or a non-IPFS URL
  return originalSrc;
};

export default function NFTDashboard({
  addresses,
  onAddressFetched,
  bosmoPrice,
  initPrice,
  binjPrice,
  assetPrices,
  onManualAddressRemoved,
  showDollarBalances,
  onFetchStatusChange,
  onInitialNFTLoadComplete,
  sessionKey
}) {

  const [nfts, setNfts] = useState([]);
  const [filteredNfts, setFilteredNfts] = useState([]);
  const [priceMode, setPriceMode] = useState("floor");
  const [viewMode, setViewMode] = useState("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [filtersClosing, setFiltersClosing] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [sortMenuClosing, setSortMenuClosing] = useState(false);
  const [sortBy, setSortBy] = useState("price-desc");
  const [hasLoadedNFTs, setHasLoadedNFTs] = useState(false);
  const [fetchingStatus, setFetchingStatus] = useState([]);
  const [filters, setFilters] = useState({
    chains: [],
    collections: [],
    daos: [],
    listed: false,
    staked: false,
    addresses: [],
    canBeStaked: false,
  });

  const [chainLoadingStates, setChainLoadingStates] = useState({});
  const [isManualAddressFetching, setIsManualAddressFetching] = useState(false);
  // Feedback modal state
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  // Check if manual address is fetching to show compact animation (not for initial fetch)
  const isAnyChainLoading = isManualAddressFetching;

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(PAGINATION_CONFIG.ITEMS_PER_PAGE);
  const [totalNFTs, setTotalNFTs] = useState(0);

  // Track which addresses have been fetched to avoid refetching
  const [fetchedAddresses, setFetchedAddresses] = useState(new Set());

  // Track NFTs by their source address for manual address management
  const [nftsByAddress, setNftsByAddress] = useState(new Map());

  const currentSessionRef = useRef(sessionKey);

  // Update ref whenever parent changes sessionKey
  useEffect(() => {
    currentSessionRef.current = sessionKey;
  }, [sessionKey]);

  // Add event listener for mobile filter close
  useEffect(() => {
    const handleCloseMobileFilters = () => {
      if (showFilters) {
        setFiltersClosing(true);
        setTimeout(() => {
          setShowFilters(false);
          setFiltersClosing(false);
        }, 300);
      }
    };

    window.addEventListener("closeMobileFilters", handleCloseMobileFilters);
    return () => {
      window.removeEventListener(
        "closeMobileFilters",
        handleCloseMobileFilters,
      );
    };
  }, [showFilters]);

  useEffect(() => {
    if (hasLoadedNFTs && onInitialNFTLoadComplete) {
      onInitialNFTLoadComplete(); //  notify App
    }
  }, [hasLoadedNFTs, onInitialNFTLoadComplete]);


  // Function to remove NFTs associated with a manual address
  const removeNFTsByManualAddress = useCallback(
    (chainName, manualAddress) => {
      // console.log(
      //   `[DEBUG] Removing NFTs for manual address: ${chainName}-${manualAddress}`,
      // );

      const manualAddressKey = `${chainName}-manual-${manualAddress}`;

      // Get NFTs associated with this manual address
      const nftsToRemove = nftsByAddress.get(manualAddressKey) || [];
      // console.log(
      //   `[DEBUG] Found ${nftsToRemove.length} NFTs to remove for ${manualAddressKey}`,
      // );

      // Remove NFTs from main list - use a comprehensive approach
      setNfts((prevNfts) => {
        let filteredNfts = prevNfts;

        // First, try to remove by tracked NFTs
        if (nftsToRemove.length > 0) {
          const nftIdsToRemove = new Set(
            nftsToRemove.map((nft) => `${nft.contract}-${nft.tokenId}`),
          );
          filteredNfts = filteredNfts.filter(
            (nft) => !nftIdsToRemove.has(`${nft.contract}-${nft.tokenId}`),
          );
        }

        // Also remove NFTs by sourceAddress to catch any that weren't properly tracked
        const beforeSourceFilter = filteredNfts.length;
        filteredNfts = filteredNfts.filter(
          (nft) => nft.sourceAddress !== manualAddress,
        );

        // For staked NFTs, check if we need to remove any that might have been fetched when this address was included
        // This handles cases where staked NFTs don't have the correct sourceAddress
        const chainPrefix = CHAIN_CONFIGS[chainName]?.prefix;
        if (chainPrefix && manualAddress.startsWith(chainPrefix)) {
          // Remove any remaining NFTs that could only have been fetched with this address
          // by checking if any other addresses for this chain remain
          const remainingAddressesForChain = Object.entries(addresses)
            .filter(([key, addr]) => {
              if (key === `${chainName}_manual`) return false; // Skip the manual address being removed
              return (
                (key === chainName && addr && addr.startsWith(chainPrefix)) ||
                (key.startsWith(`${chainName}_manual_`) && addr && addr.startsWith(chainPrefix))
              );
            })
            .map(([, addr]) => addr);

          // If no other addresses remain for this chain, remove all staked NFTs from this chain
          if (remainingAddressesForChain.length === 0) {
            const beforeStakedFilter = filteredNfts.length;
            filteredNfts = filteredNfts.filter(
              (nft) => !(nft.chain === chainName && nft.daoStaked === true),
            );
            if (beforeStakedFilter !== filteredNfts.length) {
              // console.log(
              //   `[DEBUG] Removed ${beforeStakedFilter - filteredNfts.length} staked NFTs from ${chainName} chain`,
              // );
            }
          }
        }

        // console.log(
        //   `[DEBUG] Reduced NFT count from ${prevNfts.length} to ${filteredNfts.length}`,
        // );
        return filteredNfts;
      });

      // Remove from address tracking
      setNftsByAddress((prev) => {
        const newMap = new Map(prev);
        newMap.delete(manualAddressKey);
        return newMap;
      });

      // Remove from fetched addresses
      setFetchedAddresses((prev) => {
        const newSet = new Set(prev);
        newSet.delete(manualAddressKey);
        return newSet;
      });

      // Notify parent component
      if (onManualAddressRemoved) {
        onManualAddressRemoved(chainName);
      }
    },
    [nftsByAddress, onManualAddressRemoved, addresses],
  );

  // Expose the removal function to parent component
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.removeNFTsByManualAddress = removeNFTsByManualAddress;
    }
  }, [removeNFTsByManualAddress]);

  // Sorting function
  const sortNFTs = (nftArray, sortType) => {
    const sorted = [...nftArray];

    switch (sortType) {
      case "price-desc":
        return sorted.sort((a, b) => {
          let priceA, priceB;

          if (priceMode === 'offers') {
            // For offers mode, prioritize NFTs with offers, then sort by offer amount
            const hasOfferA = a.hasOffer && a.highestOffer?.amountUsd;
            const hasOfferB = b.hasOffer && b.highestOffer?.amountUsd;

            if (hasOfferA && !hasOfferB) return -1;
            if (!hasOfferA && hasOfferB) return 1;

            priceA = hasOfferA ? parseFloat(a.highestOffer.amountUsd) : 0;
            priceB = hasOfferB ? parseFloat(b.highestOffer.amountUsd) : 0;
          } else {
            priceA = parseFloat(a.floor?.amountUsd) || 0;
            priceB = parseFloat(b.floor?.amountUsd) || 0;
          }

          return priceB - priceA;
        });
      case "price-asc":
        return sorted.sort((a, b) => {
          let priceA, priceB;

          if (priceMode === 'offers') {
            const hasOfferA = a.hasOffer && a.highestOffer?.amountUsd;
            const hasOfferB = b.hasOffer && b.highestOffer?.amountUsd;

            if (hasOfferA && !hasOfferB) return -1;
            if (!hasOfferA && hasOfferB) return 1;

            priceA = hasOfferA ? parseFloat(a.highestOffer.amountUsd) : 0;
            priceB = hasOfferB ? parseFloat(b.highestOffer.amountUsd) : 0;
          } else {
            priceA = parseFloat(a.floor?.amountUsd) || 0;
            priceB = parseFloat(b.floor?.amountUsd) || 0;
          }

          return priceA - priceB;
        });
      case "rarity-asc":
        return sorted.sort((a, b) => {
          const rarityA = parseInt(a.rarity) || 999999;
          const rarityB = parseInt(b.rarity) || 999999;
          return rarityA - rarityB;
        });
      case "rarity-desc":
        return sorted.sort((a, b) => {
          const rarityA = parseInt(a.rarity) || 0;
          const rarityB = parseInt(b.rarity) || 0;
          return rarityB - rarityA;
        });
      default:
        return sorted;
    }
  };

  // Handle sort change
  const handleSortChange = (newSortBy) => {
    setSortBy(newSortBy);
    setSortMenuClosing(true);
    setTimeout(() => {
      setShowSortMenu(false);
      setSortMenuClosing(false);
    }, 200);
  };

  // Sort options configuration
  const sortOptions = [
    {
      value: "price-desc",
      label: "Price High to Low",
      icon: <DollarSign size={14} />,
      arrow: <ArrowDown size={12} />,
    },
    {
      value: "price-asc",
      label: "Price Low to High",
      icon: <DollarSign size={14} />,
      arrow: <ArrowUp size={12} />,
    },
    {
      value: "rarity-asc",
      label: "Rarity Rarest to Common",
      icon: <Award size={14} />,
      arrow: <ArrowUp size={12} />,
    },
    {
      value: "rarity-desc",
      label: "Rarity Common to Rarest",
      icon: <Award size={14} />,
      arrow: <ArrowDown size={12} />,
    },
  ];

  // Get current sort option for display
  const currentSortOption = sortOptions.find(
    (option) => option.value === sortBy,
  );

  // Track if fetching is currently in progress to prevent duplicate requests
  const [isFetchingNFTs, setIsFetchingNFTs] = useState(false);

  // Track when all chains have completed fetching
  const [allChainsCompleted, setAllChainsCompleted] = useState(false);

  const fetchAllNFTs = useCallback(async () => {
    // Prevent duplicate fetching
    if (isFetchingNFTs) {
      // console.log("[DEBUG] Already fetching NFTs, skipping duplicate request");
      return;
    }
    const sessionAtStart = currentSessionRef.current;
    // console.log("[DEBUG] fetchAllNFTs called with addresses:", addresses);
    // console.log(
    //   "[DEBUG] Already fetched addresses:",
    //   Array.from(fetchedAddresses),
    // );

    // Check if there are any new addresses to fetch
    const chainsToProcess = [];
    CHAINS
      .filter(chain => !["mantra", "akash"].includes(chain.name))
      .forEach((chain) => {
        const chainAddresses = [];

        if (addresses[chain.name]) {
          const addressKey = `${chain.name}-${addresses[chain.name]}`;
          if (!fetchedAddresses.has(addressKey)) {
            chainAddresses.push({
              address: addresses[chain.name],
              type: "connected",
              key: addressKey,
            });
          }
        }

        // Handle ALL manual addresses dynamically
        Object.keys(addresses).forEach((key) => {
          if (key.startsWith(`${chain.name}_manual`) && addresses[key]) {
            const manualAddress = addresses[key];
            const addressKey = `${chain.name}-manual-${manualAddress}`;
            if (!fetchedAddresses.has(addressKey)) {
              chainAddresses.push({
                address: manualAddress,
                type: "manual",
                key: addressKey,
              });
            }

          }
        });

        if (chainAddresses.length > 0) {
          chainsToProcess.push({ chain, chainAddresses });
        }
      });

    if (chainsToProcess.length === 0) {
      // console.log("[DEBUG] No new addresses to fetch");
      return;
    }

    // Determine if we're fetching manual addresses only (for compact animation)
    const hasManualAddresses = chainsToProcess.some(({ chainAddresses }) =>
      chainAddresses.some(({ type }) => type === "manual")
    );
    const hasConnectedAddresses = chainsToProcess.some(({ chainAddresses }) =>
      chainAddresses.some(({ type }) => type === "connected")
    );

    // Set appropriate fetching state
    if (hasManualAddresses && !hasConnectedAddresses) {
      // Only manual addresses - use compact animation
      setIsManualAddressFetching(true);
    } else if (hasConnectedAddresses) {
      // Connected addresses (first fetch) - use main loading animation
      setIsFetchingNFTs(true);
      if (onFetchStatusChange) {
        onFetchStatusChange(true);
      }
    }

    // Track completed chains with a ref to avoid state update races
    let completedChains = 0;
    const totalChains = chainsToProcess.length;
    const allNfts = [];
    let hasNewNFTs = false;

    // Function to handle chain completion
    const handleChainCompletion = () => {
      completedChains++;
      console.log(`[DEBUG] Chain completed. ${completedChains}/${totalChains} chains done`);

      // Check if all chains are complete
      if (completedChains === totalChains) {
        console.log(`[DEBUG] All ${totalChains} chains completed processing`);

        // Clear fetching status
        setFetchingStatus(["..."]);

        // Clear manual address fetching state  
        setIsManualAddressFetching(false);

        // If no NFTs were found, clear loading immediately
        if (!hasNewNFTs) {
          if (hasConnectedAddresses) {
            setIsFetchingNFTs(false);
            if (onFetchStatusChange) {
              onFetchStatusChange(false);
            }
          }
          setHasLoadedNFTs(true);
          console.log(`[DEBUG] All chains completed, no NFTs found, loading cleared`);
        } else {
          console.log(`[DEBUG] All chains completed, waiting for NFTs to be processed`);
        }
      }
    };

    // Process each chain
    for (const { chain, chainAddresses } of chainsToProcess) {
      // console.log(
      //   `[DEBUG] Starting ${chain.name} fetch for ${chainAddresses.length} addresses`,
      // );

      // Set loading state for this chain
      setChainLoadingStates((prev) => ({
        ...prev,
        [chain.name]: true,
      }));

      // Update fetching status
      setFetchingStatus([`Fetching ${chain.displayName} NFTs...`]);

      try {
        // Mark addresses as fetched before trying to fetch to prevent duplicate calls
        chainAddresses.forEach(({ key, type }) => {
          setFetchedAddresses((prev) => new Set([...prev, key]));

          // Clear loading state for manual addresses
          if (type === "manual" && onAddressFetched) {
            onAddressFetched(chain.name);
          }
        });

        const chainNfts = await fetchNFTsForChain(chain, chainAddresses);
        // console.log(
        //   `[DEBUG] Found ${chainNfts.length} NFTs for ${chain.name}`,
        // );

        // Always consider the fetch successful, even if no NFTs found
        if (chainNfts.length > 0) {
          allNfts.push(...chainNfts);
          hasNewNFTs = true;
        }

        // Store NFTs by address for tracking (even if empty)
        chainAddresses.forEach(({ key, type, address }) => {
          const addressNfts = chainNfts.filter(
            (nft) => nft.sourceAddress === address,
          );
          // Always store the result, even if empty array
          setNftsByAddress((prev) => {
            const newMap = new Map(prev);
            newMap.set(key, addressNfts);
            return newMap;
          });
        });
      } catch (error) {
        console.error(`Error fetching NFTs for ${chain.name}:`, error);
        // Don't let errors prevent other chains from being processed
        // The chain will still be marked as completed below
      } finally {
        // Clear loading state for this chain
        setChainLoadingStates((prev) => ({
          ...prev,
          [chain.name]: false,
        }));

        // Handle chain completion
        handleChainCompletion();
      }
    }

    // Update NFTs only if we have new ones
    if (hasNewNFTs) {
      console.log(`[DEBUG] Total new NFTs fetched: ${allNfts.length}`);
      // Before writing results into state:
      if (currentSessionRef.current !== sessionAtStart) {
        console.log("[DEBUG] Stale fetch ignored");
        return;
      }
      // Get current NFTs and combine with new ones
      setNfts((currentNfts) => {
        const combinedNfts = [...currentNfts, ...allNfts];
        // console.log(
        //   `[DEBUG] Total NFTs before deduplication: ${combinedNfts.length}`,
        // );

        // Deduplicate NFTs by contract-tokenId combination
        const uniqueNfts = new Map();
        combinedNfts.forEach((nft) => {
          const key = `${nft.contract}-${nft.tokenId}`;
          if (!uniqueNfts.has(key)) {
            uniqueNfts.set(key, nft);
          }
        });

        const deduplicatedNfts = Array.from(uniqueNfts.values());
        // console.log(
        //   `[DEBUG] Total NFTs after deduplication: ${deduplicatedNfts.length}`,
        // );

        // Sort NFTs based on current sort setting
        const sortedNfts = sortNFTs(deduplicatedNfts, sortBy);

        // console.log(
        //   `[DEBUG] Final sorted ${sortedNfts.length} NFTs by floor price USD`,
        // );

        return sortedNfts;
      });
      // Clear loading state after NFTs are processed (if all chains completed)
      if (completedChains === totalChains && hasConnectedAddresses) {
        // Use setTimeout to ensure NFTs state update has been processed
        setTimeout(() => {
          setIsFetchingNFTs(false);
          if (onFetchStatusChange) {
            onFetchStatusChange(false);
          }
          setHasLoadedNFTs(true);
          console.log(`[DEBUG] Loading cleared after NFTs processed`);
        }, 0);
      }
    }
  }, [
    addresses,
    isFetchingNFTs,
    fetchedAddresses,
    onAddressFetched,
    onFetchStatusChange,
    sortBy,
  ]);

  // UseEffect to monitor when NFT processing is truly complete and filters can be displayed
  useEffect(() => {
    // Only change loading state when all chains are done AND NFTs are ready for filtering
    if (allChainsCompleted && isFetchingNFTs && filteredNfts.length > 0) {
      // console.log(`[DEBUG] Setting isFetchingNFTs to false - NFTs ready for filtering`);
      setIsFetchingNFTs(false);
      setAllChainsCompleted(false); // Reset for next fetch
      setHasLoadedNFTs(true); // Enable filters
      if (onFetchStatusChange) {
        onFetchStatusChange(false);
      }
    }
  }, [filteredNfts, allChainsCompleted, isFetchingNFTs, onFetchStatusChange]);

  useEffect(() => {
    // console.log("useEffect triggered for fetchAllNFTs, addresses:", addresses);
    // Check if there are any addresses (connected or manual) before fetching
    const hasAddresses = Object.keys(addresses).some(
      (key) => addresses[key] && !key.endsWith("_manual"),
    );
    const hasManualAddresses = Object.keys(addresses).some(
      (key) => addresses[key] && key.endsWith("_manual"),
    );

    if (hasAddresses || hasManualAddresses) {
      fetchAllNFTs();
    } else {
      // console.log("[DEBUG] No addresses found, resetting all NFT state.");
      setNfts([]);
      setFilteredNfts([]);
      setHasLoadedNFTs(false);
      setFetchedAddresses(new Set());
      setNftsByAddress(new Map());
      setChainLoadingStates({});
      setAllChainsCompleted(false);
      setFilters({
        chains: [],
        collections: [],
        daos: [],
        listed: false,
        staked: false,
        addresses: [],
        canBeStaked: false
      });
      setShowFilters(false);
      setFiltersClosing(false);
      setShowSortMenu(false);
      setSortMenuClosing(false);
      setSortBy("price-desc");
    }
  }, [JSON.stringify(addresses)]); // Serialize addresses to avoid reference changes

  const fetchNFTsForChain = async (chain, chainAddresses) => {
    try {
      // console.log(
      //   `[DEBUG] Fetching NFTs for chain: "${chain.name}" with ${chainAddresses.length} addresses`,
      // );
      // Don't skip if there are manual Loki addresses
      if (
        chain.name === "mantra_dukong_1" &&
        !addresses["mantra_dukong_1"] && // no connected address
        !Object.keys(addresses).some((k) =>
          k.startsWith("mantra_dukong_1_manual")
        )
      ) {
        console.log("[DEBUG] Loki chain skipped - no connected or manual address");
        return [];
      }
      // Validate addresses for this chain
      const validAddresses = [];
      const chainPrefix = CHAIN_CONFIGS[chain.name]?.prefix;

      for (const { address, type, key } of chainAddresses) {
        if (chain.name === "mantra_dukong_1" || CHAIN_CONFIGS[chain.name]?.isEvm) {
          validAddresses.push(address);
          continue;
        }
        if (chainPrefix && !address.startsWith(chainPrefix)) {
          console.warn(
            `[WARNING] Invalid address format for ${chain.name}: ${address} (should start with ${chainPrefix})`,
          );
          continue;
        }
        validAddresses.push(address);
      }

      if (validAddresses.length === 0) {
        // console.log(`[DEBUG] No valid addresses for ${chain.name}`);
        return [];
      }

      if (chain.name === "stargaze") {
        return await fetchStargazeNFTs(validAddresses);
      } else if (chain.name === "osmosis") {
        // Get current bOSMO price from props or use default
        const currentBosmoPrice = bosmoPrice || 0.2;
        return await fetchOsmosisNFTs(validAddresses, currentBosmoPrice);
      } else if (chain.name === "injective") {
        // console.log(
        //   `[DEBUG] Fetching Injective NFTs for addresses:`,
        //   validAddresses,
        // );
        // Use current bINJ price from props or use default
        const currentBinjPrice = binjPrice || 1.0;
        const injectiveNFTs = await fetchInjectiveNFTs(validAddresses, currentBinjPrice);

        // Transform NFTs to include source address for tracking and process images
        const transformedNFTs = injectiveNFTs.map((nft) => ({
          ...nft,
          image: processImageUrl(nft.image), // Use processImageUrl here
        }));

        // console.log(`[DEBUG] Found ${transformedNFTs.length} NFTs for injective`);
        return transformedNFTs;
      } else if (chain.name === "initia") {
        // console.log(
        //   `[DEBUG] Fetching Initia NFTs for addresses:`,
        //   validAddresses,
        // );
        const initiaNFTs = [];

        for (const address of validAddresses) {
          try {
            // Get current INIT price from props or use default
            const currentInitPrice = initPrice || 0.43;
            const addressNFTs = await fetchInitiaNFTs(
              address,
              currentInitPrice,
            );
            // Transform NFTs to include source address for tracking and process images
            const transformedNFTs = addressNFTs.map((nft) => ({
              ...nft,
              sourceAddress: address,
              image: nft.image, // Use original image URL for Intergaze
            }));
            initiaNFTs.push(...transformedNFTs);
          } catch (error) {
            console.error(
              `[ERROR] Error fetching Initia NFTs for ${address}:`,
              error,
            );
          }
        }
        // console.log(`[DEBUG] Found ${initiaNFTs.length} NFTs for initia`);
        return initiaNFTs;
      } else if (chain.name === "neutron") {
        // console.log(
        //   `[DEBUG] Fetching Neutron NFTs for addresses:`,
        //   validAddresses,
        // );

        try {

          const neutronNFTs = await fetchNeutronNFTs(validAddresses);
          const transformedNFTs = neutronNFTs.map((nft) => {
            let highestOfferUsd = nft.highestOffer?.amountUsd || 0;

            if (nft.highestOffer && nft.highestOffer.amount && assetPrices['NTRN']) {
              highestOfferUsd = (nft.highestOffer.amount * assetPrices['NTRN']).toFixed(2);
            }

            return {
              ...nft,
              image: processImageUrl(nft.image), // normalize image
              highestOffer: nft.highestOffer
                ? {
                  ...nft.highestOffer,
                  amountUsd: highestOfferUsd,
                }
                : null,
            };
          });

          // console.log(
          //   `[DEBUG] Found ${transformedNFTs.length} NFTs for neutron`,
          // );
          return transformedNFTs;
        } catch (error) {
          console.error(`[ERROR] Error fetching Neutron NFTs:`, error);
          return [];
        }
      } else if (chain.name === "cosmoshub") {
        // console.log(
        //   `[DEBUG] Fetching Cosmos Hub NFTs for addresses:`,
        //   validAddresses,
        // );

        try {
          const cosmosHubNFTs = await fetchCosmosHubNFTs(validAddresses);
          // Transform NFTs to include source address for tracking and process images
          const transformedNFTs = cosmosHubNFTs.map((nft) => ({
            ...nft,
            image: processImageUrl(nft.image), // Use processImageUrl here
          }));

          // console.log(
          //   `[DEBUG] Found ${transformedNFTs.length} NFTs for cosmoshub`,
          // );
          return transformedNFTs;
        } catch (error) {
          console.error(`[ERROR] Error fetching Cosmos Hub NFTs:`, error);
          return [];
        }
      } else if (chain.name === "dungeon") {
        try {
          const currentDGNPrice = assetPrices["DGN"];

          const dungeonNfts = await fetchDungeonNFTs(validAddresses, currentDGNPrice);
          // Transform NFTs to include source address for tracking and process images
          const transformedNFTs = dungeonNfts.map((nft) => ({
            ...nft,
            image: processImageUrl(nft.image), // Use processImageUrl here
          }));

          // console.log(
          //   `[DEBUG] Found ${transformedNFTs.length} NFTs for dungeon`,
          // );
          return transformedNFTs;
        } catch (error) {
          console.error(`[ERROR] Error fetching Dungeon NFTs:`, error);
          return [];
        }

      } else if (chain.name === "omniflix") {
        try {
          const omniflixHubNFTs = await fetchOmniFlixNFTs(validAddresses);

          const transformedNFTs = omniflixHubNFTs.map((nft) => {
            // normalize NFT
            const processedNFT = {
              ...nft,
              image: processImageUrl(nft.image),
            };

            // default to null
            let lastSalePriceUsd = null;

            if (
              nft.lastSalePrice &&
              nft.lastSalePrice.symbol &&
              assetPrices[nft.lastSalePrice.symbol]
            ) {
              lastSalePriceUsd =
                parseFloat(nft.lastSalePrice.amount) *
                parseFloat(assetPrices[nft.lastSalePrice.symbol]);
            }

            // attach safely
            processedNFT.lastSalePrice = {
              ...(nft.lastSalePrice || {}), // keep original fields if present
              amountUsd: lastSalePriceUsd,
            };

            // process floorPricesList
            if (nft.floor?.floorPricesList) {
              const floorList = nft.floor.floorPricesList;

              const processedFloorList = Object.fromEntries(
                Object.entries(floorList).map(([symbol, amount]) => {
                  const normalizedSymbol = String(symbol).toUpperCase(); // normalize
                  const price = assetPrices[normalizedSymbol] ?? assetPrices[symbol] ?? 0;

                  // console.log("Symbol:", symbol, "Normalized:", normalizedSymbol, "Price:", price, "assetPrices", assetPrices);
                  return [
                    symbol,
                    {
                      amount: amount,
                      amountUsd: amount * price,
                    },
                  ];
                })
              );

              processedNFT.floor.floorPricesList = processedFloorList;
            }

            return processedNFT;
          });

          return transformedNFTs;
        } catch (error) {
          console.error(`[ERROR] Error fetching Omniflix NFTs:`, error);
          return [];
        }
      } else if (chain.name === "mantra_dukong_1") {
        try {
          const allNFTs = [];

          for (const addr of validAddresses) {
            if (!addr) continue;

            const lokiNFTs = await fetchLokiNFTs(addr);

            const transformed = lokiNFTs.map((nft) => ({
              ...nft,
              sourceAddress: addr,
              image: nft.image,
            }));

            allNFTs.push(...transformed);
          }

          return allNFTs;
        } catch (error) {
          console.error(`[ERROR] Error fetching Loki NFTs:`, error);
          return [];
        }
      }


      // For other chains, return empty array for now
      // console.log(
      //   `[DEBUG] Chain ${chain.name} not implemented yet, returning empty array`,
      // );
      return [];
    } catch (error) {
      console.error(`Error fetching NFTs for ${chain.name}:`, error);
      return [];
    }
  };

  // Effect to track chain loading states and update global fetch status
  useEffect(() => {
    const anyChainLoading = Object.values(chainLoadingStates).some(
      (loading) => loading,
    );
    if (onFetchStatusChange) {
      onFetchStatusChange(anyChainLoading);
    }
  }, [chainLoadingStates, onFetchStatusChange]);

  useEffect(() => {
    applyFilters();
  }, [filters]);

  // Reset pagination when NFTs change
  useEffect(() => {
    setCurrentPage(1);
  }, [nfts]);

  // Close sort menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showSortMenu && !event.target.closest(".sort-dropdown")) {
        setSortMenuClosing(true);
        setTimeout(() => {
          setShowSortMenu(false);
          setSortMenuClosing(false);
        }, 200);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showSortMenu]);

  // Update filtered NFTs immediately when main NFT list, sort, or price mode changes
  useEffect(() => {
    const sortedNfts = sortNFTs(nfts, sortBy);
    setFilteredNfts([...sortedNfts]);
    applyFilters();
  }, [nfts, sortBy, priceMode]);

  const applyFilters = () => {
    let filtered = sortNFTs([...nfts], sortBy);

    if (filters.chains.length > 0) {
      filtered = filtered.filter((nft) => filters.chains.includes(nft.chain));
    }

    if (filters.collections.length > 0) {
      filtered = filtered.filter((nft) =>
        filters.collections.includes(nft.collection),
      );
    }

    if (filters.listed) {
      filtered = filtered.filter((nft) => nft.listed);
    }

    if (filters.staked) {
      filtered = filtered.filter(
        (nft) => nft.staked === true || nft.daoStaked === true,
      );
    }

    if (filters.canBeStaked) {
      filtered = filtered.filter(
        (nft) => nft.stakeable === true && nft.daoStaked === false
      );
    }

    if (filters.addresses && filters.addresses.length > 0) {
      filtered = filtered.filter((nft) => filters.addresses.includes(nft.sourceAddress));
    }

    // Update total count for pagination
    setTotalNFTs(filtered.length);

    // Reset to first page when filters change
    setCurrentPage(1);

    setFilteredNfts(filtered);
  };

  const getMarketplaceLink = (nft) => {
    if (nft.chain === "stargaze")
      return `https://www.stargaze.zone/m/${nft.contract}/${nft.tokenId}`;
    if (nft.chain === "osmosis")
      return `https://app.backbonelabs.io/nfts/marketplace/collections/${nft.contract}/${nft.tokenId}`;
    if (nft.chain === "injective")
      return `https://app.backbonelabs.io/nfts/marketplace/collections/${nft.contract}/${nft.tokenId}`;
    if (nft.chain === "dungeon")
      return `https://app.backbonelabs.io/nfts/marketplace/collections/${nft.contract}/${nft.tokenId}`;
    if (nft.chain === "cosmoshub")
      return `https://app.arkprotocol.io/collections/${nft.contract}/${nft.tokenId}`;
    if (nft.chain === "initia")
      return `https://intergaze.xyz/m/${nft.contract}/${nft.tokenId}`;
    if (nft.chain === "neutron")
      return `https://app.superbolt.wtf/browse/${nft.collection?.collection_id}/${nft.tokenId}`;
    if (nft.chain === "omniflix")
      return `https://omniflix.market/c/${nft.contract}/${nft.tokenId}`;
    return "#";
  };

  // Pagination helpers
  const totalPages = Math.ceil(totalNFTs / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedNFTs = filteredNfts.slice(startIndex, endIndex);

  const goToPage = (page, shouldScroll = false) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      // Only scroll when explicitly requested (for bottom pagination)
      if (shouldScroll) {
        const controls = document.querySelector('.controls');
        if (controls) {
          controls.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    }
  };

  const goToNextPage = (shouldScroll = false) => goToPage(currentPage + 1, shouldScroll);
  const goToPreviousPage = (shouldScroll = false) => goToPage(currentPage - 1, shouldScroll);

  useEffect(() => {
    localStorage.removeItem("feedbackShown", "true");
    if (hasLoadedNFTs && !localStorage.getItem("feedbackShown")) {
      const timer = setTimeout(() => {
        setShowFeedbackModal(true);
      }, 3000); // 3s after NFTs load
      return () => clearTimeout(timer);
    }
  }, [hasLoadedNFTs]);


  return (
    <div className="nft-dashboard">
      {!hasLoadedNFTs && (
        <LoadingAnimation fetchingStatus={fetchingStatus} isVisible={true} />
      )}
      {showFeedbackModal && (
        <div className="feedback-modal-overlay">
          <div className="connect-container">
            <h3 style={{ color: "white", marginBottom: "1rem" }}>Quick question</h3>
            <form
              name="feedback"
              method="POST"
              data-netlify="true"
            >
              <input type="hidden" name="form-name" value="feedback" />
              <p style={{ color: "white", marginBottom: "1.5rem" }}>
                The NFTHUB hasn't received much support through donations so far...
              </p>
              <p style={{ color: "white", marginBottom: "1.5rem", fontWeight: "bold" }}>
                Would you mint a $5 NFT to support my work on the NFTHUB, be an OG early supporter and access exclusive features?
              </p>


              <div style={{ display: "flex", justifyContent: "space-around" }}>
                <button
                  type="submit"
                  name="answer"
                  value="Yes"
                  className="feedback-btn"
                  onClick={() => {
                    localStorage.setItem("feedbackShown", "true");
                    setShowFeedbackModal(false);
                  }}
                >
                  Yes
                </button>
                <button
                  type="submit"
                  name="answer"
                  value="No"
                  className="feedback-btn"
                  onClick={() => {
                    localStorage.setItem("feedbackShown", "true");
                    setShowFeedbackModal(false);
                  }}
                >
                  No
                </button>
              </div>
            </form>

            <div className="feedback-footer">
              <p style={{ color: "white", marginBottom: "1.5rem", fontStyle: "italic" }}>
                In any case,  the NFTHUB will always remain freely accessible.
              </p>
              <a
                href="https://x.com/MisterLoops"
                target="_blank"
                rel="noopener noreferrer"
              >
                Reach out to me on X for feedback or more infos...
              </a>
            </div>
          </div>
        </div>
      )}
      <div className="dashboard-header">
        {isAnyChainLoading ? (
          <div className="stats" style={{ position: 'relative' }}>
            <div className="compact-loading-container">
              <div className="compact-loading-animation">
                <div className="compact-atom-container">
                  {/* Central nucleus */}
                  <div className="compact-atom-nucleus"></div>

                  {/* Electron orbits */}
                  <div className="compact-electron-orbit compact-orbit-1" style={{ '--orbit-delay': '0s', '--orbit-duration': '2s' }}>
                    <div className="compact-electron"></div>
                  </div>
                  <div className="compact-electron-orbit compact-orbit-2" style={{ '--orbit-delay': '0.3s', '--orbit-duration': '2.5s' }}>
                    <div className="compact-electron"></div>
                  </div>
                  <div className="compact-electron-orbit compact-orbit-3" style={{ '--orbit-delay': '0.6s', '--orbit-duration': '3s' }}>
                    <div className="compact-electron"></div>
                  </div>
                </div>

                {/* Loading status */}
                {Object.entries(chainLoadingStates)
                  .filter(([chainName, isLoading]) => isLoading)
                  .map(([chainName, isLoading]) => (
                    <div key={chainName} className="compact-loading-text">
                      Fetching {CHAINS.find((c) => c.name === chainName)?.displayName || chainName} NFTs...
                    </div>
                  ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="stats">
            <div className="stat" title={priceMode === 'offers' ? 'Highest Offers' : 'Floor Prices'}>
              <span className={priceMode === 'offers' ? "stat-value offers-mode" : "stat-value"}>
                {showDollarBalances ? (
                  `$${nfts
                    .reduce((total, nft) => {
                      let price = 0;
                      if (priceMode === 'offers' && nft.hasOffer && nft.highestOffer?.amountUsd) {
                        price = parseFloat(nft.highestOffer.amountUsd);
                      } else if (priceMode === 'floor') {
                        price = parseFloat(nft.floor?.amountUsd) || 0;
                      }
                      return total + price;
                    }, 0)
                    .toLocaleString("en-US", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}`
                ) : (

                  "*****"
                )}
              </span>
              <span className="stat-label">NFTs Total Value</span>
              <span className={`stat-sublabel ${priceMode === 'offers' ? 'offers-mode' : ''}`}>{priceMode === 'offers' ? 'Highest Offers' : 'Floor Prices'}</span>
            </div>
            <div className="stat">
              <span className={priceMode === 'offers' ? "stat-value offers-mode" : "stat-value"}>
                {nfts.length}
              </span>
              <span className="stat-label">NFTs</span>
            </div>
            <div className="stat">
              <span className={priceMode === 'offers' ? "stat-value offers-mode" : "stat-value"}>
                {new Set(nfts.map((n) => n.chain)).size}
              </span>
              <span className="stat-label">Chains</span>
            </div>
            <div className="stat">
              <span className={priceMode === 'offers' ? "stat-value offers-mode" : "stat-value"}>
                {new Set(nfts.map((n) => n.collection)).size}
              </span>
              <span className="stat-label">Collections</span>
            </div>
          </div>
        )}

        {/* Price Mode Slider */}
        {hasLoadedNFTs && (
          <div className="price-mode-slider">
            <div className="slider-container">
              <span className={`slider-label ${priceMode === 'floor' ? 'active' : ''}`}>
                Floor Prices
              </span>
              <button
                className="slider-toggle"
                onClick={() => setPriceMode(priceMode === 'floor' ? 'offers' : 'floor')}
              >
                <div className={`slider-track ${priceMode === 'offers' ? 'offers-mode' : 'floor-mode'}`}>
                  <div className="slider-thumb"></div>
                </div>
              </button>
              <span className={`slider-label ${priceMode === 'offers' ? 'active' : ''}`}>
                Highest Offers
              </span>
            </div>
          </div>
        )}

        <div className="controls">
          <button
            onClick={() => {
              if (!hasLoadedNFTs) return;

              if (showFilters) {
                setFiltersClosing(true);
                setTimeout(() => {
                  setShowFilters(false);
                  setFiltersClosing(false);
                }, 300);
              } else {
                setShowFilters(true);
              }
            }}
            className={`filter-btn ${showFilters ? "active" : ""} ${!hasLoadedNFTs ? "disabled" : ""}`}
            disabled={!hasLoadedNFTs}
          >
            <Filter size={16} />
            Filters
          </button>

          <div className="sort-dropdown">
            <button
              onClick={() => {
                if (showSortMenu) {
                  setSortMenuClosing(true);
                  setTimeout(() => {
                    setShowSortMenu(false);
                    setSortMenuClosing(false);
                  }, 200);
                } else {
                  setShowSortMenu(true);
                }
              }}
              className={`sort-btn ${showSortMenu ? "active" : ""}`}
            >
              <ArrowUpDown size={16} />
              <span className="sort-label">
                {currentSortOption?.icon}
                {currentSortOption?.arrow}
              </span>
            </button>

            {(showSortMenu || sortMenuClosing) && (
              <div className={`sort-menu ${sortMenuClosing ? "closing" : ""}`}>
                {sortOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleSortChange(option.value)}
                    className={`sort-option ${sortBy === option.value ? "active" : ""}`}
                  >
                    <div className="sort-option-content">
                      <div className="sort-option-icons">
                        {option.icon}
                        {option.arrow}
                      </div>
                      <span>{option.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="view-controls">
            <button
              onClick={() => setViewMode("grid")}
              className={viewMode === "grid" ? "active" : ""}
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={viewMode === "list" ? "active" : ""}
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Active Filters Display */}
      {hasLoadedNFTs && (
        <div className="applied-filters-section">
          {(filters.chains.length > 0 ||
            filters.collections.length > 0 ||
            filters.listed ||
            filters.staked ||
            (filters.addresses && filters.addresses.length > 0)) ? (
            <div className="filter-tags-container">
              {filters.chains.map((chain) => (
                <div
                  key={chain}
                  className="filter-tag-pill"
                  onClick={() =>
                    setFilters({
                      ...filters,
                      chains: filters.chains.filter((c) => c !== chain),
                    })
                  }
                >
                  <span className="filter-tag-text">
                    {chain.charAt(0).toUpperCase() + chain.slice(1)}
                  </span>
                  <span className="filter-tag-icon">×</span>
                </div>
              ))}

              {filters.collections.map((collection) => (
                <div
                  key={collection}
                  className="filter-tag-pill"
                  onClick={() =>
                    setFilters({
                      ...filters,
                      collections: filters.collections.filter(
                        (c) => c !== collection,
                      ),
                    })
                  }
                >
                  <span className="filter-tag-text">{collection}</span>
                  <span className="filter-tag-icon">×</span>
                </div>
              ))}

              {filters.listed && (
                <div
                  className="filter-tag-pill"
                  onClick={() => setFilters({ ...filters, listed: false })}
                >
                  <span className="filter-tag-text">Listed for Sale</span>
                  <span className="filter-tag-icon">×</span>
                </div>
              )}

              {filters.staked && (
                <div
                  className="filter-tag-pill"
                  onClick={() => setFilters({ ...filters, staked: false })}
                >
                  <span className="filter-tag-text">Staked in DAOs</span>
                  <span className="filter-tag-icon">×</span>
                </div>
              )}

              {filters.canBeStaked && (
                <div
                  className="filter-tag-pill"
                  onClick={() => setFilters({ ...filters, canBeStaked: false })}
                >
                  <span className="filter-tag-text">Staked in DAOs</span>
                  <span className="filter-tag-icon">×</span>
                </div>
              )}

              {filters.addresses &&
                filters.addresses.map((address) => {
                  const processedAddress = String(address).trim(); // process inside the function body

                  return (
                    <div
                      key={processedAddress}
                      className="filter-tag-pill"
                      onClick={() =>
                        setFilters({
                          ...filters,
                          addresses: filters.addresses.filter((a) => a !== address),
                        })
                      }
                    >
                      <span className="filter-tag-text">
                        {processedAddress.length > 16
                          ? `${processedAddress.slice(0, 6)}...${processedAddress.slice(-4)}`
                          : processedAddress}
                      </span>
                      <span className="filter-tag-icon">×</span>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="filter-tags-container">
              <div className="no-filters-pill">
                <span className="no-filters-text">No Filter</span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="dashboard-content">

        {(showFilters || filtersClosing) && (
          <div
            className={`filter-panel-container ${showFilters && !filtersClosing ? "visible" : ""
              } ${filtersClosing ? "closing" : ""}`}
          >
            <FilterPanel
              filters={filters}
              setFilters={setFilters}
              nfts={nfts}
              priceMode={priceMode}
            />
          </div>
        )}

        <div className="nft-content-area">
          {currentPage > 1 && (
            <div className="pagination-container">
              <div className="pagination-info">
                Showing {startIndex + 1}-{Math.min(endIndex, totalNFTs)} of {totalNFTs} NFTs
              </div>
              <div className="pagination-controls">
                <button
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                  className="pagination-btn"
                >
                  Previous
                </button>

                <div className="pagination-pages">
                  {/* Show first page */}
                  {currentPage > 3 && (
                    <>
                      <button onClick={() => goToPage(1)} className="pagination-btn">1</button>
                      {currentPage > 4 && <span className="pagination-dots">...</span>}
                    </>
                  )}

                  {/* Show pages around current page */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = Math.max(1, Math.min(currentPage - 2 + i, totalPages - 4 + i + 1));
                    if (pageNum > totalPages) return null;
                    if (currentPage <= 3) {
                      const page = i + 1;
                      if (page > totalPages) return null;
                      return (
                        <button
                          key={page}
                          onClick={() => goToPage(page)}
                          className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                        >
                          {page}
                        </button>
                      );
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => goToPage(pageNum)}
                        className={`pagination-btn ${currentPage === pageNum ? 'active' : ''}`}
                      >
                        {pageNum}
                      </button>
                    );
                  }).filter(Boolean)}

                  {/* Show last page */}
                  {currentPage < totalPages - 2 && totalPages > 5 && (
                    <>
                      {currentPage < totalPages - 3 && <span className="pagination-dots">...</span>}
                      <button onClick={() => goToPage(totalPages)} className="pagination-btn">{totalPages}</button>
                    </>
                  )}
                </div>

                <button
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  className="pagination-btn"
                >
                  Next
                </button>
              </div>
            </div>)}
          <div className={`nft-grid ${viewMode}`}>
            {paginatedNFTs.map((nft, index) => (
              // console.log(nft),
              <NFTCard
                key={`${nft.contract}-${nft.tokenId}`}
                nft={nft}
                marketplaceLink={getMarketplaceLink(nft)}
                viewMode={viewMode}
                priceMode={priceMode}
              />
            ))}
          </div>

          {filteredNfts.length === 0 &&
            !Object.values(chainLoadingStates).some((loading) => loading) && (
              <div className="empty-state">
                <p>No NFTs found matching your criteria</p>
              </div>
            )}

          {/* Pagination Controls */}
          {totalNFTs > itemsPerPage && (
            <div className="pagination-container">
              <div className="pagination-info">
                Showing {startIndex + 1}-{Math.min(endIndex, totalNFTs)} of {totalNFTs} NFTs
              </div>
              <div className="pagination-controls">
                <button
                  onClick={() => goToPreviousPage(true)}
                  disabled={currentPage === 1}
                  className="pagination-btn"
                >
                  Previous
                </button>

                <div className="pagination-pages">
                  {/* Show first page */}
                  {currentPage > 3 && (
                    <>
                      <button onClick={() => goToPage(1, true)} className="pagination-btn">1</button>
                      {currentPage > 4 && <span className="pagination-dots">...</span>}
                    </>
                  )}

                  {/* Show pages around current page */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = Math.max(1, Math.min(currentPage - 2 + i, totalPages - 4 + i + 1));
                    if (pageNum > totalPages) return null;
                    if (currentPage <= 3) {
                      const page = i + 1;
                      if (page > totalPages) return null;
                      return (
                        <button
                          key={page}
                          onClick={() => goToPage(page, true)}
                          className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                        >
                          {page}
                        </button>
                      );
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => goToPage(pageNum, true)}
                        className={`pagination-btn ${currentPage === pageNum ? 'active' : ''}`}
                      >
                        {pageNum}
                      </button>
                    );
                  }).filter(Boolean)}

                  {/* Show last page */}
                  {currentPage < totalPages - 2 && totalPages > 5 && (
                    <>
                      {currentPage < totalPages - 3 && <span className="pagination-dots">...</span>}
                      <button onClick={() => goToPage(totalPages, true)} className="pagination-btn">{totalPages}</button>
                    </>
                  )}
                </div>

                <button
                  onClick={() => goToNextPage(true)}
                  disabled={currentPage === totalPages}
                  className="pagination-btn"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>


    </div>
  );
}