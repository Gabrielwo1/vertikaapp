import React, { type RefObject } from 'react';
import { useViewer } from '@/hooks/useViewer';
import { VIEWER_BASE_URL, VIEWER_ORIGIN } from '@/constants';
import type { ExperienceSettings } from '@virtualtour/shared';

interface SplatPreviewProps {
  tourId: string;
  settings: ExperienceSettings | null;
  // React 18 createRef / useRef returns RefObject<T | null> but JSX ref prop expects LegacyRef
  iframeRef: RefObject<HTMLIFrameElement | null>;
}

export default function SplatPreview({
  tourId,
  settings,
  iframeRef,
}: SplatPreviewProps): React.ReactElement {
  const { isReady } = useViewer({ iframeRef, viewerOrigin: VIEWER_ORIGIN });

  const src = `${VIEWER_BASE_URL}/tour/${tourId}?preview=1`;

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
      }}
    >
      <iframe
        ref={iframeRef as React.Ref<HTMLIFrameElement>}
        src={src}
        title="Preview do tour"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block',
        }}
        allow="accelerometer; gyroscope; camera; fullscreen"
      />

      {/* Loading overlay */}
      {!isReady && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(26,26,46,0.85)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontFamily: 'sans-serif',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '3px solid rgba(255,255,255,0.2)',
              borderTopColor: '#4f46e5',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              marginBottom: '0.75rem',
            }}
          />
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
          <p
            style={{
              margin: 0,
              fontSize: '0.9rem',
              color: 'rgba(255,255,255,0.7)',
            }}
          >
            Carregando preview...
          </p>
        </div>
      )}

      {/* No settings hint */}
      {isReady && !settings && (
        <div
          style={{
            position: 'absolute',
            bottom: '1rem',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.7)',
            color: '#ffffff',
            borderRadius: '8px',
            padding: '0.5rem 1rem',
            fontSize: '0.8rem',
            fontFamily: 'sans-serif',
            pointerEvents: 'none',
          }}
        >
          Configure os detalhes no painel esquerdo
        </div>
      )}
    </div>
  );
}
