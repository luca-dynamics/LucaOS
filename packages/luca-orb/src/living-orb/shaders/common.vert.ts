/**
 * Shared GLSL ES 3.00 vertex shader for all Living Orb render passes.
 * Renders a fullscreen quad (NDC space: -1 to +1).
 * Attributes are uploaded as a triangle strip: two triangles covering the screen.
 */
export const COMMON_VERT = /* glsl */`#version 300 es

in vec2 a_position;
out vec2 v_uv;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  // Map NDC [-1,1] to UV [0,1]
  v_uv = a_position * 0.5 + 0.5;
}
`;

/**
 * Fullscreen quad vertex positions (triangle strip, 4 vertices).
 * Upload as ARRAY_BUFFER and draw with TRIANGLE_STRIP.
 */
export const FULLSCREEN_QUAD_VERTS = new Float32Array([
  -1, -1,   // bottom-left
   1, -1,   // bottom-right
  -1,  1,   // top-left
   1,  1,   // top-right
]);
