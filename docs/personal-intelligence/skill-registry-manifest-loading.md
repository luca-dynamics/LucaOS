# Skill Registry UI and Manifest Loading

## Scope

This phase adds **static manifest loading and registry inspection only**. The existing Dashboard / OperationRuntime **Skills Matrix modal** is upgraded in place to show the Personal Intelligence Skill Registry; it is not replaced by a second skills surface and no Personal Intelligence mega-tab is added.

The registry accepts in-memory fixture or caller-provided manifest objects, validates their declared fields, applies a deterministic permission/risk policy, produces UI-safe registry entries, and summarizes inspection readiness. Every registry, validation, policy, and readiness output reports `sideEffectsPerformed: false`. Every registry entry reports `executionEnabled: false`.

## Manifest boundary

A manifest is declarative data. `entrypointRef` and `declarationRef` are displayed as inert strings only. The registry does not import, resolve, fetch, read, or invoke either reference.

Validation requires identity, descriptive, version, category, permission, capability, and declaration-reference fields. It blocks declarations involving hidden prompts, private reasoning, raw files, credentials, tokens, private keys, cookies, secret-like values, executable payloads, shell execution, installation, or executable network endpoints. Broad permissions and declarations involving network, files, devices, memory, models, tools, or connectors are surfaced as warnings or review requirements.

## Risk and readiness

The deterministic policy classifies local read-only planning and formatting as low risk; memory proposals, model/tool requirements, and dashboard presentation as medium risk; network, file, connector, browser, and LucaLink handoff requests as high risk; and shell, installation, credentials, payment/trading, device control, exfiltration, or surveillance as critical risk.

High-risk entries require review and sandbox planning. Critical or unsafe entries are blocked. These labels do not grant authority: even a valid low-risk entry can only be inspected.

Readiness intentionally separates:

- `readyForInspection`: whether the declaration has enough structure to display safely;
- `readyForExecution: false`: invariant for every manifest in this phase.

## UI behavior

The existing modal shows loaded, available, review-required, blocked, and disabled counts; search and status/risk filters; manifest cards; permission and risk badges; requirements; memory policy; privacy zones; validation messages; readiness; and an inert entrypoint reference.

The modal states:

- **Manifest loading only — execution disabled.**
- Skills cannot run, call tools or models, write memory, access files or network, or trigger LucaLink in this phase.

The only execution control is visibly disabled and has no handler.

## Explicit non-goals

This phase adds no skill, tool, workflow, MCP, adapter, generated-code, shell, provider, model-router, browser, device, or LucaLink execution. It adds no memory write, governed-memory-adapter call, live-write call, persistence, browser storage, database access, filesystem access, network request, socket connection, credential access, or runtime mutation.

## Future work

Future phases require separate review and implementation:

1. skill runtime sandbox planning;
2. explicit approval gates and permission grants;
3. runtime trace integration;
4. a controlled skill execution pilot; and
5. a later bounded LucaLink handoff with redaction, scope, expiry, and explicit approval.

## Sandbox planning follow-up

The next integration phase adds Skill Runtime Sandbox Planning on top of these inspected entries. It classifies permissions, plans unsatisfied approvals, defines evidence-only runtime trace hooks and future rollback requirements, and displays readiness in the same Skill Registry modal. It still does not load or execute entrypoints. See [Skill Runtime Sandbox Planning](./skill-runtime-sandbox-planning.md).

The staged sequence is:

- PR #217: Skill Registry UI + Manifest Loading;
- next: Skill Runtime Sandbox Planning;
- next: Permission Grant UI + Approval Gates;
- later: Controlled Skill Execution Pilot; and
- later: Bounded LucaLink handoff.
