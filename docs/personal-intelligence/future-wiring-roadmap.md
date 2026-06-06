# Future Personal Intelligence Wiring Roadmap

PR #208 adds proposal, audit, planning, and readiness contracts. It does not authorize persistence or runtime wiring.

1. **PR #207 — Personal Intelligence Settings preview UI.** Render preview-only memory and learning state in existing Settings surfaces without applying it.
2. **PR #208 — Governed persistence proposal layer.** Add typed proposals, privacy policy checks, in-memory audit records, rollback/delete planning, readiness summaries, and read-only Settings proposal previews. No memory is written, no learning event is persisted, and no storage adapter is connected.
3. **PR #209 or later — Separately reviewed governed local persistence adapter.** Only after review, define explicit writes, approval provenance, migrations, retention, deletion, recovery, and adapter isolation.
4. **Later — Skill Registry UI and manifest loading without execution.** List and validate declarative manifests only.
5. **Later — Execution Trace and Learning Log runtime event recording.** Record bounded evidence with approval provenance and retention controls.
6. **Later — Mission Profile advisory runtime integration.** Keep tool execution unavailable until separately governed.
7. **Later — Personal Intelligence + LucaLink bounded handoff preview.** Transfer only explicitly approved, minimal preview fields.
8. **Later — Skill runtime sandbox planning.** Specify isolation, permission grants, approval gates, and verification before implementation.

Readiness for a future adapter is not approval to write. Each runtime or persistence boundary requires its own reviewed change.
