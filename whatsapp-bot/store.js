const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

const SESSION_ID = 'main';

function serialize(value) {
  if (value instanceof Uint8Array) {
    return { __b64: Buffer.from(value).toString('base64') };
  }
  if (Array.isArray(value)) return value.map(serialize);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = serialize(v);
    return out;
  }
  return value;
}

function deserialize(value) {
  if (Array.isArray(value)) return value.map(deserialize);
  if (value && typeof value === 'object') {
    if (typeof value.__b64 === 'string') {
      return Buffer.from(value.__b64, 'base64');
    }
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = deserialize(v);
    return out;
  }
  return value;
}

async function loadSession() {
  const { data, error } = await supabase
    .from('wa_sessions')
    .select('data')
    .eq('session_id', SESSION_ID)
    .maybeSingle();

  if (error) {
    console.warn('⚠️  Gagal load session:', error.message);
    return null;
  }
  if (!data || !data.data) return null;
  return deserialize(data.data);
}

async function saveSession(session) {
  const { error } = await supabase.from('wa_sessions').upsert({
    session_id: SESSION_ID,
    data: serialize(session),
    updated_at: new Date().toISOString(),
  });
  if (error) console.warn('⚠️  Gagal simpan session:', error.message);
}

async function clearSession() {
  const { error } = await supabase.from('wa_sessions').delete().eq('session_id', SESSION_ID);
  if (error) console.warn('⚠️  Gagal hapus session:', error.message);
}

module.exports = { loadSession, saveSession, clearSession };
