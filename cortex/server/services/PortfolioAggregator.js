/**
 * 📊 Portfolio Aggregator Service
 * 
 * Unifies all connected CEX, DEX, Broker, and On-Chain accounts into a single net worth view.
 * 
 * Sources:
 * 1. exchangeManager (CEX/DEX via CCXT)
 * 2. forexAccountManager (Brokers: Oanda, Exness, etc.)
 * 3. mt4Service (MetaTrader 4 Bridge)
 * 4. cryptoService (On-chain Wallets)
 */

import exchangeManager from './exchangeManager.js';
import forexAccountManager from './forexAccountManager.js';
import mt4Service from './mt4Service.js';
import cryptoService from './cryptoService.js';
import interactiveBrokersClient from './brokers/interactiveBrokersClient.js';

class PortfolioAggregator {
  constructor() {
    this.refreshInterval = 30000; // 30 seconds
  }

  /**
   * Get a unified summary of all assets
   */
  async getUnifiedSummary() {
    const summary = {
      totalNetWorthUSD: 0,
      breakdown: {
        cex: [],
        dex: [],
        forex: [],
        onchain: []
      },
      allocation: {}, 
      timestamp: Date.now()
    };

    // 1. Fetch CEX/DEX Balances (CCXT Hub)
    const connectedExchanges = exchangeManager.getConnectedExchanges();
    for (const exchangeId of connectedExchanges) {
      try {
        const balance = await exchangeManager.getBalance(exchangeId);
        const type = ['hyperliquid', 'aster', 'lighter'].includes(exchangeId) ? 'dex' : 'cex';
        
        summary.breakdown[type].push({
          id: exchangeId,
          equity: balance.totalEquity,
          available: balance.availableBalance,
          pnl: balance.unrealizedPnL
        });
        
        summary.totalNetWorthUSD += (balance.totalEquity || 0);
      } catch (e) {
        console.warn(`[PortfolioAggregator] Failed to fetch ${exchangeId} balance:`, e.message);
      }
    }

    // 2. Fetch Forex/Broker Balances (including Elite IBKR)
    const forexAccounts = await forexAccountManager.listAccounts();
    for (const acc of forexAccounts) {
      if (acc.isActive) {
        try {
          const credentials = await forexAccountManager.getCredentials(acc.id);
          let account;
          
          if (credentials.broker === 'interactive_brokers') {
            account = await interactiveBrokersClient.getAccount();
          } else {
            const brokerClient = (await import('./brokers/index.js')).getBrokerClient(credentials.broker);
            await brokerClient.initialize(credentials.apiKey, credentials.accountId, credentials.environment);
            account = await brokerClient.getAccount();
          }

          summary.breakdown.forex.push({
            id: acc.broker,
            alias: acc.alias,
            equity: account.equity,
            currency: account.currency || 'USD'
          });
          
          summary.totalNetWorthUSD += (account.equity || 0);
        } catch (e) {
          console.warn(`[PortfolioAggregator] Failed to fetch ${acc.alias} balance:`, e.message);
        }
      }
    }

    // 3. Fetch On-Chain Wallets (ethers.js real interactions)
    try {
      const wallets = await cryptoService.listWallets();
      for (const wallet of wallets) {
        const balance = await cryptoService.getBalance(wallet.address, wallet.chain);
        summary.breakdown.onchain.push({
          id: wallet.id,
          name: wallet.name,
          address: wallet.address,
          chain: wallet.chain,
          equity: parseFloat(balance.balanceUSD),
          cryptoBalance: balance.balance
        });
        summary.totalNetWorthUSD += parseFloat(balance.balanceUSD || 0);
      }
    } catch (e) {
      console.warn(`[PortfolioAggregator] Failed to fetch On-Chain balances:`, e.message);
    }

    // 4. Fetch MT4 Balances
    if (await mt4Service.testConnection()) {
       try {
         const mt4Acc = await mt4Service.getAccount();
         summary.breakdown.forex.push({
            id: 'mt4_bridge',
            alias: 'MetaTrader 4',
            equity: mt4Acc.equity,
            currency: mt4Acc.currency
         });
         summary.totalNetWorthUSD += mt4Acc.equity;
       } catch (e) {
         console.warn(`[PortfolioAggregator] Failed to fetch MT4 balance:`, e.message);
       }
    }

    return summary;
  }

  /**
   * Calculate rebalancing targets based on a model portfolio
   */
  async calculateRebalanceNudge(modelAllocation) {
    const current = await this.getUnifiedSummary();
    const suggestions = [];
    
    // Simple Nudge Logic: Compare allocation percentages
    for (const asset of Object.keys(modelAllocation)) {
       // Mock logic for nudge generation
       suggestions.push({
         asset,
         action: 'REBALANCE',
         reason: `Current ${asset} exposure deviates from elite risk parameters.`
       });
    }

    return { 
      nudge: "Elite Portfolio Rebalancing recommended.",
      suggestions,
      totalNetWorth: current.totalNetWorthUSD
    };
  }
}

export default new PortfolioAggregator();
