/**
 * API Configuration
 * Centralizes all backend API URLs for easy environment management
 */

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

// Use relative paths in Vite browser development to leverage Vite's local proxy
// This prevents cross-origin network drop errors (ERR_NETWORK_CHANGED) during polling
export const API_BASE_URL =
  typeof window !== "undefined" && import.meta.env?.DEV
    ? ""
    : getEnvVar("VITE_API_URL", "http://127.0.0.1:3002");
export const WS_PORT = getEnvVar("VITE_WS_PORT", "3003");
// Use Node.js backend as a gateway to Cortex to handle dynamic ports
export const CORTEX_URL = getEnvVar(
  "VITE_CORTEX_URL",
  `${API_BASE_URL}/vision`,
);
export const AUTH_DOMAIN = getEnvVar(
  "VITE_AUTH_DOMAIN",
  "http://127.0.0.1:3001",
);
export const FRONTEND_PORT = getEnvVar("VITE_FRONTEND_PORT", "3000");
// Cloud Relay Server for Mobile Connectivity (Deployment URL)
export const RELAY_SERVER_URL = getEnvVar("VITE_RELAY_SERVER_URL", "");

// NEW: Cloud Cortex Fallback (For unlinked Web users)
// This is the "Light" mode brain hosted on GCP/Docker
export const CLOUD_CORTEX_URL = getEnvVar("VITE_CLOUD_CORTEX_URL", "");
export const CLOUD_API_URL = getEnvVar("VITE_CLOUD_API_URL", "");

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

    // Determine if this is a Luca API call
    const url =
      typeof resource === "string"
        ? resource
        : resource instanceof URL
          ? resource.href
          : resource.url;
    const isLucaCall =
      (API_BASE_URL !== "" && url.includes(API_BASE_URL)) ||
      url.startsWith("/api") || // Safely captures relative proxy calls
      url.includes("127.0.0.1:3002") ||
      (linkedHostIp && url.includes(linkedHostIp));

    if (isLucaCall && lucaSecretToken) {
      config = config || {};
      config.headers = {
        ...(config.headers || {}),
        "X-LUCA-TOKEN": lucaSecretToken,
      };
    }

    // 2. Suppress console noise for polling endpoints ONLY in confirmed Cloud mode 
    // to avoid red errors when the local backend isn't expected to be there.
    if ((url.includes("/api/luca-link/status") || url.includes("/api/status")) && 
        typeof window !== "undefined" && window.sessionStorage?.getItem("LUCA_CLOUD_ONLY") === "true") {
      return new Response(null, {
        status: 404,
        statusText: "Not Found (Suppressed in Cloud Mode)",
      });
    }

    return originalFetch(resource, config);
  };
}

// Local Python Brain (Cortex)
export const CORTEX_SERVER_URL = getEnvVar(
  "VITE_CORTEX_SERVER_URL",
  "http://127.0.0.1:8000",
);

// External Local LLM Provider (Ollama)
export const OLLAMA_SERVER_URL = getEnvVar(
  "VITE_OLLAMA_SERVER_URL",
  "http://127.0.0.1:11434",
);

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
 * Internal helper to resolve base URLs based on platform and connection state
 */
const resolveBaseUrl = (
  type: "API" | "CORTEX" | "OLLAMA",
  defaultUrl: string,
): string => {
  // --- TIER 1: LAN (Linked Desktop) ---
  // If we have a linked Desktop LAN IP, prioritize it (Local speed)
  if (linkedHostIp && linkedHostIp !== "127.0.0.1") {
    const port = type === "API" ? "3002" : type === "CORTEX" ? "8000" : "11434";
    return `http://${linkedHostIp}:${port}`;
  }

  // --- TIER 2: LOCAL (Internal Loopback) ---
  // If in Electron, prioritize 127.0.0.1 for local health (Fastest loopback)
  const isElectron = typeof window !== "undefined" && !!(window as any).luca;
  if (isElectron && !linkedHostIp) {
    const port = type === "API" ? "3002" : type === "CORTEX" ? "8000" : "11434";
    return `http://127.0.0.1:${port}`;
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
  return `${baseUrl}${normalizedPath}`;
};

/**
 * Helper function for constructed Cortex (Python) URLs
 */
export const cortexUrl = (path: string): string => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const baseUrl = resolveBaseUrl("CORTEX", CORTEX_SERVER_URL).replace(/\/$/, "");
  return `${baseUrl}${normalizedPath}`;
};

/**
 * Helper for Ollama URLs (Local LLM)
 */
export const ollamaUrl = (path: string): string => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const baseUrl = resolveBaseUrl("OLLAMA", OLLAMA_SERVER_URL).replace(/\/$/, "");
  return `${baseUrl}${normalizedPath}`;
};
