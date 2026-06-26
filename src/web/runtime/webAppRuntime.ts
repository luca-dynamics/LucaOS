import {
  webChatRuntime,
  type WebChatRuntime,
} from "../chat/webChatRuntime";

/**
 * webAppRuntime — the browser-safe runtime adapter layer for the main Luca app
 * surfaces (Phase 1 foundation of "make web render the real app").
 *
 * The real desktop panels (ChatPanel, ControlPanel, Activity, Memory) import
 * the native/secure service chain (settingsService / vault / awareness) which
 * cannot run in the browser — that chain is what triggers Web Safe Mode. So the
 * web app talks to its surfaces through this typed adapter instead, exactly as
 * the onboarding flow talks through webOnboardingRuntime and chat through
 * webChatRuntime.
 *
 * This module is pure and inert: it defines the contract and a browser-safe
 * default implementation that reports HONEST states (preparing / connect in
 * settings / empty) rather than inventing data. Later phases swap in real,
 * web-safe data sources behind the same contract and mount the real surfaces;
 * nothing here performs I/O, reads storage, or mounts UI.
 */

export type WebSurfaceAvailability =
  | "preparing"
  | "connect-required"
  | "ready"
  | "unavailable";

export interface WebStatusRow {
  id: string;
  label: string;
  value: string;
  availability: WebSurfaceAvailability;
}

export interface WebControlState {
  rows: WebStatusRow[];
}

export interface WebActivityEntry {
  id: string;
  label: string;
  detail?: string;
  timestamp?: number;
}

export interface WebActivityState {
  entries: WebActivityEntry[];
  /** Shown when there are no entries (the honest default on web today). */
  emptyMessage: string;
}

export interface WebMemoryItem {
  id: string;
  label: string;
  detail?: string;
}

export interface WebMemoryState {
  items: WebMemoryItem[];
  emptyMessage: string;
}

export interface WebWorkspaceSession {
  id: string;
  title: string;
  active?: boolean;
}

export interface WebWorkspaceState {
  sessions: WebWorkspaceSession[];
  emptyMessage: string;
}

export interface WebControlStateInput {
  /** LucaLink status from WebRuntimeContext (e.g. "connector-required"). */
  lucaLinkStatus?: string;
}

/**
 * The aggregate runtime the web main shell consumes. Chat reuses the existing
 * webChatRuntime; the remaining surfaces are pure state queries so the shell
 * never hand-codes panel content.
 */
export interface WebAppRuntime {
  chat: WebChatRuntime;
  getControlState(input?: WebControlStateInput): WebControlState;
  getActivityState(): WebActivityState;
  getMemoryState(): WebMemoryState;
  getWorkspaceState(): WebWorkspaceState;
}

/** Map a raw LucaLink status string to an honest availability + display value. */
function lucaLinkRow(status: string | undefined): WebStatusRow {
  const value =
    status === "ready-to-pair"
      ? "Ready to pair"
      : status === "not-paired"
        ? "Not paired"
        : "Connector required";
  return {
    id: "lucalink",
    label: "LucaLink",
    value,
    availability: status === "ready-to-pair" ? "ready" : "connect-required",
  };
}

export const webAppRuntime: WebAppRuntime = {
  chat: webChatRuntime,

  getControlState(input) {
    return {
      rows: [
        {
          id: "luca-prime",
          label: "Luca Prime",
          value: "Preparing",
          availability: "preparing",
        },
        {
          id: "local-routes",
          label: "Local routes",
          value: "Connect in Settings",
          availability: "connect-required",
        },
        lucaLinkRow(input?.lucaLinkStatus),
      ],
    };
  },

  getActivityState() {
    return {
      entries: [],
      emptyMessage: "No activity yet. Luca will note things here as you work.",
    };
  },

  getMemoryState() {
    return {
      items: [],
      emptyMessage: "Nothing remembered yet on this device.",
    };
  },

  getWorkspaceState() {
    return {
      sessions: [{ id: "chat", title: "Chat", active: true }],
      emptyMessage: "Luca is ready. Ask anything or open a workspace.",
    };
  },
};
