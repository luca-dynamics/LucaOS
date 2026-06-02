# LucaLink Soft Enforcement

PR #191 adds a cautious, default-off soft-enforcement layer for high-risk LucaLink actions. It classifies what would be allowed, denied, or require Primary Host approval without turning LucaLink into a fully enforced runtime policy engine.

## Modes

- `disabled` — default. Runtime behavior is unchanged and nothing is blocked.
- `observe-only` — returns the soft-enforcement classification for diagnostics, but never blocks.
- `high-risk-only` — blocks or approval-gates only dangerous lanes and permissions.

## High-risk-only scope

High-risk-only mode covers clearly restricted actions such as guest memory/tool/safety lanes, guest full identity lane activity, shell execution, file writes, code modification, git PR creation, browser control, robotics motion, smart-home control, and payment/spending.

Payment/spending is denied by default. Physical-world actions such as robotics motion, smart-home control, and actuator-like commands must not silently pass; they require Primary Host approval when an approval candidate exists and can be denied when none exists.

## Flows that remain allowed

Normal LucaLink runtime traffic remains allowed, including pairing-adjacent registration, heartbeat/presence, registry sync, basic chat/message, mobile reconnect, guest chat, WebRTC signaling diagnostics, mission sync observation, and sensor pulse observation.

## Runtime integration

The live runtime default is `disabled`. The service exposes helpers to enable, disable, read the mode, and evaluate a runtime event, but existing inbound pairing, guest, WebRTC, mission, and sensor paths remain observed/shadowed rather than blocked.

No approval UI, prompts, storage-backed policy state, socket events, backend endpoints, telemetry, or full runtime enforcement are added in this PR.

## Next step

After soft gates are validated, a later PR can consider full runtime enforcement and explicit approval UX while preserving the Creator/Origin boundary and keeping normal mesh authority under Primary Host terminology.
