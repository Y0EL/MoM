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
                    task_id TEXT DEFAULT '',
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

                CREATE TABLE IF NOT EXISTS context_cards (
                    id TEXT PRIMARY KEY,
                    meeting_id TEXT NOT NULL,
                    segment_index INTEGER NOT NULL,
                    topic TEXT,
                    key_points TEXT DEFAULT '[]',
                    decisions TEXT DEFAULT '[]',
                    action_items TEXT DEFAULT '[]',
                    speakers TEXT DEFAULT '[]',
                    time_range TEXT DEFAULT '{}',
                    generated_at TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS word_corrections (
                    id TEXT PRIMARY KEY,
                    meeting_id TEXT NOT NULL,
                    word_index INTEGER NOT NULL,
                    original_word TEXT NOT NULL,
                    corrected_word TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
                );

                CREATE INDEX IF NOT EXISTS idx_meetings_date ON meetings(date);
                CREATE INDEX IF NOT EXISTS idx_action_items_meeting ON action_items(meeting_id);
                CREATE INDEX IF NOT EXISTS idx_action_items_status ON action_items(status);
                CREATE INDEX IF NOT EXISTS idx_context_cards_meeting ON context_cards(meeting_id);
                CREATE INDEX IF NOT EXISTS idx_context_cards_segment ON context_cards(meeting_id, segment_index);
                CREATE INDEX IF NOT EXISTS idx_word_corrections_meeting ON word_corrections(meeting_id);
                CREATE INDEX IF NOT EXISTS idx_word_corrections_index ON word_corrections(meeting_id, word_index);
            """)
            
            # --- AUTO MIGRATION: Check if task_id exists (for existing DBs) ---
            try:
                db.row_factory = aiosqlite.Row
                async with db.execute("PRAGMA table_info(meetings)") as cursor:
                    columns = [row['name'] for row in await cursor.fetchall()]
                    if 'task_id' not in columns:
                        logger.info("[DB] Migrating: Adding missing 'task_id' column to meetings table")
                        await db.execute("ALTER TABLE meetings ADD COLUMN task_id TEXT DEFAULT ''")
            except Exception as e:
                logger.warning(f"[DB] Auto-migration check failed (ignoring): {e}")

            # --- AUTO MIGRATION: Check if context_cards table exists ---
            try:
                db.row_factory = aiosqlite.Row
                async with db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='context_cards'") as cursor:
                    table_exists = await cursor.fetchone()
                    if not table_exists:
                        logger.info("[DB] Migrating: Creating missing 'context_cards' table")
                        await db.executescript("""
                            CREATE TABLE context_cards (
                                id TEXT PRIMARY KEY,
                                meeting_id TEXT NOT NULL,
                                segment_index INTEGER NOT NULL,
                                topic TEXT,
                                key_points TEXT DEFAULT '[]',
                                decisions TEXT DEFAULT '[]',
                                action_items TEXT DEFAULT '[]',
                                speakers TEXT DEFAULT '[]',
                                time_range TEXT DEFAULT '{}',
                                generated_at TEXT NOT NULL,
                                created_at TEXT NOT NULL,
                                FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
                            );
                            
                            CREATE INDEX IF NOT EXISTS idx_context_cards_meeting ON context_cards(meeting_id);
                            CREATE INDEX IF NOT EXISTS idx_context_cards_segment ON context_cards(meeting_id, segment_index);
                        """)
            except Exception as e:
                logger.warning(f"[DB] Context cards migration check failed (ignoring): {e}")

            # --- AUTO MIGRATION: Check if word_corrections table exists ---
            try:
                db.row_factory = aiosqlite.Row
                async with db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='word_corrections'") as cursor:
                    table_exists = await cursor.fetchone()
                    if not table_exists:
                        logger.info("[DB] Migrating: Creating missing 'word_corrections' table")
                        await db.executescript("""
                            CREATE TABLE word_corrections (
                                id TEXT PRIMARY KEY,
                                meeting_id TEXT NOT NULL,
                                word_index INTEGER NOT NULL,
                                original_word TEXT NOT NULL,
                                corrected_word TEXT NOT NULL,
                                created_at TEXT NOT NULL,
                                updated_at TEXT NOT NULL,
                                FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
                            );
                            
                            CREATE INDEX IF NOT EXISTS idx_word_corrections_meeting ON word_corrections(meeting_id);
                            CREATE INDEX IF NOT EXISTS idx_word_corrections_index ON word_corrections(meeting_id, word_index);
                        """)
            except Exception as e:
                logger.warning(f"[DB] Word corrections migration check failed (ignoring): {e}")

            await db.commit()
        
        # Cleanup stale processing meetings from previous sessions
        await self.cleanup_stale_meetings()
        logger.info(f"[DB] Database initialized and cleaned: {self.db_path}")

    async def cleanup_stale_meetings(self):
        """Ubah semua meeting 'processing' menjadi 'error' saat startup agar tidak nyangkut."""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("UPDATE meetings SET status = 'error' WHERE status = 'processing'")
            await db.commit()
            logger.info("[DB] Stale 'processing' meetings cleared.")

    async def create_meeting(
        self,
        title: str,
        language: str = "id",
        participants: list = None,
        duration_seconds: int = 0,
        task_id: str = "",
        status: str = "processing",
    ) -> str:
        """Buat meeting baru dan return ID-nya."""
        meeting_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()

        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """INSERT INTO meetings 
                   (id, title, date, duration_seconds, participants, language, status, task_id, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    meeting_id,
                    title,
                    now,
                    duration_seconds,
                    json.dumps(participants or []),
                    language,
                    status,
                    task_id,
                    now,
                    now,
                ),
            )
            await db.commit()

        logger.info(f"[DB] Meeting created: {meeting_id} (Task: {task_id}) — '{title}'")
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
                           language, status, task_id, created_at, action_items
                           FROM meetings WHERE title LIKE ? 
                           ORDER BY date DESC LIMIT ? OFFSET ?"""
                params = (f"%{search}%", limit, offset)
            else:
                query = """SELECT id, title, date, duration_seconds, participants, 
                           language, status, task_id, created_at, action_items
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

    # --- Context Cards CRUD Operations ---
    async def create_context_card(self, meeting_id: str, context_card: dict) -> str:
        """Create a new context card for a meeting."""
        card_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """INSERT INTO context_cards 
                   (id, meeting_id, segment_index, topic, key_points, decisions, 
                    action_items, speakers, time_range, generated_at, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (card_id, meeting_id, context_card.get("segment_index", 0),
                 context_card.get("topic"), json.dumps(context_card.get("key_points", [])),
                 json.dumps(context_card.get("decisions", [])), json.dumps(context_card.get("action_items", [])),
                 json.dumps(context_card.get("speakers", [])), json.dumps(context_card.get("time_range", {})),
                 context_card.get("generated_at", now), now)
            )
            await db.commit()
        logger.info(f"[DB] Context card created: {card_id}")
        return card_id

    async def get_context_cards(self, meeting_id: str) -> list[dict]:
        """Get all context cards for a meeting, ordered by segment index."""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                "SELECT * FROM context_cards WHERE meeting_id = ? ORDER BY segment_index ASC",
                (meeting_id,),
            ) as cursor:
                rows = await cursor.fetchall()
                return [self._parse_context_card_row(dict(row)) for row in rows]

    async def delete_context_cards(self, meeting_id: str) -> bool:
        """Delete all context cards for a meeting."""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("DELETE FROM context_cards WHERE meeting_id = ?", (meeting_id,))
            await db.commit()
        logger.info(f"[DB] Context cards deleted for meeting: {meeting_id}")
        return True

    def _parse_context_card_row(self, row: dict) -> dict:
        """Parse JSON fields from context card database row."""
        for key in ["key_points", "decisions", "action_items", "speakers", "time_range"]:
            if key in row:
                try:
                    row[key] = json.loads(row[key]) if row[key] else [] if key != "time_range" else {}
                except (json.JSONDecodeError, TypeError):
                    row[key] = [] if key != "time_range" else {}
        return row

    def _parse_meeting_row(self, row: dict, summary: bool = False) -> dict:
        """Parse JSON fields dari database row."""
        for key in ["participants", "action_items", "diarization_segments"]:
            if key in row:
                try:
                    row[key] = json.loads(row[key]) if row[key] else []
                except (json.JSONDecodeError, TypeError):
                    row[key] = []
        return row

    # --- Word Corrections CRUD Operations ---
    async def upsert_word_correction(self, meeting_id: str, word_index: int, original_word: str, corrected_word: str) -> str:
        """Insert atau update word correction untuk sebuah meeting."""
        now = datetime.utcnow().isoformat()
        
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            # Cek apakah correction sudah ada
            async with db.execute(
                "SELECT id FROM word_corrections WHERE meeting_id = ? AND word_index = ?",
                (meeting_id, word_index)
            ) as cursor:
                existing = await cursor.fetchone()
                
            if existing:
                correction_id = existing['id']
                await db.execute(
                    "UPDATE word_corrections SET corrected_word = ?, updated_at = ? WHERE id = ?",
                    (corrected_word, now, correction_id)
                )
                logger.info(f"[DB] Word correction updated: {correction_id}")
            else:
                correction_id = str(uuid.uuid4())
                await db.execute(
                    """INSERT INTO word_corrections 
                       (id, meeting_id, word_index, original_word, corrected_word, created_at, updated_at)
                       VALUES (?, ?, ?, ?, ?, ?, ?)""",
                    (correction_id, meeting_id, word_index, original_word, corrected_word, now, now)
                )
                logger.info(f"[DB] Word correction created: {correction_id}")
            
            await db.commit()
            return correction_id

    async def get_word_corrections(self, meeting_id: str) -> list[dict]:
        """Ambil semua word corrections dari sebuah meeting."""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                "SELECT * FROM word_corrections WHERE meeting_id = ? ORDER BY word_index ASC",
                (meeting_id,),
            ) as cursor:
                rows = await cursor.fetchall()
                return [dict(row) for row in rows]

    async def delete_word_correction(self, meeting_id: str, word_index: int) -> bool:
        """Hapus word correction untuk word index tertentu."""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                "DELETE FROM word_corrections WHERE meeting_id = ? AND word_index = ?",
                (meeting_id, word_index)
            )
            await db.commit()
            logger.info(f"[DB] Word correction deleted: meeting {meeting_id}, index {word_index}")
            return True

    async def delete_word_corrections(self, meeting_id: str) -> bool:
        """Hapus semua word corrections untuk sebuah meeting."""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("DELETE FROM word_corrections WHERE meeting_id = ?", (meeting_id,))
            await db.commit()
            logger.info(f"[DB] All word corrections deleted for meeting: {meeting_id}")
            return True


# Singleton
database_service = DatabaseService()
