import { WorkingMemoryTurn } from "./WorkingMemory";
import { MemoryEpisode } from "./EpisodicMemory";
import { SemanticFact } from "./SemanticMemory";

export interface ConversationContext {
  workingTurns: readonly WorkingMemoryTurn[];
  retrievedFacts: readonly SemanticFact[];
  retrievedEpisodes: readonly MemoryEpisode[];
  activeGoals: readonly string[];
  timestamp: number;
}
