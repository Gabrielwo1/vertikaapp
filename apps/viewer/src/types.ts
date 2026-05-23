/**
 * Viewer-local type definitions.
 * ExperienceSettings is intentionally duplicated here so the viewer
 * has zero runtime dependency on @virtualtour/shared.
 */

// ---------------------------------------------------------------------------
// Experience / viewer settings (viewer-local copy)
// ---------------------------------------------------------------------------

export interface Camera {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}

export interface Annotation {
  id: string;
  label: string;
  position: [number, number, number];
  description?: string;
}

export interface PostEffectSettings {
  brightness: number;
  contrast: number;
  bloomIntensity: number;
  vignette: number;
}

export interface AnimTrack {
  id: string;
  name: string;
  /** Duration in seconds */
  duration: number;
  /** Keyframe timestamps in seconds */
  keyframes: number[];
  /** Camera positions per keyframe */
  positions: Array<[number, number, number]>;
  /** Camera targets per keyframe */
  targets: Array<[number, number, number]>;
  loop: boolean;
  autoPlay: boolean;
}

export interface ExperienceSettings {
  /** Schema version */
  version: number;
  /** Tonemapping operator */
  tonemapping: "aces" | "linear" | "filmic" | "hejl" | "none";
  /** Enable 32-bit float render targets */
  highPrecisionRendering: boolean;
  /** Background solid color as linear RGB in [0,1] range */
  background: { color: [number, number, number] };
  /** Initial navigation mode */
  startMode: "default" | "walk" | "orbit";
  /** Ordered list of initial cameras (first is default) */
  cameras: Camera[];
  /** Hotspot annotations */
  annotations: Annotation[];
  /** Pre-recorded camera animation tracks */
  animTracks: AnimTrack[];
  /** Post-processing parameters */
  postEffectSettings: PostEffectSettings;
  /** Optional ambient sound URL */
  soundUrl?: string;
}

// ---------------------------------------------------------------------------
// Viewer initialisation params
// ---------------------------------------------------------------------------

export interface ViewerParams {
  tourId: string;
  settingsUrl?: string;
  contentUrl?: string;
  collisionUrl?: string;
  posterUrl?: string;
  isPreview: boolean;
}

// ---------------------------------------------------------------------------
// Property panel
// ---------------------------------------------------------------------------

export interface PropertyPanelData {
  price?: number;
  address?: string;
  phone?: string;
  area?: number;
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export type AnalyticsEvent =
  | "viewer_loaded"
  | "walk_mode_started"
  | "annotation_clicked"
  | "cta_whatsapp"
  | "cta_schedule";

// ---------------------------------------------------------------------------
// Dashboard ↔ Viewer messaging
// ---------------------------------------------------------------------------

export type DashboardMessage = {
  type: "UPDATE_SETTINGS";
  settings: ExperienceSettings;
};
