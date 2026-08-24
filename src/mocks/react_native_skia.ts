// Browser stand-in for `@shopify/react-native-skia`.
//
// `packages/luca-orb` declares skia as a dependency and two of its modules
// import it: `hooks/useOrbAnimation.ts` and `renderer/OrbRenderer.tsx`. Both are
// re-exported from the package barrel, so *any* `@luca/orb` import — including
// `LivingOrb`, which is pure WebGL and wants nothing to do with skia — drags
// skia into the renderer graph. Skia is a React Native library; it is not
// installed here and must not be, because installing it would pull React Native
// into an Electron app. Without this alias Vite answers 500 for those two
// modules, which breaks the whole dynamic import of `src/reactAppEntry.tsx` and
// the app never mounts.
//
// This is a shim in the same sense as `browser_eventsource.ts` and
// `child_process.js`: it satisfies the import so the barrel can load, and it
// does not pretend to render anything.

/** Mirrors skia's `SharedValue<number>`, which is all `useOrbAnimation` reads. */
export interface SkiaClock {
  current: number;
}

let announced = false;

/**
 * Said once, not per call: this is expected on web, so it belongs in the log as
 * a fact, not as repeated noise.
 */
function announceOnce(): void {
  if (announced) return;
  announced = true;
  console.info(
    "[luca-orb] @shopify/react-native-skia is a React Native library and is " +
      "absent on web; OrbRenderer is taking its WebGL2 path.",
  );
}

/**
 * The parameter lives in the type rather than the implementation: callers pass a
 * shader string, and naming a binding we never read would trip the repo's
 * zero-warning lint. TypeScript permits an implementation with fewer parameters.
 */
export const Skia: {
  RuntimeEffect: {
    /**
     * Returns null deliberately, and this is not a silent fallback to nothing.
     * `OrbRenderer` computes `const source = Skia.RuntimeEffect.Make(...)` at
     * module scope and then branches on `if (source)`: the truthy branch is the
     * skia `<Canvas>`, and the falsy branch is a complete WebGL2 renderer driven
     * by its own `useEffect`. Null selects that second path, which is the real
     * implementation on web — the author wrote both on purpose.
     */
    Make(sksl: string): null;
  };
} = {
  RuntimeEffect: {
    Make: () => {
      announceOnce();
      return null;
    },
  },
};

export function useClock(): SkiaClock {
  announceOnce();
  return { current: 0 };
}

/**
 * The three drawing primitives are reachable only when `RuntimeEffect.Make`
 * returned a shader, which it never does here. If one is ever rendered anyway,
 * throwing names the cause; returning null would draw an invisible orb and read
 * as a layout bug somewhere else entirely.
 */
function unavailable(name: string): never {
  throw new Error(
    `<${name}> comes from @shopify/react-native-skia, which does not run in a ` +
      `browser. Reaching it means something selected the skia render path; on ` +
      `web the WebGL2 path in OrbRenderer is the one that works.`,
  );
}

export const Canvas = (): never => unavailable("Canvas");
export const Fill = (): never => unavailable("Fill");
export const Shader = (): never => unavailable("Shader");
