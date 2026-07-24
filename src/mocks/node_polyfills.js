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
//
// Under Node (vitest, electron main) fileURLToPath delegates to the real module.
// The naive string version below cannot handle a Windows `file:///C:/...` URL —
// it strips "file://" and leaves "/C:/...", which real readFileSync then
// resolves to "C:\C:\...". Real fileURLToPath gets the platform right. In the
// browser realUrl is null and the original string fallback is used.
const realUrl = (() => {
  try {
    if (
      typeof process !== 'undefined' &&
      typeof process.getBuiltinModule === 'function'
    ) {
      return process.getBuiltinModule('node:url');
    }
  } catch {
    // fall through to the string fallback
  }
  return null;
})();

const fileURLToPathFallback = (url) => {
  if (typeof url === 'string') {
    if (url.startsWith('file://')) {
      return url.substring(7);
    }
    return url;
  }
  return url.pathname || url.toString();
};

export const fileURLToPath = (value) =>
  realUrl ? realUrl.fileURLToPath(value) : fileURLToPathFallback(value);

export const url = {
  URL: globalThis.URL,
  URLSearchParams: globalThis.URLSearchParams,
  parse: (u) => new URL(u),
  format: (u) => u.toString(),
  fileURLToPath,
};

// fs mock
//
// Two behaviours combined:
//   1. An in-memory virtual filesystem (_mockFS / _mockContents) so browser
//      code that writes a path and reads it back within a session stays
//      consistent.
//   2. Real-module delegation for READS when one is reachable — true under Node
//      (vitest, electron main) via process.getBuiltinModule, false in the
//      browser. This is what makes source-assertion tests work: with a pure
//      `() => ''` stub every readFileSync returned an empty string, so
//      `toContain` failed and, worse, `not.toContain` passed vacuously,
//      reporting a safety property that was never actually checked.
//      getBuiltinModule returns the genuine builtin regardless of Vite's `fs`
//      alias, so there is no circular resolution back to this file.
//
// Writes only ever touch the in-memory store — never the real disk — so browser
// code exercised in a test can never mutate real files. Reads prefer an
// in-memory write from this session, then fall back to the real file, then ''.
const realFs = (() => {
  try {
    if (
      typeof process !== 'undefined' &&
      typeof process.getBuiltinModule === 'function'
    ) {
      return process.getBuiltinModule('node:fs');
    }
  } catch {
    // fall through to the in-memory / inert store
  }
  return null;
})();

const _mockFS = new Set();
const _mockContents = new Map();

export const existsSync = (p) => {
  const key = String(p);
  if (_mockContents.has(key) || _mockFS.has(key)) return true;
  if (realFs) {
    try { return realFs.existsSync(p); } catch { return false; }
  }
  return false;
};
export const mkdirSync = (p) => { _mockFS.add(String(p)); };
export const readFileSync = (p, ...rest) => {
  const key = String(p);
  if (_mockContents.has(key)) return _mockContents.get(key);
  if (realFs) return realFs.readFileSync(p, ...rest);
  return '';
};
export const writeFileSync = (p, content) => {
  _mockFS.add(String(p));
  _mockContents.set(String(p), String(content));
};
export const unlinkSync = (p) => {
  _mockFS.delete(String(p));
  _mockContents.delete(String(p));
};
export const readdirSync = (dirPath) => {
  if (realFs) {
    try {
      if (realFs.existsSync(dirPath)) return realFs.readdirSync(dirPath);
    } catch {
      // fall back to the in-memory listing
    }
  }
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
export const statSync = (p) => {
  if (realFs) {
    try {
      if (realFs.existsSync(p)) return realFs.statSync(p);
    } catch {
      // fall back to the mock stat
    }
  }
  return { isDirectory: () => true, mtime: { getTime: () => 0 } };
};
export const mkdtempSync = (prefix) => { const p = prefix + 'mock_tmp'; _mockFS.add(p); return p; };
export const rmSync = (p) => { _mockFS.delete(String(p)); _mockContents.delete(String(p)); };

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
