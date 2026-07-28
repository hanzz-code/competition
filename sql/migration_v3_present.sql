-- =================================================================================
-- MIGRATION V3: ADD ATTENDANCE COLUMN
-- 
-- INSTRUKSI:
-- Jalankan script SQL ini pada editor SQL di database Supabase utama Anda.
-- =================================================================================

ALTER TABLE competition_participants 
  ADD COLUMN IF NOT EXISTS is_present BOOLEAN DEFAULT false;
