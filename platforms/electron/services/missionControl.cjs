/* eslint-disable @typescript-eslint/no-require-imports */
const path = require('path');
const fs = require('fs');

let Database;
try {
  Database = require('better-sqlite3');
} catch (error) {
  console.warn(`[MISSION_CONTROL] better-sqlite3 unavailable; using memory fallback. ${error.message}`);
}

class InMemoryMissionControlStore {
  constructor() {
    this.nextMissionId = 1;
    this.nextGoalId = 1;
    this.missions = [];
    this.goals = [];
  }

  initSchema() {
    console.log("[MISSION_CONTROL] Memory fallback ready.");
  }

  startMission(title, metadata = {}) {
    const now = Date.now();
    const id = this.nextMissionId++;
    this.missions.push({
      id,
      title,
      status: 'ACTIVE',
      created_at: now,
      updated_at: now,
      metadata: JSON.stringify(metadata),
    });
    return id;
  }

  addGoal(missionId, description, dependencyId = null) {
    const id = this.nextGoalId++;
    this.goals.push({
      id,
      mission_id: missionId,
      description,
      status: 'PENDING',
      dependency_id: dependencyId,
      metadata: null,
    });
    return id;
  }

  updateGoalStatus(goalId, status) {
    const goal = this.goals.find((item) => item.id === goalId);
    if (!goal) return;
    goal.status = status;
    const mission = this.missions.find((item) => item.id === goal.mission_id);
    if (mission) mission.updated_at = Date.now();
  }

  getActiveMissionContext() {
    const activeMission = this.missions
      .filter((item) => item.status === 'ACTIVE')
      .sort((a, b) => b.updated_at - a.updated_at)[0];

    if (!activeMission) return "No active mission.";

    const goals = this.goals.filter((item) => item.mission_id === activeMission.id);
    let context = `[MISSION: ${activeMission.title}]\n`;
    context += `Status: ${activeMission.status}\n`;
    context += `Goals:\n`;

    goals.forEach((goal) => {
      const statusIcon =
        goal.status === "COMPLETED" ? "[x]" : goal.status === "IN_PROGRESS" ? "[/]" : "[ ]";
      context += `${statusIcon} ${goal.description}${goal.dependency_id ? ` (Depends on ${goal.dependency_id})` : ""}\n`;
    });

    return context;
  }

  archiveMission(missionId) {
    const mission = this.missions.find((item) => item.id === missionId);
    if (!mission) return;
    mission.status = 'ARCHIVED';
    mission.updated_at = Date.now();
  }
}

class MissionControl {
  constructor(userDataPath) {
    const dbDir = path.join(userDataPath, 'missions');
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
    
    const dbPath = path.join(dbDir, 'missions.db');
    console.log(`[MISSION_CONTROL] Initializing database at: ${dbPath}`);

    if (!Database) {
      return new InMemoryMissionControlStore();
    }
    
    try {
      this.db = new Database(dbPath);
      this.initSchema();
    } catch (error) {
      console.warn(`[MISSION_CONTROL] Native database unavailable; using memory fallback. ${error.message}`);
      return new InMemoryMissionControlStore();
    }
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

  // Structured read of the active mission + its goals (for the renderer's
  // Personal Intelligence mission surface). getActiveMissionContext() returns a
  // formatted string for the LLM; this returns the raw rows so the UI can shape
  // them itself. Read-only.
  getActiveMissionStructured() {
    const mission = this.db.prepare("SELECT * FROM missions WHERE status = 'ACTIVE' ORDER BY updated_at DESC LIMIT 1").get();
    if (!mission) return null;
    const goals = this.db.prepare("SELECT * FROM goals WHERE mission_id = ? ORDER BY id ASC").all(mission.id);
    return { mission, goals };
  }

  archiveMission(missionId) {
    this.db.prepare("UPDATE missions SET status = 'ARCHIVED', updated_at = ? WHERE id = ?").run(Date.now(), missionId);
  }
}

module.exports = MissionControl;
