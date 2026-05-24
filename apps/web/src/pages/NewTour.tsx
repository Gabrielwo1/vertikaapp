import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import type { Tour } from '@virtualtour/shared';

const DEFAULT_ROOMS = ['Sala de Estar', 'Quarto Principal', 'Cozinha', 'Banheiro'];

function formatCurrencyInput(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  const value = parseInt(digits, 10) / 100;
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function parseCurrencyValue(formatted: string): number | undefined {
  const digits = formatted.replace(/\D/g, '');
  if (!digits) return undefined;
  return parseInt(digits, 10) / 100;
}

export default function NewTour(): React.ReactElement {
  const navigate = useNavigate();
  const [address, setAddress] = useState('');
  const [priceDisplay, setPriceDisplay] = useState('');
  const [rooms, setRooms] = useState<string[]>([...DEFAULT_ROOMS]);
  const [newRoomName, setNewRoomName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePriceChange = useCallback((e: React.ChangeEvent<HTMLInputElement>): void => {
    const formatted = formatCurrencyInput(e.target.value);
    setPriceDisplay(formatted);
  }, []);

  const addRoom = useCallback((): void => {
    const trimmed = newRoomName.trim();
    if (!trimmed) return;
    setRooms((prev) => [...prev, trimmed]);
    setNewRoomName('');
  }, [newRoomName]);

  const removeRoom = useCallback((index: number): void => {
    setRooms((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleRoomKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>): void => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addRoom();
      }
    },
    [addRoom],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent): Promise<void> => {
      e.preventDefault();
      if (!address.trim()) return;
      if (rooms.length === 0) {
        setError('Adicione pelo menos um cômodo.');
        return;
      }

      setIsSubmitting(true);
      setError(null);

      try {
        const price = parseCurrencyValue(priceDisplay);
        const tour: Tour = await api.tours.create({
          address: address.trim(),
          ...(price !== undefined ? { price } : {}),
          rooms,
        });
        navigate(`/tours/${tour.id}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao criar tour';
        setError(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [address, priceDisplay, rooms, navigate],
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
          padding: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}
      >
        <button
          onClick={() => navigate(-1)}
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
        <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>
          Novo Tour
        </h1>
      </header>

      <form onSubmit={handleSubmit} style={{ padding: '1rem' }}>
        {/* Address */}
        <div style={{ marginBottom: '1rem' }}>
          <label
            htmlFor="address"
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
            id="address"
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Ex: Rua das Flores, 123 – Jardins, São Paulo"
            required
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1.5px solid #d1d5db',
              fontSize: '1rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Price */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label
            htmlFor="price"
            style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: '#374151',
              marginBottom: '0.375rem',
            }}
          >
            Preço (opcional)
          </label>
          <input
            id="price"
            type="text"
            inputMode="numeric"
            value={priceDisplay}
            onChange={handlePriceChange}
            placeholder="R$ 0,00"
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1.5px solid #d1d5db',
              fontSize: '1rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Rooms */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label
            style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: '#374151',
              marginBottom: '0.5rem',
            }}
          >
            Cômodos
          </label>

          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 0.75rem 0' }}>
            {rooms.map((room, index) => (
              <li
                key={index}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#ffffff',
                  borderRadius: '8px',
                  padding: '0.625rem 0.875rem',
                  marginBottom: '0.5rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                }}
              >
                <span style={{ fontSize: '0.95rem', color: '#1f2937' }}>{room}</span>
                <button
                  type="button"
                  onClick={() => removeRoom(index)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#ef4444',
                    cursor: 'pointer',
                    fontSize: '1.1rem',
                    padding: '0.125rem 0.25rem',
                    lineHeight: 1,
                  }}
                  aria-label={`Remover ${room}`}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              onKeyDown={handleRoomKeyDown}
              placeholder="Nome do cômodo"
              style={{
                flex: 1,
                padding: '0.625rem 0.75rem',
                borderRadius: '8px',
                border: '1.5px solid #d1d5db',
                fontSize: '0.95rem',
                outline: 'none',
              }}
            />
            <button
              type="button"
              onClick={addRoom}
              style={{
                background: '#4f46e5',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '0.625rem 1rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Adicionar
            </button>
          </div>
        </div>

        {error && (
          <div
            style={{
              background: '#fee2e2',
              color: '#b91c1c',
              borderRadius: '8px',
              padding: '0.75rem',
              marginBottom: '1rem',
              fontSize: '0.875rem',
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || !address.trim()}
          style={{
            width: '100%',
            background: isSubmitting || !address.trim() ? '#9ca3af' : '#4f46e5',
            color: '#ffffff',
            border: 'none',
            borderRadius: '10px',
            padding: '0.875rem',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: isSubmitting || !address.trim() ? 'not-allowed' : 'pointer',
          }}
        >
          {isSubmitting ? 'Criando...' : 'Criar Tour'}
        </button>
      </form>
    </div>
  );
}
