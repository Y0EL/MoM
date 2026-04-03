# ✅ Phase 1 Done — MoM Backend Foundation

> Tanggal selesai: 2026-04-03  
> Status: **COMPLETED — Backend siap, tinggal jalankan server**

---

## 🗂️ Ringkasan: Apa yang Sudah Dilakukan

Phase 1 mentransformasi backend Cimeat (calorie tracker) menjadi **MoM AI Meeting Assistant backend** yang lengkap. Semua endpoint kalori dihapus dan digantikan dengan pipeline pemrosesan Meeting.

---

## 📁 File yang Dibuat / Diubah

### File BARU

| File | Deskripsi |
|---|---|
| `backend/services/diarization_service.py` | Speaker diarization dengan NeMo → SpeechBrain → whisper-only fallback |
| `backend/services/mom_service.py` | CrewAI 4-agent pipeline (Cleaner → Analyst → Extractor → Writer) |
| `backend/services/database_service.py` | SQLite async CRUD untuk meetings & action items |
| `backend/services/export_service.py` | Export ke PDF, DOCX, TXT, MD dengan desain masing-masing |

### File DIUBAH

| File | Perubahan |
|---|---|
| `backend/main.py` | **Total refactor** — semua endpoint kalori diganti dengan MoM endpoints |
| `backend/services/ai_service.py` | Hapus method kalori, perkuat Whisper dengan timestamp segments |
| `backend/requirements.txt` | Tambah: crewai, aiosqlite, fpdf2, python-docx, speechbrain, dll |
| `backend/.env` | Update variabel: MoM-specific config, hapus food-related vars |

---

## 🔌 API Endpoints yang Tersedia

```
GET  /                           → Health check (status, diarization engine, model)

POST /mom/transcribe             → Audio file → Text + Speaker Labels
                                   Input: audio file (webm/mp3/wav/m4a), language, enable_diarization
                                   Output: {text, segments:[{start,end,speaker,text}], diarization_engine}

POST /mom/process                → Transcript → Full MoM (synchronous, ~30-60 detik)
                                   Input: {transcript, language:"id"|"en", participants:[], meeting_title}
                                   Output: {meeting_id, title, mom_document, action_items, clean_transcript}

POST /mom/process/stream         → Transcript → Full MoM (SSE streaming)
                                   Stream events: init → cleaning → analyzing → extracting → writing → done → saved

GET  /mom/history                → List semua meetings (pagination + search)
GET  /mom/{id}                   → Detail 1 meeting + action items detail
DELETE /mom/{id}                 → Hapus meeting
PATCH /mom/{id}/status           → Update meeting status

GET  /mom/{id}/export?format=pdf   → Download PDF (cover page, tabel action items)
GET  /mom/{id}/export?format=docx  → Download DOCX (editable Word format)
GET  /mom/{id}/export?format=txt   → Download TXT (ASCII formatted plain text)
GET  /mom/{id}/export?format=md    → Download MD (GFM checkboxes, GitHub-ready)

PATCH /action-items/{id}/status → Toggle action item: pending ↔ done
```

---

## 🤖 CrewAI Agent Pipeline (mom_service.py)

```
Transcript masuk
       ↓
[Agent 1] Transcript Cleaner
  - Bersihkan filler words (eh, um, anu)
  - Identifikasi speaker dari konteks nama
  - Format: [SPEAKER_A]: text / [Budi]: text

       ↓
[Agent 2] Meeting Analyst
  - Identifikasi agenda/topik utama
  - Ekstrak keputusan yang diambil
  - Catat isu yang belum resolved

       ↓
[Agent 3] Action Item Extractor
  - Output JSON array: [{task, pic, deadline, priority}]
  - Cari PIC dari konteks ucapan
  - Prioritas: high/medium/low

       ↓
[Agent 4] MoM Writer
  - Tulis dokumen MoM formal dalam Markdown
  - Bahasa: Indonesia (id) atau English (en)
  - Sections: Ringkasan Eks → Agenda → Diskusi → Keputusan → Action Items → Penutup

       ↓
Simpan ke SQLite (meetings + action_items tables)
```

---

## 🎤 Speaker Diarization (diarization_service.py)

**Engine auto-detect strategy (NO HuggingFace):**

```python
NeMo (GPU) → SpeechBrain (CPU) → Whisper-only fallback
```

| Engine | Source Model | Kebutuhan |
|---|---|---|
| NVIDIA NeMo | NVIDIA NGC (`titanet_large.nemo`) | GPU NVIDIA (CUDA) |
| SpeechBrain | speechbrain.io hub (`spkrec-ecapa-voxceleb`) | CPU (lebih lambat) |
| Whisper-only | - | Tidak ada diarization, 1 speaker saja |

**Output merger:** Whisper timestamps + diarization segments → `[{start, end, speaker, text}]`

---

## 🗄️ Database Schema (SQLite: `backend/mom.db`)

```sql
meetings
  id, title, date, duration_seconds, participants (JSON),
  raw_transcript, clean_transcript, mom_document,
  action_items (JSON), diarization_segments (JSON),
  language, status, created_at, updated_at

action_items
  id, meeting_id, task, pic, deadline, priority, status, notes, created_at
```

---

## 📄 Export Formats

| Format | Library | Desain |
|---|---|---|
| **PDF** | fpdf2 | Cover page navy, section numbering, tabel action items berwarna |
| **DOCX** | python-docx | Word styles, meta table, editable di Word/Google Docs |
| **TXT** | built-in | ASCII `===`/`---` dividers, UTF-8 |
| **MD** | built-in | GFM checkboxes, grouped by priority, GitHub/Notion-ready |

---

## 🚀 Cara Menjalankan Backend

```bash
cd c:\Users\WIN10\Desktop\MoM\backend
python main.py
```

Backend running di: **http://localhost:8000**  
API Docs (Swagger): **http://localhost:8000/docs**

---

## ⚠️ Known Notes

1. **fpdf conflict**: Sudah resolved — uninstall `fpdf` 1.7.x, keep `fpdf2` 2.8.7
2. **SpeechBrain model**: Akan auto-download pertama kali (`~500MB`) ke `~/.cache/speechbrain/`
3. **NeMo**: Belum terinstall (berat). Aktifkan dengan: `pip install nemo_toolkit[asr]`
4. **CrewAI processing time**: ~30-60 detik per meeting (4 LLM calls sequential)
5. **Database**: SQLite file dibuat otomatis di `backend/mom.db` saat server start

---

## 🔜 Phase 2: Frontend — Apa yang Harus Dilakukan

### Prioritas Tinggi
- [ ] **2.1 Update tab navigator** — Ganti 4 tab kalori dengan: 🎙️ Live | 📁 Upload | 📋 Riwayat | ⚙️ Pengaturan
- [ ] **2.2 Refactor `VoiceOverlay.tsx` → `MeetingRecorder`**
  - Ganti semua text Cimeat → MoM context
  - Live transcript scroll (bukan satu baris)
  - Timer durasi rekaman
  - Kirim ke `/mom/transcribe` lalu `/mom/process/stream`
  - Tampilkan progress stages (cleaning → analyzing → extracting → writing)
- [ ] **2.3 `LiveMeetingScreen`** — Main tab dengan big record button, peserta input, live transcript
- [ ] **2.4 `MomViewer` component** — Full-screen MoM document reader
  - Render Markdown sections
  - Action items dengan checkbox tap
  - Share / Export buttons (4 format)
- [ ] **2.5 `MomCard` component** — List item untuk history (judul, tanggal, participants, action items count)

### Prioritas Medium
- [ ] **3.1 UploadTab** — File picker (expo-document-picker sudah install), language selector, preview transcript
- [ ] **3.2 HistoryTab** — List meetings + search + filter by status
- [ ] **3.3 Export flow** — Download/share file dari dalam app
- [ ] **3.4 Action items management** — Mark done, filter pending/done

### Tech Notes untuk Phase 2
- Base URL backend: `http://localhost:8000` (atau IP lokal untuk device fisik)
- Stream parsing: `EventSource` atau `fetch` dengan `ReadableStream` untuk SSE
- Expo packages yang sudah tersedia: `expo-document-picker`, `expo-file-system`, `expo-sharing`
- Font yang sudah ada: `@expo-google-fonts/inter`

---

*Dokumen ini dibuat oleh MoM AI Assistant System — Phase 1 walkthrough*
