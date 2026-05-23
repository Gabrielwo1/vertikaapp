import { useState, useRef, useCallback, useEffect } from 'react';
import { openDB, type IDBPDatabase } from 'idb';
import { API_BASE_URL, CHUNK_SIZE_BYTES, UPLOAD_RETRY_ATTEMPTS } from '@/constants';
import { getAuthToken } from '@/services/api';

const DB_NAME = 'virtualtour-uploads';
const DB_VERSION = 1;
const STORE_NAME = 'upload-progress';
const RETRY_BACKOFF_BASE_MS = 1000;

type UploadStatus = 'idle' | 'uploading' | 'complete' | 'error';

interface UploadState {
  uploadedChunks: number;
  totalChunks: number;
}

interface UseChunkedUploadArgs {
  tourId: string;
  roomId: string;
}

interface UseChunkedUploadReturn {
  upload: (blob: Blob) => Promise<void>;
  progress: number;
  status: UploadStatus;
  error: string | null;
  retry: () => void;
}

async function getDb(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    },
  });
}

async function saveProgress(key: string, state: UploadState): Promise<void> {
  const db = await getDb();
  await db.put(STORE_NAME, state, key);
}

async function loadProgress(key: string): Promise<UploadState | undefined> {
  const db = await getDb();
  return db.get(STORE_NAME, key) as Promise<UploadState | undefined>;
}

async function clearProgress(key: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_NAME, key);
}

async function uploadChunkWithRetry(
  url: string,
  chunk: Blob,
  chunkIndex: number,
  totalChunks: number,
  start: number,
  end: number,
  total: number,
  token: string | null,
): Promise<void> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < UPLOAD_RETRY_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      const backoff = RETRY_BACKOFF_BASE_MS * Math.pow(2, attempt - 1);
      await new Promise<void>((resolve) => setTimeout(resolve, backoff));
    }

    try {
      const headers: Record<string, string> = {
        'Content-Range': `bytes ${start}-${end - 1}/${total}`,
        'X-Chunk-Index': String(chunkIndex),
        'X-Total-Chunks': String(totalChunks),
        'Content-Type': 'application/octet-stream',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: chunk,
      });

      if (!response.ok) {
        let message = `HTTP ${response.status}`;
        try {
          const body = (await response.json()) as { message?: string };
          if (body.message) message = body.message;
        } catch {
          // ignore
        }
        throw new Error(message);
      }

      return; // success
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError ?? new Error('Upload falhou após todas as tentativas');
}

export function useChunkedUpload({
  tourId,
  roomId,
}: UseChunkedUploadArgs): UseChunkedUploadReturn {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const pendingBlobRef = useRef<Blob | null>(null);
  const progressKey = `${tourId}:${roomId}`;

  // Load any previously saved progress on mount
  useEffect(() => {
    loadProgress(progressKey).then((saved) => {
      if (saved && saved.totalChunks > 0) {
        const pct = Math.floor((saved.uploadedChunks / saved.totalChunks) * 100);
        setProgress(pct);
      }
    }).catch(console.error);
  }, [progressKey]);

  const upload = useCallback(
    async (blob: Blob): Promise<void> => {
      pendingBlobRef.current = blob;
      setStatus('uploading');
      setError(null);

      const token = getAuthToken();
      const url = `${API_BASE_URL}/api/tours/${tourId}/rooms/${roomId}/upload`;
      const total = blob.size;
      const totalChunks = Math.ceil(total / CHUNK_SIZE_BYTES);

      // Check for existing progress to resume
      let startChunk = 0;
      const saved = await loadProgress(progressKey);
      if (saved && saved.totalChunks === totalChunks) {
        startChunk = saved.uploadedChunks;
        const pct = Math.floor((startChunk / totalChunks) * 100);
        setProgress(pct);
      }

      try {
        for (let i = startChunk; i < totalChunks; i++) {
          const start = i * CHUNK_SIZE_BYTES;
          const end = Math.min(start + CHUNK_SIZE_BYTES, total);
          const chunk = blob.slice(start, end);

          await uploadChunkWithRetry(url, chunk, i, totalChunks, start, end, total, token);

          const uploaded = i + 1;
          await saveProgress(progressKey, {
            uploadedChunks: uploaded,
            totalChunks,
          });

          const pct = Math.floor((uploaded / totalChunks) * 100);
          setProgress(pct);
        }

        await clearProgress(progressKey);
        setStatus('complete');
        setProgress(100);
        pendingBlobRef.current = null;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro desconhecido';
        setError(message);
        setStatus('error');
      }
    },
    [tourId, roomId, progressKey],
  );

  const retry = useCallback((): void => {
    const blob = pendingBlobRef.current;
    if (!blob) return;
    void upload(blob);
  }, [upload]);

  return { upload, progress, status, error, retry };
}
