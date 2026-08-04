import { OrbUniforms } from "./OrbUniforms";

export interface RenderContext {
  gl?: WebGL2RenderingContext;
  time: number;
  resolution: [number, number];
  uniforms: OrbUniforms;
}

export interface RenderPass {
  id: string;
  enabled: boolean;
  execute(ctx: RenderContext): void;
}
