import CryptoJS from 'crypto-js';

export const createRequire = () => () => ({});
export const promisify = (fn) => fn;
export const exec = () => {};
export const spawn = () => {};
export const setImmediate = (fn) => setTimeout(fn, 0);
export const clearImmediate = (id) => clearTimeout(id);

export class EventEmitter {
  constructor() {
    this._events = new Map();
    this._maxListeners = 10;
  }

  on(eventName, listener) {
    if (typeof listener !== 'function') return this;
    const listeners = this._events.get(eventName) || [];
    listeners.push(listener);
    this._events.set(eventName, listeners);
    return this;
  }

  addListener(eventName, listener) {
    return this.on(eventName, listener);
  }

  once(eventName, listener) {
    if (typeof listener !== 'function') return this;
    const wrapped = (...args) => {
      this.off(eventName, wrapped);
      listener(...args);
    };
    wrapped.listener = listener;
    return this.on(eventName, wrapped);
  }

  off(eventName, listener) {
    const listeners = this._events.get(eventName);
    if (!listeners || typeof listener !== 'function') return this;
    const next = listeners.filter((candidate) => candidate !== listener && candidate.listener !== listener);
    if (next.length > 0) {
      this._events.set(eventName, next);
    } else {
      this._events.delete(eventName);
    }
    return this;
  }

  removeListener(eventName, listener) {
    return this.off(eventName, listener);
  }

  removeAllListeners(eventName) {
    if (eventName === undefined) {
      this._events.clear();
    } else {
      this._events.delete(eventName);
    }
    return this;
  }

  emit(eventName, ...args) {
    const listeners = [...(this._events.get(eventName) || [])];
    for (const listener of listeners) {
      listener(...args);
    }
    return listeners.length > 0;
  }

  listenerCount(eventName) {
    return (this._events.get(eventName) || []).length;
  }

  setMaxListeners(count) {
    this._maxListeners = Number.isFinite(Number(count)) ? Number(count) : this._maxListeners;
    return this;
  }

  getMaxListeners() {
    return this._maxListeners;
  }
}
 
// os mock
export const os = {
  platform: () => 'darwin',
  arch: () => 'arm64',
  cpus: () => ({ length: 8 }),
  freemem: () => 1024 * 1024 * 1024 * 4,
  totalmem: () => 1024 * 1024 * 1024 * 16,
  uptime: () => 1000,
  hostname: () => 'luca-os',
  type: () => 'Darwin',
  release: () => '23.0.0',
};

// url mock
export const url = {
  URL: globalThis.URL,
  URLSearchParams: globalThis.URLSearchParams,
  parse: (u) => new URL(u),
  format: (u) => u.toString(),
  fileURLToPath: (url) => {
    if (typeof url === 'string') {
      if (url.startsWith('file://')) {
        return url.substring(7);
      }
      return url;
    }
    return url.pathname || url.toString();
  },
};
export const fileURLToPath = (url) => {
  if (typeof url === 'string') {
    if (url.startsWith('file://')) {
      return url.substring(7);
    }
    return url;
  }
  return url.pathname || url.toString();
};

// fs mock
const _mockFS = new Set();
const _mockContents = new Map();
export const existsSync = (p) => _mockFS.has(String(p));
export const mkdirSync = (p) => { _mockFS.add(String(p)); };
export const readFileSync = (p) => _mockContents.get(String(p)) || '';
export const writeFileSync = (p, content) => {
  _mockFS.add(String(p));
  _mockContents.set(String(p), String(content));
};
export const unlinkSync = (p) => {
  _mockFS.delete(String(p));
  _mockContents.delete(String(p));
};
export const readdirSync = (dirPath) => {
  const dirStr = String(dirPath);
  const results = new Set();
  for (const item of _mockFS) {
    if (item.startsWith(dirStr) && item !== dirStr) {
      const rel = item.substring(dirStr.length).replace(/^[/\\]/, '');
      const firstSegment = rel.split(/[/\\]/)[0];
      if (firstSegment) results.add(firstSegment);
    }
  }
  return Array.from(results);
};
export const statSync = () => ({ isDirectory: () => true, mtime: { getTime: () => 0 } });
export const mkdtempSync = (prefix) => { const p = prefix + 'mock_tmp'; _mockFS.add(p); return p; };
export const rmSync = (p) => { _mockFS.delete(String(p)); _mockContents.delete(String(p)); };

// path mock
export const join = (...args) => args.join('/');
export const resolve = (...args) => args.join('/');
export const dirname = (p) => p;
export const basename = (p) => p;
export const extname = () => '';

// crypto mock — REAL synchronous hashing/HMAC via crypto-js.
//
// These previously returned the constants 'mock-hash' / 'mock-hmac' regardless
// of input, so any integrity or signature check compiled into the web build was
// trivially forgeable (produce the constant and you pass) and content hashing
// (e.g. screen-change detection) was broken. Backing them with crypto-js makes
// the digests real and input-dependent. Note: in a browser bundle the HMAC key
// is not secret, so this is integrity, not a server-grade secret — callers that
// need true secrecy already gate on webSafeMode.
function _toWordArray(data) {
  if (data == null) return CryptoJS.lib.WordArray.create();
  if (typeof data === 'string') return CryptoJS.enc.Utf8.parse(data);
  if (data instanceof ArrayBuffer) {
    return CryptoJS.lib.WordArray.create(new Uint8Array(data));
  }
  if (ArrayBuffer.isView(data)) {
    return CryptoJS.lib.WordArray.create(
      data instanceof Uint8Array ? data : new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
    );
  }
  return CryptoJS.enc.Utf8.parse(String(data));
}

function _encode(wordArray, encoding) {
  if (encoding === 'base64') return wordArray.toString(CryptoJS.enc.Base64);
  if (encoding === 'latin1' || encoding === 'binary') return wordArray.toString(CryptoJS.enc.Latin1);
  return wordArray.toString(CryptoJS.enc.Hex); // Node's default for digest()
}

function _digestor(compute) {
  let acc = CryptoJS.lib.WordArray.create();
  return {
    update(data) {
      acc = acc.concat(_toWordArray(data));
      return this;
    },
    digest(encoding) {
      return _encode(compute(acc), encoding);
    },
  };
}

export const createHash = (algorithm) => {
  const hashers = {
    md5: CryptoJS.MD5,
    sha1: CryptoJS.SHA1,
    sha256: CryptoJS.SHA256,
    sha512: CryptoJS.SHA512,
  };
  const fn = hashers[String(algorithm || '').toLowerCase()];
  if (!fn) throw new Error(`[node_polyfills] Unsupported hash algorithm: ${algorithm}`);
  return _digestor((wa) => fn(wa));
};

export const createHmac = (algorithm, key) => {
  const hmacs = {
    md5: CryptoJS.HmacMD5,
    sha1: CryptoJS.HmacSHA1,
    sha256: CryptoJS.HmacSHA256,
    sha512: CryptoJS.HmacSHA512,
  };
  const fn = hmacs[String(algorithm || '').toLowerCase()];
  if (!fn) throw new Error(`[node_polyfills] Unsupported HMAC algorithm: ${algorithm}`);
  const keyWA = _toWordArray(key);
  return _digestor((wa) => fn(wa, keyWA));
};
export const randomBytes = (size) => {
  const length = Number(size);
  if (!Number.isFinite(length) || length < 0) {
    throw new TypeError('randomBytes size must be a non-negative number');
  }

  const bytes = new Uint8Array(length);
  const webCrypto = globalThis.crypto || globalThis.msCrypto;

  if (!webCrypto || typeof webCrypto.getRandomValues !== 'function') {
    throw new Error('Secure randomBytes is unavailable in this browser-safe build.');
  }

  webCrypto.getRandomValues(bytes);
  // Node Buffers support `bytes.toString('hex' | 'base64')`; a raw Uint8Array
  // ignores the encoding arg (returns comma-separated decimals), which silently
  // breaks callers like SecureVault that do randomBytes(32).toString('hex').
  // Emulate the Buffer encodings so the browser-safe build behaves like Node.
  const nativeToString = Uint8Array.prototype.toString;
  bytes.toString = (encoding) => {
    if (encoding === 'hex') {
      let hex = '';
      for (let i = 0; i < bytes.length; i += 1) {
        hex += bytes[i].toString(16).padStart(2, '0');
      }
      return hex;
    }
    if (encoding === 'base64') {
      let binary = '';
      for (let i = 0; i < bytes.length; i += 1) {
        binary += String.fromCharCode(bytes[i]);
      }
      return typeof globalThis.btoa === 'function' ? globalThis.btoa(binary) : binary;
    }
    return nativeToString.call(bytes);
  };
  return bytes;
};

// util mock
export const inspect = (obj) => JSON.stringify(obj);

// stream mock
export class Stream {
  pipe(dest) { return dest; }
  on() { return this; }
  once() { return this; }
  emit() { return true; }
}
export const Readable = Stream;
export const Writable = Stream;
export const Duplex = Stream;
export const Transform = Stream;
export const PassThrough = Stream;

// timers mock
export const timers = {
  setImmediate,
  clearImmediate
};

// Export default object for default imports
export default {
  promisify,
  exec,
  spawn,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
  readdirSync,
  statSync,
  join,
  resolve,
  dirname,
  basename,
  extname,
  createHash,
  createHmac,
  randomBytes,
  inspect,
  setImmediate,
  clearImmediate,
  EventEmitter,
  Stream,
  Readable,
  Writable,
  Duplex,
  Transform,
  PassThrough,
  timers,
  os,
  url,
  fileURLToPath
};
