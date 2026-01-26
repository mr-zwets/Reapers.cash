import bcmr from "../bitcoin-cash-metadata-registry.json"
import { bigIntToVmNumber, binToHex, hexToBin, vmNumberToBigInt } from '@bitauth/libauth';
import { ipfsLocationImage, tokenId, mintingAddress } from "/js/nftConfigs.js";
import { getMintedNfts } from "/js/electrum.js";

// Find nftMetadata in BCMR file
const identity = bcmr.identities[tokenId];
const firstHistoryEntry = identity[Object.keys(identity)[0]];
const nftMetadata = firstHistoryEntry.token.nfts.parse.types;

// Read URL Params
const urlParams = new URLSearchParams(window.location.search);
const nftNumber = urlParams.get("nr");

const reaperName = document.getElementById("reaperName");
const nftCommitment = binToHex(bigIntToVmNumber(BigInt(nftNumber -1)));
const reaperData = nftMetadata[nftCommitment];
reaperName.textContent = reaperData?.name;
const reaperImage = document.getElementById("reaperImage");
const urlReaperImage = `https://ipfs.greyh.at/ipfs/${ipfsLocationImage}/${nftNumber}.png`;
reaperImage.src = urlReaperImage;
const reaperAttributes = reaperData.extensions.attributes;
// Set the attributes divs to the Reapers' attributes
["Background","Outfit","Head","Eyes","Hands","Special"].forEach(attribute => {
  document.getElementById(attribute).textContent = reaperAttributes[attribute];
})
document.getElementById("ipfsLink").href = urlReaperImage;

// Fetch bridged status
const transactions = await getMintedNfts(mintingAddress);

const bridgedReapers = []
transactions.forEach(tx => {
  tx.vout.forEach(output => {
    if(output.tokenData && output.tokenData.nft && output.tokenData.nft.capability == "none"){
      const reaperCommitment = output.tokenData.nft.commitment
      const reaperNumber = vmNumberToBigInt(hexToBin(reaperCommitment)) + 1n;
      bridgedReapers.push(reaperNumber);
    }
  })
})

// Display bridged badge
const bridgedBadge = document.getElementById("bridgedBadge");
const isBridged = bridgedReapers.includes(BigInt(nftNumber));
bridgedBadge.textContent = isBridged ? "Bridged" : "Not Bridged";
bridgedBadge.classList.remove("bg-secondary");
bridgedBadge.classList.add(isBridged ? "bg-success" : "bg-secondary");
