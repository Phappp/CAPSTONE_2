from __future__ import annotations

import os
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

# Load .env from parent directories (backend folder)
_current_dir = Path(__file__).resolve().parent
_backend_dir = _current_dir.parent.parent  # youtube_stt_service -> tools -> backend
_env_file = _backend_dir / ".env"
if _env_file.exists():
    load_dotenv(_env_file)

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from faster_whisper import WhisperModel


MODEL_NAME = os.getenv("YOUTUBE_STT_MODEL", "large-v3")
COMPUTE_TYPE = os.getenv("YOUTUBE_STT_COMPUTE_TYPE", "int8")
DEVICE = os.getenv("YOUTUBE_STT_DEVICE", "cpu")

app = FastAPI(title="youtube-stt-service")
_model: WhisperModel | None = None


@app.on_event("startup")
async def startup_event():
    """Pre-load Whisper model when service starts to avoid cold-start delay."""
    print(f"Loading Whisper model '{MODEL_NAME}' on startup...")
    get_model()
    print(f"Whisper model '{MODEL_NAME}' loaded successfully!")


def get_model() -> WhisperModel:
    global _model
    if _model is None:
        _model = WhisperModel(MODEL_NAME, device=DEVICE, compute_type=COMPUTE_TYPE)
    return _model


class TranscribeRequest(BaseModel):
    youtube_url: str | None = None
    video_url: str | None = None  # Direct video URL (e.g., Cloudinary)
    video_id: str | None = None
    model: str | None = None
    language: str | None = None
    task: str | None = "transcribe"


def download_audio(youtube_url: str) -> str:
    temp_dir = tempfile.mkdtemp(prefix="ytstt_")
    output_tpl = os.path.join(temp_dir, "audio.%(ext)s")
    cmd = [
        "yt-dlp",
        "--no-playlist",
        "-f",
        "bestaudio/best",
        "--extract-audio",
        "--audio-format",
        "mp3",
        "-o",
        output_tpl,
        youtube_url,
    ]
    try:
        subprocess.run(cmd, capture_output=True, text=True, check=True)
    except subprocess.CalledProcessError as exc:
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise RuntimeError(exc.stderr or exc.stdout or "yt-dlp failed") from exc
    audio_path = os.path.join(temp_dir, "audio.mp3")
    if not os.path.exists(audio_path):
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise RuntimeError("yt-dlp did not produce audio.mp3")
    return audio_path


def download_video(url: str) -> tuple[str, str]:
    """Download direct video URL to temp file. Returns (file_path, temp_dir)."""
    import requests
    temp_dir = tempfile.mkdtemp(prefix="vidstt_")
    output_path = os.path.join(temp_dir, "video")
    cmd = [
        "yt-dlp",
        "--no-playlist",
        "-o",
        output_path + ".%(ext)s",
        url,
    ]
    try:
        subprocess.run(cmd, capture_output=True, text=True, check=True)
    except subprocess.CalledProcessError as exc:
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise RuntimeError(exc.stderr or exc.stdout or "yt-dlp failed for video URL") from exc
    # Find the downloaded file
    for ext in ["mp4", "mkv", "webm", "avi", "mov"]:
        potential_path = output_path + "." + ext
        if os.path.exists(potential_path):
            return potential_path, temp_dir
    # Fallback: find any video file in temp dir
    for f in os.listdir(temp_dir):
        if f.startswith("video."):
            return os.path.join(temp_dir, f), temp_dir
    shutil.rmtree(temp_dir, ignore_errors=True)
    raise RuntimeError("yt-dlp did not produce a video file")


@app.get("/health")
def health() -> dict[str, Any]:
    return {"ok": True, "model": MODEL_NAME, "device": DEVICE}


@app.post("/transcribe")
def transcribe(req: TranscribeRequest) -> dict[str, Any]:
    print(f"[transcribe] START - youtube={bool(req.youtube_url)} video={bool(req.video_url)} model={req.model or MODEL_NAME} lang={req.language or 'vi'}")

    youtube_url = (req.youtube_url or "").strip()
    video_url = (req.video_url or "").strip()

    if not youtube_url and not video_url:
        raise HTTPException(status_code=400, detail="Either youtube_url or video_url is required")

    audio_path: str | None = None
    video_path: str | None = None
    temp_dir: str | None = None
    try:
        if youtube_url:
            print(f"[transcribe] Downloading YouTube audio: {youtube_url[:80]}...")
            audio_path = download_audio(youtube_url)
            temp_dir = os.path.dirname(audio_path)
            print(f"[transcribe] Download complete: {audio_path}")
        elif video_url:
            print(f"[transcribe] Downloading video: {video_url[:80]}...")
            video_path, temp_dir = download_video(video_url)
            print(f"[transcribe] Video downloaded: {video_path}")
            # Convert video to audio for whisper
            import subprocess as sp
            audio_path = os.path.join(temp_dir, "audio.mp3")
            print(f"[transcribe] Converting video to audio (ffmpeg)...")
            result = sp.run([
                "ffmpeg", "-y", "-i", video_path,
                "-vn", "-acodec", "libmp3lame", "-ab", "192k",
                audio_path
            ], capture_output=True, text=True)
            if result.returncode != 0:
                raise RuntimeError(f"ffmpeg failed: {result.stderr}")
            print(f"[transcribe] Audio conversion complete: {audio_path}")

        if not audio_path or not os.path.exists(audio_path):
            raise RuntimeError("No audio file available for transcription")

        model = get_model()
        lang = req.language or "vi"
        print(f"[transcribe] Starting Whisper transcription (model={MODEL_NAME}, lang={lang}, device={DEVICE})...")
        import time
        t0 = time.time()
        segments, info = model.transcribe(
            audio_path,
            language=lang,
            task=(req.task or "transcribe"),
            vad_filter=True,
        )
        rows: list[dict[str, Any]] = []
        for s in segments:
            text = (s.text or "").strip()
            if not text:
                continue
            rows.append(
                {
                    "start_sec": float(s.start),
                    "end_sec": float(s.end),
                    "text": text,
                }
            )
        elapsed = time.time() - t0
        print(f"[transcribe] Transcription done in {elapsed:.1f}s, {len(rows)} segments")
        if not rows:
            raise RuntimeError("No transcript segments generated")
        return {
            "provider": "faster-whisper",
            "language": getattr(info, "language", None),
            "duration_sec": float(rows[-1]["end_sec"]) if rows else None,
            "segments": rows,
        }
    except HTTPException:
        raise
    except Exception as exc:
        print(f"[transcribe] ERROR: {exc}")
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        if temp_dir:
            print(f"[transcribe] Cleaning up temp dir: {temp_dir}")
            shutil.rmtree(temp_dir, ignore_errors=True)
        print(f"[transcribe] END")
