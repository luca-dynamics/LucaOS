export type LucaRuntimeUserTier = "normal" | "tactical" | "origin";
export type LucaRuntimeResourceTier = "low_resource" | "standard" | "high_resource" | "cloud_powered";

export interface LucaRuntimeTierDescription {
  userTier: LucaRuntimeUserTier;
  resourceTier: LucaRuntimeResourceTier;
  label: string;
  diagnosticsVisibility: "friendly" | "compact" | "full";
  capabilityDescription: string;
}

export function describeRuntimeTier(input: Partial<LucaRuntimeTierDescription>): LucaRuntimeTierDescription {
  const userTier = input.userTier ?? "normal";
  const resourceTier = input.resourceTier ?? "standard";
  const diagnosticsVisibility = userTier === "origin" ? "full" : userTier === "tactical" ? "compact" : "friendly";
  return {
    userTier,
    resourceTier,
    diagnosticsVisibility,
    label: `${userTier} / ${resourceTier}`,
    capabilityDescription:
      resourceTier === "cloud_powered"
        ? "Prepared for managed cloud-model power with provenance gates."
        : resourceTier === "high_resource"
          ? "Prepared for high-resource local autonomy with graceful safety gates."
          : resourceTier === "low_resource"
            ? "Prepared to degrade gracefully on constrained local hardware."
            : "Prepared for standard local/BYOK runtime continuity.",
  };
}
