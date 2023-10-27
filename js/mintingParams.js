// Configure minting params

// Wallet Connect projectId
const projectId = "2aca272d18deb10ff748260da5f78bfd";

// Ipfs location icons
const ipfsLocationIcons = "bafybeidoidntyzjzifqwdk3um4e2j2jk2ppslhq4mypapunbmbthya4eaq"
const ipfsLocationImage ="bafybeif5vhnowtqre7c3z5tgezccfgvhelqlgp54np6jsersuv7sylqzky"

// Contract Params mint
const tokenId = "YOUR_GENESIS_UNSPENT_TX";
const collectionSize = 5_000;
const numberOfThreads = 25;
const mintPriceSats = 5_000_000;
const payoutAddress = "bitcoincash:qqds0h006djrnast7ktvf7y3lrmvu0d7yqzhuzgvaa"; // with bitcoincash: or bchtest: prefix
const network = "mainnet";

// Wallet Connect Metadata
const wcMetadata = {
  name: 'Cash-Ninjas',
  description: 'CashTokens NFT Collection',
  url: 'https://ninjas.cash/',
  icons: ['https://ninjas.cash/images/logo.png']
};

export { projectId, ipfsLocationIcons, ipfsLocationImage, tokenId, collectionSize, mintPriceSats, payoutAddress, numberOfThreads, network, wcMetadata };