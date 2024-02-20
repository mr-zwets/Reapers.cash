import { ethers } from "ethers";
import {decodeCashAddress} from '@bitauth/libauth'
const backendUrl = 'https://api.reapers.cash'

// A Web3Provider wraps a standard Web3 provider, which is
// what MetaMask injects as window.ethereum into each page
const provider = new ethers.providers.Web3Provider(window.ethereum)

// MetaMask requires requesting permission to connect users accounts
const connectionStatus = document.getElementById("connectionStatus")
const bridgeInfo = document.getElementById("bridgeInfo")
const connectMetamask= document.getElementById("connectMetamask")
try{
  await provider.send("eth_requestAccounts", []);
  connectionStatus.textContent = "connected"
  bridgeInfo.style.display = "block"
  connectMetamask.style.display = "none"
} catch (error){
  connectionStatus.textContent = "something went wrong"
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
getReapersAddress()

const reaperNumbers = document.getElementById("reaperNumbers")
async function getReapersAddress(){
  try{
    const rawResponse = await fetch(backendUrl+'/address/'+userAddress)
    console.log(rawResponse)
    if(!rawResponse.ok) reaperNumbers.textContent = "failed to fetch..."
    const infoAddress = await rawResponse.json();
    console.log(infoAddress);

    const listNftItems = infoAddress.filter(item => !item.timeBridged)
    const listNftNumbers = listNftItems.map(item => item.nftnumber)
    if(listNftNumbers.length){
      let listReapers = "";
      listNftNumbers.forEach((number,index) => {
        listReapers += `#${number}`;
        if(index < listNftNumbers.length-1) listReapers += ", "
      })
      reaperNumbers.textContent = listReapers
      document.getElementById("bridgeButton").classList = "btn btn-primary rounded-4 mt-2"
    }
  } catch (error){
    reaperNumbers.textContent = "failed to fetch..."
  }
}

async function bridgeReapers(){
  const signature = await signer.signMessage(userAddress);
  console.log(signature)
  sendBridgingRequest()

  async function sendBridgingRequest(){
    const rawResponse = await fetch(backendUrl+'/signbridging', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({signature, sbchOriginAddress:userAddress, destinationAddress:""})
    });
    const content = await rawResponse.json();

    console.log(content);
  }
}