/**
 * @package luca-orb-design
 * @file qa/checklist.ts
 *
 * Visual QA Acceptance Criteria for the Living Orb.
 *
 * These are the measurable acceptance criteria that must be met before
 * Sprint A is complete. They are defined here, not in the renderer,
 * because they belong to the design specification — not the implementation.
 *
 * Each criterion has:
 *  - id: unique identifier for tracking
 *  - category: the visual domain being tested
 *  - criterion: what the reviewer looks for
 *  - pass: what "passing" means concretely
 *  - fail: what "failing" looks like (helps calibrate the reviewer)
 */

export interface QACriterion {
  id:       string;
  category: string;
  criterion: string;
  pass:     string;
  fail:     string;
  sprint:   'A' | 'B' | 'C';   // Which sprint this must pass
}

export const LIVING_ORB_QA: QACriterion[] = [
  // ── Glass ─────────────────────────────────────────────────────────────────
  {
    id: 'GLASS-01',
    category: 'Glass',
    criterion: 'Transparency is believable',
    pass: 'The glass body is clearly see-through. You can tell it is translucent, not painted.',
    fail: 'The orb looks like a frosted or cloudy sphere with no depth.',
    sprint: 'A',
  },
  {
    id: 'GLASS-02',
    category: 'Glass',
    criterion: 'Refraction is present and subtle',
    pass: 'Edges show visible light bending. The background appears slightly distorted behind the orb.',
    fail: 'No visible refraction. The orb looks like a flat disc. OR refraction is too strong (fish-eye).',
    sprint: 'A',
  },
  {
    id: 'GLASS-03',
    category: 'Glass',
    criterion: 'Glass has perceived thickness',
    pass: 'The edge of the orb looks thicker than the center, like a real glass object.',
    fail: 'The orb looks like a 2D circle with a gradient applied.',
    sprint: 'A',
  },

  // ── Glow ──────────────────────────────────────────────────────────────────
  {
    id: 'GLOW-01',
    category: 'Inner Glow',
    criterion: 'Core glow appears internal',
    pass: 'The light appears to come from inside the glass body, not painted on top.',
    fail: 'The glow looks like a white circle drawn on top of the orb.',
    sprint: 'A',
  },
  {
    id: 'GLOW-02',
    category: 'Inner Glow',
    criterion: 'Glow has soft volumetric falloff',
    pass: 'The core light gradually fades outward with no visible hard edge.',
    fail: 'The glow has a sharp or visible boundary.',
    sprint: 'A',
  },
  {
    id: 'GLOW-03',
    category: 'Inner Glow',
    criterion: 'Glow color is correct for profile',
    pass: 'Idle/listening: cool blue-white. Speaking: warmer. Thinking: crystalline blue.',
    fail: 'All profiles look the same, or color does not match the approved palette.',
    sprint: 'A',
  },

  // ── Blob Shape ────────────────────────────────────────────────────────────
  {
    id: 'BLOB-01',
    category: 'Blob',
    criterion: 'Silhouette is never a perfect circle',
    pass: 'The orb outline has at least 2–3 visible asymmetric bumps. No state produces a perfect sphere.',
    fail: 'The orb is a circle with a gradient.',
    sprint: 'A',
  },
  {
    id: 'BLOB-02',
    category: 'Blob',
    criterion: 'Asymmetry is preserved across time',
    pass: 'The shape slowly morphs but never becomes a perfect circle during morphing.',
    fail: 'At any point in the animation cycle, the shape is a circle.',
    sprint: 'A',
  },
  {
    id: 'BLOB-03',
    category: 'Blob',
    criterion: 'No visible polygon edges or facets',
    pass: 'The silhouette is perfectly smooth — indistinguishable from a real liquid surface.',
    fail: 'Visible stair-stepping, polygon edges, or pixelation in the silhouette.',
    sprint: 'A',
  },

  // ── Specular Highlight ────────────────────────────────────────────────────
  {
    id: 'SPEC-01',
    category: 'Highlight',
    criterion: 'Key highlight is large and very soft',
    pass: 'The main highlight covers ~25–30% of the orb. Its edges are completely gradient — no hard border.',
    fail: 'The highlight is a small sharp dot, or it has a visible edge.',
    sprint: 'A',
  },
  {
    id: 'SPEC-02',
    category: 'Highlight',
    criterion: 'Highlight position is stable and physically consistent',
    pass: 'The highlight stays in the upper-left quadrant in all profiles. It moves only slightly.',
    fail: 'The highlight jumps around, flickers, or appears in inconsistent positions.',
    sprint: 'A',
  },
  {
    id: 'SPEC-03',
    category: 'Highlight',
    criterion: 'Highlight color is correct',
    pass: 'Near-white with a very faint cool blue. Never pure white, never warm yellow.',
    fail: 'Highlight is pure white (too harsh) or has visible color tinting.',
    sprint: 'A',
  },

  // ── Fresnel / Rim ─────────────────────────────────────────────────────────
  {
    id: 'RIM-01',
    category: 'Rim Light',
    criterion: 'Rim lighting is present and continuous',
    pass: 'A soft, bright rim is visible around the entire silhouette.',
    fail: 'No rim lighting visible, or rim is only on one side.',
    sprint: 'A',
  },
  {
    id: 'RIM-02',
    category: 'Rim Light',
    criterion: 'Fresnel relationship is correct',
    pass: 'The rim is brighter at grazing angles (edges) and fades toward the center.',
    fail: 'Rim brightness is uniform (like a stroke). No falloff from edge to center.',
    sprint: 'A',
  },

  // ── Ripple Rings ──────────────────────────────────────────────────────────
  {
    id: 'RIPPLE-01',
    category: 'Ripple Rings',
    criterion: 'Ripple rings are present in idle',
    pass: '3–4 concentric rings visible around the orb. Very subtle — easy to miss at first glance.',
    fail: 'No rings. OR rings are too bright/obvious and dominate the orb.',
    sprint: 'A',
  },
  {
    id: 'RIPPLE-02',
    category: 'Ripple Rings',
    criterion: 'Rings fade appropriately with distance',
    pass: 'Each outer ring is distinctly fainter than the one before it.',
    fail: 'All rings are equally bright, creating a mechanical look.',
    sprint: 'A',
  },

  // ── Idle Motion ───────────────────────────────────────────────────────────
  {
    id: 'MOTION-01',
    category: 'Motion',
    criterion: 'Breathing is almost imperceptible',
    pass: 'You notice the orb is alive, but cannot immediately describe what is moving.',
    fail: 'The orb is visibly pulsing/scaling in a way that looks mechanical.',
    sprint: 'A',
  },
  {
    id: 'MOTION-02',
    category: 'Motion',
    criterion: 'Float is smooth and non-mechanical',
    pass: 'The orb drifts gently. The motion feels like floating in water, not bouncing on a spring.',
    fail: 'Visible sine-wave oscillation. The motion looks programmed.',
    sprint: 'A',
  },
  {
    id: 'MOTION-03',
    category: 'Motion',
    criterion: 'Breathing and float are independent rhythms',
    pass: 'The two oscillations create a subtle beat pattern — the orb feels truly alive.',
    fail: 'Breathing and floating appear to be synchronized.',
    sprint: 'A',
  },
  {
    id: 'MOTION-04',
    category: 'Motion',
    criterion: 'No visible frame rate artifacts',
    pass: 'Animation is completely smooth at 60fps.',
    fail: 'Stutter, jitter, or visible frame drops during idle animation.',
    sprint: 'A',
  },

  // ── Profile States ────────────────────────────────────────────────────────
  {
    id: 'STATE-01',
    category: 'Profiles',
    criterion: 'Each profile is visually distinct',
    pass: 'A reviewer can identify the current profile without any label by visual cues alone.',
    fail: 'Profiles look too similar. Idle and Listening are indistinguishable.',
    sprint: 'B',
  },
  {
    id: 'STATE-02',
    category: 'Profiles',
    criterion: 'Profile transitions feel organic',
    pass: 'Switching between profiles feels like a liquid material shifting — not a color swap.',
    fail: 'Transitions are abrupt, jarring, or look like a fade between two screenshots.',
    sprint: 'B',
  },

  // ── Overall ───────────────────────────────────────────────────────────────
  {
    id: 'OVERALL-01',
    category: 'Overall',
    criterion: 'Apple quality threshold',
    pass: '"Would someone mistake this for an Apple-designed assistant?" — Answer: Yes, or almost.',
    fail: 'It looks like a WebGL demo. It lacks polish, softness, or material quality.',
    sprint: 'A',
  },
  {
    id: 'OVERALL-02',
    category: 'Overall',
    criterion: 'Transparent canvas composites correctly',
    pass: 'The orb renders correctly on multiple backgrounds: dark, light, blurred.',
    fail: 'White background visible behind the orb. Black fringing around edges.',
    sprint: 'A',
  },
] as const;

/** Returns all QA criteria for a given sprint */
export function getCriteriaForSprint(sprint: 'A' | 'B' | 'C'): QACriterion[] {
  return LIVING_ORB_QA.filter(c => c.sprint === sprint);
}
