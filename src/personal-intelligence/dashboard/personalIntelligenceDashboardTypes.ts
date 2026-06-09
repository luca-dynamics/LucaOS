import type { LucaExperienceMode } from "../../experience/experienceMode";
import type { PersonalMemoryReviewReason } from "../memoryControls";

export interface PersonalIntelligenceDashboardSummary {
  readonly mode: LucaExperienceMode;
  readonly graphId: string;
  readonly activeProjectTitle: string | null;
  readonly handoffHeadline: string;
  readonly nextActionTitle: string | null;
  readonly openTaskCount: number;
  readonly blockerCount: number;
  readonly memoryReviewCount: number;
  readonly privacyReviewCount: number;
  readonly staleContextCount: number;
  readonly protectedMemoryCount: number;
  readonly reviewCountByReason: Readonly<Partial<Record<PersonalMemoryReviewReason, number>>>;
  readonly generatedAt: string;
  readonly previewOnly: true;
  readonly sideEffectsPerformed: false;
}

interface PersonalIntelligenceDashboardDisclosureBase {
  readonly mode: LucaExperienceMode;
  readonly previewOnly: true;
  readonly sideEffectsPerformed: false;
}

export interface BasicPersonalIntelligenceDashboardDisclosure
  extends PersonalIntelligenceDashboardDisclosureBase {
  readonly mode: "basic";
  readonly handoffHeadline: string;
  readonly activeProjectTitle: string | null;
  readonly nextActionTitle: string | null;
  readonly memoryReviewCount: number;
  readonly approvalMessage: "Memory changes require your approval";
  readonly settingsMessage: "Manage memory, knowledge, and personality settings in Settings.";
}

export interface ProPersonalIntelligenceDashboardDisclosure
  extends PersonalIntelligenceDashboardDisclosureBase {
  readonly mode: "pro";
  readonly activeProjectTitle: string | null;
  readonly nextActionTitle: string | null;
  readonly openTaskCount: number;
  readonly blockerCount: number;
  readonly staleContextCount: number;
  readonly privacyReviewCount: number;
  readonly memoryReviewCount: number;
}

export interface CreatorPersonalIntelligenceDashboardDisclosure
  extends PersonalIntelligenceDashboardDisclosureBase {
  readonly mode: "creator";
  readonly activeProjectTitle: string | null;
  readonly nextActionTitle: string | null;
  readonly openTaskCount: number;
  readonly blockerCount: number;
  readonly staleContextCount: number;
  readonly privacyReviewCount: number;
  readonly memoryReviewCount: number;
  readonly protectedMemoryCount: number;
  readonly graphId: string;
  readonly generatedAt: string;
  readonly reviewCountByReason: Readonly<Partial<Record<PersonalMemoryReviewReason, number>>>;
}

export type PersonalIntelligenceDashboardDisclosure =
  | BasicPersonalIntelligenceDashboardDisclosure
  | ProPersonalIntelligenceDashboardDisclosure
  | CreatorPersonalIntelligenceDashboardDisclosure;
