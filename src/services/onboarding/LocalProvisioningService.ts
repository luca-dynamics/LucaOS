import type { Dispatch, SetStateAction } from "react";
import type { LocalModel } from "../ModelManagerService";
import { modelManager } from "../ModelManagerService";
import { settingsService } from "../settingsService";

export interface ProvisionTarget {
  id: string;
  label: string;
}

export interface LocalProvisionPlan {
  brain: {
    selectionId: string;
    settingModel: string;
    downloadId: string | null;
    label: string;
  };
  stt: ProvisionTarget;
  tts: ProvisionTarget;
  vision: ProvisionTarget;
  memory: ProvisionTarget;
}

export type ProvisioningOutcome =
  | "fully_ready"
  | "degraded_ready"
  | "blocked"
  | null;

export interface ProvisionDownloadState {
  progress: number;
  status: string;
}

export type LocalRecoveryStep =
  | "HARDWARE_SCAN"
  | "LOCAL_PLAN_REVIEW"
  | "OLLAMA_INSTALL"
  | "OLLAMA_WAKE"
  | "PROVISION_LOCAL";

export interface LocalProvisioningResumeState {
  step: LocalRecoveryStep;
  targetBrainModel: string | null;
  localProvisionPlan: LocalProvisionPlan | null;
  skipVisionForNow: boolean;
  showTechnicalLocalPlan: boolean;
  downloadStates: Record<string, ProvisionDownloadState>;
  provisioningOutcome: ProvisioningOutcome;
  failedProvisionKeys: string[];
  updatedAt: number;
}

export interface ProvisionRow {
  key: "brain" | "stt" | "tts" | "vision" | "memory";
  modelId: string;
  label: string;
  isExternalReady: boolean;
}

export interface LocalProvisioningSnapshot {
  downloadStates: Record<string, ProvisionDownloadState>;
  failedProvisionKeys: string[];
  provisioningOutcome: ProvisioningOutcome;
  provisionError: boolean;
  isDownloadingLocal: boolean;
  shouldAutoAdvance: boolean;
}

export type LocalHardwareResolution =
  | {
      action: "offer_ollama_install";
      targetBrainModel: string;
    }
  | {
      action: "review_local_plan";
      targetBrainModel: string;
      plan: LocalProvisionPlan;
      bypassBrainDownload: boolean;
    };

export const LOCAL_ONBOARDING_RESUME_KEY = "LUCA_LOCAL_ONBOARDING_RESUME_V1";
export const RECOVERABLE_LOCAL_STEPS: LocalRecoveryStep[] = [
  "HARDWARE_SCAN",
  "LOCAL_PLAN_REVIEW",
  "OLLAMA_INSTALL",
  "OLLAMA_WAKE",
  "PROVISION_LOCAL",
];

const BUILTIN_DOWNLOADABLE_BRAINS = [
  "qwen-2.5-7b",
  "phi-3-mini",
  "llama-3.2-1b",
];

const pickOllamaBrainModel = (modelNames: string[]): string => {
  if (
    modelNames.some(
      (name) => name.includes("qwen2.5:7b") || name.includes("qwen2.5:latest"),
    )
  ) {
    return "qwen-2.5-7b";
  }

  if (
    modelNames.some(
      (name) => name.includes("phi3:mini") || name.includes("phi3:latest"),
    )
  ) {
    return "phi-3-mini";
  }

  if (
    modelNames.some(
      (name) => name.includes("llama3.2:1b") || name.includes("llama3.2:latest"),
    )
  ) {
    return "llama-3.2-1b";
  }

  return modelNames[0];
};

const isSupportedLocalModel = (id: string): boolean => {
  const model = modelManager.getModel(id);
  return !!model && model.status !== "unsupported";
};

const selectSupportedLocalModel = (
  candidates: string[],
  fallback: string,
): string => {
  return candidates.find((id) => isSupportedLocalModel(id)) || fallback;
};

export const isRecoverableLocalStep = (
  value: string,
): value is LocalRecoveryStep =>
  RECOVERABLE_LOCAL_STEPS.includes(value as LocalRecoveryStep);

export const buildLocalProvisionPlan = (
  brainCandidate: string,
  bypassBrainDownload: boolean,
): LocalProvisionPlan => {
  const isCustomOllama =
    bypassBrainDownload &&
    !BUILTIN_DOWNLOADABLE_BRAINS.includes(brainCandidate);
  const visionId = selectSupportedLocalModel(
    ["qwen2.5-vl-3b", "moondream2", "smolvlm-500m", "ui-tars-2b"],
    "smolvlm-500m",
  );
  const sttId = selectSupportedLocalModel(
    ["whisper-v3-turbo", "whisper-tiny"],
    "whisper-tiny",
  );
  const ttsId = selectSupportedLocalModel(
    ["kokoro-82m", "piper-amy", "supertonic-2", "qwen3-tts"],
    "piper-amy",
  );
  const memoryId = selectSupportedLocalModel(
    ["mxbai-embed-large", "jina-embed-v2", "nomic-embed-text", "bge-large-en"],
    "nomic-embed-text",
  );

  return {
    brain: {
      selectionId: brainCandidate,
      settingModel: isCustomOllama ? brainCandidate : `local/${brainCandidate}`,
      downloadId: bypassBrainDownload ? null : brainCandidate,
      label: `Reasoning Core (${brainCandidate})`,
    },
    stt: {
      id: sttId,
      label:
        sttId === "whisper-v3-turbo"
          ? "Speech Recognition (Whisper Turbo)"
          : "Speech Recognition (Whisper Tiny)",
    },
    tts: {
      id: ttsId,
      label:
        ttsId === "kokoro-82m"
          ? "Speech Synthesis (Kokoro)"
          : ttsId === "qwen3-tts"
            ? "Speech Synthesis (Qwen TTS)"
            : ttsId === "supertonic-2"
              ? "Speech Synthesis (Supertonic)"
              : "Speech Synthesis (Piper)",
    },
    vision: {
      id: visionId,
      label: `Vision Core (${visionId})`,
    },
    memory: {
      id: memoryId,
      label: `Memory Embeddings (${memoryId})`,
    },
  };
};

export const resolveLocalHardwarePlan =
  async (): Promise<LocalHardwareResolution> => {
    await modelManager.refreshStatus();
    let ollamaStatus = await modelManager.getOllamaModels();

    if (ollamaStatus.available && ollamaStatus.models?.length > 0) {
      const targetBrainModel = pickOllamaBrainModel(
        ollamaStatus.models.map((model: { name: string }) => model.name),
      );
      return {
        action: "review_local_plan",
        targetBrainModel,
        plan: buildLocalProvisionPlan(targetBrainModel, true),
        bypassBrainDownload: true,
      };
    }

    const qwenStatus = modelManager.getModel("qwen-2.5-7b")?.status;
    const phiStatus = modelManager.getModel("phi-3-mini")?.status;

    let targetBrainModel = "llama-3.2-1b";
    let isHighEndHardware = false;

    if (qwenStatus && qwenStatus !== "unsupported") {
      targetBrainModel = "qwen-2.5-7b";
      isHighEndHardware = true;
    } else if (phiStatus && phiStatus !== "unsupported") {
      targetBrainModel = "phi-3-mini";
      isHighEndHardware = true;
    }

    if (!ollamaStatus.available) {
      const installed = await modelManager.isOllamaInstalled();

      if (installed) {
        const responsive = await modelManager.ensureOllamaRunning();
        if (responsive) {
          ollamaStatus = await modelManager.getOllamaModels();
          if (ollamaStatus.available && ollamaStatus.models?.length > 0) {
            const ollamaBrainModel = pickOllamaBrainModel(
              ollamaStatus.models.map((model: { name: string }) => model.name),
            );
            return {
              action: "review_local_plan",
              targetBrainModel: ollamaBrainModel,
              plan: buildLocalProvisionPlan(ollamaBrainModel, true),
              bypassBrainDownload: true,
            };
          }
        } else {
          console.warn(
            "[HardwareScan] Ollama is installed but API is unresponsive.",
          );
        }
      } else if (isHighEndHardware) {
        return {
          action: "offer_ollama_install",
          targetBrainModel,
        };
      }
    }

    return {
      action: "review_local_plan",
      targetBrainModel,
      plan: buildLocalProvisionPlan(targetBrainModel, false),
      bypassBrainDownload: false,
    };
  };

export const getProvisionDownloadIds = (
  plan: LocalProvisionPlan | null,
  options?: { includeVision?: boolean },
): string[] => {
  if (!plan) return [];
  const includeVision = options?.includeVision ?? true;
  return [
    plan.brain.downloadId,
    plan.stt.id,
    plan.tts.id,
    includeVision ? plan.vision.id : null,
    plan.memory.id,
  ].filter(Boolean) as string[];
};

export const getProvisionRows = (
  plan: LocalProvisionPlan | null,
): ProvisionRow[] => {
  if (!plan) return [];
  return [
    {
      key: "brain",
      modelId: plan.brain.downloadId ?? plan.brain.selectionId,
      label: plan.brain.label,
      isExternalReady: plan.brain.downloadId === null,
    },
    {
      key: "stt",
      modelId: plan.stt.id,
      label: plan.stt.label,
      isExternalReady: false,
    },
    {
      key: "tts",
      modelId: plan.tts.id,
      label: plan.tts.label,
      isExternalReady: false,
    },
    {
      key: "vision",
      modelId: plan.vision.id,
      label: plan.vision.label,
      isExternalReady: false,
    },
    {
      key: "memory",
      modelId: plan.memory.id,
      label: plan.memory.label,
      isExternalReady: false,
    },
  ];
};

export const startLocalProvisioning = (
  plan: LocalProvisionPlan | null,
  options?: { includeVision?: boolean },
) => {
  const modelsToEnsure = getProvisionDownloadIds(plan, options);

  modelsToEnsure.forEach((id) => {
    const model = modelManager.getModel(id);
    if (model && model.status !== "ready" && model.status !== "downloading") {
      modelManager.downloadModel(id);
    }
  });
};

export const evaluateLocalProvisioningState = (
  plan: LocalProvisionPlan | null,
  options?: {
    includeVision?: boolean;
    models?: LocalModel[];
  },
): LocalProvisioningSnapshot => {
  if (!plan) {
    return {
      downloadStates: {},
      failedProvisionKeys: [],
      provisioningOutcome: null,
      provisionError: false,
      isDownloadingLocal: false,
      shouldAutoAdvance: false,
    };
  }

  const activeTargets = getProvisionDownloadIds(plan, options);
  const activeRows = getProvisionRows(plan).filter((row) =>
    activeTargets.includes(row.modelId),
  );
  const coreProvisionKeys = new Set(["brain", "stt", "tts", "memory"]);
  const lookupModel = (id: string) =>
    options?.models?.find((model) => model.id === id) || modelManager.getModel(id);

  const downloadStates: Record<string, ProvisionDownloadState> = {};
  let allReady = activeTargets.length > 0;
  let coreReady = true;
  const failedKeys = new Set<string>();

  for (const row of activeRows) {
    const model = lookupModel(row.modelId);
    if (model) {
      downloadStates[row.modelId] = {
        progress: model.downloadProgress || 0,
        status: model.status,
      };
      if (model.status !== "ready") allReady = false;
      if (model.status === "error") failedKeys.add(row.key);
      if (coreProvisionKeys.has(row.key) && model.status !== "ready") {
        coreReady = false;
      }
    } else {
      allReady = false;
      if (coreProvisionKeys.has(row.key)) coreReady = false;
    }
  }

  const failedProvisionKeys = Array.from(failedKeys);
  const blocked = failedProvisionKeys.some((key) => coreProvisionKeys.has(key));
  const degradedReady =
    failedProvisionKeys.length === 1 &&
    failedProvisionKeys[0] === "vision" &&
    coreReady;

  if (blocked) {
    return {
      downloadStates,
      failedProvisionKeys,
      provisioningOutcome: "blocked",
      provisionError: true,
      isDownloadingLocal: false,
      shouldAutoAdvance: false,
    };
  }

  if (degradedReady) {
    return {
      downloadStates,
      failedProvisionKeys,
      provisioningOutcome: "degraded_ready",
      provisionError: false,
      isDownloadingLocal: false,
      shouldAutoAdvance: false,
    };
  }

  if (allReady) {
    return {
      downloadStates,
      failedProvisionKeys,
      provisioningOutcome: "fully_ready",
      provisionError: false,
      isDownloadingLocal: false,
      shouldAutoAdvance: true,
    };
  }

  return {
    downloadStates,
    failedProvisionKeys,
    provisioningOutcome: null,
    provisionError: false,
    isDownloadingLocal: true,
    shouldAutoAdvance: false,
  };
};

export const getProvisionRetryIds = (
  plan: LocalProvisionPlan | null,
  failedProvisionKeys: string[],
  options?: { includeVision?: boolean },
) => {
  if (!plan) return [];

  if (failedProvisionKeys.length > 0) {
    return getProvisionRows(plan)
      .filter((row) => failedProvisionKeys.includes(row.key))
      .map((row) => row.modelId);
  }

  return getProvisionDownloadIds(plan, options);
};

export const retryProvisionTargets = (
  targetIds: string[],
  setDownloadStates: Dispatch<
    SetStateAction<Record<string, ProvisionDownloadState>>
  >,
) => {
  if (targetIds.length === 0) return;

  setDownloadStates((prev) => {
    const next = { ...prev };
    targetIds.forEach((id) => {
      next[id] = { progress: 0, status: "not_downloaded" };
    });
    return next;
  });

  targetIds.forEach((id) => {
    const model = modelManager.getModel(id);
    if (
      model &&
      model.status !== "ready" &&
      model.status !== "downloading"
    ) {
      modelManager.downloadModel(id);
    }
  });
};

export const applyLocalProvisionPlan = (
  plan: LocalProvisionPlan,
  options?: { includeVision?: boolean },
) => {
  const includeVision = options?.includeVision ?? true;
  const currentBrain = settingsService.get("brain");
  const currentVoice = settingsService.get("voice");
  const currentMemory = settingsService.get("memory");

  settingsService.saveSettings({
    brain: {
      ...currentBrain,
      useCustomApiKey: false,
      model: plan.brain.settingModel,
      visionModel: includeVision ? plan.vision.id : currentBrain.visionModel,
      memoryModel: plan.memory.id,
      embeddingModel: `local/${plan.memory.id}`,
    },
    memory: {
      ...currentMemory,
      provider: "local-luca",
      model: plan.memory.id,
    },
    voice: {
      ...currentVoice,
      provider: "local-luca",
      sttModel: plan.stt.id,
      voiceId: plan.tts.id,
    },
  });
};

export const clearLocalProvisioningResume = () => {
  localStorage.removeItem(LOCAL_ONBOARDING_RESUME_KEY);
};

export const persistLocalProvisioningResume = (
  payload: LocalProvisioningResumeState,
) => {
  localStorage.setItem(LOCAL_ONBOARDING_RESUME_KEY, JSON.stringify(payload));
};

export const readLocalProvisioningResume =
  (): LocalProvisioningResumeState | null => {
    const raw = localStorage.getItem(LOCAL_ONBOARDING_RESUME_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LocalProvisioningResumeState;
  };

export const getLocalPlanDownloadBytes = (
  plan: LocalProvisionPlan | null,
  options?: { includeVision?: boolean },
): number => {
  return getProvisionDownloadIds(plan, options).reduce((total, id) => {
    const model = modelManager.getModel(id);
    return total + (model?.size || 0);
  }, 0);
};
