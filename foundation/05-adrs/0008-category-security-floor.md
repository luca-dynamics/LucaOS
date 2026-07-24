# ADR-0008: Category security floor

## Status

Accepted

## Context

LucaOS registers a large [Tool](../02-specification/05-capability-and-tool-layer.md)
surface — roughly 302 tool declarations (Google GenAI `FunctionDeclaration`
schemas) in `src/tools/definitions/`, wired through a central `toolRegistry`.
Safety is modeled as a `SecurityLevel` (0 none → 3 dual) crossed with a
`MissionScope`: each Tool is supposed to declare how dangerous it is and under what
scope it may run, and the permission gate uses that declaration to decide whether an
invocation needs authorization.

The model works only if the declaration exists. The hazard is **omission**. Only a
fraction of the 302 tools had explicit security configuration. For a tool with no
explicit entry, the default behavior determined everything — and a permissive
default means a tool ships **ungated by omission**. Nobody decided that the tool was
safe; someone simply forgot to add a config row, and the absence was read as "no
gating required."

This is one of the exact failure modes [Invariant 8](../01-constitution/01-the-eight-invariants.md#invariant-8--security-and-explicit-permissions)
names: "a new dangerous Tool that ships ungated because no one added a config row."
It is especially dangerous for tools in categories whose _capability class_ is
inherently high-risk regardless of the specific tool: HACKING (the
[Cortex](../02-specification/08-cortex-and-local-intelligence.md) carries OSINT/
pentest tooling), CRYPTO (irreversible financial actions), and messaging (acting in
the user's world, sending on their behalf). A single unlisted tool in one of these
categories, treated as ungated because its config was missing, is a direct breach
of the trust commitments in the [Constitution](../01-constitution/04-trust-and-permissions.md).

Requiring every one of ~302 tools to be individually configured, and trusting that
no future tool is ever added without its config, is not a safety property — it is a
hope. Coverage that depends on nobody ever forgetting is not coverage.

## Decision

**Unlisted tools in dangerous categories receive a minimum security level, so that
omission fails safe. Explicit per-tool configuration still wins.**

- **Category floors.** Each dangerous category (HACKING, CRYPTO, messaging, and the
  like) carries a **minimum** `SecurityLevel`. Any tool in such a category is
  treated as _at least_ that level, whether or not it has an explicit entry.
- **Omission fails closed.** A tool that lands in a dangerous category with no
  explicit configuration does not fall through to a permissive default; it inherits
  its category's floor and is gated accordingly. Forgetting a config row now makes a
  tool _more_ restricted, not unguarded.
- **Explicit configuration still wins — upward.** A per-tool declaration that sets a
  level _at or above_ the floor takes effect as written; explicit intent is
  honored. The floor is a lower bound the omission case cannot sink beneath, not a
  ceiling on deliberate configuration.

```mermaid
flowchart TB
  T[Tool in dangerous category] --> E{Explicit config?}
  E -- yes --> U[Use explicit level]
  E -- no --> F[Apply category floor]
  U --> G[Effective level = max ( explicit, floor )]
  F --> G
  G --> Gate[Permission gate]
```

The effective security level of a tool in a dangerous category is the **maximum**
of its explicit level (if any) and its category floor. Structure, not vigilance,
guarantees coverage.

## Consequences

### Positive

- **Coverage is structural.** A new dangerous Tool cannot ship ungated merely
  because someone forgot a config entry — the category it belongs to gates it by
  default. This is exactly what Invariant 8 requires: "coverage enforced by category
  floors so omission fails safe."
- **The safe default is the automatic one.** The path of least effort (add a tool,
  forget the config) now produces a _more_ restricted tool, aligning laziness with
  safety instead of against it.
- **Deliberate intent is preserved.** Because explicit configuration still wins
  upward, teams can still raise a specific tool's level; the floor only prevents
  sinking below the category minimum by accident.

### Negative

- **Some safe tools are over-gated until configured.** A genuinely low-risk tool
  that happens to sit in a dangerous category inherits the floor and may prompt for
  authorization it does not strictly need, until someone gives it an explicit
  (still floor-respecting) entry. Friction lands on the safe-by-omission case — the
  correct direction for the trade, but a real cost to smoothness.
- **Category assignment becomes security-relevant.** Which category a tool belongs
  to now affects its minimum gating, so miscategorizing a dangerous tool into a
  benign category could under-gate it. Categorization must be treated with care, and
  the category list and its floors must be maintained deliberately.
- **Floors are a coarse instrument.** A single minimum per category cannot capture
  every nuance of risk within that category; it is a safety net, not a precise
  policy. Precise gating still depends on good per-tool configuration — the floor
  only guarantees the net exists.
- **It does not remove the need for review.** The floor prevents the worst omission
  outcome but does not decide correct levels; contributors must still set
  appropriate explicit levels for tools that warrant more than the floor.

## Alternatives considered

- **Hand-maintain explicit config for every tool.** Require all ~302 tools (and
  every future tool) to carry an explicit security entry, enforced by review.
  Rejected: it makes safety depend on no one ever forgetting, across hundreds of
  tools and an open-ended future. Review catches much but not everything; a single
  missed entry on a dangerous tool is a breach. Coverage must not rest on vigilance
  alone. (Explicit config remains valuable and is still honored — it is just no
  longer the _only_ thing standing between a dangerous tool and the gate.)
- **Block-all by default.** Treat every unlisted tool as maximally gated regardless
  of category. Rejected as too blunt: it imposes heavy authorization friction on the
  large majority of benign, unlisted tools, training users to click through prompts
  — which erodes the meaning of a prompt and thus real safety. Concentrating the
  floor on genuinely dangerous categories keeps prompts meaningful where they
  matter.
- **Permissive default with lint/CI warnings.** Keep the permissive default but warn
  when a dangerous tool lacks config. Rejected: a warning is advisory and can be
  ignored or missed; it does not _fail closed_ at runtime, which is what Invariant 8
  demands. A warning is a reminder, not a gate.

## Related

- [Invariant 8 — Security and Explicit Permissions](../01-constitution/01-the-eight-invariants.md#invariant-8--security-and-explicit-permissions)
- [Safety and Permissions](../02-specification/07-safety-and-permissions.md)
- [Capability and Tool Layer](../02-specification/05-capability-and-tool-layer.md)
- [Trust and Permissions](../01-constitution/04-trust-and-permissions.md)
- [ADR-0009: Unconditional permission gate](0009-unconditional-permission-gate.md)
