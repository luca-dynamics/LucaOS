/**
 * OrbShowcase — Full-screen Living Orb component demo.
 *
 * This is the Sprint A deliverable: an Apple-quality component showcase
 * that lets you inspect every visual profile and toggle every layer.
 *
 * Structure:
 *   - Full-screen dark canvas background (belongs to showcase, not orb)
 *   - Large central LivingOrb (400px)
 *   - Profile selector: cycle through all 7 profiles
 *   - Layer toggle panel: individually enable/disable each layer
 *   - State label and description
 *   - Side-by-side: small orbs showing all profiles simultaneously
 *
 * This component is ONLY for development/QA. Not shipped in production.
 */
import React, { useState, useCallback } from 'react';
import { LivingOrb } from './LivingOrb';
import { OrbProfile, OrbLayerVisibility, ALL_PROFILES, DEFAULT_LAYER_VISIBILITY } from './types';

const PROFILE_DESCRIPTIONS: Record<OrbProfile, string> = {
  idle:      'At rest. Breathing slowly. Aware but not active.',
  listening: 'Receptive. Surface opens. Light brightens. Ripples expand.',
  thinking:  'Internal. Crystalline. Cooler. Focused inward.',
  speaking:  'Expressive. Warm. Bloom expands. Surface energized.',
  success:   'Resolved. Soft green. A moment of completion.',
  error:     'Alert. Contracted. Cooler rim. Immediate.',
  sleeping:  'Dormant. Dimmed. Nearly still. Long exhale.',
};

const LAYER_LABELS: Record<keyof OrbLayerVisibility, string> = {
  background: 'Background (ripples + bloom)',
  shadow:     'Contact shadow',
  glassBody:  'Glass body',
  coreLight:  'Core glow',
  highlight:  'Specular highlights',
  debug:      'Debug overlay',
};

export const OrbShowcase: React.FC = () => {
  const [profile, setProfile]     = useState<OrbProfile>('idle');
  const [layers, setLayers]       = useState<OrbLayerVisibility>(DEFAULT_LAYER_VISIBILITY);
  const [audioEnergy, setAudio]   = useState(0);
  const [showAllProfiles, setShowAll] = useState(true);

  const currentIndex = ALL_PROFILES.indexOf(profile);

  const prevProfile = useCallback(() => {
    setProfile(ALL_PROFILES[(currentIndex - 1 + ALL_PROFILES.length) % ALL_PROFILES.length]);
  }, [currentIndex]);

  const nextProfile = useCallback(() => {
    setProfile(ALL_PROFILES[(currentIndex + 1) % ALL_PROFILES.length]);
  }, [currentIndex]);

  const toggleLayer = useCallback((key: keyof OrbLayerVisibility) => {
    setLayers(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  return (
    <div style={styles.root}>
      {/* ── Header ── */}
      <div style={styles.header}>
        <span style={styles.headerTitle}>Living Orb</span>
        <span style={styles.headerSub}>Sprint A · Visual QA Showcase</span>
      </div>

      {/* ── Main stage ── */}
      <div style={styles.stage}>
        {/* Background radial gradient — belongs to showcase, not orb */}
        <div style={styles.stageBg} />

        <div style={styles.orbContainer}>
          <LivingOrb
            profile={profile}
            size={400}
            audioEnergy={audioEnergy}
            layers={layers}
          />
        </div>

        {/* Profile label */}
        <div style={styles.profileLabel}>
          <button style={styles.navBtn} onClick={prevProfile}>‹</button>
          <div style={styles.profileInfo}>
            <span style={styles.profileName}>{profile.toUpperCase()}</span>
            <span style={styles.profileDesc}>{PROFILE_DESCRIPTIONS[profile]}</span>
          </div>
          <button style={styles.navBtn} onClick={nextProfile}>›</button>
        </div>
      </div>

      {/* ── Controls row ── */}
      <div style={styles.controlsRow}>
        {/* Layer toggles */}
        <div style={styles.panel}>
          <div style={styles.panelTitle}>Layers</div>
          {(Object.keys(layers) as Array<keyof OrbLayerVisibility>).map(key => (
            <button
              key={key}
              style={{
                ...styles.layerBtn,
                opacity: layers[key] ? 1 : 0.35,
                borderColor: layers[key] ? 'rgba(200,220,255,0.5)' : 'rgba(200,220,255,0.12)',
              }}
              onClick={() => toggleLayer(key)}
            >
              <span style={{ ...styles.layerDot, opacity: layers[key] ? 1 : 0.3 }} />
              {LAYER_LABELS[key]}
            </button>
          ))}
        </div>

        {/* Profile grid */}
        <div style={styles.panel}>
          <div style={styles.panelTitle}>All Profiles</div>
          <div style={styles.profileGrid}>
            {ALL_PROFILES.map(p => (
              <button
                key={p}
                style={{
                  ...styles.profileGridBtn,
                  borderColor: p === profile ? 'rgba(200,220,255,0.6)' : 'rgba(200,220,255,0.12)',
                  background:  p === profile ? 'rgba(200,220,255,0.06)' : 'transparent',
                }}
                onClick={() => setProfile(p)}
              >
                <div style={styles.miniOrbWrap}>
                  <LivingOrb profile={p} size={56} layers={layers} />
                </div>
                <span style={styles.profileGridLabel}>{p}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Audio simulator */}
        <div style={styles.panel}>
          <div style={styles.panelTitle}>Audio Simulation</div>
          <div style={styles.sliderRow}>
            <span style={styles.sliderLabel}>Energy</span>
            <input
              type="range"
              min={0} max={1} step={0.01}
              value={audioEnergy}
              onChange={e => setAudio(parseFloat(e.target.value))}
              style={styles.slider}
            />
            <span style={styles.sliderValue}>{audioEnergy.toFixed(2)}</span>
          </div>
          <div style={styles.qaNote}>
            <div style={styles.qaNoteTitle}>QA Gate</div>
            <div style={styles.qaNoteText}>
              "Would someone mistake this for an Apple-designed assistant?"<br/>
              If no → continue iterating.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight:        '100vh',
    background:       '#080B10',
    color:            '#C8DCFF',
    fontFamily:       '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif',
    display:          'flex',
    flexDirection:    'column',
    alignItems:       'center',
    gap:              0,
    overflow:         'hidden',
  },
  header: {
    width:            '100%',
    padding:          '20px 32px',
    display:          'flex',
    alignItems:       'baseline',
    gap:              12,
    borderBottom:     '1px solid rgba(200,220,255,0.06)',
  },
  headerTitle: {
    fontSize:         18,
    fontWeight:       600,
    letterSpacing:    '0.01em',
    color:            '#E8F0FF',
  },
  headerSub: {
    fontSize:         12,
    color:            'rgba(200,220,255,0.4)',
    letterSpacing:    '0.08em',
    textTransform:    'uppercase',
  },
  stage: {
    position:         'relative',
    width:            '100%',
    display:          'flex',
    flexDirection:    'column',
    alignItems:       'center',
    padding:          '60px 0 40px',
  },
  stageBg: {
    position:         'absolute',
    top:              0, left: 0, right: 0, bottom: 0,
    background:       'radial-gradient(ellipse 60% 80% at 50% 40%, rgba(26,58,92,0.35) 0%, transparent 70%)',
    pointerEvents:    'none',
  },
  orbContainer: {
    position:         'relative',
    zIndex:           1,
  },
  profileLabel: {
    position:         'relative',
    zIndex:           1,
    marginTop:        32,
    display:          'flex',
    alignItems:       'center',
    gap:              24,
  },
  navBtn: {
    background:       'rgba(200,220,255,0.06)',
    border:           '1px solid rgba(200,220,255,0.12)',
    color:            'rgba(200,220,255,0.7)',
    borderRadius:     8,
    width:            36,
    height:           36,
    fontSize:         20,
    cursor:           'pointer',
    display:          'flex',
    alignItems:       'center',
    justifyContent:   'center',
    transition:       'all 0.15s',
  },
  profileInfo: {
    display:          'flex',
    flexDirection:    'column',
    alignItems:       'center',
    gap:              6,
    minWidth:         260,
    textAlign:        'center',
  },
  profileName: {
    fontSize:         13,
    fontWeight:       600,
    letterSpacing:    '0.14em',
    color:            'rgba(200,220,255,0.9)',
  },
  profileDesc: {
    fontSize:         13,
    color:            'rgba(200,220,255,0.45)',
    lineHeight:       1.5,
  },
  controlsRow: {
    width:            '100%',
    maxWidth:         1100,
    display:          'grid',
    gridTemplateColumns: '1fr 2fr 1fr',
    gap:              16,
    padding:          '0 24px 40px',
    boxSizing:        'border-box',
  },
  panel: {
    background:       'rgba(200,220,255,0.03)',
    border:           '1px solid rgba(200,220,255,0.06)',
    borderRadius:     12,
    padding:          '16px 16px',
    display:          'flex',
    flexDirection:    'column',
    gap:              8,
  },
  panelTitle: {
    fontSize:         11,
    fontWeight:       600,
    letterSpacing:    '0.10em',
    textTransform:    'uppercase',
    color:            'rgba(200,220,255,0.35)',
    marginBottom:     4,
  },
  layerBtn: {
    background:       'transparent',
    border:           '1px solid',
    borderRadius:     6,
    padding:          '7px 10px',
    color:            'rgba(200,220,255,0.75)',
    fontSize:         12,
    cursor:           'pointer',
    display:          'flex',
    alignItems:       'center',
    gap:              8,
    textAlign:        'left',
    transition:       'all 0.15s',
    letterSpacing:    '0.01em',
  },
  layerDot: {
    width:            7,
    height:           7,
    borderRadius:     '50%',
    background:       '#8BB4D0',
    flexShrink:       0,
  },
  profileGrid: {
    display:          'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap:              8,
  },
  profileGridBtn: {
    background:       'transparent',
    border:           '1px solid',
    borderRadius:     8,
    padding:          '10px 6px 8px',
    cursor:           'pointer',
    display:          'flex',
    flexDirection:    'column',
    alignItems:       'center',
    gap:              6,
    transition:       'all 0.15s',
  },
  miniOrbWrap: {
    pointerEvents:    'none',
  },
  profileGridLabel: {
    fontSize:         10,
    color:            'rgba(200,220,255,0.5)',
    letterSpacing:    '0.08em',
    textTransform:    'uppercase',
  },
  sliderRow: {
    display:          'flex',
    alignItems:       'center',
    gap:              10,
  },
  sliderLabel: {
    fontSize:         12,
    color:            'rgba(200,220,255,0.5)',
    width:            50,
  },
  slider: {
    flex:             1,
    accentColor:      '#8BB4D0',
  },
  sliderValue: {
    fontSize:         12,
    color:            'rgba(200,220,255,0.5)',
    width:            36,
    textAlign:        'right',
    fontVariantNumeric: 'tabular-nums',
  },
  qaNote: {
    marginTop:        12,
    padding:          '12px',
    background:       'rgba(200,220,255,0.03)',
    borderRadius:     8,
    border:           '1px solid rgba(200,220,255,0.06)',
  },
  qaNoteTitle: {
    fontSize:         10,
    fontWeight:       600,
    letterSpacing:    '0.10em',
    textTransform:    'uppercase',
    color:            'rgba(200,220,255,0.3)',
    marginBottom:     6,
  },
  qaNoteText: {
    fontSize:         12,
    color:            'rgba(200,220,255,0.5)',
    lineHeight:       1.6,
    fontStyle:        'italic',
  },
};
