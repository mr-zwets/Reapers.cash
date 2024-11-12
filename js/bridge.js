import { ethers } from "ethers";
import { decodeCashAddress } from '@bitauth/libauth'
const reapersBridgeBackend = 'https://api.reapers.cash'
const summonsBridgeBackend = 'https://summonsapi.reapers.cash'

let provider
try{
  // A Web3Provider wraps a standard Web3 provider, which is
  // what MetaMask injects as window.ethereum into each page
  provider = new ethers.providers.Web3Provider(window.ethereum)
} catch (error){}

const connectionStatus = document.getElementById("connectionStatus")
const bridgeInfo = document.getElementById("bridgeInfo")
const connectMetamask= document.getElementById("connectMetamask")

if(!provider){
  connectionStatus.textContent = "metamask install not found"
} else {
  try{
    // MetaMask requires requesting permission to connect users accounts
    await provider.send("eth_requestAccounts", []);
    connectionStatus.textContent = "connected"
    bridgeInfo.style.display = "block"
    connectMetamask.style.display = "none"
  } catch (error){
    connectionStatus.textContent = "something went wrong connecting metamask"
  }
}

let validTokenAddress = false;

export function isTokenAddress(address) {
  const result = decodeCashAddress(address);
  if (typeof result === 'string') throw new Error(result);
  const supportsTokens = (result.type === 'p2pkhWithTokens' || result.type === 'p2shWithTokens');
  return supportsTokens;
}

window.validateAddress = (event) => {
  const error = document.getElementById("addressError");
  const inputAddress = event.target.value;
  try {
    validTokenAddress = isTokenAddress(inputAddress);
  } catch (error) {
    console.log(error);
  }
  error.textContent = validTokenAddress || !inputAddress ? "" : "Not a valid CashTokens address.";
};

// The MetaMask plugin also allows signing transactions to
// send ether and pay to change state within the blockchain.
// For this, you need the account signer...
const signer = provider.getSigner()
const userAddress = await signer.getAddress()
let listReaperNumbers
let listSummonNumber

const reaperNumbers = document.getElementById("reaperNumbers")
const summonNumbers = document.getElementById("summonNumbers")

getNftsAddress(true)
getNftsAddress(false)
setInterval(() => getNftsAddress(true), 5000)
setInterval(() => getNftsAddress(false), 5000)

// takes boolean parameter to getNftsAddress for reapers (true) or summons (false)
async function getNftsAddress(reapers){
  try{
    const htmlElement = reapers ? reaperNumbers : summonNumbers
    const backendUrl = reapers ? reapersBridgeBackend : summonsBridgeBackend

    const rawResponse = await fetch(backendUrl+'/address/'+userAddress)
    console.log(rawResponse)
    if(!rawResponse.ok) reaperNumbers.textContent = "failed to fetch..."
    const infoAddress = await rawResponse.json();
    console.log(infoAddress);

    const listNftItems = infoAddress.filter(item => !item.timebridged)
    const listNftNumbers = listNftItems.map(item => item.nftnumber)
    if(listNftNumbers.length){
      let displayListNfts = "";
      listNftNumbers.forEach((number,index) => {
        displayListNfts += `#${number}`;
        if(index < listNftNumbers.length-1) displayListNfts += ", "
      })
      if(reapers) listReaperNumbers = listNftNumbers
      else listSummonNumber = listNftNumbers
      htmlElement.textContent = displayListNfts
      document.getElementById("bridgeButton").classList = "btn btn-primary rounded-4 mt-2"
    } else {
      htmlElement.textContent = "none"
    }
  } catch (error){
    htmlElement.textContent = "failed to fetch..."
  }
}

async function bridgeReapersAndSummons(){
  const userCashTokensAddr = document.getElementById("addressInput").value
  if(!validTokenAddress){
    alert("provide a valid CashTokens address")
    return
  }
  if(!listReaperNumbers.length && !listSummonNumber.length){
    alert("didn't find any burned reapers or summons")
    return
  }

  if(listReaperNumbers.length) bridgeNfts(reapersBridgeBackend)
  if(listSummonNumber.length) bridgeNfts(summonsBridgeBackend)

  async function bridgeNfts(backendUrl){
    const signature = await signer.signMessage(userCashTokensAddr);
    const rawResponse = await fetch(backendUrl+'/signbridging', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({signature, sbchOriginAddress:userAddress, destinationAddress:userCashTokensAddr})
    });
    const { txid } = await rawResponse.json();
    alert("bridging transaction succesfull, txid: " + txid);
    console.log("bridging transaction succesfull, txid: " + txid)
  }
  // reset changed state
  document.getElementById("addressInput").value = ""
  document.getElementById("bridgeButton").classList = "btn btn-secondary rounded-4 mt-2"
  getNftsAddress(true)
  getNftsAddress(false)
}
window.bridgeReapers = bridgeReapersAndSummons