// ─── Embodiment Adapter ────────────────────────────────────────────────────────
// Downstream application UI adapter for VoiceHUD, Floating Assistant, etc.
// Decouples application UI lifecycle from OrbDirector and EmbodimentState.

import { EmbodimentState } from '@luca/orb-design';
import { OrbDirector } from './OrbDirector';

/** Frozen public rendering contract for all Luca embodiment renderers. */
export interface EmbodimentRenderer {
  initialize(canvas: HTMLCanvasElement): void;
  resize(width: number, height: number, dpr: number): void;
  render(state: EmbodimentState): void;
  dispose(): void;
}

/** Adapter configuration props for downstream UI consumers. */
export interface EmbodimentAdapterProps {
  canvas: HTMLCanvasElement;
  renderer: EmbodimentRenderer;
  director: OrbDirector;
  reducedMotion?: boolean;
  highDpi?: boolean;
}

export class EmbodimentAdapter {
  private canvas: HTMLCanvasElement;
  private renderer: EmbodimentRenderer;
  private director: OrbDirector;
  private animFrameId: number | null = null;
  private isDisposed = false;
  private reducedMotion: boolean;

  constructor(props: EmbodimentAdapterProps) {
    this.canvas = props.canvas;
    this.renderer = props.renderer;
    this.director = props.director;
    this.reducedMotion = props.reducedMotion ?? false;

    this.renderer.initialize(this.canvas);
    this.handleResize();
  }

  /** Viewport, DPI, and safe-area update handler. */
  public handleResize(): void {
    if (this.isDisposed) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = this.canvas.clientWidth || 380;
    const height = this.canvas.clientHeight || 380;
    this.renderer.resize(width, height, dpr);
  }

  /** Main tick loop consuming EmbodimentState from OrbDirector. */
  public tick(_timeSeconds?: number): void {
    if (this.isDisposed) return;
    this.director.tick();
    const state = this.director.getEmbodimentState();
    this.renderer.render(state);
  }

  /** Start requestAnimationFrame loop. */
  public start(): void {
    if (this.isDisposed) return;
    const loop = (timestamp: number) => {
      this.tick(timestamp / 1000);
      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  /** Stop loop and dispose resources cleanly. */
  public dispose(): void {
    this.isDisposed = true;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.renderer.dispose();
  }
}
