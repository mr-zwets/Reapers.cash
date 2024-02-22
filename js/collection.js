import SignClient from '@walletconnect/sign-client';
import { WalletConnectModal } from '@walletconnect/modal';
import { ElectrumCluster, ElectrumTransport } from 'electrum-cash';
import { ElectrumNetworkProvider } from "cashscript";
import { projectId, ipfsLocationIcons, tokenId, network, wcMetadata } from "/js/nftConfigs.js";
import { bigIntToVmNumber, binToHex, hexToBin, vmNumberToBigInt } from '@bitauth/libauth';
import { listOutfits, listHeads, listBackgrounds, listEyes, listHands, listSpecials } from "/js/attributes.js"
import bcmr from "../bitcoin-cash-metadata-registry.json"

// Find nftMetadata in BCMR file
const nftMetadata = bcmr.identities[tokenId]["2023-10-26T07:39:35.670Z"].token.nfts.parse.types;

// Read URL Params
const urlParams = new URLSearchParams(window.location.search);
const urlParamAddr = urlParams.get("addr");
const urlParamFullCollection = urlParams.get("fullcollection");
const displayFullCollection = urlParamFullCollection == "";

// Define lists for reaper attributes
const checkboxLists = [listOutfits, listHeads, listBackgrounds, listEyes, listHands, listSpecials];
const itemsPerAttributeList = [18, 2, 23, 28, 23, 1];
const attributeNames = ["Outfits", "Heads", "Backgrounds", "Eyes", "Hands", "Specials"];
const attributeKeys = ["Outfit", "Head", "Background", "Eyes", "Hands", "Special"];

// Create a custom 1-of-1 electrum cluster for bch-mainnet
const electrumCluster = new ElectrumCluster('Reapers', '1.5.1', 1, 1);
electrumCluster.addServer('fulcrum.greyh.at', ElectrumTransport.WSS.Port, ElectrumTransport.WSS.Scheme);
const electrum = network == "mainnet" ? electrumCluster : undefined;
// Initialise cashscript ElectrumNetworkProvider
const electrumServer = new ElectrumNetworkProvider(network, electrum);

// Render Checkboxes
checkboxLists.forEach((checkboxList, index) => {
  const listName = "list" + attributeNames[index];
  const Placeholder = document.getElementById(listName);
  const divCheckboxList = document.createElement("div");
  divCheckboxList.setAttribute("id", listName);
  const template = document.getElementById("checkbox-template");
  checkboxList.forEach(listItem => {
    const checkboxTemplate = document.importNode(template.content, true);
    // Set itemAttribute & itemCount checkbox
    const itemAttribute = checkboxTemplate.getElementById("itemAttribute");
    itemAttribute.textContent = listItem;
    const itemCount = checkboxTemplate.getElementById("itemCount");
    const attributeKey = attributeKeys[index];
    const attributeString = (attributeKey + listItem).replace(/\s/g, '_');
    itemCount.setAttribute("id", "itemCount" + attributeString);
    // Set checkbox functionality
    const checkbox = checkboxTemplate.getElementById("idInput");
    checkbox.setAttribute("id", attributeString);
    const label = checkboxTemplate.getElementById("forIdInput");
    label.setAttribute("for", attributeString);
    checkbox.onclick = () => displayReapers()
    // Add checkboxTemplate to list
    divCheckboxList.appendChild(checkboxTemplate);
  });
  Placeholder.replaceWith(divCheckboxList);
})

// 1. Setup Client with relay server
const signClient = await SignClient.init({
  projectId,
  // optional parameters
  relayUrl: 'wss://relay.walletconnect.com',
  metadata: wcMetadata
});

// Get last WalletConnect session from local storage is there is any
const lastKeyIndex = signClient.session.getAll().length - 1;
const lastSession = signClient.session.getAll()[lastKeyIndex];

// Handle session events
signClient.on('session_event', ({ event }) => {
  console.log('session_event');
  console.log(event);
});

signClient.on('session_update', ({ topic, params }) => {
  console.log('session_update');
  console.log(params);
});

signClient.on('session_delete', () => {
  console.log('session_delete');
});

// Connect Client.
const walletConnectModal = new WalletConnectModal({
  projectId: projectId,
  themeMode: 'dark',
  themeVariables: {
    '--wcm-background-color': '#be0000',
    '--wcm-accent-color': '#be0000',
  },
  explorerExcludedWalletIds: 'ALL',
});

const connectedChain = network == "mainnet" ? "bch:bitcoincash" : "bch:bchtest";
const requiredNamespaces = {
  bch: {
    chains: [connectedChain],
    methods: ['bch_getAddresses', 'bch_signTransaction', 'bch_signMessage'],
    events: ['addressesChanged'],
  },
};

// Try to reconnect to previous session on startup
let session;
if (lastSession && !urlParamAddr && !displayFullCollection) setTimeout(async() => {
  const confirmReuse = confirm("The collection page is going to re-use your previous WalletConnect session, make sure you have your wallet open");
  if (confirmReuse) {
    session = lastSession;
    fetchUserReapers();
  }
}, 500);

// If urlParam has address, load collection 
if(urlParamAddr) setTimeout(async() => {
  const listReapers = await getReapersOnAddr(urlParamAddr);
  updateCollection(listReapers);
  displayReapers();
  }, 500
);

if(displayFullCollection) setTimeout(async() => {
  let allReaperNumbers = [];
  for (let i = 1; i <= 5000; i++) {allReaperNumbers.push(i);}
  updateCollection(allReaperNumbers);
  displayReapers();
  }, 500
);

// Global variables
let unfilteredlistReapers = [];
let reapersConnectedWallet = [];
let connectedUserAddress = "";
// Functionality fullCollection & myCollection buttons
const fullCollectionButton = document.getElementById("FullCollection");
const myCollectionButton = document.getElementById("myCollectionButton");
fullCollectionButton.onclick = () => {
  window.history.replaceState({}, "", `${location.pathname}?fullcollection`);
  let allReaperNumbers = [];
  for (let i = 1; i <= 5000; i++) {allReaperNumbers.push(i);}
  updateCollection(allReaperNumbers);
  displayReapers();
}
myCollectionButton.onclick = async() => {
  if(session) fetchUserReapers();
  else {
    const { uri, approval } = await signClient.connect({ requiredNamespaces });
    await walletConnectModal.openModal({ uri });
    // Await session approval from the wallet.
    session = await approval();
    // Close the QRCode modal in case it was open.
    walletConnectModal.closeModal();
    fetchUserReapers();
  };
}
async function fetchUserReapers() {
  if(!reapersConnectedWallet.length){
    const userAddress = await getUserAddress();
    connectedUserAddress = userAddress;
    const listReapers = await getReapersOnAddr(userAddress);
    document.getElementById("myCollectionButton").textContent = `My Collection (${listReapers.length})`
    reapersConnectedWallet = listReapers;
  }
  window.history.replaceState({}, "", `${location.pathname}?addr=${connectedUserAddress}`);
  updateCollection(reapersConnectedWallet);
  displayReapers();
}

async function getReapersOnAddr(address){
  const userUtxos = await electrumServer.getUtxos(address);
  const cashReaperUtxos = userUtxos.filter(val => val?.token?.category == tokenId);
  const listReapers = [];
  cashReaperUtxos.forEach(reaperUtxo => {
    const reaperCommitment = reaperUtxo.token.nft.commitment
    const reaperNumber = vmNumberToBigInt(hexToBin(reaperCommitment)) + 1n;
    listReapers.push(Number(reaperNumber))
  })
  return listReapers
}

let allReaperNumbers = [];
for (let i = 1; i <= 10_000; i++) {allReaperNumbers.push(i);}
updateCollection(allReaperNumbers);
displayReapers();

async function displayReapers(offset = 0){
  const filteredReaperList = filterReaperList(unfilteredlistReapers);
  const listReapers = filteredReaperList.sort((a, b) => a - b);
  const startPoint = offset * 100;
  const slicedArray = listReapers.slice(startPoint, startPoint + 100);
  // Pagination logic
  renderPagination(offset,filteredReaperList.length);

  // Create the HTML rendering setup
  const Placeholder = document.getElementById("PlaceholderReaperList");
  const reaperList = document.createElement("div");
  reaperList.setAttribute("id", "PlaceholderReaperList");
  reaperList.classList.add("g-6", "row");
  const template = document.getElementById("reaper-template");
  // Render list of Reapers
  slicedArray.forEach(nftNumber => {
    const reaperTemplate = document.importNode(template.content, true);
    const reaperName = reaperTemplate.getElementById("reaperName");
    const reaperCommitment = binToHex(bigIntToVmNumber(BigInt(nftNumber -1)));
    const reaperData = nftMetadata[reaperCommitment];
    reaperName.textContent = reaperData?.name ?? `Reaper #${nftNumber}`;
    const reaperImage = reaperTemplate.getElementById("reaperImage");
    reaperImage.src = `https://ipfs.greyh.at/ipfs/${ipfsLocationIcons}/${nftNumber}.png`;
    const reaperLink = reaperTemplate.getElementById("reaperLink");
    reaperLink.href = './reapers.html?nr=' + nftNumber;
    reaperList.appendChild(reaperTemplate);
  });
  Placeholder.replaceWith(reaperList);
}

async function getUserAddress() {
    try {
      const result = await signClient.request({
        chainId: connectedChain,
        topic: session.topic,
        request: {
          method: "bch_getAddresses",
          params: {},
        },
      });
      return result[0];
    } catch (error) {
      return undefined;
    }
  };

function updateCollection(newCollection) {
  unfilteredlistReapers = newCollection;
  // Create obj of attributes object to track unique items
  const attributeObjs = {};
  attributeKeys.forEach(attributeKey => {
    attributeObjs[attributeKey] = {};
  })
  
  // Create count of occurance for each attribute
  unfilteredlistReapers.forEach(reaperNumber => {
    const reaperCommitment = binToHex(bigIntToVmNumber(BigInt(reaperNumber -1)));
    const reaperData = nftMetadata[reaperCommitment];
    const reaperAttributes = reaperData?.extensions.attributes;
    
    if(reaperAttributes.Special == "None"){
      Object.keys(reaperAttributes).forEach((attributeKey, index) => {
        const attibuteObj = attributeObjs[attributeKey];
        const attributeValue = reaperAttributes[attributeKey];
        if(attibuteObj[attributeValue]) attibuteObj[attributeValue] += 1;
        else attibuteObj[attributeValue] = 1;
      })
    } else {attributeObjs["Special"][reaperAttributes["Special"]] = 1}
  });
  delete attributeObjs["Special"]["None"]

  // Display total counts
  attributeNames.forEach((attributeName,index) => {
    const idTotalCount = "number" + attributeName;
    const totalCountDiv = document.getElementById(idTotalCount);
    const attibuteObj = attributeObjs[attributeKeys[index]];
    const countUniqueItems = Object.keys(attibuteObj).length;
    // const countDisplayString = (idTotalCount != "numberSpecials")? countUniqueItems + "/" + itemsPerAttributeList[index] : countUniqueItems;
    totalCountDiv.textContent = countUniqueItems;
  })

  // display Indvidual Counts
  checkboxLists.forEach((checkboxList, index) => {
    checkboxList.forEach(listItem => {
      const attributeKey= attributeKeys[index];
      const attributeString = (attributeKey + listItem).replace(/\s/g, '_');
      const itemCountElem = document.getElementById("itemCount" + attributeString);
      const attibuteObj = attributeObjs[attributeKey];
      let itemCount = attibuteObj[listItem];
      if(listItem == "All Specials") itemCount = Object.keys(attributeObjs[attributeKey]).length
      itemCountElem.textContent = itemCount ?? 0;
    });
  })
}

function renderPagination(offset, listLength){
  const paginationDiv = document.querySelector(".pagination");
  const nrOfPages = Math.ceil(listLength / 100);
  if(nrOfPages <= 1){
    paginationDiv.style.display = "none";
    return
  }
  paginationDiv.style.display = "flex";
  // Show buttons by default
  ["pageLast","pageMiddle","skipPages","pageLast"].forEach(elem => {
    document.getElementById(elem).style.display = "block";
  })
  document.getElementById("endingDots").style.display = "flex";
  // Hide page buttons depending on the nrOfPages
  document.getElementById("pageLast").firstChild.textContent = nrOfPages;
  if(nrOfPages <= 4) document.getElementById("endingDots").style.display = "none";
  if(nrOfPages <= 3) document.getElementById("pageMiddle").style.display = "none";
  if(nrOfPages == 2) {
    document.getElementById("skipPages").style.display = "none";
    document.getElementById("pageLast").style.display = "none";
  }
  // Page button functionality
  const pageButtons = ["pageOne","pageTwo","pageMiddle","pageLast"]
  const setActiveButton = (activePageButton) => {
    pageButtons.forEach(pageButton => {
      const pageButtonElem = document.getElementById(pageButton)
      if(pageButton != activePageButton) pageButtonElem.classList.remove("active");
      else pageButtonElem.classList.add("active");
    })
  }
  // Logic for numbering, highlighting & dots
  const changeActivePage = (pageNumber,nrOfPages) => {
    let activePageButton
    if(pageNumber == 1) activePageButton = pageButtons[0];
    else if(pageNumber == 2) activePageButton = pageButtons[1];
    else if(pageNumber == nrOfPages) activePageButton = pageButtons[3];
    else{
      activePageButton = pageButtons[2];
      document.getElementById(activePageButton).firstChild.textContent = pageNumber;
      const startingDots = document.getElementById("startingDots");
      const endingDots = document.getElementById("endingDots");
      if(pageNumber == 3) startingDots.style.display = "none";
      else startingDots.style.display = "flex";
      if(pageNumber == nrOfPages - 1) endingDots.style.display = "none";
      else endingDots.style.display = "flex";
    }
    setActiveButton(activePageButton);
    displayReapers(pageNumber - 1);
  }
  // reset active page button after filtering
  if(offset == 0) setActiveButton("pageOne")
  // onclick events buttons
  pageButtons.forEach(pageButton => {
    const pageButtonElem = document.getElementById(pageButton);
    pageButtonElem.onclick = () => changeActivePage(+pageButtonElem.textContent, nrOfPages);
  })
  // Previous page button functionality
  const previousPageButton = document.getElementById("previousPage");
  if(offset == 0) {
    previousPageButton.classList.add("disabled");
    previousPageButton.onclick = () => {}
  } else {
    const pageNumber = offset + 1;
    previousPageButton.onclick = () => changeActivePage(pageNumber - 1, nrOfPages);
    previousPageButton.classList.remove("disabled");
  }
  // Next page button functionality
  const nextPageButton = document.getElementById("nextPage");
  const startPoint = offset * 100;
  if(startPoint + 100 >= listLength){
    nextPageButton.classList.add("disabled")
    nextPageButton.onclick = () => {}
  } else {
    const pageNumber = offset + 1;
    nextPageButton.onclick = () => changeActivePage(pageNumber + 1, nrOfPages)
    nextPageButton.classList.remove("disabled")
  }
  // Skip pages button functionality
  const skipPagesButton = document.getElementById("skipPages");
  if(startPoint + 100 >= listLength){
    skipPagesButton.classList.add("disabled")
    skipPagesButton.onclick = () => {}
  } else {
    const pageNumber = offset + 1;
    const newPageNr = (pageNumber + 10 < nrOfPages)? pageNumber + 10 : nrOfPages
    skipPagesButton.onclick = () => changeActivePage(newPageNr, nrOfPages)
    skipPagesButton.classList.remove("disabled")
  }
}

// Fuctions for filtering the ReaperList
function filterReaperList(listReapers){
  const checkboxes = document.getElementsByName("checkbox");
  // Keeps track of the filtering, updated after each category
  let filteredReaperList = listReapers;
  let sumItemCountCategories = 0;
  // Filtering within category interpreted as OR, across category as AND
  for (const [categoryNr, nrItems] of itemsPerAttributeList.entries()) {
    // Keeps track of the items in a category, becomes new filteredReaperList at end of category and starts fresh again
    let categoryList = [];
    let hasFiltered = false;
    for(let i= 0; i < nrItems; i++ ){
      const checkboxNr = sumItemCountCategories + i;
      const checkbox = checkboxes[checkboxNr];
      if (checkbox.checked) {
        hasFiltered = true;
        const categoryToFilterOn = attributeKeys[categoryNr];
        const classToFilter = checkbox.id;
        const attributeToFilterOn = classToFilter.replace(/_/g, ' ').replace(categoryToFilterOn,"");
        // Filters the current NFT list
        filteredReaperList.forEach(reaperNumber => {
          const reaperCommitment = binToHex(bigIntToVmNumber(BigInt(reaperNumber - 1)));
          const reaperData = nftMetadata[reaperCommitment];
          const reaperAttributes = reaperData?.extensions.attributes;
          // Only run these check for reaper numbers with metadata available
          if(reaperAttributes){
            if(reaperAttributes[categoryToFilterOn] == attributeToFilterOn) categoryList.push(reaperNumber);
            if(categoryToFilterOn == "Special" && reaperAttributes["Special"] != "None") categoryList.push(reaperNumber)
          }
        })
      }
    }
    // If category has filtered, set new filteredList for next category
    if(hasFiltered) filteredReaperList = categoryList;
    sumItemCountCategories += nrItems;
  }
  return filteredReaperList
}
