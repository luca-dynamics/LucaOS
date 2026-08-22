import { describe, expect, it } from "vitest";
import { isLucaApiUrl, type LucaApiOriginContext } from "./lucaApiOrigin";

/**
 * A desktop dev run: the shell allocated 53342 for the core, and `API_BASE_URL`
 * is "" because Vite serves the renderer. This is the situation in which every
 * gated route was answering 401.
 */
const desktop: LucaApiOriginContext = {
  apiBaseUrl: "",
  corePort: "53342",
  linkedHostIp: null,
  allowLoopback: true,
};

describe("Luca API origin", () => {
  it("attaches to the core on its ephemeral port", () => {
    expect(isLucaApiUrl("http://127.0.0.1:53342/api/persona", desktop)).toBe(
      true,
    );
    expect(isLucaApiUrl("http://localhost:53342/api/devices", desktop)).toBe(
      true,
    );
  });

  it("no longer trusts the hardcoded 3002 when the core is elsewhere", () => {
    // The old predicate tested the literal `127.0.0.1:3002`. That is a stale
    // port here, not the core, so it must not qualify.
    expect(isLucaApiUrl("http://127.0.0.1:3002/api/persona", desktop)).toBe(
      false,
    );
  });

  it("never sends the token to other processes on the same loopback", () => {
    // Ollama and the host-native GGUF API server are third parties.
    expect(isLucaApiUrl("http://127.0.0.1:11434/api/tags", desktop)).toBe(false);
    expect(isLucaApiUrl("http://127.0.0.1:8000/vision/health", desktop)).toBe(
      false,
    );
    expect(isLucaApiUrl("http://127.0.0.1:8080/v1/completions", desktop)).toBe(
      false,
    );
  });

  it("does not degrade into matching every loopback port when no port is known", () => {
    // A bare `127.0.0.1:` prefix would match Ollama. Fail closed instead.
    const unknown = { ...desktop, corePort: "" };
    expect(isLucaApiUrl("http://127.0.0.1:11434/api/tags", unknown)).toBe(false);
    expect(isLucaApiUrl("http://127.0.0.1:53342/api/persona", unknown)).toBe(
      false,
    );
  });

  it("keeps the token off loopback entirely on public web targets", () => {
    const web = {
      apiBaseUrl: "https://api.example.com",
      corePort: "53342",
      linkedHostIp: "127.0.0.1",
      allowLoopback: false,
    };
    expect(isLucaApiUrl("http://127.0.0.1:53342/api/persona", web)).toBe(false);
    expect(isLucaApiUrl("https://api.example.com/api/persona", web)).toBe(true);
  });

  it("still matches a configured origin and Vite's relative proxy path", () => {
    expect(isLucaApiUrl("/api/persona", desktop)).toBe(true);
    expect(
      isLucaApiUrl("http://127.0.0.1:3002/api/persona", {
        ...desktop,
        apiBaseUrl: "http://127.0.0.1:3002",
      }),
    ).toBe(true);
  });

  it("still matches a paired desktop over LAN", () => {
    const lan = { ...desktop, linkedHostIp: "192.168.1.24" };
    expect(isLucaApiUrl("http://192.168.1.24:53342/api/persona", lan)).toBe(
      true,
    );
    expect(isLucaApiUrl("http://192.168.1.99:53342/api/persona", lan)).toBe(
      false,
    );
  });
});
