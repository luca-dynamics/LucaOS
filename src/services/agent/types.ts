/**
 * Agent Mode Type Definitions
 *
 * ISOLATED - Does not import from or modify any existing code
 */

// Agent Task Status
export type AgentStatus =
  | "idle"
  | "planning"
  | "executing"
  | "verifying"
  | "complete"
  | "failed"
  | "paused";

// Agent Risk Levels
export enum RiskLevel {
  SAFE = 0, // Auto-approve (e.g., read file)
  LOW = 1, // Log + auto-approve (e.g., write to workspace)
  MEDIUM = 2, // Notify + auto-approve (e.g., npm install)
  HIGH = 3, // Require approval (e.g., delete files)
  CRITICAL = 4, // Require password (e.g., system commands)
}

// Agent Limits
export interface AgentLimits {
  maxIterations: number; // Default: 50
  maxDuration: number; // Default: 30 minutes (ms)
  maxTokens: number; // Default: 500k tokens
  maxCost: number; // Default: $5 USD
}

// Agent Task
export interface AgentTask {
  id: string;
  goal: string; // "Build user auth system"
  status: AgentStatus;
  currentStep: number;
  totalSteps: number;
  workspace: string; // ~/Projects/MyApp
  createdAt: number;
  updatedAt: number;
  memory: AgentMemory;
  limits: AgentLimits;
}

// Agent Memory
export interface AgentMemory {
  context: string; // Persistent context
  learnings: string[]; // Accumulated learnings
  completedSteps: AgentStep[]; // What's been done
  failedAttempts: AgentAttempt[]; // What didn't work
}

// Agent Step
export interface AgentStep {
  id: number;
  description: string;
  status: "pending" | "in-progress" | "complete" | "failed";
  estimatedComplexity: number; // 1-10
  requiredTools: string[];
  successCriteria: string[];
  dependencies: number[]; // Step IDs that must complete first
  startedAt?: number;
  completedAt?: number;
  error?: string;
}

// Agent Attempt (for retry tracking)
export interface AgentAttempt {
  stepId: number;
  attemptNumber: number;
  error: string;
  timestamp: number;
  learning: string; // What we learned from this failure
}

// Agent Action
export interface AgentAction {
  type: string;
  description: string;
  riskLevel: RiskLevel;
  targetFiles: string[];
  command?: string;
  metadata?: Record<string, any>;
}

// Workspace Sandbox
export interface WorkspaceSandbox {
  allowedPaths: string[]; // Only these paths accessible
  deniedPaths: string[]; // Explicitly blocked
  readOnly: string[]; // Can read but not write
  requireApproval: string[]; // Need user permission
}

// Agent Configuration
export interface AgentConfig {
  enabled: boolean;
  maxIterations: number;
  maxDuration: number;
  maxTokens: number;
  maxCost: number;
  autoApprove: boolean; // Auto-approve low-risk actions
  workspaceDefault: string; // Default workspace path
  qualityGatesEnabled: boolean;
  sandbox: WorkspaceSandbox;
}

// Quality Gate Result
export interface QualityGateResult {
  passed: boolean;
  gate: string; // 'syntax' | 'tests' | 'visual' | 'security'
  errors?: string[];
  warnings?: string[];
  details?: any;
}

// Agent Events
export type AgentEvent =
  | { type: "started"; taskId: string }
  | { type: "step-started"; taskId: string; stepId: number }
  | { type: "step-completed"; taskId: string; stepId: number }
  | { type: "step-failed"; taskId: string; stepId: number; error: string }
  | { type: "paused"; taskId: string }
  | { type: "resumed"; taskId: string }
  | { type: "completed"; taskId: string }
  | { type: "failed"; taskId: string; error: string }
  | { type: "stopped"; taskId: string };

// Agent Error Types
export class AgentLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentLimitError";
  }
}

export class AgentSecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentSecurityError";
  }
}

export class AgentQualityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentQualityError";
  }
}

export class ActionDeniedError extends Error {
  constructor(message?: string) {
    super(message || "Action denied by user");
    this.name = "ActionDeniedError";
  }
}
