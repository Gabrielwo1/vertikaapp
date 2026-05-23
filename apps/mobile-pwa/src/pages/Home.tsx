import React, { useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { Tour } from '@virtualtour/shared';
import { TourStatus } from '@virtualtour/shared';

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

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatPrice(price: number | null): string {
  if (price === null) return '';
  return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function SkeletonCard(): React.ReactElement {
  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '1rem',
        marginBottom: '0.75rem',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
      }}
    >
      <div
        style={{
          height: '1.125rem',
          width: '70%',
          background: '#e5e7eb',
          borderRadius: '4px',
          marginBottom: '0.5rem',
          animation: 'pulse 1.5s infinite',
        }}
      />
      <div
        style={{
          height: '0.875rem',
          width: '40%',
          background: '#e5e7eb',
          borderRadius: '4px',
        }}
      />
    </div>
  );
}

interface TourCardProps {
  tour: Tour;
  onClick: () => void;
}

function TourCard({ tour, onClick }: TourCardProps): React.ReactElement {
  const statusColor = STATUS_COLORS[tour.status];
  const statusLabel = STATUS_LABELS[tour.status];
  const roomCount = tour.rooms.length;

  return (
    <button
      onClick={onClick}
      style={{
        display: 'block',
        width: '100%',
        background: '#ffffff',
        borderRadius: '12px',
        padding: '1rem',
        marginBottom: '0.75rem',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        border: 'none',
        textAlign: 'left',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '0.5rem',
        }}
      >
        <span
          style={{
            fontSize: '1rem',
            fontWeight: 600,
            color: '#1f2937',
            lineHeight: 1.3,
            flex: 1,
            marginRight: '0.75rem',
          }}
        >
          {tour.address}
        </span>
        <span
          style={{
            display: 'inline-block',
            padding: '0.2rem 0.6rem',
            borderRadius: '999px',
            fontSize: '0.75rem',
            fontWeight: 600,
            background: `${statusColor}20`,
            color: statusColor,
            whiteSpace: 'nowrap',
          }}
        >
          {statusLabel}
        </span>
      </div>
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          fontSize: '0.8rem',
          color: '#6b7280',
        }}
      >
        {tour.price !== null && (
          <span>{formatPrice(tour.price)}</span>
        )}
        <span>
          {roomCount} {roomCount === 1 ? 'cômodo' : 'cômodos'}
        </span>
        <span>{formatDate(tour.createdAt)}</span>
      </div>
    </button>
  );
}

export default function Home(): React.ReactElement {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: tours, isLoading, refetch } = useQuery<Tour[]>({
    queryKey: ['tours'],
    queryFn: () => api.tours.list(),
  });

  const handleScroll = useCallback((): void => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop === 0) {
      void refetch();
    }
  }, [refetch]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f3f4f6',
        fontFamily: 'sans-serif',
      }}
    >
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>

      {/* Header */}
      <header
        style={{
          background: '#1a1a2e',
          color: '#ffffff',
          padding: '1rem 1rem 0.875rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>
          Meus Tours
        </h1>
        <button
          onClick={() => navigate('/tours/new')}
          style={{
            background: '#4f46e5',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            padding: '0.5rem 0.875rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Novo Tour
        </button>
      </header>

      {/* Content */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          padding: '1rem',
          overflowY: 'auto',
          height: 'calc(100vh - 56px)',
        }}
      >
        {isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : !tours || tours.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '3rem 1rem',
              color: '#6b7280',
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏠</div>
            <p style={{ fontSize: '0.95rem', lineHeight: 1.6 }}>
              Nenhum tour criado ainda. Comece gravando um imóvel!
            </p>
            <button
              onClick={() => navigate('/tours/new')}
              style={{
                marginTop: '1.5rem',
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
          tours.map((tour) => (
            <TourCard
              key={tour.id}
              tour={tour}
              onClick={() => navigate(`/tours/${tour.id}`)}
            />
          ))
        )}
      </div>
    </div>
  );
}
