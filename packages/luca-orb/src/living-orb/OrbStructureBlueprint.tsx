import React, { useMemo, useState } from 'react';
import {
  LUCA_HERO_BLUEPRINT_V1,
  type OrbBlueprintLayerId,
} from '@luca/orb-design';

type BlueprintDisplay = 'trace' | 'overlay' | 'silhouette';

const layerColors: Record<OrbBlueprintLayerId, string> = {
  'outer-silhouette': '#f4f7fb',
  'crown-edge': '#8fc5ff',
  'lower-fold': '#ffbd86',
  'right-return': '#d3a7ff',
  'inner-mass': '#91e0c2',
};

export interface OrbStructureBlueprintProps {
  canonicalSrc: string;
}

export const OrbStructureBlueprint: React.FC<OrbStructureBlueprintProps> = ({ canonicalSrc }) => {
  const [display, setDisplay] = useState<BlueprintDisplay>('overlay');
  const [referenceOpacity, setReferenceOpacity] = useState(62);
  const [visibleLayers, setVisibleLayers] = useState<Set<OrbBlueprintLayerId>>(
    () => new Set(LUCA_HERO_BLUEPRINT_V1.layers.map(({ id }) => id)),
  );

  const layers = useMemo(() => LUCA_HERO_BLUEPRINT_V1.layers.filter(({ id }) => {
    if (display === 'silhouette') return id === 'outer-silhouette';
    return visibleLayers.has(id);
  }), [display, visibleLayers]);

  const toggleLayer = (id: OrbBlueprintLayerId) => {
    setVisibleLayers((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <section className="orb-blueprint" aria-label="Canonical two-dimensional orb structure blueprint">
      <div className="orb-blueprint__stage">
        <div className="orb-blueprint__frame">
          <img
            src={canonicalSrc}
            alt="Frozen 360 pixel canonical Luca Living Orb hero crop"
            style={{ opacity: display === 'trace' ? 0 : referenceOpacity / 100 }}
          />
          <svg viewBox="0 0 360 360" role="img" aria-label="Traced structural anatomy over the canonical orb">
            {layers.map((layer) => (
              <path
                key={layer.id}
                d={layer.path}
                data-layer={layer.id}
                fill={layer.closed && display === 'trace' ? `${layerColors[layer.id]}12` : 'none'}
                stroke={layerColors[layer.id]}
                strokeWidth={layer.id === 'outer-silhouette' ? 2.2 : 1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {display !== 'silhouette' && LUCA_HERO_BLUEPRINT_V1.landmarks.map((landmark) => (
              <g key={landmark.id} className="orb-blueprint__landmark">
                <circle cx={landmark.x} cy={landmark.y} r="3" />
                <circle cx={landmark.x} cy={landmark.y} r="7" />
              </g>
            ))}
          </svg>
          <span className="orb-blueprint__frame-label">Frozen frame · 360 × 360 · no perspective inference</span>
        </div>
      </div>

      <aside className="orb-blueprint__controls">
        <div>
          <p className="orb-lab-v2__eyebrow">2D IDENTITY GATE</p>
          <h2>Approve the drawing before depth.</h2>
          <p>This is the only structure under review. The rejected 3D body is not an input.</p>
        </div>

        <div className="orb-blueprint__display" aria-label="Blueprint display mode">
          {(['overlay', 'trace', 'silhouette'] as const).map((mode) => (
            <button key={mode} type="button" aria-pressed={display === mode} onClick={() => setDisplay(mode)}>
              {mode}
            </button>
          ))}
        </div>

        {display === 'overlay' && (
          <label className="orb-lab-v2__range">
            <span>Reference opacity <strong>{referenceOpacity}%</strong></span>
            <input type="range" min="0" max="100" value={referenceOpacity} onChange={(event) => setReferenceOpacity(Number(event.target.value))} />
          </label>
        )}

        <div className="orb-blueprint__layers">
          {LUCA_HERO_BLUEPRINT_V1.layers.map((layer) => (
            <button
              key={layer.id}
              type="button"
              aria-pressed={visibleLayers.has(layer.id)}
              onClick={() => toggleLayer(layer.id)}
              disabled={display === 'silhouette' && layer.id !== 'outer-silhouette'}
            >
              <i style={{ background: layerColors[layer.id] }} />
              <span>{layer.label}</span>
            </button>
          ))}
        </div>

        <div className="orb-blueprint__rule">
          <strong>Approval order</strong>
          <span>1. outer silhouette</span>
          <span>2. crown and lower fold</span>
          <span>3. right return</span>
          <span>4. suspended inner mass</span>
        </div>
      </aside>
    </section>
  );
};
