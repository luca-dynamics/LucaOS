/* eslint-disable @typescript-eslint/no-require-imports */
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class MissionControl {
  constructor(userDataPath) {
    const dbDir = path.join(userDataPath, 'missions');
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
    
    const dbPath = path.join(dbDir, 'missions.db');
    console.log(`[MISSION_CONTROL] Initializing database at: ${dbPath}`);
    
    this.db = new Database(dbPath);
    this.initSchema();
  }

  initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS missions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        status TEXT DEFAULT 'ACTIVE',
        created_at INTEGER,
        updated_at INTEGER,
        metadata TEXT
      );

      CREATE TABLE IF NOT EXISTS goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mission_id INTEGER,
        description TEXT NOT NULL,
        status TEXT DEFAULT 'PENDING',
        dependency_id INTEGER,
        metadata TEXT,
        FOREIGN KEY(mission_id) REFERENCES missions(id)
      );
    `);
    console.log("[MISSION_CONTROL] Schema verified.");
  }

  startMission(title, metadata = {}) {
    const now = Date.now();
    const result = this.db.prepare(`
      INSERT INTO missions (title, created_at, updated_at, metadata)
      VALUES (?, ?, ?, ?)
    `).run(title, now, now, JSON.stringify(metadata));
    return result.lastInsertRowid;
  }

  addGoal(missionId, description, dependencyId = null) {
    const result = this.db.prepare(`
      INSERT INTO goals (mission_id, description, dependency_id)
      VALUES (?, ?, ?)
    `).run(missionId, description, dependencyId);
    return result.lastInsertRowid;
  }

  updateGoalStatus(goalId, status) {
    this.db.prepare(`
      UPDATE goals SET status = ? WHERE id = ?
    `).run(status, goalId);

    const goal = this.db.prepare("SELECT mission_id FROM goals WHERE id = ?").get(goalId);
    if (goal) {
      this.db.prepare("UPDATE missions SET updated_at = ? WHERE id = ?").run(Date.now(), goal.mission_id);
    }
  }

  getActiveMissionContext() {
    const activeMission = this.db.prepare("SELECT * FROM missions WHERE status = 'ACTIVE' ORDER BY updated_at DESC LIMIT 1").get();
    
    if (!activeMission) return "No active mission.";

    const goals = this.db.prepare("SELECT * FROM goals WHERE mission_id = ?").all(activeMission.id);
    
    let context = `[MISSION: ${activeMission.title}]\n`;
    context += `Status: ${activeMission.status}\n`;
    context += `Goals:\n`;
    
    goals.forEach(g => {
      const statusIcon = g.status === "COMPLETED" ? "[x]" : g.status === "IN_PROGRESS" ? "[/]" : "[ ]";
      context += `${statusIcon} ${g.description}${g.dependency_id ? ` (Depends on ${g.dependency_id})` : ""}\n`;
    });

    return context;
  }

  archiveMission(missionId) {
    this.db.prepare("UPDATE missions SET status = 'ARCHIVED', updated_at = ? WHERE id = ?").run(Date.now(), missionId);
  }
}

module.exports = MissionControl;
