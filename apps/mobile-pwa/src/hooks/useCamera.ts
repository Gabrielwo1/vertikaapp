import { useState, useEffect, useRef, useCallback } from 'react';
import { CAMERA_CONSTRAINTS } from '@/constants';

interface UseCameraReturn {
  stream: MediaStream | null;
  error: string | null;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  isActive: boolean;
}

export function useCamera(): UseCameraReturn {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback((): void => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setStream(null);
    setIsActive(false);
  }, []);

  const startCamera = useCallback(async (): Promise<void> => {
    setError(null);

    // Stop any existing stream first
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia(CAMERA_CONSTRAINTS);
      streamRef.current = mediaStream;
      setStream(mediaStream);
      setIsActive(true);
    } catch (primaryError) {
      // Fallback: try with ideal instead of exact facingMode
      try {
        const fallbackConstraints: MediaStreamConstraints = {
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 30 },
          },
          audio: false,
        };
        const mediaStream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
        streamRef.current = mediaStream;
        setStream(mediaStream);
        setIsActive(true);
      } catch (fallbackError) {
        const message =
          fallbackError instanceof Error
            ? fallbackError.message
            : 'Não foi possível acessar a câmera';
        setError(`Erro ao acessar câmera: ${message}`);
        console.error('[Camera] Primary error:', primaryError);
        console.error('[Camera] Fallback error:', fallbackError);
      }
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  return { stream, error, startCamera, stopCamera, isActive };
}
