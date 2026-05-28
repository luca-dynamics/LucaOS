# LucaOS Self-Evolution Repo Boundary Plan

Date: 2026-05-28 (UTC)
Status: Architecture boundary contract (docs-only)

## Purpose
Define the explicit boundary between:
- **LucaOS core repository** (production runtime + governance authority), and
- **future `LucaOS-self-evolution` lab repository** (external optimizer/eval experimentation).

This plan preserves LucaOS safety posture:
- no autonomous production rewriting,
- no optimizer execution inside LucaOS core,
- Origin-governed approval and rollback for promotion.

---

## Why LucaOS needs a different split than Hermes

Hermes established a useful pattern:
- **Hermes main repo** hosts production agent runtime.
- **Hermes self-evolution repo** hosts optimizer loops and proposes changes back via PR.

LucaOS should absorb this split, but LucaOS scope is broader than Hermes. LucaOS includes:
- full app interface,
- Origin / Tactical / Normal user tiers,
- voice mode,
- computer-use runtime,
- memory system,
- skill/tool registry,
- widgets,
- onboarding,
- future device/robot embodiment surfaces.

Therefore, LucaOS self-evolution is not only skill optimization. It is a governance problem across product/runtime/UI/voice/memory/tooling surfaces under tiered authority.

---

## LucaOS core responsibilities (main repo)

The LucaOS main repo remains the system of record for production behavior and governance controls. It should own:

1. **Product runtime**
   - application runtime behavior,
   - mission execution pathways,
   - stable user-facing operation.

2. **User-tier surfaces**
   - Origin / Tactical / Normal access boundaries,
   - visible status and safe controls by tier.

3. **Canonical contracts**
   - `SkillManifest` contracts,
   - `EvolutionProposal` contracts,
   - `EvolutionRun` / `CandidateVariant` contracts,
   - memory/trace/mission-tape evidence contracts.

4. **Governance gates and authority checks**
   - risk-tier gate evaluation,
   - Origin-only approval/rejection/promotion/rollback authority for high-risk paths,
   - non-autonomous defaults.

5. **Origin review and rollback surfaces**
   - approval/rejection/rollback workflows,
   - auditable evidence and decision trail.

6. **Accepted/promoted artifacts and policies**
   - promoted skill manifests,
   - approved policy baselines,
   - safe runtime integrations.

7. **Proposal inbox + diagnostics**
   - inbound proposal/candidate queue,
   - user-visible diagnostics and promotion status.

---

## Future `LucaOS-self-evolution` lab responsibilities (external repo)

The future external lab repository should own experimentation and optimization workloads that are unsafe or heavy for production runtime:

1. **Optimizer execution**
   - GEPA / DSPy / other optimizer engines.

2. **Candidate generation**
   - mutation and variant production,
   - prompt/skill/tool-description optimization.

3. **Evaluation production**
   - eval dataset building,
   - trace replay batches,
   - benchmark runs,
   - regression reports,
   - constraint gate reports,
   - candidate comparison outputs.

4. **Integration output automation**
   - PR-back automation metadata,
   - external run artifact packaging.

5. **High-variance experiments**
   - experiments not safe for direct production runtime execution.

---

## Core ↔ Lab data and artifact exchange

### Artifacts exported from LucaOS core to lab
- `SkillManifest` snapshots.
- Trace memory items.
- Mission tape memory items.
- `EvolutionProposal` payloads.
- `EvolutionRun` request metadata.
- Eval dataset references.
- Anonymized/redacted user feedback evidence (when needed).

### Artifacts returned from lab to LucaOS core
- `CandidateVariant`.
- `EvalSummary`.
- `ConstraintGateResult`.
- PR-back metadata.
- Rollback plan.
- Risk assessment.
- Proposed manifest/prompt/tool changes.

### Exchange rules
- Artifact exchange is **contract-first**, versioned, and auditable.
- Raw sensitive traces must be redacted before leaving LucaOS core boundaries.
- Returned artifacts are **proposals/evidence**, not auto-applied runtime changes.

---

## User-tier access model

### Origin
- can trigger/approve external lab runs,
- can review candidate diffs and eval evidence,
- can approve/reject/promote/rollback,
- can inspect raw eval reports and detailed diffs.

### Tactical
- can request improvement proposals,
- can inspect limited diagnostics,
- can test candidate skills in sandbox (if enabled in future policy),
- cannot promote high-risk/core changes.

### Normal
- no raw self-evolution controls,
- receives only approved/promoted stable improvements,
- can provide feedback as evidence input.

---

## Safety model

1. **No autonomous production modification**
   - no self-directed production rewrite/merge.

2. **No runtime auto-apply by default**
   - candidate artifacts remain pending until explicit governance decision.

3. **External lab PRs require Origin review**
   - all PR-back changes require Origin-level approval path.

4. **High-risk capability changes require Origin approval**
   - computer-use,
   - filesystem,
   - network,
   - voice policy,
   - runtime policy,
   - security-sensitive memory/tool changes.

5. **Rollback required for medium+ risk promotions**
   - no medium/high-risk promotion without explicit rollback plan.

6. **Pre-promotion quality gates required**
   - eval + regression checks must pass before promotion.

7. **Privacy and redaction enforcement**
   - traces/feedback exported to lab must satisfy privacy and redaction rules.

---

## Implementation roadmap (next PR sequence)

1. PR: External lab artifact schema docs.
2. PR: Evolution proposal inbox service adapter.
3. PR: Origin-only evolution dashboard shell.
4. PR: External lab import adapter.
5. PR: Constraint gate report verifier.
6. PR: PR-back metadata verifier.
7. PR: Sandboxed candidate preview for Origin.
8. Later milestone: create `LucaOS-self-evolution` repo.

---

## Contract alignment references

This boundary plan aligns with and extends:
- `docs/luca-hermes-self-evolution-absorb.md`
- `docs/luca-evolution-governance-contract.md`
- `docs/luca-self-evolution-memory-audit.md`

These docs should treat this boundary plan as the canonical split contract for LucaOS core vs external self-evolution lab responsibilities.
