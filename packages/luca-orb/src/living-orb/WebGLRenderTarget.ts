/** Off-screen color target used for internal renderer passes. */
export class WebGLRenderTarget {
  readonly texture: WebGLTexture;
  private readonly framebuffer: WebGLFramebuffer;
  private width = 0;
  private height = 0;
  private readonly internalFormat: number;
  private readonly pixelType: number;
  private readonly textureFilter: number;

  constructor(private readonly gl: WebGL2RenderingContext) {
    const supportsFloatColor = Boolean(gl.getExtension('EXT_color_buffer_float'));
    const supportsFloatLinear = Boolean(gl.getExtension('OES_texture_float_linear'));
    this.internalFormat = supportsFloatColor ? gl.RGBA16F : gl.RGBA8;
    this.pixelType = supportsFloatColor ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE;
    this.textureFilter = supportsFloatColor && !supportsFloatLinear ? gl.NEAREST : gl.LINEAR;
    const texture = gl.createTexture();
    const framebuffer = gl.createFramebuffer();
    if (!texture || !framebuffer) throw new Error('Failed to allocate WebGL render target');
    this.texture = texture;
    this.framebuffer = framebuffer;

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, this.textureFilter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, this.textureFilter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  resize(width: number, height: number): void {
    if (width === this.width && height === this.height) return;
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    const gl = this.gl;

    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      this.internalFormat,
      this.width,
      this.height,
      0,
      gl.RGBA,
      this.pixelType,
      null,
    );
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error('Optical thickness framebuffer is incomplete');
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  bind(): void {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);
    this.gl.viewport(0, 0, this.width, this.height);
  }

  unbind(defaultWidth: number, defaultHeight: number): void {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    this.gl.viewport(0, 0, defaultWidth, defaultHeight);
  }

  dispose(): void {
    this.gl.deleteFramebuffer(this.framebuffer);
    this.gl.deleteTexture(this.texture);
  }
}
