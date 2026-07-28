-- =================================================================================
-- SQL SEED SCRIPT: JUMBO DUMMY DATA FOR GCMP SANDBOX CHAMPIONSHIP 2026
-- 
-- INSTRUKSI:
-- 1. Jalankan kueri SQL ini pada editor SQL di database Supabase Anda.
-- 2. Script ini akan membuat 1 kompetisi sandbox ("comp_demo_gcmp"),
--    30 profil peserta baru (usr_dummy_1 s.d usr_dummy_30),
--    pendaftaran peserta (campuran SMP/SMA, lunas/belum, check-in/belum),
--    serta data bagan tanding lengkap (Semifinal, Final, Champion) beserta skornya.
-- =================================================================================

-- 0. Pastikan kolom is_present dan category pada competition_participants sudah ada
ALTER TABLE public.competition_participants ADD COLUMN IF NOT EXISTS is_present BOOLEAN DEFAULT false;
ALTER TABLE public.competition_participants ADD COLUMN IF NOT EXISTS category TEXT;

-- 1. Bersihkan data sandbox lama agar bisa di-run berulang kali
DELETE FROM public.competition_group_members WHERE group_id IN (
    'group_semi_smp_1', 'group_semi_smp_2', 'group_final_smp', 'group_champ_smp',
    'group_semi_sma_1', 'group_semi_sma_2', 'group_final_sma', 'group_champ_sma'
);
DELETE FROM public.competition_groups WHERE competition_id = 'comp_demo_gcmp';
DELETE FROM public.competition_participants WHERE competition_id = 'comp_demo_gcmp';
DELETE FROM public.competition_staff WHERE competition_id = 'comp_demo_gcmp';
DELETE FROM public.competitions WHERE id = 'comp_demo_gcmp';
DELETE FROM public.profiles WHERE id LIKE 'usr_dummy_%';

-- 2. Buat Organisasi Default (jika belum ada)
INSERT INTO public.organizations (id, name, slug, status)
VALUES ('org_gfs', 'GameForSmart Organization', 'gameforsmart', 'active')
ON CONFLICT (id) DO NOTHING;

-- 3. Sisipkan Kompetisi Sandbox
INSERT INTO public.competitions (
    id, title, slug, status, description, rules, 
    registration_start_date, registration_end_date, 
    qualification_start_date, qualification_end_date, 
    final_start_date, final_end_date, 
    category, registration_fee, prize_pool, organization_id
) VALUES (
    'comp_demo_gcmp',
    'GCMP Sandbox Championship 2026',
    'gcmp-sandbox-championship-2026',
    'published',
    'Kompetisi demo ini dirancang khusus untuk menguji rendering antarmuka visual GCMP: visualisasi bracket tanding SVG, filter kategori kelas (SMP/SMA), tabel verifikasi check-in, dan logistik verifikasi pembayaran.',
    ARRAY[
        '<p>1. Peserta wajib melakukan Check-in fisik di meja registrasi sebelum tanding.</p>',
        '<p>2. Kompetisi dibagi menjadi Babak Kualifikasi Online, Semifinal Regional, dan Grand Final.</p>',
        '<p>3. Dilarang keras membawa alat bantu hitung atau gadget ke panggung tanding.</p>'
    ],
    '2026-06-01 00:00:00+00', '2026-07-20 23:59:59+00',
    '2026-07-22 09:00:00+00', '2026-07-23 17:00:00+00',
    '2026-07-25 08:00:00+00', '2026-07-25 18:00:00+00',
    'SMP, SMA',
    'Rp 50.000',
    'Rp 10.000.000',
    'org_gfs'
);

-- 4. Hubungkan Akun Staff Utama ke Kompetisi Sandbox
INSERT INTO public.competition_staff (competition_id, profile_id, role_id, role)
SELECT 'comp_demo_gcmp', id, '66666666-6666-6666-6666-666666666663', 'mc'
FROM public.profiles WHERE email = 'mc@gfs.com'
ON CONFLICT DO NOTHING;

INSERT INTO public.competition_staff (competition_id, profile_id, role_id, role)
SELECT 'comp_demo_gcmp', id, '66666666-6666-6666-6666-666666666664', 'receptionist'
FROM public.profiles WHERE email = 'receptionist@gfs.com'
ON CONFLICT DO NOTHING;

INSERT INTO public.competition_staff (competition_id, profile_id, role_id, role)
SELECT 'comp_demo_gcmp', id, '66666666-6666-6666-6666-666666666662', 'co-manager'
FROM public.profiles WHERE email = 'comanager@gfs.com'
ON CONFLICT DO NOTHING;

-- 5. Sisipkan 30 Profil Peserta Baru (usr_dummy_1 s.d usr_dummy_30)
INSERT INTO public.profiles (id, username, fullname, nickname, role, email, is_blocked) VALUES
('usr_dummy_1', 'budi_santos', 'Budi Santoso', 'Budi', 'user', 'dummy1@gfs.com', false),
('usr_dummy_2', 'siti_aminah', 'Siti Aminah', 'Siti', 'user', 'dummy2@gfs.com', false),
('usr_dummy_3', 'aditya_wij', 'Aditya Wijaya', 'Adit', 'user', 'dummy3@gfs.com', false),
('usr_dummy_4', 'rizky_prat', 'Rizky Pratama', 'Rizky', 'user', 'dummy4@gfs.com', false),
('usr_dummy_5', 'dewi_lestari', 'Dewi Lestari', 'Dewi', 'user', 'dummy5@gfs.com', false),
('usr_dummy_6', 'fajar_nugro', 'Fajar Nugroho', 'Fajar', 'user', 'dummy6@gfs.com', false),
('usr_dummy_7', 'putri_utami', 'Putri Utami', 'Putri', 'user', 'dummy7@gfs.com', false),
('usr_dummy_8', 'hendra_wij', 'Hendra Wijaya', 'Hendra', 'user', 'dummy8@gfs.com', false),
('usr_dummy_9', 'mega_lest', 'Mega Lestari', 'Mega', 'user', 'dummy9@gfs.com', false),
('usr_dummy_10', 'rian_hidayat', 'Rian Hidayat', 'Rian', 'user', 'dummy10@gfs.com', false),
('usr_dummy_11', 'ani_safitri', 'Ani Safitri', 'Ani', 'user', 'dummy11@gfs.com', false),
('usr_dummy_12', 'eko_prasetyo', 'Eko Prasetyo', 'Eko', 'user', 'dummy12@gfs.com', false),
('usr_dummy_13', 'lia_kurnia', 'Lia Kurniawati', 'Lia', 'user', 'dummy13@gfs.com', false),
('usr_dummy_14', 'agus_setia', 'Agus Setiawan', 'Agus', 'user', 'dummy14@gfs.com', false),
('usr_dummy_15', 'ratna_sari', 'Ratna Sari', 'Ratna', 'user', 'dummy15@gfs.com', false),
('usr_dummy_16', 'dedi_supri', 'Dedi Supriadi', 'Dedi', 'user', 'dummy16@gfs.com', false),
('usr_dummy_17', 'wulan_dari', 'Wulandari', 'Wulan', 'user', 'dummy17@gfs.com', false),
('usr_dummy_18', 'ahmad_faiz', 'Ahmad Fauzi', 'Faiz', 'user', 'dummy18@gfs.com', false),
('usr_dummy_19', 'yuni_kartika', 'Yuni Kartika', 'Yuni', 'user', 'dummy19@gfs.com', false),
('usr_dummy_20', 'bagus_aji', 'Bagus Aji', 'Bagus', 'user', 'dummy20@gfs.com', false),
('usr_dummy_21', 'dian_pertiwi', 'Dian Pertiwi', 'Dian', 'user', 'dummy21@gfs.com', false),
('usr_dummy_22', 'taufik_h', 'Taufik Hidayat', 'Taufik', 'user', 'dummy22@gfs.com', false),
('usr_dummy_23', 'rara_wulan', 'Rara Wulandari', 'Rara', 'user', 'dummy23@gfs.com', false),
('usr_dummy_24', 'gilang_ram', 'Gilang Ramadhan', 'Gilang', 'user', 'dummy24@gfs.com', false),
('usr_dummy_25', 'tari_indah', 'Lestari Indah', 'Tari', 'user', 'dummy25@gfs.com', false),
('usr_dummy_26', 'doni_setia', 'Doni Setiawan', 'Doni', 'user', 'dummy26@gfs.com', false),
('usr_dummy_27', 'ike_nur', 'Ike Nurjanah', 'Ike', 'user', 'dummy27@gfs.com', false),
('usr_dummy_28', 'arif_budiman', 'Arif Budiman', 'Arif', 'user', 'dummy28@gfs.com', false),
('usr_dummy_29', 'santi_p', 'Santi Paramitha', 'Santi', 'user', 'dummy29@gfs.com', false),
('usr_dummy_30', 'galang_p', 'Galang Pratama', 'Galang', 'user', 'dummy30@gfs.com', false);

-- 6. Pendaftaran Peserta (competition_participants)
-- 15 Peserta kategori SMP (lunas, hadir)
-- 15 Peserta kategori SMA (variasi lunas/tidak, hadir/tidak)
INSERT INTO public.competition_participants (id, competition_id, user_id, is_paid, is_finalist, school_name, is_present, category) VALUES
('part_dummy_1', 'comp_demo_gcmp', 'usr_dummy_1', true, false, 'SMP Negeri 1 Jakarta', true, 'SMP'),
('part_dummy_2', 'comp_demo_gcmp', 'usr_dummy_2', true, false, 'SMP Negeri 1 Jakarta', true, 'SMP'),
('part_dummy_3', 'comp_demo_gcmp', 'usr_dummy_3', true, false, 'SMP Taruna Bakti', true, 'SMP'),
('part_dummy_4', 'comp_demo_gcmp', 'usr_dummy_4', true, false, 'SMP Taruna Bakti', true, 'SMP'),
('part_dummy_5', 'comp_demo_gcmp', 'usr_dummy_5', true, false, 'SMP Labschool', true, 'SMP'),
('part_dummy_6', 'comp_demo_gcmp', 'usr_dummy_6', true, false, 'SMP Labschool', true, 'SMP'),
('part_dummy_7', 'comp_demo_gcmp', 'usr_dummy_7', true, false, 'SMP Kristen Yusuf', true, 'SMP'),
('part_dummy_8', 'comp_demo_gcmp', 'usr_dummy_8', true, false, 'SMP Kristen Yusuf', true, 'SMP'),
('part_dummy_9', 'comp_demo_gcmp', 'usr_dummy_9', true, false, 'SMP Al Azhar', true, 'SMP'),
('part_dummy_10', 'comp_demo_gcmp', 'usr_dummy_10', true, false, 'SMP Al Azhar', true, 'SMP'),
('part_dummy_11', 'comp_demo_gcmp', 'usr_dummy_11', true, false, 'SMP Negeri 5 Bandung', true, 'SMP'),
('part_dummy_12', 'comp_demo_gcmp', 'usr_dummy_12', true, false, 'SMP Negeri 5 Bandung', true, 'SMP'),
('part_dummy_13', 'comp_demo_gcmp', 'usr_dummy_13', true, false, 'SMP Islam Terpadu', true, 'SMP'),
('part_dummy_14', 'comp_demo_gcmp', 'usr_dummy_14', true, false, 'SMP Islam Terpadu', true, 'SMP'),
('part_dummy_15', 'comp_demo_gcmp', 'usr_dummy_15', true, false, 'SMP Negeri 2 Surabaya', true, 'SMP'),

('part_dummy_16', 'comp_demo_gcmp', 'usr_dummy_16', true, false, 'SMA Negeri 8 Jakarta', true, 'SMA'),
('part_dummy_17', 'comp_demo_gcmp', 'usr_dummy_17', true, false, 'SMA Negeri 8 Jakarta', true, 'SMA'),
('part_dummy_18', 'comp_demo_gcmp', 'usr_dummy_18', true, false, 'SMA Taruna Nusantara', true, 'SMA'),
('part_dummy_19', 'comp_demo_gcmp', 'usr_dummy_19', true, false, 'SMA Taruna Nusantara', true, 'SMA'),
('part_dummy_20', 'comp_demo_gcmp', 'usr_dummy_20', true, false, 'SMA 3 Bandung', true, 'SMA'),
('part_dummy_21', 'comp_demo_gcmp', 'usr_dummy_21', true, false, 'SMA 3 Bandung', true, 'SMA'),
('part_dummy_22', 'comp_demo_gcmp', 'usr_dummy_22', true, false, 'SMA Kristen 1 Penabur', true, 'SMA'),
('part_dummy_23', 'comp_demo_gcmp', 'usr_dummy_23', true, false, 'SMA Kristen 1 Penabur', true, 'SMA'),
('part_dummy_24', 'comp_demo_gcmp', 'usr_dummy_24', true, false, 'SMA Al Azhar 1', true, 'SMA'),
('part_dummy_25', 'comp_demo_gcmp', 'usr_dummy_25', true, false, 'SMA Al Azhar 1', true, 'SMA'),
('part_dummy_26', 'comp_demo_gcmp', 'usr_dummy_26', false, false, 'SMA Gonzaga', false, 'SMA'), -- Belum bayar, belum check-in
('part_dummy_27', 'comp_demo_gcmp', 'usr_dummy_27', false, false, 'SMA Gonzaga', false, 'SMA'), -- Belum bayar, belum check-in
('part_dummy_28', 'comp_demo_gcmp', 'usr_dummy_28', true, false, 'SMA Negeri 1 Yogyakarta', false, 'SMA'), -- Lunas, belum check-in
('part_dummy_29', 'comp_demo_gcmp', 'usr_dummy_29', true, false, 'SMA Negeri 1 Yogyakarta', true, 'SMA'),
('part_dummy_30', 'comp_demo_gcmp', 'usr_dummy_30', true, false, 'SMA Kanisius', true, 'SMA');

-- 7. Sisipkan Grup Pertandingan Dinamis (competition_groups)
INSERT INTO public.competition_groups (id, competition_id, name, stage, source_group_ids, category) VALUES
-- SMP Groups
('group_semi_smp_1', 'comp_demo_gcmp', 'Semifinal SMP Group 1', 'Semifinal', null, 'SMP'),
('group_semi_smp_2', 'comp_demo_gcmp', 'Semifinal SMP Group 2', 'Semifinal', null, 'SMP'),
('group_final_smp', 'comp_demo_gcmp', 'Final SMP', 'Final', array['group_semi_smp_1', 'group_semi_smp_2'], 'SMP'),
('group_champ_smp', 'comp_demo_gcmp', 'Juara SMP', 'Champion', array['group_final_smp'], 'SMP'),
-- SMA Groups
('group_semi_sma_1', 'comp_demo_gcmp', 'Semifinal SMA Group 1', 'Semifinal', null, 'SMA'),
('group_semi_sma_2', 'comp_demo_gcmp', 'Semifinal SMA Group 2', 'Semifinal', null, 'SMA'),
('group_final_sma', 'comp_demo_gcmp', 'Final SMA', 'Final', array['group_semi_sma_1', 'group_semi_sma_2'], 'SMA'),
('group_champ_sma', 'comp_demo_gcmp', 'Juara SMA', 'Champion', array['group_final_sma'], 'SMA');

-- 8. Sisipkan Anggota Grup Pertandingan Beserta Nilai Sandbox (competition_group_members)
INSERT INTO public.competition_group_members (id, group_id, participant_id, score, time_seconds, is_advanced) VALUES
-- SMP Semifinal Group 1 (Budi, Siti, Adit lolos ke final)
('gm_semi_smp_1_1', 'group_semi_smp_1', 'part_dummy_1', 95, 82, true),
('gm_semi_smp_1_2', 'group_semi_smp_1', 'part_dummy_2', 88, 90, true),
('gm_semi_smp_1_3', 'group_semi_smp_1', 'part_dummy_3', 82, 110, true),
('gm_semi_smp_1_4', 'group_semi_smp_1', 'part_dummy_4', 60, 150, false),
('gm_semi_smp_1_5', 'group_semi_smp_1', 'part_dummy_5', 45, 120, false),

-- SMP Semifinal Group 2 (Rizky, Dewi, Fajar lolos ke final)
('gm_semi_smp_2_1', 'group_semi_smp_2', 'part_dummy_6', 92, 75, true),
('gm_semi_smp_2_2', 'group_semi_smp_2', 'part_dummy_7', 90, 85, true),
('gm_semi_smp_2_3', 'group_semi_smp_2', 'part_dummy_8', 85, 95, true),
('gm_semi_smp_2_4', 'group_semi_smp_2', 'part_dummy_9', 70, 100, false),
('gm_semi_smp_2_5', 'group_semi_smp_2', 'part_dummy_10', 50, 140, false),

-- SMP Final (Budi, Rizky, Dewi memperebutkan gelar)
('gm_final_smp_1', 'group_final_smp', 'part_dummy_1', 98, 88, true), -- Lolos ke Podium
('gm_final_smp_2', 'group_final_smp', 'part_dummy_6', 94, 92, true), -- Lolos ke Podium
('gm_final_smp_3', 'group_final_smp', 'part_dummy_7', 90, 95, true), -- Lolos ke Podium
('gm_final_smp_4', 'group_final_smp', 'part_dummy_2', 80, 105, false),
('gm_final_smp_5', 'group_final_smp', 'part_dummy_3', 75, 110, false),
('gm_final_smp_6', 'group_final_smp', 'part_dummy_8', 70, 120, false),

-- SMP Champion (Papan Podium Juara)
('gm_champ_smp_1', 'group_champ_smp', 'part_dummy_1', 98, 88, true),  -- Juara 1
('gm_champ_smp_2', 'group_champ_smp', 'part_dummy_6', 94, 92, false), -- Juara 2
('gm_champ_smp_3', 'group_champ_smp', 'part_dummy_7', 90, 95, false), -- Juara 3

-- SMA Semifinal Group 1 (Ratna, Dedi, Wulan lolos ke final)
('gm_semi_sma_1_1', 'group_semi_sma_1', 'part_dummy_16', 97, 72, true),
('gm_semi_sma_1_2', 'group_semi_sma_1', 'part_dummy_17', 92, 85, true),
('gm_semi_sma_1_3', 'group_semi_sma_1', 'part_dummy_18', 89, 92, true),
('gm_semi_sma_1_4', 'group_semi_sma_1', 'part_dummy_19', 75, 120, false),
('gm_semi_sma_1_5', 'group_semi_sma_1', 'part_dummy_20', 65, 130, false),

-- SMA Semifinal Group 2 (Ahmad, Yuni, Bagus lolos ke final)
('gm_semi_sma_2_1', 'group_semi_sma_2', 'part_dummy_21', 95, 80, true),
('gm_semi_sma_2_2', 'group_semi_sma_2', 'part_dummy_22', 91, 88, true),
('gm_semi_sma_2_3', 'group_semi_sma_2', 'part_dummy_23', 87, 95, true),
('gm_semi_sma_2_4', 'group_semi_sma_2', 'part_dummy_24', 80, 110, false),
('gm_semi_sma_2_5', 'group_semi_sma_2', 'part_dummy_25', 55, 140, false),

-- SMA Final
('gm_final_sma_1', 'group_final_sma', 'part_dummy_16', 99, 68, true),
('gm_final_sma_2', 'group_final_sma', 'part_dummy_21', 96, 75, true),
('gm_final_sma_3', 'group_final_sma', 'part_dummy_17', 93, 82, true),
('gm_final_sma_4', 'group_final_sma', 'part_dummy_18', 85, 90, false),
('gm_final_sma_5', 'group_final_sma', 'part_dummy_22', 80, 100, false),
('gm_final_sma_6', 'group_final_sma', 'part_dummy_23', 78, 105, false),

-- SMA Champion (Papan Podium Juara)
('gm_champ_sma_1', 'group_champ_sma', 'part_dummy_16', 99, 68, true),  -- Juara 1
('gm_champ_sma_2', 'group_champ_sma', 'part_dummy_21', 96, 75, false), -- Juara 2
('gm_champ_sma_3', 'group_champ_sma', 'part_dummy_17', 93, 82, false); -- Juara 3
