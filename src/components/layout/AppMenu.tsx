import React, { useEffect, useRef, useState } from "react";
import { Icon } from "../ui/Icon";
import {
  lucaShellClassNames,
  lucaShellHeaderGhostControlStyle,
} from "../../styles/lucaShellStyles";

/**
 * AppMenu — the hamburger at the header's left edge (Claude Desktop
 * pattern). Replaces the native menu bar removed with the window chrome:
 * File / Edit / View / Help as calm submenus. Every item is a real action;
 * nothing here is decorative.
 */

interface AppMenuProps {
  onNewSession: () => void;
  onOpenSettings: () => void;
  onToggleLeftPanel: () => void;
  onToggleRightPanel: () => void;
}

type SectionId = "file" | "edit" | "view" | "help";

interface MenuItem {
  label: string;
  action: () => void;
}

const edit = (command: string) => () => {
  try {
    document.execCommand(command);
  } catch {
    /* focused surface rejects the command — nothing to do */
  }
};

export const AppMenu: React.FC<AppMenuProps> = ({
  onNewSession,
  onOpenSettings,
  onToggleLeftPanel,
  onToggleRightPanel,
}) => {
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<SectionId | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setSection(null);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setSection(null);
      }
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    setSection(null);
  };

  const SECTIONS: Array<{ id: SectionId; label: string; items: MenuItem[] }> = [
    {
      id: "file",
      label: "File",
      items: [
        { label: "New session", action: () => { onNewSession(); close(); } },
        { label: "Settings…", action: () => { onOpenSettings(); close(); } },
        { label: "Close window", action: () => { close(); window.close(); } },
      ],
    },
    {
      id: "edit",
      label: "Edit",
      items: [
        { label: "Undo", action: edit("undo") },
        { label: "Redo", action: edit("redo") },
        { label: "Cut", action: edit("cut") },
        { label: "Copy", action: edit("copy") },
        { label: "Paste", action: edit("paste") },
        { label: "Select all", action: edit("selectAll") },
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
      id: "help",
      label: "Help",
      items: [
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
  ];

  const menuSurface: React.CSSProperties = {
    background: "var(--luca-background-elevated, var(--app-bg-main, #14181d))",
    border: "1px solid var(--luca-border-subtle, rgba(255,255,255,0.08))",
    borderRadius: 12,
    boxShadow: "0 18px 48px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)",
    padding: 4,
  };

  return (
    <div ref={rootRef} className="relative flex items-center">
      <button
        type="button"
        aria-label="Menu"
        title="Menu"
        aria-expanded={open}
        onClick={() => {
          setOpen((v) => !v);
          setSection(null);
        }}
        className={`p-1.5 rounded-lg border transition-colors ${lucaShellClassNames.control}`}
        style={lucaShellHeaderGhostControlStyle}
      >
        <Icon name="HamburgerMenu" size={16} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-[80] mt-1.5 w-[168px]"
          style={menuSurface}
        >
          {SECTIONS.map((entry) => (
            <div
              key={entry.id}
              className="relative"
              onMouseEnter={() => setSection(entry.id)}
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => setSection(section === entry.id ? null : entry.id)}
                className="flex h-8 w-full items-center rounded-lg px-3 text-[13px] text-[var(--app-text-main)] transition-colors hover:bg-[var(--luca-surface-hover,rgba(255,255,255,0.06))]"
              >
                {entry.label}
                <Icon
                  name="AltArrowRight"
                  size={13}
                  className="ml-auto text-[var(--app-text-muted)]"
                />
              </button>
              {section === entry.id && (
                <div
                  role="menu"
                  className="absolute left-full top-0 ml-1 w-[176px]"
                  style={menuSurface}
                >
                  {entry.items.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      role="menuitem"
                      onClick={item.action}
                      className="flex h-8 w-full items-center rounded-lg px-3 text-[13px] text-[var(--app-text-main)] transition-colors hover:bg-[var(--luca-surface-hover,rgba(255,255,255,0.06))]"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AppMenu;
