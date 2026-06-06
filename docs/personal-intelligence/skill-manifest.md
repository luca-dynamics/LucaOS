# Skill Manifest Standard

A Skill Manifest declares what a Luca skill is before any runtime attempts to execute it. The standard includes identity, semantic version, category, entrypoint, permissions, memory policy, required models and tools, workflows, test definitions, and timestamps.

The pure Skill Registry supports validation, registration, lookup, and listing. It rejects malformed manifests and duplicate identifiers. Registration does not load an entrypoint, invoke a tool, request a model, or grant permissions.

Memory policy declares allowed privacy zones and intended retention. It remains descriptive until a future governed runtime adapter intersects it with the active user and system policy.
