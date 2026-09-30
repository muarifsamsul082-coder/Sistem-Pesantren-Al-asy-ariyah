-- ==============================================================================
-- SKRIP DATABASE SUPABASE RESMI & SINKRONISASI REALTIME LINTAS PERANGKAT
-- PONDOK PESANTREN AL-ASY'ARIYAH (TABEL SALING BERHUBUNGAN / RELASIONAL)
-- Jalankan skrip ini di: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- Aktifkan ekstensi UUID jika diperlukan
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. TABEL ASRAMA & KAMAR SANTRI
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  gender TEXT DEFAULT 'Putra',
  formal_school TEXT,
  diniyah_school TEXT,
  capacity INTEGER DEFAULT 10,
  ketua_kamar_id TEXT,
  ketua_kamar_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 2. TABEL DATA INDUK SANTRI & BUKU CATATAN KESISWAAN
-- Relasi: room_id merujuk ke rooms(id)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  nis TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  gender TEXT DEFAULT 'Putra',
  class TEXT DEFAULT 'VII SMP Formal / 1A MTs',
  class_pagi TEXT DEFAULT '1A MTs Diniyah',
  class_sore TEXT DEFAULT 'VII SMP Formal',
  class_name TEXT,
  class_madrasah TEXT,
  class_formal TEXT,
  akun_madrasah TEXT,
  room_id TEXT REFERENCES rooms(id) ON DELETE SET NULL ON UPDATE CASCADE,
  kamar TEXT,
  phone TEXT,
  address TEXT,
  status TEXT DEFAULT 'Aktif',
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

-- Hubungkan Ketua Kamar di tabel rooms ke tabel students
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_rooms_ketua' AND table_name = 'rooms'
  ) THEN
    ALTER TABLE rooms 
      ADD CONSTRAINT fk_rooms_ketua 
      FOREIGN KEY (ketua_kamar_id) REFERENCES students(id) 
      ON DELETE SET NULL 
      ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ------------------------------------------------------------------------------
-- 3. TABEL PENDAFTARAN SANTRI BARU (PPDB / PCSB ONLINE)
-- Relasi: student_id merujuk ke students(id) jika pendaftaran telah diterima
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ppdb (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  gender TEXT DEFAULT 'Putra',
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
  status TEXT DEFAULT 'Pending',
  payment_status TEXT DEFAULT 'unpaid',
  payment_type TEXT DEFAULT 'Cicilan Bulanan',
  payment_proof TEXT,
  verified_documents JSONB DEFAULT '[]'::jsonb,
  is_locked BOOLEAN DEFAULT false,
  notes TEXT,
  blood_type TEXT,
  health_history TEXT,
  student_id TEXT REFERENCES students(id) ON DELETE SET NULL ON UPDATE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 4. TABEL TAGIHAN & KEUANGAN SYAHRIYAH / SPP
-- Relasi: student_id merujuk ke students(id) (ON DELETE CASCADE)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bills (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE ON UPDATE CASCADE,
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

-- ------------------------------------------------------------------------------
-- 5. TABEL RIWAYAT TRANSAKSI & VERIFIKASI PEMBAYARAN
-- Relasi: bill_id merujuk ke bills(id) dan student_id merujuk ke students(id)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bill_payments (
  id TEXT PRIMARY KEY,
  bill_id TEXT NOT NULL REFERENCES bills(id) ON DELETE CASCADE ON UPDATE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE ON UPDATE CASCADE,
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

-- ------------------------------------------------------------------------------
-- 6. TABEL PERIZINAN KELUAR & KEPULANGAN SANTRI (KEAMANAN)
-- Relasi: student_id merujuk ke students(id)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS security_permits (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE ON UPDATE CASCADE,
  student_name TEXT NOT NULL,
  permit_type TEXT NOT NULL, -- 'Keluar Lingkungan' | 'Pulang (Keluarga)'
  description TEXT,
  out_date TEXT,
  expected_return_date TEXT,
  actual_return_date TEXT,
  status TEXT DEFAULT 'Menunggu Persetujuan', -- 'Menunggu Persetujuan' | 'Disetujui' | 'Ditolak' | 'Selesai'
  signed_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 7. TABEL BUKU AGENDA SURAT KELUAR & ARSIP PERIZINAN DINAS
-- Relasi: student_id merujuk ke students(id) jika surat ditujukan untuk santri
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS outbox_logs (
  id TEXT PRIMARY KEY,
  student_id TEXT REFERENCES students(id) ON DELETE SET NULL ON UPDATE CASCADE,
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

-- ------------------------------------------------------------------------------
-- 8. TABEL BERITA, KABAR & ARTIKEL PESANTREN
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 9. TABEL PENGUMUMAN RESMI PESANTREN (UNTUK SANTRI, WALI & PENGURUS)
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 10. TABEL AGENDA KEGIATAN & KALENDER AKADEMIK
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 11. TABEL PENGATURAN PORTAL, KOP, TTD, STEMPEL & TARIF PESANTREN
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY DEFAULT 'default_settings',
  school_name TEXT DEFAULT 'Pondok Pesantren Al-Asy''ariyah',
  nama_yayasan TEXT,
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
  ttdBendaharaUrl TEXT,
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
  available_madrasah_classes JSONB DEFAULT '["1A MTs Diniyah", "1B MTs Diniyah", "2A MTs Diniyah", "2B MTs Diniyah", "3A MTs Diniyah", "1A MA Diniyah", "2A MA Diniyah", "3A MA Diniyah"]'::jsonb,
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

-- ------------------------------------------------------------------------------
-- 12. TABEL AKUN PENGGUNA PENGURUS & ADMINISTRATOR
-- ------------------------------------------------------------------------------
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
-- INDEX PERFORMA UNTUK PENCARIAN & RELASI ANTAR TABEL (FOREIGN KEY INDEXES)
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_students_room_id ON students(room_id);
CREATE INDEX IF NOT EXISTS idx_students_nis ON students(nis);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
CREATE INDEX IF NOT EXISTS idx_bills_student_id ON bills(student_id);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);
CREATE INDEX IF NOT EXISTS idx_bill_payments_bill_id ON bill_payments(bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_payments_student_id ON bill_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_ppdb_student_id ON ppdb(student_id);
CREATE INDEX IF NOT EXISTS idx_security_permits_student_id ON security_permits(student_id);
CREATE INDEX IF NOT EXISTS idx_outbox_student_id ON outbox_logs(student_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Memberikan hak akses read/write penuh bagi klien web aplikasi pesantren
-- ==============================================================================
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE ppdb ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_permits ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbox_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE news ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_users ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Kebijakan akses anonim & terotentikasi untuk aplikasi portal
  DROP POLICY IF EXISTS "Public access for rooms" ON rooms;
  CREATE POLICY "Public access for rooms" ON rooms FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public access for students" ON students;
  CREATE POLICY "Public access for students" ON students FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public access for ppdb" ON ppdb;
  CREATE POLICY "Public access for ppdb" ON ppdb FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public access for bills" ON bills;
  CREATE POLICY "Public access for bills" ON bills FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public access for bill_payments" ON bill_payments;
  CREATE POLICY "Public access for bill_payments" ON bill_payments FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public access for security_permits" ON security_permits;
  CREATE POLICY "Public access for security_permits" ON security_permits FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public access for outbox_logs" ON outbox_logs;
  CREATE POLICY "Public access for outbox_logs" ON outbox_logs FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public access for news" ON news;
  CREATE POLICY "Public access for news" ON news FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public access for announcements" ON announcements;
  CREATE POLICY "Public access for announcements" ON announcements FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public access for events" ON events;
  CREATE POLICY "Public access for events" ON events FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public access for settings" ON settings;
  CREATE POLICY "Public access for settings" ON settings FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public access for staff_users" ON staff_users;
  CREATE POLICY "Public access for staff_users" ON staff_users FOR ALL USING (true) WITH CHECK (true);
END $$;

-- ==============================================================================
-- AKTIFKAN FITUR SUPABASE REALTIME (Sinkronisasi Otomatis Semua Perangkat)
-- ==============================================================================
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE news;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE announcements;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE ppdb;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE students;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE bills;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE bill_payments;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE settings;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE events;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE staff_users;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE outbox_logs;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE security_permits;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Inisialisasi default settings record jika belum ada
INSERT INTO settings (id, school_name, tagline, address)
VALUES ('default_settings', 'Pondok Pesantren Al-Asy''ariyah', 'Mencetak Generasi Qur''ani & Berakhlakul Karimah', 'Semarang, Jawa Tengah')
ON CONFLICT (id) DO NOTHING;
