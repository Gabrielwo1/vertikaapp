import { API_BASE_URL } from '@/constants';
import { getAuthToken } from '@/services/api';

const SW_PATH = '/sw.js';

export async function registerServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register(SW_PATH, {
      scope: '/',
    });

    registration.addEventListener('updatefound', () => {
      const installing = registration.installing;
      if (!installing) return;

      installing.addEventListener('statechange', () => {
        if (
          installing.state === 'installed' &&
          navigator.serviceWorker.controller
        ) {
          console.info('[SW] Nova versão disponível. Recarregue para atualizar.');
        }
      });
    });
  } catch (error) {
    console.error('[SW] Falha ao registrar service worker:', error);
  }
}

export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }

  if (Notification.permission !== 'default') {
    return Notification.permission;
  }

  return Notification.requestPermission();
}

export async function subscribeToPush(applicationServerKey: string): Promise<PushSubscription> {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service Worker não suportado neste navegador');
  }

  const registration = await navigator.serviceWorker.ready;

  const keyBytes = urlBase64ToUint8Array(applicationServerKey);
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: keyBytes.buffer.slice(
      keyBytes.byteOffset,
      keyBytes.byteOffset + keyBytes.byteLength,
    ) as ArrayBuffer,
  });

  return subscription;
}

export async function sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/api/push/subscribe`, {
    method: 'POST',
    headers,
    body: JSON.stringify(subscription.toJSON()),
  });

  if (!response.ok) {
    throw new Error(`Falha ao enviar subscription: HTTP ${response.status}`);
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}
