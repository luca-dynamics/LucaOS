export {};

declare global {
  interface Window {
    electron: {
      ipcRenderer: {
        send(channel: string, data?: any): void;
        on(channel: string, func: (...args: any[]) => void): () => void;
        once(channel: string, func: (...args: any[]) => void): void;
        invoke(channel: string, ...args: any[]): Promise<any>;
      };
    };
    luca: {
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
        start: (title: string, metadata?: any) => Promise<number>;
        addGoal: (missionId: number, description: string, dependencyId?: number) => Promise<number>;
        updateGoal: (goalId: number, status: string) => Promise<void>;
        getContext: () => Promise<string>;
        getActive: () => Promise<unknown>;
        archive: (missionId: number) => Promise<void>;
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
      applySystemSettings(settings: any): void;
      connectSocial(appId: string): Promise<any>;
      getAboutInfo(): Promise<{ version: string; arch: string; platform: string }>;
    };
    Capacitor?: {
      isNativePlatform(): boolean;
      Plugins: any;
    };
  }
}
