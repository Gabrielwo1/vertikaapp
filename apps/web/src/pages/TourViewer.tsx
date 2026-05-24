import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '@/services/api';
import type { Tour, ExperienceSettings } from '@virtualtour/shared';

const WHATSAPP_BASE = 'https://wa.me/';
const SCHEDULE_API = '/api/schedule';

interface ScheduleFormState {
  name: string;
  phone: string;
  submitting: boolean;
  feedback: string | null;
  feedbackIsError: boolean;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value);
}

function getPhone(settings: ExperienceSettings | null | undefined): string | null {
  if (!settings) return null;
  // Extended settings may carry a phone field
  const ext = settings as ExperienceSettings & { phone?: string };
  return ext.phone ?? null;
}

export default function TourViewer(): React.ReactElement {
  const { tourId } = useParams<{ tourId: string }>();
  const [tour, setTour] = useState<Tour | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSchedule, setShowSchedule] = useState(false);
  const [form, setForm] = useState<ScheduleFormState>({
    name: '',
    phone: '',
    submitting: false,
    feedback: null,
    feedbackIsError: false,
  });

  // Live settings from postMessage (editor preview mode)
  const [liveSettings, setLiveSettings] = useState<ExperienceSettings | null>(null);

  // Load tour data
  useEffect(() => {
    if (!tourId) return;
    setLoading(true);
    api.tours
      .get(tourId)
      .then((t) => {
        setTour(t);
      })
      .catch((err: unknown) => {
        console.error('[TourViewer] Failed to load tour:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [tourId]);

  // Listen for UPDATE_SETTINGS message from parent (editor preview)
  useEffect(() => {
    const handleMessage = (event: MessageEvent): void => {
      const data = event.data as unknown;
      if (!data || typeof data !== 'object') return;
      const msg = data as Record<string, unknown>;
      if (msg['type'] === 'UPDATE_SETTINGS' && msg['settings']) {
        setLiveSettings(msg['settings'] as ExperienceSettings);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Send VIEWER_READY to parent on mount
  useEffect(() => {
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'VIEWER_READY' }, '*');
    }
  }, []);

  const effectiveSettings = liveSettings ?? tour?.settingsJson ?? null;
  const phone = getPhone(effectiveSettings);
  const address = tour?.address ?? '';
  const price = tour?.price ?? null;

  const handleScheduleSubmit = useCallback(
    async (e: React.FormEvent): Promise<void> => {
      e.preventDefault();
      setForm((prev) => ({ ...prev, submitting: true, feedback: null }));

      try {
        const response = await fetch(SCHEDULE_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tourId, name: form.name, phone: form.phone }),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        setForm((prev) => ({
          ...prev,
          submitting: false,
          feedback: 'Agendamento confirmado!',
          feedbackIsError: false,
          name: '',
          phone: '',
        }));
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Erro ao agendar. Tente novamente.';
        setForm((prev) => ({
          ...prev,
          submitting: false,
          feedback: message,
          feedbackIsError: true,
        }));
      }
    },
    [tourId, form.name, form.phone],
  );

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: '#1a1a2e',
        fontFamily: 'sans-serif',
      }}
    >
      {/* 3D viewer placeholder canvas area */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgba(255,255,255,0.3)',
        }}
      >
        {loading ? (
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                border: '3px solid rgba(255,255,255,0.1)',
                borderTopColor: '#7c6af7',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 1rem',
              }}
            />
            <p style={{ fontSize: '0.9rem' }}>Carregando tour...</p>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🏠</div>
            <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem' }}>
              Tour 3D carregando...
            </p>
            {address && (
              <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.3)' }}>
                {address}
              </p>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Property info panel — right side */}
      {!loading && tour && (
        <aside
          style={{
            position: 'absolute',
            top: '50%',
            right: '16px',
            transform: 'translateY(-50%)',
            width: '280px',
            background: 'rgba(18, 18, 28, 0.92)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            color: '#f0f0f0',
            fontSize: '14px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            zIndex: 100,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <header
            style={{
              padding: '16px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <span
              style={{
                fontSize: '13px',
                fontWeight: 700,
                letterSpacing: '0.04em',
                color: '#7c6af7',
                textTransform: 'uppercase',
              }}
            >
              VirtualTour
            </span>
          </header>

          {/* Body */}
          <div
            style={{
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {price !== null && (
              <div>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', margin: '0 0 2px' }}>
                  Valor
                </p>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#f0f0f0', margin: 0 }}>
                  {formatCurrency(price)}
                </p>
              </div>
            )}

            {address && (
              <div>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', margin: '0 0 2px' }}>
                  Endereço
                </p>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#f0f0f0', margin: 0 }}>
                  {address}
                </p>
              </div>
            )}

            {/* CTA: WhatsApp */}
            {phone && (
              <a
                href={`${WHATSAPP_BASE}${phone}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '10px 16px',
                  background: '#25d366',
                  color: '#ffffff',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  textAlign: 'center',
                  textDecoration: 'none',
                  boxSizing: 'border-box',
                }}
              >
                Falar com Corretor
              </a>
            )}

            {/* CTA: Schedule visit */}
            <div>
              <button
                onClick={() => setShowSchedule((prev) => !prev)}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  border: 'none',
                  borderRadius: '8px',
                  background: showSchedule ? '#4b3fb0' : '#7c6af7',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {showSchedule ? 'Cancelar' : 'Agendar Visita'}
              </button>

              {showSchedule && (
                <form
                  onSubmit={handleScheduleSubmit}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    marginTop: '8px',
                  }}
                >
                  <input
                    type="text"
                    placeholder="Nome completo"
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    required
                    style={{
                      padding: '9px 12px',
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '8px',
                      color: '#f0f0f0',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                  <input
                    type="tel"
                    placeholder="Telefone (ex: 11999999999)"
                    value={form.phone}
                    onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                    required
                    style={{
                      padding: '9px 12px',
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '8px',
                      color: '#f0f0f0',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="submit"
                    disabled={form.submitting}
                    style={{
                      padding: '10px 16px',
                      border: 'none',
                      borderRadius: '8px',
                      background: form.submitting ? '#555' : '#7c6af7',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: form.submitting ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {form.submitting ? 'Enviando...' : 'Confirmar Agendamento'}
                  </button>

                  {form.feedback && (
                    <p
                      style={{
                        fontSize: '12px',
                        color: form.feedbackIsError ? '#f87171' : '#25d366',
                        margin: 0,
                      }}
                    >
                      {form.feedback}
                    </p>
                  )}
                </form>
              )}
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
