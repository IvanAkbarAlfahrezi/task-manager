---
name: StudyDesk
description: Aplikasi manajemen tugas kuliah (AI Task Manager) dengan Kanban board 3 kolom, Catatan (sticky notes), dan AI Study Assistant (penjelasan, kunci jawaban, post-test).
style: Editorial Minimal / Premium SaaS
colors:
  accent: "#4F46E5"
  accent-hover: "#4338CA"
  accent-soft: "#EEF2FF"
  ink: "#0F172A"
  background: "#F8FAFC"
  surface: "#FFFFFF"
  text-primary: "#0F172A"
  text-secondary: "#64748B"
  text-muted: "#94A3B8"
  border: "#E2E8F0"
  status-progress: "#D97706"
  status-done: "#059669"
  status-urgent: "#E11D48"
typography:
  fontFamily: "Inter, system-ui, 'Segoe UI', Roboto, sans-serif"
  h1:
    fontSize: "1.5rem"
    fontWeight: 600
    letterSpacing: "-0.01em"
  h2:
    fontSize: "1rem"
    fontWeight: 600
  body-md:
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
  micro-label:
    fontSize: "0.6875rem"
    fontWeight: 600
    textTransform: "uppercase"
    letterSpacing: "0.14em"
rounded:
  container: "12px"
  card: "8px"
  control: "6px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "#FFFFFF"
    border: "none"
    boxShadow: "none"
    rounded: "{rounded.card}"
    padding: "8px 16px"
    interaction: "Hover: bg-indigo-700; Disabled: opacity 60%"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "#475569"
    border: "1px solid {colors.border}"
    boxShadow: "none"
    rounded: "{rounded.card}"
    padding: "8px 16px"
    interaction: "Hover: bg-slate-50"
  card:
    backgroundColor: "{colors.surface}"
    border: "1px solid {colors.border}"
    boxShadow: "none"
    rounded: "{rounded.card}"
    padding: "{spacing.md}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    border: "1px solid {colors.border}"
    rounded: "{rounded.card}"
    padding: "8px 12px"
    interaction: "Focus: border-slate-400"
---

# DESIGN SYSTEM — StudyDesk (AI Task Manager)

## PROJECT OVERVIEW

**StudyDesk** adalah aplikasi manajemen tugas kuliah yang menggabungkan **Kanban board** dengan **AI Study Assistant**. Pengguna melacak tugas kuliah (Belum → Sedang Dikerjakan → Selesai), mengunggah materi pendukung (PDF/Word/PPT/Excel/gambar), lalu AI menghasilkan **penjelasan materi**, **kunci jawaban**, dan **post-test interaktif**. Dilengkapi **Catatan** (sticky notes) dan **notifikasi deadline** di header.

## TECH STACK

- **Frontend:** Vite + React 19 + TypeScript + Tailwind CSS v4 (`frontend/`)
- **Backend / API:** Next.js Route Handlers (`backend/app/api/*`)
- **Database / Storage:** Supabase (PostgreSQL + Storage bucket `materials`)
- **AI Engine:** Google Gemini API (`POST /api/ai`, upload & OCR di `POST /api/upload`)
- **Bot:** `whatsapp-web.js` + `node-cron` (`whatsapp-bot/`)
- **Ikon:** `lucide-react` · **Drag & drop:** `@dnd-kit`

## VISUAL STYLE: EDITORIAL MINIMAL / PREMIUM SAAS

Gaya **monokrom netral + satu aksen indigo**. Bersih, tenang, berorientasi tipografi. Kedalaman diciptakan lewat **border hairline**, bukan shadow. Warna dipakai sangat hemat: abu-abu untuk hampir semua hal, indigo hanya untuk aksi & status aktif, dan warna semantik (amber/emerald/rose) hanya sebagai titik/teks kecil.

**Prinsip utama:** jangan pakai warna untuk dekorasi. Jika sesuatu berwarna, itu karena bermakna.

### 1. Colors

| Token | Nilai | Tailwind | Pemakaian |
|---|---|---|---|
| Accent | `#4F46E5` | `indigo-600` | Tombol CTA, nav aktif, link, fokus, bar progres, radio terpilih, pin |
| Accent hover | `#4338CA` | `indigo-700` | Hover CTA/link |
| Accent soft | `#EEF2FF` | `indigo-50` | Latar nav aktif, tombol AI sekunder |
| Ink | `#0F172A` | `slate-900` | Logo box, tombol submit post-test, angka statistik |
| Background | `#F8FAFC` | `slate-50` | Kanvas utama |
| Surface | `#FFFFFF` | `white` | Card, modal, drawer, kolom Kanban |
| Text primary | `#0F172A` | `slate-900` | Heading, angka |
| Text secondary | `#64748B` | `slate-500` | Deskripsi, label |
| Text muted | `#94A3B8` | `slate-400` | Micro-label, ikon sekunder, meta |
| Border | `#E2E8F0` | `slate-200` | Semua pemisah & tepi card/input |

**Warna semantik (hemat, hanya titik/badge/teks kecil):**

| Status | Tailwind | Pemakaian |
|---|---|---|
| Sedang dikerjakan | `amber-500` / `amber-700` | Titik kolom, badge "Dikerjakan" |
| Selesai / sukses | `emerald-500` / `emerald-600` | Titik kolom, cek selesai, kotak skor |
| Mendesak / error | `rose-500` / `rose-600` | Titik, badge "Hari ini"/"Terlambat", toast error, hapus |

### 2. Typography

- **Font:** `Inter` (di-load via Google Fonts di `index.html`, diterapkan lewat `--font-sans`).
- **Heading:** `font-semibold` (600) + `tracking-tight`. Sapaan halaman `text-xl sm:text-2xl`. Judul modal/drawer `text-base`. Gunakan **Sentence case**.
- **Micro-label:** `text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400` untuk label statistik, judul kolom, seksi rail, header panel.
- **Body:** `text-sm leading-relaxed text-slate-600/700` untuk teks panjang (materi, kunci jawaban).
- **Meta:** `text-xs text-slate-500` untuk tanggal & subjudul.

### 3. Layout & Spacing

- Sistem **grid 8px**: `gap-3` (12px), `gap-4` (16px), `gap-6` (24px), `gap-8` (32px). Padding halaman `p-4 lg:p-8`.
- **Shell:** sidebar kiri sticky (`w-64`, `rounded-lg`, border) + area konten `max-w-[1240px]`.
- **Header:** sapaan kiri, aksi kanan (NotificationBell, refresh, tombol Tambah).
- **Dashboard (2 kolom):** `grid lg:grid-cols-[minmax(0,1fr)_288px]` → daftar tugas di kiri, **rail kanan** berisi kartu "Progres Belajar" & "Deadline Terdekat".
- **Metrics strip:** satu kartu berisi 4 statistik dipisah **hairline** memakai trik `grid gap-px bg-slate-200` (tiap sel `bg-white`).
- **Board:** `grid md:grid-cols-3`, tinggi kolom minimum `min-h-[420px]`.
- Card grid (daftar/AI): `grid xl:grid-cols-2`; Catatan: `grid sm:grid-cols-2 xl:grid-cols-3`.

### 4. Shapes & Elevation (CRITICAL RULES)

- **Radius kecil & konsisten:** kontainer/card/input/tombol → `rounded-lg` (8px); tombol kecil & aksi ikon → `rounded-md` (6px); pill/badge/titik → `rounded-full`.
- **Elevation dari border, bukan shadow.** Semua permukaan statis memakai `border border-slate-200` **tanpa** `shadow`. Shadow hanya untuk elemen mengambang: modal `shadow-xl`, drawer `shadow-2xl`, kartu drag `shadow-lg`.
- Hover permukaan = ubah border (`hover:border-slate-300`), bukan menambah shadow.
- Overlay modal/drawer: `bg-slate-900/30` + `backdrop-blur-sm`.

## SCREENS & COMPONENTS

### 1. Dashboard
- **Header:** sapaan dinamis (pagi/siang/sore/malam, tanpa emoji), NotificationBell, tombol refresh, tombol **Tambah Tugas** (accent).
- **Metrics strip:** 4 metrik — Total Tugas, Sedang Dikerjakan, Selesai, Deadline Dekat. Micro-label uppercase + angka `text-3xl`; ikon abu tipis di kanan. Angka "Deadline Dekat" jadi `text-rose-600` hanya bila > 0.
- **Left column:** toolbar kecil ("Tugas Terbaru" + search) lalu grid `TaskCard`.
- **Right rail (288px, `hidden lg:block`):** kartu "Progres Belajar" (persen besar + bar + selesai/tersisa) dan kartu "Deadline Terdekat" (5 tugas terurut).

### 2. Kanban Board
- 3 kolom: **Belum** (slate), **Sedang Dikerjakan** (amber), **Selesai** (emerald).
- Kolom: `rounded-lg border border-slate-200 bg-slate-50/70 p-3`. Header = **titik kecil** berwarna + micro-label uppercase + counter.
- Drop state: `border-slate-400 bg-slate-100`.
- `KanbanCard`: `rounded-lg`, handle drag, badge deadline/file/AI netral, aksi Detail / AI / Edit / Hapus.
- Drag dibungkus `DndContext`; `DragOverlay` menampilkan kartu miring (`rotate-2`, `shadow-lg`, border slate).

### 3. Catatan (Notes)
- Sticky-note grid warna lembut: kuning (`amber-50/70`), hijau (`emerald-50/70`), biru (`sky-50/70`), merah muda (`rose-50/70`), border senada `-100`.
- Card: judul + konten `line-clamp-6`, pin (badge indigo saat aktif), Edit/Hapus, tanggal update. Hover = border slate.
- Modal: input judul, textarea, palet warna bulat (`rounded-full`, ring `slate-900` saat terpilih).

### 4. AI Assistant
- Banner netral (ikon box ink + micro-label "AI Study Assistant").
- Grid `TaskCard` yang sudah punya hasil AI; empty state bila belum ada.
- **AIDrawer** (panel kanan `max-w-2xl`): chip materi netral, `Section` "Penjelasan Materi" & "Kunci Jawaban" (judul `text-slate-900`), blok **Post-Test** interaktif (radio `accent-indigo-600`), tombol submit ink, kotak skor emerald.

### 5. NotificationBell
- Tombol `h-9 w-9 rounded-lg border bg-white`; badge jumlah `bg-slate-900 text-white`.
- Dropdown `rounded-lg border shadow-xl`: header micro-label "Deadline Mendesak" + counter, daftar tugas urgent (pill warna semantik), footer "Buka Board".

## COMPONENT SPECS

| Komponen | Spesifikasi |
|---|---|
| **Button primary** | `rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700` |
| **Button secondary** | `rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50` |
| **Icon button** | `h-9 w-9 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50` |
| **Card** | `rounded-lg border border-slate-200 bg-white p-5` (tanpa shadow) |
| **Input / Textarea** | `rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400` |
| **Badge / Pill** | `rounded-full border px-2.5 py-0.5 text-xs` (tone semantik) |
| **Micro-label** | `text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400` |
| **Sidebar item** | `rounded-lg px-3 py-2 text-sm font-medium`; aktif `bg-indigo-50 text-indigo-700`, hover `bg-slate-50` |
| **Stat cell** | `bg-white p-5` di dalam strip `grid gap-px bg-slate-200 rounded-lg border` |
| **Modal** | overlay `bg-slate-900/30 backdrop-blur-sm`, panel `rounded-lg bg-white shadow-xl max-w-lg p-5` |
| **Drawer** | panel kanan `border-l bg-white shadow-2xl max-w-2xl`, isi `overflow-y-auto p-5` |
| **Toast** | fixed bottom-center `rounded-lg border bg-white px-4 py-3 shadow-lg` (emerald ok / rose err) |
| **Empty state** | `rounded-lg border border-dashed border-slate-300 bg-white py-20 text-center` + ikon abu dalam `h-14 w-14 rounded-lg bg-slate-100` |
| **Upload dropzone** | `rounded-lg border-2 border-dashed`; drag-over `border-slate-900 bg-slate-50` |

## DO / DON'T

- ✅ Warna hanya untuk makna: indigo = aksi/aktif, amber/emerald/rose = status kecil.
- ✅ Gunakan border hairline untuk struktur; shadow hanya untuk elemen mengambang.
- ✅ Micro-label uppercase ber-tracking untuk menandai seksi; heading `font-semibold tracking-tight`.
- ✅ Feedback jelas: loading `Loader2 animate-spin`, disabled `opacity-60`, toast sukses/gagal.
- ❌ Jangan pakai emoji di UI.
- ❌ Jangan pakai warna-warni dekoratif (kartu stat berwarna, chip indigo di mana-mana).
- ❌ Jangan pakai `shadow-sm` pada permukaan statis, sudut besar (`rounded-2xl`), atau font selain Inter.
- ❌ Jangan ALL CAPS untuk heading; batasi uppercase hanya untuk micro-label.

## QUICK REFERENCE (Tailwind)

```
Bg        : bg-slate-50
Surface   : bg-white
Border    : border-slate-200  hover:border-slate-300
Accent    : bg-indigo-600  hover:bg-indigo-700  text-indigo-600  bg-indigo-50
Ink       : bg-slate-900  hover:bg-slate-800
Focus     : focus:border-slate-400
Radius    : rounded-lg (card/control) · rounded-md (small) · rounded-full (pill)
Shadow    : none (statis) · shadow-xl (modal) · shadow-2xl (drawer) · shadow-lg (drag)
Text      : text-slate-900 (heading) · text-slate-600 (body) · text-slate-400 (micro-label)
Status    : amber (progress) · emerald (done) · rose (urgent)
Layout    : dashboard grid lg:grid-cols-[minmax(0,1fr)_288px]
```
