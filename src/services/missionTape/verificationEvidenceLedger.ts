export interface EvidenceInput {
  command: string;
  passed: boolean;
  exitCode: number;
  scope?: string;
  outputSummary?: string;
  missionId?: string;
}

export interface EvidenceRecord {
  id: string;
  command: string;
  canonicalCommand: string;
  passed: boolean;
  exitCode: number;
  scope: string;
  outputSummary: string;
  missionId?: string;
  timestamp: string;
  createdAtMs: number;
  seq: number;
}

export class VerificationEvidenceLedger {
  private records = new Map<string, EvidenceRecord>();
  private seqCounter = 0;

  /**
   * Normalizes a raw command string to a canonical form (stripping flags/paths)
   */
  public canonicalizeCommand(command: string): string {
    if (!command) return "";
    return command
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  }

  /**
   * Records a new verification evidence entry
   */
  public async recordEvidence(input: EvidenceInput): Promise<EvidenceRecord> {
    this.seqCounter++;
    const now = Date.now();
    const id = `ev-${now}-${this.seqCounter}-${Math.random().toString(36).substring(2, 7)}`;
    const canonicalCommand = this.canonicalizeCommand(input.command);
    const scope = input.scope ? input.scope.replace(/\\/g, "/") : "global";

    const record: EvidenceRecord = {
      id,
      command: input.command,
      canonicalCommand,
      passed: input.passed,
      exitCode: input.exitCode,
      scope,
      outputSummary: (input.outputSummary || "").substring(0, 2000),
      missionId: input.missionId,
      timestamp: new Date(now).toISOString(),
      createdAtMs: now,
      seq: this.seqCounter,
    };

    this.records.set(id, record);
    console.log(`[EVIDENCE_LEDGER] Recorded evidence for ${canonicalCommand} (Passed: ${input.passed})`);
    return record;
  }

  /**
   * Retrieves the latest proof record for a specific command
   */
  public async getLatestProof(command: string): Promise<EvidenceRecord | null> {
    const canonical = this.canonicalizeCommand(command);
    const matches = Array.from(this.records.values())
      .filter((r) => r.canonicalCommand === canonical)
      .sort((a, b) => b.seq - a.seq);

    return matches[0] || null;
  }

  /**
   * Retrieves all verification evidence entries for a specific file or directory scope
   */
  public async getEvidenceForScope(scope: string): Promise<EvidenceRecord[]> {
    const normalizedScope = scope.replace(/\\/g, "/");
    return Array.from(this.records.values())
      .filter((r) => r.scope.includes(normalizedScope) || normalizedScope.includes(r.scope))
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }

  /**
   * Lists the most recent evidence records
   */
  public async listRecentEvidence(limit: number = 20): Promise<EvidenceRecord[]> {
    return Array.from(this.records.values())
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, limit);
  }

  /**
   * Prunes evidence records older than maxAgeDays
   */
  public async clearExpiredEvidence(maxAgeDays: number = 30): Promise<number> {
    const cutoff = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000).toISOString();
    let pruned = 0;

    for (const [id, record] of this.records.entries()) {
      if (record.timestamp < cutoff) {
        this.records.delete(id);
        pruned++;
      }
    }

    return pruned;
  }
}

export const verificationEvidenceLedger = new VerificationEvidenceLedger();
