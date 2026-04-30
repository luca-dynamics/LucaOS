export const createRequire = () => () => ({});
export const promisify = (fn) => fn;
export const exec = () => {};
export const spawn = () => {};
export const setImmediate = (fn) => setTimeout(fn, 0);
export const clearImmediate = (id) => clearTimeout(id);

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
export const extname = (p) => '';

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
  timers
};
