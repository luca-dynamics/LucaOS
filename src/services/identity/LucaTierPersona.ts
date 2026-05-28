import { LucaUserTier, normalizeLucaUserTier } from "../../types/lucaUserTier";

export interface LucaTierPersonaBehavior {
  audience: string;
  style: string[];
  allowedPresentation: string[];
  boundaries: string[];
}

export interface LucaTierPersona {
  tier: LucaUserTier;
  label: string;
  behavior: LucaTierPersonaBehavior;
  metadata?: Record<string, unknown>;
  runtimeBehaviorChanged: false;
  persistenceEnabled: false;
}

export interface LucaTierPersonaSnapshot {
  persona: LucaTierPersona;
  runtimeBehaviorChanged: false;
  persistenceEnabled: false;
  contractOnly: true;
}

export type LucaTierPersonaInput = Partial<Omit<LucaTierPersona, "tier" | "behavior" | "runtimeBehaviorChanged" | "persistenceEnabled">> & {
  behavior?: Partial<LucaTierPersonaBehavior>;
};

const BEHAVIOR_BY_TIER: Record<LucaUserTier, LucaTierPersonaBehavior> = {
  origin: {
    audience: "creator-facing",
    style: ["strategic", "technical", "candid about system limitations"],
    allowedPresentation: ["architecture/evolution status summaries", "governance context", "implementation constraints"],
    boundaries: ["no hidden privileged actions", "no ungated evolution mutations", "no automatic optimizer execution"],
  },
  tactical: {
    audience: "operator-facing",
    style: ["concise", "diagnostics-oriented", "action/checklist oriented"],
    allowedPresentation: ["operational summaries", "safe diagnostics", "next-action checklists"],
    boundaries: ["no Origin-only evolution controls", "no high-risk approval authority", "no hidden privileged actions"],
  },
  normal: {
    audience: "assistant-first",
    style: ["simple", "warm", "avoids technical overload"],
    allowedPresentation: ["friendly assistance", "plain-language status", "onboarding guidance"],
    boundaries: ["no raw self-evolution controls", "no technical overload by default", "no dependency reinforcement"],
  },
  unknown: {
    audience: "safe fallback",
    style: ["minimal assumptions", "onboarding guidance", "transparent uncertainty"],
    allowedPresentation: ["safe help", "context requests", "basic orientation"],
    boundaries: ["no privileged controls", "no hidden memory claims", "no tier-specific assumptions"],
  },
};

function mergeUnique(base: string[], update?: string[]): string[] {
  return Array.from(new Set([...base, ...(update ?? [])].filter(Boolean)));
}

function defaultLabel(tier: LucaUserTier): string {
  if (tier === "origin") return "Origin Creator Persona";
  if (tier === "tactical") return "Tactical Operator Persona";
  if (tier === "normal") return "Normal Companion Persona";
  return "Unknown Safe Persona";
}

export function getTierPersonaBehavior(tier: LucaUserTier | string | undefined): LucaTierPersonaBehavior {
  const normalizedTier = normalizeLucaUserTier(tier);
  const behavior = BEHAVIOR_BY_TIER[normalizedTier];

  return {
    audience: behavior.audience,
    style: [...behavior.style],
    allowedPresentation: [...behavior.allowedPresentation],
    boundaries: [...behavior.boundaries],
  };
}

export function createTierPersona(tier: LucaUserTier | string | undefined, input: LucaTierPersonaInput = {}): LucaTierPersona {
  const normalizedTier = normalizeLucaUserTier(tier);
  const behavior = getTierPersonaBehavior(normalizedTier);

  return {
    tier: normalizedTier,
    label: input.label ?? defaultLabel(normalizedTier),
    behavior: {
      audience: input.behavior?.audience ?? behavior.audience,
      style: mergeUnique(behavior.style, input.behavior?.style),
      allowedPresentation: mergeUnique(behavior.allowedPresentation, input.behavior?.allowedPresentation),
      boundaries: mergeUnique(behavior.boundaries, input.behavior?.boundaries),
    },
    metadata: { ...(input.metadata ?? {}) },
    runtimeBehaviorChanged: false,
    persistenceEnabled: false,
  };
}

export function getTierPersonaSnapshot(input: { tier?: LucaUserTier | string } & LucaTierPersonaInput = {}): LucaTierPersonaSnapshot {
  return {
    persona: createTierPersona(input.tier, input),
    runtimeBehaviorChanged: false,
    persistenceEnabled: false,
    contractOnly: true,
  };
}
