import os
import tempfile
import logging
import asyncio
import whisper
import torch
from pathlib import Path
from dotenv import load_dotenv

from openai import OpenAI

load_dotenv()
logger = logging.getLogger(__name__)


class AIService:
    """Whisper Transcription Service (Supports Local & OpenAI Cloud)."""

    def __init__(self):
        self.mode = os.getenv("WHISPER_MODE", "local").lower() # 'local' or 'cloud'
        self.model_name = os.getenv("WHISPER_MODEL", "turbo")
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        
        # Initialize OpenAI client regardless (for MoM processing)
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
        self.local_model = None
        if self.mode == "local":
            logger.info(f"[AIService] Mode: LOCAL. Loading Whisper '{self.model_name}' on {self.device}...")
            self.local_model = whisper.load_model(self.model_name, device=self.device)
            logger.info(f"[AIService] Local Whisper loaded.")
        else:
            logger.info(f"[AIService] Mode: CLOUD (OpenAI Whisper-1). Local model skipped.")

    async def transcribe_audio(self, audio_bytes: bytes, language: str = "id") -> str:
        """
        Transcribe audio using local Whisper.
        Returns: full transcript string
        """
        result = await self.transcribe_audio_with_segments(audio_bytes, language)
        return result.get("text", "")

    async def transcribe_audio_with_segments(
        self, audio_bytes: bytes, language: str = "id", on_progress: callable = None, stop_event: asyncio.Event = None
    ) -> dict:
        """
        Transcribe audio dengan timestamp segments menggunakan local Whisper v3.
        Mencicil transkripsi per potongan (chunking) untuk progres yang akurat.
        """
        from pydub import AudioSegment
        
        # Save temp file
        with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = Path(tmp.name)

        try:
            if on_progress:
                await on_progress(None, None, "Memuat file audio...")

            loop = asyncio.get_event_loop()
            audio = await loop.run_in_executor(None, lambda: AudioSegment.from_file(str(tmp_path)))
            duration_ms = len(audio)
            
            # Use smaller chunks (10 mins) to provide a better "AutoCompact" like experience
            # where the user sees progress and the context is managed incrementally.
            CHUNK_SIZE_MS = 10 * 60 * 1000 
            
            chunks = []
            for i in range(0, duration_ms, CHUNK_SIZE_MS):
                chunks.append(audio[i:i + CHUNK_SIZE_MS])
                
            total_chunks = len(chunks)
            logger.info(f"[Whisper] Total {total_chunks} chunks to process locally.")
            
            all_text = ""
            all_segments = []
            detected_language = language
            
            loop = asyncio.get_event_loop()
            
            for index, chunk in enumerate(chunks):
                if stop_event and stop_event.is_set():
                    logger.warning(f"[Whisper] Task cancelled at chunk {index+1}")
                    raise asyncio.CancelledError("User cancelled task")

                current_chunk = index + 1
                suffix = ".mp3" if self.mode == "cloud" else ".wav"
                logger.info(f"[Whisper:{self.mode}] Transcribing chunk {current_chunk}/{total_chunks} (using {suffix})...")
                
                if on_progress:
                    await on_progress(current_chunk, total_chunks, f"Transkripsi bagian {current_chunk}/{total_chunks}...")
                
                with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as chunk_tmp:
                    if self.mode == "cloud":
                        # Kecilkan ukuran biar muat di limit 25MB OpenAI
                        chunk.export(chunk_tmp.name, format="mp3", bitrate="128k")
                    else:
                        chunk.export(chunk_tmp.name, format="wav")
                    chunk_path = Path(chunk_tmp.name)
                
                try:
                    time_offset = (index * CHUNK_SIZE_MS) / 1000.0
                    
                    if self.mode == "cloud":
                        # CLOUD (OpenAI API)
                        with open(str(chunk_path), "rb") as audio_file:
                            response = self.client.audio.transcriptions.create(
                                model="whisper-1",
                                file=audio_file,
                                language=language if language != "auto" else None,
                                response_format="verbose_json"
                            )
                        
                        chunk_text = response.text or ""
                        all_text += chunk_text + " "
                        
                        # Add segments with adjusted time (offset)
                        resp_dict = response.model_dump() # Pydantic v2 to dict
                        for seg in resp_dict.get('segments', []):
                            all_segments.append({
                                "start": round(seg['start'] + time_offset, 2),
                                "end": round(seg['end'] + time_offset, 2),
                                "text": seg['text'].strip(),
                            })
                    else:
                        # LOCAL (Whisper Original)
                        transcription_options = {
                            "language": language if language != "auto" else None,
                            "task": "transcribe",
                            "verbose": False,
                        }
                        
                        result = await loop.run_in_executor(
                            None, 
                            lambda: self.local_model.transcribe(str(chunk_path), **transcription_options)
                        )
                        
                        chunk_text = result.get("text", "").strip()
                        all_text += chunk_text + " "
                        
                        for seg in result.get("segments", []):
                            all_segments.append({
                                "start": round(float(seg.get("start", 0)) + time_offset, 2),
                                "end": round(float(seg.get("end", 0)) + time_offset, 2),
                                "text": str(seg.get("text", "")).strip(),
                            })
                            
                    if index == 0 and self.mode == "local" and 'result' in locals():
                        detected_language = result.get("language", language)
                        
                finally:
                    if chunk_path.exists():
                        chunk_path.unlink()

            logger.info(f"[Whisper:{self.mode}] Done all {total_chunks} chunks: {len(all_text)} chars")
            
            return {
                "text": all_text.strip(),
                "segments": all_segments,
                "language": detected_language,
                "duration_seconds": round(duration_ms / 1000.0, 2)
            }

        except Exception as e:
            logger.error(f"[Whisper] Local transcription error: {e}")
            raise
        finally:
            if tmp_path.exists():
                tmp_path.unlink()


# Singleton
ai_service = AIService()
