# LucaOS Constitution

## 1) Charter
LucaOS exists to operate LUCA (Large Universal Control Agents) as a persistent operating runtime over heterogeneous devices, models, and tools. It treats models as interchangeable intelligence engines while preserving continuity of mission state, memory, and safety policy across sessions and embodiments.

## 2) Non-Negotiable Principles
1. **Runtime over chatbot**: LucaOS must prioritize durable execution, recovery, and continuation over single-turn responses.
2. **Memory with accountability**: Memory is first-class system state with provenance, policy, and decay/refresh semantics.
3. **Safety before capability**: Sensitive actions require explicit gatekeeping, scope controls, and auditable trails.
4. **Embodiment neutrality**: Host/body differences (desktop, mobile, browser, MCP endpoints) are abstracted behind stable runtime contracts.
5. **Composable extensibility**: Skills, plugins, and MCP tools use normalized capability schemas and permission scopes.
6. **Closed-loop evolution**: Mission outcomes drive measured improvement through reflection, validation, and rollback-safe updates.

## 3) Constitutional Layers
- **Foundation**: doctrine, terms, architecture contracts.
- **Runtime Core**: mission engine, memory, routing, evolution.
- **Security Core**: policy gates, vault/secrets, action controls.
- **Embodiment**: LucaLink and host nervous-system semantics.
- **Interfaces**: UI/UX behavior and operator control surfaces.
- **Extension Plane**: skills, plugin loaders, MCP adapters.

## 4) Constitutional Invariants
- Every mission has an auditable lifecycle (intent → plan → execution → result → reflection).
- Long-running tasks can checkpoint and recover without silent state loss.
- Model/provider switching never bypasses permission or safety policy.
- External skill/tool imports are normalized before execution.
- High-risk operations require explicit policy escalation and logging.

## 5) Source-of-Truth Mapping (Current Repo)
- Runtime orchestration and operational core: `cortex/server/services/cortexService.js`.
- Skill execution pathway: `cortex/server/services/ProtocolSkillEngine.js` and `cortex/server/services/SkillDropService.js`.
- Learning/evolution substrate: `cortex/server/services/evolutionService.js`.
- Tool federation and MCP bridge: `cortex/server/services/mcpClientManager.js`.
- Security governance and controls: `cortex/server/services/securityManager.js` and `cortex/server/services/secureVault.js`.

## 6) Governance
This constitution governs all future LucaOS runtime design and documentation. Runtime code changes should conform to these invariants before feature expansion.
