"""
MoM - Context Service
Handles AI context generation per 2/10-minute segments during live meeting.
Uses CrewAI LLM (same pattern as MomService) — no max_tokens issues.
"""

import os
import logging
from datetime import datetime
from typing import Dict
from schemas.contextCard import ContextCard, CreateContextCard, TimeRange

logger = logging.getLogger(__name__)

class ContextService:
    """Service untuk AI context generation selama live meeting."""

    def __init__(self, ai_service):
        # ai_service disimpan untuk referensi, tapi kita pakai CrewAI LLM untuk generate
        self.ai_service = ai_service
        self.model = os.getenv("OPENAI_MODEL", "gpt-4.1-nano")
        self.api_key = os.getenv("OPENAI_API_KEY")

    def _get_llm(self):
        """Get CrewAI LLM instance — same pattern as MomService."""
        from crewai import LLM
        return LLM(
            model=f"openai/{self.model}",
            api_key=self.api_key,
            temperature=0.4,
        )

    async def generate_context_card(
        self,
        transcript: str,
        segment_index: int,
        time_range: Dict[str, str],
        user_context: str = ""
    ) -> ContextCard:
        """Generate context card dari transcript segment menggunakan CrewAI LLM."""

        import asyncio

        start_min = time_range.get("start", f"{segment_index * 10:02d}:00")
        end_min = time_range.get("end", f"{(segment_index + 1) * 10:02d}:00")

        user_ctx_line = f"\nKonteks tambahan dari user: {user_context}" if user_context else ""

        prompt = f"""Kamu adalah asisten notulensi AI yang memantau rapat secara live.
Berikut adalah transkrip dari segmen rapat ({start_min} - {end_min}):{user_ctx_line}

---
{transcript[-3000:]}
---

Buat ringkasan observasional singkat (3-5 kalimat) dari segmen ini dalam Bahasa Indonesia.
Tulis seperti catatan cepat seorang notulis yang mengamati jalannya rapat — natural, informatif, dan to the point.
Mulai dengan "Di segmen ini..." atau "Pada bagian ini...".
Jangan gunakan format bullet atau JSON. Cukup paragraf narasi singkat."""

        try:
            llm = self._get_llm()
            loop = asyncio.get_event_loop()

            def _call():
                return llm.call([{"role": "user", "content": prompt}])

            narrative = await loop.run_in_executor(None, _call)
            narrative = str(narrative).strip()

            logger.info(f"[Context] Segment {segment_index} generated: {len(narrative)} chars")

            return ContextCard(
                segment_index=segment_index,
                topic=f"Segmen {segment_index + 1} ({start_min} - {end_min})",
                key_points=[narrative],
                decisions=[],
                action_items=[],
                speakers=[],
                time_range=TimeRange(start=start_min, end=end_min),
                generated_at=datetime.utcnow().isoformat()
            )

        except Exception as e:
            logger.error(f"[Context] Failed to generate context card: {e}")
            return ContextCard(
                segment_index=segment_index,
                topic=f"Segmen {segment_index + 1}",
                key_points=["Gagal menghasilkan ringkasan otomatis untuk segmen ini."],
                decisions=[],
                action_items=[],
                speakers=[],
                time_range=TimeRange(
                    start=time_range.get("start", "00:00"),
                    end=time_range.get("end", "00:00")
                ),
                generated_at=datetime.utcnow().isoformat()
            )


# Singleton
context_service = None

def init_context_service(ai_service):
    """Initialize context service."""
    global context_service
    context_service = ContextService(ai_service)
    return context_service
