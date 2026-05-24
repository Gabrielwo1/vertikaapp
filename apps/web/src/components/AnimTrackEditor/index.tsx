import React, { useCallback } from 'react';
import type { AnimTrack } from '@virtualtour/shared';

interface AnimTrackEditorProps {
  animTracks: AnimTrack[];
  onChange: (tracks: AnimTrack[]) => void;
}

let trackIdCounter = 0;

function generateTrackId(): string {
  trackIdCounter += 1;
  return `track-${Date.now()}-${trackIdCounter}`;
}

const DEFAULT_TRACK: Omit<AnimTrack, 'id'> = {
  name: 'Nova Trilha',
  duration: 5,
  keyframes: [],
  positions: [],
  targets: [],
  loop: false,
  autoPlay: false,
};

export default function AnimTrackEditor({
  animTracks,
  onChange,
}: AnimTrackEditorProps): React.ReactElement {
  const handleAdd = useCallback((): void => {
    const newTrack: AnimTrack = {
      ...DEFAULT_TRACK,
      id: generateTrackId(),
    };
    onChange([...animTracks, newTrack]);
  }, [animTracks, onChange]);

  const handleDelete = useCallback(
    (id: string): void => {
      onChange(animTracks.filter((t) => t.id !== id));
    },
    [animTracks, onChange],
  );

  const handleFieldChange = useCallback(
    (id: string, field: 'name', value: string): void => {
      onChange(animTracks.map((t) => (t.id === id ? { ...t, [field]: value } : t)));
    },
    [animTracks, onChange],
  );

  const handleDurationChange = useCallback(
    (id: string, value: string): void => {
      const num = parseFloat(value);
      if (isNaN(num) || num <= 0) return;
      onChange(animTracks.map((t) => (t.id === id ? { ...t, duration: num } : t)));
    },
    [animTracks, onChange],
  );

  const handleBoolChange = useCallback(
    (id: string, field: 'loop' | 'autoPlay', value: boolean): void => {
      onChange(animTracks.map((t) => (t.id === id ? { ...t, [field]: value } : t)));
    },
    [animTracks, onChange],
  );

  const labelStyle: React.CSSProperties = {
    fontSize: '0.7rem',
    fontWeight: 600,
    color: '#6b7280',
    display: 'block',
    marginBottom: '0.2rem',
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

  return (
    <div style={{ fontFamily: 'sans-serif' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.75rem',
        }}
      >
        <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: '#1f2937' }}>
          Trilhas de Animação
        </h3>
        <button
          onClick={handleAdd}
          style={{
            background: '#4f46e5',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            padding: '0.375rem 0.75rem',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          + Adicionar Trilha
        </button>
      </div>

      {animTracks.length === 0 ? (
        <p style={{ color: '#9ca3af', fontSize: '0.8rem', textAlign: 'center', padding: '1rem' }}>
          Nenhuma trilha adicionada.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {animTracks.map((track) => (
            <div
              key={track.id}
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '0.75rem',
                background: '#f9fafb',
              }}
            >
              {/* Name */}
              <div style={{ marginBottom: '0.5rem' }}>
                <label style={labelStyle}>Nome</label>
                <input
                  type="text"
                  value={track.name}
                  onChange={(e) => handleFieldChange(track.id, 'name', e.target.value)}
                  style={inputStyle}
                />
              </div>

              {/* Duration */}
              <div style={{ marginBottom: '0.5rem' }}>
                <label style={labelStyle}>Duração (segundos)</label>
                <input
                  type="number"
                  min="0.1"
                  step="0.5"
                  value={track.duration}
                  onChange={(e) => handleDurationChange(track.id, e.target.value)}
                  style={inputStyle}
                />
              </div>

              {/* Toggles */}
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.625rem' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    fontSize: '0.8rem',
                    color: '#374151',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={track.loop}
                    onChange={(e) => handleBoolChange(track.id, 'loop', e.target.checked)}
                    style={{ accentColor: '#4f46e5' }}
                  />
                  Loop
                </label>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    fontSize: '0.8rem',
                    color: '#374151',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={track.autoPlay}
                    onChange={(e) => handleBoolChange(track.id, 'autoPlay', e.target.checked)}
                    style={{ accentColor: '#4f46e5' }}
                  />
                  Reprodução automática
                </label>
              </div>

              {/* Delete */}
              <button
                onClick={() => handleDelete(track.id)}
                style={{
                  background: 'transparent',
                  color: '#ef4444',
                  border: '1px solid #fee2e2',
                  borderRadius: '6px',
                  padding: '0.25rem 0.625rem',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  width: '100%',
                }}
              >
                Remover
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
