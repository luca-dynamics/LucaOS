/// <reference types="vite/client" />

// Additional module declarations for packages without types
declare namespace Database {
  type Database = any;
}
declare module 'better-sqlite3' {
  const Database: any;
  export default Database;
}

// Built-in as of Node 22.5 / Electron 40. Declared because the browser build
// aliases it to a stub and @types/node may lag the runtime.
declare module 'node:sqlite' {
  export const DatabaseSync: any;
  export const StatementSync: any;
}
