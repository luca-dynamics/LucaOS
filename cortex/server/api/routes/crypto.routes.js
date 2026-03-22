import express from 'express';
import { ethers } from 'ethers';
import cryptoService from '../../services/cryptoService.js';
import dexRoutingService from '../../services/DexRoutingService.js';

const router = express.Router();

/**
 * 🔒 Create Real On-Chain Wallet
 */
router.post('/wallet/create', async (req, res) => {
    const { chain, name } = req.body;
    try {
        const wallet = await cryptoService.createWallet(name, chain);
        res.json({ success: true, wallet });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/**
 * 📊 Get Multi-Chain Balance (Real-Time)
 */
router.get('/balance', async (req, res) => {
    const { chain, address } = req.query;
    try {
        const balance = await cryptoService.getBalance(address, chain);
        res.json(balance);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/**
 * 💸 Send Real On-Chain Transaction
 */
router.post('/transaction', async (req, res) => {
    const { walletId, to, amount, chain } = req.body;
    try {
        const result = await cryptoService.sendTransaction({ walletId, to, amount, chain });
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/**
 * 📋 List All Connect Wallets
 */
router.get('/wallets', async (req, res) => {
    try {
        const wallets = await cryptoService.listWallets();
        res.json({ success: true, wallets });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/**
 * 🔄 Swap Crypto (DEX Routing via 0x)
 */
router.post('/swap', async (req, res) => {
    const { walletId, fromAsset, toAsset, amount, chain, execute = false } = req.body;
    
    try {
        if (execute) {
            // Real execution
            const result = await dexRoutingService.executeSwap({
                walletId,
                chain,
                fromToken: fromAsset,
                toToken: toAsset,
                amount
            });
            return res.json(result);
        } else {
            // Just a quote
            const wallet = await cryptoService.getWallet(walletId);
            const quote = await dexRoutingService.getQuote({
                chain,
                fromToken: fromAsset,
                toToken: toAsset,
                amount,
                takerAddress: wallet?.address || ethers.ZeroAddress
            });
            return res.json(quote);
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
