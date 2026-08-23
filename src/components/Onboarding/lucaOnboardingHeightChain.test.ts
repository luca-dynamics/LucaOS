// The onboarding height chain, pinned at the source level.
//
// WHY A SOURCE TEST AND NOT A RENDER TEST: jsdom performs no layout. Every box
// it reports is 0x0, so the defect this file guards -- a percentage height that
// silently computes to `auto` -- is invisible to a rendering test. It was found
// with a real layout engine (Playwright) and the numbers are in the commit
// message; what a unit test can still do is pin the handful of declarations
// those numbers depend on, so the chain cannot be broken again by an edit that
// looks locally harmless.
//
// THE DEFECT, once: onboarding painted only the top half of the window, with a
// hard seam across the middle and the face guillotined at it. Two independent
// causes, both re-introducible in one line:
//
//   1. A percentage height only resolves against a *specified* height on the
//      parent. `min-height` does not make a parent definite. So a column of
//      `height: 100%` layers hanging under a `min-height`-only host all
//      computed to `auto` and collapsed to text height -- while the shell root,
//      stretched by that same `min-height`, kept painting the whole window.
//      Hence the seam: two backgrounds, two different heights.
//
//   2. `@keyframes luca-hologram-breathe` sets `transform` outright, and an
//      animation beats an inline style (animation origin > author origin). So
//      the faces' `transform: translateY(-50%)` centring was discarded for the
//      animation's whole duration and each face hung *from* the midline instead
//      of straddling it, running off the bottom of the window. Auto margins
//      centre without a transform, which leaves `transform` entirely to the
//      animation.
//
// Read `readFileSync` off `process.getBuiltinModule`, not an `fs` import:
// `vite.config.ts` aliases `fs`/`node:fs` to a browser polyfill, and a polyfilled
// `readFileSync` returns `''` -- which would make every `not.toContain` below
// pass vacuously.
import { describe, expect, it } from "vitest";

const { readFileSync } = process.getBuiltinModule("node:fs");
const read = (path: string) => readFileSync(path, "utf8");

const shellSource = read("src/components/Onboarding/LucaOnboardingShell.tsx");
const screenSource = read("src/components/Onboarding/LucaOnboardingScreen.tsx");
const previewSource = read(
  "src/components/Onboarding/LucaPremiumOnboardingPreview.tsx",
);
const appSource = read("src/App.tsx");
const webShellSource = read("src/web/WebLifecycleShell.tsx");

describe("onboarding height chain", () => {
  it("gives both hosts a definite height, not only a minimum", () => {
    // The chain starts here. `minHeight` alone leaves every percentage below it
    // computing to `auto`; the `height` is what the rest of the column divides
    // into. Both mounts, because the web host's <main> is `min-h-dvh` only and
    // the Electron host's ancestors, while more definite, must not depend on
    // that difference.
    for (const [label, source] of [
      ["App.tsx (desktop)", appSource],
      ["WebLifecycleShell.tsx (web)", webShellSource],
    ] as const) {
      expect(
        source,
        `${label} must pass a definite height to onboarding`,
      ).toContain('style={{ minHeight: "100dvh", height: "100dvh" }}');
    }
  });

  it("hands the shell's height down as a flex size, not a percentage", () => {
    // The shell root is stretched by its caller, so it declares a flex column
    // and the content layer takes that height as a flex item. A flex item's
    // resolved main size IS definite (CSS Flexbox 9.8), which is what lets the
    // screens further down resolve their own `100%`; a percentage here would
    // reintroduce the collapse.
    expect(shellSource).toContain('flexDirection: "column"');
    expect(shellSource).toContain('flex: "1 1 auto"');
    // A flex item floors at its content size unless told otherwise, so without
    // this a tall screen pushes past the window instead of scrolling in it.
    expect(shellSource).toContain("minHeight: 0");
    // The root clips (to bound the ambient presence), so the content layer is
    // the only thing that can scroll. If this goes, tall screens lose their
    // lower options silently.
    expect(shellSource).toContain('overflowY: "auto"');
  });

  it("keeps the preview root definite for the hero below it", () => {
    expect(previewSource).toContain('height: "100%"');
    expect(previewSource).toContain('minHeight: "100%"');
  });

  it("gives every clipping screen section a definite height", () => {
    // The interior column centres itself with `height: 100%` +
    // `justifyContent: center`, so a min-height-only section left the text
    // top-aligned in a half-empty screen. Each section also clips, which is
    // only safe because the shell's content layer scrolls (asserted above).
    const definiteClippingSections = screenSource.match(
      /height: "100%",\s*\n\s*minHeight: "100%",\s*\n\s*overflow: "hidden",/g,
    );
    expect(definiteClippingSections).toHaveLength(4);
  });

  it("centres every face with auto margins, never with a transform", () => {
    // The count equality is the load-bearing part: one face gaining a
    // `translateY(-50%)` back would not fail a `toContain`, but it would fail
    // this.
    const breathingFaces = screenSource.match(
      /luca-hologram-breathe 6\.4s ease-in-out infinite/g,
    );
    const autoMarginTops = screenSource.match(/marginTop: "auto",/g);
    const autoMarginBottoms = screenSource.match(/marginBottom: "auto",/g);
    expect(breathingFaces).toHaveLength(3);
    expect(autoMarginTops).toHaveLength(3);
    expect(autoMarginBottoms).toHaveLength(3);

    // `translateY(-50%)` may survive only in prose explaining why it is gone.
    const codeLines = screenSource
      .split("\n")
      .filter((line) => !line.trim().startsWith("//"));
    expect(codeLines.join("\n")).not.toContain("translateY(-50%)");
  });

  it("preserves the face sizes the founder settled on", () => {
    // "retain original stable size" -- these two clamps predate the bug (the
    // containers were what broke, not the face) and survived the fix untouched.
    // Changing them should be a deliberate decision that also updates this line.
    expect(screenSource.match(/height: "min\(96vh, 760px\)",/g)).toHaveLength(2);
    expect(screenSource.match(/height: "min\(88vh, 700px\)",/g)).toHaveLength(1);
  });
});
