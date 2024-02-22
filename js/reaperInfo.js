import bcmr from "../bitcoin-cash-metadata-registry.json"
import { bigIntToVmNumber, binToHex } from '@bitauth/libauth';
import { ipfsLocationImage, tokenId } from "/js/nftConfigs.js";

// Find nftMetadata in BCMR file
const nftMetadata = bcmr.identities[tokenId]["2023-10-26T07:39:35.670Z"].token.nfts.parse.types;

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
