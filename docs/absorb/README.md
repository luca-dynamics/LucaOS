# Luca Absorb Architecture

This folder stores the LucaOS architecture absorption doctrine.

## Current source file

Read this file first before making major LucaOS architecture changes:

```text
docs/absorb/Luca_Absorb_Architecture_v12.md
```

## Progress snapshot (product code, not doctrine)

Doctrine remains in `Luca_Absorb_Architecture_v12.md`. This table tracks **shipped pilots** vs open absorb phases.

| Absorb roadmap phase | Status | Evidence in repo |
| --- | --- | --- |
| **1 Stability + execution** | **Partial → real wire + UI** | Gates + tape; product complete API; workforce/CU MissionControl loop + **auto start checkpoint**; **Mission Center** readiness, gate detail, tape timeline, **checkpoint/rollback (tape-level pilot)**; PI Mission Profile stays **read-only advisory** |
| **2 Memory + context** | **Partial → vault pilot** | PI memory / approval pilots; **MemoryVaultService** + UI; ingest/compress/multi-format import; **product bridge** (LucaLink + eventBus + **auto durable chat turns** via TurnRunner/`extractLifeDirectives`); deeper host scrape + model summarization open |
| **3 Ecosystem + skills** | **Partial → marketplace pilot** | Marketplace import/export/lifecycle; sandbox plans; LucaLink sync; **discovery filters**; **invoke simulation** (never executes); **product bridge boot hooks**; live tool invoke still disabled |
| **4 Evolution + self-repair** | Partial | Evolution services + governance; Hermes trajectory productization open |
| **5 Embodiment** | Strong base | LucaLink, computer-use, host control; robotics open |

Related local-runtime work (Cortex/Ollama facade) supports the north star but is tracked in `docs/local-model-runtime-plan.md`.

## Codex instruction

1. Read `docs/absorb/Luca_Absorb_Architecture_v12.md` fully before creating foundational docs/specs or making major architecture changes.
2. Use it as doctrine for foundational docs, runtime specs, embodiment, computer-use, Ghost Browser, LucaLink, memory, mission engine, UI/UX, security, and evolution work.
3. Keep runtime refactors separate from doctrine/documentation changes unless explicitly requested.
4. Do not blindly copy external repositories. Absorb their strongest patterns natively into LucaOS.
