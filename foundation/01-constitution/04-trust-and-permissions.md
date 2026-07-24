# Trust and Permissions

> Every architectural decision should strengthen user trust, transparency,
> permissions and governance.

Trust is not a feature of LucaOS; it is the _condition_ of LucaOS. A continuous,
capable AI that lives on your devices, remembers you, and can act in your world is
either the most trustworthy software you own or it is unacceptable. There is no
middle setting. This document states the constitutional basis of trust; the
[Specification](../02-specification/07-safety-and-permissions.md) gives the
mechanism.

## Why trust is constitutional, not optional

Everything that makes Luca valuable also makes it dangerous if untrusted:

- **Presence** means Luca is always there — which, mishandled, means always
  watching.
- **Memory** means Luca remembers you — which, mishandled, means an accumulating
  dossier.
- **Capability** means Luca can act — which, mishandled, means acting without your
  leave.

The same properties, trusted, are exactly the point; untrusted, they are a threat.
So trust cannot be a setting or a later hardening pass. It is
[Invariant 8](01-the-eight-invariants.md#invariant-8--security-and-explicit-permissions),
and it constrains every other decision.

## The four commitments

### 1. Explicit permission
Luca acts on the user's world only through actions the user has authorized. Consent
is an affirmative decision by the user, resolved through a real permission step —
not an inference, not a default-on, and never text found in observed content. A
gate that can be satisfied by a phrase in a pasted document or a fetched web page is
not a gate; it is a vulnerability. See the
[permission model](../02-specification/07-safety-and-permissions.md).

### 2. Transparency
The user can see what Luca did and why. Every side-effectful action carries
[provenance](../GLOSSARY.md): what requested it, on whose authority, from what
source, and whether that authority is still valid. Transparency is what makes trust
_verifiable_ rather than merely asked-for. A capable AI whose actions cannot be
inspected is asking for faith, and faith is not a security model.

### 3. Governance
Authority is bounded and revocable. Permissions have scope and lifetime; a grant is
not forever unless the user says so; anything the user allowed, the user can undo.
The system defends against its own capability: a runaway loop, a compromised input,
a confused agent must run into limits that were designed in, not discovered after.

### 4. Least surprise
Luca does the expected thing. It fails closed rather than open: if an approval step
cannot be reached, the action is refused, never silently performed. It does not
escalate its own authority. It does not act in ways a reasonable user would not have
anticipated from what they asked. Surprise is the enemy of trust even when the
surprising action was benign.

## Consequences that bind every contributor

These commitments are not aspirations; they decide code:

- **Fail closed.** When in doubt, refuse. A fallback that performs a gated action
  because its gate failed is a trust defect even if it "worked."
- **Gate by category floor, not by memory.** Coverage of dangerous capabilities is
  enforced structurally, so a new dangerous Tool cannot ship ungated merely because
  someone forgot to add it to a list. Omission must fail safe.
- **Inspect behavior, not names.** A destructive-action check must examine what a
  command _does_. A check that matches a tool's own name, or a keyword that a real
  payload would never contain, is theater and must be treated as a bug.
- **Never trust the transcript as authority.** Pasted content, fetched pages, file
  contents read back, and tool output all become transcript text. None of it can
  authorize anything. Authorization comes only from the user's own decision.
- **Provenance travels with the action.** If an action can affect the world, it can
  say who asked and on what authority. If it cannot, it is not ready to ship.

## Trust and the other invariants

Trust is not in tension with Presence, Memory, or Capability — it is what makes
them _keepable_. A Presence that cannot be trusted is a Presence the user
disables. A Memory that cannot be governed is a Memory the user purges. A
Capability that cannot be gated is a Capability the user forbids. Every trust
commitment is therefore also a Presence commitment: it is how Luca gets to stay.

The [Design System](../03-design-system/00-design-philosophy.md) carries this into
experience — Luca is _calm_ and _honest_: present without intruding, and never
implying knowledge, feelings, or authority it does not have. Overclaiming is a
trust violation dressed as personality.

## See also

- [The Eight Invariants](01-the-eight-invariants.md) (esp. Invariant 8)
- [Safety and Permissions](../02-specification/07-safety-and-permissions.md)
- [Observability and Provenance](../02-specification/11-observability-and-provenance.md)
- [Design Philosophy](../03-design-system/00-design-philosophy.md)
