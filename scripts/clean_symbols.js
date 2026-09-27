const fs = require('fs');

// 1. Clean StaffDashboard.tsx
let staff = fs.readFileSync('src/components/StaffDashboard.tsx', 'utf8');

const staffReplacements = [
  ["✍️ Junaidi", "Junaidi"],
  ["🛡️ STEMPEL KEAMANAN AL-ASY'ARIYAH", "STEMPEL KEAMANAN AL-ASY'ARIYAH"],
  ["✒️ Abdul Somad", "Abdul Somad"],
  ["📜 STEMPEL KETERTIBAN", "STEMPEL KETERTIBAN"],
  ["⚕️ Fatimah", "dr. Fatimah"],
  ["🩺 POSKESTREN AL-ASY'ARIYAH", "POSKESTREN AL-ASY'ARIYAH"],
  ["✍️ M. Hasanuddin", "M. Hasanuddin"],
  ["🤖 [REKOMENDASI AI: TOLAK]", "[REKOMENDASI AI: TOLAK]"],
  ["🤖 [REKOMENDASI AI: SETUJU]", "[REKOMENDASI AI: SETUJU]"],
  ["🤖 [ASISTEN AI PESANTREN]", "[ASISTEN AI PESANTREN]"],
  ['<span className="text-3xl filter drop-shadow">💚</span>', ''],
  ["📝 Edit Redaksi / Isi Kata dalam Surat", "Edit Redaksi Surat"],
  ['❌ Santri dengan NIS atau nama', 'Santri dengan NIS atau nama'],
  ['🔍 Masukkan NIS santri di atas', 'Masukkan NIS santri di atas'],
  ['<span className="text-sm">💡</span>', ''],
  ['<p className="font-extrabold text-sm flex items-center gap-1.5 text-amber-950">⚠️', '<p className="font-extrabold text-sm flex items-center gap-1.5 text-amber-950">'],
  ["'🛡️ STEMPEL KEAMANAN'", "'STEMPEL KEAMANAN'"],
  ["'✍️ M. Hasanuddin'", "'M. Hasanuddin'"],
  ["Unduh Berkas Offline 📥", "Unduh Berkas Offline"],
  ["🛡️ Riwayat Perizinan Santri", "Riwayat Perizinan Santri"],
  ["⚖️ Riwayat Takzir & Sanksi Pelanggaran", "Riwayat Takzir & Sanksi"],
  ["✓ Setujui", "Setujui"],
  ["✕ Tolak", "Tolak"],
  ['<span>📊</span> Visualisasi Tren', 'Visualisasi Tren'],
  ["🛡️ Input Surat Izin Baru (Ketertiban)", "Input Surat Izin Baru (Ketertiban)"],
  ["⚖️ Input Catatan Takzir / Pelanggaran Baru", "Input Catatan Takzir / Pelanggaran Baru"],
  ['<option value="izin">🛡️ Surat Perizinan (Izin Keluar/Pulang)</option>', '<option value="izin">Surat Perizinan (Izin Keluar/Pulang)</option>'],
  ['<option value="takzir">⚖️ Catatan Takzir & Pelanggaran</option>', '<option value="takzir">Catatan Takzir & Pelanggaran</option>'],
  ["🛡️ + Surat Perizinan", "+ Surat Perizinan"],
  ["⚖️ + Takzir", "+ Catatan Takzir"],
  ["🛡️ Perizinan", "Perizinan"],
  ["⚖️ Takzir", "Takzir"],
  ['<span className="text-base">📲</span>', ''],
  ['💡 Paragraf surat ini dapat diklik dan diedit langsung sebelum mencetak.', 'Paragraf surat ini dapat diklik dan diedit langsung sebelum mencetak.'],
  ['✏️ Edit Isian Catatan', 'Edit Isian Catatan'],
  ['<option value="Belum Diurus">Belum Diurus 🔴</option>', '<option value="Belum Diurus">Belum Diurus</option>'],
  ['<option value="Sedang Mengurus">Sedang Mengurus 🟡</option>', '<option value="Sedang Mengurus">Sedang Mengurus</option>'],
  ['<option value="Selesai">Selesai (Sudah Diputihkan) 🟢</option>', '<option value="Selesai">Selesai (Sudah Diputihkan)</option>'],
  ['Simpan Perubahan ✓', 'Simpan Perubahan']
];

staffReplacements.forEach(([from, to]) => {
  staff = staff.replaceAll(from, to);
});

fs.writeFileSync('src/components/StaffDashboard.tsx', staff, 'utf8');
console.log('Cleaned StaffDashboard.tsx');
