/**
 * OrbController — Presentational host controller for embodiments.
 *
 * Exposes a clean embodiment abstraction. The host application or runtime
 * passes presence/profile props into OrbController, which manages the active
 * Embodiment (Living Orb, Hologram Face, Minimal Dot) without exposing
 * renderer-specific internals.
 */
import React from 'react';
import { LivingOrb } from './LivingOrb';
import { EmbodimentKind, EmbodimentProps } from './Embodiment';
import { OrbProfile, OrbLayerVisibility } from './types';
import { OrbIdentityDNA } from '@luca/orb-design';

export interface OrbControllerProps extends EmbodimentProps {
  /** Which embodiment model to render. Defaults to 'living-orb' */
  embodiment?: EmbodimentKind;
}

export const OrbController: React.FC<OrbControllerProps> = ({
  embodiment = 'living-orb',
  profile = 'idle',
  size = 200,
  audioEnergy = 0,
  dna,
  layers,
  debug = false,
  className,
  style,
}) => {
  switch (embodiment) {
    case 'living-orb':
    default:
      return (
        <LivingOrb
          profile={profile}
          size={size}
          audioEnergy={audioEnergy}
          dna={dna}
          layers={layers}
          debug={debug}
          className={className}
          style={style}
        />
      );

    case 'hologram-face':
      return (
        <div
          className={className}
          style={{
            width: size,
            height: size,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(200,220,255,0.6)',
            fontSize: 12,
            border: '1px stroke rgba(200,220,255,0.2)',
            borderRadius: '50%',
            ...style,
          }}
        >
          [Hologram Face Embodiment]
        </div>
      );

    case 'minimal-dot':
      return (
        <div
          className={className}
          style={{
            width: size * 0.2,
            height: size * 0.2,
            borderRadius: '50%',
            background: 'radial-gradient(circle, #8BB4D0 0%, transparent 70%)',
            boxShadow: '0 0 12px rgba(139,180,208,0.6)',
            ...style,
          }}
        />
      );
  }
};
