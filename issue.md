# Task Manager Project Issues / Roadmap

> Update terakhir: fitur upload materi, Kanban, dan persistensi AI.

## 1. Project Initialization & Setup
- [x] Inisialisasi struktur folder frontend (Vite + React) & backend (Next.js)
- [x] Setup Tailwind CSS (v4) dan TypeScript
- [x] Konfigurasi environment (`.env.local`) — Supabase, Gemini, Storage

## 2. Database (Supabase) Setup
- [x] Tabel `tasks` (id, title, description, deadline, status, is_completed, created_at)
- [x] Kolom material: `material_name`, `material_text`, `material_url`, `material_type`
- [x] Tabel `ai_responses` (task_id unik, explanation, answer, post_test JSONB)
- [x] Bucket Storage `materials`
- [x] Konfigurasi koneksi Supabase (`lib/supabase.ts`, `lib/supabaseAdmin.ts`)
- [ ] **PENDING (manual):** jalankan `supabase-setup.sql` di Supabase SQL Editor
- [ ] **PENDING (manual):** isi `SUPABASE_SERVICE_ROLE_KEY` di `.env.local`

## 3. Backend (Next.js) Development
- [x] REST API CRUD tugas: `GET/POST/PATCH/DELETE /api/tasks` (+ CORS)
- [x] Integrasi Gemini API: `POST /api/ai` (retry + fallback model)
- [x] Simpan & muat hasil AI ke `ai_responses` (`POST /api/ai` upsert, `GET /api/ai`)
- [x] Upload & ekstraksi file: `POST /api/upload`
  - PDF, DOCX, PPTX, XLSX, ODF, CSV, RTF, MD (via `officeparser`)
  - TXT (langsung)
  - Gambar JPG/PNG/WEBP/GIF (OCR + deskripsi via Gemini)
  - Upload file asli ke Supabase Storage

## 4. Frontend (Vite + React) Development
- [x] Dashboard (stat cards, filter, search)
- [x] Form tambah tugas (modal) + drag & drop upload materi
- [ ] Form edit tugas
- [x] Drawer detail: penjelasan, kunci jawaban, post-test interaktif
- [x] Kanban Board 3 kolom (Belum / Sedang Dikerjakan / Selesai) — drag & drop
- [x] Tema terang (light) + aksen indigo/emerald/amber
- [x] Hasil AI auto-load dari database (tombol Regenerate)

## 5. Deployment & Testing
- [x] Uji integrasi manual (upload, AI, CRUD, CORS)
- [ ] Uji otomatis (unit/integration test)
- [ ] Deploy ke Vercel

## Known Issues / Catatan
- Hasil AI baru tersimpan setelah tabel `ai_responses` dibuat.
- Upload ke Storage butuh `SUPABASE_SERVICE_ROLE_KEY`.
- Model `gemini-2.5-flash` sudah tidak tersedia → pakai `gemini-3.8-flash` (+ fallback).
- Format API key Gemini baru (mis. `AQ.Ab8RN6...`).
- Belum ada autentikasi / multi-user (single-user).
