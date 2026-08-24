// @vitest-environment jsdom
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The right panel's contract is a promise about restraint — the direction doc's
 * "calm when empty, comes forward when there's something to review. Not a
 * permanent red wall." So these assertions are as much about what is ABSENT at
 * rest as about what appears when something needs a person.
 *
 * Two of them pin real defects this rewrite fixed:
 *  - the old card read `node.title ?? node.content` off a MemoryNode that has
 *    neither field, so every memory row rendered the literal string "Untitled";
 *  - it never ran `isRenderableMemory`, so ambient-vision frames and system
 *    instructions — Luca's own scaffolding — surfaced as things you had told it.
 *
 * The four services are mocked because they are singletons that reach
 * localStorage, `fetch` and lucaLinkManager. `rightPanelModel` and
 * `dashboardDisclosure` are deliberately NOT mocked: the memory filtering and the
 * per-mode tab set are the things under test, so faking them would test nothing.
 */

const mocks = vi.hoisted(() => ({
  approvals: [] as unknown[],
  memories: [] as unknown[],
  continuity: {
    totalSessions: 0,
    activeSessions: 0,
    resumableSessions: 0,
    pausedSessions: 0,
    quarantinedSessions: 0,
    safeToResumeSessions: 0,
  },
  approveOnce: vi.fn(),
  reject: vi.fn(),
  deleteMemory: vi.fn(),
  getDiagnostics: vi.fn(),
}));

vi.mock("../../services/provenance/ApprovalRequestCenterService", () => ({
  approvalRequestCenterService: {
    listRequests: () => mocks.approvals,
    approveOnce: mocks.approveOnce,
    reject: mocks.reject,
  },
}));

vi.mock("../../services/memoryService", () => ({
  memoryService: {
    getRecentIntelligence: () => mocks.memories,
    deleteMemory: mocks.deleteMemory,
  },
}));

vi.mock("../../services/runtime/RuntimeDiagnosticsService", () => ({
  runtimeDiagnosticsService: { getDiagnostics: mocks.getDiagnostics },
}));

vi.mock("../../services/runtime/AgentSessionContinuityService", () => ({
  agentSessionContinuityService: {
    getDiagnosticsSummary: () => mocks.continuity,
  },
}));

import { OperationCenter } from "./OperationCenter";

const approval = (over: Record<string, unknown> = {}) => ({
  approvalRequestId: "req-1",
  actionDigest: "digest-1",
  title: "Send the draft to Dana",
  description: "Internal description nobody should have to read",
  riskLevel: "high",
  requestedBy: "Mail agent",
  sourceType: "tool",
  sourceId: "mail.send",
  provenanceIds: [],
  status: "pending",
  createdAt: new Date(0).toISOString(),
  userSafeReason: "Luca wants to send an email on your behalf.",
  actionPreview: {},
  ...over,
});

const memory = (over: Record<string, unknown> = {}) => ({
  id: "mem-1",
  key: "USER_PREFERENCE_THEME",
  value: "Prefers the dark skin after sunset",
  category: "SEMANTIC",
  timestamp: Date.now(),
  confidence: 0.9,
  ...over,
});

const mount = (ui: React.ReactElement) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(ui));
  return {
    container,
    cleanup: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
};

const textOf = (container: HTMLElement) => container.textContent ?? "";

const tabsOf = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLButtonElement>('[role="tab"]'));

const tabNames = (container: HTMLElement) =>
  tabsOf(container).map((tab) => (tab.textContent ?? "").trim());

const tabNamed = (container: HTMLElement, label: string) =>
  tabsOf(container).find((tab) => (tab.textContent ?? "").trim() === label);

const buttonNamed = (container: HTMLElement, label: string) =>
  Array.from(container.querySelectorAll<HTMLButtonElement>("button")).find(
    (button) => (button.textContent ?? "").trim() === label,
  );

let confirmSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  mocks.approvals = [];
  mocks.memories = [];
  mocks.continuity = {
    totalSessions: 0,
    activeSessions: 0,
    resumableSessions: 0,
    pausedSessions: 0,
    quarantinedSessions: 0,
    safeToResumeSessions: 0,
  };
  mocks.approveOnce.mockReset();
  mocks.reject.mockReset();
  // Re-assert implementations rather than only clearing calls, so nothing here
  // depends on whether `restoreAllMocks` also resets plain `vi.fn()`s.
  mocks.deleteMemory.mockReset().mockReturnValue(true);
  mocks.getDiagnostics.mockReset().mockResolvedValue(null);
  // jsdom has no real confirm. Default to "yes" so the destructive path is the
  // one under test; the refusal case overrides it explicitly.
  confirmSpy = vi.fn(() => true);
  window.confirm = confirmSpy as unknown as typeof window.confirm;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("OperationCenter at rest", () => {
  it("says one sentence, and grows no card", () => {
    const { container, cleanup } = mount(<OperationCenter experienceMode="pro" />);
    expect(textOf(container)).toContain("Nothing running — Luca is standing by.");
    // The approval card is the only <section> on the panel. Calm means none.
    expect(container.querySelectorAll("section")).toHaveLength(0);
    cleanup();
  });

  it("reports readiness in the status line, above the tabs", () => {
    const { container, cleanup } = mount(<OperationCenter experienceMode="pro" />);
    expect(textOf(container)).toContain("Luca is ready");
    const status = container.querySelector('[role="tablist"]')?.previousElementSibling;
    expect(status?.textContent).toContain("Luca is ready");
    cleanup();
  });

  it("lets an offline core outrank the runtime headline", () => {
    const { container, cleanup } = mount(
      <OperationCenter
        experienceMode="pro"
        systemStatus={{ label: "Local core offline — cloud mode", healthy: false }}
      />,
    );
    expect(textOf(container)).toContain("Local core offline — cloud mode");
    expect(textOf(container)).not.toContain("Luca is ready");
    cleanup();
  });

  it("says plainly that this is the only device, rather than nothing", () => {
    const { container, cleanup } = mount(<OperationCenter experienceMode="pro" />);
    expect(textOf(container)).toContain("No other devices linked yet");
    cleanup();
  });
});

describe("OperationCenter tabs", () => {
  it("shows three for Basic and Pro, and Trace for Creator only", () => {
    const basic = mount(<OperationCenter experienceMode="basic" />);
    expect(tabNames(basic.container)).toEqual(["Now", "Timeline", "Memory"]);
    basic.cleanup();

    const pro = mount(<OperationCenter experienceMode="pro" />);
    expect(tabNames(pro.container)).toEqual(["Now", "Timeline", "Memory"]);
    pro.cleanup();

    const creator = mount(<OperationCenter experienceMode="creator" />);
    expect(tabNames(creator.container)).toEqual(["Now", "Timeline", "Memory", "Trace"]);
    creator.cleanup();
  });

  it("reports the change upward instead of keeping its own private truth", () => {
    const onModeChange = vi.fn();
    const { container, cleanup } = mount(
      <OperationCenter experienceMode="pro" mode="CONTROL" onModeChange={onModeChange} />,
    );
    act(() => tabNamed(container, "Memory")?.click());
    expect(onModeChange).toHaveBeenCalledWith("MEMORY");
    cleanup();
  });

  it("falls back to the first allowed tab when asked for one this mode cannot show", () => {
    // LOGS is Creator-only. Basic must not be left staring at an empty body.
    const { container, cleanup } = mount(
      <OperationCenter experienceMode="basic" mode="LOGS" />,
    );
    const selected = tabsOf(container).filter(
      (tab) => tab.getAttribute("aria-selected") === "true",
    );
    expect(selected).toHaveLength(1);
    expect(selected[0]?.textContent).toContain("Now");
    cleanup();
  });

  it("walks the strip with the arrow keys, as a tablist is supposed to", () => {
    const onModeChange = vi.fn();
    const { container, cleanup } = mount(
      <OperationCenter experienceMode="pro" onModeChange={onModeChange} />,
    );
    const now = tabNamed(container, "Now");
    // Roving tabindex: one stop for the whole strip, not three.
    expect(now?.tabIndex).toBe(0);
    expect(tabNamed(container, "Memory")?.tabIndex).toBe(-1);

    act(() => {
      now?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
      );
    });
    expect(onModeChange).toHaveBeenCalledWith("ACTIVITY");
    cleanup();
  });
});

describe("OperationCenter approvals", () => {
  it("brings a pending approval forward, provenance and all", () => {
    mocks.approvals = [approval()];
    const { container, cleanup } = mount(<OperationCenter experienceMode="pro" />);
    const text = textOf(container);

    expect(text).toContain("Send the draft to Dana");
    // The user-safe reason, not the internal description.
    expect(text).toContain("Luca wants to send an email on your behalf.");
    expect(text).not.toContain("Internal description nobody should have to read");
    // Provenance you cannot see is not provenance.
    expect(text).toContain("Mail agent");
    expect(text).toContain("high risk");
    expect(text).toContain("Nothing runs until you decide.");
    cleanup();
  });

  it("decides through the service, and says what it will do", () => {
    mocks.approvals = [approval()];
    const { container, cleanup } = mount(<OperationCenter experienceMode="pro" />);

    // "Allow once" / "Deny" — these buttons act, so they may not be named as if
    // they merely opened something.
    const allow = buttonNamed(container, "Allow once");
    expect(allow).not.toBeUndefined();
    expect(buttonNamed(container, "Deny")).not.toBeUndefined();

    mocks.approvals = [];
    act(() => allow?.click());
    expect(mocks.approveOnce).toHaveBeenCalledWith("req-1");
    expect(textOf(container)).not.toContain("Send the draft to Dana");
    cleanup();
  });

  it("rejects through the service too", () => {
    mocks.approvals = [approval()];
    const { container, cleanup } = mount(<OperationCenter experienceMode="pro" />);
    act(() => buttonNamed(container, "Deny")?.click());
    expect(mocks.reject).toHaveBeenCalledWith("req-1");
    expect(mocks.approveOnce).not.toHaveBeenCalled();
    cleanup();
  });

  it("carries the count into the status line, so another tab still shows it", () => {
    mocks.approvals = [approval(), approval({ approvalRequestId: "req-2" })];
    const { container, cleanup } = mount(
      <OperationCenter experienceMode="pro" mode="MEMORY" />,
    );
    expect(textOf(container)).toContain("2 approvals needed");
    cleanup();
  });

  it("ignores requests that are no longer pending", () => {
    mocks.approvals = [approval({ status: "approved_once" })];
    const { container, cleanup } = mount(<OperationCenter experienceMode="pro" />);
    expect(textOf(container)).not.toContain("Send the draft to Dana");
    expect(textOf(container)).toContain("Nothing running — Luca is standing by.");
    cleanup();
  });
});

describe("OperationCenter memory", () => {
  it("reads the memory's own key and value — not the fields it never had", () => {
    mocks.memories = [memory()];
    const { container, cleanup } = mount(
      <OperationCenter experienceMode="pro" mode="MEMORY" />,
    );
    expect(textOf(container)).toContain("User preference theme");
    expect(textOf(container)).toContain("Prefers the dark skin after sunset");
    expect(textOf(container)).not.toContain("Untitled");
    expect(textOf(container)).toContain("Only you can change what I remember.");
    cleanup();
  });

  it("keeps Luca's own scaffolding out of the archive", () => {
    mocks.memories = [
      memory({
        id: "mem-vision",
        key: "AMBIENT_FRAME",
        value: "[AMBIENT VISION] a window, a desk",
      }),
      memory({ id: "mem-sys-key", key: "SYSTEM_INSTRUCTION_TONE", value: "Be terse" }),
      memory({
        id: "mem-sys-cat",
        key: "BOOKKEEPING",
        category: "SYSTEM",
        value: "Internal bookkeeping",
      }),
      memory({ id: "mem-real", key: "USER_FACT", value: "Lives in Lagos" }),
    ];
    const { container, cleanup } = mount(
      <OperationCenter experienceMode="pro" mode="MEMORY" />,
    );
    expect(textOf(container)).toContain("Lives in Lagos");
    expect(textOf(container)).not.toContain("AMBIENT VISION");
    expect(textOf(container)).not.toContain("Be terse");
    expect(textOf(container)).not.toContain("Internal bookkeeping");
    cleanup();
  });

  it("names the memory in the confirm, and forgets nothing when declined", () => {
    mocks.memories = [memory()];
    confirmSpy.mockReturnValue(false);
    const { container, cleanup } = mount(
      <OperationCenter experienceMode="pro" mode="MEMORY" />,
    );
    act(() => buttonNamed(container, "Forget")?.click());
    expect(confirmSpy).toHaveBeenCalledTimes(1);
    const asked = String(confirmSpy.mock.calls[0]?.[0]);
    expect(asked).toContain("User preference theme");
    // The delete is cross-device; the gate has to say so.
    expect(asked).toContain("every linked device");
    expect(mocks.deleteMemory).not.toHaveBeenCalled();
    cleanup();
  });

  it("forgets by id once confirmed — a key match could hit a different memory", () => {
    mocks.memories = [memory()];
    const { container, cleanup } = mount(
      <OperationCenter experienceMode="pro" mode="MEMORY" />,
    );
    act(() => buttonNamed(container, "Forget")?.click());
    expect(mocks.deleteMemory).toHaveBeenCalledWith("mem-1");
    cleanup();
  });

  it("gives the forget control an accessible name of its own", () => {
    mocks.memories = [memory()];
    const { container, cleanup } = mount(
      <OperationCenter experienceMode="pro" mode="MEMORY" />,
    );
    expect(
      container.querySelector('[aria-label="Forget User preference theme"]'),
    ).not.toBeNull();
    cleanup();
  });
});

describe("OperationCenter timeline", () => {
  it("names every non-zero bucket, and flags the quarantined one", () => {
    mocks.continuity = {
      totalSessions: 5,
      activeSessions: 2,
      resumableSessions: 1,
      pausedSessions: 1,
      quarantinedSessions: 1,
      safeToResumeSessions: 1,
    };
    const { container, cleanup } = mount(
      <OperationCenter experienceMode="pro" mode="ACTIVITY" />,
    );
    const text = textOf(container);
    expect(text).toContain("1 quarantined · needs review");
    expect(text).toContain("2 running");
    expect(text).toContain("1 safe to resume");
    // A degraded runtime outranks readiness in the status line.
    expect(text).toContain("Runtime degraded — review needed");
    cleanup();
  });

  it("admits it is empty rather than inventing a row", () => {
    const { container, cleanup } = mount(
      <OperationCenter experienceMode="pro" mode="ACTIVITY" />,
    );
    expect(textOf(container)).toContain("No agent sessions yet");
    cleanup();
  });
});

describe("OperationCenter creator surfaces", () => {
  it("renders Trace from the app's own tool log", () => {
    const { container, cleanup } = mount(
      <OperationCenter
        experienceMode="creator"
        mode="LOGS"
        toolLogs={[
          {
            toolName: "browser.open",
            args: {},
            result: "Opened example.com",
            timestamp: Date.now(),
          },
        ]}
      />,
    );
    expect(textOf(container)).toContain("browser.open");
    expect(textOf(container)).toContain("Opened example.com");
    cleanup();
  });

  it("says so plainly when nothing has run", () => {
    const { container, cleanup } = mount(
      <OperationCenter experienceMode="creator" mode="LOGS" />,
    );
    expect(textOf(container)).toContain("No tool calls yet.");
    cleanup();
  });

  it("does not fetch diagnostics for a mode that will never render them", () => {
    const basic = mount(<OperationCenter experienceMode="basic" />);
    expect(mocks.getDiagnostics).not.toHaveBeenCalled();
    basic.cleanup();

    const creator = mount(<OperationCenter experienceMode="creator" />);
    expect(mocks.getDiagnostics).toHaveBeenCalled();
    creator.cleanup();
  });

  it("does not fetch diagnostics from a tab that does not show them", () => {
    const { cleanup } = mount(
      <OperationCenter experienceMode="creator" mode="MEMORY" />,
    );
    expect(mocks.getDiagnostics).not.toHaveBeenCalled();
    cleanup();
  });
});
