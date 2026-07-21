import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import {
  applySkillPermissionDecision,
  type PersonalIntelligenceSkillPermissionDecision,
  type PersonalIntelligenceSkillPermissionGrantState,
} from "../personal-intelligence";
import { skillRegistryService } from "../services/skills/SkillRegistryService";
import { buildSkillPermissionGrantStateFromLive } from "../services/personalIntelligence/skillPermissionGrantBridge";

interface SkillPermissionGrantContextValue {
  state: PersonalIntelligenceSkillPermissionGrantState;
  decide: (gateId: string, decision: PersonalIntelligenceSkillPermissionDecision) => void;
}

const SkillPermissionGrantContext = createContext<SkillPermissionGrantContextValue | null>(null);

/**
 * Seed from the live skill registry so permission gates line up with the
 * skills SkillRegistryPanel shows. Falls back to fixtures when empty.
 */
function createInitialState(): PersonalIntelligenceSkillPermissionGrantState {
  try {
    return buildSkillPermissionGrantStateFromLive(skillRegistryService.listSkills());
  } catch {
    return buildSkillPermissionGrantStateFromLive([]);
  }
}

export function SkillPermissionGrantProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState(createInitialState);
  const decide = useCallback((gateId: string, decision: PersonalIntelligenceSkillPermissionDecision) => {
    setState((current) => applySkillPermissionDecision(current, gateId, decision));
  }, []);
  const value = useMemo(() => ({ state, decide }), [state, decide]);
  return <SkillPermissionGrantContext.Provider value={value}>{children}</SkillPermissionGrantContext.Provider>;
}

export function useSkillPermissionGrants(): SkillPermissionGrantContextValue {
  const value = useContext(SkillPermissionGrantContext);
  if (!value) throw new Error("useSkillPermissionGrants must be used within SkillPermissionGrantProvider");
  return value;
}
