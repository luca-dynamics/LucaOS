import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { tradingService } from '../services/tradingService';

/**
 * 📊 useMarketStream Hook
 * 
 * Provides real-time market data (Price & Klines) by connecting to the 
 * Luca backend's Socket.io server.
 * 
 * Functions:
 * 1. Initiates a real-time subscription via REST.
 * 2. Listens for Socket.io events: 'market:ticker' and 'market:kline'.
 * 3. Maintains the latest price and most recent candle.
 */
export function useMarketStream(exchange: string, symbol: string) {
    const [ticker, setTicker] = useState<{
        price: number;
        change: number;
        high: number;
        low: number;
        volume: number;
    } | null>(null);
    
    const [lastKline, setLastKline] = useState<{
        t: number;
        o: number;
        h: number;
        l: number;
        c: number;
        v: number;
    } | null>(null);

    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        if (!symbol) return;

        // 1. Trigger the backend to start streaming this symbol if not already
        tradingService.subscribeToMarketData(exchange, symbol).catch((err: Error) => {
            console.error('[STREAM] Failed to trigger backend subscription:', err);
        });

        // 2. Connect to the WebSocket port (Standard Luca Link port 3003)
        // Note: Using a direct Socket.io client to port 3003 as our MarketStreamer broadcasts there
        const socket = io('http://localhost:3003', {
            path: '/mobile/socket.io', // Path used in SocketService.js
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 10
        });

        socket.on('connect', () => {
            console.log('[STREAM] Connected to market data socket');
        });

        const normalizedSymbol = symbol.replace('/', '').toUpperCase();

        // Listen for ticker updates
        socket.on('market:ticker', (data) => {
            if (data.symbol === normalizedSymbol) {
                setTicker({
                    price: data.price,
                    change: data.change,
                    high: data.high,
                    low: data.low,
                    volume: data.volume
                });
            }
        });

        // Listen for new/updated klines
        socket.on('market:kline', (data) => {
            if (data.symbol === normalizedSymbol) {
                setLastKline(data.kline);
            }
        });

        socketRef.current = socket;

        return () => {
            console.log('[STREAM] Disconnecting market data socket');
            socket.disconnect();
        };
    }, [exchange, symbol]);

    return { ticker, lastKline };
}
