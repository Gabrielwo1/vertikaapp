import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CameraView from '@/components/CameraView';
import GyroGuide from '@/components/GyroGuide';
import { useCamera } from '@/hooks/useCamera';
import { useGyroscope } from '@/hooks/useGyroscope';
import { useMediaRecorder } from '@/hooks/useMediaRecorder';
import { VIBRATE_DURATION_MS } from '@/constants';

type CapturePhase = 'instruction' | 'recording' | 'done';

function getSpeedMessage(speed: 'slow' | 'perfect' | 'fast'): string {
  if (speed === 'perfect') return 'Perfeito! ✓';
  if (speed === 'fast') return 'Pode acelerar um pouco ⬆';
  return 'Mais devagar ⬇';
}

function getSpeedColor(speed: 'slow' | 'perfect' | 'fast'): string {
  if (speed === 'perfect') return '#10b981';
  if (speed === 'fast') return '#f59e0b';
  return '#3b82f6';
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function Capture(): React.ReactElement {
  const { tourId, roomId } = useParams<{ tourId: string; roomId: string }>();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<CapturePhase>('instruction');
  const [celebrationVisible, setCelebrationVisible] = useState(false);
  const celebrationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const { stream, error: cameraError, startCamera, stopCamera } = useCamera();
  const gyro = useGyroscope();

  const handleChunk = useCallback((blob: Blob): void => {
    chunksRef.current.push(blob);
  }, []);

  const recorder = useMediaRecorder({ stream, onChunk: handleChunk });

  // Start camera on mount
  useEffect(() => {
    void startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  // Request gyro permission on iOS
  useEffect(() => {
    if (gyro.permission === 'pending') {
      void gyro.requestPermission();
    }
  }, [gyro]);

  // Watch for gyro completion during recording
  useEffect(() => {
    if (gyro.isComplete && phase === 'recording') {
      if ('vibrate' in navigator) {
        navigator.vibrate(VIBRATE_DURATION_MS);
      }
      setCelebrationVisible(true);
      celebrationTimeoutRef.current = setTimeout(() => {
        setCelebrationVisible(false);
      }, 2000);
    }
  }, [gyro.isComplete, phase]);

  // Cleanup timeout
  useEffect(() => {
    return () => {
      if (celebrationTimeoutRef.current) {
        clearTimeout(celebrationTimeoutRef.current);
      }
    };
  }, []);

  const handleStartRecording = useCallback((): void => {
    gyro.reset();
    chunksRef.current = [];
    setPhase('recording');
    recorder.startRecording();
  }, [gyro, recorder]);

  const handleStopRecording = useCallback((): void => {
    recorder.stopRecording();
    setPhase('done');
  }, [recorder]);

  const handleSend = useCallback((): void => {
    if (!recorder.finalBlob || !tourId || !roomId) return;
    navigate(`/tours/${tourId}/upload`, {
      state: { blob: recorder.finalBlob, roomId, mimeType: recorder.mimeType },
    });
  }, [recorder.finalBlob, recorder.mimeType, tourId, roomId, navigate]);

  const handleRerecord = useCallback((): void => {
    recorder.reset();
    gyro.reset();
    chunksRef.current = [];
    setPhase('instruction');
  }, [recorder, gyro]);

  if (cameraError) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#000000',
          color: '#ffffff',
          padding: '2rem',
          fontFamily: 'sans-serif',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📷</div>
        <p style={{ marginBottom: '1.5rem', lineHeight: 1.5 }}>{cameraError}</p>
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
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: '#000000',
        fontFamily: 'sans-serif',
      }}
    >
      <style>{`
        @keyframes captureArrow {
          0% { transform: rotate(0deg) translateX(60px); }
          100% { transform: rotate(360deg) translateX(60px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes celebration {
          0% { transform: scale(0.8); opacity: 0; }
          50% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      {/* Camera feed */}
      <CameraView stream={stream} isRecording={phase === 'recording'} />

      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        style={{
          position: 'absolute',
          top: '1rem',
          left: '1rem',
          background: 'rgba(0,0,0,0.5)',
          border: 'none',
          borderRadius: '50%',
          width: '2.5rem',
          height: '2.5rem',
          color: '#ffffff',
          fontSize: '1.25rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 20,
        }}
        aria-label="Voltar"
      >
        ←
      </button>

      {/* INSTRUCTION PHASE */}
      {phase === 'instruction' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.65)',
            animation: 'fadeIn 0.4s ease',
            zIndex: 10,
          }}
        >
          {/* Rotating arrow animation */}
          <div
            style={{
              position: 'relative',
              width: '140px',
              height: '140px',
              marginBottom: '1.5rem',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                border: '3px dashed rgba(255,255,255,0.4)',
                borderRadius: '50%',
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'captureArrow 2s linear infinite',
                transformOrigin: 'center center',
              }}
            >
              <span style={{ fontSize: '1.5rem' }}>➡</span>
            </div>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
              }}
            >
              🏠
            </div>
          </div>

          <p
            style={{
              color: '#ffffff',
              fontSize: '1.25rem',
              fontWeight: 700,
              textAlign: 'center',
              margin: '0 2rem 0.5rem',
              lineHeight: 1.3,
            }}
          >
            Gire 360° em volta do cômodo
          </p>
          <p
            style={{
              color: 'rgba(255,255,255,0.7)',
              fontSize: '0.9rem',
              textAlign: 'center',
              margin: '0 2rem 2rem',
              lineHeight: 1.5,
            }}
          >
            Mantenha o ritmo constante para melhores resultados
          </p>

          <button
            onClick={handleStartRecording}
            style={{
              background: '#ef4444',
              color: '#ffffff',
              border: 'none',
              borderRadius: '999px',
              padding: '0.875rem 2.5rem',
              fontSize: '1rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(239,68,68,0.4)',
            }}
          >
            Iniciar Gravação
          </button>
        </div>
      )}

      {/* RECORDING PHASE */}
      {phase === 'recording' && (
        <>
          {/* Gyro guide overlay */}
          <div
            style={{
              position: 'absolute',
              top: '4rem',
              right: '1rem',
              zIndex: 10,
            }}
          >
            <GyroGuide
              progress={gyro.rotation}
              speed={gyro.speed}
              isComplete={gyro.isComplete}
            />
          </div>

          {/* Speed feedback */}
          <div
            style={{
              position: 'absolute',
              top: '1rem',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(0,0,0,0.6)',
              borderRadius: '999px',
              padding: '0.375rem 1rem',
              zIndex: 10,
            }}
          >
            <span
              style={{
                color: getSpeedColor(gyro.speed),
                fontSize: '0.875rem',
                fontWeight: 600,
              }}
            >
              {getSpeedMessage(gyro.speed)}
            </span>
          </div>

          {/* Duration timer */}
          <div
            style={{
              position: 'absolute',
              bottom: '8rem',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(0,0,0,0.6)',
              borderRadius: '8px',
              padding: '0.375rem 0.875rem',
              zIndex: 10,
            }}
          >
            <span
              style={{
                color: '#ffffff',
                fontSize: '1.25rem',
                fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {formatDuration(recorder.duration)}
            </span>
          </div>

          {/* Stop button */}
          <div
            style={{
              position: 'absolute',
              bottom: '2.5rem',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 10,
            }}
          >
            <button
              onClick={handleStopRecording}
              style={{
                background: '#ef4444',
                color: '#ffffff',
                border: '3px solid #ffffff',
                borderRadius: '999px',
                padding: '0.875rem 2.5rem',
                fontSize: '1rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Parar Gravação
            </button>
          </div>

          {/* 360° celebration */}
          {celebrationVisible && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
                zIndex: 15,
              }}
            >
              <div
                style={{
                  background: 'rgba(16,185,129,0.9)',
                  borderRadius: '16px',
                  padding: '1.5rem 2.5rem',
                  textAlign: 'center',
                  animation: 'celebration 0.4s ease',
                }}
              >
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎉</div>
                <p
                  style={{
                    color: '#ffffff',
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    margin: 0,
                  }}
                >
                  360° Completo!
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* DONE PHASE */}
      {phase === 'done' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-end',
            padding: '2rem',
            background: 'rgba(0,0,0,0.5)',
            zIndex: 10,
          }}
        >
          <div
            style={{
              background: 'rgba(255,255,255,0.95)',
              borderRadius: '16px',
              padding: '1.5rem',
              width: '100%',
              maxWidth: '360px',
            }}
          >
            <div
              style={{
                textAlign: 'center',
                marginBottom: '1.25rem',
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>✅</div>
              <p
                style={{
                  margin: 0,
                  fontSize: '1rem',
                  fontWeight: 600,
                  color: '#1f2937',
                }}
              >
                Gravação concluída!
              </p>
              <p
                style={{
                  margin: '0.375rem 0 0',
                  fontSize: '0.85rem',
                  color: '#6b7280',
                }}
              >
                {formatDuration(recorder.duration)} gravados •{' '}
                {Math.round(gyro.rotation)}° capturados
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              <button
                onClick={handleSend}
                disabled={!recorder.finalBlob}
                style={{
                  width: '100%',
                  background: !recorder.finalBlob ? '#9ca3af' : '#4f46e5',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '0.875rem',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: !recorder.finalBlob ? 'not-allowed' : 'pointer',
                }}
              >
                Enviar
              </button>
              <button
                onClick={handleRerecord}
                style={{
                  width: '100%',
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
                Regravar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
