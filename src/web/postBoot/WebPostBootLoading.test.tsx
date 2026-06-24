import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
const { readFileSync } = process.getBuiltinModule("node:fs");
import { describe, expect, it } from "vitest";
import { WebPostBootLoading } from "./WebPostBootLoading";

const loadingSource = readFileSync("src/web/postBoot/WebPostBootLoading.tsx", "utf8");

describe("WebPostBootLoading", () => {
  it("uses the pending readiness bridge copy model", () => {
    const html = renderToStaticMarkup(<WebPostBootLoading />);

    expect(loadingSource).toContain("resolvePostBootReadinessBridgeCopy");
    expect(loadingSource).toContain('state: "pending"');
    expect(html).toContain("Preparing your LucaOS environment");
    expect(html).toContain("Checking your preferences");
    expect(html).toContain("Restoring memory boundaries");
    expect(html).toContain("Preparing safe tool access");
  });

  it("remains synchronous, minimal, and free of terminal boot copy", () => {
    const html = renderToStaticMarkup(<WebPostBootLoading />);

    expect(html).not.toContain("&gt;");
    expect(html).not.toContain("Luca is waking up");
    expect(html).not.toContain("Starting Luca&#x27;s web session");
    expect(html).not.toContain("/models/avatar.glb");
  });
});
