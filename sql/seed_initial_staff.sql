-- =================================================================================
-- SQL SCRIPT: INITIAL STAFF ACCOUNTS & PROFILES SEED FOR NEW SUPABASE
-- 
-- INSTRUKSI:
-- 1. Jalankan script SQL ini pada Supabase SQL Editor (SETELAH setup_new_supabase_master.sql).
-- 2. Script ini mendaftarkan 4 akun pengelola/staff default dengan konfirmasi email otomatis:
--    - manager@gfs.com     (Password: password123)
--    - mc@gfs.com          (Password: password123)
--    - receptionist@gfs.com (Password: password123)
--    - comanager@gfs.com   (Password: password123)
-- =================================================================================

DO $$
DECLARE
    -- UUIDs for Auth.users
    uuid_manager UUID := gen_random_uuid();
    uuid_mc UUID := gen_random_uuid();
    uuid_receptionist UUID := gen_random_uuid();
    uuid_comanager UUID := gen_random_uuid();

    -- XIDs for public.profiles
    id_manager TEXT := 'usr_mngr_' || substring(gen_random_uuid()::text, 1, 8);
    id_mc TEXT := 'usr_mc_' || substring(gen_random_uuid()::text, 1, 8);
    id_receptionist TEXT := 'usr_rc_' || substring(gen_random_uuid()::text, 1, 8);
    id_comanager TEXT := 'usr_cm_' || substring(gen_random_uuid()::text, 1, 8);

    -- Password hash (password123)
    pass_hash TEXT := extensions.crypt('password123', extensions.gen_salt('bf', 10));
BEGIN
    -- 1. Bersihkan data lama jika ada (agar re-run safe)
    DELETE FROM public.organization_members 
    WHERE profile_id IN (SELECT id FROM public.profiles WHERE email IN ('manager@gfs.com', 'mc@gfs.com', 'receptionist@gfs.com', 'comanager@gfs.com'));

    DELETE FROM public.profiles WHERE email IN ('manager@gfs.com', 'mc@gfs.com', 'receptionist@gfs.com', 'comanager@gfs.com');
    DELETE FROM auth.users WHERE email IN ('manager@gfs.com', 'mc@gfs.com', 'receptionist@gfs.com', 'comanager@gfs.com');

    -- 2. INSERT KE AUTH.USERS (Bypass email confirmation: email_confirmed_at = NOW())
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
    VALUES ('00000000-0000-0000-0000-000000000000', uuid_manager, 'authenticated', 'authenticated', 'manager@gfs.com', pass_hash, now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Manager GFS", "username":"manager_gfs"}'::jsonb, now(), now(), '', '', '', '');

    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
    VALUES ('00000000-0000-0000-0000-000000000000', uuid_mc, 'authenticated', 'authenticated', 'mc@gfs.com', pass_hash, now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"MC GFS", "username":"mc_gfs"}'::jsonb, now(), now(), '', '', '', '');

    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
    VALUES ('00000000-0000-0000-0000-000000000000', uuid_receptionist, 'authenticated', 'authenticated', 'receptionist@gfs.com', pass_hash, now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Receptionist GFS", "username":"receptionist_gfs"}'::jsonb, now(), now(), '', '', '', '');

    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
    VALUES ('00000000-0000-0000-0000-000000000000', uuid_comanager, 'authenticated', 'authenticated', 'comanager@gfs.com', pass_hash, now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Co-Manager GFS", "username":"comanager_gfs"}'::jsonb, now(), now(), '', '', '', '');

    -- 3. INSERT KE PUBLIC.PROFILES
    INSERT INTO public.profiles (id, auth_user_id, username, fullname, nickname, role, language, country_id, is_blocked, email, created_at)
    VALUES (id_manager, uuid_manager, 'manager_gfs', 'Manager GFS', 'manager_gfs', 'competition', 'id', 1, false, 'manager@gfs.com', now());

    INSERT INTO public.profiles (id, auth_user_id, username, fullname, nickname, role, language, country_id, is_blocked, email, created_at)
    VALUES (id_mc, uuid_mc, 'mc_gfs', 'MC GFS', 'mc_gfs', 'competition', 'id', 1, false, 'mc@gfs.com', now());

    INSERT INTO public.profiles (id, auth_user_id, username, fullname, nickname, role, language, country_id, is_blocked, email, created_at)
    VALUES (id_receptionist, uuid_receptionist, 'receptionist_gfs', 'Receptionist GFS', 'receptionist_gfs', 'competition', 'id', 1, false, 'receptionist@gfs.com', now());

    INSERT INTO public.profiles (id, auth_user_id, username, fullname, nickname, role, language, country_id, is_blocked, email, created_at)
    VALUES (id_comanager, uuid_comanager, 'comanager_gfs', 'Co-Manager GFS', 'comanager_gfs', 'competition', 'id', 1, false, 'comanager@gfs.com', now());

    -- 4. DAFTARKAN KE ORGANISASI DEFAULT (org_gfs)
    INSERT INTO public.organization_members (organization_id, profile_id, role_type) VALUES
        ('org_gfs', id_manager, 'owner'),
        ('org_gfs', id_mc, 'member'),
        ('org_gfs', id_receptionist, 'member'),
        ('org_gfs', id_comanager, 'admin')
    ON CONFLICT (organization_id, profile_id) DO NOTHING;

    RAISE NOTICE '4 Akun Staff berhasil dibuat!';
    RAISE NOTICE 'Manager: manager@gfs.com / password123';
    RAISE NOTICE 'MC: mc@gfs.com / password123';
    RAISE NOTICE 'Receptionist: receptionist@gfs.com / password123';
    RAISE NOTICE 'Co-Manager: comanager@gfs.com / password123';
END $$;
