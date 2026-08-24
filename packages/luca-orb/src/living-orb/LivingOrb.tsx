/**
 * LivingOrb — Presentational Embodiment wrapping the WebGL renderer.
 *
 * Implements the Embodiment interface. Renders on a transparent canvas
 * with glass body, core glow, rim highlights, and contact shadow.
 */
import React, { useRef, useEffect } from 'react';
import { OrbRenderer } from './OrbRenderer';
import { LivingOrbProps, DEFAULT_LAYER_VISIBILITY } from './types';
import { OrbIdentityDNA } from '@luca/orb-design';

export interface LivingOrbEmbodimentProps extends LivingOrbProps {
  dna?: OrbIdentityDNA;
}

export const LivingOrb: React.FC<LivingOrbEmbodimentProps> = ({
  profile    = 'idle',
  size       = 200,
  audioEnergy = 0,
  renderMode = 'material',
  structureStudy = 'front',
  structureYaw = 0,
  structurePitch = 0,
  dna,
  layers     = {},
  background,
  debug      = false,
  className,
  style,
}) => {
  const canvasRef      = useRef<HTMLCanvasElement>(null);
  const rendererRef    = useRef<OrbRenderer | null>(null);
  const resizeObserver = useRef<ResizeObserver | null>(null);

  // ── Initialise renderer ──────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let renderer: OrbRenderer;
    try {
      renderer = new OrbRenderer(canvas, {
        profile,
        dna,
        layers: { ...DEFAULT_LAYER_VISIBILITY, ...layers, debug },
        devicePixelRatio: window.devicePixelRatio,
        background,
        renderMode,
        structureStudy,
        structureYaw,
        structurePitch,
      });
      renderer.resize(size, size);
      renderer.start();
      rendererRef.current = renderer;
    } catch (err) {
      console.error('[LivingOrb] Failed to initialize WebGL renderer:', err);
      return;
    }

    resizeObserver.current = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        renderer.resize(width, height);
      }
    });

    if (canvas.parentElement) {
      resizeObserver.current.observe(canvas.parentElement);
    }

    return () => {
      resizeObserver.current?.disconnect();
      renderer.dispose();
      rendererRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sync profile ──────────────────────────────────────────────────────────
  useEffect(() => {
    rendererRef.current?.setProfile(profile);
  }, [profile]);

  // ── Sync DNA ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (dna) {
      rendererRef.current?.setIdentityDNA(dna);
    }
  }, [dna]);

  // ── Sync layer visibility ─────────────────────────────────────────────────
  useEffect(() => {
    rendererRef.current?.setLayerVisibility({
      ...DEFAULT_LAYER_VISIBILITY,
      ...layers,
      debug,
    });
  }, [layers, debug]);

  // ── Sync audio energy ─────────────────────────────────────────────────────
  useEffect(() => {
    rendererRef.current?.setAudioInput(audioEnergy);
  }, [audioEnergy]);

  useEffect(() => {
    rendererRef.current?.setStructureView(structureStudy, structureYaw, structurePitch);
  }, [structureStudy, structureYaw, structurePitch]);

  // The host owns the scene capture; replacing it updates refraction without recreating WebGL.
  useEffect(() => {
    rendererRef.current?.setBackground(background);
  }, [background]);

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width:  size,
        height: size,
        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width:  '100%',
          height: '100%',
          background: 'transparent',
          display: 'block',
        }}
        aria-hidden="true"
      />
    </div>
  );
};
