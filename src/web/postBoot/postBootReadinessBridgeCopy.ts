import type { WebPostBootUserState } from "./webPostBootState";

export type PostBootReadinessBridgeState = WebPostBootUserState | "pending";

export type PostBootReadinessBridgeTone =
  | "pending"
  | "ready"
  | "attention"
  | "debug";

export interface PostBootReadinessBridgeCopy {
  title: string;
  supportingCopy: string;
  readinessLines: string[];
  primaryCta?: string;
  secondaryCta?: string;
  detailsLabel?: string;
  autoContinueTone: PostBootReadinessBridgeTone;
}

export interface ResolvePostBootReadinessBridgeCopyOptions {
  state: PostBootReadinessBridgeState;
  webSafeMode?: boolean;
}

const READY_TO_CONTINUE = "Ready to continue";
const READY_TO_CONTINUE_IN_PREVIEW = "Ready to continue in preview mode";

function finishedLine(webSafeMode?: boolean): string {
  return webSafeMode ? READY_TO_CONTINUE_IN_PREVIEW : READY_TO_CONTINUE;
}

export function resolvePostBootReadinessBridgeCopy({
  state,
  webSafeMode = false,
}: ResolvePostBootReadinessBridgeCopyOptions): PostBootReadinessBridgeCopy {
  switch (state) {
    case "pending":
      return {
        title: "Preparing your LucaOS environment",
        supportingCopy:
          "Luca is checking what this device needs before continuing.",
        readinessLines: [
          "Checking your preferences",
          "Restoring memory boundaries",
          "Preparing safe tool access",
        ],
        autoContinueTone: "pending",
      };

    case "new_user":
      return {
        title: "Preparing your LucaOS environment",
        supportingCopy: "Luca is getting this device ready for first run.",
        readinessLines: [
          "Checking your preferences",
          "Preparing memory boundaries",
          "Preparing safe tool access",
          finishedLine(webSafeMode),
        ],
        primaryCta: "Continue",
        autoContinueTone: "ready",
      };

    case "returning_user":
      return {
        title: "Welcome back",
        supportingCopy: "LucaOS is restoring your workspace.",
        readinessLines: [
          "Restoring your preferences",
          "Restoring memory boundaries",
          "Preparing safe tool access",
          finishedLine(webSafeMode),
        ],
        primaryCta: "Enter LucaOS",
        autoContinueTone: "ready",
      };

    case "partial_setup":
      return {
        title: "Pick up where you left off",
        supportingCopy:
          "A few choices still need your attention before LucaOS is fully ready.",
        readinessLines: [
          "Checking saved choices",
          "Preparing setup continuation",
          webSafeMode ? "Ready when you are in preview mode" : "Ready when you are",
        ],
        primaryCta: "Continue setup",
        secondaryCta: "Details",
        detailsLabel: "Details",
        autoContinueTone: "attention",
      };

    case "permission_attention":
      return {
        title: "Review voice access",
        supportingCopy:
          "Voice is paused until microphone access is available. You can continue without it.",
        readinessLines: [
          "Checking voice preference",
          "Reviewing browser access",
          webSafeMode
            ? "Ready to continue without voice in preview mode"
            : "Ready to continue without voice",
        ],
        primaryCta: "Review voice access",
        secondaryCta: "Continue without voice",
        detailsLabel: "Details",
        autoContinueTone: "attention",
      };
  }
}

export const reservedPostBootReadinessBridgeStates = [
  "model_route_attention",
  "failure",
] as const;

export type ReservedPostBootReadinessBridgeState =
  (typeof reservedPostBootReadinessBridgeStates)[number];
