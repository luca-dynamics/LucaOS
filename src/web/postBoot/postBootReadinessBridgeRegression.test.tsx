// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";

import { resolvePostBootReadinessBridgeCopy } from "./postBootReadinessBridgeCopy";
import { WebPostBootLoading } from "./WebPostBootLoading";
import { WebPostBootTransition } from "./WebPostBootTransition";
import type { WebPostBootStateSnapshot, WebPostBootUserState } from "./webPostBootState";

const noop = () => {};
const renderedCopyForbiddenTerms = [
  "protocol",
  "directive",
  "kernel",
  "sovereign",
  "operator",
  "runtime",
  "provisioning",
  "calibration",
  "cognitive core",
  "webbridge",
  "browser-safe",
  "system ready",
];
const renderedSecretTerms = [
  "MASTER_KEY_HEX",
  "LUCA_VAULT_KEY",
  "master key value",
  "fallback key",
  "private key",
  "api key",
  "token",
  "secret",
];
const bridgeSourceFiles = [
  "src/web/postBoot/postBootReadinessBridgeCopy.ts",
  "src/web/postBoot/WebPostBootLoading.tsx",
  "src/web/postBoot/WebPostBootTransition.tsx",
] as const;
const rootMutationTerms = [
  "document.documentElement",
  "style.setProperty",
  "document.body",
  "body.style",
  'document.querySelector("html")',
] as const;
const flowMotionTerms = [
  "@keyframes",
  "animation:",
  "requestAnimationFrame",
  "setInterval",
  "parallax",
] as const;

type RegressionCase = {
  state: "pending" | WebPostBootUserState;
  render: () => string;
  expectedCta?: string;
};

function sourcePath(repoRelativePath: string): string {
  return fileURLToPath(new URL(`../../../${repoRelativePath}`, import.meta.url));
}

function readSource(repoRelativePath: string): string {
  return readFileSync(sourcePath(repoRelativePath), "utf8");
}

function readBridgeSources(): string {
  return bridgeSourceFiles.map((file) => readSource(file)).join("\n");
}

function baseSnapshot(userState: WebPostBootUserState): WebPostBootStateSnapshot {
  switch (userState) {
    case "new_user":
      return { userState, hasCompletedOnboarding: false, canEnterShell: false };
    case "returning_user":
      return {
        userState,
        displayName: "Maya",
        hasCompletedOnboarding: true,
        preferredInteraction: "text",
        canEnterShell: true,
      };
    case "partial_setup":
      return {
        userState,
        displayName: "Maya",
        hasCompletedOnboarding: false,
        preferredInteraction: "text",
        canEnterShell: false,
      };
    case "permission_attention":
      return {
        userState,
        displayName: "Maya",
        hasCompletedOnboarding: true,
        preferredInteraction: "voice",
        needsVoicePermission: true,
        canEnterShell: false,
      };
  }
}

function renderTransition(snapshot: WebPostBootStateSnapshot): string {
  return renderToStaticMarkup(
    <WebPostBootTransition
      snapshot={snapshot}
      onContinue={noop}
      onRestartOnboarding={noop}
      onReviewVoiceAccess={noop}
    />,
  );
}

function renderInteractive(element: React.ReactElement) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(element);
  });

  return {
    container,
    cleanup: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

function clickButton(container: HTMLElement, label: string) {
  const button = Array.from(container.querySelectorAll("button")).find(
    (item) => item.textContent === label,
  );
  expect(button).toBeTruthy();

  act(() => {
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

describe("post-boot readiness bridge regression matrix", () => {
  const renderedCopyCases: RegressionCase[] = [
    {
      state: "pending" as const,
      render: () => renderToStaticMarkup(<WebPostBootLoading />),
      expectedCta: undefined,
    },
    {
      state: "new_user" as const,
      render: () => renderTransition(baseSnapshot("new_user")),
      expectedCta: undefined,
    },
    {
      state: "returning_user" as const,
      render: () => renderTransition(baseSnapshot("returning_user")),
      expectedCta: undefined,
    },
    {
      state: "partial_setup" as const,
      render: () => renderTransition(baseSnapshot("partial_setup")),
      expectedCta: "Continue setup",
    },
    {
      state: "permission_attention" as const,
      render: () => renderTransition(baseSnapshot("permission_attention")),
      expectedCta: "Review voice access",
    },
  ];

  it.each(renderedCopyCases)("covers calm rendered copy for $state", ({ state, render, expectedCta }) => {
    const copy = resolvePostBootReadinessBridgeCopy({ state });
    const html = render();
    const lowerHtml = html.toLowerCase();

    expect(html).toContain(copy.title);
    expect(html).toContain(copy.supportingCopy);
    for (const line of copy.readinessLines) expect(html).toContain(line);
    if (expectedCta) expect(html).toContain(expectedCta);
    if (state === "new_user" || state === "returning_user") expect(html).not.toContain("<button");
    for (const term of renderedCopyForbiddenTerms) expect(lowerHtml, term).not.toContain(term);
  });

  it("preserves auto-continue source behavior and normal-state CTA copy model", () => {
    const source = readSource("src/web/postBoot/WebPostBootTransition.tsx");
    expect(source).toContain("window.setTimeout(onContinue");
    expect(resolvePostBootReadinessBridgeCopy({ state: "new_user" }).primaryCta).toBe("Continue");
    expect(resolvePostBootReadinessBridgeCopy({ state: "returning_user" }).title).toBe("Welcome back");
    expect(resolvePostBootReadinessBridgeCopy({ state: "returning_user" }).primaryCta).toBe("Enter LucaOS");
  });

  it("preserves attention CTA callback mappings", () => {
    const onContinue = vi.fn();
    const onRestartOnboarding = vi.fn();
    const onReviewVoiceAccess = vi.fn();
    const partial = renderInteractive(
      <WebPostBootTransition
        snapshot={baseSnapshot("partial_setup")}
        onContinue={onContinue}
        onRestartOnboarding={onRestartOnboarding}
      />,
    );

    try {
      expect(partial.container.textContent).toContain("Pick up where you left off");
      clickButton(partial.container, "Continue setup");
      expect(onContinue).toHaveBeenCalledTimes(1);
      expect(onRestartOnboarding).not.toHaveBeenCalled();
    } finally {
      partial.cleanup();
    }

    const permission = renderInteractive(
      <WebPostBootTransition
        snapshot={baseSnapshot("permission_attention")}
        onContinue={onContinue}
        onRestartOnboarding={onRestartOnboarding}
        onReviewVoiceAccess={onReviewVoiceAccess}
      />,
    );

    try {
      clickButton(permission.container, "Review voice access");
      expect(onReviewVoiceAccess).toHaveBeenCalledTimes(1);
      clickButton(permission.container, "Continue without voice");
      expect(onContinue).toHaveBeenCalledTimes(2);
    } finally {
      permission.cleanup();
    }
  });

  it("keeps Details collapsed by default and reveals only the sanitized summary", () => {
    const { container, cleanup } = renderInteractive(
      <WebPostBootTransition
        snapshot={baseSnapshot("permission_attention")}
        onContinue={noop}
        onRestartOnboarding={noop}
        onReviewVoiceAccess={noop}
      />,
    );

    try {
      expect(container.textContent).toContain("Details");
      expect(container.textContent).not.toContain("display name");
      clickButton(container, "Details");
      const text = container.textContent ?? "";
      for (const safeField of [
        "state",
        "display name",
        "onboarding complete",
        "preferred interaction",
        "voice permission attention",
        "can enter shell",
      ]) {
        expect(text).toContain(safeField);
      }
      for (const forbidden of [
        "raw log",
        "localStorage",
        "storage dump",
        "MASTER_KEY_HEX",
        "LUCA_VAULT_KEY",
        "fallback key",
        "private key",
        "api key",
        "token",
        "secret",
      ]) {
        expect(text.toLowerCase(), forbidden).not.toContain(forbidden.toLowerCase());
      }
    } finally {
      cleanup();
    }
  });

  it("keeps rendered bridge copy and details free of secret terms", () => {
    const html = [
      renderToStaticMarkup(<WebPostBootLoading />),
      ...(["new_user", "returning_user", "partial_setup", "permission_attention"] as WebPostBootUserState[]).map((state) =>
        renderTransition(baseSnapshot(state)),
      ),
    ].join("\n");
    for (const term of renderedSecretTerms) expect(html, term).not.toContain(term);
  });

  it("keeps Web Safe Mode ownership and preview-mode copy boundaries intact", () => {
    const bridgeShellSource = readSource("src/web/WebBridgeShell.tsx");
    const bridgeSources = readBridgeSources();
    const safeModeCopy = resolvePostBootReadinessBridgeCopy({ state: "returning_user", webSafeMode: true });

    expect(bridgeShellSource).toContain("Web Safe Mode");
    expect(bridgeShellSource).toContain("__LUCA_WEB_SAFE_MODE__");
    expect(bridgeSources).not.toContain("Web Safe Mode");
    expect(bridgeSources).not.toContain("secureVault");
    expect(safeModeCopy.readinessLines).toContain("Ready to continue in preview mode");
    expect([safeModeCopy.title, safeModeCopy.supportingCopy, ...safeModeCopy.readinessLines].join(" ").toLowerCase()).not.toContain("secure setup is complete");
  });

  it("does not introduce root/global mutations or Flow motion, except existing auto-continue timeout", () => {
    const source = readBridgeSources();
    for (const term of rootMutationTerms) {
      expect(source, term).not.toContain(term);
    }
    for (const term of flowMotionTerms) {
      expect(source, term).not.toContain(term);
    }
    expect(source.match(/setTimeout/g) ?? []).toHaveLength(1);
    expect(source).toContain("window.setTimeout(onContinue");
  });
});
