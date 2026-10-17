# WhatsApp Bot — Deployment Guide

> Panduan migrasi dari `whatsapp-web.js` (Puppeteer) ke **Baileys** dan deploy ke Railway dengan session tersimpan di Supabase.

---

## Masalah Saat Ini

Bot crash di Railway karena dua alasan utama:

1. **Puppeteer tidak bisa jalan di Railway** — container Railway tidak punya system library (libglib, libnss, dll) yang dibutuhkan Chromium.
2. **Session tidak persist** — Railway filesystem bersifat ephemeral, setiap restart session hilang dan bot minta scan QR lagi.

---

## Solusi: Migrasi ke Baileys

[Baileys](https://github.com/WhiskeySockets/Baileys) adalah library WA yang **tidak menggunakan Puppeteer/Chromium**. Komunikasi langsung ke WhatsApp Web protocol, jauh lebih ringan dan cocok untuk server.

### Perbandingan

| Fitur | whatsapp-web.js | Baileys |
|---|---|---|
| Puppeteer / Chromium | ✅ Butuh | ❌ Tidak butuh |
| Memory usage | ~300-500 MB | ~50-100 MB |
| Session storage | Filesystem | Bisa custom (Supabase) |
| Railway compatible | ❌ Crash | ✅ Jalan |

---

## Langkah Migrasi

### 1. Install Baileys

```bash
cd whatsapp-bot
npm uninstall whatsapp-web.js
npm install @whiskeysockets/baileys
```

### 2. Tambah tabel session di Supabase

Jalankan SQL ini di **Supabase SQL Editor**:

```sql
CREATE TABLE IF NOT EXISTS wa_sessions (
  session_id TEXT PRIMARY KEY,
  data       JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3. Buat file `store.js` (Supabase session store)

Buat file baru `whatsapp-bot/store.js`:

```js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SESSION_ID = 'main';

async function loadSession() {
  const { data, error } = await supabase
    .from('wa_sessions')
    .select('data')
    .eq('session_id', SESSION_ID)
    .single();

  if (error || !data) return null;
  return data.data;
}

async function saveSession(authState) {
  await supabase
    .from('wa_sessions')
    .upsert({
      session_id: SESSION_ID,
      data: authState,
      updated_at: new Date().toISOString(),
    });
}

module.exports = { loadSession, saveSession };
```

### 4. Update `index.js` — ganti inisialisasi client

Ganti bagian inisialisasi `Client` (whatsapp-web.js) dengan kode Baileys berikut:

```js
require('dotenv').config();
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeInMemoryStore,
} = require('@whiskeysockets/baileys');
const { loadSession, saveSession } = require('./store');
const cron = require('node-cron');
const qrcode = require('qrcode-terminal');
const { createClient } = require('@supabase/supabase-js');
const pino = require('pino');

// ... (salin semua config env, fungsi helper, dll dari index.js lama)

let sock; // instance socket global

async function startBot() {
  // Load session dari Supabase
  let savedState = await loadSession();

  // Baileys butuh folder auth — buat sementara di memory
  const { state, saveCreds } = savedState
    ? { state: savedState, saveCreds: async () => {} }
    : await useMultiFileAuthState('./.baileys_auth');

  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }), // matikan log verbose
    printQRInTerminal: false,           // kita handle sendiri
  });

  // Simpan session ke Supabase setiap update credentials
  sock.ev.on('creds.update', async () => {
    await saveSession(sock.authState.creds);
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n📱 Scan QR ini di WhatsApp HP kamu:\n');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'open') {
      console.log('✅ Bot WhatsApp siap berjalan!');
      scheduleCron();
    }

    if (connection === 'close') {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;

      if (shouldReconnect) {
        console.log('🔄 Reconnecting...');
        startBot();
      } else {
        console.log('🚪 Bot logout. Hapus session dan restart.');
      }
    }
  });
}

function scheduleCron() {
  cron.schedule(CRON_MORNING, () => notifyDeadline('AM'));
  cron.schedule(CRON_EVENING, () => notifyDeadline('PM'));
  console.log(`   Jadwal: pagi [${CRON_MORNING}] & malam [${CRON_EVENING}]`);

  if (process.argv.includes('--test')) {
    console.log('🧪 MODE TEST: memicu pengecekan deadline sekarang...');
    notifyDeadline('TEST');
  }
}

// Ganti client.sendMessage dengan:
async function sendWAMessage(targetNumber, text) {
  const jid = targetNumber.replace(/\D/g, '') + '@s.whatsapp.net';
  await sock.sendMessage(jid, { text });
}

startBot();
```

> **Catatan:** Semua fungsi logika (daysUntil, buildMessage, notifyDeadline, dll) **tidak perlu diubah**, hanya bagian inisialisasi client dan `sendMessage`.

---

## Konfigurasi Railway

### Environment Variables

Tambahkan di Railway dashboard:

```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key   ← GANTI ke service_role!
SUPABASE_ANON_KEY=your-anon-key
WA_TARGET_NUMBER=628xxxxxxxxxx
API_URL=https://your-backend.vercel.app/api
CRON_MORNING=0 7 * * *
CRON_EVENING=0 20 * * *
URGENT_THRESHOLD=2
```

> ⚠️ **Penting:** Ganti `SUPABASE_ANON_KEY` ke `SUPABASE_SERVICE_ROLE_KEY` untuk operasi write ke tabel `wa_sessions`. Jangan commit key ini ke Git.

### `nixpacks.toml` (sudah ada)

File `nixpacks.toml` yang sudah ada cukup untuk Baileys karena **tidak butuh Chromium** lagi. Bisa disederhanakan menjadi:

```toml
[phases.build]
cmds = ["npm install"]

[start]
cmd = "node index.js"
```

---

## Alur Kerja Session

```
Deploy ke Railway
      ↓
Bot start → cek Supabase wa_sessions
      ↓
Session ada?  ──YES──→ Load session → Bot langsung ready (no QR)
      ↓ NO
Generate QR → Tampil di Railway logs
      ↓
User scan QR (sekali saja)
      ↓
Session tersimpan ke Supabase wa_sessions
      ↓
Restart/redeploy → Load session dari Supabase → No QR lagi ✅
```

---

## Cara Scan QR di Railway

1. Buka Railway dashboard → project bot → tab **Logs**
2. Tunggu QR muncul di log
3. Buka WhatsApp HP → Perangkat Tertaut → Tautkan Perangkat
4. Scan QR dari layar laptop
5. Bot akan langsung `ready` dan session tersimpan ke Supabase

---

## Troubleshooting

| Error | Penyebab | Solusi |
|---|---|---|
| `Cannot find module '@whiskeysockets/baileys'` | Belum install | `npm install @whiskeysockets/baileys` |
| `Connection closed: loggedOut` | Session expired / WA logout | Hapus row di `wa_sessions`, restart bot, scan QR lagi |
| `Supabase: row not found` | Tabel `wa_sessions` belum dibuat | Jalankan SQL di step 2 |
| Bot tidak kirim pesan | `WA_TARGET_NUMBER` salah format | Pastikan format: `628xxxxxxxxxx` (tanpa +, tanpa 0 di awal) |
| `API_URL` error | Backend Vercel belum deploy | Deploy backend dulu, isi URL yang benar |

---

## Arsitektur Final

```
User Browser
    ↓
Vercel (Frontend — React/Vite)
    ↓
Vercel (Backend — Next.js API)
    ↓
Supabase (PostgreSQL)
    ↑
Railway (WhatsApp Bot — Baileys)
    ↓
WhatsApp → User HP
```
