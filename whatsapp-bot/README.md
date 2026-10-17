# WhatsApp Bot — Pengingat Deadline Tugas

Bot WhatsApp berbasis `whatsapp-web.js` yang otomatis mengingatkanmu soal tugas yang deadline-nya mepet.

## Cara pakai

1. **Instal dependensi** (sekali, download Chromium ~400MB):
   ```bash
   npm install
   ```

2. **Buat `.env`** dari contoh:
   ```bash
   cp .env.example .env
   ```
   Lalu isi:
   - `WA_TARGET_NUMBER` → nomor WhatsApp kamu (format `628xxxxxxxxxx`)
   - `SUPABASE_ANON_KEY` → anon key Supabase (untuk log anti-spam)

3. **Jalankan**:
   ```bash
   npm start
   ```
   → Scan QR yang muncul dengan WhatsApp HP kamu (sekali saja; `LocalAuth` menyimpan sesi).

4. Pastikan **backend Next.js juga jalan** (`http://localhost:3000`), karena bot membaca daftar tugas dari `/api/tasks`.

## Jadwal & aturan
- Cek otomatis **07.00** dan **20.00** (bisa diubah di `.env` lewat `CRON_MORNING` / `CRON_EVENING`).
- Hanya tugas **belum selesai** yang dikirimi pesan jika deadline:
  - `H-2`, `H-1 (besok)`, `hari ini`, atau **sudah terlambat**.
- **Anti-spam**: setiap kondisi terkirim maksimal 1× per slot (pagi/malam) per hari, dicatat di tabel `wa_logs`.

## Catatan penting
- **HP kamu harus tetap terhubung** (WhatsApp Web sesi aktif) agar bot bisa kirim.
- Bot ini proses Node mandiri — **bukan** bagian dari Next.js dan **tidak bisa** jalan di Vercel (serverless).
- Saat deploy nanti, jalankan bot ini di host yang menyala terus (Railway / Render / VPS), terpisah dari backend.

## Tabel yang dibutuhkan
`wa_logs` — sudah termasuk di `migrate-notes-wa.sql` / `supabase-setup.sql`.