import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import {
  applySkillPermissionDecision,
  createSkillPermissionGrantState,
  createPersonalIntelligenceSkillSandboxPlan,
  personalIntelligenceSkillSandboxRegistryFixtures,
  type PersonalIntelligenceSkillPermissionDecision,
  type PersonalIntelligenceSkillPermissionGrantState,
} from "../personal-intelligence";

interface SkillPermissionGrantContextValue {
  state: PersonalIntelligenceSkillPermissionGrantState;
  decide: (gateId: string, decision: PersonalIntelligenceSkillPermissionDecision) => void;
}

const SkillPermissionGrantContext = createContext<SkillPermissionGrantContextValue | null>(null);

function createInitialState(): PersonalIntelligenceSkillPermissionGrantState {
  const plans = personalIntelligenceSkillSandboxRegistryFixtures.map((entry) => createPersonalIntelligenceSkillSandboxPlan(entry));
  const initial = createSkillPermissionGrantState(plans);
  const reviewable = initial.gates.filter((gate) => gate.status === "pending");
  const now = new Date();
  return reviewable.slice(0, 3).reduce((state, gate, index) => {
    const at = () => new Date(now.getTime() + index);
    if (index === 0) return applySkillPermissionDecision(state, gate.gateId, "grant_for_review", { now: at });
    if (index === 1) return applySkillPermissionDecision(state, gate.gateId, "deny", { now: at });
    const granted = applySkillPermissionDecision(state, gate.gateId, "grant_for_review", { now: at });
    return applySkillPermissionDecision(granted, gate.gateId, "expire", { now: at });
  }, initial);
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
