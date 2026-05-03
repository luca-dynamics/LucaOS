import { VisionProvider } from "./providers/VisionProvider";
import { HackingProvider } from "./providers/HackingProvider";
import { CommunicationProvider } from "./providers/CommunicationProvider";
import { SystemProvider } from "./providers/SystemProvider";
import { MobileProvider } from "./providers/MobileProvider";
import { TradingProvider } from "./providers/TradingProvider";
import { IntelligenceProvider } from "./providers/IntelligenceProvider";
import { AutonomousProvider } from "./providers/AutonomousProvider";
import { IoTProvider } from "./providers/IoTProvider";
import { ConfigurationProvider } from "./providers/ConfigurationProvider";
import { LUCA_AUDIENCE_TIER } from "../config/buildConfig";
import {
  canAccessAudienceTier,
  type LucaAudienceTier,
} from "../config/layerBoundary";

export type ToolProviderSurface = "shared" | "origin";

export interface ToolProviderEntry {
  id:
    | "vision"
    | "hacking"
    | "communication"
    | "system"
    | "mobile"
    | "trading"
    | "intelligence"
    | "autonomous"
    | "iot"
    | "configuration";
  surface: ToolProviderSurface;
  minimumAudienceTier: LucaAudienceTier;
  rationale: string;
  register: () => void;
}

export const TOOL_PROVIDER_REGISTRY: ToolProviderEntry[] = [
  {
    id: "vision",
    surface: "shared",
    minimumAudienceTier: "public_standard",
    rationale:
      "Vision features are part of the core product runtime and should remain broadly available.",
    register: VisionProvider.register,
  },
  {
    id: "hacking",
    surface: "origin",
    minimumAudienceTier: "origin",
    rationale:
      "Offensive and exploit-oriented tooling belongs to privileged origin-only surfaces.",
    register: HackingProvider.register,
  },
  {
    id: "communication",
    surface: "shared",
    minimumAudienceTier: "public_standard",
    rationale:
      "User messaging and social connector flows are product-facing capabilities.",
    register: CommunicationProvider.register,
  },
  {
    id: "system",
    surface: "origin",
    minimumAudienceTier: "public_standard",
    rationale:
      "System tools include standard-public utilities, with deeper controls curated inside the provider at the tool level.",
    register: SystemProvider.register,
  },
  {
    id: "mobile",
    surface: "shared",
    minimumAudienceTier: "public_standard",
    rationale:
      "Mobile/device interactions are user-facing product capabilities.",
    register: MobileProvider.register,
  },
  {
    id: "trading",
    surface: "origin",
    minimumAudienceTier: "public_tactical",
    rationale:
      "Current trading and market operation tooling is reserved for tactical and origin audiences rather than standard public builds.",
    register: TradingProvider.register,
  },
  {
    id: "intelligence",
    surface: "origin",
    minimumAudienceTier: "public_standard",
    rationale:
      "Intelligence includes shared memory and knowledge features, while deeper tactical intelligence is curated at the tool level.",
    register: IntelligenceProvider.register,
  },
  {
    id: "autonomous",
    surface: "origin",
    minimumAudienceTier: "public_standard",
    rationale:
      "Autonomy includes standard-public goal management, with deeper self-evolution and operational tooling curated at the tool level.",
    register: AutonomousProvider.register,
  },
  {
    id: "iot",
    surface: "shared",
    minimumAudienceTier: "public_standard",
    rationale:
      "IoT and device-control capabilities can belong to shared product surfaces when curated appropriately.",
    register: IoTProvider.register,
  },
  {
    id: "configuration",
    surface: "shared",
    minimumAudienceTier: "public_standard",
    rationale:
      "Settings and general configuration are part of normal product operation.",
    register: ConfigurationProvider.register,
  },
];

export const listToolProvidersBySurface = (
  surface: ToolProviderSurface,
): ToolProviderEntry[] => {
  return TOOL_PROVIDER_REGISTRY.filter((entry) => entry.surface === surface);
};

export const listToolProvidersForMinimumAudienceTier = (
  minimumAudienceTier: LucaAudienceTier,
): ToolProviderEntry[] => {
  return TOOL_PROVIDER_REGISTRY.filter(
    (entry) => entry.minimumAudienceTier === minimumAudienceTier,
  );
};

export const listTacticalToolProviders = (): ToolProviderEntry[] =>
  listToolProvidersForMinimumAudienceTier("public_tactical");

export const listOriginOnlyToolProviders = (): ToolProviderEntry[] =>
  listToolProvidersForMinimumAudienceTier("origin");

// Legacy compatibility helpers retained while older callsites are migrated.
export const listPublicHiddenToolProviders = (): ToolProviderEntry[] =>
  listOriginOnlyToolProviders();

export const listPublicCuratedToolProviders = (): ToolProviderEntry[] =>
  listTacticalToolProviders();

export const canRegisterToolProvider = (
  provider: ToolProviderEntry,
  options?: { enforceBoundary?: boolean },
): boolean => {
  if (!options?.enforceBoundary) return true;
  return canAccessAudienceTier(
    LUCA_AUDIENCE_TIER,
    provider.minimumAudienceTier,
  );
};
