-- =================================================================================
-- SQL SEED SCRIPT: 3 DATA KOMPETISI LENGKAP DENGAN JUARA (CHAMPION 1, 2, 3) & PRIZES
-- 
-- SUPABASE TARGET: https://obylgjnklrfdplbcurgm.supabase.co
-- 
-- INSTRUKSI:
-- 1. Buka Supabase Dashboard -> SQL Editor -> New Query.
-- 2. Paste SELURUH skrip SQL ini, lalu klik "Run".
-- 3. Skrip ini membuat 3 Kompetisi lengkap dengan:
--    - Data Juara 1, Juara 2, Juara 3 (Winners JSONB)
--    - Rincian Hadiah Uang & Trophy (Prizes JSONB)
--    - 24 Profil Player/Peserta lengkap dengan sekolah & status pendaftaran
--    - Leaderboard & Bagan Skor Grand Final
-- =================================================================================

-- 1. Bersihkan data sejenis sebelumnya (re-run safe)
DELETE FROM public.competition_group_members WHERE group_id LIKE 'grp_comp_%';
DELETE FROM public.competition_groups WHERE competition_id IN ('comp_nitro_sd_2026', 'comp_gfs_smp_2026', 'comp_astro_sma_2026');
DELETE FROM public.competition_rounds WHERE competition_id IN ('comp_nitro_sd_2026', 'comp_gfs_smp_2026', 'comp_astro_sma_2026');
DELETE FROM public.competition_participants WHERE competition_id IN ('comp_nitro_sd_2026', 'comp_gfs_smp_2026', 'comp_astro_sma_2026');
DELETE FROM public.competition_staff WHERE competition_id IN ('comp_nitro_sd_2026', 'comp_gfs_smp_2026', 'comp_astro_sma_2026');
DELETE FROM public.competitions WHERE id IN ('comp_nitro_sd_2026', 'comp_gfs_smp_2026', 'comp_astro_sma_2026');
DELETE FROM public.profiles WHERE id LIKE 'usr_player_%';

-- 2. Pastikan Organisasi Default org_gfs ada
INSERT INTO public.organizations (id, name, slug, status)
VALUES ('org_gfs', 'GameForSmart Organization', 'gameforsmart', 'active')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------------
-- 3. SISIPKAN 3 DATA KOMPETISI LENGKAP DENGAN JUARA & HADIAH (WINNERS & PRIZES)
-- ---------------------------------------------------------------------------------

INSERT INTO public.competitions (
    id, title, slug, status, description, rules, 
    registration_start_date, registration_end_date, 
    qualification_start_date, qualification_end_date, 
    final_start_date, final_end_date, 
    poster_url, category, registration_fee, prize_pool, organization_id,
    prizes, winners
) VALUES 
(
    'comp_nitro_sd_2026',
    'NitroQuiz National Championship SD 2026',
    'nitroquiz-national-championship-sd-2026',
    'completed',
    'Kompetisi kuis kecepatan dan ketangkasan sains & matematika tingkat SD se-Indonesia. Telah selesai dilaksanakan dengan sukses.',
    ARRAY['<p>1. Wajib hadir 30 menit sebelum pertandingan dimulai.</p>', '<p>2. Dilarang menggunakan kalkulator atau alat bantu hitung.</p>'],
    '2026-06-01 00:00:00+00', '2026-07-20 23:59:59+00',
    '2026-07-22 09:00:00+00', '2026-07-23 17:00:00+00',
    '2026-07-25 08:00:00+00', '2026-07-25 18:00:00+00',
    'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80',
    'SD', 'Gratis', 'Rp 5.000.000', 'org_gfs',
    '[
        {"place": "Juara 1", "category": "SD", "amount": "Rp 2.500.000", "reward": "Trophy Emas, Sertifikat Juara 1, Laptop Edukasi"},
        {"place": "Juara 2", "category": "SD", "amount": "Rp 1.500.000", "reward": "Trophy Perak, Sertifikat Juara 2, Tablet Edukasi"},
        {"place": "Juara 3", "category": "SD", "amount": "Rp 1.000.000", "reward": "Trophy Perunggu, Sertifikat Juara 3, Smartwatch"}
    ]'::jsonb,
    '{
        "juara_1": {"participant_id": "part_sd_1", "name": "Budi Santoso", "school": "SDN 01 Jakarta", "score": 1250, "time_seconds": 95},
        "juara_2": {"participant_id": "part_sd_2", "name": "Siti Rahmawati", "school": "SDN 05 Surabaya", "score": 1180, "time_seconds": 110},
        "juara_3": {"participant_id": "part_sd_3", "name": "Aditya Nugroho", "school": "SD Plus Bandung", "score": 1100, "time_seconds": 120}
    }'::jsonb
),
(
    'comp_gfs_smp_2026',
    'GameForSmart Esports SMP League 2026',
    'gameforsmart-esports-smp-league-2026',
    'completed',
    'Liga kompetisi kuis akademik & wawasan umum antar SMP tingkat nasional. Memperebutkan piala bergilir GameForSmart dan beasiswa pendidikan.',
    ARRAY['<p>1. Peserta mewakili sekolah SMP terdaftar.</p>', '<p>2. Keputusan juri bersifat mutlak dan tidak dapat diganggu gugat.</p>'],
    '2026-06-15 00:00:00+00', '2026-07-15 23:59:59+00',
    '2026-07-18 09:00:00+00', '2026-07-19 17:00:00+00',
    '2026-07-24 08:00:00+00', '2026-07-24 18:00:00+00',
    'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80',
    'SMP', 'Rp 25.000', 'Rp 8.000.000', 'org_gfs',
    '[
        {"place": "Juara 1", "category": "SMP", "amount": "Rp 4.000.000", "reward": "Piala Bergilir GFS, Beasiswa Pendidikan, Sertifikat Emas"},
        {"place": "Juara 2", "category": "SMP", "amount": "Rp 2.500.000", "reward": "Piala Perak, Beasiswa Pendidikan, Sertifikat Perak"},
        {"place": "Juara 3", "category": "SMP", "amount": "Rp 1.500.000", "reward": "Piala Perunggu, Medali, Sertifikat Perunggu"}
    ]'::jsonb,
    '{
        "juara_1": {"participant_id": "part_smp_1", "name": "Rian Hidayat", "school": "SMPN 1 Jakarta", "score": 1400, "time_seconds": 88},
        "juara_2": {"participant_id": "part_smp_2", "name": "Ani Safitri", "school": "SMPN 3 Surabaya", "score": 1320, "time_seconds": 102},
        "juara_3": {"participant_id": "part_smp_3", "name": "Eko Prasetyo", "school": "SMP Al-Azhar 9", "score": 1250, "time_seconds": 115}
    }'::jsonb
),
(
    'comp_astro_sma_2026',
    'AstroLearn High School Clash 2026',
    'astrolearn-high-school-clash-2026',
    'published',
    'Turnamen cerdas cermat sains futuristik & teknologi informasi untuk jenjang SMA/SMK se-Indonesia.',
    ARRAY['<p>1. Membawa Kartu Pelajar SMA/SMK aktif.</p>', '<p>2. Menjaga sportivitas selama turnamen berlangsung.</p>'],
    '2026-07-01 00:00:00+00', '2026-08-15 23:59:59+00',
    '2026-08-20 09:00:00+00', '2026-08-21 17:00:00+00',
    '2026-08-25 08:00:00+00', '2026-08-25 18:00:00+00',
    'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80',
    'SMA', 'Rp 50.000', 'Rp 15.000.000', 'org_gfs',
    '[
        {"place": "Juara 1", "category": "SMA", "amount": "Rp 7.500.000", "reward": "Trophy Utama AstroLearn, Golden Medal, Beasiswa Kuliah"},
        {"place": "Juara 2", "category": "SMA", "amount": "Rp 4.500.000", "reward": "Trophy Perak, Silver Medal, Voucher Pendidikan"},
        {"place": "Juara 3", "category": "SMA", "amount": "Rp 3.000.000", "reward": "Trophy Perunggu, Bronze Medal, E-Certificate"}
    ]'::jsonb,
    '{
        "juara_1": {"participant_id": "part_sma_1", "name": "Ahmad Fauzi", "school": "SMAN 8 Jakarta", "score": 1500, "time_seconds": 80},
        "juara_2": {"participant_id": "part_sma_2", "name": "Yuni Kartika", "school": "SMAN 3 Bandung", "score": 1420, "time_seconds": 92},
        "juara_3": {"participant_id": "part_sma_3", "name": "Bagus Aji", "school": "SMAN 1 Surabaya", "score": 1350, "time_seconds": 105}
    }'::jsonb
);

-- Hubungkan Staff Default ke 3 Kompetisi Ini
INSERT INTO public.competition_staff (competition_id, profile_id, role_id, role)
SELECT c.id, p.id, '66666666-6666-6666-6666-666666666663', 'mc'
FROM public.competitions c, public.profiles p WHERE p.email = 'mc@gfs.com' ON CONFLICT DO NOTHING;

INSERT INTO public.competition_staff (competition_id, profile_id, role_id, role)
SELECT c.id, p.id, '66666666-6666-6666-6666-666666666664', 'receptionist'
FROM public.competitions c, public.profiles p WHERE p.email = 'receptionist@gfs.com' ON CONFLICT DO NOTHING;

INSERT INTO public.competition_staff (competition_id, profile_id, role_id, role)
SELECT c.id, p.id, '66666666-6666-6666-6666-666666666662', 'co-manager'
FROM public.competitions c, public.profiles p WHERE p.email = 'comanager@gfs.com' ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------------
-- 4. SISIPKAN 24 AKUN PROFIL PESERTA/PLAYER
-- ---------------------------------------------------------------------------------

INSERT INTO public.profiles (id, username, fullname, nickname, role, email, is_blocked) VALUES
-- Peserta SD (8 orang)
('usr_player_sd_1', 'budi_santoso', 'Budi Santoso', 'Budi', 'user', 'budi.sd1@gfs.com', false),
('usr_player_sd_2', 'siti_rahma', 'Siti Rahmawati', 'Siti', 'user', 'siti.sd2@gfs.com', false),
('usr_player_sd_3', 'aditya_nugroho', 'Aditya Nugroho', 'Adit', 'user', 'adit.sd3@gfs.com', false),
('usr_player_sd_4', 'rizky_pratama', 'Rizky Pratama', 'Rizky', 'user', 'rizky.sd4@gfs.com', false),
('usr_player_sd_5', 'dewi_lestari', 'Dewi Lestari', 'Dewi', 'user', 'dewi.sd5@gfs.com', false),
('usr_player_sd_6', 'fajar_utomo', 'Fajar Utomo', 'Fajar', 'user', 'fajar.sd6@gfs.com', false),
('usr_player_sd_7', 'putri_utami', 'Putri Utami', 'Putri', 'user', 'putri.sd7@gfs.com', false),
('usr_player_sd_8', 'hendra_wijaya', 'Hendra Wijaya', 'Hendra', 'user', 'hendra.sd8@gfs.com', false),

-- Peserta SMP (8 orang)
('usr_player_smp_1', 'rian_hidayat', 'Rian Hidayat', 'Rian', 'user', 'rian.smp1@gfs.com', false),
('usr_player_smp_2', 'ani_safitri', 'Ani Safitri', 'Ani', 'user', 'ani.smp2@gfs.com', false),
('usr_player_smp_3', 'eko_prasetyo', 'Eko Prasetyo', 'Eko', 'user', 'eko.smp3@gfs.com', false),
('usr_player_smp_4', 'lia_kurnia', 'Lia Kurniawati', 'Lia', 'user', 'lia.smp4@gfs.com', false),
('usr_player_smp_5', 'agus_setiawan', 'Agus Setiawan', 'Agus', 'user', 'agus.smp5@gfs.com', false),
('usr_player_smp_6', 'ratna_sari', 'Ratna Sari', 'Ratna', 'user', 'ratna.smp6@gfs.com', false),
('usr_player_smp_7', 'dedi_supriadi', 'Dedi Supriadi', 'Dedi', 'user', 'dedi.smp7@gfs.com', false),
('usr_player_smp_8', 'wulandari_p', 'Wulandari Putri', 'Wulan', 'user', 'wulan.smp8@gfs.com', false),

-- Peserta SMA (8 orang)
('usr_player_sma_1', 'ahmad_fauzi', 'Ahmad Fauzi', 'Faiz', 'user', 'faiz.sma1@gfs.com', false),
('usr_player_sma_2', 'yuni_kartika', 'Yuni Kartika', 'Yuni', 'user', 'yuni.sma2@gfs.com', false),
('usr_player_sma_3', 'bagus_aji', 'Bagus Aji', 'Bagus', 'user', 'bagus.sma3@gfs.com', false),
('usr_player_sma_4', 'dian_pertiwi', 'Dian Pertiwi', 'Dian', 'user', 'dian.sma4@gfs.com', false),
('usr_player_sma_5', 'taufik_hidayat', 'Taufik Hidayat', 'Taufik', 'user', 'taufik.sma5@gfs.com', false),
('usr_player_sma_6', 'rara_wulan', 'Rara Wulandari', 'Rara', 'user', 'rara.sma6@gfs.com', false),
('usr_player_sma_7', 'gilang_ramadhan', 'Gilang Ramadhan', 'Gilang', 'user', 'gilang.sma7@gfs.com', false),
('usr_player_sma_8', 'maya_indah', 'Maya Indah', 'Maya', 'user', 'maya.sma8@gfs.com', false)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------------
-- 5. SISIPKAN PENDAFTARAN PESERTA (COMPETITION PARTICIPANTS)
-- ---------------------------------------------------------------------------------

INSERT INTO public.competition_participants (id, competition_id, user_id, is_paid, is_finalist, is_present, category, school_name) VALUES
-- SD Participants
('part_sd_1', 'comp_nitro_sd_2026', 'usr_player_sd_1', true, true, true, 'SD', 'SDN 01 Jakarta'),
('part_sd_2', 'comp_nitro_sd_2026', 'usr_player_sd_2', true, true, true, 'SD', 'SDN 05 Surabaya'),
('part_sd_3', 'comp_nitro_sd_2026', 'usr_player_sd_3', true, true, true, 'SD', 'SD Plus Bandung'),
('part_sd_4', 'comp_nitro_sd_2026', 'usr_player_sd_4', true, false, true, 'SD', 'SDIT Al-Azhar'),
('part_sd_5', 'comp_nitro_sd_2026', 'usr_player_sd_5', true, false, true, 'SD', 'SDN 02 Semarang'),
('part_sd_6', 'comp_nitro_sd_2026', 'usr_player_sd_6', true, false, true, 'SD', 'SD Muhammadiyah'),
('part_sd_7', 'comp_nitro_sd_2026', 'usr_player_sd_7', true, false, false, 'SD', 'SD Tarakanita'),
('part_sd_8', 'comp_nitro_sd_2026', 'usr_player_sd_8', true, false, true, 'SD', 'SD Cendekia'),

-- SMP Participants
('part_smp_1', 'comp_gfs_smp_2026', 'usr_player_smp_1', true, true, true, 'SMP', 'SMPN 1 Jakarta'),
('part_smp_2', 'comp_gfs_smp_2026', 'usr_player_smp_2', true, true, true, 'SMP', 'SMPN 3 Surabaya'),
('part_smp_3', 'comp_gfs_smp_2026', 'usr_player_smp_3', true, true, true, 'SMP', 'SMP Al-Azhar 9'),
('part_smp_4', 'comp_gfs_smp_2026', 'usr_player_smp_4', true, false, true, 'SMP', 'SMPN 2 Bandung'),
('part_smp_5', 'comp_gfs_smp_2026', 'usr_player_smp_5', true, false, true, 'SMP', 'SMP Petra Surabaya'),
('part_smp_6', 'comp_gfs_smp_2026', 'usr_player_smp_6', true, false, true, 'SMP', 'SMPN 5 Malang'),
('part_smp_7', 'comp_gfs_smp_2026', 'usr_player_smp_7', true, false, false, 'SMP', 'SMP Labschool'),
('part_smp_8', 'comp_gfs_smp_2026', 'usr_player_smp_8', true, false, true, 'SMP', 'SMPN 1 Yogyakarta'),

-- SMA Participants
('part_sma_1', 'comp_astro_sma_2026', 'usr_player_sma_1', true, true, true, 'SMA', 'SMAN 8 Jakarta'),
('part_sma_2', 'comp_astro_sma_2026', 'usr_player_sma_2', true, true, true, 'SMA', 'SMAN 3 Bandung'),
('part_sma_3', 'comp_astro_sma_2026', 'usr_player_sma_3', true, true, true, 'SMA', 'SMAN 1 Surabaya'),
('part_sma_4', 'comp_astro_sma_2026', 'usr_player_sma_4', true, false, true, 'SMA', 'SMA Taruna Nusantara'),
('part_sma_5', 'comp_astro_sma_2026', 'usr_player_sma_5', true, false, false, 'SMA', 'SMAN 5 Semarang'),
('part_sma_6', 'comp_astro_sma_2026', 'usr_player_sma_6', true, false, true, 'SMA', 'SMA Kanisius'),
('part_sma_7', 'comp_astro_sma_2026', 'usr_player_sma_7', true, false, false, 'SMA', 'SMAN 2 Yogyakarta'),
('part_sma_8', 'comp_astro_sma_2026', 'usr_player_sma_8', true, false, true, 'SMA', 'SMA Penabur')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------------
-- 6. SISIPKAN LEADERBOARD & SCORING GRAND FINAL (CHAMPIONSHIP STANDINGS)
-- ---------------------------------------------------------------------------------

-- Babak & Grup NitroQuiz SD
INSERT INTO public.competition_rounds (id, competition_id, name, round_order, status) VALUES
('rnd_sd_1', 'comp_nitro_sd_2026', 'Babak Kualifikasi', 1, 'completed'),
('rnd_sd_2', 'comp_nitro_sd_2026', 'Grand Final SD', 2, 'completed')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.competition_groups (id, competition_id, name, stage, category) VALUES
('grp_comp_sd_final', 'comp_nitro_sd_2026', 'Panggung Utama Grand Final SD', 'final', 'SD')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.competition_group_members (id, group_id, participant_id, score, time_seconds, is_advanced) VALUES
('gm_sd_1', 'grp_comp_sd_final', 'part_sd_1', 1250, 95, true), -- Juara 1: Budi Santoso
('gm_sd_2', 'grp_comp_sd_final', 'part_sd_2', 1180, 110, true), -- Juara 2: Siti Rahmawati
('gm_sd_3', 'grp_comp_sd_final', 'part_sd_3', 1100, 120, true), -- Juara 3: Aditya Nugroho
('gm_sd_4', 'grp_comp_sd_final', 'part_sd_4', 950, 135, false)
ON CONFLICT (id) DO NOTHING;

-- Babak & Grup GameForSmart SMP
INSERT INTO public.competition_rounds (id, competition_id, name, round_order, status) VALUES
('rnd_smp_1', 'comp_gfs_smp_2026', 'Babak Penyisihan', 1, 'completed'),
('rnd_smp_2', 'comp_gfs_smp_2026', 'Grand Final SMP', 2, 'completed')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.competition_groups (id, competition_id, name, stage, category) VALUES
('grp_comp_smp_final', 'comp_gfs_smp_2026', 'Panggung Utama Grand Final SMP', 'final', 'SMP')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.competition_group_members (id, group_id, participant_id, score, time_seconds, is_advanced) VALUES
('gm_smp_1', 'grp_comp_smp_final', 'part_smp_1', 1400, 88, true), -- Juara 1: Rian Hidayat
('gm_smp_2', 'grp_comp_smp_final', 'part_smp_2', 1320, 102, true), -- Juara 2: Ani Safitri
('gm_smp_3', 'grp_comp_smp_final', 'part_smp_3', 1250, 115, true), -- Juara 3: Eko Prasetyo
('gm_smp_4', 'grp_comp_smp_final', 'part_smp_4', 1050, 130, false)
ON CONFLICT (id) DO NOTHING;

-- Babak & Grup AstroLearn SMA
INSERT INTO public.competition_rounds (id, competition_id, name, round_order, status) VALUES
('rnd_sma_1', 'comp_astro_sma_2026', 'Babak Kualifikasi Online', 1, 'active'),
('rnd_sma_2', 'comp_astro_sma_2026', 'Grand Final SMA', 2, 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.competition_groups (id, competition_id, name, stage, category) VALUES
('grp_comp_sma_final', 'comp_astro_sma_2026', 'Babak Kualifikasi SMA Group A', 'kualifikasi', 'SMA')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.competition_group_members (id, group_id, participant_id, score, time_seconds, is_advanced) VALUES
('gm_sma_1', 'grp_comp_sma_final', 'part_sma_1', 1500, 80, true), -- Lead 1: Ahmad Fauzi
('gm_sma_2', 'grp_comp_sma_final', 'part_sma_2', 1420, 92, true), -- Lead 2: Yuni Kartika
('gm_sma_3', 'grp_comp_sma_final', 'part_sma_3', 1350, 105, true), -- Lead 3: Bagus Aji
('gm_sma_4', 'grp_comp_sma_final', 'part_sma_4', 1100, 120, false)
ON CONFLICT (id) DO NOTHING;

-- =================================================================================
-- SELESAI: 3 DATA KOMPETISI BESERTA JUARA 1, 2, 3 DAN PRIZES BERHASIL DISIAPKAN
-- =================================================================================
