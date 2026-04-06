import WebSocket from 'ws';
import { socketService } from './socketService.js';

/**
 * 📈 Market Streamer Service
 * 
 * Provides real-time market data (Price, Tickers, Klines) via WebSockets.
 * Relays data to the frontend using the existing Socket.io infrastructure.
 * 
 * NoFx Parity: Mirroring the Go-based market/websocket_client.go pattern.
 */
class MarketStreamer {
    constructor() {
        this.connections = new Map(); // exchange -> ws
        this.activeStreams = new Set();
        this.isInitialized = false;
    }

    /**
     * Initialize connection to an exchange
     */
    async initialize(exchange = 'binance') {
        const id = exchange.toLowerCase();
        if (this.connections.has(id)) return;

        let url;
        switch (id) {
            case 'binance':
                url = 'wss://fstream.binance.com/ws';
                break;
            case 'bybit':
                url = 'wss://stream.bybit.com/v5/public/linear';
                break;
            case 'okx':
                url = 'wss://ws.okx.com:8443/ws/v5/public';
                break;
            case 'hyperliquid':
                url = 'wss://api.hyperliquid.xyz/ws';
                break;
            default:
                url = 'wss://fstream.binance.com/ws'; // Fallback
        }

        console.log(`[MARKET] Initializing stream for ${id} @ ${url}...`);

        try {
            const ws = new WebSocket(url);

            ws.on('open', () => {
                console.log(`[MARKET] WebSocket connected to ${exchange}`);
                // Re-subscribe to existing active streams if any
                this._resubscribe(exchange);
            });

            ws.on('message', (data) => {
                this._handleMessage(exchange, data);
            });

            ws.on('error', (err) => {
                console.error(`[MARKET] ${exchange} stream error:`, err.message);
            });

            ws.on('close', () => {
                console.warn(`[MARKET] ${exchange} stream closed. Reconnecting in 5s...`);
                this.connections.delete(exchange);
                setTimeout(() => this.initialize(exchange), 5000);
            });

            this.connections.set(exchange, ws);
            this.isInitialized = true;
        } catch (e) {
            console.error(`[MARKET] Failed to connect to ${exchange}:`, e.message);
            setTimeout(() => this.initialize(exchange), 5000);
        }
    }

    /**
     * Subscribe to a symbol's ticker and klines
     */
    subscribe(exchange, symbol) {
        const id = exchange.toLowerCase();
        if (!this.connections.has(id)) {
            this.initialize(id).then(() => this.subscribe(id, symbol));
            return;
        }

        const ws = this.connections.get(id);
        if (ws.readyState !== WebSocket.OPEN) return;

        let streams = [];
        let subMsg = {};

        if (id === 'binance') {
            const lowerSymbol = symbol.toLowerCase().replace('/', '');
            streams = [`${lowerSymbol}@ticker`, `${lowerSymbol}@kline_1m`];
            subMsg = { method: 'SUBSCRIBE', params: streams, id: Date.now() };
        } else if (id === 'bybit') {
            // Bybit uses Linear Perpetual topic format
            const bybitSymbol = symbol.replace('/', '');
            streams = [`tickers.${bybitSymbol}`, `kline.1.${bybitSymbol}`];
            subMsg = { op: 'subscribe', args: streams };
        } else if (id === 'okx') {
            // OKX uses instId format
            const okxSymbol = symbol.replace('/', '-');
            subMsg = { 
                op: 'subscribe', 
                args: [
                    { channel: 'tickers', instId: okxSymbol },
                    { channel: 'candle1m', instId: okxSymbol }
                ] 
            };
        }

        if (streams.length > 0) streams.forEach(s => this.activeStreams.add(s));

        ws.send(JSON.stringify(subMsg));
        console.log(`[MARKET] Sent subscription to ${id} for ${symbol}`);
    }

    /**
     * Unsubscribe from a symbol
     */
    unsubscribe(exchange, symbol) {
        const id = exchange.toLowerCase();
        const ws = this.connections.get(id);
        if (!ws || ws.readyState !== WebSocket.OPEN) return;

        let unsubMsg = {};
        if (id === 'binance') {
            const lowerSymbol = symbol.toLowerCase().replace('/', '');
            unsubMsg = { method: 'UNSUBSCRIBE', params: [`${lowerSymbol}@ticker`, `${lowerSymbol}@kline_1m`], id: Date.now() };
        } else if (id === 'bybit') {
            const bybitSymbol = symbol.replace('/', '');
            unsubMsg = { op: 'unsubscribe', args: [`tickers.${bybitSymbol}`, `kline.1.${bybitSymbol}`] };
        } else if (id === 'okx') {
            const okxSymbol = symbol.replace('/', '-');
            unsubMsg = { 
                op: 'unsubscribe', 
                args: [
                    { channel: 'tickers', instId: okxSymbol },
                    { channel: 'candle1m', instId: okxSymbol }
                ] 
            };
        }

        ws.send(JSON.stringify(unsubMsg));
    }

    /**
     * Internal: Handle incoming messages and relay to Socket.io
     */
    _handleMessage(exchange, data) {
        try {
            const raw = JSON.parse(data.toString());
            const id = exchange.toLowerCase();
            
            // --- Binance Mapping ---
            if (id === 'binance') {
                if (raw.e === '24hrTicker') {
                    this._broadcast('market:ticker', {
                        exchange,
                        symbol: raw.s,
                        price: parseFloat(raw.c),
                        change: parseFloat(raw.P),
                        high: parseFloat(raw.h),
                        low: parseFloat(raw.l),
                        volume: parseFloat(raw.v),
                        timestamp: raw.E
                    });
                } else if (raw.e === 'kline') {
                    this._broadcast('market:kline', {
                        exchange,
                        symbol: raw.s,
                        kline: {
                            t: raw.k.t,
                            o: parseFloat(raw.k.o),
                            h: parseFloat(raw.k.h),
                            l: parseFloat(raw.k.l),
                            c: parseFloat(raw.k.c),
                            v: parseFloat(raw.k.v),
                            x: raw.k.x // is closed
                        }
                    });
                }
            }
            
            // --- Bybit Mapping ---
            else if (id === 'bybit') {
                if (raw.topic?.includes('ticker')) {
                    const d = raw.data;
                    this._broadcast('market:ticker', {
                        exchange,
                        symbol: raw.topic.split('.').pop(),
                        price: parseFloat(d.lastPrice),
                        change: parseFloat(d.price24hPcnt) * 100, // Bybit is decimal
                        high: parseFloat(d.highPrice24h),
                        low: parseFloat(d.lowPrice24h),
                        volume: parseFloat(d.volume24h),
                        timestamp: raw.ts
                    });
                } else if (raw.topic?.includes('kline')) {
                    const d = raw.data[0];
                    this._broadcast('market:kline', {
                        exchange,
                        symbol: raw.topic.split('.').pop(),
                        kline: {
                            t: parseInt(d.start),
                            o: parseFloat(d.open),
                            h: parseFloat(d.high),
                            l: parseFloat(d.low),
                            c: parseFloat(d.close),
                            v: parseFloat(d.volume),
                            x: d.confirm // is closed
                        }
                    });
                }
            }

            // --- OKX Mapping ---
            else if (id === 'okx') {
                if (raw.arg?.channel === 'tickers') {
                    const d = raw.data[0];
                    this._broadcast('market:ticker', {
                        exchange,
                        symbol: raw.arg.instId,
                        price: parseFloat(d.last),
                        change: ((parseFloat(d.last) - parseFloat(d.open24h)) / parseFloat(d.open24h)) * 100,
                        high: parseFloat(d.high24h),
                        low: parseFloat(d.low24h),
                        volume: parseFloat(d.vol24h),
                        timestamp: parseInt(d.ts)
                    });
                } else if (raw.arg?.channel?.includes('candle')) {
                    const d = raw.data[0]; // [ts, o, h, l, c, vol, volCcy, volCcyQuote, confirm]
                    this._broadcast('market:kline', {
                        exchange,
                        symbol: raw.arg.instId,
                        kline: {
                            t: parseInt(d[0]),
                            o: parseFloat(d[1]),
                            h: parseFloat(d[2]),
                            l: parseFloat(d[3]),
                            c: parseFloat(d[4]),
                            v: parseFloat(d[5]),
                            x: d[8] === '1'
                        }
                    });
                }
            }
        } catch (e) {
            // Ignore non-json or unexpected formats
        }
    }

    /**
     * Internal: Re-subscribe after reconnection
     */
    _resubscribe(exchange) {
        const ws = this.connections.get(exchange);
        if (ws && this.activeStreams.size > 0) {
            ws.send(JSON.stringify({
                method: 'SUBSCRIBE',
                params: Array.from(this.activeStreams),
                id: Date.now()
            }));
        }
    }

    /**
     * Internal: Broadcast to frontend via Socket.io
     */
    _broadcast(event, data) {
        // Only broadcast if socketService is running
        // This avoids starting the socket server prematurely
        if (socketService.isRunning()) {
            socketService.getIO().emit(event, data);
        }
    }
}

export const marketStreamer = new MarketStreamer();
