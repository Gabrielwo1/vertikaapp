import React, { useCallback } from 'react';
import type { Annotation } from '@virtualtour/shared';

interface AnnotationEditorProps {
  annotations: Annotation[];
  onChange: (annotations: Annotation[]) => void;
}

const DEFAULT_POSITION: [number, number, number] = [0, 0, 0];

let annotationIdCounter = 0;

function generateId(): string {
  annotationIdCounter += 1;
  return `annotation-${Date.now()}-${annotationIdCounter}`;
}

export default function AnnotationEditor({
  annotations,
  onChange,
}: AnnotationEditorProps): React.ReactElement {
  const handleAdd = useCallback((): void => {
    const newAnnotation: Annotation = {
      id: generateId(),
      label: 'Nova anotação',
      position: [...DEFAULT_POSITION],
      description: '',
    };
    onChange([...annotations, newAnnotation]);
  }, [annotations, onChange]);

  const handleDelete = useCallback(
    (id: string): void => {
      onChange(annotations.filter((a) => a.id !== id));
    },
    [annotations, onChange],
  );

  const handleChange = useCallback(
    (id: string, field: 'label' | 'description', value: string): void => {
      onChange(
        annotations.map((a) => (a.id === id ? { ...a, [field]: value } : a)),
      );
    },
    [annotations, onChange],
  );

  const handlePositionChange = useCallback(
    (id: string, axis: 0 | 1 | 2, value: string): void => {
      const num = parseFloat(value);
      if (isNaN(num)) return;
      onChange(
        annotations.map((a) => {
          if (a.id !== id) return a;
          const pos: [number, number, number] = [...a.position];
          pos[axis] = num;
          return { ...a, position: pos };
        }),
      );
    },
    [annotations, onChange],
  );

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
          Anotações
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
          + Adicionar Anotação
        </button>
      </div>

      {annotations.length === 0 ? (
        <p style={{ color: '#9ca3af', fontSize: '0.8rem', textAlign: 'center', padding: '1rem' }}>
          Nenhuma anotação adicionada.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {annotations.map((annotation) => (
            <div
              key={annotation.id}
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '0.75rem',
                background: '#f9fafb',
              }}
            >
              {/* Label */}
              <div style={{ marginBottom: '0.5rem' }}>
                <label
                  style={{ fontSize: '0.7rem', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: '0.2rem' }}
                >
                  Rótulo
                </label>
                <input
                  type="text"
                  value={annotation.label}
                  onChange={(e) => handleChange(annotation.id, 'label', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.375rem 0.5rem',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    fontSize: '0.875rem',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Description */}
              <div style={{ marginBottom: '0.5rem' }}>
                <label
                  style={{ fontSize: '0.7rem', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: '0.2rem' }}
                >
                  Descrição
                </label>
                <textarea
                  value={annotation.description ?? ''}
                  onChange={(e) => handleChange(annotation.id, 'description', e.target.value)}
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '0.375rem 0.5rem',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    fontSize: '0.875rem',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Position */}
              <div style={{ marginBottom: '0.5rem' }}>
                <label
                  style={{ fontSize: '0.7rem', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}
                >
                  Posição (x, y, z)
                </label>
                <div style={{ display: 'flex', gap: '0.375rem' }}>
                  {(['X', 'Y', 'Z'] as const).map((axis, index) => (
                    <div key={axis} style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.65rem', color: '#9ca3af', display: 'block', marginBottom: '0.125rem' }}>
                        {axis}
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={annotation.position[index] ?? 0}
                        onChange={(e) => handlePositionChange(annotation.id, index as 0 | 1 | 2, e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.3rem 0.4rem',
                          borderRadius: '5px',
                          border: '1px solid #d1d5db',
                          fontSize: '0.8rem',
                          boxSizing: 'border-box',
                          outline: 'none',
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Delete */}
              <button
                onClick={() => handleDelete(annotation.id)}
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
