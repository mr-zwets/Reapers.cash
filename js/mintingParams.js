// Configure minting params

// Wallet Connect projectId
const projectId = "2aca272d18deb10ff748260da5f78bfd";

// Ipfs location icons
const ipfsLocationIcons = "QmVm2v4NXMTXJi1RwnYUbp2ixPErLqCLKR34CU7fxE6QBD"

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

export { projectId, ipfsLocationIcons, tokenId, collectionSize, mintPriceSats, payoutAddress, numberOfThreads, network, wcMetadata };