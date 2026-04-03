"""
MoM - AI Service (Refactored dari Cimeat)
Hanya mempertahankan fungsi Whisper transcription dengan tambahan segment timestamps.
"""

import os
import json
import tempfile
import logging
from pathlib import Path
from dotenv import load_dotenv
from openai import AsyncOpenAI

load_dotenv()
logger = logging.getLogger(__name__)


class AIService:
    """OpenAI wrapper untuk transcription (Whisper) dan language operations."""

    def __init__(self):
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        self.openai_model = os.getenv("OPENAI_MODEL", "gpt-4.1-nano")
        self.client = AsyncOpenAI(api_key=self.openai_api_key)
        logger.info(f"[AIService] Model: {self.openai_model}")

    async def transcribe_audio(self, audio_bytes: bytes, language: str = "id") -> str:
        """
        Transcribe audio menggunakan OpenAI Whisper.
        Returns: full transcript string
        """
        return (await self.transcribe_audio_with_segments(audio_bytes, language)).get("text", "")

    async def transcribe_audio_with_segments(
        self, audio_bytes: bytes, language: str = "id", on_progress: callable = None
    ) -> dict:
        """
        Transcribe audio dengan timestamp segments menggunakan Whisper.
        
        on_progress(current_chunk, total_chunks, stage_message)
        """
        # Save temp file
        with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = Path(tmp.name)

        try:
            from pydub import AudioSegment
            if on_progress:
                await on_progress(0, 0, "Loading audio...")
            audio = AudioSegment.from_file(str(tmp_path))
            duration_ms = len(audio)
            CHUNK_SIZE_MS = 25 * 60 * 1000  # 25 minutes
            
            chunks = []
            for i in range(0, duration_ms, CHUNK_SIZE_MS):
                chunks.append(audio[i:i + CHUNK_SIZE_MS])
                
            total_chunks = len(chunks)
            logger.info(f"[Whisper] Total {total_chunks} chunks to process.")
            
            all_text = ""
            all_segments = []
            detected_language = language
            
            for index, chunk in enumerate(chunks):
                current_chunk = index + 1
                logger.info(f"[Whisper] Transcribing chunk {current_chunk}/{total_chunks}...")
                if on_progress:
                    await on_progress(current_chunk, total_chunks, f"Sedang memproses potongan {current_chunk}/{total_chunks}...")
                
                with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as chunk_tmp:
                    chunk.export(chunk_tmp.name, format="mp3")
                    chunk_path = Path(chunk_tmp.name)
                
                try:
                    with open(chunk_path, "rb") as audio_file:
                        transcript = await self.client.audio.transcriptions.create(
                            model="whisper-1",
                            file=audio_file,
                            language=language if language != "auto" else None,
                            response_format="verbose_json",
                            timestamp_granularities=["segment"],
                        )
                        
                    time_offset = (index * CHUNK_SIZE_MS) / 1000.0
                    
                    if hasattr(transcript, "segments") and transcript.segments:
                        for seg in transcript.segments:
                            s_val = seg.start
                            e_val = seg.end
                            t_val = seg.text
                            
                            all_segments.append({
                                "start": round(float(getattr(seg, "start", 0)) + time_offset, 2),
                                "end": round(float(getattr(seg, "end", 0)) + time_offset, 2),
                                "text": str(getattr(seg, "text", "")).strip(),
                            })
                            
                    full_text = transcript.text if hasattr(transcript, "text") else ""
                    all_text += full_text + " "
                    
                    if index == 0:
                        detected_language = getattr(transcript, "language", language)
                finally:
                    if chunk_path.exists():
                        chunk_path.unlink()

            logger.info(f"[Whisper] Done all chunks: {len(all_text)} chars, {len(all_segments)} segments")
            return {
                "text": all_text.strip(),
                "segments": all_segments,
                "language": detected_language,
                "duration_seconds": round(duration_ms / 1000.0, 2)
            }

        except Exception as e:
            logger.error(f"[Whisper] Error: {e}")
            raise
        finally:
            if tmp_path.exists():
                tmp_path.unlink()


# Singleton
ai_service = AIService()
