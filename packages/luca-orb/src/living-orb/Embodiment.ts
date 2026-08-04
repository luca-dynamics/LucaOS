/**
 * Embodiment Contract
 *
 * An Embodiment is a presentational avatar interface for Luca (e.g. Living Orb,
 * Hologram Face, Minimal Dot). The runtime emits presence vectors; the active
 * Embodiment renders the visual representation.
 */
import React from 'react';
import { OrbProfile, OrbLayerVisibility } from './types';
import { OrbIdentityDNA } from '@luca/orb-design';

export type EmbodimentKind = 'living-orb' | 'hologram-face' | 'minimal-dot';

export interface EmbodimentProps {
  /** Visual profile — determines material, motion, and lighting character */
  profile?: OrbProfile;
  /** Primary size in CSS pixels */
  size?: number;
  /** Real-time audio energy 0–1 */
  audioEnergy?: number;
  /** Active identity DNA */
  dna?: OrbIdentityDNA;
  /** Layer visibility overrides */
  layers?: Partial<OrbLayerVisibility>;
  /** Debug overlay toggle */
  debug?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export interface Embodiment {
  id: EmbodimentKind;
  name: string;
  description: string;
  Component: React.FC<EmbodimentProps>;
}
