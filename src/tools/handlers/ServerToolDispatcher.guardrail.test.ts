import { describe, expect, it } from "vitest";
// Imported with ?raw rather than readFileSync: vite.config.ts aliases both `fs`
// and `node:fs` to a browser polyfill, so readFileSync returns "" under vitest
// and every not.toContain assertion passes vacuously.
import dispatcherSource from "./ServerToolDispatcher.ts?raw";
import constitutionSource from "../../config/constitution.ts?raw";

/**
 * Source-level guard. The dispatcher's guardrail sits inside a very large
 * function with heavy runtime dependencies, so this pins the property that
 * matters — no phrase in the transcript authorizes a protected write — rather
 * than trying to execute the whole dispatch path.
 */
describe("constitutional guardrail authorization channel", () => {
  it("actually loaded the sources it asserts against", () => {
    // Without this, the negative assertions below would pass on an empty
    // string and report safety that was never checked.
    expect(dispatcherSource.length).toBeGreaterThan(1000);
    expect(constitutionSource.length).toBeGreaterThan(100);
    expect(dispatcherSource).toContain("ServerToolDispatcher");
  });

  it("does not treat a phrase in the transcript as authorization", () => {
    // A user turn also carries pasted documents, fetched web pages, file
    // contents and quoted tool output, so any magic string there is
    // attacker-controllable.
    expect(dispatcherSource).not.toContain("ROOT ADMINISTRATIVE MISSION");
    expect(dispatcherSource).not.toContain("hasMissionOverride");
  });

  it("does not advertise a bypass phrase in the system prompt", () => {
    // Publishing the phrase taught both the operator and the model that a
    // sentence could unlock protected writes.
    expect(constitutionSource).not.toContain("ROOT ADMINISTRATIVE MISSION");
  });

  it("still gates protected infrastructure on an operator decision", () => {
    expect(dispatcherSource).toContain(
      "permissionGateService.requestPermission",
    );
    expect(dispatcherSource).toContain("CONSTITUTIONAL VIOLATION");
  });
});
