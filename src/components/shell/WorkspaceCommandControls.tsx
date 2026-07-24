import React, { useEffect, useRef, useState } from "react";
import { settingsService, type LucaSettings } from "../../services/settingsService";
import { modelManager, type LocalModel } from "../../services/ModelManagerService";
import {
  ANTHROPIC_CLAUDE_MODELS,
  DEEPSEEK_MODELS,
  GEMINI_MODELS,
  OPENAI_GPT_5_6_MODELS,
  XAI_GROK_MODELS,
} from "../../config/brain.config";
import { intentRoutingModeService } from "../../services/runtime/IntentRoutingModeService";
import type { LucaRoutingMode } from "../../types/intentRouting";
import {
  LUCA_ROUTING_MODES,
  ROUTING_MODE_SHORT_LABELS,
} from "../../types/intentRouting";
import { workspaceColor, workspaceRadius, workspaceType } from "./workspaceShellTokens";

/**
 * WorkspaceCommandControls — the model picker and mode selector, rebuilt in the
 * shell's own language.
 *
 * These do exactly what the legacy ChatModelSwitcher and IntentRoutingModeSelector
 * do — pick a real intelligence model (writing settings.brain.model, so the choice
 * holds everywhere) and set the routing mode (Auto · Fast · Plan · Agent through
 * intentRoutingModeService) — but they wear workspace tokens instead of the old
 * material pills, because the new command bar does not adopt the legacy chrome.
 * One behaviour, two skins; this is the skin the shell wears.
 *
 * Both open UPWARD: the command bar lives at the bottom of the canvas, so a
 * downward menu would fall off-screen. Click-outside and Escape close them.
 */

/* ── Model catalogue — the same composition Settings and the legacy switcher use,
      sourced from the shared brain config so new models flow in automatically. ── */

interface ModelEntry {
  id: string;
  name: string;
  provider: string;
}

const CLOUD_MODELS: ModelEntry[] = [
  ...OPENAI_GPT_5_6_MODELS.map((m) => ({ id: m.id, name: m.name, provider: "OpenAI" })),
  ...ANTHROPIC_CLAUDE_MODELS.map((m) => ({ id: m.id, name: m.name, provider: "Anthropic" })),
  ...GEMINI_MODELS.map((m) => ({ id: m.id, name: m.name, provider: "Google" })),
  ...DEEPSEEK_MODELS.map((m) => ({ id: m.id, name: m.name, provider: "DeepSeek" })),
  ...XAI_GROK_MODELS.map((m) => ({ id: m.id, name: m.name, provider: "xAI" })),
];

const ADVANCED_MODELS: ModelEntry[] = [
  { id: "custom", name: "Custom / External (Ollama)", provider: "Ollama" },
];

const ALL_CLOUD_MODELS = [...CLOUD_MODELS, ...ADVANCED_MODELS];

/** Close on outside-click and Escape while the menu is open. */
const useDismiss = (open: boolean, close: () => void, ref: React.RefObject<HTMLElement>) => {
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close, ref]);
};

/* ── Shared presentation ──────────────────────────────────────────────────── */

const triggerStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  maxWidth: 190,
  padding: "4px 9px",
  borderRadius: 999,
  border: `1px solid ${workspaceColor.hairline}`,
  background: "transparent",
  color: workspaceColor.ink2,
  font: "inherit",
  fontSize: workspaceType.meta,
  cursor: "pointer",
};

const Menu: React.FC<{ children: React.ReactNode; align?: "left" | "right"; width?: number }> = ({
  children,
  align = "left",
  width = 224,
}) => (
  <div
    role="menu"
    style={{
      position: "absolute",
      bottom: "calc(100% + 6px)",
      [align]: 0,
      width,
      maxHeight: 320,
      overflowY: "auto",
      padding: 6,
      borderRadius: 12,
      border: `1px solid ${workspaceColor.hairline}`,
      background:
        "color-mix(in srgb, var(--luca-surface-glass, var(--luca-background-elevated, #161d27)) 92%, transparent)",
      backdropFilter: "blur(18px) saturate(1.2)",
      WebkitBackdropFilter: "blur(18px) saturate(1.2)",
      boxShadow: "0 18px 48px rgba(0, 0, 0, 0.4)",
      zIndex: 60,
    }}
  >
    {children}
  </div>
);

const GroupLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      padding: "8px 8px 4px",
      fontSize: "9.5px",
      fontWeight: 700,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color: workspaceColor.ink3,
    }}
  >
    {children}
  </div>
);

const MenuItem: React.FC<{
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  sub?: string;
}> = ({ active, onClick, children, sub }) => (
  <button
    type="button"
    role="menuitemradio"
    aria-checked={active}
    onClick={onClick}
    className="luca-workspace-toggle"
    style={{
      display: "flex",
      alignItems: sub ? "flex-start" : "center",
      gap: 8,
      width: "100%",
      padding: "7px 8px",
      border: 0,
      borderRadius: workspaceRadius.row,
      background: active ? workspaceColor.accentSoft : "transparent",
      color: active ? workspaceColor.ink : workspaceColor.ink2,
      font: "inherit",
      fontSize: workspaceType.meta,
      textAlign: "left",
      cursor: "pointer",
    }}
  >
    <span style={{ flex: 1, minWidth: 0 }}>
      <span
        style={{
          display: "block",
          fontWeight: active ? 600 : 500,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {children}
      </span>
      {sub ? (
        <span style={{ display: "block", marginTop: 2, fontSize: "10.5px", color: workspaceColor.ink3, whiteSpace: "normal", lineHeight: 1.4 }}>
          {sub}
        </span>
      ) : null}
    </span>
    {active ? <Check /> : null}
  </button>
);

const Chevron: React.FC = () => (
  <span aria-hidden="true" style={{ fontSize: 9, opacity: 0.7, flex: "none" }}>
    ⌃
  </span>
);

const Check: React.FC = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flex: "none", marginTop: 2, color: workspaceColor.accent }}>
    <path d="M5 12.5l4.3 4.3L19 7.4" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ── Model picker ─────────────────────────────────────────────────────────── */

const resolveModelName = (currentModel: string, localModels: LocalModel[]): string => {
  const cloud = ALL_CLOUD_MODELS.find((m) => m.id === currentModel);
  if (cloud) return cloud.name;
  const local = localModels.find((m) => m.id === currentModel);
  if (local) return local.name;
  return currentModel
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
};

export const WorkspaceModelPicker: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [currentModel, setCurrentModel] = useState<string>(() => {
    try {
      return settingsService.get("brain").model;
    } catch {
      return "";
    }
  });
  const [localModels, setLocalModels] = useState<LocalModel[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  useDismiss(open, () => setOpen(false), rootRef);

  useEffect(() => {
    const onSettings = (next: LucaSettings) => setCurrentModel(next.brain.model);
    settingsService.on("settings-changed", onSettings);

    let unsub = () => {};
    void (async () => {
      try {
        const models = await modelManager.getModels();
        setLocalModels(models.filter((m) => m.category === "brain" && m.status === "ready"));
      } catch {
        /* no local models available */
      }
    })();
    try {
      unsub = modelManager.subscribe((all: LocalModel[]) =>
        setLocalModels(all.filter((m) => m.category === "brain" && m.status === "ready")),
      );
    } catch {
      /* subscription unavailable */
    }

    return () => {
      settingsService.off("settings-changed", onSettings);
      unsub();
    };
  }, []);

  const select = (id: string) => {
    try {
      settingsService.saveSettings({ brain: { ...settingsService.get("brain"), model: id } });
    } catch {
      /* ignore persistence failure; UI already reflects intent */
    }
    setOpen(false);
  };

  return (
    <div ref={rootRef} style={{ position: "relative", display: "inline-flex" }}>
      <button
        type="button"
        data-luca-command-bar-model
        aria-haspopup="menu"
        aria-expanded={open}
        title="Change intelligence model"
        onClick={() => setOpen((v) => !v)}
        className="luca-workspace-toggle"
        style={triggerStyle}
      >
        <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: 999, background: workspaceColor.accent, flex: "none" }} />
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {resolveModelName(currentModel, localModels)}
        </span>
        <Chevron />
      </button>

      {open && (
        <Menu align="left" width={244}>
          <GroupLabel>Cloud intelligence</GroupLabel>
          {CLOUD_MODELS.map((m) => (
            <MenuItem key={m.id} active={m.id === currentModel} onClick={() => select(m.id)}>
              {m.name}
            </MenuItem>
          ))}

          {localModels.length > 0 && (
            <>
              <GroupLabel>Local models</GroupLabel>
              {localModels.map((m) => (
                <MenuItem key={m.id} active={m.id === currentModel} onClick={() => select(m.id)}>
                  {m.name}
                </MenuItem>
              ))}
            </>
          )}

          <GroupLabel>Advanced</GroupLabel>
          {ADVANCED_MODELS.map((m) => (
            <MenuItem key={m.id} active={m.id === currentModel} onClick={() => select(m.id)}>
              {m.name}
            </MenuItem>
          ))}
        </Menu>
      )}
    </div>
  );
};

/* ── Mode selector — Auto · Fast · Plan · Agent ───────────────────────────── */

export const WorkspaceModeSelector: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<LucaRoutingMode>(() => {
    try {
      return intentRoutingModeService.getMode();
    } catch {
      return "auto";
    }
  });
  const rootRef = useRef<HTMLDivElement>(null);
  useDismiss(open, () => setOpen(false), rootRef);

  useEffect(() => intentRoutingModeService.subscribe(setMode), []);

  const select = (next: LucaRoutingMode) => {
    intentRoutingModeService.setMode(next);
    setOpen(false);
  };

  return (
    <div ref={rootRef} style={{ position: "relative", display: "inline-flex" }}>
      <button
        type="button"
        data-luca-command-bar-mode
        aria-haspopup="menu"
        aria-expanded={open}
        title="Response mode"
        onClick={() => setOpen((v) => !v)}
        className="luca-workspace-toggle"
        style={{ ...triggerStyle, fontWeight: 600, color: workspaceColor.ink }}
      >
        {ROUTING_MODE_SHORT_LABELS[mode]}
        <Chevron />
      </button>

      {open && (
        <Menu align="right" width={148}>
          {LUCA_ROUTING_MODES.map((m) => (
            <MenuItem key={m} active={m === mode} onClick={() => select(m)}>
              {ROUTING_MODE_SHORT_LABELS[m]}
            </MenuItem>
          ))}
        </Menu>
      )}
    </div>
  );
};
