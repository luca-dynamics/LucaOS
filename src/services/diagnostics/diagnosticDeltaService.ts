export interface DiagnosticEntry {
  line: number;
  column: number;
  message: string;
  severity: "error" | "warning";
}

export interface DiagnosticSnapshot {
  filePath: string;
  timestamp: number;
  entries: DiagnosticEntry[];
}

export interface DiagnosticDeltaResult {
  filePath: string;
  hasRegressions: boolean;
  newErrorsCount: number;
  resolvedErrorsCount: number;
  newEntries: DiagnosticEntry[];
  alertText: string;
}

export class DiagnosticDeltaService {
  private baselines = new Map<string, DiagnosticSnapshot>();

  /**
   * Fast syntax & structural diagnostic parser for JS, TS, and JSON files
   */
  public parseDiagnostics(filePath: string, content: string): DiagnosticEntry[] {
    const entries: DiagnosticEntry[] = [];
    if (!content) return entries;

    const ext = filePath.substring(filePath.lastIndexOf(".")).toLowerCase();
    const lines = content.split("\n");

    // 1. JSON Parsing Diagnostics
    if (ext === ".json") {
      try {
        JSON.parse(content);
      } catch (err: any) {
        let line = 1;
        let column = 1;
        const match = err.message.match(/at position (\d+)/) || err.message.match(/line (\d+) column (\d+)/);
        if (match) {
          if (match[2]) {
            line = parseInt(match[1], 10);
            column = parseInt(match[2], 10);
          } else {
            const pos = parseInt(match[1], 10);
            const prefix = content.substring(0, pos);
            line = prefix.split("\n").length;
            column = pos - prefix.lastIndexOf("\n");
          }
        }
        entries.push({
          line,
          column,
          message: `JSON Syntax Error: ${err.message}`,
          severity: "error",
        });
      }
      return entries;
    }

    // 2. JS / TS Bracket & Syntax Matching Diagnostics
    const stack: { char: string; line: number; col: number }[] = [];
    const matching: Record<string, string> = { "}": "{", ")": "(", "]": "[" };

    let inString = false;
    let stringQuote = "";
    let inComment = false;

    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i];
      const lineNumber = i + 1;

      for (let col = 0; col < lineText.length; col++) {
        const char = lineText[col];
        const prevChar = col > 0 ? lineText[col - 1] : "";

        if (inComment) {
          if (char === "/" && prevChar === "*") inComment = false;
          continue;
        }

        if (inString) {
          if (char === stringQuote && prevChar !== "\\") inString = false;
          continue;
        }

        if (char === '"' || char === "'" || char === "`") {
          inString = true;
          stringQuote = char;
          continue;
        }

        if (char === "/" && col < lineText.length - 1 && lineText[col + 1] === "/") {
          break; // Single line comment
        }
        if (char === "/" && col < lineText.length - 1 && lineText[col + 1] === "*") {
          inComment = true;
          col++;
          continue;
        }

        if (char === "{" || char === "(" || char === "[") {
          stack.push({ char, line: lineNumber, col: col + 1 });
        } else if (char === "}" || char === ")" || char === "]") {
          const expected = matching[char];
          if (stack.length === 0 || stack[stack.length - 1].char !== expected) {
            entries.push({
              line: lineNumber,
              column: col + 1,
              message: `Unmatched closing bracket '${char}'`,
              severity: "error",
            });
          } else {
            stack.pop();
          }
        }
      }
    }

    // Remaining unclosed brackets on stack
    while (stack.length > 0) {
      const unclosed = stack.pop()!;
      entries.push({
        line: unclosed.line,
        column: unclosed.col,
        message: `Unclosed bracket '${unclosed.char}'`,
        severity: "error",
      });
    }

    return entries;
  }

  /**
   * Captures baseline diagnostics before a file edit tool executes
   */
  public snapshotBaseline(filePath: string, content: string): DiagnosticSnapshot {
    const entries = this.parseDiagnostics(filePath, content);
    const snapshot: DiagnosticSnapshot = {
      filePath,
      timestamp: Date.now(),
      entries,
    };
    this.baselines.set(filePath, snapshot);
    return snapshot;
  }

  /**
   * Evaluates post-edit diagnostics against baseline to calculate the Diagnostic Delta
   */
  public evaluateDelta(filePath: string, newContent: string): DiagnosticDeltaResult {
    const baseline = this.baselines.get(filePath);
    const postEntries = this.parseDiagnostics(filePath, newContent);

    if (!baseline) {
      const hasRegressions = postEntries.length > 0;
      return {
        filePath,
        hasRegressions,
        newErrorsCount: postEntries.length,
        resolvedErrorsCount: 0,
        newEntries: postEntries,
        alertText: hasRegressions
          ? `[[DIAGNOSTIC_DELTA_ALERT]] Introduced ${postEntries.length} diagnostic error(s) in ${filePath}:\n` +
            postEntries.map((e) => `  - Line ${e.line}:${e.column} -> ${e.message}`).join("\n")
          : "",
      };
    }

    const baselineMap = new Map(baseline.entries.map((e) => [`${e.line}:${e.column}:${e.message}`, e]));
    const postMap = new Map(postEntries.map((e) => [`${e.line}:${e.column}:${e.message}`, e]));

    const newEntries: DiagnosticEntry[] = [];
    for (const [key, entry] of postMap.entries()) {
      if (!baselineMap.has(key)) {
        newEntries.push(entry);
      }
    }

    let resolvedCount = 0;
    for (const [key] of baselineMap.entries()) {
      if (!postMap.has(key)) {
        resolvedCount++;
      }
    }

    const hasRegressions = newEntries.length > 0;
    let alertText = "";
    if (hasRegressions) {
      alertText =
        `[[DIAGNOSTIC_DELTA_REGRESSION]] Edit introduced ${newEntries.length} new error(s) in ${filePath}:\n` +
        newEntries.map((e) => `  - Line ${e.line}:${e.column} -> ${e.message}`).join("\n");
    } else if (resolvedCount > 0) {
      alertText = `[[DIAGNOSTIC_DELTA_FIXED]] Edit resolved ${resolvedCount} diagnostic error(s) in ${filePath}.`;
    }

    // Clean up baseline
    this.baselines.delete(filePath);

    return {
      filePath,
      hasRegressions,
      newErrorsCount: newEntries.length,
      resolvedErrorsCount: resolvedCount,
      newEntries,
      alertText,
    };
  }
}

export const diagnosticDeltaService = new DiagnosticDeltaService();
