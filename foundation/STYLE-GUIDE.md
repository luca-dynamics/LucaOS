# Style Guide

How documents in `lucaos-foundation` are written. The goal is the register of an
internal engineering handbook at a company that cares about craft: precise, calm,
confident, never breathless. If a sentence sounds like marketing, cut it.

This guide is binding on every document in this repository, including those
written by AI agents.

---

## Voice

- **Declarative and calm.** State what is true. Avoid hype, exclamation, and
  superlatives ("revolutionary", "cutting-edge", "blazing-fast"). The ideas are
  strong enough without adjectives.
- **Second person for instructions, third person for description.** "You gate the
  action" when instructing a contributor; "The Runtime publishes ports" when
  describing the system.
- **Prefer the concrete.** Name the file, the type, the boundary. Vague
  architecture prose is how systems rot.
- **Honest about gaps.** Where the vision exceeds the current implementation, say
  so plainly and link the Roadmap. Trust is the product; the docs model it.

## Structure

- Every document opens with a one- or two-sentence statement of what it covers and
  why it exists. No throat-clearing.
- Use `##` and `###` headings liberally so documents are skimmable and linkable.
- Keep documents focused. If one grows past ~4,000 words, split it and link.
- End substantial documents with a **"See also"** section linking related docs.

## Terminology

- Use the [Glossary](GLOSSARY.md). Capitalize defined terms when used in their
  defined sense (Presence, Host, Surface, Runtime, Provider, Memory, Provenance).
- Never coin a load-bearing term without adding it to the Glossary in the same
  change.
- "Luca" is the identity; "LucaOS" is the system. They are not interchangeable.

## Cross-references

- Link generously. Every mention of another subsystem should link its
  Specification chapter on first use in a document.
- Use **relative Markdown links** with the path from the repository root style
  (e.g. `[Memory Architecture](02-specification/03-memory-architecture.md)`), or a
  correct relative path from the current file. Prefer paths that resolve both on
  GitHub and under MkDocs.
- When a document states a decision, link the [ADR](05-adrs/README.md) that
  records it. When it proposes one, link or create the [RFC](04-rfcs/README.md).

## Diagrams

- Use **Mermaid** fenced code blocks for diagrams so they render on GitHub and in
  MkDocs and stay diffable. Example:

  ````markdown
  ```mermaid
  flowchart LR
    Surface -->|attach| Runtime
    Runtime -->|inference| Router --> Adapter --> Provider
    Runtime <-->|read/write| Memory
  ```
  ````

- Prefer a diagram to a paragraph when describing flow, state, or topology.
- Keep diagrams honest and minimal; a diagram that omits the gated step is a lie.

## Code and examples

- Fenced code blocks with a language tag. Use TypeScript for interface sketches
  unless the subsystem is genuinely another language (the local-intelligence
  Cortex is Python).
- Interface sketches illustrate _shape and intent_; they are not required to
  compile. Mark them as illustrative when they are.

## ADRs and RFCs

- Follow the templates: [`05-adrs/0000-template.md`](05-adrs/0000-template.md) and
  [`04-rfcs/0000-template.md`](04-rfcs/0000-template.md).
- ADRs are immutable once accepted: to change a decision, write a new ADR that
  supersedes the old one and mark the old one `Superseded by ADR-XXXX`.

## Formatting

- Wrap prose at a comfortable width; do not hard-wrap tables or code.
- One sentence per line is acceptable and often helps diffs, but not required.
- Use tables for comparisons and matrices; use lists for sequences and sets.
- Bold sparingly, for the load-bearing clause of a paragraph.

## What not to do

- Do not reproduce large blocks of external copyrighted text.
- Do not invent metrics, dates, or benchmark numbers. If a number is a target,
  say "target"; if it is measured, cite where.
- Do not let a document contradict the [Constitution](01-constitution/README.md).
  If you believe the Constitution is wrong, that is an
  [Amendment](01-constitution/03-governance-and-amendments.md), not a footnote.
