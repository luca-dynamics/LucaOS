# LucaOS absorption analysis: Hermes Agent + Hermes Agent Self-Evolution

## Scope
This document compares:
- `NousResearch/hermes-agent`
- `NousResearch/hermes-agent-self-evolution`

Against current LucaOS primitives:
- memory contracts
- trace/tape mapping
- skill ingestion/trigger services
- `evolutionService`
- `toolRegistry`
- `MissionTapeRecorder`
- `LucaTracing`

Date of analysis: 2026-05-28 (UTC).

---

## Method
1. Reviewed LucaOS runtime/docs source surfaces for memory, tracing, skill lifecycle, and evolution orchestration.
2. Reviewed public upstream Hermes and Hermes self-evolution repository materials (README + exposed module snippets) to extract architecture patterns.
3. Mapped capability-by-capability against LucaOS with explicit adopt / avoid guidance.

---

## What LucaOS already has (strong foundations)

### 1) Memory contract scaffolding exists
- Canonical typed memory contract with tiers (`session`, `profile`, `operational`, `skill`, `trace`, `system`), scope, query/result, and adapter interfaces is already defined.
- Metadata explicitly marks current phase as adapter-only/no runtime behavior change, which is the right conservative migration posture.

### 2) Trace/tape → memory bridge exists
- `TraceMemoryMapping` already maps both Luca tracing events and mission tape records into contract-compliant memory items.
- Includes source-kind inference, mission summary item + step-level operational items, and raw payload lineage in metadata.

### 3) Skill runtime plumbing exists
- `skillTriggerService` performs JIT activation (LRU bounded) of transient skill/tool sets driven by intention text.
- `skillIngestionService` supports scrape → generate → register loop for new skills.

### 4) Tool governance primitives exist
- Unified `services/toolRegistry.ts` already attaches security levels, mission scopes, concurrency flags, and inferred skill-set tags.
- This is the right anchor for future evolution gating metadata.

### 5) Mission trace skeleton exists
- `MissionTapeRecorderService` captures structured lifecycle arrays (`steps`, `guard`, `verification`, `recovery`) with query endpoints.

### 6) Self-modification gate exists
- `evolutionService` already enforces authority checks (dev/god mode), sandboxing, verification step, backup-before-commit.
- This is a minimal but real safety boundary.

---

## What Hermes/Hermes-self-evolution does better

### A) Explicit optimization pipeline, not just mutation utility
Hermes self-evolution formalizes:
1. artifact load (skill/prompt/tool)
2. dataset build (synthetic/golden/session history)
3. constrained optimization (DSPy + GEPA; fallback strategy)
4. holdout evaluation vs baseline
5. constraints gates
6. output artifacts and PR-back workflow

LucaOS currently has mutation primitives but not a first-class optimizer lifecycle.

### B) Dataset strategy is first-class
Hermes supports multiple eval sources:
- synthetic generation
- golden datasets
- real session-history mining

LucaOS has trace capture and mapping, but not a standardized dataset productization layer for evolution/evals.

### C) Trace-informed reflective mutation
Hermes emphasizes execution traces for *why* failures happen, not only pass/fail outcomes. This improves mutation quality and sample efficiency.

LucaOS records traces and tapes, but does not yet run a reflective learner loop over them.

### D) Constraint gates are explicit and multi-dimensional
Hermes guardrails include tests, size limits, semantic-preservation checks, caching compatibility, and mandatory human review before merge.

LucaOS currently has environment-based authority gating and optional verification command, but lacks full constraint policy orchestration.

### E) Repo separation discipline
Hermes keeps evolution machinery in a separate repo and targets main agent repo via PR output. This isolates blast radius, dependencies, and legal/tooling complexity.

---

## Absorb now (high-confidence patterns)

### 1) Skill lifecycle state machine (must add)
Add canonical states in LucaOS: `draft -> candidate -> canary -> promoted -> deprecated -> retired`.

Attach to skill manifests:
- provenance (source URL / generator / operator)
- evaluation requirements
- policy/risk tier
- rollout constraints

### 2) Formal evolution loop on top of existing contracts
Build Origin-mode-only orchestrator:
- `collect` (trace/tape + outcomes)
- `curate` (dataset builder)
- `mutate` (candidate generator)
- `evaluate` (baseline vs variants)
- `gate` (constraints)
- `promote` (PR proposal only)

### 3) Session/history search index for evaluation mining
Add search layer over mission tape + trace memory for:
- failure cluster extraction
- representative scenario sampling
- queryable slices by tool, skill, mission type, error signature

### 4) Execution-trace schema hardening
Promote one cross-subsystem event schema:
- stable IDs (mission/run/span/step)
- normalized status/reason/error taxonomy
- deterministic link from trace -> dataset example -> candidate eval result

### 5) Constraint gate engine
Codify hard/soft gates:
- hard: tests pass, security policy pass, semantic intent preservation
- soft: size/performance budgets, win-rate lift threshold
- mandatory human approval for production-facing changes

### 6) PR-back workflow
Never auto-apply to main runtime. Always produce:
- candidate artifacts
- evaluation report
- diff/rationale
- PR for human review

---

## Do **not** copy directly

### 1) Do not couple LucaOS runtime to DSPy/GEPA internals immediately
Adopt the *interface pattern* (optimizer abstraction), not provider lock-in.

### 2) Do not allow runtime mid-session skill mutation
LucaOS should keep current mission stability guarantees; apply evolved variants only between sessions/mission windows.

### 3) Do not bypass Luca Guard / mode boundaries
All self-evolution stays Origin workflows only; Tactical/Core runtime must not self-modify directly.

### 4) Do not create duplicate registries/stores
Reuse existing `toolRegistry`, memory contracts, trace mapping, and mission tape services. Add adapters, not parallel systems.

### 5) Do not optimize solely on model-judge score
Require blended metrics: deterministic checks + policy/safety + outcome improvements + operator review.

---

## Specific comparison by requested topic

### Skill lifecycle
- **LucaOS now:** JIT activation + ingestion exists; no canonical lifecycle model.
- **Hermes pattern:** Artifact-centric evolution with explicit candidate/baseline comparison and promotion intent.
- **Absorb:** Manifest + lifecycle state machine + promotion policy.

### Self-improving skills
- **LucaOS now:** Can ingest/generate, but no closed-loop optimizer.
- **Hermes pattern:** Iterative mutation/eval/selection loop.
- **Absorb:** Offline/Origin evolution runner with reproducible run artifacts.

### Memory loop
- **LucaOS now:** Contracts + mapping present.
- **Hermes pattern:** Session history feeds eval datasets.
- **Absorb:** Memory-to-dataset compilers and failure-mining queries.

### Session/history search
- **LucaOS now:** Query primitives exist but not evolution-oriented indexing.
- **Hermes pattern:** External sessiondb mining path.
- **Absorb:** Add semantic and structural retrieval API for evolution service.

### Skill file format
- **LucaOS now:** Multiple skill representations across services/APIs.
- **Hermes pattern:** SKILL.md-centric optimization target.
- **Absorb:** Single Luca skill manifest + content body format with versioning.

### Evolution lab repo separation
- **LucaOS now:** evolution utility inside main repo.
- **Hermes pattern:** dedicated self-evolution repo drives PRs into main repo.
- **Absorb:** yes, strongly consider dedicated evolution lab repo (see decision below).

### DSPy + GEPA flow
- **LucaOS now:** no equivalent orchestration.
- **Hermes pattern:** GEPA-first with fallback.
- **Absorb:** optimizer-provider abstraction with pluggable engines; GEPA can be one backend.

### Eval dataset generation
- **LucaOS now:** not formalized.
- **Hermes pattern:** synthetic/golden/session sources.
- **Absorb:** adopt tri-source dataset policy and reproducible dataset snapshots.

### Execution trace usage
- **LucaOS now:** strong raw capture, weak feedback loop.
- **Hermes pattern:** traces inform targeted mutations.
- **Absorb:** add trace-diagnosis module generating mutation hints.

### Candidate variant generation
- **LucaOS now:** single mutation path.
- **Hermes pattern:** candidate search and selection.
- **Absorb:** N-candidate generation with Pareto ranking.

### Constraint gates
- **LucaOS now:** basic verification + authority gate.
- **Hermes pattern:** multi-gate policy.
- **Absorb:** explicit gate engine tied to skill risk tier.

### PR-back-to-main workflow
- **LucaOS now:** service can commit file over target path locally.
- **Hermes pattern:** PR output to main repo with human review.
- **Absorb:** shift to PR-only promotion for non-dev sandboxes.

### Guardrails against unsafe self-modification
- **LucaOS now:** environment gate exists; mode-level guardrails documented.
- **Hermes pattern:** test/policy gates + human review.
- **Absorb:** combine both: authority + constraints + review.

---

## Recommended next PR sequence (exact)

### PR-1: Skill manifest + lifecycle contract
- Add `SkillManifest` schema (state, provenance, risk tier, eval requirements, rollout policy).
- Adapter mapping for existing ingestion + trigger + tool registry metadata.
- No behavior flip yet.

### PR-2: Evolution run record schema
- Add `EvolutionRun`, `CandidateVariant`, `ConstraintResult`, `PromotionDecision` contracts.
- Persist run artifacts into memory/trace-linked storage.

### PR-3: Session/history search for evolution
- Build query service over memory + mission tape + trace mapping for failure mining and sampling.
- Add filters by tool, skill, mission class, error signature, time window.

### PR-4: Dataset builders
- Implement synthetic builder + golden loader + session-history miner.
- Snapshot datasets with immutable run IDs.

### PR-5: Constraint gate engine
- Encode hard/soft gates and policy thresholds.
- Add semantic-drift checker interface (can start heuristic).

### PR-6: Candidate generation/evaluation harness
- Introduce optimizer abstraction (`IOptimizerEngine`) and baseline-vs-candidate evaluator.
- Keep engine pluggable (GEPA adapter optional).

### PR-7: Origin-only evolution orchestrator
- Orchestrate collect->mutate->evaluate->gate->report pipeline.
- Explicitly disallow runtime apply in Tactical/Core.

### PR-8: PR-back integration
- Auto-generate patch/diff reports and PR metadata bundle for human review.
- Production promotion requires review + signed gate report.

### PR-9: Harden `evolutionService`
- Convert direct overwrite commit path to policy-aware promotion hooks.
- Preserve backup/rollback but require approved promotion artifacts.

---

## Should LucaOS create `LucaOS-self-evolution` as a second repo?

## Recommendation: **Yes** (with a staged transition)

### Why yes
1. **Safety isolation:** evolution dependencies and experimental optimizers stay outside core runtime repo.
2. **Governance clarity:** PR-only flow into LucaOS mainline is easier to audit.
3. **Operational stability:** avoids polluting runtime dependency graph with research tooling.
4. **Faster iteration:** evolution lab can iterate dataset/optimizer experiments independently.

### Caveat
Do not move foundational contracts out of LucaOS core. Keep canonical schemas/interfaces in LucaOS main repo; evolution repo depends on them via versioned package or generated schema artifacts.

### Minimal repo split boundary
- **Main repo:** runtime contracts, guardrails, ingestion/trigger runtime, promotion application hooks.
- **Self-evolution repo:** dataset mining, candidate generation, evaluation harness, reporting, PR artifact generation.

---

## Final stance
LucaOS should absorb Hermes’ **process architecture** (dataset-driven reflective optimization + strong constraints + PR-mediated promotion), but not copy implementation choices blindly. The safest path is contract-first unification in LucaOS, then a separated evolution lab that proposes changes back into mainline under strict guardrails.

## Evolution governance contract update (2026-05-28)

- Added canonical proposal contract under `src/services/evolution/EvolutionProposal.ts` to represent governed evolution intents across skill, prompt, tool metadata, memory policy, voice policy, runtime policy, and external lab candidate classes.
- Added pure proposal mapping helpers (`EvolutionProposalMapping.ts`) so trace reflection, tactical requests, and external-lab candidates can be represented without mutating runtime behavior.
- Added governance gate (`EvolutionGovernanceGate.ts`) enforcing Origin/Tactical/Normal boundaries and promotion guardrails (evals, regression blocks, rollback requirements).
- Added adapter shell (`EvolutionGovernanceAdapter.ts`) with explicit metadata proving adapter-only rollout and no replacement of existing `evolutionService`.
- External LucaOS-self-evolution repo pathway is now formally represented via `external_lab_candidate` and `lucaos_self_evolution_repo` sources, with mandatory Origin approval.
- Runtime behavior remains unchanged; autonomous self-modification stays disabled.

### Existing `evolutionService` relation (inspection)

Path: `src/services/evolutionService.ts`.

Current flow remains dev-only sandbox/mutate/verify/commit:
1. `createSandbox` copies a target file into temp sandbox directory.
2. `applyMutation` writes mutated code to the sandbox file.
3. `verifyMutation` executes a verification shell command (`npx tsc ...` by default).
4. `commitEvolution` writes backup (`.bak`) and copies sandbox result over target file.

Implications:
- It can write files and run shell commands.
- It does not call remote APIs by default, but can execute arbitrary verification commands supplied to it.
- It can overwrite source files in-place after verification and create backups.

Governance posture:
- New governance contract/gate should sit in front of any future invocation path.
- Raw mutate/commit capabilities must remain Origin-governed and must not be exposed to Normal or Tactical user actions.
