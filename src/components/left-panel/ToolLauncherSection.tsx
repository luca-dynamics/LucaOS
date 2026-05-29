import React, { useMemo, useState } from "react";
import { Icon } from "../ui/Icon";
import ToolLauncherButton from "./ToolLauncherButton";
import {
  buildToolLauncherGroups,
  getDefaultExpandedGroups,
  type LeftPanelToolItem,
  type ToolGroupId,
} from "./leftPanelModel";

interface ToolLauncherSectionProps {
  installedModules: ReadonlyArray<string>;
  isLight: boolean;
  isLightCream: boolean;
  onToolSelect: (tool: LeftPanelToolItem) => void;
}

/**
 * TOOLS section of the rail. Replaces the old flat "Tools & Apps" button cloud
 * with grouped, collapsible sections (Core, Vision & Knowledge, Finance,
 * Visual Modules, Installed). All callbacks are preserved via onToolSelect.
 */
const ToolLauncherSection: React.FC<ToolLauncherSectionProps> = ({
  installedModules,
  isLight,
  isLightCream,
  onToolSelect,
}) => {
  const groups = useMemo(
    () => buildToolLauncherGroups(installedModules),
    [installedModules],
  );
  const [expanded, setExpanded] = useState<Record<ToolGroupId, boolean>>(
    getDefaultExpandedGroups,
  );

  const toggle = (id: ToolGroupId) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="space-y-4 animate-in slide-in-from-left duration-700 delay-200">
      <div
        className={`flex items-center gap-3 mb-2 text-[var(--app-text-main)] ${
          isLight ? "opacity-90" : "opacity-70"
        }`}
      >
        <Icon name="Widget" size={18} variant="BoldDuotone" />
        <h2 className="font-black tracking-widest text-xs uppercase">Tools</h2>
      </div>

      <div className="space-y-3">
        {groups.map((group) => {
          const isOpen = expanded[group.id];
          return (
            <div key={group.id} className="space-y-2.5">
              <button
                type="button"
                onClick={() => toggle(group.id)}
                aria-expanded={isOpen}
                className="w-full flex items-center justify-between gap-2 px-1 py-1 group/group"
              >
                <span
                  className="text-[10px] font-bold uppercase tracking-[0.2em]"
                  style={{ color: "var(--app-text-muted)" }}
                >
                  {group.label}
                </span>
                <Icon
                  name={isOpen ? "AltArrowUp" : "AltArrowDown"}
                  size={12}
                  variant="BoldDuotone"
                  className="opacity-60 group-hover/group:opacity-100 transition-opacity"
                />
              </button>

              {isOpen && (
                <div className="space-y-2">
                  {group.description && (
                    <p
                      className="text-[9px] leading-relaxed italic"
                      style={{ color: "var(--app-text-muted)" }}
                    >
                      {group.description}
                    </p>
                  )}

                  {group.tools.length > 0 && (
                    <div className="flex flex-wrap gap-2.5">
                      {group.tools.map((tool) => (
                        <ToolLauncherButton
                          key={tool.id}
                          tool={tool}
                          isLight={isLight}
                          isLightCream={isLightCream}
                          onSelect={onToolSelect}
                        />
                      ))}
                    </div>
                  )}

                  {group.modules.length > 0 && (
                    <div className="flex flex-wrap gap-2.5">
                      {group.modules.map((mod) => (
                        <div
                          key={mod.id}
                          className="px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2.5 tech-border glass-blur shadow-lg shadow-black/20 italic"
                          style={{
                            backgroundColor: isLight
                              ? isLightCream
                                ? "rgba(255,255,255,0.4)"
                                : "rgba(0, 0, 0, 0.05)"
                              : "rgba(0, 0, 0, 0.2)",
                            color: isLightCream ? "#4a483f" : "var(--app-text-main)",
                          }}
                        >
                          <Icon
                            name={mod.icon}
                            size={14}
                            className="opacity-50"
                            variant="BoldDuotone"
                          />
                          {mod.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ToolLauncherSection;
