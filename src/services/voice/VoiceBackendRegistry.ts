import {
  LucaSTTBackend,
  LucaSTTBackendSnapshot,
  LucaTTSBackend,
  LucaTTSBackendSnapshot,
  LucaVoiceProviderKind,
} from "./types";

export interface VoiceBackendRegistrySnapshot {
  sttBackends: LucaSTTBackendSnapshot[];
  ttsBackends: LucaTTSBackendSnapshot[];
}

export class VoiceBackendRegistry {
  private sttBackends = new Map<string, LucaSTTBackend>();
  private ttsBackends = new Map<string, LucaTTSBackend>();

  registerSTTBackend(backend: LucaSTTBackend): void {
    this.sttBackends.set(backend.id, backend);
  }

  registerTTSBackend(backend: LucaTTSBackend): void {
    this.ttsBackends.set(backend.id, backend);
  }

  listSTTBackends(): LucaSTTBackend[] {
    return Array.from(this.sttBackends.values());
  }

  listTTSBackends(): LucaTTSBackend[] {
    return Array.from(this.ttsBackends.values());
  }

  selectSTTBackend(params: {
    id?: string;
    providerKind?: LucaVoiceProviderKind;
  }): LucaSTTBackend | undefined {
    if (params.id) {
      return this.sttBackends.get(params.id);
    }

    if (params.providerKind) {
      return this.listSTTBackends().find(
        (backend) => backend.providerKind === params.providerKind,
      );
    }

    return this.listSTTBackends()[0];
  }

  selectTTSBackend(params: {
    id?: string;
    providerKind?: LucaVoiceProviderKind;
  }): LucaTTSBackend | undefined {
    if (params.id) {
      return this.ttsBackends.get(params.id);
    }

    if (params.providerKind) {
      return this.listTTSBackends().find(
        (backend) => backend.providerKind === params.providerKind,
      );
    }

    return this.listTTSBackends()[0];
  }

  getSnapshot(): VoiceBackendRegistrySnapshot {
    return {
      sttBackends: this.listSTTBackends().map((backend) => backend.getSnapshot()),
      ttsBackends: this.listTTSBackends().map((backend) => backend.getSnapshot()),
    };
  }

  reset(): void {
    this.sttBackends.clear();
    this.ttsBackends.clear();
  }
}
