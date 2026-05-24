# LucaOS Architecture (Foundation)

## High-Level Topology
1. **Interface Layer**: React hooks and tool UI surfaces in `src/hooks/*` and `src/tools/*`.
2. **Runtime Layer**: mission/tool orchestration in `cortex/server/services/cortexService.js`.
3. **Skill & Extension Layer**: protocol skills, skill drops, plugin-style capability surfaces.
4. **Integration Layer**: MCP and external tool brokers in `mcpClientManager.js`.
5. **Security Layer**: security manager, vault, auth middleware, policy checks.
6. **Embodiment Layer**: device/browser/screen capture and cross-host continuity.
7. **Learning Layer**: evolution service and replayable execution data.

## Core Control Flow
User Intent → Mission Planning → Model Route Selection → Tool/Skill Invocation → Guard Evaluation → Execution + Telemetry → Result Packaging → Reflection/Evolution Inputs

## Key Existing Components
- `cortexService.js`: central runtime execution and service integration.
- `ProtocolSkillEngine.js`: skill protocol execution contract.
- `SkillDropService.js`: skill package ingestion/distribution behavior.
- `mcpClientManager.js`: MCP lifecycle and tool endpoint federation.
- `securityManager.js` + `secureVault.js`: controls + secret discipline.
- `evolutionService.js`: learning loop substrate.

## Architectural Directives from Absorb Doctrine
- Mission tape persistence and shadow replay must become first-class.
- Runtime checkpoints are mandatory for long-running workflows.
- Skill imports must be normalized and policy-scored before execution.
- Browser/computer-use channels are treated as controlled embodiment actions, not unrestricted shell access.
- Evolution updates are gated through validation and rollback paths.
