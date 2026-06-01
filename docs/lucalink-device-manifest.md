# LucaLink Device Manifest + Capability Registry (PR #183)

> Companion to [`lucalink-host-mesh-architecture.md`](./lucalink-host-mesh-architecture.md) §H.
> **Additive foundation only.** This PR classifies capabilities; it does **not**
> enforce permissions and does **not** change LucaLink runtime behavior.
> Permission enforcement lands in PR #184 (Trust & Permission Policy).

## What this adds

Two new, runtime-safe modules under `src/services/lucaLink/`:

- **`lucaHostManifest.ts`** — the `LucaHostManifest` type and its sub-shapes
  (`hardware`, `sensors`, `capabilities`, `models`, `trust`, `status`). Role,
  trust, and permission vocabularies are aliased to / typed against the PR #182
  architecture map (`lucaLinkArchitectureMap.ts`) so the two never drift.
- **`capabilityRegistry.ts`** — pure helpers for building, inferring,
  normalizing, validating, and classifying manifests.

Schema version: `luca-host-manifest/v1`.

## Helper surface (`capabilityRegistry.ts`)

| Helper | Purpose |
|---|---|
| `createDefaultHostManifest(input)` | Build a complete, conservative manifest. |
| `normalizeManifest(partial)` | Fill missing fields with safe defaults. |
| `mergeManifestStatus(m, patch)` | Pure status update (advances `updatedAt`). |
| `validateHostManifest(m)` | Validate against schema + PR #182 vocabularies. |
| `inferPlatformFromUserAgent(ua)` | Coarse platform from a UA string. |
| `inferHostRoleFromPlatform(p, opts)` | Conservative role inference. |
| `getDefaultPermissionsForRole(role)` | Conservative default permission grant. |
| `isHighRiskCapability(cap)` | Whether a capability maps to a high/critical permission. |
| `manifestFromLucaLinkDevice(device)` | Map the active `LucaLinkDevice` shape into a manifest. |
| `detectLocalHostHints()` | Permissionless local runtime/platform hints. |

## Security posture (classification only — not enforced yet)

- Unknown / web devices default to the **guest** role and least-privilege
  (chat only — no memory write, no tools).
- **Companion** (phone/tablet) may request actions but gets no
  shell / `files.write` / `git.create_pr` by default.
- **Execution / origin** roles can advertise dangerous capabilities; **origin**
  additionally holds memory authority. These are listed clearly for the future
  policy layer but are **not** enforced in this PR.
- **Embodied** hosts do **not** receive `robotics.motion` by default.

`detectLocalHostHints()` is permissionless: it never requests camera / mic /
location, never scans the filesystem, never runs shell commands, makes no
network calls, and writes no storage. It only reads ambient globals when
explicitly called — never at module import.
