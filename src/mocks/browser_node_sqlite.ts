/**
 * Browser-safe stand-in for `node:sqlite`.
 *
 * The web build has no filesystem and no SQLite, so every entry point throws
 * rather than pretending to store anything — a silent no-op store is how you
 * end up believing data was saved when it never was. Callers (db.js,
 * CheckpointManager, missionControl) already wrap construction in try/catch and
 * fall back to their in-memory mocks, so throwing here is the intended path.
 *
 * Vite maps `node:sqlite` to this file (see vite.config.ts aliases), matching
 * how the other `node:` builtins are shimmed for the browser.
 */
const UNAVAILABLE_MESSAGE =
  "node:sqlite is unavailable in the browser-safe LucaOS web build.";

export class DatabaseSync {
  constructor() {
    throw new Error(UNAVAILABLE_MESSAGE);
  }
}

export class StatementSync {
  constructor() {
    throw new Error(UNAVAILABLE_MESSAGE);
  }
}

export default { DatabaseSync, StatementSync };
