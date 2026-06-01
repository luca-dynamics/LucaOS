# LucaLink Trust & Permission Policy (PR #184)

> Companion to [`lucalink-host-mesh-architecture.md`](./lucalink-host-mesh-architecture.md)
> and [`lucalink-device-manifest.md`](./lucalink-device-manifest.md).
> **Policy evaluation only.** This layer decides allow / deny /
> requires-origin-approval; it does **not** enforce policy in live runtime.
> Runtime enforcement (wiring into send/receive/execute flows) lands in
> follow-up PRs.

## Purpose

`lucaLinkTrustPolicy.ts` is a pure evaluator that answers, for a given
`LucaHostManifest`:

- may a host use a permission? (`evaluateHostPermission`, `canHostUsePermission`)
- does the action require Origin approval? (`requiresOriginApproval`)
- may a host participate in a sync lane? (`canHostParticipateInLane`)
- what is the default policy posture for a manifest? (`getDefaultPolicyForManifest`)

It reuses PR #182 vocabularies (permission risk bands, sync lanes) and the
PR #183 manifest layer (role, trust level, granted permissions,
`requiresApprovalFor`) so policy stays in parity with the architecture map.

## Decision model

Every evaluation returns a structured result:

```ts
{ decision: "allow" | "deny" | "requires-origin-approval";
  reason: LucaLinkPolicyReason; permission?; risk?; requiresApproval; explain }
```

Evaluation order (permissions): unknown → expired-trust → role restriction →
not-granted → explicit `requiresApprovalFor` → dangerous-permission approval/
elevation → allow.

## Permission risk bands

Risk bands come from `lucaLinkPermissionCategories` (PR #182): `low`, `medium`,
`high` (e.g. `memory.write`, `camera.capture`, `files.write`, `browser.control`),
`critical` (e.g. `shell.execute`, `code.modify`, `git.create_pr`,
`robotics.motion`, `payment.spend`).

Benign perception/IO permissions (chat, voice, camera, screen, location,
notification, `memory.read`, `files.read`, `settings.sync`) are governed by
**role appropriateness** even when their risk band is `high`. Dangerous *action*
permissions (tool execution, file/code mutation, PR creation, memory authority,
physical actuation, spending) are gated behind approval/deny.

## Role restrictions (defaults)

| Role | Posture |
|---|---|
| guest | chat only; everything else denied |
| companion | perception/IO + chat; `memory.write` → approval; no shell/files.write/code/PR |
| sensor | sensor perms only (voice/camera/location) |
| display | output only (chat.receive, notification.send) |
| execution | perception/IO; tool perms → approval; **no** `memory.write` |
| admin | broad; dangerous perms → approval (high may elevate, critical does not) |
| origin | highest authority; dangerous perms → approval, allowed for the local Origin |
| embodied | perception + chat; `robotics.motion` / `smart_home.control` → Origin approval, never auto-allowed |

## Approval & elevation options

```ts
interface LucaLinkPolicyOptions {
  isLocalOrigin?: boolean;       // evaluating the local/current host
  allowCriticalForOrigin?: boolean;
  allowHighRiskForAdmin?: boolean;
  now?: number;
}
```

Conservative defaults: critical permissions require approval unless
`isLocalOrigin && allowCriticalForOrigin`; admin does not auto-bypass critical;
expired trust denies. An explicit `requiresApprovalFor` entry forces approval.

## Lane gating

`canHostParticipateInLane(manifest, laneId)` checks, in order: unknown lane →
deny; expired trust → deny; role allowed for the lane → else deny; then every
required permission must evaluate (deny propagates, approval propagates,
otherwise allow). Notable defaults: `memory`/`tool`/`artifact`/`model` are
origin/admin/execution only; `safety` is origin/admin only; `sensor` is
sensor/companion/embodied with the sensor permissions granted; `conversation`/
`presence`/`identity` are open to all roles.

## Not in this PR

No runtime enforcement, no transport/pairing/relay/local/VPN/guest/WebRTC/
crypto/mission-sync/sensor-pulse/Settings-UI changes, no network calls, no
permission prompts.
