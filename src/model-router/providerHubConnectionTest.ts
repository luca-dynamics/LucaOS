import type { LucaProviderHubId } from "./providerHubRegistry";

export type LucaProviderHubConnectionTestStatus = "idle" | "testing" | "success" | "failed" | "unsupported" | "skipped";

export interface LucaProviderHubConnectionTestResult {
  readonly providerId: LucaProviderHubId;
  readonly status: LucaProviderHubConnectionTestStatus;
  readonly message: string;
  readonly latencyMs?: number;
  readonly checkedAt: string;
  readonly safeDiagnosticsText: string;
  readonly sideEffectsPerformed: false;
  readonly runtimeRoutingChanged: false;
  readonly providerApiCalled: boolean;
  readonly secretExposed: false;
}

export interface LucaProviderHubConnectionTestInput {
  readonly providerId: LucaProviderHubId;
  readonly apiKey?: string;
  readonly savedApiKey?: string;
  readonly baseUrl?: string;
  readonly timeoutMs?: number;
  readonly fetchImpl?: typeof fetch;
}

type TestDefinition = {
  readonly kind: "openai_models";
  readonly defaultBaseUrl?: string;
  readonly todo?: string;
};

const OPENAI_COMPATIBLE_TESTS: Partial<Record<LucaProviderHubId, TestDefinition>> = {
  openai: { kind: "openai_models", defaultBaseUrl: "https://api.openai.com/v1" },
  xai_grok: { kind: "openai_models", defaultBaseUrl: "https://api.x.ai/v1" },
  openrouter: { kind: "openai_models", defaultBaseUrl: "https://openrouter.ai/api/v1" },
  deepseek: { kind: "openai_models", defaultBaseUrl: "https://api.deepseek.com/v1" },
  groq: { kind: "openai_models", defaultBaseUrl: "https://api.groq.com/openai/v1" },
  custom_openai_compatible: { kind: "openai_models", todo: "Provider-specific custom health endpoints can be added after endpoint capability metadata exists." },
};

const SECRET_PATTERNS = [
  /sk-[A-Za-z0-9_-]{6,}/g,
  /[A-Za-z0-9_-]{24,}\.[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}/g,
  /(api[_-]?key|authorization|bearer|token|secret)\s*[:=]\s*[^\s,}]+/gi,
];

function nowIso(): string {
  return new Date().toISOString();
}

function sanitizeMessage(input: unknown, secrets: readonly string[] = []): string {
  let text = input instanceof Error ? input.message : String(input ?? "Unknown provider test error");
  for (const secret of secrets) {
    if (secret.trim()) text = text.split(secret).join("[SECURED]");
  }
  for (const pattern of SECRET_PATTERNS) text = text.replace(pattern, "[SECURED]");
  text = text.replace(/https?:\/\/[^\s)]+/gi, (url) => {
    try {
      const parsed = new URL(url);
      return `${parsed.origin}${parsed.pathname}`;
    } catch {
      return "[URL]";
    }
  });
  return text.slice(0, 240);
}

function createResult(input: {
  providerId: LucaProviderHubId;
  status: LucaProviderHubConnectionTestStatus;
  message: string;
  providerApiCalled: boolean;
  latencyMs?: number;
  diagnostics?: Record<string, unknown>;
  checkedAt?: string;
}): LucaProviderHubConnectionTestResult {
  const checkedAt = input.checkedAt ?? nowIso();
  const safeDiagnosticsText = JSON.stringify({
    providerId: input.providerId,
    status: input.status,
    checkedAt,
    providerApiCalled: input.providerApiCalled,
    sideEffectsPerformed: false,
    runtimeRoutingChanged: false,
    secretExposed: false,
    ...(input.latencyMs !== undefined ? { latencyMs: input.latencyMs } : {}),
    ...(input.diagnostics ?? {}),
  });
  return {
    providerId: input.providerId,
    status: input.status,
    message: input.message,
    latencyMs: input.latencyMs,
    checkedAt,
    safeDiagnosticsText,
    sideEffectsPerformed: false,
    runtimeRoutingChanged: false,
    providerApiCalled: input.providerApiCalled,
    secretExposed: false,
  };
}

export function normalizeProviderHubTestBaseUrl(baseUrl: string): URL | undefined {
  try {
    const url = new URL(baseUrl.trim());
    if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") return undefined;

    const next = new URL(url.origin);
    const pathSegments = url.pathname.split("/").filter(Boolean);
    if (pathSegments[pathSegments.length - 1] === "models") pathSegments.pop();
    if (pathSegments[pathSegments.length - 1] !== "v1") pathSegments.push("v1");
    next.pathname = `/${pathSegments.join("/")}`;
    return next;
  } catch {
    return undefined;
  }
}

export function createProviderHubModelsEndpoint(providerId: LucaProviderHubId, baseUrl?: string): string | undefined {
  const definition = OPENAI_COMPATIBLE_TESTS[providerId];
  const normalizedBaseUrl = normalizeProviderHubTestBaseUrl(baseUrl?.trim() || definition?.defaultBaseUrl || "");
  if (!normalizedBaseUrl) return undefined;

  const endpoint = new URL(normalizedBaseUrl.toString());
  const pathSegments = endpoint.pathname.split("/").filter(Boolean);
  if (pathSegments[pathSegments.length - 1] !== "models") pathSegments.push("models");
  endpoint.pathname = `/${pathSegments.join("/")}`;
  endpoint.search = "";
  endpoint.hash = "";
  return endpoint.toString();
}

export function canTestProviderHubConnection(input: Pick<LucaProviderHubConnectionTestInput, "providerId" | "apiKey" | "savedApiKey" | "baseUrl">): { canTest: boolean; reason?: string } {
  if (input.providerId === "luca_prime") return { canTest: false, reason: "Luca Prime is managed by LucaOS; no user API-key test is required." };
  if (input.providerId === "ollama" || input.providerId === "lm_studio" || input.providerId === "local_runtime") return { canTest: false, reason: "Manual local runtime checks are coming later; this action will not start local processes." };
  if (!OPENAI_COMPATIBLE_TESTS[input.providerId]) return { canTest: false, reason: "Manual connection testing is not supported for this provider yet." };
  if (!(input.apiKey?.trim() || input.savedApiKey?.trim())) return { canTest: false, reason: "Add or save an API key before testing this provider." };
  if (input.providerId === "custom_openai_compatible" && !input.baseUrl?.trim()) return { canTest: false, reason: "Enter a custom base URL before testing this provider." };
  return { canTest: true };
}

export async function testProviderHubConnection(input: LucaProviderHubConnectionTestInput): Promise<LucaProviderHubConnectionTestResult> {
  const definition = OPENAI_COMPATIBLE_TESTS[input.providerId];
  const apiKey = input.apiKey?.trim() || input.savedApiKey?.trim() || "";
  const blockers = canTestProviderHubConnection(input);
  if (!blockers.canTest) {
    return createResult({ providerId: input.providerId, status: definition ? "skipped" : "unsupported", message: blockers.reason ?? "Connection test unavailable.", providerApiCalled: false, diagnostics: definition?.todo ? { todo: definition.todo } : undefined });
  }

  const endpoint = createProviderHubModelsEndpoint(input.providerId, input.baseUrl);
  if (!endpoint) {
    return createResult({ providerId: input.providerId, status: "failed", message: "Enter a valid HTTPS base URL. Localhost URLs are only accepted for explicit local endpoints.", providerApiCalled: false });
  }

  const fetcher = input.fetchImpl ?? globalThis.fetch;
  if (typeof fetcher !== "function") {
    return createResult({ providerId: input.providerId, status: "unsupported", message: "Fetch is unavailable in this environment, so this provider cannot be tested here.", providerApiCalled: false });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.max(250, input.timeoutMs ?? 8000));
  const started = Date.now();
  try {
    const response = await fetcher(endpoint, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
      signal: controller.signal,
    });
    const latencyMs = Date.now() - started;
    if (response.ok) {
      return createResult({ providerId: input.providerId, status: "success", message: "Connection test succeeded using a minimal models endpoint request.", latencyMs, providerApiCalled: true, diagnostics: { endpointPath: new URL(endpoint).pathname } });
    }
    return createResult({ providerId: input.providerId, status: "failed", message: `Provider rejected the connection test with HTTP ${response.status}. Check the key, base URL, and account access.`, latencyMs, providerApiCalled: true, diagnostics: { httpStatus: response.status, endpointPath: new URL(endpoint).pathname } });
  } catch (error) {
    const latencyMs = Date.now() - started;
    const aborted = controller.signal.aborted;
    return createResult({ providerId: input.providerId, status: "failed", message: aborted ? "Connection test timed out before the provider responded." : `Connection test failed: ${sanitizeMessage(error, [apiKey])}`, latencyMs, providerApiCalled: true, diagnostics: { aborted, endpointPath: new URL(endpoint).pathname } });
  } finally {
    clearTimeout(timeout);
  }
}
