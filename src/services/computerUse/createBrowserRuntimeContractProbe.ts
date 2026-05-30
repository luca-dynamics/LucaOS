import {
  COMPUTER_USE_BROWSER_RUNTIME_DISCOVERY_METADATA,
  ComputerUseBrowserRuntimeTarget,
  ComputerUseBrowserRuntimeTargetRequest,
  ComputerUseBrowserRuntimeTargetResult,
} from "./BrowserRuntimeContract";

export const DISCOVERED_BROWSER_RUNTIME_CANDIDATES = [
  { name: "BrowserRuntime types", path: "src/services/browserRuntime/types.ts", side: "runtime" as const },
  { name: "BrowserRuntime router", path: "src/services/browserRuntime/BrowserRuntimeRouter.ts", side: "runtime" as const },
  { name: "BrowserRuntime README", path: "src/services/browserRuntime/README.md", side: "docs" as const },
  { name: "Luca Browser UI", path: "src/components/LucaBrowser.tsx", side: "electron_browser" as const },
  { name: "Browser runtime router spec", path: "docs/browser/BROWSER_RUNTIME_ROUTER_SPEC.md", side: "docs" as const },
  { name: "Ghost browser spec", path: "docs/browser/GHOST_BROWSER_SPEC.md", side: "docs" as const },
] as const;

export const createBrowserRuntimeContractProbe = (): ComputerUseBrowserRuntimeTarget => ({
  id: "computer-use-browser-runtime-discovery-probe",
  metadata: COMPUTER_USE_BROWSER_RUNTIME_DISCOVERY_METADATA,
  probe: (request: ComputerUseBrowserRuntimeTargetRequest): ComputerUseBrowserRuntimeTargetResult => {
    const exists = DISCOVERED_BROWSER_RUNTIME_CANDIDATES.some(
      (candidate) =>
        candidate.path === request.candidatePath || candidate.name === request.candidateName,
    );

    return {
      accepted: exists,
      reason: exists
        ? "Discovery candidate is known to the local contract probe."
        : "Candidate not found in local discovery probe catalog.",
      metadata: COMPUTER_USE_BROWSER_RUNTIME_DISCOVERY_METADATA,
    };
  },
});

export const getDiscoverySnapshot = () => ({
  metadata: COMPUTER_USE_BROWSER_RUNTIME_DISCOVERY_METADATA,
  candidates: DISCOVERED_BROWSER_RUNTIME_CANDIDATES,
  safety: {
    browserRuntimeImported: false,
    playwrightCalled: false,
    browserApisCalled: false,
    systemApisCalled: false,
  } as const,
});
