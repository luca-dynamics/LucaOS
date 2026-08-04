import { WorkingMemory, WorkingMemoryTurn } from "./WorkingMemory";
import { EpisodicMemory } from "./EpisodicMemory";
import { SemanticMemory } from "./SemanticMemory";
import { MemoryPolicy } from "./MemoryPolicy";
import { ConversationContext } from "./ConversationContext";

export class MemoryCoordinator {
  public workingMemory: WorkingMemory;
  public episodicMemory: EpisodicMemory;
  public semanticMemory: SemanticMemory;
  public policy: MemoryPolicy;

  constructor() {
    this.workingMemory = new WorkingMemory();
    this.episodicMemory = new EpisodicMemory();
    this.semanticMemory = new SemanticMemory();
    this.policy = new MemoryPolicy();
  }

  public recordTurn(turn: WorkingMemoryTurn): void {
    this.workingMemory.addTurn(turn);
    if (this.policy.shouldRemember(turn.userPrompt)) {
      this.episodicMemory.recordEpisode(`User stated: ${turn.userPrompt}`);
    }
  }

  public buildContext(prompt: string): ConversationContext {
    const shouldRetrieve = this.policy.shouldRetrieve(prompt);
    return {
      workingTurns: this.workingMemory.getRecentTurns(),
      retrievedFacts: shouldRetrieve ? this.semanticMemory.listFacts() : [],
      retrievedEpisodes: shouldRetrieve ? this.episodicMemory.query() : [],
      activeGoals: this.workingMemory.getActiveGoals(),
      timestamp: Date.now(),
    };
  }
}
