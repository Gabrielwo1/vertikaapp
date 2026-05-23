import React, { useRef, useState, useCallback } from 'react';
import { apiFetch } from '@/services/api';

interface AudioUploadProps {
  soundUrl: string | undefined;
  onChange: (url: string | undefined) => void;
}

const ACCEPTED_AUDIO_TYPES = 'audio/mpeg,audio/mp3,.mp3';

interface UploadResponse {
  url: string;
  filename: string;
}

function extractFilename(url: string): string {
  try {
    const parts = url.split('/');
    return parts[parts.length - 1] ?? url;
  } catch {
    return url;
  }
}

export default function AudioUpload({ soundUrl, onChange }: AudioUploadProps): React.ReactElement {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsUploading(true);
      setError(null);

      try {
        const formData = new FormData();
        formData.append('audio', file);

        const result = await apiFetch<UploadResponse>('/api/audio/upload', {
          method: 'POST',
          body: formData,
        });

        onChange(result.url);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao enviar áudio';
        setError(message);
      } finally {
        setIsUploading(false);
        // Reset file input
        if (inputRef.current) {
          inputRef.current.value = '';
        }
      }
    },
    [onChange],
  );

  const handleRemove = useCallback((): void => {
    onChange(undefined);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, [onChange]);

  return (
    <div style={{ fontFamily: 'sans-serif' }}>
      <h4
        style={{
          margin: '0 0 0.75rem',
          fontSize: '0.875rem',
          fontWeight: 700,
          color: '#1f2937',
        }}
      >
        Áudio de Fundo
      </h4>

      {soundUrl ? (
        <div
          style={{
            background: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: '1.25rem' }}>🎵</span>
            <span
              style={{
                fontSize: '0.8rem',
                color: '#374151',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {extractFilename(soundUrl)}
            </span>
          </div>
          <button
            onClick={handleRemove}
            style={{
              background: 'transparent',
              color: '#ef4444',
              border: '1px solid #fee2e2',
              borderRadius: '6px',
              padding: '0.25rem 0.5rem',
              fontSize: '0.75rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            Remover
          </button>
        </div>
      ) : (
        <div>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_AUDIO_TYPES}
            onChange={(e) => void handleFileChange(e)}
            style={{ display: 'none' }}
            id="audio-upload-input"
          />
          <label
            htmlFor="audio-upload-input"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px dashed #d1d5db',
              borderRadius: '8px',
              padding: '1.5rem',
              cursor: isUploading ? 'not-allowed' : 'pointer',
              background: isUploading ? '#f3f4f6' : '#ffffff',
              textAlign: 'center',
            }}
          >
            <span style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
              {isUploading ? '⏳' : '🎵'}
            </span>
            <span
              style={{
                fontSize: '0.8rem',
                color: isUploading ? '#6b7280' : '#4f46e5',
                fontWeight: 600,
              }}
            >
              {isUploading ? 'Enviando...' : 'Selecionar arquivo MP3'}
            </span>
            <span style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: '0.25rem' }}>
              Somente arquivos .mp3
            </span>
          </label>
        </div>
      )}

      {error && (
        <p
          style={{
            marginTop: '0.5rem',
            fontSize: '0.75rem',
            color: '#ef4444',
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
