import React, { useState } from "react";
import { Icon } from "../ui/Icon";
import {
  LucaMenu,
  LucaMenuContent,
  LucaMenuItem,
  LucaMenuSub,
  LucaMenuSubContent,
  LucaMenuSubTrigger,
  LucaMenuTrigger,
} from "../ui/luca";
import { isElectronShell, sendWindowControl } from "../../windowControlsOverlay";

/**
 * AppMenu: the compact shell menu at the header's left edge. It replaces the
 * removed native menu bar with File / Edit / View / Window command groups.
 *
 * Behavior comes from {@link LucaMenu}, so this file only declares commands and
 * paints. That is deliberate: as a hand-rolled menu it announced the menu role
 * without ever moving focus into it, its submenus opened on `onMouseEnter` with
 * no pointer grace (diagonal travel swapped them out mid-move), `ArrowRight` did
 * nothing despite each row rendering an `AltArrowRight` affordance, it nested a
 * menu role directly inside another one, and its `z-[80]` sat below
 * `LUCA_LAYER.panel` so it drew *behind* floating panels.
 */

interface AppMenuProps {
  onNewSession: () => void;
  onOpenSettings: () => void;
  onToggleLeftPanel: () => void;
  onToggleRightPanel: () => void;
}

type SectionId = "file" | "edit" | "view" | "window";

interface MenuItem {
  label: string;
  action: () => void;
}

const edit = (command: string, after?: () => void) => () => {
  try {
    document.execCommand(command);
  } catch {
    /* focused surface rejects the command */
  }
  after?.();
};

export const AppMenu: React.FC<AppMenuProps> = ({
  onNewSession,
  onOpenSettings,
  onToggleLeftPanel,
  onToggleRightPanel,
}) => {
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  const runWindowAction =
    (action: "minimize" | "maximize" | "close") => () => {
      sendWindowControl(action);
      if (!isElectronShell() && action === "close") {
        window.close();
      }
      close();
    };

  const SECTIONS: Array<{ id: SectionId; label: string; items: MenuItem[] }> = [
    {
      id: "file",
      label: "File",
      items: [
        { label: "New session", action: () => { onNewSession(); close(); } },
        { label: "Settings...", action: () => { onOpenSettings(); close(); } },
        {
          label: "About LucaOS",
          action: () => {
            window.dispatchEvent(
              new CustomEvent("luca:open-settings", { detail: { tab: "about" } }),
            );
            close();
          },
        },
      ],
    },
    {
      id: "edit",
      label: "Edit",
      items: [
        { label: "Undo", action: edit("undo", close) },
        { label: "Redo", action: edit("redo", close) },
        { label: "Cut", action: edit("cut", close) },
        { label: "Copy", action: edit("copy", close) },
        { label: "Paste", action: edit("paste", close) },
        { label: "Select all", action: edit("selectAll", close) },
      ],
    },
    {
      id: "view",
      label: "View",
      items: [
        { label: "Toggle sidebar", action: () => { onToggleLeftPanel(); close(); } },
        { label: "Toggle panel", action: () => { onToggleRightPanel(); close(); } },
        { label: "Reload", action: () => window.location.reload() },
      ],
    },
    {
      id: "window",
      label: "Window",
      items: [
        { label: "Minimize", action: runWindowAction("minimize") },
        { label: "Maximize or restore", action: runWindowAction("maximize") },
        { label: "Close window", action: runWindowAction("close") },
      ],
    },
  ];

  const menuSurface: React.CSSProperties = {
    background: "var(--luca-background-elevated, var(--app-bg-main, #14181d))",
    border: "1px solid var(--luca-border-subtle, rgba(255,255,255,0.08))",
    borderRadius: 12,
    boxShadow: "0 18px 48px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)",
    padding: 4,
  };

  // One row appearance for sections and commands alike. `data-highlighted` is
  // Radix's highlight — it fires for keyboard *and* pointer, so it carries the
  // same look hover always had, which is why keyboard travel is now visible at
  // all. `outline-none` because the highlight is the indicator; a focus ring on
  // top of it is not what a menu looks like on any desktop.
  const rowClassName =
    "flex h-8 w-full items-center rounded-lg px-3 text-[13px] text-[var(--app-text-main)] outline-none transition-colors hover:bg-[var(--luca-surface-hover,rgba(255,255,255,0.06))] data-[highlighted]:bg-[var(--luca-surface-hover,rgba(255,255,255,0.06))]";

  return (
    <LucaMenu open={open} onOpenChange={setOpen}>
      <div className="flex items-center">
        <LucaMenuTrigger>
          <button
            type="button"
            aria-label="Menu"
            title="Menu"
            className="luca-workspace-toggle"
            style={{
              width: 26,
              height: 26,
              display: "grid",
              placeItems: "center",
              border: 0,
              borderRadius: 7,
              background: "transparent",
              color: "var(--luca-text-tertiary, var(--app-text-muted))",
              cursor: "pointer",
            }}
          >
            <Icon name="HamburgerMenu" size={16} />
          </button>
        </LucaMenuTrigger>
      </div>

      <LucaMenuContent
        aria-label="Application menu"
        side="bottom"
        align="start"
        sideOffset={6}
        className="w-[168px]"
        style={menuSurface}
      >
        {SECTIONS.map((entry) => (
          <LucaMenuSub key={entry.id}>
            <LucaMenuSubTrigger asChild>
              <button type="button" className={rowClassName}>
                {entry.label}
                <Icon
                  name="AltArrowRight"
                  size={13}
                  className="ml-auto text-[var(--app-text-muted)]"
                />
              </button>
            </LucaMenuSubTrigger>
            <LucaMenuSubContent sideOffset={4} className="w-[176px]" style={menuSurface}>
              {entry.items.map((item) => (
                <LucaMenuItem key={item.label} asChild onSelect={item.action}>
                  <button type="button" className={rowClassName}>
                    {item.label}
                  </button>
                </LucaMenuItem>
              ))}
            </LucaMenuSubContent>
          </LucaMenuSub>
        ))}
      </LucaMenuContent>
    </LucaMenu>
  );
};

export default AppMenu;
