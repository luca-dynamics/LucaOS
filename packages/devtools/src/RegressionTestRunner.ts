import { LucaRuntimeProcess } from "../../platform-runtime/src";

export interface ConversationFixture {
  id: string;
  title: string;
  userPrompt: string;
  expectedToolCalls: Array<{ toolName: string; args: Record<string, unknown> }>;
  expectedResponseSubstring: string;
  latencyBudgetsMs: Record<string, number>;
}

export class RegressionTestRunner {
  public static async runFixture(fixture: ConversationFixture): Promise<{ passed: boolean; durationMs: number; errors: string[] }> {
    const process = new LucaRuntimeProcess();
    await process.startProcess();
    const startTime = Date.now();
    const errors: string[] = [];

    let receivedText = "";

    try {
      receivedText = await process.conversationSession.executeTurn(fixture.userPrompt, {
        onPartialToken: () => {},
        onSentenceComplete: () => {},
        onCompleted: () => {},
        onError: (err) => errors.push(err.message),
      });

      if (!receivedText.toLowerCase().includes(fixture.expectedResponseSubstring.toLowerCase())) {
        errors.push(`Expected response substring '${fixture.expectedResponseSubstring}' not found in '${receivedText}'`);
      }
    } catch (err) {
      errors.push((err as Error).message);
    } finally {
      process.stopProcess();
    }

    const durationMs = Date.now() - startTime;
    return {
      passed: errors.length === 0,
      durationMs,
      errors,
    };
  }
}
