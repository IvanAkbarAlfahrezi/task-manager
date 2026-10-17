# Task Manager Kuliah AI

Aplikasi manajemen tugas kuliah dengan bantuan AI (Gemini) dan database Supabase.

## Fitur
- Dashboard + Kanban Board 3 kolom (Belum / Sedang Dikerjakan / Selesai) dengan drag & drop
- Upload materi (PDF, Word, PowerPoint, Excel, gambar) → diekstrak & disimpan
- AI Assistant: penjelasan materi, kunci jawaban, dan post-test (tersimpan di database)

## Teknologi
- **Frontend:** Vite + React + TypeScript + Tailwind CSS + dnd-kit
- **Backend:** Next.js (API routes) + Supabase + Google Gemini
- **Storage:** Supabase Storage (bucket `materials`)

## Cara Menjalankan
```bash
# Backend
npm --prefix backend run dev      # http://localhost:3000

# Frontend
npm --prefix frontend run dev     # http://localhost:5173
```

## Setup Database
Jalankan `supabase-setup.sql` di Supabase SQL Editor, lalu isi `backend/.env.local`.
