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
export const existsSync = () => false;
export const mkdirSync = () => {};
export const readFileSync = () => '';
export const writeFileSync = () => {};
export const unlinkSync = () => {};
export const readdirSync = () => [];
export const statSync = () => ({ mtime: { getTime: () => 0 } });

// path mock
export const join = (...args) => args.join('/');
export const resolve = (...args) => args.join('/');
export const dirname = (p) => p;
export const basename = (p) => p;
export const extname = () => '';

// crypto mock
export const createHash = () => ({
  update: () => ({
    digest: () => 'mock-hash'
  })
});
export const createHmac = () => ({
  update() { return this; },
  digest: () => 'mock-hmac'
});
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
