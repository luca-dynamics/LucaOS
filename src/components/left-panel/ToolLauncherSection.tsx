import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "../ui/Icon";
import { skillGovernanceService } from "../../services/skills/SkillGovernanceService";
import { skillRegistryService } from "../../services/skills/SkillRegistryService";
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
  collapseAdvancedGroups?: boolean;
  /** When false (Basic), the pro operational suite is hidden entirely. */
  includeProTools?: boolean;
  onToolSelect: (tool: LeftPanelToolItem) => void;
}

/**
 * TOOLS section of the rail (panel-interiors-target): each space is a
 * lowercase whisper label with quiet rows beneath. Skills collapses to a
 * single quiet row (count + a tone dot only when something needs you) — the
 * old three-stat "registered / pending / blocked" card is gone. Every group
 * rests closed except Agents; the terminal zoo lives behind its whisper.
 */
const ToolLauncherSection: React.FC<ToolLauncherSectionProps> = ({
  installedModules,
  isLight,
  isLightCream,
  collapseAdvancedGroups = false,
  includeProTools = true,
  onToolSelect,
}) => {
  const groups = useMemo(
    () => buildToolLauncherGroups(installedModules, { includeProTools }),
    [installedModules, includeProTools],
  );
  const skillRegistry = skillRegistryService.getDiagnosticsSummary();
  const skillGovernance = skillGovernanceService.getDiagnosticsSummary();
  const pendingSkillRequests =
    skillGovernance.proposedRequests + skillGovernance.approvalRequiredRequests;
  const [expanded, setExpanded] = useState<Record<ToolGroupId, boolean>>(
    getDefaultExpandedGroups,
  );

  useEffect(() => {
    if (!collapseAdvancedGroups) return;
    setExpanded((current) => ({
      ...current,
      tools: false,
      memory: false,
      connections: false,
      installed: false,
    }));
  }, [collapseAdvancedGroups]);

  const toggle = (id: ToolGroupId) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const whisper: React.CSSProperties = {
    color: "var(--luca-text-tertiary, var(--app-text-muted))",
  };

  return (
    <div>
      {/* Skills — one quiet row. The dot breathes amber only when requests
          are waiting on you; otherwise it rests. Opens the skills matrix via
          the existing Agents group launcher, so no new entry point. */}
      <p className="px-2 pb-1 text-[11px]" style={whisper}>
        Skills
      </p>
      <div className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5">
        <span
          className={`h-1.5 w-1.5 flex-none rounded-full ${pendingSkillRequests > 0 ? "animate-pulse" : ""}`}
          style={{
            background:
              pendingSkillRequests > 0
                ? "var(--luca-warning, #e0b15a)"
                : "var(--luca-border-strong, rgba(255,255,255,0.18))",
          }}
          aria-hidden="true"
        />
        <span
          className="text-[12.5px]"
          style={{ color: "var(--luca-text-secondary, var(--app-text-muted))" }}
        >
          {skillRegistry.totalSkills} skills ready
        </span>
        {pendingSkillRequests > 0 && (
          <span className="ml-auto flex-none text-[11px]" style={whisper}>
            {pendingSkillRequests} waiting
          </span>
        )}
      </div>

      {groups.map((group) => {
        const isOpen = expanded[group.id];
        return (
          <div key={group.id} className="mt-2">
            <button
              type="button"
              onClick={() => toggle(group.id)}
              aria-expanded={isOpen}
              className="group/group flex w-full items-center gap-1.5 px-2 py-1"
            >
              <span className="text-[11px]" style={whisper}>
                {group.label}
              </span>
              <Icon
                name={isOpen ? "AltArrowUp" : "AltArrowDown"}
                size={11}
                variant="BoldDuotone"
                className="opacity-40 transition-opacity group-hover/group:opacity-80"
              />
            </button>

            {isOpen && (
              <div className="mt-1 flex flex-wrap gap-2 px-2">
                {group.tools.map((tool) => (
                  <ToolLauncherButton
                    key={tool.id}
                    tool={tool}
                    isLight={isLight}
                    isLightCream={isLightCream}
                    onSelect={onToolSelect}
                  />
                ))}
                {group.modules.map((mod) => (
                  <span
                    key={mod.id}
                    className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px]"
                    style={{
                      borderColor:
                        "var(--luca-border-subtle, rgba(255,255,255,0.07))",
                      color: "var(--luca-text-tertiary, var(--app-text-muted))",
                    }}
                  >
                    <Icon
                      name={mod.icon}
                      size={13}
                      variant="BoldDuotone"
                      className="flex-none opacity-60"
                    />
                    {mod.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ToolLauncherSection;
