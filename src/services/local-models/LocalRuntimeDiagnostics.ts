import { LOCAL_MODEL_CATALOG } from "./LocalModelCatalog";
import {
  localInferenceAdmission,
  type LocalInferenceAdmission,
  type LocalInferenceAdmissionSnapshot,
} from "./LocalInferenceAdmission";
import {
  localModelLease,
  type LocalModelLease,
  type LocalModelLeaseSnapshot,
} from "./LocalModelLease";
import type { LocalModelDescriptor, LocalRuntimeKind } from "./LocalModelTypes";
import type { LocalRuntimeHealth } from "./LocalRuntimeAdapter";
import {
  localRuntimeRegistry,
  type RuntimeRegistry,
} from "./RuntimeRegistry";

export interface LocalRuntimeCatalogSummary {
  runtime: LocalRuntimeKind;
  totalModels: number;
  recommendedModels: number;
  modelIds: string[];
  runtimeModelIds: string[];
}

export interface LocalRuntimeHealthSnapshot {
  runtime: LocalRuntimeKind;
  registered: boolean;
  health?: LocalRuntimeHealth;
  error?: string;
}

export interface LocalRuntimeDiagnosticsSnapshot {
  generatedAt: number;
  registeredRuntimes: LocalRuntimeKind[];
  healthByRuntime: Partial<Record<LocalRuntimeKind, LocalRuntimeHealthSnapshot>>;
  catalogByRuntime: Partial<Record<LocalRuntimeKind, LocalRuntimeCatalogSummary>>;
  admission: LocalInferenceAdmissionSnapshot;
  leases: LocalModelLeaseSnapshot;
}

interface LocalRuntimeDiagnosticsOptions {
  registry?: RuntimeRegistry;
  admission?: LocalInferenceAdmission;
  lease?: LocalModelLease;
  catalog?: LocalModelDescriptor[];
  now?: () => number;
}

export class LocalRuntimeDiagnostics {
  private readonly registry: RuntimeRegistry;
  private readonly admission: LocalInferenceAdmission;
  private readonly lease: LocalModelLease;
  private readonly catalog: LocalModelDescriptor[];
  private readonly now: () => number;

  constructor(options: LocalRuntimeDiagnosticsOptions = {}) {
    this.registry = options.registry ?? localRuntimeRegistry;
    this.admission = options.admission ?? localInferenceAdmission;
    this.lease = options.lease ?? localModelLease;
    this.catalog = options.catalog ?? LOCAL_MODEL_CATALOG;
    this.now = options.now ?? Date.now;
  }

  async snapshot(): Promise<LocalRuntimeDiagnosticsSnapshot> {
    const registeredAdapters = this.registry.list();
    const registeredRuntimes = registeredAdapters.map((adapter) => adapter.kind);
    const healthEntries = await Promise.all(
      registeredAdapters.map(async (adapter) => {
        try {
          const health = await adapter.health();
          return [
            adapter.kind,
            {
              runtime: adapter.kind,
              registered: true,
              health,
            },
          ] as const;
        } catch (error) {
          return [
            adapter.kind,
            {
              runtime: adapter.kind,
              registered: true,
              error: errorMessage(error),
            },
          ] as const;
        }
      }),
    );

    return {
      generatedAt: this.now(),
      registeredRuntimes,
      healthByRuntime: Object.fromEntries(healthEntries),
      catalogByRuntime: this.catalogSummaryByRuntime(),
      admission: this.admission.snapshot(),
      leases: this.lease.snapshot(),
    };
  }

  private catalogSummaryByRuntime(): Partial<Record<LocalRuntimeKind, LocalRuntimeCatalogSummary>> {
    const summaries = new Map<LocalRuntimeKind, LocalRuntimeCatalogSummary>();

    for (const model of this.catalog) {
      const existing = summaries.get(model.runtime) ?? {
        runtime: model.runtime,
        totalModels: 0,
        recommendedModels: 0,
        modelIds: [],
        runtimeModelIds: [],
      };
      existing.totalModels += 1;
      if (model.recommended) existing.recommendedModels += 1;
      existing.modelIds.push(model.id);
      existing.runtimeModelIds.push(model.runtimeModelId);
      summaries.set(model.runtime, existing);
    }

    return Object.fromEntries(summaries.entries());
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export const localRuntimeDiagnostics = new LocalRuntimeDiagnostics();
