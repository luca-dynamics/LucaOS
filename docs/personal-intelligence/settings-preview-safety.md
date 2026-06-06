# Personal Intelligence Settings Preview Safety

## Scope

PR #207 is a read-only UI integration. The preview components render typed values produced by pure Personal Intelligence boundary helpers. They do not call services directly and do not create a second settings architecture.

Every surface uses explicit language such as **Preview only**, **Not saved**, **Not applied**, or **No execution**.

## Prohibited side effects

The preview component directory must not import or use:

- Node `fs` or `child_process`;
- `fetch`, sockets, or `socket.io-client`;
- `localStorage`, `sessionStorage`, IndexedDB, or other browser persistence;
- provider runtimes or provider mutation APIs;
- model-router mutation methods;
- LucaLink live service or Device Center mutation APIs;
- Electron IPC execution or write APIs;
- skill, tool, workflow, adapter, generated-code, or entrypoint execution.

Source-safety tests scan every preview `.tsx` file for these forbidden boundaries. Render tests verify the required warning labels and visible preview fields.

## Boundary helper behavior

`src/personal-intelligence/integration/previewBoundaries.ts` is pure and deterministic:

- identity, mission, memory, and skill previews use the existing core validators and defensive-copy constructors;
- memory serialization returns a proposed path and text while `writePerformed` remains `false`;
- the doctrine preview copies static stage definitions and reports `executionPerformed: false`;
- integration readiness always reports blockers for persistence, network, execution, and sensitive zones;
- privacy previews mark private, credential, financial, health, and enterprise zones as sensitive and blocked.

These helpers describe proposed boundaries. They are not authorization decisions and do not weaken existing runtime, provider, memory, model, MCP, or LucaLink governance.

## Sensitive information

Preview examples are static and intentionally non-sensitive. The UI does not transfer or display raw memory databases, hidden prompts, private reasoning, credentials, or files. Sensitive Privacy Zones are visibly blocked rather than represented as available.

## LucaLink boundary

The LucaLink tab contains only a future note. No Personal Intelligence helper, payload, service, or adapter is connected to LucaLink. Any future bounded handoff preview requires PR #212 and separate review. Raw memory and private reasoning transfer remain forbidden.

## Runtime meaning

The **Approve** and **Act** doctrine stages are evidence-only labels. Rendering those stages does not approve or perform an action. Preferred models are inert identity metadata and do not change routing. Skill manifests remain declarations; their entrypoints are not loaded.
