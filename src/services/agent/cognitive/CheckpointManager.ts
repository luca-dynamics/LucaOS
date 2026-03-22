
// Runs in Electron main process, accessed via IPC, or in Node server

import { LucaLinkSync } from "./LucaLinkSync";
import type { Checkpoint, CheckpointQuery } from "./types";

// Environment detection
const isElectron = typeof process !== 'undefined' && process.versions && !!process.versions.electron;

export class CheckpointManager {
  private db: any;
  private memoryCache: Map<string, Checkpoint>;
  private lucaLink: LucaLinkSync;
  private initialized: boolean = false;

  constructor() {
    this.memoryCache = new Map();
    this.lucaLink = new LucaLinkSync();
    
    // Initializing the DB asynchronously in the background or on-demand
    this.ensureInitialized();
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    try {
      const path = (await import("path")).default;
      const fs = (await import("fs")).default;

      let dbPath: string;
      
      if (isElectron) {
        const { app } = await import("electron");
        dbPath = path.join(app.getPath("userData"), "agent", "checkpoints.db");
      } else {
        // Fallback to cortex data dir for Node server
        const constants = await import("../../../../cortex/server/config/constants.js");
        const DATA_DIR = constants.DATA_DIR || path.join(process.cwd(), '.luca', 'data');
        dbPath = path.join(DATA_DIR, "agent", "checkpoints.db");
      }

      // Ensure directory exists
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      try {
        const Database = (await import("better-sqlite3")).default;
        this.db = new Database(dbPath);
        this.initSchema();
        console.log("[CheckpointManager] Initialized at:", dbPath);
      } catch (dbErr: any) {
        console.warn("[CheckpointManager] Native better-sqlite3 failed, using mock:", dbErr.message);
        this.setupMock();
      }
    } catch (err: any) {
      console.error("[CheckpointManager] Initialization error:", err);
      this.setupMock();
    }
    
    this.initialized = true;
  }

  private setupMock(): void {
    this.db = {
      exec: () => {},
      prepare: () => ({
        run: () => ({ changes: 0, lastInsertRowid: 0 }),
        get: () => null,
        all: () => []
      }),
      close: () => {}
    };
  }

  /**
   * Initialize database schema
   */
  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS checkpoints (
        id TEXT PRIMARY KEY,
        workflow_id TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        current_step INTEGER NOT NULL,
        completed_steps TEXT NOT NULL,
        context TEXT NOT NULL,
        system_state TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_workflow_id 
        ON checkpoints(workflow_id);
      
      CREATE INDEX IF NOT EXISTS idx_timestamp 
        ON checkpoints(timestamp);
    `);
  }

  /**
   * Save checkpoint to database and cache
   */
  save(checkpoint: Checkpoint): void {
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO checkpoints 
        (id, workflow_id, timestamp, current_step, completed_steps, context, system_state)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        checkpoint.id,
        checkpoint.workflowId,
        checkpoint.timestamp,
        checkpoint.currentStep,
        JSON.stringify(checkpoint.completedSteps),
        JSON.stringify(checkpoint.context),
        checkpoint.systemState ? JSON.stringify(checkpoint.systemState) : null
      );

      // Update memory cache
      this.memoryCache.set(checkpoint.workflowId, checkpoint);

      // Sync to Luca Link (cross-device) - non-blocking
      if (this.lucaLink.isConnected()) {
        this.lucaLink.syncCheckpoint(checkpoint).catch((err) => {
          console.warn("[CheckpointManager] Luca Link sync failed:", err);
        });
      }

      console.log("[CheckpointManager] Saved checkpoint:", checkpoint.id);
    } catch (error) {
      console.error("[CheckpointManager] Save failed:", error);
      throw error;
    }
  }

  /**
   * Restore checkpoint from cache or database
   */
  async restore(workflowId: string): Promise<Checkpoint | null> {
    try {
      // Try memory cache first
      const cached = this.memoryCache.get(workflowId);
      if (cached) {
        console.log("[CheckpointManager] Restored from cache:", workflowId);
        return cached;
      }

      // Query database
      const stmt = this.db.prepare(`
        SELECT * FROM checkpoints 
        WHERE workflow_id = ? 
        ORDER BY timestamp DESC 
        LIMIT 1
      `);

      const row = stmt.get(workflowId) as any;

      if (!row) {
        // Try Luca Link (cross-device) as fallback
        if (this.lucaLink.isConnected()) {
          const remote = await this.lucaLink.fetchCheckpoint(workflowId);
          if (remote) {
            console.log(
              "[CheckpointManager] Restored from Luca Link:",
              workflowId
            );
            return remote;
          }
        }
        console.log("[CheckpointManager] No checkpoint found:", workflowId);
        return null;
      }

      const checkpoint: Checkpoint = {
        id: row.id,
        workflowId: row.workflow_id,
        timestamp: row.timestamp,
        currentStep: row.current_step,
        completedSteps: JSON.parse(row.completed_steps),
        context: JSON.parse(row.context),
        systemState: row.system_state
          ? JSON.parse(row.system_state)
          : undefined,
      };

      // Cache it
      this.memoryCache.set(workflowId, checkpoint);

      console.log("[CheckpointManager] Restored from DB:", workflowId);
      return checkpoint;
    } catch (error) {
      console.error("[CheckpointManager] Restore failed:", error);
      return null;
    }
  }

  /**
   * Query checkpoints with filters
   */
  query(filters: CheckpointQuery): Checkpoint[] {
    try {
      let sql = "SELECT * FROM checkpoints WHERE 1=1";
      const params: any[] = [];

      if (filters.workflowId) {
        sql += " AND workflow_id = ?";
        params.push(filters.workflowId);
      }

      if (filters.afterTimestamp) {
        sql += " AND timestamp > ?";
        params.push(filters.afterTimestamp);
      }

      sql += " ORDER BY timestamp DESC";

      if (filters.limit) {
        sql += " LIMIT ?";
        params.push(filters.limit);
      }

      const stmt = this.db.prepare(sql);
      const rows = stmt.all(...params) as any[];

      return rows.map((row) => ({
        id: row.id,
        workflowId: row.workflow_id,
        timestamp: row.timestamp,
        currentStep: row.current_step,
        completedSteps: JSON.parse(row.completed_steps),
        context: JSON.parse(row.context),
        systemState: row.system_state
          ? JSON.parse(row.system_state)
          : undefined,
      }));
    } catch (error) {
      console.error("[CheckpointManager] Query failed:", error);
      return [];
    }
  }

  /**
   * Delete checkpoint
   */
  delete(checkpointId: string): void {
    try {
      const stmt = this.db.prepare("DELETE FROM checkpoints WHERE id = ?");
      stmt.run(checkpointId);

      // Remove from cache
      this.memoryCache.forEach((value, key) => {
        if (value.id === checkpointId) {
          this.memoryCache.delete(key);
        }
      });

      console.log("[CheckpointManager] Deleted checkpoint:", checkpointId);
    } catch (error) {
      console.error("[CheckpointManager] Delete failed:", error);
      throw error;
    }
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
    this.memoryCache.clear();
    console.log("[CheckpointManager] Closed");
  }
}
