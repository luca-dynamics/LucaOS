# Memory and Learning Runtime Preview

## Memory

A memory preview is a defensive `MemoryItem` containing provenance, confidence, privacy zone, and tags. Serialization may produce JSON/Markdown content and a proposed relative path for inspection. It does not create that path or write content.

A future persistence adapter must check read/write policy, require explicit governed approval for credential, financial, health, and enterprise zones, preserve provenance and confidence, define retention/deletion behavior, and emit auditable outcomes.

## Learning

A learning event preview can include mission and memory references, privacy zone, source, confidence, user feedback, outcome, and verification status. It is evidence only. It cannot update memory, alter a skill, retry a failed action, tune prompts, or change model routing. Runtime failures must be summarized without capturing secrets, hidden prompts, private reasoning, or unnecessary raw payloads.
