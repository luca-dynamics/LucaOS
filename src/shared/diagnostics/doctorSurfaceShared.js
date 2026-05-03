const AUDIENCE_TIER_RANK = {
  public_standard: 0,
  public_tactical: 1,
  origin: 2,
};

export const SUPPORT_SNAPSHOT_RESTRICTED_NOTICE =
  "Support snapshot export is restricted on this surface. Returning standard doctor audit instead.";
export const DOCTOR_REPORT_TITLE = "L.U.C.A_DOCTOR_REPORT";
export const SUPPORT_SNAPSHOT_TITLE = "L.U.C.A_SUPPORT_SNAPSHOT";
export const SUPPORT_SNAPSHOT_VISUAL_STATUS = "SUPPORT_SNAPSHOT_READY";

export function normalizeDoctorBuildType(buildType = "PUBLIC") {
  const normalized = String(buildType).toUpperCase();
  if (normalized === "PUBLIC") return "PUBLIC_STANDARD";
  return normalized;
}

export function resolveAudienceTierFromBuildType(buildType = "PUBLIC") {
  const normalized = normalizeDoctorBuildType(buildType);
  if (normalized === "ORIGIN") return "origin";
  if (normalized === "PUBLIC_TACTICAL") return "public_tactical";
  return "public_standard";
}

export function canExportSupportSnapshotForBuildType(buildType = "PUBLIC") {
  const tier = resolveAudienceTierFromBuildType(buildType);
  return AUDIENCE_TIER_RANK[tier] >= AUDIENCE_TIER_RANK.public_tactical;
}

export function resolveDoctorMode(requestedMode = "audit", buildType = "PUBLIC") {
  const normalizedRequestedMode = requestedMode === "snapshot" ? "snapshot" : "audit";
  const snapshotAllowed = canExportSupportSnapshotForBuildType(buildType);
  const effectiveMode =
    normalizedRequestedMode === "snapshot" && snapshotAllowed ? "snapshot" : "audit";

  return {
    requestedMode: normalizedRequestedMode,
    effectiveMode,
    snapshotAllowed,
  };
}

export function getAuditGlyph(status) {
  if (status === "pass") return "✓";
  if (status === "warn") return "⚠";
  return "✗";
}

export function formatAuditSummary(results = []) {
  return results
    .map((result) => `${getAuditGlyph(result.status)} ${result.name}: ${result.message}`)
    .join("\n");
}

export function formatDoctorAuditText(report, options = {}) {
  const {
    restrictedSnapshot = false,
    includeSystemLine = true,
  } = options;

  const summary = formatAuditSummary(report?.results || []);
  const lines = [
    `L.U.C.A DOCTOR REPORT [${String(report?.overall || "unknown").toUpperCase()}]`,
    "",
    summary,
  ];

  if (includeSystemLine && report?.system) {
    lines.push(
      "",
      `SYSTEM: ${report.system.platform} (${report.system.arch}) | RAM Free: ${(report.system.freeMem / 1024 / 1024 / 1024).toFixed(2)} GB`,
    );
  }

  if (restrictedSnapshot) {
    lines.push("", SUPPORT_SNAPSHOT_RESTRICTED_NOTICE);
  }

  return lines.join("\n");
}

export function mapAuditResultsToDoctorLogs(results = [], diagId, timestamp = new Date().toLocaleTimeString()) {
  return results.map((result) => ({
    id: `${diagId}-${result.id}`,
    timestamp,
    source: result.name,
    message: result.message + (result.fix ? ` (Suggested Fix: ${result.fix})` : ""),
    type:
      result.status === "pass"
        ? "SUCCESS"
        : result.status === "warn"
          ? "WARNING"
          : "ERROR",
  }));
}

export function getDoctorVisualStatus(overall = "unknown") {
  return `AUDIT_${String(overall).toUpperCase()}`;
}

export function createAuditDoctorSurfaceResult(report, diagId, options = {}) {
  const {
    restrictedSnapshot = false,
    includeSystemLine = true,
  } = options;

  return {
    text: formatDoctorAuditText(report, {
      restrictedSnapshot,
      includeSystemLine,
    }),
    visualStatus: getDoctorVisualStatus(report?.overall),
    title: DOCTOR_REPORT_TITLE,
    logs: mapAuditResultsToDoctorLogs(report?.results || [], diagId),
  };
}

export function createSupportSnapshotSurfaceResult(snapshotText, logs = []) {
  return {
    text: `L.U.C.A SUPPORT SNAPSHOT\n\n${snapshotText}`,
    visualStatus: SUPPORT_SNAPSHOT_VISUAL_STATUS,
    title: SUPPORT_SNAPSHOT_TITLE,
    logs,
  };
}

export function createAppSupportSnapshotLogs(snapshot, diagId, timestamp = new Date().toLocaleTimeString()) {
  return [
    {
      id: `snapshot-${diagId}-route`,
      timestamp,
      source: "VOICE_ROUTE",
      message: `${snapshot.voice?.route?.kind || "UNKNOWN"} | ${snapshot.voice?.orchestrator?.displayStatus || "IDLE"}`,
      type: "INFO",
    },
    {
      id: `snapshot-${diagId}-models`,
      timestamp,
      source: "LOCAL_MODELS",
      message: `Ready ${snapshot.localModels?.ready || 0}/${snapshot.localModels?.total || 0} | Downloading ${snapshot.localModels?.downloading || 0} | Error ${snapshot.localModels?.error || 0}`,
      type:
        (snapshot.localModels?.error || 0) > 0 ? "WARNING" : "SUCCESS",
    },
    {
      id: `snapshot-${diagId}-core`,
      timestamp,
      source: "LOCAL_CORE",
      message: `${snapshot.localCore?.readiness?.level || "unknown"} :: ${snapshot.localCore?.readiness?.reason || "No readiness data"}`,
      type:
        snapshot.localCore?.readiness?.level === "ready"
          ? "SUCCESS"
          : snapshot.localCore?.readiness?.level === "limited"
            ? "WARNING"
            : "ERROR",
    },
  ];
}

export function createBackendDoctorSummaryLines(snapshot, options = {}) {
  const {
    requestedSnapshot = false,
    snapshotAllowed = false,
  } = options;

  const lines = [
    `L.U.C.A DOCTOR [${String(snapshot.reportType).toUpperCase()}]`,
    `Platform: ${snapshot.status?.platform || 'unknown'} | Frontend Ready: ${snapshot.status?.frontendReady ? 'yes' : 'no'}`,
    `Physical Control: ${snapshot.status?.controlEnabled ? 'enabled' : 'restricted'} | ADB: ${snapshot.status?.adbAvailable ? 'ready' : 'missing'}`,
    `System Readiness: ${snapshot.dependencies?.success === false ? 'degraded' : 'available'}`,
    `Realtime Monitor: ${snapshot.monitor?.success === false ? 'unavailable' : 'available'}`,
    `MCP: ${snapshot.mcp?.healthyConnections || 0}/${snapshot.mcp?.totalConnections || 0} healthy`,
  ];

  if (snapshot.audit?.result) {
    lines.push('', String(snapshot.audit.result));
  }

  if (requestedSnapshot && !snapshotAllowed) {
    lines.push('', SUPPORT_SNAPSHOT_RESTRICTED_NOTICE);
  }

  if (snapshot.reportType === 'snapshot') {
    lines.push(
      '',
      'Snapshot includes runtime status, dependency readiness, realtime monitor data, MCP health, and baseline audit output.',
    );
  }

  return lines;
}

export function createDoctorExecutionResult({
  effectiveMode,
  text,
  snapshot,
  success = true,
}) {
  return {
    success,
    mode: effectiveMode,
    text,
    snapshot,
  };
}
