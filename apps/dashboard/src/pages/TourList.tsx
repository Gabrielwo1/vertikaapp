import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { VIEWER_BASE_URL } from '@/constants';
import type { Tour } from '@virtualtour/shared';
import { TourStatus, RoomStatus } from '@virtualtour/shared';

const STATUS_LABELS: Record<TourStatus, string> = {
  [TourStatus.DRAFT]: 'Rascunho',
  [TourStatus.UPLOADING]: 'Enviando',
  [TourStatus.PROCESSING]: 'Processando',
  [TourStatus.READY]: 'Pronto',
  [TourStatus.PUBLISHED]: 'Publicado',
  [TourStatus.ARCHIVED]: 'Arquivado',
};

const STATUS_COLORS: Record<TourStatus, string> = {
  [TourStatus.DRAFT]: '#6b7280',
  [TourStatus.UPLOADING]: '#3b82f6',
  [TourStatus.PROCESSING]: '#f59e0b',
  [TourStatus.READY]: '#10b981',
  [TourStatus.PUBLISHED]: '#8b5cf6',
  [TourStatus.ARCHIVED]: '#9ca3af',
};

const DEFAULT_ROOMS = ['Sala de Estar', 'Quarto Principal', 'Cozinha', 'Banheiro'];

interface NewTourModalProps {
  onClose: () => void;
  onCreated: (tour: Tour) => void;
}

function NewTourModal({ onClose, onCreated }: NewTourModalProps): React.ReactElement {
  const [address, setAddress] = useState('');
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: (address: string) =>
      api.tours.create({ address, rooms: DEFAULT_ROOMS }),
    onSuccess: (tour) => {
      onCreated(tour);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!address.trim()) return;
    createMutation.mutate(address.trim());
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '1rem',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '1.5rem',
          width: '100%',
          maxWidth: '400px',
        }}
      >
        <h2
          style={{
            margin: '0 0 1rem',
            fontSize: '1.1rem',
            fontWeight: 700,
            color: '#1f2937',
          }}
        >
          Novo Tour
        </h2>
        <form onSubmit={handleSubmit}>
          <label
            htmlFor="new-tour-address"
            style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: '#374151',
              marginBottom: '0.375rem',
            }}
          >
            Endereço *
          </label>
          <input
            id="new-tour-address"
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Rua das Flores, 123 – São Paulo"
            required
            autoFocus
            style={{
              width: '100%',
              padding: '0.625rem 0.75rem',
              borderRadius: '8px',
              border: '1.5px solid #d1d5db',
              fontSize: '0.95rem',
              marginBottom: '0.75rem',
              boxSizing: 'border-box',
              outline: 'none',
            }}
          />
          {error && (
            <p
              style={{
                color: '#b91c1c',
                fontSize: '0.8rem',
                marginBottom: '0.75rem',
              }}
            >
              {error}
            </p>
          )}
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                color: '#374151',
                border: '1.5px solid #d1d5db',
                borderRadius: '8px',
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || !address.trim()}
              style={{
                background:
                  createMutation.isPending || !address.trim() ? '#9ca3af' : '#4f46e5',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '0.5rem 1.25rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor:
                  createMutation.isPending || !address.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {createMutation.isPending ? 'Criando...' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface TourCardProps {
  tour: Tour;
  onEdit: () => void;
}

function TourCard({ tour, onEdit }: TourCardProps): React.ReactElement {
  const statusColor = STATUS_COLORS[tour.status];
  const statusLabel = STATUS_LABELS[tour.status];
  const viewerUrl = `${VIEWER_BASE_URL}/tour/${tour.id}`;

  // Find thumbnail from first DONE room
  const thumbRoom = tour.rooms.find((r) => r.status === RoomStatus.DONE && r.thumbPath);
  const thumbPath = thumbRoom?.thumbPath;

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 1px 6px rgba(0,0,0,0.09)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Thumbnail */}
      <div
        style={{
          height: '160px',
          background: thumbPath ? `url(${thumbPath}) center/cover` : '#e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {!thumbPath && (
          <span style={{ fontSize: '2.5rem' }}>🏠</span>
        )}
      </div>

      <div style={{ padding: '1rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '0.625rem',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '0.95rem',
              fontWeight: 600,
              color: '#1f2937',
              flex: 1,
              marginRight: '0.5rem',
            }}
          >
            {tour.address}
          </p>
          <span
            style={{
              display: 'inline-block',
              padding: '0.15rem 0.5rem',
              borderRadius: '999px',
              fontSize: '0.7rem',
              fontWeight: 600,
              background: `${statusColor}20`,
              color: statusColor,
              whiteSpace: 'nowrap',
            }}
          >
            {statusLabel}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={onEdit}
            style={{
              flex: 1,
              background: '#4f46e5',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '0.5rem 0.75rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Editar
          </button>
          {(tour.status === TourStatus.READY || tour.status === TourStatus.PUBLISHED) && (
            <a
              href={viewerUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                flex: 1,
                display: 'block',
                background: '#f3f4f6',
                color: '#374151',
                border: '1.5px solid #d1d5db',
                borderRadius: '8px',
                padding: '0.5rem 0.75rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                textDecoration: 'none',
                textAlign: 'center',
              }}
            >
              Ver Tour
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TourList(): React.ReactElement {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  const { data: tours, isLoading } = useQuery<Tour[]>({
    queryKey: ['tours'],
    queryFn: () => api.tours.list(),
  });

  const handleCreated = useCallback(
    (tour: Tour): void => {
      setShowModal(false);
      void queryClient.invalidateQueries({ queryKey: ['tours'] });
      navigate(`/tours/${tour.id}/edit`);
    },
    [queryClient, navigate],
  );

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
          padding: '1rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>
          VirtualTour Dashboard
        </h1>
        <button
          onClick={() => setShowModal(true)}
          style={{
            background: '#4f46e5',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            padding: '0.5rem 1rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Novo Tour
        </button>
      </header>

      <main style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
        {isLoading ? (
          <p style={{ color: '#6b7280', textAlign: 'center', padding: '3rem' }}>
            Carregando tours...
          </p>
        ) : !tours || tours.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '4rem 2rem',
              color: '#6b7280',
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏠</div>
            <p style={{ marginBottom: '1.5rem' }}>Nenhum tour criado ainda.</p>
            <button
              onClick={() => setShowModal(true)}
              style={{
                background: '#4f46e5',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '0.75rem 1.5rem',
                fontSize: '0.95rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Criar Primeiro Tour
            </button>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '1.25rem',
            }}
          >
            {tours.map((tour) => (
              <TourCard
                key={tour.id}
                tour={tour}
                onEdit={() => navigate(`/tours/${tour.id}/edit`)}
              />
            ))}
          </div>
        )}
      </main>

      {showModal && (
        <NewTourModal
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
