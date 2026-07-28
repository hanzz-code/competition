-- =================================================================================
-- MIGRATION: GCMP CORE (Fase 1 - Multi-Tenancy & Permission-Based RBAC)
-- 
-- INSTRUKSI:
-- Jalankan query SQL ini pada editor SQL di database Supabase utama Anda.
-- Script ini akan membuat struktur tabel untuk organisasi, peran, izin,
-- memigrasikan data lama secara aman, dan mengonfigurasi kebijakan RLS.
-- =================================================================================

-- 1. Buat Tabel Organisasi
CREATE TABLE IF NOT EXISTS public.organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Buat Tabel Anggota Organisasi
CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id TEXT REFERENCES public.organizations(id) ON DELETE CASCADE,
    profile_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
    role_type TEXT NOT NULL CHECK (role_type IN ('owner', 'admin', 'member')),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(organization_id, profile_id)
);

-- 3. Buat Tabel Master Permissions
CREATE TABLE IF NOT EXISTS public.permissions (
    id TEXT PRIMARY KEY,
    description TEXT
);

-- 4. Buat Tabel Peran Kustom Organisasi
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id TEXT REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(organization_id, name)
);

-- 5. Buat Tabel Relasi Peran & Izin (Junction Table)
CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id TEXT REFERENCES public.permissions(id) ON DELETE CASCADE,
    PRIMARY KEY(role_id, permission_id)
);

-- 6. Modifikasi Tabel Competitions: Tambah organization_id
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'competitions' 
          AND column_name = 'organization_id'
    ) THEN 
        ALTER TABLE public.competitions ADD COLUMN organization_id TEXT REFERENCES public.organizations(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 7. Modifikasi Tabel Competition Staff: Tambah role_id, hilangkan check constraint role jika ada
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'competition_staff' 
          AND column_name = 'role_id'
    ) THEN 
        ALTER TABLE public.competition_staff ADD COLUMN role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Longgarkan check constraint di competition_staff agar bisa menerima role_id kustom
ALTER TABLE public.competition_staff ALTER COLUMN role DROP NOT NULL;
ALTER TABLE public.competition_staff DROP CONSTRAINT IF EXISTS competition_staff_role_check;

-- =================================================================================
-- INITIAL DATA SEED & DATA MIGRATION
-- =================================================================================

-- A. Masukkan Organisasi Default
INSERT INTO public.organizations (id, name, slug, status)
VALUES ('org_gfs', 'GameForSmart Organization', 'gameforsmart', 'active')
ON CONFLICT (id) DO NOTHING;

-- B. Masukkan Master Permissions
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

-- C. Masukkan Peran Default untuk Organisasi Default
INSERT INTO public.roles (id, organization_id, name, description) VALUES
    ('66666666-6666-6666-6666-666666666661', 'org_gfs', 'Manager', 'Hak akses penuh kompetisi'),
    ('66666666-6666-6666-6666-666666666662', 'org_gfs', 'Co-Manager', 'Hak akses penuh kecuali delete/perubahan organisasi'),
    ('66666666-6666-6666-6666-666666666663', 'org_gfs', 'MC', 'Mengelola jalannya kuis & start match di panggung'),
    ('66666666-6666-6666-6666-666666666664', 'org_gfs', 'Receptionist', 'Mengelola registrasi, kehadiran, dan pembayaran')
ON CONFLICT (id) DO NOTHING;

-- D. Hubungkan Izin ke Peran Default
-- Manager: Semua izin
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT '66666666-6666-6666-6666-666666666661', id FROM public.permissions
ON CONFLICT DO NOTHING;

-- Co-Manager: Semua kecuali competition.delete
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT '66666666-6666-6666-6666-666666666662', id FROM public.permissions WHERE id != 'competition.delete'
ON CONFLICT DO NOTHING;

-- MC: match.start, score.input
INSERT INTO public.role_permissions (role_id, permission_id) VALUES
    ('66666666-6666-6666-6666-666666666663', 'match.start'),
    ('66666666-6666-6666-6666-666666666663', 'score.input')
ON CONFLICT DO NOTHING;

-- Receptionist: registration.manage, payment.verify
INSERT INTO public.role_permissions (role_id, permission_id) VALUES
    ('66666666-6666-6666-6666-666666666664', 'registration.manage'),
    ('66666666-6666-6666-6666-666666666664', 'payment.verify')
ON CONFLICT DO NOTHING;

-- E. Migrasikan Anggota Organisasi
-- Masukkan semua profil terdaftar sebagai owner/admin di organisasi default
INSERT INTO public.organization_members (organization_id, profile_id, role_type)
SELECT 'org_gfs', id, 'admin' FROM public.profiles
ON CONFLICT (organization_id, profile_id) DO NOTHING;

-- F. Kaitkan Kompetisi Lama dengan Organisasi Default
UPDATE public.competitions SET organization_id = 'org_gfs' WHERE organization_id IS NULL;

-- G. Migrasikan Staff Kompetisi Lama
-- Map role string ('mc', 'receptionist', 'co-manager') ke UUID role_id yang baru
UPDATE public.competition_staff SET role_id = '66666666-6666-6666-6666-666666666663' WHERE role = 'mc' AND role_id IS NULL;
UPDATE public.competition_staff SET role_id = '66666666-6666-6666-6666-666666666664' WHERE role = 'receptionist' AND role_id IS NULL;
UPDATE public.competition_staff SET role_id = '66666666-6666-6666-6666-666666666662' WHERE role = 'co-manager' AND role_id IS NULL;

-- =================================================================================
-- CONFIG SECURITY: RLS & HELPER FUNCTIONS
-- =================================================================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Fungsi Helper Baru: Cek Keanggotaan Organisasi
CREATE OR REPLACE FUNCTION public.is_org_member(org_id TEXT, user_uuid UUID)
RETURNS BOOLEAN SECURITY DEFINER SET search_path = public LANGUAGE plpgsql AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.organization_members 
        WHERE organization_id = org_id 
          AND profile_id = (SELECT id FROM public.profiles WHERE auth_user_id = user_uuid)
    );
END;
$$;

-- Fungsi Helper Baru: Cek Izin User Dinamik
CREATE OR REPLACE FUNCTION public.has_comp_permission(comp_id TEXT, user_uuid UUID, req_permission TEXT)
RETURNS BOOLEAN SECURITY DEFINER SET search_path = public LANGUAGE plpgsql AS $$
DECLARE
    user_profile_id TEXT;
    comp_org_id TEXT;
    is_creator BOOLEAN;
BEGIN
    -- Dapatkan profile_id dari auth_user_id
    SELECT id INTO user_profile_id FROM public.profiles WHERE auth_user_id = user_uuid;
    IF user_profile_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Dapatkan organization_id kompetisi
    SELECT organization_id INTO comp_org_id FROM public.competitions WHERE id = comp_id;

    -- Jika pembuat kompetisi langsung, izinkan bypass kustom
    SELECT EXISTS (
        SELECT 1 FROM public.competitions WHERE id = comp_id AND creator_id = user_profile_id
    ) INTO is_creator;
    IF is_creator THEN
        RETURN TRUE;
    END IF;

    -- Jika merupakan owner/admin di organisasi terkait, izinkan bypass kustom
    IF EXISTS (
        SELECT 1 FROM public.organization_members 
        WHERE organization_id = comp_org_id AND profile_id = user_profile_id AND role_type IN ('owner', 'admin')
    ) THEN
        RETURN TRUE;
    END IF;

    -- Cek relasi role staff kompetisi
    RETURN EXISTS (
        SELECT 1 FROM public.competition_staff cs
        JOIN public.role_permissions rp ON cs.role_id = rp.role_id
        WHERE cs.competition_id = comp_id 
          AND cs.profile_id = user_profile_id
          AND rp.permission_id = req_permission
    );
END;
$$;

-- RLS Policies Baru
DROP POLICY IF EXISTS "Allow members to view organization" ON organizations;
CREATE POLICY "Allow members to view organization" ON organizations FOR SELECT 
USING (public.is_org_member(id, auth.uid()));

DROP POLICY IF EXISTS "Allow members to view organization_members" ON organization_members;
CREATE POLICY "Allow members to view organization_members" ON organization_members FOR SELECT 
USING (public.is_org_member(organization_id, auth.uid()));

DROP POLICY IF EXISTS "Allow public to view permissions" ON permissions;
CREATE POLICY "Allow public to view permissions" ON permissions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow members to view roles" ON roles;
CREATE POLICY "Allow members to view roles" ON roles FOR SELECT 
USING (public.is_org_member(organization_id, auth.uid()));

DROP POLICY IF EXISTS "Allow members to view role_permissions" ON role_permissions;
CREATE POLICY "Allow members to view role_permissions" ON role_permissions FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM public.roles WHERE id = role_id AND public.is_org_member(organization_id, auth.uid())
));

-- Perbarui RLS tabel Competitions berbasis organisasi
DROP POLICY IF EXISTS "Allow staff to view assigned competitions" ON competitions;
CREATE POLICY "Allow staff to view assigned competitions" ON competitions FOR SELECT 
USING (
    creator_id = auth.uid()::text 
    OR creator_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    OR public.is_org_member(organization_id, auth.uid())
);
