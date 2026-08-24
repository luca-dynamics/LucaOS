/**
 * Decides whether a fetch target is a LucaOS-owned service that should receive
 * `X-LUCA-TOKEN`.
 *
 * This is the single question that gates the master token — the same secret on
 * disk at `~/.luca/security/luca_secret.key` — so it lives here as a pure
 * function rather than as a boolean expression buried in `api.ts`'s fetch
 * monkey-patch. The decision is testable, and the reason each clause exists is
 * written down next to it.
 *
 * Trust is granted per exact host:port pair, never per host. LucaOS's own core
 * and Cortex share the loopback interface — and, once paired, a LAN host — with
 * third-party processes: Ollama on 11434 and the host-native GGUF API server.
 * Matching a host alone hands those processes the token.
 */

/** One trusted network location: a host, and the port a LucaOS service binds. */
export interface LucaTrustedOrigin {
  host: string;
  port: string;
}

export interface LucaApiOriginContext {
  /** Configured API origin. `""` in Vite dev, where calls go through the proxy. */
  apiBaseUrl: string;
  /**
   * Every host:port LucaOS owns. Built explicitly by the caller, so adding a
   * service to the token's blast radius is a deliberate act rather than a side
   * effect of a substring match.
   */
  trustedOrigins: readonly LucaTrustedOrigin[];
}

interface ParsedTarget {
  hostname: string;
  port: string;
}

/**
 * Split a URL into the two fields trust is granted on. Returns null for a
 * relative URL, which has no origin of its own and is handled separately.
 */
const parseTarget = (url: string): ParsedTarget | null => {
  try {
    const parsed = new URL(url);
    // `URL.port` is empty when the URL uses its protocol's default port, so
    // restore it — otherwise a service on :80 or :443 could never be matched.
    const defaultPort =
      parsed.protocol === "https:" || parsed.protocol === "wss:"
        ? "443"
        : parsed.protocol === "http:" || parsed.protocol === "ws:"
          ? "80"
          : "";
    return { hostname: parsed.hostname, port: parsed.port || defaultPort };
  } catch {
    return null;
  }
};

const matches = (target: ParsedTarget, trusted: ParsedTarget): boolean =>
  Boolean(trusted.hostname) &&
  Boolean(trusted.port) &&
  target.hostname === trusted.hostname &&
  target.port === trusted.port;

export const isLucaApiUrl = (
  url: string,
  ctx: LucaApiOriginContext,
): boolean => {
  // Vite dev serves the renderer and proxies relative /api calls to the core.
  if (url.startsWith("/api")) return true;

  const target = parseTarget(url);
  if (!target) return false;

  // The app's own configured API origin. Compared field by field: a substring
  // test would let `https://evil.example/?r=127.0.0.1:53342` qualify.
  if (ctx.apiBaseUrl) {
    const configured = parseTarget(ctx.apiBaseUrl);
    if (configured && matches(target, configured)) return true;
  }

  return ctx.trustedOrigins.some((origin) =>
    matches(target, { hostname: origin.host, port: origin.port }),
  );
};
