import React, { useMemo, useState } from 'react';
import { LivingOrb } from './LivingOrb';
import {
  DEFAULT_LAYER_VISIBILITY,
  type OrbStructureStudy,
  type OrbProfile,
} from './types';
import { LUCA_HERO_ASSEMBLY_V3 } from '@luca/orb-design';
import { OrbStructureBlueprint } from './OrbStructureBlueprint';
import './OrbMaterialLabV2.css';

export type OrbMaterialLabTier = 'hero' | 'compact' | 'micro';
export type OrbMaterialLabView =
  | 'blueprint'
  | 'side-by-side'
  | 'turntable'
  | 'anatomy'
  | 'overlay'
  | 'split'
  | 'evidence';

export interface OrbMaterialLabV2Props {
  referenceSrc: string;
  canonicalSrc: string;
  initialProfile?: OrbProfile;
  initialTier?: OrbMaterialLabTier;
  initialView?: OrbMaterialLabView;
  className?: string;
}

const tiers: Array<{ key: OrbMaterialLabTier; label: string; size: number }> = [
  { key: 'hero', label: 'Hero', size: 360 },
  { key: 'compact', label: 'Compact', size: 144 },
  { key: 'micro', label: 'Micro', size: 64 },
];

const views: Array<{ key: OrbMaterialLabView; label: string }> = [
  { key: 'blueprint', label: '2D blueprint' },
  { key: 'evidence', label: 'Evidence' },
];

const evidence = [
  { label: 'Outer silhouette', detail: 'Upper-left crown to lower-right fold must match the frozen crop', status: 'pending' },
  { label: 'Front and rear shell', detail: 'Independent depth surfaces must read without material effects', status: 'pending' },
  { label: 'Suspended inner volume', detail: 'Pearl scale, offset, contour and negative space require approval', status: 'pending' },
  { label: 'Crown sheet', detail: 'Upper overlap must match the reference landmark', status: 'pending' },
  { label: 'Lower folded lip', detail: 'Fold depth and return path must match the reference landmark', status: 'pending' },
  { label: 'Right return', detail: 'Narrow structural turn must match the reference landmark', status: 'pending' },
  { label: 'Structure freeze', detail: 'Materials remain blocked until the neutral assembly is approved', status: 'blocked' },
] as const;

function MasterReference({ src, label }: { src: string; label: string }) {
  const { sourceSize, cropPixels, outputSize } = LUCA_HERO_ASSEMBLY_V3.reference;
  const [cropX, cropY] = cropPixels;
  return (
    <div
      className="orb-lab-v2__reference"
      aria-label={label}
      style={{ width: outputSize, height: outputSize }}
    >
      <img
        src={src}
        alt="Canonical Luca Living Orb product mockup"
        style={{
          width: sourceSize[0],
          height: sourceSize[1],
          transform: `translate(${-cropX}px, ${-cropY}px)`,
        }}
      />
      <div className="orb-lab-v2__reference-tag">Canonical hero crop</div>
    </div>
  );
}

function BaselineOrb({
  profile,
  tier,
  study = 'front',
  yaw = 0,
  pitch = 0,
}: {
  profile: OrbProfile;
  tier: (typeof tiers)[number];
  study?: OrbStructureStudy;
  yaw?: number;
  pitch?: number;
}) {
  return (
    <div className={`orb-lab-v2__baseline orb-lab-v2__baseline--${tier.key}`}>
      <LivingOrb
        profile={profile}
        size={tier.size}
        audioEnergy={0}
        renderMode="structure"
        structureStudy={study}
        structureYaw={yaw}
        structurePitch={pitch}
        layers={DEFAULT_LAYER_VISIBILITY}
      />
    </div>
  );
}

export const OrbMaterialLabV2: React.FC<OrbMaterialLabV2Props> = ({
  referenceSrc,
  canonicalSrc,
  initialProfile = 'idle',
  initialTier = 'hero',
  initialView = 'blueprint',
  className,
}) => {
  const profile = initialProfile;
  const [tierKey, setTierKey] = useState<OrbMaterialLabTier>(initialTier);
  const [view, setView] = useState<OrbMaterialLabView>(initialView);
  const [overlayOpacity, setOverlayOpacity] = useState(50);
  const [splitPosition, setSplitPosition] = useState(50);
  const [yawDegrees, setYawDegrees] = useState(24);
  const [pitchDegrees, setPitchDegrees] = useState(-8);

  const tier = useMemo(
    () => tiers.find(({ key }) => key === tierKey) ?? tiers[0],
    [tierKey],
  );

  return (
    <main className={['orb-lab-v2', className].filter(Boolean).join(' ')}>
      <header className="orb-lab-v2__header">
        <div>
          <p className="orb-lab-v2__eyebrow">LUCA STRUCTURE LAB · GEOMETRY BEFORE MATERIAL</p>
          <h1>Craft the Living Orb anatomy first.</h1>
          <p className="orb-lab-v2__lede">
            The master mockup is the source of truth. This view removes glass, glow, smoke,
            refraction, aura and motion so irregular geometry cannot hide behind materials.
          </p>
        </div>
        <div className="orb-lab-v2__status" role="status">
          <span className="orb-lab-v2__status-dot" />
          <span><strong>Structure not approved</strong><small>Materials and VoiceHUD remain blocked</small></span>
        </div>
      </header>

      <section className="orb-lab-v2__master-strip" aria-label="Canonical master image">
        <img src={referenceSrc} alt="Full Luca Living Orb cross-surface product mockup" />
        <div>
          <span>Canonical source</span>
          <strong>One frozen anatomy before any material identity is developed</strong>
        </div>
      </section>

      <section className="orb-lab-v2__toolbar" aria-label="Structure Lab controls">
        <div className="orb-lab-v2__segmented" aria-label="Review view">
          {views.map((item) => (
            <button
              key={item.key}
              type="button"
              aria-pressed={view === item.key}
              onClick={() => setView(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="orb-lab-v2__toolbar-group">
          <label>
            <span>Tier</span>
            <select value={tierKey} onChange={(event) => setTierKey(event.target.value as OrbMaterialLabTier)}>
              {tiers.map((item) => <option key={item.key} value={item.key}>{item.label} · {item.size}px</option>)}
            </select>
          </label>
        </div>
      </section>

      {view === 'blueprint' && <OrbStructureBlueprint canonicalSrc={canonicalSrc} />}

      {view === 'side-by-side' && (
        <section className="orb-lab-v2__comparison" aria-label="Canonical reference and working renderer comparison">
          <article className="orb-lab-v2__panel">
            <div className="orb-lab-v2__panel-heading"><span>Target anatomy</span><small>Approved product mockup</small></div>
            <div className="orb-lab-v2__stage"><MasterReference src={referenceSrc} label="Canonical target anatomy" /></div>
          </article>
          <article className="orb-lab-v2__panel">
            <div className="orb-lab-v2__panel-heading"><span>Neutral structure candidate</span><small>Not approved · matte diagnostic · {tier.label}</small></div>
            <div className="orb-lab-v2__stage"><BaselineOrb profile={profile} tier={tier} /></div>
          </article>
        </section>
      )}

      {(view === 'turntable' || view === 'anatomy') && (
        <section className="orb-lab-v2__turntable" aria-label="Rotatable three-dimensional structure study">
          <div className="orb-lab-v2__turntable-stage">
            <BaselineOrb
              profile={profile}
              tier={tier}
              study={view}
              yaw={yawDegrees * Math.PI / 180}
              pitch={pitchDegrees * Math.PI / 180}
            />
            <span className="orb-lab-v2__turntable-badge">
              {view === 'turntable' ? 'Closed identity shell' : 'Shell + suspended mass + membranes'}
            </span>
          </div>
          <aside className="orb-lab-v2__turntable-controls">
            <div>
              <p className="orb-lab-v2__eyebrow">STRUCTURE PROTOTYPE</p>
              <h2>{view === 'turntable' ? 'Judge the body in rotation.' : 'Inspect the layer order.'}</h2>
              <p>
                The hero crop owns the front contour. Side and rear depth are an authored proposal
                until the turntable is approved.
              </p>
            </div>
            <label className="orb-lab-v2__range">
              <span>Yaw <strong>{yawDegrees}°</strong></span>
              <input type="range" min="-180" max="180" value={yawDegrees} onChange={(event) => setYawDegrees(Number(event.target.value))} />
            </label>
            <label className="orb-lab-v2__range">
              <span>Pitch <strong>{pitchDegrees}°</strong></span>
              <input type="range" min="-45" max="45" value={pitchDegrees} onChange={(event) => setPitchDegrees(Number(event.target.value))} />
            </label>
            <div className="orb-lab-v2__camera-presets" aria-label="Camera presets">
              {[
                { label: 'Front', yaw: 0, pitch: 0 },
                { label: 'Three-quarter', yaw: 24, pitch: -8 },
                { label: 'Side', yaw: 90, pitch: 0 },
                { label: 'Rear', yaw: 180, pitch: 0 },
              ].map((preset) => (
                <button key={preset.label} type="button" onClick={() => { setYawDegrees(preset.yaw); setPitchDegrees(preset.pitch); }}>
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="orb-lab-v2__turntable-rule">
              <strong>Identity rule</strong>
              <span>State animation may bend this topology; it may not replace it.</span>
            </div>
          </aside>
        </section>
      )}

      {(view === 'overlay' || view === 'split') && (
        <section className="orb-lab-v2__inspection">
          <div className="orb-lab-v2__inspection-stage">
            <MasterReference src={referenceSrc} label="Canonical target underlay" />
            <div
              className="orb-lab-v2__inspection-baseline"
              style={view === 'overlay'
                ? { opacity: overlayOpacity / 100 }
                : { clipPath: `inset(0 ${100 - splitPosition}% 0 0)` }}
            >
              <BaselineOrb profile={profile} tier={tier} />
            </div>
            <span className="orb-lab-v2__inspection-label orb-lab-v2__inspection-label--target">Target</span>
            <span className="orb-lab-v2__inspection-label orb-lab-v2__inspection-label--baseline">Working renderer</span>
            {view === 'split' && <span className="orb-lab-v2__split-line" style={{ left: `${splitPosition}%` }} />}
          </div>
          <label className="orb-lab-v2__range">
            <span>{view === 'overlay' ? 'Baseline opacity' : 'Split position'} <strong>{view === 'overlay' ? overlayOpacity : splitPosition}%</strong></span>
            <input
              type="range"
              min="0"
              max="100"
              value={view === 'overlay' ? overlayOpacity : splitPosition}
              onChange={(event) => view === 'overlay'
                ? setOverlayOpacity(Number(event.target.value))
                : setSplitPosition(Number(event.target.value))}
            />
          </label>
          <p className="orb-lab-v2__inspection-note">
            Judge only silhouette, overlap, depth order, thickness and negative space. Material quality is deliberately unavailable in this stage.
          </p>
        </section>
      )}

      {view === 'evidence' && (
        <section className="orb-lab-v2__evidence">
          <div className="orb-lab-v2__evidence-intro">
            <p className="orb-lab-v2__eyebrow">EVIDENCE, NOT SELF-SCORING</p>
            <h2>Materials stay closed until the form earns them.</h2>
            <p>Every structural part must pass human review against the canonical master before glass engineering resumes.</p>
          </div>
          <div className="orb-lab-v2__evidence-list">
            {evidence.map((item) => (
              <div className="orb-lab-v2__evidence-row" key={item.label}>
                <span className={`orb-lab-v2__evidence-mark orb-lab-v2__evidence-mark--${item.status}`} />
                <span><strong>{item.label}</strong><small>{item.detail}</small></span>
                <em>{item.status}</em>
              </div>
            ))}
          </div>
        </section>
      )}

      <footer className="orb-lab-v2__footer">
        <span>Current decision</span>
        <strong>Structure-only gate active. Freeze silhouette, shell layers, pearl, crown, fold and right return before restoring materials.</strong>
      </footer>
    </main>
  );
};
