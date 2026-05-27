import { LucaVoiceTapeRecord, LucaVoiceTapeSink, LucaVoiceTapeSinkSnapshot } from "./types";

export class VoiceInMemoryTapeSink implements LucaVoiceTapeSink {
  private readonly records: LucaVoiceTapeRecord[] = [];

  record(record: LucaVoiceTapeRecord): void {
    this.records.push({
      ...record,
      payload: { ...record.payload },
      metadata: record.metadata ? { ...record.metadata } : undefined,
    });
  }

  listRecords(sessionId?: string): LucaVoiceTapeRecord[] {
    return this.records
      .filter((record) => (sessionId ? record.sessionId === sessionId : true))
      .map((record) => ({
        ...record,
        payload: { ...record.payload },
        metadata: record.metadata ? { ...record.metadata } : undefined,
      }));
  }

  getSnapshot(sessionId?: string): LucaVoiceTapeSinkSnapshot {
    const records = this.listRecords(sessionId);

    return {
      sessionId,
      totalRecords: records.length,
      records,
    };
  }

  reset(): void {
    this.records.length = 0;
  }
}
