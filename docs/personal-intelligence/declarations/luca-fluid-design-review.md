# Luca Fluid Design Review Declaration

Status: inspection only; execution disabled

## Purpose

This declaration lets Luca inspect a proposed interface against the Luca Fluid
Interaction Standard. It absorbs design-engineering judgment into LucaOS's own
language and governance boundary. It is not an executable copy of an external
skill and does not grant authority to modify an interface.

## Review checklist

The review may report whether a proposal provides:

- immediate press and state feedback;
- direct, continuous pointer tracking where manipulation is supported;
- interruptible and reversible motion;
- symmetric entry and exit paths;
- source-aware popover and sheet origins;
- restrained, shared spring physics;
- viewport-safe drag boundaries;
- keyboard and focus parity;
- reduced-motion and reduced-transparency behavior;
- transform/opacity-first animation performance;
- material hierarchy without decorative glass stacking; and
- LucaOS identity rather than imitation of another platform.

## Output boundary

The declaration can produce inspection findings and suggested remediation only.
It cannot write files, invoke tools or models, access memory or network, install
packages, mutate runtime state, or approve its own recommendations.

Every future adapter must preserve:

- `executionEnabled: false`
- `readyForExecution: false`
- `sideEffectsPerformed: false`

## Source relationship

The checklist was informed by public fluid-interface and design-engineering
principles, then rewritten as a Luca-native standard. The canonical runtime
reference is `docs/design/LUCA_FLUID_INTERACTION_STANDARD.md`.
