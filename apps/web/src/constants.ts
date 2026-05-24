export const API_BASE_URL = import.meta.env['VITE_API_URL'] ?? 'http://localhost:3001';
export const VIEWER_BASE_URL = import.meta.env['VITE_VIEWER_URL'] ?? 'http://localhost:5175';
export const VIEWER_ORIGIN = typeof window !== 'undefined' ? window.location.origin : '';
export const CHUNK_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_RECORDING_MINUTES = 5;
export const MAX_ROTATION_SPEED_DEG_PER_SEC = 30;
export const RECORDING_CHUNK_MS = 1000;
export const AUTOSAVE_DEBOUNCE_MS = 2000;
export const UPLOAD_RETRY_ATTEMPTS = 3;
export const GYRO_COMPLETE_DEGREES = 360;
export const VIBRATE_DURATION_MS = 200;
export const CAMERA_CONSTRAINTS: MediaStreamConstraints = {
  video: { facingMode: { exact: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
  audio: false,
};
