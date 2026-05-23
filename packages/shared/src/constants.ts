/**
 * Shared constants for VirtualTour monorepo.
 * All numeric values are named constants — no magic numbers.
 */

/** Size of each upload chunk in bytes (5 MB). */
export const CHUNK_SIZE_BYTES = 5 * 1024 * 1024;

/** Maximum recording duration per room in minutes. */
export const MAX_RECORDING_MINUTES = 5;

/** Maximum gyroscope rotation speed in degrees per second used for capture guidance. */
export const MAX_ROTATION_SPEED_DEG_PER_SEC = 30;

/** Interval at which MediaRecorder fires dataavailable events, in milliseconds. */
export const RECORDING_CHUNK_MS = 1000;

/** Debounce delay for autosave operations, in milliseconds. */
export const AUTOSAVE_DEBOUNCE_MS = 2000;

/** Number of retry attempts for failed chunk uploads. */
export const UPLOAD_RETRY_ATTEMPTS = 3;

/** Total rotation in degrees required to complete a full capture sweep. */
export const GYRO_COMPLETE_DEGREES = 360;

/** Duration of haptic feedback vibration in milliseconds. */
export const VIBRATE_DURATION_MS = 200;

/** Frames per second used when extracting frames for Gaussian Splat processing. */
export const SPLAT_FPS = 2;

/** Number of Gaussian Splat training iterations. */
export const SPLAT_ITERS = 7000;

/** Minimum free-tier storage per imobiliária in gigabytes. */
export const FREE_TIER_STORAGE_GB = 2;
