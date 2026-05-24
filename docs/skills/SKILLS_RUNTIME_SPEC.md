# Skills Runtime Spec

## Scope
Unified execution/runtime policy for Luca-native skills, MCP tools, plugins, and imported skill formats.

## Skill Contract (Normalized)
`id, source, permissions, tools, prompts, memory_policy, risk_level, sandbox, version`.

## Runtime Rules
- All skill execution is permission scoped.
- Sensitive/untrusted skills run sandboxed.
- Skill invocations are logged into mission tape/audit channels.
- Skill updates support versioning and rollback.

## Evolution
Skill refinements are allowed only via guarded evolution workflow (Origin Mode + verification).
