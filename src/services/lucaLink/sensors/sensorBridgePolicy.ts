import {
  LUCA_LINK_ALLOWED_READ_ONLY_SENSOR_KINDS,
  LUCA_LINK_BLOCKED_SENSOR_KINDS,
  type LucaLinkAllowedReadOnlySensorKind,
  type LucaLinkReadOnlySensorSnapshot,
  type LucaLinkSensorBridgePolicyEvaluation,
  type LucaLinkSensorBridgePolicyOptions,
} from "./sensorBridgeTypes";

const allowedKinds = new Set<string>(LUCA_LINK_ALLOWED_READ_ONLY_SENSOR_KINDS);
const explicitlyBlockedKinds = new Set<string>(LUCA_LINK_BLOCKED_SENSOR_KINDS);
const sensitiveValuePatterns = [
  /\bcredentials?\b/i,
  /\b(?:access|auth|session|refresh)?[_ -]?tokens?\b/i,
  /\bprivate[_ -]?keys?\b/i,
  /\bhidden[_ -]?(?:system[_ -]?)?prompts?\b/i,
  /\bprivate[_ -]?reasoning\b/i,
  /\bchain[_ -]?of[_ -]?thought\b/i,
  /\braw[_ -]?files?\b/i,
  /\braw[_ -]?(?:payload|storage|database|contents?)\b/i,
];

function unique<T>(values: readonly T[]): T[] {
  return Array.from(new Set(values));
}

function stringifyMetadata(value: unknown): string {
  try {
    return JSON.stringify(value) ?? "";
  } catch {
    return "[unserializable raw payload]";
  }
}

export function containsSensitiveSensorMetadata(value: unknown): boolean {
  const text = stringifyMetadata(value);
  return sensitiveValuePatterns.some((pattern) => pattern.test(text));
}

export function evaluateLucaLinkReadOnlySensorPolicy(
  snapshot: LucaLinkReadOnlySensorSnapshot,
  options: LucaLinkSensorBridgePolicyOptions = {},
): LucaLinkSensorBridgePolicyEvaluation {
  const warnings = [...(snapshot.warnings ?? [])];
  const blockers = [...(snapshot.blockers ?? [])];
  const requestedKinds = [...(snapshot.sensorKinds ?? [])];
  const allowedSensorKinds = requestedKinds.filter((kind) =>
    allowedKinds.has(kind),
  ) as LucaLinkAllowedReadOnlySensorKind[];
  const blockedSensorKinds = unique([
    ...(snapshot.blockedSensorKinds ?? []),
    ...requestedKinds.filter((kind) => !allowedKinds.has(kind)),
  ]);

  for (const kind of blockedSensorKinds) {
    blockers.push(
      explicitlyBlockedKinds.has(kind)
        ? `Sensitive sensor kind ${kind} is explicitly blocked.`
        : `Sensor kind ${kind} is outside the read-only allowlist.`,
    );
  }
  if ((snapshot as { readOnly?: unknown }).readOnly !== true) {
    blockers.push("Sensor snapshots must be explicitly read-only.");
  }
  if (
    (snapshot as { sideEffectsPerformed?: unknown }).sideEffectsPerformed !==
    false
  ) {
    blockers.push("Sensor snapshots must not claim performed side effects.");
  }
  if (containsSensitiveSensorMetadata(snapshot.values)) {
    blockers.push(
      "Snapshot values contain credential, hidden-prompt, private-reasoning, or raw-payload content.",
    );
  }
  if (
    snapshot.values === null ||
    typeof snapshot.values !== "object" ||
    Array.isArray(snapshot.values)
  ) {
    blockers.push("Snapshot values must be summarized metadata fields.");
  }

  const now =
    options.now instanceof Date
      ? options.now
      : new Date(options.now ?? Date.now());
  const expiresAt = new Date(snapshot.expiresAt);
  const expired =
    Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= now.getTime();
  if (expired) blockers.push("Sensor snapshot has expired.");

  if (
    snapshot.privacyLevel === "private" &&
    !options.explicitApprovalMetadata
  ) {
    if (options.privateSnapshotMode === "warn") {
      warnings.push(
        "Private snapshot remains review-required without explicit approval metadata.",
      );
    } else {
      blockers.push(
        "Private snapshot requires explicit host approval metadata before preview.",
      );
    }
  }

  warnings.push(
    "Readiness is model-only and does not enable live sensor collection.",
  );
  const uniqueBlockers = unique(blockers);
  const status = expired
    ? "expired"
    : uniqueBlockers.length > 0
      ? "blocked"
      : "ready";

  return {
    allowed: status === "ready",
    status,
    allowedSensorKinds: unique(allowedSensorKinds),
    blockedSensorKinds,
    warnings: unique(warnings),
    blockers: uniqueBlockers,
    sideEffectsPerformed: false,
  };
}
