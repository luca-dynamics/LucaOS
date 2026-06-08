# LucaLink Dry-run Handoff Simulation

## Scope

This phase adds a model-only, side-effect-free LucaLink handoff simulation. Existing adapter sandbox plans, web display intents, approval notification summaries, read-only sensor snapshots, transport permission decisions, and adapter file/install permission decisions can be converted into deterministic review evidence.

The simulation describes source and target host scope, message and transport classification, approval routing, capability previews, blocked runtime actions, readiness, and audit summaries. It does not create a live handoff.

## Safety invariants

Every simulation reports:

- `dryRunOnly: true`
- `sideEffectsPerformed: false`
- `handoffEnabled: false`
- `transportSendEnabled: false`
- `adapterExecutionEnabled: false`
- `displayOpenEnabled: false`
- `sensorCollectionEnabled: false`
- `fileWriteEnabled: false`
- `installEnabled: false`

Accordingly, this layer:

- does not send transport messages or mutate transport, pairing, or connection lifecycle state;
- does not execute adapters or import adapter entrypoints;
- does not open, cast, or control displays;
- does not collect sensors and only inspects supplied read-only snapshots;
- does not write files or install packages;
- does not send approval notifications or approval decisions;
- does not persist simulation state;
- does not grant runtime authority from an approval result.

The approval path is informational only. It identifies the reviews a future handoff would require without notifying approvers, satisfying approvals, or enabling execution.

## Deterministic evidence

A simulation produces a fixed sequence that inspects model inputs, scopes hosts, checks governance decisions, summarizes approval routing, previews transport, explicitly skips every live capability, verifies disabled authority flags, and creates an audit summary. Fixture-backed results can be shown in LucaLink Device Center and bridged into Operation Center under `lucalink_dry_run`.

Operation Center receives copies of summaries only. It cannot execute, approve, send, collect, write, install, or mutate LucaLink runtime state.

## Future bounded handoff pilot

A live bounded handoff is outside this phase and requires a separate security review plus, at minimum:

1. explicit host approval with clear authority boundaries;
2. enforced transport channel and message-class permissions;
3. expiry, minimization, and redaction of handoff payloads;
4. rollback and tamper-evident audit behavior;
5. Operation Center visibility for all decisions and blocked actions;
6. explicit adapter, display, sensor, file, and install capability enforcement;
7. a separately reviewed implementation that does not treat dry-run approval as runtime authorization.
