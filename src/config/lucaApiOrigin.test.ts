import { describe, expect, it } from "vitest";
import {
  isLucaApiUrl,
  type LucaApiOriginContext,
  type LucaTrustedOrigin,
} from "./lucaApiOrigin";

const CORE = "53342";
const CORTEX = "51877";

/** The two LucaOS-owned services on one host, as `api.ts` enumerates them. */
const own = (host: string): LucaTrustedOrigin[] => [
  { host, port: CORE },
  { host, port: CORTEX },
];

/**
 * A desktop dev run: the shell allocated ephemeral ports for the core and Cortex,
 * and `API_BASE_URL` is "" because Vite serves the renderer.
 */
const desktop: LucaApiOriginContext = {
  apiBaseUrl: "",
  trustedOrigins: [...own("127.0.0.1"), ...own("localhost")],
};

/** The same run, paired to another desktop over the LAN. */
const paired: LucaApiOriginContext = {
  apiBaseUrl: "",
  trustedOrigins: [
    ...own("127.0.0.1"),
    ...own("localhost"),
    ...own("192.168.1.24"),
  ],
};

describe("Luca API origin", () => {
  it("attaches to LucaOS's own services on their live ports", () => {
    expect(isLucaApiUrl(`http://127.0.0.1:${CORE}/api/persona`, desktop)).toBe(
      true,
    );
    expect(isLucaApiUrl(`http://localhost:${CORE}/api/devices`, desktop)).toBe(
      true,
    );
    // Cortex exempts loopback callers server-side, but it is LucaOS-owned and
    // reads the header, so it is trusted here too.
    expect(isLucaApiUrl(`http://127.0.0.1:${CORTEX}/vision/health`, desktop)).toBe(
      true,
    );
  });

  it("does not trust the stale hardcoded 3002 when the core is elsewhere", () => {
    expect(isLucaApiUrl("http://127.0.0.1:3002/api/persona", desktop)).toBe(
      false,
    );
  });

  it("never sends the token to third parties on the loopback interface", () => {
    // Ollama and the host-native GGUF API server share the interface with us.
    expect(isLucaApiUrl("http://127.0.0.1:11434/api/tags", desktop)).toBe(false);
    expect(isLucaApiUrl("http://localhost:11434/api/tags", desktop)).toBe(false);
    expect(isLucaApiUrl("http://127.0.0.1:8080/v1/completions", desktop)).toBe(
      false,
    );
  });

  it("carries the token to a paired host's core AND Cortex", () => {
    // Cortex's `require_privileged` denies remote callers without it, so a LAN
    // Cortex call that loses the token answers 403 rather than degrading.
    expect(
      isLucaApiUrl(`http://192.168.1.24:${CORE}/api/persona`, paired),
    ).toBe(true);
    expect(
      isLucaApiUrl(`http://192.168.1.24:${CORTEX}/osint/lookup`, paired),
    ).toBe(true);
  });

  it("does not carry the token to third parties on the paired host", () => {
    // The clause this replaces matched the paired host with no port at all, so
    // Ollama on the LAN machine received LucaOS's master token.
    expect(isLucaApiUrl("http://192.168.1.24:11434/api/tags", paired)).toBe(
      false,
    );
    expect(isLucaApiUrl("http://192.168.1.24:8080/v1/models", paired)).toBe(
      false,
    );
  });

  it("does not widen to every loopback port when the paired host is 127.0.0.1", () => {
    // `getConnectionTier` and `resolveBaseUrl` both tolerate this value, and it
    // is what made the old host-only match leak to Ollama.
    const pairedToSelf: LucaApiOriginContext = {
      apiBaseUrl: "",
      trustedOrigins: [...own("127.0.0.1"), ...own("127.0.0.1")],
    };
    expect(isLucaApiUrl(`http://127.0.0.1:${CORE}/api/persona`, pairedToSelf)).toBe(
      true,
    );
    expect(isLucaApiUrl("http://127.0.0.1:11434/api/tags", pairedToSelf)).toBe(
      false,
    );
  });

  it("ignores an unrelated host on the same LAN", () => {
    expect(
      isLucaApiUrl(`http://192.168.1.99:${CORE}/api/persona`, paired),
    ).toBe(false);
  });

  it("matches host and port exactly, not as a substring", () => {
    // A remote origin that merely mentions a trusted host:port must not qualify.
    expect(
      isLucaApiUrl(`https://evil.example/collect?r=127.0.0.1:${CORE}`, desktop),
    ).toBe(false);
    expect(
      isLucaApiUrl(`https://127.0.0.1.evil.example:${CORE}/api/persona`, desktop),
    ).toBe(false);
  });

  it("fails closed when a port is not yet known", () => {
    // An empty port would otherwise match every URL on that host.
    const booting: LucaApiOriginContext = {
      apiBaseUrl: "",
      trustedOrigins: [{ host: "127.0.0.1", port: "" }],
    };
    expect(isLucaApiUrl("http://127.0.0.1:11434/api/tags", booting)).toBe(false);
    expect(isLucaApiUrl(`http://127.0.0.1:${CORE}/api/persona`, booting)).toBe(
      false,
    );
  });

  it("still matches Vite's relative proxy path", () => {
    expect(isLucaApiUrl("/api/persona", desktop)).toBe(true);
  });

  it("trusts the configured API origin, including on its default port", () => {
    const web: LucaApiOriginContext = {
      apiBaseUrl: "https://api.example.com",
      // A public web target trusts nothing on loopback or the LAN.
      trustedOrigins: [],
    };
    expect(isLucaApiUrl("https://api.example.com/api/persona", web)).toBe(true);
    expect(isLucaApiUrl(`http://127.0.0.1:${CORE}/api/persona`, web)).toBe(false);
    expect(isLucaApiUrl("https://other.example.com/api/persona", web)).toBe(
      false,
    );
    // Same host, wrong scheme: :80 is not the :443 we trust.
    expect(isLucaApiUrl("http://api.example.com/api/persona", web)).toBe(false);
  });

  it("trusts an explicitly configured loopback origin", () => {
    const pinned: LucaApiOriginContext = {
      apiBaseUrl: "http://127.0.0.1:3002",
      trustedOrigins: [],
    };
    expect(isLucaApiUrl("http://127.0.0.1:3002/api/persona", pinned)).toBe(true);
    expect(isLucaApiUrl("http://127.0.0.1:11434/api/tags", pinned)).toBe(false);
  });
});
