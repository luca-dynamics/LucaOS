export type OrbBlueprintLayerId =
  | 'outer-silhouette'
  | 'crown-edge'
  | 'lower-fold'
  | 'right-return'
  | 'inner-mass';

export interface OrbBlueprintLayer {
  readonly id: OrbBlueprintLayerId;
  readonly label: string;
  readonly path: string;
  readonly closed: boolean;
}

export interface OrbBlueprintLandmark {
  readonly id: string;
  readonly x: number;
  readonly y: number;
}

/**
 * PROTOTYPE TRACE V1.
 *
 * The paths use the frozen 360 x 360 hero crop directly. They are the
 * approval surface for the two-dimensional identity and must be corrected
 * here before any future 3D reconstruction consumes them.
 */
export const LUCA_HERO_BLUEPRINT_V1 = Object.freeze({
  id: 'luca-living-orb/hero-blueprint',
  version: 1,
  viewBox: Object.freeze([0, 0, 360, 360] as const),
  layers: Object.freeze<readonly OrbBlueprintLayer[]>([
    Object.freeze({
      id: 'outer-silhouette',
      label: 'Outer membrane silhouette',
      closed: true,
      path: 'M 172 64 C 198 63 218 72 238 83 C 260 91 287 98 305 116 C 322 133 322 155 316 176 C 310 198 294 217 281 239 C 266 264 244 280 216 286 C 186 292 163 285 139 271 C 116 257 88 251 70 233 C 54 217 49 194 53 174 C 57 151 71 130 86 110 C 101 90 121 75 143 68 C 153 65 162 64 172 64 Z',
    }),
    Object.freeze({
      id: 'crown-edge',
      label: 'Upper crown overlap',
      closed: false,
      path: 'M 61 155 C 68 132 82 107 101 89 C 119 72 141 64 163 64 C 187 64 205 71 224 81 C 245 91 263 91 281 101 C 294 108 304 118 311 130',
    }),
    Object.freeze({
      id: 'lower-fold',
      label: 'Lower forward fold',
      closed: false,
      path: 'M 56 200 C 61 220 75 235 96 245 C 116 255 130 258 146 270 C 163 282 184 289 207 287 C 235 285 256 273 270 253 C 279 241 285 225 295 211',
    }),
    Object.freeze({
      id: 'right-return',
      label: 'Right membrane return',
      closed: false,
      path: 'M 280 101 C 300 109 314 126 317 145 C 321 165 313 184 302 201 C 290 220 281 239 268 255',
    }),
    Object.freeze({
      id: 'inner-mass',
      label: 'Suspended inner mass',
      closed: true,
      path: 'M 171 78 C 202 76 224 87 249 96 C 275 103 299 113 307 134 C 317 158 304 181 289 201 C 275 221 270 244 251 260 C 232 276 207 281 183 276 C 159 272 144 261 124 253 C 101 244 78 232 68 212 C 57 189 64 166 78 145 C 92 123 105 101 128 88 C 141 81 156 78 171 78 Z',
    }),
  ]),
  landmarks: Object.freeze<readonly OrbBlueprintLandmark[]>([
    Object.freeze({ id: 'crown-apex', x: 172, y: 64 }),
    Object.freeze({ id: 'rightmost-return', x: 318, y: 151 }),
    Object.freeze({ id: 'lower-fold-apex', x: 207, y: 287 }),
    Object.freeze({ id: 'leftmost-membrane', x: 52, y: 184 }),
    Object.freeze({ id: 'inner-mass-focus', x: 177, y: 179 }),
  ]),
});
