interface ImportMetaEnv {
  readonly DEV?: boolean;
  readonly PROD?: boolean;
  readonly MODE?: string;
  readonly VITE_API_KEY?: string;
  readonly VITE_GEMINI_API_KEY?: string;
  readonly API_KEY?: string;
  readonly VITE_BASE_URL?: string;
  readonly VITE_GEMINI_BASE_URL?: string;
  readonly VITE_OPENAI_BASE_URL?: string;
  readonly VITE_ANTHROPIC_BASE_URL?: string;
  readonly VITE_LUCA_BUILD_TYPE?: string;
  readonly [key: string]: string | boolean | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare const __LUCA_DEV_MODE__: boolean;

/**
 * A GGUF file the user has registered with the desktop host. `sha256`, `sizeBytes`
 * and `mtimeMs` are pinned at registration and re-checked on every load, so this
 * shape is the user-visible record of *which bytes* Luca agreed to run.
 */
interface NativeGgufRegistration {
  id: string;
  modelPath: string;
  displayName: string;
  contextWindow?: number;
  sha256: string;
  sizeBytes: number;
  mtimeMs: number;
  /** True when the user supplied a checksum and the file matched it. */
  verified: boolean;
  /** ISO timestamp of explicit consent; null until the user accepts the pin. */
  consentedAt: string | null;
}

interface NativeGgufHealth {
  reachable: boolean;
  modelIds: string[];
  error?: string;
}

interface NativeGgufChatRequest {
  model: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
}

interface NativeGgufStreamEvent {
  requestId: string;
  type: "token" | "done" | "error";
  text?: string;
  error?: string;
}

interface NativeGgufApiStatus {
  running: boolean;
  host: string;
  port: number | null;
}

/**
 * What `start()` returns, and the only place the token appears. `status()`
 * deliberately cannot carry it: a token anything could poll back is not shown
 * once, it is readable forever.
 */
interface NativeGgufApiSession extends NativeGgufApiStatus {
  token: string;
}

/** Where in a document a chunk came from — pages for PDFs, paragraphs for DOCX. */
interface LocalDocsLocator {
  kind: "page" | "paragraph" | "line";
  start: number;
  end: number;
}

interface LocalDocsFolder {
  id: string;
  folderPath: string;
  displayName: string;
  createdAt: string;
  indexedAt: string | null;
  documentCount: number;
  chunkCount: number;
  totalBytes: number;
  embeddingModelId: string | null;
  embeddedAt: string | null;
  embeddedChunkCount: number;
  failures: { relativePath: string; reason: string }[];
  failureCount: number;
  watching: boolean;
}

interface LocalDocsSearchResult {
  folderId: string;
  folderName: string;
  relativePath: string;
  chunkIndex: number;
  text: string;
  locator: LocalDocsLocator | null;
  /** Reader-facing source label, already rendered: `manual.pdf, p. 3`. */
  citation: string;
  score: number;
}

interface LucaElectronBridge {
  ipcRenderer: {
    send(channel: string, data?: any): void;
    on(channel: string, func: (...args: any[]) => void): () => void;
    once(channel: string, func: (...args: any[]) => void): void;
    invoke(channel: string, ...args: any[]): Promise<any>;
  };
}

interface LucaDesktopBridge {
  platform: string;
  minimize(): void;
  maximize(): void;
  close(): void;
  onActiveWindowChange(callback: (data: any) => void): void;
  readClipboard(): Promise<string>;
  writeClipboard(text: string): Promise<void>;
  moveMouse(x: number, y: number): Promise<void>;
  clickMouse(button: string): Promise<void>;
  openScreenPermissions(): Promise<void>;
  triggerScreenPermission(): Promise<any[]>;
  nativeGguf?: {
    list(): Promise<NativeGgufRegistration[]>;
    register(input: {
      id: string;
      modelPath: string;
      displayName?: string;
      contextWindow?: number;
      sha256?: string;
    }): Promise<NativeGgufRegistration>;
    /** Accept a locally hashed model's pinned bytes so it becomes loadable. */
    consent(id: string): Promise<NativeGgufRegistration>;
    remove(id: string): Promise<boolean>;
    health(): Promise<NativeGgufHealth>;
    chat(request: NativeGgufChatRequest): Promise<string>;
    streamStart(
      requestId: string,
      request: NativeGgufChatRequest,
      callback: (event: NativeGgufStreamEvent) => void,
    ): Promise<void>;
    streamCancel(requestId: string): Promise<boolean>;
    unload(): Promise<void>;
    apiStart(port?: number): Promise<NativeGgufApiSession>;
    apiStop(): Promise<NativeGgufApiStatus>;
    apiStatus(): Promise<NativeGgufApiStatus>;
  };
  localDocs?: {
    list(): Promise<LocalDocsFolder[]>;
    register(input: { folderPath: string; displayName?: string }): Promise<LocalDocsFolder>;
    rescan(id: string): Promise<LocalDocsFolder>;
    remove(id: string): Promise<boolean>;
    embed(id: string, modelId: string): Promise<LocalDocsFolder>;
    search(request: {
      query: string;
      modelId: string;
      limit?: number;
      minScore?: number;
    }): Promise<LocalDocsSearchResult[]>;
    watchStart(id: string): Promise<boolean>;
    watchStop(id: string): Promise<boolean>;
  };
  /** Electron sandbox broker IPC (preload). Used by ElectronSandboxBrowserDriver. */
  sandbox?: {
    probe: () => Promise<unknown>;
    create: (request?: unknown) => Promise<unknown>;
    list: () => Promise<unknown>;
    listSnapshots: (sessionId: string) => Promise<unknown>;
    snapshot: (sessionId: string) => Promise<unknown>;
    cleanupExpired: () => Promise<unknown>;
    execute: (sessionId: string, command: unknown) => Promise<unknown>;
    exportArtifact: (sessionId: string, request: unknown) => Promise<unknown>;
    importArtifact: (sessionId: string, artifact: unknown) => Promise<unknown>;
    destroy: (sessionId: string) => Promise<unknown>;
  };
  vault: {
    store(site: string, username: string, password: string): Promise<any>;
    retrieve(site: string): Promise<any>;
    list(): Promise<any[]>;
    delete(site: string): Promise<void>;
    hasCredentials(site: string): Promise<boolean>;
  };
  missionControl: {
    start(title: string, metadata?: any): Promise<number>;
    addGoal(
      missionId: number,
      description: string,
      dependencyId?: number,
    ): Promise<number>;
    updateGoal(goalId: number, status: string): Promise<void>;
    getContext(): Promise<string>;
    getActive(): Promise<unknown>;
    archive(missionId: number): Promise<void>;
  };
  applySystemSettings(settings: any): void;
  connectSocial(appId: string): Promise<any>;
  getAboutInfo(): Promise<{
    version: string;
    arch: string;
    platform: string;
  }>;
  getSecureToken?(): Promise<string | null>;
  getCortexUrl?(): Promise<string | null>;
}

interface Window {
  electron: LucaElectronBridge;
  luca: LucaDesktopBridge;
  __LUCA_DEV_MODE__?: boolean;
  __LUCA_WEB_SAFE_MODE__?: {
    ok: false;
    reason: "invalid-master-key";
    message: string;
    expectedKeyFormat: string;
    keyStatus: "missing" | "invalid length" | "invalid hex" | "present but invalid";
    secureRuntimeAvailable: false;
    canMountWebUi: true;
    host: string;
    path: string;
  };
  __LUCA_CAPTURED_BOOT_ERRORS__?: string[];
}
