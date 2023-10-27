import bcmr from "../bitcoin-cash-metadata-registry.json"
import { bigIntToVmNumber, binToHex } from '@bitauth/libauth';
import { ipfsLocationImage, tokenId } from "/js/mintingParams.js";

// Find nftMetadata in BCMR file
const nftMetadata = bcmr.identities[tokenId]["2023-10-26T07:39:35.670Z"].token.nfts.parse.types;

// Read URL Params
const urlParams = new URLSearchParams(window.location.search);
const nftNumber = urlParams.get("nr");

const reaperName = document.getElementById("reaperName");
const ninjaCommitment = binToHex(bigIntToVmNumber(BigInt(nftNumber -1)));
const reaperData = nftMetadata[ninjaCommitment];
reaperName.textContent = reaperData?.name;
const ninjaImage = document.getElementById("reaperImage");
ninjaImage.src = `https://ipfs.greyh.at/ipfs/${ipfsLocationImage}/${nftNumber}.png`;
const reaperAttributes = reaperData.extensions.attributes
document.getElementById("Background").textContent = reaperAttributes.Background;
document.getElementById("Outfit").textContent = reaperAttributes.Outfit;
document.getElementById("Head").textContent = reaperAttributes.Head;
document.getElementById("Eyes").textContent = reaperAttributes.Eyes;
document.getElementById("Hands").textContent = reaperAttributes.Hands;
document.getElementById("Special").textContent = reaperAttributes.Special;
