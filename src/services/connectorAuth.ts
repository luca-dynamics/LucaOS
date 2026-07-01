/**
 * connectorAuth — the single shared implementation for starting a tool-app
 * connection (OAuth / LucaLink).
 *
 * Extracted from SettingsConnectorsTab so Settings and onboarding trigger the
 * exact same real flow instead of duplicating it:
 *   - OAuth-URL connectors (Google, X/Twitter) fetch their provider auth URL
 *     and open it via the in-app browser (`luca:open-browser`).
 *   - LucaLink connectors (WhatsApp, Telegram, …) dispatch their pairing event.
 *
 * This performs the real side effect (network + window events) and must only be
 * called in response to a user action, never from observed/registry content.
 * It needs a backend / desktop host to be reachable; callers that can't
 * guarantee one (e.g. browser-safe onboarding) should gate on availability and
 * fall back to recording intent.
 */

import { apiUrl } from "../config/api";

export interface ConnectorAuthTarget {
  /** Matches a settings.connectors key. */
  id: string;
  name?: string;
  /** LucaLink pairing event (e.g. WHATSAPP_LUCA_LINK); null/absent for OAuth. */
  event?: string | null;
}

export interface StartConnectorAuthOptions {
  onError?: (message: string) => void;
}

/** Connectors whose connect flow is a provider OAuth URL opened in-app. */
const OAUTH_URL_CONNECTORS: Record<string, { path: string; title: string }> = {
  google: { path: "/api/google/auth/url", title: "Google Workspace Auth" },
  twitter: { path: "/api/twitter/auth/url", title: "X (Twitter) Auth" },
};

async function startOAuthUrl(
  id: string,
  title: string,
  opts: StartConnectorAuthOptions,
): Promise<void> {
  try {
    const res = await fetch(apiUrl(OAUTH_URL_CONNECTORS[id].path));
    const data = await res.json();
    if (data?.url) {
      window.dispatchEvent(
        new CustomEvent("luca:open-browser", {
          detail: { url: data.url, title, sessionId: `${id}_auth_${Date.now()}` },
        }),
      );
    } else {
      opts.onError?.(`Couldn't start ${title}.`);
    }
  } catch {
    opts.onError?.(`Failed to start ${title}.`);
  }
}

/**
 * Start a connector's real connection flow. Mirrors the SettingsConnectorsTab
 * connect button: Google → OAuth URL; any connector with a LucaLink `event` →
 * dispatch that event; otherwise a known OAuth-URL connector (X/Twitter).
 */
export async function startConnectorAuth(
  connector: ConnectorAuthTarget,
  opts: StartConnectorAuthOptions = {},
): Promise<void> {
  if (connector.id === "google") {
    return startOAuthUrl("google", OAUTH_URL_CONNECTORS.google.title, opts);
  }
  if (connector.event) {
    window.dispatchEvent(new CustomEvent(connector.event));
    return;
  }
  if (OAUTH_URL_CONNECTORS[connector.id]) {
    return startOAuthUrl(
      connector.id,
      OAUTH_URL_CONNECTORS[connector.id].title,
      opts,
    );
  }
  opts.onError?.(
    `No connect flow is available for ${connector.name ?? connector.id} yet.`,
  );
}
