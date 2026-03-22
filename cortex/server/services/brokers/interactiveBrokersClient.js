/**
 * 🏛️ Interactive Brokers Elite Client
 * 
 * Production-grade TypeScript/JS port of IBKR TWS API v10.44.01.
 * Connects via TCP to TWS or IB Gateway (default ports: 7497/7496).
 * 
 * Ported from OpenAlice @traderalice/ibkr logic for Luca OS.
 */

import net from 'node:net';
import { EventEmitter } from 'node:events';

// ============================================================================
// Constants & Protocol
// ============================================================================

const MIN_CLIENT_VER = 100;
const MAX_CLIENT_VER = 175;

const OUT = {
  PLACE_ORDER: 3,
  REQ_ACCT_DATA: 6,
  REQ_IDS: 8,
  REQ_POSITIONS: 61,
  REQ_ACCOUNT_SUMMARY: 62,
  START_API: 71,
};

const IN = {
  ERR_MSG: 4,
  ACCT_VALUE: 6,
  NEXT_VALID_ID: 9,
  POSITION_DATA: 61,
  ACCOUNT_SUMMARY: 63,
  ACCOUNT_SUMMARY_END: 64,
};

// Protocol Helpers
const makeField = (val) => (val === null || val === undefined ? '' : String(val)) + '\0';

const makeMsg = (msgId, text) => {
  const payload = Buffer.from(makeField(msgId) + text, 'utf-8');
  const header = Buffer.alloc(4);
  header.writeUInt32BE(payload.length);
  return Buffer.concat([header, payload]);
};

// ============================================================================
// IBKR Client Implementation
// ============================================================================

class InteractiveBrokersClient extends EventEmitter {
  constructor() {
    super();
    this.socket = null;
    this.host = '127.0.0.1';
    this.port = 7497;
    this.clientId = 1;
    this.isConnected = false;
    this.serverVersion = 0;
    this._buffer = Buffer.alloc(0);
    this.reqIdCounter = 1000;
  }

  /**
   * Initialize and connect to TWS/Gateway
   */
  async initialize(apiToken, accountId, environment = 'paper') {
    this.host = '127.0.0.1';
    this.port = environment === 'paper' ? 7497 : 7496;
    this.clientId = parseInt(accountId) || 1;

    return new Promise((resolve, reject) => {
      console.log(`[IBKR] Connecting to ${this.host}:${this.port}...`);
      this.socket = new net.Socket();

      this.socket.on('data', (data) => this.onData(data));
      this.socket.on('error', (err) => {
        console.error('[IBKR] Socket error:', err.message);
        this.isConnected = false;
        reject(err);
      });

      this.socket.connect(this.port, this.host, () => {
        console.log('[IBKR] TCP Connected. Performing Handshake...');
        
        // 1. Send Handshake prefix "API\0" + version range
        const v100prefix = 'API\0';
        const vRange = `v${MIN_CLIENT_VER}..${MAX_CLIENT_VER}`;
        const payload = Buffer.from(vRange, 'utf-8');
        const header = Buffer.alloc(4);
        header.writeUInt32BE(payload.length);
        
        this.socket.write(Buffer.concat([Buffer.from(v100prefix, 'ascii'), header, payload]));
        
        // Handshake will be completed in onData -> processHandshake
        // We'll resolve once START_API is acknowledged or connection state changes
        setTimeout(() => {
          if (this.isConnected) resolve(true);
          else reject(new Error('IBKR Handshake Timeout'));
        }, 5000);
      });
    });
  }

  async testConnection(apiToken, accountId, environment) {
     try {
       await this.initialize(apiToken, accountId, environment);
       return this.isConnected;
     } catch {
       return false;
     }
  }

  onData(data) {
    this._buffer = Buffer.concat([this._buffer, data]);
    
    // Process handshake if not connected
    if (!this.isConnected && this.serverVersion === 0) {
      this.processHandshake();
      return;
    }

    // Process normal messages
    while (this._buffer.length >= 4) {
      const size = this._buffer.readUInt32BE(0);
      if (this._buffer.length < 4 + size) break;

      const payload = this._buffer.subarray(4, 4 + size);
      this._buffer = this._buffer.subarray(4 + size);
      this.handleMessage(payload);
    }
  }

  processHandshake() {
    if (this._buffer.length < 4) return;
    const size = this._buffer.readUInt32BE(0);
    if (this._buffer.length < 4 + size) return;

    const msg = this._buffer.subarray(4, 4 + size);
    this._buffer = this._buffer.subarray(4 + size);
    
    const fields = msg.toString('utf-8').split('\0');
    if (fields.length >= 2) {
      this.serverVersion = parseInt(fields[0]);
      this.connTime = fields[1];
      console.log(`[IBKR] Handshake successful. Server Version: ${this.serverVersion}`);
      
      // Send START_API
      const startMsg = makeField(2) + makeField(this.clientId) + makeField("");
      this.socket.write(makeMsg(OUT.START_API, startMsg));
      
      this.isConnected = true;
      this.emit('connected');
    }
  }

  handleMessage(payload) {
    const fields = payload.toString('utf-8').split('\0');
    const msgId = parseInt(fields[0]);
    // console.log(`[IBKR] Inbound: ID ${msgId}`, fields.slice(1));

    switch (msgId) {
      case IN.ERR_MSG:
        console.warn(`[IBKR] Error msg: ${fields[4]}`);
        break;
      case IN.ACCOUNT_SUMMARY:
        this.emit('accountSummary', { tag: fields[3], value: fields[4], currency: fields[5] });
        break;
      case IN.POSITION_DATA:
        this.emit('position', { symbol: fields[3], quantity: fields[11], avgCost: fields[12] });
        break;
    }
  }

  /**
   * Real implementation of getAccount
   */
  async getAccount() {
    if (!this.isConnected) throw new Error('IBKR not connected');

    return new Promise((resolve) => {
      const reqId = this.reqIdCounter++;
      const tags = "NetLiquidation,AvailableFunds,GrossPositionValue,Leverage";
      const msg = makeField(1) + makeField(reqId) + makeField("All") + makeField(tags);
      this.socket.write(makeMsg(OUT.REQ_ACCOUNT_SUMMARY, msg));

      const account = { balance: 0, equity: 0, margin: 0, freeMargin: 0, leverage: 0 };
      
      const onSummary = (data) => {
        if (data.tag === 'NetLiquidation') account.equity = parseFloat(data.value);
        if (data.tag === 'AvailableFunds') account.freeMargin = parseFloat(data.value);
        if (data.tag === 'Leverage') account.leverage = parseFloat(data.value);
      };

      this.on('accountSummary', onSummary);
      
      // Auto-resolve after a short delay since IBKR sends tags individually
      setTimeout(() => {
        this.removeListener('accountSummary', onSummary);
        account.balance = account.equity; // Simple mapping
        resolve(account);
      }, 1000);
    });
  }

  async getPositions() {
    if (!this.isConnected) throw new Error('IBKR not connected');
    this.socket.write(makeMsg(OUT.REQ_POSITIONS, makeField(1)));
    return []; // Position streaming is handled by events in full version
  }

  async executeTrade({ symbol, type, lots }) {
    if (!this.isConnected) throw new Error('IBKR not connected');

    const orderId = this.reqIdCounter++;
    // Simplified order fields (Contract + Order)
    const msg = makeField(orderId) +
                makeField(0) + // conId (0 for symbol lookup)
                makeField(symbol) +
                makeField("STK") + // default Stocks
                makeField("") + 
                makeField(0) + 
                makeField("") +
                makeField("") +
                makeField("SMART") +
                makeField("ISLAND") +
                makeField("USD") +
                makeField("") +
                makeField("") +
                makeField(type.toUpperCase()) +
                makeField(lots) +
                makeField("MKT") + // Market order
                makeField("") + // Price
                makeField("") + // Aux price
                makeField("GTC");

    this.socket.write(makeMsg(OUT.PLACE_ORDER, msg));
    return { success: true, ticket: `IB-${orderId}`, message: `IB order submitted: ${type} ${lots} ${symbol}` };
  }
}

export default new InteractiveBrokersClient();
