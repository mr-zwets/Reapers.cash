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
  if (!validTokenAddress) {
    error.textContent = "Not a valid CashTokens address.";
  } else {
    error.textContent = "";
  }
};

// The MetaMask plugin also allows signing transactions to
// send ether and pay to change state within the blockchain.
// For this, you need the account signer...
const signer = provider.getSigner()

async function bridgeReapers(){
  const userAddress = await signer.getAddress()
  console.log(userAddress)
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