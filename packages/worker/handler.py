"""
RunPod Serverless handler for VirtualTour GPU worker.

Pipeline per room:
  1. Download source video
  2. Extract frames with ffmpeg
  3. Run COLMAP automatic reconstruction
  4. Train Gaussian Splat (gsplat)
  5. Run splat-transform to produce .sog, voxel.json and thumb.webp
  6. Upload all three assets to Supabase Storage
  7. Clean up /tmp workspace
  8. Notify the API server via signed webhook
"""

from __future__ import annotations

import logging
import os
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Any

import runpod  # type: ignore[import-untyped]

from utils import (
    download_video,
    extract_frames,
    get_supabase_client,
    notify_api,
    train_gaussian_splat,
    upload_file,
)

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

MIN_FRAMES_REQUIRED = 10

# splat-transform filter flags for the .sog output
SPLAT_TRANSFORM_SOG_FLAGS = [
    "--filter-cluster",
    "--seed-pos", "0,1,0",
    "--filter-floaters",
    "--filter-nan",
    "--decimate", "60%",
]

SPLAT_TRANSFORM_VOXEL_FLAGS = [
    "--voxel-external-fill",
    "--voxel-carve",
    "-K", "smooth",
]

SPLAT_TRANSFORM_THUMB_RESOLUTION = "1280x720"

STORAGE_PREFIX = "tours"

# ---------------------------------------------------------------------------
# Public handler
# ---------------------------------------------------------------------------


def handler(job: dict[str, Any]) -> dict[str, Any]:
    """
    RunPod serverless entry point.

    Expected *job['input']*:
        videoUrl  — publicly accessible URL of the source MP4
        roomId    — UUID of the Room record
        tourId    — UUID of the Tour record
        jobId     — BullMQ / RunPod job identifier for webhook callbacks
    """
    job_input: dict[str, Any] = job.get("input", {})

    video_url: str = job_input["videoUrl"]
    room_id: str = job_input["roomId"]
    tour_id: str = job_input["tourId"]
    job_id: str = job_input["jobId"]

    logger.info(
        "Handler invoked — jobId=%s tourId=%s roomId=%s", job_id, tour_id, room_id
    )

    result = process_room(video_url, room_id, tour_id, job_id)
    return result


# ---------------------------------------------------------------------------
# Pipeline
# ---------------------------------------------------------------------------


def process_room(
    video_url: str,
    room_id: str,
    tour_id: str,
    job_id: str,
) -> dict[str, Any]:
    """
    Full processing pipeline for one room.

    Returns a dict with keys:
        status       — "complete" | "error"
        sog_url      — public URL of the .sog file   (on success)
        voxel_url    — public URL of voxel.json       (on success)
        thumb_url    — public URL of thumb.webp       (on success)
        error        — error message string           (on failure)
    """
    work_dir = tempfile.mkdtemp(prefix=f"vt_{room_id}_")
    logger.info("Workspace created: %s", work_dir)

    try:
        result = _run_pipeline(video_url, room_id, tour_id, work_dir)
        notify_api(job_id, "complete", room_id, tour_id, result)
        return result

    except Exception as exc:  # noqa: BLE001
        logger.exception("Pipeline failed for room %s: %s", room_id, exc)
        error_result: dict[str, Any] = {"status": "error", "error": str(exc)}
        notify_api(job_id, "error", room_id, tour_id, error_result)
        return error_result

    finally:
        _cleanup(work_dir)


def _run_pipeline(
    video_url: str,
    room_id: str,
    tour_id: str,
    work_dir: str,
) -> dict[str, Any]:
    """Executes every pipeline stage and returns the success result dict."""

    # ------------------------------------------------------------------
    # 1. Download video
    # ------------------------------------------------------------------
    video_path = download_video(video_url, work_dir)

    # ------------------------------------------------------------------
    # 2. Extract frames
    # ------------------------------------------------------------------
    frames_dir = str(Path(work_dir) / "frames")
    fps = int(os.environ.get("SPLAT_FPS", "2"))
    frames = extract_frames(video_path, frames_dir, fps)

    if len(frames) < MIN_FRAMES_REQUIRED:
        raise RuntimeError(
            f"Insufficient frames for reconstruction: got {len(frames)}, "
            f"need at least {MIN_FRAMES_REQUIRED}."
        )

    # ------------------------------------------------------------------
    # 3. COLMAP automatic reconstruction
    # ------------------------------------------------------------------
    colmap_dir = str(Path(work_dir) / "colmap")
    _run_colmap(frames_dir, colmap_dir)

    # ------------------------------------------------------------------
    # 4. Train Gaussian Splat
    # ------------------------------------------------------------------
    splat_dir = str(Path(work_dir) / "splat")
    iterations = int(os.environ.get("SPLAT_ITERS", "7000"))
    train_gaussian_splat(colmap_dir, splat_dir, iterations)

    # Locate the trained PLY file
    ply_path = _find_trained_ply(splat_dir)

    # ------------------------------------------------------------------
    # 5a. splat-transform → scene.sog
    # ------------------------------------------------------------------
    sog_path = str(Path(work_dir) / "scene.sog")
    _run_splat_transform(
        input_path=ply_path,
        output_path=sog_path,
        extra_flags=SPLAT_TRANSFORM_SOG_FLAGS,
    )

    # ------------------------------------------------------------------
    # 5b. splat-transform → scene.voxel.json
    # ------------------------------------------------------------------
    voxel_path = str(Path(work_dir) / "scene.voxel.json")
    _run_splat_transform(
        input_path=ply_path,
        output_path=voxel_path,
        extra_flags=SPLAT_TRANSFORM_VOXEL_FLAGS,
    )

    # ------------------------------------------------------------------
    # 5c. splat-transform → thumb.webp
    # ------------------------------------------------------------------
    thumb_path = str(Path(work_dir) / "thumb.webp")
    _run_splat_transform(
        input_path=ply_path,
        output_path=thumb_path,
        extra_flags=["--resolution", SPLAT_TRANSFORM_THUMB_RESOLUTION],
    )

    # ------------------------------------------------------------------
    # 6. Upload assets to Supabase Storage
    # ------------------------------------------------------------------
    base_storage = f"{STORAGE_PREFIX}/{tour_id}/{room_id}"

    sog_url = upload_file(sog_path, f"{base_storage}/scene.sog")
    voxel_url = upload_file(voxel_path, f"{base_storage}/scene.voxel.json")
    thumb_url = upload_file(thumb_path, f"{base_storage}/thumb.webp")

    logger.info(
        "All assets uploaded — sog=%s voxel=%s thumb=%s",
        sog_url,
        voxel_url,
        thumb_url,
    )

    return {
        "status": "complete",
        "sog_url": sog_url,
        "voxel_url": voxel_url,
        "thumb_url": thumb_url,
    }


# ---------------------------------------------------------------------------
# Stage helpers
# ---------------------------------------------------------------------------


def _run_colmap(image_dir: str, colmap_dir: str) -> None:
    """Runs COLMAP automatic_reconstructor on the extracted frames."""
    Path(colmap_dir).mkdir(parents=True, exist_ok=True)

    cmd = [
        "colmap",
        "automatic_reconstructor",
        "--image_path", image_dir,
        "--workspace_path", colmap_dir,
        "--dense", "0",         # sparse only — gsplat handles densification
        "--quality", "medium",  # balance speed vs. accuracy
    ]

    logger.info("Running COLMAP: %s", " ".join(cmd))

    result = subprocess.run(cmd, capture_output=False, text=True, check=False)

    if result.returncode != 0:
        raise RuntimeError(
            f"COLMAP reconstruction failed with exit code {result.returncode}."
        )

    # Verify at least a sparse model was produced
    sparse_path = Path(colmap_dir) / "sparse"
    if not sparse_path.exists() or not any(sparse_path.iterdir()):
        raise RuntimeError(
            "COLMAP reconstruction produced no sparse model. "
            "Video may lack sufficient texture or overlap."
        )

    logger.info("COLMAP reconstruction complete.")


def _find_trained_ply(splat_dir: str) -> str:
    """
    Locates the trained Gaussian Splat PLY file within *splat_dir*.

    gsplat writes checkpoints per iteration; we look for the final iteration
    file (highest number) or a canonical name.
    """
    splat_path = Path(splat_dir)

    # Try canonical location first
    canonical = splat_path / "point_cloud" / "iteration_final" / "point_cloud.ply"
    if canonical.exists():
        logger.info("Found trained PLY at canonical path: %s", canonical)
        return str(canonical)

    # Fall back: find highest-numbered iteration directory
    ply_files = sorted(splat_path.rglob("point_cloud.ply"))
    if ply_files:
        chosen = ply_files[-1]
        logger.info("Found trained PLY at: %s", chosen)
        return str(chosen)

    raise RuntimeError(
        f"Could not find trained point_cloud.ply inside {splat_dir}. "
        "Training may have failed silently."
    )


def _run_splat_transform(
    input_path: str,
    output_path: str,
    extra_flags: list[str],
) -> None:
    """
    Runs the @playcanvas/splat-transform CLI.

    Raises RuntimeError on non-zero exit.
    """
    cmd = ["splat-transform", input_path, output_path, *extra_flags]

    logger.info("Running splat-transform: %s", " ".join(cmd))

    result = subprocess.run(cmd, capture_output=True, text=True, check=False)

    if result.returncode != 0:
        raise RuntimeError(
            f"splat-transform failed (exit {result.returncode}) "
            f"for output {output_path}:\n{result.stderr}"
        )

    if not Path(output_path).exists():
        raise RuntimeError(
            f"splat-transform reported success but output file is missing: {output_path}"
        )

    size_kb = Path(output_path).stat().st_size / 1024
    logger.info("splat-transform output: %s (%.1f KB)", output_path, size_kb)


def _cleanup(work_dir: str) -> None:
    """Removes the temporary workspace directory."""
    try:
        shutil.rmtree(work_dir, ignore_errors=True)
        logger.info("Workspace cleaned up: %s", work_dir)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Failed to clean up workspace %s: %s", work_dir, exc)


# ---------------------------------------------------------------------------
# RunPod entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    runpod.serverless.start({"handler": handler})
