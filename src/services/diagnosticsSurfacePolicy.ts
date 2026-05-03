import { BUILD_CAPABILITIES } from "../config/buildConfig";
import { diagnosticsService } from "./diagnosticsService";
import {
  createAppSupportSnapshotLogs,
  createAuditDoctorSurfaceResult,
  createSupportSnapshotSurfaceResult,
  resolveDoctorMode,
} from "../shared/diagnostics/doctorSurfaceShared.js";

export type DiagnosticsSurfaceMode = "audit" | "snapshot";

export interface DiagnosticsSurfaceResult {
  text: string;
  visualStatus: string;
  title: string;
  logs?: Array<{
    id: string;
    timestamp: string;
    source: string;
    message: string;
    type: "INFO" | "SUCCESS" | "WARNING" | "ERROR";
  }>;
}

export interface DiagnosticsRepairSurfaceResult {
  text: string;
  allowed: boolean;
}

export const canExposeSupportSnapshot = (): boolean => {
  return BUILD_CAPABILITIES.SUPPORT_SNAPSHOT_EXPORT;
};

export const getDiagnosticsSurfaceResult = async (
  mode: DiagnosticsSurfaceMode,
  diagId: string,
): Promise<DiagnosticsSurfaceResult> => {
  const { effectiveMode } = resolveDoctorMode(
    mode,
    BUILD_CAPABILITIES.SUPPORT_SNAPSHOT_EXPORT ? "PUBLIC_TACTICAL" : "PUBLIC_STANDARD",
  );

  if (effectiveMode === "snapshot") {
    const snapshotText = await diagnosticsService.exportSupportSnapshot();
    const snapshot = JSON.parse(snapshotText);

    return {
      ...createSupportSnapshotSurfaceResult(
        snapshotText,
        createAppSupportSnapshotLogs(snapshot, diagId),
      ),
    };
  }

  if (mode === "snapshot") {
    if (!canExposeSupportSnapshot()) {
      const report = await diagnosticsService.audit();

      return createAuditDoctorSurfaceResult(report, diagId, {
        restrictedSnapshot: true,
        includeSystemLine: false,
      });
    }
  }

  const report = await diagnosticsService.audit();

  return createAuditDoctorSurfaceResult(report, diagId);
};

export const canTriggerPrivilegedRepair = (): boolean => {
  return BUILD_CAPABILITIES.AUTONOMOUS_REPAIR;
};

export const runDiagnosticsRepair = async (): Promise<DiagnosticsRepairSurfaceResult> => {
  if (!canTriggerPrivilegedRepair()) {
    return {
      allowed: false,
      text:
        "Self-repair is restricted on this surface. Run a standard system audit instead.",
    };
  }

  const result = await diagnosticsService.repair();
  return {
    allowed: true,
    text: JSON.stringify(
      {
        status: "SUCCESS",
        repairLog: result.log,
        finalReport: result.report,
      },
      null,
      2,
    ),
  };
};
