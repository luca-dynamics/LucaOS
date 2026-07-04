// @vitest-environment jsdom
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PersonalIntelligenceMemoryApprovalPilot } from "./PersonalIntelligenceMemoryApprovalPilot";
import type { MemoryServiceAdapterDependency } from "../../personal-intelligence";

const sources = import.meta.glob(
  [
    "./PersonalIntelligenceMemoryApprovalPilot.tsx",
    "../../personal-intelligence/approval/memoryApprovalPilot.ts",
    "../../personal-intelligence/adapters/governedMemoryAdapter.ts",
  ],
  { eager: true, import: "default", query: "?raw" },
) as Record<string, string>;
const componentSource = sources["./PersonalIntelligenceMemoryApprovalPilot.tsx"];
const helperSource =
  sources["../../personal-intelligence/approval/memoryApprovalPilot.ts"];
const adapterSource =
  sources["../../personal-intelligence/adapters/governedMemoryAdapter.ts"];

describe("PersonalIntelligenceMemoryApprovalPilot", () => {
  it("renders the disabled safe posture, the gate ladder, and a locked write", () => {
    const markup = renderToStaticMarkup(
      <PersonalIntelligenceMemoryApprovalPilot />,
    );

    expect(markup).toContain("Governed memory write");
    expect(markup).toContain("Pilot disabled");
    expect(markup).toContain("Luca wants to remember");
    // Gate ladder (from the real checklist) is visible.
    expect(markup).toContain("Proposal exists");
    expect(markup).toContain("Confirmation phrase accepted");
    expect(markup).toContain("LucaLink sync disabled");
    // The staged controls and the single locked write action.
    expect(markup).toContain("Enable the pilot");
    expect(markup).toContain("Write to memory");
    expect(markup).toContain("Locked until every gate above is green.");
    expect(markup).toContain("Dry-run result");
    expect(markup).toContain("Live-write result");
  });

  it("performs no write at render time: the write dependency is never resolved", () => {
    const saveMemory = vi.fn();
    const createWriteDependency = vi.fn(
      (): MemoryServiceAdapterDependency => ({ saveMemory }),
    );

    renderToStaticMarkup(
      <PersonalIntelligenceMemoryApprovalPilot
        createWriteDependency={createWriteDependency}
      />,
    );

    // Rendering must never construct the live writer, let alone call it.
    expect(createWriteDependency).not.toHaveBeenCalled();
    expect(saveMemory).not.toHaveBeenCalled();
  });

  it("has no render-time side effects and never imports the writer directly", () => {
    // The live memoryService is reached only via the composition-edge factory,
    // resolved lazily inside the write handler — so the component source never
    // names memoryService, storage, network, or a render effect.
    expect(componentSource).not.toMatch(/from\s+["'][^"']*memoryService/i);
    expect(componentSource).not.toContain(".saveMemory(");
    expect(componentSource).not.toMatch(/services\/lucaLink/i);
    expect(componentSource).not.toMatch(
      /\b(localStorage|sessionStorage|indexedDB|fetch|WebSocket|EventSource)\b/,
    );
    expect(componentSource).not.toMatch(
      /\b(node:fs|child_process|electron|ipcRenderer|ipcMain)\b/,
    );
    expect(componentSource).not.toMatch(/useEffect\s*\(/);
  });

  it("wires the gated live-write through the governed helper behind the confirmation phrase", () => {
    // The live-write IS now wired — but only through the governed helper, which
    // re-checks every pilot gate, and behind the exact confirmation phrase.
    expect(componentSource).toContain("runGovernedMemoryApprovalLiveWrite");
    expect(componentSource).toContain(
      "DEFAULT_MEMORY_APPROVAL_CONFIRMATION_PHRASE",
    );
    // The live writer is resolved lazily at the composition edge, not imported
    // into the component graph at module load.
    expect(componentSource).toContain(
      "services/personalIntelligence/liveMemoryAdapterDependency",
    );
    expect(componentSource).toContain("readyForLiveWrite");
  });

  it("keeps the governed adapter call inside the approval helper / adapter", () => {
    expect(helperSource).toContain(
      "persistApprovedMemoryProposalWithGovernance",
    );
    expect(helperSource).not.toContain(".saveMemory(");
    expect(adapterSource).toContain("memoryService.saveMemory(");
  });
});
