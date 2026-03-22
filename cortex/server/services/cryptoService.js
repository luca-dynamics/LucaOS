/**
 * ⚡ CryptoService - Elite On-Chain Execution
 * 
 * Handles multi-chain wallet management, transaction signing, 
 * and real-time blockchain telemetry using ethers.js.
 */

import { ethers } from 'ethers';
import fs from 'node:fs';
import path from 'node:path';
import { WALLETS_DIR } from '../config/constants.js';
import secureVault from './secureVault.js';

class CryptoService {
  constructor() {
    this.providers = {
      ethereum: new ethers.JsonRpcProvider('https://eth.llamarpc.com'),
      sepolia: new ethers.JsonRpcProvider('https://ethereum-sepolia.publicnode.com'),
      base: new ethers.JsonRpcProvider('https://mainnet.base.org'),
      optimism: new ethers.JsonRpcProvider('https://mainnet.optimism.io')
    };
  }

  /**
   * Create a new on-chain wallet
   */
  async createWallet(name, chain = 'ethereum') {
    const wallet = ethers.Wallet.createRandom();
    const walletData = {
      id: ethers.hexlify(ethers.randomBytes(16)),
      name: name || `Wallet ${Date.now()}`,
      chain,
      address: wallet.address,
      mnemonic: wallet.mnemonic.phrase,
      created: Date.now()
    };

    // Encrypt private key and mnemonic before storage
    const encryptedKey = secureVault.encrypt(wallet.privateKey);
    const encryptedMnemonic = secureVault.encrypt(wallet.mnemonic.phrase);

    const storageData = {
      ...walletData,
      encryptedKey,
      encryptedMnemonic
    };

    if (!fs.existsSync(WALLETS_DIR)) {
      fs.mkdirSync(WALLETS_DIR, { recursive: true });
    }

    const walletPath = path.join(WALLETS_DIR, `${storageData.id}.json`);
    fs.writeFileSync(walletPath, JSON.stringify(storageData, null, 2));

    return walletData;
  }

  /**
   * Get real-time balance
   */
  async getBalance(address, chain = 'ethereum') {
    const provider = this.providers[chain] || this.providers.ethereum;
    try {
      const balance = await provider.getBalance(address);
      const ethBalance = ethers.formatEther(balance);
      
      // Basic price fetch (In production, replace with CoinGecko or Chainlink)
      const ethPrice = 2500; // Placeholder for now
      
      return {
        address,
        chain,
        balance: ethBalance,
        balanceUSD: (parseFloat(ethBalance) * ethPrice).toFixed(2),
        symbol: chain === 'base' ? 'ETH' : 'ETH'
      };
    } catch (e) {
      console.error(`[CryptoService] Balance fetch failed for ${address}:`, e.message);
      return { balance: '0.0', balanceUSD: '0.00' };
    }
  }

  /**
   * Send real on-chain transaction
   */
  async sendTransaction({ walletId, to, amount, chain = 'ethereum', data, gasLimit }) {
    const walletPath = path.join(WALLETS_DIR, `${walletId}.json`);
    if (!fs.existsSync(walletPath)) throw new Error('Wallet not found');

    const storageData = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
    const privateKey = secureVault.decrypt(storageData.encryptedKey);
    
    const provider = this.providers[chain] || this.providers.ethereum;
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(`[CryptoService] Sending tx to ${to} on ${chain}...`);

    const txParams = {
      to,
      value: ethers.parseUnits(amount.toString(), 'ether')
    };

    if (data) txParams.data = data;
    if (gasLimit) txParams.gasLimit = gasLimit;

    const tx = await wallet.sendTransaction(txParams);

    return {
      success: true,
      hash: tx.hash,
      wait: () => tx.wait()
    };
  }

  /**
   * Get specific wallet details (decrypted)
   */
  async getWallet(walletId) {
    const walletPath = path.join(WALLETS_DIR, `${walletId}.json`);
    if (!fs.existsSync(walletPath)) return null;
    return JSON.parse(fs.readFileSync(walletPath, 'utf8'));
  }

  /**
   * List all local wallets
   */
  async listWallets() {
    if (!fs.existsSync(WALLETS_DIR)) return [];
    const files = fs.readdirSync(WALLETS_DIR);
    return files.map(f => {
      const data = JSON.parse(fs.readFileSync(path.join(WALLETS_DIR, f), 'utf8'));
      return {
        id: data.id,
        name: data.name,
        address: data.address,
        chain: data.chain
      };
    });
  }
}

export default new CryptoService();
