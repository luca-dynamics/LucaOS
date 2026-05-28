# Audit Luca self-evolution and memory architecture

## Scope and method
- Reviewed architecture/runtime documentation and implementation files under `src/services`, `src/tools`, and `docs` for memory, skills/tools, tracing, and evolution pathways.
- This is an audit-only snapshot of the current repository state on 2026-05-27; no runtime behavior changes are included.

## Executive summary
LucaOS already includes multiple **partial** systems in each target domain (memory, skill/tool registries, traces, and evolution scaffolds), but they are fragmented across frontend-localStorage, backend SQLite, in-memory services, and partially stubbed modules.

Key conclusion: do **not** add a new standalone memory/evolution stack yet. First unify existing components and formalize interfaces, otherwise new modules will duplicate and conflict with current services.

---

## 1) Current memory architecture

### What exists now

#### A. Frontend memory service (hybrid mode)
- `memoryService` supports modes `LOCAL | DELEGATED | STANDALONE` and syncs memory between local cache and API (`/api/memory/*`), with optional Luca Link sync events.
- Uses browser `localStorage` (`LUCA_LUCA_ARCHIVE_V1`) as active cache.
- Includes ingestion filtering (`isSystemPrompt`) and visual-summary memory hooks (`saveVisualHDC`).

#### B. Backend persistent memory store
- `memoryStore` persists to SQLite through `db.js` (`memories`, `entities`, `relationships`, `user_profile`, and FTS virtual tables/triggers).
- Supports migration from legacy JSON, deduplication/reconciliation, sync, text search, and full wipe.

#### C. Agent/task memory
- `AgentMemoryService` provides task-scoped persistent memory (`localStorage`) plus in-RAM session map.
- Declares “Session → Task → Project” intent, but currently implements session + task primitives without a distinct persistent project layer abstraction.

#### D. Workflow memory scaffold
- `WorkflowMemory` is present for execution-history learning but disabled (`isEnabled=false`) and explicitly marked as LightRAG-not-integrated stub.

### Tier classification
- **Tier 1 (session/task memory):** Exists (conversation/session state, agent session map, task localStorage memory).
- **Tier 2 (user/profile memory):** Partial (SQLite `user_profile` table exists; integration into agent reasoning path is limited/unclear).
- **Tier 3 (skill/operational/evolution memory):** Partial and fragmented (mission tapes + traces + stub workflow memory; no unified skill-ops memory substrate).

### Gaps and risks
- Memory is split across **multiple truth sources** (frontend localStorage, backend SQLite, in-memory maps, trace localStorage exports).
- Metadata fields like confidence/importance/expiresAt exist in places, but no global schema contract enforcing TTL/privacy/source/version semantics end-to-end.
- No single retrieval gateway that merges Tier1/2/3 with policy filters for agent runtime.

### Recommendation
- **Refine + unify** existing memory services into a canonical Memory Contract before adding new long-term/self-evolution memory modules.

---

## 2) Current skill/tool architecture

### What exists now

#### A. Primary Tool Registry
- `src/services/toolRegistry.ts` is the active registry with:
  - tool registration
  - security level + mission scope mapping
  - concurrency metadata
  - inferred `skillSets` capability tags
- Includes MCP-related tool entries (`listMCPTools`, `diagnose_mcp_health`, `executeMCPTool`).

#### B. Deprecated duplicate ToolRegistry shim
- `src/tools/ToolRegistry.ts` is deprecated and forwards calls to service registry.
- This indicates legacy compatibility layer still present.

#### C. Skill trigger + ingestion services
- `SkillTriggerService` provides JIT transient skill-set activation from intention text and model recommendation coupling.
- `SkillIngestionService` orchestrates scrape → generate → register flow via API endpoints (`/api/knowledge/scrape`, `/api/skills/generate`, `/api/skills/create`).

#### D. Plugin/MCP integration surfaces
- Plugin loader and MCP client/doctor services exist, indicating pluggable external capability support.

### Gaps and risks
- “Skills” are represented in multiple ways (tool metadata tags, generated API skills, transient skill sets) without one canonical `SkillManifest` schema/version contract.
- No first-class skill lifecycle state machine (draft/canary/promoted/retired) visible.
- No explicit skill policy/eval contract attached to each skill artifact before promotion.

### Recommendation
- **Merge/unify** skill representations around a single typed manifest and lifecycle.
- **Keep** service toolRegistry as base; retire/deprecate remaining duplicate adapter usage.

---

## 3) Current self-evolution architecture

### What exists now
- `evolutionService` provides guarded self-patching flow:
  - authority gate (dev-mode only)
  - sandbox copy
  - mutation write
  - verification command run
  - backup + commit
- Includes backup behavior (basic rollback artifact availability by .bak files).

### What is missing
- No integrated runtime loop that continuously collects outcomes and automatically proposes targeted prompt/skill/tool improvements.
- No promotion gate framework (quality thresholds, safety checks, regression constraints).
- No formal human approval workflow bound to evolution commits beyond environment gating.

### Recommendation
- **Refine** existing evolution service into a governed “proposal pipeline” (propose → evaluate → approval → apply), instead of replacing it.

---

## 4) Current optimizer / GEPA-like architecture

### What exists now
- No clear GEPA-style optimizer (multi-candidate mutation/search + Pareto ranking + harnessed eval loop) discovered.
- Some evaluation/tracking components exist indirectly:
  - `AgentQuality`
  - `harnessService` references in tool registry
  - mission/trace instrumentation
- `WorkflowMemory` failure-analysis paths are scaffolded but disabled/stubbed.

### Missing
- Candidate generation/search loop for prompts/programs.
- Standardized benchmark/eval datasets for skill/prompt optimization.
- Safe optimizer gates (automatic rollback criteria, canarying, promotion policy).

### Recommendation
- **New module needed** (after unification phase): optimizer orchestrator built on existing traces/memory/tapes, not parallel infrastructure.

---

## 5) Execution traces / observability for improvement loops

### What exists now
- `LucaTracing` captures agent events, timing, errors, optional snapshots, exports to localStorage.
- `MissionTapeRecorder` captures mission lifecycle records (steps/guard/verification/recovery) via in-memory adapter.
- Thought/tool logs and UI parsers exist for visualization.

### Gaps
- Persistence inconsistency (traces in localStorage; mission tape currently in-memory default adapter).
- No unified trace schema consumed directly by reflection/optimizer subsystems.
- Limited linkage of trace artifacts back into memory tiers for learning.

### Recommendation
- **Refine + unify** trace sinks/schema; make them queryable for reflection/eval workflows.

---

## 6) Keep / refine / replace / merge matrix

| Area | Current state | Action |
|---|---|---|
| `memoryService` hybrid modes + sync | Valuable but fragmented | **Refine** |
| `memoryStore` SQLite + FTS + reconciliation | Strong base persistence | **Keep (with schema hardening)** |
| `AgentMemoryService` task/session memory | Useful but isolated | **Merge/unify** into tiered memory contract |
| `WorkflowMemory` stub | Placeholder only | **Refine** (activate with real backend) |
| `services/toolRegistry.ts` | Canonical runtime registry | **Keep** |
| `tools/ToolRegistry.ts` deprecated shim | Duplicate indirection | **Replace/remove gradually** |
| Skill ingestion/trigger services | Good capability but ad-hoc schema | **Refine + unify** |
| `evolutionService` | Guarded patch scaffold | **Refine** into governed pipeline |
| `LucaTracing` + `MissionTapeRecorder` | Useful telemetry foundations | **Merge/unify** storage + schema |
| GEPA-like optimizer | Not present as system | **Missing / new module needed later** |

---

## 7) What should NOT be duplicated
- Do not create another standalone memory DB while SQLite + `memoryStore` already exist.
- Do not create a second tool registry parallel to `services/toolRegistry.ts`.
- Do not create a separate trace format unrelated to `LucaTracing` / mission tape events.
- Do not introduce autonomous mutation pipeline that bypasses current evolution safety gate.

---

## 8) Recommended upgrade path (PR sequence)

### Suggested first implementation PR (after this audit)
1. **Memory Contract Unification PR**
   - Define canonical memory schema: scope, source, confidence, privacy, TTL, version, lineage.
   - Add single retrieval interface for Tier1/2/3 with policy filters.
   - Wire `memoryService`, `memoryStore`, `AgentMemoryService` to that contract (no new runtime features yet).

### Suggested bundled sequence
2. **Trace & Tape Unification PR**
   - Standardize execution event schema.
   - Persist mission tapes using pluggable storage (SQLite-backed adapter), not in-memory-only default.
   - Link trace/tape records to memory entries by IDs.

3. **Skill Manifest + Lifecycle PR**
   - Introduce canonical `SkillManifest` (version, policy, eval requirements, provenance).
   - Map existing tool skillSets + ingestion outputs into this manifest.
   - Add lifecycle states (draft/canary/promoted/retired).

4. **Reflection & Evaluator PR**
   - Implement offline reflection worker that mines unified traces/tapes.
   - Produce structured improvement proposals (prompt/tool/skill deltas) with evidence.
   - Human-review queue only; no auto-apply.

5. **Optimizer (GEPA-like) PR**
   - Add candidate generation + scoring harness on controlled datasets.
   - Gate promotion via pass/fail policy and regression checks.
   - Rollback via versioned artifacts and promotion logs.

6. **Guarded Evolution Integration PR**
   - Connect approved proposals into `evolutionService` flow.
   - Require explicit approval checkpoints and immutable audit records.

---

## Bottom line
LucaOS already has meaningful building blocks for memory, skills/tools, traces, and guarded evolution. The immediate priority is **architectural unification and governance**, not adding another parallel stack. Once unified, a GEPA-style optimizer and self-evolution loop can be added safely without duplication.


## Implementation started (2026-05-28)
- Shared Luca memory contracts were added under `src/services/memory/MemoryContracts.ts` with canonical tier/scope/item/query/result/adapter interfaces.
- Tier mapping + legacy conversion helpers were added under `src/services/memory/MemoryTierMapping.ts` as pure functions only (no storage writes/migrations).
- Adapter shells were added for frontend memoryService, backend memoryStore, AgentMemoryService, and WorkflowMemory under `src/services/memory/MemoryAdapters.ts`.
- Adapters are opt-in and marked adapter-only; runtime behavior remains unchanged by default.
- No storage migration is included in this phase.
- A future PR will unify trace/mission-tape ingestion into canonical trace-tier memory entries.

## Trace/tape mapping bridge update (2026-05-28)
- Added pure, mapping-only bridge helpers in `src/services/memory/TraceMemoryMapping.ts` to map:
  - `LucaTracing` events (`src/services/agent/LucaTracing.ts`) into canonical trace-tier memory items.
  - `MissionTapeRecord` shapes (`src/services/missionTape/types.ts`) into canonical mission trace items plus step-level operational items.
  - Mission-engine `MissionTape` compatibility records (`src/services/missionEngine/types.ts`) through the same mapper.
- Added `TraceMemoryAdapter` (`src/services/memory/TraceMemoryAdapter.ts`) with snapshot metadata proving adapter-only behavior:
  - `adapterOnly: true`
  - `runtimeBehaviorChanged: false`
  - `traceWritesRedirected: false`
  - `tapeWritesRedirected: false`
  - `migrationRequired: false`
- Existing runtime behavior remains unchanged:
  - `LucaTracing` remains in-memory (`Map`) with localStorage export (`luca_trace_*`) on trace end.
  - `MissionTapeRecorderService` default storage remains in-memory (`Map`) via `InMemoryMissionTapeStorageAdapter`.
  - No redirection of production writes; no persistence migration.
- Current consumption paths remain as-is:
  - Trace events are consumed via `tracingService.getTrace()` / `getAllTraces()` and localStorage export for inspection.
  - Mission tapes are consumed via `MissionTapeRecorderService.getTape()` / `listTapes()` and mission-engine recorder hook.
- Next safe step (future PR): opt-in ingestion path that writes mapped trace/tape memory items into canonical memory store interfaces behind feature flags.

## Skill manifest/lifecycle contract update (2026-05-28)
- Added canonical skill manifest contracts under `src/services/skills/SkillManifest.ts` covering identity, lifecycle, tier access, safety, eval, promotion, rollback, and governance metadata.
- Added pure legacy mapping helpers under `src/services/skills/SkillManifestMapping.ts` to bridge current toolRegistry-style entries without executing or registering tools.
- Added lifecycle gate policy helper under `src/services/skills/SkillLifecycleGate.ts` with Origin/Tactical/Normal guardrails and promotion/evolution/rollback restrictions.
- Added non-invasive adapter shell `src/services/skills/SkillManifestAdapter.ts` and exports at `src/services/skills/index.ts`.
- Added tests validating mapping, metadata preservation, tier/risk gates, and adapter safety metadata.
- Runtime behavior remains unchanged; autonomous self-modification remains disabled.

## Evolution governance contract addition (2026-05-28)

- Added canonical Luca evolution proposal contract and governance gate under `src/services/evolution/`.
- Added proposal lifecycle representation (`draft -> submitted -> under_review -> approved/rejected -> promoted/rolled_back -> archived`) with typed evidence/eval/risk/approval/rollback fields.
- Added Origin/Tactical/Normal permission enforcement in policy gate evaluation.
- Added explicit external lab and LucaOS-self-evolution-repo proposal source path with mandatory Origin approval.
- Added adapter shell that does not replace existing `evolutionService` and does not change runtime behavior.
- Autonomous self-modification remains disabled and runtime auto-apply remains false by default.

## Evolution run memory/audit alignment (2026-05)

- Evolution run contracts now include explicit dataset references and eval-case references tied to trace memory and mission tape IDs.
- Constraint gate records and PR-back metadata are persisted as auditable artifacts.
- Local optimizer execution and autonomous promotion remain disabled in LucaOS core by default.
