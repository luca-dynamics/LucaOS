import { describe, expect, it } from "vitest";
import { createBrowserRuntimeRouterRealInvocationShell } from "./createBrowserRuntimeRouterRealInvocationShell";

describe("createBrowserRuntimeRouterRealInvocationShell", () => {
  it("returns shell and helper methods", () => {
    const created = createBrowserRuntimeRouterRealInvocationShell();
    expect(created.shell).toBeDefined();
    expect(typeof created.invoke).toBe("function");
    expect(typeof created.getSnapshot).toBe("function");
    expect(typeof created.reset).toBe("function");
  });
});
