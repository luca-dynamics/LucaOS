import { FunctionDeclaration } from "@google/generative-ai";
import {
  PersonaType,
  PERSONA_SPECIALIZED_TOOLS,
} from "../config/personaConfig";
import { PersonaConfig } from "../types";
import { apiUrl } from "../config/api";

/**
 * Get tools for persona - ONLY CORE tools are loaded into active session by default
 * to optimize token usage. Other tools are discoverable via registry.
 */
export function getToolsForPersona(
  persona: PersonaType,
  allTools: FunctionDeclaration[],
): FunctionDeclaration[] {
  // Only return tools explicitly marked as CORE
  // We filter by looking at the registry metadata if possible, 
  // but since we only have FunctionDeclaration here, we rely on the registry to have pre-filtered.
  return allTools; // Note: LucaService now passes only CORE tools to this
}

/**
 * Get specialized tools for a persona (tools that are prioritized when switching to that mode)
 */
export function getSpecializedToolsForPersona(
  persona: PersonaType,
  allTools: FunctionDeclaration[],
): FunctionDeclaration[] {
  const specializedToolNames = PERSONA_SPECIALIZED_TOOLS[persona];

  if (!specializedToolNames || specializedToolNames.length === 0) {
    return []; // No specialized tools for this persona
  }

  // Return specialized tools for this persona
  const toolNamesSet = new Set(
    specializedToolNames.map((name) => name.toLowerCase()),
  );
  return allTools.filter(
    (tool) => tool.name && toolNamesSet.has(tool.name.toLowerCase()),
  );
}

// --- API Methods ---

export const getPersonaConfig = async (): Promise<PersonaConfig | null> => {
  try {
    const res = await fetch(apiUrl("/api/persona"));
    if (!res.ok) throw new Error("Failed to fetch persona config");
    return await res.json();
  } catch (error) {
    console.error("[PersonaService] Error fetching config:", error);
    return null;
  }
};

export const savePersonaConfig = async (
  config: PersonaConfig,
): Promise<boolean> => {
  try {
    const res = await fetch(apiUrl("/api/persona"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    return res.ok;
  } catch (error) {
    console.error("[PersonaService] Error saving config:", error);
    return false;
  }
};

export const getAvailablePersonas = async (): Promise<string[]> => {
  try {
    const res = await fetch(apiUrl("/api/persona/list"));
    if (!res.ok) throw new Error("Failed to fetch persona list");
    const data = await res.json();
    return data.personas || [];
  } catch (error) {
    console.error("[PersonaService] Error fetching persona list:", error);
    return [];
  }
};
