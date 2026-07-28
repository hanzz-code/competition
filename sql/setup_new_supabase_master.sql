-- =================================================================================
-- MASTER MIGRATION CONSOLIDATED: GAMEFORSMART COMPETITION PORTAL (MANAGE_COMPETITIONGFS)
-- 
-- SUPABASE TARGET: https://obylgjnklrfdplbcurgm.supabase.co
-- 
-- PETUNJUK:
-- 1. Buka Supabase Dashboard baru (https://supabase.com/dashboard/project/obylgjnklrfdplbcurgm)
-- 2. Masuk ke menu "SQL Editor" -> Klik "New Query"
-- 3. Copy & paste SELURUH isi berkas ini, lalu klik "Run".
-- =================================================================================

-- ---------------------------------------------------------------------------------
-- 1. TABEL UTAMA (PROFILES & ORGANISASI)
-- ---------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profiles (
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

CREATE TABLE IF NOT EXISTS public.organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id TEXT REFERENCES public.organizations(id) ON DELETE CASCADE,
    profile_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
    role_type TEXT NOT NULL CHECK (role_type IN ('owner', 'admin', 'member')),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(organization_id, profile_id)
);

CREATE TABLE IF NOT EXISTS public.permissions (
    id TEXT PRIMARY KEY,
    description TEXT
);

CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id TEXT REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(organization_id, name)
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id TEXT REFERENCES public.permissions(id) ON DELETE CASCADE,
    PRIMARY KEY(role_id, permission_id)
);

-- ---------------------------------------------------------------------------------
-- 2. TABEL KOMPETISI & KATEGORI
-- ---------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.competitions (
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
    creator_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
    organization_id TEXT REFERENCES public.organizations(id) ON DELETE SET NULL,
    prizes JSONB DEFAULT '[]'::jsonb,
    winners JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_competitions_creator_id ON public.competitions(creator_id);
CREATE INDEX IF NOT EXISTS idx_competitions_org_id ON public.competitions(organization_id);

CREATE TABLE IF NOT EXISTS public.competition_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------------
-- 3. TABEL PESERTA, BABAK, GRUP, & SCORING
-- ---------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.competition_participants (
    id TEXT PRIMARY KEY,
    competition_id TEXT NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    is_paid BOOLEAN DEFAULT false,
    is_finalist BOOLEAN DEFAULT false,
    is_present BOOLEAN DEFAULT false,
    category TEXT,
    school_name TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(competition_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_comp_participants_comp_id ON public.competition_participants(competition_id);
CREATE INDEX IF NOT EXISTS idx_comp_participants_user_id ON public.competition_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_comp_participants_filters ON public.competition_participants(competition_id, is_paid, is_finalist);

CREATE TABLE IF NOT EXISTS public.competition_rounds (
    id TEXT PRIMARY KEY,
    competition_id TEXT NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    round_order INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_competition_rounds_competition_id ON public.competition_rounds(competition_id);

CREATE TABLE IF NOT EXISTS public.competition_groups (
    id TEXT PRIMARY KEY,
    competition_id TEXT NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    stage TEXT NOT NULL,
    rounds JSONB DEFAULT '[]'::jsonb,
    source_group_ids TEXT[] DEFAULT '{}'::text[],
    category TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_competition_groups_comp_id ON public.competition_groups(competition_id);

CREATE TABLE IF NOT EXISTS public.competition_group_members (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL REFERENCES public.competition_groups(id) ON DELETE CASCADE,
    participant_id TEXT NOT NULL,
    score NUMERIC NOT NULL DEFAULT 0,
    time_seconds INTEGER NOT NULL DEFAULT 0,
    is_advanced BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_competition_group_members_group_id ON public.competition_group_members(group_id);

CREATE TABLE IF NOT EXISTS public.competition_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competition_id TEXT NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
    profile_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT,
    role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(competition_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_competition_staff_comp_id ON public.competition_staff(competition_id);
CREATE INDEX IF NOT EXISTS idx_competition_staff_profile_id ON public.competition_staff(profile_id);

-- ---------------------------------------------------------------------------------
-- 4. HELPER SECURITY DEFINER FUNCTIONS (Prevents RLS Infinite Recursion)
-- ---------------------------------------------------------------------------------

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
        AND (role = 'co-manager' OR role_id = '66666666-6666-6666-6666-666666666662')
        AND (
            profile_id = user_uuid::text 
            OR profile_id = (SELECT id FROM public.profiles WHERE auth_user_id = user_uuid)
        )
    );
END;
$$;

-- ---------------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ---------------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_staff ENABLE ROW LEVEL SECURITY;

-- Service Role Full Access
CREATE POLICY "Service role full access on all" ON public.profiles FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on competitions" ON public.competitions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Public & Authenticated Read Access
CREATE POLICY "Public read profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Public read competitions" ON public.competitions FOR SELECT USING (true);
CREATE POLICY "Public read categories" ON public.competition_categories FOR SELECT USING (true);
CREATE POLICY "Public read organizations" ON public.organizations FOR SELECT USING (true);

-- Authenticated Full Access for Manage Operations
CREATE POLICY "Allow authenticated all on competitions" ON public.competitions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated all on competition_participants" ON public.competition_participants FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated all on competition_rounds" ON public.competition_rounds FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated all on competition_groups" ON public.competition_groups FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated all on competition_group_members" ON public.competition_group_members FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated all on competition_staff" ON public.competition_staff FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated all on roles" ON public.roles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated all on role_permissions" ON public.role_permissions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated all on organization_members" ON public.organization_members FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated select permissions" ON public.permissions FOR SELECT TO authenticated USING (true);

-- ---------------------------------------------------------------------------------
-- 6. DATA INITIAL SEED (ORGANISASI, ROLES, PERMISSIONS, & KATEGORI)
-- ---------------------------------------------------------------------------------

-- A. Organisasi Default
INSERT INTO public.organizations (id, name, slug, status)
VALUES ('org_gfs', 'GameForSmart Organization', 'gameforsmart', 'active')
ON CONFLICT (id) DO NOTHING;

-- B. Master Permissions
INSERT INTO public.permissions (id, description) VALUES
    ('competition.create', 'Membuat kompetisi baru'),
    ('competition.update', 'Mengedit info kompetisi'),
    ('competition.delete', 'Menghapus kompetisi'),
    ('registration.manage', 'Mengelola pendaftar & check-in'),
    ('payment.verify', 'Verifikasi bukti pembayaran'),
    ('match.start', 'Memulai kuis & PIN permainan'),
    ('score.input', 'Mengubah nilai/skor grup tanding'),
    ('staff.manage', 'Mengelola staff kompetisi'),
    ('report.view', 'Melihat & export laporan kompetisi')
ON CONFLICT (id) DO NOTHING;

-- C. Peran Default
INSERT INTO public.roles (id, organization_id, name, description) VALUES
    ('66666666-6666-6666-6666-666666666661', 'org_gfs', 'Manager', 'Hak akses penuh kompetisi'),
    ('66666666-6666-6666-6666-666666666662', 'org_gfs', 'Co-Manager', 'Hak akses penuh kecuali delete/perubahan organisasi'),
    ('66666666-6666-6666-6666-666666666663', 'org_gfs', 'MC', 'Mengelola jalannya kuis & start match di panggung'),
    ('66666666-6666-6666-6666-666666666664', 'org_gfs', 'Receptionist', 'Mengelola registrasi, kehadiran, dan pembayaran')
ON CONFLICT (id) DO NOTHING;

-- D. Hubungkan Izin ke Peran Default
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT '66666666-6666-6666-6666-666666666661', id FROM public.permissions
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT '66666666-6666-6666-6666-666666666662', id FROM public.permissions WHERE id != 'competition.delete'
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id) VALUES
    ('66666666-6666-6666-6666-666666666663', 'match.start'),
    ('66666666-6666-6666-6666-666666666663', 'score.input'),
    ('66666666-6666-6666-6666-666666666664', 'registration.manage'),
    ('66666666-6666-6666-6666-666666666664', 'payment.verify')
ON CONFLICT DO NOTHING;

-- E. Kategori Kompetisi Default
INSERT INTO public.competition_categories (name, status) 
VALUES 
    ('SD', 'active'),
    ('SMP', 'active'),
    ('SMA', 'active'),
    ('Kuliah', 'active'),
    ('Umum', 'active')
ON CONFLICT (name) DO NOTHING;

-- =================================================================================
-- SELESAI: DATABASE MASTER CONSOLIDATED UNTUK MANAGE_COMPETITIONGFS BERHASIL DISIAPKAN
-- =================================================================================
