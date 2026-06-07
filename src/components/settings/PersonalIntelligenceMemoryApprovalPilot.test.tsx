// @vitest-environment jsdom
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PersonalIntelligenceMemoryApprovalPilot } from "./PersonalIntelligenceMemoryApprovalPilot";

const sources = import.meta.glob(
  ["./PersonalIntelligenceMemoryApprovalPilot.tsx", "../../personal-intelligence/approval/memoryApprovalPilot.ts", "../../personal-intelligence/adapters/governedMemoryAdapter.ts"],
  { eager: true, import: "default", query: "?raw" },
) as Record<string, string>;
const componentSource = sources["./PersonalIntelligenceMemoryApprovalPilot.tsx"];
const helperSource =
  sources["../../personal-intelligence/approval/memoryApprovalPilot.ts"];
const adapterSource =
  sources["../../personal-intelligence/adapters/governedMemoryAdapter.ts"];

describe("PersonalIntelligenceMemoryApprovalPilot", () => {
  it("renders the disabled safe posture, checklist, and result panels", () => {
    const markup = renderToStaticMarkup(
      <PersonalIntelligenceMemoryApprovalPilot />,
    );

    expect(markup).toContain("Controlled Live Memory Write Pilot");
    expect(markup).toContain("Pilot disabled");
    expect(markup).toContain("Dry-run required");
    expect(markup).toContain("Explicit approval");
    expect(markup).toContain("Approval checklist");
    expect(markup).toContain("Proposal exists");
    expect(markup).toContain("Dry-run result");
    expect(markup).toContain("Live-write result");
    expect(markup).toContain("LucaLink sync remains disabled");
  });

  it("has no render-time write or direct persistence/runtime dependency", () => {
    expect(componentSource).not.toMatch(/from\s+["'][^"']*memoryService/i);
    expect(componentSource).not.toContain(".saveMemory(");
    expect(componentSource).not.toMatch(/services\/lucaLink/i);
    expect(componentSource).not.toMatch(
      /\b(localStorage|sessionStorage|indexedDB|fetch|WebSocket|EventSource)\b/,
    );
    expect(componentSource).not.toMatch(
      /\b(node:fs|child_process|electron|ipcRenderer|ipcMain)\b/,
    );
    expect(componentSource).not.toContain("runGovernedMemoryApprovalLiveWrite");
    expect(componentSource).not.toMatch(/useEffect\s*\(/);
  });

  it("keeps the governed adapter call inside the approval helper", () => {
    expect(helperSource).toContain(
      "persistApprovedMemoryProposalWithGovernance",
    );
    expect(helperSource).not.toContain(".saveMemory(");
    expect(adapterSource).toContain("memoryService.saveMemory(");
  });
});
