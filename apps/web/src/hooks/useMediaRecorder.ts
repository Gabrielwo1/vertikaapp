import { useState, useRef, useCallback, useEffect } from 'react';
import { RECORDING_CHUNK_MS, MAX_RECORDING_MINUTES } from '@/constants';

const PREFERRED_MIME_TYPE = 'video/webm;codecs=vp9';
const FALLBACK_MIME_TYPE = 'video/mp4';
const MAX_RECORDING_SECONDS = MAX_RECORDING_MINUTES * 60;

function getSupportedMimeType(): string {
  if (MediaRecorder.isTypeSupported(PREFERRED_MIME_TYPE)) {
    return PREFERRED_MIME_TYPE;
  }
  if (MediaRecorder.isTypeSupported('video/webm')) {
    return 'video/webm';
  }
  return FALLBACK_MIME_TYPE;
}

interface UseMediaRecorderArgs {
  stream: MediaStream | null;
  onChunk: (blob: Blob) => void;
}

interface UseMediaRecorderReturn {
  isRecording: boolean;
  duration: number;
  finalBlob: Blob | null;
  startRecording: () => void;
  stopRecording: () => void;
  reset: () => void;
  mimeType: string;
}

export function useMediaRecorder({
  stream,
  onChunk,
}: UseMediaRecorderArgs): UseMediaRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [finalBlob, setFinalBlob] = useState<Blob | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mimeTypeRef = useRef<string>(getSupportedMimeType());

  const clearTimers = useCallback((): void => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (autoStopRef.current) {
      clearTimeout(autoStopRef.current);
      autoStopRef.current = null;
    }
  }, []);

  const stopRecording = useCallback((): void => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    clearTimers();
    setIsRecording(false);
  }, [clearTimers]);

  const startRecording = useCallback((): void => {
    if (!stream) return;
    if (isRecording) return;

    chunksRef.current = [];
    setFinalBlob(null);
    setDuration(0);

    const mimeType = mimeTypeRef.current;
    const recorder = new MediaRecorder(stream, { mimeType });
    recorderRef.current = recorder;

    recorder.ondataavailable = (event: BlobEvent): void => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
        onChunk(event.data);
      }
    };

    recorder.onstop = (): void => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      setFinalBlob(blob);
      chunksRef.current = [];
    };

    recorder.onerror = (event): void => {
      console.error('[MediaRecorder] Erro:', event);
      clearTimers();
      setIsRecording(false);
    };

    recorder.start(RECORDING_CHUNK_MS);
    setIsRecording(true);

    // Duration counter
    timerRef.current = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);

    // Auto-stop after max recording time
    autoStopRef.current = setTimeout(() => {
      stopRecording();
    }, MAX_RECORDING_SECONDS * 1000);
  }, [stream, isRecording, onChunk, clearTimers, stopRecording]);

  const reset = useCallback((): void => {
    stopRecording();
    chunksRef.current = [];
    setFinalBlob(null);
    setDuration(0);
    setIsRecording(false);
  }, [stopRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimers();
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop();
      }
    };
  }, [clearTimers]);

  return {
    isRecording,
    duration,
    finalBlob,
    startRecording,
    stopRecording,
    reset,
    mimeType: mimeTypeRef.current,
  };
}
