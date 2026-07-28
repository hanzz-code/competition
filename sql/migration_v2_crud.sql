-- =================================================================================
-- MIGRATION V2: ALIGN SCHEMAS & CATEGORIES FOR CRUD
-- 
-- INSTRUKSI:
-- Jalankan script SQL ini pada editor SQL di database Supabase utama Anda.
-- =================================================================================

-- 1. Tambahkan kolom prizes dan winners ke tabel competitions jika belum ada
DO $$ 
BEGIN
    ALTER TABLE competitions 
      ADD COLUMN IF NOT EXISTS prizes JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS winners JSONB DEFAULT '{}'::jsonb;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Kolom prizes/winners gagal ditambahkan.';
END $$;

-- 2. Buat tabel competition_categories jika belum ada
CREATE TABLE IF NOT EXISTS competition_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed kategori default jika belum ada
INSERT INTO competition_categories (name, status) 
VALUES 
    ('SD', 'active'),
    ('SMP', 'active'),
    ('SMA', 'active'),
    ('Kuliah', 'active'),
    ('Umum', 'active')
ON CONFLICT (name) DO NOTHING;

-- Aktifkan RLS pada kategori
ALTER TABLE competition_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access to competition_categories for all" ON competition_categories;
CREATE POLICY "Allow read access to competition_categories for all" 
ON competition_categories FOR SELECT 
USING (true);

-- 3. Rekonstruksi tabel competition_groups dengan skema yang tepat
-- Hapus jika skema lama tidak kompatibel (dilakukan cascade untuk mempermudah restrukturisasi)
DROP TABLE IF EXISTS competition_group_members CASCADE;
DROP TABLE IF EXISTS competition_groups CASCADE;

CREATE TABLE competition_groups (
    id TEXT PRIMARY KEY,
    competition_id TEXT NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    stage TEXT NOT NULL,
    rounds JSONB DEFAULT '[]'::jsonb,
    source_group_ids TEXT[] DEFAULT '{}'::text[],
    category TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_competition_groups_comp_id ON competition_groups(competition_id);

-- Aktifkan RLS pada competition_groups
ALTER TABLE competition_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for authenticated on competition_groups" ON competition_groups;
CREATE POLICY "Allow all for authenticated on competition_groups" 
ON competition_groups FOR ALL 
USING (true)
WITH CHECK (true);

-- 4. Rekonstruksi tabel competition_group_members dengan skema yang tepat
CREATE TABLE competition_group_members (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL REFERENCES competition_groups(id) ON DELETE CASCADE,
    participant_id TEXT NOT NULL,
    score NUMERIC NOT NULL DEFAULT 0,
    time_seconds INTEGER NOT NULL DEFAULT 0,
    is_advanced BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_competition_group_members_group_id ON competition_group_members(group_id);

-- Aktifkan RLS pada competition_group_members
ALTER TABLE competition_group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for authenticated on competition_group_members" ON competition_group_members;
CREATE POLICY "Allow all for authenticated on competition_group_members" 
ON competition_group_members FOR ALL 
USING (true)
WITH CHECK (true);
