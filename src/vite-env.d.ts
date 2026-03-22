/// <reference types="vite/client" />

// Additional module declarations for packages without types
declare namespace Database {
  type Database = any;
}
declare module 'better-sqlite3' {
  const Database: any;
  export default Database;
}
