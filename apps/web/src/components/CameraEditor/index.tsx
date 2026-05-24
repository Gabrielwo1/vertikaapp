import React, { useCallback } from 'react';
import type { Camera } from '@virtualtour/shared';

interface CameraEditorProps {
  cameras: Camera[];
  onChange: (cameras: Camera[]) => void;
}

const DEFAULT_CAMERA: Camera = {
  position: [0, 1, 5],
  target: [0, 0, 0],
  fov: 75,
};

const MIN_FOV = 30;
const MAX_FOV = 120;

export default function CameraEditor({ cameras, onChange }: CameraEditorProps): React.ReactElement {
  const camera = cameras[0] ?? DEFAULT_CAMERA;

  const handlePositionChange = useCallback(
    (axis: 0 | 1 | 2, value: string): void => {
      const num = parseFloat(value);
      if (isNaN(num)) return;
      const pos: [number, number, number] = [...camera.position];
      pos[axis] = num;
      const updated: Camera = { ...camera, position: pos };
      onChange([updated, ...cameras.slice(1)]);
    },
    [camera, cameras, onChange],
  );

  const handleTargetChange = useCallback(
    (axis: 0 | 1 | 2, value: string): void => {
      const num = parseFloat(value);
      if (isNaN(num)) return;
      const target: [number, number, number] = [...camera.target];
      target[axis] = num;
      const updated: Camera = { ...camera, target };
      onChange([updated, ...cameras.slice(1)]);
    },
    [camera, cameras, onChange],
  );

  const handleFovChange = useCallback(
    (value: string): void => {
      const fov = parseFloat(value);
      if (isNaN(fov)) return;
      const updated: Camera = { ...camera, fov };
      onChange([updated, ...cameras.slice(1)]);
    },
    [camera, cameras, onChange],
  );

  const handleReset = useCallback((): void => {
    onChange([{ ...DEFAULT_CAMERA }, ...cameras.slice(1)]);
  }, [cameras, onChange]);

  const labelStyle: React.CSSProperties = {
    fontSize: '0.7rem',
    fontWeight: 600,
    color: '#6b7280',
    display: 'block',
    marginBottom: '0.25rem',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.375rem 0.5rem',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    fontSize: '0.825rem',
    boxSizing: 'border-box',
    outline: 'none',
  };

  const renderVec3 = (
    label: string,
    values: [number, number, number],
    onChangeAxis: (axis: 0 | 1 | 2, value: string) => void,
  ): React.ReactElement => (
    <div style={{ marginBottom: '0.875rem' }}>
      <label style={{ ...labelStyle, marginBottom: '0.375rem' }}>{label}</label>
      <div style={{ display: 'flex', gap: '0.375rem' }}>
        {(['X', 'Y', 'Z'] as const).map((axis, index) => (
          <div key={axis} style={{ flex: 1 }}>
            <label style={{ fontSize: '0.65rem', color: '#9ca3af', display: 'block', marginBottom: '0.1rem' }}>
              {axis}
            </label>
            <input
              type="number"
              step="0.1"
              value={values[index] ?? 0}
              onChange={(e) => onChangeAxis(index as 0 | 1 | 2, e.target.value)}
              style={inputStyle}
            />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily: 'sans-serif' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
        }}
      >
        <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: '#1f2937' }}>
          Câmera Padrão
        </h3>
        <button
          onClick={handleReset}
          style={{
            background: 'transparent',
            color: '#6b7280',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            padding: '0.3rem 0.625rem',
            fontSize: '0.75rem',
            cursor: 'pointer',
          }}
        >
          Redefinir
        </button>
      </div>

      {renderVec3('Posição', camera.position, handlePositionChange)}
      {renderVec3('Alvo', camera.target, handleTargetChange)}

      {/* FOV slider */}
      <div>
        <label style={labelStyle}>
          Campo de Visão (FOV): {Math.round(camera.fov)}°
        </label>
        <input
          type="range"
          min={MIN_FOV}
          max={MAX_FOV}
          step="1"
          value={camera.fov}
          onChange={(e) => handleFovChange(e.target.value)}
          style={{ width: '100%', accentColor: '#4f46e5' }}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.65rem',
            color: '#9ca3af',
            marginTop: '0.125rem',
          }}
        >
          <span>{MIN_FOV}°</span>
          <span>{MAX_FOV}°</span>
        </div>
      </div>
    </div>
  );
}
