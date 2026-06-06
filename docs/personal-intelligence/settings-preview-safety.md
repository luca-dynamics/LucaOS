# Personal Intelligence Settings Preview Safety

The Personal Intelligence cards in Data & Memory and Knowledge Bridge are read-only inspection surfaces. PR #207 established preview-only Settings composition; PR #208 adds proposal/audit/readiness information to those existing surfaces rather than creating another Settings tab.

## PR #208 UI guarantees

- The Data & Memory card shows a sample memory proposal, `review_required` status, blockers/warnings, `writePerformed: false`, and “No storage adapter connected.”
- Knowledge Bridge shows a compact memory persistence proposal with its proposed path and explicit approval requirement.
- The cards do not expose an approve, write, save, execute, sync, or connect action.
- Rendering the cards creates only deterministic in-memory preview values.
- No memory is written and no learning event is persisted.
- No local storage, browser database, filesystem, database, provider, network, LucaLink, MCP, tool, or Electron IPC connection is introduced by these previews.

The surrounding legacy Settings surfaces retain their existing behavior; the PR #208 Personal Intelligence preview components do not invoke or mutate those services.

Future PR #209 or later may introduce a governed local persistence adapter only through separate review. Until then, proposal approval means `approved_for_future_adapter`, never approval to perform a write.
