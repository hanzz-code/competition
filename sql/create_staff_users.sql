-- =================================================================================
-- SQL SCRIPT: MEMBUAT AKUN STAFF (MC, RECEPTIONIST, CO-MANAGER)
-- 
-- INSTRUKSI:
-- 1. Jalankan script SQL ini pada editor SQL di database Supabase utama Anda.
-- 2. Akun-akun ini akan didaftarkan di Auth + Profiles, lalu otomatis ditugaskan
--    ke semua kompetisi daerah yang ada saat ini sebagai staff uji coba.
-- =================================================================================

DO $$
DECLARE
    -- UUIDs for Auth.users
    uuid_mc UUID := gen_random_uuid();
    uuid_receptionist UUID := gen_random_uuid();
    uuid_comanager UUID := gen_random_uuid();

    -- XIDs for public.profile
    id_mc TEXT := 'usr_mc_' || substring(gen_random_uuid()::text, 1, 8);
    id_receptionist TEXT := 'usr_rc_' || substring(gen_random_uuid()::text, 1, 8);
    id_comanager TEXT := 'usr_cm_' || substring(gen_random_uuid()::text, 1, 8);

    -- Credentials
    pass_hash TEXT := extensions.crypt('password123', extensions.gen_salt('bf', 10));
    comp_rec RECORD;
BEGIN
    
    -- ==========================================
    -- 1. DAFTAR USER: MC (mc@gfs.com)
    -- ==========================================
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'mc@gfs.com') THEN
        INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
        VALUES ('00000000-0000-0000-0000-000000000000', uuid_mc, 'authenticated', 'authenticated', 'mc@gfs.com', pass_hash, now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"MC"}'::jsonb, now(), now(), '', '', '', '');
        
        INSERT INTO public.profiles (id, auth_user_id, username, fullname, nickname, role, language, country_id, is_blocked, email, created_at)
        VALUES (id_mc, uuid_mc, 'mc_gfs', 'MC', 'mc_gfs', 'competition', 'id', 1, false, 'mc@gfs.com', now());
    ELSE
        SELECT id, auth_user_id INTO id_mc, uuid_mc FROM public.profiles WHERE email = 'mc@gfs.com';
    END IF;

    -- ==========================================
    -- 2. DAFTAR USER: RECEPTIONIST (receptionist@gfs.com)
    -- ==========================================
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'receptionist@gfs.com') THEN
        INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
        VALUES ('00000000-0000-0000-0000-000000000000', uuid_receptionist, 'authenticated', 'authenticated', 'receptionist@gfs.com', pass_hash, now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Receptionist"}'::jsonb, now(), now(), '', '', '', '');
        
        INSERT INTO public.profiles (id, auth_user_id, username, fullname, nickname, role, language, country_id, is_blocked, email, created_at)
        VALUES (id_receptionist, uuid_receptionist, 'receptionist_gfs', 'Receptionist', 'receptionist_gfs', 'competition', 'id', 1, false, 'receptionist@gfs.com', now());
    ELSE
        SELECT id, auth_user_id INTO id_receptionist, uuid_receptionist FROM public.profiles WHERE email = 'receptionist@gfs.com';
    END IF;

    -- ==========================================
    -- 3. DAFTAR USER: CO-MANAGER (comanager@gfs.com)
    -- ==========================================
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'comanager@gfs.com') THEN
        INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
        VALUES ('00000000-0000-0000-0000-000000000000', uuid_comanager, 'authenticated', 'authenticated', 'comanager@gfs.com', pass_hash, now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Co-Manager"}'::jsonb, now(), now(), '', '', '', '');
        
        INSERT INTO public.profiles (id, auth_user_id, username, fullname, nickname, role, language, country_id, is_blocked, email, created_at)
        VALUES (id_comanager, uuid_comanager, 'comanager_gfs', 'Co-Manager', 'comanager_gfs', 'competition', 'id', 1, false, 'comanager@gfs.com', now());
    ELSE
        SELECT id, auth_user_id INTO id_comanager, uuid_comanager FROM public.profiles WHERE email = 'comanager@gfs.com';
    END IF;

    -- ==========================================
    -- 4. HUBUNGKAN AKUN KE SEMUA KOMPETISI SEBAGAI STAFF
    -- ==========================================
    FOR comp_rec IN SELECT id FROM public.competitions LOOP
        -- Link MC
        INSERT INTO public.competition_staff (competition_id, profile_id, role)
        VALUES (comp_rec.id, id_mc, 'mc')
        ON CONFLICT (competition_id, profile_id) DO NOTHING;

        -- Link Receptionist
        INSERT INTO public.competition_staff (competition_id, profile_id, role)
        VALUES (comp_rec.id, id_receptionist, 'receptionist')
        ON CONFLICT (competition_id, profile_id) DO NOTHING;

        -- Link Co-manager
        INSERT INTO public.competition_staff (competition_id, profile_id, role)
        VALUES (comp_rec.id, id_comanager, 'co-manager')
        ON CONFLICT (competition_id, profile_id) DO NOTHING;
    END LOOP;

    RAISE NOTICE 'Pembuatan & penugasan staff uji coba berhasil dilakukan!';
END $$;
