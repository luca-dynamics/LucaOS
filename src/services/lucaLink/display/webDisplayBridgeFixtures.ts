import { createLucaLinkWebDisplayPreviewPayload } from "./webDisplayBridgePreview";
import {
  createLucaLinkWebDisplaySessionIntent,
  markLucaLinkWebDisplaySessionApprovedForPreview,
} from "./webDisplaySession";

const FIXTURE_CREATED_AT = "2026-06-07T12:00:00.000Z";
const FIXTURE_APPROVED_AT = "2026-06-07T12:01:00.000Z";

export const LUCA_LINK_WEB_DISPLAY_SAMPLE_INTENT =
  createLucaLinkWebDisplaySessionIntent({
    sessionId: "display-session-sample-dashboard",
    requestedByHostId: "primary-host-sample",
    targetHostId: "display-host-sample",
    title: "Project dashboard presentation preview",
    urlPreview: "https://example.invalid/dashboard?view=summary#private-fragment",
    contentKind: "dashboard_panel",
    privacyLevel: "project",
    riskLevel: "low",
    createdAt: FIXTURE_CREATED_AT,
    expiresAt: "2027-06-07T12:15:00.000Z",
  });

const approvedSampleIntent = markLucaLinkWebDisplaySessionApprovedForPreview(
  LUCA_LINK_WEB_DISPLAY_SAMPLE_INTENT,
  {
    approvedByHostId: "display-host-sample",
    approvedAt: FIXTURE_APPROVED_AT,
  },
);

export const LUCA_LINK_WEB_DISPLAY_SAMPLE_PREVIEW =
  createLucaLinkWebDisplayPreviewPayload(
    approvedSampleIntent,
    FIXTURE_APPROVED_AT,
  );
