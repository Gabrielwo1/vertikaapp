import type { AnalyticsEvent } from "@/types";

// ---------------------------------------------------------------------------
// gtag / dataLayer augmentation
// ---------------------------------------------------------------------------

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fires a named analytics event.
 *
 * In production, pushes to window.dataLayer (Google Tag Manager / gtag).
 * In development (import.meta.env.DEV), falls back to console.info so
 * nothing is swallowed silently.
 */
export function fireEvent(
  event: AnalyticsEvent,
  data?: Record<string, unknown>
): void {
  const payload: Record<string, unknown> = {
    event,
    ...data,
  };

  if (typeof window.gtag === "function") {
    window.gtag("event", event, data ?? {});
    return;
  }

  if (Array.isArray(window.dataLayer)) {
    window.dataLayer.push(payload);
    return;
  }

  if (import.meta.env.DEV) {
    console.info("[analytics]", event, data ?? {});
  }
}
