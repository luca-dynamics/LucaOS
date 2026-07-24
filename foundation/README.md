# LucaOS Foundation

> The canonical source of truth for LucaOS: its philosophy, its constitution, its
> architecture, its design language, and the standards every engineer, designer,
> and AI coding agent is expected to uphold.

LucaOS is building the software layer that enables computers to **continuously
host one persistent AI**. This repository is not the product; it is the
_constitution_ of the product. Code changes; the principles here change slowly,
deliberately, and only through a documented amendment process.

If you are about to write code, a design, or a document for LucaOS, you are in
the right place. Start with the [Manifesto](00-manifesto/README.md) to understand
_why_, then the [Constitution](01-constitution/README.md) to understand _what must
always be true_, then the [Specification](02-specification/README.md) to
understand _how_.

---

## The one-paragraph version

For decades, computers have been organized around **applications** — discrete
programs a person opens, uses, and closes. LucaOS is built on a different
conviction: that the next era of computing is organized around **one persistent
AI** that is always present, remembers across time and devices, and uses
applications as tools on the user's behalf. That AI is **Luca**. There is exactly
one Luca. Every device — desktop, phone, watch, browser, vehicle, headset, and
eventually robot — is a _host_ that gives Luca a body. The product is not a chat
window. **The product is presence.**

---

## How this repository is organized

| Directory | What it holds | Read it when… |
|---|---|---|
| [`00-manifesto/`](00-manifesto/README.md) | The vision and philosophy — the _why_ | You want to understand what LucaOS is and is not |
| [`01-constitution/`](01-constitution/README.md) | The inviolable invariants and governance — the _what must always hold_ | You are reviewing a PR or making an architectural decision |
| [`02-specification/`](02-specification/README.md) | The technical architecture — the _how_ | You are implementing a subsystem |
| [`03-design-system/`](03-design-system/README.md) | The design language, tokens, motion, and voice | You are shaping how Luca looks, moves, or speaks |
| [`04-rfcs/`](04-rfcs/README.md) | Proposals for substantial changes | You want to change something load-bearing |
| [`05-adrs/`](05-adrs/README.md) | Records of decisions already made, and why | You are wondering "why is it built this way?" |
| [`06-roadmap/`](06-roadmap/README.md) | The phased path from today to the north star | You are planning what to build next |

Supporting documents at the root:

- **[CLAUDE.md](CLAUDE.md)** — operating instructions for AI coding agents (Claude
  Code, Codex, and any successor). **If you are an agent, read this first.**
- **[GLOSSARY.md](GLOSSARY.md)** — the canonical vocabulary. Terms are capitalized
  in prose when used in their defined sense (e.g. Presence, Host, Surface).
- **[CONTRIBUTING.md](CONTRIBUTING.md)** — engineering standards and the
  contribution workflow.
- **[STYLE-GUIDE.md](STYLE-GUIDE.md)** — how documents in this repository are
  written and cross-referenced.

---

## The North Star

> **LucaOS is building the software layer that enables computers to continuously
> host one persistent AI.**

Every phase in the [Roadmap](06-roadmap/README.md), every invariant in the
[Constitution](01-constitution/README.md), and every subsystem in the
[Specification](02-specification/README.md) exists to move toward that sentence.
When a decision is unclear, the question is always: _does this bring us closer to
a continuously present, single, trusted AI?_

---

## The Four Questions

Every pull request against any LucaOS repository must be able to answer:

1. **Does this strengthen persistence?**
2. **Does this reinforce one identity?**
3. **Does this improve trust?**
4. **Does this move Luca closer to a continuously present AI?**

These are elaborated in [The Four Questions](01-constitution/02-the-four-questions.md).

---

## Status and versioning

This is **Foundation v1.0**, expanded from `LucaOS_Foundation_Brief_v1.0`. The
brief is the seed; this repository is its production-grade elaboration. Nothing
here contradicts the brief — it makes the brief _implementable_.

The documents describe the **canonical target architecture**. Where the current
LucaOS implementation already embodies a principle, the relevant
[ADR](05-adrs/README.md) records it. Where it does not yet, the
[Roadmap](06-roadmap/README.md) says when it will. This repository is honest about
the gap between vision and reality; that honesty _is_ the trust the Constitution
demands.

## Building the documentation site

This repository is authored as plain Markdown so it is diffable, reviewable, and
searchable. It can be rendered as a static site with MkDocs Material:

```bash
pip install mkdocs-material
mkdocs serve      # local preview at http://127.0.0.1:8000
mkdocs build      # static site in ./site
```

See [`mkdocs.yml`](mkdocs.yml) for the navigation tree.
