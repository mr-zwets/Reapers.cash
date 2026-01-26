import SignClient from '@walletconnect/sign-client';
import { WalletConnectModal } from '@walletconnect/modal';
import { projectId, network, wcMetadata } from "/js/nftConfigs.js";

// Initialize SignClient
export const signClient = await SignClient.init({
  projectId,
  relayUrl: 'wss://relay.walletconnect.com',
  metadata: wcMetadata
});

// Get last WalletConnect session from local storage if there is any
const lastKeyIndex = signClient.session.getAll().length - 1;
export const lastSession = signClient.session.getAll()[lastKeyIndex];

// Handle session events
signClient.on('session_event', ({ event }) => {
  console.log('session_event', event);
});
signClient.on('session_update', ({ topic, params }) => {
  console.log('session_update', params);
});
signClient.on('session_delete', () => {
  console.log('session_delete');
});

// WalletConnect Modal
export const walletConnectModal = new WalletConnectModal({
  projectId: projectId,
  themeMode: 'dark',
  themeVariables: {
    '--wcm-background-color': '#be0000',
    '--wcm-accent-color': '#be0000',
  },
  explorerExcludedWalletIds: 'ALL',
});

// Chain and namespace config
export const connectedChain = network == "mainnet" ? "bch:bitcoincash" : "bch:bchtest";
export const requiredNamespaces = {
  bch: {
    chains: [connectedChain],
    methods: ['bch_getAddresses', 'bch_signTransaction', 'bch_signMessage'],
    events: ['addressesChanged'],
  },
};

// Get user address from connected session
export async function getUserAddress(session) {
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
}

// Connect and get session
export async function connectWallet() {
  const { uri, approval } = await signClient.connect({ requiredNamespaces });
  await walletConnectModal.openModal({ uri });
  const session = await approval();
  walletConnectModal.closeModal();
  return session;
}
