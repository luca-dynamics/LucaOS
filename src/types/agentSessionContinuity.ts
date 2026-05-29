export type AgentSessionMode = "chat" | "voice" | "tool_planning" | "memory_review" | "skill_review";
export type AgentSessionLifecycleState = "active" | "paused" | "resumable" | "completed" | "archived" | "quarantined";

export interface AgentSessionContinuityRecord {
  sessionId: string;
  title: string;
  mode: AgentSessionMode;
  lifecycleState: AgentSessionLifecycleState;
  lastUserIntentSummary: string;
  lastAgentStateSummary: string;
  pendingActions: string[];
  pendingApprovalIds: string[];
  relatedMemoryIds: string[];
  relatedSkillIds: string[];
  relatedJobIds: string[];
  provenanceIds: string[];
  createdAt: string;
  updatedAt: string;
  lastResumedAt?: string;
  userVisible: boolean;
  safeToResume: boolean;
}

export interface AgentSessionContinuityDiagnosticsSummary {
  totalSessions: number;
  activeSessions: number;
  resumableSessions: number;
  pausedSessions: number;
  quarantinedSessions: number;
  safeToResumeSessions: number;
}
