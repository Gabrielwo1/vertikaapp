export const API_BASE_URL = import.meta.env['VITE_API_URL'] ?? 'http://localhost:3001';
export const VIEWER_BASE_URL = import.meta.env['VITE_VIEWER_URL'] ?? 'http://localhost:5175';
export const VIEWER_ORIGIN = new URL(VIEWER_BASE_URL).origin;
export const AUTOSAVE_DEBOUNCE_MS = 2000;
