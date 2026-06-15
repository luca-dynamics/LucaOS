import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WebPostBootLoading } from "./WebPostBootLoading";

describe("WebPostBootLoading", () => {
  it("remains synchronous, minimal, and free of terminal boot copy", () => {
    const html = renderToStaticMarkup(<WebPostBootLoading />);

    expect(html).toContain("Preparing LucaOS");
    expect(html).toContain("Starting Luca&#x27;s web session…");
    expect(html).not.toContain("&gt;");
    expect(html).not.toContain("Luca is waking up");
    expect(html).not.toContain("/models/avatar.glb");
  });
});
