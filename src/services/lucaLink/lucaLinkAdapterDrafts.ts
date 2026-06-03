/** Controlled adapter drafts: text/model-only artifacts, never execution. */
import type { LucaLinkBridgeReviewRecord } from "./lucaLinkBridgeReview";
import type { LucaLinkHostBridgeBlueprint } from "./lucaLinkHostAdaptation";
export type LucaLinkAdapterDraftKind =
  | "web-display-config"
  | "python-host-agent-draft"
  | "node-host-adapter-draft"
  | "electron-host-adapter-draft"
  | "iot-api-config-draft"
  | "mqtt-config-draft"
  | "matter-like-config-draft"
  | "ros-sensor-draft"
  | "serial-sensor-draft"
  | "companion-watch-config"
  | "manual-setup-guide";
export type LucaLinkAdapterDraftStatus =
  | "draft"
  | "requires-review"
  | "approved-for-sandbox"
  | "blocked"
  | "cancelled"
  | "expired";
export interface LucaLinkAdapterDraft {
  id: string;
  kind: LucaLinkAdapterDraftKind;
  title: string;
  summary: string;
  status: LucaLinkAdapterDraftStatus;
  language:
    | "typescript"
    | "javascript"
    | "python"
    | "json"
    | "yaml"
    | "markdown"
    | "none";
  sourceBlueprintId?: string;
  sourceReviewId?: string;
  codePreview?: string;
  configPreview?: Record<string, unknown>;
  setupGuide?: string;
  generatedTextOnly: true;
  canWriteToDisk: false;
  canExecute: false;
  canInstall: false;
  requiresPrimaryHostApproval: boolean;
  requiresSandbox: boolean;
  allowedCapabilities: string[];
  deniedCapabilities: string[];
  warnings: string[];
  errors: string[];
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
}
export interface LucaLinkAdapterDraftRegistry {
  records: LucaLinkAdapterDraft[];
  maxRecords: number;
}
export interface LucaLinkAdapterDraftSummary {
  total: number;
  draft: number;
  requiresReview: number;
  approvedForSandbox: number;
  blocked: number;
  cancelled: number;
  byKind: Partial<Record<LucaLinkAdapterDraftKind, number>>;
  warnings: string[];
  errors: string[];
}
const TTL = 24 * 60 * 60 * 1000;
const UNSAFE = [
  "credential bypass",
  "bypass credentials",
  "defeat authentication",
  "exploit",
  "stealth",
  "persistence",
  "malware",
  "scrape secrets",
  "payment execution",
  "physical actuation",
  "run generated code",
  "write files",
  "open sockets",
  "control robot",
  "control device",
];
function text(input: unknown): string {
  return JSON.stringify(input ?? {}).toLowerCase();
}
function hasUnsafe(input: unknown): boolean {
  const t = text(input);
  return UNSAFE.some((term) => t.includes(term));
}
function sanitize(value = ""): string {
  let out = value;
  for (const term of UNSAFE)
    out = out.replace(new RegExp(term, "gi"), "[blocked unsafe request]");
  return out;
}
function mapKind(kind?: string): LucaLinkAdapterDraftKind {
  return (
    (
      {
        "web-display-bridge": "web-display-config",
        "python-host-agent": "python-host-agent-draft",
        "node-host-adapter": "node-host-adapter-draft",
        "electron-host-adapter": "electron-host-adapter-draft",
        "iot-api-bridge": "iot-api-config-draft",
        "mqtt-bridge": "mqtt-config-draft",
        "matter-like-bridge": "matter-like-config-draft",
        "ros-sensor-bridge": "ros-sensor-draft",
        "serial-sensor-bridge": "serial-sensor-draft",
        "companion-watch-bridge": "companion-watch-config",
        "manual-setup-guide": "manual-setup-guide",
      } as Record<string, LucaLinkAdapterDraftKind>
    )[kind ?? ""] ?? "manual-setup-guide"
  );
}
function language(
  kind: LucaLinkAdapterDraftKind,
): LucaLinkAdapterDraft["language"] {
  if (kind.includes("python")) return "python";
  if (kind.includes("node")) return "javascript";
  if (kind.includes("electron")) return "typescript";
  if (
    kind.includes("config") ||
    kind.includes("mqtt") ||
    kind.includes("matter") ||
    kind.includes("web-display") ||
    kind.includes("watch")
  )
    return "json";
  if (kind.includes("guide")) return "markdown";
  return "yaml";
}
function needsSandbox(kind: LucaLinkAdapterDraftKind): boolean {
  return [
    "python-host-agent-draft",
    "node-host-adapter-draft",
    "electron-host-adapter-draft",
    "iot-api-config-draft",
    "mqtt-config-draft",
    "matter-like-config-draft",
    "ros-sensor-draft",
    "serial-sensor-draft",
  ].includes(kind);
}
export function createLucaLinkAdapterDraftRegistry(
  maxRecords = 100,
): LucaLinkAdapterDraftRegistry {
  return { records: [], maxRecords };
}
export function sanitizeAdapterDraftText(value: string): string {
  return sanitize(value);
}
export function createAdapterDraftFromBlueprint(
  blueprint: Partial<LucaLinkHostBridgeBlueprint>,
  options: { now?: number; ttlMs?: number } = {},
): LucaLinkAdapterDraft {
  const now = options.now ?? Date.now();
  const kind =
    blueprint.generatedProgramLanguage === "shell"
      ? "manual-setup-guide"
      : mapKind(blueprint.strategyKind);
  const unsafe =
    hasUnsafe(blueprint) || blueprint.generatedProgramLanguage === "shell";
  const sandbox = needsSandbox(kind);
  const readOnly = [
    "iot-api-config-draft",
    "mqtt-config-draft",
    "matter-like-config-draft",
    "ros-sensor-draft",
    "serial-sensor-draft",
    "web-display-config",
  ].includes(kind);
  const warnings = [
    ...(blueprint.warnings ?? []),
    "Adapter draft is generatedTextOnly and cannot write, execute, install, open sockets, or connect.",
  ];
  if (blueprint.generatedProgramLanguage === "shell")
    warnings.push(
      "Shell drafts are converted to manual setup guide text and blocked from execution.",
    );
  const deniedCapabilities = [
    "write-to-disk",
    "execute",
    "install",
    "open-socket",
    "send-to-host",
    "live-probe",
    "credential-bypass",
    "physical-actuation",
    ...(readOnly ? ["device-control", "motion"] : []),
  ];
  return {
    id: `adapter-draft-${blueprint.id ?? now}`,
    kind,
    title: `Adapter draft: ${blueprint.title ?? kind}`,
    summary: unsafe
      ? "Unsafe adapter draft content was blocked."
      : "Controlled adapter draft represented as text/model only.",
    status: unsafe ? "blocked" : sandbox ? "requires-review" : "draft",
    language: language(kind),
    sourceBlueprintId: blueprint.id,
    codePreview: kind.endsWith("draft")
      ? sanitize(
          blueprint.pseudoCode ??
            `// Pseudocode only for ${kind}; not executable in this PR.`,
        )
      : undefined,
    configPreview:
      blueprint.configSketch ??
      (readOnly ? { mode: "read-only", generatedTextOnly: true } : undefined),
    setupGuide: sanitize(
      `Manual setup guide only. Do not execute, install, write files, open sockets, or connect this draft.`,
    ),
    generatedTextOnly: true,
    canWriteToDisk: false,
    canExecute: false,
    canInstall: false,
    requiresPrimaryHostApproval: true,
    requiresSandbox: sandbox,
    allowedCapabilities: readOnly
      ? ["display-only", "read-only-status", "model-preview"]
      : ["model-preview", "static-review"],
    deniedCapabilities,
    warnings,
    errors: unsafe
      ? [
          "Unsafe draft terms or shell execution intent detected; draft is blocked or manual-guide only.",
        ]
      : [],
    createdAt: now,
    updatedAt: now,
    expiresAt: now + (options.ttlMs ?? TTL),
  };
}
export function createAdapterDraftFromBridgeReview(
  review: LucaLinkBridgeReviewRecord,
  options: { now?: number; ttlMs?: number } = {},
): LucaLinkAdapterDraft {
  const draft = createAdapterDraftFromBlueprint(
    {
      id: review.blueprintId,
      strategyKind:
        review.strategyKind as LucaLinkHostBridgeBlueprint["strategyKind"],
      title: review.title,
      summary: review.blueprintSummary,
      pseudoCode: review.pseudoCodePreview,
      configSketch: review.configPreview,
      risk: review.risk,
      warnings: review.warnings,
      errors: review.errors,
      requiresSandbox: review.requiresSandbox,
      requiresPrimaryHostApproval: review.requiresPrimaryHostApproval,
    },
    options,
  );
  return {
    ...draft,
    id: `adapter-draft-${review.id}`,
    sourceReviewId: review.id,
    status:
      review.status === "approved-for-sandbox"
        ? "approved-for-sandbox"
        : draft.status,
    warnings: [
      ...draft.warnings,
      "Source bridge review remains sandbox/static-check preparation only.",
    ],
  };
}
export function evaluateAdapterDraftSafety(
  draft: LucaLinkAdapterDraft,
): LucaLinkAdapterDraft {
  const unsafe =
    hasUnsafe(draft.codePreview) ||
    hasUnsafe(draft.setupGuide) ||
    hasUnsafe(draft.configPreview);
  return unsafe
    ? {
        ...draft,
        status: "blocked",
        errors: [
          ...draft.errors,
          "Unsafe adapter draft preview content detected.",
        ],
        updatedAt: Date.now(),
      }
    : {
        ...draft,
        canWriteToDisk: false,
        canExecute: false,
        canInstall: false,
        generatedTextOnly: true,
      };
}
export function summarizeAdapterDrafts(
  drafts: LucaLinkAdapterDraft[],
): LucaLinkAdapterDraftSummary {
  const byKind: Partial<Record<LucaLinkAdapterDraftKind, number>> = {};
  drafts.forEach((d) => {
    byKind[d.kind] = (byKind[d.kind] ?? 0) + 1;
  });
  return {
    total: drafts.length,
    draft: drafts.filter((d) => d.status === "draft").length,
    requiresReview: drafts.filter((d) => d.status === "requires-review").length,
    approvedForSandbox: drafts.filter(
      (d) => d.status === "approved-for-sandbox",
    ).length,
    blocked: drafts.filter((d) => d.status === "blocked").length,
    cancelled: drafts.filter((d) => d.status === "cancelled").length,
    byKind,
    warnings: drafts.flatMap((d) => d.warnings),
    errors: drafts.flatMap((d) => d.errors),
  };
}
export function registerAdapterDraft(
  registry: LucaLinkAdapterDraftRegistry,
  draft: LucaLinkAdapterDraft,
): LucaLinkAdapterDraft {
  registry.records = [
    draft,
    ...registry.records.filter((r) => r.id !== draft.id),
  ].slice(0, registry.maxRecords);
  return draft;
}
export function getAdapterDraft(
  registry: LucaLinkAdapterDraftRegistry,
  id: string,
): LucaLinkAdapterDraft | undefined {
  return registry.records.find((r) => r.id === id);
}
export function listAdapterDrafts(
  registry: LucaLinkAdapterDraftRegistry,
): LucaLinkAdapterDraft[] {
  return [...registry.records];
}
export function updateAdapterDraft(
  registry: LucaLinkAdapterDraftRegistry,
  draft: LucaLinkAdapterDraft,
): LucaLinkAdapterDraft | undefined {
  const index = registry.records.findIndex((r) => r.id === draft.id);
  if (index === -1) return undefined;
  registry.records[index] = draft;
  return draft;
}
