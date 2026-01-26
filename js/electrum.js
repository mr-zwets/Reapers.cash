import { ElectrumClient } from '@electrum-cash/network';

// Electrum Network Provider with automatic connection management
// Based on CashScript's ElectrumNetworkProvider: https://github.com/CashScript/cashscript/blob/master/packages/cashscript/src/network/ElectrumNetworkProvider.ts
// Using Electrum Cash Protocol 1.5.1 (required for blockchain.address.* methods and token_filter)
class ElectrumNetworkProvider {
  constructor(appName, protocolVersion, server) {
    this.electrum = new ElectrumClient(appName, protocolVersion, server);
    this.concurrentRequests = 0;
  }

  async performRequest(method, ...params) {
    // Connect when first request comes in
    if (this.concurrentRequests === 0) {
      await this.electrum.connect();
    }
    this.concurrentRequests += 1;

    let result;
    try {
      result = await this.electrum.request(method, ...params);
    } finally {
      this.concurrentRequests -= 1;
      // Disconnect when last request completes
      if (this.concurrentRequests === 0) {
        await this.electrum.disconnect();
      }
    }

    if (result instanceof Error) throw result;
    return result;
  }

  async getUtxos(address) {
    const result = await this.performRequest('blockchain.address.listunspent', address, 'include_tokens');
    return result.map(utxo => ({
      txid: utxo.tx_hash,
      vout: utxo.tx_pos,
      satoshis: BigInt(utxo.value),
      token: utxo.token_data ? {
        ...utxo.token_data,
        amount: BigInt(utxo.token_data.amount),
      } : undefined,
    }));
  }

  async getHistory(address) {
    return await this.performRequest('blockchain.address.get_history', address);
  }

  async getTransaction(txid, verbose = true) {
    return await this.performRequest('blockchain.transaction.get', txid, verbose);
  }
}

// Create singleton instance
const electrumProvider = new ElectrumNetworkProvider('Reapers', '1.5.1', 'fulcrum.greyh.at');

// Export convenience functions
export async function getUtxos(address) {
  return electrumProvider.getUtxos(address);
}

export async function getHistory(address) {
  return electrumProvider.getHistory(address);
}

export async function getTransaction(txid, verbose = true) {
  return electrumProvider.getTransaction(txid, verbose);
}

export async function getMintedNfts(mintingAddress) {
  const history = await getHistory(mintingAddress);
  const transactions = await Promise.all(
    history.map(entry => getTransaction(entry.tx_hash))
  );
  return transactions;
}
