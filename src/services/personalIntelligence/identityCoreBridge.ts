import type { OperatorProfile } from "../../types/operatorProfile";
import type {
  CommunicationStyle,
  IdentityCoreInput,
} from "../../personal-intelligence/identity/identityTypes";
import type { PrivacyZone } from "../../personal-intelligence/privacy/privacyZones";

/**
 * Bridge from the LIVE operator profile (settingsService.getOperatorProfile —
 * learned during onboarding and conversation) into Personal Intelligence's
 * IdentityCore view. PI's identity surface showed a hardcoded preview; this
 * makes it reflect who the user actually is.
 *
 * Lives at the services edge so the personal-intelligence subsystem stays pure
 * (it never imports the operator-profile type). Read-only and display-only —
 * PI's identity card neither saves nor applies anything; it just mirrors the
 * profile the settings system already owns.
 */

const COMMUNICATION_MAP: Record<string, CommunicationStyle> = {
  direct: "concise",
  detailed: "detailed",
  casual: "conversational",
  mixed: "balanced",
};

const SENSITIVE_DENY: Partial<Record<PrivacyZone, "allow" | "deny">> = {
  private: "deny",
  credential: "deny",
  financial: "deny",
  health: "deny",
};

// The operator profile has only a coarse privacy level, not per-zone rules.
// Map it to safe per-zone defaults; sensitive zones always deny.
function privacyDefaultsFor(
  level: string | undefined,
): Partial<Record<PrivacyZone, "allow" | "deny">> {
  if (level === "full") {
    return { ...SENSITIVE_DENY, project: "allow", public: "allow" };
  }
  if (level === "balanced") {
    return { ...SENSITIVE_DENY, project: "allow" };
  }
  return { ...SENSITIVE_DENY };
}

/**
 * Build a PI IdentityCoreInput from the live operator profile, or null when
 * there is no usable profile (so the surface can fall back to its preview).
 */
export function buildIdentityCoreInputFromOperatorProfile(
  profile: OperatorProfile | null | undefined,
): IdentityCoreInput | null {
  if (!profile) return null;
  const name = profile.identity?.name?.trim();
  if (!name) return null;

  const personality = profile.personality ?? {};
  return {
    userId: "operator",
    displayName: name,
    preferredName: profile.identity.designation?.trim() || name,
    communicationStyle:
      (personality.communicationStyle &&
        COMMUNICATION_MAP[personality.communicationStyle]) ||
      "balanced",
    lucaPersonality: {
      tone: personality.tone ?? "Calm, direct, and collaborative",
      traits: [...(personality.traits ?? [])],
      // Boundaries are PI's own stance, not extracted from the profile.
      boundaries: ["approval-before-action", "privacy-by-default"],
    },
    activeProjects: [...(profile.workContext?.currentProjects ?? [])],
    // The operator profile carries no model preferences.
    preferredModels: [],
    devicePreferences: [],
    privacyDefaults: privacyDefaultsFor(profile.metadata?.privacyLevel),
  };
}
