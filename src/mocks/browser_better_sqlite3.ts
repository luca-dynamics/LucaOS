const UNAVAILABLE_MESSAGE =
  "better-sqlite3 is unavailable in the browser-safe LucaOS web build.";

class BrowserUnavailableBetterSqlite3 {
  constructor() {
    throw new Error(UNAVAILABLE_MESSAGE);
  }
}

export default BrowserUnavailableBetterSqlite3;
export const Database = BrowserUnavailableBetterSqlite3;
export const SqliteError = Error;
