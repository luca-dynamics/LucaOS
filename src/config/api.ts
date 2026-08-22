/**
 * API Configuration
 * Centralizes all backend API URLs for easy environment management
 */

import { isLucaApiUrl, type LucaTrustedOrigin } from "./lucaApiOrigin";

// For Vite apps, use import.meta.env
// For Node/Electron, use process.env
const getEnvVar = (key: string, fallback: string): string => {
  if (typeof import.meta !== "undefined" && import.meta.env) {
    return import.meta.env[key] || fallback;
  }
  if (typeof process !== "undefined" && process.env) {
    return process.env[key] || fallback;
  }
  return fallback;
};

const LUCA_RELEASE_TARGET = getEnvVar("VITE_LUCA_RELEASE_TARGET", "");
const LUCA_RUNTIME_TARGET = getEnvVar("VITE_LUCA_RUNTIME_TARGET", "");
const IS_PUBLIC_WEB_TARGET =
  LUCA_RELEASE_TARGET === "web" || LUCA_RUNTIME_TARGET === "vercel";
const PUBLIC_LUCA_API_URL = getEnvVar("VITE_LUCA_API_URL", "");

// Use relative paths in Vite browser development to leverage Vite's local proxy.
// In web/Vercel mode, never fall back to localhost/127.0.0.1; the public
// API origin must be explicitly configured with VITE_LUCA_API_URL.
export const API_BASE_URL =
  typeof window !== "undefined" && import.meta.env?.DEV
    ? ""
    : IS_PUBLIC_WEB_TARGET
      ? PUBLIC_LUCA_API_URL
      : PUBLIC_LUCA_API_URL || "http://127.0.0.1:3002";
export const WS_PORT = getEnvVar("VITE_WS_PORT", "3003");
/** Express port that serves /mobile (the companion page). Distinct from WS_PORT. */
export const SERVER_HTTP_PORT = getEnvVar("VITE_SERVER_HTTP_PORT", "3002");
// Use Node.js backend as a gateway to Cortex to handle dynamic ports.
// In public web mode this remains empty unless a public cloud Cortex URL is set.
export const CORTEX_URL = IS_PUBLIC_WEB_TARGET
  ? getEnvVar("VITE_CLOUD_CORTEX_URL", "")
  : getEnvVar("VITE_CORTEX_URL", `${API_BASE_URL}/vision`);
export const AUTH_DOMAIN = IS_PUBLIC_WEB_TARGET
  ? ""
  : getEnvVar("VITE_AUTH_DOMAIN", "http://127.0.0.1:3001");
export const FRONTEND_PORT = getEnvVar("VITE_FRONTEND_PORT", "5822");
// Cloud Relay Server for Mobile Connectivity (Deployment URL)
export const RELAY_SERVER_URL = getEnvVar("VITE_RELAY_SERVER_URL", "");

// NEW: Cloud Cortex Fallback (For unlinked Web users)
// This is the "Light" mode brain hosted on GCP/Docker
export const CLOUD_CORTEX_URL = getEnvVar("VITE_CLOUD_CORTEX_URL", "");
export const CLOUD_API_URL = getEnvVar(
  "VITE_CLOUD_API_URL",
  PUBLIC_LUCA_API_URL,
);

// Streaming STT API Key
export const DEEPGRAM_API_KEY = getEnvVar("VITE_DEEPGRAM_API_KEY", "");

// --- SECURITY PROTOCOL ---
let lucaSecretToken: string | null = null;
let _authWaiters: (() => void)[] = [];

/**
 * Promise that resolves once the security token has been set.
 * Early-firing hooks should `await waitForAuth()` before making API calls.
 */
export const waitForAuth = (): Promise<void> => {
  if (lucaSecretToken) return Promise.resolve();
  const isElectron =
    typeof window !== "undefined" && !!(window as any).luca?.getSecureToken;
  if (!isElectron) return new Promise((r) => setTimeout(r, 2000));
  return new Promise<void>((resolve) => {
    _authWaiters.push(resolve);
  });
};

/**
 * Global setter for the authentication token (called by useAppSystem on boot)
 */
export const setLucaAuthToken = (token: string) => {
  lucaSecretToken = token;
  console.log("[SECURITY] Auth Token synced to API gateway.");
  _authWaiters.forEach((resolve) => resolve());
  _authWaiters = [];
};

/**
 * Utility to get required authentication headers for LUCA API
 */
export const getAuthHeaders = () => {
  return {
    "Content-Type": "application/json",
    ...(lucaSecretToken ? { "X-LUCA-TOKEN": lucaSecretToken } : {}),
  };
};

/**
 * --- GLOBAL API INTERCEPTOR ---
 * Monkey-patches fetch to automatically inject X-LUCA-TOKEN for Luca API calls.
 * This ensures all components (even those I haven't touched) remain secure.
 */
if (typeof window !== "undefined") {
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const resource = args[0];
    let config = args[1];

    const url =
      typeof resource === "string"
        ? resource
        : resource instanceof URL
          ? resource.href
          : resource.url;
    // Determine if this is a Luca API call. `lucaTrustedOrigins` is declared
    // below and read here at request time, not at module init — the core may not
    // have bound its port yet when this patch is installed.
    const isLucaCall = isLucaApiUrl(url, {
      apiBaseUrl: API_BASE_URL,
      trustedOrigins: lucaTrustedOrigins(),
    });

    if (isLucaCall && lucaSecretToken) {
      config = config || {};
      config.headers = {
        ...(config.headers || {}),
        "X-LUCA-TOKEN": lucaSecretToken,
      };
    }

    // 2. Suppress console noise for polling endpoints ONLY in confirmed Cloud mode
    // to avoid red errors when the local backend isn't expected to be there.
    if (
      (url.includes("/api/luca-link/status") || url.includes("/api/status")) &&
      typeof window !== "undefined" &&
      window.sessionStorage?.getItem("LUCA_CLOUD_ONLY") === "true"
    ) {
      return new Response(null, {
        status: 404,
        statusText: "Not Found (Suppressed in Cloud Mode)",
      });
    }

    return originalFetch(resource, config);
  };
}

// Local Python Brain (Cortex)
export const CORTEX_SERVER_URL = IS_PUBLIC_WEB_TARGET
  ? CLOUD_CORTEX_URL
  : getEnvVar("VITE_CORTEX_SERVER_URL", "http://127.0.0.1:8000");

// External Local LLM Provider (Ollama)
export const OLLAMA_SERVER_URL = IS_PUBLIC_WEB_TARGET
  ? ""
  : getEnvVar("VITE_OLLAMA_SERVER_URL", "http://127.0.0.1:11434");

// --- HYBRID CONNECTIVITY STATE ---
let linkedHostIp: string | null =
  typeof window !== "undefined" && window.localStorage
    ? localStorage.getItem("LUCA_LINKED_HOST_IP")
    : null;

/**
 * Update the linked host IP (called by LucaLinkManager after successful pairing)
 */
export const setLinkedHostIp = (ip: string | null) => {
  linkedHostIp = ip;
  if (typeof window !== "undefined" && window.localStorage) {
    if (ip) {
      localStorage.setItem("LUCA_LINKED_HOST_IP", ip);
    } else {
      localStorage.removeItem("LUCA_LINKED_HOST_IP");
    }
  }
};

export type ConnectionTier = "LAN" | "LOCAL" | "CLOUD" | "OFFLINE";

/**
 * Returns the current active connectivity tier
 */
export const getConnectionTier = (): ConnectionTier => {
  const isElectron = typeof window !== "undefined" && !!(window as any).luca;

  if (IS_PUBLIC_WEB_TARGET) {
    return API_BASE_URL || CLOUD_CORTEX_URL ? "CLOUD" : "OFFLINE";
  }

  // 1. LAN (Linked Desktop)
  if (linkedHostIp && linkedHostIp !== "127.0.0.1") return "LAN";

  // 2. ELECTRON (Native/Local Core)
  // If we are in Electron and not linked to a remote host, we are running the local core
  if (isElectron) return "LOCAL";

  // 3. Browser development on localhost
  const isBrowser = !isElectron;
  const isLocalhost =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1");
  if (isBrowser && isLocalhost) return "LOCAL";

  // 4. CLOUD (Web Fallback)
  if (isBrowser && (CLOUD_CORTEX_URL || CLOUD_API_URL)) return "CLOUD";

  return "OFFLINE";
};

/**
 * The live port for a local backend.
 *
 * LucaOS spawns the Local Core and Cortex on EPHEMERAL ports (the OS picks a
 * free one) rather than fixed 3002/8000, so a collision with another app — or a
 * stale LucaOS process still holding the old port and answering as though it
 * were live — is impossible. Electron's preload publishes the real ports via
 * `window.luca.getRuntimePorts()` as each backend reports in — a function, not
 * an object, because contextBridge clones objects at expose time and a mutated
 * object would never reach the renderer.
 *
 * Read lazily, at request time: the renderer can paint before the backends have
 * finished binding, and every call site goes through here, so the first request
 * after a backend registers already targets the right port. Ollama is a third
 * party on its own documented port, so it stays fixed.
 */
const localPortFor = (type: "API" | "CORTEX" | "OLLAMA"): string => {
  if (type === "OLLAMA") return "11434";
  const runtimePorts =
    typeof window !== "undefined"
      ? (window as any).luca?.getRuntimePorts?.()
      : undefined;
  const livePort = type === "API" ? runtimePorts?.api : runtimePorts?.cortex;
  if (livePort) return String(livePort);
  // Fallback for hosts that never publish ports (browser dev, linked mobile).
  return type === "API" ? SERVER_HTTP_PORT : "8000";
};

/**
 * Every host:port that belongs to LucaOS itself, and so may carry the master
 * token. Built fresh per request: the renderer can paint before the backends have
 * bound, and pairing can change the LAN host at any time.
 *
 * Who actually needs it:
 *   - The core requires the token on every `/api` route except health, handshake,
 *     and status (`cortex/server/middleware/authMiddleware.js`).
 *   - Cortex exempts loopback callers but REQUIRES the token from remote ones
 *     (`require_privileged` in `cortex/python/luca_security.py`), so a paired LAN
 *     host must carry it or privileged Cortex routes answer 403. Loopback Cortex
 *     is listed too: it is LucaOS-owned and reads the header, and the asymmetry
 *     would buy nothing.
 *
 * Ollama and the host-native GGUF API server are deliberately absent. They are
 * third parties that happen to share the loopback interface — and, once paired,
 * the LAN host — and must never receive the token. That is why this enumerates
 * the ports it trusts instead of trusting a host: `localPortFor("OLLAMA")` is
 * never consulted here.
 */
const lucaTrustedOrigins = (): LucaTrustedOrigin[] => {
  // On a public web target the only trusted origin is the configured API URL.
  if (IS_PUBLIC_WEB_TARGET) return [];

  const origins: LucaTrustedOrigin[] = [];
  const add = (host: string | null, port: string) => {
    if (host && port) origins.push({ host, port });
  };

  const apiPort = localPortFor("API");
  const cortexPort = localPortFor("CORTEX");
  for (const host of ["127.0.0.1", "localhost"]) {
    add(host, apiPort);
    add(host, cortexPort);
  }
  // A paired desktop reached over the LAN runs the same two services. When the
  // stored host is itself "127.0.0.1" — a value `getConnectionTier` and
  // `resolveBaseUrl` both tolerate — these collapse into the loopback pairs
  // above rather than widening to every port on the interface.
  add(linkedHostIp, apiPort);
  add(linkedHostIp, cortexPort);

  return origins;
};

/**
 * Internal helper to resolve base URLs based on platform and connection state
 */
const resolveBaseUrl = (
  type: "API" | "CORTEX" | "OLLAMA",
  defaultUrl: string,
): string => {
  if (IS_PUBLIC_WEB_TARGET) {
    if (type === "API") return PUBLIC_LUCA_API_URL || CLOUD_API_URL || "";
    if (type === "CORTEX") return CLOUD_CORTEX_URL || "";
    return "";
  }

  // --- TIER 1: LAN (Linked Desktop) ---
  // If we have a linked Desktop LAN IP, prioritize it (Local speed)
  if (linkedHostIp && linkedHostIp !== "127.0.0.1") {
    return `http://${linkedHostIp}:${localPortFor(type)}`;
  }

  // --- TIER 2: LOCAL (Internal Loopback) ---
  // If in Electron, prioritize 127.0.0.1 for local health (Fastest loopback)
  const isElectron = typeof window !== "undefined" && !!(window as any).luca;
  if (isElectron && !linkedHostIp) {
    return `http://127.0.0.1:${localPortFor(type)}`;
  }

  // --- TIER 3: CLOUD FALLBACK (Light Mode) ---
  // If Standalone (no link) and in Browser, use the Cloud Cortex
  const isBrowser = typeof window !== "undefined" && !(window as any).luca;
  if (isBrowser && !linkedHostIp) {
    if (type === "CORTEX" && CLOUD_CORTEX_URL) return CLOUD_CORTEX_URL;
    if (type === "API" && CLOUD_API_URL) return CLOUD_API_URL;
  }

  // 4. Default Fallback
  return defaultUrl;
};

/**
 * Helper function for constructing API URLs
 * @param path - API path (e.g., '/api/whatsapp/chats')
 * @returns Full API URL
 */
export const apiUrl = (path: string): string => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const baseUrl = resolveBaseUrl("API", API_BASE_URL).replace(/\/$/, "");
  if (IS_PUBLIC_WEB_TARGET && !baseUrl) return "";
  return baseUrl ? `${baseUrl}${normalizedPath}` : normalizedPath;
};

/**
 * Helper function for constructed Cortex (Python) URLs
 */
export const cortexUrl = (path: string): string => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const baseUrl = resolveBaseUrl("CORTEX", CORTEX_SERVER_URL).replace(
    /\/$/,
    "",
  );
  if (IS_PUBLIC_WEB_TARGET && !baseUrl) return "";
  return baseUrl ? `${baseUrl}${normalizedPath}` : normalizedPath;
};

/**
 * Helper for Ollama URLs (Local LLM)
 */
export const ollamaUrl = (path: string): string => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const baseUrl = resolveBaseUrl("OLLAMA", OLLAMA_SERVER_URL).replace(
    /\/$/,
    "",
  );
  if (IS_PUBLIC_WEB_TARGET && !baseUrl) return "";
  return baseUrl ? `${baseUrl}${normalizedPath}` : normalizedPath;
};
