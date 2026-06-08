# Personal Intelligence Runtime Authority Boundary

This integration phase defines authority boundaries only. It adds a pure capability registry and policy model that classifies declared Personal Intelligence capabilities as `permanently_blocked`, `review_only`, `dry_run_only`, `future_pilot_candidate`, or `unsupported`.

## No execution is enabled

Every authority record, evidence object, readiness summary, Skill Registry card, and Operation Center item preserves these invariants:

- `authorityGranted: false`
- `executionEnabled: false`
- `canExecute: false`
- `readyForExecution: false`
- `sideEffectsPerformed: false`

The boundary does not execute skills, invoke tools or MCP, run workflows, call models, write memory, access files or networks, mutate a display surface, install packages, run commands, or hand off to LucaLink.

## Classification policy

Permanent blocks include shell commands, package installation, credential access, private reasoning access, generated-code execution, device control, payment or trading, raw-file exfiltration, background surveillance, and unknown critical capabilities.

Memory proposals and advisory/inspection sources remain review-only. Skill, tool, MCP, workflow, model, browser, network, file, connector, memory-write, and LucaLink declarations remain dry-run-only unless a low- or medium-risk declaration satisfies every item of future-pilot evidence.

Unsupported records include incomplete declarations, missing manifests, missing sandbox plans, malformed capability kinds, and unsupported sources. Critical-risk records cannot become future pilot candidates.

## Future pilot candidates are not executable

A future pilot candidate requires successful dry-run evidence, no blocked/denied/expired gates, all required gates granted for review, aligned or reviewed mission evidence, a rollback expectation, a runtime-trace preview, and no permanently blocked capability. Meeting those requirements only identifies a candidate for later review.

Dry-run success is not execution approval. Grant-for-review is not execution approval. An attempted true authority or runtime flag is rejected and recorded as a blocker.

A future controlled execution pilot requires a separate explicit implementation, an isolated runtime, enforced rollback, durable audit, and explicit review. Nothing in this boundary supplies that implementation or authority.
