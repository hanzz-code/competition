-- =================================================================================
-- COMPLETE SCHEMA MIGRATION: COMPETITION PORTAL
-- 
-- INSTRUKSI:
-- Jalankan script SQL ini pada editor SQL di database Supabase utama Anda.
-- Script ini akan membuat tabel-tabel utama kompetisi jika belum ada,
-- dan mengonfigurasi kebijakan RLS.
-- =================================================================================

-- 1. Tabel Profiles (jika belum ada)
CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    auth_user_id UUID UNIQUE,
    username TEXT NOT NULL,
    fullname TEXT,
    nickname TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'user',
    language TEXT DEFAULT 'id',
    country_id INTEGER,
    is_blocked BOOLEAN DEFAULT false,
    blocked_at TIMESTAMPTZ,
    email TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabel Competitions
CREATE TABLE IF NOT EXISTS competitions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'completed', 'coming_soon', 'finished')),
    description TEXT,
    rules TEXT[],
    registration_start_date TIMESTAMPTZ NOT NULL,
    registration_end_date TIMESTAMPTZ NOT NULL,
    qualification_start_date TIMESTAMPTZ,
    qualification_end_date TIMESTAMPTZ,
    final_start_date TIMESTAMPTZ,
    final_end_date TIMESTAMPTZ,
    poster_url TEXT,
    category TEXT,
    registration_fee TEXT,
    prize_pool TEXT,
    registration_link TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    creator_id TEXT REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_competitions_creator_id ON competitions(creator_id);

-- 3. Tabel Competition Participants (Pendaftar Kompetisi)
CREATE TABLE IF NOT EXISTS competition_participants (
    id TEXT PRIMARY KEY,
    competition_id TEXT NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    is_paid BOOLEAN DEFAULT false,
    is_finalist BOOLEAN DEFAULT false,
    school_name TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(competition_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_comp_participants_comp_id ON competition_participants(competition_id);
CREATE INDEX IF NOT EXISTS idx_comp_participants_user_id ON competition_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_comp_participants_filters ON competition_participants(competition_id, is_paid, is_finalist);

-- 4. Tabel Rounds (Ronde Pertandingan)
CREATE TABLE IF NOT EXISTS competition_rounds (
    id TEXT PRIMARY KEY,
    competition_id TEXT NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    round_order INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_competition_rounds_competition_id ON competition_rounds(competition_id);

-- 5. Tabel Groups (Grup Pertandingan)
CREATE TABLE IF NOT EXISTS competition_groups (
    id TEXT PRIMARY KEY,
    round_id TEXT NOT NULL REFERENCES competition_rounds(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    quiz_ids TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_competition_groups_round_id ON competition_groups(round_id);

-- 6. Tabel Group Members (Peserta Grup)
CREATE TABLE IF NOT EXISTS competition_group_members (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL REFERENCES competition_groups(id) ON DELETE CASCADE,
    participant_id TEXT NOT NULL, -- Merujuk ke competition_participants.id
    score NUMERIC NOT NULL DEFAULT 0,
    time_seconds NUMERIC NOT NULL DEFAULT 0,
    is_advanced BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_competition_group_members_group_id ON competition_group_members(group_id);

-- 7. Tabel Competition Staff ( MC, Receptionist, dll. )
CREATE TABLE IF NOT EXISTS competition_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competition_id TEXT NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
    profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('mc', 'receptionist', 'co-manager')),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(competition_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_competition_staff_comp_id ON competition_staff(competition_id);
CREATE INDEX IF NOT EXISTS idx_competition_staff_profile_id ON competition_staff(profile_id);

-- =================================================================================
-- HELPER FUNCTIONS FOR SECURITY DEFINER (Prevents RLS Infinite Recursion)
-- =================================================================================

-- 1. Check if user is competition creator (bypasses RLS recursively)
CREATE OR REPLACE FUNCTION public.is_competition_creator(comp_id TEXT, user_uuid UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.competitions 
        WHERE id = comp_id 
        AND (
            creator_id = user_uuid::text 
            OR creator_id = (SELECT id FROM public.profiles WHERE auth_user_id = user_uuid)
        )
    );
END;
$$;

-- 2. Check if user is assigned as staff in competition
CREATE OR REPLACE FUNCTION public.is_competition_staff(comp_id TEXT, user_uuid UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.competition_staff 
        WHERE competition_id = comp_id 
        AND (
            profile_id = user_uuid::text 
            OR profile_id = (SELECT id FROM public.profiles WHERE auth_user_id = user_uuid)
        )
    );
END;
$$;

-- 3. Check if user is assigned as co-manager in competition
CREATE OR REPLACE FUNCTION public.is_competition_co_manager(comp_id TEXT, user_uuid UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.competition_staff 
        WHERE competition_id = comp_id 
        AND role = 'co-manager'
        AND (
            profile_id = user_uuid::text 
            OR profile_id = (SELECT id FROM public.profiles WHERE auth_user_id = user_uuid)
        )
    );
END;
$$;

-- =================================================================================
-- SECURITY: ENABLE RLS & SETUP POLICIES
-- =================================================================================

ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_group_members ENABLE ROW LEVEL SECURITY;

-- A. Kebijakan (Policies) untuk Tabel Competitions
DROP POLICY IF EXISTS "Allow public to view published competitions" ON competitions;
CREATE POLICY "Allow public to view published competitions" 
ON competitions FOR SELECT 
USING (status = 'published' OR status = 'coming_soon' OR status = 'completed');

DROP POLICY IF EXISTS "Allow creators to manage their own competitions" ON competitions;
CREATE POLICY "Allow creators to manage their own competitions" 
ON competitions FOR ALL 
USING (creator_id = auth.uid()::text OR creator_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid()))
WITH CHECK (creator_id = auth.uid()::text OR creator_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Allow staff to view assigned competitions" ON competitions;
CREATE POLICY "Allow staff to view assigned competitions" 
ON competitions FOR SELECT 
USING (public.is_competition_staff(id, auth.uid()));

DROP POLICY IF EXISTS "Allow co-managers to update assigned competitions" ON competitions;
CREATE POLICY "Allow co-managers to update assigned competitions" 
ON competitions FOR UPDATE 
USING (public.is_competition_co_manager(id, auth.uid()));

-- B. Kebijakan (Policies) untuk Tabel Competition Staff
DROP POLICY IF EXISTS "Allow creators to manage staff list" ON competition_staff;
CREATE POLICY "Allow creators to manage staff list" 
ON competition_staff FOR ALL 
USING (public.is_competition_creator(competition_id, auth.uid()));

DROP POLICY IF EXISTS "Allow staff to view staff list of their assigned competitions" ON competition_staff;
CREATE POLICY "Allow staff to view staff list of their assigned competitions" 
ON competition_staff FOR SELECT 
USING (public.is_competition_staff(competition_id, auth.uid()));

-- C. Kebijakan (Policies) untuk Tabel Rounds, Groups, Members
DROP POLICY IF EXISTS "Allow all for authenticated" ON competition_rounds;
CREATE POLICY "Allow all for authenticated" ON competition_rounds FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for authenticated" ON competition_groups;
CREATE POLICY "Allow all for authenticated" ON competition_groups FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for authenticated" ON competition_group_members;
CREATE POLICY "Allow all for authenticated" ON competition_group_members FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for authenticated" ON competition_participants;
CREATE POLICY "Allow all for authenticated" ON competition_participants FOR ALL USING (true) WITH CHECK (true);
