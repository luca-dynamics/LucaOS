import { ExtractedOnboardingFlow } from "../shared/onboarding/ExtractedOnboardingFlow";
import type { WebProfile } from "./webLifecycleStorage";

const DEFAULT_WEB_PROFILE: WebProfile = {
  name: "",
  interaction: "chat",
  theme: "PROFESSIONAL",
  modelRoute: "cloud",
  personality: "proactive",
  backgroundOpacity: 30,
  backgroundBlur: 40,
};

export function WebOnboardingSurface({ onComplete }: { onComplete: (profile: WebProfile) => void }) {
  return <ExtractedOnboardingFlow initialProfile={DEFAULT_WEB_PROFILE} onComplete={onComplete} />;
}
