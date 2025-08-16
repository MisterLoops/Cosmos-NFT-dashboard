

// API endpoints and configuration constants
export const API_ENDPOINTS = {
  STARGAZE_GRAPHQL: "https://graphql.mainnet.stargaze-apis.com/graphql",
  IPFS_GATEWAY_PRIMARY: "https://ipfs.io/ipfs/",
  IPFS_GATEWAY_NFT_STORAGE: "https://nft-storage.b-cdn.net/ipfs/",
  INTERGAZE_API: "https://api.intergaze-apis.com/api/v1",
  BACKBONE_LABS_API: "https://warlock.backbonelabs.io/api/v1",
  SUPERBOLT_API: "https://api.superbolt.wtf/api/graphql",
  IPFS_DAO_DAO_ZONE: "https://ipfs.dao.daodao.zone/ipfs/",
  DAO_DAO_INDEXER: "https://indexer.daodao.zone",
  NEUTRON_INDEXER: "https://rest-kralum.neutron-1.neutron.org",
  STARGAZE_INDEXER: "https://rest.stargaze-apis.com",
  OSMOSIS_LCD: "https://lcd-osmosis.keplr.app",
  COSMOS_HUB_LCD: "https://lcd-cosmoshub.keplr.app",
  BOSMO_API: "https://warlock.backbonelabs.io/api/v1/references/token/offchain-oracle/bosmo",
  BINJ_API: "https://warlock.backbonelabs.io/api/v1/references/token/offchain-oracle/binj",
  LLAMA_FI_INITIA: "https://coins.llama.fi/prices/current/coingecko:initia",
  COINGECKO_INITIA: "https://api.coingecko.com/api/v3/simple/price?ids=initia&vs_currencies=usd",
  COINGECKO_SIMPLE_PRICE: "https://api.coingecko.com/api/v3/simple/price",
  LLAMA_FI_BASE: "https://coins.llama.fi/prices/current/coingecko:",
  MANTRA_LCD: "https://api.mantrachain.io",
};

export const CORS_PROXIES = [
  "https://corsproxy.io/?",
  "https://cors-anywhere.herokuapp.com/",
  "https://api.codetabs.com/v1/proxy?quest=",
  "https://thingproxy.freeboard.io/fetch/"
];

export const REQUEST_CONFIG = {
  TIMEOUT: 10000, // 15 seconds
  MAX_RETRIES: 3,
  RETRY_DELAY_BASE: 2000, // 2 seconds
  MAX_RETRY_DELAY: 10000, // 10 seconds
};

// Consolidated chain configuration - single source of truth
export const CHAIN_CONFIGS = {
  stargaze: { 
    chainId: "stargaze-1", 
    prefix: "stars",
    displayName: "Stargaze",
    rpc: "https://rpc.stargaze-apis.com",
    rest: "https://lcd-stargaze.keplr.app",
    denom: "ustars",
    symbol: "STARS",
    decimals: 6,
  },
  osmosis: { 
    chainId: "osmosis-1", 
    prefix: "osmo",
    displayName: "Osmosis",
    rpc: "https://rpc.osmosis.zone",
    rest: "https://lcd-osmosis.keplr.app",
    denom: "uosmo",
    symbol: "OSMO",
    decimals: 6,
  },
  cosmoshub: { 
    chainId: "cosmoshub-4", 
    prefix: "cosmos",
    displayName: "Cosmos Hub",
    rpc: "https://rpc.cosmos.network",
    rest: "https://lcd-cosmoshub.keplr.app",
    denom: "uatom",
    symbol: "ATOM",
    decimals: 6,
  },
  injective: { 
    chainId: "injective-1", 
    prefix: "inj",
    displayName: "Injective",
    rpc: "https://sentry.tm.injective.network:443",
    rest: "https://lcd-injective.keplr.app",
    denom: "inj",
    symbol: "INJ",
    decimals: 18,
  },
  initia: { 
    chainId: "interwoven-1", 
    prefix: "init",
    displayName: "Intergaze",
    rpc: "https://rpc.initia.xyz",
    rest: "https://lcd-initia.keplr.app",
    denom: "uinit",
    symbol: "INIT",
    decimals: 6,
  },
  neutron: { 
    chainId: "neutron-1", 
    prefix: "neutron",
    displayName: "Neutron",
    rpc: "https://rpc.neutron.org",
    rest: "https://lcd-neutron.keplr.app",
    denom: "untrn",
    symbol: "NTRN",
    decimals: 6,
  },
  mantra: { 
    chainId: "mantra-1", 
    prefix: "mantra",
    displayName: "Mantra",
    rpc: "https://rpc.mantrachain.io",
    rest: "https://api.mantrachain.io",
    denom: "uom",
    symbol: "OM",
    decimals: 6,
  },
  akash: { 
    chainId: "akashnet-2", 
    prefix: "akash",
    displayName: "Akash",
    rpc: "https://rpc.akash.forbole.com",
    rest: "https://lcd-akash.keplr.app",
    denom: "uakt",
    symbol: "AKT",
    decimals: 6,
  },
};

// Token logos from Keplr's chain registry
export const TOKEN_LOGOS = {
  stargaze: "https://raw.githubusercontent.com/cosmos/chain-registry/master/stargaze/images/stars.png",
  osmosis: "https://raw.githubusercontent.com/cosmos/chain-registry/master/osmosis/images/osmo.png",
  cosmoshub: "https://raw.githubusercontent.com/cosmos/chain-registry/master/cosmoshub/images/atom.png",
  injective: "https://raw.githubusercontent.com/cosmos/chain-registry/master/injective/images/inj.png",
  initia: "https://registry.initia.xyz/images/INIT.png",
  neutron: "https://raw.githubusercontent.com/cosmos/chain-registry/master/neutron/images/ntrn.png",
  mantra: "https://raw.githubusercontent.com/cosmos/chain-registry/master/mantrachain/images/OM-Prim-Col.svg",
  akash: "https://raw.githubusercontent.com/cosmos/chain-registry/master/akash/images/akt.png",
};

// Derived configurations from CHAIN_CONFIGS
export const CHAIN_ENDPOINTS = Object.fromEntries(
  Object.entries(CHAIN_CONFIGS).map(([key, config]) => [
    key,
    {
      rest: config.rest,
      denom: config.denom,
      symbol: config.symbol,
      decimals: config.decimals,
    }
  ])
);

export const CHAINS = Object.entries(CHAIN_CONFIGS).map(([key, config]) => ({
  name: key,
  displayName: config.displayName,
  rpc: config.rpc,
  rest: config.rest,
}));

// Marketplace configurations
export const MARKETPLACES = {
  stargaze: "https://app.stargaze.zone/media",
  backbonelabs: "https://app.backbonelabs.io",
  talis: "https://talis.art",
  intergaze: "https://intergaze.io",
};

// Pagination configuration
export const PAGINATION_CONFIG = {
  ITEMS_PER_PAGE: 50,
  BACKBONE_API_PER_PAGE: 100, // Per page for backbone API requests (listed and not_listed NFTs)
};

export const DONATION_ADDRESS = "stars1d2y72xglnyrphze97kqfmccysdqpf4996srcyj";
