import { describe, expect, it } from "vitest";

import {
  LUCA_FLUID_SPRING,
  LUCA_PRESS_SCALE,
  resolveLucaPressMotion,
  resolveLucaPopoverMotion,
  resolveLucaSheetMotion,
  resolveLucaSurfaceMotion,
  resolveLucaViewportDragConstraints,
} from "./lucaFluidMotion";

describe("lucaFluidMotion", () => {
  it("uses one critically damped surface spring", () => {
    const motion = resolveLucaSurfaceMotion(false);
    expect(motion.transition).toBe(LUCA_FLUID_SPRING.surface);
    expect(LUCA_FLUID_SPRING.surface.damping).toBeGreaterThan(30);
    expect(motion.initial.y).toBeGreaterThan(0);
    expect(motion.animate.y).toBe(0);
  });

  it("removes spatial movement when reduced motion is requested", () => {
    const motion = resolveLucaSurfaceMotion(true);
    expect(motion.initial.scale).toBe(1);
    expect(motion.initial.y).toBe(0);
    expect(motion.exit.y).toBe(0);
  });

  it("provides restrained press feedback and disables it for reduced motion", () => {
    expect(resolveLucaPressMotion(false).whileTap).toEqual({
      scale: LUCA_PRESS_SCALE,
    });
    expect(resolveLucaPressMotion(true).whileTap).toBeUndefined();
  });

  it("keeps a panel inside the viewport with a safe edge margin", () => {
    expect(
      resolveLucaViewportDragConstraints({
        viewportWidth: 1200,
        viewportHeight: 800,
        panelWidth: 400,
        panelHeight: 600,
        originX: 100,
        originY: 100,
      }),
    ).toEqual({ left: -84, right: 684, top: -84, bottom: 84 });
  });

  it("collapses impossible constraints safely on a small viewport", () => {
    const constraints = resolveLucaViewportDragConstraints({
      viewportWidth: 320,
      viewportHeight: 480,
      panelWidth: 400,
      panelHeight: 600,
      originX: 100,
      originY: 100,
    });
    expect(constraints.right).toBe(constraints.left);
    expect(constraints.bottom).toBe(constraints.top);
  });

  it("keeps sheet entry and exit on the same spatial path", () => {
    const bottom = resolveLucaSheetMotion("bottom", false);
    const left = resolveLucaSheetMotion("left", false);
    expect(bottom.initial).toEqual(bottom.exit);
    expect(bottom.initial.y).toBeGreaterThan(0);
    expect(left.initial.x).toBeLessThan(0);
    expect(left.animate).toEqual({ opacity: 1, x: 0, y: 0 });
  });

  it("anchors popover scaling to its trigger and respects reduced motion", () => {
    const anchored = resolveLucaPopoverMotion({
      originX: 0.8,
      originY: 0,
      reducedMotion: false,
    });
    expect(anchored.style.transformOrigin).toBe("80% 0%");
    expect(anchored.initial.scale).toBeLessThan(1);

    const reduced = resolveLucaPopoverMotion({ reducedMotion: true });
    expect(reduced.initial.scale).toBe(1);
    expect(reduced.initial.y).toBe(0);
  });
});
