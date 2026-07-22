/**
 * Absorb Phase 3 — multi-format skill import adapters.
 * Maps OpenClaw / Claude / MCP / tool-array JSON into Luca skill manifests.
 */

import {
  DEFAULT_SKILL_MANIFEST_METADATA,
  type LucaSkillManifest,
  type LucaSkillRiskLevel,
} from "./SkillManifest";

export const LUCA_SKILL_CATALOG_FORMAT = "luca_skill_catalog_v1" as const;

export type SkillImportFormatHint =
  | "luca_catalog"
  | "openclaw"
  | "claude_tools"
  | "mcp_servers"
  | "plain_array"
  | "auto";

export interface SkillImportCandidate {
  name: string;
  version: string;
  source: string;
  manifest: LucaSkillManifest;
  requiredPermissions: string[];
  capabilities: string[];
  riskLevel: LucaSkillRiskLevel;
}

export interface SkillCatalogExport {
  format: typeof LUCA_SKILL_CATALOG_FORMAT;
  exportedAt: string;
  skillCount: number;
  skills: SkillImportCandidate[];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function slug(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || "skill"
  );
}

function inferRisk(text: string): LucaSkillRiskLevel {
  const s = text.toLowerCase();
  if (/(shell|terminal|execute|wipe|admin|root|computer.?use)/.test(s)) {
    return "high";
  }
  if (/(network|http|fetch|file|write|delete|browser)/.test(s)) return "medium";
  return "low";
}

function baseManifest(
  partial: Partial<LucaSkillManifest> &
    Pick<LucaSkillManifest, "id" | "name" | "description" | "version">,
): LucaSkillManifest {
  const risk =
    partial.safetyPolicy?.riskLevel ??
    inferRisk(`${partial.name} ${partial.description}`);
  const allowedTiers =
    risk === "high" || risk === "critical"
      ? (["origin", "tactical"] as const)
      : (["origin", "tactical", "normal"] as const);

  return {
    id: partial.id,
    name: partial.name,
    description: partial.description,
    version: partial.version,
    lifecycleState: partial.lifecycleState ?? "candidate",
    ownerTier: partial.ownerTier ?? "normal",
    allowedUserTiers: partial.allowedUserTiers ?? [...allowedTiers],
    category: partial.category,
    tags: partial.tags ?? [],
    triggerHints: partial.triggerHints ?? [],
    inputs: partial.inputs,
    outputs: partial.outputs,
    allowedTools: partial.allowedTools ?? [],
    deniedTools: partial.deniedTools ?? [],
    memoryPolicy: partial.memoryPolicy,
    safetyPolicy: partial.safetyPolicy ?? {
      riskLevel: risk,
      requiresConfirmation: risk !== "low",
      requiresOriginApproval: risk === "high" || risk === "critical",
      allowedOperationTiers: [...allowedTiers],
      networkAllowed: risk !== "high",
      fileSystemAllowed: false,
      computerUseAllowed: false,
      voiceExecutionAllowed: false,
    },
    evalPolicy: partial.evalPolicy ?? {
      evalRequired: risk !== "low",
      regressionCheckRequired: risk !== "low",
    },
    promotionPolicy: partial.promotionPolicy ?? {
      promotionRequiresOrigin: true,
      promotionRequiresPassingEvals: risk !== "low",
      promotionRequiresRollbackPlan: risk === "high" || risk === "critical",
      promotionSource: "skill_ingestion",
    },
    rollbackPolicy: partial.rollbackPolicy ?? { rollbackAvailable: true },
    source: partial.source ?? "import",
    createdAt: partial.createdAt ?? new Date().toISOString(),
    updatedAt: partial.updatedAt,
    metadata: {
      ...DEFAULT_SKILL_MANIFEST_METADATA,
      ...(partial.metadata || {}),
    },
  };
}

function candidateFromManifest(
  manifest: LucaSkillManifest,
  source: string,
  requiredPermissions: string[] = [],
): SkillImportCandidate {
  const risk = manifest.safetyPolicy?.riskLevel ?? "medium";
  return {
    name: manifest.name,
    version: manifest.version,
    source,
    manifest,
    requiredPermissions,
    capabilities: manifest.allowedTools ?? [],
    riskLevel: risk,
  };
}

function fromClaudeTools(tools: unknown[]): SkillImportCandidate[] {
  const out: SkillImportCandidate[] = [];
  tools.forEach((tool, index) => {
    const rec = asRecord(tool);
    if (!rec) return;
    // Claude tool shape: { name, description, input_schema }
    // OpenAI-ish: { type: "function", function: { name, description, parameters } }
    const fn = asRecord(rec.function) ?? rec;
    const name = String(fn.name ?? rec.name ?? `tool-${index}`);
    const description = String(fn.description ?? rec.description ?? "");
    const version = "0.1.0-import";
    const id = `import.claude.${slug(name)}`;
    const manifest = baseManifest({
      id,
      name,
      description,
      version,
      allowedTools: [name],
      inputs: fn.input_schema ?? fn.parameters ?? rec.input_schema,
      source: "claude_tools",
      tags: ["import", "claude"],
      category: "IMPORTED",
    });
    out.push(
      candidateFromManifest(manifest, "claude_tools", ["tool.invoke"]),
    );
  });
  return out;
}

function fromOpenClawSkills(skills: unknown[]): SkillImportCandidate[] {
  const out: SkillImportCandidate[] = [];
  skills.forEach((skill, index) => {
    const rec = asRecord(skill);
    if (!rec) return;
    const name = String(rec.name ?? rec.id ?? `skill-${index}`);
    const description = String(rec.description ?? rec.summary ?? "");
    const version = String(rec.version ?? "0.1.0-openclaw");
    const tools = Array.isArray(rec.tools)
      ? rec.tools.map(String)
      : Array.isArray(rec.allowedTools)
        ? rec.allowedTools.map(String)
        : [];
    const perms = Array.isArray(rec.permissions)
      ? rec.permissions.map(String)
      : Array.isArray(rec.requiredPermissions)
        ? rec.requiredPermissions.map(String)
        : [];
    const id = `import.openclaw.${slug(name)}`;
    const manifest = baseManifest({
      id,
      name,
      description,
      version,
      allowedTools: tools.length ? tools : [name],
      source: "openclaw",
      tags: ["import", "openclaw", ...(Array.isArray(rec.tags) ? rec.tags.map(String) : [])],
      category: String(rec.category ?? "OPENCLAW"),
      triggerHints: Array.isArray(rec.triggers)
        ? rec.triggers.map(String)
        : undefined,
    });
    out.push(candidateFromManifest(manifest, "openclaw", perms));
  });
  return out;
}

function fromMcpServers(raw: Record<string, unknown>): SkillImportCandidate[] {
  const servers = asRecord(raw.mcpServers) ?? asRecord(raw.servers) ?? raw;
  const out: SkillImportCandidate[] = [];
  for (const [name, cfg] of Object.entries(servers)) {
    if (name === "mcpServers" || name === "servers") continue;
    const rec = asRecord(cfg) ?? {};
    const command = String(rec.command ?? rec.cmd ?? "mcp");
    const args = Array.isArray(rec.args) ? rec.args.map(String) : [];
    const description = `MCP server connector: ${command} ${args.join(" ")}`.trim();
    const id = `import.mcp.${slug(name)}`;
    const manifest = baseManifest({
      id,
      name,
      description,
      version: "0.1.0-mcp",
      allowedTools: [`mcp:${name}`],
      source: "mcp",
      tags: ["import", "mcp"],
      category: "MCP",
      safetyPolicy: {
        riskLevel: "medium",
        requiresConfirmation: true,
        requiresOriginApproval: false,
        allowedOperationTiers: ["origin", "tactical", "normal"],
        networkAllowed: true,
        fileSystemAllowed: false,
        computerUseAllowed: false,
        voiceExecutionAllowed: false,
      },
      metadata: {
        ...DEFAULT_SKILL_MANIFEST_METADATA,
        mcp: { command, args, env: rec.env },
      },
    });
    out.push(
      candidateFromManifest(manifest, "mcp", ["mcp.connect", "network"]),
    );
  }
  return out;
}

function fromLucaCatalogSkills(skills: unknown[]): SkillImportCandidate[] {
  const out: SkillImportCandidate[] = [];
  for (const skill of skills) {
    const rec = asRecord(skill);
    if (!rec) continue;
    if (rec.manifest && typeof rec.manifest === "object") {
      const m = rec.manifest as LucaSkillManifest;
      if (m.id && m.name) {
        out.push({
          name: String(rec.name ?? m.name),
          version: String(rec.version ?? m.version ?? "0.0.0"),
          source: String(rec.source ?? m.source ?? "luca_catalog"),
          manifest: baseManifest({
            ...m,
            id: m.id,
            name: m.name,
            description: m.description || "",
            version: m.version || "0.0.0",
          }),
          requiredPermissions: Array.isArray(rec.requiredPermissions)
            ? rec.requiredPermissions.map(String)
            : [],
          capabilities: Array.isArray(rec.capabilities)
            ? rec.capabilities.map(String)
            : m.allowedTools ?? [],
          riskLevel: m.safetyPolicy?.riskLevel ?? "medium",
        });
        continue;
      }
    }
    // bare manifest
    if (typeof rec.id === "string" && typeof rec.name === "string") {
      const manifest = baseManifest({
        id: rec.id,
        name: rec.name,
        description: String(rec.description ?? ""),
        version: String(rec.version ?? "0.0.0"),
        source: "luca_catalog",
      });
      out.push(candidateFromManifest(manifest, "luca_catalog"));
    }
  }
  return out;
}

/**
 * Coerce unknown JSON into skill import candidates.
 */
export function coerceSkillImport(
  payload: unknown,
  hint: SkillImportFormatHint = "auto",
): { candidates: SkillImportCandidate[]; detected: string } | { error: string } {
  let raw = payload;
  if (typeof payload === "string") {
    try {
      raw = JSON.parse(payload);
    } catch {
      return { error: "Invalid JSON string" };
    }
  }

  // Native catalog
  if (hint === "luca_catalog" || hint === "auto") {
    const rec = asRecord(raw);
    if (rec?.format === LUCA_SKILL_CATALOG_FORMAT && Array.isArray(rec.skills)) {
      const candidates = fromLucaCatalogSkills(rec.skills);
      if (candidates.length) {
        return { candidates, detected: LUCA_SKILL_CATALOG_FORMAT };
      }
    }
    if (rec && Array.isArray(rec.skills) && !rec.format) {
      // Could be openclaw or luca
      const openclaw = fromOpenClawSkills(rec.skills);
      if (openclaw.length) {
        return {
          candidates: openclaw,
          detected: hint === "openclaw" ? "openclaw" : "skills_array",
        };
      }
    }
  }

  if (hint === "openclaw" || hint === "auto") {
    const rec = asRecord(raw);
    if (rec && Array.isArray(rec.skills)) {
      const candidates = fromOpenClawSkills(rec.skills);
      if (candidates.length) return { candidates, detected: "openclaw" };
    }
  }

  if (hint === "claude_tools" || hint === "auto") {
    if (Array.isArray(raw)) {
      const candidates = fromClaudeTools(raw);
      if (candidates.length) return { candidates, detected: "claude_tools" };
    }
    const rec = asRecord(raw);
    if (rec && Array.isArray(rec.tools)) {
      const candidates = fromClaudeTools(rec.tools);
      if (candidates.length) return { candidates, detected: "claude_tools" };
    }
  }

  if (hint === "mcp_servers" || hint === "auto") {
    const rec = asRecord(raw);
    if (rec && (rec.mcpServers || rec.servers)) {
      const candidates = fromMcpServers(rec);
      if (candidates.length) return { candidates, detected: "mcp_servers" };
    }
  }

  if (hint === "plain_array" || (hint === "auto" && Array.isArray(raw))) {
    if (Array.isArray(raw)) {
      // try as tools first, then openclaw-ish objects
      const asTools = fromClaudeTools(raw);
      if (asTools.length) return { candidates: asTools, detected: "plain_array_tools" };
      const asSkills = fromOpenClawSkills(raw);
      if (asSkills.length) return { candidates: asSkills, detected: "plain_array_skills" };
    }
  }

  return {
    error:
      "Could not detect skill import format (try luca catalog, OpenClaw skills, Claude tools, or MCP servers JSON)",
  };
}
