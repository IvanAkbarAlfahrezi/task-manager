-- StudyDesk / Task Manager Kuliah AI — Setup Supabase
-- Jalankan seluruh skrip ini di Supabase Dashboard → SQL Editor → Run.

-- 1) Kolom material pada tabel tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS material_name TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS material_text TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS material_url  TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS material_type TEXT;

-- 2) Tabel hasil AI (1 baris per tugas)
CREATE TABLE IF NOT EXISTS ai_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID UNIQUE REFERENCES tasks(id) ON DELETE CASCADE,
  explanation TEXT,
  answer TEXT,
  post_test JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE ai_responses DISABLE ROW LEVEL SECURITY;

-- 3) Bucket Storage untuk file materi
INSERT INTO storage.buckets (id, name, public)
VALUES ('materials', 'materials', true)
ON CONFLICT (id) DO NOTHING;
