import { describe, expect, it } from "vitest";
import {
  COMPUTER_USE_BROWSER_RUNTIME_ACTION_MAPPING,
  getComputerUseBrowserRuntimeConformanceMatrix,
  validateComputerUseBrowserRuntimeMapping,
} from "./BrowserRuntimeConformance";

describe("BrowserRuntimeConformance", () => {
  it("includes every current computer-use browser action with explicit disposition", () => {
    const matrix = getComputerUseBrowserRuntimeConformanceMatrix();
    expect(matrix.map((x) => x.sourceAction).sort()).toEqual([
      "click",
      "hotkey",
      "observe",
      "scroll",
      "type_text",
      "wait",
    ]);
  });

  it("maps click/type_text/observe to BrowserRuntime-compatible actions", () => {
    expect(COMPUTER_USE_BROWSER_RUNTIME_ACTION_MAPPING.click.targetAction).toBe("click");
    expect(COMPUTER_USE_BROWSER_RUNTIME_ACTION_MAPPING.type_text.targetAction).toBe("type");
    expect(COMPUTER_USE_BROWSER_RUNTIME_ACTION_MAPPING.observe.targetAction).toBe("extract");
  });

  it("defines wait/scroll/hotkey behavior explicitly", () => {
    expect(COMPUTER_USE_BROWSER_RUNTIME_ACTION_MAPPING.wait.disposition).toBe("noop");
    expect(COMPUTER_USE_BROWSER_RUNTIME_ACTION_MAPPING.scroll.disposition).toBe("noop");
    expect(COMPUTER_USE_BROWSER_RUNTIME_ACTION_MAPPING.hotkey.disposition).toBe("rejected");
  });

  it("rejects unsupported action types safely", () => {
    const result = validateComputerUseBrowserRuntimeMapping({ actionType: "navigate" });
    expect(result.ok).toBe(false);
  });
});
