import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { News, Announcement, PCSBRegistration, Student, Bill, PortalSettings, Room, AcademicEvent, StaffUserItem, FinancialExpense, AlumniRecord } from '../types';

export const normalizeSupabaseUrl = (urlString: string): string => {
  if (!urlString || typeof urlString !== 'string') return '';
  let trimmed = urlString.trim();
  if (!trimmed) return '';

  // Remove trailing slashes
  trimmed = trimmed.replace(/\/+$/, '');

  // If user only typed project ref e.g. "schwszgiasriuujqppnv"
  if (!trimmed.includes('.') && !trimmed.includes('/')) {
    return `https://${trimmed}.supabase.co`;
  }

  // If user typed "https://schwszgiasriuujqppnv" without .supabase.co
  if (trimmed.startsWith('https://') && !trimmed.slice(8).includes('.')) {
    return `${trimmed}.supabase.co`;
  }
  if (trimmed.startsWith('http://') && !trimmed.slice(7).includes('.')) {
    return `${trimmed}.supabase.co`;
  }

  // If missing protocol but has domain
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    trimmed = `https://${trimmed}`;
  }

  return trimmed;
};

export const isValidSupabaseUrl = (urlString: string): boolean => {
  if (!urlString || typeof urlString !== 'string') return false;
  const normalized = normalizeSupabaseUrl(urlString);
  if (!normalized) return false;
  try {
    const parsed = new URL(normalized);
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && 
      Boolean(parsed.hostname) && 
      parsed.hostname.includes('.');
  } catch {
    return false;
  }
};

// Retrieve config from env or localStorage
let remoteConfigLoaded = false;

export const initSupabaseFromRemoteConfig = async (): Promise<boolean> => {
  try {
    const res = await fetch('/api/config/supabase');
    if (res.ok) {
      const data = await res.json();
      if (data && data.url && data.anonKey) {
        const normalized = normalizeSupabaseUrl(data.url);
        if (isValidSupabaseUrl(normalized)) {
          localStorage.setItem('pesantren_supabase_url', normalized);
          localStorage.setItem('pesantren_supabase_key', data.anonKey.trim());
          supabaseInstance = null;
          lastAttemptedUrl = '';
          lastAttemptedKey = '';
          remoteConfigLoaded = true;
          return true;
        }
      }
    }
  } catch (e) {
    // ignore network errors
  }
  return false;
};

export const getSupabaseConfig = () => {
  const metaEnv = (import.meta as any).env || {};
  const rawUrl = metaEnv.VITE_SUPABASE_URL || localStorage.getItem('pesantren_supabase_url') || '';
  const rawKey = metaEnv.VITE_SUPABASE_ANON_KEY || localStorage.getItem('pesantren_supabase_key') || '';
  const url = typeof rawUrl === 'string' ? normalizeSupabaseUrl(rawUrl) : '';
  const anonKey = typeof rawKey === 'string' ? rawKey.trim() : '';
  return { url, anonKey };
};

let supabaseInstance: SupabaseClient | null = null;
let lastAttemptedUrl = '';
let lastAttemptedKey = '';

export const getSupabaseClient = (): SupabaseClient | null => {
  const { url, anonKey } = getSupabaseConfig();
  if (!url || !anonKey || !isValidSupabaseUrl(url)) {
    return null;
  }
  if (supabaseInstance && lastAttemptedUrl === url && lastAttemptedKey === anonKey) {
    return supabaseInstance;
  }
  try {
    supabaseInstance = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
    lastAttemptedUrl = url;
    lastAttemptedKey = anonKey;
    return supabaseInstance;
  } catch (err) {
    console.warn('Gagal menginisialisasi client Supabase:', err);
    supabaseInstance = null;
    return null;
  }
};

export const saveSupabaseCredentialsLocally = async (url: string, anonKey: string): Promise<void> => {
  const normalizedUrl = normalizeSupabaseUrl(url);
  const trimmedKey = anonKey ? anonKey.trim() : '';

  if (normalizedUrl) localStorage.setItem('pesantren_supabase_url', normalizedUrl);
  else localStorage.removeItem('pesantren_supabase_url');

  if (trimmedKey) localStorage.setItem('pesantren_supabase_key', trimmedKey);
  else localStorage.removeItem('pesantren_supabase_key');

  supabaseInstance = null; // reset client instance
  lastAttemptedUrl = '';
  lastAttemptedKey = '';

  // Broadcast to server config endpoint so ALL devices automatically receive the config!
  try {
    await fetch('/api/config/supabase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: normalizedUrl, anonKey: trimmedKey })
    });
  } catch (e) {
    console.error("Failed to broadcast Supabase config to server:", e);
  }
};

export const isSupabaseConfigured = (): boolean => {
  const { url, anonKey } = getSupabaseConfig();
  return Boolean(url && anonKey && isValidSupabaseUrl(url));
};

export const testSupabaseConnection = async (): Promise<{ success: boolean; message: string }> => {
  const { url, anonKey } = getSupabaseConfig();
  if (!url || !anonKey) {
    return { success: false, message: 'URL atau Anon Key Supabase belum diisi.' };
  }
  if (!isValidSupabaseUrl(url)) {
    return { success: false, message: 'Format URL tidak valid. Contoh yang benar: https://schwszgiasriuujqppnv.supabase.co' };
  }
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'Gagal membuat Supabase client. Periksa kembali URL dan Anon Key.' };
  }

  try {
    // Timeout promise after 8 seconds
    const timeoutPromise = new Promise<{ error: any; data: any }>((_, reject) =>
      setTimeout(() => reject(new Error('Koneksi timeout (lebih dari 8 detik). Periksa internet atau URL Anda.')), 8000)
    );

    const queryPromise = client.from('settings').select('id').limit(1);
    const result: any = await Promise.race([queryPromise, timeoutPromise]);

    if (result && result.error) {
      const errorObj = result.error;
      const errMsg = String(errorObj?.message || errorObj?.details || errorObj?.hint || JSON.stringify(errorObj));
      if (errMsg.includes('relation') || errMsg.includes('42P01') || errMsg.includes('does not exist')) {
        return { success: true, message: 'Terkoneksi ke Supabase! (Tabel belum dibuat, klik "Skrip SQL Supabase" lalu jalankan di Supabase).' };
      }
      if (errMsg.includes('Invalid API key') || errMsg.includes('JWT') || errMsg.includes('unauthorized') || errMsg.includes('apiKey')) {
        return { success: false, message: 'Anon Key tidak cocok / salah. Periksa kembali Anon Key di Supabase API Settings.' };
      }
      return { success: false, message: `Respon Supabase: ${errMsg}` };
    }

    return { success: true, message: 'Berhasil terhubung ke Database Supabase!' };
  } catch (e: any) {
    const rawMsg = e instanceof Error ? e.message : (typeof e === 'string' ? e : 'Gagal menghubungi server');
    if (rawMsg.includes('Failed to fetch') || rawMsg.includes('NetworkError') || rawMsg.includes('ENOTFOUND')) {
      return { 
        success: false, 
        message: 'Gagal menghubungi domain Supabase. Pastikan URL berformat lengkap: https://[id-project].supabase.co' 
      };
    }
    return { success: false, message: `Gagal: ${rawMsg}` };
  }
};

// SQL Schema script for user to run in Supabase SQL Editor
export const SUPABASE_SQL_SCHEMA = `-- ==============================================================================
-- SKRIP DATABASE SUPABASE RESMI & SINKRONISASI REALTIME LINTAS PERANGKAT
-- PONDOK PESANTREN AL-ASY'ARIYAH
-- Sesuai dengan seluruh Menu di Admin Dashboard (Tabel Relasional & Saling Terhubung)
-- ==============================================================================
-- Petunjuk Penggunaan:
-- 1. Buka Dashboard Supabase Anda (https://supabase.com/dashboard)
-- 2. Pilih Proyek Pesantren Anda -> Buka menu "SQL Editor" -> Klik "New Query"
-- 3. Salin (Copy) & Tempel (Paste) seluruh isi skrip ini -> Klik tombol "RUN" (Jalankan)
-- ==============================================================================

-- 1. TABEL PENGATURAN PORTAL, KOP SURAT, PENGURUS, TTD, STEMPEL & TARIF (Menu: Pengaturan & Rekening)
CREATE TABLE IF NOT EXISTS public.settings (
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

  -- PENGASUH PONDOK PESANTREN (PALING ATAS)
  nama_pengasuh TEXT,
  ttd_pengasuh_url TEXT,
  stempel_pengasuh_url TEXT,

  -- DAFTAR PENGURUS YANG MENJABAT & TANDA TANGAN
  nama_pengurus TEXT,
  ttd_pengurus_url TEXT,
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
  custom_officials JSONB DEFAULT '[]'::jsonb,

  -- GAMBAR STEMPEL RESMI PESANTREN (PALING BAWAH)
  stempel_pesantren_url TEXT,

  -- DATA KANAL PEMBAYARAN, REKENING & KELAS
  rekening_list JSONB DEFAULT '[]'::jsonb,
  available_formal_classes JSONB DEFAULT '["VII SMP Formal", "VIII SMP Formal", "IX SMP Formal", "X MA Formal", "XI MA Formal", "XII MA Formal", "-"]'::jsonb,
  available_madrasah_classes JSONB DEFAULT '["1A MI Diniyah", "1B MI Diniyah", "2A MI Diniyah", "3A MI Diniyah", "1A MTs Diniyah", "1B MTs Diniyah", "2A MTs Diniyah", "2B MTs Diniyah", "3A MTs Diniyah", "1A MA Diniyah", "2A MA Diniyah", "3A MA Diniyah"]'::jsonb,
  
  -- PENGATURAN PPDB / PCSB
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

-- 2. TABEL DAFTAR PENGURUS & PEJABAT YANG MENJABAT (Menu: Daftar Pengurus)
CREATE TABLE IF NOT EXISTS public.officials (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  position TEXT NOT NULL,
  category TEXT DEFAULT 'pengurus',
  order_index INTEGER DEFAULT 0,
  signature_url TEXT,
  seal_url TEXT,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABEL DATA KAMAR / ASRAMA SANTRI (Menu: Kamar & Asrama)
CREATE TABLE IF NOT EXISTS public.rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  gender TEXT DEFAULT 'Laki-laki',
  formal_school TEXT,
  diniyah_school TEXT,
  capacity INTEGER DEFAULT 10,
  ketua_kamar_id TEXT,
  ketua_kamar_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABEL DATA SANTRI AKTIF (Menu: Data Santri & Induk Kesiswaan)
CREATE TABLE IF NOT EXISTS public.students (
  id TEXT PRIMARY KEY,
  nis TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  gender TEXT DEFAULT 'Laki-laki',
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

-- 5. TABEL DATA ALUMNI (Menu: Data Alumni)
CREATE TABLE IF NOT EXISTS public.alumni (
  id TEXT PRIMARY KEY,
  student_id TEXT,
  nis TEXT NOT NULL,
  full_name TEXT NOT NULL,
  gender TEXT DEFAULT 'Laki-laki',
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

-- 6. TABEL PENDAFTARAN SANTRI BARU (Menu: PPDB / PCSB Online)
CREATE TABLE IF NOT EXISTS public.ppdb (
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
  status TEXT DEFAULT 'Pending',
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

-- 7. TABEL TAGIHAN & KEUANGAN SYAHRIYAH / SPP
CREATE TABLE IF NOT EXISTS public.bills (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  student_name TEXT,
  nis TEXT,
  title TEXT NOT NULL,
  amount NUMERIC DEFAULT 0,
  due_date TEXT,
  status TEXT DEFAULT 'Belum Lunas',
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

-- 8. TABEL RIWAYAT TRANSAKSI & VERIFIKASI PEMBAYARAN ONLINE
CREATE TABLE IF NOT EXISTS public.bill_payments (
  id TEXT PRIMARY KEY,
  bill_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  unique_code INTEGER DEFAULT 0,
  final_amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL,
  payment_proof_url TEXT,
  sender_bank TEXT,
  sender_account TEXT,
  status TEXT DEFAULT 'Menunggu Verifikasi',
  verified_by TEXT,
  verified_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. TABEL PENGELUARAN KAS BENDAHARA (Menu: Laporan Keuangan)
CREATE TABLE IF NOT EXISTS public.financial_expenses (
  id TEXT PRIMARY KEY,
  bendahara_type TEXT NOT NULL DEFAULT 'putra',
  bendahara_name TEXT NOT NULL,
  date TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  description TEXT NOT NULL,
  recipient TEXT,
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. TABEL PERIZINAN KELUAR & KEPULANGAN SANTRI (Menu: Perizinan & Ketertiban)
CREATE TABLE IF NOT EXISTS public.security_permits (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  permit_type TEXT NOT NULL,
  description TEXT,
  out_date TEXT,
  expected_return_date TEXT,
  actual_return_date TEXT,
  status TEXT DEFAULT 'Menunggu Persetujuan',
  signed_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. TABEL BUKU SURAT KELUAR & ARSIP DOKUMEN (Menu: Outbox & Arsip Surat)
CREATE TABLE IF NOT EXISTS public.outbox_logs (
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

-- 12. TABEL BROADCAST WHATSAPP & LOG GATEWAY
CREATE TABLE IF NOT EXISTS public.wa_logs (
  id TEXT PRIMARY KEY,
  message_type TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  message_body TEXT NOT NULL,
  status TEXT DEFAULT 'Terkirim',
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. TABEL BERITA & ARTIKEL PESANTREN
CREATE TABLE IF NOT EXISTS public.news (
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

-- 14. TABEL PENGUMUMAN RESMI
CREATE TABLE IF NOT EXISTS public.announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  priority TEXT DEFAULT 'medium',
  target_role TEXT DEFAULT 'all',
  date TEXT,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. TABEL KALENDER AKADEMIK & AGENDA
CREATE TABLE IF NOT EXISTS public.events (
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

-- 16. TABEL MASTER KELAS & SEKOLAH
CREATE TABLE IF NOT EXISTS public.master_classes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. TABEL AKUN LOGIN PENGURUS & HAK AKSES
CREATE TABLE IF NOT EXISTS public.staff_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'pengurus',
  is_confirmed BOOLEAN DEFAULT false,
  registered_at TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. TABEL KONFIGURASI BIRO PENGURUS (TTD & STEMPEL PER BIRO)
CREATE TABLE IF NOT EXISTS public.staff_configs (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL UNIQUE,
  name TEXT,
  signature TEXT,
  seal TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- PEMBARUAN KOLOM OTOMATIS JIKA TABEL SUDAH ADA (NON-DESTRUKTIF)
-- ==============================================================================

-- Kolom Settings
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS school_name TEXT DEFAULT 'Pondok Pesantren Al-Asy''ariyah';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS nama_yayasan TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS tagline TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS about_us TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS vision TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS mission JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS accent_color TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS nama_pengasuh TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS ttd_pengasuh_url TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS stempel_pengasuh_url TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS nama_pengurus TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS ttd_pengurus_url TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS nama_ketua_pcsb TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS ttd_ketua_pcsb_url TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS stempel_pcsb_url TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS nama_bendahara TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS ttd_bendahara_url TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS stempel_bendahara_url TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS nama_keamanan TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS ttd_keamanan_url TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS stempel_keamanan_url TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS nama_ketertiban TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS ttd_ketertiban_url TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS stempel_ketertiban_url TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS nama_kesehatan TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS ttd_kesehatan_url TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS stempel_kesehatan_url TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS nama_akademik TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS ttd_akademik_url TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS stempel_akademik_url TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS custom_officials JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS stempel_pesantren_url TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS rekening_list JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS available_formal_classes JSONB;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS available_madrasah_classes JSONB;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS ppdb_open BOOLEAN DEFAULT true;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS ppdb_start_date TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS ppdb_end_date TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS pcsb_fee_pendaftaran NUMERIC DEFAULT 150000;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS pcsb_fee_sarpras NUMERIC DEFAULT 1000000;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS pcsb_fee_seragam NUMERIC DEFAULT 650000;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS pcsb_fee_kitab NUMERIC DEFAULT 350000;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS pcsb_fee_kesehatan NUMERIC DEFAULT 100000;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS pcsb_fee_syahriyah NUMERIC DEFAULT 350000;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS pcsb_enable_pendaftaran BOOLEAN DEFAULT true;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS pcsb_enable_sarpras BOOLEAN DEFAULT true;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS pcsb_enable_seragam BOOLEAN DEFAULT true;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS pcsb_enable_kitab BOOLEAN DEFAULT true;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS pcsb_enable_kesehatan BOOLEAN DEFAULT true;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS pcsb_enable_syahriyah BOOLEAN DEFAULT true;

-- Kolom Officials
ALTER TABLE public.officials ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.officials ADD COLUMN IF NOT EXISTS position TEXT;
ALTER TABLE public.officials ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'pengurus';
ALTER TABLE public.officials ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;
ALTER TABLE public.officials ADD COLUMN IF NOT EXISTS signature_url TEXT;
ALTER TABLE public.officials ADD COLUMN IF NOT EXISTS seal_url TEXT;
ALTER TABLE public.officials ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.officials ADD COLUMN IF NOT EXISTS notes TEXT;

-- Kolom Students
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS class TEXT DEFAULT 'VII SMP Formal • 1A MI Diniyah';
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS class_pagi TEXT DEFAULT '1A MI Diniyah';
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS class_sore TEXT DEFAULT 'VII SMP Formal';
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS class_name TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS class_madrasah TEXT DEFAULT '1A MI Diniyah';
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS class_formal TEXT DEFAULT 'VII SMP Formal';
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS akun_madrasah TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS room_id TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS kamar TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Aktif';
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS parent_name TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS parent_phone TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS guardian_name TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS guardian_phone TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS birth_place TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS birth_date TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS kk TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS nik TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS father_name TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS mother_name TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS blood_type TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS health_history TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS current_hafalan TEXT DEFAULT '0 Juz';
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS tahfidz_logs JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS memorization_logs JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS security_logs JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS discipline_logs JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS health_logs JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS academic_reports JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS payment_history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS ppdb_id TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS alumni_id TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS tahun_keluar TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS alumni_reason TEXT;

-- Kolom Alumni
ALTER TABLE public.alumni ADD COLUMN IF NOT EXISTS student_id TEXT;
ALTER TABLE public.alumni ADD COLUMN IF NOT EXISTS nis TEXT;
ALTER TABLE public.alumni ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.alumni ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'Laki-laki';
ALTER TABLE public.alumni ADD COLUMN IF NOT EXISTS class_formal TEXT;
ALTER TABLE public.alumni ADD COLUMN IF NOT EXISTS class_madrasah TEXT;
ALTER TABLE public.alumni ADD COLUMN IF NOT EXISTS tahun_masuk TEXT DEFAULT '2020';
ALTER TABLE public.alumni ADD COLUMN IF NOT EXISTS tahun_keluar TEXT;
ALTER TABLE public.alumni ADD COLUMN IF NOT EXISTS alumni_reason TEXT DEFAULT 'Tamat / Lulus Belajar';
ALTER TABLE public.alumni ADD COLUMN IF NOT EXISTS last_education TEXT;
ALTER TABLE public.alumni ADD COLUMN IF NOT EXISTS current_activity TEXT;
ALTER TABLE public.alumni ADD COLUMN IF NOT EXISTS campus_or_workplace TEXT;
ALTER TABLE public.alumni ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.alumni ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.alumni ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.alumni ADD COLUMN IF NOT EXISTS parent_name TEXT;
ALTER TABLE public.alumni ADD COLUMN IF NOT EXISTS parent_phone TEXT;
ALTER TABLE public.alumni ADD COLUMN IF NOT EXISTS current_hafalan TEXT DEFAULT '30 Juz';
ALTER TABLE public.alumni ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Kolom PPDB
ALTER TABLE public.ppdb ADD COLUMN IF NOT EXISTS student_id TEXT;
ALTER TABLE public.ppdb ADD COLUMN IF NOT EXISTS nik TEXT;
ALTER TABLE public.ppdb ADD COLUMN IF NOT EXISTS nisn TEXT;
ALTER TABLE public.ppdb ADD COLUMN IF NOT EXISTS kk TEXT;
ALTER TABLE public.ppdb ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.ppdb ADD COLUMN IF NOT EXISTS parent_name TEXT;
ALTER TABLE public.ppdb ADD COLUMN IF NOT EXISTS parent_phone TEXT;
ALTER TABLE public.ppdb ADD COLUMN IF NOT EXISTS father_name TEXT;
ALTER TABLE public.ppdb ADD COLUMN IF NOT EXISTS father_phone TEXT;
ALTER TABLE public.ppdb ADD COLUMN IF NOT EXISTS mother_name TEXT;
ALTER TABLE public.ppdb ADD COLUMN IF NOT EXISTS mother_phone TEXT;
ALTER TABLE public.ppdb ADD COLUMN IF NOT EXISTS guardian_phone TEXT;
ALTER TABLE public.ppdb ADD COLUMN IF NOT EXISTS previous_school TEXT;
ALTER TABLE public.ppdb ADD COLUMN IF NOT EXISTS target_program TEXT;
ALTER TABLE public.ppdb ADD COLUMN IF NOT EXISTS academic_year TEXT;
ALTER TABLE public.ppdb ADD COLUMN IF NOT EXISTS registration_date TEXT;
ALTER TABLE public.ppdb ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Pending';
ALTER TABLE public.ppdb ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid';
ALTER TABLE public.ppdb ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'Cicilan Bulanan';
ALTER TABLE public.ppdb ADD COLUMN IF NOT EXISTS payment_proof TEXT;
ALTER TABLE public.ppdb ADD COLUMN IF NOT EXISTS verified_documents JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.ppdb ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;
ALTER TABLE public.ppdb ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.ppdb ADD COLUMN IF NOT EXISTS blood_type TEXT;
ALTER TABLE public.ppdb ADD COLUMN IF NOT EXISTS health_history TEXT;

-- Kolom Bills & Payments
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS student_name TEXT;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS nis TEXT;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'SPP Syahriyah';
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS payment_date TEXT;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS sender_bank TEXT;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS sender_account_number TEXT;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS verification_status TEXT;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS verification_logs JSONB DEFAULT '[]'::jsonb;

-- Kolom Expenses
ALTER TABLE public.financial_expenses ADD COLUMN IF NOT EXISTS bendahara_type TEXT DEFAULT 'putra';
ALTER TABLE public.financial_expenses ADD COLUMN IF NOT EXISTS bendahara_name TEXT;
ALTER TABLE public.financial_expenses ADD COLUMN IF NOT EXISTS recipient TEXT;
ALTER TABLE public.financial_expenses ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- Kolom Rooms
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS formal_school TEXT;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS diniyah_school TEXT;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 10;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS ketua_kamar_id TEXT;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS ketua_kamar_name TEXT;

-- ==============================================================================
-- INSIALISASI DATA DEFAULT
-- ==============================================================================
INSERT INTO public.settings (id, school_name, tagline, address)
VALUES ('default_settings', 'Pondok Pesantren Al-Asy''ariyah', 'Mencetak Generasi Qur''ani & Berakhlakul Karimah', 'Semarang, Jawa Tengah')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.master_classes (id, name, type) VALUES
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

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES & AKSES PENUH CLIENT
-- ==============================================================================
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.officials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumni ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ppdb ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_permits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outbox_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_configs ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t text;
  tbls text[] := ARRAY[
    'settings', 'officials', 'rooms', 'students', 'alumni', 'ppdb',
    'bills', 'bill_payments', 'financial_expenses', 'security_permits',
    'outbox_logs', 'wa_logs', 'news', 'announcements', 'events',
    'master_classes', 'staff_users', 'staff_configs'
  ];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'public_full_access_' || t, t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL USING (true) WITH CHECK (true)', 'public_full_access_' || t, t);
  END LOOP;
END $$;

-- ==============================================================================
-- IZIN AKSES PERAN (GRANTS KONEKSI CLIENT)
-- ==============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

-- ==============================================================================
-- AKTIFKAN FITUR SUPABASE REALTIME MULTI-DEVICE
-- ==============================================================================
DO $$
DECLARE
  t text;
  tbls text[] := ARRAY[
    'settings', 'officials', 'rooms', 'students', 'alumni', 'ppdb',
    'bills', 'bill_payments', 'financial_expenses', 'security_permits',
    'outbox_logs', 'wa_logs', 'news', 'announcements', 'events',
    'master_classes', 'staff_users', 'staff_configs'
  ];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
  FOREACH t IN ARRAY tbls LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;
END $$;
`;

// Peta skema per-tabel untuk pembuatan skrip SQL otomatis hanya jika tabel belum ada di Supabase
export const APP_TABLES_SCHEMA_MAP: Record<string, { menuLabel: string; sql: string }> = {
  news: {
    menuLabel: 'Berita & Informasi',
    sql: `-- Tabel Berita & Informasi
CREATE TABLE IF NOT EXISTS public.news (
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
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on news" ON public.news;
CREATE POLICY "Allow all on news" ON public.news FOR ALL USING (true) WITH CHECK (true);
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.news; EXCEPTION WHEN OTHERS THEN NULL; END $$;`
  },
  announcements: {
    menuLabel: 'Pengumuman Pesantren',
    sql: `-- Tabel Pengumuman Resmi
CREATE TABLE IF NOT EXISTS public.announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  priority TEXT DEFAULT 'medium',
  target_role TEXT DEFAULT 'all',
  date TEXT,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on announcements" ON public.announcements;
CREATE POLICY "Allow all on announcements" ON public.announcements FOR ALL USING (true) WITH CHECK (true);
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements; EXCEPTION WHEN OTHERS THEN NULL; END $$;`
  },
  rooms: {
    menuLabel: 'Kamar & Asrama Santri',
    sql: `-- Tabel Kamar & Asrama
CREATE TABLE IF NOT EXISTS public.rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  gender TEXT,
  formal_school TEXT,
  diniyah_school TEXT,
  capacity INTEGER DEFAULT 10,
  ketua_kamar_id TEXT,
  ketua_kamar_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on rooms" ON public.rooms;
CREATE POLICY "Allow all on rooms" ON public.rooms FOR ALL USING (true) WITH CHECK (true);
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms; EXCEPTION WHEN OTHERS THEN NULL; END $$;`
  },
  ppdb: {
    menuLabel: 'Penerimaan Calon Santri Baru (PCSB)',
    sql: `-- Tabel Pendaftaran Santri Baru (PPDB / PCSB)
CREATE TABLE IF NOT EXISTS public.ppdb (
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
  status TEXT DEFAULT 'Pending',
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
ALTER TABLE public.ppdb ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on ppdb" ON public.ppdb;
CREATE POLICY "Allow all on ppdb" ON public.ppdb FOR ALL USING (true) WITH CHECK (true);
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.ppdb; EXCEPTION WHEN OTHERS THEN NULL; END $$;`
  },
  students: {
    menuLabel: 'Database Santri & Induk',
    sql: `-- Tabel Database Induk Santri
CREATE TABLE IF NOT EXISTS public.students (
  id TEXT PRIMARY KEY,
  nis TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  gender TEXT DEFAULT 'Laki-laki',
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
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on students" ON public.students;
CREATE POLICY "Allow all on students" ON public.students FOR ALL USING (true) WITH CHECK (true);
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.students; EXCEPTION WHEN OTHERS THEN NULL; END $$;`
  },
  bills: {
    menuLabel: 'Tagihan & Keuangan Santri',
    sql: `-- Tabel Tagihan & Keuangan
CREATE TABLE IF NOT EXISTS public.bills (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  student_name TEXT,
  nis TEXT,
  title TEXT NOT NULL,
  amount NUMERIC DEFAULT 0,
  due_date TEXT,
  status TEXT DEFAULT 'Belum Lunas',
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
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on bills" ON public.bills;
CREATE POLICY "Allow all on bills" ON public.bills FOR ALL USING (true) WITH CHECK (true);
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.bills; EXCEPTION WHEN OTHERS THEN NULL; END $$;`
  },
  officials: {
    menuLabel: 'Daftar Pengurus & Pejabat',
    sql: `-- Tabel Daftar Pengurus & Pejabat Pondok
CREATE TABLE IF NOT EXISTS public.officials (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  position TEXT NOT NULL,
  category TEXT DEFAULT 'pengurus',
  order_index INTEGER DEFAULT 0,
  signature_url TEXT,
  seal_url TEXT,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.officials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on officials" ON public.officials;
CREATE POLICY "Allow all on officials" ON public.officials FOR ALL USING (true) WITH CHECK (true);
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.officials; EXCEPTION WHEN OTHERS THEN NULL; END $$;`
  },
  settings: {
    menuLabel: 'Pengaturan Portal, TTD & Stempel',
    sql: `-- Tabel Pengaturan Portal, Pengurus, TTD & Stempel
CREATE TABLE IF NOT EXISTS public.settings (
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
  nama_pengasuh TEXT,
  ttd_pengasuh_url TEXT,
  stempel_pengasuh_url TEXT,
  nama_pengurus TEXT,
  ttd_pengurus_url TEXT,
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
  custom_officials JSONB DEFAULT '[]'::jsonb,
  stempel_pesantren_url TEXT,
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
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on settings" ON public.settings;
CREATE POLICY "Allow all on settings" ON public.settings FOR ALL USING (true) WITH CHECK (true);
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.settings; EXCEPTION WHEN OTHERS THEN NULL; END $$;`
  },
  events: {
    menuLabel: 'Kalender & Agenda Acara',
    sql: `-- Tabel Agenda Kegiatan & Kalender
CREATE TABLE IF NOT EXISTS public.events (
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
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on events" ON public.events;
CREATE POLICY "Allow all on events" ON public.events FOR ALL USING (true) WITH CHECK (true);
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.events; EXCEPTION WHEN OTHERS THEN NULL; END $$;`
  },
  master_classes: {
    menuLabel: 'Input Kelas & Sekolah',
    sql: `-- Tabel Master Data Kelas & Sekolah
CREATE TABLE IF NOT EXISTS public.master_classes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'formal' atau 'madrasah'
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.master_classes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access on master_classes" ON public.master_classes;
CREATE POLICY "Allow all access on master_classes" ON public.master_classes FOR ALL USING (true) WITH CHECK (true);
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.master_classes; EXCEPTION WHEN OTHERS THEN NULL; END $$;`
  },
  staff_users: {
    menuLabel: 'Akun Pengurus & Hak Akses',
    sql: `-- Tabel Akun Pengurus & Administrator
CREATE TABLE IF NOT EXISTS public.staff_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'pengurus',
  is_confirmed BOOLEAN DEFAULT false,
  registered_at TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.staff_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on staff_users" ON public.staff_users;
CREATE POLICY "Allow all on staff_users" ON public.staff_users FOR ALL USING (true) WITH CHECK (true);
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_users; EXCEPTION WHEN OTHERS THEN NULL; END $$;`
  },
  staff_configs: {
    menuLabel: 'Konfigurasi Bidang Pengurus',
    sql: `-- Tabel Konfigurasi Bidang Pengurus
CREATE TABLE IF NOT EXISTS public.staff_configs (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL UNIQUE,
  name TEXT,
  signature TEXT,
  seal TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.staff_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on staff_configs" ON public.staff_configs;
CREATE POLICY "Allow all on staff_configs" ON public.staff_configs FOR ALL USING (true) WITH CHECK (true);
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_configs; EXCEPTION WHEN OTHERS THEN NULL; END $$;`
  },
  outbox_logs: {
    menuLabel: 'Log Pengiriman WhatsApp & Outbox',
    sql: `-- Tabel Log Pesan Terkirim WhatsApp
CREATE TABLE IF NOT EXISTS public.outbox_logs (
  id TEXT PRIMARY KEY,
  recipient_name TEXT,
  recipient_phone TEXT,
  message TEXT,
  type TEXT,
  status TEXT DEFAULT 'Sent',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.outbox_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on outbox_logs" ON public.outbox_logs;
CREATE POLICY "Allow all on outbox_logs" ON public.outbox_logs FOR ALL USING (true) WITH CHECK (true);
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.outbox_logs; EXCEPTION WHEN OTHERS THEN NULL; END $$;`
  },
  alumni: {
    menuLabel: 'Data Alumni Pesantren',
    sql: `-- Tabel Data Alumni (Terpisah dari Santri Aktif)
CREATE TABLE IF NOT EXISTS public.alumni (
  id TEXT PRIMARY KEY,
  student_id TEXT,
  nis TEXT NOT NULL,
  full_name TEXT NOT NULL,
  gender TEXT DEFAULT 'Laki-laki',
  class_formal TEXT,
  class_madrasah TEXT,
  tahun_masuk TEXT,
  tahun_keluar TEXT NOT NULL,
  alumni_reason TEXT DEFAULT 'Tamat / Lulus Belajar',
  last_education TEXT,
  current_activity TEXT,
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
ALTER TABLE public.alumni ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on alumni" ON public.alumni;
CREATE POLICY "Allow all on alumni" ON public.alumni FOR ALL USING (true) WITH CHECK (true);
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.alumni; EXCEPTION WHEN OTHERS THEN NULL; END $$;`
  },
  financial_expenses: {
    menuLabel: 'Laporan Keuangan & Pengeluaran',
    sql: `-- Tabel Pengeluaran Kas (Bendahara Putra & Putri)
CREATE TABLE IF NOT EXISTS public.financial_expenses (
  id TEXT PRIMARY KEY,
  bendahara_type TEXT NOT NULL,
  bendahara_name TEXT NOT NULL,
  date TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  description TEXT NOT NULL,
  recipient TEXT,
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.financial_expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on financial_expenses" ON public.financial_expenses;
CREATE POLICY "Allow all on financial_expenses" ON public.financial_expenses FOR ALL USING (true) WITH CHECK (true);
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.financial_expenses; EXCEPTION WHEN OTHERS THEN NULL; END $$;`
  },
  bill_payments: {
    menuLabel: 'Riwayat Pembayaran Online & QRIS',
    sql: `-- Tabel Riwayat Transaksi & Verifikasi Pembayaran Online
CREATE TABLE IF NOT EXISTS public.bill_payments (
  id TEXT PRIMARY KEY,
  bill_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  unique_code INTEGER DEFAULT 0,
  final_amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL,
  payment_proof_url TEXT,
  sender_bank TEXT,
  sender_account TEXT,
  status TEXT DEFAULT 'Menunggu Verifikasi',
  verified_by TEXT,
  verified_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.bill_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on bill_payments" ON public.bill_payments;
CREATE POLICY "Allow all on bill_payments" ON public.bill_payments FOR ALL USING (true) WITH CHECK (true);
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.bill_payments; EXCEPTION WHEN OTHERS THEN NULL; END $$;`
  },
  security_permits: {
    menuLabel: 'Perizinan & Ketertiban Santri',
    sql: `-- Tabel Perizinan Keluar & Kepulangan Santri
CREATE TABLE IF NOT EXISTS public.security_permits (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  permit_type TEXT NOT NULL,
  description TEXT,
  out_date TEXT,
  expected_return_date TEXT,
  actual_return_date TEXT,
  status TEXT DEFAULT 'Menunggu Persetujuan',
  signed_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.security_permits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on security_permits" ON public.security_permits;
CREATE POLICY "Allow all on security_permits" ON public.security_permits FOR ALL USING (true) WITH CHECK (true);
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.security_permits; EXCEPTION WHEN OTHERS THEN NULL; END $$;`
  },
  wa_logs: {
    menuLabel: 'Broadcast WhatsApp & Log Gateway',
    sql: `-- Tabel Log Broadcast WhatsApp
CREATE TABLE IF NOT EXISTS public.wa_logs (
  id TEXT PRIMARY KEY,
  message_type TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  message_body TEXT NOT NULL,
  status TEXT DEFAULT 'Terkirim',
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.wa_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on wa_logs" ON public.wa_logs;
CREATE POLICY "Allow all on wa_logs" ON public.wa_logs FOR ALL USING (true) WITH CHECK (true);
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.wa_logs; EXCEPTION WHEN OTHERS THEN NULL; END $$;`
  }
};

export interface TableSyncStatus {
  missingTables: string[];
  missingMenuLabels: string[];
  generatedSql: string;
}

// Fungsi otomatisasi pengecekan tabel Supabase & pembuatan skrip SQL dinamis
export const checkMissingSupabaseTables = async (): Promise<TableSyncStatus> => {
  if (!isSupabaseConfigured()) {
    return { missingTables: [], missingMenuLabels: [], generatedSql: '' };
  }
  const client = getSupabaseClient();
  if (!client) {
    return { missingTables: [], missingMenuLabels: [], generatedSql: '' };
  }

  const missingTables: string[] = [];
  const missingMenuLabels: string[] = [];
  const sqlList: string[] = [];

  for (const [tableName, meta] of Object.entries(APP_TABLES_SCHEMA_MAP)) {
    try {
      const { error } = await client.from(tableName).select('id').limit(1);
      if (error) {
        const msg = String(error.message || error.details || error.hint || '');
        if (msg.includes('relation') || msg.includes('does not exist') || error.code === '42P01') {
          missingTables.push(tableName);
          missingMenuLabels.push(meta.menuLabel);
          sqlList.push(meta.sql);
        }
      }
    } catch (e) {
      // ignore
    }
  }

  const generatedSql = sqlList.length > 0 
    ? `-- ==============================================================================
-- SKRIP SQL OTOMATIS: TABEL APLIKASI YANG BELUM ADA DI DATABASE SUPABASE
-- Dibuat otomatis untuk melengkapi menu: ${missingMenuLabels.join(', ')}
-- Skrip ini otomatis TERHAPUS / HILANG setelah tabel dibuat & terhubung ke Supabase.
-- Salin dan jalankan skrip ini di: Supabase Dashboard -> SQL Editor -> Run
-- ==============================================================================

${sqlList.join('\n\n')}` 
    : '';

  return { missingTables, missingMenuLabels, generatedSql };
};

let activeRealtimeChannel: any = null;

// Realtime Listener Helper
export function subscribeToSupabaseRealtime(onUpdate: (table?: string) => void) {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    // Clean up any previously active channels to prevent duplicate callback registration
    if (activeRealtimeChannel) {
      try {
        client.removeChannel(activeRealtimeChannel);
      } catch (e) {
        console.warn('Error removing previous realtime channel:', e);
      }
      activeRealtimeChannel = null;
    }

    // Clean up any lingering channels on this client
    try {
      const existingChannels = client.getChannels();
      if (Array.isArray(existingChannels)) {
        for (const ch of existingChannels) {
          client.removeChannel(ch);
        }
      }
    } catch (e) {
      // Ignore cleanup error if not supported
    }

    const channelName = `pesantren-realtime-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const channel = client
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public' },
        (payload: any) => {
          if (payload && payload.table) {
            onUpdate(payload.table);
          } else {
            onUpdate();
          }
        }
      )
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          // Channel is live and actively listening
        }
      });

    activeRealtimeChannel = channel;

    return {
      unsubscribe: () => {
        try {
          if (activeRealtimeChannel) {
            client.removeChannel(activeRealtimeChannel);
            if (activeRealtimeChannel === channel) {
              activeRealtimeChannel = null;
            }
          }
        } catch (err) {
          console.warn('Error unsubscribing channel:', err);
        }
      }
    };
  } catch (err) {
    console.error('Error establishing Supabase Realtime channel:', err);
    return null;
  }
}

// ------------------------------------------------------------------------------
// MUTATION TRACKING (PREVENTING REVERTS / 'MENTAL' OVERWRITES ON BACKGROUND SYNC)
// ------------------------------------------------------------------------------
const localMutationTimestamps: Record<string, number> = {};

export function markLocalDataChanged(key: 'settings' | 'students' | 'bills' | 'rooms' | 'news' | 'announcements' | 'ppdb' | 'events'): void {
  localMutationTimestamps[key] = Date.now();
}

export function isLocalDataRecentlyChanged(
  key: 'settings' | 'students' | 'bills' | 'rooms' | 'news' | 'announcements' | 'ppdb' | 'events',
  thresholdMs = 12000
): boolean {
  const t = localMutationTimestamps[key];
  if (!t) return false;
  return (Date.now() - t) < thresholdMs;
}

// ------------------------------------------------------------------------------
// NEWS SYNC & PUSH
// ------------------------------------------------------------------------------
export async function syncNewsWithSupabase(newsList: News[]): Promise<News[]> {
  const client = getSupabaseClient();
  if (!client) return newsList;
  if (isLocalDataRecentlyChanged('news')) {
    pushAllNewsToSupabase(newsList).catch(e => console.error('Auto-push recent news error:', e));
    return newsList;
  }

  try {
    const { data, error } = await client.from('news').select('*').order('date', { ascending: false });
    if (error) {
      console.warn('Error fetching news from Supabase:', error);
      return newsList;
    }
    if (data && data.length > 0) {
      const remoteMapped: News[] = data.map((item: any) => ({
        id: item.id,
        title: item.title,
        category: item.category as any,
        date: item.date,
        author: item.author,
        excerpt: item.excerpt,
        content: item.content,
        image: item.image_url || ''
      }));

      // Check if local has newly added news not yet in remote
      const missingInRemote = newsList.filter(l => !data.some((r: any) => r.id === l.id));
      if (missingInRemote.length > 0) {
        await pushAllNewsToSupabase(missingInRemote);
        return [...missingInRemote, ...remoteMapped];
      }
      return remoteMapped;
    } else if (newsList.length > 0) {
      await pushAllNewsToSupabase(newsList);
    }
  } catch (err) {
    console.error('Failed to sync news with Supabase:', err);
  }
  return newsList;
}

export async function pushNewsToSupabase(newsItem: News): Promise<void> {
  markLocalDataChanged('news');
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client.from('news').upsert({
      id: newsItem.id,
      title: newsItem.title,
      category: newsItem.category,
      date: newsItem.date,
      author: newsItem.author,
      excerpt: newsItem.excerpt,
      content: newsItem.content,
      image_url: newsItem.image
    });
  } catch (err) {
    console.error('Error saving news to Supabase:', err);
  }
}

export async function pushAllNewsToSupabase(newsList: News[]): Promise<void> {
  markLocalDataChanged('news');
  const client = getSupabaseClient();
  if (!client || newsList.length === 0) return;
  try {
    const payload = newsList.map(n => ({
      id: n.id,
      title: n.title,
      category: n.category,
      date: n.date,
      author: n.author,
      excerpt: n.excerpt,
      content: n.content,
      image_url: n.image
    }));
    await client.from('news').upsert(payload);
  } catch (err) {
    console.error('Error pushing all news to Supabase:', err);
  }
}

export async function deleteNewsFromSupabase(id: string): Promise<void> {
  markLocalDataChanged('news');
  const client = getSupabaseClient();
  if (!client) return;
  try { await client.from('news').delete().eq('id', id); } catch (e) { console.error('Failed to delete news:', e); }
}

// ------------------------------------------------------------------------------
// ANNOUNCEMENTS SYNC & PUSH
// ------------------------------------------------------------------------------
export async function syncAnnouncementsWithSupabase(list: Announcement[]): Promise<Announcement[]> {
  const client = getSupabaseClient();
  if (!client) return list;
  if (isLocalDataRecentlyChanged('announcements')) {
    pushAllAnnouncementsToSupabase(list).catch(e => console.error('Auto-push recent ann error:', e));
    return list;
  }

  try {
    const { data, error } = await client.from('announcements').select('*').order('date', { ascending: false });
    if (error) return list;
    if (data && data.length > 0) {
      const remoteMapped: Announcement[] = data.map((item: any) => ({
        id: item.id,
        title: item.title,
        priority: (item.priority as any) || 'medium',
        targetRole: (item.target_role as any) || 'all',
        date: item.date,
        content: item.content
      }));

      const missingInRemote = list.filter(l => !data.some((r: any) => r.id === l.id));
      if (missingInRemote.length > 0) {
        await pushAllAnnouncementsToSupabase(missingInRemote);
        return [...missingInRemote, ...remoteMapped];
      }
      return remoteMapped;
    } else if (list.length > 0) {
      await pushAllAnnouncementsToSupabase(list);
    }
  } catch (err) {
    console.error('Error syncing announcements with Supabase:', err);
  }
  return list;
}

export async function pushAnnouncementToSupabase(a: Announcement): Promise<void> {
  markLocalDataChanged('announcements');
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client.from('announcements').upsert({
      id: a.id,
      title: a.title,
      priority: a.priority,
      target_role: a.targetRole,
      date: a.date,
      content: a.content
    });
  } catch (err) {
    console.error('Error saving announcement to Supabase:', err);
  }
}

export async function pushAllAnnouncementsToSupabase(list: Announcement[]): Promise<void> {
  const client = getSupabaseClient();
  if (!client || list.length === 0) return;
  try {
    const payload = list.map(a => ({
      id: a.id,
      title: a.title,
      priority: a.priority,
      target_role: a.targetRole,
      date: a.date,
      content: a.content
    }));
    await client.from('announcements').upsert(payload);
  } catch (err) {
    console.error('Error pushing all announcements to Supabase:', err);
  }
}

export async function deleteAnnouncementFromSupabase(id: string): Promise<void> {
  markLocalDataChanged('announcements');
  const client = getSupabaseClient();
  if (!client) return;
  try { await client.from('announcements').delete().eq('id', id); } catch (e) { console.error('Failed to delete announcement:', e); }
}

// ------------------------------------------------------------------------------
// STUDENTS SYNC & PUSH
// ------------------------------------------------------------------------------
export function formatStudentToSupabasePayload(s: Student) {
  return {
    id: s.id,
    nis: s.nis,
    full_name: s.fullName,
    gender: s.gender,
    class_pagi: s.classMadrasah || s.classPagi || null,
    class_sore: s.classFormal || s.classSore || null,
    class_name: s.class || (s.classFormal && s.classMadrasah ? `${s.classFormal} • ${s.classMadrasah}` : s.classMadrasah || s.classFormal || null),
    class_madrasah: s.classMadrasah || s.classPagi || null,
    class_formal: s.classFormal || s.classSore || null,
    akun_madrasah: s.akunMadrasah || null,
    parent_name: s.parentName,
    parent_phone: s.parentPhone,
    guardian_name: s.guardianName || null,
    email: s.email,
    address: s.address,
    status: s.status,
    kamar: s.kamar || null,
    photo_url: s.photoUrl || null,
    birth_place: s.birthPlace || null,
    birth_date: s.birthDate || null,
    kk: s.kk || null,
    nik: s.nik || null,
    father_name: s.fatherName || null,
    mother_name: s.motherName || null,
    blood_type: s.bloodType || null,
    health_history: s.healthHistory || null,
    current_hafalan: s.currentHafalan || '0 Juz',
    tahfidz_logs: s.tahfidzLogs || [],
    security_logs: s.securityLogs || [],
    discipline_logs: s.disciplineLogs || [],
    health_logs: s.healthLogs || [],
    alumni_id: s.alumniId || null,
    tahun_keluar: s.tahunKeluar || null,
    alumni_reason: s.alumniReason || null
  };
}

export async function syncStudentsWithSupabase(studentsList: Student[]): Promise<Student[]> {
  const client = getSupabaseClient();
  if (!client) return studentsList;
  if (isLocalDataRecentlyChanged('students')) {
    pushAllStudentsToSupabase(studentsList).catch(e => console.error('Auto-push recent students error:', e));
    return studentsList;
  }

  try {
    const { data, error } = await client.from('students').select('*');
    if (error) {
      console.warn('Error fetching students from Supabase:', error);
      return studentsList;
    }
    if (data && data.length > 0) {
      const remoteMapped: Student[] = data.map((item: any) => ({
        id: item.id,
        nis: item.nis,
        fullName: item.full_name,
        gender: item.gender as any,
        classPagi: item.class_madrasah || item.class_pagi || '',
        classSore: item.class_formal || item.class_sore || '',
        class: item.class_name || (item.class_formal && item.class_madrasah ? `${item.class_formal} • ${item.class_madrasah}` : item.class_madrasah || item.class_formal || '-'),
        classMadrasah: item.class_madrasah || item.class_pagi || '',
        classFormal: item.class_formal || item.class_sore || '',
        akunMadrasah: item.akun_madrasah,
        parentName: item.parent_name,
        parentPhone: item.parent_phone,
        guardianName: item.guardian_name,
        email: item.email,
        address: item.address,
        status: item.status as any || 'Aktif',
        kamar: item.kamar,
        photoUrl: item.photo_url,
        birthPlace: item.birth_place,
        birthDate: item.birth_date,
        kk: item.kk,
        nik: item.nik,
        fatherName: item.father_name,
        motherName: item.mother_name,
        bloodType: item.blood_type,
        healthHistory: item.health_history,
        currentHafalan: item.current_hafalan || '0 Juz',
        tahfidzLogs: Array.isArray(item.tahfidz_logs) ? item.tahfidz_logs : [],
        securityLogs: Array.isArray(item.security_logs) ? item.security_logs : [],
        disciplineLogs: Array.isArray(item.discipline_logs) ? item.discipline_logs : [],
        healthLogs: Array.isArray(item.health_logs) ? item.health_logs : [],
        alumniId: item.alumni_id,
        tahunKeluar: item.tahun_keluar,
        alumniReason: item.alumni_reason
      }));

      // Check for locally added students not yet in cloud
      const missingInRemote = studentsList.filter(l => !data.some((r: any) => r.id === l.id));
      if (missingInRemote.length > 0) {
        await pushAllStudentsToSupabase(missingInRemote);
        return [...remoteMapped, ...missingInRemote];
      }
      return remoteMapped;
    } else if (studentsList.length > 0) {
      await pushAllStudentsToSupabase(studentsList);
    }
  } catch (err) {
    console.error('Error syncing students with Supabase:', err);
  }
  return studentsList;
}

export async function pushStudentToSupabase(student: Student): Promise<void> {
  markLocalDataChanged('students');
  const client = getSupabaseClient();
  if (!client) return;
  try {
    const payload = formatStudentToSupabasePayload(student);
    await client.from('students').upsert(payload);
  } catch (err) {
    console.error('Failed to save student to Supabase:', err);
  }
}

export async function pushAllStudentsToSupabase(studentsList: Student[]): Promise<void> {
  const client = getSupabaseClient();
  if (!client || studentsList.length === 0) return;
  try {
    const payload = studentsList.map(formatStudentToSupabasePayload);
    await client.from('students').upsert(payload);
  } catch (err) {
    console.error('Error pushing all students to Supabase:', err);
  }
}

export async function deleteStudentFromSupabase(id: string): Promise<void> {
  markLocalDataChanged('students');
  const client = getSupabaseClient();
  if (!client) return;
  try { await client.from('students').delete().eq('id', id); } catch (e) { console.error('Failed to delete student:', e); }
}

// ------------------------------------------------------------------------------
// PPDB SYNC & PUSH
// ------------------------------------------------------------------------------
export function formatPpdbToSupabasePayload(p: PCSBRegistration) {
  return {
    id: p.id,
    full_name: p.fullName,
    gender: p.gender,
    birth_place: p.birthPlace || null,
    birth_date: p.birthDate || null,
    parent_name: p.parentName,
    parent_phone: p.parentPhone,
    address: p.address,
    previous_school: p.previousSchool || '-',
    registration_date: p.registrationDate,
    status: p.status,
    notes: p.notes || null,
    kk: p.kk || null,
    nik: p.nik || null,
    father_name: p.fatherName || null,
    mother_name: p.motherName || null,
    blood_type: p.bloodType || null,
    health_history: p.healthHistory || null,
    payment_type: p.paymentType || null
  };
}

export async function syncPpdbWithSupabase(ppdbList: PCSBRegistration[]): Promise<PCSBRegistration[]> {
  const client = getSupabaseClient();
  if (!client) return ppdbList;
  if (isLocalDataRecentlyChanged('ppdb')) {
    pushAllPpdbToSupabase(ppdbList).catch(e => console.error('Auto-push recent ppdb error:', e));
    return ppdbList;
  }

  try {
    const { data, error } = await client.from('ppdb').select('*').order('registration_date', { ascending: false });
    if (error) {
      console.warn('Error fetching PPDB from Supabase:', error);
      return ppdbList;
    }
    if (data && data.length > 0) {
      const remoteMapped: PCSBRegistration[] = data.map((item: any) => ({
        id: item.id,
        fullName: item.full_name,
        gender: item.gender as any,
        birthPlace: item.birth_place || '',
        birthDate: item.birth_date || '',
        parentName: item.parent_name,
        parentPhone: item.parent_phone,
        address: item.address,
        previousSchool: item.previous_school || '-',
        registrationDate: item.registration_date,
        status: item.status as any || 'Pending',
        notes: item.notes || '',
        kk: item.kk || '',
        nik: item.nik || '',
        fatherName: item.father_name || '',
        motherName: item.mother_name || '',
        bloodType: item.blood_type || '',
        healthHistory: item.health_history || '',
        paymentType: (item.payment_type as any) || 'Cicilan Bulanan'
      }));

      const missingInRemote = ppdbList.filter(l => !data.some((r: any) => r.id === l.id));
      if (missingInRemote.length > 0) {
        await pushAllPpdbToSupabase(missingInRemote);
        return [...missingInRemote, ...remoteMapped];
      }
      return remoteMapped;
    } else if (ppdbList.length > 0) {
      await pushAllPpdbToSupabase(ppdbList);
    }
  } catch (err) {
    console.error('Error syncing PPDB with Supabase:', err);
  }
  return ppdbList;
}

export async function pushPpdbToSupabase(ppdbItem: PCSBRegistration): Promise<{ success: boolean; message?: string }> {
  markLocalDataChanged('ppdb');
  const client = getSupabaseClient();
  if (!client) return { success: false, message: 'Client Supabase belum terhubung' };
  try {
    const payload = formatPpdbToSupabasePayload(ppdbItem);
    const { error } = await client.from('ppdb').upsert(payload);
    if (error) {
      console.error('Failed to push PPDB to Supabase:', error);
      return { success: false, message: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error('Failed to push PPDB to Supabase:', err);
    return { success: false, message: err?.message || 'Gagal menyimpan ke Supabase' };
  }
}

export async function pushAllPpdbToSupabase(ppdbList: PCSBRegistration[]): Promise<void> {
  const client = getSupabaseClient();
  if (!client || ppdbList.length === 0) return;
  try {
    const payload = ppdbList.map(formatPpdbToSupabasePayload);
    await client.from('ppdb').upsert(payload);
  } catch (err) {
    console.error('Error pushing all PPDB to Supabase:', err);
  }
}

export async function deletePpdbFromSupabase(id: string): Promise<void> {
  markLocalDataChanged('ppdb');
  const client = getSupabaseClient();
  if (!client) return;
  try { await client.from('ppdb').delete().eq('id', id); } catch (e) { console.error('Failed to delete ppdb:', e); }
}

// ------------------------------------------------------------------------------
// ROOMS SYNC & PUSH
// ------------------------------------------------------------------------------
export function formatRoomToSupabasePayload(r: Room) {
  return {
    id: r.id,
    name: r.name,
    gender: r.gender,
    formal_school: r.formalSchool,
    diniyah_school: r.diniyahSchool,
    capacity: r.capacity,
    ketua_kamar_id: r.ketuaKamarId || null,
    ketua_kamar_name: r.ketuaKamarName || null
  };
}

export async function syncRoomsWithSupabase(roomsList: Room[]): Promise<Room[]> {
  const client = getSupabaseClient();
  if (!client) return roomsList;
  if (isLocalDataRecentlyChanged('rooms')) {
    pushAllRoomsToSupabase(roomsList).catch(e => console.error('Auto-push recent rooms error:', e));
    return roomsList;
  }

  try {
    const { data, error } = await client.from('rooms').select('*');
    if (error) {
      console.warn('Error fetching rooms from Supabase:', error);
      return roomsList;
    }
    if (data && data.length > 0) {
      const remoteMapped: Room[] = data.map((item: any) => ({
        id: item.id,
        name: item.name,
        gender: item.gender as any,
        formalSchool: item.formal_school || 'SMP Formal',
        diniyahSchool: item.diniyah_school || 'MTs Diniyah',
        capacity: item.capacity || 10,
        ketuaKamarId: item.ketua_kamar_id,
        ketuaKamarName: item.ketua_kamar_name
      }));

      const missingInRemote = roomsList.filter(l => !data.some((r: any) => r.id === l.id));
      if (missingInRemote.length > 0) {
        await pushAllRoomsToSupabase(missingInRemote);
        return [...remoteMapped, ...missingInRemote];
      }
      return remoteMapped;
    } else if (roomsList.length > 0) {
      await pushAllRoomsToSupabase(roomsList);
    }
  } catch (err) {
    console.error('Error syncing rooms with Supabase:', err);
  }
  return roomsList;
}

export async function pushRoomToSupabase(room: Room): Promise<void> {
  markLocalDataChanged('rooms');
  const client = getSupabaseClient();
  if (!client) return;
  try {
    const payload = formatRoomToSupabasePayload(room);
    await client.from('rooms').upsert(payload);
  } catch (err) {
    console.error('Failed to save room to Supabase:', err);
  }
}

export async function pushAllRoomsToSupabase(roomsList: Room[]): Promise<void> {
  const client = getSupabaseClient();
  if (!client || roomsList.length === 0) return;
  try {
    const payload = roomsList.map(formatRoomToSupabasePayload);
    await client.from('rooms').upsert(payload);
  } catch (err) {
    console.error('Error pushing all rooms to Supabase:', err);
  }
}

export async function deleteRoomFromSupabase(id: string): Promise<void> {
  markLocalDataChanged('rooms');
  const client = getSupabaseClient();
  if (!client) return;
  try { await client.from('rooms').delete().eq('id', id); } catch (e) { console.error('Failed to delete room:', e); }
}

// ------------------------------------------------------------------------------
// BILLS SYNC & PUSH
// ------------------------------------------------------------------------------
export function formatBillToSupabasePayload(b: Bill) {
  return {
    id: b.id,
    student_id: b.studentId,
    student_name: b.studentName,
    nis: b.nis || null,
    title: b.title,
    amount: b.amount,
    due_date: b.dueDate,
    status: b.status,
    category: b.category || null,
    payment_date: b.paymentDate || null,
    payment_method: b.paymentMethod || null,
    payment_proof_url: b.paymentProofUrl || null,
    sender_bank: b.senderBank || null,
    sender_account_number: b.senderAccountNumber || null,
    verification_status: b.verificationStatus || null,
    verification_logs: b.verificationLogs || []
  };
}

export async function syncBillsWithSupabase(billsList: Bill[]): Promise<Bill[]> {
  const client = getSupabaseClient();
  if (!client) return billsList;
  if (isLocalDataRecentlyChanged('bills')) {
    pushAllBillsToSupabase(billsList).catch(e => console.error('Auto-push recent bills error:', e));
    return billsList;
  }

  try {
    const { data, error } = await client.from('bills').select('*');
    if (error) {
      console.warn('Error fetching bills from Supabase:', error);
      return billsList;
    }
    if (data && data.length > 0) {
      const remoteMapped: Bill[] = data.map((item: any) => ({
        id: item.id,
        studentId: item.student_id,
        studentName: item.student_name,
        nis: item.nis,
        title: item.title,
        amount: Number(item.amount),
        dueDate: item.due_date,
        status: (item.status as any) || 'Belum Lunas',
        category: item.category,
        paymentDate: item.payment_date,
        paymentMethod: item.payment_method,
        paymentProofUrl: item.payment_proof_url,
        senderBank: item.sender_bank,
        senderAccountNumber: item.sender_account_number,
        verificationStatus: item.verification_status as any,
        verificationLogs: Array.isArray(item.verification_logs) ? item.verification_logs : []
      }));

      let deletedIds: string[] = [];
      try {
        const rawDel = typeof localStorage !== 'undefined' ? localStorage.getItem('pesantren_deleted_bill_ids') : null;
        if (rawDel) deletedIds = JSON.parse(rawDel);
      } catch (e) {}

      const cleanRemote = remoteMapped.filter(b => b && !deletedIds.includes(b.id));
      const missingInRemote = billsList.filter(l => l && !deletedIds.includes(l.id) && !data.some((r: any) => r.id === l.id));
      if (missingInRemote.length > 0) {
        await pushAllBillsToSupabase(missingInRemote);
        return [...cleanRemote, ...missingInRemote];
      }
      return cleanRemote;
    } else if (billsList.length > 0) {
      await pushAllBillsToSupabase(billsList);
    }
  } catch (err) {
    console.error('Error syncing bills with Supabase:', err);
  }
  return billsList;
}

export async function pushBillToSupabase(bill: Bill): Promise<void> {
  markLocalDataChanged('bills');
  const client = getSupabaseClient();
  if (!client) return;
  try {
    const payload = formatBillToSupabasePayload(bill);
    await client.from('bills').upsert(payload);
  } catch (err) {
    console.error('Failed to save bill to Supabase:', err);
  }
}

export async function pushAllBillsToSupabase(billsList: Bill[]): Promise<void> {
  const client = getSupabaseClient();
  if (!client || billsList.length === 0) return;
  try {
    const payload = billsList.map(formatBillToSupabasePayload);
    await client.from('bills').upsert(payload);
  } catch (err) {
    console.error('Error pushing all bills to Supabase:', err);
  }
}

export async function deleteBillFromSupabase(id: string): Promise<void> {
  markLocalDataChanged('bills');
  const client = getSupabaseClient();
  if (!client) return;
  try { await client.from('bills').delete().eq('id', id); } catch (e) { console.error('Failed to delete bill:', e); }
}

// ------------------------------------------------------------------------------
// SETTINGS SYNC & PUSH
// ------------------------------------------------------------------------------
export function formatSettingsToSupabasePayload(s: PortalSettings) {
  return {
    id: 'default_settings',
    school_name: s.schoolName,
    nama_yayasan: s.namaYayasan || null,
    tagline: s.tagline || null,
    about_us: s.aboutUs || null,
    vision: s.vision || null,
    mission: s.mission || [],
    address: s.address || null,
    phone: s.phone || null,
    email: s.email || null,
    logo_url: s.logoUrl || null,
    accent_color: s.accentColor || null,
    stempel_pesantren_url: s.stempelPesantrenUrl || null,
    nama_pengurus: s.namaPengurus || null,
    ttd_pengurus_url: s.ttdPengurusUrl || null,
    nama_pengasuh: s.namaPengasuh || null,
    stempel_pengasuh_url: s.stempelPengasuhUrl || null,
    ttd_pengasuh_url: s.ttdPengasuhUrl || null,
    nama_ketua_pcsb: s.namaKetuaPcsb || null,
    ttd_ketua_pcsb_url: s.ttdKetuaPcsbUrl || null,
    stempel_pcsb_url: s.stempelPcsbUrl || null,
    nama_bendahara: s.namaBendahara || null,
    ttd_bendahara_url: s.ttdBendaharaUrl || null,
    stempel_bendahara_url: s.stempelBendaharaUrl || null,
    nama_keamanan: s.namaKeamanan || null,
    ttd_keamanan_url: s.ttdKeamananUrl || null,
    stempel_keamanan_url: s.stempelKeamananUrl || null,
    nama_ketertiban: s.namaKetertiban || null,
    ttd_ketertiban_url: s.ttdKetertibanUrl || null,
    stempel_ketertiban_url: s.stempelKetertibanUrl || null,
    nama_kesehatan: s.namaKesehatan || null,
    ttd_kesehatan_url: s.ttdKesehatanUrl || null,
    stempel_kesehatan_url: s.stempelKesehatanUrl || null,
    nama_akademik: s.namaAkademik || null,
    ttd_akademik_url: s.ttdAkademikUrl || null,
    stempel_akademik_url: s.stempelAkademikUrl || null,
    custom_officials: s.customOfficials || [],
    rekening_list: s.rekeningList || [],
    available_formal_classes: s.availableFormalClasses || [],
    available_madrasah_classes: s.availableMadrasahClasses || [],
    ppdb_open: s.ppdbOpen,
    ppdb_start_date: s.ppdbStartDate || '',
    ppdb_end_date: s.ppdbEndDate || '',
    pesantren_bank_name: s.pesantrenBankName || null,
    pesantren_bank_account_number: s.pesantrenBankAccountNumber || null,
    pesantren_bank_account_name: s.pesantrenBankAccountName || null,
    pcsb_fee_pendaftaran: s.pcsbFeePendaftaran !== undefined ? s.pcsbFeePendaftaran : 150000,
    pcsb_fee_sarpras: s.pcsbFeeSarpras !== undefined ? s.pcsbFeeSarpras : 1000000,
    pcsb_fee_seragam: s.pcsbFeeSeragam !== undefined ? s.pcsbFeeSeragam : 650000,
    pcsb_fee_kitab: s.pcsbFeeKitab !== undefined ? s.pcsbFeeKitab : 350000,
    pcsb_fee_kesehatan: s.pcsbFeeKesehatan !== undefined ? s.pcsbFeeKesehatan : 100000,
    pcsb_fee_syahriyah: s.pcsbFeeSyahriyah !== undefined ? s.pcsbFeeSyahriyah : 350000,
    pcsb_enable_pendaftaran: s.pcsbEnablePendaftaran !== undefined ? s.pcsbEnablePendaftaran : true,
    pcsb_enable_sarpras: s.pcsbEnableSarpras !== undefined ? s.pcsbEnableSarpras : true,
    pcsb_enable_seragam: s.pcsbEnableSeragam !== undefined ? s.pcsbEnableSeragam : true,
    pcsb_enable_kitab: s.pcsbEnableKitab !== undefined ? s.pcsbEnableKitab : true,
    pcsb_enable_kesehatan: s.pcsbEnableKesehatan !== undefined ? s.pcsbEnableKesehatan : true,
    pcsb_enable_syahriyah: s.pcsbEnableSyahriyah !== undefined ? s.pcsbEnableSyahriyah : true,
  };
}

export async function syncSettingsWithSupabase(currentSettings: PortalSettings): Promise<PortalSettings> {
  let workingSettings = currentSettings;

  // 1. Try to fetch from /api/settings first (server storage across all devices)
  try {
    const res = await fetch('/api/settings');
    if (res.ok) {
      const json = await res.json();
      if (json && json.success && json.settings) {
        workingSettings = { ...workingSettings, ...json.settings };
      }
    }
  } catch (e) {
    // ignore server fetch errors
  }

  const client = getSupabaseClient();
  if (!client) return workingSettings;
  if (isLocalDataRecentlyChanged('settings')) {
    pushSettingsToSupabase(workingSettings).catch(e => console.error('Auto-push recent settings error:', e));
    return workingSettings;
  }

  try {
    const { data, error } = await client.from('settings').select('*').limit(1).maybeSingle();
    if (!error && data) {
      const remoteStartDate = (data.ppdb_start_date !== undefined && data.ppdb_start_date !== null) 
        ? String(data.ppdb_start_date) 
        : workingSettings.ppdbStartDate;
      const remoteEndDate = (data.ppdb_end_date !== undefined && data.ppdb_end_date !== null) 
        ? String(data.ppdb_end_date) 
        : workingSettings.ppdbEndDate;
      const remotePpdbOpen = typeof data.ppdb_open === 'boolean' 
        ? data.ppdb_open 
        : workingSettings.ppdbOpen;

      const merged: PortalSettings = {
        ...workingSettings,
        schoolName: data.school_name || workingSettings.schoolName,
        namaYayasan: data.nama_yayasan || workingSettings.namaYayasan,
        tagline: data.tagline || workingSettings.tagline,
        aboutUs: data.about_us || workingSettings.aboutUs,
        vision: data.vision || workingSettings.vision,
        mission: Array.isArray(data.mission) ? data.mission : workingSettings.mission,
        address: data.address || workingSettings.address,
        phone: data.phone || workingSettings.phone,
        email: data.email || workingSettings.email,
        logoUrl: data.logo_url !== undefined ? data.logo_url : workingSettings.logoUrl,
        accentColor: data.accent_color || workingSettings.accentColor,
        stempelPesantrenUrl: data.stempel_pesantren_url !== undefined ? data.stempel_pesantren_url : workingSettings.stempelPesantrenUrl,
        namaPengurus: data.nama_pengurus || workingSettings.namaPengurus,
        ttdPengurusUrl: data.ttd_pengurus_url !== undefined ? data.ttd_pengurus_url : workingSettings.ttdPengurusUrl,
        namaPengasuh: data.nama_pengasuh || workingSettings.namaPengasuh,
        stempelPengasuhUrl: data.stempel_pengasuh_url !== undefined ? data.stempel_pengasuh_url : workingSettings.stempelPengasuhUrl,
        ttdPengasuhUrl: data.ttd_pengasuh_url !== undefined ? data.ttd_pengasuh_url : workingSettings.ttdPengasuhUrl,
        namaKetuaPcsb: data.nama_ketua_pcsb || workingSettings.namaKetuaPcsb,
        ttdKetuaPcsbUrl: data.ttd_ketua_pcsb_url !== undefined ? data.ttd_ketua_pcsb_url : workingSettings.ttdKetuaPcsbUrl,
        stempelPcsbUrl: data.stempel_pcsb_url !== undefined ? data.stempel_pcsb_url : workingSettings.stempelPcsbUrl,
        namaBendahara: data.nama_bendahara || workingSettings.namaBendahara,
        ttdBendaharaUrl: data.ttd_bendahara_url !== undefined ? data.ttd_bendahara_url : workingSettings.ttdBendaharaUrl,
        stempelBendaharaUrl: data.stempel_bendahara_url !== undefined ? data.stempel_bendahara_url : workingSettings.stempelBendaharaUrl,
        namaKeamanan: data.nama_keamanan || workingSettings.namaKeamanan,
        ttdKeamananUrl: data.ttd_keamanan_url !== undefined ? data.ttd_keamanan_url : workingSettings.ttdKeamananUrl,
        stempelKeamananUrl: data.stempel_keamanan_url !== undefined ? data.stempel_keamanan_url : workingSettings.stempelKeamananUrl,
        namaKetertiban: data.nama_ketertiban || workingSettings.namaKetertiban,
        ttdKetertibanUrl: data.ttd_ketertiban_url !== undefined ? data.ttd_ketertiban_url : workingSettings.ttdKetertibanUrl,
        stempelKetertibanUrl: data.stempel_ketertiban_url !== undefined ? data.stempel_ketertiban_url : workingSettings.stempelKetertibanUrl,
        namaKesehatan: data.nama_kesehatan || workingSettings.namaKesehatan,
        ttdKesehatanUrl: data.ttd_kesehatan_url !== undefined ? data.ttd_kesehatan_url : workingSettings.ttdKesehatanUrl,
        stempelKesehatanUrl: data.stempel_kesehatan_url !== undefined ? data.stempel_kesehatan_url : workingSettings.stempelKesehatanUrl,
        namaAkademik: data.nama_akademik || workingSettings.namaAkademik,
        ttdAkademikUrl: data.ttd_akademik_url !== undefined ? data.ttd_akademik_url : workingSettings.ttdAkademikUrl,
        stempelAkademikUrl: data.stempel_akademik_url !== undefined ? data.stempel_akademik_url : workingSettings.stempelAkademikUrl,
        customOfficials: Array.isArray(data.custom_officials) ? data.custom_officials : (workingSettings.customOfficials || []),
        rekeningList: Array.isArray(data.rekening_list) ? data.rekening_list : workingSettings.rekeningList,
        availableFormalClasses: (Array.isArray(data.available_formal_classes) && data.available_formal_classes.length > 0)
          ? data.available_formal_classes
          : workingSettings.availableFormalClasses,
        availableMadrasahClasses: (Array.isArray(data.available_madrasah_classes) && data.available_madrasah_classes.length > 0)
          ? data.available_madrasah_classes
          : workingSettings.availableMadrasahClasses,
        ppdbOpen: remotePpdbOpen,
        ppdbStartDate: remoteStartDate || '',
        ppdbEndDate: remoteEndDate || '',
        pesantrenBankName: data.pesantren_bank_name || workingSettings.pesantrenBankName,
        pesantrenBankAccountNumber: data.pesantren_bank_account_number || workingSettings.pesantrenBankAccountNumber,
        pesantrenBankAccountName: data.pesantren_bank_account_name || workingSettings.pesantrenBankAccountName,
        pcsbFeePendaftaran: data.pcsb_fee_pendaftaran !== undefined ? Number(data.pcsb_fee_pendaftaran) : workingSettings.pcsbFeePendaftaran,
        pcsbFeeSarpras: data.pcsb_fee_sarpras !== undefined ? Number(data.pcsb_fee_sarpras) : workingSettings.pcsbFeeSarpras,
        pcsbFeeSeragam: data.pcsb_fee_seragam !== undefined ? Number(data.pcsb_fee_seragam) : workingSettings.pcsbFeeSeragam,
        pcsbFeeKitab: data.pcsb_fee_kitab !== undefined ? Number(data.pcsb_fee_kitab) : workingSettings.pcsbFeeKitab,
        pcsbFeeKesehatan: data.pcsb_fee_kesehatan !== undefined ? Number(data.pcsb_fee_kesehatan) : workingSettings.pcsbFeeKesehatan,
        pcsbFeeSyahriyah: data.pcsb_fee_syahriyah !== undefined ? Number(data.pcsb_fee_syahriyah) : workingSettings.pcsbFeeSyahriyah,
        pcsbEnablePendaftaran: data.pcsb_enable_pendaftaran !== undefined ? data.pcsb_enable_pendaftaran : workingSettings.pcsbEnablePendaftaran,
        pcsbEnableSarpras: data.pcsb_enable_sarpras !== undefined ? data.pcsb_enable_sarpras : workingSettings.pcsbEnableSarpras,
        pcsbEnableSeragam: data.pcsb_enable_seragam !== undefined ? data.pcsb_enable_seragam : workingSettings.pcsbEnableSeragam,
        pcsbEnableKitab: data.pcsb_enable_kitab !== undefined ? data.pcsb_enable_kitab : workingSettings.pcsbEnableKitab,
        pcsbEnableKesehatan: data.pcsb_enable_kesehatan !== undefined ? data.pcsb_enable_kesehatan : workingSettings.pcsbEnableKesehatan,
        pcsbEnableSyahriyah: data.pcsb_enable_syahriyah !== undefined ? data.pcsb_enable_syahriyah : workingSettings.pcsbEnableSyahriyah,
      };

      // Also persist to /api/settings
      fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(merged)
      }).catch(() => {});

      return merged;
    }
  } catch (err) {
    console.error('Error syncing settings with Supabase:', err);
  }
  return workingSettings;
}

export async function pushSettingsToSupabase(s: PortalSettings): Promise<void> {
  markLocalDataChanged('settings');
  // Broadcast to server-side endpoint for all devices
  try {
    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(s)
    }).catch(e => console.warn('Failed to push settings to /api/settings:', e));
  } catch (e) {}

  const client = getSupabaseClient();
  if (!client) return;
  try {
    const payload = formatSettingsToSupabasePayload(s);
    const { error } = await client.from('settings').upsert(payload);
    if (error) {
      console.warn('Upsert settings with all columns failed, attempting safe payload:', error);
      await client.from('settings').upsert({
        id: 'default_settings',
        school_name: s.schoolName,
        nama_yayasan: s.namaYayasan,
        tagline: s.tagline,
        about_us: s.aboutUs,
        vision: s.vision,
        mission: s.mission,
        address: s.address,
        phone: s.phone,
        email: s.email,
        logo_url: s.logoUrl,
        accent_color: s.accentColor,
        nama_pengasuh: s.namaPengasuh || null,
        ttd_pengasuh_url: s.ttdPengasuhUrl || null,
        stempel_pengasuh_url: s.stempelPengasuhUrl || null,
        nama_pengurus: s.namaPengurus || null,
        ttd_pengurus_url: s.ttdPengurusUrl || null,
        nama_bendahara: s.namaBendahara || null,
        ttd_bendahara_url: s.ttdBendaharaUrl || null,
        stempel_bendahara_url: s.stempelBendaharaUrl || null,
        nama_ketua_pcsb: s.namaKetuaPcsb || null,
        ttd_ketua_pcsb_url: s.ttdKetuaPcsbUrl || null,
        stempel_pcsb_url: s.stempelPcsbUrl || null,
        nama_keamanan: s.namaKeamanan || null,
        ttd_keamanan_url: s.ttdKeamananUrl || null,
        stempel_keamanan_url: s.stempelKeamananUrl || null,
        nama_ketertiban: s.namaKetertiban || null,
        ttd_ketertiban_url: s.ttdKetertibanUrl || null,
        stempel_ketertiban_url: s.stempelKetertibanUrl || null,
        nama_kesehatan: s.namaKesehatan || null,
        ttd_kesehatan_url: s.ttdKesehatanUrl || null,
        stempel_kesehatan_url: s.stempelKesehatanUrl || null,
        nama_akademik: s.namaAkademik || null,
        ttd_akademik_url: s.ttdAkademikUrl || null,
        stempel_akademik_url: s.stempelAkademikUrl || null,
        stempel_pesantren_url: s.stempelPesantrenUrl || null,
        rekening_list: s.rekeningList,
        ppdb_open: s.ppdbOpen,
        ppdb_start_date: s.ppdbStartDate || '',
        ppdb_end_date: s.ppdbEndDate || ''
      });
    }
  } catch (err) {
    console.error('Failed to save settings to Supabase:', err);
  }
}

// ------------------------------------------------------------------------------
// ACADEMIC EVENTS / AGENDA SYNC & PUSH
// ------------------------------------------------------------------------------
export async function syncEventsWithSupabase(eventsList: AcademicEvent[]): Promise<AcademicEvent[]> {
  const client = getSupabaseClient();
  if (!client) return eventsList;
  if (isLocalDataRecentlyChanged('events')) {
    pushAllEventsToSupabase(eventsList).catch(e => console.error('Auto-push recent events error:', e));
    return eventsList;
  }

  try {
    const { data, error } = await client.from('events').select('*');
    if (error) {
      console.warn('Error fetching events from Supabase:', error);
      return eventsList;
    }
    if (data && data.length > 0) {
      const remoteMapped: AcademicEvent[] = data.map((item: any) => ({
        id: item.id,
        title: item.title,
        description: item.description || '',
        startDate: item.start_date,
        endDate: item.end_date,
        category: (item.category as any) || 'kegiatan',
        location: item.location || '',
        confirmed: Boolean(item.confirmed)
      }));

      const missingInRemote = eventsList.filter(l => !data.some((r: any) => r.id === l.id));
      if (missingInRemote.length > 0) {
        await pushAllEventsToSupabase(missingInRemote);
        return [...remoteMapped, ...missingInRemote];
      }
      return remoteMapped;
    } else if (eventsList.length > 0) {
      await pushAllEventsToSupabase(eventsList);
    }
  } catch (err) {
    console.error('Error syncing events with Supabase:', err);
  }
  return eventsList;
}

export async function pushEventToSupabase(evt: AcademicEvent): Promise<void> {
  markLocalDataChanged('events');
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client.from('events').upsert({
      id: evt.id,
      title: evt.title,
      description: evt.description || null,
      start_date: evt.startDate,
      end_date: evt.endDate,
      category: evt.category || 'kegiatan',
      location: evt.location || null,
      confirmed: Boolean(evt.confirmed)
    });
  } catch (err) {
    console.error('Failed to save event to Supabase:', err);
  }
}

export async function pushAllEventsToSupabase(eventsList: AcademicEvent[]): Promise<void> {
  const client = getSupabaseClient();
  if (!client || eventsList.length === 0) return;
  try {
    const payload = eventsList.map(evt => ({
      id: evt.id,
      title: evt.title,
      description: evt.description || null,
      start_date: evt.startDate,
      end_date: evt.endDate,
      category: evt.category || 'kegiatan',
      location: evt.location || null,
      confirmed: Boolean(evt.confirmed)
    }));
    await client.from('events').upsert(payload);
  } catch (err) {
    console.error('Error pushing all events to Supabase:', err);
  }
}

export async function deleteEventFromSupabase(id: string): Promise<void> {
  markLocalDataChanged('events');
  const client = getSupabaseClient();
  if (!client) return;
  try { await client.from('events').delete().eq('id', id); } catch (e) { console.error('Failed to delete event:', e); }
}

// ------------------------------------------------------------------------------
// STAFF CONFIGS SYNC & PUSH (TTD & STEMPEL BIRO)
// ------------------------------------------------------------------------------
export async function syncStaffConfigsWithSupabase(configs: Record<string, { name: string; signature?: string; seal?: string }>): Promise<Record<string, { name: string; signature?: string; seal?: string }>> {
  const client = getSupabaseClient();
  if (!client) return configs;

  try {
    const { data, error } = await client.from('staff_configs').select('*');
    if (error) return configs;
    if (data && data.length > 0) {
      const merged = { ...configs };
      data.forEach((row: any) => {
        if (row.role) {
          merged[row.role] = {
            name: row.name || merged[row.role]?.name || '',
            signature: row.signature || merged[row.role]?.signature || '',
            seal: row.seal || merged[row.role]?.seal || ''
          };
        }
      });
      return merged;
    }
  } catch (err) {
    console.error('Error syncing staff configs with Supabase:', err);
  }
  return configs;
}

export async function pushStaffConfigToSupabase(role: string, config: { name: string; signature?: string; seal?: string }): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client.from('staff_configs').upsert({
      id: `staff_config_${role}`,
      role: role,
      name: config.name || null,
      signature: config.signature || null,
      seal: config.seal || null
    });
  } catch (err) {
    console.error('Failed to save staff config to Supabase:', err);
  }
}

// ------------------------------------------------------------------------------
// STAFF USERS SYNC & PUSH (AKUN PENGURUS & MENU PERSETUJUAN)
// ------------------------------------------------------------------------------
export async function syncStaffUsersWithSupabase(localStaff: StaffUserItem[]): Promise<StaffUserItem[]> {
  const client = getSupabaseClient();
  if (!client) return localStaff;

  try {
    const { data, error } = await client.from('staff_users').select('*');
    if (error) {
      console.warn('Error fetching staff_users from Supabase:', error);
      return localStaff;
    }
    if (data && Array.isArray(data)) {
      const map = new Map<string, StaffUserItem>();
      localStaff.forEach(u => {
        if (u && u.id) map.set(u.id, u);
      });
      data.forEach((item: any) => {
        const mapped: StaffUserItem = {
          id: item.id,
          fullName: item.full_name || '',
          email: item.email || '',
          role: item.role || 'pengurus',
          isConfirmed: Boolean(item.is_confirmed),
          registeredAt: item.registered_at || undefined,
        };
        const existing = map.get(item.id);
        const emailLower = (mapped.email || '').toLowerCase();
        const customLocalName = typeof window !== 'undefined' 
          ? (localStorage.getItem('staff_custom_name_' + emailLower) || 
             (mapped.role === 'admin' ? (localStorage.getItem('admin_custom_name_' + emailLower) || localStorage.getItem('admin_custom_name_muarifsamsul082@gmail.com') || localStorage.getItem('admin_custom_name_admin@alasyariyah.sch.id')) : null))
          : null;
        const resolvedName = customLocalName || mapped.fullName || existing?.fullName || '';

        if (existing) {
          map.set(item.id, {
            ...existing,
            ...mapped,
            fullName: resolvedName,
            password: existing.password
          });
        } else {
          map.set(item.id, {
            ...mapped,
            fullName: resolvedName
          });
        }
      });
      return Array.from(map.values());
    }
  } catch (err) {
    console.error('Error syncing staff users with Supabase:', err);
  }
  return localStaff;
}

export async function pushStaffUserToSupabase(user: StaffUserItem): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client.from('staff_users').upsert({
      id: user.id,
      full_name: user.fullName,
      email: user.email,
      role: user.role,
      is_confirmed: Boolean(user.isConfirmed),
      registered_at: user.registeredAt || new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString()
    });
  } catch (err) {
    console.error('Failed to save staff user to Supabase:', err);
  }
}

export async function pushAllStaffUsersToSupabase(users: StaffUserItem[]): Promise<void> {
  const client = getSupabaseClient();
  if (!client || users.length === 0) return;
  try {
    const payload = users.map(u => ({
      id: u.id,
      full_name: u.fullName,
      email: u.email,
      role: u.role,
      is_confirmed: Boolean(u.isConfirmed),
      registered_at: u.registeredAt || new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString()
    }));
    await client.from('staff_users').upsert(payload);
  } catch (err) {
    console.error('Failed to push all staff users to Supabase:', err);
  }
}

export async function deleteStaffUserFromSupabase(id: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client.from('staff_users').delete().eq('id', id);
  } catch (err) {
    console.error('Failed to delete staff user from Supabase:', err);
  }
}

// ------------------------------------------------------------------------------
// MASTER CLASSES SYNC & PUSH (KELAS FORMAL & MADRASAH DINIYAH)
// ------------------------------------------------------------------------------
export async function syncMasterClassesWithSupabase(localClasses: {
  formal: string[];
  madrasah: string[];
}): Promise<{ formal: string[]; madrasah: string[] }> {
  const client = getSupabaseClient();
  if (!client) return localClasses;

  // Daftar nama tabel yang mungkin dibuat di Supabase melalui prompt
  const candidateTables = ['master_classes', 'kelas_sekolah', 'master_kelas', 'classes', 'data_kelas'];

  for (const tableName of candidateTables) {
    try {
      const { data, error } = await client.from(tableName).select('*');
      if (!error && Array.isArray(data) && data.length > 0) {
        const formalList: string[] = [];
        const madrasahList: string[] = [];

        for (const row of data) {
          // Ambil nama kelas dari variasi nama kolom
          const rawName = row.name || row.nama || row.nama_kelas || row.class_name || row.title || row.kelas || row.label || '';
          const name = typeof rawName === 'string' ? rawName.trim() : String(rawName || '').trim();
          if (!name) continue;

          // Ambil tipe/kategori kelas
          const rawType = (row.type || row.tipe || row.kategori || row.category || row.jenis || '').toString().toLowerCase();

          const isMadrasah = rawType.includes('madrasah') || 
            rawType.includes('diniyah') || 
            rawType.includes('pagi') || 
            rawType.includes('pesantren') ||
            name.toLowerCase().includes('diniyah') ||
            name.toLowerCase().includes('mts');

          if (isMadrasah) {
            if (!madrasahList.includes(name)) madrasahList.push(name);
          } else {
            if (!formalList.includes(name)) formalList.push(name);
          }
        }

        if (formalList.length > 0 || madrasahList.length > 0) {
          const finalResult = {
            formal: formalList.length > 0 ? formalList : localClasses.formal,
            madrasah: madrasahList.length > 0 ? madrasahList : localClasses.madrasah
          };

          // Backup ke tabel settings agar sinkron di semua perangkat
          try {
            await client.from('settings').update({
              available_formal_classes: finalResult.formal,
              available_madrasah_classes: finalResult.madrasah
            }).eq('id', 'default_settings');
          } catch {}

          return finalResult;
        }
      }
    } catch {
      // Lanjut ke tabel berikutnya jika tabel ini tidak ada
    }
  }

  // 2. Fallback: Ambil dari kolom tabel `settings` (tersedia di default schema)
  try {
    const { data: settingsData, error: sErr } = await client.from('settings').select('available_formal_classes, available_madrasah_classes').eq('id', 'default_settings').single();
    if (!sErr && settingsData) {
      const formal = (Array.isArray(settingsData.available_formal_classes) && settingsData.available_formal_classes.length > 0)
        ? settingsData.available_formal_classes
        : localClasses.formal;
      const madrasah = (Array.isArray(settingsData.available_madrasah_classes) && settingsData.available_madrasah_classes.length > 0)
        ? settingsData.available_madrasah_classes
        : localClasses.madrasah;
      return { formal, madrasah };
    }
  } catch (e) {
    console.warn('Fallback syncMasterClasses from settings failed:', e);
  }

  return localClasses;
}

export async function pushMasterClassesToSupabase(classes: {
  formal: string[];
  madrasah: string[];
}): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  // 1. Simpan ke kolom settings (Garansi 100% tersimpan dan tersinkron di semua perangkat)
  try {
    await client.from('settings').update({
      available_formal_classes: classes.formal,
      available_madrasah_classes: classes.madrasah
    }).eq('id', 'default_settings');
  } catch (err) {
    console.warn('Failed to update settings for master_classes:', err);
  }

  // 2. Simpan juga ke tabel master_classes / kelas_sekolah jika ada
  const rows = [
    ...classes.formal.map((name, idx) => ({
      id: `formal_${idx + 1}_${name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`,
      name: name.trim(),
      type: 'formal'
    })),
    ...classes.madrasah.map((name, idx) => ({
      id: `madrasah_${idx + 1}_${name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`,
      name: name.trim(),
      type: 'madrasah'
    }))
  ];

  if (rows.length > 0) {
    const targetTables = ['master_classes', 'kelas_sekolah'];
    for (const tbl of targetTables) {
      try {
        await client.from(tbl).delete().neq('id', 'dummy_never_match');
        await client.from(tbl).upsert(rows);
      } catch {
        // Abaikan jika tabel tbl belum dibuat di database Supabase pengguna
      }
    }
  }
}

// ------------------------------------------------------------------------------
// MASTER 1-CLICK SYNC ALL LOCAL DATA TO SUPABASE CLOUD
// ------------------------------------------------------------------------------
export async function pushAllLocalDataToSupabase(params: {
  news: News[];
  announcements: Announcement[];
  students: Student[];
  ppdbList: PCSBRegistration[];
  rooms: Room[];
  bills: Bill[];
  settings: PortalSettings;
  events?: AcademicEvent[];
  masterClasses?: { formal: string[]; madrasah: string[] };
}): Promise<{ success: boolean; count: number; message: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, count: 0, message: 'Koneksi Supabase belum dikonfigurasi.' };

  try {
    let totalItems = 0;

    if (params.news && params.news.length > 0) {
      await pushAllNewsToSupabase(params.news);
      totalItems += params.news.length;
    }

    if (params.announcements && params.announcements.length > 0) {
      await pushAllAnnouncementsToSupabase(params.announcements);
      totalItems += params.announcements.length;
    }

    if (params.students && params.students.length > 0) {
      await pushAllStudentsToSupabase(params.students);
      totalItems += params.students.length;
    }

    if (params.ppdbList && params.ppdbList.length > 0) {
      await pushAllPpdbToSupabase(params.ppdbList);
      totalItems += params.ppdbList.length;
    }

    if (params.rooms && params.rooms.length > 0) {
      await pushAllRoomsToSupabase(params.rooms);
      totalItems += params.rooms.length;
    }

    if (params.bills && params.bills.length > 0) {
      await pushAllBillsToSupabase(params.bills);
      totalItems += params.bills.length;
    }

    if (params.settings) {
      await pushSettingsToSupabase(params.settings);
      totalItems += 1;
    }

    if (params.masterClasses && (params.masterClasses.formal.length > 0 || params.masterClasses.madrasah.length > 0)) {
      await pushMasterClassesToSupabase(params.masterClasses);
      totalItems += (params.masterClasses.formal.length + params.masterClasses.madrasah.length);
    }

    if (params.events && params.events.length > 0) {
      await pushAllEventsToSupabase(params.events);
      totalItems += params.events.length;
    }

    return {
      success: true,
      count: totalItems,
      message: `Berhasil mengunggah ${totalItems} data (Berita, Pengumuman, Santri, PPDB, Kamar, Tagihan, Kelas & Sekolah, Agenda & Pengaturan) ke cloud Supabase!`
    };
  } catch (err: any) {
    console.error('Error executing master push to Supabase:', err);
    return {
      success: false,
      count: 0,
      message: `Gagal mengunggah data ke Supabase: ${err?.message || err}`
    };
  }
}

// ------------------------------------------------------------------------------
// FINANCIAL EXPENSES SYNC & PUSH (Bendahara Putra & Putri)
// ------------------------------------------------------------------------------
export function formatExpenseToSupabasePayload(e: FinancialExpense) {
  return {
    id: e.id,
    bendahara_type: e.bendaharaType,
    bendahara_name: e.bendaharaName,
    date: e.date,
    category: e.category,
    amount: Number(e.amount || 0),
    description: e.description,
    recipient: e.recipient || null,
    receipt_url: e.receiptUrl || null
  };
}

export async function syncExpensesWithSupabase(localExpenses: FinancialExpense[]): Promise<FinancialExpense[]> {
  const client = getSupabaseClient();
  if (!client) return localExpenses;

  try {
    const { data, error } = await client.from('financial_expenses').select('*');
    if (error) {
      console.warn('Error fetching financial expenses from Supabase:', error);
      return localExpenses;
    }
    if (data && data.length > 0) {
      const remoteMapped: FinancialExpense[] = data.map((item: any) => ({
        id: item.id,
        bendaharaType: item.bendahara_type as 'putra' | 'putri',
        bendaharaName: item.bendahara_name,
        date: item.date,
        category: item.category,
        amount: Number(item.amount || 0),
        description: item.description,
        recipient: item.recipient || undefined,
        receiptUrl: item.receipt_url || undefined,
        createdAt: item.created_at
      }));

      // Merge remote with local items
      const map = new Map<string, FinancialExpense>();
      localExpenses.forEach(e => { if (e && e.id) map.set(e.id, e); });
      remoteMapped.forEach(e => { if (e && e.id) map.set(e.id, e); });
      return Array.from(map.values());
    } else if (localExpenses.length > 0) {
      // Push local items to Supabase
      const payloads = localExpenses.map(formatExpenseToSupabasePayload);
      await client.from('financial_expenses').upsert(payloads);
      return localExpenses;
    }
  } catch (err) {
    console.error('Failed to sync expenses with Supabase:', err);
  }
  return localExpenses;
}

export async function pushExpenseToSupabase(expense: FinancialExpense): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    const payload = formatExpenseToSupabasePayload(expense);
    await client.from('financial_expenses').upsert(payload);
  } catch (e) {
    console.error('Failed to push expense to Supabase:', e);
  }
}

export async function deleteExpenseFromSupabase(id: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client.from('financial_expenses').delete().eq('id', id);
  } catch (e) {
    console.error('Failed to delete expense from Supabase:', e);
  }
}

// ------------------------------------------------------------------------------
// ALUMNI SYNC & PUSH (Terpisah dari Santri Aktif)
// ------------------------------------------------------------------------------
export function formatAlumniToSupabasePayload(a: any) {
  return {
    id: a.id,
    student_id: a.studentId || null,
    nis: a.nis || '-',
    full_name: a.fullName,
    gender: a.gender || 'Laki-laki',
    class_formal: a.classFormal || a.classSore || null,
    class_madrasah: a.classMadrasah || a.classPagi || null,
    tahun_masuk: a.tahunMasuk || null,
    tahun_keluar: a.tahunKeluar || '2026',
    alumni_reason: a.alumniReason || 'Tamat Belajar',
    last_education: a.lastEducation || null,
    current_activity: a.currentActivity || null,
    campus_or_workplace: a.campusOrWorkplace || null,
    phone: a.phone || a.parentPhone || null,
    email: a.email || null,
    address: a.address || null,
    parent_name: a.parentName || null,
    parent_phone: a.parentPhone || null,
    current_hafalan: a.currentHafalan || '30 Juz',
    photo_url: a.photoUrl || null
  };
}

export async function syncAlumniWithSupabase(localAlumni: any[]): Promise<any[]> {
  const client = getSupabaseClient();
  if (!client) return localAlumni;

  try {
    const { data, error } = await client.from('alumni').select('*');
    if (error) {
      console.warn('Error fetching alumni from Supabase:', error);
      return localAlumni;
    }
    if (data && data.length > 0) {
      const remoteMapped = data.map((item: any) => ({
        id: item.id,
        studentId: item.student_id,
        nis: item.nis,
        fullName: item.full_name,
        gender: item.gender,
        classFormal: item.class_formal,
        classMadrasah: item.class_madrasah,
        tahunMasuk: item.tahun_masuk,
        tahunKeluar: item.tahun_keluar,
        alumniReason: item.alumni_reason,
        lastEducation: item.last_education,
        currentActivity: item.current_activity,
        campusOrWorkplace: item.campus_or_workplace,
        phone: item.phone,
        email: item.email,
        address: item.address,
        parentName: item.parent_name,
        parentPhone: item.parent_phone,
        currentHafalan: item.current_hafalan,
        photoUrl: item.photo_url,
        status: 'Alumni'
      }));

      const map = new Map<string, any>();
      localAlumni.forEach(a => { if (a && a.id) map.set(a.id, a); });
      remoteMapped.forEach((a: any) => { if (a && a.id) map.set(a.id, a); });
      return Array.from(map.values());
    } else if (localAlumni.length > 0) {
      const payloads = localAlumni.map(formatAlumniToSupabasePayload);
      await client.from('alumni').upsert(payloads);
      return localAlumni;
    }
  } catch (err) {
    console.error('Failed to sync alumni with Supabase:', err);
  }
  return localAlumni;
}

export async function pushAlumniToSupabase(alumni: any): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    const payload = formatAlumniToSupabasePayload(alumni);
    await client.from('alumni').upsert(payload);
  } catch (e) {
    console.error('Failed to push alumni to Supabase:', e);
  }
}

export async function deleteAlumniFromSupabase(id: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client.from('alumni').delete().eq('id', id);
  } catch (e) {
    console.error('Failed to delete alumni from Supabase:', e);
  }
}
