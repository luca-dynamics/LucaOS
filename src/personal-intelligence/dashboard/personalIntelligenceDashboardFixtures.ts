import { continuityMemoryGraphFixture } from "../continuity";
import type { PersonalMemoryGraph } from "../memoryGraph";

export const personalIntelligenceDashboardGraphFixture = continuityMemoryGraphFixture;

export const emptyPersonalIntelligenceDashboardGraphFixture: PersonalMemoryGraph = {
  graphId: "memory-graph:dashboard-empty-fixture",
  version: 1,
  nodes: [],
  edges: [],
  generatedAt: "2026-06-09T12:00:00.000Z",
};
