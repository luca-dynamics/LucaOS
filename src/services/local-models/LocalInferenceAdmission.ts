import type { LocalRuntimeKind } from "./LocalModelTypes";

export interface LocalInferenceAdmissionLimits {
  global?: number;
  byRuntime?: Partial<Record<LocalRuntimeKind, number>>;
}

export interface LocalInferenceAdmissionSnapshot {
  globalActive: number;
  activeByRuntime: Partial<Record<LocalRuntimeKind, number>>;
  limits: Required<LocalInferenceAdmissionLimits>;
}

export interface LocalInferenceAdmissionToken {
  readonly runtime: LocalRuntimeKind;
  release(): void;
}

const DEFAULT_RUNTIME_LIMITS: Record<LocalRuntimeKind, number> = {
  ollama: 1,
  cortex: 1,
  "openai-compatible": 2,
  webllm: 1,
  mediapipe: 1,
};

export class LocalInferenceAdmission {
  private globalActive = 0;
  private readonly activeByRuntime = new Map<LocalRuntimeKind, number>();
  private readonly limits: Required<LocalInferenceAdmissionLimits>;

  constructor(limits: LocalInferenceAdmissionLimits = {}) {
    this.limits = {
      global: limits.global ?? 2,
      byRuntime: {
        ...DEFAULT_RUNTIME_LIMITS,
        ...limits.byRuntime,
      },
    };
  }

  tryAcquire(runtime: LocalRuntimeKind): LocalInferenceAdmissionToken | null {
    const runtimeActive = this.activeByRuntime.get(runtime) ?? 0;
    const runtimeLimit = this.limits.byRuntime[runtime] ?? 1;

    if (this.globalActive >= this.limits.global) return null;
    if (runtimeActive >= runtimeLimit) return null;

    this.globalActive += 1;
    this.activeByRuntime.set(runtime, runtimeActive + 1);

    let released = false;
    return {
      runtime,
      release: () => {
        if (released) return;
        released = true;
        this.globalActive = Math.max(0, this.globalActive - 1);
        const nextRuntimeActive = Math.max(
          0,
          (this.activeByRuntime.get(runtime) ?? 1) - 1,
        );
        if (nextRuntimeActive === 0) {
          this.activeByRuntime.delete(runtime);
        } else {
          this.activeByRuntime.set(runtime, nextRuntimeActive);
        }
      },
    };
  }

  getActiveCount(runtime?: LocalRuntimeKind): number {
    if (!runtime) return this.globalActive;
    return this.activeByRuntime.get(runtime) ?? 0;
  }

  snapshot(): LocalInferenceAdmissionSnapshot {
    return {
      globalActive: this.globalActive,
      activeByRuntime: Object.fromEntries(this.activeByRuntime.entries()),
      limits: this.limits,
    };
  }
}

export const localInferenceAdmission = new LocalInferenceAdmission();
