-- Dukungan jam pada deadline tugas
-- Jalankan di Supabase Dashboard → SQL Editor → Run

ALTER TABLE tasks
  ALTER COLUMN deadline TYPE timestamptz
  USING NULLIF(deadline, '')::timestamptz;
