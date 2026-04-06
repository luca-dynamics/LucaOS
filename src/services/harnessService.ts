/**
 * Sovereign Control Harness (SCH) Service
 * 
 * Manages the "Mission Tape" - a recorded causal chain of agentic decisions,
 * tool side-effects, and environment context.
 */

export interface TapeToolCall {
  name: string;
  args: any;
  result: any;
  error?: string;
  timestamp: number;
}

export interface TapeTurn {
  id: string;
  timestamp: number;
  input: any[]; // History leading up to this turn
  response: {
    content: string;
    thought?: string;
    thought_signature?: string;
    toolCalls?: { name: string; args: any }[];
  };
  toolResults: TapeToolCall[];
}

export interface MissionTape {
  id: string;
  missionId: string;
  startTime: number;
  endTime?: number;
  metadata: Record<string, any>;
  turns: TapeTurn[];
}

export enum HarnessMode {
  OFF = "OFF",
  CAPTURE = "CAPTURE",
  SHADOW = "SHADOW", // Replay tool results from tape
}

class HarnessService {
  private mode: HarnessMode = HarnessMode.OFF;
  private currentTape: MissionTape | null = null;
  private currentTurn: TapeTurn | null = null;
  private replayPointer: number = 0;

  /**
   * Start a new Mission Tape for CAPTURE
   */
  startCapture(missionId: string, metadata: Record<string, any> = {}) {
    this.mode = HarnessMode.CAPTURE;
    this.currentTape = {
      id: `tape-${Date.now()}`,
      missionId,
      startTime: Date.now(),
      metadata,
      turns: [],
    };
    console.log(`[HARNESS] 📀 Started Mission Tape: ${this.currentTape.id} (CAPTURE)`);
  }

  /**
   * Load an existing tape for SHADOW replay
   */
  startShadow(tape: MissionTape) {
    this.mode = HarnessMode.SHADOW;
    this.currentTape = tape;
    this.replayPointer = 0;
    console.log(`[HARNESS] 🕵️ Entering SHADOW Mode: Replaying Tape ${tape.id}`);
  }

  stop() {
    if (this.currentTape) {
      this.currentTape.endTime = Date.now();
      console.log(`[HARNESS] ⏹️ Stopped Harness. Tape finalized: ${this.currentTape.id}`);
    }
    const finalTape = this.currentTape;
    this.mode = HarnessMode.OFF;
    this.currentTape = null;
    this.currentTurn = null;
    return finalTape;
  }

  getMode(): HarnessMode {
    return this.mode;
  }

  /**
   * Start recording a new turn (LLM request/response)
   */
  beginTurn(history: any[]) {
    if (this.mode !== HarnessMode.CAPTURE) return;
    
    this.currentTurn = {
      id: `turn-${Date.now()}`,
      timestamp: Date.now(),
      input: [...history], // Clone history
      response: { content: "" },
      toolResults: [],
    };
  }

  /**
   * Finalize the current turn response
   */
  endTurn(response: TapeTurn["response"]) {
    if (this.mode !== HarnessMode.CAPTURE || !this.currentTurn || !this.currentTape) return;
    
    this.currentTurn.response = response;
    this.currentTape.turns.push(this.currentTurn);
    this.currentTurn = null;
  }

  /**
   * Record a tool execution result
   */
  recordToolCall(name: string, args: any, result: any, error?: string) {
    if (this.mode !== HarnessMode.CAPTURE) return;
    
    // In current architecture, tool calls happen within a turn's tool loop
    // But since endTurn is called after the stream finishes, we might need 
    // to find the turn in the tape if it was already pushed, or keep it in currentTurn.
    
    const toolCall: TapeToolCall = {
      name,
      args,
      result,
      error,
      timestamp: Date.now(),
    };

    if (this.currentTurn) {
        this.currentTurn.toolResults.push(toolCall);
    } else if (this.currentTape && this.currentTape.turns.length > 0) {
        // Last turn in the tape
        this.currentTape.turns[this.currentTape.turns.length-1].toolResults.push(toolCall);
    }
  }

  /**
   * SHADOW MODE: Intercept tool call and return recorded result
   */
  getMockToolResult(name: string, args: any): { result: any, error?: string } | null {
    if (this.mode !== HarnessMode.SHADOW || !this.currentTape) return null;

    // Search the tape for a matching tool call starting from current turn pointer
    // This is a naive implementation; advanced versions should use order/hashes
    const turn = this.currentTape.turns[this.replayPointer];
    if (!turn) return null;

    const match = turn.toolResults.find(tr => tr.name === name && JSON.stringify(tr.args) === JSON.stringify(args));
    
    if (match) {
        console.log(`[HARNESS] [SHADOW] Intercepted ${name}. Returning recorded result.`);
        return { result: match.result, error: match.error };
    }

    return null;
  }

  advanceReplay() {
    if (this.mode === HarnessMode.SHADOW) {
        this.replayPointer++;
    }
  }
}

export const harnessService = new HarnessService();
