/**
 * The approval gate on the persistent code sandbox, and the wire that reaches it.
 *
 * `runPythonScript` and `runNodeScript` hand model-authored code to a live local
 * interpreter. For as long as they existed they registered at LEVEL_0 — no
 * approval, ever — because the bulk registrar (toolInitialization.ts) files them
 * under SYSTEM, and SYSTEM deliberately has no CATEGORY_SECURITY_FLOOR entry. The
 * omission was silent, and silence there meant ungated.
 *
 * These assertions are the containment for cortex/server/services/sandboxService.js,
 * which is explicit that it is not a security boundary itself. If the rows below
 * ever disappear, that file becomes remote code execution driven by model output.
 */

// The real fs, past the `node:fs` alias in vite.config.ts — a plain import
// resolves to a browser polyfill whose readFileSync returns '', which would make
// every `toContain` below pass against an empty string.
const { readFileSync } = process.getBuiltinModule("node:fs");

import { describe, expect, it } from "vitest";
import type { FunctionDeclaration } from "@google/generative-ai";

import * as ToolDefinitions from "../tools/definitions";
import {
  MissionScope,
  SecurityLevel,
  TOOL_CONFIGS,
  ToolRegistry,
} from "./toolRegistry";
import { ServerToolDispatcher } from "../tools/handlers/ServerToolDispatcher";

const SCRIPT_TOOLS = ["runPythonScript", "runNodeScript"] as const;

/** The level at which useToolOrchestrator raises its challenge. */
const CHALLENGE_THRESHOLD = SecurityLevel.LEVEL_1;

const fakeTool = (name: string): FunctionDeclaration =>
  ({ name, description: `fake ${name}`, parameters: undefined }) as unknown as FunctionDeclaration;

describe("the script sandbox tools are gated", () => {
  it.each(SCRIPT_TOOLS)("%s carries an explicit LEVEL_2 / SYSTEM row", (name) => {
    const config = TOOL_CONFIGS[name];

    expect(config).toBeDefined();
    expect(config.level).toBe(SecurityLevel.LEVEL_2);
    expect(config.scope).toBe(MissionScope.SYSTEM);
  });

  it.each(SCRIPT_TOOLS)("%s sits at or above the orchestrator's challenge threshold", (name) => {
    // The assertion that actually means "the operator gets asked":
    // useToolOrchestrator challenges at `securityLevel >= LEVEL_1`. Any row that
    // satisfies this is safe; the specific tier is a separate decision above.
    expect(TOOL_CONFIGS[name].level).toBeGreaterThanOrEqual(CHALLENGE_THRESHOLD);
  });

  it.each(SCRIPT_TOOLS)("%s is marked not concurrency-safe", (name) => {
    // One worker process per language serializes execution, so two cells racing
    // into a single namespace is a data race by construction.
    expect(TOOL_CONFIGS[name].isConcurrencySafe).toBe(false);
  });

  it.each(SCRIPT_TOOLS)("%s keeps its level when registered under SYSTEM", (name) => {
    // The live path: the bulk registrar name-infers both into SYSTEM, which has
    // no floor, so `register` resolved `undefined ?? undefined ?? LEVEL_0`. This
    // proves the explicit row — not a category floor — is what raises them.
    ToolRegistry.register(fakeTool(name), "SYSTEM");

    expect(ToolRegistry.getSecurityLevel(name)).toBe(SecurityLevel.LEVEL_2);
    expect(ToolRegistry.getMissionScope(name)).toBe(MissionScope.SYSTEM);
  });

  it("registers an unlisted SYSTEM tool at LEVEL_0, which is why the rows above matter", () => {
    // Not a defect to fix here — flooring SYSTEM would prompt on everything and
    // train the operator to wave prompts through. It is the reason a SYSTEM tool
    // that touches an interpreter must be listed by hand.
    ToolRegistry.register(fakeTool("fakeUnlistedSystemTool"), "SYSTEM");

    expect(ToolRegistry.getSecurityLevel("fakeUnlistedSystemTool")).toBe(SecurityLevel.LEVEL_0);
  });
});

describe("the dispatcher sends the body the routes read", () => {
  const dispatcherSource = readFileSync(
    new URL("../tools/handlers/ServerToolDispatcher.ts", import.meta.url),
    "utf8",
  ) as string;

  it.each(SCRIPT_TOOLS)("%s reaches the dispatcher at all", (name) => {
    // `isServerTool` is the only thing that routes a name to the dispatcher
    // (toolRegistry.ts step 6). `runNodeScript` was declared to the model and
    // registered, but absent from that list, so it fell past step 6 and past
    // dispatchSystemTools to `ERROR: Unknown Tool "runNodeScript"` — it had never
    // executed once, and the body this branch builds for it was dead code.
    expect(ServerToolDispatcher.isServerTool(name)).toBe(true);
  });

  it("sends `script` to both script endpoints", () => {
    // The defect: this branch set only `endpoint`, leaving the default
    // `{ tool: name, args }` body. Both routes read `req.body.script`, so every
    // model-issued call answered 400 and the model saw "HTTP 400: Bad Request".
    expect(dispatcherSource).toContain(
      'name === "runPythonScript" || name === "runNodeScript"',
    );
    expect(dispatcherSource).toContain("script: args.script ?? args.code");
  });

  it("keys the interpreter namespace by session", () => {
    expect(dispatcherSource).toContain("sessionId: sessionTranscript.status().sessionId");
  });

  it("reads the session id rather than resolving it", () => {
    // `sessionTranscript.getCurrentSessionId()` awaits `waitForAuth()`, a flat two
    // seconds outside Electron. This is the tool path, so it reads the published
    // status synchronously instead — the same trap documented in
    // services/session/sessionLease.ts.
    //
    // Matched on the call form rather than the bare name: the name appears in the
    // dispatcher's own comment explaining this, and an assertion that a file must
    // not mention a hazard would fail on the note describing why it avoids it.
    expect(dispatcherSource).not.toContain("sessionTranscript.getCurrentSessionId");
    expect(dispatcherSource).not.toContain("await sessionTranscript");
  });
});

/**
 * `execute_script` is the *gated* executor — a deny-by-default tool proxy capped at
 * LEVEL_1, the opposite of the two raw interpreters above. Its handler and its
 * TOOL_CONFIGS row have both existed for a long time; it had no
 * `FunctionDeclaration`, so it was never registered and never offered, and none of
 * that machinery had ever run.
 *
 * Two things have to hold for it to be callable, and each fails silently on its
 * own: the declaration has to exist and be exported from the barrel the registrar
 * iterates, and the tool has to land in a category that reaches the model.
 */
describe("execute_script is reachable", () => {
  const initializationSource = readFileSync(
    new URL("./toolInitialization.ts", import.meta.url),
    "utf8",
  ) as string;
  const lucaServiceSource = readFileSync(
    new URL("./lucaService.ts", import.meta.url),
    "utf8",
  ) as string;

  /** Found the way the registrar finds it: `Object.values` over the barrel. */
  const declaration = Object.values(ToolDefinitions).find(
    (value): value is FunctionDeclaration =>
      typeof value === "object" &&
      value !== null &&
      (value as FunctionDeclaration).name === "execute_script",
  );

  it("is declared and exported from the definitions barrel", () => {
    // `initializeToolRegistry` bulk-registers `Object.values(ToolDefinitions)`,
    // skipping anything without both a name and a description. A declaration that
    // exists but is not re-exported by definitions/index.ts is invisible here.
    expect(declaration).toBeDefined();
    expect(declaration?.description).toBeTruthy();
  });

  it("describes the two things that make it worth calling", () => {
    // Without `luca.state` in the description the model uses it as a batch runner
    // and re-fetches everything next turn, which is the case the tool exists for.
    expect(declaration?.description).toContain("luca.state");
    expect(declaration?.description).toContain("luca.tools");
  });

  it("takes the arguments the handler actually reads", () => {
    const properties = declaration?.parameters?.properties ?? {};

    expect(Object.keys(properties).sort()).toEqual(["maxToolCalls", "script", "timeoutMs"]);
    expect(declaration?.parameters?.required).toEqual(["script"]);
  });

  it("is whitelisted into CORE, the only category the model is offered", () => {
    // The reachability defect in one line. Left at the bulk registrar's SYSTEM
    // default the tool registers, gates and executes correctly — and is never put
    // in front of the model, because `activeTools` is built from `getCore()`.
    expect(initializationSource).toContain('"execute_script"');
    expect(lucaServiceSource).toContain("ToolRegistry.getCore()");
  });

  it("keeps its LEVEL_1 gate when registered under CORE", () => {
    // CORE has no CATEGORY_SECURITY_FLOOR entry, so this proves the explicit
    // TOOL_CONFIGS row — not the category — is what makes the orchestrator
    // challenge, and that moving the category did not quietly drop it to LEVEL_0.
    ToolRegistry.register(declaration as FunctionDeclaration, "CORE");

    expect(ToolRegistry.getSecurityLevel("execute_script")).toBe(SecurityLevel.LEVEL_1);
    expect(ToolRegistry.getSecurityLevel("execute_script")).toBeGreaterThanOrEqual(
      CHALLENGE_THRESHOLD,
    );
    expect(ToolRegistry.getCore().map((t) => t.name)).toContain("execute_script");
  });

  it("is refused through invokeAnyTool, so the gate cannot be laundered", () => {
    // invokeAnyTool is itself LEVEL_0 and CORE. Routing a LEVEL_1 tool through it
    // would execute with no challenge at all, so the meta-tool re-checks the
    // target's level and refuses. Asserted on the source because the branch is
    // inside `ToolRegistry.execute`, behind the whole dispatch chain.
    const registrySource = readFileSync(
      new URL("./toolRegistry.ts", import.meta.url),
      "utf8",
    ) as string;

    expect(registrySource).toContain("toolEntry.securityLevel >= SecurityLevel.LEVEL_1");
    expect(registrySource).toContain("!context?.isElevated");
  });
});
