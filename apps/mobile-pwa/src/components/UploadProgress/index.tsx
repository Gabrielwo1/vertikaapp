import React from 'react';

interface UploadProgressProps {
  progress: number; // 0–100
  status: 'idle' | 'uploading' | 'complete' | 'error';
  roomName: string;
}

const STATUS_MESSAGES: Record<UploadProgressProps['status'], string> = {
  idle: 'Preparando envio...',
  uploading: 'Enviando gravação...',
  complete: 'Envio concluído!',
  error: 'Erro no envio',
};

const STATUS_COLORS: Record<UploadProgressProps['status'], string> = {
  idle: '#6b7280',
  uploading: '#4f46e5',
  complete: '#10b981',
  error: '#ef4444',
};

export default function UploadProgress({
  progress,
  status,
  roomName,
}: UploadProgressProps): React.ReactElement {
  const barColor = STATUS_COLORS[status];
  const message = STATUS_MESSAGES[status];
  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '400px',
        background: '#ffffff',
        borderRadius: '16px',
        padding: '2rem',
        boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
        fontFamily: 'sans-serif',
      }}
    >
      {/* Room name */}
      <p
        style={{
          margin: '0 0 0.25rem',
          fontSize: '0.8rem',
          color: '#6b7280',
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        Cômodo
      </p>
      <p
        style={{
          margin: '0 0 1.5rem',
          fontSize: '1.1rem',
          fontWeight: 700,
          color: '#1f2937',
        }}
      >
        {roomName}
      </p>

      {/* Status icon / checkmark */}
      {status === 'complete' ? (
        <div
          style={{
            textAlign: 'center',
            marginBottom: '1rem',
          }}
        >
          <style>{`
            @keyframes checkIn {
              0% { transform: scale(0); opacity: 0; }
              60% { transform: scale(1.2); opacity: 1; }
              100% { transform: scale(1); opacity: 1; }
            }
          `}</style>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#d1fae5',
              animation: 'checkIn 0.5s ease',
            }}
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        </div>
      ) : null}

      {/* Progress bar */}
      <div
        style={{
          background: '#e5e7eb',
          borderRadius: '999px',
          height: '10px',
          overflow: 'hidden',
          marginBottom: '0.625rem',
        }}
        role="progressbar"
        aria-valuenow={clampedProgress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progresso do envio"
      >
        <div
          style={{
            height: '100%',
            width: `${clampedProgress}%`,
            background: barColor,
            borderRadius: '999px',
            transition: 'width 0.4s ease, background-color 0.3s ease',
          }}
        />
      </div>

      {/* Percentage + message */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span
          style={{
            fontSize: '0.875rem',
            color: barColor,
            fontWeight: 600,
          }}
        >
          {message}
        </span>
        <span
          style={{
            fontSize: '0.875rem',
            color: '#374151',
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {clampedProgress}%
        </span>
      </div>
    </div>
  );
}
