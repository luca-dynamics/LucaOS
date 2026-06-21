import source from "./ModelManager.tsx?raw";
import { describe, expect, it } from "vitest";

describe("ModelManager Provider Hub execution guard copy", () => {
  it("surfaces the guarded execution states without adding controls", () => {
    expect(source).toContain("Execution guard");
    expect(source).toContain("Current ProviderFactory route is active");
    expect(source).toContain("Provider Hub handoff route will be used through ProviderFactory");
    expect(source).toContain("Provider Hub handoff not eligible; current route remains active");
  });
});
