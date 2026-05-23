import React, { useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import RoomList from '@/components/RoomList';
import type { Tour } from '@virtualtour/shared';
import { TourStatus, RoomStatus } from '@virtualtour/shared';
import { VIEWER_BASE_URL } from '@/constants';

const POLLING_INTERVAL_MS = 30_000;

const STATUS_LABELS: Record<TourStatus, string> = {
  [TourStatus.DRAFT]: 'Rascunho',
  [TourStatus.UPLOADING]: 'Enviando vídeos',
  [TourStatus.PROCESSING]: 'Processando tour',
  [TourStatus.READY]: 'Pronto para visualizar',
  [TourStatus.PUBLISHED]: 'Publicado',
  [TourStatus.ARCHIVED]: 'Arquivado',
};

const STATUS_DESCRIPTIONS: Record<TourStatus, string> = {
  [TourStatus.DRAFT]: 'Grave os cômodos para começar o processamento.',
  [TourStatus.UPLOADING]: 'Os vídeos estão sendo enviados ao servidor.',
  [TourStatus.PROCESSING]: 'Estamos gerando os modelos 3D. Isso pode levar alguns minutos.',
  [TourStatus.READY]: 'O tour está pronto! Publique para compartilhar.',
  [TourStatus.PUBLISHED]: 'O tour está acessível ao público.',
  [TourStatus.ARCHIVED]: 'Este tour foi arquivado.',
};

const STATUS_COLORS: Record<TourStatus, string> = {
  [TourStatus.DRAFT]: '#6b7280',
  [TourStatus.UPLOADING]: '#3b82f6',
  [TourStatus.PROCESSING]: '#f59e0b',
  [TourStatus.READY]: '#10b981',
  [TourStatus.PUBLISHED]: '#8b5cf6',
  [TourStatus.ARCHIVED]: '#9ca3af',
};

const PROCESSING_STATUSES: TourStatus[] = [TourStatus.UPLOADING, TourStatus.PROCESSING];

export default function TourDetail(): React.ReactElement {
  const { tourId } = useParams<{ tourId: string }>();
  const navigate = useNavigate();

  const isProcessing = useCallback(
    (tour: Tour | undefined): boolean => {
      if (!tour) return false;
      return PROCESSING_STATUSES.includes(tour.status);
    },
    [],
  );

  const { data: tour, refetch } = useQuery<Tour>({
    queryKey: ['tour', tourId],
    queryFn: () => {
      if (!tourId) throw new Error('tourId ausente');
      return api.tours.get(tourId);
    },
    enabled: !!tourId,
    refetchInterval: (query) => {
      if (isProcessing(query.state.data)) return POLLING_INTERVAL_MS;
      return false;
    },
  });

  const handleRecordRoom = useCallback(
    (roomId: string): void => {
      navigate(`/tours/${tourId}/rooms/${roomId}/capture`);
    },
    [navigate, tourId],
  );

  const allRoomsDone =
    tour &&
    tour.rooms.length > 0 &&
    tour.rooms.every((r) => r.status === RoomStatus.DONE);

  const viewerUrl = `${VIEWER_BASE_URL}/tour/${tourId}`;

  const handleShare = useCallback(async (): Promise<void> => {
    if (!tour) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: tour.address,
          url: viewerUrl,
        });
      } catch {
        // user cancelled or share not available
      }
    } else {
      await navigator.clipboard.writeText(viewerUrl);
      alert('Link copiado!');
    }
  }, [tour, viewerUrl]);

  const handlePublish = useCallback(async (): Promise<void> => {
    if (!tourId) return;
    try {
      await api.tours.publish(tourId);
      await refetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao publicar';
      alert(message);
    }
  }, [tourId, refetch]);

  if (!tour) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f3f4f6',
          fontFamily: 'sans-serif',
          color: '#6b7280',
        }}
      >
        Carregando tour...
      </div>
    );
  }

  const statusColor = STATUS_COLORS[tour.status];

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
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#ffffff',
            fontSize: '1.25rem',
            cursor: 'pointer',
            padding: '0.25rem',
            lineHeight: 1,
          }}
          aria-label="Voltar"
        >
          ←
        </button>
        <h1
          style={{
            margin: 0,
            fontSize: '1rem',
            fontWeight: 700,
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {tour.address}
        </h1>
      </header>

      <div style={{ padding: '1rem' }}>
        {/* Status banner */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '1rem',
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.5rem',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                padding: '0.2rem 0.75rem',
                borderRadius: '999px',
                fontSize: '0.8rem',
                fontWeight: 700,
                background: `${statusColor}20`,
                color: statusColor,
              }}
            >
              {STATUS_LABELS[tour.status]}
            </span>
            {isProcessing(tour) && (
              <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                Atualizando a cada 30s...
              </span>
            )}
          </div>
          <p
            style={{
              margin: 0,
              fontSize: '0.875rem',
              color: '#6b7280',
              lineHeight: 1.5,
            }}
          >
            {STATUS_DESCRIPTIONS[tour.status]}
          </p>
        </div>

        {/* Actions */}
        {allRoomsDone && (
          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              marginBottom: '1rem',
            }}
          >
            <a
              href={viewerUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                flex: 1,
                display: 'block',
                background: '#10b981',
                color: '#ffffff',
                borderRadius: '10px',
                padding: '0.75rem',
                textAlign: 'center',
                fontSize: '0.9rem',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Ver Tour
            </a>
            <button
              onClick={() => void handleShare()}
              style={{
                background: '#f3f4f6',
                color: '#374151',
                border: '1.5px solid #d1d5db',
                borderRadius: '10px',
                padding: '0.75rem 1rem',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Compartilhar
            </button>
            {tour.status === TourStatus.READY && (
              <button
                onClick={() => void handlePublish()}
                style={{
                  background: '#8b5cf6',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '0.75rem 1rem',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Publicar
              </button>
            )}
          </div>
        )}

        {/* Rooms */}
        <h2
          style={{
            fontSize: '1rem',
            fontWeight: 700,
            color: '#1f2937',
            margin: '0 0 0.75rem 0',
          }}
        >
          Cômodos
        </h2>
        <RoomList
          tourId={tour.id}
          rooms={tour.rooms}
          onRecordRoom={handleRecordRoom}
        />
      </div>
    </div>
  );
}
