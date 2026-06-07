import type {
  PersonalIntelligenceRuntimeLearningEvent,
  PersonalIntelligenceRuntimeTrace,
  PersonalIntelligenceRuntimeTraceReadiness,
} from "./runtimeTraceTypes";

const SENSITIVE_ZONES = new Set(["credential", "financial", "health", "enterprise"]);
const UNSAFE_BLOCKER_PATTERN = /hidden prompt|private reasoning|raw file|credential|secret|private key|token-like|raw payload/i;

export function summarizeRuntimeTraceReadiness(
  traces: readonly PersonalIntelligenceRuntimeTrace[],
  learningEvents: readonly PersonalIntelligenceRuntimeLearningEvent[],
): PersonalIntelligenceRuntimeTraceReadiness {
  const blockedTraces = traces.filter((trace) => trace.status === "blocked" || trace.blockers.length > 0).length;
  const verifiedTraces = traces.filter((trace) => trace.status === "verified").length;
  const learningEventsReadyForProposal = learningEvents.filter(
    (event) => event.proposalReady && event.blockers.length === 0 && !event.persisted && !event.writePerformed,
  ).length;
  const sensitiveZoneCount = [
    ...traces.map((trace) => trace.privacyZone),
    ...learningEvents.map((event) => event.privacyZone),
  ].filter((zone) => SENSITIVE_ZONES.has(zone)).length;
  const unsafeContentBlocked = [
    ...traces.flatMap((trace) => trace.blockers),
    ...learningEvents.flatMap((event) => event.blockers),
  ].filter((blocker) => UNSAFE_BLOCKER_PATTERN.test(blocker)).length;
  const blockers: string[] = [];
  const warnings: string[] = [
    "Readiness covers in-memory evidence recording only; it does not authorize execution or persistence.",
  ];

  if (traces.length === 0) blockers.push("At least one bounded trace is required to assess runtime recording readiness.");
  if (unsafeContentBlocked > 0) blockers.push("Unsafe trace or learning content remains blocked.");
  if (sensitiveZoneCount > 0) warnings.push("Sensitive-zone evidence requires explicit approval metadata before review.");
  if (learningEventsReadyForProposal === 0) warnings.push("No learning events are currently ready for a governed proposal preview.");

  return {
    totalTraces: traces.length,
    blockedTraces,
    verifiedTraces,
    learningEventsReadyForProposal,
    sensitiveZoneCount,
    unsafeContentBlocked,
    readyForRuntimeRecording: traces.length > 0 && unsafeContentBlocked === 0,
    readyForPersistenceProposal: learningEventsReadyForProposal > 0 && unsafeContentBlocked === 0,
    warnings,
    blockers,
  };
}
