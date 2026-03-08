import { apiUrl } from "../config/api";

// Native Control Service - Client Side (Renderer)
// Uses Electron IPC Bridge via Preload Script

// Helper to safely access IPC (Bypassing strict type checks)
const isElectron =
  typeof window !== "undefined" &&
  (!!(window as any)["electron"] || !!(window as any).luca);

const invoke = async (channel: string, data: any) => {
  // 1. Try Electron IPC
  const target = (window as any)["electron"];
  if (target && target.ipcRenderer) {
    return await target.ipcRenderer.invoke(channel, data);
  }

  // 2. Web Fallback: Try Cortex Bridge via Node-Red API
  try {
    const res = await fetch(apiUrl("/api/control/control-unified"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel, ...data }),
    });
    const result = await res.json();
    return result.success !== undefined ? result : { success: true, result };
  } catch {
    console.warn(
      "[NativeControl] System Bridge unavailable. Ensure Cortex backend is running.",
    );
    return { success: false, error: "Bridge unavailable" };
  }
};

export const nativeControl = {
  isElectron,
  // 1. Volume Control
  setVolume: async (level: number) => {
    return await invoke("control-system", {
      action: "VOLUME_SET",
      value: level,
    });
  },

  mute: async () => {
    return await invoke("control-system", {
      action: "VOLUME_MUTE",
    });
  },

  unmute: async () => {
    return await invoke("control-system", {
      action: "VOLUME_UNMUTE",
    });
  },

  // 2. Battery & System Stats
  getBatteryStatus: async () => {
    // 1. Web Local Fallback (Local device info)
    if (
      !isElectron &&
      typeof navigator !== "undefined" &&
      (navigator as any).getBattery
    ) {
      try {
        const battery = await (navigator as any).getBattery();
        return {
          success: true,
          level: Math.round(battery.level * 100),
          isCharging: battery.charging,
        };
      } catch {
        // Continue to bridge for host battery
      }
    }

    // 2. Electron/Cortex Bridge (Host system info)
    return await invoke("control-system", {
      action: "GET_BATTERY",
    });
  },

  getSystemLoad: async () => {
    return await invoke("control-system", {
      action: "GET_SYSTEM_LOAD",
    });
  },

  // 3. Application Control
  launchApp: async (appName: string) => {
    return await invoke("control-system", {
      action: "LAUNCH_APP",
      appName,
    });
  },

  getRunningApps: async () => {
    return await invoke("control-system", {
      action: "GET_RUNNING_APPS",
    });
  },

  // 4. Media Control
  mediaPlayPause: async () => {
    return await invoke("control-system", {
      action: "MEDIA_PLAY_PAUSE",
    });
  },

  mediaNext: async () => {
    return await invoke("control-system", {
      action: "MEDIA_NEXT",
    });
  },

  mediaPrev: async () => {
    return await invoke("control-system", {
      action: "MEDIA_PREV",
    });
  },

  // 5. Hardware Casting (AirPlay/DLNA)
  startNativeCast: async (protocol: string, deviceName: string) => {
    return await invoke("control-system", {
      action: "NATIVE_CAST",
      protocol,
      deviceName,
    });
  },
};
