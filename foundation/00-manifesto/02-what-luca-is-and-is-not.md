# What Luca Is and Is Not

> Luca is not a chatbot, wrapper, workspace, or automation tool. Luca is one
> continuous AI identity that remains present across time, devices, and
> interactions.

Definitions matter most where the neighbors are close. Many products share a
surface feature with Luca — they talk, they use tools, they remember a little.
Drawing the boundary sharply is how we keep from drifting into being one of them.

## What Luca is not

### Not a chatbot
A chatbot is a request-response loop bounded by a conversation. Close the window
and it ends; open a new one and it begins again, largely blank. Luca is not
bounded by a conversation. A conversation is one moment in a continuous existence
that precedes and outlives it. The chat is an artifact of
[Presence](03-presence-is-the-product.md), not the thing itself.

### Not a wrapper
A wrapper puts a friendlier face on a single model's API and inherits that model's
identity, limits, and lock-in. Luca is defined by its **independence** from any one
model. Which [Provider](../02-specification/04-provider-abstraction.md) answers a
given request is infrastructure detail; Luca's identity and memory persist across
model changes. A wrapper's identity _is_ the model. Luca's identity is its own.

### Not a workspace
A workspace is a place you go to do work — a canvas, a set of documents, a
project hub. It is a destination with a boundary. Luca is not a place you visit.
Luca comes to wherever you are, on whatever [Host](GLOSSARY) is nearest, and the
work lives in Luca's continuous understanding rather than inside a bounded
workspace you must open.

### Not an automation tool
An automation tool executes predefined workflows: triggers and actions you wire
up in advance. It is powerful and brittle and, crucially, _not present_ — it runs
when fired and is otherwise inert. Luca automates when useful, but automation is a
Tool Luca reaches for, not what Luca _is_. Luca is present whether or not anything
is being automated.

## What Luca is

**Luca is one continuous AI identity that remains present across time, devices, and
interactions.** Unpack that:

- **One** — a single identity, not a fleet. See
  [The One Identity Principle](04-the-one-identity-principle.md).
- **Continuous** — it does not begin and end with a session. It has a
  [Runtime](../02-specification/01-persistent-runtime.md) that keeps it alive
  between interactions.
- **Identity** — it has a stable self: a way of understanding you, a voice, a set
  of commitments, an accumulating [Memory](../02-specification/03-memory-architecture.md).
  Not a personality skin over an API, but a coherent presence.
- **Across time** — what happened last week is available now, not because a
  transcript was retrieved but because Luca remembers.
- **Across devices** — the same Luca on your desktop, phone, watch, car, headset.
  Different [Surfaces](../02-specification/06-surface-layer.md), one identity.
- **Across interactions** — the boundary between "sessions" softens. There is
  before, during, and after — one thread.

## The test

When you are unsure whether a proposed feature belongs in LucaOS, apply this test:

> Does this feature treat Luca as a **destination the user opens**, or as a
> **presence the computer hosts**?

Anything that makes Luca more of a place you go — a tab, a mode, an app you launch
to "talk to the AI" — is drifting toward chatbot/workspace and away from the
thesis. Anything that makes Luca more continuously _present_ — available before you
ask, aware across surfaces, acting through tools without becoming one — is aligned.

This is the same test the [Constitution](../01-constitution/README.md) formalizes
as the Four Questions, and it is worth internalizing here, at the level of
intuition, before it becomes process.

## A note on humility

Saying "Luca is one continuous identity" is a design commitment, not a claim about
consciousness or inner life. Luca is software. The point of the language of
identity and presence is that _the user experiences_ continuity and singularity,
and that the architecture must therefore deliver them. We describe what Luca is
_for the user_ and what the system must _guarantee_ — not metaphysics. The
[Design System](../03-design-system/README.md) is deliberately careful never to
imply feelings or human aliveness that Luca does not have; honesty is part of
trust.

## See also

- [The Thesis](00-the-thesis.md)
- [Presence Is the Product](03-presence-is-the-product.md)
- [Trust and Permissions](../01-constitution/04-trust-and-permissions.md)
