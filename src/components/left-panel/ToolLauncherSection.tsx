import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "../ui/Icon";
import { skillGovernanceService } from "../../services/skills/SkillGovernanceService";
import { skillRegistryService } from "../../services/skills/SkillRegistryService";
import { getSkillSummaryLine } from "../runtime/skillGovernanceLabels";
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
  collapseAdvancedGroups = false,
  onToolSelect,
}) => {
  const groups = useMemo(
    () => buildToolLauncherGroups(installedModules),
    [installedModules],
  );
  const skillRegistry = skillRegistryService.getDiagnosticsSummary();
  const skillGovernance = skillGovernanceService.getDiagnosticsSummary();
  const pendingSkillRequests = skillGovernance.proposedRequests + skillGovernance.approvalRequiredRequests;
  const skillSummaryLine = getSkillSummaryLine({
    registeredSkills: skillRegistry.totalSkills,
    pendingRequests: pendingSkillRequests,
    approvedWaitingRequests: skillGovernance.approvedWaitingRequests,
    blockedRequests: skillGovernance.blockedRequests,
    rejectedRevokedRequests: skillGovernance.rejectedRequests + skillGovernance.revokedRequests,
  });
  const [expanded, setExpanded] = useState<Record<ToolGroupId, boolean>>(
    getDefaultExpandedGroups,
  );

  useEffect(() => {
    if (!collapseAdvancedGroups) return;

    setExpanded((current) => ({
      ...current,
      vision: false,
      finance: false,
      visual: false,
      installed: false,
    }));
  }, [collapseAdvancedGroups]);

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
        <h2 className="font-semibold text-xs tracking-tight">Tools</h2>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
        <div className="mb-1 flex items-center justify-between gap-2">
          <div className="text-[11px] font-semibold tracking-tight text-[var(--app-text-main)]">Skills</div>
          <span className="rounded-full border border-sky-500/20 bg-sky-500/5 px-2 py-0.5 text-[9px] font-medium text-sky-200">State only</span>
        </div>
        <p className="text-[9px] leading-relaxed" style={{ color: "var(--app-text-muted)" }}>{skillSummaryLine}</p>
        <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[11px] font-semibold">
          <div className="rounded-lg border border-white/10 bg-black/10 px-2 py-1 text-[var(--app-text-main)]">{skillRegistry.totalSkills}<span className="block text-[9px] font-normal text-[var(--app-text-muted)]">registered</span></div>
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-2 py-1 text-amber-200">{pendingSkillRequests}<span className="block text-[9px] font-normal text-[var(--app-text-muted)]">pending</span></div>
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-2 py-1 text-red-200">{skillGovernance.blockedRequests}<span className="block text-[9px] font-normal text-[var(--app-text-muted)]">blocked</span></div>
        </div>
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
                  className="text-[11px] font-medium"
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
                          className="px-4 py-2.5 rounded-lg text-[11px] font-medium flex items-center justify-center gap-2.5 border glass-blur hover:opacity-90 active:opacity-100"
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
