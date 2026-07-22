/**
 * Unified Skill Marketplace — Absorb Phase 3 product surface.
 *
 * Catalog list, multi-format import, lifecycle controls, dry-run gate preview.
 * Skill execution remains disabled in this foundation pilot.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { SkillRegistryRecord } from "../../types/skillContinuity";
import {
  skillMarketplaceService,
  type SkillMarketplaceDryRun,
} from "../../services/skills/SkillMarketplaceService";
import type { PersonalIntelligenceSkillSandboxPlan } from "../../personal-intelligence/skillSandbox/skillSandboxTypes";
import { settingsSurfaceTokens } from "./settingsLayoutStyles";

export interface UnifiedSkillMarketplacePanelProps {
  variant?: "full" | "compact";
}

export const UnifiedSkillMarketplacePanel: React.FC<
  UnifiedSkillMarketplacePanelProps
> = ({ variant = "full" }) => {
  const compact = variant === "compact";
  const [skills, setSkills] = useState<SkillRegistryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [importText, setImportText] = useState("");
  const [dryRun, setDryRun] = useState<SkillMarketplaceDryRun | null>(null);
  const [sandboxPlan, setSandboxPlan] =
    useState<PersonalIntelligenceSkillSandboxPlan | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    try {
      setSkills(skillMarketplaceService.listCatalog());
    } catch {
      setSkills([]);
      setNote("Could not load skill catalog.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const diagnostics = useMemo(
    () => skillMarketplaceService.getDiagnostics(),
    [skills],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? skills.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.skillId.toLowerCase().includes(q) ||
            s.source.toLowerCase().includes(q),
        )
      : skills;
    return compact ? list.slice(0, 6) : list;
  }, [skills, query, compact]);

  const inputClass =
    "w-full rounded-lg border bg-transparent px-2.5 py-1.5 text-[11px] outline-none";
  const inputStyle: React.CSSProperties = {
    borderColor: settingsSurfaceTokens.borderSubtle,
    color: settingsSurfaceTokens.textPrimary,
  };

  const handleImport = async () => {
    if (!importText.trim() || busy) return;
    setBusy(true);
    setNote(null);
    try {
      const result = skillMarketplaceService.importLoose(importText);
      if (result.ok) {
        setNote(
          `Imported ${result.imported} skill(s)` +
            (result.detected ? ` · ${result.detected}` : "") +
            (result.skipped ? ` · skipped ${result.skipped}` : "") +
            ".",
        );
        setImportText("");
      } else {
        setNote(result.reason || "Import failed.");
      }
      refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleExport = async () => {
    setBusy(true);
    setNote(null);
    try {
      const catalog = skillMarketplaceService.exportCatalog();
      const json = JSON.stringify(catalog, null, 2);
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(json);
        setNote(`Exported ${catalog.skillCount} skill(s) to clipboard.`);
      } else {
        setImportText(json);
        setNote(`Exported ${catalog.skillCount} skill(s) into import box.`);
      }
    } catch (error) {
      setNote(error instanceof Error ? error.message : "Export failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleLifecycle = (
    skillId: string,
    action: "enable" | "disable" | "quarantine",
  ) => {
    if (busy) return;
    setBusy(true);
    setNote(null);
    try {
      if (action === "enable") skillMarketplaceService.enable(skillId);
      else if (action === "disable") skillMarketplaceService.disable(skillId);
      else skillMarketplaceService.quarantine(skillId);
      setNote(`Skill ${action}d.`);
      setDryRun(null);
      refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleDryRun = (skillId: string) => {
    const result = skillMarketplaceService.dryRun(skillId);
    setDryRun(result);
    setSandboxPlan(null);
    setNote(result?.summary ?? "Skill not found.");
  };

  const handleSandboxPlan = (skillId: string) => {
    const plan = skillMarketplaceService.planSandbox(skillId);
    setSandboxPlan(plan);
    setDryRun(null);
    setNote(
      plan
        ? `Sandbox plan: ${plan.status} · ${plan.requiredPermissions.length} permission(s) · execution disabled.`
        : "Skill not found.",
    );
  };

  const handlePackageSync = async () => {
    setBusy(true);
    setNote(null);
    try {
      const envelope = skillMarketplaceService.packageSyncEnvelope({
        fromDeviceId: "desktop",
      });
      const json = JSON.stringify(envelope, null, 2);
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(json);
        setNote(
          `Packaged ${envelope.catalog.skillCount} skill(s) as luca_skill_sync_v1 (clipboard).`,
        );
      } else {
        setImportText(json);
        setNote("Sync envelope written to import box.");
      }
    } catch (error) {
      setNote(error instanceof Error ? error.message : "Sync package failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleApplySync = () => {
    if (!importText.trim() || busy) return;
    setBusy(true);
    setNote(null);
    try {
      const result = skillMarketplaceService.applySyncPayload(importText);
      if (result.ok) {
        setNote(
          `Sync applied: imported ${result.imported}` +
            (result.detected ? ` · ${result.detected}` : "") +
            ".",
        );
        setImportText("");
      } else {
        setNote(result.reason || "Sync apply failed.");
      }
      refresh();
    } finally {
      setBusy(false);
    }
  };

  const handlePushLucaLink = async () => {
    setBusy(true);
    setNote(null);
    try {
      let link: { sendEvent?: (t: string, type: string, p: unknown) => void } | null =
        null;
      try {
        const mod = await import("../../services/lucaLink/manager");
        link = mod.lucaLinkManager as typeof link;
      } catch {
        link = null;
      }
      const result = skillMarketplaceService.pushViaLucaLink(link, {
        fromDeviceId: "desktop",
      });
      setNote(
        result.ok
          ? "Pushed skill catalog via LucaLink (soft)."
          : result.reason || "LucaLink push unavailable.",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleDemoImport = () => {
    const demo = {
      skills: [
        {
          name: "BriefWriter",
          description: "Draft short status briefs from notes",
          version: "0.1.0",
          tools: ["brief.write"],
          permissions: ["text.read"],
          tags: ["demo", "writing"],
        },
        {
          name: "CalendarHint",
          description: "Suggest focus blocks from calendar hints",
          version: "0.1.0",
          tools: ["calendar.hint"],
          permissions: ["calendar.read"],
        },
      ],
    };
    setImportText(JSON.stringify(demo, null, 2));
    setNote("Demo OpenClaw-style payload loaded — click Import skills.");
  };

  return (
    <div
      className={
        compact
          ? "mt-0 overflow-hidden rounded-xl border"
          : "mt-2 overflow-hidden rounded-2xl border"
      }
      style={{
        borderColor: settingsSurfaceTokens.borderSubtle,
        background: settingsSurfaceTokens.glass,
      }}
    >
      <div
        className={compact ? "border-b px-3 py-3" : "border-b px-4 py-4"}
        style={{ borderColor: settingsSurfaceTokens.borderSubtle }}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p
              className={
                compact ? "text-xs font-semibold" : "text-sm font-semibold"
              }
              style={{ color: settingsSurfaceTokens.textPrimary }}
            >
              Skill Marketplace
            </p>
            {!compact && (
              <p
                className="mt-1 text-xs leading-relaxed"
                style={{ color: settingsSurfaceTokens.textSecondary }}
              >
                Absorb Phase 3: import OpenClaw / Claude tools / MCP server
                catalogs, manage lifecycle, dry-run gates. Auto-execution stays
                off.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => refresh()}
            disabled={loading || busy}
            className="rounded-full border px-2.5 py-1 text-[11px] font-medium disabled:opacity-50"
            style={{
              borderColor: settingsSurfaceTokens.borderSubtle,
              color: settingsSurfaceTokens.textSecondary,
            }}
          >
            {loading ? "…" : "Refresh"}
          </button>
        </div>
      </div>

      <div className={compact ? "space-y-3 p-3" : "space-y-4 p-4"}>
        <p
          className="text-[11px]"
          style={{ color: settingsSurfaceTokens.textSecondary }}
        >
          {diagnostics.totalSkills} skill(s) · {diagnostics.enabledSkills}{" "}
          enabled · {diagnostics.quarantinedSkills} quarantined ·{" "}
          {diagnostics.skillsMissingProvenance} missing provenance
        </p>

        <div className="flex flex-wrap gap-2">
          <input
            className={`${inputClass} min-w-[160px] flex-1`}
            style={inputStyle}
            placeholder="Search catalog…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleExport()}
            className="rounded-full border px-3 py-1.5 text-[11px] font-semibold disabled:opacity-50"
            style={{
              borderColor: settingsSurfaceTokens.borderSubtle,
              color: settingsSurfaceTokens.textPrimary,
            }}
          >
            Export catalog
          </button>
          {!compact && (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handlePackageSync()}
                className="rounded-full border px-3 py-1.5 text-[11px] font-semibold disabled:opacity-50"
                style={{
                  borderColor: settingsSurfaceTokens.borderSubtle,
                  color: settingsSurfaceTokens.textPrimary,
                }}
              >
                Package sync
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handlePushLucaLink()}
                className="rounded-full border px-3 py-1.5 text-[11px] font-semibold disabled:opacity-50"
                style={{
                  borderColor: settingsSurfaceTokens.borderSubtle,
                  color: "var(--luca-info, #4f8cff)",
                }}
              >
                Push LucaLink
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleDemoImport}
                className="rounded-full border px-3 py-1.5 text-[11px] font-semibold disabled:opacity-50"
                style={{
                  borderColor: settingsSurfaceTokens.borderSubtle,
                  color: "var(--luca-info, #4f8cff)",
                }}
              >
                Demo payload
              </button>
            </>
          )}
        </div>

        <ul className="space-y-1.5">
          {filtered.length === 0 && !loading && (
            <li
              className="text-[11px]"
              style={{ color: settingsSurfaceTokens.textTertiary }}
            >
              No skills yet — import OpenClaw/Claude/MCP JSON below.
            </li>
          )}
          {filtered.map((skill) => (
            <li
              key={skill.skillId}
              className="rounded-lg border px-2.5 py-2 text-[11px]"
              style={{ borderColor: settingsSurfaceTokens.borderSubtle }}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p
                    className="font-semibold"
                    style={{ color: settingsSurfaceTokens.textPrimary }}
                  >
                    {skill.name}{" "}
                    <span
                      className="font-mono text-[10px] font-normal"
                      style={{ color: settingsSurfaceTokens.textTertiary }}
                    >
                      v{skill.version}
                    </span>
                  </p>
                  <p
                    className="mt-0.5 font-mono text-[10px]"
                    style={{ color: settingsSurfaceTokens.textTertiary }}
                  >
                    {skill.lifecycleState} · {skill.riskLevel} · {skill.source}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleDryRun(skill.skillId)}
                    className="rounded border px-1.5 py-0.5 text-[10px] disabled:opacity-50"
                    style={{
                      borderColor: settingsSurfaceTokens.borderSubtle,
                      color: "var(--luca-info, #4f8cff)",
                    }}
                  >
                    Dry-run
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleSandboxPlan(skill.skillId)}
                    className="rounded border px-1.5 py-0.5 text-[10px] disabled:opacity-50"
                    style={{
                      borderColor: settingsSurfaceTokens.borderSubtle,
                      color: "var(--luca-warning, #e6b450)",
                    }}
                  >
                    Sandbox
                  </button>
                  {skill.lifecycleState !== "enabled" && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleLifecycle(skill.skillId, "enable")}
                      className="rounded border px-1.5 py-0.5 text-[10px] disabled:opacity-50"
                      style={{
                        borderColor: settingsSurfaceTokens.borderSubtle,
                        color: "var(--luca-success, #4fbf7a)",
                      }}
                    >
                      Enable
                    </button>
                  )}
                  {skill.lifecycleState === "enabled" && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleLifecycle(skill.skillId, "disable")}
                      className="rounded border px-1.5 py-0.5 text-[10px] disabled:opacity-50"
                      style={{
                        borderColor: settingsSurfaceTokens.borderSubtle,
                        color: settingsSurfaceTokens.textSecondary,
                      }}
                    >
                      Disable
                    </button>
                  )}
                  {skill.lifecycleState !== "quarantined" && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        handleLifecycle(skill.skillId, "quarantine")
                      }
                      className="rounded border px-1.5 py-0.5 text-[10px] disabled:opacity-50"
                      style={{
                        borderColor: settingsSurfaceTokens.borderSubtle,
                        color: "var(--luca-danger, #f07178)",
                      }}
                    >
                      Quarantine
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>

        {dryRun && !compact && (
          <div
            className="rounded-xl border p-3 space-y-1"
            style={{ borderColor: settingsSurfaceTokens.borderSubtle }}
          >
            <p
              className="text-[11px] font-semibold uppercase tracking-wide"
              style={{ color: settingsSurfaceTokens.textTertiary }}
            >
              Dry-run (no execution)
            </p>
            <p
              className="text-[11px]"
              style={{ color: settingsSurfaceTokens.textSecondary }}
            >
              {dryRun.summary}
            </p>
            <p
              className="font-mono text-[10px]"
              style={{ color: settingsSurfaceTokens.textTertiary }}
            >
              use: {dryRun.useCheck.allowed ? "allowed" : "blocked"} · gate:{" "}
              {dryRun.lifecycleGate.allowed ? "open" : "blocked"} ·
              executionEnabled: false
            </p>
          </div>
        )}

        {sandboxPlan && !compact && (
          <div
            className="rounded-xl border p-3 space-y-1"
            style={{ borderColor: settingsSurfaceTokens.borderSubtle }}
          >
            <p
              className="text-[11px] font-semibold uppercase tracking-wide"
              style={{ color: settingsSurfaceTokens.textTertiary }}
            >
              Permission-scoped sandbox plan
            </p>
            <p
              className="text-[11px]"
              style={{ color: settingsSurfaceTokens.textSecondary }}
            >
              {sandboxPlan.permissionSummary} {sandboxPlan.approvalSummary}
            </p>
            <p
              className="font-mono text-[10px]"
              style={{ color: settingsSurfaceTokens.textTertiary }}
            >
              status: {sandboxPlan.status} · mode: {sandboxPlan.sandboxMode} ·
              perms: {sandboxPlan.requiredPermissions.length} · blocked
              surfaces: {sandboxPlan.blockedSurfaces.length} ·
              executionEnabled: false
            </p>
            {sandboxPlan.requiredPermissions.slice(0, 6).map((p) => (
              <p
                key={p.permissionId}
                className="font-mono text-[10px]"
                style={{
                  color: p.blocked
                    ? "var(--luca-danger, #f07178)"
                    : settingsSurfaceTokens.textTertiary,
                }}
              >
                [{p.kind}] {p.label}
                {p.blocked ? " (blocked)" : ""}
              </p>
            ))}
          </div>
        )}

        {!compact && (
          <div
            className="rounded-xl border p-3 space-y-2"
            style={{ borderColor: settingsSurfaceTokens.borderSubtle }}
          >
            <p
              className="text-[11px] font-semibold uppercase tracking-wide"
              style={{ color: settingsSurfaceTokens.textTertiary }}
            >
              Import / sync skills JSON
            </p>
            <textarea
              className={`${inputClass} min-h-[80px] font-mono text-[10px]`}
              style={inputStyle}
              placeholder='OpenClaw/Claude/MCP, luca_skill_catalog_v1, or luca_skill_sync_v1 envelope'
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy || !importText.trim()}
                onClick={() => void handleImport()}
                className="rounded-full border px-3 py-1.5 text-[11px] font-semibold disabled:opacity-50"
                style={{
                  borderColor: settingsSurfaceTokens.borderSubtle,
                  color: settingsSurfaceTokens.textPrimary,
                }}
              >
                Import skills
              </button>
              <button
                type="button"
                disabled={busy || !importText.trim()}
                onClick={handleApplySync}
                className="rounded-full border px-3 py-1.5 text-[11px] font-semibold disabled:opacity-50"
                style={{
                  borderColor: settingsSurfaceTokens.borderSubtle,
                  color: "var(--luca-info, #4f8cff)",
                }}
              >
                Apply sync envelope
              </button>
            </div>
          </div>
        )}

        {note && (
          <p
            className="text-[11px] leading-relaxed"
            style={{ color: settingsSurfaceTokens.textSecondary }}
          >
            {note}
          </p>
        )}

        {!compact && (
          <p
            className="text-[10px] leading-relaxed"
            style={{ color: settingsSurfaceTokens.textTertiary }}
          >
            Catalog format:{" "}
            <span className="font-mono">luca_skill_catalog_v1</span>. Sandbox
            dry-run panels remain separate; marketplace never auto-executes
            tools.
          </p>
        )}
      </div>
    </div>
  );
};
