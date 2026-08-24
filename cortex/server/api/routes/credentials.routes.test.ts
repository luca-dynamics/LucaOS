/**
 * The credential bridge's server half.
 *
 * These run the real express router over a real localhost socket rather than
 * calling handlers directly, because the things most likely to break here are
 * express-level: whether a `DELETE` body is parsed at all, what status a caller
 * actually sees, and whether a response is shaped the way `credentialVault.ts`
 * unpacks it. Only the vault itself is mocked — it is the one dependency that
 * would otherwise write encrypted files into the user's home directory.
 *
 * `express` and `node:http` are both reachable here: `vite.config.ts` aliases
 * `fs`/`path`/`crypto`/`stream`/... to a browser polyfill, but not `node:http`,
 * and vitest externalizes `express` so its own requires resolve natively. Files
 * are still read through `process.getBuiltinModule('node:fs')` — a plain `fs`
 * import returns `''` under that alias and makes every `not.toContain` pass
 * vacuously.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import express from "express";

const { readFileSync } = process.getBuiltinModule("node:fs");

/** A secret distinctive enough that finding it anywhere is proof of a leak. */
const SECRET = "sk-live-CANARY-must-never-appear-in-a-listing";

const vault = vi.hoisted(() => {
  const state = new Map<string, unknown>();
  /** Flip to make the next vault call throw, to test the fail-closed paths. */
  const fail = { store: false, retrieve: false, list: false };
  const boom = (code: string) =>
    Object.assign(
      new Error(`EACCES: permission denied, open 'C:\\Users\\HP\\.luca\\security\\x.enc'`),
      { code },
    );
  return {
    state,
    fail,
    store: vi.fn(async (key: string, data: unknown) => {
      if (fail.store) throw boom("EACCES");
      state.set(key, data);
      return true;
    }),
    retrieve: vi.fn(async (key: string) => {
      if (fail.retrieve) throw boom("EACCES");
      return state.has(key) ? state.get(key) : null;
    }),
    delete: vi.fn(async (key: string) => {
      state.delete(key);
      return true;
    }),
    list: vi.fn(async () => {
      if (fail.list) throw boom("ENOTDIR");
      return [...state.keys()];
    }),
  };
});

vi.mock("../../services/secureVault.js", () => ({ default: vault, SecureVault: class {} }));

const credentialsRouter = (await import("./credentials.routes.js")).default;

// --- a real server, driven over a real socket ---------------------------------

const http = process.getBuiltinModule("node:http");

interface Reply {
  status: number;
  cacheControl: string | undefined;
  body: any;
  raw: string;
}

let port = 0;
let server: any;

const request = (method: string, path: string, body?: unknown): Promise<Reply> =>
  new Promise((resolve, reject) => {
    const payload = body === undefined ? null : JSON.stringify(body);
    const req = http.request(
      {
        host: "127.0.0.1",
        port,
        method,
        path: `/api/credentials${path}`,
        headers: payload
          ? {
              "Content-Type": "application/json",
              "Content-Length": Buffer.byteLength(payload),
            }
          : {},
      },
      (res: any) => {
        let raw = "";
        res.setEncoding("utf8");
        res.on("data", (chunk: string) => {
          raw += chunk;
        });
        res.on("end", () => {
          let parsed: unknown = undefined;
          try {
            parsed = JSON.parse(raw);
          } catch {
            /* non-JSON bodies are asserted on `raw` */
          }
          resolve({
            status: res.statusCode,
            cacheControl: res.headers["cache-control"],
            body: parsed,
            raw,
          });
        });
      },
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });

beforeAll(async () => {
  const app = express();
  // Mirrors server.js: express.json() is mounted app-wide, ahead of the routers,
  // which is what makes a DELETE body readable.
  app.use(express.json({ limit: "50mb" }));
  app.use("/api/credentials", credentialsRouter);
  await new Promise<void>((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });
  port = server.address().port;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

beforeEach(() => {
  vault.state.clear();
  vault.fail.store = false;
  vault.fail.retrieve = false;
  vault.fail.list = false;
  vi.clearAllMocks();
});

// --- store -------------------------------------------------------------------

describe("POST /store", () => {
  it("stores the value where credentialResolver looks for it", async () => {
    const reply = await request("POST", "/store", {
      site: "setting:brain:openaiApiKey",
      username: "openaiApiKey",
      password: SECRET,
    });

    expect(reply.status).toBe(200);
    expect(reply.body.success).toBe(true);

    // credentialResolver reads `secured.password || secured.apiKey || secured.value`
    // off whatever the vault returns, so `password` is the field that matters.
    const [key, data] = vault.store.mock.calls[0];
    expect(key).toBe("setting:brain:openaiApiKey");
    expect((data as any).password).toBe(SECRET);
    expect((data as any).username).toBe("openaiApiKey");
  });

  it("accepts a colon-bearing settings key verbatim, leaving encoding to the vault", async () => {
    await request("POST", "/store", {
      site: "setting:brain:geminiApiKey",
      username: "geminiApiKey",
      password: SECRET,
    });
    // The route must not sanitize the key: retrieve() derives the same filename
    // from the same logical key, so mangling it here would break the round-trip.
    expect(vault.store.mock.calls[0][0]).toBe("setting:brain:geminiApiKey");
  });

  it("defaults username and metadata rather than storing undefined", async () => {
    // preload.cjs forwards only (site, username, password) — `metadata` is
    // destructured in main.cjs but never actually sent.
    await request("POST", "/store", { site: "a-site", password: SECRET });
    const data = vault.store.mock.calls[0][1] as any;
    expect(data.username).toBe("");
    expect(data.metadata).toEqual({});
    expect(typeof data.updatedAt).toBe("number");
  });

  it("rejects a missing or blank site without touching the vault", async () => {
    for (const body of [{}, { site: "   ", password: SECRET }, { site: 42, password: SECRET }]) {
      const reply = await request("POST", "/store", body);
      expect(reply.status).toBe(400);
      expect(reply.body.success).toBe(false);
    }
    expect(vault.store).not.toHaveBeenCalled();
  });

  it("rejects an empty value, because an empty secret is a caller bug", async () => {
    const reply = await request("POST", "/store", { site: "a-site", password: "" });
    expect(reply.status).toBe(400);
    expect(reply.body.success).toBe(false);
    expect(vault.store).not.toHaveBeenCalled();
  });

  it("rejects an over-long key and an over-long value", async () => {
    const longSite = await request("POST", "/store", {
      site: "s".repeat(201),
      password: SECRET,
    });
    expect(longSite.status).toBe(400);

    const longSecret = await request("POST", "/store", {
      site: "a-site",
      password: "x".repeat(8193),
    });
    expect(longSecret.status).toBe(413);

    expect(vault.store).not.toHaveBeenCalled();
  });

  it("fails closed on a vault error, leaking no path and no stack", async () => {
    vault.fail.store = true;
    const reply = await request("POST", "/store", { site: "a-site", password: SECRET });

    expect(reply.status).toBe(500);
    expect(reply.body.success).toBe(false);
    expect(reply.body.error).toBe("Vault write failed");
    // The mocked error message is full of exactly what must not escape.
    expect(reply.raw).not.toContain("EACCES");
    expect(reply.raw).not.toContain(".luca");
    expect(reply.raw).not.toContain("at ");
  });
});

// --- retrieve ----------------------------------------------------------------

describe("GET /retrieve", () => {
  it("returns the record in the shape credentialVault.retrieve unpacks", async () => {
    await request("POST", "/store", {
      site: "github",
      username: "octocat",
      password: SECRET,
      metadata: { scope: "repo" },
    });

    const reply = await request("GET", "/retrieve?site=github");
    expect(reply.status).toBe(200);
    expect(reply.body).toMatchObject({
      success: true,
      site: "github",
      username: "octocat",
      password: SECRET,
      metadata: { scope: "repo" },
    });
  });

  it("percent-decodes the query, so a colon-bearing key survives the URL", async () => {
    await request("POST", "/store", { site: "setting:brain:xaiApiKey", password: SECRET });
    const reply = await request(
      "GET",
      `/retrieve?site=${encodeURIComponent("setting:brain:xaiApiKey")}`,
    );
    expect(reply.body.password).toBe(SECRET);
  });

  it("reports an absent key as absent, not as a server error", async () => {
    const reply = await request("GET", "/retrieve?site=never-stored");
    expect(reply.status).toBe(200);
    expect(reply.body.success).toBe(false);
    expect(reply.body.error).toBe("Not found");
  });

  it("unwraps an entry that an older caller stored as a bare string", async () => {
    vault.state.set("legacy", SECRET);
    const reply = await request("GET", "/retrieve?site=legacy");
    expect(reply.body.success).toBe(true);
    expect(reply.body.password).toBe(SECRET);
  });

  it("reads apiKey and value as fallbacks for password", async () => {
    vault.state.set("k1", { apiKey: SECRET });
    vault.state.set("k2", { value: SECRET });
    expect((await request("GET", "/retrieve?site=k1")).body.password).toBe(SECRET);
    expect((await request("GET", "/retrieve?site=k2")).body.password).toBe(SECRET);
  });

  it("requires a site and fails closed on a vault error", async () => {
    expect((await request("GET", "/retrieve")).status).toBe(400);

    vault.fail.retrieve = true;
    const reply = await request("GET", "/retrieve?site=github");
    expect(reply.status).toBe(500);
    expect(reply.body.error).toBe("Vault read failed");
    expect(reply.raw).not.toContain(".luca");
  });

  it("marks secret-bearing responses no-store", async () => {
    await request("POST", "/store", { site: "github", password: SECRET });
    expect((await request("GET", "/retrieve?site=github")).cacheControl).toBe("no-store");
  });
});

// --- list --------------------------------------------------------------------

describe("GET /list", () => {
  it("returns key names in the declared SecureVaultListEntry shape", async () => {
    await request("POST", "/store", { site: "wallet_eth", password: SECRET });
    await request("POST", "/store", { site: "github", password: SECRET });

    const reply = await request("GET", "/list");
    expect(reply.status).toBe(200);
    // cryptoService.listWallets() filters on `.site`, and SecureVaultListEntry
    // declares it required — a bare string array would break both.
    expect(reply.body).toEqual([{ site: "wallet_eth" }, { site: "github" }]);
  });

  it("never puts a value in the listing", async () => {
    await request("POST", "/store", { site: "github", username: "octocat", password: SECRET });
    const reply = await request("GET", "/list");
    expect(reply.raw).not.toContain(SECRET);
    expect(reply.raw).not.toContain("octocat");
    expect(vault.retrieve).not.toHaveBeenCalled();
  });

  it("returns an array even when the vault directory is unreadable", async () => {
    vault.fail.list = true;
    const reply = await request("GET", "/list");
    expect(Array.isArray(reply.body)).toBe(true);
    expect(reply.body).toEqual([]);
  });
});

// --- delete ------------------------------------------------------------------

describe("DELETE /delete", () => {
  it("reads the site from the request body and removes only that key", async () => {
    await request("POST", "/store", { site: "keep-me", password: SECRET });
    await request("POST", "/store", { site: "drop-me", password: SECRET });

    const reply = await request("DELETE", "/delete", { site: "drop-me" });
    expect(reply.status).toBe(200);
    expect(reply.body.success).toBe(true);

    expect(vault.state.has("drop-me")).toBe(false);
    expect(vault.state.has("keep-me")).toBe(true);
  });

  it("requires a site", async () => {
    const reply = await request("DELETE", "/delete", {});
    expect(reply.status).toBe(400);
    expect(reply.body.success).toBe(false);
    expect(vault.delete).not.toHaveBeenCalled();
  });
});

// --- has ---------------------------------------------------------------------

describe("GET /has", () => {
  it("answers with a bare boolean", async () => {
    await request("POST", "/store", { site: "github", password: SECRET });
    // credentialVault.hasCredentials returns this value directly to callers that
    // use it as a boolean, so an object here would read as always-truthy.
    expect((await request("GET", "/has?site=github")).body).toBe(true);
    expect((await request("GET", "/has?site=absent")).body).toBe(false);
  });

  it("answers false — never true — when the vault cannot be read", async () => {
    await request("POST", "/store", { site: "github", password: SECRET });
    vault.fail.retrieve = true;
    const reply = await request("GET", "/has?site=github");
    expect(reply.status).toBe(200);
    expect(reply.body).toBe(false);
  });

  it("answers false for a missing site rather than erroring", async () => {
    expect((await request("GET", "/has")).body).toBe(false);
  });

  it("does not echo the value it checked for", async () => {
    await request("POST", "/store", { site: "github", password: SECRET });
    expect((await request("GET", "/has?site=github")).raw).not.toContain(SECRET);
  });
});

// --- source guards -----------------------------------------------------------

describe("credentials.routes source", () => {
  // Annotated, because `readFileSync` arrives through `process.getBuiltinModule`
  // and is untyped here — without this the assertions below run against `any`.
  const routeSource: string = readFileSync(
    new URL("./credentials.routes.js", import.meta.url),
    "utf8",
  );
  const authSource: string = readFileSync(
    new URL("../../middleware/authMiddleware.js", import.meta.url),
    "utf8",
  );

  /** The paths this router registers, as express sees them. */
  const registeredPaths = [
    ...routeSource.matchAll(/router\.(get|post|put|patch|delete)\(\s*'([^']+)'/g),
  ].map((m) => m[2]);

  /**
   * authMiddleware's own public list, read from its source rather than copied.
   * If someone adds a path there, this test starts checking it immediately.
   */
  const publicPaths = [
    ...(authSource.match(/const PUBLIC_PATHS = new Set\(\[([\s\S]*?)\]\)/)?.[1] ?? "")
      .matchAll(/'([^']+)'/g),
  ].map((m) => m[1]);

  it("read both files (a vacuous pass here would hide everything below)", () => {
    expect(registeredPaths).toHaveLength(5);
    expect(publicPaths.length).toBeGreaterThanOrEqual(6);
    expect(publicPaths).toContain("/status");
  });

  it("registers no path that authMiddleware treats as public", () => {
    // authMiddleware matches its public list exactly, so this is the check that
    // corresponds to how it actually decides.
    for (const p of registeredPaths) {
      for (const mounted of [`/api/credentials${p}`, p]) {
        expect(
          publicPaths.includes(mounted),
          `${mounted} is in authMiddleware's public list`,
        ).toBe(false);
      }
    }
  });

  it("registers no path that would be public under a suffix matcher either", () => {
    // Defence in depth rather than a live hazard. authMiddleware matched with
    // `req.path.endsWith(p)` until the matcher was tightened, which made every route
    // ending in '/status', '/health' or '/handshake' anonymous -- 27 registrations
    // exist, two of them intentionally public, so 25 routes across the graph. These
    // five hand out credentials, so they stay clear of those suffixes whatever the
    // matcher goes back to doing.
    for (const p of registeredPaths) {
      const mounted = `/api/credentials${p}`;
      for (const suffix of publicPaths) {
        expect(
          mounted.endsWith(suffix),
          `${mounted} would be public if authMiddleware matched '${suffix}' by suffix`,
        ).toBe(false);
      }
    }
  });

  it("logs no request body, no value, and no error detail", () => {
    const logLines = routeSource
      .split("\n")
      .filter((line) => line.includes("console."));

    expect(logLines.length).toBeGreaterThan(0);
    for (const line of logLines) {
      // A logged body, query or stringified payload puts a plaintext secret in
      // a file on disk; a logged error message puts a vault path there.
      expect(line).not.toMatch(/password|req\.body|req\.query|JSON\.stringify/);
      expect(line).not.toMatch(/error\.message|error\.stack|,\s*error\s*\)/);
    }
  });

  it("has no in-memory or plaintext fallback for the vault", () => {
    // Comments stripped first: this is a claim about code, and the header comment
    // legitimately names `localStorage` while explaining the bug being fixed.
    const code = routeSource
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");

    // Guard against the stripping eating the file and passing vacuously.
    expect(code).toContain("vault.store(");
    expect(code).not.toMatch(/new Map\(|localStorage|process\.env/);
  });
});
