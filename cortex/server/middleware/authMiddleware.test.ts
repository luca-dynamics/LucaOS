/**
 * `authMiddleware` decides whether every request under `/api` is authenticated, and
 * until now it had no tests at all.
 *
 * These drive it through **real express over a real socket**, mounted exactly the
 * way `server.js` mounts it (`app.use('/api', authMiddleware)`), because the bug
 * this file was written for lived precisely in that seam: express rewrites
 * `req.path` to be relative to the mount, so the middleware sees '/vision/status'
 * rather than '/api/vision/status', and the old matcher's `req.path.endsWith(p)`
 * therefore treated it — and 24 sibling routes — as public. Calling the handler with
 * a hand-made `req` would have assumed the very thing that was wrong.
 *
 * Only `securityManager` is mocked: it is the one dependency that reads a secret
 * from the user's home directory. Source is read with
 * `process.getBuiltinModule('node:fs')` because `vite.config.ts` aliases `fs` to a
 * browser polyfill, and a plain import there returns `''` — which would make the
 * regression assertion pass vacuously.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import express from "express";

const { readFileSync } = process.getBuiltinModule("node:fs");
const http = process.getBuiltinModule("node:http");

const VALID_TOKEN = "valid-token-fixture";

const security = vi.hoisted(() => ({
  validateToken: vi.fn((t: string) => t === "valid-token-fixture"),
}));

vi.mock("../services/securityManager.js", () => ({
  default: security,
  securityManager: security,
}));

const { authMiddleware, PUBLIC_PATHS } = await import("./authMiddleware.js");

/**
 * Paths mirroring the real route graph — every `COLLIDES` entry ends in '/status' and
 * names a route that really is registered under `/api` (checked against `server.js`'s
 * `ROUTE_GROUPS` mounts, which is why the system ones carry their '/api/system'
 * prefix rather than the bare '/cortex/status' the router file spells).
 *
 * Six of them — vision, audio, forex, build, system-status and goals/scheduler — were
 * additionally probed against a running core with HEAD's matcher in place and each
 * answered **200 with no token at all**. The rest are the same shape by the same
 * mechanism; they are listed because they are real, not because each was curled.
 */
const PUBLIC = ["/api/health", "/api/status", "/api/handshake"];
const COLLIDES = [
  "/api/vision/status",
  "/api/audio/status",
  "/api/forex/status",
  "/api/hacking/status",
  "/api/build/status",
  "/api/system-status/status",
  "/api/goals/scheduler/status",
  "/api/system/cortex/status",
  "/api/system/social/status",
  "/api/iot/relay/status",
  "/api/backtest/abc123/status",
];
const PROTECTED = [
  "/api/credentials/store",
  "/api/credentials/retrieve",
  "/api/vision/analyze",
  "/api/statusboard",
  "/api/healthz",
  "/api/health/",
  "/api/HEALTH",
  // A near-miss the old matcher got right: '/mobile/await-handshake' ends in
  // 'handshake' but not in '/handshake', so it was 401 before this change as well.
  // Kept as a case because the distinction is one character wide.
  "/api/mobile/await-handshake",
];

interface Reply {
  status: number;
  body: any;
}

let port = 0;
let server: any;
/** What `req.path` looks like to a middleware mounted at '/api', as express hands it over. */
let seenPath = "";

const request = (path: string, headers: Record<string, string> = {}): Promise<Reply> =>
  new Promise((resolve, reject) => {
    const req = http.request(
      { host: "127.0.0.1", port, method: "GET", path, headers },
      (res: any) => {
        let raw = "";
        res.setEncoding("utf8");
        res.on("data", (c: string) => {
          raw += c;
        });
        res.on("end", () => {
          let parsed: unknown = undefined;
          try {
            parsed = JSON.parse(raw);
          } catch {
            /* asserted on status alone */
          }
          resolve({ status: res.statusCode, body: parsed });
        });
      },
    );
    req.on("error", reject);
    req.end();
  });

beforeAll(async () => {
  const app = express();
  // A probe at the same mount point as authMiddleware, so it observes exactly the
  // `req.path` authMiddleware observes.
  app.use("/api", (req: any, _res: any, next: any) => {
    seenPath = req.path;
    next();
  });
  app.use("/api", authMiddleware);
  for (const p of [...PUBLIC, ...COLLIDES, ...PROTECTED, "/api/health"]) {
    app.get(p, (_req: any, res: any) => res.json({ reached: true }));
  }
  await new Promise<void>((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });
  port = server.address().port;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

beforeEach(() => {
  vi.clearAllMocks();
  security.validateToken.mockImplementation((t: string) => t === VALID_TOKEN);
});

describe("authMiddleware: what express actually hands it", () => {
  it("sees a path relative to its mount, which is why the suffix matcher was wrong", async () => {
    await request("/api/vision/status");
    // Not '/api/vision/status'. The old matcher asked whether this ended in
    // '/status' -- it does -- and served it to an anonymous caller.
    expect(seenPath).toBe("/vision/status");
  });

  it("sees the mount-relative form for the public paths too", async () => {
    await request("/api/health");
    expect(seenPath).toBe("/health");
  });
});

describe("authMiddleware: the public list", () => {
  it.each(PUBLIC)("serves %s with no token", async (path) => {
    const res = await request(path);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ reached: true });
    expect(security.validateToken).not.toHaveBeenCalled();
  });

  it("lists both the mounted and unmounted spelling of each public path", () => {
    expect([...PUBLIC_PATHS].sort()).toEqual(
      [
        "/api/handshake",
        "/api/health",
        "/api/status",
        "/handshake",
        "/health",
        "/status",
      ].sort(),
    );
  });
});

describe("authMiddleware: the paths the suffix matcher gave away", () => {
  it.each(COLLIDES)("refuses %s without a token", async (path) => {
    const res = await request(path);
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ error: "Authentication Required" });
    expect(res.body).not.toMatchObject({ reached: true });
  });

  it.each(COLLIDES)("serves %s once a valid token is presented", async (path) => {
    const res = await request(path, { "X-LUCA-TOKEN": VALID_TOKEN });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ reached: true });
  });
});

describe("authMiddleware: everything else stays closed", () => {
  it.each(PROTECTED)("refuses %s without a token", async (path) => {
    const res = await request(path);
    expect(res.status).toBe(401);
  });

  it("refuses a path that merely contains a public path", async () => {
    // Near-misses in the other direction: a `startsWith`/`includes` matcher would
    // hand these over, and '/mobile/await-handshake' is a suffix near-miss the old
    // matcher happened to get right because 'await-handshake' has no slash before
    // 'handshake'. Exact matching refuses all three without needing the distinction.
    expect((await request("/api/statusboard")).status).toBe(401);
    expect((await request("/api/healthz")).status).toBe(401);
    expect((await request("/api/mobile/await-handshake")).status).toBe(401);
  });

  it("treats a trailing slash as a different path, so '/api/health/' needs a token", async () => {
    // Express routes '/api/health/' to the '/api/health' handler, but the middleware
    // matches the literal path and '/health/' is not in the list. Documented rather
    // than normalised: widening the public list is the direction that costs
    // security, and no caller in this repo asks for a trailing slash.
    expect((await request("/api/health/")).status).toBe(401);
  });

  it("is case-sensitive, so '/api/HEALTH' needs a token", async () => {
    expect((await request("/api/HEALTH")).status).toBe(401);
  });
});

describe("authMiddleware: token handling", () => {
  it("names the missing header rather than guessing at the cause", async () => {
    const res = await request("/api/vision/analyze");
    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      error: "Authentication Required",
      message: "Missing X-LUCA-TOKEN header.",
    });
    expect(security.validateToken).not.toHaveBeenCalled();
  });

  it("answers 401 for a token the security manager rejects", async () => {
    const res = await request("/api/vision/analyze", { "X-LUCA-TOKEN": "wrong" });
    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      error: "Unauthorized",
      message: "Invalid security token.",
    });
    expect(security.validateToken).toHaveBeenCalledWith("wrong");
  });

  it("reads the header case-insensitively, as node lowercases it", async () => {
    const res = await request("/api/vision/analyze", { "x-luca-token": VALID_TOKEN });
    expect(res.status).toBe(200);
  });

  it("fails closed when validateToken answers falsely for any reason", async () => {
    // A token of the wrong *length* used to reach express's default error handler as
    // a RangeError from timingSafeEqual. Whatever the reason, a non-true answer is a
    // refusal and never a pass-through.
    security.validateToken.mockReturnValue(false);
    expect((await request("/api/vision/analyze", { "X-LUCA-TOKEN": "x" })).status).toBe(401);
  });
});

describe("authMiddleware: the hole cannot come back", () => {
  const source: string = readFileSync(
    new URL("./authMiddleware.js", import.meta.url),
    "utf8",
  );
  /**
   * Comments stripped, because the docblock deliberately *names* the old matcher in
   * order to explain it. The assertion is about what the file does, not what it says.
   */
  const code = source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  it("read its own source (a vacuous pass here would hide the assertions below)", () => {
    expect(source.length).toBeGreaterThan(500);
    expect(code).toContain("PUBLIC_PATHS");
  });

  it("decides by exact membership", () => {
    expect(code).toContain("PUBLIC_PATHS.has(req.path)");
  });

  it("decides nothing by suffix, prefix or substring", () => {
    // `endsWith` is the whole bug. If it returns to this file, every route whose
    // name happens to end in '/status' becomes anonymous again.
    expect(code).not.toContain("endsWith");
    expect(code).not.toContain("startsWith");
    expect(code).not.toContain("includes(");
    expect(code).not.toMatch(/\.some\(/);
  });

  it("still explains the bug it fixed, so the next reader does not reintroduce it", () => {
    expect(source).toContain("endsWith");
    expect(source).toContain("/api/vision/status");
  });
});

