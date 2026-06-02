# LucaLink Host Routing Engine (PR #187)

A **pure, additive** routing engine for LucaLink Mesh. Given a task and a set of
candidate hosts, it decides which host is the best candidate to handle the task,
returning ranked candidates, the selected host, fallbacks, blocked hosts,
approval requirements, and human-readable explanations.

It is implemented in `src/services/lucaLink/lucaLinkHostRouter.ts` and builds on
the existing additive LucaLink Mesh layers (PR #182–#186): the architecture map,
host manifest + capability registry, trust & permission policy, and the sync
lane protocol.

> **Boundary:** `Origin` is reserved for the LucaOS Creator/source-code
> authority. Normal device/mesh authority is the **Primary Host**, and the
> user's highest mesh trust level is `owner`. This engine never uses `Origin`
> as a normal host role, trust level, or approval concept.

## Purpose & guarantees

The engine **only scores and explains**. It performs:

- no network/socket calls
- no `localStorage` / `sessionStorage` writes
- no permission prompts, no camera/mic/location access
- no filesystem access, no shell execution
- no runtime enforcement and no live message sending

Wiring routing into the live runtime (transport, pairing, relay/local/VPN,
guest, WebRTC, crypto, mission/sensor sync, Settings UI) is intentionally a
follow-up.

## Input model

A `LucaLinkRoutingTask` describes the work to route: `type`, optional `lane`,
required/preferred capabilities, required permissions, `risk`, `privacy`,
presence/approval requirements, payload size, estimated compute, latency
sensitivity, and transport preferences.

A `LucaLinkRoutingCandidate` wraps a `LucaHostManifest` plus optional, pure
runtime hints (no live calls):

- `transport`: `delivery`, `latencyMs`, `reachable`, `relayAvailable`, `localAvailable`
- `context`: `isActiveUserDevice`, `isCurrentHost`, `isPrimaryHost`, `lastInteractionAt`

## Scoring factors

`scoreHostForTask` produces a `LucaLinkRoutingScoreBreakdown` with subscores in
`0–1` and a weighted, risk-adjusted `total` in `0–100`. Default weights
(`DEFAULT_ROUTING_WEIGHTS`, summing to 1.0):

| factor | weight | factor | weight |
| --- | --- | --- | --- |
| capability | 0.25 | latency | 0.08 |
| permission | 0.20 | compute | 0.08 |
| trust | 0.15 | battery | 0.04 |
| privacy | 0.10 | userContext | 0.04 |
| | | thermal | 0.03 |
| | | transport | 0.03 |

`risk` is a separate fit subscore (`0–1`) applied as a multiplicative penalty to
the weighted total, so a host with insufficient trust for a high/critical task
is proportionally down-ranked.

## Policy integration

Routing respects PR #184 policy via `canHostParticipateInLane` and
`evaluateHostPermission`:

- A host **denied** for the task lane or a required permission is **blocked**.
- A host that **requires Primary Host approval** can still rank, but the final
  decision sets `requiresPrimaryHostApproval: true` with `approvalReasons`.
- Guest hosts are never selected for memory/tool/safety/model/artifact tasks.
- Companion hosts are never selected for shell/code/file-mutation tasks.
- Execution hosts may handle tool/code/file tasks but surface Primary Host
  approval.
- The Primary Host is preferred for safety and owner-sensitive tasks.

## Privacy & transport rules

- `local-only`: prefer current/local/Primary Host; block guest and relay-only
  and untrusted remote candidates.
- `trusted-only`: allow trusted/admin/owner; block guest and low-trust paired
  (except low-risk conversation/presence).
- `relay-ok`: relay candidates allowed.
- `guest-ok`: guests only for low-risk conversation/display tasks.
- Transport: unreachable → blocked; local/direct preferred for realtime work;
  store-and-forward only when the task allows it; battery `<5%` blocks heavy
  non-critical tasks; thermal `critical` blocks heavy compute (safety/critical
  tasks are exempt from battery/thermal penalties).

## Example decisions

- "Selected Companion Host because it provides required capabilities:
  visionCapture." (camera task on the active phone)
- "Selected Execution Host … Requires Primary Host approval: Execution host
  tool/code/file action requires Primary Host approval."
- "No eligible host found for memory task … 1 candidate(s) were blocked."
  (guest blocked from the memory lane)
- "Selected Primary Host … for safety task." (safety routes to the Primary Host)

## Key exports

`routeLucaLinkTask`, `rankLucaLinkHosts`, `scoreHostForTask`,
`isHostEligibleForTask`, `getRequiredCapabilitiesForTask`,
`getRequiredPermissionsForTask`, `getLaneForTask`, `explainRouteDecision`.
