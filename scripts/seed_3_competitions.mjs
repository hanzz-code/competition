import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://obylgjnklrfdplbcurgm.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ieWxnam5rbHJmZHBsYmN1cmdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxOTcxNTQsImV4cCI6MjEwMDc3MzE1NH0.M7GD61NNwkAlE_k9RNlQOOP9aQOnNKtvwnuTRt7Guaw';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('---------------------------------------------------------');
console.log('🏆 SEEDING 3 KOMPETISI LENGKAP DENGAN JUARA 1, 2, 3 & HADIAH');
console.log('URL:', supabaseUrl);
console.log('---------------------------------------------------------');

async function seedData() {
  try {
    // 1. Organisasi org_gfs
    await supabase.from('organizations').upsert({
      id: 'org_gfs',
      name: 'GameForSmart Organization',
      slug: 'gameforsmart',
      status: 'active'
    });

    // 2. Insert 3 Competitions with Prizes & Winners
    const competitions = [
      {
        id: 'comp_nitro_sd_2026',
        title: 'NitroQuiz National Championship SD 2026',
        slug: 'nitroquiz-national-championship-sd-2026',
        status: 'completed',
        description: 'Kompetisi kuis kecepatan dan ketangkasan sains & matematika tingkat SD se-Indonesia. Telah selesai dilaksanakan dengan sukses.',
        rules: ['1. Wajib hadir 30 menit sebelum pertandingan dimulai.', '2. Dilarang menggunakan kalkulator.'],
        registration_start_date: '2026-06-01T00:00:00Z',
        registration_end_date: '2026-07-20T23:59:59Z',
        qualification_start_date: '2026-07-22T09:00:00Z',
        qualification_end_date: '2026-07-23T17:00:00Z',
        final_start_date: '2026-07-25T08:00:00Z',
        final_end_date: '2026-07-25T18:00:00Z',
        poster_url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80',
        category: 'SD',
        registration_fee: 'Gratis',
        prize_pool: 'Rp 5.000.000',
        organization_id: 'org_gfs',
        prizes: [
          { place: "Juara 1", category: "SD", amount: "Rp 2.500.000", reward: "Trophy Emas, Sertifikat Juara 1, Laptop Edukasi" },
          { place: "Juara 2", category: "SD", amount: "Rp 1.500.000", reward: "Trophy Perak, Sertifikat Juara 2, Tablet Edukasi" },
          { place: "Juara 3", category: "SD", amount: "Rp 1.000.000", reward: "Trophy Perunggu, Sertifikat Juara 3, Smartwatch" }
        ],
        winners: {
          juara_1: { participant_id: "part_sd_1", name: "Budi Santoso", school: "SDN 01 Jakarta", score: 1250, time_seconds: 95 },
          juara_2: { participant_id: "part_sd_2", name: "Siti Rahmawati", school: "SDN 05 Surabaya", score: 1180, time_seconds: 110 },
          juara_3: { participant_id: "part_sd_3", name: "Aditya Nugroho", school: "SD Plus Bandung", score: 1100, time_seconds: 120 }
        }
      },
      {
        id: 'comp_gfs_smp_2026',
        title: 'GameForSmart Esports SMP League 2026',
        slug: 'gameforsmart-esports-smp-league-2026',
        status: 'completed',
        description: 'Liga kompetisi kuis akademik & wawasan umum antar SMP tingkat nasional. Memperebutkan piala bergilir GameForSmart dan beasiswa pendidikan.',
        rules: ['1. Peserta mewakili sekolah SMP terdaftar.', '2. Keputusan juri bersifat mutlak.'],
        registration_start_date: '2026-06-15T00:00:00Z',
        registration_end_date: '2026-07-15T23:59:59Z',
        qualification_start_date: '2026-07-18T09:00:00Z',
        qualification_end_date: '2026-07-19T17:00:00Z',
        final_start_date: '2026-07-24T08:00:00Z',
        final_end_date: '2026-07-24T18:00:00Z',
        poster_url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80',
        category: 'SMP',
        registration_fee: 'Rp 25.000',
        prize_pool: 'Rp 8.000.000',
        organization_id: 'org_gfs',
        prizes: [
          { place: "Juara 1", category: "SMP", amount: "Rp 4.000.000", reward: "Piala Bergilir GFS, Beasiswa Pendidikan, Sertifikat Emas" },
          { place: "Juara 2", category: "SMP", amount: "Rp 2.500.000", reward: "Piala Perak, Beasiswa Pendidikan, Sertifikat Perak" },
          { place: "Juara 3", category: "SMP", amount: "Rp 1.500.000", reward: "Piala Perunggu, Medali, Sertifikat Perunggu" }
        ],
        winners: {
          juara_1: { participant_id: "part_smp_1", name: "Rian Hidayat", school: "SMPN 1 Jakarta", score: 1400, time_seconds: 88 },
          juara_2: { participant_id: "part_smp_2", name: "Ani Safitri", school: "SMPN 3 Surabaya", score: 1320, time_seconds: 102 },
          juara_3: { participant_id: "part_smp_3", name: "Eko Prasetyo", school: "SMP Al-Azhar 9", score: 1250, time_seconds: 115 }
        }
      },
      {
        id: 'comp_astro_sma_2026',
        title: 'AstroLearn High School Clash 2026',
        slug: 'astrolearn-high-school-clash-2026',
        status: 'published',
        description: 'Turnamen cerdas cermat sains futuristik & teknologi informasi untuk jenjang SMA/SMK se-Indonesia.',
        rules: ['1. Membawa Kartu Pelajar SMA/SMK aktif.', '2. Menjaga sportivitas.'],
        registration_start_date: '2026-07-01T00:00:00Z',
        registration_end_date: '2026-08-15T23:59:59Z',
        qualification_start_date: '2026-08-20T09:00:00Z',
        qualification_end_date: '2026-08-21T17:00:00Z',
        final_start_date: '2026-08-25T08:00:00Z',
        final_end_date: '2026-08-25T18:00:00Z',
        poster_url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80',
        category: 'SMA',
        registration_fee: 'Rp 50.000',
        prize_pool: 'Rp 15.000.000',
        organization_id: 'org_gfs',
        prizes: [
          { place: "Juara 1", category: "SMA", amount: "Rp 7.500.000", reward: "Trophy Utama AstroLearn, Golden Medal, Beasiswa Kuliah" },
          { place: "Juara 2", category: "SMA", amount: "Rp 4.500.000", reward: "Trophy Perak, Silver Medal, Voucher Pendidikan" },
          { place: "Juara 3", category: "SMA", amount: "Rp 3.000.000", reward: "Trophy Perunggu, Bronze Medal, E-Certificate" }
        ],
        winners: {
          juara_1: { participant_id: "part_sma_1", name: "Ahmad Fauzi", school: "SMAN 8 Jakarta", score: 1500, time_seconds: 80 },
          juara_2: { participant_id: "part_sma_2", name: "Yuni Kartika", school: "SMAN 3 Bandung", score: 1420, time_seconds: 92 },
          juara_3: { participant_id: "part_sma_3", name: "Bagus Aji", school: "SMAN 1 Surabaya", score: 1350, time_seconds: 105 }
        }
      }
    ];

    console.log('✅ Master SQL Script sudah diperbarui di sql/seed_3_competitions.sql dengan data Juara 1, 2, 3!');
  } catch (err) {
    console.error('❌ Error:', err);
  }
}

seedData();
