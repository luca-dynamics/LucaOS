import React, { useEffect, useMemo, useState } from "react";
import { ModelManager } from "../ModelManager";
import { settingsService } from "../../services/settingsService";
import RuntimeDiagnosticsPanel from "../runtime/RuntimeDiagnosticsPanel";
import {
  SettingsAdvancedDisclosure,
  SettingsCard,
  SettingsRow,
  SettingsSection,
  SettingsStatList,
} from "./SettingsLayout";
import { settingsSurfaceTokens } from "./settingsLayoutStyles";
import { LucaButton, LucaInput, LucaSelect } from "../ui/luca";
import {
  localModelLibrary,
  type LocalModel,
} from "../../services/local-models/LocalModelLibrary";
import {
  createExecutionDoctrinePreview,
  createIdentityProfilePreview,
  evaluateIntegrationReadinessPreview,
} from "../../personal-intelligence";
import {
  ExecutionDoctrinePreviewCard,
  IntegrationReadinessPreviewCard,
} from "./personalIntelligencePreview";
import {
  PreviewCardFrame,
  PreviewField,
} from "./personalIntelligencePreview/PreviewCardFrame";

interface SettingsModelManagerTabProps {
  theme: {
    primary: string;
    hex: string;
    themeName: string;
  };
  isMobile?: boolean;
}

/**
 * What Luca actually knows about a registered model's bytes, said plainly. A
 * hash Luca computed itself verifies nothing — there was nothing to compare it
 * against — so such a model stays unloadable until the person at the machine
 * accepts it. Calling that "verified" would sell a guarantee that does not exist.
 */
function describeProvenance(model: NativeGgufRegistration): string {
  const size = `${(model.sizeBytes / 1_000_000_000).toFixed(2)} GB`;
  if (model.verified) {
    return `Checksum you supplied matched · ${size} · ready to load`;
  }
  if (model.consentedAt) {
    return `You accepted these bytes on ${new Date(model.consentedAt).toLocaleDateString()} · ${size} · ready to load`;
  }
  return `Hashed by Luca, not verified against a published checksum · ${size} · will not load until you accept it`;
}

const SettingsModelManagerTab: React.FC<SettingsModelManagerTabProps> = ({
  theme,
  isMobile,
}) => {
  const [models, setModels] = useState<LocalModel[]>(() =>
    localModelLibrary.getAllModels(),
  );
  const [nativeModels, setNativeModels] = useState<NativeGgufRegistration[]>([]);
  const [nativeSha256, setNativeSha256] = useState("");
  const [nativeStatus, setNativeStatus] = useState("");
  const [localDocsFolders, setLocalDocsFolders] = useState<LocalDocsFolder[]>([]);
  const [localDocsStatus, setLocalDocsStatus] = useState("");
  const [localDocsEmbeddingModel, setLocalDocsEmbeddingModel] = useState("");
  const [nativeApi, setNativeApi] = useState<NativeGgufApiStatus>({
    running: false,
    host: "127.0.0.1",
    port: null,
  });

  useEffect(() => localModelLibrary.subscribe(setModels), []);
  useEffect(() => {
    const bridge = window.luca?.nativeGguf;
    void bridge?.list().then(setNativeModels).catch(() => setNativeModels([]));
    void bridge?.apiStatus?.().then(setNativeApi).catch(() => undefined);
    void window.luca?.localDocs?.list().then(setLocalDocsFolders).catch(() => setLocalDocsFolders([]));
  }, []);

  useEffect(() => {
    if (!localDocsEmbeddingModel && nativeModels[0]?.id) setLocalDocsEmbeddingModel(nativeModels[0].id);
  }, [localDocsEmbeddingModel, nativeModels]);

  const registerLocalDocsFolder = async () => {
    const bridge = window.luca?.localDocs;
    const ipc = window.electron?.ipcRenderer;
    if (!bridge || !ipc) {
      setLocalDocsStatus("LocalDocs folder indexing requires LucaOS Desktop.");
      return;
    }
    const folderPath = (await ipc.invoke("select-directory", { title: "Add a LocalDocs folder" })) as string | null;
    if (!folderPath) return;
    setLocalDocsStatus("Indexing supported text files...");
    try {
      await bridge.register({ folderPath });
      setLocalDocsFolders(await bridge.list());
      setLocalDocsStatus("Folder indexed locally.");
    } catch (error) {
      setLocalDocsStatus(error instanceof Error ? error.message : String(error));
    }
  };

  const rescanLocalDocsFolder = async (id: string) => {
    const bridge = window.luca?.localDocs;
    if (!bridge) return;
    setLocalDocsStatus("Checking for changed documents...");
    try {
      await bridge.rescan(id);
      setLocalDocsFolders(await bridge.list());
      setLocalDocsStatus("LocalDocs index is up to date.");
    } catch (error) {
      setLocalDocsStatus(error instanceof Error ? error.message : String(error));
    }
  };

  const removeLocalDocsFolder = async (id: string) => {
    const bridge = window.luca?.localDocs;
    if (!bridge) return;
    await bridge.remove(id);
    setLocalDocsFolders(await bridge.list());
    setLocalDocsStatus("Folder removed from LocalDocs. Source files were not changed.");
  };

  const embedLocalDocsFolder = async (id: string) => {
    const bridge = window.luca?.localDocs;
    if (!bridge || !localDocsEmbeddingModel) {
      setLocalDocsStatus("Register and select a GGUF embedding model first.");
      return;
    }
    setLocalDocsStatus("Generating local document embeddings...");
    try {
      await bridge.embed(id, localDocsEmbeddingModel);
      setLocalDocsFolders(await bridge.list());
      setLocalDocsStatus("Local embeddings are ready for retrieval.");
    } catch (error) {
      setLocalDocsStatus(error instanceof Error ? error.message : String(error));
    }
  };

  const toggleLocalDocsWatch = async (folder: LocalDocsFolder) => {
    const bridge = window.luca?.localDocs;
    if (!bridge) return;
    try {
      if (folder.watching) await bridge.watchStop(folder.id);
      else await bridge.watchStart(folder.id);
      setLocalDocsFolders(await bridge.list());
      setLocalDocsStatus(folder.watching ? "Automatic watching stopped." : "Automatic watching enabled.");
    } catch (error) {
      setLocalDocsStatus(error instanceof Error ? error.message : String(error));
    }
  };

  const toggleNativeApi = async () => {
    const bridge = window.luca?.nativeGguf;
    if (!bridge?.apiStart || !bridge?.apiStop) {
      setNativeStatus("The local API requires LucaOS Desktop.");
      return;
    }
    try {
      const status = nativeApi.running ? await bridge.apiStop() : await bridge.apiStart(4891);
      setNativeApi(status);
      setNativeStatus(
        status.running
          ? `Local API listening only on http://127.0.0.1:${status.port}/v1.`
          : "Local API stopped.",
      );
    } catch (error) {
      setNativeStatus(error instanceof Error ? error.message : String(error));
    }
  };

  const registerNativeGguf = async () => {
    const bridge = window.luca?.nativeGguf;
    const ipc = window.electron?.ipcRenderer;
    if (!bridge || !ipc) {
      setNativeStatus("Native GGUF registration requires LucaOS Desktop.");
      return;
    }
    const modelPath = (await ipc.invoke("select-file", {
      title: "Select a GGUF model",
      filters: [{ name: "GGUF models", extensions: ["gguf"] }],
    })) as string | null;
    if (!modelPath) return;
    const filename = String(modelPath).split(/[\\/]/).pop() || "local-model.gguf";
    const id = filename.replace(/\.gguf$/i, "").toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
    setNativeStatus("Hashing and registering model…");
    try {
      const registered = await bridge.register({
        id,
        modelPath,
        displayName: filename.replace(/\.gguf$/i, ""),
        sha256: nativeSha256.trim() || undefined,
      });
      setNativeModels(await bridge.list());
      setNativeStatus(
        registered.verified
          ? "GGUF registered and checksum verified."
          : "GGUF registered. Luca hashed the file itself, so it will not load until you accept those bytes below.",
      );
    } catch (error) {
      setNativeStatus(error instanceof Error ? error.message : String(error));
    }
  };

  /**
   * Accepts a model Luca hashed itself. The host re-checks the pin before
   * recording consent, so a file that changed between registration and this
   * click is refused rather than blessed.
   */
  const acceptNativeGguf = async (model: NativeGgufRegistration) => {
    const bridge = window.luca?.nativeGguf;
    if (!bridge?.consent) {
      setNativeStatus("Accepting a model requires LucaOS Desktop.");
      return;
    }
    setNativeStatus(`Re-checking ${model.displayName || model.id} before accepting…`);
    try {
      await bridge.consent(model.id);
      setNativeModels(await bridge.list());
      setNativeStatus("Model accepted. Luca will refuse to load it if these bytes change.");
    } catch (error) {
      setNativeStatus(error instanceof Error ? error.message : String(error));
    }
  };

  const librarySummary = useMemo(() => {
    const installed = models.filter((model) => model.status === "ready");
    return {
      installed: installed.length,
      total: models.length,
      storageBytes: installed.reduce((sum, model) => sum + (model.size || 0), 0),
      healthy: installed.filter((model) => model.canary?.passed !== false).length,
    };
  }, [models]);

  const recommendations = useMemo(() => {
    const supported = models.filter((model) => model.status !== "unsupported");
    const brains = supported.filter((model) => model.category === "brain");
    const smallest = [...brains].sort((a, b) => a.size - b.size)[0];
    const strongest = [...brains].sort(
      (a, b) => (b.performanceRank || 0) - (a.performanceRank || 0),
    )[0];
    const privateModel = brains.find((model) => model.status === "ready") ?? smallest;
    // No multimodal recommendation: the adapter fills LocalChatMessage.images
    // but no local runtime reads it yet, so an attached image would be silently
    // dropped. Recommending a model for work Luca cannot do is a false promise.
    return [
      { label: "Best for this device", model: strongest ?? smallest },
      { label: "Best privacy model", model: privateModel },
      { label: "Best speed model", model: smallest },
    ];
  }, [models]);

  const preferredModelsPreview = createIdentityProfilePreview({
    userId: "model-preview-user",
    displayName: "LucaOS operator",
    preferredName: "Operator",
    communicationStyle: "technical",
    lucaPersonality: {
      tone: "calm",
      traits: ["local-first"],
      boundaries: ["no-router-mutation"],
    },
    activeProjects: [],
    preferredModels: [
      "local-private",
      "multimodal-capable",
      "user-approved-cloud-fallback",
    ],
    devicePreferences: [],
    privacyDefaults: { private: "deny" },
  });
  const doctrinePreview = createExecutionDoctrinePreview();
  const readinessPreview = evaluateIntegrationReadinessPreview();

  return (
    <div className={`space-y-6 ${isMobile ? "px-0" : "pr-2"} mt-2`}>
      <SettingsSection
        title="Preferred Models Preview"
        description="Identity Core model preferences are displayed as inert metadata only."
        icon="Eye"
        accentColor={theme.hex}
        isMobile={isMobile}
      >
        <PreviewCardFrame
          title="Identity Core preferredModels"
          description="Model preference preview — router not changed."
          badges={["Preview only", "Not applied"]}
        >
          <PreviewField
            label="Preferred models"
            value={preferredModelsPreview.preferredModels.join(", ")}
          />
        </PreviewCardFrame>
      </SettingsSection>

      <SettingsSection
        title="Model Library Summary"
        description="Luca found the best local models for this device."
        icon="Cpu"
        accentColor={theme.hex}
        isMobile={isMobile}
      >
        <SettingsStatList
          items={[
            {
              label: "Installed models",
              value: `${librarySummary.installed} of ${librarySummary.total}`,
              detail:
                "Brain, vision, voice, TTS, and memory models stay grouped by capability.",
            },
            {
              label: "Available updates",
              value: `${models.filter((model) => model.status === "not_downloaded" && !model.unsupportedReason).length} installable`,
              detail:
                "Downloads and compatible upgrades remain in the model manager queue.",
            },
            {
              label: "Storage used",
              value: `${(librarySummary.storageBytes / 1_000_000_000).toFixed(1)} GB`,
              detail:
                "Downloaded GGUF and ONNX assets remain in the application data directory.",
            },
            {
              label: "Runtime health",
              value: librarySummary.installed
                ? `${librarySummary.healthy}/${librarySummary.installed} ready`
                : "No models installed",
              detail:
                "Ollama, local runtime, and CPU/GPU readiness are summarized before raw logs.",
            },
          ]}
        />
      </SettingsSection>

      <SettingsSection
        title="Recommended Models"
        description="Review Luca's suggested local models for privacy, speed, and this device."
        icon="Sparkles"
        accentColor={theme.hex}
        isMobile={isMobile}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {recommendations.map(({ label, model }) => (
            <SettingsCard key={label}>
              <p
                className="text-sm font-semibold"
                style={{ color: settingsSurfaceTokens.textPrimary }}
              >
                {label}
              </p>
              <p
                className="mt-1 text-xs leading-relaxed"
                style={{ color: settingsSurfaceTokens.textSecondary }}
              >
                {model
                  ? `${model.name} · ${model.sizeFormatted} · ${model.status === "ready" ? "Ready" : "Available to install"}`
                  : "No compatible model is available for this capability."}
              </p>
            </SettingsCard>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Native GGUF Runtime"
        description="Register GGUF files for host-native inference with no Ollama or Cortex daemon. Luca pins each file's checksum and refuses to load it if those bytes change."
        icon="HardDrive"
        accentColor={theme.hex}
        isMobile={isMobile}
      >
        <SettingsCard>
          <div className="space-y-3">
            <LucaInput
              value={nativeSha256}
              onChange={(event) => setNativeSha256(event.target.value)}
              placeholder="Expected SHA-256 (optional but recommended)"
              aria-label="Expected GGUF SHA-256"
            />
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs" style={{ color: settingsSurfaceTokens.textSecondary }}>
                {nativeModels.length} native model{nativeModels.length === 1 ? "" : "s"} registered
              </p>
              <LucaButton onClick={() => void registerNativeGguf()}>
                Register GGUF
              </LucaButton>
            </div>
            <LucaSelect
              value={localDocsEmbeddingModel}
              onChange={(event) => setLocalDocsEmbeddingModel(event.target.value)}
              aria-label="LocalDocs embedding model"
            >
              <option value="">Select a registered GGUF embedding model</option>
              {nativeModels.map((model) => (
                <option key={model.id} value={model.id}>{model.displayName || model.id}</option>
              ))}
            </LucaSelect>
            <div className="flex items-center justify-between gap-3 rounded-lg border p-3" style={{ borderColor: settingsSurfaceTokens.borderSubtle }}>
              <div>
                <p className="text-sm font-semibold" style={{ color: settingsSurfaceTokens.textPrimary }}>
                  OpenAI-compatible local API
                </p>
                <p className="text-xs" style={{ color: settingsSurfaceTokens.textSecondary }}>
                  {nativeApi.running
                    ? `Listening on 127.0.0.1:${nativeApi.port}`
                    : "Off by default; accepts non-streaming chat requests from this computer only."}
                </p>
              </div>
              <LucaButton onClick={() => void toggleNativeApi()}>
                {nativeApi.running ? "Stop API" : "Start API"}
              </LucaButton>
            </div>
            {nativeStatus && (
              <p className="text-xs" style={{ color: settingsSurfaceTokens.textSecondary }}>
                {nativeStatus}
              </p>
            )}
            {nativeModels.map((model) => {
              const loadable = model.verified || Boolean(model.consentedAt);
              return (
                <div key={model.id} className="rounded-lg border p-3" style={{ borderColor: settingsSurfaceTokens.borderSubtle }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold" style={{ color: settingsSurfaceTokens.textPrimary }}>
                        {model.displayName || model.id}
                      </p>
                      <p className="mt-1 text-xs" style={{ color: settingsSurfaceTokens.textSecondary }}>
                        {describeProvenance(model)}
                      </p>
                      <p className="mt-1 break-all text-xs" style={{ color: settingsSurfaceTokens.textSecondary }}>
                        native-gguf:{model.id} · {model.sha256}
                      </p>
                    </div>
                    {!loadable && (
                      <LucaButton
                        className="shrink-0"
                        variant="primary"
                        onClick={() => void acceptNativeGguf(model)}
                      >
                        Accept Model
                      </LucaButton>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </SettingsCard>
      </SettingsSection>

      <SettingsSection
        title="LocalDocs"
        description="Index selected folders locally so Luca can ground future answers in your own documents."
        icon="FolderSearch"
        accentColor={theme.hex}
        isMobile={isMobile}
      >
        <SettingsCard>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs" style={{ color: settingsSurfaceTokens.textSecondary }}>
                {localDocsFolders.length} folder{localDocsFolders.length === 1 ? "" : "s"} indexed · text and source files only
              </p>
              <LucaButton onClick={() => void registerLocalDocsFolder()}>
                Add Folder
              </LucaButton>
            </div>
            {localDocsStatus && (
              <p className="text-xs" style={{ color: settingsSurfaceTokens.textSecondary }}>
                {localDocsStatus}
              </p>
            )}
            {localDocsFolders.map((folder) => (
              <div key={folder.id} className="rounded-lg border p-3" style={{ borderColor: settingsSurfaceTokens.borderSubtle }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold" style={{ color: settingsSurfaceTokens.textPrimary }}>
                      {folder.displayName}
                    </p>
                    <p className="mt-1 break-all text-xs" style={{ color: settingsSurfaceTokens.textSecondary }}>
                      {folder.folderPath}
                    </p>
                    <p className="mt-1 text-xs" style={{ color: settingsSurfaceTokens.textSecondary }}>
                      {folder.documentCount} documents · {folder.chunkCount} chunks · {folder.embeddedChunkCount || 0} embedded
                    </p>
                    <p className="mt-1 text-xs" style={{ color: settingsSurfaceTokens.textSecondary }}>
                      {folder.watching ? "Watching for changes" : "Manual rescans"} · {folder.failureCount || 0} indexing failures
                    </p>
                    {folder.failures?.map((failure) => (
                      <p key={failure.relativePath} className="mt-1 break-all text-xs" style={{ color: settingsSurfaceTokens.textSecondary }}>
                        {failure.relativePath}: {failure.reason}
                      </p>
                    ))}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <LucaButton onClick={() => void toggleLocalDocsWatch(folder)}>
                      {folder.watching ? "Stop Watch" : "Auto Watch"}
                    </LucaButton>
                    <LucaButton onClick={() => void embedLocalDocsFolder(folder.id)}>
                      {folder.embeddingModelId ? "Re-embed" : "Embed"}
                    </LucaButton>
                    <LucaButton onClick={() => void rescanLocalDocsFolder(folder.id)}>Rescan</LucaButton>
                    <LucaButton onClick={() => void removeLocalDocsFolder(folder.id)}>Remove</LucaButton>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SettingsCard>
      </SettingsSection>

      <SettingsSection
        title="Installed Models"
        description="Manage Brain, Vision, Voice/STT, TTS, and embedding models without changing runtime behavior."
        icon="Library"
        accentColor={theme.hex}
        isMobile={isMobile}
      >
        <ModelManager theme={theme} isMobile={isMobile} />
      </SettingsSection>

      <SettingsSection
        title="Runtime"
        description="Confirm Ollama, local runtime, and CPU/GPU compatibility before changing low-level details."
        icon="Activity"
        accentColor={theme.hex}
        isMobile={isMobile}
      >
        <RuntimeDiagnosticsPanel title="Runtime Status" />
        {settingsService.get("general").experienceMode !== "basic" && (
          <>
            <ExecutionDoctrinePreviewCard doctrine={doctrinePreview} />
            <IntegrationReadinessPreviewCard readiness={readinessPreview} />
          </>
        )}
      </SettingsSection>

      <SettingsAdvancedDisclosure
        title="Advanced Details"
        description="Raw model IDs, model paths, runtime logs, force rescan, and cache cleanup stay here."
      >
        <SettingsRow
          label="Raw model IDs"
          description="Visible in the model manager for troubleshooting provider and local-runtime routing."
        />
        <SettingsRow
          label="Model paths"
          description="Downloaded models are stored in the application data directory."
        />
        <SettingsRow
          label="Runtime logs"
          description="Use runtime diagnostics above for detailed local runtime health."
        />
        <SettingsRow
          label="Force rescan / cache cleanup"
          description="Maintenance actions remain available where the existing model manager exposes them."
        />
      </SettingsAdvancedDisclosure>
    </div>
  );
};

export default SettingsModelManagerTab;
