# Task Manager Project Issues / Roadmap

> Update terakhir: Catatan (notes), notifikasi deadline (lonceng), dan bot WhatsApp (H-2/terlambat).

## 1. Project Initialization & Setup
- [x] Inisialisasi struktur folder frontend (Vite + React) & backend (Next.js)
- [x] Setup Tailwind CSS (v4) dan TypeScript
- [x] Konfigurasi environment (`.env.local`) — Supabase, Gemini, Storage

## 2. Database (Supabase) Setup
- [x] Tabel `tasks` (id, title, description, deadline, status, is_completed, created_at)
- [x] Kolom material: `material_name`, `material_text`, `material_url`, `material_type`
- [x] Tabel `ai_responses` (task_id unik, explanation, answer, post_test JSONB)
- [x] Tabel `notes` (title, content, color, pinned) + `wa_logs` (anti-spam)
- [x] Bucket Storage `materials`
- [x] Konfigurasi koneksi Supabase (`lib/supabase.ts`, `lib/supabaseAdmin.ts`)
- [ ] **PENDING (manual):** jalankan `migrate-notes-wa.sql` di Supabase SQL Editor
- [ ] **PENDING (manual):** isi `SUPABASE_SERVICE_ROLE_KEY` di `.env.local`

## 3. Backend (Next.js) Development
- [x] REST API CRUD tugas: `GET/POST/PATCH/DELETE /api/tasks` (+ CORS)
- [x] REST API CRUD catatan: `GET/POST/PATCH/DELETE /api/notes` (+ CORS)
- [x] Integrasi Gemini API: `POST /api/ai` (retry + fallback model)
- [x] Simpan & muat hasil AI ke `ai_responses` (`POST /api/ai` upsert, `GET /api/ai`)
- [x] Upload & ekstraksi file: `POST /api/upload`
  - PDF, DOCX, PPTX, XLSX, ODF, CSV, RTF, MD (via `officeparser`)
  - TXT (langsung)
  - Gambar JPG/PNG/WEBP/GIF (OCR + deskripsi via Gemini)
  - Upload file asli ke Supabase Storage

## 4. Frontend (Vite + React) Development
- [x] Dashboard (stat cards, filter, search)
- [x] Form tambah/edit tugas (modal) + drag & drop upload materi
- [x] Drawer detail: penjelasan, kunci jawaban, post-test interaktif
- [x] Kanban Board 3 kolom (Belum / Sedang Dikerjakan / Selesai) — drag & drop
- [x] Tema terang (light) + aksen indigo/emerald/amber
- [x] Hasil AI auto-load dari database (tombol Regenerate)
- [x] Halaman **Catatan** di sidebar (sticky-note, warna, pin, cari, CRUD)
- [x] **Notifikasi lonceng** di header (badge deadline mepet + dropdown) — `components/NotificationBell.tsx`
- [x] Refactor sebagian: `components/NotesView.tsx`, `NotificationBell.tsx`

## 5. WhatsApp Bot (Pengingat Deadline)
- [x] Bot `whatsapp-web.js` di folder `whatsapp-bot/` (proses Node terpisah)
- [x] Cron harian 07.00 & 20.00 -> cek tugas -> kirim pesan H-2/H-1/hari ini/terlambat
- [x] Anti-spam via tabel `wa_logs` (unique task_id + sent_on + type + slot)
- [ ] **PENDING (manual):** `npm install` di `whatsapp-bot/`, isi `.env`, scan QR

## 6. Deployment & Testing
- [x] Uji integrasi manual (upload, AI, CRUD, CORS)
- [ ] Uji otomatis (unit/integration test)
- [ ] Deploy backend & frontend ke Vercel
- [ ] Deploy bot WhatsApp ke host selalu-nyala (Railway/Render/VPS)

## Known Issues / Catatan
- Tabel `notes` & `wa_logs` belum dibuat sampai `migrate-notes-wa.sql` dijalankan.
- Bot WhatsApp butuh HP tetap terhubung; tidak bisa jalan di Vercel (serverless).
- Upload ke Storage butuh `SUPABASE_SERVICE_ROLE_KEY`.
- Model `gemini-2.5-flash` sudah tidak tersedia → pakai `gemini-3.8-flash` (+ fallback).
- Belum ada autentikasi / multi-user (single-user).