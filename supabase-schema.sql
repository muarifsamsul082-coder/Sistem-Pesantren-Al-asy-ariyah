-- ==============================================================================
-- SKRIP DATABASE SUPABASE RESMI & SINKRONISASI REALTIME LINTAS PERANGKAT
-- PONDOK PESANTREN AL-ASY'ARIYAH
-- Sesuai dengan seluruh Menu di Admin Dashboard (Tabel Relasional & Saling Terhubung)
-- ==============================================================================
-- Petunjuk Penggunaan:
-- 1. Buka Dashboard Supabase Anda (https://supabase.com/dashboard)
-- 2. Pilih Proyek Pesantren Anda -> Buka menu "SQL Editor" -> Klik "New Query"
-- 3. Salin (Copy) & Tempel (Paste) seluruh isi skrip ini -> Klik tombol "RUN" (Jalankan)
--
-- Karakteristik & Keunggulan Skrip:
--  Aman & Idempotent (Non-Destruktif):
--   Menggunakan 'CREATE TABLE IF NOT EXISTS' dan 'ALTER TABLE ADD COLUMN IF NOT EXISTS'.
--   Dapat dijalankan berulang kali kapan saja tanpa menghapus atau merusak data yang sudah ada!
--  Pemisahan Tabel Santri & Alumni:
--   Tabel 'students' khusus santri aktif & mutasi, sedangkan 'alumni' khusus wisudawan/lulusan.
--  Otomasi Trigger Santri -> Alumni:
--   Ketika status santri diubah menjadi 'Alumni' atau 'Berhenti' (baik dari menu aplikasi
--   maupun langsung diedit di Table Editor Supabase), data santri otomatis tersalin, diperbarui,
--   dan dikonversi ke tabel 'alumni' lengkap dengan NIA (Nomor Induk Alumni), serta kamar asrama
--   dikosongkan secara otomatis.
--  Relasional & Terhubung Antar-Menu:
--   Kamar Asrama <-> Santri <-> Alumni <-> Tagihan SPP <-> Pembayaran <-> Perizinan <-> Surat Keluar.
--  Realtime Lintas Perangkat:
--   Seluruh tabel terdaftar pada publikasi 'supabase_realtime' sehingga perubahan di satu perangkat
--   langsung muncul seketika di semua laptop, HP, dan tablet tanpa perlu reload.
-- ==============================================================================

-- Aktifkan ekstensi UUID untuk kemudahan pembuatan identitas unik
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. TABEL DATA KAMAR / ASRAMA SANTRI (Menu: Kamar & Asrama)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  gender TEXT DEFAULT 'Putra', -- 'Putra' | 'Perempuan'
  formal_school TEXT,
  diniyah_school TEXT,
  capacity INTEGER DEFAULT 10,
  ketua_kamar_id TEXT,
  ketua_kamar_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 2. TABEL DATA SANTRI AKTIF (Menu: Data Santri & Induk Kesiswaan)
-- Relasi: room_id merujuk ke rooms(id)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  nis TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  gender TEXT DEFAULT 'Laki-laki', -- 'Laki-laki' | 'Perempuan'
  class TEXT DEFAULT 'VII SMP Formal • 1A MI Diniyah',
  class_pagi TEXT DEFAULT '1A MI Diniyah',
  class_sore TEXT DEFAULT 'VII SMP Formal',
  class_name TEXT,
  class_madrasah TEXT DEFAULT '1A MI Diniyah',
  class_formal TEXT DEFAULT 'VII SMP Formal',
  akun_madrasah TEXT,
  room_id TEXT,
  kamar TEXT,
  phone TEXT,
  address TEXT,
  status TEXT DEFAULT 'Aktif', -- 'Aktif' | 'Mutasi' | 'Berhenti' | 'Alumni'
  photo_url TEXT,
  parent_name TEXT,
  parent_phone TEXT,
  guardian_name TEXT,
  guardian_phone TEXT,
  email TEXT,
  birth_place TEXT,
  birth_date TEXT,
  kk TEXT,
  nik TEXT,
  father_name TEXT,
  mother_name TEXT,
  blood_type TEXT,
  health_history TEXT,
  current_hafalan TEXT DEFAULT '0 Juz',
  tahfidz_logs JSONB DEFAULT '[]'::jsonb,
  memorization_logs JSONB DEFAULT '[]'::jsonb,
  security_logs JSONB DEFAULT '[]'::jsonb,
  discipline_logs JSONB DEFAULT '[]'::jsonb,
  health_logs JSONB DEFAULT '[]'::jsonb,
  academic_reports JSONB DEFAULT '[]'::jsonb,
  payment_history JSONB DEFAULT '[]'::jsonb,
  ppdb_id TEXT,
  alumni_id TEXT,
  tahun_keluar TEXT,
  alumni_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 3. TABEL DATA ALUMNI (Menu: Data Alumni - Terpisah dari Tabel Santri Aktif)
-- Relasi: student_id merujuk ke students(id) asal santri yang telah lulus/diwisuda
-- ==============================================================================
CREATE TABLE IF NOT EXISTS alumni (
  id TEXT PRIMARY KEY,
  student_id TEXT,
  nis TEXT NOT NULL,
  full_name TEXT NOT NULL,
  gender TEXT DEFAULT 'Laki-laki', -- 'Laki-laki' | 'Perempuan'
  class_formal TEXT,
  class_madrasah TEXT,
  tahun_masuk TEXT DEFAULT '2020',
  tahun_keluar TEXT NOT NULL DEFAULT (TO_CHAR(NOW(), 'YYYY')),
  alumni_reason TEXT DEFAULT 'Tamat / Lulus Belajar',
  last_education TEXT,
  current_activity TEXT DEFAULT 'Melanjutkan Pendidikan / Pengabdian',
  campus_or_workplace TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  parent_name TEXT,
  parent_phone TEXT,
  current_hafalan TEXT DEFAULT '30 Juz',
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 4. TABEL PENDAFTARAN SANTRI BARU (Menu: PPDB / PCSB Online)
-- Relasi: student_id merujuk ke students(id) jika calon santri telah diterima
-- ==============================================================================
CREATE TABLE IF NOT EXISTS ppdb (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  gender TEXT DEFAULT 'Laki-laki',
  birth_place TEXT,
  birth_date TEXT,
  nik TEXT,
  nisn TEXT,
  kk TEXT,
  address TEXT,
  parent_name TEXT,
  parent_phone TEXT,
  father_name TEXT,
  father_phone TEXT,
  mother_name TEXT,
  mother_phone TEXT,
  guardian_phone TEXT,
  previous_school TEXT DEFAULT '-',
  target_program TEXT,
  academic_year TEXT,
  registration_date TEXT,
  status TEXT DEFAULT 'Pending', -- 'Pending' | 'Diterima' | 'Ditolak'
  payment_status TEXT DEFAULT 'unpaid',
  payment_type TEXT DEFAULT 'Cicilan Bulanan',
  payment_proof TEXT,
  verified_documents JSONB DEFAULT '[]'::jsonb,
  is_locked BOOLEAN DEFAULT false,
  notes TEXT,
  blood_type TEXT,
  health_history TEXT,
  student_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 5. TABEL TAGIHAN & KEUANGAN SYAHRIYAH / SPP (Menu: Tagihan & Keuangan SPP)
-- Relasi: student_id merujuk ke students(id) (ON DELETE CASCADE)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS bills (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  student_name TEXT,
  nis TEXT,
  title TEXT NOT NULL,
  amount NUMERIC DEFAULT 0,
  due_date TEXT,
  status TEXT DEFAULT 'Belum Lunas', -- 'Belum Lunas' | 'Konfirmasi Pembayaran' | 'Lunas'
  category TEXT DEFAULT 'SPP Syahriyah',
  payment_date TEXT,
  payment_method TEXT,
  payment_proof_url TEXT,
  sender_bank TEXT,
  sender_account_number TEXT,
  verification_status TEXT,
  verification_logs JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 6. TABEL RIWAYAT TRANSAKSI & VERIFIKASI PEMBAYARAN ONLINE
-- Relasi: bill_id merujuk ke bills(id) dan student_id merujuk ke students(id)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS bill_payments (
  id TEXT PRIMARY KEY,
  bill_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  unique_code INTEGER DEFAULT 0,
  final_amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL, -- 'QRIS Dinamis' | 'Transfer Bank' | 'Tunai'
  payment_proof_url TEXT,
  sender_bank TEXT,
  sender_account TEXT,
  status TEXT DEFAULT 'Menunggu Verifikasi', -- 'Menunggu Verifikasi' | 'Lunas' | 'Ditolak'
  verified_by TEXT,
  verified_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 7. TABEL PENGELUARAN KAS BENDAHARA (Menu: Laporan Keuangan)
-- Membedakan pencairan dana kas oleh Bendahara Putra vs Bendahara Putri
-- ==============================================================================
CREATE TABLE IF NOT EXISTS financial_expenses (
  id TEXT PRIMARY KEY,
  bendahara_type TEXT NOT NULL, -- 'putra' | 'putri'
  bendahara_name TEXT NOT NULL,
  date TEXT NOT NULL,
  category TEXT NOT NULL, -- 'Konsumsi & Dapur', 'Operasional Listrik & Air', dll
  amount NUMERIC NOT NULL DEFAULT 0,
  description TEXT NOT NULL,
  recipient TEXT,
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 8. TABEL PERIZINAN KELUAR & KEPULANGAN SANTRI (Menu: Perizinan & Ketertiban)
-- Relasi: student_id merujuk ke students(id)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS security_permits (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  permit_type TEXT NOT NULL, -- 'Keluar Lingkungan' | 'Pulang (Keluarga)'
  description TEXT,
  out_date TEXT,
  expected_return_date TEXT,
  actual_return_date TEXT,
  status TEXT DEFAULT 'Menunggu Persetujuan',
  signed_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 9. TABEL BUKU SURAT KELUAR & ARSIP DOKUMEN (Menu: Outbox & Arsip Surat)
-- Relasi: student_id merujuk ke students(id) jika surat berkaitan dengan santri
-- ==============================================================================
CREATE TABLE IF NOT EXISTS outbox_logs (
  id TEXT PRIMARY KEY,
  student_id TEXT,
  nis TEXT,
  letter_number TEXT,
  letter_type TEXT,
  recipient TEXT,
  subject TEXT,
  issue_date TEXT,
  signed_by TEXT,
  status TEXT DEFAULT 'Terbit',
  document_payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 10. TABEL BROADCAST WHATSAPP & LOG GATEWAY (Menu: Broadcast WhatsApp)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS wa_logs (
  id TEXT PRIMARY KEY,
  message_type TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  message_body TEXT NOT NULL,
  status TEXT DEFAULT 'Terkirim',
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 11. TABEL BERITA & ARTIKEL PESANTREN (Menu: Berita & Artikel)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS news (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT DEFAULT 'Informasi',
  date TEXT,
  author TEXT DEFAULT 'Admin Pesantren',
  excerpt TEXT,
  content TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 12. TABEL PENGUMUMAN RESMI (Menu: Berita & Pengumuman)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  priority TEXT DEFAULT 'medium',
  target_role TEXT DEFAULT 'all',
  date TEXT,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 13. TABEL KALENDER AKADEMIK & AGENDA (Menu: Kalender & Agenda)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  start_date TEXT,
  end_date TEXT,
  category TEXT DEFAULT 'kegiatan',
  location TEXT,
  confirmed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 14. TABEL MASTER KELAS & SEKOLAH (Menu: Input Kelas & Sekolah)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS master_classes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'formal' | 'madrasah'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 15. TABEL AKUN PENGURUS & HAK AKSES (Menu: Akun Pengurus & Asatidz)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS staff_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'pengurus',
  is_confirmed BOOLEAN DEFAULT false,
  registered_at TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 16. TABEL KONFIGURASI BIRO PENGURUS (TTD & STEMPEL PER BIRO)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS staff_configs (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL UNIQUE,
  name TEXT,
  signature TEXT,
  seal TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 17. TABEL PENGATURAN PORTAL, KOP, TTD, STEMPEL & TARIF (Menu: Pengaturan & Rekening)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY DEFAULT 'default_settings',
  school_name TEXT DEFAULT 'Pondok Pesantren Al-Asy''ariyah',
  nama_yayasan TEXT DEFAULT 'Yayasan Pendidikan Islam Al-Asy''ariyah',
  tagline TEXT DEFAULT 'Mencetak Generasi Qur''ani & Berakhlakul Karimah',
  about_us TEXT,
  vision TEXT,
  mission JSONB DEFAULT '[]'::jsonb,
  address TEXT DEFAULT 'Semarang, Jawa Tengah',
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  accent_color TEXT DEFAULT '#064e3b',
  stempel_pesantren_url TEXT,
  nama_pengurus TEXT,
  ttd_pengurus_url TEXT,
  nama_pengasuh TEXT,
  stempel_pengasuh_url TEXT,
  ttd_pengasuh_url TEXT,
  nama_ketua_pcsb TEXT,
  ttd_ketua_pcsb_url TEXT,
  stempel_pcsb_url TEXT,
  nama_bendahara TEXT,
  ttd_bendahara_url TEXT,
  stempel_bendahara_url TEXT,
  nama_keamanan TEXT,
  ttd_keamanan_url TEXT,
  stempel_keamanan_url TEXT,
  nama_ketertiban TEXT,
  ttd_ketertiban_url TEXT,
  stempel_ketertiban_url TEXT,
  nama_kesehatan TEXT,
  ttd_kesehatan_url TEXT,
  stempel_kesehatan_url TEXT,
  nama_akademik TEXT,
  ttd_akademik_url TEXT,
  stempel_akademik_url TEXT,
  rekening_list JSONB DEFAULT '[]'::jsonb,
  available_formal_classes JSONB DEFAULT '["VII SMP Formal", "VIII SMP Formal", "IX SMP Formal", "X MA Formal", "XI MA Formal", "XII MA Formal", "-"]'::jsonb,
  available_madrasah_classes JSONB DEFAULT '["1A MI Diniyah", "1B MI Diniyah", "2A MI Diniyah", "3A MI Diniyah", "1A MTs Diniyah", "1B MTs Diniyah", "2A MTs Diniyah", "2B MTs Diniyah", "3A MTs Diniyah", "1A MA Diniyah", "2A MA Diniyah", "3A MA Diniyah"]'::jsonb,
  ppdb_open BOOLEAN DEFAULT true,
  ppdb_start_date TEXT,
  ppdb_end_date TEXT,
  pesantren_bank_name TEXT,
  pesantren_bank_account_number TEXT,
  pesantren_bank_account_name TEXT,
  pcsb_fee_pendaftaran NUMERIC DEFAULT 150000,
  pcsb_fee_sarpras NUMERIC DEFAULT 1000000,
  pcsb_fee_seragam NUMERIC DEFAULT 650000,
  pcsb_fee_kitab NUMERIC DEFAULT 350000,
  pcsb_fee_kesehatan NUMERIC DEFAULT 100000,
  pcsb_fee_syahriyah NUMERIC DEFAULT 350000,
  pcsb_enable_pendaftaran BOOLEAN DEFAULT true,
  pcsb_enable_sarpras BOOLEAN DEFAULT true,
  pcsb_enable_seragam BOOLEAN DEFAULT true,
  pcsb_enable_kitab BOOLEAN DEFAULT true,
  pcsb_enable_kesehatan BOOLEAN DEFAULT true,
  pcsb_enable_syahriyah BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- PEMBAHARUAN KOLOM OTOMATIS (MENCEGAH ERROR JIKA TABEL SUDAH ADA SEBELUMNYA)
-- Jika tabel sudah ada di Supabase, kolom-kolom baru akan ditambahkan tanpa
-- merusak atau menghapus data lama yang sudah tersimpan.
-- ==============================================================================

-- 1. Tabel Students
ALTER TABLE students ADD COLUMN IF NOT EXISTS class TEXT DEFAULT 'VII SMP Formal • 1A MI Diniyah';
ALTER TABLE students ADD COLUMN IF NOT EXISTS class_pagi TEXT DEFAULT '1A MI Diniyah';
ALTER TABLE students ADD COLUMN IF NOT EXISTS class_sore TEXT DEFAULT 'VII SMP Formal';
ALTER TABLE students ADD COLUMN IF NOT EXISTS class_name TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS class_madrasah TEXT DEFAULT '1A MI Diniyah';
ALTER TABLE students ADD COLUMN IF NOT EXISTS class_formal TEXT DEFAULT 'VII SMP Formal';
ALTER TABLE students ADD COLUMN IF NOT EXISTS akun_madrasah TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS room_id TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS kamar TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_name TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_phone TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS guardian_name TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS guardian_phone TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS birth_place TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS birth_date TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS kk TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS nik TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS father_name TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS mother_name TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS blood_type TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS health_history TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS current_hafalan TEXT DEFAULT '0 Juz';
ALTER TABLE students ADD COLUMN IF NOT EXISTS tahfidz_logs JSONB DEFAULT '[]'::jsonb;
ALTER TABLE students ADD COLUMN IF NOT EXISTS memorization_logs JSONB DEFAULT '[]'::jsonb;
ALTER TABLE students ADD COLUMN IF NOT EXISTS security_logs JSONB DEFAULT '[]'::jsonb;
ALTER TABLE students ADD COLUMN IF NOT EXISTS discipline_logs JSONB DEFAULT '[]'::jsonb;
ALTER TABLE students ADD COLUMN IF NOT EXISTS health_logs JSONB DEFAULT '[]'::jsonb;
ALTER TABLE students ADD COLUMN IF NOT EXISTS academic_reports JSONB DEFAULT '[]'::jsonb;
ALTER TABLE students ADD COLUMN IF NOT EXISTS payment_history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE students ADD COLUMN IF NOT EXISTS ppdb_id TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS alumni_id TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS tahun_keluar TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS alumni_reason TEXT;

-- 2. Tabel Alumni
ALTER TABLE alumni ADD COLUMN IF NOT EXISTS student_id TEXT;
ALTER TABLE alumni ADD COLUMN IF NOT EXISTS nis TEXT;
ALTER TABLE alumni ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE alumni ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'Laki-laki';
ALTER TABLE alumni ADD COLUMN IF NOT EXISTS class_formal TEXT;
ALTER TABLE alumni ADD COLUMN IF NOT EXISTS class_madrasah TEXT;
ALTER TABLE alumni ADD COLUMN IF NOT EXISTS tahun_masuk TEXT DEFAULT '2020';
ALTER TABLE alumni ADD COLUMN IF NOT EXISTS tahun_keluar TEXT;
ALTER TABLE alumni ADD COLUMN IF NOT EXISTS alumni_reason TEXT DEFAULT 'Tamat / Lulus Belajar';
ALTER TABLE alumni ADD COLUMN IF NOT EXISTS last_education TEXT;
ALTER TABLE alumni ADD COLUMN IF NOT EXISTS current_activity TEXT;
ALTER TABLE alumni ADD COLUMN IF NOT EXISTS campus_or_workplace TEXT;
ALTER TABLE alumni ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE alumni ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE alumni ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE alumni ADD COLUMN IF NOT EXISTS parent_name TEXT;
ALTER TABLE alumni ADD COLUMN IF NOT EXISTS parent_phone TEXT;
ALTER TABLE alumni ADD COLUMN IF NOT EXISTS current_hafalan TEXT DEFAULT '30 Juz';
ALTER TABLE alumni ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- 3. Tabel PPDB
ALTER TABLE ppdb ADD COLUMN IF NOT EXISTS student_id TEXT;
ALTER TABLE ppdb ADD COLUMN IF NOT EXISTS nik TEXT;
ALTER TABLE ppdb ADD COLUMN IF NOT EXISTS nisn TEXT;
ALTER TABLE ppdb ADD COLUMN IF NOT EXISTS kk TEXT;
ALTER TABLE ppdb ADD COLUMN IF NOT EXISTS father_name TEXT;
ALTER TABLE ppdb ADD COLUMN IF NOT EXISTS father_phone TEXT;
ALTER TABLE ppdb ADD COLUMN IF NOT EXISTS mother_name TEXT;
ALTER TABLE ppdb ADD COLUMN IF NOT EXISTS mother_phone TEXT;
ALTER TABLE ppdb ADD COLUMN IF NOT EXISTS guardian_phone TEXT;
ALTER TABLE ppdb ADD COLUMN IF NOT EXISTS target_program TEXT;
ALTER TABLE ppdb ADD COLUMN IF NOT EXISTS academic_year TEXT;
ALTER TABLE ppdb ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid';
ALTER TABLE ppdb ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'Cicilan Bulanan';
ALTER TABLE ppdb ADD COLUMN IF NOT EXISTS payment_proof TEXT;
ALTER TABLE ppdb ADD COLUMN IF NOT EXISTS verified_documents JSONB DEFAULT '[]'::jsonb;
ALTER TABLE ppdb ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;
ALTER TABLE ppdb ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE ppdb ADD COLUMN IF NOT EXISTS blood_type TEXT;
ALTER TABLE ppdb ADD COLUMN IF NOT EXISTS health_history TEXT;

-- 4. Tabel Bills
ALTER TABLE bills ADD COLUMN IF NOT EXISTS student_id TEXT;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS student_name TEXT;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS nis TEXT;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'SPP Syahriyah';
ALTER TABLE bills ADD COLUMN IF NOT EXISTS payment_date TEXT;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS sender_bank TEXT;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS sender_account_number TEXT;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS verification_status TEXT;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS verification_logs JSONB DEFAULT '[]'::jsonb;

-- 5. Tabel Financial Expenses
ALTER TABLE financial_expenses ADD COLUMN IF NOT EXISTS bendahara_type TEXT DEFAULT 'putra';
ALTER TABLE financial_expenses ADD COLUMN IF NOT EXISTS bendahara_name TEXT;
ALTER TABLE financial_expenses ADD COLUMN IF NOT EXISTS recipient TEXT;
ALTER TABLE financial_expenses ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- 6. Tabel Rooms
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'Putra';
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS formal_school TEXT;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS diniyah_school TEXT;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 10;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS ketua_kamar_id TEXT;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS ketua_kamar_name TEXT;

-- 7. Tabel Outbox Logs
ALTER TABLE outbox_logs ADD COLUMN IF NOT EXISTS student_id TEXT;
ALTER TABLE outbox_logs ADD COLUMN IF NOT EXISTS nis TEXT;

-- 8. Tabel Settings
ALTER TABLE settings ADD COLUMN IF NOT EXISTS available_formal_classes JSONB DEFAULT '["VII SMP Formal", "VIII SMP Formal", "IX SMP Formal", "X MA Formal", "XI MA Formal", "XII MA Formal", "-"]'::jsonb;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS available_madrasah_classes JSONB DEFAULT '["1A MI Diniyah", "1B MI Diniyah", "2A MI Diniyah", "3A MI Diniyah", "1A MTs Diniyah", "1B MTs Diniyah", "2A MTs Diniyah", "2B MTs Diniyah", "3A MTs Diniyah", "1A MA Diniyah", "2A MA Diniyah", "3A MA Diniyah"]'::jsonb;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS pcsb_fee_pendaftaran NUMERIC DEFAULT 150000;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS pcsb_fee_sarpras NUMERIC DEFAULT 1000000;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS pcsb_fee_seragam NUMERIC DEFAULT 650000;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS pcsb_fee_kitab NUMERIC DEFAULT 350000;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS pcsb_fee_kesehatan NUMERIC DEFAULT 100000;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS pcsb_fee_syahriyah NUMERIC DEFAULT 350000;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS pcsb_enable_pendaftaran BOOLEAN DEFAULT true;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS pcsb_enable_sarpras BOOLEAN DEFAULT true;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS pcsb_enable_seragam BOOLEAN DEFAULT true;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS pcsb_enable_kitab BOOLEAN DEFAULT true;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS pcsb_enable_kesehatan BOOLEAN DEFAULT true;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS pcsb_enable_syahriyah BOOLEAN DEFAULT true;

-- ==============================================================================
-- RELAKSASI BATASAN NOT NULL (MENCEGAH ERROR INPUT FORM PARSIAL DARI CLIENT)
-- ==============================================================================
DO $$
BEGIN
  BEGIN ALTER TABLE students ALTER COLUMN class_pagi DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE students ALTER COLUMN class_sore DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE students ALTER COLUMN class_name DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE students ALTER COLUMN parent_name DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE students ALTER COLUMN parent_phone DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE students ALTER COLUMN email DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE students ALTER COLUMN address DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE students ALTER COLUMN gender DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;

  BEGIN ALTER TABLE alumni ALTER COLUMN parent_name DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE alumni ALTER COLUMN parent_phone DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE alumni ALTER COLUMN email DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE alumni ALTER COLUMN address DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE alumni ALTER COLUMN gender DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;

  BEGIN ALTER TABLE ppdb ALTER COLUMN parent_name DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE ppdb ALTER COLUMN parent_phone DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE ppdb ALTER COLUMN address DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE ppdb ALTER COLUMN previous_school DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE ppdb ALTER COLUMN registration_date DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE ppdb ALTER COLUMN gender DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;

  BEGIN ALTER TABLE bills ALTER COLUMN student_name DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE bills ALTER COLUMN due_date DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE bills ALTER COLUMN amount DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;

  BEGIN ALTER TABLE rooms ALTER COLUMN formal_school DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE rooms ALTER COLUMN diniyah_school DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE rooms ALTER COLUMN gender DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

-- ==============================================================================
-- RELASI FOREIGN KEYS ANTAR TABEL (INTEGRITAS DATA & HUBUNGAN RELASIONAL)
-- ==============================================================================
DO $$
BEGIN
  -- 1. Relasi Asrama / Kamar ke Santri
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_students_room' AND table_name = 'students'
  ) THEN
    BEGIN
      ALTER TABLE students 
        ADD CONSTRAINT fk_students_room 
        FOREIGN KEY (room_id) REFERENCES rooms(id) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  -- 2. Relasi PPDB ke Santri
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_ppdb_student' AND table_name = 'ppdb'
  ) THEN
    BEGIN
      ALTER TABLE ppdb 
        ADD CONSTRAINT fk_ppdb_student 
        FOREIGN KEY (student_id) REFERENCES students(id) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  -- 3. Relasi Tagihan ke Santri
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_bills_student' AND table_name = 'bills'
  ) THEN
    BEGIN
      ALTER TABLE bills 
        ADD CONSTRAINT fk_bills_student 
        FOREIGN KEY (student_id) REFERENCES students(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  -- 4. Relasi Pembayaran ke Tagihan & Santri
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_bill_payments_bill' AND table_name = 'bill_payments'
  ) THEN
    BEGIN
      ALTER TABLE bill_payments 
        ADD CONSTRAINT fk_bill_payments_bill 
        FOREIGN KEY (bill_id) REFERENCES bills(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_bill_payments_student' AND table_name = 'bill_payments'
  ) THEN
    BEGIN
      ALTER TABLE bill_payments 
        ADD CONSTRAINT fk_bill_payments_student 
        FOREIGN KEY (student_id) REFERENCES students(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  -- 5. Relasi Perizinan ke Santri
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_permits_student' AND table_name = 'security_permits'
  ) THEN
    BEGIN
      ALTER TABLE security_permits 
        ADD CONSTRAINT fk_permits_student 
        FOREIGN KEY (student_id) REFERENCES students(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  -- 6. Relasi Surat Keluar ke Santri
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_outbox_student' AND table_name = 'outbox_logs'
  ) THEN
    BEGIN
      ALTER TABLE outbox_logs 
        ADD CONSTRAINT fk_outbox_student 
        FOREIGN KEY (student_id) REFERENCES students(id) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
END $$;

-- ==============================================================================
-- OTOMASI TRIGGER: SANTRI ALUMNI OTOMATIS MASUK KE TABEL ALUMNI
-- Ketika status santri diubah menjadi 'Alumni' atau 'Berhenti' (baik via UI
-- maupun via Table Editor Supabase), trigger ini secara otomatis:
--  1. Menghasilkan NIA (Nomor Induk Alumni) yang unik dan rapi.
--  2. Memeriksa apakah santri sudah ada di tabel alumni; jika ada, memperbarui
--     data (update); jika belum ada, membuat baris baru (insert).
--  3. Mengosongkan kamar asrama santri agar kapasitas kamar kembali tersedia.
--  4. Menyimpan alumni_id & tahun_keluar ke data santri.
-- ==============================================================================
CREATE OR REPLACE FUNCTION trg_sync_student_to_alumni()
RETURNS TRIGGER AS $$
DECLARE
  v_alumni_id TEXT;
  v_existing_alumni_id TEXT;
  v_tahun_keluar TEXT;
  v_alumni_reason TEXT;
  v_last_education TEXT;
  v_current_year TEXT;
BEGIN
  -- Cek jika status santri adalah 'Alumni' atau 'Berhenti'
  IF (NEW.status = 'Alumni' OR NEW.status = 'Berhenti') THEN
    v_current_year := TO_CHAR(NOW(), 'YYYY');
    v_tahun_keluar := COALESCE(NULLIF(NEW.tahun_keluar, ''), v_current_year);
    
    -- Tentukan alasan kelulusan / berhenti
    IF NEW.status = 'Berhenti' THEN
      v_alumni_reason := COALESCE(NULLIF(NEW.alumni_reason, ''), 'Pilihan Keluarga / Berhenti');
    ELSE
      v_alumni_reason := COALESCE(NULLIF(NEW.alumni_reason, ''), 'Tamat / Lulus Belajar');
    END IF;

    -- Format ringkasan pendidikan terakhir yang ditempuh
    v_last_education := TRIM(
      COALESCE(NULLIF(NEW.class_madrasah, ''), NULLIF(NEW.class_pagi, ''), '') ||
      CASE 
        WHEN (NEW.class_formal IS NOT NULL AND NEW.class_formal <> '' AND NEW.class_formal <> '-') THEN ' & ' || NEW.class_formal 
        WHEN (NEW.class_sore IS NOT NULL AND NEW.class_sore <> '' AND NEW.class_sore <> '-') THEN ' & ' || NEW.class_sore
        ELSE '' 
      END
    );
    IF v_last_education = '' OR v_last_education IS NULL THEN
      v_last_education := COALESCE(NULLIF(NEW.class, ''), 'VI MI & XII SMA');
    END IF;

    -- Cek apakah santri ini sudah memiliki rekaman di tabel alumni
    SELECT id INTO v_existing_alumni_id 
    FROM alumni 
    WHERE student_id = NEW.id OR (nis = NEW.nis AND NEW.nis IS NOT NULL AND NEW.nis <> '')
    LIMIT 1;

    IF v_existing_alumni_id IS NOT NULL THEN
      -- Jika sudah ada di tabel alumni, lakukan pembaruan data (UPDATE)
      v_alumni_id := v_existing_alumni_id;

      UPDATE alumni SET
        student_id = NEW.id,
        nis = NEW.nis,
        full_name = NEW.full_name,
        gender = COALESCE(NEW.gender, alumni.gender, 'Laki-laki'),
        class_formal = COALESCE(NEW.class_formal, NEW.class_sore, alumni.class_formal),
        class_madrasah = COALESCE(NEW.class_madrasah, NEW.class_pagi, alumni.class_madrasah),
        tahun_keluar = v_tahun_keluar,
        alumni_reason = v_alumni_reason,
        last_education = v_last_education,
        phone = COALESCE(NEW.phone, NEW.parent_phone, alumni.phone),
        email = COALESCE(NEW.email, alumni.email),
        address = COALESCE(NEW.address, alumni.address),
        parent_name = COALESCE(NEW.parent_name, alumni.parent_name),
        parent_phone = COALESCE(NEW.parent_phone, alumni.parent_phone),
        current_hafalan = COALESCE(NEW.current_hafalan, alumni.current_hafalan, '30 Juz'),
        photo_url = COALESCE(NEW.photo_url, alumni.photo_url),
        updated_at = NOW()
      WHERE id = v_existing_alumni_id;

    ELSE
      -- Jika belum ada di tabel alumni, buatkan nomor identitas alumni (NIA) baru
      v_alumni_id := COALESCE(
        NULLIF(NEW.alumni_id, ''),
        'NIA.' || v_tahun_keluar || '.' || CASE WHEN NEW.gender = 'Perempuan' THEN 'P' ELSE 'L' END || '.' || NEW.nis
      );

      -- Antisipasi jika id NIA sudah digunakan oleh record lain
      IF EXISTS (SELECT 1 FROM alumni WHERE id = v_alumni_id) THEN
        v_alumni_id := v_alumni_id || '.' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4);
      END IF;

      -- Masukkan baris baru ke tabel alumni
      INSERT INTO alumni (
        id,
        student_id,
        nis,
        full_name,
        gender,
        class_formal,
        class_madrasah,
        tahun_masuk,
        tahun_keluar,
        alumni_reason,
        last_education,
        current_activity,
        campus_or_workplace,
        phone,
        email,
        address,
        parent_name,
        parent_phone,
        current_hafalan,
        photo_url,
        created_at,
        updated_at
      ) VALUES (
        v_alumni_id,
        NEW.id,
        NEW.nis,
        NEW.full_name,
        COALESCE(NEW.gender, 'Laki-laki'),
        COALESCE(NEW.class_formal, NEW.class_sore),
        COALESCE(NEW.class_madrasah, NEW.class_pagi),
        '2020',
        v_tahun_keluar,
        v_alumni_reason,
        v_last_education,
        'Melanjutkan Pendidikan / Pengabdian',
        NULL,
        COALESCE(NEW.phone, NEW.parent_phone),
        NEW.email,
        NEW.address,
        NEW.parent_name,
        NEW.parent_phone,
        COALESCE(NEW.current_hafalan, '30 Juz'),
        NEW.photo_url,
        NOW(),
        NOW()
      );
    END IF;

    -- Kosongkan asrama & kamar santri karena santri sudah menjadi alumni / lulus
    NEW.kamar := NULL;
    NEW.room_id := NULL;
    NEW.alumni_id := v_alumni_id;
    NEW.tahun_keluar := v_tahun_keluar;
    NEW.alumni_reason := v_alumni_reason;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Pasang Trigger pada tabel students (Sebelum simpan/update status)
DROP TRIGGER IF EXISTS trigger_sync_student_to_alumni ON students;
CREATE TRIGGER trigger_sync_student_to_alumni
BEFORE INSERT OR UPDATE OF status, tahun_keluar, alumni_reason, full_name, kamar, phone, address, photo_url, class_formal, class_madrasah
ON students
FOR EACH ROW
EXECUTE FUNCTION trg_sync_student_to_alumni();

-- ==============================================================================
-- MIGRASI AWAL SANTRI BERSTATUS ALUMNI YANG SUDAH ADA SEBELUMNYA KE TABEL ALUMNI
-- ==============================================================================
DO $$
DECLARE
  rec RECORD;
  v_target_id TEXT;
  v_tahun TEXT;
  v_pendidikan TEXT;
BEGIN
  FOR rec IN 
    SELECT * FROM students WHERE status = 'Alumni' OR status = 'Berhenti'
  LOOP
    v_tahun := COALESCE(NULLIF(rec.tahun_keluar, ''), '2026');
    v_target_id := COALESCE(
      NULLIF(rec.alumni_id, ''),
      'NIA.' || v_tahun || '.' || CASE WHEN rec.gender = 'Perempuan' THEN 'P' ELSE 'L' END || '.' || rec.nis
    );
    
    v_pendidikan := TRIM(
      COALESCE(NULLIF(rec.class_madrasah, ''), NULLIF(rec.class_pagi, ''), '') ||
      CASE 
        WHEN (rec.class_formal IS NOT NULL AND rec.class_formal <> '' AND rec.class_formal <> '-') THEN ' & ' || rec.class_formal 
        WHEN (rec.class_sore IS NOT NULL AND rec.class_sore <> '' AND rec.class_sore <> '-') THEN ' & ' || rec.class_sore
        ELSE '' 
      END
    );
    IF v_pendidikan = '' OR v_pendidikan IS NULL THEN
      v_pendidikan := COALESCE(NULLIF(rec.class, ''), 'VI MI & XII SMA');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM alumni WHERE student_id = rec.id OR nis = rec.nis) THEN
      BEGIN
        INSERT INTO alumni (
          id, student_id, nis, full_name, gender, class_formal, class_madrasah,
          tahun_masuk, tahun_keluar, alumni_reason, last_education, current_activity,
          phone, email, address, parent_name, parent_phone, current_hafalan, photo_url
        ) VALUES (
          v_target_id, rec.id, rec.nis, rec.full_name, COALESCE(rec.gender, 'Laki-laki'),
          COALESCE(rec.class_formal, rec.class_sore), COALESCE(rec.class_madrasah, rec.class_pagi),
          '2020', v_tahun, COALESCE(NULLIF(rec.alumni_reason, ''), 'Tamat / Lulus Belajar'),
          v_pendidikan, 'Melanjutkan Pendidikan / Pengabdian',
          COALESCE(rec.phone, rec.parent_phone), rec.email, rec.address,
          rec.parent_name, rec.parent_phone, COALESCE(rec.current_hafalan, '30 Juz'), rec.photo_url
        );
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
    END IF;
  END LOOP;
END $$;

-- ==============================================================================
-- INSIALISASI MASTER DATA DEFAULT (HANYA DITAMBAHKAN JIKA BELUM ADA)
-- ==============================================================================
INSERT INTO master_classes (id, name, type) VALUES
  ('cls_mi_1a', '1A MI Diniyah', 'madrasah'),
  ('cls_mi_1b', '1B MI Diniyah', 'madrasah'),
  ('cls_mi_2a', '2A MI Diniyah', 'madrasah'),
  ('cls_mi_3a', '3A MI Diniyah', 'madrasah'),
  ('cls_mts_1a', '1A MTs Diniyah', 'madrasah'),
  ('cls_mts_1b', '1B MTs Diniyah', 'madrasah'),
  ('cls_mts_2a', '2A MTs Diniyah', 'madrasah'),
  ('cls_mts_2b', '2B MTs Diniyah', 'madrasah'),
  ('cls_mts_3a', '3A MTs Diniyah', 'madrasah'),
  ('cls_ma_1a', '1A MA Diniyah', 'madrasah'),
  ('cls_ma_2a', '2A MA Diniyah', 'madrasah'),
  ('cls_ma_3a', '3A MA Diniyah', 'madrasah'),
  ('cls_smp_7', 'VII SMP Formal', 'formal'),
  ('cls_smp_8', 'VIII SMP Formal', 'formal'),
  ('cls_smp_9', 'IX SMP Formal', 'formal'),
  ('cls_ma_10', 'X MA Formal', 'formal'),
  ('cls_ma_11', 'XI MA Formal', 'formal'),
  ('cls_ma_12', 'XII MA Formal', 'formal'),
  ('cls_formal_none', '-', 'formal')
ON CONFLICT (id) DO NOTHING;

INSERT INTO settings (id, school_name, tagline, address)
VALUES ('default_settings', 'Pondok Pesantren Al-Asy''ariyah', 'Mencetak Generasi Qur''ani & Berakhlakul Karimah', 'Semarang, Jawa Tengah')
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- INDEX PERFORMA UNTUK PENCARIAN CEPAT & QUERY RELASIONAL
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_students_room_id ON students(room_id);
CREATE INDEX IF NOT EXISTS idx_students_nis ON students(nis);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
CREATE INDEX IF NOT EXISTS idx_students_gender ON students(gender);
CREATE INDEX IF NOT EXISTS idx_alumni_student_id ON alumni(student_id);
CREATE INDEX IF NOT EXISTS idx_alumni_tahun_keluar ON alumni(tahun_keluar);
CREATE INDEX IF NOT EXISTS idx_alumni_nis ON alumni(nis);
CREATE INDEX IF NOT EXISTS idx_bills_student_id ON bills(student_id);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);
CREATE INDEX IF NOT EXISTS idx_bill_payments_bill_id ON bill_payments(bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_payments_student_id ON bill_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_ppdb_student_id ON ppdb(student_id);
CREATE INDEX IF NOT EXISTS idx_financial_expenses_bendahara ON financial_expenses(bendahara_type);
CREATE INDEX IF NOT EXISTS idx_financial_expenses_date ON financial_expenses(date);
CREATE INDEX IF NOT EXISTS idx_security_permits_student_id ON security_permits(student_id);
CREATE INDEX IF NOT EXISTS idx_outbox_student_id ON outbox_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_wa_logs_recipient ON wa_logs(recipient_phone);
CREATE INDEX IF NOT EXISTS idx_news_created_at ON news(created_at DESC);

-- ==============================================================================
-- REPLICA IDENTITY FULL (MEMASTIKAN REALTIME MENGIRIM SELURUH DATA BARIS)
-- ==============================================================================
ALTER TABLE rooms REPLICA IDENTITY FULL;
ALTER TABLE students REPLICA IDENTITY FULL;
ALTER TABLE alumni REPLICA IDENTITY FULL;
ALTER TABLE ppdb REPLICA IDENTITY FULL;
ALTER TABLE bills REPLICA IDENTITY FULL;
ALTER TABLE bill_payments REPLICA IDENTITY FULL;
ALTER TABLE financial_expenses REPLICA IDENTITY FULL;
ALTER TABLE security_permits REPLICA IDENTITY FULL;
ALTER TABLE outbox_logs REPLICA IDENTITY FULL;
ALTER TABLE wa_logs REPLICA IDENTITY FULL;
ALTER TABLE news REPLICA IDENTITY FULL;
ALTER TABLE announcements REPLICA IDENTITY FULL;
ALTER TABLE events REPLICA IDENTITY FULL;
ALTER TABLE master_classes REPLICA IDENTITY FULL;
ALTER TABLE settings REPLICA IDENTITY FULL;
ALTER TABLE staff_users REPLICA IDENTITY FULL;
ALTER TABLE staff_configs REPLICA IDENTITY FULL;

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES & IZIN AKSES UNIVERSAL
-- Memberikan hak akses penuh bagi seluruh perangkat klien portal pesantren
-- ==============================================================================
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE alumni ENABLE ROW LEVEL SECURITY;
ALTER TABLE ppdb ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_permits ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbox_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE news ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_configs ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role, postgres;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role, postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role, postgres;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role, postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role, postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role, postgres;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Public access for rooms" ON rooms;
  CREATE POLICY "Public access for rooms" ON rooms FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public access for students" ON students;
  CREATE POLICY "Public access for students" ON students FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public access for alumni" ON alumni;
  CREATE POLICY "Public access for alumni" ON alumni FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public access for ppdb" ON ppdb;
  CREATE POLICY "Public access for ppdb" ON ppdb FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public access for bills" ON bills;
  CREATE POLICY "Public access for bills" ON bills FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public access for bill_payments" ON bill_payments;
  CREATE POLICY "Public access for bill_payments" ON bill_payments FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public access for financial_expenses" ON financial_expenses;
  CREATE POLICY "Public access for financial_expenses" ON financial_expenses FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public access for security_permits" ON security_permits;
  CREATE POLICY "Public access for security_permits" ON security_permits FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public access for outbox_logs" ON outbox_logs;
  CREATE POLICY "Public access for outbox_logs" ON outbox_logs FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public access for wa_logs" ON wa_logs;
  CREATE POLICY "Public access for wa_logs" ON wa_logs FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public access for news" ON news;
  CREATE POLICY "Public access for news" ON news FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public access for announcements" ON announcements;
  CREATE POLICY "Public access for announcements" ON announcements FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public access for events" ON events;
  CREATE POLICY "Public access for events" ON events FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public access for master_classes" ON master_classes;
  CREATE POLICY "Public access for master_classes" ON master_classes FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public access for settings" ON settings;
  CREATE POLICY "Public access for settings" ON settings FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public access for staff_users" ON staff_users;
  CREATE POLICY "Public access for staff_users" ON staff_users FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public access for staff_configs" ON staff_configs;
  CREATE POLICY "Public access for staff_configs" ON staff_configs FOR ALL USING (true) WITH CHECK (true);
END $$;

-- ==============================================================================
-- AKTIFKAN FITUR SUPABASE REALTIME (Sinkronisasi Otomatis Seluruh Perangkat)
-- Setiap penambahan dibungkus aman agar tidak memicu error jika sudah ada
-- ==============================================================================
DO $$
DECLARE
  tbl_name text;
  tables text[] := ARRAY[
    'news', 'announcements', 'rooms', 'students', 'alumni', 'ppdb', 
    'bills', 'bill_payments', 'financial_expenses', 'settings', 
    'events', 'staff_users', 'staff_configs', 'outbox_logs', 'security_permits', 
    'master_classes', 'wa_logs'
  ];
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH tbl_name IN ARRAY tables LOOP
      BEGIN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', tbl_name);
      EXCEPTION 
        WHEN duplicate_object THEN NULL;
        WHEN OTHERS THEN NULL;
      END;
    END LOOP;
  ELSE
    BEGIN
      CREATE PUBLICATION supabase_realtime;
      FOREACH tbl_name IN ARRAY tables LOOP
        BEGIN
          EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', tbl_name);
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
      END LOOP;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
END $$;
