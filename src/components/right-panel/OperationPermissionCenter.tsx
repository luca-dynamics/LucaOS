import React, { useMemo } from "react";
import {
  createOperationItemsFromSkillDryRunSimulations,
  createOperationItemsFromSkillPermissionGates,
  evaluateOperationCenterReadiness,
  operationCenterFixtureItems,
  type OperationCenterItem,
  type OperationCenterSource,
} from "../../operation-center";
import { evaluateSkillPermissionGrantReadiness } from "../../personal-intelligence/skillPermissions";
import { skillRegistryService } from "../../services/skills/SkillRegistryService";
import {
  buildSkillDryRunSimulationsFromLive,
  summarizeSkillDryRunPipeline,
} from "../../services/personalIntelligence/skillDryRunBridge";
import { useSkillPermissionGrants } from "../SkillPermissionGrantContext";
import {
  lucaMaterialCardStyle,
  lucaMaterialMetricStyle,
} from "../../styles/lucaMaterialSystem";
import RightPanelMetric from "./RightPanelMetric";
import RightPanelSection from "./RightPanelSection";
import { UnifiedMissionCenterPanel } from "../settings/UnifiedMissionCenterPanel";

interface OperationPermissionCenterProps {
  creatorMode?: boolean;
}

const label = (value: string) => value.replace(/_/g, " ");

const sourceGroups: readonly { source: OperationCenterSource; title: string }[] = [
  { source: "personal_intelligence", title: "Personal Intelligence" },
  { source: "lucalink", title: "LucaLink" },
  { source: "runtime", title: "Runtime" },
  { source: "provider_hub", title: "Provider Hub / Model Mesh" },
  { source: "system", title: "System" },
];

const STATUS_TOKEN: Record<OperationCenterItem["status"], string> = {
  ready_for_review: "--luca-info",
  approval_required: "--luca-warning",
  pending: "--luca-warning",
  granted_for_review: "--luca-success",
  denied: "--luca-danger",
  blocked: "--luca-danger",
  model_only: "--luca-accent-primary",
  read_only: "--luca-info",
  expired: "--luca-text-tertiary",
  unsupported: "--luca-text-tertiary",
  disabled: "--luca-text-tertiary",
};

const toneStyle = (tokenVar: string): React.CSSProperties => ({
  borderColor: `color-mix(in srgb, var(${tokenVar}) 32%, transparent)`,
  background: `color-mix(in srgb, var(${tokenVar}) 12%, transparent)`,
  color: `var(${tokenVar})`,
});

const dangerBox = toneStyle("--luca-danger");
const infoBox = toneStyle("--luca-info");
const neutralCardStyle = lucaMaterialCardStyle;
const neutralMetricStyle = lucaMaterialMetricStyle;

function OperationCenterCard({ item }: { item: OperationCenterItem }) {
  return (
    <article
      className="rounded-xl border p-2.5"
      style={neutralCardStyle}
      data-operation-center-item={item.itemId}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="text-[10px] font-medium leading-snug text-[var(--app-text-main)]">
            {item.title}
          </h4>
          <p className="mt-1 text-[9px] text-[var(--app-text-muted)]">
            {label(item.category)} - risk {item.riskLevel}
          </p>
        </div>
        <span
          className="shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-medium"
          style={toneStyle(STATUS_TOKEN[item.status])}
        >
          {label(item.status)}
        </span>
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-[var(--app-text-muted)]">
        {item.summary}
      </p>
      {item.requiredApprovals.length > 0 && (
        <p
          className="mt-2 text-[9px] leading-relaxed"
          style={{ color: "var(--luca-warning)" }}
        >
          <span className="font-medium">Required reviews:</span>{" "}
          {item.requiredApprovals.join(", ")}
        </p>
      )}
      {item.blockedActions.length > 0 && (
        <p
          className="mt-1 text-[9px] leading-relaxed"
          style={{ color: "var(--luca-danger)" }}
        >
          <span className="font-medium">Blocked actions:</span>{" "}
          {item.blockedActions.join(", ")}
        </p>
      )}
      <p className="mt-2 text-[8px] text-[var(--app-text-muted)]">
        Review status only - no action has run.
      </p>
    </article>
  );
}

export default function OperationPermissionCenter({
  creatorMode = false,
}: OperationPermissionCenterProps) {
  const { state } = useSkillPermissionGrants();
  const readiness = useMemo(
    () => evaluateSkillPermissionGrantReadiness(state.gates),
    [state.gates],
  );
  // Live skill dry-run pipeline (inspection only) for the operation list.
  const liveSkillPipeline = useMemo(() => {
    try {
      return buildSkillDryRunSimulationsFromLive(
        skillRegistryService.listSkills(),
        { permissionGates: state.gates, limit: 12 },
      );
    } catch {
      return null;
    }
  }, [state.gates]);
  const dryRunPipelineSummary = useMemo(
    () =>
      summarizeSkillDryRunPipeline(liveSkillPipeline?.simulations ?? []),
    [liveSkillPipeline],
  );
  const recentEvents = state.auditEvents.slice(0, 4);
  const operationItems = useMemo(() => {
    const liveDryRunItems = liveSkillPipeline
      ? createOperationItemsFromSkillDryRunSimulations(
          liveSkillPipeline.simulations,
        )
      : [];
    // Prefer live skill dry-runs over fixture skill_dry_run rows when present.
    const fixtures =
      liveDryRunItems.length > 0
        ? operationCenterFixtureItems.filter(
            (item) => item.category !== "skill_dry_run",
          )
        : operationCenterFixtureItems;
    return [
      ...fixtures,
      ...createOperationItemsFromSkillPermissionGates(state.gates),
      ...liveDryRunItems,
    ];
  }, [state.gates, liveSkillPipeline]);
  const operationReadiness = useMemo(
    () => evaluateOperationCenterReadiness(operationItems),
    [operationItems],
  );

  return (
    <div className="space-y-3" aria-label="Personal Intelligence permission center">
      {/* Unified mission control (mutations allowed) — separate from read-only Operation Center cards. */}
      <RightPanelSection
        title="Mission Center"
        subtitle="Active MissionControl mission — goals, tape, gated complete. Same path as workforce/CU."
      >
        <UnifiedMissionCenterPanel variant="compact" />
      </RightPanelSection>

      <RightPanelSection
        title="Permission center"
        subtitle={
          creatorMode
            ? "Global Personal Intelligence review gates. State is local and non-executing."
            : "Reviews and approvals that need attention."
        }
      >
        <div className="grid grid-cols-2 gap-2">
          <RightPanelMetric
            label="Pending"
            value={readiness.pending}
            tone={readiness.pending ? "warn" : "good"}
          />
          <RightPanelMetric
            label="Review grants"
            value={readiness.grantedForReview}
            tone="neutral"
          />
          {creatorMode && (
            <RightPanelMetric
              label="Denied / expired"
              value={readiness.denied + readiness.expired}
              tone={readiness.denied + readiness.expired ? "danger" : "good"}
            />
          )}
          <RightPanelMetric
            label="Blocked"
            value={readiness.blocked + readiness.requiresPrimaryApproval}
            tone={
              readiness.blocked + readiness.requiresPrimaryApproval
                ? "danger"
                : "good"
            }
          />
          {creatorMode && dryRunPipelineSummary.total > 0 && (
            <RightPanelMetric
              label={
                liveSkillPipeline?.isLive
                  ? "Live dry-runs"
                  : "Sample dry-runs"
              }
              value={dryRunPipelineSummary.total}
              tone="neutral"
            />
          )}
        </div>

        {creatorMode && (
          <>
            {(() => {
              const blockedCount =
                readiness.blocked + readiness.requiresPrimaryApproval;
              // A calm one-line summary from the real counts already computed
              // above, instead of a permanently-red, always-false flag dump —
              // the box only reads as an alert when something is actually
              // blocked.
              return blockedCount > 0 ? (
                <div className="mt-3 rounded-xl border p-3" style={dangerBox}>
                  <div className="flex items-center justify-between gap-2 text-[10px] font-medium">
                    <span>Execution readiness</span>
                    <span>Actions paused</span>
                  </div>
                  <p
                    className="mt-2 text-[10px] leading-relaxed"
                    style={{ color: "var(--luca-danger)", opacity: 0.8 }}
                  >
                    {blockedCount} action{blockedCount === 1 ? "" : "s"} need
                    {blockedCount === 1 ? "s" : ""} approval before Luca can
                    run {blockedCount === 1 ? "it" : "them"}.
                  </p>
                </div>
              ) : (
                <div className="mt-3 rounded-xl border p-3" style={neutralMetricStyle}>
                  <div className="flex items-center justify-between gap-2 text-[10px] font-medium text-[var(--app-text-muted)]">
                    <span>Execution readiness</span>
                    <span>No actions pending</span>
                  </div>
                </div>
              );
            })()}

            <div className="mt-3 space-y-1.5">
              {(
                [
                  "pending",
                  "granted_for_review",
                  "denied",
                  "expired",
                  "blocked",
                  "requires_primary_approval",
                ] as const
              ).map((status) => {
                const count = state.gates.filter(
                  (gate) => gate.status === status,
                ).length;
                return (
                  <div
                    key={status}
                    className="flex items-center justify-between rounded-lg border px-2 py-1.5 text-[10px]"
                    style={neutralMetricStyle}
                  >
                    <span className="text-[var(--app-text-muted)]">
                      {label(status)}
                    </span>
                    <span className="font-medium text-[var(--app-text-main)]">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </RightPanelSection>

      {creatorMode && (
        <>
          <RightPanelSection
            title="Operation Center"
            subtitle="Unified read-only governance summary across Personal Intelligence and LucaLink."
          >
            <div className="grid grid-cols-2 gap-2">
              <RightPanelMetric label="Total items" value={operationReadiness.totalItems} />
              <RightPanelMetric
                label="PI / LucaLink"
                value={`${operationReadiness.personalIntelligenceCount} / ${operationReadiness.lucaLinkCount}`}
              />
              <RightPanelMetric
                label="Provider Hub"
                value={operationReadiness.providerHubCount}
              />
              <RightPanelMetric
                label="Pending / review"
                value={operationReadiness.pending + operationReadiness.approvalRequired}
                tone={
                  operationReadiness.pending + operationReadiness.approvalRequired
                    ? "warn"
                    : "good"
                }
              />
              <RightPanelMetric
                label="Blocked"
                value={operationReadiness.blocked}
                tone={operationReadiness.blocked ? "danger" : "good"}
              />
              <RightPanelMetric
                label="High / critical"
                value={`${operationReadiness.highRiskCount} / ${operationReadiness.criticalRiskCount}`}
                tone={
                  operationReadiness.highRiskCount +
                    operationReadiness.criticalRiskCount
                    ? "danger"
                    : "good"
                }
              />
              <RightPanelMetric
                label="Execution readiness"
                value="blocked"
                tone="danger"
              />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-1.5 text-[9px]">
              <div className="rounded-lg border p-2" style={dangerBox}>
                Live transport: <strong>disabled</strong>
              </div>
              <div className="rounded-lg border p-2" style={dangerBox}>
                Write/install: <strong>disabled</strong>
              </div>
              <div className="col-span-2 rounded-lg border p-2" style={dangerBox}>
                Live sensor collection: <strong>disabled</strong>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              {sourceGroups.map((group) => {
                const items = operationItems.filter(
                  (item) => item.source === group.source,
                );
                if (items.length === 0) return null;
                return (
                  <section
                    key={group.source}
                    aria-label={`${group.title} operation items`}
                  >
                    <div className="mb-2 flex items-center justify-between text-[10px] font-medium text-[var(--app-text-main)]">
                      <span>{group.title}</span>
                      <span className="text-[var(--app-text-muted)]">
                        {items.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {items.map((item) => (
                        <OperationCenterCard key={item.itemId} item={item} />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>

            <div
              className="mt-4 rounded-xl border p-3 text-[9px] leading-relaxed"
              style={infoBox}
            >
              <p className="font-medium">Right-panel status is informational only.</p>
              <p className="mt-1" style={{ color: "var(--app-text-muted)" }}>
                No execution, transport send, memory write, sensor collection,
                file write, install, or model/tool call is performed.
              </p>
              <p className="mt-1" style={{ color: "var(--app-text-muted)" }}>
                Approved/review states here do not grant runtime authority.
              </p>
            </div>
          </RightPanelSection>

          <RightPanelSection
            title="Permission audit"
            subtitle="Most recent local review transitions; no persistence or runtime action."
          >
            {recentEvents.length === 0 ? (
              <p className="text-[10px] italic text-[var(--app-text-muted)]">
                No local permission review events.
              </p>
            ) : (
              <div className="space-y-2">
                {recentEvents.map((event) => (
                  <div
                    key={event.eventId}
                    className="rounded-lg border p-2"
                    style={neutralMetricStyle}
                  >
                    <p className="text-[10px] leading-relaxed text-[var(--app-text-main)]">
                      {event.summary}
                    </p>
                    <p className="mt-1 text-[9px] text-[var(--app-text-muted)]">
                      {new Date(event.occurredAt).toLocaleString()} - in memory
                      only
                    </p>
                  </div>
                ))}
              </div>
            )}
          </RightPanelSection>
        </>
      )}
    </div>
  );
}
