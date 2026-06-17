import type { LucaExperienceMode } from "../../experience/experienceMode";
import { createContinuitySnapshot } from "../continuity";
import {
  createMemoryControlReviewQueue,
  type PersonalMemoryReviewReason,
} from "../memoryControls";
import type { PersonalMemoryGraph } from "../memoryGraph";
import type {
  PersonalIntelligenceDashboardDisclosure,
  PersonalIntelligenceDashboardSummary,
} from "./personalIntelligenceDashboardTypes";

export interface CreatePersonalIntelligenceDashboardSummaryOptions {
  readonly mode?: LucaExperienceMode;
  readonly now?: Date;
}

const privacyReviewReasons: readonly PersonalMemoryReviewReason[] = [
  "sync_risk",
  "sensitive_confirmation",
];

export function createPersonalIntelligenceDashboardSummary(
  graph: PersonalMemoryGraph,
  options: CreatePersonalIntelligenceDashboardSummaryOptions = {},
): PersonalIntelligenceDashboardSummary {
  const mode = options.mode ?? "basic";
  const now = options.now ?? new Date();
  const continuity = createContinuitySnapshot(graph, { mode, now });
  const reviewQueue = createMemoryControlReviewQueue(graph, mode, now);
  const reviewCountByReason: Partial<Record<PersonalMemoryReviewReason, number>> = {};

  for (const item of reviewQueue.items) {
    for (const reason of item.reasons) {
      reviewCountByReason[reason] = (reviewCountByReason[reason] ?? 0) + 1;
    }
  }

  const privacyReviewCount = reviewQueue.items.filter((item) =>
    item.reasons.some((reason) => privacyReviewReasons.includes(reason)),
  ).length;
  const protectedMemoryCount = graph.nodes.filter(
    (node) =>
      node.sensitivity === "sensitive" ||
      node.sensitivity === "secret" ||
      node.privacy.redactValueInSummaries,
  ).length;

  return {
    mode,
    graphId: graph.graphId,
    activeProjectTitle: continuity.activeProject?.title ?? null,
    handoffHeadline: continuity.handoffSummary.headline,
    nextActionTitle: continuity.recommendedNextActions[0]?.title ?? null,
    openTaskCount: continuity.openTasks.length,
    blockerCount: continuity.blockers.length,
    memoryReviewCount: reviewQueue.items.length,
    privacyReviewCount,
    staleContextCount: continuity.staleContextWarnings.length,
    protectedMemoryCount,
    reviewCountByReason,
    generatedAt: continuity.generatedAt,
    previewOnly: true,
    sideEffectsPerformed: false,
  };
}

export function createPersonalIntelligenceDashboardDisclosure(
  summary: PersonalIntelligenceDashboardSummary,
): PersonalIntelligenceDashboardDisclosure {
  const safeBase = {
    previewOnly: true as const,
    sideEffectsPerformed: false as const,
  };

  if (summary.mode === "basic") {
    return {
      ...safeBase,
      mode: "basic",
      handoffHeadline: summary.handoffHeadline,
      activeProjectTitle: summary.activeProjectTitle,
      nextActionTitle: summary.nextActionTitle,
      memoryReviewCount: summary.memoryReviewCount,
      approvalMessage: "Memory changes require your approval",
      settingsMessage: "Manage memory, knowledge, and personality settings in Settings.",
    };
  }

  const operationalCounts = {
    activeProjectTitle: summary.activeProjectTitle,
    nextActionTitle: summary.nextActionTitle,
    openTaskCount: summary.openTaskCount,
    blockerCount: summary.blockerCount,
    staleContextCount: summary.staleContextCount,
    privacyReviewCount: summary.privacyReviewCount,
    memoryReviewCount: summary.memoryReviewCount,
  };

  if (summary.mode === "pro") {
    return {
      ...safeBase,
      ...operationalCounts,
      mode: "pro",
    };
  }

  return {
    ...safeBase,
    ...operationalCounts,
    mode: "creator",
    protectedMemoryCount: summary.protectedMemoryCount,
    graphId: summary.graphId,
    generatedAt: summary.generatedAt,
    reviewCountByReason: summary.reviewCountByReason,
  };
}
