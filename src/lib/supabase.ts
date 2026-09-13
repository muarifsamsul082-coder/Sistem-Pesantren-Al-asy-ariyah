import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { News, Announcement, PCSBRegistration, Student, Bill, PortalSettings, Room, AcademicEvent } from '../types';

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
-- SKRIP DATABASE SUPABASE RESMI & SINKRONISASI MULTI-PERANGKAT (RELASIONAL)
-- PONDOK PESANTREN AL-ASY'ARIYAH
-- Jalankan skrip ini di: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. TABEL BERITA & KABAR PESANTREN
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

-- 2. TABEL PENGUMUMAN RESMI
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

-- 3. TABEL ASRAMA / KAMAR SANTRI
CREATE TABLE IF NOT EXISTS rooms (
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

-- 4. TABEL PENDAFTARAN SANTRI BARU (PCSB / PPDB)
CREATE TABLE IF NOT EXISTS ppdb (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  gender TEXT,
  birth_place TEXT,
  birth_date TEXT,
  parent_name TEXT,
  parent_phone TEXT,
  address TEXT,
  previous_school TEXT DEFAULT '-',
  registration_date TEXT,
  status TEXT DEFAULT 'Pending',
  notes TEXT,
  kk TEXT,
  nik TEXT,
  father_name TEXT,
  mother_name TEXT,
  blood_type TEXT,
  health_history TEXT,
  payment_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABEL DATA INDUK SANTRI & LOG BUKU CATATAN (TERHUBUNG KE KAMAR & TAGIHAN)
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  nis TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  gender TEXT,
  class_pagi TEXT DEFAULT '1A MTs Diniyah',
  class_sore TEXT DEFAULT 'VII SMP Formal',
  class_name TEXT,
  class_madrasah TEXT,
  class_formal TEXT,
  akun_madrasah TEXT,
  parent_name TEXT,
  parent_phone TEXT,
  guardian_name TEXT,
  email TEXT,
  address TEXT,
  status TEXT DEFAULT 'Aktif',
  kamar TEXT,
  photo_url TEXT,
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
  security_logs JSONB DEFAULT '[]'::jsonb,
  discipline_logs JSONB DEFAULT '[]'::jsonb,
  health_logs JSONB DEFAULT '[]'::jsonb,
  alumni_id TEXT,
  tahun_keluar TEXT,
  alumni_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABEL TAGIHAN & PEMBAYARAN KEUANGAN SANTRI (RELASIONAL KE SANTRI)
CREATE TABLE IF NOT EXISTS bills (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  student_name TEXT,
  nis TEXT,
  title TEXT NOT NULL,
  amount NUMERIC DEFAULT 0,
  due_date TEXT,
  status TEXT DEFAULT 'Belum Lunas',
  category TEXT,
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

-- 7. TABEL PENGATURAN PORTAL, STEMPEL, TTD & KOP RESMI
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY DEFAULT 'default_settings',
  school_name TEXT,
  nama_yayasan TEXT,
  tagline TEXT,
  about_us TEXT,
  vision TEXT,
  mission JSONB DEFAULT '[]'::jsonb,
  address TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  accent_color TEXT,
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
  ppdb_open BOOLEAN DEFAULT true,
  ppdb_start_date TEXT,
  ppdb_end_date TEXT,
  pesantren_bank_name TEXT,
  pesantren_bank_account_number TEXT,
  pesantren_bank_account_name TEXT,
  pcsb_fee_pendaftaran NUMERIC DEFAULT 150000,
  pcsb_fee_sarpras NUMERIC DEFAULT 1500000,
  pcsb_fee_seragam NUMERIC DEFAULT 750000,
  pcsb_fee_kitab NUMERIC DEFAULT 450000,
  pcsb_fee_kesehatan NUMERIC DEFAULT 350000,
  pcsb_fee_syahriyah NUMERIC DEFAULT 200000,
  pcsb_enable_pendaftaran BOOLEAN DEFAULT true,
  pcsb_enable_sarpras BOOLEAN DEFAULT true,
  pcsb_enable_seragam BOOLEAN DEFAULT true,
  pcsb_enable_kitab BOOLEAN DEFAULT true,
  pcsb_enable_kesehatan BOOLEAN DEFAULT true,
  pcsb_enable_syahriyah BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TABEL AGENDA KEGIATAN & KALENDER AKADEMIK
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

-- 9. TABEL KONFIGURASI BIDANG PENGURUS
CREATE TABLE IF NOT EXISTS staff_configs (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL,
  name TEXT,
  signature TEXT,
  seal TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- PENYESUAIAN STRUKTUR KOLOM & RELAKSASI NOT NULL (MENCEGAH ERROR INSERT)
-- ==============================================================================
ALTER TABLE students ADD COLUMN IF NOT EXISTS kk TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS nik TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS class_pagi TEXT DEFAULT '1A MTs Diniyah';
ALTER TABLE students ADD COLUMN IF NOT EXISTS class_sore TEXT DEFAULT 'VII SMP Formal';
ALTER TABLE students ADD COLUMN IF NOT EXISTS class_name TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS class_madrasah TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS class_formal TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS akun_madrasah TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS guardian_name TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS kamar TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS birth_place TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS birth_date TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS father_name TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS mother_name TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS blood_type TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS health_history TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS current_hafalan TEXT DEFAULT '0 Juz';
ALTER TABLE students ADD COLUMN IF NOT EXISTS tahfidz_logs JSONB DEFAULT '[]'::jsonb;
ALTER TABLE students ADD COLUMN IF NOT EXISTS security_logs JSONB DEFAULT '[]'::jsonb;
ALTER TABLE students ADD COLUMN IF NOT EXISTS discipline_logs JSONB DEFAULT '[]'::jsonb;
ALTER TABLE students ADD COLUMN IF NOT EXISTS health_logs JSONB DEFAULT '[]'::jsonb;
ALTER TABLE students ADD COLUMN IF NOT EXISTS alumni_id TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS tahun_keluar TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS alumni_reason TEXT;

ALTER TABLE ppdb ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE ppdb ADD COLUMN IF NOT EXISTS kk TEXT;
ALTER TABLE ppdb ADD COLUMN IF NOT EXISTS nik TEXT;
ALTER TABLE ppdb ADD COLUMN IF NOT EXISTS father_name TEXT;
ALTER TABLE ppdb ADD COLUMN IF NOT EXISTS mother_name TEXT;
ALTER TABLE ppdb ADD COLUMN IF NOT EXISTS blood_type TEXT;
ALTER TABLE ppdb ADD COLUMN IF NOT EXISTS health_history TEXT;
ALTER TABLE ppdb ADD COLUMN IF NOT EXISTS payment_type TEXT;

ALTER TABLE bills ADD COLUMN IF NOT EXISTS nis TEXT;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS payment_date TEXT;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS sender_bank TEXT;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS sender_account_number TEXT;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS verification_status TEXT;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS verification_logs JSONB DEFAULT '[]'::jsonb;

-- Lepaskan batasan NOT NULL pada kolom sekunder agar input dari website lancar
DO $$
BEGIN
  BEGIN ALTER TABLE ppdb ALTER COLUMN parent_name DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE ppdb ALTER COLUMN parent_phone DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE ppdb ALTER COLUMN address DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE ppdb ALTER COLUMN previous_school DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE ppdb ALTER COLUMN registration_date DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE ppdb ALTER COLUMN gender DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;

  BEGIN ALTER TABLE students ALTER COLUMN class_pagi DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE students ALTER COLUMN class_sore DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE students ALTER COLUMN class_name DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE students ALTER COLUMN parent_name DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE students ALTER COLUMN parent_phone DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE students ALTER COLUMN email DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE students ALTER COLUMN address DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE students ALTER COLUMN gender DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;

  BEGIN ALTER TABLE bills ALTER COLUMN student_name DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE bills ALTER COLUMN due_date DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE bills ALTER COLUMN amount DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;

  BEGIN ALTER TABLE rooms ALTER COLUMN formal_school DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE rooms ALTER COLUMN diniyah_school DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE rooms ALTER COLUMN gender DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

-- ==============================================================================
-- RELASI FOREIGN KEY ANTAR TABEL (INTEGRITAS DATA KEUANGAN & SANTRI)
-- ==============================================================================
DO $$
BEGIN
  -- Hubungkan tabel bills dengan tabel students via student_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_bills_student' AND table_name = 'bills'
  ) THEN
    -- Relasi: Hapus/Update cascade tagihan jika ID santri diupdate
    BEGIN
      ALTER TABLE bills 
        ADD CONSTRAINT fk_bills_student 
        FOREIGN KEY (student_id) REFERENCES students(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE;
    EXCEPTION WHEN OTHERS THEN 
      NULL; -- Jangan gagalkan migrasi jika terdapat data dummy non-matching
    END;
  END IF;
END $$;

-- ==============================================================================
-- INDEXING UNTUK KECEPATAN QUERY MULTI-USER
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_students_nis ON students (nis);
CREATE INDEX IF NOT EXISTS idx_students_gender ON students (gender);
CREATE INDEX IF NOT EXISTS idx_students_status ON students (status);
CREATE INDEX IF NOT EXISTS idx_ppdb_status ON ppdb (status);
CREATE INDEX IF NOT EXISTS idx_ppdb_nik ON ppdb (nik);
CREATE INDEX IF NOT EXISTS idx_bills_student_id ON bills (student_id);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills (status);
CREATE INDEX IF NOT EXISTS idx_bills_nis ON bills (nis);
CREATE INDEX IF NOT EXISTS idx_news_created_at ON news (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rooms_name ON rooms (name);

-- ==============================================================================
-- REPLICA IDENTITY FULL (REALTIME MENYIARKAN DATA UTUH KE SEMUA PERANGKAT)
-- ==============================================================================
ALTER TABLE news REPLICA IDENTITY FULL;
ALTER TABLE announcements REPLICA IDENTITY FULL;
ALTER TABLE ppdb REPLICA IDENTITY FULL;
ALTER TABLE students REPLICA IDENTITY FULL;
ALTER TABLE rooms REPLICA IDENTITY FULL;
ALTER TABLE bills REPLICA IDENTITY FULL;
ALTER TABLE settings REPLICA IDENTITY FULL;
ALTER TABLE events REPLICA IDENTITY FULL;
ALTER TABLE staff_configs REPLICA IDENTITY FULL;

-- ==============================================================================
-- HAK AKSES UNIVERSAL (ANON & AUTHENTICATED DAPAT MEMBACA & MENULIS DENGAN AMAN)
-- ==============================================================================
ALTER TABLE news ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE ppdb ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_configs ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role, postgres;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role, postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role, postgres;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role, postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role, postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role, postgres;

DO $$ 
BEGIN
  -- Hapus policy lama agar tidak terjadi konflik
  DROP POLICY IF EXISTS "Allow all on news" ON news;
  DROP POLICY IF EXISTS "Allow all on announcements" ON announcements;
  DROP POLICY IF EXISTS "Allow all on ppdb" ON ppdb;
  DROP POLICY IF EXISTS "Allow all on students" ON students;
  DROP POLICY IF EXISTS "Allow all on rooms" ON rooms;
  DROP POLICY IF EXISTS "Allow all on bills" ON bills;
  DROP POLICY IF EXISTS "Allow all on settings" ON settings;
  DROP POLICY IF EXISTS "Allow all on events" ON events;
  DROP POLICY IF EXISTS "Allow all on staff_configs" ON staff_configs;
  DROP POLICY IF EXISTS "Public Access" ON ppdb;
  DROP POLICY IF EXISTS "Public Access" ON students;
  DROP POLICY IF EXISTS "Public Access" ON bills;
  DROP POLICY IF EXISTS "Public Access" ON news;
  DROP POLICY IF EXISTS "Public Access" ON announcements;
  DROP POLICY IF EXISTS "Public Access" ON rooms;
  DROP POLICY IF EXISTS "Public Access" ON settings;
  DROP POLICY IF EXISTS "Public Access" ON events;
  DROP POLICY IF EXISTS "Public Access" ON staff_configs;
END $$;

CREATE POLICY "Allow all on news" ON news FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on announcements" ON announcements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on ppdb" ON ppdb FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on students" ON students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on rooms" ON rooms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on bills" ON bills FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on settings" ON settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on events" ON events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on staff_configs" ON staff_configs FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- REALTIME PUBLICATION (NOTIFIKASI OTOMATIS KE HP/LAPTOP LAIN SAAT ADA PENDAFTARAN)
-- ==============================================================================
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE news, announcements, ppdb, students, rooms, bills, settings, events, staff_configs;
  EXCEPTION
    WHEN duplicate_object THEN
      NULL;
    WHEN undefined_object THEN
      CREATE PUBLICATION supabase_realtime FOR TABLE news, announcements, ppdb, students, rooms, bills, settings, events, staff_configs;
    WHEN OTHERS THEN
      NULL;
  END;
END $$;
`;

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
    class_pagi: s.classPagi || '1A MTs Diniyah',
    class_sore: s.classSore || 'VII SMP Formal',
    class_name: s.class || 'VII SMP Formal / 1A MTs',
    class_madrasah: s.classMadrasah || null,
    class_formal: s.classFormal || null,
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
        classPagi: item.class_pagi || '1A MTs Diniyah',
        classSore: item.class_sore || 'VII SMP Formal',
        class: item.class_name || 'VII SMP Formal / 1A MTs',
        classMadrasah: item.class_madrasah,
        classFormal: item.class_formal,
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

      const missingInRemote = billsList.filter(l => !data.some((r: any) => r.id === l.id));
      if (missingInRemote.length > 0) {
        await pushAllBillsToSupabase(missingInRemote);
        return [...remoteMapped, ...missingInRemote];
      }
      return remoteMapped;
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
    rekening_list: s.rekeningList || [],
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
  const client = getSupabaseClient();
  if (!client) return currentSettings;
  if (isLocalDataRecentlyChanged('settings')) {
    pushSettingsToSupabase(currentSettings).catch(e => console.error('Auto-push recent settings error:', e));
    return currentSettings;
  }

  try {
    const { data, error } = await client.from('settings').select('*').eq('id', 'default_settings').single();
    if (!error && data) {
      const remoteStartDate = (data.ppdb_start_date !== undefined && data.ppdb_start_date !== null) 
        ? String(data.ppdb_start_date) 
        : currentSettings.ppdbStartDate;
      const remoteEndDate = (data.ppdb_end_date !== undefined && data.ppdb_end_date !== null) 
        ? String(data.ppdb_end_date) 
        : currentSettings.ppdbEndDate;
      const remotePpdbOpen = typeof data.ppdb_open === 'boolean' 
        ? data.ppdb_open 
        : currentSettings.ppdbOpen;

      return {
        ...currentSettings,
        schoolName: data.school_name || currentSettings.schoolName,
        namaYayasan: data.nama_yayasan || currentSettings.namaYayasan,
        tagline: data.tagline || currentSettings.tagline,
        aboutUs: data.about_us || currentSettings.aboutUs,
        vision: data.vision || currentSettings.vision,
        mission: Array.isArray(data.mission) ? data.mission : currentSettings.mission,
        address: data.address || currentSettings.address,
        phone: data.phone || currentSettings.phone,
        email: data.email || currentSettings.email,
        logoUrl: data.logo_url !== undefined ? data.logo_url : currentSettings.logoUrl,
        accentColor: data.accent_color || currentSettings.accentColor,
        stempelPesantrenUrl: data.stempel_pesantren_url !== undefined ? data.stempel_pesantren_url : currentSettings.stempelPesantrenUrl,
        namaPengurus: data.nama_pengurus || currentSettings.namaPengurus,
        ttdPengurusUrl: data.ttd_pengurus_url !== undefined ? data.ttd_pengurus_url : currentSettings.ttdPengurusUrl,
        namaPengasuh: data.nama_pengasuh || currentSettings.namaPengasuh,
        stempelPengasuhUrl: data.stempel_pengasuh_url !== undefined ? data.stempel_pengasuh_url : currentSettings.stempelPengasuhUrl,
        ttdPengasuhUrl: data.ttd_pengasuh_url !== undefined ? data.ttd_pengasuh_url : currentSettings.ttdPengasuhUrl,
        namaKetuaPcsb: data.nama_ketua_pcsb || currentSettings.namaKetuaPcsb,
        ttdKetuaPcsbUrl: data.ttd_ketua_pcsb_url !== undefined ? data.ttd_ketua_pcsb_url : currentSettings.ttdKetuaPcsbUrl,
        stempelPcsbUrl: data.stempel_pcsb_url !== undefined ? data.stempel_pcsb_url : currentSettings.stempelPcsbUrl,
        namaBendahara: data.nama_bendahara || currentSettings.namaBendahara,
        ttdBendaharaUrl: data.ttd_bendahara_url !== undefined ? data.ttd_bendahara_url : currentSettings.ttdBendaharaUrl,
        stempelBendaharaUrl: data.stempel_bendahara_url !== undefined ? data.stempel_bendahara_url : currentSettings.stempelBendaharaUrl,
        namaKeamanan: data.nama_keamanan || currentSettings.namaKeamanan,
        ttdKeamananUrl: data.ttd_keamanan_url !== undefined ? data.ttd_keamanan_url : currentSettings.ttdKeamananUrl,
        stempelKeamananUrl: data.stempel_keamanan_url !== undefined ? data.stempel_keamanan_url : currentSettings.stempelKeamananUrl,
        namaKetertiban: data.nama_ketertiban || currentSettings.namaKetertiban,
        ttdKetertibanUrl: data.ttd_ketertiban_url !== undefined ? data.ttd_ketertiban_url : currentSettings.ttdKetertibanUrl,
        stempelKetertibanUrl: data.stempel_ketertiban_url !== undefined ? data.stempel_ketertiban_url : currentSettings.stempelKetertibanUrl,
        namaKesehatan: data.nama_kesehatan || currentSettings.namaKesehatan,
        ttdKesehatanUrl: data.ttd_kesehatan_url !== undefined ? data.ttd_kesehatan_url : currentSettings.ttdKesehatanUrl,
        stempelKesehatanUrl: data.stempel_kesehatan_url !== undefined ? data.stempel_kesehatan_url : currentSettings.stempelKesehatanUrl,
        namaAkademik: data.nama_akademik || currentSettings.namaAkademik,
        ttdAkademikUrl: data.ttd_akademik_url !== undefined ? data.ttd_akademik_url : currentSettings.ttdAkademikUrl,
        stempelAkademikUrl: data.stempel_akademik_url !== undefined ? data.stempel_akademik_url : currentSettings.stempelAkademikUrl,
        rekeningList: Array.isArray(data.rekening_list) ? data.rekening_list : currentSettings.rekeningList,
        ppdbOpen: remotePpdbOpen,
        ppdbStartDate: remoteStartDate || '',
        ppdbEndDate: remoteEndDate || '',
        pesantrenBankName: data.pesantren_bank_name || currentSettings.pesantrenBankName,
        pesantrenBankAccountNumber: data.pesantren_bank_account_number || currentSettings.pesantrenBankAccountNumber,
        pesantrenBankAccountName: data.pesantren_bank_account_name || currentSettings.pesantrenBankAccountName,
        pcsbFeePendaftaran: data.pcsb_fee_pendaftaran !== undefined ? Number(data.pcsb_fee_pendaftaran) : currentSettings.pcsbFeePendaftaran,
        pcsbFeeSarpras: data.pcsb_fee_sarpras !== undefined ? Number(data.pcsb_fee_sarpras) : currentSettings.pcsbFeeSarpras,
        pcsbFeeSeragam: data.pcsb_fee_seragam !== undefined ? Number(data.pcsb_fee_seragam) : currentSettings.pcsbFeeSeragam,
        pcsbFeeKitab: data.pcsb_fee_kitab !== undefined ? Number(data.pcsb_fee_kitab) : currentSettings.pcsbFeeKitab,
        pcsbFeeKesehatan: data.pcsb_fee_kesehatan !== undefined ? Number(data.pcsb_fee_kesehatan) : currentSettings.pcsbFeeKesehatan,
        pcsbFeeSyahriyah: data.pcsb_fee_syahriyah !== undefined ? Number(data.pcsb_fee_syahriyah) : currentSettings.pcsbFeeSyahriyah,
        pcsbEnablePendaftaran: data.pcsb_enable_pendaftaran !== undefined ? data.pcsb_enable_pendaftaran : currentSettings.pcsbEnablePendaftaran,
        pcsbEnableSarpras: data.pcsb_enable_sarpras !== undefined ? data.pcsb_enable_sarpras : currentSettings.pcsbEnableSarpras,
        pcsbEnableSeragam: data.pcsb_enable_seragam !== undefined ? data.pcsb_enable_seragam : currentSettings.pcsbEnableSeragam,
        pcsbEnableKitab: data.pcsb_enable_kitab !== undefined ? data.pcsb_enable_kitab : currentSettings.pcsbEnableKitab,
        pcsbEnableKesehatan: data.pcsb_enable_kesehatan !== undefined ? data.pcsb_enable_kesehatan : currentSettings.pcsbEnableKesehatan,
        pcsbEnableSyahriyah: data.pcsb_enable_syahriyah !== undefined ? data.pcsb_enable_syahriyah : currentSettings.pcsbEnableSyahriyah,
      };
    } else {
      await pushSettingsToSupabase(currentSettings);
    }
  } catch (err) {
    console.error('Error syncing settings with Supabase:', err);
  }
  return currentSettings;
}

export async function pushSettingsToSupabase(s: PortalSettings): Promise<void> {
  markLocalDataChanged('settings');
  const client = getSupabaseClient();
  if (!client) return;
  try {
    const payload = formatSettingsToSupabasePayload(s);
    const { error } = await client.from('settings').upsert(payload);
    if (error) {
      console.warn('Upsert settings with all columns failed, attempting core payload:', error);
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
        rekening_list: s.rekeningList,
        ppdb_open: s.ppdbOpen
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

    if (params.events && params.events.length > 0) {
      await pushAllEventsToSupabase(params.events);
      totalItems += params.events.length;
    }

    return {
      success: true,
      count: totalItems,
      message: `Berhasil mengunggah ${totalItems} data (Berita, Pengumuman, Santri, PPDB, Kamar, Tagihan, Agenda & Pengaturan) ke cloud Supabase!`
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
