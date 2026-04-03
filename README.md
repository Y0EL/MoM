# YOTA - Asisten Rapat AI Cerdas

YOTA adalah platform automasi Minutes of Meeting (MoM) profesional yang dirancang untuk meningkatkan produktivitas tim. Dengan menggabungkan teknologi transkripsi suara ke teks dan alur kerja AI multi-agen, YOTA mampu mengubah rekaman rapat mentah menjadi dokumen terstruktur yang mencakup ringkasan eksekutif, poin diskusi utama, serta daftar tugas (action items) yang jelas secara otomatis.

---

## Kemampuan Utama

- **Transkripsi Presisi**: Menggunakan teknologi OpenAI Whisper dengan dukungan pemotongan otomatis (chunking) untuk file audio berdurasi panjang (hingga 3+ jam).
- **Identifikasi Pembicara (Diarization)**: Mampu mengenali dan memberikan label pada pembicara yang berbeda dalam transkrip secara otomatis.
- **Generasi MoM Berbasis Agen**: Implementasi sistem multi-agen CrewAI untuk memastikan struktur dokumen yang profesional, logis, dan berkualitas tinggi.
- **Pemantauan Progress Real-time**: Memberikan pembaruan status dan pelacakan progress secara langsung selama pemrosesan file besar.
- **Export Multi-Format**: Mendukung ekspor dokumen ke PDF (Formal), DOCX (Editable), Markdown, dan teks biasa.
- **Manajemen Tugas Terintegrasi**: Sinkronisasi status tugas langsung dari dokumen MoM ke database untuk pemantauan tindak lanjut rapat.

---

## Arsitektur Teknologi

YOTA dibangun dengan stack teknologi modern untuk performa dan skalabilitas tinggi:

- **Frontend**: Next.js 15, React 19, Tailwind CSS, Framer Motion (Antarmuka Premium UI/UX).
- **Backend API**: FastAPI (Python), Uvicorn.
- **Engine Kecerdasan Buatan**: 
  - OpenAI Whisper (Speech-to-Text)
  - OpenAI GPT-4o/Nano (LLM)
  - CrewAI (Alur Kerja Agentic)
- **Database**: SQLite dengan library aiosqlite untuk manajemen data lokal yang efisien.
- **Pemrosesan Dokumen**: Pydub untuk manipulasi audio, serta fpdf2 dan python-docx untuk pembuatan dokumen.

---

## Struktur Proyek

```
YOTA/
├── app/                # Frontend Web (Next.js)
│   ├── src/app/        # Halaman utama dan tata letak
│   └── src/components/ # Komponen UI reusable
├── backend/            # Backend API (FastAPI)
│   ├── services/       # Logika AI, Database, dan Export
│   └── main.py         # Titik masuk API dan konfigurasi server
└── mom.db              # Database SQLite lokal
```

---

## Cara Menjalankan

### 1. Menjalankan Backend
Pastikan Python 3.10 ke atas telah terinstal.
```bash
cd backend
pip install -r requirements.txt
python main.py
```

### 2. Menjalankan Frontend
Gunakan npm untuk menjalankan aplikasi web:
```bash
cd app
npm install
npm run dev
```
Akses aplikasi melalui browser di: [http://localhost:3000](http://localhost:3000).

---

## Konfigurasi Lingkungan

Konfigurasi variabel lingkungan pada file `backend/.env`:
- `OPENAI_API_KEY`: API Key OpenAI untuk transkripsi dan analisis.
- `OPENAI_MODEL`: Model bahasa yang digunakan (default: gpt-4o).

---

© 2026 YOTA AI. Hak Cipta Dilindungi Undang-Undang.
