// IntentRoutingModeService — PR #123: Intent Routing Layer
// Persists user-selected routing mode preference.
// Does NOT execute anything. Does NOT route by itself.

import type { LucaRoutingMode } from "../../types/intentRouting";
import {
  LUCA_ROUTING_MODES,
  ROUTING_MODE_LABELS,
  ROUTING_MODE_DESCRIPTIONS,
  ROUTING_MODE_SHORT_LABELS,
} from "../../types/intentRouting";

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const STORAGE_KEY = "LUCA_INTENT_ROUTING_MODE_V1";
const DEFAULT_MODE: LucaRoutingMode = "auto";

function getStorage(): StorageLike | undefined {
  if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  if (typeof localStorage !== "undefined") return localStorage;
  return undefined;
}

function isValidMode(value: unknown): value is LucaRoutingMode {
  return typeof value === "string" && LUCA_ROUTING_MODES.includes(value as LucaRoutingMode);
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

type ModeListener = (mode: LucaRoutingMode) => void;

export class IntentRoutingModeService {
  private currentMode: LucaRoutingMode;
  private listeners: ModeListener[] = [];

  constructor(private readonly store: StorageLike | undefined = getStorage()) {
    this.currentMode = this.readPersistedMode();
  }

  getMode(): LucaRoutingMode {
    return this.currentMode;
  }

  setMode(mode: LucaRoutingMode): void {
    if (!isValidMode(mode)) return;
    this.currentMode = mode;
    this.persist();
    for (const listener of this.listeners) {
      try { listener(mode); } catch { /* swallow */ }
    }
  }

  getModeLabel(): string {
    return ROUTING_MODE_LABELS[this.currentMode] ?? ROUTING_MODE_LABELS.auto;
  }

  getModeShortLabel(): string {
    return ROUTING_MODE_SHORT_LABELS[this.currentMode] ?? ROUTING_MODE_SHORT_LABELS.auto;
  }

  getModeDescription(): string {
    return ROUTING_MODE_DESCRIPTIONS[this.currentMode] ?? ROUTING_MODE_DESCRIPTIONS.auto;
  }

  subscribe(listener: ModeListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private readPersistedMode(): LucaRoutingMode {
    try {
      const raw = this.store?.getItem(STORAGE_KEY);
      if (raw && isValidMode(raw)) return raw;
    } catch { /* ignore */ }
    return DEFAULT_MODE;
  }

  private persist(): void {
    try {
      this.store?.setItem(STORAGE_KEY, this.currentMode);
    } catch { /* ignore */ }
  }
}

export const intentRoutingModeService = new IntentRoutingModeService();
