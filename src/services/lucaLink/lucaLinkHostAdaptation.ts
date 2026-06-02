/**
 * LucaLink Host Adaptation Intelligence (PR #201)
 *
 * Pure, side-effect-free model helpers for authorized host bridge planning.
 * This module does not probe devices, open sockets, write files, run generated
 * programs, install adapters, alter credentials, or perform physical actions.
 */

import type {
  LucaLinkHostClass,
  LucaLinkHostConnectionClass,
  LucaLinkHostConnectionRecord,
  LucaLinkHostRuntimeSurface,
} from "./lucaLinkHostConnectionModel";

export type LucaLinkHostAdaptationStage =
  | "detected"
  | "classified"
  | "diagnosed"
  | "strategy-planned"
  | "blueprint-created"
  | "approval-required"
  | "sandbox-test-planned"
  | "ready-for-future-generation"
  | "blocked";

export type LucaLinkHostBridgeStrategyKind =
  | "web-display-bridge"
  | "python-host-agent"
  | "node-host-adapter"
  | "electron-host-adapter"
  | "iot-api-bridge"
  | "mqtt-bridge"
  | "matter-like-bridge"
  | "ros-sensor-bridge"
  | "serial-sensor-bridge"
  | "companion-watch-bridge"
  | "kiosk-display-bridge"
  | "manual-setup-guide"
  | "unsupported";

export type LucaLinkHostAdaptationRisk = "low" | "medium" | "high" | "critical";

export interface LucaLinkHostProbeObservation {
  id: string;
  label: string;
  evidence: string;
  confidence: number;
  runtimeSurface?: string;
  connectionSurface?: string;
  safeToUse: boolean;
  warnings: string[];
}

export interface LucaLinkHostConnectionDiagnosis {
  id: string;
  hostId?: string;
  summary: string;
  detectedHostClass?: string;
  detectedRuntimeSurfaces: string[];
  availableConnectionSurfaces: string[];
  missingRequirements: string[];
  failedMethods: string[];
  recommendedNextChecks: string[];
  risk: LucaLinkHostAdaptationRisk;
  warnings: string[];
  errors: string[];
}

export interface LucaLinkHostBridgeBlueprint {
  id: string;
  strategyKind: LucaLinkHostBridgeStrategyKind;
  title: string;
  summary: string;
  targetHostClass: string;
  targetRuntimeSurface?: string;
  connectionClass?: string;
  generatedProgramLanguage?:
    | "typescript"
    | "javascript"
    | "python"
    | "shell"
    | "config"
    | "none";
  generatedProgramAllowed: boolean;
  requiresPrimaryHostApproval: boolean;
  requiresSandbox: boolean;
  requiresUserProvidedCredentials: boolean;
  allowedCapabilities: string[];
  deniedCapabilities: string[];
  safetyBoundaries: string[];
  sandboxTestPlan: string[];
  approvalChecklist: string[];
  pseudoCode?: string;
  configSketch?: Record<string, unknown>;
  risk: LucaLinkHostAdaptationRisk;
  warnings: string[];
  errors: string[];
  stage?: LucaLinkHostAdaptationStage;
}

export interface LucaLinkHostBridgeStrategyPlan {
  id: string;
  kind: LucaLinkHostBridgeStrategyKind;
  title: string;
  targetHostClass: string;
  targetRuntimeSurface?: string;
  connectionClass?: string;
  risk: LucaLinkHostAdaptationRisk;
  rationale: string[];
  warnings: string[];
  errors: string[];
}

export type LucaLinkHostDiagnosisInput =
  Partial<LucaLinkHostConnectionRecord> & {
    id?: string;
    hostId?: string;
    hostClass?: LucaLinkHostClass | string;
    runtimeSurfaces?: Array<LucaLinkHostRuntimeSurface | string>;
    connectionClass?: LucaLinkHostConnectionClass | string;
    observations?: LucaLinkHostProbeObservation[];
    requestedCapabilities?: string[];
    failedMethods?: string[];
    warnings?: string[];
    errors?: string[];
    summary?: string;
  };

const BLOCKED_TERMS = [
  "credential bypass",
  "bypass credentials",
  "defeat authentication",
  "unauthorized",
  "exploit",
  "stealth",
  "malware",
  "persistence",
  "scrape secrets",
  "payment",
  "run generated code",
  "write files",
  "open sockets",
  "modify system settings",
  "physical actuation",
  "motion command",
  "take over",
];

function normalize(value?: string | null): string {
  return (value ?? "").trim().toLowerCase();
}

function unique(values: string[] = []): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function textFrom(input: unknown): string {
  return JSON.stringify(input ?? {}).toLowerCase();
}

function hasBlockedIntent(input: unknown): boolean {
  const text = textFrom(input);
  return BLOCKED_TERMS.some((term) => text.includes(term));
}

function riskRank(risk: LucaLinkHostAdaptationRisk): number {
  return { low: 0, medium: 1, high: 2, critical: 3 }[risk];
}

function maxRisk(
  values: LucaLinkHostAdaptationRisk[],
): LucaLinkHostAdaptationRisk {
  return values.reduce(
    (max, value) => (riskRank(value) > riskRank(max) ? value : max),
    "low" as LucaLinkHostAdaptationRisk,
  );
}

export function classifyLucaLinkHostProbeObservations(
  input: LucaLinkHostProbeObservation[] = [],
): LucaLinkHostConnectionDiagnosis {
  const unsafe = input.filter(
    (observation) => !observation.safeToUse || hasBlockedIntent(observation),
  );
  const runtimeSurfaces = unique(
    input.map((observation) => observation.runtimeSurface ?? ""),
  );
  const connectionSurfaces = unique(
    input.map((observation) => observation.connectionSurface ?? ""),
  );
  return {
    id: `diagnosis-${input[0]?.id ?? "observations"}`,
    summary: unsafe.length
      ? "Host observations include unsafe or unauthorized bridge-planning signals."
      : "Host observations were classified as safe model evidence.",
    detectedRuntimeSurfaces: runtimeSurfaces,
    availableConnectionSurfaces: connectionSurfaces,
    missingRequirements: runtimeSurfaces.length
      ? []
      : ["runtime surface evidence"],
    failedMethods: [],
    recommendedNextChecks: [
      "Confirm user authorization",
      "Confirm Primary Host approval path",
      "Prepare sandbox-only bridge test plan",
    ],
    risk: unsafe.length ? "critical" : "medium",
    warnings: unique(input.flatMap((observation) => observation.warnings)),
    errors: unsafe.length
      ? [
          "Unsafe or unauthorized observation cannot be used for Adaptive Bridge Generation.",
        ]
      : [],
  };
}

export function createLucaLinkHostConnectionDiagnosis(
  input: LucaLinkHostDiagnosisInput,
  options?: { now?: number },
): LucaLinkHostConnectionDiagnosis {
  void options;
  const observationsDiagnosis = input.observations?.length
    ? classifyLucaLinkHostProbeObservations(input.observations)
    : undefined;
  const runtimeSurfaces = unique([
    ...(input.runtimeSurfaces ?? []).map(String),
    ...(observationsDiagnosis?.detectedRuntimeSurfaces ?? []),
  ]);
  const connectionSurfaces = unique(
    [
      input.connectionClass ?? "",
      ...(observationsDiagnosis?.availableConnectionSurfaces ?? []),
    ].map(String),
  );
  const warnings = unique([
    ...(input.warnings ?? []),
    ...(observationsDiagnosis?.warnings ?? []),
  ]);
  const errors = unique([
    ...(input.errors ?? []),
    ...(observationsDiagnosis?.errors ?? []),
  ]);
  const requested = input.requestedCapabilities ?? [];
  if (hasBlockedIntent(input))
    errors.push(
      "Blocked unsafe bridge-planning request: credential, authentication, unauthorized access, execution, file, socket, payment, or physical-action behavior is not allowed.",
    );
  const missingRequirements = unique([
    ...(runtimeSurfaces.length ? [] : ["runtime surface classification"]),
    ...(connectionSurfaces.length ? [] : ["connection surface classification"]),
    ...(requested.some(
      (capability) =>
        normalize(capability).includes("control") ||
        normalize(capability).includes("motion"),
    )
      ? ["fresh Primary Host confirmation for future control capability"]
      : []),
  ]);
  return {
    id: input.id ?? `diagnosis-${input.hostId ?? "host"}`,
    hostId: input.hostId ?? input.id,
    summary:
      input.summary ??
      (errors.length
        ? "Host adaptation diagnosis is blocked by safety policy."
        : "Host adaptation diagnosis is model-only and ready for authorized bridge strategy planning."),
    detectedHostClass: input.hostClass,
    detectedRuntimeSurfaces: runtimeSurfaces,
    availableConnectionSurfaces: connectionSurfaces,
    missingRequirements,
    failedMethods: unique(input.failedMethods ?? []),
    recommendedNextChecks: errors.length
      ? [
          "Resolve authorization and safety blockers before any future bridge generation.",
        ]
      : [
          "Confirm the user owns or administers the host.",
          "Route generated bridge programs through Primary Host approval.",
          "Run sandbox/static checks in a later execution-controlled PR.",
        ],
    risk: errors.length
      ? "critical"
      : maxRisk([
          observationsDiagnosis?.risk ?? "low",
          input.hostClass === "embodied-host" ? "high" : "medium",
        ]),
    warnings,
    errors: unique(errors),
  };
}

export function planLucaLinkHostBridgeStrategies(
  diagnosis: LucaLinkHostConnectionDiagnosis,
  options?: { includeUnsupported?: boolean },
): LucaLinkHostBridgeStrategyPlan[] {
  if (
    diagnosis.errors.length ||
    diagnosis.risk === "critical" ||
    hasBlockedIntent(diagnosis)
  ) {
    return [
      {
        id: `${diagnosis.id}-unsupported`,
        kind: "unsupported",
        title: "Unsupported bridge plan",
        targetHostClass: diagnosis.detectedHostClass ?? "unknown-host",
        risk: "critical",
        rationale: ["Unsafe or unauthorized bridge planning is blocked."],
        warnings: diagnosis.warnings,
        errors: diagnosis.errors.length
          ? diagnosis.errors
          : [
              "Critical-risk host adaptation requires a supported, authorized diagnosis.",
            ],
      },
    ];
  }
  const surfaces = diagnosis.detectedRuntimeSurfaces.map(normalize);
  const hostClass = normalize(diagnosis.detectedHostClass);
  const plans: LucaLinkHostBridgeStrategyPlan[] = [];
  const add = (
    kind: LucaLinkHostBridgeStrategyKind,
    title: string,
    risk: LucaLinkHostAdaptationRisk,
    surface?: string,
    connection?: string,
    rationale: string[] = [],
  ) =>
    plans.push({
      id: `${diagnosis.id}-${kind}`,
      kind,
      title,
      targetHostClass: diagnosis.detectedHostClass ?? "unknown-host",
      targetRuntimeSurface: surface,
      connectionClass: connection,
      risk,
      rationale,
      warnings: [],
      errors: [],
    });
  if (
    surfaces.some((surface) => ["browser", "smart-tv"].includes(surface)) ||
    ["tv-host", "web-display-host", "display-host"].includes(hostClass)
  )
    add(
      "web-display-bridge",
      "Web Display Bridge",
      "low",
      surfaces.find((surface) => surface.includes("tv")) ?? "browser",
      "web-display",
      ["Display-only host can receive a model-only bridge blueprint."],
    );
  if (surfaces.includes("kiosk-browser"))
    add(
      "kiosk-display-bridge",
      "Kiosk Display Bridge",
      "medium",
      "kiosk-browser",
      "web-display",
      ["Public kiosk/display surfaces remain display-only."],
    );
  if (
    surfaces.includes("python-runtime") ||
    surfaces.includes("embedded-linux")
  )
    add(
      "python-host-agent",
      "Python Host Agent",
      hostClass === "embodied-host" ? "high" : "medium",
      surfaces.includes("python-runtime") ? "python-runtime" : "embedded-linux",
      "local-lan",
      [
        "Code-capable host requires sandbox and future explicit execution controls.",
      ],
    );
  if (surfaces.includes("node-runtime"))
    add(
      "node-host-adapter",
      "Node Host Adapter",
      "medium",
      "node-runtime",
      "local-lan",
    );
  if (
    surfaces.includes("electron-runtime") ||
    surfaces.includes("native-desktop")
  )
    add(
      "electron-host-adapter",
      "Electron Host Adapter",
      "medium",
      surfaces.includes("electron-runtime")
        ? "electron-runtime"
        : "native-desktop",
      "local-lan",
    );
  if (surfaces.includes("iot-api"))
    add(
      "iot-api-bridge",
      "IoT API Bridge",
      "medium",
      "iot-api",
      "electronics-bridge",
      [
        "Read-only default; control is denied until a future fresh-confirmation flow.",
      ],
    );
  if (surfaces.includes("mqtt"))
    add("mqtt-bridge", "MQTT Bridge", "medium", "mqtt", "electronics-bridge", [
      "Read-only topic modeling only; no MQTT implementation is added.",
    ]);
  if (surfaces.includes("matter-like"))
    add(
      "matter-like-bridge",
      "Matter-like Bridge",
      "medium",
      "matter-like",
      "electronics-bridge",
    );
  if (surfaces.includes("ros-like"))
    add(
      "ros-sensor-bridge",
      "ROS Sensor Bridge",
      "high",
      "ros-like",
      "embodied-bridge",
      [
        "Sensor-read blueprint only; motion and actuation are denied by default.",
      ],
    );
  if (surfaces.includes("serial"))
    add(
      "serial-sensor-bridge",
      "Serial Sensor Bridge",
      "medium",
      "serial",
      "sensor-stream",
    );
  if (surfaces.includes("smart-watch") || hostClass === "watch-host")
    add(
      "companion-watch-bridge",
      "Companion Watch Bridge",
      "low",
      "smart-watch",
      "companion-bridge",
      [
        "Watch approval is limited to low/medium risk and never high-risk by default.",
      ],
    );
  if (!plans.length || options?.includeUnsupported)
    add(
      plans.length ? "manual-setup-guide" : "unsupported",
      plans.length ? "Manual Setup Guide" : "Unsupported bridge plan",
      plans.length ? "medium" : "high",
      undefined,
      undefined,
      ["Unknown hosts receive guide-only planning until classified."],
    );
  return plans;
}

function baseBlueprint(
  strategy: LucaLinkHostBridgeStrategyPlan,
): LucaLinkHostBridgeBlueprint {
  return {
    id: `${strategy.id}-blueprint`,
    strategyKind: strategy.kind,
    title: strategy.title,
    summary:
      "Authorized host bridge planning blueprint only; no generated adapter is executed, installed, written to disk, sent over network, or connected.",
    targetHostClass: strategy.targetHostClass,
    targetRuntimeSurface: strategy.targetRuntimeSurface,
    connectionClass: strategy.connectionClass,
    generatedProgramLanguage: "none",
    generatedProgramAllowed: false,
    requiresPrimaryHostApproval: true,
    requiresSandbox: false,
    requiresUserProvidedCredentials: false,
    allowedCapabilities: [],
    deniedCapabilities: [
      "credential-bypass",
      "unauthorized-access",
      "generated-code-execution",
      "file-write",
      "socket-open",
      "payment",
      "physical-actuation",
    ],
    safetyBoundaries: [
      "Model-only blueprint",
      "No execution or install in this PR",
      "Primary Host approval required before any future generation",
      "Sandbox/static checks required before any future code bridge",
      "No authentication bypass or secret scraping",
    ],
    sandboxTestPlan: [
      "Review blueprint as static text",
      "Confirm no network/socket/file/execution behavior",
      "Confirm denied capabilities remain denied",
    ],
    approvalChecklist: [
      "Confirm user authorization for the target host",
      "Confirm Primary Host approval",
      "Confirm credentials are user-provided through approved future flows only",
      "Confirm no physical, payment, or system-setting action is included",
    ],
    pseudoCode:
      "planBridgeProfile(); validateSafetyBoundaries(); requirePrimaryHostApproval(); requireSandboxBeforeFutureExecution();",
    risk: strategy.risk,
    warnings: [...strategy.warnings],
    errors: [...strategy.errors],
    stage: "blueprint-created",
  };
}

export function createLucaLinkHostBridgeBlueprint(
  strategy: LucaLinkHostBridgeStrategyPlan | LucaLinkHostBridgeStrategyKind,
  options?: Partial<LucaLinkHostBridgeBlueprint> & {
    targetHostClass?: string;
    targetRuntimeSurface?: string;
    connectionClass?: string;
  },
): LucaLinkHostBridgeBlueprint {
  const plan: LucaLinkHostBridgeStrategyPlan =
    typeof strategy === "string"
      ? {
          id: `strategy-${strategy}`,
          kind: strategy,
          title: strategy
            .split("-")
            .map((part) => part[0]?.toUpperCase() + part.slice(1))
            .join(" "),
          targetHostClass: options?.targetHostClass ?? "unknown-host",
          targetRuntimeSurface: options?.targetRuntimeSurface,
          connectionClass: options?.connectionClass,
          risk: options?.risk ?? "medium",
          rationale: [],
          warnings: [],
          errors: [],
        }
      : strategy;
  const blueprint = { ...baseBlueprint(plan), ...options };
  switch (plan.kind) {
    case "web-display-bridge":
    case "kiosk-display-bridge":
      blueprint.generatedProgramLanguage = "config";
      blueprint.allowedCapabilities = [
        "display-only",
        "qr-or-link-concept",
        "read-only-ui",
      ];
      blueprint.deniedCapabilities.push("approval-authority", "tool-execution");
      blueprint.requiresSandbox = false;
      blueprint.configSketch = {
        mode: "display-only",
        transportConcepts: ["QR/link", "WebRTC/WebSocket concept only"],
        implementation: "future PR",
      };
      break;
    case "python-host-agent":
      blueprint.generatedProgramLanguage = "python";
      blueprint.requiresSandbox = true;
      blueprint.allowedCapabilities = [
        "host-profile",
        "read-only-status",
        "sandbox-test-plan",
      ];
      blueprint.deniedCapabilities.push(
        "shell-execution",
        "system-setting-change",
      );
      break;
    case "node-host-adapter":
    case "electron-host-adapter":
      blueprint.generatedProgramLanguage =
        plan.kind === "node-host-adapter" ? "javascript" : "typescript";
      blueprint.requiresSandbox = true;
      blueprint.allowedCapabilities = [
        "host-profile",
        "display-status",
        "sandbox-test-plan",
      ];
      blueprint.deniedCapabilities.push("runtime-tool-execution");
      break;
    case "iot-api-bridge":
    case "mqtt-bridge":
    case "matter-like-bridge":
      blueprint.generatedProgramLanguage = "config";
      blueprint.requiresSandbox = true;
      blueprint.allowedCapabilities = [
        "read-only-sensing",
        "capability-boundary-model",
      ];
      blueprint.deniedCapabilities.push("device-control", "smart-home-action");
      blueprint.configSketch = {
        defaultMode: "read-only",
        controlActions: "denied until future fresh-confirmation controls",
      };
      break;
    case "ros-sensor-bridge":
    case "serial-sensor-bridge":
      blueprint.generatedProgramLanguage =
        plan.kind === "ros-sensor-bridge" ? "python" : "config";
      blueprint.requiresSandbox = true;
      blueprint.allowedCapabilities = [
        "sensor-read-blueprint",
        "telemetry-schema-sketch",
      ];
      blueprint.deniedCapabilities.push("motion", "actuation", "self-approval");
      blueprint.risk = maxRisk([
        blueprint.risk,
        plan.kind === "ros-sensor-bridge" ? "high" : "medium",
      ]);
      break;
    case "companion-watch-bridge":
      blueprint.generatedProgramLanguage = "config";
      blueprint.allowedCapabilities = [
        "low-risk-approval-signal",
        "low-medium-risk-with-trust",
        "notification-display",
      ];
      blueprint.deniedCapabilities.push(
        "high-risk-approval",
        "physical-action-approval",
      );
      break;
    case "manual-setup-guide":
      blueprint.generatedProgramLanguage = "none";
      blueprint.allowedCapabilities = [
        "manual-setup-guide",
        "host-profile-proposal",
      ];
      break;
    case "unsupported":
      blueprint.generatedProgramLanguage = "none";
      blueprint.risk = "critical";
      blueprint.stage = "blocked";
      blueprint.errors.push(
        "Unsupported or unsafe host bridge plan is blocked.",
      );
      break;
  }
  return evaluateLucaLinkHostAdaptationSafety(blueprint);
}

export function evaluateLucaLinkHostAdaptationSafety(
  blueprint: LucaLinkHostBridgeBlueprint,
  options?: { allowFutureGeneratedProgram?: boolean },
): LucaLinkHostBridgeBlueprint {
  const next: LucaLinkHostBridgeBlueprint = {
    ...blueprint,
    allowedCapabilities: unique(blueprint.allowedCapabilities),
    deniedCapabilities: unique(blueprint.deniedCapabilities),
    safetyBoundaries: unique(blueprint.safetyBoundaries),
    sandboxTestPlan: unique(blueprint.sandboxTestPlan),
    approvalChecklist: unique(blueprint.approvalChecklist),
    warnings: unique(blueprint.warnings),
    errors: unique(blueprint.errors),
  };
  const allowedText = [
    next.title,
    next.summary,
    next.pseudoCode,
    ...next.allowedCapabilities,
  ].join(" ");
  const unsafe = BLOCKED_TERMS.some((term) =>
    normalize(allowedText).includes(term),
  );
  if (unsafe || next.strategyKind === "unsupported") {
    next.generatedProgramAllowed = false;
    next.risk = "critical";
    next.stage = "blocked";
    if (!next.errors.length)
      next.errors.push("Safety policy blocked this adaptive bridge blueprint.");
  }
  if (
    ["python", "javascript", "typescript", "shell"].includes(
      next.generatedProgramLanguage ?? "none",
    )
  ) {
    next.generatedProgramAllowed =
      options?.allowFutureGeneratedProgram === true
        ? next.generatedProgramAllowed
        : false;
    next.requiresSandbox = true;
  }
  if (next.generatedProgramLanguage === "shell") {
    next.generatedProgramAllowed = false;
    next.risk = "critical";
    next.stage = "blocked";
    next.errors.push(
      "Shell bridge programs are not allowed in this model-only PR.",
    );
  }
  next.requiresPrimaryHostApproval = true;
  if (next.errors.length && next.risk !== "critical") next.risk = "high";
  return { ...next, errors: unique(next.errors) };
}

export function summarizeLucaLinkHostAdaptation(
  items: Array<LucaLinkHostBridgeBlueprint | LucaLinkHostConnectionDiagnosis>,
) {
  const blueprints = items.filter(
    (item): item is LucaLinkHostBridgeBlueprint => "strategyKind" in item,
  );
  const diagnoses = items.filter(
    (item): item is LucaLinkHostConnectionDiagnosis =>
      !("strategyKind" in item),
  );
  return {
    total: items.length,
    diagnoses: diagnoses.length,
    blueprints: blueprints.length,
    blocked: items.filter(
      (item) =>
        item.risk === "critical" ||
        item.errors.length > 0 ||
        ("stage" in item && item.stage === "blocked"),
    ).length,
    approvalRequired: blueprints.filter(
      (blueprint) => blueprint.requiresPrimaryHostApproval,
    ).length,
    sandboxRequired: blueprints.filter((blueprint) => blueprint.requiresSandbox)
      .length,
    generatedProgramAllowed: blueprints.filter(
      (blueprint) => blueprint.generatedProgramAllowed,
    ).length,
    byRisk: {
      low: items.filter((item) => item.risk === "low").length,
      medium: items.filter((item) => item.risk === "medium").length,
      high: items.filter((item) => item.risk === "high").length,
      critical: items.filter((item) => item.risk === "critical").length,
    },
    warnings: unique(items.flatMap((item) => item.warnings)),
    errors: unique(items.flatMap((item) => item.errors)),
  };
}
