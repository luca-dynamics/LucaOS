/**
 * 🛰️ DexRoutingService - Automated DEX Swap Routing
 * 
 * Integrates with DEX aggregators (0x, Jupiter, 1inch) to find
 * optimal routes and execute on-chain swaps.
 */

import { ethers } from 'ethers';
import cryptoService from './cryptoService.js';

class DexRoutingService {
  constructor() {
    this.zeroXBaseUrl = 'https://api.0x.org/swap/v1';
    this.apiKey = process.env.ZERO_X_API_KEY || ''; // Placeholder for production
    
    // Chain ID mapping for 0x
    this.chainIds = {
      ethereum: 1,
      base: 8453,
      optimism: 10,
      arbitrum: 42161,
      sepolia: 11155111
    };
  }

  /**
   * Get an aggregated swap quote from 0x
   */
  async getQuote({ chain, fromToken, toToken, amount, takerAddress }) {
    const chainId = this.chainIds[chain] || 1;
    const amountInWei = ethers.parseEther(amount.toString()).toString();

    // 0x API uses different endpoints per chain
    const baseUrl = this.getChainBaseUrl(chain);
    const url = `${baseUrl}/quote?sellToken=${fromToken}&buyToken=${toToken}&sellAmount=${amountInWei}&takerAddress=${takerAddress}`;

    console.log(`[DexRoutingService] Fetching quote from 0x: ${url}`);

    try {
      const response = await fetch(url, {
        headers: {
          '0x-api-key': this.apiKey
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`0x API Error: ${error.reason || response.statusText}`);
      }

      const quote = await response.json();
      
      return {
        success: true,
        provider: '0x',
        price: quote.price,
        guaranteedPrice: quote.guaranteedPrice,
        toAmount: ethers.formatEther(quote.buyAmount),
        gasLimit: quote.gas,
        gasPrice: quote.gasPrice,
        data: quote.data, // Transaction data
        to: quote.to,     // 0x contract address
        value: quote.value // ETH value to send
      };
    } catch (e) {
      console.error(`[DexRoutingService] Quote failed:`, e.message);
      return { success: false, error: e.message };
    }
  }

  /**
   * Execute a swap autonomously
   */
  async executeSwap({ walletId, chain, fromToken, toToken, amount }) {
    try {
      const wallet = await cryptoService.getWallet(walletId);
      if (!wallet) throw new Error('Wallet not found');

      // 1. Get Quote
      const quote = await this.getQuote({
        chain,
        fromToken,
        toToken,
        amount,
        takerAddress: wallet.address
      });

      if (!quote.success) throw new Error(quote.error);

      console.log(`[DexRoutingService] Executing swap: ${amount} ${fromToken} -> ${quote.toAmount} ${toToken} on ${chain}`);

      // 2. Sign and Broadcast
      // NOTE: In production, we'd need to handle ERC20 approvals if fromToken is not ETH.
      // This is a simplified version for common aggregator patterns.
      const txResponse = await cryptoService.sendTransaction({
        walletId,
        chain,
        to: quote.to,
        amount: ethers.formatEther(quote.value), // Usually 0 if ERC20 -> ERC20
        data: quote.data,
        gasLimit: quote.gasLimit
      });

      return {
        success: true,
        txHash: txResponse.hash,
        quote: quote
      };
    } catch (e) {
      console.error(`[DexRoutingService] Swap execution failed:`, e.message);
      return { success: false, error: e.message };
    }
  }

  /**
   * Helper to resolve 0x API base URL per chain
   */
  getChainBaseUrl(chain) {
    switch (chain) {
      case 'base': return 'https://base.api.0x.org/swap/v1';
      case 'optimism': return 'https://optimism.api.0x.org/swap/v1';
      case 'arbitrum': return 'https://arbitrum.api.0x.org/swap/v1';
      case 'sepolia': return 'https://sepolia.api.0x.org/swap/v1';
      default: return 'https://api.0x.org/swap/v1';
    }
  }
}

export default new DexRoutingService();
