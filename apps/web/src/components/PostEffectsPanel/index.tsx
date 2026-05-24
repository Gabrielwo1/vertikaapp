import React, { useCallback } from 'react';
import type { PostEffectSettings } from '@virtualtour/shared';

interface PostEffectsPanelProps {
  postEffects: PostEffectSettings;
  onChange: (effects: PostEffectSettings) => void;
}

const BLOOM_INTENSITY_MIN = 0;
const BLOOM_INTENSITY_MAX = 3;
const VIGNETTE_MIN = 0;
const VIGNETTE_MAX = 1;
const SLIDER_STEP = 0.01;

export default function PostEffectsPanel({
  postEffects,
  onChange,
}: PostEffectsPanelProps): React.ReactElement {
  const handleBloomIntensityChange = useCallback(
    (value: string): void => {
      const num = parseFloat(value);
      if (isNaN(num)) return;
      onChange({ ...postEffects, bloomIntensity: num });
    },
    [postEffects, onChange],
  );

  const handleVignetteIntensityChange = useCallback(
    (value: string): void => {
      const num = parseFloat(value);
      if (isNaN(num)) return;
      onChange({ ...postEffects, vignetteIntensity: num });
    },
    [postEffects, onChange],
  );

  const handleBloomToggle = useCallback(
    (checked: boolean): void => {
      onChange({ ...postEffects, bloom: checked });
    },
    [postEffects, onChange],
  );

  const handleVignetteToggle = useCallback(
    (checked: boolean): void => {
      onChange({ ...postEffects, vignette: checked });
    },
    [postEffects, onChange],
  );

  const handleFxaaToggle = useCallback(
    (checked: boolean): void => {
      onChange({ ...postEffects, fxaa: checked });
    },
    [postEffects, onChange],
  );

  const handleAoToggle = useCallback(
    (checked: boolean): void => {
      onChange({ ...postEffects, ambientOcclusion: checked });
    },
    [postEffects, onChange],
  );

  const labelStyle: React.CSSProperties = {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#374151',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.25rem',
  };

  const sliderStyle: React.CSSProperties = {
    width: '100%',
    accentColor: '#4f46e5',
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: '1rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid #f3f4f6',
  };

  return (
    <div style={{ fontFamily: 'sans-serif' }}>
      <h3 style={{ margin: '0 0 1rem', fontSize: '0.875rem', fontWeight: 700, color: '#1f2937' }}>
        Pós-processamento
      </h3>

      {/* Bloom */}
      <div style={sectionStyle}>
        <label style={labelStyle}>
          <span>Bloom</span>
          <input
            type="checkbox"
            checked={postEffects.bloom}
            onChange={(e) => handleBloomToggle(e.target.checked)}
            style={{ accentColor: '#4f46e5' }}
          />
        </label>
        {postEffects.bloom && (
          <div>
            <div style={labelStyle}>
              <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>Intensidade</span>
              <span style={{ fontSize: '0.7rem', color: '#4f46e5', fontWeight: 700 }}>
                {postEffects.bloomIntensity.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min={BLOOM_INTENSITY_MIN}
              max={BLOOM_INTENSITY_MAX}
              step={SLIDER_STEP}
              value={postEffects.bloomIntensity}
              onChange={(e) => handleBloomIntensityChange(e.target.value)}
              style={sliderStyle}
            />
          </div>
        )}
      </div>

      {/* Vignette */}
      <div style={sectionStyle}>
        <label style={labelStyle}>
          <span>Vinheta</span>
          <input
            type="checkbox"
            checked={postEffects.vignette}
            onChange={(e) => handleVignetteToggle(e.target.checked)}
            style={{ accentColor: '#4f46e5' }}
          />
        </label>
        {postEffects.vignette && (
          <div>
            <div style={labelStyle}>
              <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>Intensidade</span>
              <span style={{ fontSize: '0.7rem', color: '#4f46e5', fontWeight: 700 }}>
                {postEffects.vignetteIntensity.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min={VIGNETTE_MIN}
              max={VIGNETTE_MAX}
              step={SLIDER_STEP}
              value={postEffects.vignetteIntensity}
              onChange={(e) => handleVignetteIntensityChange(e.target.value)}
              style={sliderStyle}
            />
          </div>
        )}
      </div>

      {/* Anti-aliasing */}
      <div style={sectionStyle}>
        <label style={labelStyle}>
          <span>Anti-aliasing (FXAA)</span>
          <input
            type="checkbox"
            checked={postEffects.fxaa}
            onChange={(e) => handleFxaaToggle(e.target.checked)}
            style={{ accentColor: '#4f46e5' }}
          />
        </label>
      </div>

      {/* Ambient Occlusion */}
      <div style={{ marginBottom: '0.5rem' }}>
        <label style={labelStyle}>
          <span>Oclusão Ambiente (AO)</span>
          <input
            type="checkbox"
            checked={postEffects.ambientOcclusion}
            onChange={(e) => handleAoToggle(e.target.checked)}
            style={{ accentColor: '#4f46e5' }}
          />
        </label>
      </div>
    </div>
  );
}
