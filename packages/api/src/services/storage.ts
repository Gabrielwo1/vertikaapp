import { createClient } from "@supabase/supabase-js";
import fs from "node:fs/promises";
import path from "node:path";

function getSupabaseClient() {
  const supabaseUrl = process.env["SUPABASE_URL"];
  const supabaseKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required",
    );
  }

  return createClient(supabaseUrl, supabaseKey);
}

function getBucket(): string {
  return process.env["SUPABASE_BUCKET"] ?? "tour-assets";
}

/**
 * Uploads a local file to Supabase Storage.
 * @param localPath - Absolute path to the local file
 * @param storagePath - Destination path within the Supabase bucket
 * @returns Public URL of the uploaded file
 */
export async function uploadFile(
  localPath: string,
  storagePath: string,
): Promise<string> {
  const supabase = getSupabaseClient();
  const bucket = getBucket();

  const fileBuffer = await fs.readFile(localPath);
  const ext = path.extname(localPath).toLowerCase();

  const contentTypeMap: Record<string, string> = {
    ".mp4": "video/mp4",
    ".sog": "application/octet-stream",
    ".ply": "model/ply",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
  };

  const contentType = contentTypeMap[ext] ?? "application/octet-stream";

  const { error } = await supabase.storage
    .from(bucket)
    .upload(storagePath, fileBuffer, {
      contentType,
      upsert: true,
    });

  if (error) {
    throw new Error(`Falha ao enviar arquivo para Supabase Storage: ${error.message}`);
  }

  return getPublicUrl(storagePath);
}

/**
 * Downloads a file from Supabase Storage as a Buffer.
 * @param storagePath - Path within the Supabase bucket
 * @returns File contents as a Buffer
 */
export async function downloadFile(storagePath: string): Promise<Buffer> {
  const supabase = getSupabaseClient();
  const bucket = getBucket();

  const { data, error } = await supabase.storage
    .from(bucket)
    .download(storagePath);

  if (error || !data) {
    throw new Error(
      `Falha ao baixar arquivo do Supabase Storage: ${error?.message ?? "Dados ausentes"}`,
    );
  }

  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Returns the public URL for a file in Supabase Storage.
 * @param storagePath - Path within the Supabase bucket
 * @returns Public URL string
 */
export function getPublicUrl(storagePath: string): string {
  const supabase = getSupabaseClient();
  const bucket = getBucket();

  const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath);

  return data.publicUrl;
}

/**
 * Deletes a file from Supabase Storage.
 * @param storagePath - Path within the Supabase bucket to delete
 */
export async function deleteFile(storagePath: string): Promise<void> {
  const supabase = getSupabaseClient();
  const bucket = getBucket();

  const { error } = await supabase.storage
    .from(bucket)
    .remove([storagePath]);

  if (error) {
    throw new Error(
      `Falha ao deletar arquivo do Supabase Storage: ${error.message}`,
    );
  }
}
