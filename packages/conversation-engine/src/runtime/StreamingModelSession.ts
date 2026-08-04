export interface StreamingSessionCallbacks {
  onPartialToken: (token: string) => void;
  onSentenceComplete: (sentence: string) => void;
  onToolRequest?: (toolName: string, args: Record<string, unknown>) => Promise<unknown>;
  onCompleted: (fullText: string) => void;
  onError: (err: Error) => void;
}

export class StreamingModelSession {
  private isConnected = false;
  private isCancelled = false;

  public async connect(): Promise<void> {
    this.isConnected = true;
    this.isCancelled = false;
  }

  public cancel(): void {
    this.isCancelled = true;
    this.isConnected = false;
  }

  public active(): boolean {
    return this.isConnected && !this.isCancelled;
  }

  public close(): void {
    this.isConnected = false;
  }
}
