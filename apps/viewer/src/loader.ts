/**
 * Asset loaders for .sog (Gaussian Splat) and voxel files.
 *
 * Fires the custom DOM event 'loading-progress' with a detail of
 * { progress: number } where progress is in [0, 100].
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PROGRESS_DOWNLOAD_START = 5;
const PROGRESS_DOWNLOAD_COMPLETE = 90;
const PROGRESS_PARSE_COMPLETE = 100;
const BYTES_PER_MB = 1_048_576;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function emitProgress(progress: number): void {
  window.dispatchEvent(
    new CustomEvent("loading-progress", { detail: { progress } })
  );
}

/**
 * Streams a binary resource over fetch and tracks download progress.
 * If the server sends a Content-Length header the progress is accurate;
 * otherwise it increments in proportion to chunks received.
 */
async function fetchWithProgress(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Falha ao carregar recurso: ${response.status} ${response.statusText} — ${url}`
    );
  }

  const contentLength = response.headers.get("Content-Length");
  const totalBytes = contentLength !== null ? parseInt(contentLength, 10) : null;

  const reader = response.body?.getReader();
  if (reader === undefined) {
    // Fallback: read entire body at once (no progress granularity)
    emitProgress(PROGRESS_DOWNLOAD_START);
    const buffer = await response.arrayBuffer();
    emitProgress(PROGRESS_DOWNLOAD_COMPLETE);
    return buffer;
  }

  const chunks: Uint8Array[] = [];
  let receivedBytes = 0;

  emitProgress(PROGRESS_DOWNLOAD_START);

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    chunks.push(value);
    receivedBytes += value.byteLength;

    if (totalBytes !== null && totalBytes > 0) {
      const downloadFraction = receivedBytes / totalBytes;
      const progress =
        PROGRESS_DOWNLOAD_START +
        downloadFraction * (PROGRESS_DOWNLOAD_COMPLETE - PROGRESS_DOWNLOAD_START);
      emitProgress(Math.round(progress));
    } else {
      // Indeterminate: show progress proportional to MBs received, capped at 80
      const softCap = 80;
      const estimatedProgress = Math.min(
        PROGRESS_DOWNLOAD_START +
          (receivedBytes / BYTES_PER_MB) * (softCap - PROGRESS_DOWNLOAD_START),
        softCap
      );
      emitProgress(Math.round(estimatedProgress));
    }
  }

  emitProgress(PROGRESS_DOWNLOAD_COMPLETE);

  // Concatenate chunks into a single ArrayBuffer
  const totalReceived = chunks.reduce((acc, c) => acc + c.byteLength, 0);
  const result = new Uint8Array(totalReceived);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return result.buffer;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Downloads a .sog Gaussian Splat file and returns its raw bytes.
 */
export async function loadSogFile(url: string): Promise<ArrayBuffer> {
  emitProgress(0);
  const buffer = await fetchWithProgress(url);
  emitProgress(PROGRESS_PARSE_COMPLETE);
  return buffer;
}

/**
 * Downloads a voxel JSON file and returns the parsed object.
 */
export async function loadVoxelFile(url: string): Promise<unknown> {
  emitProgress(0);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Falha ao carregar voxel: ${response.status} ${response.statusText} — ${url}`
    );
  }

  emitProgress(PROGRESS_DOWNLOAD_COMPLETE);
  const data: unknown = await response.json();
  emitProgress(PROGRESS_PARSE_COMPLETE);
  return data;
}
