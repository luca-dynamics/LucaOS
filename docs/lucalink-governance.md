# LucaLink Governance Evaluation

## Purpose

LucaLink governance turns linked-host trust, approval, and permission records into deterministic, audit-friendly decisions. It is a pure evaluation boundary: it does not pair devices, open network connections, synchronize data, execute tools, perform remote actions, or change the runtime authority model.

Nothing gains authority merely because a host or capability exists. An `allowed` decision requires compatible trust, explicit approval, and a granted permission scope.

## Trust states

The governance layer accepts the linked-host registry vocabulary and normalizes the product concepts below:

| Product state | Registry state                   | Governance meaning                                                   |
| ------------- | -------------------------------- | -------------------------------------------------------------------- |
| Pending       | `pending`                        | Trust is incomplete. Operations remain non-authoritative.            |
| Limited       | `trusted_limited` or `limited`   | Only individually approved and granted scopes can succeed.           |
| Trusted       | `trusted_full` or `trusted`      | Approved and granted scopes can succeed; trust alone grants nothing. |
| Revoked       | `revoked`                        | Revocation wins over approval and permission state.                  |
| Blocked       | `blocked` connection/trust state | The host is always denied.                                           |
| Untrusted     | `untrusted`                      | The host is denied.                                                  |

`trusted_full` does not bypass Primary Host protections, sensitive-action approval, or permission checks.

## Evaluation flow

Evaluation is deterministic and ordered:

```text
terminal state / trust
→ approval
→ connection completeness
→ permission
→ non-runtime architecture gate
→ decision
```

Connection state contributes terminal governance facts (`blocked`, `revoked`) and incomplete setup facts (`pairing`, `pending_approval`). `online` and `offline` do not create or remove authority. The same governance inputs therefore produce the same result while a host is offline.

Every result contains:

```ts
{
  decision: "allowed" | "denied" | "pending" | "revoked";
  reason: string;
}
```

An `allowed` result is a model-level governance classification, not an execution instruction or proof that runtime transport exists.

Reason values such as `device_revoked`, `approval_pending`, and `permission_denied` are stable explanations intended for future audit logs, governance traces, and Operation Center presentation.

## Approval rules

Approval is explicit. `pending` approval never evaluates as `approved` and cannot produce `allowed`, even when a permission is present.

Sensitive permissions remain protected:

- `remote_action`
- `tool_execution`
- `file_exchange`
- `admin_trust`
- `share_screen`

Memory sync and voice relay use the same trust → approval → permission flow. Their non-sensitive classification does not imply silent authority.

## Revocation rules

Revocation is immediate in the evaluation model:

- `revoked` always wins over an otherwise trusted host.
- `blocked` always wins and returns a denied decision.
- A revoked host cannot evaluate to `allowed`.
- Revoking governance state marks approval revoked and removes all active permission grants.
- Sensitive checks fail after revocation.
- No runtime disconnect is performed by this layer.

These rules apply consistently to transitions from pending, limited, or fully trusted state.

## Device Center presentation

The Device Center may display evaluated states such as `Allowed`, `Pending approval`, `Denied`, or `Revoked`. This is read-only explanation. It adds no controls, approval path, transport behavior, or runtime authority.

## Hardened non-runtime permissions

Trust, approval, and a granted permission are necessary but not sufficient for runtime authority. After terminal, trust, approval, connection, and permission checks pass, the evaluator applies explicit architecture gates:

| Permission | Current result | Stable reason |
| --- | --- | --- |
| `remote_action` | `denied` | `remote_action_runtime_disabled` |
| `tool_execution` | `denied` | `tool_execution_runtime_disabled` |
| `admin_trust` | `denied` | `admin_trust_requires_primary_host_review` |

Blocked and revoked facts still win before these architecture gates. Pending trust, approval, connection, or permission also remains pending rather than being rewritten as a runtime-disabled denial.

`sync_memory` remains approval-scoped and privacy-sensitive even though the pure evaluator may classify an approved permission record as `allowed`. That result does not perform memory synchronization. Likewise, `file_exchange` and `share_screen` require approval and permission, but an allowed model decision does not create file-transfer or screen-sharing transport.

## Session ownership relationship

The session ownership foundation is documented in [LucaLink Session Ownership Foundation](./lucalink-session-ownership.md). It consumes linked-host and governance facts without mutating them. Primary Host approval authority remains protected, revoked and blocked hosts cannot own active lanes, and handoff readiness is classification-only.

## Deferred work

This governance foundation intentionally defers:

- pairing
- networking and transport
- transport disconnects
- remote execution and remote actions
- synchronization engines
- device discovery
- runtime authority-model changes

Future consumers must continue to preserve Primary Host protections and must not treat a presentation decision as an execution mechanism.
