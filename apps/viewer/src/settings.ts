import type { ExperienceSettings } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_CAMERA_HEIGHT = 1.5;
const DEFAULT_CAMERA_Z = 3;
const DEFAULT_TARGET_Y = 0.5;
const DEFAULT_FOV = 75;
const DEFAULT_BACKGROUND_R = 0.1;
const DEFAULT_BACKGROUND_G = 0.1;
const DEFAULT_BACKGROUND_B = 0.15;
const DEFAULT_BLOOM_INTENSITY = 0.5;

// ---------------------------------------------------------------------------
// Default settings
// ---------------------------------------------------------------------------

export const DEFAULT_SETTINGS: ExperienceSettings = {
  version: 2,
  tonemapping: "aces",
  highPrecisionRendering: false,
  background: { color: [DEFAULT_BACKGROUND_R, DEFAULT_BACKGROUND_G, DEFAULT_BACKGROUND_B] },
  startMode: "default",
  cameras: [
    {
      position: [0, DEFAULT_CAMERA_HEIGHT, DEFAULT_CAMERA_Z],
      target: [0, DEFAULT_TARGET_Y, 0],
      fov: DEFAULT_FOV,
    },
  ],
  annotations: [],
  animTracks: [],
  postEffectSettings: {
    brightness: 0,
    contrast: 0,
    bloomIntensity: DEFAULT_BLOOM_INTENSITY,
    vignette: 0,
  },
} satisfies Omit<ExperienceSettings, "soundUrl"> as ExperienceSettings;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Deep-merges a partial settings object on top of the defaults.
 * Arrays in the partial fully replace their default counterparts.
 */
export function mergeWithDefaults(partial: Partial<ExperienceSettings>): ExperienceSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...partial,
    background: {
      ...DEFAULT_SETTINGS.background,
      ...(partial.background ?? {}),
    },
    postEffectSettings: {
      ...DEFAULT_SETTINGS.postEffectSettings,
      ...(partial.postEffectSettings ?? {}),
    },
    cameras:
      partial.cameras !== undefined && partial.cameras.length > 0
        ? partial.cameras
        : DEFAULT_SETTINGS.cameras,
    annotations: partial.annotations ?? DEFAULT_SETTINGS.annotations,
    animTracks: partial.animTracks ?? DEFAULT_SETTINGS.animTracks,
  };
}

/**
 * Applies settings to the running PlayCanvas application.
 * The actual PlayCanvas API calls are delegated to the App class; this
 * function is a lightweight coordinator that can be called whenever the
 * viewer settings change (e.g. live-preview updates from the dashboard).
 *
 * Returns the resolved settings for the caller to use.
 */
export function applySettings(settings: ExperienceSettings): ExperienceSettings {
  const resolved = mergeWithDefaults(settings);
  // Dispatch a custom DOM event so any listener (PlayCanvas scene setup,
  // post-effects pipeline, etc.) can react without tight coupling.
  window.dispatchEvent(
    new CustomEvent("viewer-settings-changed", { detail: resolved })
  );
  return resolved;
}
