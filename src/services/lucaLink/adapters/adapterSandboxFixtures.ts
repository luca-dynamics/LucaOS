import { createLucaLinkAdapterSandboxPlan } from "./adapterSandboxRuntime";
import {
  DEFAULT_LUCA_LINK_ADAPTER_SANDBOX_CONFIG,
  type LucaLinkAdapterManifest,
} from "./adapterSandboxTypes";

export const LUCA_LINK_SAFE_DISPLAY_ADAPTER_FIXTURE = Object.freeze({
  id: "lucalink.safe-display-preview",
  name: "LucaLink Safe Display Preview",
  version: "1.0.0",
  description: "Static display preview manifest for sandbox planning only.",
  vendor: "LucaOS",
  targetHostTypes: ["display-host"],
  requestedCapabilities: ["display.read", "display.present"],
  requestedPermissions: ["display.present", "host.approval"],
  entrypointRef: "adapter://safe-display-preview/index",
  integrity: "sha256:fixture-not-for-execution",
  provenance: "built-in-static-safe-fixture",
  createdAt: "2026-06-07T00:00:00.000Z",
  updatedAt: "2026-06-07T00:00:00.000Z",
} satisfies LucaLinkAdapterManifest);

export const LUCA_LINK_DEFAULT_ADAPTER_SANDBOX_PREVIEW_PLAN =
  createLucaLinkAdapterSandboxPlan({
    manifest: LUCA_LINK_SAFE_DISPLAY_ADAPTER_FIXTURE,
    config: DEFAULT_LUCA_LINK_ADAPTER_SANDBOX_CONFIG,
    requestedByHostId: "settings-preview-host",
    targetHostId: "display-preview-host",
    hostTrustLevel: "untrusted-preview",
  });
