# Future Personal Intelligence Wiring Roadmap

Personal Intelligence integration advances through separately reviewed boundaries. Readiness is not approval, approval is not execution, and no later stage may bypass the policy and safety contracts established earlier.

1. **PR #205 — Personal Intelligence Core.** Establish identity, mission, memory, learning, privacy, skills metadata, and execution doctrine as isolated pure modules.
2. **PR #206 — Integration boundaries.** Add preview-only boundaries and readiness contracts without connecting live runtime behavior.
3. **PR #207 — Existing Settings preview UI.** Render Identity, Mission, memory, learning, skill, doctrine, and privacy previews in existing Settings tabs without applying or persisting them.
4. **PR #208 — Governed persistence proposal layer.** Define side-effect-free memory/learning proposals, policy evaluation, approval metadata, audit records, rollback/delete planning, and readiness summaries.
5. **PR #209 — Governed memory adapter.** Add the sole governed bridge from an approved memory proposal to existing `memoryService.saveMemory`, disabled and dry-run-first by default.
6. **PR #211 — Approval UI and controlled live-write pilot.** Add the operator checklist, safe dry-run action, and pilot-level live-write gates inside the existing Data & Memory persistence section.
7. **Next — Runtime trace and learning event recording.** Record bounded runtime evidence and learning events with provenance, retention, verification, and privacy controls; do not silently alter prompts, skills, routing, or memory.
8. **Next — Mission profile advisory/collaborative wiring.** Add reviewed, bounded advisory and collaborative mission-profile integration without autonomous execution or provider-router changes.
9. **Later — Bounded LucaLink handoff.** Consider only minimal, redacted, scoped, expiring, explicitly approved handoff fields. Raw memory databases, hidden prompts, private reasoning, credentials, and files remain forbidden transfer material.

## Invariants

1. Reuse existing Settings tabs and LucaOS services instead of creating parallel runtimes or a Personal Intelligence mega-tab.
2. Keep preview, proposal, approval, persistence, and execution as independently reviewable boundaries.
3. Default live persistence off and dry-run behavior on.
4. Block sensitive Privacy Zones unless a future reviewed policy explicitly narrows and authorizes them.
5. Keep model routing, skill/workflow execution, generated code, MCP tools, Device Center, relay, WebRTC, VPN, guest flow, and LucaLink transport unchanged unless their dedicated future PR explicitly changes them.
6. Preserve rollback, deletion, audit, source-safety, and no-render-write tests as integration expands.
