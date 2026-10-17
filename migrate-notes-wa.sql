-- Migrasi tambahan: Catatan (notes) + Log WhatsApp (wa_logs)
-- Jalankan di Supabase Dashboard → SQL Editor → Run

CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT,
  color TEXT DEFAULT 'yellow',
  pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE notes DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS wa_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID,
  sent_on DATE DEFAULT CURRENT_DATE,
  type TEXT,
  slot TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (task_id, sent_on, type, slot)
);

ALTER TABLE wa_logs DISABLE ROW LEVEL SECURITY;
