from __future__ import annotations

import json
import subprocess
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageSequence


@dataclass(frozen=True)
class MediaMetadata:
    width: int
    height: int
    duration: float | None


@dataclass(frozen=True)
class ThumbnailResult:
    thumbnail_path: str
    animated_thumbnail_path: str | None
    metadata: MediaMetadata


IMAGE_MIME_TYPES = {"image/png", "image/jpeg", "image/webp"}
GIF_MIME_TYPE = "image/gif"
VIDEO_MIME_TYPES = {"video/mp4", "video/webm"}


def generate_thumbnails(
    source_path: Path,
    thumbnail_dir: Path,
    file_id: str,
    mime_type: str,
) -> ThumbnailResult:
    thumbnail_dir.mkdir(parents=True, exist_ok=True)

    if mime_type in IMAGE_MIME_TYPES:
        metadata = _image_metadata(source_path)
        thumbnail_path = thumbnail_dir / f"{file_id}_thumb.webp"
        _resize_static_image(source_path, thumbnail_path)
        return ThumbnailResult(_web_path(thumbnail_path), None, metadata)

    if mime_type == GIF_MIME_TYPE:
        metadata = _gif_metadata(source_path)
        thumbnail_path = thumbnail_dir / f"{file_id}_thumb.gif"
        _resize_gif(source_path, thumbnail_path)
        return ThumbnailResult(_web_path(thumbnail_path), _web_path(thumbnail_path), metadata)

    if mime_type in VIDEO_MIME_TYPES:
        metadata = _video_metadata(source_path)
        thumbnail_path = thumbnail_dir / f"{file_id}_thumb.webp"
        animated_path = thumbnail_dir / f"{file_id}_animated.gif"
        _run_ffmpeg(
            [
                "ffmpeg",
                "-y",
                "-ss",
                "1",
                "-i",
                str(source_path),
                "-frames:v",
                "1",
                "-vf",
                "scale=400:-2",
                str(thumbnail_path),
            ]
        )
        _run_ffmpeg(
            [
                "ffmpeg",
                "-y",
                "-t",
                "3",
                "-i",
                str(source_path),
                "-vf",
                "fps=10,scale=400:-2",
                str(animated_path),
            ]
        )
        return ThumbnailResult(_web_path(thumbnail_path), _web_path(animated_path), metadata)

    raise ValueError(f"Unsupported media type: {mime_type}")


def _web_path(path: Path) -> str:
    return f"/thumbnails/{path.name}"


def _image_metadata(path: Path) -> MediaMetadata:
    with Image.open(path) as image:
        return MediaMetadata(width=image.width, height=image.height, duration=None)


def _gif_metadata(path: Path) -> MediaMetadata:
    with Image.open(path) as image:
        duration_ms = sum(frame.info.get("duration", 0) for frame in ImageSequence.Iterator(image))
        return MediaMetadata(
            width=image.width,
            height=image.height,
            duration=duration_ms / 1000 if duration_ms else None,
        )


def _resize_static_image(source_path: Path, output_path: Path) -> None:
    with Image.open(source_path) as image:
        image.thumbnail((400, 400_000))
        if image.mode not in ("RGB", "RGBA"):
            image = image.convert("RGBA")
        image.save(output_path, "WEBP", quality=82)


def _resize_gif(source_path: Path, output_path: Path) -> None:
    with Image.open(source_path) as image:
        frames = []
        durations = []
        for frame in ImageSequence.Iterator(image):
            current = frame.convert("RGBA")
            current.thumbnail((400, 400_000))
            frames.append(current.copy())
            durations.append(frame.info.get("duration", image.info.get("duration", 100)))

        if not frames:
            raise ValueError("GIF contains no frames")

        frames[0].save(
            output_path,
            save_all=True,
            append_images=frames[1:],
            duration=durations,
            loop=image.info.get("loop", 0),
            disposal=2,
        )


def _video_metadata(path: Path) -> MediaMetadata:
    result = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-select_streams",
            "v:0",
            "-show_entries",
            "stream=width,height:format=duration",
            "-of",
            "json",
            str(path),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    payload = json.loads(result.stdout)
    stream = payload["streams"][0]
    duration = payload.get("format", {}).get("duration")
    return MediaMetadata(
        width=int(stream["width"]),
        height=int(stream["height"]),
        duration=float(duration) if duration is not None else None,
    )


def _run_ffmpeg(command: list[str]) -> None:
    subprocess.run(command, check=True, capture_output=True, text=True)
