import { describe, expect, it } from "vitest";
import { createTierRoutingContextFromOnboardingHandoff, validateOnboardingTierHandoff } from "./lucaOnboardingTierHandoff";

describe("lucaOnboardingTierHandoff", () => {
  it("creates routing contexts for origin/tactical/normal", () => {
    expect(createTierRoutingContextFromOnboardingHandoff({ userTier: "origin", source: "private_macbook_onboarding" }).userTier).toBe("origin");
    expect(createTierRoutingContextFromOnboardingHandoff({ userTier: "tactical", source: "current_repo_onboarding" }).userTier).toBe("tactical");
    expect(createTierRoutingContextFromOnboardingHandoff({ userTier: "normal", source: "migration_placeholder" }).userTier).toBe("normal");
  });
  it("unknown or missing tier falls back safely", () => {
    expect(createTierRoutingContextFromOnboardingHandoff({ source: "unknown" }).userTier).toBe("unknown");
  });
  it("emits local_models and byok warnings", () => {
    expect(validateOnboardingTierHandoff({ userTier: "normal", source: "unknown", modelMode: "local_models" }).warnings).toContain("local_models_requires_explicit_install_download_consent_later");
    expect(validateOnboardingTierHandoff({ userTier: "normal", source: "unknown", modelMode: "byok" }).warnings).toContain("byok_requires_secure_key_handling");
  });
});
