import React, { useRef, useEffect } from 'react';

interface CameraViewProps {
  stream: MediaStream | null;
  isRecording: boolean;
}

export default function CameraView({ stream, isRecording }: CameraViewProps): React.ReactElement {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (stream) {
      video.srcObject = stream;
      void video.play().catch(() => {
        // Autoplay may be blocked; user interaction will trigger play
      });
    } else {
      video.srcObject = null;
    }
  }, [stream]);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: '#000000',
        overflow: 'hidden',
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
        aria-label="Câmera ao vivo"
      />

      {/* Recording indicator */}
      {isRecording && (
        <div
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            background: 'rgba(0,0,0,0.55)',
            borderRadius: '999px',
            padding: '0.25rem 0.625rem',
            zIndex: 5,
          }}
        >
          <RecordingDot />
          <span
            style={{
              color: '#ffffff',
              fontSize: '0.75rem',
              fontWeight: 600,
              fontFamily: 'sans-serif',
            }}
          >
            REC
          </span>
        </div>
      )}
    </div>
  );
}

function RecordingDot(): React.ReactElement {
  return (
    <>
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.2; }
        }
      `}</style>
      <div
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: '#ef4444',
          animation: 'blink 1s ease infinite',
        }}
      />
    </>
  );
}
