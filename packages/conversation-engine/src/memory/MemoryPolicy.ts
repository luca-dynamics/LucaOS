export class MemoryPolicy {
  public shouldRemember(prompt: string): boolean {
    const clean = prompt.toLowerCase();
    return clean.includes("remember") || clean.includes("my name is") || clean.includes("i prefer");
  }

  public shouldSummarize(turnCount: number): boolean {
    return turnCount > 10;
  }

  public shouldRetrieve(prompt: string): boolean {
    return prompt.trim().length > 3;
  }
}
