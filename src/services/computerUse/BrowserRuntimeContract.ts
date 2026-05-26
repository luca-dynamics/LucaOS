export type ComputerUseBrowserRuntimeTargetMetadata = {
  contractKind: "discovery";
  browserRuntimeImported: false;
  playwrightCalled: false;
  browserApisCalled: false;
  systemApisCalled: false;
};

export type ComputerUseBrowserRuntimeTargetRequest = {
  candidatePath: string;
  candidateName: string;
  laneHint?: "ghost_browser" | "sandbox_browser" | "authenticated_direct_host" | "remote_linked_browser";
};

export type ComputerUseBrowserRuntimeTargetResult = {
  accepted: boolean;
  reason: string;
  metadata: ComputerUseBrowserRuntimeTargetMetadata;
};

export interface ComputerUseBrowserRuntimeTarget {
  readonly id: string;
  readonly metadata: ComputerUseBrowserRuntimeTargetMetadata;
  probe(request: ComputerUseBrowserRuntimeTargetRequest): ComputerUseBrowserRuntimeTargetResult;
}

export const COMPUTER_USE_BROWSER_RUNTIME_DISCOVERY_METADATA: ComputerUseBrowserRuntimeTargetMetadata = {
  contractKind: "discovery",
  browserRuntimeImported: false,
  playwrightCalled: false,
  browserApisCalled: false,
  systemApisCalled: false,
};
