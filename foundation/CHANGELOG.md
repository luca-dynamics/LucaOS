# Changelog

The Foundation is versioned as a whole. Amendments to the
[Constitution](01-constitution/README.md) increment the version and are recorded
here with links to their RFCs and ADRs, so any contributor can reconstruct what
the rules were when a given piece of code was written. See
[Governance and Amendments](01-constitution/03-governance-and-amendments.md).

Ordinary edits to the Specification, Design System, RFCs, ADRs, and Roadmap evolve
continuously and are tracked in git history; only version-level changes are listed
here.

## v1.0 — Foundation established

The initial production-grade Foundation, expanded from `LucaOS_Foundation_Brief_v1.0`.

- Established the [Manifesto](00-manifesto/README.md): the Thesis, the Computing
  Shift, What Luca Is and Is Not, Presence Is the Product, the One Identity
  Principle, and the North Star.
- Established the [Constitution](01-constitution/README.md): the
  [Eight Invariants](01-constitution/01-the-eight-invariants.md), the
  [Four Questions](01-constitution/02-the-four-questions.md), the
  [governance and amendment process](01-constitution/03-governance-and-amendments.md),
  and the [trust and permissions](01-constitution/04-trust-and-permissions.md) basis.
- Established the [Specification](02-specification/README.md), the
  [Design System](03-design-system/README.md), the foundational
  [RFCs](04-rfcs/README.md), the initial [ADRs](05-adrs/README.md) (including records
  of real decisions already made), and the [Roadmap](06-roadmap/README.md).
- Added [CLAUDE.md](CLAUDE.md), the [Glossary](GLOSSARY.md), the
  [Style Guide](STYLE-GUIDE.md), and [Contributing](CONTRIBUTING.md).
- Introduced [LUCA.md](LUCA.md), the Charter of Luca: the operating charter that
  constitutes the Luca agentic system at runtime — the Luca-native analog of the
  `CLAUDE.md` convention, distinct from the charter for the agents that build LucaOS.

Nothing in v1.0 contradicts the source brief; it makes the brief implementable.

## Unreleased — reconciliation with the established docs

The v1.0 Foundation was authored from the source brief without reconciling against
the ~213 pre-existing LucaOS documents (`docs/`, `ops/docs/`, `research/docs/`) or
the codebase, which already carried a terser foundation and the product's native
vocabulary. A four-way audit produced [RECONCILIATION.md](RECONCILIATION.md).

- **Phase 1 (this change): map + crosswalk.** Added [RECONCILIATION.md](RECONCILIATION.md)
  (the plan of record) and [CROSSWALK.md](CROSSWALK.md), which keeps the
  Foundation's generic terms as primary and bridges them to the native subsystem
  names (Luca Guard, Mission Engine, Mission Tape, Memory Vault, LucaLink, Skills
  Runtime, Embodiment Layer) and the real code, and resolves the four colliding
  terms (Cortex, Embodiment, Skill, Surface).
- Later phases (planned): absorb the missed doctrine (Mission Doctrine, operating
  modes Creator/Pro/Basic, guarded self-evolution, the fuller Luca Guard and
  LucaLink models); reconcile the design system to the shipped design language
  (real `--luca-*` tokens, the skin system, liquid-glass, the presence orb/face);
  correct the current-state claims flagged in the map; and record the pruning ADRs.
