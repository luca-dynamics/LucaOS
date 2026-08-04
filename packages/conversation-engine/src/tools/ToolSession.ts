import { ToolPermissionPolicy } from "./ToolPermissionPolicy";

export interface ToolSessionCallbacks {
  onApprovalRequested: (toolName: string) => Promise<boolean>;
  onProgress: (status: string) => void;
  onCompleted: (result: unknown) => void;
  onError: (err: Error) => void;
}

export class ToolSession {
  public sessionId: string;
  public toolName: string;
  private isCancelled = false;

  constructor(
    toolName: string,
    public permissionPolicy: ToolPermissionPolicy,
    sessionId = "sess_tool"
  ) {
    this.toolName = toolName;
    this.sessionId = sessionId;
  }

  public async execute(
    args: Record<string, unknown>,
    executor: (args: Record<string, unknown>) => Promise<unknown>,
    callbacks: ToolSessionCallbacks
  ): Promise<unknown> {
    if (this.permissionPolicy.requiresApproval(this.toolName)) {
      callbacks.onProgress(`Requesting user approval for ${this.toolName}...`);
      const approved = await callbacks.onApprovalRequested(this.toolName);
      if (!approved) {
        const err = new Error(`User denied execution permission for tool '${this.toolName}'`);
        callbacks.onError(err);
        throw err;
      }
    }

    if (this.isCancelled) throw new Error(`Tool session for '${this.toolName}' was cancelled`);

    try {
      callbacks.onProgress(`Executing tool '${this.toolName}'...`);
      const result = await executor(args);
      
      if (!this.isCancelled) {
        callbacks.onCompleted(result);
      }
      return result;
    } catch (err) {
      callbacks.onError(err as Error);
      throw err;
    }
  }

  public cancel(): void {
    this.isCancelled = true;
  }
}
