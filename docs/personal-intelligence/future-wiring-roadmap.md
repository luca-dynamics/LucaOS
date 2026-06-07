# Future Personal Intelligence Wiring Roadmap

Personal Intelligence integration advances through separately reviewed boundaries. Readiness is not approval, approval is not execution, and no later stage may bypass the policy and safety contracts established earlier.

1. **PR #205 — Personal Intelligence Core.** Establish identity, mission, memory, learning, privacy, skills metadata, and execution doctrine as isolated pure modules.
2. **PR #206 — Integration boundaries.** Add preview-only boundaries and readiness contracts without connecting live runtime behavior.
3. **PR #207 — Existing Settings preview UI.** Render Identity, Mission, memory, learning, skill, doctrine, and privacy previews in existing Settings tabs without applying or persisting them.
4. **PR #208 — Governed persistence proposal layer.** Define side-effect-free memory/learning proposals, policy evaluation, approval metadata, audit records, rollback/delete planning, and readiness summaries.
5. **PR #209 — Governed memory adapter.** Add the sole governed bridge from an approved memory proposal to existing `memoryService.saveMemory`, disabled and dry-run-first by default.
6. **PR #211 — Approval UI and controlled live-write pilot.** Add the operator checklist, safe dry-run action, and pilot-level live-write gates inside the existing Data & Memory persistence section.
7. **PR #213 — Runtime trace and learning event recording.** Record bounded doctrine-stage evidence and proposal-ready learning events with provenance, verification, privacy controls, and no execution or persistence side effects.
8. **Mission profile advisory/collaborative runtime wiring (this phase).** Add reviewed, bounded mission snapshots, deterministic alignment evaluation, advisory recommendations, collaborative guidance, evidence traces, and Settings readiness without autonomous execution or provider-router changes.
9. **Next — Skill registry UI and manifest loading.** Surface reviewed manifests and registry status without loading executable behavior or granting skill execution authority.
10. **Later — Bounded LucaLink handoff.** Consider only minimal, redacted, scoped, expiring, explicitly approved handoff fields. Raw memory databases, hidden prompts, private reasoning, credentials, and files remain forbidden transfer material.

## Current sequence after PR #215

- **PR #215 — Mission Profile advisory/collaborative runtime:** complete as bounded planning context with no autonomous authority.
- **Next — Skill Registry UI + Manifest Loading, No Execution:** static manifest validation, risk/readiness classification, and inspection in the existing Dashboard Skills modal.
- **Next — Skill Runtime Sandbox Planning:** define isolation, approval, permission, trace, and rollback requirements without enabling execution.
- **Later — Controlled Skill Execution Pilot:** permit only a separately reviewed, bounded, explicitly approved pilot.
- **Later — Bounded LucaLink handoff:** consider only redacted, scoped, expiring, explicitly approved data after dedicated transport governance.

## Invariants

1. Reuse existing Settings tabs and LucaOS services instead of creating parallel runtimes or a Personal Intelligence mega-tab.
2. Keep preview, proposal, approval, persistence, and execution as independently reviewable boundaries.
3. Default live persistence off and dry-run behavior on.
4. Block sensitive Privacy Zones unless a future reviewed policy explicitly narrows and authorizes them.
5. Keep model routing, skill/workflow execution, generated code, MCP tools, Device Center, relay, WebRTC, VPN, guest flow, and LucaLink transport unchanged unless their dedicated future PR explicitly changes them.
6. Preserve rollback, deletion, audit, source-safety, and no-render-write tests as integration expands.
