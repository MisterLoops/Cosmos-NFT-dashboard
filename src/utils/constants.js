

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
  bitcoin: "https://raw.githubusercontent.com/cosmos/chain-registry/master/_non-cosmos/bitcoin/images/btc.png",
  celestia: "https://raw.githubusercontent.com/cosmos/chain-registry/master/celestia/images/celestia.png",
  noble: "https://raw.githubusercontent.com/cosmos/chain-registry/master/_non-cosmos/ethereum/images/usdc.png",
  bINJ: "https://raw.githubusercontent.com/cosmostation/chainlist/master/chain/injective/asset/bINJ.png",
  bOSMO: "https://raw.githubusercontent.com/cosmos/chain-registry/master/osmosis/images/bOSMO.png"

};

export const IBC_TOKEN_MAPPINGS = {
  // ATOM on other chains
  'ibc/27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2': { symbol: 'ATOM', decimals: 6, originChain: 'cosmoshub' }, // ATOM on Osmosis
  'ibc/9DF365E2C0EF4EA02FA771F638BB9C0C830EFCD354629BDC017F79B348B4E989': { symbol: 'ATOM', decimals: 6, originChain: 'cosmoshub' }, // ATOM on Stargaze
  'ibc/C4CFF46FD6DE35CA4CF4CE031E643C8FDC9BA4B99AE598E9B0ED98FE3A2319F9': { symbol: 'ATOM', decimals: 6, originChain: 'cosmoshub' }, // ATOM on Injective
  'ibc/C4CFF46FD6DE35CA4CF4CE031E643C8FDC9BA4B99AE598E9B0ED98FE3A2319F9': { symbol: 'ATOM', decimals: 6, originChain: 'cosmoshub' }, // ATOM on Neutron
  'ibc/A4DB47A9D3CF9A068D454513891B526702455D3EF08FB9EB558C561F9DC2B701': { symbol: 'ATOM', decimals: 6, originChain: 'cosmoshub' }, // ATOM on Mantra

  // OSMO on other chains
  'ibc/ED07A3391A112B175915CD8FAF43A2DA8E4790EDE12566649D0C2F97716B8518': { symbol: 'OSMO', decimals: 6, originChain: 'osmosis' }, // OSMO on Stargaze
  'ibc/92E0120F15D037353CFB73C14651FC8930ADC05B93100FD7754D3A689E53B333': { symbol: 'OSMO', decimals: 6, originChain: 'osmosis' }, // OSMO on Injective
  'ibc/376222D6D9DAE23092E29740E56B758580935A6D77C24C2ABD57A6A78A1F3955': { symbol: 'OSMO', decimals: 6, originChain: 'osmosis' }, // OSMO on Neutron
  'ibc/14F9BC3E44B8A9C1BE1FB08980FAB87034C9905EF17CF2F5008FC085218811CC': { symbol: 'OSMO', decimals: 6, originChain: 'osmosis' }, // OSMO on Cosmos Hub
  'ibc/ED07A3391A112B175915CD8FAF43A2DA8E4790EDE12566649D0C2F97716B8518': { symbol: 'OSMO', decimals: 6, originChain: 'osmosis' }, // OSMO on Mantra

  // STARS on other chains  
  'ibc/987C17B11ABC2B20019178ACE62929FE9840202CE79498E29FE8E5CB02B7C0A4': { symbol: 'STARS', decimals: 6, originChain: 'stargaze' }, // STARS on Osmosis
  'ibc/F6B367385300865F654E110976B838502504231705BAC0849B0651C226385885': { symbol: 'STARS', decimals: 6, originChain: 'stargaze' }, // STARS on Cosmos Hub
  'ibc/A139C0E0B5E87CBA8EAEEB12B9BEE13AC7C814CFBBFA87BBCADD67E31003466C': { symbol: 'STARS', decimals: 6, originChain: 'stargaze' }, // STARS on Neutron
  'ibc/16E817E682AD1A73FD748BC989574B2702E109C4105550498086531FA3D6B050': { symbol: 'STARS', decimals: 6, originChain: 'stargaze' }, // STARS on Mantra

  // INJ on other chains
  'ibc/64BA6E31FE887D66C6F8F31C7B1A80C7CA179239677B4088BB55F5EA07DBE273': { symbol: 'INJ', decimals: 18, originChain: 'injective' }, // INJ on Osmosis
  'ibc/6469BDA6F62C4F4B8F76629FA1E72A02A3D1DD9E2B22DDB3C3B2296DEAD29AB8': { symbol: 'INJ', decimals: 18, originChain: 'injective' }, // INJ on Cosmos Hub

  // NTRN on other chains
  'ibc/126DA09104B71B164883842B769C0E9EC1486C0887D27A9999E395C2C8FB5682': { symbol: 'NTRN', decimals: 6, originChain: 'neutron' }, // NTRN on Osmosis
  'ibc/0025F8A87464A471E66B234C4F93AEC5B4DA3D42D7986451A059273426290DD5': { symbol: 'NTRN', decimals: 6, originChain: 'neutron' }, // NTRN on Cosmos Hub

  // AKT on other chains
  'ibc/84CF82F31F46BFBE392F50D7062BC95142F182A904BCAD3E3180C15B525444D8': { symbol: 'AKT', decimals: 6, originChain: 'akash' }, // OSMO on Stargaze
  'ibc/1480B8FD20AD5FCAE81EA87584D269547DD4D436843C1D20F15E00EB64743EF4': { symbol: 'AKT', decimals: 6, originChain: 'akash' }, // ATOM on Osmosis
  'ibc/2181AAB0218EAC24BC9F86BD1364FBBFA3E6E3FCC25E88E3E68C15DC6E752D86': { symbol: 'AKT', decimals: 6, originChain: 'akash' }, // OSMO on Cosmos Hub

  // OM on other chains
  'ibc/3BD86E80E000B52DA57C474A6A44E37F73D34E38A1FA79EE678E08D119FC555B': { symbol: 'OM', decimals: 6, originChain: 'mantra' }, // OM on Stargaze
  'ibc/775AB5A9D31074F245BB7864B7031AC7BDC9C6C0FD64A72528A8D07203CD71F3': { symbol: 'OM', decimals: 6, originChain: 'mantra' }, // OM on Injective
  'ibc/164807F6226F91990F358C6467EEE8B162E437BDCD3DADEC3F0CE20693720795': { symbol: 'OM', decimals: 6, originChain: 'mantra' }, // OM on Osmosis

  // INIT on other chains
  'ibc/DD7EA9AF1E58E9FDD7F9810976817E203D5B87BAEF7AEA592FA34DF73310620B': { symbol: 'INIT', decimals: 6, originChain: 'initia' }, // INIT on Osmosis

  // USDC on other chains
  'ibc/4A1C18CA7F50544760CF306189B810CE4C1CB156C7FC870143D401FE7280E591': { symbol: 'USDC', decimals: 6, originChain: 'noble' }, // USDC on Stargaze
  'ibc/2CBC2EA121AE42563B08028466F37B600F2D7D4282342DE938283CC3FB2BC00E': { symbol: 'USDC', decimals: 6, originChain: 'noble' }, // USDC on Injective
  'ibc/B559A80D62249C8AA07A380E2A2BEA6E5CA9A6F079C912C3A9E9B494105E4F81': { symbol: 'USDC', decimals: 6, originChain: 'noble' }, // USDC on Neutron
  'ibc/F663521BF1836B00F5F177680F74BFB9A8B5654A694D0D2BC249E03CF2509013': { symbol: 'USDC', decimals: 6, originChain: 'noble' }, // USDC on Cosmos Hub
  'ibc/65D0BEC6DAD96C7F5043D1E54E54B6BB5D5B3AEC3FF6CEBB75B9E059F3580EA3': { symbol: 'USDC', decimals: 6, originChain: 'noble' }, // USDC on Mantra

  // TIA on other chains
  'ibc/14D1406D84227FDF4B055EA5CB2298095BBCA3F3BC3EF583AE6DF36F0FB179C8': { symbol: 'TIA', decimals: 6, originChain: 'celestia' }, // TIA on Stargaze
  'ibc/14D1406D84227FDF4B055EA5CB2298095BBCA3F3BC3EF583AE6DF36F0FB179C8': { symbol: 'TIA', decimals: 6, originChain: 'celestia' }, // TIA on Osmosis

  // BTC on other chains
  'ibc/E45CFCB959F4F6D1065B7033EE49A88E606E6AD82E75725219B3D68B0FA89987': { symbol: 'BTC', decimals: 6, originChain: 'bitcoin' }, // BTC on Stargaze
  'factory/osmo1z6r6qdknhgsc0zeracktgpcxf43j6sekq07nw8sxduc9lg0qjjlqfu25e3/alloyed/allBTC': { symbol: 'BTC', decimals: 6, originChain: 'bitcoin' }, // BTC on Osmosis

  // bOSMO on Osmosis
  'factory/osmo1s3l0lcqc7tu0vpj6wdjz9wqpxv8nk6eraevje4fuwkyjnwuy82qsx3lduv/boneOsmo': { symbol: 'bOSMO', decimals: 6, originChain: 'bOSMO' }, // bOSMO on Osmosis
  
  // bINJ on Injective
  'factory/inj1dxp690rd86xltejgfq2fa7f2nxtgmm5cer3hvu/bINJ': { symbol: 'bINJ', decimals: 18, originChain: 'bINJ' }, // bINJ on Injective

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
