-- =================================================================================
-- SQL SCRIPT: MEMBUAT AKUN PENGECOLA KOMPETISI (ROLE: competition)
-- 
-- INSTRUKSI:
-- 1. Jalankan script SQL ini pada editor SQL di database Supabase utama Anda.
-- 2. Anda dapat mengubah nilai email, password, username, dan fullname di bawah
--    sesuai kebutuhan sebelum menjalankan kueri.
-- =================================================================================

DO $$
DECLARE
    new_user_uuid UUID := gen_random_uuid();
    new_profile_id TEXT := 'usr_comp_' || substring(gen_random_uuid()::text, 1, 8);
    
    -- Kredensial Akun (Silakan ubah jika perlu)
    target_email TEXT := 'manager@gfs.com';
    target_password TEXT := 'password123';
    target_username TEXT := 'manager_gfs';
    target_fullname TEXT := 'Manager';
BEGIN
    -- 1. Cek apakah email sudah terdaftar di auth.users
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = target_email) THEN
        RAISE EXCEPTION 'Email % sudah terdaftar di database.', target_email;
    END IF;

    -- 2. Insert user baru ke dalam auth.users (Supabase Auth Schema)
    -- Menggunakan bcrypt hashing (bf dengan cost 10) bawaan Supabase
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        recovery_sent_at,
        last_sign_in_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        new_user_uuid,
        'authenticated',
        'authenticated',
        target_email,
        extensions.crypt(target_password, extensions.gen_salt('bf', 10)),
        now(),
        NULL,
        NULL,
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('full_name', target_fullname),
        now(),
        now(),
        '',
        '',
        '',
        ''
    );

    -- 3. Cek apakah profile dengan username sudah ada
    IF EXISTS (SELECT 1 FROM public.profiles WHERE username = target_username) THEN
        target_username := target_username || '_' || substring(gen_random_uuid()::text, 1, 4);
    END IF;

    -- 4. Insert profil terkait ke dalam public.profiles
    INSERT INTO public.profiles (
        id,
        auth_user_id,
        username,
        fullname,
        nickname,
        avatar_url,
        role,
        language,
        country_id,
        is_blocked,
        email,
        phone,
        created_at
    ) VALUES (
        new_profile_id,
        new_user_uuid,
        target_username,
        target_fullname,
        target_username,
        NULL,
        'competition', -- Role khusus untuk mengelola kompetisi
        'id',
        1, -- ID Negara default
        false,
        target_email,
        NULL,
        now()
    );

    RAISE NOTICE 'Akun pengelola berhasil dibuat!';
    RAISE NOTICE 'Email: %', target_email;
    RAISE NOTICE 'Password: %', target_password;
    RAISE NOTICE 'Role: competition';
    RAISE NOTICE 'Profile ID (XID): %', new_profile_id;

END $$;
