export class SentenceBuilder {
  private buffer = "";

  public pushToken(token: string): string | null {
    this.buffer += token;
    
    // Match sentence termination (. ! ?) followed by space or end
    const match = this.buffer.match(/^([^.!?]+[.!?])\s*(.*)$/s);
    if (match) {
      const sentence = match[1].trim();
      this.buffer = match[2];
      return sentence;
    }

    return null;
  }

  public flush(): string | null {
    const remaining = this.buffer.trim();
    this.buffer = "";
    return remaining.length > 0 ? remaining : null;
  }

  public clear(): void {
    this.buffer = "";
  }
}
