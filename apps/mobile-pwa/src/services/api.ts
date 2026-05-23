import { API_BASE_URL } from '@/constants';
import type { Tour, Room } from '@virtualtour/shared';

const TOKEN_STORAGE_KEY = 'vt_token';

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setAuthToken(token: string): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearAuthToken(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers);

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let message = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const body = (await response.json()) as { message?: string };
      if (body.message) {
        message = body.message;
      }
    } catch {
      // ignore json parse errors, use default message
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

interface AuthGoogleResponse {
  token: string;
  refreshToken: string;
}

interface MeResponse {
  id: string;
  name: string;
  email: string;
}

interface CreateTourData {
  address: string;
  price?: number;
  rooms: string[];
}

interface UpdateTourData {
  address?: string;
  price?: number;
  settingsJson?: Record<string, unknown>;
}

interface CreateRoomData {
  name: string;
  order: number;
}

interface JobStatusResponse {
  jobId: string;
  status: string;
  progress: number;
  result?: unknown;
  failReason?: string;
}

export const api = {
  auth: {
    googleLogin: (code: string, redirectUri: string): Promise<AuthGoogleResponse> =>
      apiFetch<AuthGoogleResponse>('/api/auth/google', {
        method: 'POST',
        body: JSON.stringify({ code, redirectUri }),
      }),

    getMe: (): Promise<MeResponse> => apiFetch<MeResponse>('/api/auth/me'),

    refresh: (token: string): Promise<AuthGoogleResponse> =>
      apiFetch<AuthGoogleResponse>('/api/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ token }),
      }),
  },

  tours: {
    list: (): Promise<Tour[]> => apiFetch<Tour[]>('/api/tours'),

    get: (id: string): Promise<Tour> => apiFetch<Tour>(`/api/tours/${id}`),

    create: (data: CreateTourData): Promise<Tour> =>
      apiFetch<Tour>('/api/tours', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (id: string, data: UpdateTourData): Promise<Tour> =>
      apiFetch<Tour>(`/api/tours/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    delete: (id: string): Promise<void> =>
      apiFetch<void>(`/api/tours/${id}`, { method: 'DELETE' }),

    publish: (id: string): Promise<{ viewerUrl: string }> =>
      apiFetch<{ viewerUrl: string }>(`/api/tours/${id}/publish`, { method: 'POST' }),
  },

  rooms: {
    list: (tourId: string): Promise<Room[]> =>
      apiFetch<Room[]>(`/api/tours/${tourId}/rooms`),

    create: (tourId: string, data: CreateRoomData): Promise<Room> =>
      apiFetch<Room>(`/api/tours/${tourId}/rooms`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    delete: (tourId: string, roomId: string): Promise<void> =>
      apiFetch<void>(`/api/tours/${tourId}/rooms/${roomId}`, { method: 'DELETE' }),
  },

  jobs: {
    get: (jobId: string): Promise<JobStatusResponse> =>
      apiFetch<JobStatusResponse>(`/api/jobs/${jobId}`),
  },
};
