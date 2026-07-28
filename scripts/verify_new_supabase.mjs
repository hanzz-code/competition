import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://obylgjnklrfdplbcurgm.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ieWxnam5rbHJmZHBsYmN1cmdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxOTcxNTQsImV4cCI6MjEwMDc3MzE1NH0.M7GD61NNwkAlE_k9RNlQOOP9aQOnNKtvwnuTRt7Guaw';

console.log('---------------------------------------------------------');
console.log('🔍 TEST KONEKSI SUPABASE BARU (MANAGE_COMPETITIONGFS)');
console.log('URL:', supabaseUrl);
console.log('---------------------------------------------------------');

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  const tables = [
    'profiles',
    'organizations',
    'competitions',
    'competition_categories',
    'competition_participants',
    'competition_rounds',
    'competition_groups',
    'competition_staff',
    'roles',
    'permissions'
  ];

  console.log('📦 Pengecekan Keberadaan Tabel:\n');
  let successCount = 0;

  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('count', { count: 'exact', head: true });
    if (error) {
      console.log(` ❌ Tabel '${table}': BELUM ADA / ERROR (${error.message})`);
    } else {
      console.log(` ✅ Tabel '${table}': TERSEDIA SUKSES`);
      successCount++;
    }
  }

  console.log('---------------------------------------------------------');
  if (successCount === tables.length) {
    console.log('🎉 SELAMAT! Seluruh tabel pada Supabase baru sudah 100% Siap!');
  } else if (successCount > 0) {
    console.log(`⚠️  Sebagian tabel tersedia (${successCount}/${tables.length}). Silakan jalankan setup_new_supabase_master.sql.`);
  } else {
    console.log('ℹ️  Belum ada tabel yang dibuat. Silakan jalankan setup_new_supabase_master.sql pada SQL Editor Supabase baru.');
  }
  console.log('---------------------------------------------------------');
}

testConnection();
