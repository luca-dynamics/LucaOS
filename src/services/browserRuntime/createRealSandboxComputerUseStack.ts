/**
 * Compose a fully real-capable computer-use sandbox stack.
 *
 * Defaults remain safe: `enabled: false` returns a scaffold-only pipeline
 * (no Playwright, no router DI). When enabled, wires:
 *   Playwright|Electron driver → sandbox BrowserRuntimeRouter →
 *   RealInvocationShell → ComputerUsePipeline / Runtime
 * Optional: MissionTapeRecorder external sink for invocation events.
 */

import { BrowserRuntimeRouterRealInvocationShell } from "../computerUse/BrowserRuntimeRouterRealInvocationShell";
import { createComputerUsePipeline } from "../computerUse/createComputerUsePipeline";
import { createComputerUseRuntime } from "../computerUse/createComputerUseRuntime";
import type {
  ComputerUseMissionTapeExternalSink,
  ComputerUsePipelineInput,
  ComputerUsePipelineResult,
  ComputerUseRuntime,
  ComputerUseRuntimeEventType,
} from "../computerUse/types";
import { createMissionTapeRecorderExternalSink } from "../missionTape/createMissionTapeRecorderExternalSink";
import type { MissionTapeRecorderService } from "../missionTape/MissionTapeRecorder";
import { createSandboxBrowserRuntimeRouter } from "./createSandboxBrowserRuntimeRouter";
import {
  createElectronSandboxBrowserDriver,
  type ElectronSandboxBrowserDriverOptions,
} from "./drivers/ElectronSandboxBrowserDriver";
import {
  createPlaywrightBrowserDriver,
  type PlaywrightBrowserDriverOptions,
} from "./drivers/PlaywrightBrowserDriver";
import type { BrowserDriver } from "./types";
import type { BrowserRuntimeRouter } from "./BrowserRuntimeRouter";
import type { SandboxPlaywrightBrowserRuntimeAdapter } from "./adapters/SandboxPlaywrightBrowserRuntimeAdapter";

export type RealSandboxDriverKind = "playwright" | "electron_sandbox" | "injected";

export interface CreateRealSandboxComputerUseStackOptions {
  /**
   * Master switch. Default false → scaffold pipeline only (no real browser).
   */
  enabled?: boolean;
  /** Which real driver to construct when enabled and `driver` is not injected. */
  driverKind?: RealSandboxDriverKind;
  /** Inject a pre-built driver (tests / custom hosts). */
  driver?: BrowserDriver;
  playwright?: PlaywrightBrowserDriverOptions;
  electron?: ElectronSandboxBrowserDriverOptions;
  /** Also build mission runtime entrypoints (default true when enabled). */
  includeRuntime?: boolean;
  /**
   * Mission tape sink + completion.
   * - Product default when `enabled: true`: on (unless explicitly false).
   * - Scaffold path (`enabled: false`): off unless explicitly true.
   */
  enableMissionTapeSink?: boolean;
  /** Inject a custom external sink (overrides enableMissionTapeSink factory). */
  missionTapeExternalSink?: ComputerUseMissionTapeExternalSink;
  /**
   * When false, do not attach runSteps completion even if a recorder exists.
   * Default true whenever a recorder is available.
   */
  completeMissionAfterRun?: boolean;
}

export interface RealSandboxComputerUseStack {
  enabled: boolean;
  driverKind: RealSandboxDriverKind | "none";
  driver?: BrowserDriver;
  router?: BrowserRuntimeRouter;
  sandboxAdapter?: SandboxPlaywrightBrowserRuntimeAdapter;
  invocationShell?: BrowserRuntimeRouterRealInvocationShell;
  /** Full pipeline class or runtime's structural { run, reset } surface. */
  pipeline: {
    run: (input: ComputerUsePipelineInput) => Promise<ComputerUsePipelineResult>;
    reset?: () => unknown;
  };
  runtime?: ComputerUseRuntime;
  missionTapeEnabled: boolean;
  missionTapeExternalSink?: ComputerUseMissionTapeExternalSink;
  missionTapeRecorder?: MissionTapeRecorderService;
  dispose: () => Promise<void>;
}

/**
 * Create a computer-use stack. Safe by default.
 */
export async function createRealSandboxComputerUseStack(
  options: CreateRealSandboxComputerUseStackOptions = {},
): Promise<RealSandboxComputerUseStack> {
  const enabled = options.enabled === true;
  const tapeBundle = buildMissionTapeBundle(options, enabled);

  const missionTapeCompletion = tapeBundle.recorder
    ? {
        recorder: tapeBundle.recorder,
        completeAfterRun: options.completeMissionAfterRun !== false,
      }
    : undefined;

  if (!enabled) {
    const pipeline = createComputerUsePipeline();
    const runtime =
      options.includeRuntime === false
        ? undefined
        : createComputerUseRuntime({
            pipelineOptions: {},
            missionTapeCompletion,
          });

    return {
      enabled: false,
      driverKind: "none",
      pipeline: runtime?.pipeline ?? pipeline,
      runtime,
      missionTapeEnabled: tapeBundle.enabled,
      missionTapeExternalSink: tapeBundle.sink,
      missionTapeRecorder: tapeBundle.recorder,
      dispose: async () => {
        /* scaffold — nothing to close */
      },
    };
  }

  const { driver, driverKind } = await resolveDriver(options);

  const { router, sandboxAdapter } = createSandboxBrowserRuntimeRouter({
    enabled: true,
    driver,
  });

  const invocationShell = new BrowserRuntimeRouterRealInvocationShell({
    router,
    onEvent: tapeBundle.sink
      ? (event) => {
          void tapeBundle.sink!.record({
            missionId: event.missionId ?? "unknown-mission",
            timestamp: event.timestamp,
            eventType: mapShellStatusToEventType(event.status),
            payload: {
              requestId: event.requestId,
              action: event.action,
              target: event.target,
              reason: event.reason,
              status: event.status,
            },
            metadata: {
              tapeSinkKind: "scaffold",
              eventBridgeKind: "scaffold",
              storageWritesEnabled: false,
              missionTapeImported: false,
              systemApisCalled: false,
            },
          });
        }
      : undefined,
  });

  const pipeline = createComputerUsePipeline({
    realSandboxExecutionEnabled: true,
    invocationShell,
  });

  const runtime =
    options.includeRuntime === false
      ? undefined
      : createComputerUseRuntime({
          pipelineOptions: {
            realSandboxExecutionEnabled: true,
            invocationShell,
          },
          // Real wire: runSteps finalizes mission tape via verification gates.
          missionTapeCompletion,
        });

  return {
    enabled: true,
    driverKind,
    driver,
    router,
    sandboxAdapter,
    invocationShell,
    pipeline: runtime?.pipeline ?? pipeline,
    runtime,
    missionTapeEnabled: tapeBundle.enabled,
    missionTapeExternalSink: tapeBundle.sink,
    missionTapeRecorder: tapeBundle.recorder,
    dispose: async () => {
      try {
        await driver.dispose?.();
      } catch {
        /* best-effort */
      }
    },
  };
}

function buildMissionTapeBundle(
  options: CreateRealSandboxComputerUseStackOptions,
  stackEnabled: boolean,
): {
  enabled: boolean;
  sink?: ComputerUseMissionTapeExternalSink;
  recorder?: MissionTapeRecorderService;
} {
  if (options.missionTapeExternalSink) {
    return {
      enabled: true,
      sink: options.missionTapeExternalSink,
      recorder:
        "recorder" in options.missionTapeExternalSink
          ? (options.missionTapeExternalSink as { recorder?: MissionTapeRecorderService })
              .recorder
          : undefined,
    };
  }
  // Product path: real CU stack defaults tape on; opt out with enableMissionTapeSink: false.
  const wantTape =
    options.enableMissionTapeSink === true ||
    (stackEnabled && options.enableMissionTapeSink !== false);
  if (wantTape) {
    const sink = createMissionTapeRecorderExternalSink();
    return { enabled: true, sink, recorder: sink.recorder };
  }
  return { enabled: false };
}

function mapShellStatusToEventType(status: string): ComputerUseRuntimeEventType {
  if (status === "invoked") return "computer_use_dispatch_completed";
  if (status === "invoke_failed" || status === "blocked") {
    return "computer_use_dispatch_rejected";
  }
  return "computer_use_dispatch_started";
}

async function resolveDriver(
  options: CreateRealSandboxComputerUseStackOptions,
): Promise<{ driver: BrowserDriver; driverKind: RealSandboxDriverKind }> {
  if (options.driver) {
    return {
      driver: options.driver,
      driverKind:
        options.driver.kind === "playwright" ||
        options.driver.kind === "electron_sandbox"
          ? options.driver.kind
          : "injected",
    };
  }

  const kind = options.driverKind ?? "playwright";

  if (kind === "electron_sandbox") {
    if (!options.electron?.invoke) {
      throw new Error(
        "createRealSandboxComputerUseStack: electron_sandbox requires electron.invoke.",
      );
    }
    return {
      driver: createElectronSandboxBrowserDriver(options.electron),
      driverKind: "electron_sandbox",
    };
  }

  if (kind === "injected") {
    throw new Error(
      "createRealSandboxComputerUseStack: driverKind 'injected' requires options.driver.",
    );
  }

  return {
    driver: createPlaywrightBrowserDriver(options.playwright),
    driverKind: "playwright",
  };
}
