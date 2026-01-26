import { summonsTokenId, summonsMintingAddress, summonsIpfsLocation } from "/js/nftConfigs.js";
import { lastSession, getUserAddress, connectWallet } from "/js/walletconnect.js";
import { getUtxos, getMintedNfts } from "/js/electrum.js";
import { bigIntToVmNumber, binToHex, hexToBin, vmNumberToBigInt } from '@bitauth/libauth';
import bcmr from "../summons-metadata-registry.json";

// Find nftMetadata in BCMR file
const identity = bcmr.identities[summonsTokenId];
const firstHistoryEntry = identity[Object.keys(identity)[0]];
const nftMetadata = firstHistoryEntry.token.nfts.parse.types;

// Total summons count
const TOTAL_SUMMONS = 1111;

// Read URL Params
const urlParams = new URLSearchParams(window.location.search);
const urlParamAddr = urlParams.get("addr");

// Filter handlers
document.getElementById("filterBitcoinCash").onclick = () => displaySummons();
document.getElementById("filterSmartBCH").onclick = () => displaySummons();
document.getElementById("filterImage").onclick = () => displaySummons();
document.getElementById("filterVideo").onclick = () => displaySummons();

// Helper to check if summons is video based on metadata
function isVideoSummons(summonsNumber) {
  const summonsCommitment = binToHex(bigIntToVmNumber(BigInt(summonsNumber - 1)));
  const summonsData = nftMetadata[summonsCommitment];
  const iconUri = summonsData?.uris?.icon || "";
  return iconUri.endsWith('.mp4');
}

// Bridged summons data (populated async)
let bridgedSummons = [];
let bridgedDataLoaded = false;

// Global variables
let unfilteredSummonsList = [];

// Initial render (before any async operations)
let allSummonsNumbers = [];
for (let i = 1; i <= TOTAL_SUMMONS; i++) {
  allSummonsNumbers.push(i);
}
unfilteredSummonsList = allSummonsNumbers;
displaySummons();
updateMediaTypeCounts();

// Fetch bridged summons (non-blocking)
getMintedNfts(summonsMintingAddress).then(transactions => {
  transactions.forEach(tx => {
    tx.vout.forEach(output => {
      if (output.tokenData && output.tokenData.nft && output.tokenData.nft.capability == "none") {
        const summonsCommitment = output.tokenData.nft.commitment;
        const summonsNumber = vmNumberToBigInt(hexToBin(summonsCommitment)) + 1n;
        bridgedSummons.push(summonsNumber);
      }
    });
  });
  bridgedDataLoaded = true;

  // Update bridged count display
  const bridgedFormatted = bridgedSummons.length.toLocaleString('en-US');
  document.getElementById("bridgedCount").textContent = `${bridgedFormatted}/${TOTAL_SUMMONS.toLocaleString('en-US')} Summons bridged`;

  // Update blockchain counts
  updateBlockchainCounts();

  // Re-render to show badges
  displaySummons();
});

// Session state
let session;
let summonsConnectedWallet = [];
let connectedUserAddress = "";

// Try to reconnect to previous session on startup
if (lastSession && !urlParamAddr) setTimeout(async () => {
  const confirmReuse = confirm("The collection page is going to re-use your previous WalletConnect session, make sure you have your wallet open");
  if (confirmReuse) {
    session = lastSession;
    fetchUserSummons();
  }
}, 1000);

// If urlParam has address, load collection
if (urlParamAddr) setTimeout(async () => {
  const listSummons = await getSummonsOnAddr(urlParamAddr);
  document.getElementById("myCollectionButton").textContent = `My Collection (${listSummons.length})`;
  unfilteredSummonsList = listSummons;
  if (bridgedDataLoaded) updateBlockchainCounts();
  updateMediaTypeCounts();
  displaySummons();
}, 500);

function updateBlockchainCounts() {
  let countBCH = 0;
  let countSmartBCH = 0;
  unfilteredSummonsList.forEach(summonsNumber => {
    if (bridgedSummons.includes(BigInt(summonsNumber))) countBCH++;
    else countSmartBCH++;
  });
  document.getElementById("countBitcoinCash").textContent = countBCH;
  document.getElementById("countSmartBCH").textContent = countSmartBCH;
}

function updateMediaTypeCounts() {
  let countImage = 0;
  let countVideo = 0;
  unfilteredSummonsList.forEach(summonsNumber => {
    if (isVideoSummons(summonsNumber)) countVideo++;
    else countImage++;
  });
  document.getElementById("countImage").textContent = countImage;
  document.getElementById("countVideo").textContent = countVideo;
}

// Button functionality
const fullCollectionButton = document.getElementById("FullCollection");
const myCollectionButton = document.getElementById("myCollectionButton");

fullCollectionButton.onclick = () => {
  window.history.replaceState({}, "", location.pathname);
  unfilteredSummonsList = allSummonsNumbers;
  if (bridgedDataLoaded) updateBlockchainCounts();
  updateMediaTypeCounts();
  displaySummons();
};

myCollectionButton.onclick = async () => {
  if (session) {
    fetchUserSummons();
  } else {
    session = await connectWallet();
    fetchUserSummons();
  }
};

async function fetchUserSummons() {
  if (!summonsConnectedWallet.length) {
    const userAddress = await getUserAddress(session);
    connectedUserAddress = userAddress;
    const listSummons = await getSummonsOnAddr(userAddress);
    document.getElementById("myCollectionButton").textContent = `My Collection (${listSummons.length})`;
    summonsConnectedWallet = listSummons;
  }
  window.history.replaceState({}, "", `${location.pathname}?addr=${connectedUserAddress}`);
  unfilteredSummonsList = summonsConnectedWallet;
  if (bridgedDataLoaded) updateBlockchainCounts();
  updateMediaTypeCounts();
  displaySummons();
}

async function getSummonsOnAddr(address) {
  const userUtxos = await getUtxos(address);
  const summonUtxos = userUtxos.filter(val => val?.token?.category == summonsTokenId);
  const listSummons = [];
  summonUtxos.forEach(summonsUtxo => {
    const summonsCommitment = summonsUtxo.token.nft.commitment;
    const summonsNumber = vmNumberToBigInt(hexToBin(summonsCommitment)) + 1n;
    listSummons.push(Number(summonsNumber));
  });
  return listSummons;
}

function filterSummonsList(listSummons) {
  let filteredList = listSummons;

  // Filter by blockchain
  const filterBCH = document.getElementById("filterBitcoinCash").checked;
  const filterSmartBCH = document.getElementById("filterSmartBCH").checked;
  if (filterBCH || filterSmartBCH) {
    filteredList = filteredList.filter(summonsNumber => {
      const isBridged = bridgedSummons.includes(BigInt(summonsNumber));
      if (filterBCH && filterSmartBCH) return true;
      if (filterBCH) return isBridged;
      if (filterSmartBCH) return !isBridged;
      return true;
    });
  }

  // Filter by media type
  const filterImage = document.getElementById("filterImage").checked;
  const filterVideo = document.getElementById("filterVideo").checked;
  if (filterImage || filterVideo) {
    filteredList = filteredList.filter(summonsNumber => {
      const isVideo = isVideoSummons(summonsNumber);
      if (filterImage && filterVideo) return true;
      if (filterImage) return !isVideo;
      if (filterVideo) return isVideo;
      return true;
    });
  }

  return filteredList;
}

function displaySummons(offset = 0) {
  const filteredList = filterSummonsList(unfilteredSummonsList);
  const listSummons = filteredList.sort((a, b) => a - b);
  const startPoint = offset * 100;
  const slicedArray = listSummons.slice(startPoint, startPoint + 100);

  // Pagination logic
  renderPagination(offset, filteredList.length);

  // Create the HTML rendering setup
  const Placeholder = document.getElementById("PlaceholderSummonsList");
  const summonsList = document.createElement("div");
  summonsList.setAttribute("id", "PlaceholderSummonsList");
  summonsList.classList.add("g-6", "row");
  const template = document.getElementById("summons-template");

  // Render list of Summons
  slicedArray.forEach(nftNumber => {
    const summonsTemplate = document.importNode(template.content, true);
    const summonsName = summonsTemplate.getElementById("summonsName");
    const summonsCommitment = binToHex(bigIntToVmNumber(BigInt(nftNumber - 1)));
    const summonsData = nftMetadata[summonsCommitment];
    summonsName.textContent = summonsData?.name ?? `Summons #${nftNumber}`;

    // Get media URL from metadata
    const iconUri = summonsData?.uris?.icon || "";
    const isVideo = iconUri.endsWith('.mp4');
    const mediaUrl = `https://ipfs.greyh.at/ipfs/${summonsIpfsLocation}/${nftNumber}${isVideo ? '.mp4' : '.png'}`;

    const summonsVideo = summonsTemplate.getElementById("summonsVideo");
    const summonsImage = summonsTemplate.getElementById("summonsImage");

    if (isVideo) {
      summonsVideo.src = mediaUrl;
      summonsVideo.style.display = "block";
      summonsImage.remove();
    } else {
      summonsImage.src = mediaUrl;
      summonsImage.style.display = "block";
      summonsVideo.remove();
    }

    // Show bridged status badge
    const bridgedBadge = summonsTemplate.getElementById("bridgedBadge");
    if (bridgedDataLoaded) {
      const isBridged = bridgedSummons.includes(BigInt(nftNumber));
      bridgedBadge.style.display = "block";
      bridgedBadge.textContent = isBridged ? "Bridged" : "Not Bridged";
      bridgedBadge.classList.add(isBridged ? "bg-success" : "bg-secondary");
    }

    summonsList.appendChild(summonsTemplate);
  });

  Placeholder.replaceWith(summonsList);
}

function renderPagination(offset, listLength) {
  const paginationDiv = document.querySelector(".pagination");
  const nrOfPages = Math.ceil(listLength / 100);
  if (nrOfPages <= 1) {
    paginationDiv.style.display = "none";
    return;
  }
  paginationDiv.style.display = "flex";

  // Show buttons by default
  ["pageLast", "pageMiddle", "skipPages", "pageLast"].forEach(elem => {
    document.getElementById(elem).style.display = "block";
  });
  document.getElementById("endingDots").style.display = "flex";

  // Hide page buttons depending on the nrOfPages
  document.getElementById("pageLast").firstChild.textContent = nrOfPages;
  if (nrOfPages <= 4) document.getElementById("endingDots").style.display = "none";
  if (nrOfPages <= 3) document.getElementById("pageMiddle").style.display = "none";
  if (nrOfPages == 2) {
    document.getElementById("skipPages").style.display = "none";
    document.getElementById("pageLast").style.display = "none";
  }

  // Page button functionality
  const pageButtons = ["pageOne", "pageTwo", "pageMiddle", "pageLast"];
  const setActiveButton = (activePageButton) => {
    pageButtons.forEach(pageButton => {
      const pageButtonElem = document.getElementById(pageButton);
      if (pageButton != activePageButton) pageButtonElem.classList.remove("active");
      else pageButtonElem.classList.add("active");
    });
  };

  // Logic for numbering, highlighting & dots
  const changeActivePage = (pageNumber, nrOfPages) => {
    let activePageButton;
    if (pageNumber == 1) activePageButton = pageButtons[0];
    else if (pageNumber == 2) activePageButton = pageButtons[1];
    else if (pageNumber == nrOfPages) activePageButton = pageButtons[3];
    else {
      activePageButton = pageButtons[2];
      document.getElementById(activePageButton).firstChild.textContent = pageNumber;
      const startingDots = document.getElementById("startingDots");
      const endingDots = document.getElementById("endingDots");
      if (pageNumber == 3) startingDots.style.display = "none";
      else startingDots.style.display = "flex";
      if (pageNumber == nrOfPages - 1) endingDots.style.display = "none";
      else endingDots.style.display = "flex";
    }
    setActiveButton(activePageButton);
    displaySummons(pageNumber - 1);
  };

  // reset active page button after filtering
  if (offset == 0) setActiveButton("pageOne");

  // onclick events buttons
  pageButtons.forEach(pageButton => {
    const pageButtonElem = document.getElementById(pageButton);
    pageButtonElem.onclick = () => changeActivePage(+pageButtonElem.textContent, nrOfPages);
  });

  // Previous page button functionality
  const previousPageButton = document.getElementById("previousPage");
  if (offset == 0) {
    previousPageButton.classList.add("disabled");
    previousPageButton.onclick = () => {};
  } else {
    const pageNumber = offset + 1;
    previousPageButton.onclick = () => changeActivePage(pageNumber - 1, nrOfPages);
    previousPageButton.classList.remove("disabled");
  }

  // Next page button functionality
  const nextPageButton = document.getElementById("nextPage");
  const startPoint = offset * 100;
  if (startPoint + 100 >= listLength) {
    nextPageButton.classList.add("disabled");
    nextPageButton.onclick = () => {};
  } else {
    const pageNumber = offset + 1;
    nextPageButton.onclick = () => changeActivePage(pageNumber + 1, nrOfPages);
    nextPageButton.classList.remove("disabled");
  }

  // Skip pages button functionality
  const skipPagesButton = document.getElementById("skipPages");
  if (startPoint + 100 >= listLength) {
    skipPagesButton.classList.add("disabled");
    skipPagesButton.onclick = () => {};
  } else {
    const pageNumber = offset + 1;
    const newPageNr = (pageNumber + 10 < nrOfPages) ? pageNumber + 10 : nrOfPages;
    skipPagesButton.onclick = () => changeActivePage(newPageNr, nrOfPages);
    skipPagesButton.classList.remove("disabled");
  }
}
