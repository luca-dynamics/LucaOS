# The North Star

> **LucaOS is building the software layer that enables computers to continuously
> host one persistent AI.**

Every project needs one sentence that settles arguments. This is ours. When a
decision is genuinely unclear — when reasonable people disagree and the
[Specification](../02-specification/README.md) does not yet say — you navigate by
the North Star.

## Reading it word by word

The sentence is precise. Each phrase is doing work.

- **"the software layer"** — LucaOS is a substrate, not an application and not a
  device. We build the layer that makes hosting a persistent AI possible; we do
  not confine it to a single app or a single piece of hardware. This is why the
  [Surfaces](../02-specification/06-surface-layer.md) are many and the
  [Runtime](../02-specification/01-persistent-runtime.md) is central.
- **"that enables computers"** — plural, general. Not one flagship device; the
  many [Hosts](GLOSSARY) a person already owns. The layer must generalize across
  desktop, mobile, wearable, vehicle, and headset, or it is not the layer.
- **"to continuously"** — the hard word. Not "occasionally," not "on demand."
  Continuity in time is the property that separates [Presence](03-presence-is-the-product.md)
  from a chatbot. If a decision trades away continuity for convenience, it is
  almost always wrong.
- **"host"** — the computer _hosts_ Luca; it does not _launch_ it. Hosting implies
  Luca outlives any session and any window, the way an OS hosts a daemon. This is
  the [Host Computing](GLOSSARY) idea in one verb.
- **"one persistent AI"** — one, not many
  ([singularity](04-the-one-identity-principle.md)); persistent, not ephemeral
  ([the Runtime](../02-specification/01-persistent-runtime.md) and
  [Memory](../02-specification/03-memory-architecture.md)).

## How to use it

The North Star is a tie-breaker and a direction, not a checklist. Use it like
this:

1. When a design has two defensible options, choose the one that moves Luca closer
   to being _continuously present, singular, and trusted_. If one option makes
   Luca more of an app you open and the other makes it more of a presence the
   computer hosts, the second wins.
2. When a shortcut is tempting, ask what it costs in continuity or singularity. A
   shortcut that shards identity or breaks persistence is expensive even when it
   is fast, because it moves _away_ from the star.
3. When scoping a phase, ask whether it advances the star or merely adds surface
   area. The [Roadmap](../06-roadmap/README.md) is organized so that every phase is
   a step toward the star, not a pile of features beside it.

## The North Star and the Four Questions

The [Four Questions](../01-constitution/02-the-four-questions.md) are the North
Star made operational — persistence, identity, trust, and progress toward
continuous presence are exactly the components of the sentence, turned into
review criteria. If the North Star is the direction, the Four Questions are the
compass you actually hold in your hand during a PR.

## What success looks like

We will know the layer is real when a person can:

- Turn to Luca on any device they own and find the _same_ Luca, already aware of
  their context, with no sense of having "switched assistants."
- Close every window and know Luca is still there — that returning is _continuing_,
  not restarting.
- Trust that Luca acts in their world only with clear permission, and see exactly
  what it did and why.
- Forget which model answered, because it never mattered.

None of those is a feature you can ship in isolation. Each is a property of the
_layer_. Building that layer, continuously and singularly and trustworthily, is
the whole of LucaOS.

## See also

- [The Thesis](00-the-thesis.md)
- [The Four Questions](../01-constitution/02-the-four-questions.md)
- [The Roadmap](../06-roadmap/README.md)
