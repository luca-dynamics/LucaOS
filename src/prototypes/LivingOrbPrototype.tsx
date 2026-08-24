import React from 'react';
import { createRoot } from 'react-dom/client';
import { OrbMaterialLabV2 } from '../../packages/luca-orb/src/living-orb/OrbMaterialLabV2';
import type { OrbMaterialLabTier } from '../../packages/luca-orb/src/living-orb/OrbMaterialLabV2';
import type { OrbProfile } from '../../packages/luca-orb/src/living-orb/types';

const params = new URLSearchParams(window.location.search);
const profile = (params.get('variant') ?? 'idle') as OrbProfile;
const tier = (params.get('tier') ?? 'hero') as OrbMaterialLabTier;

document.documentElement.style.colorScheme = 'dark';
document.body.style.margin = '0';
document.body.style.background = '#07090d';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <OrbMaterialLabV2
      referenceSrc="/prototypes/living-orb-reference.png"
      canonicalSrc="/prototypes/living-orb-canonical-360.png"
      initialProfile={profile}
      initialTier={tier}
      initialView="blueprint"
    />
  </React.StrictMode>,
);
