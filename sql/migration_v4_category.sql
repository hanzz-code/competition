-- =================================================================================
-- MIGRATION: ADD CATEGORY COLUMN TO COMPETITION PARTICIPANTS
-- 
-- INSTRUKSI:
-- Jalankan query SQL ini pada editor SQL di database Supabase utama Anda.
-- Script ini akan menambahkan kolom `category` ke dalam tabel `competition_participants`
-- agar staff dapat melihat kategori (SD, SMP, SMA, SMK, dll.) dari masing-masing peserta.
-- =================================================================================

ALTER TABLE public.competition_participants ADD COLUMN IF NOT EXISTS category TEXT;
