require('dotenv').config();
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { Client, LocalAuth } = require('whatsapp-web.js');
const cron = require('node-cron');
const qrcode = require('qrcode-terminal');
const { createClient } = require('@supabase/supabase-js');

const API_URL = process.env.API_URL || 'http://localhost:3000/api';
const TARGET = process.env.WA_TARGET_NUMBER || '';
const CRON_MORNING = process.env.CRON_MORNING || '0 7 * * *';
const CRON_EVENING = process.env.CRON_EVENING || '0 20 * * *';
const URGENT_THRESHOLD = Number(process.env.URGENT_THRESHOLD || 2);
const ANTI_SPAM = (process.env.ANTI_SPAM || 'true').toLowerCase() !== 'false';
const DIGEST = (process.env.DIGEST || 'true').toLowerCase() !== 'false';
const MAX_SENDS_PER_DAY = Number(process.env.MAX_SENDS_PER_DAY || 0);
const TEST = process.argv.includes('--test');

const COUNT_FILE = path.join(__dirname, '.send-count.json');
function getTodayCount(today) {
  try {
    const c = JSON.parse(fs.readFileSync(COUNT_FILE, 'utf8'));
    return c.date === today ? Number(c.count) || 0 : 0;
  } catch {
    return 0;
  }
}
function bumpTodayCount(today, n = 1) {
  const count = getTodayCount(today) + n;
  try {
    fs.writeFileSync(COUNT_FILE, JSON.stringify({ date: today, count }));
  } catch (e) {
    console.warn('⚠️  Gagal simpan hitungan kirim:', e.message);
  }
  return count;
}

const supabase =
  process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

if (!supabase) console.warn('⚠️  SUPABASE_URL/ANON_KEY belum diset — log anti-spam (wa_logs) tidak aktif.');

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
  webVersionCache: { type: 'none' },
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--no-zygote', '--single-process'],
    executablePath: process.env.CHROME_BIN || '/usr/bin/google-chrome-stable'
  },
});

client.on('qr', (qr) => {
  console.log('\n📱 Buka WhatsApp HP kamu → Perangkat Tertaut → Tautkan Perangkat, lalu scan QR ini:\n');
  qrcode.generate(qr, { small: true });
});

client.on('authenticated', () => console.log('🔐 Autentikasi berhasil.'));
client.on('auth_failure', (m) => console.error('❌ Auth gagal:', m));
client.on('disconnected', (r) => console.error('🔌 Bot terputus:', r));

client.on('ready', async () => {
  console.log('✅ Bot WhatsApp siap berjalan!');
  console.log(`   Jadwal: pagi [${CRON_MORNING}] & malam [${CRON_EVENING}]`);
  console.log(`   Deadline mepet: H-${URGENT_THRESHOLD} / H-1 / hari ini / terlambat`);
  console.log(`   Mode: ${DIGEST ? 'DIGEST (gabung 1 pesan)' : 'per-tugas (1 pesan/tugas)'}`);
  console.log(`   Anti-spam: ${ANTI_SPAM ? 'AKTIF' : 'NONAKTIF (selalu kirim)'}`);
  console.log(`   Batas harian: ${MAX_SENDS_PER_DAY > 0 ? MAX_SENDS_PER_DAY + ' pesan/hari' : 'tanpa batas'}\n`);

  cron.schedule(CRON_MORNING, () => notifyDeadline('AM'));
  cron.schedule(CRON_EVENING, () => notifyDeadline('PM'));

  if (TEST) {
    console.log('🧪 MODE TEST: memicu pengecekan deadline sekarang...\n');
    await notifyDeadline('TEST');
    console.log('\n🧪 Mode test selesai. Bot tetap jalan (Ctrl+C untuk stop).\n');
  }

  if (process.stdin.isTTY) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    console.log('💬 Perintah: ketik "test" lalu Enter untuk cek & kirim sekarang, "q" lalu Enter untuk keluar.\n');
    rl.on('line', async (line) => {
      const cmd = line.trim().toLowerCase();
      if (cmd === 'test' || cmd === 'trigger') {
        await notifyDeadline('TEST');
      } else if (cmd === 'q' || cmd === 'quit' || cmd === 'exit') {
        console.log('👋 Keluar...');
        process.exit(0);
      } else if (cmd) {
        console.log('Perintah tidak dikenal. Ketik "test" untuk memicu, "q" untuk keluar.');
      }
    });
  }
});

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86400000);
}

function labelType(d) {
  if (d < 0) return 'overdue';
  if (d === 0) return 'today';
  if (d === 1) return 'H1';
  if (d === 2) return 'H2';
  return null;
}

function urgencyText(d) {
  if (d < 0) return `TERLAMBAT ${Math.abs(d)} HARI`;
  if (d === 0) return 'DEADLINE HARI INI';
  if (d === 1) return 'DEADLINE BESOK (H-1)';
  return `${d} HARI LAGI (H-${d})`;
}

function buildMessage(task, d) {
  const due = new Date(task.deadline);
  let dateLabel = due.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  if (String(task.deadline).includes('T')) {
    dateLabel += ` pukul ${due.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
  }

  const desc = task.description ? `${task.description}\n\n` : '';

  return (
    `*${urgencyText(d)}*\n\n` +
    `*${task.title}*\n` +
    desc +
    `Deadline: ${dateLabel}\n\n` +
    `Selesaikan sekarang, jangan ditunda.`
  );
}

function shortUrgency(d) {
  if (d < 0) return `terlambat ${Math.abs(d)} hari`;
  if (d === 0) return 'hari ini';
  if (d === 1) return 'besok (H-1)';
  return `${d} hari lagi`;
}

function clockLabel(deadline) {
  if (!String(deadline).includes('T')) return '';
  return ' • ' + new Date(deadline).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function buildDigest(items) {
  const lines = items
    .slice()
    .sort((a, b) => a.d - b.d)
    .map((it, i) => `${i + 1}. *${it.task.title}* — ${shortUrgency(it.d)}${clockLabel(it.task.deadline)}`);
  return (
    `*${items.length} TUGAS MENDESAK*\n\n` +
    lines.join('\n') +
    `\n\nSelesaikan sekarang, jangan ditunda.`
  );
}

async function hasLog(taskId, today, type, slot) {
  if (!supabase) return false;
  const { data, error } = await supabase
    .from('wa_logs')
    .select('id')
    .eq('task_id', taskId)
    .eq('sent_on', today)
    .eq('type', type)
    .eq('slot', slot)
    .maybeSingle();
  if (error) console.warn('⚠️  Gagal cek wa_logs:', error.message);
  return !!data;
}

async function addLog(taskId, today, type, slot) {
  if (!supabase) return;
  const { error } = await supabase.from('wa_logs').insert({
    task_id: taskId,
    sent_on: today,
    type,
    slot,
  });
  if (error) console.warn('⚠️  Gagal simpan wa_logs:', error.message);
}

async function notifyDeadline(slot) {
  if (!TARGET) {
    console.error('❌ WA_TARGET_NUMBER belum diisi di .env — perintah dibatalkan.');
    return;
  }

  console.log(`\n🔔 [${slot}] Pengecekan deadline...`);
  try {
    const res = await fetch(`${API_URL}/tasks`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Gagal ambil tugas');

    const digits = TARGET.replace(/\D/g, '');
    let targetId = `${digits}@c.us`;
    try {
      const numberId = await client.getNumberId(digits);
      if (!numberId) {
        console.error(`❌ Nomor tujuan ${TARGET} tidak terdaftar di WhatsApp — perintah dibatalkan.`);
        return;
      }
      targetId = numberId._serialized;
    } catch (e) {
      console.warn(`⚠️  Gagal verifikasi nomor (${e.message}); mencoba kirim ke ${targetId} langsung.`);
    }

    const today = new Date().toISOString().slice(0, 10);
    let remaining = MAX_SENDS_PER_DAY > 0 ? MAX_SENDS_PER_DAY - getTodayCount(today) : Infinity;
    if (MAX_SENDS_PER_DAY > 0) {
      if (remaining <= 0) {
        console.log(`   ⏹ Batas harian tercapai (${MAX_SENDS_PER_DAY} pesan/hari). Tidak mengirim.`);
        return;
      }
      console.log(`   Kuota hari ini: tersisa ${remaining}/${MAX_SENDS_PER_DAY} pesan.`);
    }

    const pending = [];
    for (const task of json.data) {
      if (task.status === 'completed' || !task.deadline) continue;
      const d = daysUntil(task.deadline);
      if (d === null || d > URGENT_THRESHOLD) continue;

      const type = labelType(d);
      if (!type) continue;

      if (ANTI_SPAM && (await hasLog(task.id, today, type, slot))) {
        console.log(`   ⏭ skip (sudah terkirim): ${task.title} [${type}/${slot}]`);
        continue;
      }

      pending.push({ task, d, type });
    }

    if (pending.length === 0) {
      console.log('   Selesai. Tidak ada tugas baru yang perlu dikirim.');
      return;
    }

    if (DIGEST) {
      try {
        await client.sendMessage(targetId, buildDigest(pending));
        bumpTodayCount(today, 1);
        console.log(`   ✅ terkirim (digest): ${pending.length} tugas`);
        if (ANTI_SPAM) for (const it of pending) await addLog(it.task.id, today, it.type, slot);
      } catch (err) {
        console.error('   ❌ gagal kirim digest:', err?.message || String(err));
      }
    } else {
      let sent = 0;
      for (const { task, d, type } of pending) {
        if (remaining <= 0) {
          console.log(`   ⏹ Batas harian tercapai (${MAX_SENDS_PER_DAY} pesan/hari). Sisa tugas dilewati.`);
          break;
        }
        try {
          await client.sendMessage(targetId, buildMessage(task, d));
          sent++;
          remaining--;
          bumpTodayCount(today, 1);
          console.log(`   ✅ terkirim: ${task.title} [${type}/${slot}]`);
          if (ANTI_SPAM) await addLog(task.id, today, type, slot);
        } catch (err) {
          console.error(`   ❌ gagal kirim "${task.title}":`, err?.message || String(err));
        }
      }
      console.log(`   Selesai. ${sent} pesan terkirim.`);
    }
  } catch (err) {
    console.error('❌ notifyDeadline error:', err.message);
  }
}

if (!TARGET) {
  console.warn('⚠️  WA_TARGET_NUMBER belum diset. Bot tetap hidup (QR bisa di-scan), tapi tidak akan mengirim pesan.');
}

console.log('🚀 Menjalankan bot WhatsApp... (perintah stop: Ctrl+C)');
client.initialize();
