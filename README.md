# Cosmos NFTHUB Dashboard V1
**It's LIVE, try it** [HERE](https://cosmosnfthub.xyz/) 

**A Dashboard in React that displays all your Cosmos NFTs on several Cosmos chains from one single place...**
 
It simply runs in your browser, no data is stored, no database is required at this stage, wallet connection is offline with Keplr or Leap wallets.
 
 <!-- *Feel free to support me by donating any token on Stargaze chain at: `stars1d2y72xglnyrphze97kqfmccysdqpf4996srcyj`*  -->

## Features
**Chains implemented:** 
* Stargaze 
* Osmosis 
* CosmosHub 
* Initia (Intergaze) 
* Injective 
* Neutron 
* Dungeon 
 
**The dashboard:**
* Offline connection to keplr/leap
* Displays your Stargaze Name
* Displays your native token balances on connected chains + non-native tokens used to trade NFTs on every integrated chains
* Displays your active offers on every integrated marketplaces
* Displays your NFT portfolio on every integrated marketplaces and staked NFTs in integrated DAOs
* For each NFT, displays the image, traits, collection floor price, highest offer, last sale, staked status and listing infos (when data is unavailable from one marketplace and the collection is multichain, we fallback to Stargaze for data)
* Lets you manually add single chain address to fetch NFTs held on it
* Lets you filter NFTs by wallet address, chain, collection, listed status or staked status
* Lets you switch between Floor price and Highest Offers mode (used to sort NFTs and calculate value)
* Each of your active offers or NFTs has a link to where it is

## APIs
Data is collected using Stargaze, Intergaze, BackBoneLabs and Superbolt APIs.
Daodao indexer for staked NFTs. And direct cosmwasm contracts queries when no data available elsewhere.

## Installation commands to run it locally
You need node.js and npm installed to install all dependencies: `npm install`
 
Then launch the vite.js server: `npm run dev`

**And you're good to go!**


## Improvements ideas
* Currently it uses free proxies for CORS in API fetches, could be improved with a dedicated proxy. 
* Data could be served faster with a dedicated server and database.
* Ability to connect several wallets


**ENJOY!**

