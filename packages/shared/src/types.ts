/**
 * Shared TypeScript types for VirtualTour monorepo.
 * All types mirror the Prisma schema and API contracts.
 */

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export enum TourStatus {
  DRAFT = "DRAFT",
  UPLOADING = "UPLOADING",
  PROCESSING = "PROCESSING",
  READY = "READY",
  PUBLISHED = "PUBLISHED",
  ARCHIVED = "ARCHIVED",
}

export enum RoomStatus {
  PENDING = "PENDING",
  UPLOADING = "UPLOADING",
  PROCESSING = "PROCESSING",
  DONE = "DONE",
  ERROR = "ERROR",
}

export enum Plan {
  FREE = "FREE",
  PRO = "PRO",
  ENTERPRISE = "ENTERPRISE",
}

// ---------------------------------------------------------------------------
// Domain entities
// ---------------------------------------------------------------------------

export interface Imobiliaria {
  id: string;
  name: string;
  email: string;
  plan: Plan;
  createdAt: Date;
}

export interface Tour {
  id: string;
  imobiliariaId: string;
  address: string;
  price: number | null;
  status: TourStatus;
  rooms: Room[];
  settingsJson: ExperienceSettings | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Room {
  id: string;
  tourId: string;
  name: string;
  order: number;
  status: RoomStatus;
  videoPath: string | null;
  splatPath: string | null;
  thumbPath: string | null;
  voxelPath: string | null;
  jobId: string | null;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// Experience / viewer settings
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
  bloom: boolean;
  bloomIntensity: number;
  vignette: boolean;
  vignetteIntensity: number;
  ambientOcclusion: boolean;
  ambientOcclusionRadius: number;
  fxaa: boolean;
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

export interface RoomSettings {
  roomId: string;
  defaultCamera: Camera;
  annotations: Annotation[];
  animTracks: AnimTrack[];
}

export interface ExperienceSettings {
  /** Version of the settings schema */
  version: number;
  /** Ordered list of room IDs defining navigation sequence */
  roomOrder: string[];
  rooms: RoomSettings[];
  postEffects: PostEffectSettings;
  /** Background color in hex (#rrggbb) */
  backgroundColor: string;
  /** Loading screen logo URL */
  logoUrl: string | null;
  /** Enable/disable room hotspot navigation */
  hotspots: boolean;
  /** Tour title shown in viewer header */
  viewerTitle: string;
}

// ---------------------------------------------------------------------------
// API contract types
// ---------------------------------------------------------------------------

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface UploadChunkHeaders {
  "content-range": string;
  "x-chunk-index": string;
  "x-total-chunks": string;
}

export interface ChunkUploadResponse {
  status: "chunk_received" | "complete";
  chunkIndex?: number;
  jobId?: string;
  videoPath?: string;
}

export interface JobStatusResponse {
  jobId: string;
  status: "waiting" | "active" | "completed" | "failed" | "delayed" | "unknown";
  progress: number;
  result?: unknown;
  failReason?: string;
}

export interface PublishTourResponse {
  tourId: string;
  viewerUrl: string;
  publishedAt: Date;
}

export interface AuthTokenPayload {
  imobiliariaId: string;
  email: string;
  name: string;
  iat?: number;
  exp?: number;
}
