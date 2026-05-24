# LucaLink Protocol (Embodiment)

## Role
LucaLink is the cross-host nervous system that keeps LUCA mission/memory continuity across devices and channels.

## Protocol Goals
- synchronize mission context and allowed capabilities
- support delegation between host bodies
- keep policy and permission state coherent
- preserve continuity during disconnection/reconnect

## Conceptual Message Types
- `context.sync`
- `mission.delegate`
- `mission.resume`
- `permission.update`
- `artifact.transfer`
- `health.heartbeat`

## Consistency Rules
- last-writer wins only for non-critical metadata
- critical mission state requires monotonic revision control
- reconnect flow must reconcile checkpoints before execution continues

## Repo Touchpoints
- `src/hooks/useLucaLinkState.ts`
- `src/hooks/useLucaLinkDelegation.ts`
- `cortex/server/services/socketService.js`
