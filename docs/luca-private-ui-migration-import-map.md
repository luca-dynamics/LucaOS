# Private UI Migration Import Map

| Private MacBook surface | Expected file/component | Current GitHub analog | Migration strategy | Risk level | Notes |
|---|---|---|---|---|---|
| Boot sequence | runtime boot shell | startup runtime docs | audit | medium | preserve boot orchestration |
| Onboarding flow | tier-aware onboarding handoff | current onboarding flow | merge | high | contract first, no direct replacement |
| Chat / Voice mode select | onboarding interaction selector | existing mode choices | merge | medium | voice still separately gated |
| Theme opacity/blur setup | onboarding visual prefs | existing UI theme prefs | merge | low | pass through handoff metadata |
| Model mode select: Luca Prime / Local Models / BYOK | onboarding model selector | model routing config | merge | high | keep consent + secure key warnings |
| Local hardware scan | local capability probe | local capability detection hooks | hold | medium | avoid runtime mutation in prep PR |
| Ollama install/pull flow | local model installer | local model docs/runtime plan | hold | high | explicit consent later |
| STT/TTS/Cortex voice model download flow | voice model provisioning | voice runtime services | hold | high | preserve voice runtime upgrades |
| Origin / Creator shell | OriginCreatorShell | tier shell stubs | import | medium | isolated only, not mounted |
| Tactical shell | TacticalShell | tier shell stubs | import | medium | isolated only, no Origin controls |
| Normal shell | NormalShell | tier shell stubs | import | low | isolated only |
| Origin Evolution Dashboard placement | Origin dashboard region | evolution docs/shell contract | audit | high | origin gate only |
| OperationsSidebar analog | ops sidebar component | existing layout/sidebar surfaces | audit | medium | avoid App.tsx replacement |
| ChatPanel analog | chat panel component | existing chat surface | merge | medium | wire later |
| right management panel analog | right panel component | current right-side management area | audit | medium | keep governance visibility |
| VoiceHUD | voice HUD | existing VoiceHUD | hold | medium | preserve routing gates |
| OverlayManager | overlay orchestration | current overlay manager | audit | medium | import safely after contracts |
| VisualCore/widgets | widget layer | current widgets | audit | low | ensure compatibility mapping |
| Settings voice tab | voice settings | settings voice tab | hold | high | do not touch settings service now |
| Model manager/settings | model settings manager | model settings and router | hold | high | byok/local model safeguards |
| LucaLink/device linking | device link surface | LucaLink docs/runtime | audit | medium | ensure continuity contracts |
| Memory settings | memory controls | memory settings | hold | medium | persistence changes out of scope |
| MCP/skills settings | skills/mcp manager | skills runtime settings | hold | medium | stage after shell migration |

Recommended strategy: import isolated components first, avoid replacing `App.tsx`, merge onboarding contracts carefully, preserve voice runtime upgrades and evolution governance contracts, and never expose Origin controls to Tactical/Normal tiers.
