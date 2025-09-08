

// API endpoints and configuration constants
export const API_ENDPOINTS = {
  STARGAZE_GRAPHQL: "https://graphql.mainnet.stargaze-apis.com/graphql",
  IPFS_GATEWAY_PRIMARY: "https://ipfs.io/ipfs/",
  IPFS_GATEWAY_NFT_STORAGE: "https://nft-storage.b-cdn.net/ipfs/",
  INTERGAZE_API: "https://api.intergaze-apis.com/api/v1",
  BACKBONE_LABS_API: "https://warlock.backbonelabs.io/api/v1",
  SUPERBOLT_API: "https://api.superbolt.wtf/api/graphql",
  OMNIFLIX_API:"https://data-api.omniflix.studio",
  OMNIFLIX_ACTIVITY_API:"https://activity-api.omniflix.studio",
  IPFS_DAO_DAO_ZONE: "https://ipfs.dao.daodao.zone/ipfs/",
  DAO_DAO_INDEXER: "https://indexer.daodao.zone",
  NEUTRON_INDEXER: "https://rest-kralum.neutron-1.neutron.org",
  STARGAZE_INDEXER: "https://lcd-stargaze.keplr.app",
  OSMOSIS_LCD: "https://lcd-osmosis.keplr.app",
  COSMOS_HUB_LCD: "https://lcd-cosmoshub.keplr.app",
  INJECTIVE_LCD: "https://lcd-injective.keplr.app",
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
  dungeon: {
    chainId: "dungeon-1",
    prefix: "dungeon",
    displayName: "Dungeon",
    rpc: "https://dungeon-wallet.rpc.quasarstaking.ai:443",
    rest: "https://dungeon-wallet.api.quasarstaking.ai",
    denom: "udgn",
    symbol: "DGN",
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
  omniflix: {
    chainId: "omniflixhub-1",
    prefix: "omniflix",
    displayName: "OmniFlix",
    rpc: "https://rpc-omniflixhub.keplr.app",
    rest: "https://lcd-omniflixhub.keplr.app",
    denom: "uflix",
    symbol: "FLIX",
    decimals: 6,
  },
  mantra_dukong_1: {
    chainId: "mantra-dukong-1",
    prefix: null, // EVM chains don't use bech32 prefixes
    displayName: "Loki (Mantra Dukong)",
    rpc: "https://rpc.dukong.testnet.mantrachain.io",
    rest: null, // EVM chains typically use JSON-RPC instead of REST
    evmRpc: "https://rpc.dukong.testnet.mantrachain.io", // EVM JSON-RPC endpoint
    denom: "uom",
    symbol: "OM",
    decimals: 18, // EVM chains typically use 18 decimals
    isEvm: true, // Flag to indicate this is an EVM chain
    networkType: "testnet"
  }
};
export const SYMBOL_TO_LOGO = {
  "STARS": "stargaze",
  "OSMO": "osmosis",
  "ATOM": "cosmoshub",
  "INJ": "injective",
  "INIT": "initia",
  "NTRN": "neutron",
  "OM": "mantra",
  "AKT": "akash",
  "BTC": "bitcoin",
  "TIA": "celestia",
  "USDC": "noble",
  "bINJ": "bINJ",
  "bOSMO": "bOSMO",
  "LAB": "LAB",
  "BIKE": "BIKE",
  "DGN": "dungeon",
  "FLIX": "omniflix",
  "SPICE": "SPICE",
  "YGATA": "YGATA"
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
  bOSMO: "https://raw.githubusercontent.com/cosmos/chain-registry/master/osmosis/images/bOSMO.png",
  LAB: "https://raw.githubusercontent.com/cosmos/chain-registry/master/osmosis/images/LAB.png",
  BIKE: "https://raw.githubusercontent.com/cosmostation/chainlist/master/chain/mantra/asset/BIKE.png",
  dungeon:"https://raw.githubusercontent.com/cosmos/chain-registry/master/dungeon/images/DGN.png",
  omniflix: "https://raw.githubusercontent.com/cosmos/chain-registry/master/omniflixhub/images/flix.png",
  SPICE: "https://raw.githubusercontent.com/cosmos/chain-registry/master/osmosis/images/spice.png",
  YGATA: "https://raw.githubusercontent.com/cosmos/chain-registry/master/omniflixhub/images/ygata.png"
};

export const IBC_TOKEN_MAPPINGS = {
  // ATOM on other chains
  'ibc/27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2': { symbol: 'ATOM', decimals: 6, originChain: 'cosmoshub' }, // ATOM on Osmosis
  'ibc/9DF365E2C0EF4EA02FA771F638BB9C0C830EFCD354629BDC017F79B348B4E989': { symbol: 'ATOM', decimals: 6, originChain: 'cosmoshub' }, // ATOM on Stargaze
  'ibc/C4CFF46FD6DE35CA4CF4CE031E643C8FDC9BA4B99AE598E9B0ED98FE3A2319F9': { symbol: 'ATOM', decimals: 6, originChain: 'cosmoshub' }, // ATOM on Injective
  'ibc/C4CFF46FD6DE35CA4CF4CE031E643C8FDC9BA4B99AE598E9B0ED98FE3A2319F9': { symbol: 'ATOM', decimals: 6, originChain: 'cosmoshub' }, // ATOM on Neutron
  'ibc/A4DB47A9D3CF9A068D454513891B526702455D3EF08FB9EB558C561F9DC2B701': { symbol: 'ATOM', decimals: 6, originChain: 'cosmoshub' }, // ATOM on Mantra
  'ibc/A8C2D23A1E6F95DA4E48BA349667E322BD7A6C996D8A4AAE8BA72E190F3D1477': { symbol: 'ATOM', decimals: 6, originChain: 'cosmoshub' }, // ATOM on Omniflix

  // OSMO on other chains
  'ibc/ED07A3391A112B175915CD8FAF43A2DA8E4790EDE12566649D0C2F97716B8518': { symbol: 'OSMO', decimals: 6, originChain: 'osmosis' }, // OSMO on Stargaze
  'ibc/92E0120F15D037353CFB73C14651FC8930ADC05B93100FD7754D3A689E53B333': { symbol: 'OSMO', decimals: 6, originChain: 'osmosis' }, // OSMO on Injective
  'ibc/376222D6D9DAE23092E29740E56B758580935A6D77C24C2ABD57A6A78A1F3955': { symbol: 'OSMO', decimals: 6, originChain: 'osmosis' }, // OSMO on Neutron
  'ibc/14F9BC3E44B8A9C1BE1FB08980FAB87034C9905EF17CF2F5008FC085218811CC': { symbol: 'OSMO', decimals: 6, originChain: 'osmosis' }, // OSMO on Cosmos Hub
  'ibc/ED07A3391A112B175915CD8FAF43A2DA8E4790EDE12566649D0C2F97716B8518': { symbol: 'OSMO', decimals: 6, originChain: 'osmosis' }, // OSMO on Mantra
  'ibc/0471F1C4E7AFD3F07702BEF6DC365268D64570F7C1FDC98EA6098DD6DE59817B': { symbol: 'OSMO', decimals: 6, originChain: 'osmosis' }, // OSMO on Omniflix

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
  'ibc/84CF82F31F46BFBE392F50D7062BC95142F182A904BCAD3E3180C15B525444D8': { symbol: 'AKT', decimals: 6, originChain: 'akash' }, // AKT on Stargaze
  'ibc/1480B8FD20AD5FCAE81EA87584D269547DD4D436843C1D20F15E00EB64743EF4': { symbol: 'AKT', decimals: 6, originChain: 'akash' }, // AKT on Osmosis
  'ibc/2181AAB0218EAC24BC9F86BD1364FBBFA3E6E3FCC25E88E3E68C15DC6E752D86': { symbol: 'AKT', decimals: 6, originChain: 'akash' }, // AKT on Cosmos Hub
  'ibc/6901B45BC2C5418ED8B3C3C9F9A641A3DAF2D234230AFA9DF32D8F9F9434721C': { symbol: 'AKT', decimals: 6, originChain: 'akash' }, // AKT on Omniflix

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
  'ibc/F47D6F6C38DC1B5B72FFB71CC4D8A12FC4C57A5A79BAFA65286723D56B85197D': { symbol: 'USDC', decimals: 6, originChain: 'noble' }, // USDC on Omniflix

  // TIA on other chains
  'ibc/14D1406D84227FDF4B055EA5CB2298095BBCA3F3BC3EF583AE6DF36F0FB179C8': { symbol: 'TIA', decimals: 6, originChain: 'celestia' }, // TIA on Stargaze
  'ibc/14D1406D84227FDF4B055EA5CB2298095BBCA3F3BC3EF583AE6DF36F0FB179C8': { symbol: 'TIA', decimals: 6, originChain: 'celestia' }, // TIA on Osmosis

  // BTC on other chains
  'ibc/E45CFCB959F4F6D1065B7033EE49A88E606E6AD82E75725219B3D68B0FA89987': { symbol: 'BTC', decimals: 8, originChain: 'bitcoin' }, // BTC on Stargaze
  'factory/osmo1z6r6qdknhgsc0zeracktgpcxf43j6sekq07nw8sxduc9lg0qjjlqfu25e3/alloyed/allBTC': { symbol: 'BTC', decimals: 8, originChain: 'bitcoin' }, // BTC on Osmosis

  // bOSMO on Osmosis
  'factory/osmo1s3l0lcqc7tu0vpj6wdjz9wqpxv8nk6eraevje4fuwkyjnwuy82qsx3lduv/boneOsmo': { symbol: 'bOSMO', decimals: 6, originChain: 'bOSMO' }, // bOSMO on Osmosis

  // LAB
  'factory/osmo17fel472lgzs87ekt9dvk0zqyh5gl80sqp4sk4n/LAB': { symbol: 'LAB', decimals: 6, originChain: 'LAB' }, // LAB on Osmosis
  'ibc/93B1AE0AD5E88242745B245064A2A51DDA1319C18176A966D5F8F9E02ED5373E': { symbol: 'LAB', decimals: 6, originChain: 'LAB' }, // LAB on Stargaze
  'ibc/1C1C7D78176056F3ADD028904EF29BD966F7A3F01526FDBDAC3AFB376A59733D': { symbol: 'LAB', decimals: 6, originChain: 'LAB' }, // LAB on Cosmoshub
  'ibc/C1F4520E07B9190EA08FBAA5E1D68109B9738B5B717904C62F0EE9CA89471EC0': { symbol: 'LAB', decimals: 6, originChain: 'LAB' }, // LAB on Neutron
  'ibc/18B0967BE3E73DCCE3F10EDE6DEFC472AAA3339DBE536E77C0B8E7BCE2628966': { symbol: 'LAB', decimals: 6, originChain: 'LAB' }, // LAB on Omniflix
  
  // bINJ on Injective
  'factory/inj1dxp690rd86xltejgfq2fa7f2nxtgmm5cer3hvu/bINJ': { symbol: 'bINJ', decimals: 18, originChain: 'bINJ' }, // bINJ on Injective

  // BIKE
  'factory/mantra1vtpg8z82gz9qe3adf7t9z0qwuvkpzmqu9ds4ej/BIKE': { symbol: 'BIKE', decimals: 6, originChain: 'BIKE' }, // BIKE on Mantra
  'ibc/512F2595204C4BCAC1C000A394CAB9529A4E519C97ED465B9230B563D2D4AFBA': { symbol: 'BIKE', decimals: 6, originChain: 'BIKE' }, // BIKE on Osmosis
  'ibc/8A443E18BB2C30A0D635569935BB0364018EA97A372ADA5D7145378A40D3D967': { symbol: 'BIKE', decimals: 6, originChain: 'BIKE' }, // BIKE on Stargaze

  // Dungeon on other chains
  'ibc/CD6412358F33B372A355CF22786D8C19477C15092B56BD56188679EED8556964': { symbol: 'DGN', decimals: 6, originChain: 'dungeon' }, // DGN on Osmosis

  // FLIX on other chains
  'ibc/0F6E0D58BBFB4B45376D19508D1C0A0156FB57DF25631071158C7B5B55D5D09E': { symbol: 'FLIX', decimals: 6, originChain: 'omniflix' }, // FLIX on Akash
  'ibc/15B4D31D457B80DD46CA46F6B89FD6BB15CB92FE7BBF8763947417537C3A4C2E': { symbol: 'FLIX', decimals: 6, originChain: 'omniflix' }, // FLIX on Cosmos Hub
  'ibc/CEE970BB3D26F4B907097B6B660489F13F3B0DA765B83CC7D9A0BC0CE220FA6F': { symbol: 'FLIX', decimals: 6, originChain: 'omniflix' }, // FLIX on Osmosis

  // Spice
  'ibc/ADD33E9703A911023E73181FCA39B022094A1832F0C2311152A927E580E28B5F': { symbol: 'SPICE', decimals: 6, originChain: 'SPICE' }, // SPICE on Omniflix
  'factory/osmo1n6asrjy9754q8y9jsxqf557zmsv3s3xa5m9eg5/uspice': { symbol: 'SPICE', decimals: 6, originChain: 'SPICE' }, // SPICE on Osmosis
  'ibc/61E1AE07E1436FB9F5F600D01CCE2842182A8C7A51B38B3D5CE015EB727522FF': { symbol: 'SPICE', decimals: 6, originChain: 'SPICE' }, // SPICE on Akash
  'ibc/A0D3A4A443E253817F949EBE4BB3FC2B4DADDF103766397A85B7CF84E67B4F4B': { symbol: 'SPICE', decimals: 6, originChain: 'SPICE' }, // SPICE on Neutron

  // YGATA
  'factory/omniflix1fwphj5p6qd8gtkehkzfgac38eur4uqzgz97uwvf6hsc0vjl004gqfj0xnv/ygata': { symbol: 'YGATA', decimals: 6, originChain: 'YGATA' }, // YGATA on Omniflix
  'ibc/50F886EFA15E1FF3D9226B177083A1EFF944176181C70B6131D74FE5AFB1F2C0': { symbol: 'YGATA', decimals: 6, originChain: 'YGATA' }, // YGATA on Osmosis
  'ibc/2A56F95E2B74AB769816403D384E2199C7BC510BFD2F8352FAC6DF0294B83EBA': { symbol: 'YGATA', decimals: 6, originChain: 'YGATA' }, // YGATA on Osmosis

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
  stargaze: "https://app.stargaze.zone/m/",
  backbonelabs: "https://app.backbonelabs.io",
  talis: "https://talis.art",
  intergaze: "https://intergaze.xyz",
  superbolt: "https://app.superbolt.wtf/browse/"
};

// Pagination configuration
export const PAGINATION_CONFIG = {
  ITEMS_PER_PAGE: 50,
  BACKBONE_API_PER_PAGE: 100, // Per page for backbone API requests (listed and not_listed NFTs)
};

export const DONATION_ADDRESSES = [
  { chain: "Stargaze", address: "stars1d2y72xglnyrphze97kqfmccysdqpf4996srcyj" },
  { chain: "Osmosis", address: "osmo1d2y72xglnyrphze97kqfmccysdqpf499xh84e3" },
  { chain: "Mantra", address: "mantra1d2y72xglnyrphze97kqfmccysdqpf499987pve" },
  { chain: "Akash", address: "akash1d2y72xglnyrphze97kqfmccysdqpf499rhezke" },
  { chain: "Atom", address: "cosmos1d2y72xglnyrphze97kqfmccysdqpf499wv590r" },
  { chain: "BTC (taproot)", address: "bc1pj2caj3hjsax74lx6dwlwp6rduxl9j0m7nfeh0fussul0pwa94u4qrlfj70" },
];


export const MANTRA_TESTNET = {
  chainId: 0x2af8, // replace with actual Mantra EVM chainId in hex (example: 11000 for some Cosmos EVMs)
  chainName: "Mantra EVM",
  rpcUrls: ["https://evm.dukong.mantrachain.io/"], // ✅ replace with the correct Mantra RPC endpoint
  nativeCurrency: {
    name: "OM",
    symbol: "OM",
    decimals: 18,
  },
};

export const LOKI_NFT_ADDRESS = "0xd9bc86bfff4fc67aa7a4618534495f4b102eeb23"; // ✅ your Loki NFT contract

export const LOKI_METADATA_BASE_URL = "https://pub-29e67721f9b94aa8ab8b575fc3f58e3a.r2.dev/metadata/";

export const LOKI_NFT_ABI = [
  // balanceOf(address owner) → uint256
  {
    constant: true,
    inputs: [{ name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  // ownerOf(uint256 tokenId) → address
  {
    constant: true,
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "ownerOf",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  // tokenOfOwnerByIndex(address owner, uint256 index) → uint256
  {
    constant: true,
    inputs: [
      { name: "owner", type: "address" },
      { name: "index", type: "uint256" },
    ],
    name: "tokenOfOwnerByIndex",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  // tokenURI(uint256 tokenId) → string
  {
    constant: true,
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "tokenURI",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  // totalSupply() → uint256
  {
    constant: true,
    inputs: [],
    name: "totalSupply",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
];