"""
MoM - Context Service
Handles AI context generation and 10-minute compaction
"""

import logging
import json
from datetime import datetime
from typing import Dict, List, Any
from schemas.contextCard import ContextCard, CreateContextCard

logger = logging.getLogger(__name__)

class ContextService:
    """Service untuk AI context generation dan management."""

    def __init__(self, ai_service):
        self.ai_service = ai_service

    async def generate_context_card(
        self, 
        transcript: str, 
        segment_index: int,
        time_range: Dict[str, str],
        user_context: str = ""
    ) -> ContextCard:
        """Generate context card dari transcript segment."""
        
        try:
            # Prepare prompt untuk context generation
            prompt = self._build_context_prompt(transcript, user_context)
            
            # Generate context menggunakan AI
            response = await self.ai_service.generate_response(prompt)
            
            # Parse response menjadi structured context
            context_data = self._parse_context_response(response)
            
            # Create context card
            context_card = CreateContextCard(
                segment_index=segment_index,
                topic=context_data.get("topic", ""),
                key_points=context_data.get("key_points", []),
                decisions=context_data.get("decisions", []),
                action_items=context_data.get("action_items", []),
                speakers=context_data.get("speakers", []),
                time_range=time_range,
                generated_at=datetime.utcnow().isoformat()
            )
            
            logger.info(f"[Context] Generated context card for segment {segment_index}")
            return ContextCard(**context_card.dict())
            
        except Exception as e:
            logger.error(f"[Context] Failed to generate context card: {e}")
            # Return basic context card sebagai fallback
            return ContextCard(
                segment_index=segment_index,
                topic="Context Generation Error",
                key_points=["Failed to generate context automatically"],
                decisions=[],
                action_items=[],
                speakers=["AI"],
                time_range=time_range,
                generated_at=datetime.utcnow().isoformat()
            )

    def _build_context_prompt(self, transcript: str, user_context: str) -> str:
        """Build prompt untuk context generation."""
        
        base_prompt = f"""
        Analisis transcript rapat berikut dan buat context summary dalam format JSON.

        User Context Tambahan: {user_context if user_context else "Tidak ada"}

        Transcript:
        {transcript}

        Return response dalam format JSON berikut:
        {{
            "topic": "Topik utama diskusi dalam segmen ini",
            "key_points": ["poin penting 1", "poin penting 2", "poin penting 3"],
            "decisions": ["keputusan 1", "keputusan 2"],
            "action_items": ["tindakan 1", "tindakan 2"],
            "speakers": ["pembicara 1", "pembicara 2"]
        }}

        Tone: Observational dan ringan, seperti "Menarik, di segmen ini diskusi mulai bergeser ke arah X..."
        """
        
        return base_prompt

    def _parse_context_response(self, response: str) -> Dict[str, Any]:
        """Parse AI response menjadi structured data."""
        
        try:
            # Try to parse as JSON
            if "{" in response and "}" in response:
                start = response.find("{")
                end = response.rfind("}") + 1
                json_str = response[start:end]
                return json.loads(json_str)
        except Exception as e:
            logger.warning(f"[Context] Failed to parse JSON response: {e}")
        
        # Fallback parsing
        return {
            "topic": "Context Summary",
            "key_points": [response[:200] + "..." if len(response) > 200 else response],
            "decisions": [],
            "action_items": [],
            "speakers": ["AI"]
        }

    def get_time_range_from_duration(self, duration_seconds: int, segment_index: int) -> Dict[str, str]:
        """Calculate time range untuk context card."""
        
        segment_duration = 10 * 60  # 10 minutes per segment
        start_min = segment_index * segment_duration // 60
        end_min = min((segment_index + 1) * segment_duration // 60, duration_seconds // 60)
        
        return {
            "start": f"{start_min:02d}:00",
            "end": f"{end_min:02d}:00"
        }

# Singleton
context_service = None

def init_context_service(ai_service):
    """Initialize context service."""
    global context_service
    context_service = ContextService(ai_service)
    return context_service
