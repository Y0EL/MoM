"""
Shared Context Card Schema for backend validation
Mirrors the frontend Zod schema structure
"""

from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class TimeRange(BaseModel):
    start: str
    end: str

class ContextCard(BaseModel):
    id: Optional[str] = None
    meeting_id: Optional[str] = None
    segment_index: int
    topic: Optional[str] = None
    key_points: List[str] = []
    decisions: List[str] = []
    action_items: List[str] = []
    speakers: List[str] = []
    time_range: TimeRange
    generated_at: str  # ISO timestamp

class CreateContextCard(BaseModel):
    segment_index: int
    topic: Optional[str] = None
    key_points: List[str] = []
    decisions: List[str] = []
    action_items: List[str] = []
    speakers: List[str] = []
    time_range: TimeRange
