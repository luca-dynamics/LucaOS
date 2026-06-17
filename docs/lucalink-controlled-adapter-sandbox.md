# LucaLink Controlled Adapter Sandbox Runtime

## Scope

This phase adds a controlled LucaLink adapter **planning shell**, not an adapter
execution environment. It validates declarative manifests, evaluates requested
capabilities, creates permission and host-approval requirements, produces a
bounded dry-run plan, and creates side-effect-free audit records.

The runtime is disabled by default and remains in dry-run mode. An
`entrypointRef` is inert metadata: the sandbox does not resolve, import, load, or
execute it.

## Safety boundaries

The sandbox does not:

- execute generated code or adapter code;
- execute shell commands or use process-spawning APIs;
- read or write files;
- install packages or adapters;
- call or mutate network, relay, WebRTC, VPN, pairing, guest, or socket
  transports;
- control devices, actuators, sensors, or physical-world systems;
- perform payments or financial actions;
- access credentials, tokens, secrets, private keys, hidden prompts, private
  reasoning, or raw file/code payloads;
- alter existing LucaLink approval, trust, routing, provider, or transport
  behavior; or
- import or modify Personal Intelligence modules.

Every execution plan and audit record has `sideEffectsPerformed: false`.
Generated-code execution, shell execution, file writes, installation, network
mutation, device control, and credential access are fixed to `false` in the
resolved runtime configuration.

## Manifest and capability policy

A manifest declares identity, version, target host types, requested
capabilities and permissions, an inert entrypoint reference, timestamps, and
optional integrity/provenance metadata. Validation rejects missing required
fields, unknown or executable capabilities, embedded hidden/system prompts,
private reasoning, raw code payloads, and credential-like material.

The supported declarative capabilities are:

- `display.read`
- `display.present`
- `sensor.read`
- `notification.request`
- `approval.request`
- `message.send`
- `file.read.preview`
- `file.write.request`
- `install.request`
- `network.request`
- `device.status.read`

`file.write.request`, `install.request`, and `network.request` are request-only.
They produce permission requests, blockers, and audit steps but never perform
the requested operation. Display presentation and other outward-facing request
capabilities require host approval. Approval itself does not grant or trigger
execution.

## Dry-run plans and audit records

A plan contains manifest validation, capability evaluation, required approvals,
permission requests, blocked-operation steps, warnings, blockers, risk level,
and final status. The default disabled configuration produces a blocked sample
plan in Device Center. An enabled safe configuration can produce
`approval_required` or `dry_run_ready`, but still cannot execute an adapter or
perform side effects.

The Device Center's **Adapter Sandbox Runtime** card is read-only. It exposes the
default disabled status, enabled dry-run posture, blocked execution and side
effects, required host approval, and the static sample plan status. It provides
no execute, install, write, network, or device-control action.

## Future tracks

Separate future PRs may add a Web Display Bridge MVP, companion-host approval
notifications, a read-only Sensor Bridge MVP, a network/transport permission
model, and adapter file-write/install permission models. Those tracks must add
their own enforcement and approval reviews; this planning shell does not
pre-authorize them.

## Companion approval notification surface

Approval requirements derived from adapter dry-run plans can be represented through the existing LucaLink approval request model as companion-host notification cards. The notification layer reuses multi-host authority and redacted payload-preview rules; it does not execute the adapter or grant its requested capability.

Notification decision intents remain separate from adapter approval state and execution. Approve, deny, or escalation intent creation does not mutate the approval queue, install code, write files, change a network, or invoke an adapter entrypoint.

## Read-only sensor bridge capability boundary

`sensor.read` and `device.status.read` are currently model-only/readiness-only.
They may be used to construct an inert, summarized Sensor Bridge snapshot, but
they do not call sensor APIs, execute an adapter entrypoint, request device
permissions, collect live telemetry, send transport messages, or control a
device. Adapter or host approval does not grant live sensor collection.

## Transport permission conversion

Adapter execution plans can be converted into side-effect-free LucaLink transport permission requests for policy preview. Conversion does not execute an adapter, load an entrypoint, authorize a capability, mutate a network, or send a message; live transport readiness remains false.

## File-write and install permission evaluation

Declarative `file.write.request` and `install.request` capabilities are now converted into and evaluated by the Adapter File Write + Install Permission Model. Evaluation is model-only: it does not execute an adapter, write a file, install a package, approve a request, or send a transport message.

## Dry-run handoff simulation integration

LucaLink governance outputs can feed the side-effect-free dry-run handoff simulation layer and may appear as read-only `lucalink_dry_run` summaries in Operation Center. Dry-run evidence does not send, execute, collect, write, install, approve, open displays, or mutate pairing, transport, approval, device, or runtime state.
