"""
MoM AI Backend — FastAPI Engine
Refactored dari Cimeat → MoM (Minutes of Meeting) AI Assistant.

Endpoints:
  POST /mom/transcribe            — Audio → Text (Whisper + Diarization)
  POST /mom/process               — Transcript → Full MoM (CrewAI, non-streaming)
  POST /mom/process/stream        — Transcript → Full MoM (CrewAI, streaming)
  GET  /mom/history               — List semua meetings
  GET  /mom/{id}                  — Detail satu meeting
  PATCH /mom/{id}/status          — Update meeting status
  DELETE /mom/{id}                — Hapus meeting
  GET  /mom/{id}/export           — Download MoM (pdf|docx|txt|md)
  PATCH /action-items/{id}/status — Update status action item
"""

from fastapi import FastAPI, File, UploadFile, HTTPException, Form, Query
from fastapi.responses import StreamingResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from contextlib import asynccontextmanager
import os
import json
import logging
import asyncio
import tempfile
from pathlib import Path
from dotenv import load_dotenv

from services.ai_service import ai_service
from services.mom_service import mom_service
from services.database_service import database_service
from services.export_service import export_service
from services.diarization_service import diarization_service

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup dan shutdown."""
    # Startup
    await database_service.init()
    logger.info("[MoM] Backend started. Database initialized.")
    yield
    # Shutdown (jika ada cleanup)
    logger.info("[MoM] Backend shutting down.")


app = FastAPI(
    title="YOTA AI Engine",
    description="Intelligent AI-powered Minutes of Meeting Assistant",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ──────────────────────────────────────────────────────────────────────────────
# Health Check
# ──────────────────────────────────────────────────────────────────────────────
@app.get("/")
async def root():
    return {
        "status": "MoM AI running",
        "version": "1.0.0",
        "diarization_engine": diarization_service.engine,
        "ai_model": os.getenv("OPENAI_MODEL", "gpt-4.1-nano"),
    }


# ──────────────────────────────────────────────────────────────────────────────
# Request / Response Models
# ──────────────────────────────────────────────────────────────────────────────
class ProcessRequest(BaseModel):
    transcript: str
    language: str = "id"           # "id" or "en"
    participants: List[str] = []
    meeting_title: Optional[str] = None
    meeting_id: Optional[str] = None   # If provided, updates existing meeting
    duration_seconds: int = 0


class ActionItemStatusUpdate(BaseModel):
    status: str  # "pending" or "done"


class MeetingStatusUpdate(BaseModel):
    status: str  # "processing", "done", "error"


# ──────────────────────────────────────────────────────────────────────────────
# Global Status Bus for Real-time Feedback
# ──────────────────────────────────────────────────────────────────────────────
class StatusBus:
    def __init__(self):
        self.queues = {}

    def get_queue(self, task_id: str):
        if task_id not in self.queues:
            self.queues[task_id] = asyncio.Queue()
        return self.queues[task_id]

    async def push(self, task_id: str, data: dict):
        if task_id in self.queues:
            await self.queues[task_id].put(data)

    def remove(self, task_id: str):
        if task_id in self.queues:
            del self.queues[task_id]

status_bus = StatusBus()


# ──────────────────────────────────────────────────────────────────────────────
# POST /mom/transcribe — Audio → Text + Diarization
# ──────────────────────────────────────────────────────────────────────────────
@app.post("/mom/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(...),
    language: str = Form("id"),
    enable_diarization: bool = Form(True),
    task_id: Optional[str] = Form(None),
):
    """
    Terima file audio, jalankan Whisper STT dan (opsional) speaker diarization.
    """
    logger.info(f"[Transcribe] Audio: {audio.filename}, lang: {language}, diarization: {enable_diarization}, task_id: {task_id}")

    # Callback untuk progress
    async def on_progress(current, total, message):
        if task_id:
            await status_bus.push(task_id, {
                "current": current,
                "total": total,
                "message": message,
                "status": "transcribing"
            })

    try:
        if task_id:
            await status_bus.push(task_id, {"status": "upload_done", "message": "File diterima, memulai chunking..."})

        contents = await audio.read()
        if not contents:
            raise HTTPException(status_code=400, detail="File audio kosong")

        suffix = Path(audio.filename or "audio.webm").suffix or ".webm"
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(contents)
            tmp_path = Path(tmp.name)

        try:
            whisper_result = await ai_service.transcribe_audio_with_segments(
                contents, language=language, on_progress=on_progress
            )
            
            full_text = whisper_result.get("text", "")
            whisper_segments = whisper_result.get("segments", [])

            if task_id:
                await status_bus.push(task_id, {"status": "diarizing", "message": "Menganalisis suara pembicara..."})

            diarized_segments = []
            if enable_diarization and len(contents) > 1000:
                diar_raw = await diarization_service.diarize(str(tmp_path))
                diarized_segments = diarization_service.merge_transcript_with_diarization(
                    whisper_segments, diar_raw
                )
            else:
                diarized_segments = [{**s, "speaker": "SPEAKER_00"} for s in whisper_segments]

            if task_id:
                await status_bus.push(task_id, {"status": "done", "message": "Transkripsi selesai!"})

            return {
                "text": full_text,
                "segments": diarized_segments,
                "language": whisper_result.get("language", language),
                "duration_seconds": whisper_result.get("duration_seconds", 0),
                "diarization_engine": diarization_service.engine,
                "segment_count": len(diarized_segments),
            }

        finally:
            if tmp_path.exists():
                tmp_path.unlink()

    except Exception as e:
        logger.error(f"[Transcribe] Error: {e}")
        if task_id:
            await status_bus.push(task_id, {"status": "error", "message": str(e)})
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/mom/transcribe/stream/{task_id}")
async def transcribe_progress_stream(task_id: str):
    """SSE endpoint untuk memantau progress transkripsi."""
    async def event_generator():
        queue = status_bus.get_queue(task_id)
        try:
            while True:
                data = await queue.get()
                yield f"data: {json.dumps(data)}\n\n"
                if data.get("status") in ["done", "error"]:
                    break
        finally:
            status_bus.remove(task_id)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


# ──────────────────────────────────────────────────────────────────────────────
# POST /mom/process — Transcript → MoM (Non-streaming)
# ──────────────────────────────────────────────────────────────────────────────
@app.post("/mom/process")
async def process_transcript(data: ProcessRequest):
    """
    Proses transcript menjadi Minutes of Meeting menggunakan CrewAI.
    Non-streaming — tunggu hingga selesai (~30-60 detik).
    
    Returns full MoM document, action items, dan simpan ke database.
    """
    logger.info(f"[Process] lang={data.language}, participants={data.participants}")

    try:
        # Infer title jika tidak ada
        title = data.meeting_title or mom_service.infer_meeting_title(data.transcript, data.language)

        # Buat atau update meeting di database
        if data.meeting_id:
            meeting_id = data.meeting_id
            await database_service.update_meeting(meeting_id, status="processing", title=title)
        else:
            meeting_id = await database_service.create_meeting(
                title=title,
                language=data.language,
                participants=data.participants,
                duration_seconds=data.duration_seconds,
            )

        # Simpan raw transcript
        await database_service.update_meeting(
            meeting_id, raw_transcript=data.transcript
        )

        # Jalankan CrewAI pipeline
        result = await mom_service.process_transcript(
            transcript=data.transcript,
            language=data.language,
            participants=data.participants,
            meeting_title=title,
        )

        mom_document = result.get("content", "")
        action_items = result.get("action_items", [])
        clean_transcript = result.get("clean_transcript", "")

        # Simpan hasilnya ke DB
        await database_service.update_meeting(
            meeting_id,
            mom_document=mom_document,
            clean_transcript=clean_transcript,
            action_items=action_items,
            participants=data.participants,
            duration_seconds=data.duration_seconds,
            status="done",
        )

        # Simpan action items ke tabel action_items
        if action_items:
            await database_service.upsert_action_items(meeting_id, action_items)

        meeting = await database_service.get_meeting(meeting_id)

        return {
            "meeting_id": meeting_id,
            "title": title,
            "mom_document": mom_document,
            "action_items": action_items,
            "clean_transcript": clean_transcript,
            "status": "done",
        }

    except Exception as e:
        logger.error(f"[Process] Error: {e}")
        if 'meeting_id' in locals():
            await database_service.update_meeting(meeting_id, status="error")
        raise HTTPException(status_code=500, detail=str(e))


# ──────────────────────────────────────────────────────────────────────────────
# POST /mom/process/stream — Transcript → MoM (Streaming SSE)
# ──────────────────────────────────────────────────────────────────────────────
@app.post("/mom/process/stream")
async def process_transcript_stream(data: ProcessRequest):
    """
    Streaming version dari /mom/process.
    Menggunakan Server-Sent Events (SSE) format.
    
    Stream: JSON objects dengan format {stage, content}
      stages: cleaning → cleaning_done → analyzing → analyzing_done 
              → extracting → extracting_done → writing → done | error
    
    Pada stage 'done': content = full MoM document, action_items = list
    """
    title = data.meeting_title or await mom_service.infer_meeting_title(data.transcript, data.language)

    # Buat meeting di DB
    if data.meeting_id:
        meeting_id = data.meeting_id
        await database_service.update_meeting(meeting_id, status="processing", title=title)
    else:
        meeting_id = await database_service.create_meeting(
            title=title,
            language=data.language,
            participants=data.participants,
            duration_seconds=data.duration_seconds,
        )

    await database_service.update_meeting(meeting_id, raw_transcript=data.transcript)

    async def stream_generator():
        # Kirim meeting_id dulu supaya frontend bisa track
        yield f"data: {json.dumps({'stage': 'init', 'meeting_id': meeting_id, 'title': title})}\n\n"
        await asyncio.sleep(0.1)

        mom_document = ""
        action_items = []
        clean_transcript = ""

        async for chunk in mom_service.process_transcript_stream(
            transcript=data.transcript,
            language=data.language,
            participants=data.participants,
            meeting_title=title,
        ):
            yield f"data: {chunk}\n\n"
            await asyncio.sleep(0.05)

            # Tangkap final result untuk disimpan ke DB
            try:
                parsed = json.loads(chunk)
                if parsed.get("stage") == "done":
                    mom_document = parsed.get("content", "")
                    action_items = parsed.get("action_items", [])
                    clean_transcript = parsed.get("clean_transcript", "")
                elif parsed.get("stage") == "error":
                    await database_service.update_meeting(meeting_id, status="error")
                    return
            except json.JSONDecodeError:
                pass

        # Simpan ke database setelah selesai
        await database_service.update_meeting(
            meeting_id,
            mom_document=mom_document,
            clean_transcript=clean_transcript,
            action_items=action_items,
            participants=data.participants,
            duration_seconds=data.duration_seconds,
            status="done",
        )
        if action_items:
            await database_service.upsert_action_items(meeting_id, action_items)

        yield f"data: {json.dumps({'stage': 'saved', 'meeting_id': meeting_id})}\n\n"

    return StreamingResponse(
        stream_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        }
    )


# ──────────────────────────────────────────────────────────────────────────────
# GET /mom/history — List Meetings
# ──────────────────────────────────────────────────────────────────────────────
@app.get("/mom/history")
async def list_meetings(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    search: str = Query(""),
):
    """List semua meetings dari database, paling baru di atas."""
    meetings = await database_service.list_meetings(limit=limit, offset=offset, search=search)
    return {"meetings": meetings, "count": len(meetings)}


# ──────────────────────────────────────────────────────────────────────────────
# GET /mom/{meeting_id}/retry/stream — Retry failed MoM process
# ──────────────────────────────────────────────────────────────────────────────
@app.get("/mom/{meeting_id}/retry/stream")
async def retry_meeting_stream(meeting_id: str):
    """Refetch meeting dan jalankan ulang pipeline stream MoM."""
    logger.info(f"[Retry] Triggered for meeting: {meeting_id}")
    meeting = await database_service.get_meeting(meeting_id)
    if not meeting:
        logger.error(f"[Retry] Meeting {meeting_id} not found")
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    # Ambil raw transcript
    transcript = meeting.get("raw_transcript") or ""
    language = meeting.get("language", "id")
    participants = meeting.get("participants", [])
    title = meeting.get("title", "Retried Meeting")

    async def retry_generator():
       # Send init first to establish connection
       yield f"data: {json.dumps({'stage': 'init', 'meeting_id': meeting_id, 'title': title})}\n\n"
       await asyncio.sleep(0.1)
       
       # Update status ke processing
       await database_service.update_meeting(meeting_id, status="processing")
       
       mom_document = ""
       action_items = []
       clean_transcript = ""

       async for chunk in mom_service.process_transcript_stream(transcript, language, participants, title):
           yield f"data: {chunk}\n\n"
           await asyncio.sleep(0.05)
           
           try:
                parsed = json.loads(chunk)
                if parsed.get("stage") == "done":
                    mom_document = parsed.get("content", "")
                    action_items = parsed.get("action_items", [])
                    clean_transcript = parsed.get("clean_transcript", "")
                elif parsed.get("stage") == "error":
                    await database_service.update_meeting(meeting_id, status="error")
                    return
           except json.JSONDecodeError:
                pass

       # Simpan ke database setelah selesai
       await database_service.update_meeting(
           meeting_id,
           mom_document=mom_document,
           clean_transcript=clean_transcript,
           action_items=action_items,
           status="done"
       )
       
       # Sync action items ke tabel detail (supaya ID sinkron)
       if action_items:
           await database_service.upsert_action_items(meeting_id, action_items)

       yield f"data: {json.dumps({'stage': 'saved', 'meeting_id': meeting_id})}\n\n"

    # Jalankan ulang
    return StreamingResponse(
        retry_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        }
    )


# ──────────────────────────────────────────────────────────────────────────────
# GET /mom/{meeting_id} — Detail Meeting
# ──────────────────────────────────────────────────────────────────────────────
@app.get("/mom/{meeting_id}")
async def get_meeting(meeting_id: str):
    """Ambil detail lengkap sebuah meeting termasuk MoM document dan action items."""
    meeting = await database_service.get_meeting(meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting tidak ditemukan")

    # Ambil action items yang up-to-date dari tabel action_items
    action_items = await database_service.get_action_items(meeting_id)
    meeting["action_items_detail"] = action_items

    return meeting


# ──────────────────────────────────────────────────────────────────────────────
# DELETE /mom/{meeting_id} — Hapus Meeting
# ──────────────────────────────────────────────────────────────────────────────
@app.delete("/mom/{meeting_id}")
async def delete_meeting(meeting_id: str):
    """Hapus meeting dan semua action items-nya dari database."""
    meeting = await database_service.get_meeting(meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting tidak ditemukan")

    await database_service.delete_meeting(meeting_id)
    return {"success": True, "message": f"Meeting '{meeting['title']}' berhasil dihapus"}


# ──────────────────────────────────────────────────────────────────────────────
# PATCH /mom/{meeting_id}/status — Update Meeting Status
# ──────────────────────────────────────────────────────────────────────────────
@app.patch("/mom/{meeting_id}/status")
async def update_meeting_status(meeting_id: str, data: MeetingStatusUpdate):
    """Update status meeting (processing / done / error)."""
    await database_service.update_meeting(meeting_id, status=data.status)
    return {"success": True}


# ──────────────────────────────────────────────────────────────────────────────
# GET /mom/{meeting_id}/export — Export MoM Document
# ──────────────────────────────────────────────────────────────────────────────
@app.get("/mom/{meeting_id}/export")
async def export_meeting(
    meeting_id: str,
    format: str = Query("pdf", pattern="^(pdf|docx|txt|md|raw)$"),
):
    """
    Export MoM sebagai file yang bisa didownload.
    Format: pdf | docx | txt | md | raw
    """
    meeting = await database_service.get_meeting(meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting tidak ditemukan")

    if not meeting.get("mom_document"):
        raise HTTPException(status_code=400, detail="MoM document belum tersedia — proses meeting terlebih dahulu")

    try:
        # Ambil action items terbaru dari DB
        meeting["action_items"] = await database_service.get_action_items(meeting_id)

        content_bytes, media_type, filename = export_service.export(meeting, format)

        return Response(
            content=content_bytes,
            media_type=media_type,
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"[Export] Error: {e}")
        raise HTTPException(status_code=500, detail=f"Export gagal: {str(e)}")


# ──────────────────────────────────────────────────────────────────────────────
# PATCH /action-items/{item_id}/status — Update Action Item Status
# ──────────────────────────────────────────────────────────────────────────────
@app.patch("/action-items/{item_id}/status")
async def update_action_item(item_id: str, data: ActionItemStatusUpdate):
    """Toggle status action item antara 'pending' dan 'done'."""
    if data.status not in ("pending", "done"):
        raise HTTPException(status_code=400, detail="Status harus 'pending' atau 'done'")

    await database_service.update_action_item_status(item_id, data.status)
    return {"success": True, "item_id": item_id, "status": data.status}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000)
