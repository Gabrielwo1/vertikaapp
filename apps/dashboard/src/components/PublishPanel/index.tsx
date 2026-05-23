import React, { useState, useRef, useEffect, useCallback } from 'react';
import QRCode from 'qrcode';
import { api } from '@/services/api';

interface PublishPanelProps {
  tourId: string;
  isPublished: boolean;
  viewerUrl: string;
}

const EMBED_WIDTH = '100%';
const EMBED_HEIGHT = '600';
const QR_CANVAS_SIZE = 200;
const COPY_FEEDBACK_MS = 2000;

export default function PublishPanel({
  tourId,
  isPublished: initialPublished,
  viewerUrl,
}: PublishPanelProps): React.ReactElement {
  const [isPublished, setIsPublished] = useState(initialPublished);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [embedCopied, setEmbedCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Generate QR code once published
  useEffect(() => {
    if (!isPublished) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    QRCode.toCanvas(canvas, viewerUrl, {
      width: QR_CANVAS_SIZE,
      margin: 1,
      color: {
        dark: '#1a1a2e',
        light: '#ffffff',
      },
    }).catch(console.error);
  }, [isPublished, viewerUrl]);

  const handlePublish = useCallback(async (): Promise<void> => {
    setIsPublishing(true);
    setPublishError(null);

    try {
      await api.tours.publish(tourId);
      setIsPublished(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao publicar tour';
      setPublishError(message);
    } finally {
      setIsPublishing(false);
    }
  }, [tourId]);

  const handleCopyLink = useCallback(async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(viewerUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), COPY_FEEDBACK_MS);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = viewerUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), COPY_FEEDBACK_MS);
    }
  }, [viewerUrl]);

  const embedCode = `<iframe src="${viewerUrl}" width="${EMBED_WIDTH}" height="${EMBED_HEIGHT}" frameborder="0" allowfullscreen></iframe>`;

  const handleCopyEmbed = useCallback(async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(embedCode);
      setEmbedCopied(true);
      setTimeout(() => setEmbedCopied(false), COPY_FEEDBACK_MS);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = embedCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setEmbedCopied(true);
      setTimeout(() => setEmbedCopied(false), COPY_FEEDBACK_MS);
    }
  }, [embedCode]);

  const buttonStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.625rem',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
    marginBottom: '0.5rem',
  };

  return (
    <div style={{ fontFamily: 'sans-serif' }}>
      <h3
        style={{
          margin: '0 0 1rem',
          fontSize: '0.875rem',
          fontWeight: 700,
          color: '#1f2937',
        }}
      >
        Publicação
      </h3>

      {!isPublished ? (
        <div>
          <p
            style={{
              fontSize: '0.8rem',
              color: '#6b7280',
              lineHeight: 1.5,
              marginBottom: '1rem',
            }}
          >
            Publique o tour para torná-lo acessível ao público e gerar o link de compartilhamento.
          </p>
          <button
            onClick={() => void handlePublish()}
            disabled={isPublishing}
            style={{
              ...buttonStyle,
              background: isPublishing ? '#9ca3af' : '#8b5cf6',
              color: '#ffffff',
              cursor: isPublishing ? 'not-allowed' : 'pointer',
            }}
          >
            {isPublishing ? 'Publicando...' : 'Publicar Tour'}
          </button>
          {publishError && (
            <p style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.375rem' }}>
              {publishError}
            </p>
          )}
        </div>
      ) : (
        <div>
          {/* Success indicator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1rem',
              padding: '0.625rem 0.75rem',
              background: '#d1fae5',
              borderRadius: '8px',
            }}
          >
            <span style={{ color: '#10b981', fontSize: '1rem' }}>✓</span>
            <span style={{ fontSize: '0.8rem', color: '#065f46', fontWeight: 600 }}>
              Tour publicado com sucesso!
            </span>
          </div>

          {/* Viewer URL */}
          <div style={{ marginBottom: '0.875rem' }}>
            <label
              style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                color: '#6b7280',
                display: 'block',
                marginBottom: '0.375rem',
              }}
            >
              Link do tour
            </label>
            <div
              style={{
                display: 'flex',
                gap: '0.375rem',
                alignItems: 'stretch',
              }}
            >
              <input
                type="text"
                value={viewerUrl}
                readOnly
                style={{
                  flex: 1,
                  padding: '0.5rem 0.625rem',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '0.75rem',
                  color: '#374151',
                  background: '#f9fafb',
                  outline: 'none',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              />
              <button
                onClick={() => void handleCopyLink()}
                style={{
                  background: linkCopied ? '#10b981' : '#4f46e5',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'background 0.2s',
                }}
              >
                {linkCopied ? 'Copiado!' : 'Copiar Link'}
              </button>
            </div>
          </div>

          {/* Embed code */}
          <div style={{ marginBottom: '1rem' }}>
            <button
              onClick={() => void handleCopyEmbed()}
              style={{
                ...buttonStyle,
                background: embedCopied ? '#10b981' : '#1a1a2e',
                color: '#ffffff',
                transition: 'background 0.2s',
              }}
            >
              {embedCopied ? '✓ Embed Copiado!' : 'Copiar Embed'}
            </button>
            <p style={{ fontSize: '0.7rem', color: '#9ca3af', margin: 0 }}>
              Insere o tour como &lt;iframe&gt; em qualquer página web
            </p>
          </div>

          {/* QR Code */}
          <div>
            <label
              style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                color: '#6b7280',
                display: 'block',
                marginBottom: '0.5rem',
              }}
            >
              QR Code
            </label>
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '1rem',
              }}
            >
              <canvas
                ref={canvasRef}
                width={QR_CANVAS_SIZE}
                height={QR_CANVAS_SIZE}
                aria-label={`QR Code para ${viewerUrl}`}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
