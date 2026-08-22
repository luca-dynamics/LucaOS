import { describe, expect, it } from "vitest";
import { isDelegatableCommand } from "./useLucaLinkDelegation";

// A command from another device reaches ToolRegistry.execute, which applies no
// security-level check of its own. These assert the delegation policy that now
// guards that path: LEVEL_0 only, deny-by-default, escalation tools blocked.
//
// Tool names below are the app's real TOOL_CONFIGS entries so the test tracks
// the actual security map rather than a fixture.
describe("isDelegatableCommand (LucaLink delegation authorization)", () => {
  it("blocks the script executor and the meta-tool laundering path", () => {
    expect(isDelegatableCommand("execute_script")).toBe(false);
    expect(isDelegatableCommand("invokeAnyTool")).toBe(false);
  });

  it("blocks the persistent code sandbox from both languages", () => {
    // These were denied by the `!config` branch while they had no TOOL_CONFIGS
    // row at all; now they are denied by level (LEVEL_2). Asserted because the
    // route to a live local interpreter is the last thing that should open to a
    // remote device, and a future LEVEL_0 row would do exactly that silently.
    expect(isDelegatableCommand("runPythonScript")).toBe(false);
    expect(isDelegatableCommand("runNodeScript")).toBe(false);
  });

  it("blocks LEVEL_2 / LEVEL_3 tools reachable only with elevation", () => {
    expect(isDelegatableCommand("run_sandboxed_command")).toBe(false); // LEVEL_2
    expect(isDelegatableCommand("deleteFile")).toBe(false); // LEVEL_2
    expect(isDelegatableCommand("wipeMemory")).toBe(false); // LEVEL_3
  });

  it("blocks LEVEL_1 tools — delegation is capped below a local script", () => {
    // init_luca_workspace / curate_luca_skills are LEVEL_1; a local script may
    // call them, a remote device may not.
    expect(isDelegatableCommand("init_luca_workspace")).toBe(false);
    expect(isDelegatableCommand("curate_luca_skills")).toBe(false);
  });

  it("denies unknown / unvetted commands by default", () => {
    expect(isDelegatableCommand("totally_made_up_tool")).toBe(false);
    expect(isDelegatableCommand("")).toBe(false);
    expect(isDelegatableCommand(undefined as unknown as string)).toBe(false);
  });

  it("permits a genuinely no-auth (LEVEL_0) read tool", () => {
    // searchweb is a LEVEL_0 no-auth read; delegation may use it.
    expect(isDelegatableCommand("searchweb")).toBe(true);
  });
});
