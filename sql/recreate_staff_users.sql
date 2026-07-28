-- =================================================================================
-- SQL SCRIPT: RECREATE & FORCE CONFIRM STAFF ACCOUNTS WITH EXPLICIT PROFILES
-- 
-- INSTRUKSI:
-- 1. Jalankan script SQL ini pada editor SQL di database Supabase utama Anda.
-- 2. Script ini secara manual menyisipkan baris di auth.users DAN public.profiles
--    untuk memastikan akun terdaftar 100% dan bisa login bypass email konfirmasi.
-- 3. Script ini juga mengisi role_id di competition_staff agar FK join berjalan.
-- 4. Script ini set organization_members.role_type = 'member' untuk staff (bukan admin).
-- =================================================================================

DO $$
DECLARE
    -- UUIDs for Auth
    uuid_mc UUID := gen_random_uuid();
    uuid_receptionist UUID := gen_random_uuid();
    uuid_comanager UUID := gen_random_uuid();

    -- XIDs for public.profiles
    id_mc TEXT := 'usr_mc_' || substring(gen_random_uuid()::text, 1, 8);
    id_receptionist TEXT := 'usr_rc_' || substring(gen_random_uuid()::text, 1, 8);
    id_comanager TEXT := 'usr_cm_' || substring(gen_random_uuid()::text, 1, 8);

    -- Passwords
    pass_hash TEXT := extensions.crypt('password123', extensions.gen_salt('bf', 10));
BEGIN
    -- 1. Bersihkan data lama secara menyeluruh (urutan penting karena FK)
    -- Hapus competition_staff dulu (FK ke profiles)
    DELETE FROM public.competition_staff 
    WHERE profile_id IN (SELECT id FROM public.profiles WHERE email IN ('mc@gfs.com', 'receptionist@gfs.com', 'comanager@gfs.com'));
    
    -- Hapus organization_members (FK ke profiles)
    DELETE FROM public.organization_members
    WHERE profile_id IN (SELECT id FROM public.profiles WHERE email IN ('mc@gfs.com', 'receptionist@gfs.com', 'comanager@gfs.com'));
    
    -- Hapus profiles dan auth users
    DELETE FROM public.profiles WHERE email IN ('mc@gfs.com', 'receptionist@gfs.com', 'comanager@gfs.com');
    DELETE FROM auth.users WHERE email IN ('mc@gfs.com', 'receptionist@gfs.com', 'comanager@gfs.com');

    -- 2. INSERT KE AUTH.USERS (Bypass email confirmation dengan set email_confirmed_at = NOW())
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
    VALUES ('00000000-0000-0000-0000-000000000000', uuid_mc, 'authenticated', 'authenticated', 'mc@gfs.com', pass_hash, now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"MC", "username":"mc_gfs"}'::jsonb, now(), now(), '', '', '', '');

    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
    VALUES ('00000000-0000-0000-0000-000000000000', uuid_receptionist, 'authenticated', 'authenticated', 'receptionist@gfs.com', pass_hash, now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Receptionist", "username":"receptionist_gfs"}'::jsonb, now(), now(), '', '', '', '');

    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
    VALUES ('00000000-0000-0000-0000-000000000000', uuid_comanager, 'authenticated', 'authenticated', 'comanager@gfs.com', pass_hash, now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Co-Manager", "username":"comanager_gfs"}'::jsonb, now(), now(), '', '', '', '');

    -- 3. INSERT KE PUBLIC.PROFILES SECARA MANUAL (Bypass trigger jika trigger tidak jalan/mati)
    INSERT INTO public.profiles (id, auth_user_id, username, fullname, nickname, role, language, country_id, is_blocked, email, created_at)
    VALUES (id_mc, uuid_mc, 'mc_gfs', 'MC', 'mc_gfs', 'competition', 'id', 1, false, 'mc@gfs.com', now())
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.profiles (id, auth_user_id, username, fullname, nickname, role, language, country_id, is_blocked, email, created_at)
    VALUES (id_receptionist, uuid_receptionist, 'receptionist_gfs', 'Receptionist', 'receptionist_gfs', 'competition', 'id', 1, false, 'receptionist@gfs.com', now())
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.profiles (id, auth_user_id, username, fullname, nickname, role, language, country_id, is_blocked, email, created_at)
    VALUES (id_comanager, uuid_comanager, 'comanager_gfs', 'Co-Manager', 'comanager_gfs', 'competition', 'id', 1, false, 'comanager@gfs.com', now())
    ON CONFLICT (id) DO NOTHING;

    -- 4. HUBUNGKAN KE ORGANISASI SEBAGAI "member" (BUKAN admin!)
    -- Staff seharusnya "member" di organisasi, bukan "admin"
    INSERT INTO public.organization_members (organization_id, profile_id, role_type)
    VALUES ('org_gfs', id_mc, 'member')
    ON CONFLICT (organization_id, profile_id) DO UPDATE SET role_type = 'member';

    INSERT INTO public.organization_members (organization_id, profile_id, role_type)
    VALUES ('org_gfs', id_receptionist, 'member')
    ON CONFLICT (organization_id, profile_id) DO UPDATE SET role_type = 'member';

    INSERT INTO public.organization_members (organization_id, profile_id, role_type)
    VALUES ('org_gfs', id_comanager, 'member')
    ON CONFLICT (organization_id, profile_id) DO UPDATE SET role_type = 'member';

    -- 5. HUBUNGKAN AKUN KE SEMUA KOMPETISI SEBAGAI STAFF (dengan role_id!)
    -- Hubungkan MC ke semua kompetisi
    INSERT INTO public.competition_staff (competition_id, profile_id, role, role_id)
    SELECT c.id, p.id, 'mc', '66666666-6666-6666-6666-666666666663'
    FROM public.competitions c
    CROSS JOIN public.profiles p
    WHERE p.email = 'mc@gfs.com'
    ON CONFLICT (competition_id, profile_id) DO UPDATE SET role = 'mc', role_id = '66666666-6666-6666-6666-666666666663';

    -- Hubungkan Receptionist ke semua kompetisi
    INSERT INTO public.competition_staff (competition_id, profile_id, role, role_id)
    SELECT c.id, p.id, 'receptionist', '66666666-6666-6666-6666-666666666664'
    FROM public.competitions c
    CROSS JOIN public.profiles p
    WHERE p.email = 'receptionist@gfs.com'
    ON CONFLICT (competition_id, profile_id) DO UPDATE SET role = 'receptionist', role_id = '66666666-6666-6666-6666-666666666664';

    -- Hubungkan Co-manager ke semua kompetisi
    INSERT INTO public.competition_staff (competition_id, profile_id, role, role_id)
    SELECT c.id, p.id, 'co-manager', '66666666-6666-6666-6666-666666666662'
    FROM public.competitions c
    CROSS JOIN public.profiles p
    WHERE p.email = 'comanager@gfs.com'
    ON CONFLICT (competition_id, profile_id) DO UPDATE SET role = 'co-manager', role_id = '66666666-6666-6666-6666-666666666662';

    RAISE NOTICE 'Staff berhasil dibuat, profil di-insert manual, org role = member, dan langsung aktif!';
END $$;
