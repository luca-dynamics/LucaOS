import fetch from 'node-fetch';

/**
 * 🛰️ Jupiter V6 Driver (Solana)
 */

export const manifest = {
    name: "Jupiter",
    description: "The best aggregator on Solana, offering swaps, DCA, and limit orders.",
    chains: ["solana"],
    dexs: ["Raydium", "Orca", "Meteora", "Phoenix", "Lifinity"],
    icons: {
        solana: "https://jup.ag/svg/jupiter-logo.svg"
    }
};

export const skills = {
    /**
     * 🔄 Swap Token (Advanced Aggregation)
     */
    async swap(params) {
        const { fromToken, toToken, amount, slippage = 50, dexes } = params;
        
        // 1. Get Quote
        let url = `https://quote-api.jup.ag/v6/quote?inputMint=${fromToken}&outputMint=${toToken}&amount=${amount}&slippageBps=${slippage}`;
        if (dexes) url += `&onlyDirectRoutes=true&enabledDexes=${dexes.join(',')}`;

        const quoteResponse = await fetch(url);
        const quote = await quoteResponse.json();

        if (quote.error) throw new Error(`Jupiter Quote Error: ${quote.error}`);

        // 2. Get Transaction Data
        const txResponse = await fetch('https://quote-api.jup.ag/v6/swap', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                quoteResponse: quote,
                userPublicKey: params.userAddress,
                wrapAndUnwrapSol: true
            })
        });
        const { swapTransaction } = await txResponse.json();

        // 3. (Optional) Broadcast via local Wallet/CryptoService
        return {
            protocol: "Jupiter",
            action: "swap",
            quote,
            transaction: swapTransaction,
            message: "Transaction generated. Use CryptoService to sign and broadcast on Solana."
        };
    },

    /**
     * 📅 Create DCA Program
     */
    async dca(params) {
        // Implementation for Jupiter DCA API
        return {
            message: "DCA Program initialization logic for Jupiter (To be implemented using @jup-ag/dca-sdk)"
        };
    },

    /**
     * 📈 Get Price V3
     */
    async price(params) {
        const { ids } = params; // comma separated mint addresses
        const response = await fetch(`https://api.jup.ag/price/v2?ids=${ids}`);
        const data = await response.json();
        return data;
    }
};
