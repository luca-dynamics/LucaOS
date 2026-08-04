export interface SemanticFact {
  key: string;
  value: string;
  category: "preference" | "fact" | "rule";
  confidence: number;
}

export class SemanticMemory {
  private facts: Map<string, SemanticFact> = new Map();

  public setFact(key: string, value: string, category: "preference" | "fact" | "rule" = "fact"): void {
    this.facts.set(key, { key, value, category, confidence: 1.0 });
  }

  public getFact(key: string): SemanticFact | undefined {
    return this.facts.get(key);
  }

  public listFacts(): readonly SemanticFact[] {
    return Array.from(this.facts.values());
  }
}
