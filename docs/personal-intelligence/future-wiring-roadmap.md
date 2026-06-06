# Future Personal Intelligence Wiring Roadmap

Personal Intelligence integration advances through separately reviewed boundaries. Readiness is not approval, approval is not execution, and no later stage may bypass the policy and safety contracts established earlier.

1. **PR #207 — Existing Settings preview UI.** Render Identity, Mission, memory, learning, skill, doctrine, and privacy previews in existing Settings tabs without applying or persisting them.
2. **PR #208 — Governed persistence proposal layer.** Define side-effect-free memory/learning proposals, policy evaluation, approval metadata, audit records, rollback/delete planning, and readiness summaries.
3. **PR #209 — Governed memory adapter.** Add the first real bridge from an approved memory proposal to the existing `memoryService`, disabled and dry-run by default, with strict privacy, approval, validation-audit, rollback, content-safety, and operation gates.
4. **PR #210 — Approval UI and controlled live-write pilot.** Add operator-facing approval controls and narrowly scoped live-write toggles without allowing render-time, preview-time, or implicit writes.
5. **PR #211 — Runtime trace and learning event recording.** Record bounded runtime evidence and learning events with provenance, retention, verification, and privacy controls; do not silently alter prompts, skills, routing, or memory.
6. **PR #212 — LucaLink bounded handoff preview.** Preview only minimal, redacted, scoped, expiring, explicitly approved handoff fields. Raw memory databases, hidden prompts, private reasoning, credentials, and files remain forbidden transfer material.

## Invariants

1. Reuse existing Settings tabs and LucaOS services instead of creating parallel runtimes or a Personal Intelligence mega-tab.
2. Keep preview, proposal, approval, persistence, and execution as independently reviewable boundaries.
3. Default live persistence off and dry-run behavior on.
4. Block sensitive Privacy Zones unless a future reviewed policy explicitly narrows and authorizes them.
5. Keep model routing, skill/workflow execution, generated code, MCP tools, Device Center, relay, WebRTC, VPN, guest flow, and LucaLink transport unchanged unless their dedicated future PR explicitly changes them.
6. Preserve rollback, deletion, audit, source-safety, and no-render-write tests as integration expands.
