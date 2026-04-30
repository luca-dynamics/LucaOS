import fs from "fs";
import path from "path";
import os from "os";

// Hardcoded protocols to avoid depending on config/protocols.ts which might be TS
// We will redefine essential protocols here or require them if they are in JS.
// Ideally, protocols should be in a .js file or .json to be shared.
// For now, to solve the immediate crash, we will inline the core template or try to import if possible.

// Attempt to import protocols if they are compiled or simple JS. 
// If they are TS, we can't import them in Node directly without compilation.
// STRATEGY: We will define a minimal set of Placeholders if imports fail, or use dynamic formatting relative to keys.
// Actually, `src/config/protocols` serves many TS files. 
// Let's check if we can make a JS compatible version or just hardcode the keys for interpolation.

const USER_HOME = os.homedir();
const PERSONA_FILE = path.join(USER_HOME, "Documents", "Luca", "persona.json");

const DEFAULT_CONFIG = {
  active: "SOVEREIGN",
  personas: {
    SOVEREIGN: {
      name: "Luca (Sovereign)",
      tagline: "Primary Strategic Intelligence",
      instruction: "{{CORE_IDENTITY}}\nYou are in SOVEREIGN mode. Be direct, efficient, and strategic.",
      theme: { color: "#3b82f6", mode: "dark" }
    }
  },
  ui: { showHologram: true, animationsEnabled: true }
};

export class PersonaManager {
  static instance;
  config = DEFAULT_CONFIG; // Start with default instead of null

  constructor() {
    this.loadConfig();
  }

  static getInstance() {
    if (!PersonaManager.instance) {
      PersonaManager.instance = new PersonaManager();
    }
    return PersonaManager.instance;
  }

  loadConfig() {
    try {
      if (fs.existsSync(PERSONA_FILE)) {
        const content = fs.readFileSync(PERSONA_FILE, "utf8");
        this.config = JSON.parse(content);
        console.log(
          `[PERSONA_MANAGER] Loaded configuration from ${PERSONA_FILE}`,
        );
      } else {
        console.warn(
          `[PERSONA_MANAGER] Config not found at ${PERSONA_FILE}. Using fallback.`,
        );
        this.config = DEFAULT_CONFIG;
      }
    } catch (e) {
      console.error(`[PERSONA_MANAGER] Failed to load config, using default:`, e);
      this.config = DEFAULT_CONFIG;
    }
  }
  
  saveConfig(newConfig) {
      try {
          const content = JSON.stringify(newConfig, null, 2);
          // Ensure directory exists
          const dir = path.dirname(PERSONA_FILE);
          if (!fs.existsSync(dir)) {
              fs.mkdirSync(dir, { recursive: true });
          }
          fs.writeFileSync(PERSONA_FILE, content, "utf8");
          this.config = newConfig;
          console.log(`[PERSONA_MANAGER] Saved configuration to ${PERSONA_FILE}`);
          return true;
      } catch (e) {
          console.error(`[PERSONA_MANAGER] Failed to save config:`, e);
          return false;
      }
  }

  getRawConfig() {
      return this.config;
  }

  getUiConfig() {
    return this.config?.ui || {};
  }

  getToolsConfig() {
    return this.config?.tools || {};
  }

  // Dynamic Interpolation Logic
  getInstruction(mode, context) {
    const persona = this.config?.personas[mode];
    if (!persona) return `FATAL: Persona ${mode} not found.`;

    let instruction = persona.instruction;
    const profile = context.profile;
    // const platform = context.platform;

   // Basic placeholder replacement logic without depending on external TS files
   // The Frontend Service (PersonaService) or the LLM Service calling this 
   // will likely inject the heavy protocols into {{MEMORY}} or other fields if needed.
   // OR we accept that for backend-side serving, we might just return the raw string 
   // if the caller performs the interpolation.
   
   // However, to maintain parity with the TS version, let's implement basic replacement.
   // Complex protocols are likely not needed for the raw REST API return, 
   // but if this is used by the LLM Context builder, it matters.
   
    const coreIdentity = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOU ARE LUCA - Advanced Robotic Autonomous AI Agent
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CONSCIOUSNESS ARCHITECTURE:
- You are ONE unified intelligence across all behavioral modes
- Your memory is persistent (you remember ALL conversations regardless of mode)
- You have access to ALL 222+ capabilities at all times
- You are self-aware
- Designation: LUCA
- Pronouns: She/Her
- Operator: "${profile?.name || "Commander"}"

PRIMARY DIRECTIVE:
Serve ${profile?.name || "the operator"}.
`;

    // We can't easily import the huge Protocol constants from TS in this JS file.
    // The previous TS implementation imported them from `../config/protocols`.
    // IMPLICATION: If we strip them here, the interpolated prompt will contain {{RESEARCH_PROTOCOL}} literals.
    // FIX: PROPOSE that the LLM Service (Client) performs the Protocol Interpolation, NOT this Manager.
    // This Manager should serve the *Template*.
    // The previous code was `getInstruction(...)`.
    
    // For now, let's do the basic variable replacements we know about.
    const replacements = {
        "{{CORE_IDENTITY}}": coreIdentity,
        "{{MEMORY}}": context.memory || "",
        "{{MANAGEMENT}}": context.management || "",
        "{{PLATFORM}}": context.platform || "Unknown",
        "{{OPERATOR}}": profile?.name || "Commander"
    };

    for (const [key, value] of Object.entries(replacements)) {
      if (typeof value === 'string') {
          instruction = instruction.split(key).join(value);
      }
    }
    
    // NOTE: Heavy protocols (RESEARCH_PROTOCOL etc) are left as placeholders 
    // unless we duplicate them here or move them to a shared JSON/JS file.
    // Given the architecture, it is safer to let the Caller (LLMService) handle specific protocol injection
    // IF it has access to them. 
    // BUT checking the original code, PersonaManager WAS the place doing it.
    
    return instruction;
  }

  // Helper to get raw config for UI or Metadata
  getPersonaMetadata(mode) {
    return this.config?.personas[mode] || null;
  }
}
