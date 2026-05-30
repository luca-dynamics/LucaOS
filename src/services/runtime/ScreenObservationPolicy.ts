// ScreenObservationPolicy — PR #131: Screen Observation Permission Model, dry-run only.
// Classifies how a future screen observation request would be permissioned.
// It never captures, views, stores, OCRs, or analyzes a screen.
//
// No screen APIs. No screenshot APIs. No OCR libraries. No vision model calls.
// No DOM APIs. No browser APIs. No filesystem APIs. No network APIs.

import type {
  ScreenObservationCapability,
  ScreenObservationPolicyDecision,
  ScreenObservationRiskLevel,
  ScreenObservationSurface,
} from "../../types/screenObservation";

const SECRET_PATTERNS = [
  /\btoken\b/i,
  /\bsecret\b/i,
  /\bapi[_-]?key\b/i,
  /\bprivate[_-]?key\b/i,
  /\bpassword\b/i,
  /\bpasscode\b/i,
  /\bcredential\b/i,
  /\bmnemonic\b/i,
  /\bseed phrase\b/i,
  /\bsession cookie\b/i,
  /\b2fa\b|\botp\b|\bone[- ]?time code\b/i,
  /sk-[A-Za-z0-9_-]{8,}/,
  /gh[pousr]_[A-Za-z0-9_]{12,}/,
  /AIza[A-Za-z0-9_-]{12,}/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
];

export interface ScreenObservationIntentInput {
  message: string;
  source?: string;
  sourceId?: string;
  targetDescriptor?: string;
  metadata?: Record<string, unknown>;
}

export interface ScreenObservationEvaluationInput extends ScreenObservationIntentInput {
  surface?: ScreenObservationSurface;
  capability?: ScreenObservationCapability;
}

export interface SanitizedScreenObservationInput {
  message: string;
  source: string;
  sourceId?: string;
  targetDescriptor?: string;
  metadata: Record<string, unknown>;
  secretLike: boolean;
}

function scrubSecretLikeText(value: string): string {
  return SECRET_PATTERNS.reduce((current, pattern) => current.replace(pattern, "[redacted]"), value).slice(0, 1_000);
}

export function blockIfSecretLike(input: string): boolean {
  return SECRET_PATTERNS.some((pattern) => pattern.test(input));
}

export function sanitizeScreenObservationInput(input: ScreenObservationIntentInput): SanitizedScreenObservationInput {
  const message = scrubSecretLikeText(input.message ?? "");
  const targetDescriptor = input.targetDescriptor ? scrubSecretLikeText(input.targetDescriptor).slice(0, 160) : undefined;
  const metadata = Object.fromEntries(
    Object.entries(input.metadata ?? {}).slice(0, 30).map(([key, value]) => {
      const safeKey = scrubSecretLikeText(key).slice(0, 80);
      if (/secret|token|password|api[_-]?key|credential|private[_-]?key|cookie|otp|2fa/i.test(key)) return [safeKey, "[redacted]"];
      if (typeof value === "string") return [safeKey, scrubSecretLikeText(value).slice(0, 300)];
      if (typeof value === "number" || typeof value === "boolean" || value === null) return [safeKey, value];
      return [safeKey, "[object]"];
    }),
  );

  return {
    message,
    source: scrubSecretLikeText(input.source ?? "screen_observation").slice(0, 80),
    sourceId: input.sourceId ? scrubSecretLikeText(input.sourceId).slice(0, 120) : undefined,
    targetDescriptor,
    metadata,
    secretLike: blockIfSecretLike(input.message ?? "") || Boolean(input.targetDescriptor && blockIfSecretLike(input.targetDescriptor)),
  };
}

export function detectScreenObservationSurface(message: string): ScreenObservationSurface {
  if (/\bregion\b|\barea\b|\bselection\b|\bbox\b/i.test(message)) return "region";
  if (/\bbrowser tab\b|\bthis tab\b|\bweb ?page tab\b/i.test(message)) return "browser_tab";
  if (/\bwindow\b/i.test(message)) return "window";
  if (/\bthis app\b|\bthe app\b|\bapplication\b/i.test(message)) return "app";
  if (/\bmy screen\b|\bthe screen\b|\bentire screen\b|\bfull screen\b|\bwhole screen\b|\bscreen\b/i.test(message)) return "full_screen";
  return "unknown";
}

export function detectScreenObservationCapability(message: string): ScreenObservationCapability {
  if (/\bread (the )?text\b|\bocr\b|\bextract text\b|\btext on (the )?screen\b/i.test(message)) return "detect_text_presence";
  if (/\bsensitive\b|\bprivate (content|info)\b|\bredact\b/i.test(message)) return "detect_sensitive_presence";
  if (/\blayout\b|\bfind ui\b|\bui elements?\b|\bunderstand (the )?screen\b|\bdetect ui\b/i.test(message)) return "detect_ui_layout";
  if (/\bwatch\b|\blive\b|\bmonitor\b|\bkeep an eye\b|\bcontinuous\b/i.test(message)) return "observe_live_context";
  if (/\blook at\b|\bobserve\b|\bread (my|the) screen\b|\bsee (my|the) screen\b|\bview\b/i.test(message)) return "observe_static_context";
  return "unknown";
}

function riskForObservation(
  surface: ScreenObservationSurface,
  capability: ScreenObservationCapability,
  secretLike: boolean,
): ScreenObservationRiskLevel {
  if (secretLike) return "critical";
  if (capability === "detect_text_presence") return "high";
  if (capability === "observe_live_context") return "high";
  if (capability === "detect_sensitive_presence") return "elevated";
  if (capability === "detect_ui_layout") return "elevated";
  if (capability === "observe_static_context") return surface === "region" ? "low" : "elevated";
  return "elevated";
}

export function evaluateScreenObservationRequest(
  input: ScreenObservationEvaluationInput,
): ScreenObservationPolicyDecision {
  const sanitized = sanitizeScreenObservationInput(input);
  const surface = input.surface ?? detectScreenObservationSurface(sanitized.message);
  const capability = input.capability ?? detectScreenObservationCapability(sanitized.message);
  const blockedBy: string[] = [];
  const riskLevel = riskForObservation(surface, capability, sanitized.secretLike);

  if (sanitized.secretLike) blockedBy.push("secret_like_content");
  // OCR / text extraction is not enabled — text reading stays a dry-run/blocked spec only.
  if (capability === "detect_text_presence") blockedBy.push("ocr_text_reading_disabled");

  const allowedForDryRun = blockedBy.length === 0 && (riskLevel === "low" || riskLevel === "elevated");

  const decision: ScreenObservationPolicyDecision = {
    allowedForCapture: false,
    allowedForVisionModel: false,
    allowedForDryRun,
    riskLevel,
    surface,
    capability,
    blockedBy,
    userSafeReason: "",
    requiresExplicitConsent: true,
    requiresVisibleIndicator: true,
    requiresRegionBoundary: surface !== "unknown",
    requiresSensitiveContentFilter: true,
    requiresCredentialBoundary: true,
    requiresHumanConfirmation: true,
    requiresAuditLog: true,
    revocable: true,
  };

  decision.userSafeReason = getScreenObservationUserSafeReason(decision);
  return decision;
}

export function classifyScreenObservationIntent(
  input: ScreenObservationIntentInput,
): ScreenObservationPolicyDecision {
  return evaluateScreenObservationRequest(input);
}

export function getScreenObservationUserSafeReason(decision: ScreenObservationPolicyDecision): string {
  if (decision.blockedBy.includes("secret_like_content")) {
    return "Screen observation blocked: the request references credential-like or sensitive content. Luca cannot capture, view, store, OCR, or analyze the screen, and never handles passwords, tokens, or session content.";
  }
  if (decision.blockedBy.includes("ocr_text_reading_disabled")) {
    return "Screen observation blocked: on-screen text reading / OCR is disabled. This stays a permission-model record only — no capture, OCR, or analysis happens.";
  }
  if (decision.blockedBy.length > 0) {
    return `Screen observation blocked for safety: ${decision.blockedBy.join(", ")}. No capture or vision analysis is enabled.`;
  }
  if (decision.allowedForDryRun) {
    return `Screen observation recorded as dry-run only for ${decision.surface}/${decision.capability}. Luca cannot capture, view, store, OCR, or analyze the screen. Any future observation would require explicit consent, a visible indicator, a region boundary, sensitive-content filtering, a credential boundary, human confirmation, audit logging, and remain revocable.`;
  }
  return `Screen observation requires explicit consent before even a dry-run permission session for ${decision.surface}/${decision.capability}. Capture and vision analysis are disabled.`;
}
