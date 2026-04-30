/**
 * Phase 10 - Checkpoint Types
 * Data structures for workflow persistence
 */

export interface Checkpoint {
  id: string;
  workflowId: string;
  timestamp: number;
  currentStep: number;
  completedSteps: number[];
  context: WorkflowContext;
  systemState?: SystemState;
}

export interface WorkflowContext {
  goal: string;
  steps: any[];
  persona?: string;
  activeTools?: string[];
}

export interface SystemState {
  memoryUsage?: number;
  activeProcesses?: number;
  timestamp: number;
}

export interface CheckpointQuery {
  workflowId?: string;
  afterTimestamp?: number;
  limit?: number;
}
