export type SandboxBackendKind = "docker" | "wsl2" | "windows_sandbox" | "remote";

export type SandboxSessionPersistence = "ephemeral" | "persistent";

export type SandboxCapability =
  | "browser"
  | "terminal"
  | "workspace_read"
  | "workspace_write"
  | "network"
  | "secrets";

export interface SandboxBackendProbe {
  backend: SandboxBackendKind;
  available: boolean;
  isolated: boolean;
  reason: string;
  capabilities: SandboxCapability[];
}

export interface SandboxSessionRequest {
  missionId: string;
  backendPreference?: SandboxBackendKind[];
  persistence: SandboxSessionPersistence;
  capabilities: SandboxCapability[];
  workspacePath?: string;
  networkAllowlist?: string[];
  secretIds?: string[];
}

export interface SandboxSessionPlan {
  planId: string;
  missionId: string;
  backend: SandboxBackendKind | null;
  status: "ready" | "blocked";
  persistence: SandboxSessionPersistence;
  capabilities: SandboxCapability[];
  workspacePath?: string;
  networkAllowlist: string[];
  secretIds: string[];
  blockers: string[];
  hostFallbackAllowed: false;
}

