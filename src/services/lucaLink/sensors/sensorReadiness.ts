import { evaluateLucaLinkReadOnlySensorPolicy } from "./sensorBridgePolicy";
import type {
  LucaLinkAllowedReadOnlySensorKind,
  LucaLinkReadOnlySensorSnapshot,
  LucaLinkSensorBridgeReadiness,
} from "./sensorBridgeTypes";

function unique<T>(values: readonly T[]): T[] {
  return Array.from(new Set(values));
}

export function createCapabilityStatusSummary(
  snapshot: LucaLinkReadOnlySensorSnapshot,
): string {
  return snapshot.capabilitySummary.length > 0
    ? snapshot.capabilitySummary.join(" · ")
    : "No capability availability reported.";
}

export function createPermissionReadinessSummary(
  snapshot: LucaLinkReadOnlySensorSnapshot,
): string {
  return snapshot.permissionSummary.length > 0
    ? snapshot.permissionSummary.join(" · ")
    : "No permissions requested; live collection disabled.";
}

export function summarizeLucaLinkSensorBridgeReadiness(
  snapshots: readonly LucaLinkReadOnlySensorSnapshot[],
): LucaLinkSensorBridgeReadiness {
  const evaluations = snapshots.map((snapshot) =>
    evaluateLucaLinkReadOnlySensorPolicy(snapshot),
  );
  const readySnapshots = evaluations.filter(
    (evaluation) => evaluation.status === "ready",
  ).length;
  const blockedSnapshots = evaluations.filter(
    (evaluation) => evaluation.status === "blocked",
  ).length;
  const expiredSnapshots = evaluations.filter(
    (evaluation) => evaluation.status === "expired",
  ).length;
  const allowedSensorKinds = unique(
    evaluations.flatMap((evaluation) => evaluation.allowedSensorKinds),
  ) as LucaLinkAllowedReadOnlySensorKind[];
  const blockedSensorKinds = unique(
    evaluations.flatMap((evaluation) => evaluation.blockedSensorKinds),
  );
  const warnings = unique(
    evaluations.flatMap((evaluation) => evaluation.warnings),
  );
  const blockers = unique(
    evaluations.flatMap((evaluation) => evaluation.blockers),
  );

  return {
    totalSnapshots: snapshots.length,
    readySnapshots,
    blockedSnapshots,
    expiredSnapshots,
    allowedSensorKinds,
    blockedSensorKinds,
    sensitiveRequestCount: evaluations.reduce(
      (count, evaluation) => count + evaluation.blockedSensorKinds.length,
      0,
    ),
    readyForReadOnlyBridge: readySnapshots > 0,
    readyForLiveCollection: false,
    warnings,
    blockers,
    sideEffectsPerformed: false,
  };
}
