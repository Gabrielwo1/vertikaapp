import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import UploadProgress from '@/components/UploadProgress';
import { useChunkedUpload } from '@/hooks/useChunkedUpload';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { Tour } from '@virtualtour/shared';

interface UploadLocationState {
  blob: Blob;
  roomId: string;
  mimeType: string;
}

function isUploadState(state: unknown): state is UploadLocationState {
  if (!state || typeof state !== 'object') return false;
  const s = state as Record<string, unknown>;
  return s['blob'] instanceof Blob && typeof s['roomId'] === 'string';
}

export default function Upload(): React.ReactElement {
  const { tourId, roomId: routeRoomId } = useParams<{ tourId: string; roomId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const locationState = isUploadState(location.state) ? location.state : null;
  // Prefer roomId from location state; fall back to URL param
  const roomId = locationState?.roomId ?? routeRoomId ?? '';

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const { upload, progress, status, error, retry } = useChunkedUpload({
    tourId: tourId ?? '',
    roomId,
  });

  // Get room name for display
  const { data: tour } = useQuery<Tour>({
    queryKey: ['tour', tourId],
    queryFn: () => {
      if (!tourId) throw new Error('tourId ausente');
      return api.tours.get(tourId);
    },
    enabled: !!tourId,
  });

  const room = tour?.rooms.find((r) => r.id === roomId);
  const roomName = room?.name ?? 'Cômodo';

  // Auto-start upload on mount
  useEffect(() => {
    if (locationState?.blob && status === 'idle') {
      void upload(locationState.blob);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Navigate back on complete
  useEffect(() => {
    if (status === 'complete') {
      const timer = setTimeout(() => {
        navigate(`/tours/${tourId}`, { replace: true });
      }, 2000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [status, tourId, navigate]);

  const handleCancel = useCallback((): void => {
    setCancelDialogOpen(true);
  }, []);

  const confirmCancel = useCallback((): void => {
    navigate(`/tours/${tourId}`, { replace: true });
  }, [navigate, tourId]);

  if (!locationState) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f3f4f6',
          fontFamily: 'sans-serif',
          padding: '2rem',
          textAlign: 'center',
        }}
      >
        <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
          Nenhum arquivo para enviar.
        </p>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: '#4f46e5',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            cursor: 'pointer',
          }}
        >
          Voltar
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f3f4f6',
        fontFamily: 'sans-serif',
      }}
    >
      {/* Header */}
      <header
        style={{
          background: '#1a1a2e',
          color: '#ffffff',
          padding: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>
          Enviando Gravação
        </h1>
      </header>

      <div
        style={{
          padding: '2rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <UploadProgress progress={progress} status={status} roomName={roomName} />

        {status === 'error' && (
          <div style={{ width: '100%', maxWidth: '400px', marginTop: '1.5rem' }}>
            <div
              style={{
                background: '#fee2e2',
                color: '#b91c1c',
                borderRadius: '8px',
                padding: '0.875rem',
                marginBottom: '1rem',
                fontSize: '0.875rem',
                lineHeight: 1.5,
              }}
            >
              {error}
            </div>
            <button
              onClick={retry}
              style={{
                width: '100%',
                background: '#4f46e5',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '0.875rem',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Tentar Novamente
            </button>
          </div>
        )}

        {status !== 'complete' && status !== 'error' && (
          <button
            onClick={handleCancel}
            style={{
              marginTop: '2rem',
              background: 'transparent',
              color: '#6b7280',
              border: '1.5px solid #d1d5db',
              borderRadius: '8px',
              padding: '0.625rem 1.5rem',
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
        )}
      </div>

      {/* Cancel confirmation dialog */}
      {cancelDialogOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            zIndex: 100,
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px 16px 0 0',
              padding: '1.5rem',
              width: '100%',
              maxWidth: '480px',
            }}
          >
            <h2
              style={{
                margin: '0 0 0.5rem',
                fontSize: '1.1rem',
                fontWeight: 700,
                color: '#1f2937',
              }}
            >
              Cancelar envio?
            </h2>
            <p
              style={{
                margin: '0 0 1.5rem',
                fontSize: '0.9rem',
                color: '#6b7280',
                lineHeight: 1.5,
              }}
            >
              O progresso atual será perdido. Você precisará regravar e enviar novamente.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              <button
                onClick={confirmCancel}
                style={{
                  background: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '0.875rem',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Sim, cancelar
              </button>
              <button
                onClick={() => setCancelDialogOpen(false)}
                style={{
                  background: 'transparent',
                  color: '#374151',
                  border: '1.5px solid #d1d5db',
                  borderRadius: '10px',
                  padding: '0.875rem',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Continuar enviando
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
