/**
 * Canonical computer-use feature flags.
 *
 * Historical dual aliases remain accepted for compatibility; new code should
 * use the canonical names below. Prefer product settings
 * (`LucaSettings.computerUse`) for end-user enablement of the real stack.
 */

import type { ComputerUseSandboxBrowserAdapterFeatureFlags } from "./types";
import type { BrowserRuntimeRouterInvocationReadinessFeatureFlags } from "./BrowserRuntimeRouterInvocationGuard";

/** Canonical names for sandbox browser adapter opt-in. */
export type CanonicalSandboxBrowserFlags = {
  sandboxBrowserAdapterEnabled: boolean;
  browserRuntimeRouterBridgeEnabled: boolean;
};

/** Canonical readiness flags for real router invocation. */
export type CanonicalInvocationReadinessFlags = {
  sandboxBrowserAdapterEnabled: boolean;
  browserRuntimeRouterBridgeEnabled: boolean;
  browserRuntimeRouterDryRunEnabled: boolean;
  realBrowserRuntimeRouterEnabled: boolean;
};

/**
 * Normalize sandbox browser adapter flags.
 * Canonical: sandboxBrowserAdapterEnabled, browserRuntimeRouterBridgeEnabled
 * Deprecated aliases: enableSandboxBrowserAdapter, enableBrowserRuntimeRouterBridge
 */
export function normalizeSandboxBrowserAdapterFlags(
  flags: ComputerUseSandboxBrowserAdapterFeatureFlags | undefined,
): CanonicalSandboxBrowserFlags {
  return {
    sandboxBrowserAdapterEnabled: Boolean(
      flags?.sandboxBrowserAdapterEnabled || flags?.enableSandboxBrowserAdapter,
    ),
    browserRuntimeRouterBridgeEnabled: Boolean(
      flags?.browserRuntimeRouterBridgeEnabled ||
        flags?.enableBrowserRuntimeRouterBridge,
    ),
  };
}

/**
 * Normalize invocation readiness flags (strict boolean).
 */
export function normalizeInvocationReadinessFlags(
  flags: BrowserRuntimeRouterInvocationReadinessFeatureFlags | undefined,
): CanonicalInvocationReadinessFlags {
  return {
    sandboxBrowserAdapterEnabled: flags?.sandboxBrowserAdapterEnabled === true,
    browserRuntimeRouterBridgeEnabled:
      flags?.browserRuntimeRouterBridgeEnabled === true,
    browserRuntimeRouterDryRunEnabled:
      flags?.browserRuntimeRouterDryRunEnabled === true,
    realBrowserRuntimeRouterEnabled:
      flags?.realBrowserRuntimeRouterEnabled === true,
  };
}

/** Human-readable map of preferred vs deprecated flag names. */
export const COMPUTER_USE_FLAG_CANONICAL_MAP = {
  sandboxBrowserAdapterEnabled: {
    canonical: "sandboxBrowserAdapterEnabled",
    deprecatedAliases: ["enableSandboxBrowserAdapter"],
  },
  browserRuntimeRouterBridgeEnabled: {
    canonical: "browserRuntimeRouterBridgeEnabled",
    deprecatedAliases: ["enableBrowserRuntimeRouterBridge"],
  },
  realBrowserRuntimeRouterEnabled: {
    canonical: "realBrowserRuntimeRouterEnabled",
    deprecatedAliases: [] as string[],
  },
  realSandboxEnabled: {
    canonical: "LucaSettings.computerUse.realSandboxEnabled",
    deprecatedAliases: [] as string[],
  },
} as const;
