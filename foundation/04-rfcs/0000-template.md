# RFC-XXXX — <Title>

This is the RFC template. Copy it to `NNNN-short-slug.md` using the next free
number, fill in every section, and open it as a Draft. Delete the italic guidance
under each heading as you go; keep the headings. An RFC that skips a section is not
ready for Review. See the [RFC process](README.md) for the lifecycle and numbering.

---

- **Number:** XXXX
- **Title:** <a short, descriptive title>
- **Status:** Draft <!-- Draft → Review → Accepted / Rejected / Superseded -->
- **Authors:** <name(s) or handle(s)>
- **Date:** <YYYY-MM-DD of last substantive change>
- **Supersedes / Superseded by:** <RFC-XXXX, or "none">
- **Resulting ADR(s):** <ADR-XXXX once implemented, or "pending">

## Summary

_One paragraph. State the change and its purpose so a reader knows in thirty
seconds what this proposes and why. If you cannot summarize it in a paragraph, the
proposal is not yet clear enough to review._

## Motivation

_Why are we doing this? What problem does it solve, or what does it make possible
that is currently hard or impossible? Ground the motivation in something concrete —
a failure mode, a limitation of the current implementation, a pressure the
[North Star](../00-manifesto/05-north-star.md) puts on the system. State what
happens if we do nothing._

## Guide-level explanation

_Explain the proposal as you would to a contributor learning the system, before
they read a line of the implementation. Use plain language, an example or two, and
a diagram where flow or state is involved. A reader should finish this section able
to describe the change correctly to someone else. Prefer a
[Mermaid](../STYLE-GUIDE.md#diagrams) diagram to a paragraph for flow, state, or
topology._

## Reference-level explanation

_The technical detail. Name the files, types, boundaries, and message shapes.
Specify the new or changed interfaces (illustrative TypeScript is fine and need not
compile). Describe edge cases, failure handling, and how the change interacts with
existing subsystems. This is the section an implementer works from and a reviewer
checks against the [Specification](../02-specification/README.md)._

## Invariants and the Four Questions

_Name every [Invariant](../01-constitution/01-the-eight-invariants.md) this proposal
touches, and say how — strengthens, preserves, or (with justification) stresses.
Then answer the [Four Questions](../01-constitution/02-the-four-questions.md)
explicitly. A proposal that stresses an Invariant without a clean
[Amendment](../01-constitution/03-governance-and-amendments.md) path is not ready to
be Accepted._

| Invariant | Effect | Note |
|---|---|---|
| 1 — One Luca Identity | strengthens / preserves / stresses | … |
| 2 — Persistent Runtime | … | … |
| 3 — Shared Memory | … | … |
| 4 — Provider Abstraction | … | … |
| 5 — Cross-Surface Continuity | … | … |
| 6 — Strong Typing and Modularity | … | … |
| 7 — Backward Compatibility | … | … |
| 8 — Security and Permissions | … | … |

**Q1 — Does this strengthen persistence?** _…_
**Q2 — Does this reinforce one identity?** _…_
**Q3 — Does this improve trust?** _…_
**Q4 — Does this move Luca closer to a continuously present AI?** _…_

## Drawbacks

_Why might we not do this? State the real costs: complexity, performance, migration
burden, new failure modes, opportunity cost. An RFC with no drawbacks has not been
examined honestly; find them, or say why there genuinely are none._

## Rationale and alternatives

_Why this design over the others? Describe the alternatives you considered —
including the naive or "do nothing" option — and say why each was rejected. The
strength of an RFC is often in this section: a reader should see that the chosen
design won on merits, not for lack of thought about the others._

## Prior art

_What can we learn from elsewhere — other operating systems, agent frameworks,
protocols, prior LucaOS decisions, external RFC traditions? Cite what informed the
design and, where relevant, what cautionary example it avoids. It is fine to note
that a space is genuinely novel, but say so deliberately._

## Unresolved questions

_What is deliberately left open? What must be answered before acceptance, and what
is expected to be settled during implementation or in follow-up RFCs? Being explicit
here is a sign of a mature proposal, not a weak one._

## Future possibilities

_What does this enable or invite later? Sketch the adjacent work this change makes
natural, without committing to it. This helps reviewers see the shape of the road
this RFC starts down. Link the [Roadmap](../06-roadmap/README.md) where relevant._

## See also

_Link the Specification chapters, Constitution sections, related RFCs, and any ADRs
this proposal touches or produces._
