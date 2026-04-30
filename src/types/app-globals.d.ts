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
}
