# Luca Fluid Interaction Standard

Status: Foundation and first pilot

## Purpose

LucaOS should feel responsive, calm, embodied, and spatially coherent. This
standard absorbs established fluid-interface principles into Luca-native
motion, material, accessibility, and verification rules. It is not an Apple
theme and does not copy another product's visual identity.

## Interaction principles

1. **Immediate response** — visual feedback begins on press, not after click.
2. **Direct manipulation** — dragged content tracks the pointer continuously.
3. **Interruptibility** — user input can redirect motion without waiting for a
   previous animation to finish.
4. **Spatial continuity** — surfaces arrive from, and return toward, their
   source or established edge.
5. **Calm physics** — default motion is critically damped; bounce is reserved
   for momentum that the user created.
6. **Material hierarchy** — translucency communicates elevation and function;
   it is not decoration and must remain legible.
7. **Accessible equivalence** — reduced motion removes spatial travel and
   scaling while preserving state feedback. Reduced transparency and high
   contrast continue through the Luca Material Engine.
8. **Performance discipline** — interactive animation should favor transform
   and opacity and avoid layout work on every frame.

## Architecture boundary

- `lucaPresenceMotion.ts` owns Luca's ambient embodied cadence.
- `lucaFluidMotion.ts` owns physics for user-manipulated surfaces and controls.
- `lucaMaterialSystem.ts` owns material appearance and host policies.
- Components consume these shared contracts; they do not invent local springs.
- External design skills remain reviewed knowledge until the governed Luca
  Skill Adapter and execution boundary explicitly support them.

## Initial tokens

| Role | Use |
| --- | --- |
| `surface` | Panels, sheets, dialogs, and large state changes |
| `control` | Buttons, chips, anchored menus, and micro feedback |
| `gesture` | Settling after direct manipulation |

All defaults are intentionally restrained. Gesture-created momentum may use a
more expressive response in a future bounded primitive, but autonomous UI
motion must not bounce for decoration.

## Pilot

`FloatingPanel` is the first migrated surface. It now uses the shared surface
spring, shared press response, a reduced-motion path, viewport constraints, and
restrained release momentum. Constraints respond to viewport and panel resize,
and soft edge resistance keeps movement continuous without allowing the panel
to escape the usable workspace.

`LucaMotionSheet` and `LucaMotionPopover` are opt-in primitives for new and
deliberately migrated surfaces. Sheets enter and leave through the same edge.
Popovers accept a normalized trigger origin so their scale and materialization
remain spatially connected to the control that opened them. Existing static
primitives remain available to avoid silently changing established surfaces.

The Chat composer Add menu is the first production popover migration. It opens
from the Add control's lower-left anchor, focuses its first action, supports
Arrow Up/Down plus Home/End navigation, closes on Escape, and restores focus to
the trigger when dismissed without choosing an action.

The mobile conversation composer is the first production sheet migration. It
uses a bottom-edge motion path while retaining the existing mobile material
policy. The desktop composer remains a static dock, because it is not spatially
represented as a sheet.

`pi.luca-fluid-design-review` now declares this standard to the Personal
Intelligence Skill Registry as low-risk, inspection-only knowledge. It requests
no models, tools, connectors, memory, filesystem, or network access and retains
the registry's execution-disabled invariant.

## Acceptance criteria

- Shared motion values have unit coverage.
- Reduced motion removes scale and positional travel.
- No runtime, permission, skill-execution, or LucaLink behavior changes.
- The web build remains browser-safe.
- Later migrations replace local motion values incrementally, one interaction
  family at a time, with visual and input QA.

## Next slices

1. Add interaction QA for interruption, cancel-by-dragging-away, and pointer
   capture as gesture-driven surfaces expand.
2. Visually QA the migrated panel, composer popover, and mobile sheet in the
   desktop and responsive browser shells.
