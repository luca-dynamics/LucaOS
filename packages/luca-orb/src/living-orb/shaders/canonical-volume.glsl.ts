import { CANONICAL_LUCA_VOLUME_V2 } from '@luca/orb-design';

const glslFloat = (value: number): string => {
  const fixed = value.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
  return fixed.includes('.') ? fixed : `${fixed}.0`;
};

const glslFloatArray = (values: readonly number[]): string => values.map(glslFloat).join(', ');
const outer = CANONICAL_LUCA_VOLUME_V2.outer;
const inner = CANONICAL_LUCA_VOLUME_V2.innerLobe;

/** Compile-time GLSL representation of the versioned design-package volume. */
export const CANONICAL_VOLUME_GLSL = /* glsl */`
const float LUCA_TAU = 6.28318530718;
const int LUCA_OUTER_COUNT = ${outer.radiusSamples.length};
const float LUCA_OUTER_RADII[LUCA_OUTER_COUNT] = float[LUCA_OUTER_COUNT](${glslFloatArray(outer.radiusSamples)});
const float LUCA_OUTER_ROTATION = ${glslFloat(outer.rotation)};
const vec2 LUCA_OUTER_CENTER = vec2(${glslFloat(outer.center[0])}, ${glslFloat(outer.center[1])});

const int LUCA_INNER_COUNT = ${inner.radiusSamples.length};
const float LUCA_INNER_RADII[LUCA_INNER_COUNT] = float[LUCA_INNER_COUNT](${glslFloatArray(inner.radiusSamples)});
const float LUCA_INNER_ROTATION = ${glslFloat(inner.rotation)};
const vec2 LUCA_INNER_CENTER = vec2(${glslFloat(inner.center[0])}, ${glslFloat(inner.center[1])});
const vec2 LUCA_INNER_AXES = vec2(${glslFloat(inner.axes[0])}, ${glslFloat(inner.axes[1])});

vec2 lucaRotate(vec2 p, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return mat2(c, -s, s, c) * p;
}

float lucaCatmullRom(float p0, float p1, float p2, float p3, float t) {
  float t2 = t * t;
  float t3 = t2 * t;
  return 0.5 * (2.0 * p1
    + (-p0 + p2) * t
    + (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3) * t2
    + (-p0 + 3.0 * p1 - 3.0 * p2 + p3) * t3);
}

float lucaOuterRadius(float angle) {
  float position = fract((angle - LUCA_OUTER_ROTATION + LUCA_TAU) / LUCA_TAU) * float(LUCA_OUTER_COUNT);
  int i1 = int(floor(position));
  float t = fract(position);
  int i0 = (i1 - 1 + LUCA_OUTER_COUNT) % LUCA_OUTER_COUNT;
  int i2 = (i1 + 1) % LUCA_OUTER_COUNT;
  int i3 = (i1 + 2) % LUCA_OUTER_COUNT;
  return lucaCatmullRom(LUCA_OUTER_RADII[i0], LUCA_OUTER_RADII[i1], LUCA_OUTER_RADII[i2], LUCA_OUTER_RADII[i3], t);
}

float lucaInnerRadius(float angle) {
  float position = fract((angle - LUCA_INNER_ROTATION + LUCA_TAU) / LUCA_TAU) * float(LUCA_INNER_COUNT);
  int i1 = int(floor(position));
  float t = fract(position);
  int i0 = (i1 - 1 + LUCA_INNER_COUNT) % LUCA_INNER_COUNT;
  int i2 = (i1 + 1) % LUCA_INNER_COUNT;
  int i3 = (i1 + 2) % LUCA_INNER_COUNT;
  return lucaCatmullRom(LUCA_INNER_RADII[i0], LUCA_INNER_RADII[i1], LUCA_INNER_RADII[i2], LUCA_INNER_RADII[i3], t);
}

// Negative inside, positive outside. Radial authored field; not a true Euclidean SDF.
float lucaCanonicalVolumeField(vec2 p) {
  vec2 q = p - LUCA_OUTER_CENTER;
  float angle = atan(q.y, q.x);
  return length(q) - lucaOuterRadius(angle);
}

vec2 lucaInnerLobeSpace(vec2 p) {
  return lucaRotate(p - LUCA_INNER_CENTER, -LUCA_INNER_ROTATION) / LUCA_INNER_AXES;
}

float lucaCanonicalInnerLobeField(vec2 p) {
  vec2 q = lucaInnerLobeSpace(p);
  float angle = atan(q.y, q.x);
  return (length(q) - lucaInnerRadius(angle)) * min(LUCA_INNER_AXES.x, LUCA_INNER_AXES.y);
}
`;
