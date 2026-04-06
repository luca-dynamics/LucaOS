export const createRequire = () => () => ({});
export const promisify = (fn) => fn;
export const exec = () => {};
export const spawn = () => {};
export const setImmediate = (fn) => setTimeout(fn, 0);
export const clearImmediate = (id) => clearTimeout(id);
 
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
  URL: window.URL,
  URLSearchParams: window.URLSearchParams,
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
  inspect,
  setImmediate,
  clearImmediate,
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
