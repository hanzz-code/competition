-- =================================================================================
-- SQL SCRIPT: FIX MISSING role_id IN competition_staff
-- 
-- INSTRUKSI:
-- Jalankan script ini di Supabase SQL Editor untuk mengisi role_id yang NULL
-- pada tabel competition_staff. Script ini diperlukan karena 
-- recreate_staff_users.sql hanya mengisi kolom "role" (teks) tanpa role_id.
-- =================================================================================

-- Map role text 'mc' ke UUID role MC
UPDATE public.competition_staff 
SET role_id = '66666666-6666-6666-6666-666666666663' 
WHERE role = 'mc' AND role_id IS NULL;

-- Map role text 'receptionist' ke UUID role Receptionist
UPDATE public.competition_staff 
SET role_id = '66666666-6666-6666-6666-666666666664' 
WHERE role = 'receptionist' AND role_id IS NULL;

-- Map role text 'co-manager' ke UUID role Co-Manager
UPDATE public.competition_staff 
SET role_id = '66666666-6666-6666-6666-666666666662' 
WHERE role = 'co-manager' AND role_id IS NULL;

-- Verifikasi: Tampilkan staff yang masih punya role_id NULL
SELECT cs.id, cs.competition_id, cs.profile_id, cs.role, cs.role_id, p.email
FROM public.competition_staff cs
LEFT JOIN public.profiles p ON cs.profile_id = p.id
WHERE cs.role_id IS NULL;
