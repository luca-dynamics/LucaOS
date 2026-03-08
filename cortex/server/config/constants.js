import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const paths = require('./paths.cjs');

export const SERVER_PORT = process.env.SERVER_PORT || 3002;
export const WS_PORT = process.env.WS_PORT || 3003;
export const CORTEX_PORT = process.env.CORTEX_PORT || 8000;
export const AUTH_PORT = process.env.AUTH_PORT || SERVER_PORT;

// Storage Paths - MOVED TO USER DOCUMENTS for Production Persistence
export const LUCA_SYSTEM_DIR = paths.LUCA_SYSTEM_DIR;
export const LUCA_USER_DIR = paths.LUCA_USER_DIR;

// Data & Database Paths (System)
export const DATA_DIR = path.join(LUCA_SYSTEM_DIR, 'data');
export const MCP_SERVERS_DIR = path.join(LUCA_SYSTEM_DIR, 'mcp-servers');
export const CAPABILITIES_DIR = path.join(LUCA_SYSTEM_DIR, 'capabilities');
export const DRIVERS_DIR = path.join(LUCA_SYSTEM_DIR, 'drivers');
export const CERTS_DIR = path.join(LUCA_SYSTEM_DIR, 'security', 'certs');
export const WALLETS_DIR = path.join(LUCA_SYSTEM_DIR, 'wallets');
export const SECURITY_DIR = path.join(LUCA_SYSTEM_DIR, 'security');
export const VENV_DIR = paths.VENV_DIR;
export const PYTHON_BIN = paths.PYTHON_BIN;
export const RECOVERY_FILE = path.join(DATA_DIR, '.luca_recovery');
export const MEMORY_FILE = path.join(DATA_DIR, 'memory.json');
export const VECTOR_FILE = path.join(DATA_DIR, 'vectors.json');
export const GRAPH_FILE = path.join(DATA_DIR, 'knowledge_graph.json');
export const GOALS_FILE = path.join(DATA_DIR, 'goals.json');

// User Interaction & Productivity Paths (Documents)
export const MACROS_DIR = path.join(LUCA_USER_DIR, 'macros');
export const SKILLS_DIR = path.join(LUCA_USER_DIR, 'skills');
export const FORGE_DIR = path.join(LUCA_USER_DIR, 'forge');
export const EVOLUTION_DIR = path.join(LUCA_USER_DIR, 'evolution');
export const FACES_DIR = path.join(LUCA_USER_DIR, 'media', 'faces');
export const VOICE_DIR = path.join(LUCA_USER_DIR, 'media', 'voice');
export const CHROME_PROFILES_DIR = path.join(LUCA_USER_DIR, 'browser-profiles');

// Internal/Core paths
export const LUCA_TOOLS_DIR = CAPABILITIES_DIR; 
export const MANIFEST_FILE = path.join(LUCA_TOOLS_DIR, 'tool_manifest.json');

// IoT Defaults
export const ROKU_DEFAULT_PORT = 8060;

// Service URLs
export const CORTEX_URL = process.env.CORTEX_URL || `http://localhost:${CORTEX_PORT}`;
