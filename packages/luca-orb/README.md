# @luca/orb — Living Embodiment Runtime SDK

The living embodiment runtime engine for Luca, translating application conversation state into physical glass, optics, studio lighting, and organic motion.

---

## Architecture Overview

```text
VoiceHUD / Application UI
          │
          ▼
  EmbodimentSession
          │
          ▼
  EmbodimentAdapter
          │
          ▼
     OrbDirector ──► EmbodimentState ──► OrbRenderer
```

---

## Downstream Consumer Integration (VoiceHUD Example)

Application UI (VoiceHUD, Floating Assistant, Desktop Widget) consumes `@luca/orb` via `EmbodimentSession`:

```typescript
import { EmbodimentSession, EmbodimentAdapter, LivingOrbRenderer, LivingOrbDirector } from '@luca/orb';

// 1. Initialize core renderer and director
const canvas = document.getElementById('embodiment-canvas') as HTMLCanvasElement;
const director = new LivingOrbDirector();
const renderer = new LivingOrbRenderer();

// 2. Wrap in EmbodimentAdapter
const adapter = new EmbodimentAdapter({
  canvas,
  renderer,
  director,
  reducedMotion: false,
});

// 3. Create EmbodimentSession to manage lifecycle and profile state
const session = new EmbodimentSession({
  adapter,
  director,
  initialProfile: 'idle',
});

// 4. Update state upon conversation events
session.setProfile('listening');  // User starts speaking
session.updateAudio(0.42, 0.12);  // Real-time audio amplitude
session.setProfile('thinking');   // Assistant processing
```

---

## Frozen Renderer API Reference

Every embodiment renderer implements the frozen `EmbodimentRenderer` interface:

```typescript
export interface EmbodimentRenderer {
  initialize(canvas: HTMLCanvasElement): void;
  resize(width: number, height: number, dpr: number): void;
  render(state: EmbodimentState): void;
  dispose(): void;
}
```

---

## Governance Rules

1. **Zero Shader Leakage**: Downstream UI must never access or modify GLSL uniforms, IOR, Fresnel, or geometry parameters.
2. **Embodiment Autonomy**: Downstream UI requests state profiles (`idle`, `listening`, `thinking`, `speaking`); the embodiment determines visual expression.
3. **Session Lifecycle**: Consumers must call `session.pause()` during background tab suspension and `session.resume()` on wake.
