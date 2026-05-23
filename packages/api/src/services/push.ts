import webPush from "web-push";

/**
 * Web Push subscription object as returned by the browser Push API.
 */
export interface PushSubscriptionData {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

/**
 * In-memory store mapping imobiliariaId → list of push subscriptions.
 * NOTE: This is suitable for development. Production should use a persistent
 * database table (e.g. a PushSubscription Prisma model).
 */
const subscriptionStore = new Map<string, PushSubscriptionData[]>();

let vapidConfigured = false;

/**
 * Lazily configures web-push VAPID keys from environment variables.
 * Called before any push operation.
 */
function ensureVapidConfigured(): void {
  if (vapidConfigured) return;

  const publicKey = process.env["VAPID_PUBLIC_KEY"];
  const privateKey = process.env["VAPID_PRIVATE_KEY"];
  const email = process.env["VAPID_EMAIL"];

  if (!publicKey || !privateKey || !email) {
    throw new Error(
      "VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_EMAIL environment variables are required",
    );
  }

  webPush.setVapidDetails(email, publicKey, privateKey);
  vapidConfigured = true;
}

/**
 * Sends a Web Push notification to a single subscription.
 * @param subscription - Browser push subscription object
 * @param payload - Notification title, body and optional URL
 */
export async function sendPushNotification(
  subscription: PushSubscriptionData,
  payload: PushPayload,
): Promise<void> {
  ensureVapidConfigured();

  const notificationPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    ...(payload.url !== undefined && { url: payload.url }),
  });

  const pushSubscription: webPush.PushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
  };

  await webPush.sendNotification(pushSubscription, notificationPayload);
}

/**
 * Stores a push subscription for an imobiliaria.
 * Deduplicates by endpoint URL to avoid double-sending.
 * @param imobiliariaId - Owner imobiliaria ID
 * @param subscription - Push subscription to store
 */
export async function storePushSubscription(
  imobiliariaId: string,
  subscription: PushSubscriptionData,
): Promise<void> {
  const existing = subscriptionStore.get(imobiliariaId) ?? [];

  // Deduplicate: replace existing subscription with same endpoint
  const deduped = existing.filter(
    (sub) => sub.endpoint !== subscription.endpoint,
  );
  deduped.push(subscription);

  subscriptionStore.set(imobiliariaId, deduped);
}

/**
 * Retrieves all stored push subscriptions for an imobiliaria.
 * @param imobiliariaId - Owner imobiliaria ID
 * @returns Array of push subscriptions (may be empty)
 */
export async function getSubscriptions(
  imobiliariaId: string,
): Promise<PushSubscriptionData[]> {
  return subscriptionStore.get(imobiliariaId) ?? [];
}

/**
 * Removes a specific push subscription (e.g. when a browser unsubscribes).
 * @param imobiliariaId - Owner imobiliaria ID
 * @param endpoint - Endpoint URL of the subscription to remove
 */
export async function removePushSubscription(
  imobiliariaId: string,
  endpoint: string,
): Promise<void> {
  const existing = subscriptionStore.get(imobiliariaId) ?? [];
  const filtered = existing.filter((sub) => sub.endpoint !== endpoint);
  subscriptionStore.set(imobiliariaId, filtered);
}
