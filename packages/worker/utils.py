"""
Utility functions for the VirtualTour GPU worker.

Responsibilities:
- Downloading source videos from remote URLs.
- Uploading processed assets to Supabase Storage.
- Creating an authenticated Supabase client.
- Notifying the API server via HMAC-signed webhook.
- Driving the gsplat Gaussian Splat training pipeline.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
import os
import shutil
import subprocess
import time
from pathlib import Path
from typing import Any

import requests
from supabase import Client, create_client

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Environment helpers
# ---------------------------------------------------------------------------

def _require_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise EnvironmentError(f"Required environment variable '{name}' is not set.")
    return value


# ---------------------------------------------------------------------------
# Supabase client
# ---------------------------------------------------------------------------

def get_supabase_client() -> Client:
    """Creates and returns an authenticated Supabase client from environment variables."""
    url = _require_env("SUPABASE_URL")
    key = _require_env("SUPABASE_SERVICE_ROLE_KEY")
    return create_client(url, key)


# ---------------------------------------------------------------------------
# Video download
# ---------------------------------------------------------------------------

DOWNLOAD_CHUNK_BYTES = 8 * 1024 * 1024  # 8 MB streaming chunks
DOWNLOAD_TIMEOUT_SECONDS = 600
VIDEO_FILENAME = "video.mp4"


def download_video(video_url: str, work_dir: str) -> str:
    """
    Downloads a video from *video_url* into *work_dir*/video.mp4.

    Returns the absolute path to the downloaded file.
    Raises RuntimeError on HTTP error or I/O failures.
    """
    dest_path = str(Path(work_dir) / VIDEO_FILENAME)
    logger.info("Downloading video from %s → %s", video_url, dest_path)

    try:
        with requests.get(
            video_url,
            stream=True,
            timeout=DOWNLOAD_TIMEOUT_SECONDS,
        ) as response:
            response.raise_for_status()
            total = int(response.headers.get("Content-Length", 0))
            received = 0
            with open(dest_path, "wb") as fh:
                for chunk in response.iter_content(chunk_size=DOWNLOAD_CHUNK_BYTES):
                    if chunk:
                        fh.write(chunk)
                        received += len(chunk)
                        if total > 0:
                            pct = received / total * 100
                            logger.debug("Download progress: %.1f%%", pct)
    except requests.HTTPError as exc:
        raise RuntimeError(
            f"HTTP error while downloading video: {exc.response.status_code} {exc.response.reason}"
        ) from exc
    except requests.RequestException as exc:
        raise RuntimeError(f"Network error while downloading video: {exc}") from exc

    size_mb = Path(dest_path).stat().st_size / (1024 * 1024)
    logger.info("Video downloaded successfully (%.1f MB).", size_mb)
    return dest_path


# ---------------------------------------------------------------------------
# Asset upload
# ---------------------------------------------------------------------------

UPLOAD_RETRY_ATTEMPTS = 3
UPLOAD_RETRY_DELAY_SECONDS = 2.0


def upload_file(local_path: str, storage_path: str) -> str:
    """
    Uploads *local_path* to Supabase Storage at *storage_path*.

    The bucket is read from the ``SUPABASE_BUCKET`` environment variable.
    Returns the public URL of the uploaded file.
    Retries up to UPLOAD_RETRY_ATTEMPTS times on transient errors.
    """
    bucket = _require_env("SUPABASE_BUCKET")
    client = get_supabase_client()
    file_path = Path(local_path)

    if not file_path.exists():
        raise FileNotFoundError(f"Local file not found for upload: {local_path}")

    content_type = _guess_content_type(file_path.suffix)

    last_error: Exception | None = None
    for attempt in range(1, UPLOAD_RETRY_ATTEMPTS + 1):
        try:
            logger.info(
                "Uploading %s → %s/%s (attempt %d/%d)",
                local_path,
                bucket,
                storage_path,
                attempt,
                UPLOAD_RETRY_ATTEMPTS,
            )
            with open(local_path, "rb") as fh:
                data = fh.read()

            # upsert=True overwrites if the file already exists (idempotent retries)
            client.storage.from_(bucket).upload(
                storage_path,
                data,
                file_options={"content-type": content_type, "upsert": "true"},
            )

            public_url: str = client.storage.from_(bucket).get_public_url(storage_path)
            logger.info("Upload complete. Public URL: %s", public_url)
            return public_url

        except Exception as exc:  # noqa: BLE001
            last_error = exc
            logger.warning(
                "Upload attempt %d failed: %s", attempt, exc
            )
            if attempt < UPLOAD_RETRY_ATTEMPTS:
                time.sleep(UPLOAD_RETRY_DELAY_SECONDS * attempt)

    raise RuntimeError(
        f"Upload failed after {UPLOAD_RETRY_ATTEMPTS} attempts: {last_error}"
    ) from last_error


def _guess_content_type(suffix: str) -> str:
    mapping: dict[str, str] = {
        ".sog": "application/octet-stream",
        ".json": "application/json",
        ".webp": "image/webp",
        ".mp4": "video/mp4",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
    }
    return mapping.get(suffix.lower(), "application/octet-stream")


# ---------------------------------------------------------------------------
# API webhook notification
# ---------------------------------------------------------------------------

WEBHOOK_PATH = "/webhooks/runpod"
NOTIFY_TIMEOUT_SECONDS = 30


def notify_api(
    job_id: str,
    status: str,
    room_id: str,
    tour_id: str,
    result: dict[str, Any],
) -> None:
    """
    POSTs a signed webhook to the API server to report job status.

    Signature: HMAC-SHA256 over the raw JSON body using ``WORKER_WEBHOOK_SECRET``.
    Header: ``X-Webhook-Signature: sha256=<hex_digest>``
    """
    api_base = _require_env("API_BASE_URL")
    secret = _require_env("WORKER_WEBHOOK_SECRET")

    payload: dict[str, Any] = {
        "jobId": job_id,
        "status": status,
        "roomId": room_id,
        "tourId": tour_id,
        "result": result,
        "timestamp": int(time.time()),
    }

    body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    signature = hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()

    url = f"{api_base.rstrip('/')}{WEBHOOK_PATH}"
    headers = {
        "Content-Type": "application/json",
        "X-Webhook-Signature": f"sha256={signature}",
    }

    try:
        response = requests.post(
            url, data=body, headers=headers, timeout=NOTIFY_TIMEOUT_SECONDS
        )
        response.raise_for_status()
        logger.info("API notified successfully (status=%s, job=%s).", status, job_id)
    except requests.HTTPError as exc:
        logger.error(
            "API notification HTTP error %s: %s",
            exc.response.status_code,
            exc.response.text,
        )
    except requests.RequestException as exc:
        logger.error("API notification request failed: %s", exc)


# ---------------------------------------------------------------------------
# Gaussian Splat training
# ---------------------------------------------------------------------------

GSPLAT_OUTPUT_PLY = "point_cloud/iteration_final/point_cloud.ply"


def train_gaussian_splat(data_dir: str, output_dir: str, iterations: int) -> None:
    """
    Runs gsplat Gaussian Splat training using the gsplat Python library.

    *data_dir* should already contain a COLMAP ``sparse/0/`` reconstruction.
    Trained output is written to *output_dir*.

    Raises RuntimeError if training exits with a non-zero code.
    """
    Path(output_dir).mkdir(parents=True, exist_ok=True)

    logger.info(
        "Starting Gaussian Splat training: data=%s, output=%s, iters=%d",
        data_dir,
        output_dir,
        iterations,
    )

    # gsplat's simple_trainer CLI entry point
    cmd = [
        "python3",
        "-m",
        "gsplat.simple_trainer",
        "--data_dir", data_dir,
        "--result_dir", output_dir,
        "--max_steps", str(iterations),
        "--data_factor", "1",
        "--disable_viewer",
    ]

    logger.debug("Training command: %s", " ".join(cmd))

    process = subprocess.run(
        cmd,
        capture_output=False,
        text=True,
        check=False,
    )

    if process.returncode != 0:
        raise RuntimeError(
            f"Gaussian Splat training failed with exit code {process.returncode}."
        )

    logger.info("Gaussian Splat training completed.")


# ---------------------------------------------------------------------------
# Frame extraction helper (used by handler, exposed here for testability)
# ---------------------------------------------------------------------------

FFMPEG_LOG_LEVEL = "warning"


def extract_frames(video_path: str, frames_dir: str, fps: int) -> list[str]:
    """
    Extracts frames from *video_path* at *fps* frames per second.

    Saves frames as ``frame_%06d.jpg`` inside *frames_dir*.
    Returns the sorted list of extracted frame paths.
    Raises RuntimeError on ffmpeg failure.
    """
    Path(frames_dir).mkdir(parents=True, exist_ok=True)
    output_pattern = str(Path(frames_dir) / "frame_%06d.jpg")

    cmd = [
        "ffmpeg",
        "-i", video_path,
        "-vf", f"fps={fps}",
        "-q:v", "2",
        "-loglevel", FFMPEG_LOG_LEVEL,
        output_pattern,
    ]

    logger.info("Extracting frames: fps=%d, dest=%s", fps, frames_dir)
    logger.debug("ffmpeg command: %s", " ".join(cmd))

    result = subprocess.run(cmd, capture_output=True, text=True, check=False)

    if result.returncode != 0:
        raise RuntimeError(
            f"ffmpeg frame extraction failed (exit {result.returncode}):\n{result.stderr}"
        )

    frames = sorted(str(p) for p in Path(frames_dir).glob("frame_*.jpg"))
    logger.info("Extracted %d frames.", len(frames))
    return frames
