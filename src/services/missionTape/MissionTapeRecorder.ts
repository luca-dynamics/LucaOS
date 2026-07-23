import type { MissionTape } from "../missionEngine/types";
import type {
  MissionTapeGuardRecord,
  MissionTapeQuery,
  MissionTapeRecord,
  MissionTapeRecorderServiceContract,
  MissionTapeRecoveryRecord,
  MissionTapeStepRecord,
  MissionTapeStorageAdapter,
  MissionTapeVerificationRecord,
} from "./types";

/** Append payloads allow optional timestamp (filled by the recorder). */
type AppendStepInput = Omit<MissionTapeStepRecord, "timestamp"> & {
  timestamp?: string;
};
type AppendGuardInput = Omit<MissionTapeGuardRecord, "timestamp"> & {
  timestamp?: string;
};
type AppendVerificationInput = Omit<MissionTapeVerificationRecord, "timestamp"> & {
  timestamp?: string;
};
type AppendRecoveryInput = Omit<MissionTapeRecoveryRecord, "timestamp"> & {
  timestamp?: string;
};

const nowIso = () => new Date().toISOString();

class InMemoryMissionTapeStorageAdapter implements MissionTapeStorageAdapter {
  private readonly store = new Map<string, MissionTapeRecord>();

  async save(tape: MissionTapeRecord): Promise<void> {
    this.store.set(tape.missionId, tape);
  }

  async get(missionId: string): Promise<MissionTapeRecord | null> {
    return this.store.get(missionId) ?? null;
  }

  async list(query?: MissionTapeQuery): Promise<MissionTapeRecord[]> {
    let tapes = Array.from(this.store.values());

    if (query?.missionId) tapes = tapes.filter((t) => t.missionId === query.missionId);
    if (query?.status) tapes = tapes.filter((t) => t.status === query.status);
    if (query?.from) tapes = tapes.filter((t) => t.startedAt >= query.from!);
    if (query?.to) tapes = tapes.filter((t) => t.startedAt <= query.to!);

    tapes.sort((a, b) => a.startedAt.localeCompare(b.startedAt));
    if (query?.limit && query.limit > 0) tapes = tapes.slice(0, query.limit);
    return tapes;
  }
}

export class MissionTapeRecorderService implements MissionTapeRecorderServiceContract {
  constructor(private readonly storage: MissionTapeStorageAdapter = new InMemoryMissionTapeStorageAdapter()) {}

  async createTape(missionId: string, intent: string): Promise<MissionTapeRecord> {
    const tape: MissionTapeRecord = {
      missionId,
      intent,
      status: "queued",
      startedAt: nowIso(),
      steps: [],
      guard: [],
      verification: [],
      recovery: [],
    };
    await this.storage.save(tape);
    return tape;
  }

  async appendStep(missionId: string, step: AppendStepInput): Promise<void> {
    const tape = await this.requireTape(missionId);
    tape.steps.push({ ...step, timestamp: step.timestamp ?? nowIso() });
    await this.storage.save(tape);
  }

  async appendGuardDecision(missionId: string, record: AppendGuardInput): Promise<void> {
    const tape = await this.requireTape(missionId);
    tape.guard.push({ ...record, timestamp: record.timestamp ?? nowIso() });
    await this.storage.save(tape);
  }

  async appendVerification(missionId: string, record: AppendVerificationInput): Promise<void> {
    const tape = await this.requireTape(missionId);
    tape.verification.push({ ...record, timestamp: record.timestamp ?? nowIso() });
    await this.storage.save(tape);
  }

  async appendRecovery(missionId: string, record: AppendRecoveryInput): Promise<void> {
    const tape = await this.requireTape(missionId);
    tape.recovery.push({ ...record, timestamp: record.timestamp ?? nowIso() });
    await this.storage.save(tape);
  }

  async finalizeTape(missionId: string, finalData: { status: MissionTapeRecord["status"]; result?: MissionTapeRecord["result"]; completedAt?: string }): Promise<MissionTapeRecord> {
    const tape = await this.requireTape(missionId);
    tape.status = finalData.status;
    tape.result = finalData.result;
    tape.completedAt = finalData.completedAt ?? nowIso();
    await this.storage.save(tape);
    return tape;
  }

  async recordMissionTape(tape: MissionTape): Promise<void> {
    const record: MissionTapeRecord = {
      missionId: tape.missionId,
      intent: tape.intent,
      status: tape.status,
      startedAt: tape.startedAt,
      completedAt: tape.completedAt,
      steps: tape.steps.map((s) => ({ ...s, timestamp: nowIso() })),
      guard: [],
      verification: [],
      recovery: [],
      result: tape.result,
    };
    await this.storage.save(record);
  }

  async getTape(missionId: string): Promise<MissionTapeRecord | null> {
    return this.storage.get(missionId);
  }

  async listTapes(query?: MissionTapeQuery): Promise<MissionTapeRecord[]> {
    return this.storage.list(query);
  }

  private async requireTape(missionId: string): Promise<MissionTapeRecord> {
    const tape = await this.storage.get(missionId);
    if (!tape) throw new Error(`Mission tape not found: ${missionId}`);
    return tape;
  }
}

export { MissionTapeRecorderService as MissionTapeRecorder };
