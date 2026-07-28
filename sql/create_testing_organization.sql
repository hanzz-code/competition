-- =================================================================================
-- SQL SCRIPT: CREATE DUMMY INSTANSI ACCOUNT FOR GCMP MULTI-TENANT TESTING
-- 
-- INSTRUKSI:
-- 1. Jalankan kueri SQL ini pada editor SQL di database Supabase Anda.
-- 2. Script ini akan membuat satu Organisasi baru ("Dinas Pendidikan Jawa Timur")
--    dan satu Akun Pengguna ("instansi_a@gfs.com") dengan password "password123".
-- 3. Akun ini secara otomatis diset sebagai OWNER di organisasi tersebut.
-- =================================================================================

DO $$
DECLARE
    -- UUID untuk Auth
    new_user_uuid UUID := gen_random_uuid();
    -- ID unik untuk profil public
    new_profile_id TEXT := 'usr_org_a_' || substring(gen_random_uuid()::text, 1, 8);
    -- Encrypted Password "password123"
    pass_hash TEXT := extensions.crypt('password123', extensions.gen_salt('bf', 10));
BEGIN
    -- 1. Bersihkan data lama jika pernah dibuat sebelumnya
    DELETE FROM auth.users WHERE email = 'instansi_a@gfs.com';
    DELETE FROM public.profiles WHERE email = 'instansi_a@gfs.com';
    DELETE FROM public.organizations WHERE id = 'org_dindik_jatim';

    -- 2. Buat Organisasi Uji Coba Baru
    INSERT INTO public.organizations (id, name, slug, status)
    VALUES ('org_dindik_jatim', 'Dinas Pendidikan Jawa Timur', 'dindik-jatim', 'active');

    -- 3. Buat User baru di auth.users (Bypass Email Verification)
    INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password, 
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data, 
        created_at, updated_at, confirmation_token, email_change, 
        email_change_token_new, recovery_token
    ) VALUES (
        '00000000-0000-0000-0000-000000000000', 
        new_user_uuid, 
        'authenticated', 
        'authenticated', 
        'instansi_a@gfs.com', 
        pass_hash, 
        now(), 
        '{"provider":"email","providers":["email"]}'::jsonb, 
        '{"full_name":"Dindik Jatim Admin", "username":"dindik_jatim_admin"}'::jsonb, 
        now(), now(), '', '', '', ''
    );

    -- 4. Buat Profil di public.profiles
    INSERT INTO public.profiles (
        id, auth_user_id, username, fullname, nickname, 
        role, language, country_id, is_blocked, email, created_at
    ) VALUES (
        new_profile_id, 
        new_user_uuid, 
        'dindik_jatim_admin', 
        'Dindik Jatim Admin', 
        'Dindik Jatim', 
        'competition', 
        'id', 1, false, 
        'instansi_a@gfs.com', 
        now()
    );

    -- 5. Daftarkan User sebagai OWNER (Pengelola Utama) di Organisasi Dindik Jatim
    INSERT INTO public.organization_members (organization_id, profile_id, role_type)
    VALUES ('org_dindik_jatim', new_profile_id, 'owner');

    RAISE NOTICE 'Organisasi Dinas Pendidikan Jawa Timur dan User instansi_a@gfs.com berhasil dibuat!';
END $$;
