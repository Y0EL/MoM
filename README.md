# 🍖 Cimeat AI — Asisten Nutrisi Cerdas 2026

**Cimeat AI** adalah aplikasi pelacak kalori modern yang menggunakan kekuatan Artificial Intelligence (Vision) untuk membantu kamu hidup lebih sehat. Cukup foto makananmu, dan biarkan AI kami menghitung nutrisinya dalam hitungan detik.

---

## ✨ Fitur Utama

- **📸 AI-Powered Scan**: Ambil foto makanan dan biarkan model AI multimodal (qwen3.5) menganalisis kalori & nutrisi makro secara real-time.
- **🎯 Personalisasi Target**: Setup target kalori, protein, karbohidrat, dan lemak harian yang sesuai dengan kebutuhan tubuhmu.
- **🌓 Greeting Kontekstual**: Aplikasi yang "hidup" dan menyapa kamu sesuai waktu (pagi, siang, sore, malam).
- **📊 Statistik Mingguan**: Pantau progres mingguan kamu dengan chart interaktif dan sistem *streak* harian.
- **🗂️ Riwayat Terorganisir**: Catatan makanan yang dikelompokkan secara otomatis berdasarkan waktu makan (Sarapan, Makan Siang, dll).
- **🔒 Lokal & Cepat**: Data kamu disimpan secara lokal di browser (`localStorage`), menjaga privasi tetap aman.

---

## 🏗️ Arsitektur Teknologi

Aplikasi ini dibangun dengan arsitektur modern yang memisahkan frontend dan AI engine:

- **Frontend**: Next.js 15, React 19, Tailwind CSS v4, Framer Motion (untuk animasi premium).
- **Backend AI**: FastAPI (Python), Uvicorn.
- **AI Engine**: Ollama (Vision/Multimodal) menggunakan model `qwen3.5`.

---

## 📁 Struktur Proyek

```
CimeatApp/
├── app/                # 🌐 Web Frontend (Next.js)
│   ├── src/app/        # Core logic & UI components
│   └── public/         # Aset statis
├── backend/            # 🐍 AI Engine (FastAPI)
│   ├── services/       # AI logic & integration prompt
│   └── main.py         # API server endpoints
└── scripts/            # Script pembantu (reset project, dll)
```

---

## 🚀 Cara Menjalankan

### 1. Jalankan Backend (AI Engine)
Pastikan kamu sudah menginstal Python dan dependency yang dibutuhkan:
```bash
cd backend
pip install -r requirements.txt
python main.py
```
*Note: Pastikan Ollama sudah berjalan di background.*

### 2. Jalankan Frontend
Gunakan npm untuk menjalankan aplikasi web:
```bash
cd app
npm install
npm run dev
```
Buka [http://localhost:3000](http://localhost:3000) di browser kesayanganmu.

---

## ⚠️ Lingkungan Pengembangan (.env)
Pastikan kamu telah mengatur file `.env` di folder `backend` dengan konfigurasi Ollama yang benar agar fitur Scan bisa berfungsi.

---

**Dibuat dengan ❤️ untuk gaya hidup sehat tahun 2026.**
