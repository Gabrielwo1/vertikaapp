/**
 * Zod validation schemas mirroring the shared TypeScript types.
 * Use these schemas for runtime validation at API boundaries.
 */

import { z } from "zod";
import type { ExperienceSettings } from "./types";

// ---------------------------------------------------------------------------
// Enum schemas
// ---------------------------------------------------------------------------

export const tourStatusSchema = z.enum([
  "DRAFT",
  "UPLOADING",
  "PROCESSING",
  "READY",
  "PUBLISHED",
  "ARCHIVED",
]);

export const roomStatusSchema = z.enum([
  "PENDING",
  "UPLOADING",
  "PROCESSING",
  "DONE",
  "ERROR",
]);

export const planSchema = z.enum(["FREE", "PRO", "ENTERPRISE"]);

// ---------------------------------------------------------------------------
// Domain schemas
// ---------------------------------------------------------------------------

export const createTourSchema = z.object({
  address: z.string().min(3, "Endereço deve ter pelo menos 3 caracteres"),
  price: z.number().positive("Preço deve ser positivo").optional(),
  rooms: z
    .array(z.string().min(1, "Nome do cômodo não pode ser vazio"))
    .min(1, "Pelo menos um cômodo é necessário"),
});

export const updateTourSchema = z.object({
  address: z
    .string()
    .min(3, "Endereço deve ter pelo menos 3 caracteres")
    .optional(),
  price: z.number().positive("Preço deve ser positivo").optional(),
  settingsJson: z.record(z.unknown()).optional(),
  status: tourStatusSchema.optional(),
});

export const createRoomSchema = z.object({
  name: z.string().min(1, "Nome do cômodo não pode ser vazio"),
  order: z
    .number()
    .int("Ordem deve ser um número inteiro")
    .nonnegative("Ordem deve ser não-negativa"),
});

// ---------------------------------------------------------------------------
// Experience settings schemas
// ---------------------------------------------------------------------------

const cameraSchema = z.object({
  position: z.tuple([z.number(), z.number(), z.number()]),
  target: z.tuple([z.number(), z.number(), z.number()]),
  fov: z
    .number()
    .positive("FOV deve ser positivo")
    .max(179, "FOV deve ser menor que 180"),
});

const annotationSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1, "Rótulo da anotação não pode ser vazio"),
  position: z.tuple([z.number(), z.number(), z.number()]),
  description: z.string().optional(),
});

const postEffectSettingsSchema = z.object({
  bloom: z.boolean(),
  bloomIntensity: z.number().min(0).max(10),
  vignette: z.boolean(),
  vignetteIntensity: z.number().min(0).max(1),
  ambientOcclusion: z.boolean(),
  ambientOcclusionRadius: z.number().positive(),
  fxaa: z.boolean(),
});

const animTrackSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, "Nome da trilha não pode ser vazio"),
  duration: z.number().positive("Duração deve ser positiva"),
  keyframes: z.array(z.number().nonnegative()),
  positions: z.array(z.tuple([z.number(), z.number(), z.number()])),
  targets: z.array(z.tuple([z.number(), z.number(), z.number()])),
  loop: z.boolean(),
  autoPlay: z.boolean(),
});

const roomSettingsSchema = z.object({
  roomId: z.string().min(1),
  defaultCamera: cameraSchema,
  annotations: z.array(annotationSchema),
  animTracks: z.array(animTrackSchema),
});

export const experienceSettingsSchema = z.object({
  version: z.number().int().positive(),
  roomOrder: z.array(z.string().min(1)),
  rooms: z.array(roomSettingsSchema),
  postEffects: postEffectSettingsSchema,
  backgroundColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Cor deve estar no formato #rrggbb"),
  logoUrl: z.string().url("URL do logo inválida").nullable(),
  hotspots: z.boolean(),
  viewerTitle: z.string().min(1, "Título do visualizador não pode ser vazio"),
});

// ---------------------------------------------------------------------------
// Auth schemas
// ---------------------------------------------------------------------------

export const googleAuthSchema = z.object({
  code: z.string().min(1, "Código de autorização é obrigatório"),
  redirectUri: z.string().url("URI de redirecionamento inválida"),
});

export const refreshTokenSchema = z.object({
  token: z.string().min(1, "Token é obrigatório"),
});

// ---------------------------------------------------------------------------
// Push subscription schema
// ---------------------------------------------------------------------------

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

// ---------------------------------------------------------------------------
// Webhook body schema
// ---------------------------------------------------------------------------

export const runpodWebhookSchema = z.object({
  jobId: z.string().min(1),
  status: z.enum(["complete", "error"]),
  roomId: z.string().min(1),
  tourId: z.string().min(1),
  splatPath: z.string().optional(),
  voxelPath: z.string().optional(),
  thumbPath: z.string().optional(),
  error: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Validator helper
// ---------------------------------------------------------------------------

/**
 * Validates an unknown value against the experienceSettingsSchema.
 * Throws a ZodError if the value does not conform to the schema.
 * @param settings — unknown value to validate
 * @returns Parsed and typed ExperienceSettings
 */
export function validateSettings(settings: unknown): ExperienceSettings {
  return experienceSettingsSchema.parse(settings) as ExperienceSettings;
}
