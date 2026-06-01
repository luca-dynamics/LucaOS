export type LucaBootPhaseStatus =
  | "pending"
  | "running"
  | "passed"
  | "failed"
  | "timed-out"
  | "skipped"
  | "degraded";

export type LucaBootDestination = "READY" | "ONBOARDING";

export interface LucaBootPhaseRecord<TValue = unknown> {
  phaseId: string;
  label: string;
  status: LucaBootPhaseStatus;
  blocking: boolean;
  timeoutMs: number;
  startedAt?: number;
  completedAt?: number;
  durationMs?: number;
  errorSummary?: string;
  degradedReason?: string;
  value?: TValue;
}

export interface RunBootPhaseOptions<TValue> {
  phaseId: string;
  label: string;
  blocking?: boolean;
  timeoutMs: number;
  run: () => Promise<TValue> | TValue;
  degradeOnFailure?: boolean;
  degradedReason?: string;
  now?: () => number;
}

export interface BootTimeoutResult<TValue> {
  status: "passed" | "failed" | "timed-out";
  value?: TValue;
  errorSummary?: string;
}

export const LUCA_BOOT_TIMEOUTS = {
  memoryBanksMs: 2_000,
  serverHealthMs: 10_000,
  localBrainMs: 5_000,
  visionReadinessMs: 2_000,
  voiceReadinessMs: 2_000,
  ollamaModelMs: 2_000,
  safetyInitMs: 3_000,
  synapseStartMs: 3_000,
  restoreToolsMs: 8_000,
  introspectionScanMs: 5_000,
  liveSensationMs: 3_000,
  selfExpressionMs: 1_000,
  environmentAwarenessMs: 3_000,
  phoenixReadyMs: 2_000,
  kernelWatchdogMs: 15_000,
  totalBootWatchdogMs: 25_000,
} as const;

const BOOT_GUARD_EXECUTION_SURFACES = Object.freeze({
  toolExecution: false,
  browserAutomation: false,
  fileAccess: false,
  messagingExecution: false,
  wirelessControl: false,
});

export const getBootRuntimeGuardExecutionSurfaces = () =>
  BOOT_GUARD_EXECUTION_SURFACES;

export const summarizeBootError = (error: unknown): string => {
  if (error instanceof Error) return error.message || error.name;
  if (typeof error === "string") return error;

  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown boot phase error";
  }
};

export const createBootPhaseRecord = <TValue = unknown>({
  phaseId,
  label,
  blocking = true,
  timeoutMs,
  status = "pending",
  degradedReason,
}: {
  phaseId: string;
  label: string;
  blocking?: boolean;
  timeoutMs: number;
  status?: LucaBootPhaseStatus;
  degradedReason?: string;
}): LucaBootPhaseRecord<TValue> => ({
  phaseId,
  label,
  status,
  blocking,
  timeoutMs,
  degradedReason,
});

export const withBootTimeout = async <TValue>(
  run: () => Promise<TValue> | TValue,
  timeoutMs: number,
  label = "boot phase",
): Promise<BootTimeoutResult<TValue>> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<BootTimeoutResult<TValue>>((resolve) => {
    timeoutId = setTimeout(() => {
      resolve({
        status: "timed-out",
        errorSummary: `${label} timed out after ${timeoutMs}ms`,
      });
    }, timeoutMs);
  });

  const phasePromise = Promise.resolve()
    .then(run)
    .then<BootTimeoutResult<TValue>>((value) => ({ status: "passed", value }))
    .catch<BootTimeoutResult<TValue>>((error) => ({
      status: "failed",
      errorSummary: summarizeBootError(error),
    }));

  const result = await Promise.race([phasePromise, timeoutPromise]);
  if (timeoutId) clearTimeout(timeoutId);
  return result;
};

export const runBootPhase = async <TValue>({
  phaseId,
  label,
  blocking = true,
  timeoutMs,
  run,
  degradeOnFailure = false,
  degradedReason,
  now = () => Date.now(),
}: RunBootPhaseOptions<TValue>): Promise<LucaBootPhaseRecord<TValue>> => {
  const startedAt = now();
  const baseRecord = createBootPhaseRecord<TValue>({
    phaseId,
    label,
    blocking,
    timeoutMs,
    status: "running",
    degradedReason,
  });

  const result = await withBootTimeout(run, timeoutMs, label);
  const completedAt = now();
  const shouldDegrade = degradeOnFailure && result.status !== "passed";

  return {
    ...baseRecord,
    status: shouldDegrade ? "degraded" : result.status,
    startedAt,
    completedAt,
    durationMs: Math.max(0, completedAt - startedAt),
    errorSummary: result.errorSummary,
    degradedReason: shouldDegrade
      ? degradedReason || result.errorSummary || `${label} completed degraded`
      : degradedReason,
    value: result.value,
  };
};

export const runNonBlockingBootPhase = async <TValue>(
  options: Omit<RunBootPhaseOptions<TValue>, "blocking">,
): Promise<LucaBootPhaseRecord<TValue>> =>
  runBootPhase({
    ...options,
    blocking: false,
    degradeOnFailure: options.degradeOnFailure ?? true,
  });

export const createSkippedBootPhaseRecord = ({
  phaseId,
  label,
  blocking = false,
  timeoutMs = 0,
  degradedReason,
  now = () => Date.now(),
}: {
  phaseId: string;
  label: string;
  blocking?: boolean;
  timeoutMs?: number;
  degradedReason?: string;
  now?: () => number;
}): LucaBootPhaseRecord => {
  const timestamp = now();
  return {
    phaseId,
    label,
    blocking,
    timeoutMs,
    status: "skipped",
    startedAt: timestamp,
    completedAt: timestamp,
    durationMs: 0,
    degradedReason,
  };
};

export const bootPhaseNeedsDegradedRecovery = (
  record: LucaBootPhaseRecord,
): boolean =>
  record.status === "failed" ||
  record.status === "timed-out" ||
  record.status === "degraded";

export const resolveBootDestination = ({
  setupComplete,
}: {
  setupComplete: boolean;
  degraded?: boolean;
  criticalTimedOut?: boolean;
}): LucaBootDestination => (setupComplete ? "READY" : "ONBOARDING");
