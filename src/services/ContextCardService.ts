import { memoryService } from "./memoryService";
import { eventBus } from "./eventBus";
import { MemoryNode } from "../types";

export interface ContextCard {
  id: string;
  label: string;
  type: string;
  content: string;
  memoryId?: string;
  timestamp: number;
}

class ContextCardService {
  private activeCards: ContextCard[] = [];
  private readonly MAX_CARDS = 5;
  private readonly COOLDOWN_MS = 15000; // 15 seconds visibility

  async processTranscript(text: string, source: "user" | "model") {
    // Only extract from model responses or high-confidence user input
    if (source === "user" && text.length < 10) return;

    try {
      const { entities } = await memoryService.extractEntities(text);
      if (!entities || entities.length === 0) return;

      for (const entity of entities) {
        await this.handleEntityDetected(entity);
      }
    } catch (error) {
      console.warn("[CONTEXT_CARD] Processing failed:", error);
    }
  }

  private async handleEntityDetected(entity: any) {
    const label =
      typeof entity === "string" ? entity : entity.name || entity.label;
    if (!label) return;

    // 1. Check if already active to prevent duplicates
    if (
      this.activeCards.find(
        (c) => c.label.toLowerCase() === label.toLowerCase(),
      )
    ) {
      return;
    }

    // 2. Query Memory for rich context
    const memories = await memoryService.retrieveMemory(label);
    const bestMatch =
      memories.find((m) => m.category !== "SEMANTIC") || memories[0];

    // 3. Create Card
    const card: ContextCard = {
      id: crypto.randomUUID(),
      label: label.toUpperCase(),
      type: bestMatch?.category || "ENTITY",
      content: bestMatch?.value || `Information about ${label}`,
      memoryId: bestMatch?.id,
      timestamp: Date.now(),
    };

    this.addCard(card);
  }

  private addCard(card: ContextCard) {
    // Maintain max limit
    if (this.activeCards.length >= this.MAX_CARDS) {
      this.activeCards.shift();
    }

    this.activeCards.push(card);
    this.broadcast();

    // Auto-remove after cooldown
    setTimeout(() => {
      this.removeCard(card.id);
    }, this.COOLDOWN_MS);
  }

  private removeCard(id: string) {
    this.activeCards = this.activeCards.filter((c) => c.id !== id);
    this.broadcast();
  }

  private broadcast() {
    eventBus.emit("context-cards-updated", { cards: [...this.activeCards] });
  }

  getActiveCards() {
    return [...this.activeCards];
  }
}

export const contextCardService = new ContextCardService();
