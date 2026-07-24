# The Four Questions

Every pull request against any LucaOS repository must be able to answer these four
questions. They are the [Eight Invariants](01-the-eight-invariants.md) and the
[North Star](../00-manifesto/05-north-star.md) compressed into a compass you can
hold during a review.

> 1. **Does this strengthen persistence?**
> 2. **Does this reinforce one identity?**
> 3. **Does this improve trust?**
> 4. **Does this move Luca closer to a continuously present AI?**

## How to use them

The questions are not a form to fill in for its own sake. They are a way to catch,
early and cheaply, changes that drift away from the thesis. Apply them like this:

- **Most changes should answer "yes" or "neutral" to all four.** A change that
  strengthens one and touches none of the others negatively is a good change.
- **A "no" on any question is a stop sign, not a veto.** It means the change, as
  written, moves away from the star on that axis. Sometimes that is acceptable with
  a documented reason; often it means there is a better design that does not.
- **A "no" that touches an [Invariant](01-the-eight-invariants.md) is a hard stop.**
  You do not weigh it against convenience; you redesign, or you open an
  [RFC](../04-rfcs/README.md).

## Question 1 — Does this strengthen persistence?

_Maps to Invariants [2](01-the-eight-invariants.md#invariant-2--persistent-runtime),
[3](01-the-eight-invariants.md#invariant-3--shared-memory),
[7](01-the-eight-invariants.md#invariant-7--backward-compatibility-where-practical)._

Ask: does this make Luca more continuously _there_ across time, or does it add
ephemerality where durability was expected?

- **Yes:** durable state that should survive a restart now does; time-to-presence
  improves; a memory write is bounded so the Archive stays healthy over time.
- **No / watch:** new state lives only in a process that dies with a window;
  in-flight work is lost on Surface switch; a persisted shape changes without a
  migration; a boot path can silently drop to a stateless mode.

## Question 2 — Does this reinforce one identity?

_Maps to Invariants [1](01-the-eight-invariants.md#invariant-1--one-luca-identity),
[4](01-the-eight-invariants.md#invariant-4--provider-abstraction),
[5](01-the-eight-invariants.md#invariant-5--cross-surface-continuity)._

Ask: after this change, is there still exactly one Luca — or have we created a
second one along some seam?

- **Yes:** state that constitutes identity/memory is shared, not surface-local;
  behavior no longer depends on which model answered; a Surface change propagates.
- **No / watch:** per-session or per-Surface identity/memory; a vendor branch above
  the provider layer; a spawned agent accruing durable identity of its own; two
  runtimes over one store.

## Question 3 — Does this improve trust?

_Maps to Invariant [8](01-the-eight-invariants.md#invariant-8--security-and-explicit-permissions)
and [Trust and Permissions](04-trust-and-permissions.md)._

Ask: does this make Luca's action in the user's world more authorized, more
attributable, and more reversible — or less?

- **Yes:** a side effect is now gated, provenanced, or revocable where it was not;
  a check inspects what an action _does_ rather than matching a keyword; a
  dangerous category gets a floor so omission fails safe.
- **No / watch:** a new side-effectful Tool with no gate; an approval step that can
  be bypassed by content in the transcript; a fallback that performs the action
  when its gate fails; a check that fires on a tool name instead of behavior.

## Question 4 — Does this move Luca closer to a continuously present AI?

_Maps to the [North Star](../00-manifesto/05-north-star.md) as a whole._

The synthesis question. Ask: taking this change together, is Luca more of a
continuously-hosted, single, trusted presence — or more of an application the user
opens?

- **Yes:** the change makes Luca more available without being summoned, more
  coherent across surfaces, calmer, more trusted.
- **No / watch:** the change makes Luca more of a destination — a tab, a mode, an
  app to launch — or adds capability at the cost of presence, singularity, or
  trust.

## When the answers conflict

Sometimes a change strengthens one axis and weakens another — say, adds a genuinely
useful capability (progress) that introduces a new side effect (trust risk). That
is not a reason to abandon the change; it is a reason to _complete_ it: gate the
side effect, and now it is a yes on both. The Four Questions are most valuable
exactly here, where they turn a half-finished feature into a finished one.

## In the PR

State the answers where they are not obvious. A one-line "Strengthens persistence
(Q1): memory writes now bounded at write time; neutral on the rest" is often enough.
The point is not ceremony; it is that the author has actually looked, and the
reviewer can see they did.

## See also

- [The Eight Invariants](01-the-eight-invariants.md)
- [The North Star](../00-manifesto/05-north-star.md)
- [CONTRIBUTING.md](../CONTRIBUTING.md)
