/// <reference lib="webworker" />
/* eslint-disable no-restricted-globals */

// Cast self to ServiceWorkerGlobalScope for proper typing throughout.
// The webworker lib declares self as WorkerGlobalScope, but at runtime
// this script runs as a Service Worker.
const swSelf = self as unknown as ServiceWorkerGlobalScope;

// ---------------------------------------------------------------------------
// Named constants – no magic numbers
// ---------------------------------------------------------------------------
const API_CACHE_NAME = 'api-cache-v1';
const STATIC_CACHE_NAME = 'static-cache-v1';
const IMAGE_CACHE_NAME = 'image-cache-v1';
const UPLOAD_QUEUE_STORE = 'upload-queue';

const ONE_DAY_MS = 60 * 60 * 24 * 1000;
const ONE_MONTH_MS = ONE_DAY_MS * 30;
const NETWORK_TIMEOUT_MS = 10_000;
const MAX_API_ENTRIES = 50;
const MAX_IMAGE_ENTRIES = 100;
const MAX_STATIC_ENTRIES = 60;

// ---------------------------------------------------------------------------
// Install & activate
// ---------------------------------------------------------------------------
swSelf.addEventListener('install', () => {
  swSelf.skipWaiting();
});

swSelf.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(swSelf.clients.claim());
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function openCache(name: string): Promise<Cache> {
  return caches.open(name);
}

// ---------------------------------------------------------------------------
// NetworkFirst strategy
// ---------------------------------------------------------------------------
async function networkFirst(
  request: Request,
  cacheName: string,
  maxEntries: number,
  maxAgeMs: number,
): Promise<Response> {
  const cache = await openCache(cacheName);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), NETWORK_TIMEOUT_MS);

    const networkResponse = await fetch(request.clone(), { signal: controller.signal });
    clearTimeout(timeoutId);

    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
      const keys = await cache.keys();
      if (keys.length > maxEntries) {
        const toDelete = keys.slice(0, keys.length - maxEntries);
        await Promise.all(toDelete.map((k) => cache.delete(k)));
      }
    }

    return networkResponse;
  } catch {
    const cached = await cache.match(request);
    if (cached) {
      const dateHeader = cached.headers.get('date');
      if (dateHeader) {
        const age = Date.now() - new Date(dateHeader).getTime();
        if (age < maxAgeMs) return cached;
      } else {
        return cached;
      }
    }
    return new Response('Offline – conteúdo não disponível', { status: 503 });
  }
}

// ---------------------------------------------------------------------------
// CacheFirst strategy
// ---------------------------------------------------------------------------
async function cacheFirst(
  request: Request,
  cacheName: string,
  maxEntries: number,
  maxAgeMs: number,
): Promise<Response> {
  const cache = await openCache(cacheName);
  const cached = await cache.match(request);

  if (cached) {
    const dateHeader = cached.headers.get('date');
    const age = dateHeader ? Date.now() - new Date(dateHeader).getTime() : 0;
    if (age < maxAgeMs) return cached;
  }

  const networkResponse = await fetch(request.clone());
  if (networkResponse.ok) {
    await cache.put(request, networkResponse.clone());
    const keys = await cache.keys();
    if (keys.length > maxEntries) {
      const toDelete = keys.slice(0, keys.length - maxEntries);
      await Promise.all(toDelete.map((k) => cache.delete(k)));
    }
  }

  return networkResponse;
}

// ---------------------------------------------------------------------------
// StaleWhileRevalidate strategy
// ---------------------------------------------------------------------------
async function staleWhileRevalidate(
  request: Request,
  cacheName: string,
  maxEntries: number,
): Promise<Response> {
  const cache = await openCache(cacheName);
  const cached = await cache.match(request);

  const networkPromise = fetch(request.clone()).then(async (networkResponse) => {
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
      const keys = await cache.keys();
      if (keys.length > maxEntries) {
        const toDelete = keys.slice(0, keys.length - maxEntries);
        await Promise.all(toDelete.map((k) => cache.delete(k)));
      }
    }
    return networkResponse;
  });

  return cached ?? networkPromise;
}

// ---------------------------------------------------------------------------
// Fetch handler
// ---------------------------------------------------------------------------
swSelf.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      networkFirst(request, API_CACHE_NAME, MAX_API_ENTRIES, ONE_DAY_MS),
    );
    return;
  }

  if (request.destination === 'image') {
    event.respondWith(
      staleWhileRevalidate(request, IMAGE_CACHE_NAME, MAX_IMAGE_ENTRIES),
    );
    return;
  }

  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'font'
  ) {
    event.respondWith(
      cacheFirst(request, STATIC_CACHE_NAME, MAX_STATIC_ENTRIES, ONE_MONTH_MS),
    );
    return;
  }
});

// ---------------------------------------------------------------------------
// Background sync – replay queued uploads
// Background Sync API is not in the standard TypeScript lib yet;
// use a string event name and cast appropriately.
// ---------------------------------------------------------------------------
interface SyncEvent extends ExtendableEvent {
  readonly tag: string;
  readonly lastChance: boolean;
}

(swSelf as unknown as EventTarget).addEventListener(
  'sync',
  (rawEvent: Event) => {
    const event = rawEvent as SyncEvent;
    if (event.tag === UPLOAD_QUEUE_STORE) {
      event.waitUntil(replayUploadQueue());
    }
  },
);

async function replayUploadQueue(): Promise<void> {
  const cache = await openCache(UPLOAD_QUEUE_STORE);
  const queuedRequests = await cache.keys();

  for (const request of queuedRequests) {
    try {
      const response = await fetch(request.clone());
      if (response.ok) {
        await cache.delete(request);
      }
    } catch {
      // Will retry on next sync event
    }
  }
}

// ---------------------------------------------------------------------------
// Push notification handling
// ---------------------------------------------------------------------------
interface PushPayload {
  title?: string;
  body?: string;
  url?: string;
}

swSelf.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return;

  let payload: PushPayload = {};
  try {
    payload = event.data.json() as PushPayload;
  } catch {
    payload = { title: 'VirtualTour', body: event.data.text() };
  }

  const title = payload.title ?? 'VirtualTour';
  const options: NotificationOptions = {
    body: payload.body ?? '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: payload.url ?? '/' },
  };

  event.waitUntil(swSelf.registration.showNotification(title, options));
});

// ---------------------------------------------------------------------------
// Notification click
// ---------------------------------------------------------------------------
interface NotificationData {
  url?: string;
}

swSelf.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();

  const data = event.notification.data as NotificationData | undefined;
  const targetUrl = data?.url ?? '/';

  event.waitUntil(
    swSelf.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList: readonly WindowClient[]) => {
        for (const client of clientList) {
          if (client.url === targetUrl && 'focus' in client) {
            void client.focus();
            return;
          }
        }
        if (swSelf.clients.openWindow) {
          void swSelf.clients.openWindow(targetUrl);
        }
      }),
  );
});
