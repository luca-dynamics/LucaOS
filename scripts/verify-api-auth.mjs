/**
 * Proves the /api token check answers a bad token with 401 and nothing else.
 *
 * Why this is a script and not a vitest file: `vite.config.ts` aliases `crypto`
 * to `src/mocks/node_polyfills.js`, which does not export `timingSafeEqual`. Under
 * vitest the comparison would fail with `TypeError: not a function` instead of the
 * real `RangeError`, so a passing test would prove nothing about the behaviour
 * being fixed here. Real Node, real express, a real socket.
 *
 * The bug it guards: `SecurityManager.validateToken` passed both buffers straight
 * to `crypto.timingSafeEqual`, which throws `RangeError: Input buffers must have
 * the same byte length` when the lengths differ. Nothing on the `/api` path
 * catches it, and there is no error handler, so express's default handler served
 * its HTML page — stack trace and absolute filesystem paths included — to an
 * unauthenticated caller sending a one-character token. Measured before the fix:
 * a 5-character token returned 500 with STACK+PATH on every `/api` route,
 * including routes that do not exist.
 *
 * HOME is redirected to a temp directory before the dynamic imports below, so the
 * user's ~/.luca is never read or written. Prints statuses and booleans only,
 * never a token.
 *
 *   node scripts/verify-api-auth.mjs
 */

import crypto from "node:crypto";
import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";

/** Shaped like the real thing: randomBytes(32).toString('hex') is 64 characters. */
const TOKEN = crypto.randomBytes(32).toString("hex");

// Both must be set before the imports below: `paths.cjs` reads HOME at module
// load to derive SECURITY_DIR, and `securityManager`'s constructor runs
// `initialize()` on import, which reads LUCA_SECRET and may mkdir that directory.
const home = await fs.mkdtemp(path.join(os.tmpdir(), "luca-auth-verify-"));
process.env.HOME = home;
process.env.LUCA_SECRET = TOKEN;

const { default: express } = await import("express");
const { default: securityManager } = await import(
  "../cortex/server/services/securityManager.js"
);
const { default: authMiddleware } = await import(
  "../cortex/server/middleware/authMiddleware.js"
);

let failures = 0;
const check = (label, ok, detail = "") => {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
};

const app = express();
app.use("/api", authMiddleware);
app.get("/api/protected", (_req, res) => res.json({ reached: true }));
// No error handler on purpose: this reproduces the server's real configuration,
// where an uncaught throw in the middleware falls through to express's default.

const server = await new Promise((resolve) => {
  const s = app.listen(0, "127.0.0.1", () => resolve(s));
});
const { port } = server.address();

const hit = (token) =>
  new Promise((resolve, reject) => {
    const headers = token === null ? {} : { "X-LUCA-TOKEN": token };
    const req = http.request(
      // agent:false, so no keep-alive socket outlives the response and
      // server.close() below returns instead of waiting the agent out.
      { host: "127.0.0.1", port, method: "GET", path: "/api/protected", headers, agent: false },
      (res) => {
        let raw = "";
        res.setEncoding("utf8");
        res.on("data", (c) => (raw += c));
        res.on("end", () => resolve({ status: res.statusCode, raw }));
      },
    );
    req.on("error", reject);
    req.end();
  });

/** Anything that would betray the server's internals to an anonymous caller. */
const leaky = (raw) => /[.]js:\d+|\bat \S+ \(|RangeError|Users|LucaOS/.test(raw);

const flipFirst = (t) => (t[0] === "0" ? "1" : "0") + t.slice(1);

/**
 * The property under test is "returns false", and the bug being fixed made it
 * throw instead — so a throw has to read as a named failure, not take the whole
 * script down with a stack trace.
 */
const rejects = (label, token) => {
  try {
    check(label, securityManager.validateToken(token) === false);
  } catch (error) {
    check(label, false, `threw ${error.code ?? error.name}`);
  }
};

try {
  console.log("the unit, directly:");
  check("the right token validates", securityManager.validateToken(TOKEN) === true);
  rejects("a same-length wrong token does not", flipFirst(TOKEN));
  rejects("a short token returns false rather than throwing", "x");
  rejects("a long token returns false rather than throwing", `${TOKEN}${TOKEN}`);
  rejects("an empty token is false", "");
  rejects("a missing token is false", undefined);
  // 64 multibyte characters are 128 bytes. Comparing `.length` on the strings
  // instead of the buffers would let this one through to timingSafeEqual.
  rejects("byte length is what counts, not character count", "é".repeat(64));
  // Unreachable over HTTP — Node's client rejects the header before it is sent —
  // but reachable in-process, e.g. a secret file read without .trim().
  rejects("a token carrying a newline is false, not a throw", `${TOKEN.slice(0, 60)}\n`);

  console.log("\nover a real socket, through express:");
  const good = await hit(TOKEN);
  check("the right token reaches the route", good.status === 200, `status ${good.status}`);

  const cases = [
    ["no header at all", null, "Authentication Required"],
    ["a same-length wrong token", flipFirst(TOKEN), "Unauthorized"],
    ["one character", "x", "Unauthorized"],
    ["five characters", "short", "Unauthorized"],
    ["double length", `${TOKEN}${TOKEN}`, "Unauthorized"],
    ["a prefix of the real token", TOKEN.slice(0, 32), "Unauthorized"],
    ["the real token plus a byte", `${TOKEN}0`, "Unauthorized"],
    ["64 multibyte characters", "é".repeat(64), "Unauthorized"],
  ];

  for (const [label, token, expectedError] of cases) {
    const r = await hit(token);
    check(`${label} -> 401`, r.status === 401, `status ${r.status}`);
    let body = null;
    try {
      body = JSON.parse(r.raw);
    } catch {
      /* asserted on as raw text below */
    }
    check(`${label} -> "${expectedError}"`, body?.error === expectedError, r.raw.slice(0, 120));
    check(`${label} -> no stack, no path`, !leaky(r.raw), r.raw.slice(0, 160));
  }
} finally {
  await new Promise((resolve) => server.close(resolve));
  await fs.rm(home, { recursive: true, force: true });
  console.log("\n[verify-auth] temp home removed");
}

if (failures > 0) {
  console.error(`\n[verify-auth] ${failures} check(s) FAILED`);
  process.exit(1);
}
console.log("\n[verify-auth] all checks passed");
