"""
MoM - Database Service
SQLite async dengan aiosqlite untuk penyimpanan meetings, action items, dan participants.
"""

import aiosqlite
import os
import json
import uuid
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

DB_PATH = os.getenv("MOM_DB_PATH", str(Path(__file__).parent.parent / "mom.db"))


class DatabaseService:
    """Service untuk CRUD operations pada SQLite database MoM."""

    def __init__(self):
        self.db_path = DB_PATH

    async def init(self):
        """Inisialisasi database dan buat tabel jika belum ada."""
        async with aiosqlite.connect(self.db_path) as db:
            await db.executescript("""
                CREATE TABLE IF NOT EXISTS meetings (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    date TEXT NOT NULL,
                    duration_seconds INTEGER DEFAULT 0,
                    participants TEXT DEFAULT '[]',
                    raw_transcript TEXT DEFAULT '',
                    clean_transcript TEXT DEFAULT '',
                    mom_document TEXT DEFAULT '',
                    action_items TEXT DEFAULT '[]',
                    diarization_segments TEXT DEFAULT '[]',
                    language TEXT DEFAULT 'id',
                    status TEXT DEFAULT 'processing',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS action_items (
                    id TEXT PRIMARY KEY,
                    meeting_id TEXT NOT NULL,
                    task TEXT NOT NULL,
                    pic TEXT DEFAULT '',
                    deadline TEXT DEFAULT '',
                    priority TEXT DEFAULT 'medium',
                    status TEXT DEFAULT 'pending',
                    notes TEXT DEFAULT '',
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
                );

                CREATE INDEX IF NOT EXISTS idx_meetings_date ON meetings(date);
                CREATE INDEX IF NOT EXISTS idx_action_items_meeting ON action_items(meeting_id);
                CREATE INDEX IF NOT EXISTS idx_action_items_status ON action_items(status);
            """)
            await db.commit()
        logger.info(f"[DB] Database initialized: {self.db_path}")

    async def create_meeting(
        self,
        title: str,
        language: str = "id",
        participants: list = None,
        duration_seconds: int = 0,
    ) -> str:
        """Buat meeting baru dan return ID-nya."""
        meeting_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()

        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """INSERT INTO meetings 
                   (id, title, date, duration_seconds, participants, language, status, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, 'processing', ?, ?)""",
                (
                    meeting_id,
                    title,
                    now,
                    duration_seconds,
                    json.dumps(participants or []),
                    language,
                    now,
                    now,
                ),
            )
            await db.commit()

        logger.info(f"[DB] Meeting created: {meeting_id} — '{title}'")
        return meeting_id

    async def update_meeting(self, meeting_id: str, **fields) -> bool:
        """Update field-field tertentu dari sebuah meeting."""
        if not fields:
            return False

        now = datetime.utcnow().isoformat()
        fields["updated_at"] = now

        # Serialize list/dict fields ke JSON
        for key in ["participants", "action_items", "diarization_segments"]:
            if key in fields and isinstance(fields[key], (list, dict)):
                fields[key] = json.dumps(fields[key])

        set_clause = ", ".join([f"{k} = ?" for k in fields.keys()])
        values = list(fields.values()) + [meeting_id]

        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                f"UPDATE meetings SET {set_clause} WHERE id = ?", values
            )
            await db.commit()

        return True

    async def get_meeting(self, meeting_id: str) -> Optional[dict]:
        """Ambil satu meeting berdasarkan ID."""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                "SELECT * FROM meetings WHERE id = ?", (meeting_id,)
            ) as cursor:
                row = await cursor.fetchone()
                if not row:
                    return None
                return self._parse_meeting_row(dict(row))

    async def list_meetings(self, limit: int = 50, offset: int = 0, search: str = "") -> list[dict]:
        """List semua meetings, optional search by title."""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            if search:
                query = """SELECT id, title, date, duration_seconds, participants, 
                           language, status, created_at, action_items
                           FROM meetings WHERE title LIKE ? 
                           ORDER BY date DESC LIMIT ? OFFSET ?"""
                params = (f"%{search}%", limit, offset)
            else:
                query = """SELECT id, title, date, duration_seconds, participants, 
                           language, status, created_at, action_items
                           FROM meetings ORDER BY date DESC LIMIT ? OFFSET ?"""
                params = (limit, offset)

            async with db.execute(query, params) as cursor:
                rows = await cursor.fetchall()
                return [self._parse_meeting_row(dict(row), summary=True) for row in rows]

    async def delete_meeting(self, meeting_id: str) -> bool:
        """Hapus meeting beserta action items-nya."""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("DELETE FROM meetings WHERE id = ?", (meeting_id,))
            await db.commit()
        logger.info(f"[DB] Meeting deleted: {meeting_id}")
        return True

    async def upsert_action_items(self, meeting_id: str, items: list[dict]) -> list[str]:
        """
        Insert atau update action items untuk sebuah meeting.
        Returns list of IDs.
        """
        now = datetime.utcnow().isoformat()
        ids = []

        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            updated_items = []
            for item in items:
                item_id = item.get("id") or str(uuid.uuid4())
                await db.execute(
                    """INSERT OR REPLACE INTO action_items 
                       (id, meeting_id, task, pic, deadline, priority, status, notes, created_at)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (item_id, meeting_id, item.get("task", ""), item.get("pic", ""), item.get("deadline", ""),
                     item.get("priority", "medium"), item.get("status", "pending"), item.get("notes", ""), now),
                )
                ids.append(item_id)
                # Keep track for meetings update
                updated_items.append({**item, "id": item_id})
            
            # Sync back to meetings table so history list has IDs
            await db.execute(
                "UPDATE meetings SET action_items = ? WHERE id = ?",
                (json.dumps(updated_items), meeting_id)
            )
            await db.commit()
        return ids

    async def update_action_item_status(self, item_id: str, status: str) -> bool:
        """Update status satu action item (pending / done)."""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                "UPDATE action_items SET status = ? WHERE id = ?", (status, item_id)
            )
            await db.commit()
        return True

    async def get_action_items(self, meeting_id: str) -> list[dict]:
        """Ambil semua action items dari sebuah meeting."""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                "SELECT * FROM action_items WHERE meeting_id = ? ORDER BY priority DESC",
                (meeting_id,),
            ) as cursor:
                rows = await cursor.fetchall()
                return [dict(row) for row in rows]

    def _parse_meeting_row(self, row: dict, summary: bool = False) -> dict:
        """Parse JSON fields dari database row."""
        for key in ["participants", "action_items", "diarization_segments"]:
            if key in row:
                try:
                    row[key] = json.loads(row[key]) if row[key] else []
                except (json.JSONDecodeError, TypeError):
                    row[key] = []
        return row


# Singleton
database_service = DatabaseService()
