import React, { useEffect, useState } from "react";
import { settingsService, type LucaSettings } from "../../services/settingsService";
import { modelManager, type LocalModel } from "../../services/local-models/LocalModelLibrary";
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
import {
  LucaMenu,
  LucaMenuContent,
  LucaMenuLabel,
  LucaMenuRadioGroup,
  LucaMenuRadioItem,
  LucaMenuTrigger,
} from "../ui/luca";
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
 * downward menu would fall off-screen. Keyboard, focus, dismissal, portalling
 * and layer all come from {@link LucaMenu}; these are radio menus, so the checked
 * item is Radix's to track and the hand-written `aria-checked` is gone.
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

/**
 * The menu surface, minus placement.
 *
 * LucaMenu portals the content and Floating UI positions it, so `side`/`align`/
 * `sideOffset` at the call site replace the old `bottom: calc(100% + 6px)`
 * anchor — and the layer comes from the primitive (`popover`, 300) instead of
 * the raw `zIndex: 60` this used to set, which sat *below* `LUCA_LAYER.panel`
 * and made these menus draw behind floating panels.
 */
const menuSurfaceStyle = (width: number): React.CSSProperties => ({
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
});

const GroupLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <LucaMenuLabel
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
  </LucaMenuLabel>
);

const MenuItem: React.FC<{
  value: string;
  active: boolean;
  children: React.ReactNode;
  sub?: string;
}> = ({ value, active, children, sub }) => (
  // asChild keeps this exact button: Radix supplies role="menuitemradio",
  // aria-checked, roving focus and typeahead; the appearance is untouched.
  <LucaMenuRadioItem value={value} asChild>
    <button
      type="button"
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
  </LucaMenuRadioItem>
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
    <LucaMenu open={open} onOpenChange={setOpen}>
      <div style={{ display: "inline-flex" }}>
        <LucaMenuTrigger>
          <button
            type="button"
            data-luca-command-bar-model
            title="Change intelligence model"
            className="luca-workspace-toggle"
            style={triggerStyle}
          >
            <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: 999, background: workspaceColor.accent, flex: "none" }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {resolveModelName(currentModel, localModels)}
            </span>
            <Chevron />
          </button>
        </LucaMenuTrigger>
      </div>

      <LucaMenuContent
        aria-label="Intelligence models"
        side="top"
        align="start"
        sideOffset={6}
        style={menuSurfaceStyle(244)}
      >
        <LucaMenuRadioGroup value={currentModel} onValueChange={select}>
          <GroupLabel>Cloud intelligence</GroupLabel>
          {CLOUD_MODELS.map((m) => (
            <MenuItem key={m.id} value={m.id} active={m.id === currentModel}>
              {m.name}
            </MenuItem>
          ))}

          {localModels.length > 0 && (
            <>
              <GroupLabel>Local models</GroupLabel>
              {localModels.map((m) => (
                <MenuItem key={m.id} value={m.id} active={m.id === currentModel}>
                  {m.name}
                </MenuItem>
              ))}
            </>
          )}

          <GroupLabel>Advanced</GroupLabel>
          {ADVANCED_MODELS.map((m) => (
            <MenuItem key={m.id} value={m.id} active={m.id === currentModel}>
              {m.name}
            </MenuItem>
          ))}
        </LucaMenuRadioGroup>
      </LucaMenuContent>
    </LucaMenu>
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

  useEffect(() => intentRoutingModeService.subscribe(setMode), []);

  const select = (next: LucaRoutingMode) => {
    intentRoutingModeService.setMode(next);
    setOpen(false);
  };

  // Radix hands back the raw value string; narrow it through the mode list
  // rather than casting, so an unknown value is ignored instead of written.
  const selectValue = (value: string) => {
    const next = LUCA_ROUTING_MODES.find((m) => m === value);
    if (next) select(next);
  };

  return (
    <LucaMenu open={open} onOpenChange={setOpen}>
      <div style={{ display: "inline-flex" }}>
        <LucaMenuTrigger>
          <button
            type="button"
            data-luca-command-bar-mode
            title="Response mode"
            className="luca-workspace-toggle"
            style={{ ...triggerStyle, fontWeight: 600, color: workspaceColor.ink }}
          >
            {ROUTING_MODE_SHORT_LABELS[mode]}
            <Chevron />
          </button>
        </LucaMenuTrigger>
      </div>

      <LucaMenuContent
        aria-label="Response modes"
        side="top"
        align="end"
        sideOffset={6}
        style={menuSurfaceStyle(148)}
      >
        <LucaMenuRadioGroup value={mode} onValueChange={selectValue}>
          {LUCA_ROUTING_MODES.map((m) => (
            <MenuItem key={m} value={m} active={m === mode}>
              {ROUTING_MODE_SHORT_LABELS[m]}
            </MenuItem>
          ))}
        </LucaMenuRadioGroup>
      </LucaMenuContent>
    </LucaMenu>
  );
};
