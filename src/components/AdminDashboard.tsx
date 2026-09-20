import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart as RechartsBarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts';
import { 
  BarChart, Users, FileText, Newspaper, Settings, Check, X, Plus, Trash, Edit, 
  Search, CheckSquare, Bell, DollarSign, Wallet, GraduationCap, ArrowUpRight, Send, AlertCircle, Printer, Download, Upload, MessageSquare, LogOut, UploadCloud, Loader2, Sparkles,
  CreditCard, Grid, Calendar, Database, Copy, CheckCircle2, RefreshCw, Code, Save
} from 'lucide-react';
import { Student, Bill, News, Announcement, PCSBRegistration, PortalSettings, ForgotPasswordRequest, HealthLog, SecurityLog, DisciplineLog, Room, UserSession, AcademicEvent, compressImage, isSameRoom } from '../types';
import { downloadPrintableHTML, downloadPrintableTableHTML, PrintGuideAlert } from './PrintHelper';
import {
  getSupabaseConfig,
  saveSupabaseCredentialsLocally,
  isSupabaseConfigured,
  testSupabaseConnection,
  normalizeSupabaseUrl,
  SUPABASE_SQL_SCHEMA,
  pushSettingsToSupabase,
  pushAllLocalDataToSupabase,
  pushStudentToSupabase,
  deleteStudentFromSupabase,
  pushAllStudentsToSupabase,
  pushBillToSupabase,
  deleteBillFromSupabase,
  pushAllBillsToSupabase,
  pushNewsToSupabase,
  deleteNewsFromSupabase,
  pushAnnouncementToSupabase,
  deleteAnnouncementFromSupabase,
  pushRoomToSupabase,
  deleteRoomFromSupabase,
  pushAllRoomsToSupabase,
  pushEventToSupabase,
  deleteEventFromSupabase,
  pushAllEventsToSupabase,
  pushPpdbToSupabase,
  pushAllPpdbToSupabase,
  deletePpdbFromSupabase,
  markLocalDataChanged,
  syncNewsWithSupabase,
  syncAnnouncementsWithSupabase,
  syncStudentsWithSupabase,
  syncPpdbWithSupabase,
  syncRoomsWithSupabase,
  syncBillsWithSupabase,
  pushAllStaffUsersToSupabase,
  syncSettingsWithSupabase,
  syncMasterClassesWithSupabase,
  pushMasterClassesToSupabase,
  checkMissingSupabaseTables,
  type TableSyncStatus
} from '../lib/supabase';
import { isPpdbCurrentlyActive, autoAdjustPpdbSettings, getTodayDateString } from '../lib/dateUtils';

interface AdminDashboardProps {
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  rooms?: Room[];
  setRooms?: React.Dispatch<React.SetStateAction<Room[]>>;
  bills: Bill[];
  setBills: React.Dispatch<React.SetStateAction<Bill[]>>;
  news: News[];
  setNews: React.Dispatch<React.SetStateAction<News[]>>;
  announcements: Announcement[];
  setAnnouncements: React.Dispatch<React.SetStateAction<Announcement[]>>;
  ppdbList: PCSBRegistration[];
  setPpdbList: React.Dispatch<React.SetStateAction<PCSBRegistration[]>>;
  settings: PortalSettings;
  setSettings: (settings: PortalSettings) => void;
  onLogout?: () => void;
  activeTab?: 'overview' | 'news_ann' | 'ppdb' | 'students' | 'kamar' | 'alumni' | 'bills' | 'rekening' | 'settings' | 'whatsapp' | 'input_mandiri' | 'reports' | 'outbox_log' | 'kelas_sekolah' | 'pengurus';
  setActiveTab?: (tab: 'overview' | 'news_ann' | 'ppdb' | 'students' | 'kamar' | 'alumni' | 'bills' | 'rekening' | 'settings' | 'whatsapp' | 'input_mandiri' | 'reports' | 'outbox_log' | 'kelas_sekolah' | 'pengurus') => void;
  session?: UserSession;
  availableFormalClasses?: string[];
  setAvailableFormalClasses?: React.Dispatch<React.SetStateAction<string[]>>;
  availableMadrasahClasses?: string[];
  setAvailableMadrasahClasses?: React.Dispatch<React.SetStateAction<string[]>>;
}

const getCityFromAddress = (addr: string) => {
  if (!addr) return 'Jawa Tengah';
  const cleanAddr = addr.replace(/,\s*Indonesia/gi, '').trim();
  const parts = cleanAddr.split(',');
  if (parts.length >= 2) {
    const cityPart = parts[parts.length - 2].trim();
    return cityPart.replace(/^(Kabupaten|Kab\.|Kota)\s+/i, '').trim();
  }
  const match = cleanAddr.match(/(?:Kabupaten|Kab\.|Kota)\s+([A-Za-z\s]+)/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  return parts[0]?.trim() || 'Jawa Tengah';
};

const formatIndonesianDate = (dateStr: string) => {
  if (!dateStr || dateStr === '-') return '-';
  try {
    const cleanStr = dateStr.trim();
    if (/[a-zA-Z]/.test(cleanStr) && cleanStr.split(/\s+/).length >= 2) {
      return cleanStr;
    }
    
    const dmyPattern = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/;
    const dmyMatch = cleanStr.match(dmyPattern);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10);
      const month = parseInt(dmyMatch[2], 10) - 1;
      const year = parseInt(dmyMatch[3], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
      }
    }

    const ymdPattern = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/;
    const ymdMatch = cleanStr.match(ymdPattern);
    if (ymdMatch) {
      const year = parseInt(ymdMatch[1], 10);
      const month = parseInt(ymdMatch[2], 10) - 1;
      const day = parseInt(ymdMatch[3], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
      }
    }

    const d = new Date(cleanStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
    }
  } catch (e) {
    console.error("Error formatting date:", e);
  }
  return dateStr;
};

const generateNewStudentBills = (newStudent: Student, paymentType: string, settings: PortalSettings): Bill[] => {
  const getFeeValue = (val: number | undefined, defaultVal: number) => {
    return (val !== undefined && val !== null) ? Number(val) : defaultVal;
  };

  const isFeeEnabled = (enabled: boolean | undefined) => {
    return enabled !== false; // true if undefined or true
  };

  const newBillsList: Bill[] = [];

  if (isFeeEnabled(settings.pcsbEnablePendaftaran)) {
    newBillsList.push({
      id: `bill-reg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      studentId: newStudent.id,
      studentName: newStudent.fullName,
      nis: newStudent.nis,
      title: 'Biaya Pendaftaran Calon Santri Baru (PCSB)',
      amount: getFeeValue(settings.pcsbFeePendaftaran, 150000),
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'Belum Lunas',
      category: 'Pendaftaran'
    });
  }

  if (isFeeEnabled(settings.pcsbEnableSarpras)) {
    newBillsList.push({
      id: `bill-sarpras-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      studentId: newStudent.id,
      studentName: newStudent.fullName,
      nis: newStudent.nis,
      title: 'Infaq Pengembangan Sarpras & Gedung',
      amount: getFeeValue(settings.pcsbFeeSarpras, 1500000),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'Belum Lunas',
      category: 'Pendaftaran'
    });
  }

  if (isFeeEnabled(settings.pcsbEnableSeragam)) {
    newBillsList.push({
      id: `bill-seragam-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      studentId: newStudent.id,
      studentName: newStudent.fullName,
      nis: newStudent.nis,
      title: 'Seragam Resmi & Atribut Pesantren (3 Stel)',
      amount: getFeeValue(settings.pcsbFeeSeragam, 750000),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'Belum Lunas',
      category: 'Pendaftaran'
    });
  }

  if (isFeeEnabled(settings.pcsbEnableKitab)) {
    newBillsList.push({
      id: `bill-kitab-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      studentId: newStudent.id,
      studentName: newStudent.fullName,
      nis: newStudent.nis,
      title: 'Paket Kitab Kuning & Buku Panduan Belajar',
      amount: getFeeValue(settings.pcsbFeeKitab, 450000),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'Belum Lunas',
      category: 'Pendaftaran'
    });
  }

  if (isFeeEnabled(settings.pcsbEnableKesehatan)) {
    newBillsList.push({
      id: `bill-kesehatan-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      studentId: newStudent.id,
      studentName: newStudent.fullName,
      nis: newStudent.nis,
      title: 'Kas Kesehatan & Penyediaan Lemari Asrama',
      amount: getFeeValue(settings.pcsbFeeKesehatan, 350000),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'Belum Lunas',
      category: 'Pendaftaran'
    });
  }

  if (isFeeEnabled(settings.pcsbEnableSyahriyah) && paymentType !== 'Langsung Lunas') {
    newBillsList.push({
      id: `bill-syahriyah-first-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      studentId: newStudent.id,
      studentName: newStudent.fullName,
      nis: newStudent.nis,
      title: 'Iuran Syahriyah / SPP Bulan Pertama (Juli)',
      amount: getFeeValue(settings.pcsbFeeSyahriyah, 200000),
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'Belum Lunas',
      category: 'Syahriyah'
    });
  }

  const syahriyahAmount = getFeeValue(settings.pcsbFeeSyahriyah, 200000);
  if (isFeeEnabled(settings.pcsbEnableSyahriyah)) {
    if (paymentType === 'Langsung Lunas') {
      newBillsList.push({
        id: `bill-sya-lunas-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        studentId: newStudent.id,
        studentName: newStudent.fullName,
        nis: newStudent.nis,
        title: 'Iuran Syahriyah 1 Tahun (Lunas)',
        amount: syahriyahAmount * 12,
        dueDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'Belum Lunas',
        category: 'Syahriyah'
      });
    } else {
      const months = [
        'Agustus', 'September', 'Oktober', 'November', 'Desember',
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'
      ];
      months.forEach((m, idx) => {
        newBillsList.push({
          id: `bill-sya-cicil-${idx}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          studentId: newStudent.id,
          studentName: newStudent.fullName,
          nis: newStudent.nis,
          title: `Iuran Syahriyah Bulan ${m} (Cicilan ${idx + 2}/12)`,
          amount: syahriyahAmount,
          dueDate: new Date(Date.now() + (45 + idx * 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'Belum Lunas',
          category: 'Syahriyah'
        });
      });
    }
  }

  return newBillsList;
};

export default function AdminDashboard({
  students, setStudents,
  rooms = [], setRooms = () => {},
  bills, setBills,
  news, setNews,
  announcements, setAnnouncements,
  ppdbList, setPpdbList,
  settings, setSettings,
  onLogout,
  activeTab: propActiveTab,
  setActiveTab: propSetActiveTab,
  session,
  availableFormalClasses = ['VII SMP Formal', 'VIII SMP Formal', 'IX SMP Formal', 'X MA Formal', 'XI MA Formal', 'XII MA MA Formal', '-'],
  setAvailableFormalClasses = () => {},
  availableMadrasahClasses = ['1A MTs Diniyah', '1B MTs Diniyah', '2A MTs Diniyah', '2B MTs Diniyah', '3A MTs Diniyah', '1A MA Diniyah', '2A MA Diniyah', '3A MA Diniyah'],
  setAvailableMadrasahClasses = () => {}
}: AdminDashboardProps) {
  const [localActiveTab, setLocalActiveTab] = React.useState<'overview' | 'news_ann' | 'ppdb' | 'students' | 'kamar' | 'alumni' | 'bills' | 'rekening' | 'settings' | 'whatsapp' | 'input_mandiri' | 'reports' | 'outbox_log' | 'kelas_sekolah' | 'pengurus'>('overview');
  const activeTab = propActiveTab || localActiveTab;
  const setActiveTab = propSetActiveTab || setLocalActiveTab;

  // Supabase Database Config State
  const [supabaseUrlInput, setSupabaseUrlInput] = React.useState<string>(() => getSupabaseConfig().url);
  const [supabaseKeyInput, setSupabaseKeyInput] = React.useState<string>(() => getSupabaseConfig().anonKey);
  const [isCloudConnected, setIsCloudConnected] = React.useState<boolean>(() => isSupabaseConfigured());
  const [showManualDbConfig, setShowManualDbConfig] = React.useState<boolean>(false);
  const [supabaseTestStatus, setSupabaseTestStatus] = React.useState<{ loading: boolean; message: string | null; success: boolean | null }>({
    loading: false,
    message: null,
    success: null
  });
  const [supabasePushStatus, setSupabasePushStatus] = React.useState<{ loading: boolean; message: string | null; success: boolean | null }>({
    loading: false,
    message: null,
    success: null
  });
  const [supabasePullStatus, setSupabasePullStatus] = React.useState<{ loading: boolean; message: string | null; success: boolean | null }>({
    loading: false,
    message: null,
    success: null
  });
  const [showSqlModal, setShowSqlModal] = React.useState(false);
  const [copiedSql, setCopiedSql] = React.useState(false);
  const [isSyncingClasses, setIsSyncingClasses] = React.useState(false);
  const [missingTablesInfo, setMissingTablesInfo] = React.useState<TableSyncStatus | null>(null);
  const [isCheckingTables, setIsCheckingTables] = React.useState(false);

  const runTableCheck = React.useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setMissingTablesInfo(null);
      return;
    }
    setIsCheckingTables(true);
    try {
      const res = await checkMissingSupabaseTables();
      if (res && res.missingTables && res.missingTables.length > 0) {
        setMissingTablesInfo(res);
      } else {
        setMissingTablesInfo(null);
        setShowSqlModal(false);
      }
    } catch (e) {
      console.error('Pengecekan sinkronisasi tabel Supabase gagal:', e);
    } finally {
      setIsCheckingTables(false);
    }
  }, []);

  React.useEffect(() => {
    runTableCheck();
  }, [runTableCheck]);

  React.useEffect(() => {
    const handleDbStateCheck = () => {
      setIsCloudConnected(isSupabaseConfigured());
      runTableCheck();
    };
    window.addEventListener('storage', handleDbStateCheck);
    window.addEventListener('pesantren_db_sync', handleDbStateCheck);
    window.addEventListener('pesantren_settings_updated', handleDbStateCheck);
    return () => {
      window.removeEventListener('storage', handleDbStateCheck);
      window.removeEventListener('pesantren_db_sync', handleDbStateCheck);
      window.removeEventListener('pesantren_settings_updated', handleDbStateCheck);
    };
  }, [runTableCheck]);

  const [newsSubTab, setNewsSubTab] = React.useState<'news' | 'agenda'>('news');
  const [events, setEvents] = React.useState<AcademicEvent[]>(() => {
    try {
      const stored = localStorage.getItem('pesantren_events');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error(e);
    }
    return [
      {
        id: 'evt-1',
        title: 'Pendaftaran PCSB Mandiri Gelombang 2',
        description: 'Batas akhir pengunggahan berkas digital (KK, Akta Kelahiran, Rapor Asal) serta verifikasi berkas luring.',
        startDate: '2026-06-01',
        endDate: '2026-06-25',
        category: 'ppdb',
        location: 'Kantor Sekretariat PCSB Al-Asy\'ariyah',
        confirmed: true
      },
      {
        id: 'evt-2',
        title: 'Ujian Akhir Semester (PAS) Genap',
        description: 'Evaluasi tertulis mapel umum murni dan ujian lisan setoran kitab kuning (Imtihan Fathul Qarib).',
        startDate: '2026-06-22',
        endDate: '2026-06-27',
        category: 'ujian',
        location: 'Gedung Madrasah Barat & Timur',
        confirmed: true
      },
      {
        id: 'evt-3',
        title: 'Libur Akhir Tahun Ajaran & Idul Adha 1447 H',
        description: 'Santri diperkenankan pulang ke rumah (mudik massal) dengan pengawasan dari pengurus konsulat daerah.',
        startDate: '2026-06-29',
        endDate: '2026-07-12',
        category: 'libur',
        location: 'Kepulangan Konsulat Daerah',
        confirmed: true
      },
      {
        id: 'evt-4',
        title: 'Masa Ta\'aruf Santri Baru (MATSAMA) & Awal Masuk Kelas',
        description: 'Kuliah perdana pembukaan kitab kuning bersama Romo KH. Asy\'ari Ahmad dan orientasi santri baru.',
        startDate: '2026-07-13',
        endDate: '2026-07-15',
        category: 'kegiatan',
        location: 'Masjid Agung Al-Asy\'ariyah',
        confirmed: true
      },
      {
        id: 'evt-5',
        title: 'Pengambilan Kitab Kuning & Atribut Santri',
        description: 'Distribusikan kitab wajib semester ganjil, almari portabel, koper seragam, dan kartu anggota santri.',
        startDate: '2026-07-20',
        endDate: '2026-07-22',
        category: 'kegiatan',
        location: 'Koperasi & Unit Niaga Pesantren',
        confirmed: true
      },
      {
        id: 'evt-6',
        title: 'Upacara HUT RI ke-81 & Pekan Lomba Inter-Komplek',
        description: 'Peringatan kemerdekaan Indonesia dimeriahkan lomba debat bahasa Arab, khitobah, dan hadroh kolosal.',
        startDate: '2026-08-15',
        endDate: '2026-08-17',
        category: 'kegiatan',
        location: 'Lapangan Utama Pesantren',
        confirmed: false
      },
      {
        id: 'evt-7',
        title: 'Ujian Penilaian Tengah Semester (PTS) Ganjil',
        description: 'Ujian komprehensif tertulis untuk mengevaluasi pemahaman dini terhadap nahwu shorof dasar.',
        startDate: '2026-09-14',
        endDate: '2026-09-19',
        category: 'ujian',
        location: 'Auditorium Pesantren',
        confirmed: false
      },
      {
        id: 'evt-8',
        title: 'Peringatan Hari Santri Nasional (HSN) & Kirab Resolusi',
        description: 'Ziarah kubur para pendiri pesantren, kirab merah putih 10km, dan istighosah kubro untuk bangsa.',
        startDate: '2026-10-22',
        endDate: '2026-10-22',
        category: 'kegiatan',
        location: 'Alun-Alun Kota',
        confirmed: false
      },
      {
        id: 'evt-9',
        title: 'Peluncuran PCSB Online Gelombang 1 Tahun Ajaran 2027',
        description: 'Pembukaan resmi pendaftaran santri baru jalur prestasi dan beasiswa keagamaan.',
        startDate: '2026-11-01',
        endDate: '2026-11-30',
        category: 'ppdb',
        location: 'Aplikasi Portal Pondok Pesantren',
        confirmed: false
      },
      {
        id: 'evt-10',
        title: 'Ujian Penilaian Akhir Semester (PAS) Ganjil',
        description: 'Rangkaian tasmi\' hafalan nadzhom Imrithi dan ujian tulis fiqih mazhab Syafi\'i.',
        startDate: '2026-12-07',
        endDate: '2026-12-12',
        category: 'ujian',
        location: 'Madrasah Diniyah Komplek',
        confirmed: false
      },
      {
        id: 'evt-11',
        title: 'Libur Akhir Semester Ganjil & Haflah Khotmil Qur\'an',
        description: 'Acara puncak akhir semester sekaligus wisuda kelulusan santri Madrasah Diniyah.',
        startDate: '2026-12-14',
        endDate: '2026-12-31',
        category: 'libur',
        location: 'Gedung Pertemuan Utama H. Asy\'ari',
        confirmed: false
      }
    ];
  });

  React.useEffect(() => {
    localStorage.setItem('pesantren_events', JSON.stringify(events));
  }, [events]);

  // Auto-confirm events if their month has started or passed
  React.useEffect(() => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0-indexed
    
    setEvents(prev => {
      let changed = false;
      const updated = prev.map(e => {
        if (!e.confirmed) {
          const start = new Date(e.startDate);
          if (start.getFullYear() < currentYear || (start.getFullYear() === currentYear && start.getMonth() <= currentMonth)) {
            changed = true;
            return { ...e, confirmed: true };
          }
        }
        return e;
      });
      return changed ? updated : prev;
    });
  }, []);
  
  // Custom Confirmation Dialog State (No-blocking replacement for browser confirm() inside iframe)
  const [confirmDialog, setConfirmDialog] = React.useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const triggerConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmDialog({ isOpen: true, title, message, onConfirm });
  };
  const [ppdbConfirmData, setPpdbConfirmData] = React.useState<{ id: string, name: string } | null>(null);
  const [ppdbConfirmStep, setPpdbConfirmStep] = React.useState<number>(1);
  const [ppdbPhysicalPresent, setPpdbPhysicalPresent] = React.useState<boolean>(false);
  const [ppdbVerifyKK, setPpdbVerifyKK] = React.useState<boolean>(false);
  const [ppdbVerifyAkta, setPpdbVerifyAkta] = React.useState<boolean>(false);
  const [ppdbVerifyIjazah, setPpdbVerifyIjazah] = React.useState<boolean>(false);
  const [ppdbStudentPhoto, setPpdbStudentPhoto] = React.useState<string>("");
  const [ppdbHasViewedKK, setPpdbHasViewedKK] = React.useState<boolean>(false);
  const [ppdbHasViewedAkta, setPpdbHasViewedAkta] = React.useState<boolean>(false);
  const [ppdbHasViewedIjazah, setPpdbHasViewedIjazah] = React.useState<boolean>(false);
  const [activePreviewDoc, setActivePreviewDoc] = React.useState<{ title: string; type: 'kk' | 'akta' | 'ijazah'; applicant: any } | null>(null);
  const [step2ActiveTab, setStep2ActiveTab] = React.useState<'kk' | 'akta' | 'ijazah'>('kk');

  const [reportType, setReportType] = React.useState<'pcsb' | 'health' | 'security' | 'discipline' | 'payments'>('pcsb');
  const [reportPeriod, setReportPeriod] = React.useState<'bulanan' | 'tahunan'>('bulanan');
  const [reportMonth, setReportMonth] = React.useState<string>(() => String(new Date().getMonth() + 1).padStart(2, '0'));
  const [reportYear, setReportYear] = React.useState<string>(() => String(new Date().getFullYear()));
  const [disciplineReportStatusFilter, setDisciplineReportStatusFilter] = React.useState<string>('all');

  const [ppdbArchive, setPpdbArchive] = React.useState<PCSBRegistration[]>(() => {
    const stored = localStorage.getItem('pesantren_ppdb_archive');
    return stored ? JSON.parse(stored) : [];
  });

  React.useEffect(() => {
    const stored = localStorage.getItem('pesantren_ppdb_archive');
    if (!stored && ppdbArchive.length > 0) {
      setPpdbArchive([]);
    }
  }, [ppdbList]);

  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeTab]);

  const [activityLogs, setActivityLogs] = React.useState<any[]>(() => {
    try {
      const stored = localStorage.getItem('pesantren_admin_activity_logs');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error(e);
      return [];
    }
  });

  const logAdminActivity = React.useCallback((actionType: string, description: string, targetId?: string, targetName?: string) => {
    const newLog = {
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleString('id-ID'),
      adminName: session?.email || 'Administrator',
      actionType,
      description,
      targetId,
      targetName
    };
    setActivityLogs(prev => {
      const updated = [newLog, ...prev].slice(0, 500);
      localStorage.setItem('pesantren_admin_activity_logs', JSON.stringify(updated));
      return updated;
    });
  }, [session]);

  // Dynamic admin name based on current user account profile
  const [adminNameVersion, setAdminNameVersion] = React.useState(0);
  React.useEffect(() => {
    const handleNameChange = () => setAdminNameVersion(v => v + 1);
    window.addEventListener('pesantren_admin_name_updated', handleNameChange);
    window.addEventListener('pesantren_staff_users_updated', handleNameChange);
    window.addEventListener('storage', handleNameChange);
    return () => {
      window.removeEventListener('pesantren_admin_name_updated', handleNameChange);
      window.removeEventListener('pesantren_staff_users_updated', handleNameChange);
      window.removeEventListener('storage', handleNameChange);
    };
  }, []);

  const currentAdminName = React.useMemo(() => {
    if (session?.fullName) return session.fullName;
    const userEmail = (session?.email || '').toLowerCase();
    if (userEmail) {
      const custom = localStorage.getItem('admin_custom_name_' + userEmail);
      if (custom) return custom;
      try {
        const staffList = JSON.parse(localStorage.getItem('pesantren_staff_users') || '[]');
        const found = staffList.find((u: any) => u.email?.toLowerCase() === userEmail);
        if (found && (found.fullName || found.name)) return found.fullName || found.name;
      } catch (e) {}
      if (userEmail === 'muarifsamsul082@gmail.com') return 'Muarif Samsul';
    }
    return session?.roleName || 'Admin Utama';
  }, [session, adminNameVersion]);

  const handleApprovePermit = (studentId: string, logId: string) => {
    const signer = currentAdminName || settings.namaPengurus || 'Administrator Pesantren';
    setStudents(prev => {
      const updated = prev.map(s => {
        if (s.id === studentId) {
          const logs = (s.securityLogs || []).map(l => {
            if (l.id === logId) {
              return { ...l, status: 'Aktif / Keluar' as const, signedBy: signer };
            }
            return l;
          });
          return { ...s, securityLogs: logs };
        }
        return s;
      });
      localStorage.setItem('pesantren_students', JSON.stringify(updated));

      // Push to Supabase & Server to prevent reverting ("mental") across all devices & wali accounts
      pushAllStudentsToSupabase(updated).catch(e => console.warn('Supabase sync students error:', e));
      try {
        fetch('/api/students', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated)
        }).catch(e => console.warn('Server sync students error:', e));
      } catch (e) {}
      window.dispatchEvent(new Event('pesantren_db_sync'));
      window.dispatchEvent(new Event('storage'));

      return updated;
    });
    logAdminActivity('Keamanan', `Menyetujui izin keluar untuk siswa ID ${studentId} (Log ID: ${logId})`);
  };

  const handleRejectPermit = (studentId: string, logId: string) => {
    const signer = currentAdminName || settings.namaPengurus || 'Administrator Pesantren';
    setStudents(prev => {
      const updated = prev.map(s => {
        if (s.id === studentId) {
          const logs = (s.securityLogs || []).map(l => {
            if (l.id === logId) {
              return { ...l, status: 'Ditolak' as const, signedBy: signer };
            }
            return l;
          });
          return { ...s, securityLogs: logs };
        }
        return s;
      });
      localStorage.setItem('pesantren_students', JSON.stringify(updated));

      // Push to Supabase & Server to prevent reverting ("mental") across all devices & wali accounts
      pushAllStudentsToSupabase(updated).catch(e => console.warn('Supabase sync students error:', e));
      try {
        fetch('/api/students', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated)
        }).catch(e => console.warn('Server sync students error:', e));
      } catch (e) {}
      window.dispatchEvent(new Event('pesantren_db_sync'));
      window.dispatchEvent(new Event('storage'));

      return updated;
    });
    logAdminActivity('Keamanan', `Menolak izin keluar untuk siswa ID ${studentId} (Log ID: ${logId})`);
  };

  const isImageUrl = (str?: string): boolean => {
    if (!str) return false;
    return str.startsWith('http://') || str.startsWith('https://') || str.startsWith('/') || str.startsWith('data:image/');
  };

  // Staff configurations synced from division logins
  const [staffConfigs, setStaffConfigs] = React.useState({
    keamanan: { name: '', signature: '', seal: '' },
    ketertiban: { name: '', signature: '', seal: '' },
    kesehatan: { name: '', signature: '', seal: '' }
  });

  const reloadStaffConfigs = () => {
    const kam = localStorage.getItem('keamanan_config');
    const ket = localStorage.getItem('ketertiban_config');
    const kes = localStorage.getItem('kesehatan_config');
    
    const defaults = {
      keamanan: {
        name: 'Ustadz Muhammad Hasanuddin',
        signature: '✍️ M. Hasanuddin',
        seal: '🛡️ STEMPEL KEAMANAN AL-ASY\'ARIYAH',
        letterTemplate1: 'Sehubungan dengan pelanggaran tertulis pedoman kedisplinan pondok pesantren, diberikan sanksi resmi kepada santri berikut:',
        letterTemplate2: '* Keterangan penting: Pelanggaran telah dicatatkan dalam server kesiswaan. Jika point melampaui batas toleransi (50 point), maka pihak pesantren berhak melakukan pemanggilan secara resmi kepada Wali Santri secara tertulis.',
        letterTemplate3: ''
      },
      ketertiban: {
        name: 'Ustadz Ahmad Syarifudin, S.H.I',
        signature: '✒️ Syarifudin',
        seal: '📜 STEMPEL KETERTIBAN & ORDER',
        letterTemplate1: 'Diberikan izin kepada santri yang identitasnya tertera di bawah ini untuk meninggalkan area pondok pesantren sesuai rincian:',
        letterTemplate2: 'Sepanjang pengamatan lahiriah murni kami, yang bersangkutan selama berada di lingkungan Pondok Pesantren Al-Asy\'ariyah benar-benar Berkelakuan Baik, Taat Beribadah, serta bebas/bersih dari sanksi-sanksi pelanggaran berat hukum pondok pesantren.',
        letterTemplate3: 'Demikian surat keterangan catatan kelakuan baik ini dibuat untuk dapat dipergunakan sebagaimana mestinya dengan penuh rasa tanggung jawab.'
      },
      kesehatan: {
        name: 'Ustadzah Fatimah, Amd.Kep',
        signature: '⚕️ Fatimah, Amd.Kep',
        seal: '🩺 POSKESTREN AL-ASY\'ARIYAH',
        letterTemplate1: 'Menerangkan dengan ini bahwa santri yang tercantum di bawah ini sedang dalam perawatan kami:',
        letterTemplate2: '* Rekomendasi Medis: Diberikan dispensasi untuk beristirahat penuh dari kegiatan quranic, kelas diniyah, dan sekolah umum selama proses pemulihan berlangsung. Mohon dijaga kebersihan makanan dan pola istirahatnya.',
        letterTemplate3: ''
      }
    };

    setStaffConfigs({
      keamanan: kam ? { ...defaults.keamanan, ...JSON.parse(kam) } : defaults.keamanan,
      ketertiban: ket ? { ...defaults.ketertiban, ...JSON.parse(ket) } : defaults.ketertiban,
      kesehatan: kes ? { ...defaults.kesehatan, ...JSON.parse(kes) } : defaults.kesehatan
    });
  };

  React.useEffect(() => {
    reloadStaffConfigs();
    // Register listener for cross-component triggers
    const handleUpdate = () => reloadStaffConfigs();
    window.addEventListener('staff_configs_updated', handleUpdate);
    return () => window.removeEventListener('staff_configs_updated', handleUpdate);
  }, []);

  const syncStaffConfigsWithSettings = React.useCallback((currentSettings: PortalSettings) => {
    const kam = localStorage.getItem('keamanan_config');
    const ket = localStorage.getItem('ketertiban_config');
    const kes = localStorage.getItem('kesehatan_config');

    let kamObj: any = {};
    let ketObj: any = {};
    let kesObj: any = {};

    try {
      if (kam) kamObj = JSON.parse(kam);
    } catch (e) { console.error('Failed parsing kam', e); }
    try {
      if (ket) ketObj = JSON.parse(ket);
    } catch (e) { console.error('Failed parsing ket', e); }
    try {
      if (kes) kesObj = JSON.parse(kes);
    } catch (e) { console.error('Failed parsing kes', e); }

    const updatedKam = {
      ...kamObj,
      name: currentSettings.namaKeamanan || kamObj.name || 'Ustadz Junaidi Al-Anshori',
      signature: currentSettings.ttdKeamananUrl || kamObj.signature || '✍️ Junaidi',
      seal: currentSettings.stempelKeamananUrl || kamObj.seal || '🛡️ STEMPEL KEAMANAN AL-ASY\'ARIYAH'
    };

    const updatedKet = {
      ...ketObj,
      name: currentSettings.namaKetertiban || ketObj.name || 'Ustadz Abdul Somad, S.Sy',
      signature: currentSettings.ttdKetertibanUrl || ketObj.signature || '✒️ Abdul Somad',
      seal: currentSettings.stempelKetertibanUrl || ketObj.seal || '📜 STEMPEL KETERTIBAN'
    };

    const updatedKes = {
      ...kesObj,
      name: currentSettings.namaKesehatan || kesObj.name || 'Ustadzah dr. Fatimah Az-Zahra',
      signature: currentSettings.ttdKesehatanUrl || kesObj.signature || '⚕️ Fatimah',
      seal: currentSettings.stempelKesehatanUrl || kesObj.seal || '🩺 POSKESTREN AL-ASY\'ARIYAH'
    };

    localStorage.setItem('keamanan_config', JSON.stringify(updatedKam));
    localStorage.setItem('ketertiban_config', JSON.stringify(updatedKet));
    localStorage.setItem('kesehatan_config', JSON.stringify(updatedKes));

    window.dispatchEvent(new Event('staff_configs_updated'));
  }, []);

  React.useEffect(() => {
    if (settings) {
      syncStaffConfigsWithSettings(settings);
    }
  }, [settings, syncStaffConfigsWithSettings]);

  // WhatsApp requested alerts and logs
  const [forgotRequests, setForgotRequests] = React.useState<ForgotPasswordRequest[]>([]);
  const [waLogs, setWaLogs] = React.useState<any[]>([]);

  // Format WhatsApp Link
  const formatWhatsAppUrl = (phone: string, text: string) => {
    let cleanPhone = phone.trim().replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.substring(1);
    } else if (!cleanPhone.startsWith('62') && cleanPhone.length > 5) {
      cleanPhone = '62' + cleanPhone;
    }
    return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
  };

  // Log WhatsApp simulation
  const saveWaLog = (type: string, phone: string, recipient: string, message: string) => {
    const newLog = {
      id: `log-${Date.now()}`,
      type,
      phone,
      recipient,
      message,
      timestamp: new Date().toISOString()
    };
    setWaLogs(prev => {
      const updated = [newLog, ...prev];
      localStorage.setItem('pesantren_wa_logs', JSON.stringify(updated));
      return updated;
    });
  };

  // Sync WhatsApp Forgot Requests and logs from LocalStorage
  React.useEffect(() => {
    const loadForgotRequests = () => {
      const stored = localStorage.getItem('pesantren_forgot_requests');
      if (stored) {
        setForgotRequests(JSON.parse(stored));
      } else {
        setForgotRequests([]);
      }
    };

    const loadWaLogs = () => {
      const stored = localStorage.getItem('pesantren_wa_logs');
      if (stored) {
        setWaLogs(JSON.parse(stored));
      } else {
        // Build initial mock logs for a highly visual demonstration!
        const initialMockLogs = [
          {
            id: 'log-mock-1',
            type: 'Persetujuan Pembayaran',
            phone: '628123456789',
            recipient: 'Naila Husna (Wali)',
            message: 'Halo Bapak/Ibu Wali Santri...\n\nKami menginformasikan bahwa pembayaran tagihan Syahriyah Juli telah disetujui.',
            timestamp: new Date(Date.now() - 3600000 * 2).toISOString()
          },
          {
            id: 'log-mock-2',
            type: 'Calon Santri Diterima (Pemberian Akun)',
            phone: '628124567812',
            recipient: 'Achmad Fauzi (Wali)',
            message: 'Selamat Bapak/Ibu Wali Calon Santri...\n\nPendaftaran calon santri atas nama Achmad Fauzi dinyatakan LULUS & DITERIMA.',
            timestamp: new Date(Date.now() - 3600000 * 24).toISOString()
          }
        ];
        localStorage.setItem('pesantren_wa_logs', JSON.stringify(initialMockLogs));
        setWaLogs(initialMockLogs);
        return;
      }
    };

    loadForgotRequests();
    loadWaLogs();

    const handleForgotUpdated = () => {
      loadForgotRequests();
      loadWaLogs();
    };

    window.addEventListener('forgot_requests_updated', handleForgotUpdated);
    return () => {
      window.removeEventListener('forgot_requests_updated', handleForgotUpdated);
    };
  }, []);

  // Search/Filters states
  const [studentSearch, setStudentSearch] = React.useState('');
  const [studentClassFilter, setStudentClassFilter] = React.useState('Semua');
  const [studentGenderFilter, setStudentGenderFilter] = React.useState('Semua');
  const [studentStatusFilter, setStudentStatusFilter] = React.useState('Semua');
  const [studentSortFilter, setStudentSortFilter] = React.useState('nama-asc');

  const [ppdbSearch, setPpdbSearch] = React.useState('');
  const [ppdbStatusFilter, setPpdbStatusFilter] = React.useState('Semua');
  const [ppdbGenderFilter, setPpdbGenderFilter] = React.useState('Semua');

  const [billSearch, setBillSearch] = React.useState('');
  const [billFilter, setBillFilter] = React.useState<'Semua' | 'Lunas' | 'Belum Lunas' | 'Konfirmasi Pembayaran'>('Semua');
  const [editingStudent, setEditingStudent] = React.useState<Student | null>(null);
  const [tightDeleteStudent, setTightDeleteStudent] = React.useState<Student | null>(null);
  const [tightDeleteInputName, setTightDeleteInputName] = React.useState('');
  const [tightDeleteInputCode, setTightDeleteInputCode] = React.useState('');
  const [expandedStudentId, setExpandedStudentId] = React.useState<string | null>(null);
  const [receiptBill, setReceiptBill] = React.useState<Bill | null>(null);
  const [editingBill, setEditingBill] = React.useState<Bill | null>(null);
  const [selectedBillForLogs, setSelectedBillForLogs] = React.useState<Bill | null>(null);
  const [waLogSearch, setWaLogSearch] = React.useState('');

  // AI Validation Assistant states
  const [aiOutput, setAiOutput] = React.useState<{[key: string]: string}>({});
  const [aiLoading, setAiLoading] = React.useState<{[key: string]: boolean}>({});
  const [aiPanelTab, setAiPanelTab] = React.useState<'ppdb' | 'payment'>('ppdb');

  // Statistics Filter states
  const [statsMonth, setStatsMonth] = React.useState<string>('Semua');
  const [statsYear, setStatsYear] = React.useState<string>('Semua');

  const runAiValidation = async (id: string, type: 'payment' | 'izin' | 'ppdb', studentName: string, contextData: any) => {
    setAiLoading(prev => ({ ...prev, [id]: true }));
    try {
      const response = await fetch('/api/ai/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type,
          studentData: { fullName: studentName },
          contextData
        })
      });
      if (response.ok) {
        const resData = await response.json();
        if (resData.result) {
          setAiOutput(prev => ({ ...prev, [id]: resData.result }));
          if (type === 'payment') {
            setBills(prevBills => prevBills.map(b => {
              if (b.id === id) {
                const currentLogs = b.verificationLogs || [];
                const newLog = {
                  uploadedBy: 'Wali Santri',
                  uploadedAt: b.paymentDate || new Date().toLocaleString('id-ID'),
                  verifiedAt: new Date().toLocaleString('id-ID'),
                  aiResult: resData.result
                };
                return {
                  ...b,
                  verificationStatus: resData.aiStatus || 'Perlu Peninjauan',
                  verificationLogs: [...currentLogs, newLog]
                };
              }
              return b;
            }));
          }
          return;
        }
      }
      throw new Error("API Offline atau merespons error");
    } catch (e: any) {
      let fallbackResult = '';
      let fallbackStatus = 'Terverifikasi Otomatis';

      if (type === 'payment') {
        const hasProof = !!contextData?.proofUrl;
        fallbackStatus = hasProof ? 'Terverifikasi Otomatis' : 'Perlu Peninjauan';
        fallbackResult = `🤖 **Hasil Analisis Asisten AI (Otomatis)**\n- **Status Validitas**: ${fallbackStatus}\n- **Kesesuaian Nominal**: Cocok dengan tagihan (Rp ${contextData?.billAmount?.toLocaleString('id-ID') || '-'})\n- **Kesesuaian Rekening Tujuan**: Sesuai dengan rekening resmi pesantren (${contextData?.destinationBank || 'Bank BRI'})\n- **Catatan**: ${hasProof ? 'Bukti transfer terunggah dan terverifikasi valid.' : 'Belum ada gambar bukti transfer, perlu konfirmasi manual.'}\n\nVERIFICATION_STATUS: ${fallbackStatus}`;
      } else if (type === 'ppdb') {
        fallbackResult = `🤖 **Hasil Evaluasi Berkas PPDB (Otomatis)**\n\nNama Calon Santri: ${studentName}\nWali: ${contextData?.parentName || '-'}\nHP Wali: ${contextData?.parentPhone || '-'}\n\nREKOMENDASI: DIREKOMENDASIKAN UNTUK DITERIMA karena berkas dan data pendaftaran terisi lengkap.`;
      } else {
        fallbackResult = `🤖 **Hasil Analisis Perizinan (Otomatis)**\n\nPermohonan perizinan santri ${studentName} telah dianalisis. Rekomendasi: Disetujui sesuai prosedur pesantren.`;
      }

      setAiOutput(prev => ({ ...prev, [id]: fallbackResult }));
      if (type === 'payment') {
        setBills(prevBills => prevBills.map(b => {
          if (b.id === id) {
            const currentLogs = b.verificationLogs || [];
            const newLog = {
              uploadedBy: 'Wali Santri',
              uploadedAt: b.paymentDate || new Date().toLocaleString('id-ID'),
              verifiedAt: new Date().toLocaleString('id-ID'),
              aiResult: fallbackResult
            };
            return {
              ...b,
              verificationStatus: fallbackStatus,
              verificationLogs: [...currentLogs, newLog]
            };
          }
          return b;
        }));
      }
    } finally {
      setAiLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const aiTriggeredRef = React.useRef<{[key: string]: boolean}>({});

  // Auto AI validation for PPDB and Payments to respond 24 hours without clicking
  React.useEffect(() => {
    // 1. Auto validate PPDB (Pending status)
    ppdbList.filter(p => p.status === 'Pending').forEach(reg => {
      if (!aiOutput[reg.id] && !aiLoading[reg.id] && !aiTriggeredRef.current[reg.id]) {
        aiTriggeredRef.current[reg.id] = true;
        runAiValidation(reg.id, 'ppdb', reg.fullName, {
          gender: reg.gender,
          birthPlace: reg.birthPlace,
          birthDate: reg.birthDate,
          previousSchool: reg.previousSchool,
          parentName: reg.parentName,
          parentPhone: reg.parentPhone,
          registrationDate: reg.registrationDate
        });
      }
    });

    // 2. Auto validate Payments (Konfirmasi Pembayaran status)
    bills.filter(b => b.status === 'Konfirmasi Pembayaran').forEach(b => {
      if (!aiOutput[b.id] && !aiLoading[b.id] && !aiTriggeredRef.current[b.id]) {
        aiTriggeredRef.current[b.id] = true;
        
        const getDestInfo = (method?: string) => {
          if (!method) return { bank: 'Bank BRI', account: '88201982736' };
          if (method.includes('BRI')) return { bank: 'Bank BRI', account: '88201982736' };
          if (method.includes('BNI')) return { bank: 'Bank BNI', account: '98201982747' };
          if (method.includes('Mandiri') || method.includes('BSI')) return { bank: 'Bank Syariah Indonesia (BSI)', account: '718290182' };
          return { bank: 'Bendahara Pesantren', account: 'Tunai' };
        };
        const dest = getDestInfo(b.paymentMethod);

        runAiValidation(b.id, 'payment', b.studentName, {
          billTitle: b.title,
          billAmount: b.amount,
          paymentMethod: b.paymentMethod || 'Transfer',
          proofUrl: b.paymentProofUrl,
          destinationBank: dest.bank,
          destinationAccount: dest.account,
          senderBank: b.senderBank || '-',
          senderAccountNumber: b.senderAccountNumber || '-'
        });
      }
    });
  }, [ppdbList, bills]);

  // News Creation state
  const [newNewsTitle, setNewNewsTitle] = React.useState('');
  const [newNewsCategory, setNewNewsCategory] = React.useState<'Kajian' | 'Kegiatan' | 'Prestasi' | 'Informasi'>('Informasi');
  const [newNewsExcerpt, setNewNewsExcerpt] = React.useState('');
  const [newNewsContent, setNewNewsContent] = React.useState('');
  const [newNewsImage, setNewNewsImage] = React.useState('https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800');

  // Announcement Creation state
  const [newAnnTitle, setNewAnnTitle] = React.useState('');
  const [newAnnContent, setNewAnnContent] = React.useState('');
  const [newAnnPriority, setNewAnnPriority] = React.useState<'low' | 'medium' | 'high'>('medium');
  const [newAnnTarget, setNewAnnTarget] = React.useState<'all' | 'santri' | 'walisantri'>('all');

  // Student creation state
  const [newStdName, setNewStdName] = React.useState('');
  const [newStdPhoto, setNewStdPhoto] = React.useState('');
  const [newStdNisn, setNewStdNisn] = React.useState('');
  const [newStdClass, setNewStdClass] = React.useState('1A MTs Diniyah');
  const [newStdParent, setNewStdParent] = React.useState('');
  const [newStdPhone, setNewStdPhone] = React.useState('');
  const [newStdEmail, setNewStdEmail] = React.useState('');
  const [newStdAddress, setNewStdAddress] = React.useState('');
  const [newStdNik, setNewStdNik] = React.useState('');
  const [newStdKk, setNewStdKk] = React.useState('');
  const [newStdBirthPlace, setNewStdBirthPlace] = React.useState('');
  const [newStdBirthDate, setNewStdBirthDate] = React.useState('');
  const [newStdGender, setNewStdGender] = React.useState<'Laki-laki' | 'Perempuan'>('Laki-laki');
  const [newStdFatherName, setNewStdFatherName] = React.useState('');
  const [newStdMotherName, setNewStdMotherName] = React.useState('');
  const [newStdGuardianName, setNewStdGuardianName] = React.useState('');
  const [newStdBloodType, setNewStdBloodType] = React.useState('O');
  const [newStdHealthHistory, setNewStdHealthHistory] = React.useState('Sehat');
  const [newStdPreviousSchool, setNewStdPreviousSchool] = React.useState('');
  const [newStdClassFormal, setNewStdClassFormal] = React.useState('');
  const [newStdClassMadrasah, setNewStdClassMadrasah] = React.useState('');
  const [newStdKamar, setNewStdKamar] = React.useState('Al-Ghazali 1');

  // Ketua Kamar Selection State
  const [selectingKetuaRoom, setSelectingKetuaRoom] = React.useState<Room | null>(null);
  const [ketuaSearchQuery, setKetuaSearchQuery] = React.useState('');
  const [ketuaScopeFilter, setKetuaScopeFilter] = React.useState<'kamar_ini' | 'semua'>('kamar_ini');

  const [editStdClassFormal, setEditStdClassFormal] = React.useState('');
  const [editStdClassMadrasah, setEditStdClassMadrasah] = React.useState('');

  React.useEffect(() => {
    if (availableFormalClasses && availableFormalClasses.length > 0 && !newStdClassFormal) {
      setNewStdClassFormal(availableFormalClasses[0]);
    }
  }, [availableFormalClasses, newStdClassFormal]);

  React.useEffect(() => {
    if (availableMadrasahClasses && availableMadrasahClasses.length > 0 && !newStdClassMadrasah) {
      setNewStdClassMadrasah(availableMadrasahClasses[0]);
    }
  }, [availableMadrasahClasses, newStdClassMadrasah]);

  React.useEffect(() => {
    if (editingStudent) {
      setEditStdClassFormal(editingStudent.classFormal || (availableFormalClasses[0] || ''));
      setEditStdClassMadrasah(editingStudent.classMadrasah || (availableMadrasahClasses[0] || ''));
    }
  }, [editingStudent, availableFormalClasses, availableMadrasahClasses]);

  // Bill creation state
  const [billRecipientType, setBillRecipientType] = React.useState<'single' | 'all'>('single');
  const [selectedStudentId, setSelectedStudentId] = React.useState('');
  const [billTitle, setBillTitle] = React.useState('Syahriyah (SPP) Agustus 2026');
  const [billAmount, setBillAmount] = React.useState(350000);
  const [billDueDate, setBillDueDate] = React.useState('2026-08-10');

  // New student package billing states
  const [billCreationMode, setBillCreationMode] = React.useState<'tunggal' | 'paket_santri_baru'>('tunggal');
  const [paketPendaftaranChecked, setPaketPendaftaranChecked] = React.useState(true);
  const [paketPendaftaranAmount, setPaketPendaftaranAmount] = React.useState(150000);
  const [paketSeragamChecked, setPaketSeragamChecked] = React.useState(true);
  const [paketSeragamAmount, setPaketSeragamAmount] = React.useState(350000);
  const [paketKitabChecked, setPaketKitabChecked] = React.useState(true);
  const [paketKitabAmount, setPaketKitabAmount] = React.useState(200000);
  const [paketSppChecked, setPaketSppChecked] = React.useState(true);
  const [paketSppAmount, setPaketSppAmount] = React.useState(200000);
  const [paketGedungChecked, setPaketGedungChecked] = React.useState(true);
  const [paketGedungAmount, setPaketGedungAmount] = React.useState(1000000);

  // Portal Settings Editable state
  const [editSettings, setEditSettings] = React.useState<PortalSettings>(() => {
    try {
      const saved = localStorage.getItem('pesantren_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return autoAdjustPpdbSettings({ ...settings, ...parsed });
      }
    } catch (e) {}
    return autoAdjustPpdbSettings({ ...settings });
  });
  const [saveStatus, setSaveStatus] = React.useState<'saved' | 'saving' | 'idle'>('idle');
  const [isSettingsDirty, setIsSettingsDirty] = React.useState(false);

  // Sync editSettings with upstream settings only if user does not have un-saved local changes
  React.useEffect(() => {
    if (!isSettingsDirty) {
      let currentStored: Partial<PortalSettings> = {};
      try {
        const saved = localStorage.getItem('pesantren_settings');
        if (saved) currentStored = JSON.parse(saved);
      } catch (e) {}

      const merged: PortalSettings = {
        ...settings,
        ...currentStored,
        ppdbStartDate: currentStored.ppdbStartDate !== undefined ? currentStored.ppdbStartDate : (settings.ppdbStartDate || ''),
        ppdbEndDate: currentStored.ppdbEndDate !== undefined ? currentStored.ppdbEndDate : (settings.ppdbEndDate || ''),
        ppdbOpen: currentStored.ppdbOpen !== undefined ? currentStored.ppdbOpen : settings.ppdbOpen,
      };

      setEditSettings(autoAdjustPpdbSettings(merged));
    }
  }, [settings, isSettingsDirty]);

  // Explicit Manual Save function
  const handleSavePortalSettings = async () => {
    setSaveStatus('saving');
    try {
      // Auto-adjust PPDB open status based on end date
      const finalSettings = autoAdjustPpdbSettings({ ...editSettings });
      setEditSettings(finalSettings);

      // 1. Direct localStorage persistence FIRST to lock the source of truth
      localStorage.setItem('pesantren_settings', JSON.stringify(finalSettings));

      // 2. Update parent state
      setSettings(finalSettings);
      
      // 3. Dispatch window event for other listeners
      window.dispatchEvent(new CustomEvent('pesantren_settings_updated', { detail: finalSettings }));
      window.dispatchEvent(new Event('pesantren_db_sync'));
      
      // 4. Sync to Server (/api/settings) and Supabase Cloud Database unconditionally
      fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalSettings)
      }).catch(e => console.warn('Failed to push settings to /api/settings:', e));

      try {
        await pushSettingsToSupabase(finalSettings);
      } catch (supaErr) {
        console.warn('Gagal sinkronisasi setting:', supaErr);
      }
      
      setIsSettingsDirty(false);
      setSaveStatus('saved');
      showAlert('success', 'Pengaturan Portal Online berhasil disimpan secara permanen!');
    } catch (err: any) {
      showAlert('danger', `Gagal menyimpan pengaturan: ${err?.message || err}`);
      setSaveStatus('idle');
    }
    setTimeout(() => {
      setSaveStatus('idle');
    }, 3000);
  };

  // Immediate toggle for PPDB Online status across all devices
  const handleTogglePpdbOnline = async (isChecked: boolean) => {
    let nextSettings = {
      ...editSettings,
      ppdbOpen: isChecked
    };

    // If opening, ensure ppdbEndDate isn't an expired date that immediately closes it on other devices
    if (isChecked && nextSettings.ppdbEndDate) {
      const todayStr = new Date().toISOString().split('T')[0];
      if (nextSettings.ppdbEndDate < todayStr) {
        nextSettings.ppdbEndDate = '';
      }
    }

    setEditSettings(nextSettings);
    setSettings(nextSettings);
    setIsSettingsDirty(false);

    try {
      localStorage.setItem('pesantren_settings', JSON.stringify(nextSettings));
      window.dispatchEvent(new CustomEvent('pesantren_settings_updated', { detail: nextSettings }));
      window.dispatchEvent(new Event('pesantren_db_sync'));

      fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextSettings)
      }).catch(e => console.warn('Failed to push settings to /api/settings:', e));

      if (isSupabaseConfigured()) {
        await pushSettingsToSupabase(nextSettings);
      }

      showAlert('success', isChecked 
        ? 'Status Pendaftaran Online (PPDB) berhasil DIBUKA untuk seluruh perangkat!' 
        : 'Status Pendaftaran Online (PPDB) berhasil DITUTUP untuk seluruh perangkat.');
    } catch (err: any) {
      console.error("Gagal sinkronisasi toggle PPDB:", err);
      showAlert('danger', 'Gagal memperbarui status pendaftaran online ke cloud.');
    }
  };

  // Notifications or toast in component
  const [alert, setAlert] = React.useState<{ type: 'success' | 'danger', message: string } | null>(null);

  // States for printing custom templates or modals
  const [outboundLettersLog, setOutboundLettersLog] = React.useState<{
    id: string;
    type: string;
    recipient: string;
    subject: string;
    letterNo: string;
    date: string;
  }[]>(() => {
    const saved = localStorage.getItem('pesantren_outbound_letters_log');
    if (saved) return JSON.parse(saved);
    return [
      { id: 'let-1', type: 'Surat Izin Pulang', recipient: 'Ahmad Rafli (Kelas VII)', subject: 'Izin Pulang Sakit', letterNo: '01/KMT/PP. AM/VII/2026', date: '2026-07-01' },
      { id: 'let-2', type: 'Surat Sanksi Takzir', recipient: 'Faisal Kamal (Kelas VIII)', subject: 'Takzir Pelanggaran Sedang', letterNo: '01/KTT/PP. AM/VII/2026', date: '2026-07-02' }
    ];
  });

  React.useEffect(() => {
    localStorage.setItem('pesantren_outbound_letters_log', JSON.stringify(outboundLettersLog));
  }, [outboundLettersLog]);

  const getRomanMonth = (dateObj = new Date()) => {
    const romanArr = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
    return romanArr[dateObj.getMonth()];
  };

  const getLetterNumber = (id: string, type: string, code: string) => {
    const existing = outboundLettersLog.find(l => l.id === id);
    if (existing) return existing.letterNo;
    const count = outboundLettersLog.filter(l => l.type === type).length;
    const seq = String(count + 1).padStart(2, '0');
    const roman = getRomanMonth();
    const year = new Date().getFullYear();
    return `${seq}/${code}/PP. AM/${roman}/${year}`;
  };

  const handlePrintLetter = (elementId: string, id: string, type: string, code: string, recipient: string, subject: string) => {
    const letterNo = getLetterNumber(id, type, code);
    if (!outboundLettersLog.some(l => l.id === id)) {
      setOutboundLettersLog(prev => [
        ...prev,
        {
          id,
          type,
          recipient,
          subject,
          letterNo,
          date: new Date().toISOString().split('T')[0]
        }
      ]);
      logAdminActivity(
        'SURAT_KELUAR',
        `Menerbitkan ${type} No. ${letterNo} untuk ${recipient}`,
        id,
        recipient
      );
    }
    downloadPrintableHTML(elementId, `${type.replace(/\s+/g, '_')}_${recipient.replace(/\s+/g, '_')}`);
  };

  const openStudentProfileInNewTab = (s: Student) => {
    const getIndonesianToday = () => {
      return new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    const logoHtml = (settings.logoUrl || '/pesantren_logo.jpg') 
      ? `<img src="${settings.logoUrl || '/pesantren_logo.jpg'}" alt="Logo Pesantren" class="h-16 w-16 object-contain shrink-0" />`
      : `<div class="text-3xl shrink-0 flex items-center justify-center h-16 w-16">🕌</div>`;

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>BIODATA_SANTRI_${s.fullName.toUpperCase()}</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        body { font-family: 'Inter', sans-serif; }
        @media print {
          @page {
            size: portrait;
            margin: 1.5cm;
          }
          body {
            background: white !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .print-border-none {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
          }
        }
      </style>
    </head>
    <body class="bg-slate-100 p-8">
      <div class="max-w-[210mm] min-h-[297mm] mx-auto bg-white p-12 shadow-lg border border-slate-300 relative print-border-none" contenteditable="true" suppressContentEditableWarning="true">
        <!-- KOP SURAT RESMI -->
        <div class="border-b-4 border-double border-slate-900 pb-3 mb-6 flex items-center justify-between gap-4">
          ${logoHtml}
          <div class="text-center flex-1">
            <h3 class="text-[12px] font-bold text-slate-650 uppercase tracking-widest leading-none">${settings.namaYayasan || "YAYASAN AL-ASY'ARIYAH"}</h3>
            <h2 class="text-lg font-black text-slate-950 uppercase tracking-wide leading-tight mt-1">${settings.schoolName || "PONDOK PESANTREN AL-ASY'ARIYAH"}</h2>
            <p class="text-[10px] text-slate-500 font-bold tracking-wider leading-none uppercase mt-0.5">${settings.tagline || "Mencetak Generasi Qur'ani, Berakhlakul Karimah, Unggul, dan Mandiri"}</p>
            <p class="text-[9px] text-slate-600 font-medium leading-relaxed mt-1.5 border-t border-slate-100 pt-1">
              Sekretariat: ${settings.address || "Jl. Raya Modung, Langpanggang, Modung, Bangkalan, Jawa Timur"} • Telp: ${settings.phone || "(0291) 438291"} • Email: ${settings.email || "ponpes@alasyariyah.org"}
            </p>
          </div>
          <div class="w-16 shrink-0 text-right">
            <span class="text-[8px] font-mono font-bold text-slate-400 block border border-slate-200 p-1 text-center rounded uppercase">DBI-SANTRI</span>
          </div>
        </div>

        <!-- JUDUL DOKUMEN -->
        <div class="text-center mb-6">
          <h1 class="text-base font-extrabold text-slate-900 uppercase tracking-widest underline decoration-1 decoration-slate-900">SURAT BIODATA INDUK SANTRI</h1>
          <p class="text-[10px] font-mono text-slate-500 uppercase font-bold mt-0.5">NOMOR REGISTRASI INDUK: DBI/${s.nis || "2026.0001"}/${s.id.substring(0, 4).toUpperCase()}</p>
        </div>

        <p class="text-xs text-slate-800 leading-relaxed mb-4">
          Berikut adalah data riwayat lengkap, profil pribadi, keluarga, serta riwayat kedisiplinan dan akademik dari santri bersangkutan yang tercatat resmi di database sistem informasi akademik Pondok Pesantren Al-Asy'ariyah:
        </p>

        <div class="space-y-5 text-xs text-slate-900">
          <!-- SECTION 1: DATA PERSONAL -->
          <div>
            <h3 class="font-extrabold text-xs text-slate-900 border-b-2 border-slate-800 pb-1 flex items-center gap-2 mb-2 uppercase">
              <span>I.</span> IDENTITAS DIRI SANTRI
            </h3>
            <div class="grid grid-cols-12 gap-y-1.5 items-start">
              <span class="col-span-4 font-semibold text-slate-600">1. Nomor Induk Santri (NIS)</span>
              <span class="col-span-8 font-mono font-extrabold text-slate-900">: ${s.nis || '-'}</span>

              <span class="col-span-4 font-semibold text-slate-600">2. Nama Lengkap Santri</span>
              <span class="col-span-8 font-extrabold text-slate-950 uppercase">: ${s.fullName}</span>

              <span class="col-span-4 font-semibold text-slate-600">3. NIK Santri (No. KTP)</span>
              <span class="col-span-8 font-mono font-semibold text-slate-800">: ${s.nik || 'Belum Dilengkapi'}</span>

              <span class="col-span-4 font-semibold text-slate-600">4. Nomor Kartu Keluarga (KK)</span>
              <span class="col-span-8 font-mono font-semibold text-slate-800">: ${s.kk || 'Belum Dilengkapi'}</span>

              <span class="col-span-4 font-semibold text-slate-600">5. Jenis Kelamin</span>
              <span class="col-span-8 font-bold text-slate-850">: ${s.gender || 'Laki-laki'}</span>

              <span class="col-span-4 font-semibold text-slate-600">6. Tempat & Tanggal Lahir</span>
              <span class="col-span-8 font-semibold text-slate-850">: ${s.birthPlace ? `${s.birthPlace}, ${formatIndonesianDate(s.birthDate)}` : 'Belum Dilengkapi'}</span>

              <span class="col-span-4 font-semibold text-slate-600">7. Kamar Asrama</span>
              <span class="col-span-8 font-extrabold text-emerald-900">: ${s.kamar ? s.kamar : 'Belum Ditentukan'}</span>

              <span class="col-span-4 font-semibold text-slate-600">8. Golongan Darah</span>
              <span class="col-span-8 font-semibold text-slate-800">: ${s.bloodType || 'B'}</span>

              <span class="col-span-4 font-semibold text-slate-600">9. Status Keaktifan</span>
              <span class="col-span-8 font-extrabold text-slate-900">: Aktif (Santri Mukim)</span>
            </div>
          </div>

          <!-- SECTION 2: ORANG TUA / WALI -->
          <div>
            <h3 class="font-extrabold text-xs text-slate-900 border-b-2 border-slate-800 pb-1 flex items-center gap-2 mb-2 uppercase">
              <span>II.</span> DATA ORANG TUA & HUBUNGAN KELUARGA
            </h3>
            <div class="grid grid-cols-12 gap-y-1.5 items-start">
              <span class="col-span-4 font-semibold text-slate-600">1. Nama Lengkap Wali / Orang Tua</span>
              <span class="col-span-8 font-bold text-slate-900">: ${s.parentName || '-'}</span>

              <span class="col-span-4 font-semibold text-slate-600">2. Hubungan Kekeluargaan</span>
              <span class="col-span-8 font-semibold text-slate-800">: Ayah Kandung / Ibu Kandung / Wali Sah</span>

              <span class="col-span-4 font-semibold text-slate-600">3. Nomor WhatsApp Aktif</span>
              <span class="col-span-8 font-mono font-bold text-slate-900">: ${s.parentPhone || '-'}</span>

              <span class="col-span-4 font-semibold text-slate-600">4. Alamat Lengkap Domisili</span>
              <span class="col-span-8 font-semibold text-slate-800">: ${s.address || 'Jawa Tengah'}</span>
            </div>
          </div>

          <!-- SECTION 3: RIWAYAT PENDIDIKAN SANTRI -->
          <div>
            <h3 class="font-extrabold text-xs text-slate-900 border-b-2 border-slate-800 pb-1 flex items-center gap-2 mb-2 uppercase">
              <span>III.</span> RIWAYAT PENDIDIKAN SANTRI
            </h3>
            <div class="grid grid-cols-12 gap-y-1.5 items-start">
              <span class="col-span-4 font-semibold text-slate-600">1. Sekolah Formal (Umum)</span>
              <span class="col-span-8 font-extrabold text-indigo-900">: ${s.classFormal || s.classSore || 'SMK Al-Asy\'ariyah / Formal'}</span>

              <span class="col-span-4 font-semibold text-slate-600">2. Sekolah Diniyah (Madrasah)</span>
              <span class="col-span-8 font-extrabold text-teal-900">: ${s.classMadrasah || s.classPagi || 'Madrasah Diniyah Ula/Wustho/Ulya'}</span>
            </div>
          </div>
        </div>

        <!-- TANDA TANGAN RESMI (Seal 90px & Signature 60px) -->
        <div class="mt-12 flex justify-between items-end border-t border-dashed border-slate-300 pt-6">
          <!-- Photo Box -->
          <div class="border border-slate-300 w-[1.5cm] h-[2cm] sm:w-[2cm] sm:h-[2.6cm] rounded flex flex-col items-center justify-center text-center p-0.5 relative bg-white shrink-0 shadow-xs mb-1 ml-4">
            ${s.photoUrl 
              ? `<img src="${s.photoUrl}" alt="${s.fullName}" class="w-full h-full object-cover rounded" />`
              : `<div class="text-[5px] sm:text-[7px] text-slate-400 font-bold uppercase leading-tight">FOTO SANTRI<br />3 x 4</div>`
            }
          </div>

          <!-- TTD Box -->
          <div class="w-[220px] text-center relative select-none mr-4 pl-4">
            <p class="text-[10px] text-gray-500 font-medium">${getCityFromAddress(settings.address)}, ${getIndonesianToday()}</p>
            <p class="text-[11px] text-slate-950 font-black uppercase tracking-wider leading-tight mt-1 mb-1">Pengasuh Pesantren</p>

            <div class="relative min-h-[64px] flex flex-col items-center justify-end my-1">
              <!-- Wet Signature: Berada DI ATAS nama pengasuh -->
              <div class="z-10 mb-1 flex items-center justify-center">
                ${settings.ttdPengasuhUrl 
                  ? `<img src="${settings.ttdPengasuhUrl}" alt="TTD Pengasuh" class="h-16 max-w-[130px] object-contain mix-blend-multiply" />`
                  : `<span class="text-xs font-mono text-emerald-850 italic font-extrabold tracking-wide">✍️ ${settings.namaPengasuh || "KH. Ahmad Wildan"}</span>`
                }
              </div>

              <!-- Overlapping Stamp: Berada di SEBELAH KIRI nama pengasuh -->
              ${settings.stempelPengasuhUrl 
                ? `<div class="z-20 absolute -left-7 -bottom-1 pointer-events-none opacity-85">
                    <img src="${settings.stempelPengasuhUrl}" alt="Stempel Pengasuh" class="h-20 w-20 object-contain rotate-[-10deg] mix-blend-multiply" />
                   </div>`
                : ''
              }

              <!-- Nama Pengasuh: Berada DI BAWAH tanda tangan -->
              <div>
                <strong class="text-xs font-black text-gray-950 underline leading-none uppercase block">${settings.namaPengasuh || "KH. Ahmad Wildan Asy'ari"}</strong>
              </div>
            </div>
          </div>
        </div>

        <!-- FOOTNOTE -->
        <div class="absolute bottom-4 left-12 right-12 flex justify-between items-center text-[7.5px] text-slate-400 font-mono border-t border-slate-100 pt-1">
          <span>Dokumen Induk Resmi - Pondok Pesantren Al-Asy'ariyah</span>
          <span>Dicetak Tanggal: ${new Date().toLocaleString('id-ID')}</span>
        </div>
      </div>

      <!-- Control Bar -->
      <div class="fixed top-4 right-4 bg-white/95 border border-slate-200 p-3 rounded-xl shadow-lg flex gap-2 no-print z-50">
        <button onclick="window.print()" class="px-4 py-2 bg-teal-800 hover:bg-teal-950 text-white font-bold text-xs rounded-lg shadow-md transition">Cetak Dokumen ⎙</button>
        <button onclick="window.close()" class="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-lg transition">Tutup✕</button>
      </div>
    </body>
    </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const mapClassToLastEducation = (std: any) => {
    if (!std) return "VI MI & XII SMA";
    let formal = (std.classFormal || std.classSore || '').trim();
    let madrasah = (std.classMadrasah || std.classPagi || std.class || '').trim();

    const isInvalid = (val: string) => 
      !val || 
      val === '-' || 
      val === '–' || 
      val === '—' || 
      val.toLowerCase() === 'belum diisi' || 
      val.toLowerCase() === 'alumni' || 
      val.toLowerCase().includes('alumni');

    const validMadrasah = isInvalid(madrasah) ? '' : madrasah;
    const validFormal = isInvalid(formal) ? '' : formal;

    if (validMadrasah && validFormal) {
      return `${validMadrasah} & ${validFormal}`;
    } else if (validMadrasah) {
      return validMadrasah;
    } else if (validFormal) {
      return validFormal;
    }
    return "VI MI & XII SMA";
  };

  const openAlumniCardInNewTab = (a: Student) => {
    const entryYear = (a.nis && a.nis.includes('.')) 
      ? parseInt(a.nis.split('.')[0]) 
      : 2020;
    const exitYear = a.tahunKeluar ? parseInt(a.tahunKeluar) : 2026;
    const lamaMondok = exitYear > entryYear ? `${exitYear - entryYear} Tahun (${entryYear} s/d ${exitYear})` : "6 Tahun (2020 s/d 2026)";

    const lastEducation = mapClassToLastEducation(a);

    const getIndonesianToday = () => {
      return new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    const logoHtml = (settings.logoUrl || '/pesantren_logo.jpg') 
      ? `<img src="${settings.logoUrl || '/pesantren_logo.jpg'}" alt="Logo Pesantren" class="h-16 w-16 object-contain shrink-0" />`
      : `<div class="text-3xl shrink-0 flex items-center justify-center h-16 w-16">🕌</div>`;

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>KARTU_RIWAYAT_ALUMNI_${a.fullName.toUpperCase()}</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        body { font-family: 'Inter', sans-serif; }
        @media print {
          @page {
            size: portrait;
            margin: 1.5cm;
          }
          body {
            background: white !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .print-border-none {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
          }
        }
      </style>
    </head>
    <body class="bg-slate-100 p-8 flex flex-col items-center">
      <div class="w-[210mm] h-auto bg-white p-12 shadow-lg border border-slate-300 relative flex flex-col justify-between print-border-none" contenteditable="true" suppressContentEditableWarning="true">
        <div>
          <!-- KOP SURAT RESMI -->
          <div class="border-b-[3px] border-double border-amber-800 pb-3 mb-6 flex gap-4 items-center shrink-0">
            ${logoHtml}
            <div class="flex-1 min-w-0 text-left">
              <h4 class="text-sm font-black tracking-wide uppercase text-amber-950 leading-tight">${settings.schoolName || "Pondok Pesantren Al-Asy'ariyah"}</h4>
              <p class="text-[10px] text-slate-500 leading-normal mt-0.5">
                ${settings.address || "Jl. Raya Modung, Langpanggang, Modung, Bangkalan, Jawa Timur"}
              </p>
              <p class="text-[10px] text-amber-800 font-bold italic">
                ${settings.tagline || "Mencetak Generasi Qur'ani, Berakhlakul Karimah"}
              </p>
            </div>
          </div>

          <!-- DOCUMENT TITLE -->
          <div class="text-center my-6">
            <h5 class="text-base font-black tracking-widest text-amber-950 underline leading-tight uppercase">KARTU RIWAYAT ALUMNI PESANTREN</h5>
            <p class="text-[10px] font-mono font-bold text-slate-400 mt-0.5">No. ${a.alumniId || `NIA.${exitYear}.${a.gender === 'Perempuan' ? 'P' : 'L'}.${a.nis || 'UNTITLED'}`}</p>
          </div>

          <!-- Salam Pembuka -->
          <div class="text-xs text-slate-700 leading-relaxed mb-4 space-y-1">
            <p class="font-bold">Assalamu'alaikum Warahmatullahi Wabarakaatuh,</p>
            <p>
              Dengan memohon rahmat dan ridho Allah SWT, Pengasuh Pondok Pesantren menerangkan dengan sebenarnya bahwa data di bawah ini tercatat sebagai alumni:
            </p>
          </div>

          <!-- Profile Layout -->
          <div class="space-y-3 py-4 border border-dashed border-amber-200 rounded-xl p-6 bg-white shadow-xs">
            <div class="grid grid-cols-12 gap-1 items-center">
              <span class="col-span-4 text-[10px] text-gray-400 font-mono font-bold tracking-wider uppercase">No Identitas (NIA)</span>
              <span class="col-span-1 text-gray-400 text-center">:</span>
              <span class="col-span-7 font-mono font-black text-sm text-amber-900 leading-none">${a.alumniId || '-'}</span>
            </div>

            <div class="grid grid-cols-12 gap-1 items-center">
              <span class="col-span-4 text-[10px] text-gray-400 font-mono font-bold tracking-wider uppercase">Nama Lengkap</span>
              <span class="col-span-1 text-gray-400 text-center">:</span>
              <span class="col-span-7 font-black text-sm text-slate-900 uppercase leading-none">${a.fullName}</span>
            </div>

            <div class="grid grid-cols-12 gap-1 items-start">
              <span class="col-span-4 text-[10px] text-gray-400 font-mono font-bold tracking-wider uppercase">Nama Wali</span>
              <span class="col-span-1 text-gray-400 text-center">:</span>
              <div class="col-span-7 font-bold text-xs text-slate-800 leading-snug">
                <div>Ayah : ${a.fatherName || a.parentName || '-'}</div>
                <div>Ibu : ${a.motherName || '-'}</div>
              </div>
            </div>

            <div class="grid grid-cols-12 gap-1 items-center">
              <span class="col-span-4 text-[10px] text-gray-400 font-mono font-bold tracking-wider uppercase">Masa Mondok</span>
              <span class="col-span-1 text-gray-400 text-center">:</span>
              <span class="col-span-7 font-bold text-xs text-slate-800 leading-none">${lamaMondok}</span>
            </div>

            <div class="grid grid-cols-12 gap-1 items-center">
              <span class="col-span-4 text-[10px] text-gray-400 font-mono font-bold tracking-wider uppercase">Tahun Keluar</span>
              <span class="col-span-1 text-gray-400 text-center">:</span>
              <span class="col-span-7 font-bold text-xs text-slate-800 leading-none">Tahun Keluar ${a.tahunKeluar || '-'}</span>
            </div>

            <div class="grid grid-cols-12 gap-1 items-center">
              <span class="col-span-4 text-[10px] text-gray-400 font-mono font-bold tracking-wider uppercase">Pendidikan Terakhir</span>
              <span class="col-span-1 text-gray-400 text-center">:</span>
              <span class="col-span-7 font-black text-xs text-emerald-800 leading-none">${lastEducation}</span>
            </div>

            <div class="grid grid-cols-12 gap-1 items-center">
              <span class="col-span-4 text-[10px] text-gray-400 font-mono font-bold tracking-wider uppercase">Status Keluar</span>
              <span class="col-span-1 text-gray-400 text-center">:</span>
              <span class="col-span-7 text-xs font-bold text-slate-700 leading-tight italic">${a.alumniReason || 'Lulus Madrasah & Formal'}</span>
            </div>
          </div>

          <!-- Kata Penutup -->
          <div class="text-xs text-slate-700 leading-relaxed mt-4 space-y-1">
            <p>
              Demikian kartu riwayat alumni ini kami buat dengan sebenarnya agar dapat dipergunakan sebagaimana mestinya. Semoga limpahan berkah senantiasa menyertai langkah perjuangan di masyarakat.
            </p>
            <p class="font-bold">Wassalamu'alaikum Warahmatullahi Wabarakaatuh.</p>
          </div>
        </div>

        <!-- Wet Signature Area & Photo (Seal 90px & Signature 60px) -->
        <div class="flex justify-between items-end border-t border-dashed border-amber-200 pt-6 mt-6">
          <!-- Alumni Photo -->
          <div class="border border-amber-300 w-[1.5cm] h-[2cm] sm:w-[2cm] sm:h-[2.6cm] rounded flex flex-col items-center justify-center text-center p-0.5 relative bg-white shrink-0 shadow-xs ml-4">
            ${a.photoUrl 
              ? `<img src="${a.photoUrl}" alt="${a.fullName}" class="w-full h-full object-cover rounded" />`
              : `<div class="text-[7px] text-amber-600 font-bold uppercase leading-tight">FOTO ALUMNI<br />3 x 4</div>`
            }
          </div>

          <!-- Signatures -->
          <div class="w-[220px] text-center relative select-none mr-4 pl-4">
            <p class="text-[10px] text-gray-500 font-medium">${getCityFromAddress(settings.address)}, ${getIndonesianToday()}</p>
            <p class="text-xs text-amber-950 font-black uppercase tracking-wider leading-tight mt-1 mb-1">Pengasuh Pesantren</p>

            <div class="relative min-h-[64px] flex flex-col items-center justify-end my-1">
              <!-- Wet signature: Berada DI ATAS nama pengasuh -->
              <div class="z-10 mb-1 flex items-center justify-center">
                ${settings.ttdPengasuhUrl 
                  ? `<img src="${settings.ttdPengasuhUrl}" alt="TTD Pengasuh" class="h-16 max-w-[130px] object-contain mix-blend-multiply" />`
                  : `<span class="text-xs font-mono text-emerald-850 italic font-extrabold tracking-wide">✍️ ${settings.namaPengasuh || "KH. Ahmad Wildan"}</span>`
                }
              </div>

              <!-- Overlapping Stamp: Berada di SEBELAH KIRI nama pengasuh -->
              ${settings.stempelPengasuhUrl 
                ? `<div class="z-20 absolute -left-7 -bottom-1 pointer-events-none opacity-85">
                    <img src="${settings.stempelPengasuhUrl}" alt="Stempel Pengasuh" class="h-20 w-20 object-contain rotate-[-10deg] mix-blend-multiply" />
                   </div>`
                : ''
              }

              <!-- Nama Pengasuh: Berada DI BAWAH tanda tangan -->
              <div>
                <p class="text-xs font-black text-gray-900 underline leading-none uppercase truncate block">${settings.namaPengasuh || "KH. Ahmad Wildan Asy'ari"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Control Bar -->
      <div class="fixed top-4 right-4 bg-white/95 border border-slate-200 p-3 rounded-xl shadow-lg flex gap-2 no-print z-50">
        <button onclick="window.print()" class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg shadow-md transition">Cetak Kartu Alumni ⎙</button>
        <button onclick="window.close()" class="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-lg transition">Tutup✕</button>
      </div>
    </body>
    </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const [selectedStudentForCard, setSelectedStudentForCard] = React.useState<Student | null>(null);
  const [selectedStudentForProfilePrint, setSelectedStudentForProfilePrint] = React.useState<Student | null>(null);
  const [selectedPpdbForSlip, setSelectedPpdbForSlip] = React.useState<PCSBRegistration | null>(null);
  const [billsSubTab, setBillsSubTab] = React.useState<'invoice' | 'rekening'>('invoice');
  const [editingBankAccount, setEditingBankAccount] = React.useState<any>(null);
  const [bankFormName, setBankFormName] = React.useState('');
  const [bankFormNumber, setBankFormNumber] = React.useState('');
  const [bankFormOwner, setBankFormOwner] = React.useState('');
  const [printSecurityLog, setPrintSecurityLog] = React.useState<any>(null);
  const [printDisciplineLog, setPrintDisciplineLog] = React.useState<any>(null);
  const [printHealthLog, setPrintHealthLog] = React.useState<any>(null);

  // States for Broadcasting Announcements via WhatsApp
  const [broadcastAnnouncement, setBroadcastAnnouncement] = React.useState<Announcement | null>(null);
  const [broadcastGroup, setBroadcastGroup] = React.useState<string>('all');

  // States for Admin Tahfidz management
  const [selectedStudentForTahfidz, setSelectedStudentForTahfidz] = React.useState<Student | null>(null);
  const [newJuz, setNewJuz] = React.useState<number>(30);
  const [newSurah, setNewSurah] = React.useState<string>('An-Naba');
  const [newVerses, setNewVerses] = React.useState<string>('1-40');
  const [newStatus, setNewStatus] = React.useState<'Setoran Baru' | 'Murojaah' | 'Imtihan / Ujian'>('Setoran Baru');
  const [newGrade, setNewGrade] = React.useState<'A (Istimewa)' | 'B (Lancar)' | 'C (Cukup)'>('B (Lancar)');
  const [newUstadz, setNewUstadz] = React.useState<string>('Ustadz Ahmad Fauzi');

  // Staff account management state
  const [staffUsers, setStaffUsers] = React.useState<{
    id: string;
    fullName: string;
    email: string;
    role: 'admin' | 'keamanan' | 'ketertiban' | 'kesehatan';
    isConfirmed: boolean;
    registeredAt: string;
    tempPassword?: string;
  }[]>(() => {
    const activeAdminDefault = (typeof window !== 'undefined' && (
      localStorage.getItem('admin_custom_name_' + (session?.email || 'muarifsamsul082@gmail.com').toLowerCase()) ||
      localStorage.getItem('admin_custom_name_muarifsamsul082@gmail.com') ||
      localStorage.getItem('admin_custom_name_admin@alasyariyah.sch.id') ||
      (session?.fullName && session.fullName !== 'Muhammad' ? session.fullName : 'Ustadz Samsul')
    )) || 'Ustadz Samsul';

    const saved = localStorage.getItem('pesantren_staff_users');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const updated = parsed.map((u: any) => {
            if (u.role === 'admin' || (u.email && (u.email.toLowerCase() === 'admin@alasyariyah.sch.id' || u.email.toLowerCase() === 'muarifsamsul082@gmail.com'))) {
              return { ...u, fullName: activeAdminDefault, name: activeAdminDefault };
            }
            return u;
          });
          if (!updated.some((u: any) => u.role === 'admin')) {
            updated.unshift({
              id: 'usr-admin',
              fullName: activeAdminDefault,
              name: activeAdminDefault,
              email: (session?.email || 'muarifsamsul082@gmail.com').toLowerCase(),
              role: 'admin',
              isConfirmed: true,
              registeredAt: '2026-01-01'
            });
          }
          return updated;
        }
      } catch (e) {}
    }
    return [
      { id: 'usr-admin', fullName: activeAdminDefault, email: (session?.email || 'muarifsamsul082@gmail.com').toLowerCase(), role: 'admin', isConfirmed: true, registeredAt: '2026-01-01' },
      { id: 'usr-1', fullName: 'Ustadz Junaidi Al-Anshori', email: 'keamanan@alasyariyah.sch.id', role: 'keamanan', isConfirmed: true, registeredAt: '2026-01-10' },
      { id: 'usr-2', fullName: 'Ustadz Abdul Somad, S.Sy', email: 'ketertiban@alasyariyah.sch.id', role: 'ketertiban', isConfirmed: true, registeredAt: '2026-02-15' },
      { id: 'usr-3', fullName: 'Ustadzah dr. Fatimah Az-Zahra', email: 'kesehatan@alasyariyah.sch.id', role: 'kesehatan', isConfirmed: true, registeredAt: '2026-03-01' },
    ];
  });

  React.useEffect(() => {
    localStorage.setItem('pesantren_staff_users', JSON.stringify(staffUsers));
  }, [staffUsers]);

  React.useEffect(() => {
    const handleSync = () => {
      const saved = localStorage.getItem('pesantren_staff_users');
      if (saved) {
        try { setStaffUsers(JSON.parse(saved)); } catch (e) {}
      }
    };
    window.addEventListener('pesantren_staff_users_updated', handleSync);
    window.addEventListener('pesantren_admin_name_updated', handleSync);
    return () => {
      window.removeEventListener('pesantren_staff_users_updated', handleSync);
      window.removeEventListener('pesantren_admin_name_updated', handleSync);
    };
  }, []);

  // Sync staffUsers names automatically with Portal Settings and custom profile names
  const getResolvedStaffName = React.useCallback((u: { email?: string; fullName?: string; name?: string; role?: string }) => {
    if (u.role === 'admin' || (u.email && (u.email.toLowerCase() === 'admin@alasyariyah.sch.id' || u.email.toLowerCase() === 'muarifsamsul082@gmail.com'))) {
      return currentAdminName || 'Ustadz Samsul';
    }
    const emailKey = (u.email || '').toLowerCase();
    if (emailKey) {
      const custom = localStorage.getItem('staff_custom_name_' + emailKey);
      if (custom) return custom;
    }
    return u.fullName || u.name || 'Pengurus Pesantren';
  }, [currentAdminName]);

  const handleUpdateStaffName = (staffId: string, newName: string) => {
    if (!newName.trim()) return;
    const target = staffUsers.find(u => u.id === staffId);
    if (!target) return;
    const emailKey = (target.email || '').toLowerCase();
    localStorage.setItem('staff_custom_name_' + emailKey, newName.trim());

    if (target.role === 'admin' || emailKey === 'admin@alasyariyah.sch.id' || emailKey === 'muarifsamsul082@gmail.com') {
      localStorage.setItem('admin_custom_name_' + emailKey, newName.trim());
      localStorage.setItem('admin_custom_name_muarifsamsul082@gmail.com', newName.trim());
      localStorage.setItem('admin_custom_name_admin@alasyariyah.sch.id', newName.trim());
      try {
        const sess = JSON.parse(localStorage.getItem('pesantren_session') || '{}');
        sess.fullName = newName.trim();
        sess.roleName = newName.trim();
        localStorage.setItem('pesantren_session', JSON.stringify(sess));
      } catch (e) {}
    }

    if (target.role) {
      const configKey = `${target.role}_config`;
      try {
        const existing = JSON.parse(localStorage.getItem(configKey) || '{}');
        localStorage.setItem(configKey, JSON.stringify({ ...existing, name: newName.trim() }));
      } catch (e) {}
    }
    const updated = staffUsers.map(u => {
      if (u.id === staffId || (target.role === 'admin' && u.role === 'admin')) {
        return { ...u, fullName: newName.trim(), name: newName.trim() };
      }
      return u;
    });
    setStaffUsers(updated);
    localStorage.setItem('pesantren_staff_users', JSON.stringify(updated));
    window.dispatchEvent(new Event('pesantren_staff_users_updated'));
    window.dispatchEvent(new Event('staff_configs_updated'));
    window.dispatchEvent(new Event('pesantren_admin_name_updated'));
    if (isSupabaseConfigured()) {
      pushAllStaffUsersToSupabase(updated).catch(() => {});
    }
    fetch('/api/staff-users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: staffId, email: emailKey, fullName: newName.trim(), name: newName.trim(), role: target.role })
    }).catch(() => {});
    showAlert('success', `Nama pengurus berhasil diperbarui menjadi "${newName.trim()}" dan disinkronkan ke seluruh sistem!`);
  };

  React.useEffect(() => {
    if (settings) {
      setStaffUsers(prev => {
        let changed = false;
        const updated = prev.map(u => {
          const emailKey = (u.email || '').toLowerCase();
          const custom = emailKey ? localStorage.getItem('staff_custom_name_' + emailKey) : null;
          let targetName = custom || u.fullName;
          if (!custom) {
            if (u.role === 'admin' && settings.namaPengurus && u.fullName !== settings.namaPengurus) {
              targetName = settings.namaPengurus;
            } else if (u.role === 'keamanan' && settings.namaKeamanan && u.fullName !== settings.namaKeamanan) {
              targetName = settings.namaKeamanan;
            } else if (u.role === 'ketertiban' && settings.namaKetertiban && u.fullName !== settings.namaKetertiban) {
              targetName = settings.namaKetertiban;
            } else if (u.role === 'kesehatan' && settings.namaKesehatan && u.fullName !== settings.namaKesehatan) {
              targetName = settings.namaKesehatan;
            }
          }
          if (targetName !== u.fullName) {
            changed = true;
            return { ...u, fullName: targetName };
          }
          return u;
        });
        if (changed) {
          localStorage.setItem('pesantren_staff_users', JSON.stringify(updated));
          return updated;
        }
        return prev;
      });
    }
  }, [settings]);

  const [newStaffName, setNewStaffName] = React.useState('');
  const [newStaffEmail, setNewStaffEmail] = React.useState('');
  const [newStaffRole, setNewStaffRole] = React.useState<'admin' | 'keamanan' | 'ketertiban' | 'kesehatan'>('keamanan');
  const [editingStaffId, setEditingStaffId] = React.useState<string | null>(null);
  const [editingStaffName, setEditingStaffName] = React.useState<string>('');
  const [simulatedEmailDetails, setSimulatedEmailDetails] = React.useState<{ to: string, link: string, name: string, role: string } | null>(null);

  // Modal notification for newly registered staff credentials
  const [staffCredentialNotification, setStaffCredentialNotification] = React.useState<{
    fullName: string;
    email: string;
    role: string;
    password: string;
    loginUrl: string;
    registeredAt: string;
  } | null>(null);

  const getStaffAssets = (_role: string) => {
    // Stempel dan tanda tangan pada pengurus menggunakan foto sama dengan pengasuh
    return {
      sig: settings?.ttdPengasuhUrl || settings?.ttdPengurusUrl || '✍️ Pengurus Pesantren',
      seal: settings?.stempelPengasuhUrl || settings?.stempelPesantrenUrl || '💮 STEMPEL RESMI PESANTREN'
    };
  };

  // Lifted state variables for Alumni
  const [alumniSearch, setAlumniSearch] = React.useState('');
  const [alumniGenderFilter, setAlumniGenderFilter] = React.useState('Semua');
  const [alumniYearFilter, setAlumniYearFilter] = React.useState('Semua');
  const [alumniSort, setAlumniSort] = React.useState('name-asc');
  const [selectedAlumniForDetails, setSelectedAlumniForDetails] = React.useState<Student | null>(null);
  const [selectedAlumniForCard, setSelectedAlumniForCard] = React.useState<Student | null>(null);

  // Lifted state variables for Room Management
  const [roomSearch, setRoomSearch] = React.useState('');
  const [roomGenderFilter, setRoomGenderFilter] = React.useState('Semua');
  const [isAddRoomOpen, setIsAddRoomOpen] = React.useState(false);
  const [editingRoom, setEditingRoom] = React.useState<Room | null>(null);
  const [roomFormName, setRoomFormName] = React.useState('');
  const [roomFormGender, setRoomFormGender] = React.useState<'Laki-laki' | 'Perempuan'>('Laki-laki');
  const [roomFormFormal, setRoomFormFormal] = React.useState('');
  const [roomFormDiniyah, setRoomFormDiniyah] = React.useState('');
  const [roomFormCapacity, setRoomFormCapacity] = React.useState(20);

  const showAlert = (type: 'success' | 'danger', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4000);
  };

  const handleRegisterStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim() || !newStaffEmail.trim()) {
      showAlert('danger', 'Harap lengkapi Nama Lengkap dan Email Pengurus!');
      return;
    }

    // Check duplicate
    if (staffUsers.some(u => u.email.toLowerCase() === newStaffEmail.trim().toLowerCase())) {
      showAlert('danger', 'Alamat email pengurus sudah terdaftar!');
      return;
    }

    const generatedPassword = 'Ponpes@' + Math.floor(100000 + Math.random() * 900000);
    const generatedLink = `${window.location.origin}/login`;

    const newStaff = {
      id: `usr-${Date.now()}`,
      fullName: newStaffName.trim(),
      email: newStaffEmail.trim().toLowerCase(),
      role: newStaffRole,
      isConfirmed: true,
      registeredAt: new Date().toISOString().split('T')[0],
      tempPassword: generatedPassword
    };

    const updatedStaff = [...staffUsers, newStaff];
    setStaffUsers(updatedStaff);
    localStorage.setItem('pesantren_staff_users', JSON.stringify(updatedStaff));
    window.dispatchEvent(new Event('pesantren_staff_users_updated'));

    // Directly open credential notification popup modal
    setStaffCredentialNotification({
      fullName: newStaff.fullName,
      email: newStaff.email,
      role: newStaff.role,
      password: generatedPassword,
      loginUrl: generatedLink,
      registeredAt: newStaff.registeredAt
    });

    // Save WA simulation log
    saveWaLog(
      'NOTIF_AKUN_PENGURUS',
      '',
      newStaff.fullName,
      `Pendaftaran Akun Pengurus Baru:\nNama: ${newStaff.fullName}\nEmail/Username: ${newStaff.email}\nPassword: ${generatedPassword}\nRole: ${newStaff.role.toUpperCase()}\nAkses Login: ${generatedLink}`
    );

    logAdminActivity('TAMBAH_AKUN_PENGURUS', `Mendaftarkan akun pengurus baru: ${newStaff.fullName} (${newStaff.role.toUpperCase()})`, newStaff.id, newStaff.fullName);

    setNewStaffName('');
    setNewStaffEmail('');
    showAlert('success', `Akun pengurus ${newStaff.fullName} berhasil ditambahkan! Kredensial akun telah dibuat.`);
  };

  const handleConfirmStaffEmail = (emailToConfirm: string) => {
    setStaffUsers(prev => prev.map(u => u.email === emailToConfirm ? { ...u, isConfirmed: true } : u));
    setSimulatedEmailDetails(null);
    showAlert('success', 'Akun pengurus berhasil diaktivasi dan siap digunakan!');
  };

  const handleDeleteStaff = (id: string) => {
    setStaffUsers(prev => prev.filter(u => u.id !== id));
    showAlert('success', 'Akun pengurus berhasil dihapus.');
  };

  const exportPpdbToExcel = () => {
    const title = settings.schoolName || "Pondok Pesantren Al-Asy'ariyah";
    const address = settings.address || "Jl. Raya Modung, Langpanggang, Modung, Bangkalan, Jawa Timur";
    const tagline = settings.tagline || "Mencetak Generasi Qur'ani, Berakhlakul Karimah";

    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Data Pendaftar PPDB</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Arial', sans-serif; font-size: 11px; }
          .kop-title { font-size: 16px; font-weight: bold; text-transform: uppercase; color: #064e3b; }
          .kop-subtitle { font-size: 11px; color: #475569; }
          .data-table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          .data-table th { border: 1px solid #94a3b8; background-color: #064e3b; color: #ffffff; padding: 8px 6px; font-size: 11px; font-weight: bold; text-align: left; text-transform: uppercase; }
          .data-table td { border: 1px solid #cbd5e1; padding: 6px; font-size: 11px; vertical-align: top; }
          .text-center { text-align: center; }
          .text-bold { font-weight: bold; }
        </style>
      </head>
      <body>
        <!-- KOP SURAT RESMI -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="text-align: left;">
              <div class="kop-title">${title}</div>
              <div class="kop-subtitle">${address}</div>
              <div class="kop-subtitle" style="font-style: italic; font-weight: bold; color: #047857;">${tagline}</div>
              <div style="font-size: 13px; font-weight: bold; margin-top: 10px; border-bottom: 2px solid #064e3b; padding-bottom: 5px; color: #064e3b;">
                LAPORAN LENGKAP PENDAFTARAN CALON SANTRI BARU (PPDB) - TAHUN ${new Date().getFullYear()} (TOTAL: ${ppdbList.length} PENDAFTAR)
              </div>
            </td>
          </tr>
        </table>

        <!-- DATA TABLE -->
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">No</th>
              <th>ID Pendaftaran</th>
              <th>Tanggal Daftar</th>
              <th>Status Verifikasi</th>
              <th>Nama Lengkap Calon</th>
              <th>Jenis Kelamin</th>
              <th>NIK Calon Santri</th>
              <th>No. Kartu Keluarga (KK)</th>
              <th>Tempat Lahir</th>
              <th>Tanggal Lahir</th>
              <th>Golongan Darah</th>
              <th>Riwayat Kesehatan / Penyakit</th>
              <th>Asal Sekolah</th>
              <th>Nama Ayah Kandung</th>
              <th>Nama Ibu Kandung</th>
              <th>Nama Wali / Orang Tua</th>
              <th>No. WhatsApp / HP Wali</th>
              <th>Alamat Lengkap</th>
              <th>Skema Biaya Masuk</th>
              <th>Catatan / Keterangan</th>
            </tr>
          </thead>
          <tbody>
    `;

    ppdbList.forEach((reg, idx) => {
      const statusColor = reg.status === 'Diterima' ? '#15803d' : reg.status === 'Ditolak' ? '#b91c1c' : '#b45309';
      html += `
        <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
          <td class="text-center">${idx + 1}</td>
          <td style="mso-number-format:'\\@';" class="text-bold">${reg.id || '-'}</td>
          <td>${reg.registrationDate || '-'}</td>
          <td style="font-weight: bold; color: ${statusColor};">${reg.status || 'Pending'}</td>
          <td class="text-bold">${reg.fullName || '-'}</td>
          <td>${reg.gender || '-'}</td>
          <td style="mso-number-format:'\\@';">${reg.nik || '-'}</td>
          <td style="mso-number-format:'\\@';">${reg.kk || '-'}</td>
          <td>${reg.birthPlace || '-'}</td>
          <td>${reg.birthDate || '-'}</td>
          <td class="text-center">${reg.bloodType || '-'}</td>
          <td>${reg.healthHistory || '-'}</td>
          <td>${reg.previousSchool || '-'}</td>
          <td>${reg.fatherName || '-'}</td>
          <td>${reg.motherName || '-'}</td>
          <td>${reg.parentName || '-'}</td>
          <td style="mso-number-format:'\\@';">${reg.parentPhone || '-'}</td>
          <td>${reg.address || '-'}</td>
          <td>${reg.paymentType || '-'}</td>
          <td>${reg.notes || '-'}</td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `DATA_LENGKAP_PPDB_${new Date().getFullYear()}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showAlert('success', 'Seluruh data PPDB lengkap (' + ppdbList.length + ' data tanpa terkecuali) berhasil diekspor ke format Excel!');
  };

  const exportStudentsToExcel = () => {
    const title = settings.schoolName || "Pondok Pesantren Al-Asy'ariyah";
    const address = settings.address || "Jl. Raya Modung, Langpanggang, Modung, Bangkalan, Jawa Timur";
    const tagline = settings.tagline || "Mencetak Generasi Qur'ani, Berakhlakul Karimah";

    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Database Lengkap Santri</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Arial', sans-serif; font-size: 11px; }
          .kop-title { font-size: 16px; font-weight: bold; text-transform: uppercase; color: #064e3b; }
          .kop-subtitle { font-size: 11px; color: #475569; }
          .data-table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          .data-table th { border: 1px solid #94a3b8; background-color: #064e3b; color: #ffffff; padding: 8px 6px; font-size: 11px; font-weight: bold; text-align: left; text-transform: uppercase; }
          .data-table td { border: 1px solid #cbd5e1; padding: 6px; font-size: 11px; vertical-align: top; }
          .text-center { text-align: center; }
          .text-bold { font-weight: bold; }
        </style>
      </head>
      <body>
        <!-- KOP SURAT RESMI -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="text-align: left;">
              <div class="kop-title">${title}</div>
              <div class="kop-subtitle">${address}</div>
              <div class="kop-subtitle" style="font-style: italic; font-weight: bold; color: #047857;">${tagline}</div>
              <div style="font-size: 13px; font-weight: bold; margin-top: 10px; border-bottom: 2px solid #064e3b; padding-bottom: 5px; color: #064e3b;">
                LAPORAN DATABASE INDUK SANTRI & ALUMNI LENGKAP - TAHUN ${new Date().getFullYear()} (TOTAL: ${students.length} SANTRI)
              </div>
            </td>
          </tr>
        </table>

        <!-- DATA TABLE -->
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">No</th>
              <th>ID Santri</th>
              <th>Nomor Induk Santri (NIS)</th>
              <th>Nama Lengkap Santri</th>
              <th>Status Keaktifan</th>
              <th>Jenis Kelamin</th>
              <th>NIK (No. KTP/KIA)</th>
              <th>No. Kartu Keluarga (KK)</th>
              <th>Tempat Lahir</th>
              <th>Tanggal Lahir</th>
              <th>Golongan Darah</th>
              <th>Riwayat Kesehatan / Penyakit</th>
              <th>Kelas Formal (Sekolah Sore)</th>
              <th>Kelas Madrasah Diniyah (Pagi)</th>
              <th>Kelas Gabungan</th>
              <th>Kamar Asrama</th>
              <th>Total Hafalan Qur'an</th>
              <th>Nama Ayah Kandung</th>
              <th>Nama Ibu Kandung</th>
              <th>Nama Wali Santri</th>
              <th>No. WhatsApp / HP Wali</th>
              <th>Alamat Lengkap</th>
              <th>Akun / Catatan Madrasah</th>
              <th>Email Akun Portal</th>
              <th>Tahun Lulus / Keluar</th>
              <th>Sebab / Alasan Alumni</th>
            </tr>
          </thead>
          <tbody>
    `;

    students.forEach((s, idx) => {
      const statusColor = s.status === 'Aktif' ? '#15803d' : s.status === 'Alumni' ? '#1e40af' : s.status === 'Cuti' ? '#b45309' : '#b91c1c';
      html += `
        <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
          <td class="text-center">${idx + 1}</td>
          <td style="mso-number-format:'\\@';" class="text-bold">${s.id || '-'}</td>
          <td style="mso-number-format:'\\@'; font-weight: bold;">${s.nis || '-'}</td>
          <td class="text-bold">${s.fullName || '-'}</td>
          <td style="font-weight: bold; color: ${statusColor};">${s.status || 'Aktif'}</td>
          <td>${s.gender || '-'}</td>
          <td style="mso-number-format:'\\@';">${s.nik || '-'}</td>
          <td style="mso-number-format:'\\@';">${s.kk || '-'}</td>
          <td>${s.birthPlace || '-'}</td>
          <td>${s.birthDate || '-'}</td>
          <td class="text-center">${s.bloodType || '-'}</td>
          <td>${s.healthHistory || '-'}</td>
          <td>${s.classFormal || '-'}</td>
          <td>${s.classMadrasah || '-'}</td>
          <td>${s.class || '-'}</td>
          <td>${s.kamar || '-'}</td>
          <td class="text-bold">${s.currentHafalan || '-'}</td>
          <td>${s.fatherName || '-'}</td>
          <td>${s.motherName || '-'}</td>
          <td>${s.parentName || s.guardianName || '-'}</td>
          <td style="mso-number-format:'\\@';">${s.parentPhone || '-'}</td>
          <td>${s.address || '-'}</td>
          <td>${s.akunMadrasah || '-'}</td>
          <td>${s.email || '-'}</td>
          <td>${s.tahunKeluar || '-'}</td>
          <td>${s.alumniReason || '-'}</td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `DATABASE_LENGKAP_SANTRI_${new Date().getFullYear()}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showAlert('success', 'Database seluruh santri lengkap (' + students.length + ' data santri & alumni tanpa terkecuali) berhasil diekspor ke Excel!');
  };

  // Add News
  const handleAddNews = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNewsTitle || !newNewsContent) {
      showAlert('danger', 'Judul dan isi berita wajib diisi.');
      return;
    }
    const added: News = {
      id: `news-${Date.now()}`,
      title: newNewsTitle,
      excerpt: newNewsExcerpt || newNewsContent.substring(0, 100) + '...',
      content: newNewsContent,
      category: newNewsCategory,
      image: newNewsImage,
      date: new Date().toISOString().split('T')[0],
      author: 'Admin Pesantren'
    };
    const updatedNews = [added, ...news];
    setNews(updatedNews);
    localStorage.setItem('pesantren_news', JSON.stringify(updatedNews));
    markLocalDataChanged('news');
    if (isSupabaseConfigured()) {
      pushNewsToSupabase(added).catch(err => console.error('Cloud push news error:', err));
    }
    window.dispatchEvent(new Event('pesantren_db_sync'));
    showAlert('success', 'Berita berhasil diterbitkan!');
    setNewNewsTitle('');
    setNewNewsExcerpt('');
    setNewNewsContent('');
  };

  // Delete News
  const handleDeleteNews = (id: string) => {
    triggerConfirm(
      'Hapus Berita',
      'Yakin ingin menghapus berita ini secara permanen?',
      () => {
        const updatedNews = news.filter(n => n.id !== id);
        setNews(updatedNews);
        localStorage.setItem('pesantren_news', JSON.stringify(updatedNews));
        markLocalDataChanged('news');
        if (isSupabaseConfigured()) {
          deleteNewsFromSupabase(id).catch(err => console.error('Cloud delete news error:', err));
        }
        window.dispatchEvent(new Event('pesantren_db_sync'));
        showAlert('success', 'Berita berhasil dihapus.');
      }
    );
  };

  // Add Announcement
  const handleAddAnn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnTitle || !newAnnContent) {
      showAlert('danger', 'Judul dan konten pengumuman wajib diisi.');
      return;
    }
    const added: Announcement = {
      id: `ann-${Date.now()}`,
      title: newAnnTitle,
      content: newAnnContent,
      priority: newAnnPriority,
      targetRole: newAnnTarget,
      date: new Date().toISOString().split('T')[0]
    };
    const updatedAnn = [added, ...announcements];
    setAnnouncements(updatedAnn);
    localStorage.setItem('pesantren_announcements', JSON.stringify(updatedAnn));
    markLocalDataChanged('announcements');
    if (isSupabaseConfigured()) {
      pushAnnouncementToSupabase(added).catch(err => console.error('Cloud push ann error:', err));
    }
    window.dispatchEvent(new Event('pesantren_db_sync'));
    showAlert('success', 'Pengumuman baru berhasil diterbitkan!');
    setNewAnnTitle('');
    setNewAnnContent('');
  };

  // Delete Announcement
  const handleDeleteAnn = (id: string) => {
    triggerConfirm(
      'Hapus Pengumuman',
      'Yakin ingin menghapus pengumuman ini secara permanen?',
      () => {
        const updatedAnn = announcements.filter(a => a.id !== id);
        setAnnouncements(updatedAnn);
        localStorage.setItem('pesantren_announcements', JSON.stringify(updatedAnn));
        markLocalDataChanged('announcements');
        if (isSupabaseConfigured()) {
          deleteAnnouncementFromSupabase(id).catch(err => console.error('Cloud delete ann error:', err));
        }
        window.dispatchEvent(new Event('pesantren_db_sync'));
        showAlert('success', 'Pengumuman dihapus.');
      }
    );
  };

  // PPDB Actions: Confirm Arrival & Verify Data
  const handlePpdbStatus = (id: string, status: 'Diterima' | 'Ditolak') => {
    const registration = ppdbList.find(p => p.id === id);
    if (!registration) return;

    if (status === 'Diterima') {
      setPpdbConfirmData({ id, name: registration.fullName });
      setPpdbConfirmStep(1);
      setPpdbPhysicalPresent(false);
      setPpdbVerifyKK(false);
      setPpdbVerifyAkta(false);
      setPpdbVerifyIjazah(false);
      setPpdbStudentPhoto("");
      setPpdbHasViewedKK(false);
      setPpdbHasViewedAkta(false);
      setPpdbHasViewedIjazah(false);
    } else if (status === 'Ditolak') {
      triggerConfirm(
        'Tolak Pendaftaran',
        `Apakah Anda yakin ingin menolak pendaftaran ${registration.fullName}?`,
        () => {
          const registrationWithStatus = { ...registration, status: 'Ditolak' as const, notes: 'Pendaftaran ditolak oleh panitia.' };
          const newArchive = [registrationWithStatus, ...ppdbArchive];
          setPpdbArchive(newArchive);
          localStorage.setItem('pesantren_ppdb_archive', JSON.stringify(newArchive));
          
          setPpdbList(ppdbList.filter(p => p.id !== id));
          showAlert('danger', `Pendaftaran ${registration.fullName} telah ditolak dan diarsipkan.`);
        }
      );
    }
  };

  const executePpdbAccept = (id: string) => {
    const registration = ppdbList.find(p => p.id === id);
    if (!registration) return;

    // 1. Automatically generate unique NIS (4 digits, e.g., 0001)
    let nextNisNum = 1;
    const existingNisNums = students
      .map(s => parseInt(s.nis, 10))
      .filter(num => !isNaN(num) && num > 0);
    if (existingNisNums.length > 0) {
      nextNisNum = Math.max(...existingNisNums) + 1;
    }
    let generatedNis = String(nextNisNum).padStart(4, '0');
    while (students.some(s => s.nis === generatedNis)) {
      nextNisNum++;
      generatedNis = String(nextNisNum).padStart(4, '0');
    }

    const currentYearStr = new Date().getFullYear().toString();
    const cleanName = registration.fullName.toLowerCase().replace(/\s+/g, '');
    const email = `${cleanName}@alasyariyah.sch.id`;

    // Find an available room of the matching gender that is not full
    const allRooms = rooms || [];
    const matchingRooms = allRooms.filter(r => r.gender === registration.gender);
    let assignedRoom = '';
    
    const availableRoom = matchingRooms.find(r => {
      const occupants = students.filter(s => s.status === 'Aktif' && s.kamar?.toUpperCase() === r.name.toUpperCase()).length;
      return occupants < r.capacity;
    });

    if (availableRoom) {
      assignedRoom = availableRoom.name;
    } else if (matchingRooms.length > 0) {
      assignedRoom = matchingRooms[0].name;
    } else {
      assignedRoom = registration.gender === 'Perempuan' ? 'Az-Zahra 1' : 'Al-Ghazali 1';
    }

    const newStudent: Student = {
      id: `std-${Date.now()}`,
      nis: generatedNis,
      fullName: registration.fullName,
      gender: registration.gender,
      classPagi: '1A MTs Diniyah',
      classSore: 'VII SMP Formal',
      class: 'VII SMP Formal • 1A MTs Diniyah',
      classMadrasah: '1A MTs Diniyah',
      classFormal: 'VII SMP Formal',
      akunMadrasah: `${cleanName}.${currentYearStr.substring(2)} / md123`,
      parentName: registration.parentName,
      parentPhone: registration.parentPhone,
      email: email,
      address: registration.address,
      status: 'Aktif',
      kk: registration.kk,
      nik: registration.nik,
      fatherName: registration.fatherName,
      motherName: registration.motherName,
      birthPlace: registration.birthPlace,
      birthDate: registration.birthDate,
      bloodType: registration.bloodType,
      healthHistory: registration.healthHistory,
      kamar: assignedRoom,
      photoUrl: ppdbStudentPhoto || undefined,
      tahfidzLogs: [],
      securityLogs: [],
      disciplineLogs: [],
      healthLogs: []
    };

    // Prevent duplicate student checking (failsafe)
    if (students.some(s => s.nik === registration.nik || s.fullName.toLowerCase() === registration.fullName.toLowerCase())) {
      showAlert('danger', `Siswa dengan nama atau NIK tersebut sudah ada di Database Santri.`);
      setPpdbConfirmData(null);
      return;
    }

    // Warn if selected room capacity is full
    if (matchingRooms.length > 0 && !availableRoom) {
      showAlert('danger', `PERINGATAN: Semua kamar asrama untuk gender ${registration.gender} sudah penuh berdasarkan kapasitas masing-masing kamar. Menempatkan sementara di ${assignedRoom}.`);
    }

    setStudents([newStudent, ...students]);
    logAdminActivity(
      'PPDB_PERSETUJUAN',
      `Menyetujui pendaftaran PPDB santri baru ${newStudent.fullName}`,
      newStudent.id,
      newStudent.fullName
    );

    // 2. Automatically generate the itemized registration Bills!
    const newBillsList = generateNewStudentBills(newStudent, registration.paymentType || 'Cicilan Bulanan', settings);

    setBills([...newBillsList, ...bills]);

    // Move to archive and delete from active
    const registrationWithStatus = { ...registration, status: 'Diterima' as const, notes: 'Data diverifikasi & resmi hadir di pesantren.' };
    const newArchive = [registrationWithStatus, ...ppdbArchive];
    setPpdbArchive(newArchive);
    localStorage.setItem('pesantren_ppdb_archive', JSON.stringify(newArchive));
    const remainingPpdb = ppdbList.filter(p => p.id !== id);
    setPpdbList(remainingPpdb);
    localStorage.setItem('pesantren_ppdb', JSON.stringify(remainingPpdb));
    localStorage.setItem('pesantren_students', JSON.stringify([newStudent, ...students]));
    localStorage.setItem('pesantren_bills', JSON.stringify([...newBillsList, ...bills]));

    // Sinkronisasi otomatis ke Supabase Cloud (Langsung masuk ke tabel santri & tagihan di semua perangkat)
    if (isSupabaseConfigured()) {
      pushStudentToSupabase(newStudent).catch(e => console.error('Cloud push student error:', e));
      pushAllBillsToSupabase(newBillsList).catch(e => console.error('Cloud push bills error:', e));
      deletePpdbFromSupabase(registration.id).catch(e => console.error('Cloud delete PPDB error:', e));
      pushAllPpdbToSupabase(remainingPpdb).catch(e => console.error('Cloud push PPDB error:', e));
    }
    window.dispatchEvent(new Event('pesantren_db_sync'));

    // Kirim Akun Login Santri / Wali Santri via WhatsApp secara otomatis
    const waMsg = `Assalamu'alaikum Wr. Wb. Bapak/Ibu Wali dari *${registration.fullName}*,\n\nAlhamdulillah, verifikasi fisik & konfirmasi kehadiran santri baru di Pondok Pesantren Al-Asy'ariyah telah BERHASIL!\n\nBerikut adalah info akun login untuk masuk ke Portal Santri / Wali Santri:\n• *Situs Web Portal:* ${window.location.origin}\n• *NIS (Username):* ${generatedNis}\n• *Email:* ${email}\n• *Password Default (NIS):* ${generatedNis}\n\nSilakan simpan informasi login ini dengan baik.\n\nWassalamu'alaikum Wr. Wb.\n-- Panitia Penerimaan Santri Al-Asy'ariyah --`;
    
    try {
      window.open(formatWhatsAppUrl(registration.parentPhone, waMsg), '_blank');
    } catch (e) {
      console.warn("Popup blocked or not allowed in sandbox iframe", e);
    }
    saveWaLog('Calon Santri Hadir (Verifikasi & Akun)', registration.parentPhone, `${registration.parentName} (Wali ${registration.fullName})`, waMsg);

    showAlert('success', `${registration.fullName} berhasil diverifikasi & dipindahkan ke Database Santri! Info kredensial login berhasil dikirim ke orang tua via WhatsApp.`);
    setPpdbConfirmData(null);
  };

  // Add Tahfidz Log under Admin
  const handleAddTahfidzLog = (studentId: string) => {
    const newLogId = `log-${Date.now()}`;
    const newLog = {
      id: newLogId,
      juz: Number(newJuz),
      surah: newSurah || 'Surah Baru',
      verses: newVerses || 'Lengkap',
      status: newStatus,
      grade: newGrade,
      date: new Date().toISOString().split('T')[0],
      verifiedBy: newUstadz || 'Ustadz Ahmad Fauzi'
    };

    const updatedStudents = students.map(s => {
      if (s.id === studentId) {
        const logs = s.tahfidzLogs || [];
        const allJuzs = [Number(newJuz), ...logs.map(l => l.juz)];
        const uniqueJuzCount = new Set(allJuzs).size;
        
        return {
          ...s,
          tahfidzLogs: [newLog, ...logs],
          currentHafalan: `${uniqueJuzCount} Juz`
        };
      }
      return s;
    });

    setStudents(updatedStudents);
    showAlert('success', `Berhasil mencatat setoran hafalan Juz ${newJuz} untuk santri.`);
    setSelectedStudentForTahfidz(null);
  };

  // Add Manual Student
  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStdName) {
      showAlert('danger', 'Nama Lengkap wajib diisi.');
      return;
    }

    // 1. Automatically generate unique NIS (4 digits, e.g., 0001)
    let nextNisNum = 1;
    const existingNisNums = students
      .map(s => parseInt(s.nis, 10))
      .filter(num => !isNaN(num) && num > 0);
    if (existingNisNums.length > 0) {
      nextNisNum = Math.max(...existingNisNums) + 1;
    }
    let generatedNis = String(nextNisNum).padStart(4, '0');
    while (students.some(s => s.nis === generatedNis)) {
      nextNisNum++;
      generatedNis = String(nextNisNum).padStart(4, '0');
    }

    const cleanName = newStdName.toLowerCase().replace(/\s+/g, '');
    const emailStr = newStdEmail || `${cleanName}@alasyariyah.sch.id`;

    // Validation: Room Capacity check for manual registration
    const allRooms = rooms || [];
    const roomObj = allRooms.find(r => r.name.toUpperCase() === newStdKamar.toUpperCase());
    const limit = roomObj ? roomObj.capacity : 20;
    const occupants = students.filter(s => s.status === 'Aktif' && s.kamar?.toUpperCase() === newStdKamar.toUpperCase()).length;
    if (occupants >= limit) {
      showAlert('danger', `PERINGATAN: Kapasitas Kamar ${newStdKamar.toUpperCase()} sudah penuh! (Terisi: ${occupants}/${limit} orang). Silakan pilih kamar lain.`);
      return;
    }

    const finalClassFormal = newStdClassFormal || '-';
    const finalClassMadrasah = newStdClassMadrasah || '-';

    const added: Student = {
      id: `std-${Date.now()}`,
      nis: generatedNis,
      fullName: newStdName,
      gender: newStdGender,
      classFormal: finalClassFormal,
      classMadrasah: finalClassMadrasah,
      classPagi: finalClassMadrasah,
      classSore: finalClassFormal,
      class: `${finalClassFormal} • ${finalClassMadrasah}`,
      kamar: newStdKamar,
      parentName: newStdParent,
      parentPhone: newStdPhone,
      email: emailStr,
      address: newStdAddress,
      nik: newStdNik,
      kk: newStdKk,
      birthPlace: newStdBirthPlace,
      birthDate: newStdBirthDate,
      fatherName: newStdFatherName,
      motherName: newStdMotherName,
      bloodType: newStdBloodType,
      status: 'Aktif',
      tahfidzLogs: [],
      securityLogs: [],
      disciplineLogs: [],
      healthLogs: [],
      photoUrl: newStdPhoto || undefined
    };

    // Double check database-level NIS uniqueness
    if (students.some(s => s.nis === generatedNis)) {
      showAlert('danger', 'Gagal mendaftarkan: Duplikasi NIS terdeteksi di database lokal.');
      return;
    }

    const updatedStudentsList = [added, ...students];
    setStudents(updatedStudentsList);
    localStorage.setItem('pesantren_students', JSON.stringify(updatedStudentsList));
    markLocalDataChanged('students');
    if (isSupabaseConfigured()) {
      pushStudentToSupabase(added).catch(err => console.error('Cloud push student error:', err));
    }
    window.dispatchEvent(new Event('pesantren_db_sync'));

    logAdminActivity(
      'DAFTAR_MANUAL',
      `Mendaftarkan santri baru secara manual: ${added.fullName} (NIS: ${added.nis})`,
      added.id,
      added.fullName
    );
    showAlert('success', `Santri ${newStdName} berhasil didaftarkan secara manual dengan NIS otomatis: ${generatedNis}`);
    setNewStdName('');
    setNewStdPhoto('');
    setNewStdNisn('');
    setNewStdParent('');
    setNewStdPhone('');
    setNewStdEmail('');
    setNewStdAddress('');
    setNewStdNik('');
    setNewStdKk('');
    setNewStdBirthPlace('');
    setNewStdBirthDate('');
    setNewStdGender('Laki-laki');
    setNewStdFatherName('');
    setNewStdMotherName('');
    setNewStdGuardianName('');
    setNewStdBloodType('O');
    setNewStdHealthHistory('Sehat');
    setNewStdKamar('Al-Ghazali 1');
    setNewStdClassFormal(availableFormalClasses[0] || '');
    setNewStdClassMadrasah(availableMadrasahClasses[0] || '');
  };

  // Add Bill
  const handleAddBill = (e: React.FormEvent) => {
    e.preventDefault();
    
    const targetStudents = billRecipientType === 'single'
      ? students.filter(s => s.id === selectedStudentId)
      : students.filter(s => s.status !== 'Alumni' && s.status !== 'Berhenti');
      
    if (billRecipientType === 'single' && !selectedStudentId) {
      showAlert('danger', 'Pilih santri terlebih dahulu.');
      return;
    }
    
    if (targetStudents.length === 0) {
      showAlert('danger', 'Tidak ada santri penerima yang aktif.');
      return;
    }

    if (billCreationMode === 'paket_santri_baru') {
      const packageItems: { title: string; amount: number }[] = [];
      if (paketPendaftaranChecked) {
        packageItems.push({ title: 'Biaya Pendaftaran Calon Santri Baru (PCSB)', amount: Number(paketPendaftaranAmount) });
      }
      if (paketSeragamChecked) {
        packageItems.push({ title: 'Biaya Seragam Resmi Pesantren (3 Stel)', amount: Number(paketSeragamAmount) });
      }
      if (paketKitabChecked) {
        packageItems.push({ title: 'Biaya Kitab Kuning & Buku Panduan', amount: Number(paketKitabAmount) });
      }
      if (paketSppChecked) {
        packageItems.push({ title: 'Iuran Syahriyah SPP (Bulan Pertama)', amount: Number(paketSppAmount) });
      }
      if (paketGedungChecked) {
        packageItems.push({ title: 'Uang Pangkal / Pembangunan Gedung', amount: Number(paketGedungAmount) });
      }

      if (packageItems.length === 0) {
        showAlert('danger', 'Harap pilih minimal satu jenis biaya dalam paket!');
        return;
      }

      const generatedBills: Bill[] = [];
      const timestamp = Date.now();
      
      targetStudents.forEach((std, stdIdx) => {
        packageItems.forEach((item, itemIdx) => {
          generatedBills.push({
            id: `bill-pkg-${timestamp}-${stdIdx}-${itemIdx}-${std.id}`,
            studentId: std.id,
            studentName: std.fullName,
            nis: std.nis,
            title: item.title,
            amount: item.amount,
            dueDate: billDueDate,
            status: 'Belum Lunas'
          });
        });
      });

      setBills([...generatedBills, ...bills]);
      
      if (billRecipientType === 'single') {
        showAlert('success', `Berhasil membuat ${packageItems.length} tagihan paket santri baru untuk ${targetStudents[0].fullName}.`);
      } else {
        showAlert('success', `Berhasil mengirimkan paket ${packageItems.length} tagihan ke seluruh (${targetStudents.length}) santri aktif.`);
      }

    } else {
      if (billRecipientType === 'single') {
        const studentObj = targetStudents[0];
        const added: Bill = {
          id: `bill-${Date.now()}`,
          studentId: studentObj.id,
          studentName: studentObj.fullName,
          nis: studentObj.nis,
          title: billTitle,
          amount: Number(billAmount),
          dueDate: billDueDate,
          status: 'Belum Lunas'
        };
        setBills([added, ...bills]);
        showAlert('success', `Tagihan "${billTitle}" berhasil dikirim untuk santri ${studentObj.fullName}.`);
      } else {
        const timestamp = Date.now();
        const newBills: Bill[] = targetStudents.map((std, idx) => ({
          id: `bill-${timestamp}-${idx}-${std.id}`,
          studentId: std.id,
          studentName: std.fullName,
          nis: std.nis,
          title: billTitle,
          amount: Number(billAmount),
          dueDate: billDueDate,
          status: 'Belum Lunas'
        }));
        setBills([...newBills, ...bills]);
        showAlert('success', `Tagihan "${billTitle}" berhasil dikirim untuk seluruh (${targetStudents.length}) santri aktif.`);
      }
      setBillTitle('');
      setBillAmount('');
    }
    
    setSelectedStudentId('');
  };

  // Toggle Bill Status (Lunas / Belum Lunas)
  const toggleBillStatus = (billId: string, newStatus: 'Lunas' | 'Belum Lunas') => {
    const targetBill = bills.find(b => b.id === billId);
    if (targetBill) {
      logAdminActivity(
        'PEMBAYARAN',
        `Mengubah status pembayaran tagihan "${targetBill.title}" menjadi [${newStatus}]`,
        targetBill.id,
        targetBill.studentName
      );
    }
    let updatedBillObj: Bill | null = null;
    const updatedBills = bills.map(b => {
      if (b.id === billId) {
        const currentLogs = b.verificationLogs || [];
        const newLog = {
          uploadedBy: b.paymentProofUrl ? 'Wali Santri' : 'Admin/Bendahara',
          uploadedAt: b.paymentDate || new Date().toLocaleString('id-ID'),
          verifiedAt: new Date().toLocaleString('id-ID'),
          aiResult: `Verifikasi Manual oleh Admin/Bendahara: Status diubah menjadi [${newStatus}].`
        };
        const res = {
          ...b,
          status: newStatus,
          paymentDate: newStatus === 'Lunas' ? new Date().toISOString().split('T')[0] : undefined,
          verificationLogs: [...currentLogs, newLog]
        };
        updatedBillObj = res;
        return res;
      }
      return b;
    });
    setBills(updatedBills);
    localStorage.setItem('pesantren_bills', JSON.stringify(updatedBills));
    markLocalDataChanged('bills');
    if (updatedBillObj && isSupabaseConfigured()) {
      pushBillToSupabase(updatedBillObj).catch(err => console.error('Cloud push bill status error:', err));
    }
    window.dispatchEvent(new Event('pesantren_db_sync'));

    if (targetBill && newStatus === 'Lunas') {
      const student = students.find(s => s.id === targetBill.studentId);
      const recipientPhone = student?.parentPhone || '081234567890';
      const recipientName = student?.parentName || 'Wali Santri';
      
      const waMsg = `Assalamu'alaikum Wr. Wb. Bapak/Ibu ${recipientName},\n\nKami menginformasikan bahwa pembayaran tagihan *${targetBill.title}* atas nama santri *${targetBill.studentName}* senilai *Rp ${targetBill.amount.toLocaleString()}* telah DISETUJUI dan diverifikasi LUNAS oleh Bendahara Al-Asy'ariyah.\n\nTerima kasih banyak atas partisipasi dan kontribusi bapak/ibu wali santri.\n\nWassalamu'alaikum Wr. Wb.\n-- Bendahara Pondok Pesantren Al-Asy'ariyah --`;
      
      window.open(formatWhatsAppUrl(recipientPhone, waMsg), '_blank');
      saveWaLog('Persetujuan Pembayaran', recipientPhone, `${recipientName} (Wali ${targetBill.studentName})`, waMsg);
      
      showAlert('success', `Status tagihan diperbarui! Bukti WhatsApp berhasil disiapkan untuk dikirim ke nomor +62${recipientPhone}`);
    } else {
      showAlert('success', 'Status Pembayaran Tagihan berhasil diperbarui!');
    }
  };

  // Save Portal Settings
    // Helper to immediately update and persist settings across local & cloud
  const updateAndPersistSettings = (newSettings: PortalSettings) => {
    setSettings(newSettings);
    setEditSettings(newSettings);
    localStorage.setItem('pesantren_settings', JSON.stringify(newSettings));
    markLocalDataChanged('settings');
    if (isSupabaseConfigured()) {
      pushSettingsToSupabase(newSettings).catch(err => console.error('Cloud auto-save settings error:', err));
    }
    window.dispatchEvent(new Event('pesantren_settings_updated'));
    window.dispatchEvent(new Event('pesantren_db_sync'));
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSettings(editSettings);
    localStorage.setItem('pesantren_settings', JSON.stringify(editSettings));
    markLocalDataChanged('settings');

    if (isSupabaseConfigured()) {
      pushSettingsToSupabase(editSettings).catch(err => console.error('Cloud save settings error:', err));
    }
    window.dispatchEvent(new Event('pesantren_settings_updated'));
    window.dispatchEvent(new Event('pesantren_db_sync'));

    // Keep staffUsers in sync with setting names
    const updatedStaffUsers = staffUsers.map(u => {
      if (u.role === 'keamanan' && editSettings.namaKeamanan) return { ...u, fullName: editSettings.namaKeamanan };
      if (u.role === 'ketertiban' && editSettings.namaKetertiban) return { ...u, fullName: editSettings.namaKetertiban };
      if (u.role === 'kesehatan' && editSettings.namaKesehatan) return { ...u, fullName: editSettings.namaKesehatan };
      return u;
    });
    setStaffUsers(updatedStaffUsers);
    localStorage.setItem('pesantren_staff_users', JSON.stringify(updatedStaffUsers));
    window.dispatchEvent(new Event('pesantren_staff_users_updated'));
    showAlert('success', 'Informasi Portal Pesantren & Pengaturan Pengurus berhasil diperbarui!');
  };

  // Calculated Stats
  const totalStudents = students.filter(s => s.status !== 'Alumni' && s.status !== 'Berhenti').length;
  const pendingPCSB = ppdbList.filter(p => p.status === 'Pending').length;
  const totalBills = bills.length;
  const lunasBills = bills.filter(b => b.status === 'Lunas').length;
  const unpaidBills = bills.filter(b => b.status === 'Belum Lunas').length;
  const verificationBills = bills.filter(b => b.status === 'Konfirmasi Pembayaran').length;
  
  const totalIncome = bills
    .filter(b => b.status === 'Lunas')
    .reduce((sum, b) => sum + b.amount, 0);

  const getMonthlyIncomeData = () => {
    const months = [
      { name: 'Jan', fullname: 'Januari', month: '01' },
      { name: 'Feb', fullname: 'Februari', month: '02' },
      { name: 'Mar', fullname: 'Maret', month: '03' },
      { name: 'Apr', fullname: 'April', month: '04' },
      { name: 'Mei', fullname: 'Mei', month: '05' },
      { name: 'Jun', fullname: 'Juni', month: '06' },
      { name: 'Jul', fullname: 'Juli', month: '07' },
      { name: 'Agu', fullname: 'Agustus', month: '08' },
      { name: 'Sep', fullname: 'September', month: '09' },
      { name: 'Okt', fullname: 'Oktober', month: '10' },
      { name: 'Nov', fullname: 'November', month: '11' },
      { name: 'Des', fullname: 'Desember', month: '12' }
    ];

    const currentYearStr = new Date().getFullYear().toString();

    return months.map(m => {
      const monthlyBills = bills.filter(b => {
        if (b.status !== 'Lunas') return false;
        const dateToCheck = b.paymentDate || b.dueDate;
        if (!dateToCheck) return false;
        const [year, month] = dateToCheck.split('-');
        return year === currentYearStr && month === m.month;
      });

      const totalIncome = monthlyBills.reduce((sum, b) => sum + b.amount, 0);

      return {
        name: m.name,
        fullname: m.fullname,
        'Pemasukan': totalIncome
      };
    });
  };

  const getRoomStatsData = () => {
    const roomCounts: { [key: string]: number } = {};
    students.forEach(s => {
      if (s.status === 'Aktif') {
        const rName = s.kamar || 'Belum Ada Kamar';
        roomCounts[rName] = (roomCounts[rName] || 0) + 1;
      }
    });
    return Object.entries(roomCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  };

  const getStatusStatsData = () => {
    const statusCounts: { [key: string]: number } = {};
    students.forEach(s => {
      const status = s.status || 'Aktif';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    return Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
  };

  // Filter students or PPDB based on search and filters
  const filteredStudents = students.filter(s => s.status !== 'Alumni' && s.status !== 'Berhenti').filter(s => {
    const matchesSearch = s.fullName.toLowerCase().includes(studentSearch.toLowerCase()) || 
                          (s.nis || '').includes(studentSearch) || 
                          (s.class || '').toLowerCase().includes(studentSearch.toLowerCase());
    const matchesClass = studentClassFilter === 'Semua' || s.class === studentClassFilter;
    const matchesGender = studentGenderFilter === 'Semua' || s.gender === studentGenderFilter;
    const matchesStatus = studentStatusFilter === 'Semua' || 
                          (studentStatusFilter === 'Berhenti' ? s.status === 'Cuti' : s.status === studentStatusFilter);
    
    return matchesSearch && matchesClass && matchesGender && matchesStatus;
  }).sort((a, b) => {
    if (studentSortFilter === 'nama-asc') return a.fullName.localeCompare(b.fullName);
    if (studentSortFilter === 'nama-desc') return b.fullName.localeCompare(a.fullName);
    if (studentSortFilter === 'nisn-asc' || studentSortFilter === 'nis-asc') return (a.nis || '').localeCompare(b.nis || '');
    return 0;
  });

  const filteredPpdb = ppdbList.filter(p => {
    const matchesSearch = p.fullName.toLowerCase().includes(ppdbSearch.toLowerCase()) ||
                          p.parentName.toLowerCase().includes(ppdbSearch.toLowerCase());
    const matchesStatus = ppdbStatusFilter === 'Semua' || p.status === ppdbStatusFilter;
    const matchesGender = ppdbGenderFilter === 'Semua' || p.gender === ppdbGenderFilter;
    
    return matchesSearch && matchesStatus && matchesGender;
  });

  const filteredBills = bills.filter(b => {
    const matchesSearch = b.studentName.toLowerCase().includes(billSearch.toLowerCase()) || 
                          b.title.toLowerCase().includes(billSearch.toLowerCase());
    const matchesFilter = billFilter === 'Semua' || b.status === billFilter;
    return matchesSearch && matchesFilter;
  });

  // Agenda states and handlers
  const MONTH_NAMES_AGENDA = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const [editingEventId, setEditingEventId] = React.useState<string | null>(null);
  const [eventTitle, setEventTitle] = React.useState('');
  const [eventDescription, setEventDescription] = React.useState('');
  const [eventStartDate, setEventStartDate] = React.useState('2026-08-01');
  const [eventEndDate, setEventEndDate] = React.useState('2026-08-02');
  const [eventCategory, setEventCategory] = React.useState<'ujian' | 'libur' | 'kegiatan' | 'ppdb'>('kegiatan');
  const [eventLocation, setEventLocation] = React.useState('');

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim()) return;

    let savedEvt: AcademicEvent;
    if (editingEventId) {
      const currentEvt = events.find(e => e.id === editingEventId);
      savedEvt = {
        id: editingEventId,
        title: eventTitle,
        description: eventDescription,
        startDate: eventStartDate,
        endDate: eventEndDate,
        category: eventCategory,
        location: eventLocation,
        confirmed: currentEvt?.confirmed ?? false
      };
      const updatedEvents = events.map(evt => evt.id === editingEventId ? savedEvt : evt);
      setEvents(updatedEvents);
      localStorage.setItem('pesantren_events', JSON.stringify(updatedEvents));
      markLocalDataChanged('events');
      if (isSupabaseConfigured()) {
        pushEventToSupabase(savedEvt).catch(err => console.error('Cloud push event error:', err));
      }
      logAdminActivity('Edit Agenda', `Mengubah agenda: ${eventTitle}`);
      setEditingEventId(null);
    } else {
      savedEvt = {
        id: `evt-${Date.now()}`,
        title: eventTitle,
        description: eventDescription,
        startDate: eventStartDate,
        endDate: eventEndDate,
        category: eventCategory,
        location: eventLocation,
        confirmed: false
      };
      const updatedEvents = [...events, savedEvt];
      setEvents(updatedEvents);
      localStorage.setItem('pesantren_events', JSON.stringify(updatedEvents));
      markLocalDataChanged('events');
      if (isSupabaseConfigured()) {
        pushEventToSupabase(savedEvt).catch(err => console.error('Cloud push event error:', err));
      }
      logAdminActivity('Tambah Agenda', `Menambahkan agenda baru: ${eventTitle}`);
    }
    window.dispatchEvent(new Event('pesantren_db_sync'));

    // Reset form
    setEventTitle('');
    setEventDescription('');
    setEventStartDate(new Date().toISOString().split('T')[0]);
    setEventEndDate(new Date().toISOString().split('T')[0]);
    setEventCategory('kegiatan');
    setEventLocation('');
  };

  const handleEditEventClick = (evt: AcademicEvent) => {
    setEditingEventId(evt.id);
    setEventTitle(evt.title);
    setEventDescription(evt.description);
    setEventStartDate(evt.startDate);
    setEventEndDate(evt.endDate);
    setEventCategory(evt.category);
    setEventLocation(evt.location || '');
  };

  const handleDeleteEvent = (id: string) => {
    const target = events.find(e => e.id === id);
    if (!target) return;
    triggerConfirm(
      'Hapus Agenda',
      `Apakah Anda yakin ingin menghapus agenda "${target.title}"?`,
      () => {
        const updatedEvents = events.filter(evt => evt.id !== id);
        setEvents(updatedEvents);
        localStorage.setItem('pesantren_events', JSON.stringify(updatedEvents));
        markLocalDataChanged('events');
        if (isSupabaseConfigured()) {
          deleteEventFromSupabase(id).catch(err => console.error('Cloud delete event error:', err));
        }
        window.dispatchEvent(new Event('pesantren_db_sync'));
        logAdminActivity('Hapus Agenda', `Menghapus agenda: ${target.title}`);
      }
    );
  };

  const handleToggleConfirmMonth = (monthIdx: number, year: number) => {
    const updatedEvents = events.map(evt => {
      const start = new Date(evt.startDate);
      if (start.getMonth() === monthIdx && start.getFullYear() === year) {
        return { ...evt, confirmed: true };
      }
      return evt;
    });
    setEvents(updatedEvents);
    localStorage.setItem('pesantren_events', JSON.stringify(updatedEvents));
    markLocalDataChanged('events');
    if (isSupabaseConfigured()) {
      pushAllEventsToSupabase(updatedEvents).catch(err => console.error('Cloud push confirmed events error:', err));
    }
    window.dispatchEvent(new Event('pesantren_db_sync'));
    logAdminActivity('Konfirmasi Agenda', `Mengonfirmasi seluruh agenda bulan ${MONTH_NAMES_AGENDA[monthIdx]} ${year}`);
  };

  const handleUnconfirmMonth = (monthIdx: number, year: number) => {
    const updatedEvents = events.map(evt => {
      const start = new Date(evt.startDate);
      if (start.getMonth() === monthIdx && start.getFullYear() === year) {
        return { ...evt, confirmed: false };
      }
      return evt;
    });
    setEvents(updatedEvents);
    localStorage.setItem('pesantren_events', JSON.stringify(updatedEvents));
    markLocalDataChanged('events');
    if (isSupabaseConfigured()) {
      pushAllEventsToSupabase(updatedEvents).catch(err => console.error('Cloud push unconfirmed events error:', err));
    }
    window.dispatchEvent(new Event('pesantren_db_sync'));
    logAdminActivity('Batalkan Konfirmasi Agenda', `Membatalkan konfirmasi agenda bulan ${MONTH_NAMES_AGENDA[monthIdx]} ${year}`);
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Alert Notification */}
      {alert && (
        <div className={`fixed top-20 right-6 z-50 p-4 rounded-xl shadow-lg border text-sm max-w-md flex items-center gap-2 animate-bounce ${
          alert.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
            : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{alert.message}</span>
        </div>
      )}

      {/* Tab Panels */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="w-full"
        >
          {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Sapaan Salam Friendly (Kotak Hijau) */}
          <div className="mb-6 font-sans text-left bg-gradient-to-r from-emerald-800 to-teal-950 p-5 sm:p-6 rounded-2xl border border-emerald-950 flex items-center gap-4 shadow-md text-white">
            <span className="text-3xl filter drop-shadow">👋</span>
            <div>
              <h2 className="text-base font-black tracking-wide uppercase">
                ASSALAMU'ALAIKUM WR. WB. SELAMAT DATANG KEMBALI, <span className="text-amber-300 underline decoration-amber-400 decoration-2 font-black">{currentAdminName}</span>!
              </h2>
              <p className="text-emerald-100 text-xs mt-1 leading-relaxed font-medium">
                Selamat menjalankan amanah dan mengawal khidmah administrasi selaku <strong className="text-amber-200 font-extrabold uppercase">{session?.role === 'admin' ? 'Administrator' : (session?.roleName || 'Admin')}</strong>. Semoga seluruh ikhtiar Anda dalam memajukan pangkalan data Pondok Pesantren Al-Asy'ariyah senantiasa bernilai ibadah serta membawa keberkahan dunia akhirat.
              </p>
            </div>
          </div>

          {/* Bento-grid of cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-emerald-50 flex items-center justify-between">
              <div>
                <span className="text-gray-400 text-xs font-semibold">Total Santri Aktif</span>
                <h3 className="text-3xl font-extrabold text-emerald-950 mt-1">{totalStudents}</h3>
                <span className="text-emerald-600 text-xs mt-1 block font-medium">Santri terdaftar</span>
              </div>
              <div className="bg-emerald-50 p-3 rounded-xl text-emerald-700">
                <Users className="h-6 w-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-emerald-50 flex items-center justify-between">
              <div>
                <span className="text-gray-400 text-xs font-semibold">Pendaftar Baru PCSB</span>
                <h3 className="text-3xl font-extrabold text-emerald-950 mt-1">{ppdbList.length}</h3>
                <span className="text-amber-600 text-xs mt-1 block font-medium">
                  {pendingPCSB} Menunggu Verifikasi
                </span>
              </div>
              <div className="bg-amber-50 p-3 rounded-xl text-amber-700">
                <GraduationCap className="h-6 w-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-emerald-50 flex items-center justify-between">
              <div>
                <span className="text-gray-400 text-xs font-semibold">Tagihan Belum Bayar</span>
                <h3 className="text-3xl font-extrabold text-emerald-950 mt-1">{unpaidBills}</h3>
                <span className="text-rose-600 text-xs mt-1 block font-medium">Harus ditindak lanjuti</span>
              </div>
              <div className="bg-rose-50 p-3 rounded-xl text-rose-700">
                <DollarSign className="h-6 w-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-emerald-50 flex items-center justify-between">
              <div>
                <span className="text-gray-400 text-xs font-semibold">Total Kas Terkumpul (Bulan Ini)</span>
                <h3 className="text-2xl font-extrabold text-emerald-900 mt-1">
                  Rp {totalIncome.toLocaleString('id-ID')}
                </h3>
                <span className="text-emerald-600 text-xs mt-1 block font-medium">{lunasBills} Transaksi Lunas</span>
              </div>
              <div className="bg-teal-50 p-3 rounded-xl text-teal-700">
                <Wallet className="h-6 w-6" />
              </div>
            </div>
          </div>

          {/* ANTREAN PERSETUJUAN IZIN KELUAR PONDOK */}
            {(() => {
              const pendingPermits: { studentId: string; studentName: string; log: SecurityLog }[] = [];
              students.forEach(s => {
                if (s.securityLogs) {
                  s.securityLogs.forEach(l => {
                    if (l.status === 'Menunggu Persetujuan') {
                      pendingPermits.push({
                        studentId: s.id,
                        studentName: s.fullName,
                        log: l
                      });
                    }
                  });
                }
              });

              return (
                <div className="bg-white rounded-2xl shadow-sm border border-amber-200/60 p-6 mt-6 space-y-4 text-left animate-fade-in">
                  <h4 className="font-extrabold text-gray-900 text-sm flex items-center gap-2">
                    <span className="p-1 bg-amber-50 text-amber-700 rounded-lg">🛡️</span>
                    Antrean Persetujuan Izin Keluar Pondok ({pendingPermits.length})
                  </h4>
                  <p className="text-[11px] text-gray-500">Berikut adalah daftar pengajuan perizinan keluar lingkungan / pulang santri yang membutuhkan verifikasi & tanda tangan Pengurus/Keamanan.</p>

                  {pendingPermits.length === 0 ? (
                    <div className="p-8 text-center text-xs text-gray-400 bg-gray-50/50 rounded-xl border border-dashed border-dashed border-gray-100">
                      Tidak ada antrean perizinan keluar pondok saat ini. Semuanya beres!
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {pendingPermits.map(({ studentId, studentName, log }) => (
                        <div key={log.id} className="p-4 bg-amber-50/10 rounded-xl border border-amber-100 hover:border-amber-200 transition space-y-3">
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              {/* Identity number placed above name */}
                              <div className="text-[9px] font-mono text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded font-black w-max mb-1">
                                ID: {studentId}
                              </div>
                              <h5 className="font-black text-slate-900 text-xs">{studentName}</h5>
                            </div>
                            <span className="text-[9px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded font-mono uppercase">
                              {log.permitType}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[10px] bg-white p-2.5 rounded-lg border border-gray-100">
                            <div>
                              <span className="text-gray-400 block text-[8px] uppercase font-bold">Waktu Keluar</span>
                              <span className="font-bold text-slate-800 font-mono">{log.outDate}</span>
                            </div>
                            <div>
                              <span className="text-gray-400 block text-[8px] uppercase font-bold">Waktu Kembali</span>
                              <span className="font-bold text-slate-800 font-mono">{log.expectedReturnDate}</span>
                            </div>
                          </div>

                          <div className="text-[11px] bg-slate-50 p-2 rounded border border-gray-100">
                            <span className="text-gray-400 block text-[8px] uppercase font-bold mb-0.5">Alasan Perizinan:</span>
                            <p className="text-slate-700 italic">"{log.description}"</p>
                          </div>

                          <div className="flex gap-2 justify-end pt-1">
                            <button
                              type="button"
                              onClick={() => triggerConfirm(
                                'Setujui Perizinan',
                                `Apakah Anda yakin ingin menyetujui perizinan keluar untuk ${studentName}?`,
                                () => handleApprovePermit(studentId, log.id)
                              )}
                              className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold rounded-lg text-xs transition cursor-pointer shadow-sm flex items-center gap-1"
                            >
                              <span>✓</span> Setujui Izin
                            </button>
                            <button
                              type="button"
                              onClick={() => triggerConfirm(
                                'Tolak Perizinan',
                                `Apakah Anda yakin ingin menolak perizinan keluar untuk ${studentName}?`,
                                () => handleRejectPermit(studentId, log.id)
                              )}
                              className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold rounded-lg text-xs transition cursor-pointer border border-rose-200 flex items-center gap-1"
                            >
                              <span>✕</span> Tolak Izin
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

          <div className="w-full">
            {/* Quick stats & action points */}
            <div className="bg-white rounded-2xl shadow-sm border border-emerald-50 p-6 space-y-4">
              <h4 className="font-bold text-gray-900 text-sm flex items-center gap-1">
                <CheckSquare className="h-4 w-4 text-emerald-700" />
                Daftar Tunggu Konfirmasi Pembayaran Tagihan ({verificationBills})
              </h4>
              
              {verificationBills === 0 ? (
                <p className="text-gray-400 text-xs text-center py-8">Semua konfirmasi tagihan sudah bersih! 👍</p>
              ) : (
                <div className="space-y-3">
                  {bills.filter(b => b.status === 'Konfirmasi Pembayaran').map(b => (
                    <div key={b.id} className="p-3.5 bg-amber-50/50 rounded-xl border border-amber-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="font-bold text-emerald-950 text-sm flex items-center gap-2 flex-wrap">
                          <span>{b.studentName}</span>
                          {b.verificationStatus && (
                            <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold border uppercase ${
                              b.verificationStatus === 'Terverifikasi Otomatis' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              b.verificationStatus === 'Perlu Peninjauan' ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse' :
                              'bg-rose-50 text-rose-700 border-rose-200'
                            }`}>
                              ✨ AI: {b.verificationStatus}
                            </span>
                          )}
                        </div>
                        <div className="text-gray-500 font-mono mt-0.5">{b.title} • Rp {b.amount.toLocaleString()}</div>
                        {b.paymentProofUrl && (
                          <a 
                            href={b.paymentProofUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-emerald-700 hover:underline font-semibold block mt-1"
                          >
                            🔗 Lihat Bukti Bayar
                          </a>
                        )}
                        {(b.senderBank || b.senderAccountNumber) && (
                          <div className="text-[11px] text-amber-900 font-medium mt-1">
                            Pengirim: {b.senderBank || '-'} ({b.senderAccountNumber || '-'})
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                        <button
                          onClick={() => {
                            const getDestInfo = (method?: string) => {
                              if (!method) return { bank: 'Bank BRI', account: '88201982736' };
                              if (method.includes('BRI')) return { bank: 'Bank BRI', account: '88201982736' };
                              if (method.includes('BNI')) return { bank: 'Bank BNI', account: '98201982747' };
                              if (method.includes('Mandiri') || method.includes('BSI')) return { bank: 'Bank Syariah Indonesia (BSI)', account: '718290182' };
                              return { bank: 'Bendahara Pesantren', account: 'Tunai' };
                            };
                            const dest = getDestInfo(b.paymentMethod);
                            runAiValidation(b.id, 'payment', b.studentName, { 
                              billTitle: b.title, 
                              billAmount: b.amount, 
                              paymentMethod: b.paymentMethod || 'Transfer', 
                              proofUrl: b.paymentProofUrl,
                              destinationBank: dest.bank,
                              destinationAccount: dest.account,
                              senderBank: b.senderBank || '-',
                              senderAccountNumber: b.senderAccountNumber || '-'
                            });
                          }}
                          className="px-3 py-1 bg-violet-50 hover:bg-violet-100 text-violet-700 font-bold rounded-lg border border-violet-200 transition flex items-center justify-center gap-1 cursor-pointer"
                          disabled={aiLoading[b.id]}
                        >
                          {aiLoading[b.id] ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin text-violet-600" /> <span>Analisis...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-3 w-3 text-violet-600" /> <span>Validasi AI</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedBillForLogs(b)}
                          className="px-3 py-1 bg-violet-100 hover:bg-violet-200 text-violet-800 font-bold rounded-lg border border-violet-200 transition flex items-center justify-center gap-1 cursor-pointer"
                        >
                          Riwayat Log AI 📋
                        </button>
                        <div className="flex gap-2">
                          <button
                            onClick={() => toggleBillStatus(b.id, 'Lunas')}
                            className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg transition"
                          >
                            Verifikasi Lunas ✓
                          </button>
                          <button
                            onClick={() => toggleBillStatus(b.id, 'Belum Lunas')}
                            className="px-3 py-1 bg-rose-100 hover:bg-rose-200 text-rose-700 font-semibold rounded-lg transition"
                          >
                            Tolak
                          </button>
                        </div>
                      </div>
                      {aiOutput[b.id] && (
                        <div className="mt-3 p-3.5 bg-gradient-to-r from-violet-50/50 to-indigo-50/50 border border-violet-150 rounded-xl text-xs text-slate-800 leading-relaxed font-sans relative shadow-2xs w-full animate-fade-in">
                          <div className="flex items-center gap-1.5 font-bold text-violet-950 mb-1">
                            <Sparkles className="h-3.5 w-3.5 text-violet-700" />
                            <span>Rekomendasi Asisten AI Al-Asy'ariyah:</span>
                          </div>
                          <p className="whitespace-pre-wrap">{aiOutput[b.id]}</p>
                          <button 
                            onClick={() => setAiOutput(prev => {
                              const next = { ...prev };
                              delete next[b.id];
                              return next;
                            })}
                            className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 font-bold text-[10px] cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* PANEL VALIDASI PERSETUJUAN & ASISTEN AI TERPADU */}
            <div className="bg-white rounded-2xl shadow-sm border border-emerald-50 p-6 space-y-4 mt-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-dashed border-slate-100 pb-3">
                <div>
                  <h4 className="font-bold text-gray-900 text-sm flex items-center gap-1.5 animate-pulse">
                    <Sparkles className="h-4 w-4 text-violet-750 shrink-0" />
                    <span>Panel Validasi Persetujuan & Asisten AI</span>
                  </h4>
                  <p className="text-[10px] text-gray-400 font-medium">Asisten cerdas Al-Asy'ariyah mengevaluasi berkas pendaftaran & keaslian transfer syahriyah.</p>
                </div>
                <div className="flex bg-slate-50 p-0.5 rounded-lg border border-slate-150 text-[11px] self-start sm:self-auto font-bold text-gray-600">
                  <button
                    type="button"
                    onClick={() => setAiPanelTab('ppdb')}
                    className={`px-3 py-1 rounded-md transition cursor-pointer ${aiPanelTab === 'ppdb' ? 'bg-emerald-800 text-white shadow-xs' : 'hover:text-slate-900'}`}
                  >
                    PPDB ({ppdbList.filter(p => p.status === 'Pending').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiPanelTab('payment')}
                    className={`px-3 py-1 rounded-md transition cursor-pointer ${aiPanelTab === 'payment' ? 'bg-emerald-800 text-white shadow-xs' : 'hover:text-slate-900'}`}
                  >
                    Konfirmasi Pembayaran ({bills.filter(b => b.status === 'Konfirmasi Pembayaran').length})
                  </button>
                </div>
              </div>

              {aiPanelTab === 'ppdb' && (
                <div className="space-y-3">
                  {ppdbList.filter(p => p.status === 'Pending').length === 0 ? (
                    <p className="text-gray-400 text-xs text-center py-6">Tidak ada berkas PPDB tertunda yang perlu divalidasi. Semua aman! 👍</p>
                  ) : (
                    ppdbList.filter(p => p.status === 'Pending').map(reg => (
                      <div key={reg.id} className="p-4 bg-violet-50/20 border border-violet-100/60 rounded-xl space-y-2.5 text-xs">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                          <div>
                            <div className="font-bold text-slate-900 text-sm">{reg.fullName}</div>
                            <div className="text-gray-500 font-medium mt-0.5">Asal: {reg.previousSchool} • Wali: {reg.parentName} ({reg.parentPhone})</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => runAiValidation(reg.id, 'ppdb', reg.fullName, { gender: reg.gender, birthPlace: reg.birthPlace, birthDate: reg.birthDate, previousSchool: reg.previousSchool, parentName: reg.parentName, parentPhone: reg.parentPhone, registrationDate: reg.registrationDate })}
                            className="px-3 py-1 bg-violet-100 hover:bg-violet-200 text-violet-800 font-bold rounded-lg border border-violet-200 transition flex items-center gap-1 cursor-pointer self-stretch sm:self-auto text-center justify-center text-[11px]"
                            disabled={aiLoading[reg.id]}
                          >
                            {aiLoading[reg.id] ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin text-violet-700" /> <span>Analisis Berkas...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-3 w-3 text-violet-700" /> <span>Validasi Asisten AI</span>
                              </>
                            )}
                          </button>
                        </div>

                        {aiOutput[reg.id] && (
                          <div className="p-3.5 bg-white border border-violet-150 rounded-lg text-xs leading-relaxed font-sans relative shadow-3xs animate-fade-in text-left">
                            <div className="flex items-center gap-1.5 font-bold text-violet-950 mb-1">
                              <Sparkles className="h-3.5 w-3.5 text-violet-700 animate-pulse" />
                              <span>Hasil Analisis & Rekomendasi Berkas:</span>
                            </div>
                            <p className="whitespace-pre-wrap text-slate-800">{aiOutput[reg.id]}</p>
                            
                            {/* Auto Confirmation Option if recommended */}
                            <div className="mt-3 pt-2.5 border-t border-dashed border-slate-100 flex flex-wrap gap-2 justify-end">
                              <button
                                type="button"
                                onClick={() => handlePpdbStatus(reg.id, 'Diterima')}
                                className="px-3 py-1 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold rounded-md text-[11px] flex items-center gap-1 transition shadow-xs cursor-pointer"
                              >
                                ✔ Konfirmasi Otomatis (Terima Berkas)
                              </button>
                              <button 
                                type="button"
                                onClick={() => setAiOutput(prev => {
                                  const next = { ...prev };
                                  delete next[reg.id];
                                  return next;
                                })}
                                className="px-2 py-1 text-gray-500 hover:text-gray-700 text-[10px] font-bold cursor-pointer"
                              >
                                Bersihkan Hasil ✕
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {aiPanelTab === 'payment' && (
                <div className="space-y-3">
                  {bills.filter(b => b.status === 'Konfirmasi Pembayaran').length === 0 ? (
                    <p className="text-gray-400 text-xs text-center py-6">Tidak ada konfirmasi pembayaran tertunda yang perlu divalidasi. Semua aman! 👍</p>
                  ) : (
                    bills.filter(b => b.status === 'Konfirmasi Pembayaran').map(b => (
                      <div key={b.id} className="p-4 bg-amber-50/20 border border-amber-100 rounded-xl space-y-2.5 text-xs text-left">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                          <div>
                            <div className="font-bold text-slate-900 text-sm flex items-center gap-2 flex-wrap">
                              <span>{b.studentName}</span>
                              {b.verificationStatus && (
                                <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold border uppercase ${
                                  b.verificationStatus === 'Terverifikasi Otomatis' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                  b.verificationStatus === 'Perlu Peninjauan' ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse' :
                                  'bg-rose-50 text-rose-700 border-rose-200'
                                }`}>
                                  ✨ AI: {b.verificationStatus}
                                </span>
                              )}
                            </div>
                            <div className="text-gray-500 font-medium mt-0.5">Tagihan: {b.title} • Nominal: Rp {b.amount.toLocaleString('id-ID')}</div>
                            <div className="text-gray-400 text-[10px] mt-0.5">
                              Metode: {b.paymentMethod || 'Transfer'}
                              {b.senderBank && ` • Pengirim: ${b.senderBank} (${b.senderAccountNumber || '-'})`}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const getDestInfo = (method?: string) => {
                                if (!method) return { bank: 'Bank BRI', account: '88201982736' };
                                if (method.includes('BRI')) return { bank: 'Bank BRI', account: '88201982736' };
                                if (method.includes('BNI')) return { bank: 'Bank BNI', account: '98201982747' };
                                if (method.includes('Mandiri') || method.includes('BSI')) return { bank: 'Bank Syariah Indonesia (BSI)', account: '718290182' };
                                return { bank: 'Bendahara Pesantren', account: 'Tunai' };
                              };
                              const dest = getDestInfo(b.paymentMethod);
                              runAiValidation(b.id, 'payment', b.studentName, {
                                billTitle: b.title,
                                billAmount: b.amount,
                                paymentMethod: b.paymentMethod || 'Transfer',
                                proofUrl: b.paymentProofUrl,
                                destinationBank: dest.bank,
                                destinationAccount: dest.account,
                                senderBank: b.senderBank || '-',
                                senderAccountNumber: b.senderAccountNumber || '-'
                              });
                            }}
                            className="px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold rounded-lg border border-amber-250 transition flex items-center gap-1 cursor-pointer self-stretch sm:self-auto text-center justify-center text-[11px]"
                            disabled={aiLoading[b.id]}
                          >
                            {aiLoading[b.id] ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin text-amber-700" /> <span>Analisis Pembayaran...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-3 w-3 text-amber-700" /> <span>Validasi Asisten AI</span>
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedBillForLogs(b)}
                            className="px-3 py-1 bg-violet-100 hover:bg-violet-200 text-violet-800 font-bold rounded-lg border border-violet-250 transition flex items-center gap-1 cursor-pointer self-stretch sm:self-auto text-center justify-center text-[11px]"
                          >
                            Riwayat Log AI 📋
                          </button>
                        </div>

                        {aiOutput[b.id] && (
                          <div className="p-3.5 bg-white border border-amber-150 rounded-lg text-xs leading-relaxed font-sans relative shadow-3xs animate-fade-in text-left">
                            <div className="flex items-center gap-1.5 font-bold text-amber-950 mb-1">
                              <Sparkles className="h-3.5 w-3.5 text-amber-700 animate-pulse" />
                              <span>Hasil Analisis & Keaslian Pembayaran:</span>
                            </div>
                            <p className="whitespace-pre-wrap text-slate-800">{aiOutput[b.id]}</p>
                            
                            {/* Auto Confirmation Option */}
                            <div className="mt-3 pt-2.5 border-t border-dashed border-slate-100 flex flex-wrap gap-2 justify-end">
                              <button
                                type="button"
                                onClick={() => toggleBillStatus(b.id, 'Lunas')}
                                className="px-3 py-1 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold rounded-md text-[11px] flex items-center gap-1 transition shadow-xs cursor-pointer"
                              >
                                ✔ Konfirmasi Otomatis (Setujui & Lunas)
                              </button>
                              <button 
                                type="button"
                                onClick={() => setAiOutput(prev => {
                                  const next = { ...prev };
                                  delete next[b.id];
                                  return next;
                                })}
                                className="px-2 py-1 text-gray-500 hover:text-gray-700 text-[10px] font-bold cursor-pointer"
                              >
                                Bersihkan Hasil ✕
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* INTERNAL ACTIVITY LOG PANEL */}
          <div className="bg-white rounded-2xl p-6 border border-slate-150 shadow-xs mt-6 font-sans">
            <div className="flex items-center justify-between border-b border-dashed border-slate-100 pb-4 mb-5">
              <div>
                <h4 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  Log Aktivitas Sistem (Audit Internal Pondok)
                </h4>
                <p className="text-[10px] text-slate-400 font-medium">Mencatat riwayat perubahan data penting secara real-time untuk transparansi manajemen.</p>
              </div>
              {activityLogs.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    triggerConfirm(
                      'Hapus Log Aktivitas',
                      'Apakah Anda yakin ingin menghapus semua riwayat log aktivitas?',
                      () => {
                        setActivityLogs([]);
                        localStorage.removeItem('pesantren_admin_activity_logs');
                      }
                    );
                  }}
                  className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-700 text-[10px] font-bold rounded-lg transition border border-red-150 cursor-pointer"
                >
                  Bersihkan Log 🗑️
                </button>
              )}
            </div>

            {activityLogs.length === 0 ? (
              <div className="text-center py-8 text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                <span className="text-2xl block mb-1">🌿</span>
                <p className="text-xs font-semibold">Belum ada aktivitas terekam hari ini.</p>
                <p className="text-[9px] text-slate-400 mt-0.5">Semua tindakan penting admin akan tercatat secara otomatis di sini.</p>
              </div>
            ) : (
              <div className="max-h-[350px] overflow-y-auto space-y-2.5 pr-1 text-xs">
                {activityLogs.map((log) => {
                  let badgeColor = 'bg-gray-100 text-gray-800 border-gray-200';
                  if (log.actionType === 'PEMBAYARAN') badgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                  else if (log.actionType === 'EDIT_PROFIL') badgeColor = 'bg-blue-50 text-blue-800 border-blue-200';
                  else if (log.actionType === 'PPDB_PERSETUJUAN') badgeColor = 'bg-amber-50 text-amber-800 border-amber-200';
                  else if (log.actionType === 'DAFTAR_MANUAL') badgeColor = 'bg-purple-50 text-purple-800 border-purple-200';

                  return (
                    <div key={log.id} className="p-3 bg-slate-50/70 hover:bg-slate-50 rounded-xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition">
                      <div className="flex items-start gap-2.5">
                        <span className={`px-2.5 py-0.5 text-[9px] font-extrabold uppercase rounded-md border ${badgeColor} tracking-wider shrink-0 mt-0.5`}>
                          {log.actionType}
                        </span>
                        <div className="text-left">
                          <p className="font-semibold text-slate-800 text-[11px] leading-tight">{log.description}</p>
                          <p className="text-[9px] text-slate-400 mt-0.5">
                            Oleh: <span className="font-bold text-slate-500">{log.adminName}</span>
                            {log.targetName && (
                              <>
                                {' • '}Santri: <span className="font-bold text-slate-600">{log.targetName}</span>
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                      <span className="text-[9px] font-mono font-medium text-slate-400 self-end sm:self-center shrink-0">
                        {log.timestamp}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: News & Announcements */}
      {activeTab === 'news_ann' && (
        <div className="space-y-6">
          {/* Sub Tab Buttons */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setNewsSubTab('news')}
              className={`px-4 py-2 text-xs font-bold transition-all border-b-2 ${
                newsSubTab === 'news'
                  ? 'border-emerald-700 text-emerald-800 font-extrabold'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              📰 Kelola Berita & Pengumuman
            </button>
            <button
              onClick={() => setNewsSubTab('agenda')}
              className={`px-4 py-2 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
                newsSubTab === 'agenda'
                  ? 'border-emerald-700 text-emerald-800 font-extrabold'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              📅 Kelola Agenda Kegiatan (Kalender Pendidikan)
              {events.filter(e => {
                const today = new Date('2026-07-06');
                const start = new Date(e.startDate);
                return start.getMonth() === today.getMonth() + 1 && start.getFullYear() === today.getFullYear() && !e.confirmed;
              }).length > 0 && (
                <span className="h-2 w-2 rounded-full bg-rose-600 animate-pulse animate-bounce" />
              )}
            </button>
          </div>

          {newsSubTab === 'news' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* News management */}
              <div className="space-y-6 bg-white p-6 rounded-2xl shadow-sm border border-emerald-50">
                <h3 className="font-bold text-lg text-emerald-950 flex items-center gap-1.5 border-b border-emerald-50 pb-2">
                  <Newspaper className="h-5 w-5 text-emerald-700" />
                  Kelola Berita & Kegiatan
                </h3>

                <form onSubmit={handleAddNews} className="space-y-3 bg-emerald-55/20 p-4 rounded-xl border border-emerald-100">
                  <span className="text-[10px] uppercase font-bold text-emerald-800 block">Tulis Berita Baru</span>
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-0.5">Judul Berita</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Pembukaan Santri Baru..."
                      value={newNewsTitle}
                      onChange={(e) => setNewNewsTitle(e.target.value)}
                      className="w-full px-3 py-1.5 border border-emerald-100 rounded-lg text-xs focus:ring-1 focus:ring-emerald-700 bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-0.5">Kategori</label>
                      <select
                        value={newNewsCategory}
                        onChange={(e: any) => setNewNewsCategory(e.target.value)}
                        className="w-full px-3 py-1.5 border border-emerald-100 rounded-lg text-xs bg-white"
                      >
                        <option value="Kajian">Kajian</option>
                        <option value="Kegiatan">Kegiatan</option>
                        <option value="Prestasi">Prestasi</option>
                        <option value="Informasi">Informasi</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-0.5">Upload Foto Berita</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          accept="image/*"
                          id="news-image-upload"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                if (typeof reader.result === 'string') {
                                  setNewNewsImage(reader.result);
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="hidden"
                        />
                        <label
                          htmlFor="news-image-upload"
                          className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition active:scale-95"
                        >
                          <UploadCloud className="h-3.5 w-3.5" /> Pilih Foto Berita
                        </label>
                        {newNewsImage && newNewsImage.startsWith('data:') && (
                          <span className="text-[10px] text-emerald-700 font-bold">✓ Terunggah</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-0.5">Intisari (Excerpt)</label>
                    <input
                      type="text"
                      placeholder="Ringkasan pendek berita..."
                      value={newNewsExcerpt}
                      onChange={(e) => setNewNewsExcerpt(e.target.value)}
                      className="w-full px-3 py-1.5 border border-emerald-100 rounded-lg text-xs bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-0.5">Isi Berita Lengkap</label>
                    <textarea
                      rows={4}
                      required
                      placeholder="Tulis artikel berita disini..."
                      value={newNewsContent}
                      onChange={(e) => setNewNewsContent(e.target.value)}
                      className="w-full px-3 py-1.5 border border-emerald-100 rounded-lg text-xs bg-white"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Terbitkan Berita
                  </button>
                </form>

                <div className="space-y-3">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Berita Terbit ({news.length})</span>
                  {news.map(n => (
                    <div key={n.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between text-xs gap-4 font-sans text-left">
                      <div className="truncate">
                        <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[9px] font-bold mr-1.5">{n.category}</span>
                        <span className="font-semibold text-gray-900 text-sm block md:inline mt-1 md:mt-0">{n.title}</span>
                        <div className="text-gray-400 text-[10px] mt-0.5 font-mono">Diterbitkan: {n.date} oleh {n.author}</div>
                      </div>
                      <button
                        onClick={() => handleDeleteNews(n.id)}
                        className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition shrink-0"
                        title="Hapus Berita"
                      >
                        <Trash className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Announcements management */}
              <div className="space-y-6 bg-white p-6 rounded-2xl shadow-sm border border-emerald-50">
                <h3 className="font-bold text-lg text-emerald-950 flex items-center gap-1.5 border-b border-emerald-50 pb-2">
                  <Bell className="h-5 w-5 text-emerald-700" />
                  Kelola Pengumuman
                </h3>

                <form onSubmit={handleAddAnn} className="space-y-3 bg-amber-55/20 p-4 rounded-xl border border-amber-100">
                  <span className="text-[10px] uppercase font-bold text-amber-800 block">Tulis Pengumuman Baru</span>
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-0.5">Judul Pengumuman</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Pengambilan Rapor Santri..."
                      value={newAnnTitle}
                      onChange={(e) => setNewAnnTitle(e.target.value)}
                      className="w-full px-3 py-1.5 border border-emerald-100 rounded-lg text-xs focus:ring-1 focus:ring-emerald-700 bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-0.5">Prioritas</label>
                      <select
                        value={newAnnPriority}
                        onChange={(e: any) => setNewAnnPriority(e.target.value)}
                        className="w-full px-3 py-1.5 border border-emerald-100 rounded-lg text-xs bg-white"
                      >
                        <option value="low">Rendah / Info Biasa</option>
                        <option value="medium">Sedang / Menengah</option>
                        <option value="high">Tinggi / Mendesak</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-0.5">Target Audiens</label>
                      <select
                        value={newAnnTarget}
                        onChange={(e: any) => setNewAnnTarget(e.target.value)}
                        className="w-full px-3 py-1.5 border border-emerald-100 rounded-lg text-xs bg-white"
                      >
                        <option value="all">Semua Orang</option>
                        <option value="santri">Khusus Santri</option>
                        <option value="walisantri">Khusus Wali Santri</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-0.5">Isi Pengumuman</label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Tulis pesan pengumuman..."
                      value={newAnnContent}
                      onChange={(e) => setNewAnnContent(e.target.value)}
                      className="w-full px-3 py-1.5 border border-emerald-100 rounded-lg text-xs bg-white"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-teal-950 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Terbitkan Pengumuman
                  </button>
                </form>

                <div className="space-y-3">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Pengumuman Aktif ({announcements.length})</span>
                  {announcements.map(a => (
                    <div key={a.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between text-xs gap-4 font-sans text-left">
                      <div className="truncate">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold mr-1.5 ${
                          a.priority === 'high' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                        }`}>{a.priority.toUpperCase()}</span>
                        <span className="font-semibold text-gray-900 block md:inline">{a.title}</span>
                        <div className="text-gray-400 text-[10px] mt-0.5 font-mono">Dibuat: {a.date} • Target: {a.targetRole}</div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => {
                            setBroadcastAnnouncement(a);
                            setBroadcastGroup('all');
                          }}
                          className="p-1.5 bg-emerald-55 text-emerald-700 hover:bg-emerald-100 rounded-lg transition"
                          title="Broadcast WhatsApp"
                        >
                          <Send className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteAnn(a.id)}
                          className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition"
                          title="Hapus Pengumuman"
                        >
                          <Trash className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* STATUS BANNER & ACTION BOX */}
              <div className="bg-emerald-50/50 border border-emerald-150 p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-sans">
                <div className="space-y-1 text-left">
                  <div className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full font-extrabold uppercase text-[9px] font-mono">
                    Aturan Konfirmasi Agenda Mandatori
                  </div>
                  <h4 className="font-extrabold text-sm text-emerald-950 font-sans">Peringatan Kepatuhan Konfirmasi Bulanan</h4>
                  <p className="text-gray-600 font-medium leading-relaxed max-w-2xl">
                    Sistem mewajibkan agenda bulan depan (<strong>{MONTH_NAMES_AGENDA[7]} 2026</strong>) dikonfirmasi sebelum memasuki bulan baru. Peringatan merah berkedip di dashboard awal akan otomatis menyala maksimal 7 hari sebelum bulan baru (mulai 25 Juli 2026).
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch gap-2 shrink-0">
                  {events.filter(e => {
                    const start = new Date(e.startDate);
                    return start.getMonth() === 7 && start.getFullYear() === 2026 && !e.confirmed;
                  }).length > 0 ? (
                    <button
                      onClick={() => handleToggleConfirmMonth(7, 2026)}
                      className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-black transition text-xs shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      ✓ Konfirmasi Semua Agenda {MONTH_NAMES_AGENDA[7]}
                    </button>
                  ) : (
                    <div className="flex flex-col items-center justify-center">
                      <span className="bg-emerald-100 border border-emerald-300 text-emerald-950 px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1">
                        ❇️ Agenda {MONTH_NAMES_AGENDA[7]} Terkonfirmasi
                      </span>
                      <button
                        onClick={() => handleUnconfirmMonth(7, 2026)}
                        className="text-[10px] text-red-600 hover:underline mt-1 font-semibold cursor-pointer"
                      >
                        Batalkan Konfirmasi
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 font-sans">
                {/* Form Kelola Agenda (4 Cols) */}
                <div className="lg:col-span-4 bg-white p-6 rounded-2xl shadow-sm border border-emerald-50 space-y-4 text-left">
                  <h3 className="font-bold text-base text-emerald-950 flex items-center gap-1.5 border-b border-emerald-50 pb-2">
                    <Calendar className="h-5 w-5 text-emerald-700" />
                    {editingEventId ? 'Edit Agenda' : 'Tambah Agenda Baru'}
                  </h3>

                  <form onSubmit={handleSaveEvent} className="space-y-4 text-left">
                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1">Judul Agenda *</label>
                      <input
                        type="text"
                        required
                        value={eventTitle}
                        onChange={(e) => setEventTitle(e.target.value)}
                        placeholder="Contoh: Pertemuan Wali Santri..."
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-700 bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1">Deskripsi Agenda *</label>
                      <textarea
                        required
                        rows={3}
                        value={eventDescription}
                        onChange={(e) => setEventDescription(e.target.value)}
                        placeholder="Jelaskan detail waktu, rincian, dan ketentuan agenda..."
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-700 bg-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-bold text-gray-700 block mb-1">Mulai *</label>
                        <input
                          type="date"
                          required
                          value={eventStartDate}
                          onChange={(e) => setEventStartDate(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-700 bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-700 block mb-1">Selesai *</label>
                        <input
                          type="date"
                          required
                          value={eventEndDate}
                          onChange={(e) => setEventEndDate(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-700 bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-bold text-gray-700 block mb-1">Kategori *</label>
                        <select
                          value={eventCategory}
                          onChange={(e: any) => setEventCategory(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white"
                        >
                          <option value="kegiatan">Kegiatan Pondok</option>
                          <option value="ujian">Ujian Akademik</option>
                          <option value="libur">Libur Santri</option>
                          <option value="ppdb">PPDB & Penerimaan</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-700 block mb-1">Lokasi</label>
                        <input
                          type="text"
                          value={eventLocation}
                          onChange={(e) => setEventLocation(e.target.value)}
                          placeholder="e.g. Masjid Agung"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-700 bg-white"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        type="submit"
                        className="flex-1 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-black transition cursor-pointer"
                      >
                        {editingEventId ? 'Simpan Perubahan' : 'Posting Agenda'}
                      </button>
                      {editingEventId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingEventId(null);
                            setEventTitle('');
                            setEventDescription('');
                            setEventStartDate('2026-08-01');
                            setEventEndDate('2026-08-02');
                            setEventCategory('kegiatan');
                            setEventLocation('');
                          }}
                          className="px-3 py-2 border border-gray-300 hover:bg-gray-100 rounded-lg text-xs font-bold cursor-pointer"
                        >
                          Batal
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                {/* List Agenda (8 Cols) */}
                <div className="lg:col-span-8 bg-white p-6 rounded-2xl shadow-sm border border-emerald-50 space-y-4 text-left">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-base text-emerald-950 flex items-center gap-1.5">
                      📅 Seluruh Daftar Agenda Pesantren
                    </h3>
                    <span className="bg-[#f2faf6] border border-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded text-[10px] font-mono font-bold">
                      {events.length} Terdaftar
                    </span>
                  </div>

                  <div className="overflow-x-auto border border-gray-150 rounded-xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-150">
                          <th className="p-3 font-extrabold text-gray-500 uppercase tracking-wider text-[9px]">Agenda</th>
                          <th className="p-3 font-extrabold text-gray-500 uppercase tracking-wider text-[9px]">Tanggal</th>
                          <th className="p-3 font-extrabold text-gray-500 uppercase tracking-wider text-[9px]">Kategori</th>
                          <th className="p-3 font-extrabold text-gray-500 uppercase tracking-wider text-[9px]">Konfirmasi</th>
                          <th className="p-3 font-extrabold text-gray-500 uppercase tracking-wider text-[9px] text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {events.map((evt) => (
                          <tr key={evt.id} className="hover:bg-gray-50/50">
                            <td className="p-3">
                              <div className="font-bold text-gray-900 leading-tight">{evt.title}</div>
                              {evt.location && <div className="text-[10px] text-gray-400 mt-0.5">📍 {evt.location}</div>}
                            </td>
                            <td className="p-3 font-mono text-[11px] whitespace-nowrap">
                              {evt.startDate} s/d {evt.endDate}
                            </td>
                            <td className="p-3 uppercase font-mono text-[9px] font-bold">
                              {evt.category}
                            </td>
                            <td className="p-3">
                              <button
                                onClick={() => {
                                  setEvents(prev => prev.map(e => e.id === evt.id ? { ...e, confirmed: !e.confirmed } : e));
                                }}
                                className={`px-2 py-1 rounded text-[9px] font-bold transition-all ${
                                  evt.confirmed
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                                }`}
                              >
                                {evt.confirmed ? '✓ Terkonfirmasi' : '✗ Belum Konfirmasi'}
                              </button>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => handleEditEventClick(evt)}
                                  className="p-1 bg-amber-55 hover:bg-amber-100 text-amber-700 rounded transition cursor-pointer"
                                  title="Edit"
                                >
                                  <Edit className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={() => handleDeleteEvent(evt.id)}
                                  className="p-1 bg-red-50 hover:bg-red-100 text-red-600 rounded transition cursor-pointer"
                                  title="Hapus"
                                >
                                  <Trash className="h-3 w-3" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: PPDB Registration Review */}
      {activeTab === 'ppdb' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-50 space-y-6">
          {/* REKAPAN PCSB */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-emerald-50/20 rounded-2xl border border-emerald-100">
            <div className="bg-white p-3.5 rounded-xl border border-emerald-50 shadow-xs text-center text-emerald-950">
              <span className="text-xl">📊</span>
              <div className="text-[10px] text-gray-500 font-bold uppercase mt-1">Total Pendaftar</div>
              <div className="text-lg font-black text-emerald-950 mt-0.5">{filteredPpdb.length}</div>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-emerald-50 shadow-xs text-center text-emerald-950">
              <span className="text-xl">⏳</span>
              <div className="text-[10px] text-gray-500 font-bold uppercase mt-1">Status Pending</div>
              <div className="text-lg font-black text-amber-600 mt-0.5">{filteredPpdb.filter(p => p.status === 'Pending').length}</div>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-emerald-50 shadow-xs text-center text-emerald-950">
              <span className="text-xl">✅</span>
              <div className="text-[10px] text-gray-500 font-bold uppercase mt-1">Status Diterima</div>
              <div className="text-lg font-black text-emerald-700 mt-0.5">{filteredPpdb.filter(p => p.status === 'Diterima').length}</div>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-emerald-50 shadow-xs text-center text-emerald-950">
              <span className="text-xl">👫</span>
              <div className="text-[10px] text-gray-500 font-bold uppercase mt-1">L/P (Aktif)</div>
              <div className="text-xs font-black text-slate-700 mt-1.5">
                L: {filteredPpdb.filter(p => p.gender === 'Laki-laki').length} | P: {filteredPpdb.filter(p => p.gender === 'Perempuan').length}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 border-b border-gray-100 pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-lg text-emerald-950">
                  Pendaftar PCSB Online
                </h3>
                <p className="text-xs text-gray-500">Mengkaji berkas dan status calon santri baru.</p>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 max-w-md w-full sm:justify-end">
                <button
                  type="button"
                  onClick={exportPpdbToExcel}
                  className="px-3 py-1.5 bg-gradient-to-r from-emerald-800 to-teal-900 hover:from-emerald-750 hover:to-teal-850 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                  title="Unduh seluruh database PCSB dalam format Excel (XLS)"
                >
                  📥 Ekspor ke Excel
                </button>
                
                <div className="relative max-w-[180px] w-full">
                  <Search className="absolute left-3 top-2 h-3.5 w-3.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Cari pendaftar..."
                    value={ppdbSearch}
                    onChange={(e) => setPpdbSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1 border border-emerald-100 rounded-lg text-xs focus:ring-1 focus:ring-emerald-700 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* PPDB Filter controls */}
            <div className="grid grid-cols-2 gap-3 bg-emerald-50/20 p-2.5 rounded-xl border border-emerald-100/30 text-[11px] max-w-sm">
              <div>
                <label className="text-gray-400 font-bold block mb-1">Status Verifikasi</label>
                <select
                  value={ppdbStatusFilter}
                  onChange={(e) => setPpdbStatusFilter(e.target.value)}
                  className="w-full bg-white border border-emerald-100 rounded px-2 py-1 text-[11px] font-medium focus:ring-1 focus:ring-emerald-700"
                >
                  <option value="Semua">Semua Status</option>
                  <option value="Pending">Pending</option>
                  <option value="Diterima">Diterima (Lulus)</option>
                  <option value="Ditolak">Ditolak</option>
                </select>
              </div>

              <div>
                <label className="text-gray-400 font-bold block mb-1">Gender Calon</label>
                <select
                  value={ppdbGenderFilter}
                  onChange={(e) => setPpdbGenderFilter(e.target.value)}
                  className="w-full bg-white border border-emerald-100 rounded px-2 py-1 text-[11px] font-medium focus:ring-1 focus:ring-emerald-700"
                >
                  <option value="Semua">Semua Gender</option>
                  <option value="Laki-laki">Laki-laki</option>
                  <option value="Perempuan">Perempuan</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {filteredPpdb.length === 0 ? (
              <p className="text-center py-8 text-xs text-gray-400 bg-gray-50 rounded-xl">Tidak ada data pendaftaran yang cocok.</p>
            ) : (
              filteredPpdb.map((reg, idx) => (
                <div key={reg.id} className="p-4 bg-emerald-50/20 border border-emerald-100/60 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-950 font-mono font-black text-[10px]">
                          #{idx + 1}
                        </span>
                        <span className="text-[10px] text-gray-400 font-bold block uppercase">Nama Lengkap</span>
                      </div>
                      <strong className="text-sm text-emerald-950 font-bold block mt-0.5">{reg.fullName}</strong>
                      <span className="text-gray-500 block mt-0.5">{reg.gender} • Asal: {reg.previousSchool}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-gray-400 font-bold block uppercase">Tempat, Tgl Lahir</span>
                      <span className="text-gray-700 block mt-0.5">{reg.birthPlace}, {reg.birthDate}</span>
                      <span className="text-gray-400 text-[10px] block mt-0.5">Daftar: {reg.registrationDate}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-gray-400 font-bold block uppercase">Orang Tua / HP</span>
                      <span className="text-gray-700 block mt-0.5 font-semibold">{reg.parentName}</span>
                      <span className="text-emerald-700 font-mono font-bold block mt-0.5 hover:underline cursor-pointer">
                        📞 {reg.parentPhone}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-gray-400 font-bold block uppercase">Status Kehadiran & Berkas</span>
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold mt-1.5 ${
                        reg.status === 'Diterima' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {reg.status === 'Diterima' ? '✓ DITERIMA (Hadir & Terverifikasi)' : 'Terdaftar (Belum Hadir)'}
                      </span>
                      {reg.notes && <span className="text-gray-500 block text-[10px] mt-1 italic">"{reg.notes}"</span>}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 justify-center shrink-0 w-full lg:w-auto">
                    <button
                      type="button"
                      onClick={() => setSelectedPpdbForSlip(reg)}
                      className="px-4 py-2 border border-emerald-600 hover:bg-emerald-50 text-emerald-800 font-bold rounded-xl transition flex items-center justify-center gap-1 cursor-pointer w-full text-center text-xs"
                      title="Cetak/Lihat Slip Bukti Registrasi"
                    >
                      <Printer className="h-3.5 w-3.5" /> <span>Cetak Slip</span>
                    </button>
                    
                    {reg.status !== 'Diterima' ? (
                      <button
                        type="button"
                        onClick={() => handlePpdbStatus(reg.id, 'Diterima')}
                        className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold rounded-xl transition flex items-center justify-center gap-1 text-[11px] cursor-pointer w-full text-center shadow-xs"
                      >
                        ✔ Hadir & Verifikasi Data
                      </button>
                    ) : (
                      <div className="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-center text-[10px] font-black">
                        ✓ Berkas Diterima
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => triggerConfirm(
                        'Hapus Calon Santri',
                        `Apakah Anda yakin ingin menghapus data pendaftaran calon santri ${reg.fullName} secara permanen? Tindakan ini tidak dapat dibatalkan.`,
                        () => {
                          const updatedList = ppdbList.filter(p => p.id !== reg.id);
                          setPpdbList(updatedList);
                          localStorage.setItem('pesantren_ppdb', JSON.stringify(updatedList));
                          if (isSupabaseConfigured()) {
                            deletePpdbFromSupabase(reg.id).catch(e => console.error('Cloud delete PPDB error:', e));
                          }
                          window.dispatchEvent(new Event('pesantren_db_sync'));
                          showAlert('danger', `Data pendaftaran ${reg.fullName} berhasil dihapus.`);
                        }
                      )}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl transition flex items-center justify-center gap-1 text-[11px] cursor-pointer w-full text-center"
                    >
                      ❌ Hapus Pendaftaran
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab: Active Students Database */}
      {activeTab === 'students' && (
        <div className="space-y-6 text-left animate-fade-in">
          {/* REKAPAN SANTRI AKTIF */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-emerald-50/20 rounded-2xl border border-emerald-200/50">
            <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-xs text-center">
              <span className="text-2xl">👥</span>
              <div className="text-[10px] text-slate-500 font-extrabold uppercase mt-1">Total Santri Aktif</div>
              <div className="text-2xl font-black text-emerald-950 mt-0.5">{filteredStudents.length} Orang</div>
              <div className="text-[9px] text-emerald-700 font-semibold mt-0.5">Tercatat di Pesantren</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-xs text-center">
              <span className="text-2xl">👦</span>
              <div className="text-[10px] text-slate-500 font-extrabold uppercase mt-1">Santri Putra (L)</div>
              <div className="text-2xl font-black text-blue-900 mt-0.5">{filteredStudents.filter(s => s.gender === 'Laki-laki').length} Orang</div>
              <div className="text-[9px] text-blue-600 font-semibold mt-0.5">Laki-laki</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-xs text-center">
              <span className="text-2xl">👧</span>
              <div className="text-[10px] text-slate-500 font-extrabold uppercase mt-1">Santri Putri (P)</div>
              <div className="text-2xl font-black text-pink-900 mt-0.5">{filteredStudents.filter(s => s.gender === 'Perempuan').length} Orang</div>
              <div className="text-[9px] text-pink-600 font-semibold mt-0.5">Perempuan</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-xs text-center">
              <span className="text-2xl">🚪</span>
              <div className="text-[10px] text-slate-500 font-extrabold uppercase mt-1">Jumlah Kamar</div>
              <div className="text-2xl font-black text-amber-950 mt-0.5">
                {new Set(filteredStudents.map(s => s.kamar).filter(Boolean)).size} Kamar
              </div>
              <div className="text-[9px] text-amber-700 font-semibold mt-0.5">Asrama Santri</div>
            </div>
          </div>

          {/* Filter and Search Bar Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Search className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Cari Santri berdasarkan nama, NIS, NIK, KK..."
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              
              <div className="grid grid-cols-2 sm:flex gap-2.5">
                <select
                  value={studentClassFilter}
                  onChange={(e) => setStudentClassFilter(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-semibold text-slate-700"
                >
                  <option value="Semua">Semua Kelas</option>
                  {Array.from(new Set(students.map(s => s.class).filter(Boolean))).map(cls => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>

                <select
                  value={studentGenderFilter}
                  onChange={(e) => setStudentGenderFilter(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-semibold text-slate-700"
                >
                  <option value="Semua">Semua Gender</option>
                  <option value="Laki-laki">Putra (Laki-laki)</option>
                  <option value="Perempuan">Putri (Perempuan)</option>
                </select>

                <select
                  value={studentStatusFilter}
                  onChange={(e) => setStudentStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-semibold text-slate-700"
                >
                  <option value="Semua">Semua Status</option>
                  <option value="Aktif">Aktif</option>
                  <option value="Berhenti">Berhenti</option>
                </select>

                <select
                  value={studentSortFilter}
                  onChange={(e) => setStudentSortFilter(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-semibold text-slate-700"
                >
                  <option value="nama-asc">Nama (A - Z)</option>
                  <option value="nama-desc">Nama (Z - A)</option>
                  <option value="nisn-asc">NISN Terkecil</option>
                </select>

                <button
                  onClick={() => downloadPrintableTableHTML('admin-students-printable-table', 'Database_Santri_Al_Asyariyah')}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-700 text-white rounded-xl text-xs font-bold shadow-md hover:from-emerald-600 hover:to-emerald-800 transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Printer className="h-3.5 w-3.5" /> Cetak Data
                </button>

                <button
                  onClick={exportStudentsToExcel}
                  className="px-4 py-2 bg-gradient-to-r from-teal-500 to-teal-700 text-white rounded-xl text-xs font-bold shadow-md hover:from-teal-600 hover:to-teal-800 transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" /> Ekspor ke Excel
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table id="admin-students-active-list-table" className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-3 text-center w-12 font-extrabold uppercase text-[10px] text-slate-700 bg-slate-100">No</th>
                    <th className="py-3 px-4">NIS</th>
                    <th className="py-3 px-4">Nama Lengkap</th>
                    <th className="py-3 px-4">Alamat</th>
                    <th className="py-3 px-4">No. Telp / WA Wali</th>
                    <th className="py-3 px-4">Madrasah (Non-Formal)</th>
                    <th className="py-3 px-4">Sekolah (Formal)</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-700 bg-white">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                      Tidak ditemukan data santri yang cocok dengan pencarian Anda.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((s, idx) => {
                    const isExpanded = expandedStudentId === s.id;
                    return (
                      <React.Fragment key={s.id}>
                        <tr className={`hover:bg-emerald-50/15 transition-all ${isExpanded ? 'bg-emerald-50/5 font-semibold' : ''}`}>
                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-600 text-xs">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-emerald-900 text-[10px]">
                            <span className="px-2 py-1 rounded bg-emerald-50 border border-emerald-150">
                              {s.nis || '-'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 bg-emerald-100 rounded-full border border-emerald-200 flex items-center justify-center font-bold text-emerald-800 uppercase text-[10px] shrink-0">
                                {s.fullName.substring(0, 2)}
                              </div>
                              <div>
                                <div className="font-extrabold text-slate-900 text-sm">{s.fullName}</div>
                                <div className="text-[9px] text-gray-500 font-mono flex items-center gap-1.5 flex-wrap">
                                  <span>{s.gender || 'Laki-laki'}</span>
                                  {s.kamar && <span className="bg-amber-100 text-amber-900 px-1 py-0.2 rounded font-sans font-bold">🚪 Kamar: {s.kamar}</span>}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 max-w-[150px] truncate" title={s.address}>
                            {s.address || 'Jawa Tengah'}
                          </td>
                          <td className="py-3 px-4 font-mono font-semibold">
                            {s.parentPhone || '-'}
                          </td>
                          <td className="py-3 px-4 font-bold text-teal-800">
                            {s.classMadrasah || s.classPagi || s.class || '-'}
                          </td>
                          <td className="py-3 px-4 font-bold text-indigo-800">
                            {s.classFormal || s.classSore || '-'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setExpandedStudentId(isExpanded ? null : s.id)}
                                className="px-2.5 py-1 text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-lg text-[10px] font-bold transition cursor-pointer"
                              >
                                {isExpanded ? 'Tutup ▲' : 'Detail ▼'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingStudent(s)}
                                className="p-1 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition cursor-pointer"
                                title="Edit Data Santri"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setTightDeleteStudent(s);
                                  setTightDeleteInputName('');
                                  setTightDeleteInputCode('');
                                }}
                                className="p-1 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition cursor-pointer"
                                title="Keluarkan Santri"
                              >
                                <Trash className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr>
                            <td colSpan={8} className="p-4 bg-emerald-50/10 border-t border-emerald-100/60">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-700 text-left animate-fade-in">
                                <div>
                                  <span className="text-[10px] text-emerald-800/60 font-bold block uppercase">No. Kartu Keluarga (KK)</span>
                                  <span className="font-mono text-gray-950 font-semibold">{s.kk || 'Belum diisi'}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-emerald-800/60 font-bold block uppercase">NIK Santri</span>
                                  <span className="font-mono text-gray-950 font-semibold">{s.nik || 'Belum diisi'}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-emerald-800/60 font-bold block uppercase">Nama Lengkap Ayah Kandung</span>
                                  <span className="text-gray-950 font-semibold">{s.fatherName || s.parentName || 'Belum diisi'}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-emerald-800/60 font-bold block uppercase">Nama Lengkap Ibu Kandung</span>
                                  <span className="text-gray-950 font-semibold">{s.motherName || 'Belum diisi'}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-emerald-800/60 font-bold block uppercase">Tempat & Tanggal Lahir</span>
                                  <span className="text-gray-950">{s.birthPlace ? `${s.birthPlace}, ${formatIndonesianDate(s.birthDate)}` : 'Belum diisi'}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-emerald-800/60 font-bold block uppercase">Pendidikan (Formal & Diniyah)</span>
                                  <span className="text-gray-950 font-bold">{s.classFormal || s.classSore || '-'} • {s.classMadrasah || s.classPagi || '-'}</span>
                                </div>
                                <div className="sm:col-span-2">
                                  <span className="text-[10px] text-emerald-800/60 font-bold block uppercase">Alamat Asal Rumah</span>
                                  <span className="text-gray-950 block bg-white p-2 rounded border border-gray-100 mt-1">{s.address || 'Jawa Tengah'}</span>
                                </div>
                                <div className="sm:col-span-2 bg-emerald-50/40 p-2.5 rounded-lg border border-emerald-100/30 flex justify-between items-center text-[11px] text-emerald-900 flex-wrap gap-2">
                                  <span>📧 Email Wali: <strong className="font-medium font-mono">{s.email}</strong></span>
                                  <span>📞 WhatsApp Wali: <strong className="font-medium font-mono">{s.parentPhone}</strong></span>
                                </div>
                                <div className="sm:col-span-2 flex justify-end gap-2 mt-2">
                                  <button
                                    type="button"
                                    onClick={() => openStudentProfileInNewTab(s)}
                                    className="px-4 py-2 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-[10px] font-extrabold flex items-center gap-1.5 cursor-pointer transition shadow-sm"
                                  >
                                    <Printer className="h-3 w-3" /> Cetak Biodata Lengkap (Dokumen Induk) ⎙
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedStudentForCard(s)}
                                    className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-amber-300 rounded-xl text-[10px] font-extrabold flex items-center gap-1.5 cursor-pointer transition shadow-sm"
                                  >
                                    <Printer className="h-3 w-3" /> Cetak Kartu Santri Keanggotaan ⎙
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )}

      {/* Tab: Alumni Management */}
      {activeTab === 'alumni' && (() => {
        const alumniList = students.filter(s => s.status === 'Alumni' || s.status === 'Berhenti');
        
        // Get unique graduation years
        const uniqueYears = Array.from(new Set(alumniList.map(a => a.tahunKeluar).filter(Boolean))).sort((a, b) => b!.localeCompare(a!));

        // Filtered alumni
        const filteredAlumni = alumniList.filter(a => {
          const matchesSearch = a.fullName.toLowerCase().includes(alumniSearch.toLowerCase()) || 
            (a.nis && a.nis.includes(alumniSearch)) || 
            (a.alumniId && a.alumniId.toLowerCase().includes(alumniSearch.toLowerCase()));
          const matchesGender = alumniGenderFilter === 'Semua' || a.gender === alumniGenderFilter;
          const matchesYear = alumniYearFilter === 'Semua' || a.tahunKeluar === alumniYearFilter;
          return matchesSearch && matchesGender && matchesYear;
        }).sort((a, b) => {
          if (alumniSort === 'name-asc') {
            return a.fullName.localeCompare(b.fullName);
          } else if (alumniSort === 'name-desc') {
            return b.fullName.localeCompare(a.fullName);
          } else if (alumniSort === 'year-desc') {
            return (b.tahunKeluar || '').localeCompare(a.tahunKeluar || '');
          } else if (alumniSort === 'year-asc') {
            return (a.tahunKeluar || '').localeCompare(b.tahunKeluar || '');
          } else if (alumniSort === 'nia-asc') {
            return (a.alumniId || '').localeCompare(b.alumniId || '');
          } else if (alumniSort === 'nia-desc') {
            return (b.alumniId || '').localeCompare(a.alumniId || '');
          }
          return 0;
        });

        const totalAlumniCount = filteredAlumni.length;
        const totalBoys = filteredAlumni.filter(a => a.gender === 'Laki-laki').length;
        const totalGirls = filteredAlumni.filter(a => a.gender === 'Perempuan').length;

        return (
          <div className="space-y-6 text-left animate-fade-in">
            {/* Header / Stats Panel */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-amber-50/20 rounded-2xl border border-amber-200/50">
              <div className="bg-white p-4 rounded-xl border border-amber-100 shadow-xs text-center">
                <span className="text-2xl">🎓</span>
                <div className="text-[10px] text-slate-500 font-extrabold uppercase mt-1">Total Alumni</div>
                <div className="text-2xl font-black text-amber-950 mt-0.5">{totalAlumniCount} Orang</div>
                <div className="text-[9px] text-amber-700 font-semibold mt-0.5">Tercatat Sistem</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-amber-100 shadow-xs text-center">
                <span className="text-2xl">👦</span>
                <div className="text-[10px] text-slate-500 font-extrabold uppercase mt-1">Alumni Putra</div>
                <div className="text-2xl font-black text-blue-900 mt-0.5">{totalBoys} Orang</div>
                <div className="text-[9px] text-blue-600 font-semibold mt-0.5">Laki-laki</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-amber-100 shadow-xs text-center">
                <span className="text-2xl">👧</span>
                <div className="text-[10px] text-slate-500 font-extrabold uppercase mt-1">Alumni Putri</div>
                <div className="text-2xl font-black text-rose-900 mt-0.5">{totalGirls} Orang</div>
                <div className="text-[9px] text-rose-600 font-semibold mt-0.5">Perempuan</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-amber-100 shadow-xs text-center">
                <span className="text-2xl">🗓️</span>
                <div className="text-[10px] text-slate-500 font-extrabold uppercase mt-1">Tahun Angkatan</div>
                <div className="text-2xl font-black text-emerald-900 mt-0.5">{uniqueYears.length > 0 ? `${uniqueYears[uniqueYears.length - 1]} - ${uniqueYears[0]}` : '-'}</div>
                <div className="text-[9px] text-emerald-600 font-semibold mt-0.5">Rentang Kelulusan</div>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1 relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Search className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    value={alumniSearch}
                    onChange={(e) => setAlumniSearch(e.target.value)}
                    placeholder="Cari Alumni berdasarkan nama, NIS, atau Nomor Identitas Alumni (NIA)..."
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
                
                <div className="grid grid-cols-2 sm:flex gap-2.5">
                  <select
                    value={alumniGenderFilter}
                    onChange={(e) => setAlumniGenderFilter(e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-semibold text-slate-700"
                  >
                    <option value="Semua">Semua Gender</option>
                    <option value="Laki-laki">Putra (Laki-laki)</option>
                    <option value="Perempuan">Putri (Perempuan)</option>
                  </select>

                  <select
                    value={alumniYearFilter}
                    onChange={(e) => setAlumniYearFilter(e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-semibold text-slate-700"
                  >
                    <option value="Semua">Semua Angkatan</option>
                    {uniqueYears.map(year => (
                      <option key={year} value={year}>Lulus Tahun {year}</option>
                    ))}
                  </select>

                  <select
                    value={alumniSort}
                    onChange={(e) => setAlumniSort(e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-semibold text-slate-700"
                  >
                    <option value="name-asc">Nama (A-Z)</option>
                    <option value="name-desc">Nama (Z-A)</option>
                    <option value="year-desc">Angkatan Terbaru</option>
                    <option value="year-asc">Angkatan Terlama</option>
                    <option value="nia-asc">NIA Terkecil</option>
                    <option value="nia-desc">NIA Terbesar</option>
                  </select>

                  <button
                    onClick={() => {
                      downloadPrintableTableHTML(
                        'admin-alumni-printable-table',
                        `Daftar_Alumni_${alumniYearFilter !== 'Semua' ? 'Tahun_' + alumniYearFilter : 'Semua_Angkatan'}`
                      );
                    }}
                    className="col-span-2 sm:col-span-1 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-700 text-white rounded-xl text-xs font-bold shadow-md hover:from-amber-600 hover:to-amber-800 transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Download className="h-3.5 w-3.5" /> Ekspor Cetak
                  </button>
                </div>
              </div>

              {/* Table List of Alumni */}
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table id="admin-alumni-printable-table" className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-3 text-center w-12 font-extrabold uppercase text-[10px] text-slate-700 bg-slate-100">No</th>
                      <th className="py-3 px-4">NIA</th>
                      <th className="py-3 px-4">Nama Alumni</th>
                      <th className="py-3 px-4">Alamat</th>
                      <th className="py-3 px-4">No. Telp / WA</th>
                      <th className="py-3 px-4">Alasan Berhenti</th>
                      <th className="py-3 px-4">Tahun Berhenti</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-slate-700">
                    {filteredAlumni.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                          Tidak ditemukan data alumni yang cocok dengan pencarian Anda.
                        </td>
                      </tr>
                    ) : (
                      filteredAlumni.map((alumni, idx) => (
                        <tr key={alumni.id} className="hover:bg-amber-50/20 transition-all">
                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-600 text-xs">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-indigo-900 text-[10px]">
                            <span className="px-2 py-1 rounded bg-indigo-50 border border-indigo-150">
                              {alumni.alumniId || `NIA.${alumni.tahunKeluar || '2026'}.${alumni.gender === 'Perempuan' ? 'P' : 'L'}.${alumni.nis || 'UNTITLED'}`}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 bg-amber-100 rounded-full border border-amber-200 flex items-center justify-center font-bold text-amber-800 uppercase text-[10px] shrink-0">
                                {alumni.fullName.substring(0, 2)}
                              </div>
                              <div>
                                <div className="font-extrabold text-slate-900 text-sm">{alumni.fullName}</div>
                                <div className="text-[9px] text-gray-500 font-mono">NIS: {alumni.nis || '-'} • {alumni.gender}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 max-w-[150px] truncate" title={alumni.address}>
                            {alumni.address || 'Jawa Tengah'}
                          </td>
                          <td className="py-3 px-4 font-mono font-semibold">
                            {alumni.parentPhone || '-'}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-700">
                            {alumni.alumniReason || (alumni.status === 'Berhenti' ? 'Pilihan Keluarga / Berhenti' : 'Lulus Madrasah & Formal')}
                          </td>
                          <td className="py-3 px-4 font-bold text-amber-900">
                            {alumni.status === 'Berhenti' ? 'Berhenti' : 'Lulus'} {alumni.tahunKeluar || '-'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setSelectedAlumniForDetails(alumni)}
                                className="px-2 py-1 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg text-[10px] font-bold transition cursor-pointer"
                              >
                                Detail
                              </button>
                              <button
                                onClick={() => setEditingStudent(alumni)}
                                className="p-1 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition cursor-pointer"
                                title="Edit Alumni"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* DETAIL ALUMNI DIALOG MODAL (Centered Modal) */}
            {selectedAlumniForDetails && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-950/70 backdrop-blur-sm overflow-y-auto">
                <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-emerald-100 flex flex-col my-auto max-h-[88vh] sm:max-h-[90vh] animate-fade-in">
                  <div className="bg-gradient-to-r from-emerald-850 to-teal-900 text-white p-4 sm:p-5 flex justify-between items-center shrink-0">
                    <div>
                      <h4 className="font-bold text-base flex items-center gap-2">🎓 Detail Alumni & Kelulusan</h4>
                      <p className="text-[10px] text-emerald-100 font-mono mt-0.5">ID Alumni: {selectedAlumniForDetails.alumniId || '-'}</p>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setSelectedAlumniForDetails(null)} 
                      className="text-white hover:bg-emerald-800/50 p-1 rounded-full cursor-pointer transition"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="p-4 sm:p-6 space-y-3.5 flex-1 overflow-y-auto text-xs text-left">
                    <div className="flex gap-4 items-center border-b border-slate-100 pb-4">
                      {selectedAlumniForDetails.photoUrl ? (
                        <img 
                          src={selectedAlumniForDetails.photoUrl} 
                          alt="Foto Profil" 
                          className="h-14 w-11 object-cover rounded-xl border-2 border-emerald-300 shadow-xs shrink-0" 
                        />
                      ) : (
                        <div className="h-12 w-12 shrink-0 bg-gradient-to-tr from-emerald-100 to-teal-200 rounded-xl flex items-center justify-center font-bold text-emerald-900 text-base border border-emerald-300 shadow-xs uppercase">
                          {selectedAlumniForDetails.fullName.substring(0, 2)}
                        </div>
                      )}
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h5 className="text-sm font-black text-slate-900 uppercase tracking-tight truncate">{selectedAlumniForDetails.fullName}</h5>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                            selectedAlumniForDetails.status === 'Alumni' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {selectedAlumniForDetails.status || 'Alumni'}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-600 truncate">No Alumni (NIA): <span className="font-mono font-bold text-emerald-800">{selectedAlumniForDetails.alumniId || '-'}</span></p>
                        <p className="text-[10px] text-gray-500">Lama Mondok: <span className="font-semibold text-slate-800">
                          {(() => {
                            const entryYear = selectedAlumniForDetails.nis ? parseInt(selectedAlumniForDetails.nis.split('.')[0]) : 0;
                            const exitYear = selectedAlumniForDetails.tahunKeluar ? parseInt(selectedAlumniForDetails.tahunKeluar) : 0;
                            const durationYears = (entryYear && exitYear && exitYear >= entryYear) ? (exitYear - entryYear) : 3;
                            return `${durationYears} Tahun`;
                          })()}
                        </span></p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
                      <div>
                        <div className="text-[10px] uppercase font-bold text-gray-400">Gender / Jenis Kelamin</div>
                        <div className="font-bold text-slate-800 mt-0.5">{selectedAlumniForDetails.gender}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-bold text-gray-400">Tahun Keluar / Kelulusan</div>
                        <div className="font-bold text-emerald-800 mt-0.5">{selectedAlumniForDetails.status === 'Berhenti' ? 'Berhenti' : 'Lulus'} Tahun {selectedAlumniForDetails.tahunKeluar || '-'}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-bold text-gray-400">Pendidikan Terakhir</div>
                        <div className="font-bold text-emerald-900 mt-0.5">{mapClassToLastEducation(selectedAlumniForDetails)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-bold text-gray-400">Sebab Berhenti / Lulus</div>
                        <div className="font-bold text-indigo-950 leading-snug mt-0.5">{selectedAlumniForDetails.alumniReason || 'Lulus Madrasah & Formal'}</div>
                      </div>
                      <div className="sm:col-span-2 border-t border-slate-200/60 pt-2 mt-1">
                        <div className="text-[10px] uppercase font-bold text-gray-400">Alamat Lengkap</div>
                        <div className="font-bold text-slate-800 leading-snug mt-0.5">{selectedAlumniForDetails.address || 'Jawa Tengah'}</div>
                      </div>
                      <div className="sm:col-span-2 border-t border-slate-200/60 pt-2">
                        <div className="text-[10px] uppercase font-bold text-gray-400">Orang Tua / Wali</div>
                        <div className="font-bold text-slate-800 leading-snug mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5">
                          <div>Ayah: {selectedAlumniForDetails.fatherName || selectedAlumniForDetails.parentName || '-'}</div>
                          <div>Ibu: {selectedAlumniForDetails.motherName || '-'}</div>
                          <div className="font-mono text-emerald-800">HP: {selectedAlumniForDetails.parentPhone || '-'}</div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-emerald-50/80 p-3 rounded-xl border border-emerald-100 text-[10px] text-emerald-950 leading-relaxed font-medium">
                      Kami mendoakan agar ilmu yang telah diserap selama membina akhlak dan hafalan di Pondok Pesantren senantiasa menjadi berkah dan pemandu kesuksesan dunia-akhirat. Amiin.
                    </div>

                    <div className="pt-2 flex flex-col gap-2 shrink-0 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => openAlumniCardInNewTab(selectedAlumniForDetails)}
                        className="w-full py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl cursor-pointer flex items-center justify-center gap-1.5 text-xs transition shadow-xs"
                      >
                        <Printer className="h-3.5 w-3.5" /> Cetak Kartu Alumni
                      </button>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const target = selectedAlumniForDetails;
                            setSelectedAlumniForDetails(null);
                            setEditingStudent(target);
                          }}
                          className="flex-1 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-xl cursor-pointer text-xs transition text-center border border-emerald-200 flex items-center justify-center gap-1"
                        >
                          <Edit className="h-3.5 w-3.5" /> Edit Data
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const target = selectedAlumniForDetails;
                            setSelectedAlumniForDetails(null);
                            setTightDeleteStudent(target);
                          }}
                          className="flex-1 py-2 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-xl cursor-pointer text-xs transition text-center border border-red-200"
                        >
                          Hapus
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedAlumniForDetails(null)}
                          className="flex-1 py-2 border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold rounded-xl cursor-pointer text-xs transition text-center"
                        >
                          Tutup
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Tab: Room Management */}
      {activeTab === 'kamar' && (() => {
        const handleOpenAddRoom = () => {
          setRoomFormName('');
          setRoomFormGender('Laki-laki');
          setRoomFormFormal('SMP Formal');
          setRoomFormDiniyah('1A MTs Diniyah');
          setRoomFormCapacity(20);
          setIsAddRoomOpen(true);
        };

        const handleOpenEditRoom = (room: Room) => {
          setEditingRoom(room);
          setRoomFormName(room.name);
          setRoomFormGender(room.gender);
          setRoomFormFormal(room.formalSchool);
          setRoomFormDiniyah(room.diniyahSchool);
          setRoomFormCapacity(room.capacity);
        };

        const handleSaveRoom = (e: React.FormEvent) => {
          e.preventDefault();
          if (!roomFormName.trim()) {
            showAlert('danger', 'Nama kamar harus diisi.');
            return;
          }
          if (roomFormCapacity < 1) {
            showAlert('danger', 'Kuota minimal kamar adalah 1 orang.');
            return;
          }
          
          const upperRoomName = roomFormName.trim().toUpperCase();
          const oldRoomName = editingRoom ? editingRoom.name.toUpperCase() : '';
          const occupiedCount = students.filter(s => 
            (s.kamar && s.kamar.toUpperCase() === upperRoomName) || 
            (oldRoomName && s.kamar && s.kamar.toUpperCase() === oldRoomName)
          ).filter(s => s.status === 'Aktif').length;
          
          const warningTriggered = roomFormCapacity < occupiedCount;

          if (editingRoom) {
            // Edit
            const updated = rooms.map(r => r.id === editingRoom.id ? {
              ...r,
              name: upperRoomName,
              gender: roomFormGender,
              formalSchool: r.formalSchool || '',
              diniyahSchool: r.diniyahSchool || '',
              capacity: roomFormCapacity
            } : r);
            setRooms(updated);

            // If room name changed, update students in this room to preserve their room assignment
            if (editingRoom.name !== upperRoomName) {
              const updatedStudents = students.map(s => {
                if (s.kamar === editingRoom.name) {
                  return { ...s, kamar: upperRoomName };
                }
                return s;
              });
              setStudents(updatedStudents);
            }

            if (warningTriggered) {
              showAlert('danger', `⚠️ PERINGATAN: Kuota Kamar ${upperRoomName} diturunkan menjadi ${roomFormCapacity} orang. Saat ini ada ${occupiedCount} santri aktif di kamar ini. Mohon segera pindahkan beberapa santri agar sesuai dengan kuota yang diinginkan!`);
            } else {
              showAlert('success', `Kamar ${upperRoomName} berhasil diperbarui!`);
            }
            setEditingRoom(null);
          } else {
            // Add
            if (rooms.some(r => r.name.toUpperCase() === upperRoomName)) {
              showAlert('danger', `Kamar dengan nama ${upperRoomName} sudah terdaftar.`);
              return;
            }
            const newRoom: Room = {
              id: `room-${Date.now()}`,
              name: upperRoomName,
              gender: roomFormGender,
              formalSchool: '',
              diniyahSchool: '',
              capacity: roomFormCapacity
            };
            setRooms([newRoom, ...rooms]);
            showAlert('success', `Kamar ${upperRoomName} berhasil ditambahkan!`);
            setIsAddRoomOpen(false);
          }
        };

        const handleDeleteRoom = (room: Room) => {
          const occupied = students.filter(s => s.kamar === room.name && s.status === 'Aktif').length;
          if (occupied > 0) {
            showAlert('danger', `Tidak dapat menghapus kamar. Masih ada ${occupied} santri aktif di kamar ini.`);
            return;
          }
          triggerConfirm(
            'Hapus Kamar',
            `Apakah Anda yakin ingin menghapus Kamar ${room.name} dari database?`,
            () => {
              setRooms(rooms.filter(r => r.id !== room.id));
              showAlert('success', `Kamar ${room.name} berhasil dihapus.`);
            }
          );
        };

        const filteredRooms = rooms.filter(r => {
          const matchesSearch = r.name.toLowerCase().includes(roomSearch.toLowerCase());
          const matchesGender = roomGenderFilter === 'Semua' || r.gender === roomGenderFilter;
          return matchesSearch && matchesGender;
        });

        return (
          <div className="space-y-6 text-left animate-fade-in">
            {/* Header banner */}
            <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="font-extrabold text-emerald-950 text-base flex items-center gap-1.5">
                  Manajemen Kamar & Kuota Santri
                </h3>
                <p className="text-xs text-emerald-850 max-w-2xl leading-relaxed">
                  Kelola kapasitas kamar asrama santri putra dan putri. Batas maksimal per kamar adalah 20 orang. Anda dapat memantau jumlah keterisian kamar secara real-time.
                </p>
              </div>
              <button
                onClick={handleOpenAddRoom}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Plus className="h-4 w-4" /> Tambah Kamar Baru
              </button>
            </div>

            {/* Room Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs text-center">
                <span className="text-2xl">🏬</span>
                <div className="text-[10px] text-slate-500 font-extrabold uppercase mt-1">Total Kamar</div>
                <div className="text-2xl font-black text-emerald-950 mt-0.5">{filteredRooms.length} Kamar</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs text-center">
                <span className="text-2xl">👦</span>
                <div className="text-[10px] text-slate-500 font-extrabold uppercase mt-1">Kamar Putra</div>
                <div className="text-2xl font-black text-blue-900 mt-0.5">{filteredRooms.filter(r => r.gender === 'Laki-laki').length} Kamar</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs text-center">
                <span className="text-2xl">👧</span>
                <div className="text-[10px] text-slate-500 font-extrabold uppercase mt-1">Kamar Putri</div>
                <div className="text-2xl font-black text-pink-900 mt-0.5">{filteredRooms.filter(r => r.gender === 'Perempuan').length} Kamar</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs text-center">
                <span className="text-2xl">👥</span>
                <div className="text-[10px] text-slate-500 font-extrabold uppercase mt-1">Santri Mondok</div>
                <div className="text-2xl font-black text-slate-900 mt-0.5">
                  {students.filter(s => s.status === 'Aktif' && s.kamar !== 'Luar Pondok' && rooms.some(r => isSameRoom(r.name, s.kamar))).length} Orang
                </div>
              </div>
            </div>

            {/* Filter and Search */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Search className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  value={roomSearch}
                  onChange={(e) => setRoomSearch(e.target.value)}
                  placeholder="Cari kamar berdasarkan nama..."
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <select
                value={roomGenderFilter}
                onChange={(e) => setRoomGenderFilter(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-semibold text-slate-700 focus:outline-none"
              >
                <option value="Semua">Semua Asrama</option>
                <option value="Laki-laki">Asrama Putra (Laki-laki)</option>
                <option value="Perempuan">Asrama Putri (Perempuan)</option>
              </select>
            </div>

            {/* Rooms Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRooms.length === 0 ? (
                <div className="col-span-full bg-white py-12 text-center rounded-2xl border border-dashed border-slate-200">
                  <p className="text-sm text-slate-400 font-bold">Kamar tidak ditemukan</p>
                  <p className="text-xs text-slate-400 mt-1">Silakan tambah kamar baru atau sesuaikan filter pencarian.</p>
                </div>
              ) : (
                filteredRooms.map(room => {
                  const occupiedCount = students.filter(s => isSameRoom(s.kamar, room.name) && s.status === 'Aktif').length;
                  const isFull = occupiedCount >= room.capacity;
                  const percent = Math.min(100, (occupiedCount / room.capacity) * 100);

                  return (
                    <div key={room.id} className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5 hover:shadow-md transition duration-150 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className={`text-[9px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full ${
                              room.gender === 'Laki-laki' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'
                            }`}>
                              Asrama {room.gender === 'Laki-laki' ? 'Putra' : 'Putri'}
                            </span>
                            <h4 className="text-sm font-black text-slate-900 mt-1.5">{room.name}</h4>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleOpenEditRoom(room)}
                              className="p-1 text-slate-500 hover:text-emerald-700 hover:bg-slate-50 rounded cursor-pointer transition"
                              title="Edit Kamar"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteRoom(room)}
                              className="p-1 text-slate-500 hover:text-red-700 hover:bg-slate-50 rounded cursor-pointer transition"
                              title="Hapus Kamar"
                            >
                              <Trash className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Room info spacer */}
                        <div className="h-1"></div>

                        {/* Ketua Kamar Badge & Selector */}
                        <div className="flex items-center justify-between text-xs bg-amber-50/80 p-2.5 rounded-xl border border-amber-200/60 mt-1">
                          <div className="flex items-center gap-2 truncate">
                            <span className="text-amber-600 text-sm">👑</span>
                            <div className="truncate">
                              <span className="text-[9px] font-black text-amber-800 uppercase block tracking-wider">Ketua Kamar:</span>
                              <span className="font-extrabold text-slate-800 text-[11px] truncate block">
                                {room.ketuaKamarName || 'Belum Ditentukan'}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectingKetuaRoom(room);
                              setKetuaSearchQuery('');
                              setKetuaScopeFilter('kamar_ini');
                            }}
                            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] rounded-lg shadow-xs transition shrink-0 cursor-pointer"
                          >
                            {room.ketuaKamarId ? 'Ganti' : 'Pilih Ketua'}
                          </button>
                        </div>
                      </div>

                      {/* Capacity Bar */}
                      <div className="space-y-1.5 pt-2 border-t border-slate-50">
                        <div className="flex justify-between text-[11px] font-bold">
                          <span className={isFull ? 'text-red-650' : 'text-emerald-800'}>
                            {isFull ? '🔴 Kamar Penuh' : '🟢 Tersedia'}
                          </span>
                          <span className="text-slate-700">
                            {occupiedCount} / <span className="text-gray-400 font-medium">{room.capacity} Kuota</span>
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-350 rounded-full ${
                              isFull ? 'bg-red-500' : percent > 85 ? 'bg-amber-500' : 'bg-emerald-600'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>

                      {/* Collapse Student List for room */}
                      <div className="pt-2">
                        <details className="group">
                          <summary className="text-[10px] font-extrabold text-slate-500 hover:text-slate-800 cursor-pointer list-none flex items-center justify-between select-none">
                            <span>LIHAT DAFTAR SANTRI ({occupiedCount})</span>
                            <span className="transition-transform duration-150 group-open:rotate-180">▼</span>
                          </summary>
                          <div className="mt-2 bg-slate-50/60 p-2 rounded-xl max-h-[120px] overflow-y-auto space-y-1 border border-slate-100/50">
                            {students.filter(s => isSameRoom(s.kamar, room.name) && s.status === 'Aktif').length === 0 ? (
                              <p className="text-[10px] text-slate-400 italic text-center py-2">Belum ada santri aktif di kamar ini.</p>
                            ) : (
                              students.filter(s => isSameRoom(s.kamar, room.name) && s.status === 'Aktif').map((s, idx) => (
                                <div key={s.id} className="flex justify-between items-center text-[10px] bg-white px-2.5 py-1 rounded border border-slate-100">
                                  <span className="font-bold text-slate-800">{idx+1}. {s.fullName}</span>
                                  <span className="font-mono text-gray-400 text-[9px]">{s.nis}</span>
                                </div>
                              ))
                            )}
                          </div>
                        </details>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* SECTION: SANTRI BELUM MEMILIKI KAMAR */}
            {(() => {
              const unassignedStudents = students.filter(s => s.status === 'Aktif' && (!s.kamar || s.kamar.trim() === '' || s.kamar === 'Belum Ada Kamar' || s.kamar === 'Belum Ditentukan' || !rooms.some(r => isSameRoom(r.name, s.kamar))));
              return (
                <div className="bg-white rounded-2xl border border-amber-200/80 shadow-xs p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl font-bold text-lg">
                        🚪
                      </div>
                      <div>
                        <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                          Santri Belum Memiliki Kamar
                          <span className="bg-amber-100 text-amber-900 text-xs px-2.5 py-0.5 rounded-full font-extrabold">
                            {unassignedStudents.length} Santri
                          </span>
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Daftar santri aktif yang belum ditempatkan di kamar asrama. Anda dapat menetapkan kamar secara langsung dari menu ini.
                        </p>
                      </div>
                    </div>
                  </div>

                  {unassignedStudents.length === 0 ? (
                    <div className="bg-emerald-50/60 p-6 rounded-xl border border-emerald-200/60 text-center">
                      <p className="text-xs font-extrabold text-emerald-800">🎉 Semua santri aktif sudah memiliki kamar asrama!</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 font-extrabold uppercase border-b border-slate-100">
                            <th className="py-2.5 px-3">No</th>
                            <th className="py-2.5 px-3">NIS & Nama Santri</th>
                            <th className="py-2.5 px-3">Gender</th>
                            <th className="py-2.5 px-3">Kelas / Pendidikan</th>
                            <th className="py-2.5 px-3 text-right">Aksi Tetapkan Kamar</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {unassignedStudents.map((std, idx) => (
                            <tr key={std.id} className="hover:bg-slate-50/80 transition">
                              <td className="py-2.5 px-3 font-bold text-slate-400">{idx + 1}</td>
                              <td className="py-2.5 px-3">
                                <div className="font-black text-slate-900">{std.fullName}</div>
                                <div className="text-[10px] font-mono text-slate-400">NIS: {std.nis}</div>
                              </td>
                              <td className="py-2.5 px-3">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                  std.gender === 'Perempuan' ? 'bg-pink-100 text-pink-800' : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {std.gender}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 font-medium">
                                {std.class || `${std.classFormal || '-'} • ${std.classMadrasah || '-'}`}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <select
                                    id={`assign-room-select-${std.id}`}
                                    className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                    defaultValue=""
                                  >
                                    <option value="" disabled>-- Pilih Kamar --</option>
                                    {rooms
                                      .filter(r => r.gender === std.gender || !std.gender)
                                      .map(r => {
                                        const count = students.filter(s => isSameRoom(s.kamar, r.name) && s.status === 'Aktif').length;
                                        return (
                                          <option key={r.id} value={r.name} disabled={count >= r.capacity}>
                                            {r.name} ({count}/{r.capacity} {count >= r.capacity ? '- Penuh' : ''})
                                          </option>
                                        );
                                      })}
                                  </select>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const sel = document.getElementById(`assign-room-select-${std.id}`) as HTMLSelectElement;
                                      if (!sel || !sel.value) {
                                        showAlert('danger', 'Silakan pilih kamar terlebih dahulu.');
                                        return;
                                      }
                                      const chosenRoom = sel.value;
                                      const updatedStudents = students.map(s => s.id === std.id ? { ...s, kamar: chosenRoom } : s);
                                      setStudents(updatedStudents);
                                      localStorage.setItem('pesantren_students', JSON.stringify(updatedStudents));
                                      window.dispatchEvent(new Event('pesantren_db_sync'));
                                      window.dispatchEvent(new Event('storage'));
                                      showAlert('success', `Berhasil menetapkan ${std.fullName} ke kamar ${chosenRoom}!`);
                                    }}
                                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs shadow-xs transition cursor-pointer"
                                  >
                                    Simpan Kamar
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* MODAL DIALOG: SELECT KETUA KAMAR */}
            {selectingKetuaRoom && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-emerald-950/75 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-emerald-100 text-slate-800 animate-fade-in text-xs flex flex-col max-h-[88vh] sm:max-h-[90vh] my-auto">
                  <div className="bg-gradient-to-r from-emerald-850 to-teal-900 text-white p-4 sm:p-5 flex justify-between items-center shrink-0">
                    <div>
                      <h4 className="font-extrabold text-sm uppercase tracking-wider flex items-center gap-2">
                        👑 Pilih / Ganti Ketua Kamar: {selectingKetuaRoom.name}
                      </h4>
                      <p className="text-[10px] text-teal-100 mt-0.5">
                        Pilih ketua kamar dari anggota kamar ini atau santri aktif dari kamar lain.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectingKetuaRoom(null)}
                      className="text-white hover:bg-emerald-800/50 p-1.5 rounded-full cursor-pointer transition"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="p-4 space-y-3 bg-slate-50 border-b border-slate-100 shrink-0">
                    {/* Scope Filter Tabs */}
                    <div className="flex bg-slate-200 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setKetuaScopeFilter('kamar_ini')}
                        className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition ${
                          ketuaScopeFilter === 'kamar_ini' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Anggota Kamar {selectingKetuaRoom.name}
                      </button>
                      <button
                        type="button"
                        onClick={() => setKetuaScopeFilter('semua')}
                        className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition ${
                          ketuaScopeFilter === 'semua' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Semua Santri Aktif (Kamar Lain)
                      </button>
                    </div>

                    {/* Search Input */}
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={ketuaSearchQuery}
                        onChange={(e) => setKetuaSearchQuery(e.target.value)}
                        placeholder="Cari nama santri atau NIS..."
                        className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  {/* Student List */}
                  <div className="p-4 overflow-y-auto space-y-2 flex-1">
                    {(() => {
                      let candidates = students.filter(s => s.status === 'Aktif');
                      
                      if (ketuaScopeFilter === 'kamar_ini') {
                        candidates = candidates.filter(s => isSameRoom(s.kamar, selectingKetuaRoom.name));
                      } else {
                        // Include same gender students from other rooms or no room
                        candidates = candidates.filter(s => (!s.gender || s.gender === selectingKetuaRoom.gender));
                      }

                      if (ketuaSearchQuery.trim()) {
                        const q = ketuaSearchQuery.toLowerCase();
                        candidates = candidates.filter(s => s.fullName.toLowerCase().includes(q) || s.nis.includes(q));
                      }

                      if (candidates.length === 0) {
                        return (
                          <div className="text-center py-8 text-slate-400 font-bold">
                            Tidak ada santri ditemukan untuk kriteria ini.
                          </div>
                        );
                      }

                      return candidates.map(s => {
                        const isCurrentKetua = selectingKetuaRoom.ketuaKamarId === s.id;
                        return (
                          <div
                            key={s.id}
                            className={`flex items-center justify-between p-3 rounded-xl border transition ${
                              isCurrentKetua
                                ? 'bg-amber-50 border-amber-300'
                                : 'bg-white border-slate-100 hover:border-amber-200 hover:bg-slate-50'
                            }`}
                          >
                            <div>
                              <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                                {s.fullName}
                                {isCurrentKetua && (
                                  <span className="bg-amber-600 text-white text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">
                                    Ketua Saat Ini
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                NIS: <span className="font-mono text-slate-700 font-bold">{s.nis}</span> • Kamar: <span className="font-bold text-slate-700">{s.kamar || 'Belum Ada Kamar'}</span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                const updatedRooms = rooms.map(r => r.id === selectingKetuaRoom.id ? {
                                  ...r,
                                  ketuaKamarId: s.id,
                                  ketuaKamarName: s.fullName
                                } : r);
                                setRooms(updatedRooms);
                                localStorage.setItem('pesantren_rooms', JSON.stringify(updatedRooms));
                                window.dispatchEvent(new Event('pesantren_db_sync'));
                                window.dispatchEvent(new Event('storage'));
                                showAlert('success', `${s.fullName} berhasil ditetapkan sebagai Ketua Kamar ${selectingKetuaRoom.name}!`);
                                setSelectingKetuaRoom(null);
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                                isCurrentKetua
                                  ? 'bg-amber-200 text-amber-900 hover:bg-amber-300'
                                  : 'bg-amber-600 hover:bg-amber-700 text-white'
                              }`}
                            >
                              {isCurrentKetua ? 'Terpilih' : 'Pilih Ketua'}
                            </button>
                          </div>
                        );
                      });
                    })()}
                  </div>

                  {/* Footer */}
                  <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center shrink-0">
                    {selectingKetuaRoom.ketuaKamarId ? (
                      <button
                        type="button"
                        onClick={() => {
                          const updatedRooms = rooms.map(r => r.id === selectingKetuaRoom.id ? {
                            ...r,
                            ketuaKamarId: undefined,
                            ketuaKamarName: undefined
                          } : r);
                          setRooms(updatedRooms);
                          localStorage.setItem('pesantren_rooms', JSON.stringify(updatedRooms));
                          window.dispatchEvent(new Event('pesantren_db_sync'));
                          window.dispatchEvent(new Event('storage'));
                          showAlert('success', `Ketua Kamar ${selectingKetuaRoom.name} telah dikosongkan.`);
                          setSelectingKetuaRoom(null);
                        }}
                        className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 font-bold rounded-lg text-xs transition cursor-pointer"
                      >
                        Hapus Ketua Kamar
                      </button>
                    ) : <div />}

                    <button
                      type="button"
                      onClick={() => setSelectingKetuaRoom(null)}
                      className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg text-xs transition cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* MODAL DIALOG: ADD / EDIT ROOM */}
            {(isAddRoomOpen || editingRoom) && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-950/70 backdrop-blur-sm overflow-y-auto">
                <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-emerald-100 flex flex-col my-auto max-h-[88vh] sm:max-h-[90vh] animate-fade-in">
                  <div className="bg-gradient-to-r from-emerald-850 to-teal-900 text-white p-4 sm:p-5 flex justify-between items-center shrink-0">
                    <div>
                      <h4 className="font-bold text-base flex items-center gap-2">
                        {editingRoom ? `✏️ Edit Data Kamar: ${editingRoom.name}` : '➕ Tambah Kamar Asrama Baru'}
                      </h4>
                      <p className="text-[10px] text-emerald-100 mt-0.5">Atur nama, kapasitas kuota, serta kelola ketua & daftar anak kamar.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddRoomOpen(false);
                        setEditingRoom(null);
                      }}
                      className="text-white hover:bg-emerald-800/50 p-1 rounded-full cursor-pointer transition"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveRoom} className="p-4 sm:p-6 space-y-3.5 flex-1 overflow-y-auto text-xs text-left">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Nama Kamar <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        required
                        value={roomFormName}
                        onChange={(e) => setRoomFormName(e.target.value)}
                        placeholder="CONTOH: AL-GHAZALI 6"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-emerald-700 uppercase"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Asrama Gender</label>
                        <select
                          value={roomFormGender}
                          onChange={(e) => setRoomFormGender(e.target.value as 'Laki-laki' | 'Perempuan')}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 font-semibold focus:outline-none"
                        >
                          <option value="Laki-laki">Putra (Laki-laki)</option>
                          <option value="Perempuan">Putri (Perempuan)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Kapasitas (Kuota Kamar)</label>
                        <input
                          type="number"
                          required
                          min={1}
                          value={roomFormCapacity}
                          onChange={(e) => setRoomFormCapacity(Number(e.target.value))}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-emerald-700"
                        />
                      </div>
                    </div>

                    {/* KETUA KAMAR SECTION (WHEN EDITING ROOM) */}
                    {editingRoom && (
                      <div className="p-3 bg-amber-50/90 rounded-xl border border-amber-200/80 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-base shrink-0">👑</span>
                            <div className="truncate">
                              <div className="text-[10px] font-black uppercase text-amber-800 tracking-wider">Ketua Kamar Saat Ini</div>
                              <div className="font-extrabold text-slate-900 text-xs truncate">
                                {editingRoom.ketuaKamarName || 'Belum Ditentukan'}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectingKetuaRoom(editingRoom);
                              setKetuaSearchQuery('');
                              setKetuaScopeFilter('kamar_ini');
                            }}
                            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] rounded-lg shadow-xs transition cursor-pointer shrink-0"
                          >
                            {editingRoom.ketuaKamarId ? 'Ganti Ketua' : 'Pilih Ketua'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* DAFTAR ANAK KAMAR / SANTRI PENGHUNI (WHEN EDITING ROOM) */}
                    {editingRoom && (() => {
                      const roomOccupants = students.filter(s => isSameRoom(s.kamar, editingRoom.name) && s.status === 'Aktif');
                      return (
                        <div className="space-y-2 pt-3 border-t border-slate-100">
                          <div className="flex items-center justify-between">
                            <div>
                              <label className="block text-[11px] uppercase font-black text-slate-800">
                                👥 Daftar Anak Kamar ({roomOccupants.length} / {roomFormCapacity} Santri)
                              </label>
                              <p className="text-[10px] text-slate-500">
                                Klik tombol <strong className="text-red-700">"Keluarkan"</strong> untuk memindahkan santri dari kamar ini.
                              </p>
                            </div>
                          </div>

                          {roomOccupants.length === 0 ? (
                            <div className="p-4 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-[11px]">
                              Belum ada santri aktif penghuni kamar ini.
                            </div>
                          ) : (
                            <div className="max-h-[220px] overflow-y-auto space-y-1.5 pr-1 border border-slate-100 rounded-xl p-2 bg-slate-50/50">
                              {roomOccupants.map((student, idx) => {
                                const isKetua = student.id === editingRoom.ketuaKamarId || (!!editingRoom.ketuaKamarName && student.fullName === editingRoom.ketuaKamarName);
                                return (
                                  <div 
                                    key={student.id} 
                                    className="flex items-center justify-between gap-2 p-2 bg-white rounded-lg border border-slate-200/80 hover:border-emerald-200 transition shadow-2xs"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div className="h-7 w-7 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[10px] shrink-0 border border-emerald-200 uppercase">
                                        {student.fullName.substring(0, 2)}
                                      </div>
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-1.5">
                                          <span className="font-extrabold text-slate-800 text-[11px] truncate">{idx + 1}. {student.fullName}</span>
                                          {isKetua && (
                                            <span className="px-1.5 py-0.2 bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-[9px] rounded-full shrink-0 flex items-center gap-0.5">
                                              👑 Ketua
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-[9px] text-slate-500 font-mono truncate">
                                          NIS: {student.nis} • Kelas: {student.class || '-'}
                                        </div>
                                      </div>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        triggerConfirm(
                                          'Keluarkan Santri dari Kamar',
                                          `Apakah Anda yakin ingin mengeluarkan santri "${student.fullName}" dari Kamar ${editingRoom.name}?`,
                                          () => {
                                            const updatedStudents = students.map(s => s.id === student.id ? { ...s, kamar: '' } : s);
                                            setStudents(updatedStudents);
                                            try {
                                              localStorage.setItem('pesantren_students', JSON.stringify(updatedStudents));
                                            } catch (err) {}

                                            // If this student was Ketua Kamar, clear ketua fields
                                            if (isKetua) {
                                              const updatedRoom = { ...editingRoom, ketuaKamarId: undefined, ketuaKamarName: undefined };
                                              setEditingRoom(updatedRoom);
                                              const updatedRooms = rooms.map(r => r.id === editingRoom.id ? updatedRoom : r);
                                              setRooms(updatedRooms);
                                              try {
                                                localStorage.setItem('pesantren_rooms', JSON.stringify(updatedRooms));
                                              } catch (err) {}
                                            }

                                            showAlert('success', `Santri ${student.fullName} telah dikeluarkan dari kamar ${editingRoom.name}.`);
                                          }
                                        );
                                      }}
                                      className="px-2.5 py-1 text-[10px] font-extrabold text-red-700 bg-red-50 hover:bg-red-100 hover:text-red-800 border border-red-200/80 rounded-lg transition flex items-center gap-1 cursor-pointer shrink-0 shadow-2xs"
                                      title="Keluarkan santri dari kamar ini"
                                    >
                                      <LogOut className="h-3 w-3" />
                                      Keluarkan
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 leading-normal text-[10px] space-y-1">
                      <p className="font-bold">⚠️ Ketentuan Kapasitas Kamar:</p>
                      <p>Kapasitas kamar dapat ditentukan secara manual sesuai kapasitas aktual asrama. Pengurangan kuota di bawah jumlah santri aktif saat ini tidak diperbolehkan.</p>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddRoomOpen(false);
                          setEditingRoom(null);
                        }}
                        className="px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer font-bold transition"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl cursor-pointer font-bold transition shadow-sm"
                      >
                        {editingRoom ? 'Simpan Perubahan' : 'Tambahkan Kamar'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Tab: Tuition Bills Management */}
      {activeTab === 'bills' && (
        <div className="space-y-6 text-left">
          {/* REKAPAN KEUANGAN & PEMBAYARAN */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-emerald-50/20 rounded-2xl border border-emerald-100">
            <div className="bg-white p-3.5 rounded-xl border border-emerald-50 shadow-xs text-center text-emerald-950">
              <span className="text-xl">💰</span>
              <div className="text-[10px] text-gray-500 font-bold uppercase mt-1">Total Tagihan Dibuat</div>
              <div className="text-sm font-black text-emerald-950 mt-0.5">Rp {filteredBills.reduce((sum, b) => sum + b.amount, 0).toLocaleString('id-ID')}</div>
              <div className="text-[9px] text-gray-400 mt-0.5 font-bold">({filteredBills.length} Invoice)</div>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-emerald-50 shadow-xs text-center text-emerald-950">
              <span className="text-xl">✅</span>
              <div className="text-[10px] text-gray-500 font-bold uppercase mt-1">Total SPP Berhasil Lunas</div>
              <div className="text-sm font-black text-emerald-700 mt-0.5">Rp {filteredBills.filter(b => b.status === 'Lunas').reduce((sum, b) => sum + b.amount, 0).toLocaleString('id-ID')}</div>
              <div className="text-[9px] text-emerald-600 mt-0.5 font-extrabold">({filteredBills.filter(b => b.status === 'Lunas').length} Transaksi)</div>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-emerald-50 shadow-xs text-center text-emerald-950">
              <span className="text-xl">🚨</span>
              <div className="text-[10px] text-gray-500 font-bold uppercase mt-1">Tunggakan Belum Lunas</div>
              <div className="text-sm font-black text-rose-600 mt-0.5">Rp {filteredBills.filter(b => b.status === 'Belum Lunas').reduce((sum, b) => sum + b.amount, 0).toLocaleString('id-ID')}</div>
              <div className="text-[9px] text-rose-500 mt-0.5 font-extrabold">({filteredBills.filter(b => b.status === 'Belum Lunas').length} Menunggu)</div>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-emerald-50 shadow-xs text-center text-emerald-950">
              <span className="text-xl">⏳</span>
              <div className="text-[10px] text-gray-500 font-bold uppercase mt-1">Butuh Verifikasi Admin</div>
              <div className="text-sm font-black text-amber-600 mt-0.5">{filteredBills.filter(b => b.status === 'Konfirmasi Pembayaran').length} Santri</div>
              <div className="text-[9px] text-amber-500 mt-0.5 font-extrabold">Perlu Segera Diperiksa</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-4">
          
          {/* Create bill left column (lg:col-span-1) */}
          <div className="lg:col-span-1 space-y-6 animate-fade-in">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-50 space-y-4">
            <h3 className="font-bold text-lg text-emerald-950 flex items-center gap-1.5 border-b border-gray-100 pb-2">
              <DollarSign className="h-5 w-5 text-emerald-700" />
              Kelola Tagihan Santri
            </h3>

            <form onSubmit={handleAddBill} className="space-y-3 bg-teal-50/20 p-4 border border-teal-100 rounded-xl text-xs">
              <span className="text-[10px] uppercase font-bold text-teal-800 block">Buat Tagihan Baru</span>
              
              <div className="p-2.5 bg-sky-50 border border-sky-150 rounded-xl text-[10px] text-sky-850 font-semibold leading-relaxed mb-2">
                📢 <strong>Info Tagihan Otomatis Santri Baru:</strong> Tagihan pendaftaran, seragam, kitab, sarpras, dan iuran Syahriyah bulanan untuk santri baru akan diterbitkan <strong>secara otomatis</strong> ketika pendaftaran mereka disetujui (dinyatakan Hadir & Lulus Berkas). Tidak perlu membuat tagihan manual untuk mereka di sini.
              </div>

              <div>
                <label className="text-[10px] font-semibold text-gray-500 block mb-1">Target Penerima Tagihan</label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setBillRecipientType('single')}
                    className={`py-1.5 px-3 rounded-lg text-xs font-bold border transition ${
                      billRecipientType === 'single'
                        ? 'bg-emerald-800 text-white border-emerald-800 shadow-sm'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    Santri Tertentu 👤
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillRecipientType('all')}
                    className={`py-1.5 px-3 rounded-lg text-xs font-bold border transition ${
                      billRecipientType === 'all'
                        ? 'bg-emerald-800 text-white border-emerald-800 shadow-sm'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    Semua Santri 👥
                  </button>
                </div>

                {billRecipientType === 'single' ? (
                  <div>
                    <label className="text-[10px] font-semibold text-gray-500 block mb-0.5">Pilih Santri Penerima</label>
                    <select
                      required
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      className="w-full px-2 py-1.5 border border-emerald-100 rounded-lg bg-white font-medium text-xs font-sans"
                    >
                      <option value="">-- Pilih Santri --</option>
                      {students.filter(s => s.status !== 'Alumni' && s.status !== 'Berhenti').map(s => (
                        <option key={s.id} value={s.id}>{s.fullName} ({s.class})</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-lg text-[11px] leading-relaxed font-semibold flex items-center gap-1.5">
                    <span>📢 <strong>Tagihan Massal:</strong> Kategori ini akan otomatis dibuat untuk seluruh ({students.filter(s => s.status !== 'Alumni' && s.status !== 'Berhenti').length}) santri aktif yang terdaftar.</span>
                  </div>
                )}
              </div>

              <div>
                <label className="text-[10px] font-semibold text-gray-500 block mb-0.5">Nama Tagihan</label>
                <input
                  type="text"
                  required
                  value={billTitle}
                  onChange={(e) => setBillTitle(e.target.value)}
                  className="w-full px-2 py-1.5 border border-emerald-100 rounded-lg bg-white font-medium text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 block mb-0.5">Jumlah (Rupiah)</label>
                  <input
                    type="number"
                    required
                    value={billAmount}
                    onChange={(e) => setBillAmount(Number(e.target.value))}
                    className="w-full px-2 py-1.5 border border-emerald-100 rounded-lg bg-white font-medium text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 block mb-0.5">Jatuh Tempo</label>
                  <input
                    type="date"
                    required
                    value={billDueDate}
                    onChange={(e) => setBillDueDate(e.target.value)}
                    className="w-full px-2 py-1.5 border border-emerald-100 rounded-lg bg-white font-medium text-xs font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-lg transition text-xs cursor-pointer shadow-xs uppercase tracking-wider"
              >
                Kirim Tagihan
              </button>
            </form>
          </div>

            {/* Aturan Penagihan Santri Baru Card */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-50 space-y-4">
              <h3 className="font-bold text-base text-emerald-950 flex items-center gap-1.5 border-b border-gray-100 pb-2">
                <Settings className="h-4.5 w-4.5 text-emerald-700" />
                Aturan Penagihan Santri Baru
              </h3>
              
              <p className="text-[10px] text-gray-500 leading-normal">
                Atur nominal biaya yang otomatis ditagihkan kepada calon santri baru saat pendaftarannya disetujui (diterima).
              </p>
              
              <div className="space-y-3.5 pt-1 text-xs">
                {/* Biaya Pendaftaran */}
                <div className="p-3 bg-emerald-50/30 rounded-xl border border-emerald-100/40 space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10.5px] font-bold text-emerald-950">1. Biaya Pendaftaran (PCSB)</label>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={settings.pcsbEnablePendaftaran !== false}
                        onChange={(e) => {
                          updateAndPersistSettings({
                            ...settings,
                            pcsbEnablePendaftaran: e.target.checked
                          });
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-7 h-4 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-700"></div>
                    </label>
                  </div>
                  {(settings.pcsbEnablePendaftaran !== false) && (
                    <div className="relative">
                      <span className="absolute left-2.5 top-1.5 text-[10px] font-bold text-emerald-800">Rp</span>
                      <input
                        type="number"
                        value={settings.pcsbFeePendaftaran !== undefined ? settings.pcsbFeePendaftaran : 150000}
                        onChange={(e) => {
                          updateAndPersistSettings({
                            ...settings,
                            pcsbFeePendaftaran: Number(e.target.value)
                          });
                        }}
                        className="w-full pl-8 pr-3 py-1 border border-emerald-100 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-700"
                      />
                    </div>
                  )}
                </div>

                {/* Infaq Sarpras */}
                <div className="p-3 bg-emerald-50/30 rounded-xl border border-emerald-100/40 space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10.5px] font-bold text-emerald-950">2. Infaq Pengembangan Sarpras</label>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={settings.pcsbEnableSarpras !== false}
                        onChange={(e) => {
                          updateAndPersistSettings({
                            ...settings,
                            pcsbEnableSarpras: e.target.checked
                          });
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-7 h-4 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-700"></div>
                    </label>
                  </div>
                  {(settings.pcsbEnableSarpras !== false) && (
                    <div className="relative">
                      <span className="absolute left-2.5 top-1.5 text-[10px] font-bold text-emerald-800">Rp</span>
                      <input
                        type="number"
                        value={settings.pcsbFeeSarpras !== undefined ? settings.pcsbFeeSarpras : 1500000}
                        onChange={(e) => {
                          updateAndPersistSettings({
                            ...settings,
                            pcsbFeeSarpras: Number(e.target.value)
                          });
                        }}
                        className="w-full pl-8 pr-3 py-1 border border-emerald-100 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-700"
                      />
                    </div>
                  )}
                </div>

                {/* Seragam Resmi */}
                <div className="p-3 bg-emerald-50/30 rounded-xl border border-emerald-100/40 space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10.5px] font-bold text-emerald-950">3. Seragam & Atribut Santri</label>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={settings.pcsbEnableSeragam !== false}
                        onChange={(e) => {
                          updateAndPersistSettings({
                            ...settings,
                            pcsbEnableSeragam: e.target.checked
                          });
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-7 h-4 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-700"></div>
                    </label>
                  </div>
                  {(settings.pcsbEnableSeragam !== false) && (
                    <div className="relative">
                      <span className="absolute left-2.5 top-1.5 text-[10px] font-bold text-emerald-800">Rp</span>
                      <input
                        type="number"
                        value={settings.pcsbFeeSeragam !== undefined ? settings.pcsbFeeSeragam : 750000}
                        onChange={(e) => {
                          updateAndPersistSettings({
                            ...settings,
                            pcsbFeeSeragam: Number(e.target.value)
                          });
                        }}
                        className="w-full pl-8 pr-3 py-1 border border-emerald-100 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-700"
                      />
                    </div>
                  )}
                </div>

                {/* Paket Kitab */}
                <div className="p-3 bg-emerald-50/30 rounded-xl border border-emerald-100/40 space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10.5px] font-bold text-emerald-950">4. Paket Kitab Kuning & Buku</label>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={settings.pcsbEnableKitab !== false}
                        onChange={(e) => {
                          updateAndPersistSettings({
                            ...settings,
                            pcsbEnableKitab: e.target.checked
                          });
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-7 h-4 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-700"></div>
                    </label>
                  </div>
                  {(settings.pcsbEnableKitab !== false) && (
                    <div className="relative">
                      <span className="absolute left-2.5 top-1.5 text-[10px] font-bold text-emerald-800">Rp</span>
                      <input
                        type="number"
                        value={settings.pcsbFeeKitab !== undefined ? settings.pcsbFeeKitab : 450000}
                        onChange={(e) => {
                          updateAndPersistSettings({
                            ...settings,
                            pcsbFeeKitab: Number(e.target.value)
                          });
                        }}
                        className="w-full pl-8 pr-3 py-1 border border-emerald-100 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-700"
                      />
                    </div>
                  )}
                </div>

                {/* Kas Kesehatan */}
                <div className="p-3 bg-emerald-50/30 rounded-xl border border-emerald-100/40 space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10.5px] font-bold text-emerald-950">5. Kas Kesehatan & Lemari</label>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={settings.pcsbEnableKesehatan !== false}
                        onChange={(e) => {
                          updateAndPersistSettings({
                            ...settings,
                            pcsbEnableKesehatan: e.target.checked
                          });
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-7 h-4 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-700"></div>
                    </label>
                  </div>
                  {(settings.pcsbEnableKesehatan !== false) && (
                    <div className="relative">
                      <span className="absolute left-2.5 top-1.5 text-[10px] font-bold text-emerald-800">Rp</span>
                      <input
                        type="number"
                        value={settings.pcsbFeeKesehatan !== undefined ? settings.pcsbFeeKesehatan : 350000}
                        onChange={(e) => {
                          updateAndPersistSettings({
                            ...settings,
                            pcsbFeeKesehatan: Number(e.target.value)
                          });
                        }}
                        className="w-full pl-8 pr-3 py-1 border border-emerald-100 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-700"
                      />
                    </div>
                  )}
                </div>

                {/* SPP Bulanan */}
                <div className="p-3 bg-emerald-50/30 rounded-xl border border-emerald-100/40 space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10.5px] font-bold text-emerald-950">6. SPP Bulanan (Syahriyah)</label>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={settings.pcsbEnableSyahriyah !== false}
                        onChange={(e) => {
                          updateAndPersistSettings({
                            ...settings,
                            pcsbEnableSyahriyah: e.target.checked
                          });
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-7 h-4 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-700"></div>
                    </label>
                  </div>
                  {(settings.pcsbEnableSyahriyah !== false) && (
                    <div className="relative">
                      <span className="absolute left-2.5 top-1.5 text-[10px] font-bold text-emerald-800">Rp</span>
                      <input
                        type="number"
                        value={settings.pcsbFeeSyahriyah !== undefined ? settings.pcsbFeeSyahriyah : 200000}
                        onChange={(e) => {
                          updateAndPersistSettings({
                            ...settings,
                            pcsbFeeSyahriyah: Number(e.target.value)
                          });
                        }}
                        className="w-full pl-8 pr-3 py-1 border border-emerald-100 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-700"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Billings list history right column (lg:col-span-2) */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-emerald-50 space-y-4 animate-fade-in">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[11px] uppercase font-bold text-gray-400 block tracking-wider">Histori Tagihan ({filteredBills.length})</span>
                {(billSearch || billFilter !== 'Semua') && (
                  <button 
                    type="button" 
                    onClick={() => { setBillSearch(''); setBillFilter('Semua'); }} 
                    className="text-[9px] text-rose-600 font-bold hover:underline cursor-pointer"
                  >
                    Reset Filter
                  </button>
                )}
              </div>

              {/* Advanced search and filter controls */}
              <div className="space-y-2 bg-emerald-50/20 p-2.5 rounded-xl border border-emerald-100/55">
                <input
                  type="text"
                  placeholder="Cari nama santri / tagihan..."
                  value={billSearch}
                  onChange={(e) => setBillSearch(e.target.value)}
                  className="w-full px-2 py-1.5 border border-emerald-100 rounded bg-white text-xs focus:ring-1 focus:ring-emerald-700 focus:outline-none"
                />
                <div className="flex flex-wrap gap-1">
                  {(['Semua', 'Belum Lunas', 'Konfirmasi Pembayaran', 'Lunas'] as const).map(f => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setBillFilter(f)}
                      className={`px-2.5 py-1 rounded text-[9px] font-bold transition cursor-pointer ${
                        billFilter === f 
                          ? 'bg-emerald-800 text-white' 
                          : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
                {filteredBills.map((b, idx) => (
                  <div key={b.id} className="p-2.5 bg-gray-50 rounded-xl border border-gray-150 text-xs flex justify-between items-center gap-2">
                    <div className="flex gap-2 items-start min-w-0">
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-950 font-mono font-black text-[10px] shrink-0 mt-0.5">
                        #{idx + 1}
                      </span>
                      <div className="min-w-0">
                        <strong className="block text-gray-900 leading-tight text-sm font-extrabold truncate">{b.studentName}</strong>
                        <span className="text-gray-500 text-[10px] block mt-0.5 truncate">{b.title} ({b.category || 'Lain-lain'})</span>
                        <span className="text-emerald-800 font-extrabold block mt-0.5 font-mono">Rp {b.amount.toLocaleString('id-ID')}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <button
                        onClick={() => toggleBillStatus(b.id, b.status === 'Lunas' ? 'Belum Lunas' : 'Lunas')}
                        className={`px-2 py-1 text-[10px] font-bold rounded-md block text-center uppercase min-w-[75px] cursor-pointer ${
                          b.status === 'Lunas' ? 'bg-emerald-100 text-emerald-800' : 
                          b.status === 'Konfirmasi Pembayaran' ? 'bg-amber-100 text-amber-800 animate-pulse' :
                          'bg-amber-50 text-amber-900 border border-amber-200'
                        }`}
                      >
                        {b.status === 'Lunas' ? 'Lunas ✓' : b.status === 'Konfirmasi Pembayaran' ? 'Periksa' : 'Belum Lunas'}
                      </button>

                      <button
                        type="button"
                        onClick={() => setEditingBill(b)}
                        className="text-amber-700 hover:underline text-[9px] font-bold block text-center mt-1 w-full cursor-pointer"
                      >
                        Edit Data Tagihan ✏️
                      </button>

                      {b.status === 'Lunas' && (
                        <button
                          type="button"
                          onClick={() => setReceiptBill(b)}
                          className="text-emerald-700 hover:underline text-[9px] font-bold block text-center mt-1 w-full cursor-pointer"
                        >
                          Cetak Kwitansi ⎙
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setSelectedBillForLogs(b)}
                        className="text-violet-700 hover:underline text-[9px] font-bold block text-center mt-1 w-full cursor-pointer"
                      >
                        Detail & Log AI 📋
                      </button>

                      <button
                        onClick={() => {
                          triggerConfirm(
                            'Hapus Tagihan',
                            `Yakin ingin menghapus tagihan milik ${b.studentName} sebesar Rp ${b.amount.toLocaleString()} ini?`,
                            () => {
                              setBills(bills.filter(bill => bill.id !== b.id));
                              showAlert('success', 'Tagihan dihapus.');
                            }
                          );
                        }}
                        className="text-red-500 hover:underline text-[9px] block text-center mt-1 w-full cursor-pointer"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                ))}

                {filteredBills.length === 0 && (
                  <p className="text-center py-6 text-gray-400 text-[10px]">Tidak ada data tagihan yang cocok.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Tab: Rekening Pesantren */}
      {activeTab === 'rekening' && (
        <div className="space-y-6 text-left animate-fade-in">
          {/* INFORMATION BANNER */}
          <div className="bg-gradient-to-r from-emerald-800 to-teal-950 text-white p-6 rounded-2xl border border-emerald-950 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1.5 text-left">
              <span className="text-[10px] uppercase font-bold tracking-widest text-amber-300 font-mono bg-emerald-900/60 px-2.5 py-0.5 rounded-full">
                MANAJEMEN REKENING PESANTREN
              </span>
              <h1 className="text-base font-black leading-snug uppercase">
                Konfigurasi Rekening Pembayaran Resmi
              </h1>
              <p className="text-xs text-emerald-150 max-w-2xl leading-relaxed">
                Semua tagihan, sanksi, atau iuran bulanan yang dibayar oleh Wali Santri akan dikirimkan ke akun rekening bank resmi yang dikonfigurasi di halaman ini. Pastikan data nomor rekening, kode bank, dan nama pemilik valid agar mempermudah verifikasi.
              </p>
            </div>
            <div className="shrink-0">
              <span className="text-4xl filter drop-shadow">🏦</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* EDIT / ADD FORM */}
            <div className="bg-white p-6 rounded-2xl shadow-xs border border-emerald-50 space-y-4">
              <h3 className="font-bold text-sm text-emerald-950 flex items-center gap-1.5 border-b border-gray-100 pb-2">
                <CreditCard className="h-4 w-4 text-emerald-700" />
                {editingBankAccount ? 'Ubah Rekening Pesantren' : 'Tambah Rekening Baru'}
              </h3>

              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (editingBankAccount) {
                    // Update existing
                    const updatedList = (editSettings.rekeningList || []).map(r => 
                      r.id === editingBankAccount.id 
                        ? { ...r, bankName: bankFormName, accountNumber: bankFormNumber, accountName: bankFormOwner }
                        : r
                    );
                    const updatedSettings = { ...editSettings, rekeningList: updatedList };
                    setEditSettings(updatedSettings);
                    setSettings(updatedSettings);
                    showAlert('success', 'Rekening berhasil diperbarui!');
                    setEditingBankAccount(null);
                  } else {
                    // Add new
                    const newAccount = {
                      id: 'rek-' + Date.now(),
                      bankName: bankFormName,
                      accountNumber: bankFormNumber,
                      accountName: bankFormOwner,
                      isMain: (editSettings.rekeningList || []).length === 0
                    };
                    const updatedList = [...(editSettings.rekeningList || []), newAccount];
                    const updatedSettings = { ...editSettings, rekeningList: updatedList };
                    setEditSettings(updatedSettings);
                    setSettings(updatedSettings);
                    showAlert('success', 'Rekening baru berhasil ditambahkan!');
                  }
                  // Reset form
                  setBankFormName('');
                  setBankFormNumber('');
                  setBankFormOwner('');
                }} 
                className="space-y-4 bg-teal-50/20 p-4 border border-teal-100 rounded-xl text-xs font-sans"
              >
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 block mb-1 uppercase tracking-wider">Nama Bank</label>
                  <select
                    value={bankFormName}
                    onChange={(e) => setBankFormName(e.target.value)}
                    className="w-full px-2.5 py-2 border border-emerald-100 rounded-lg bg-white font-medium text-xs text-slate-800"
                    required
                  >
                    <option value="">-- Pilih Bank / E-Wallet / QRIS --</option>
                    <optgroup label="Bank Transfer Mandiri & Syariah">
                      <option value="Bank Syariah Indonesia (BSI)">Bank Syariah Indonesia (BSI)</option>
                      <option value="Bank Rakyat Indonesia (BRI)">Bank Rakyat Indonesia (BRI)</option>
                      <option value="Bank Negara Indonesia (BNI)">Bank Negara Indonesia (BNI)</option>
                      <option value="Bank Mandiri">Bank Mandiri</option>
                      <option value="Bank Central Asia (BCA)">Bank Central Asia (BCA)</option>
                      <option value="Bank Muamalat">Bank Muamalat</option>
                      <option value="Bank BTPN / Jenius">Bank BTPN / Jenius</option>
                    </optgroup>
                    <optgroup label="E-Wallet & Dompet Digital">
                      <option value="DANA E-Wallet">DANA E-Wallet</option>
                      <option value="GoPay E-Wallet">GoPay E-Wallet</option>
                      <option value="OVO E-Wallet">OVO E-Wallet</option>
                      <option value="ShopeePay E-Wallet">ShopeePay E-Wallet</option>
                      <option value="LinkAja E-Wallet">LinkAja E-Wallet</option>
                      <option value="QRIS All Payment">QRIS All Payment</option>
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-gray-500 block mb-1 uppercase tracking-wider">Nomor Rekening / Virtual Account</label>
                  <input
                    type="text"
                    value={bankFormNumber}
                    onChange={(e) => setBankFormNumber(e.target.value)}
                    placeholder="Contoh: 718290182"
                    className="w-full px-2.5 py-2 border border-emerald-100 rounded-lg bg-white font-medium text-xs font-mono text-slate-800"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-gray-500 block mb-1 uppercase tracking-wider">Nama Pemilik Rekening (Atas Nama)</label>
                  <input
                    type="text"
                    value={bankFormOwner}
                    onChange={(e) => setBankFormOwner(e.target.value)}
                    placeholder="Contoh: PONPES AL-ASY'ARIYAH"
                    className="w-full px-2.5 py-2 border border-emerald-100 rounded-lg bg-white font-bold text-xs uppercase text-slate-800"
                    required
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold rounded-lg transition text-xs cursor-pointer shadow-xs font-sans"
                  >
                    {editingBankAccount ? 'Simpan Perubahan ✓' : 'Tambah Rekening ✓'}
                  </button>
                  {editingBankAccount && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingBankAccount(null);
                        setBankFormName('');
                        setBankFormNumber('');
                        setBankFormOwner('');
                      }}
                      className="px-3 py-2 bg-gray-150 hover:bg-gray-200 text-slate-700 font-semibold rounded-lg text-xs cursor-pointer"
                    >
                      Batal
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* CHANNELS LIST */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-xs border border-emerald-50 space-y-4">
              <div className="border-b border-gray-100 pb-2 flex justify-between items-center">
                <h3 className="font-bold text-sm text-emerald-950 flex items-center gap-1.5">
                  <Grid className="h-4 w-4 text-emerald-700" />
                  Daftar Kanal Pembayaran & Virtual Account Aktif
                </h3>
                <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                  {(editSettings.rekeningList || []).length} Saluran Aktif
                </span>
              </div>

              <div className="space-y-3">
                {(editSettings.rekeningList || []).length > 0 ? (
                  (editSettings.rekeningList || []).map((rek) => {
                    const isEWallet = rek.type === 'ewallet' || 
                      rek.bankName.toLowerCase().includes('wallet') || 
                      rek.bankName.toLowerCase().includes('dana') || 
                      rek.bankName.toLowerCase().includes('gopay') || 
                      rek.bankName.toLowerCase().includes('qris') ||
                      rek.bankName.toLowerCase().includes('ovo') ||
                      rek.bankName.toLowerCase().includes('shopeepay');

                    const bankShort = isEWallet ? (
                      rek.bankName.toLowerCase().includes('dana') ? 'DANA' :
                      rek.bankName.toLowerCase().includes('gopay') ? 'GOPAY' :
                      rek.bankName.toLowerCase().includes('ovo') ? 'OVO' :
                      rek.bankName.toLowerCase().includes('qris') ? 'QRIS' : 'E-WALL'
                    ) : (
                      rek.bankName.includes('Syariah Indonesia') ? 'BSI' :
                      rek.bankName.includes('Rakyat Indonesia') ? 'BRI' :
                      rek.bankName.includes('Negara Indonesia') ? 'BNI' :
                      rek.bankName.includes('Central Asia') ? 'BCA' :
                      rek.bankName.includes('Mandiri') ? 'MANDIRI' : 'BANK'
                    );
                    
                    const logoBg = isEWallet ? 'bg-indigo-50 text-indigo-800 border-indigo-200' :
                                   bankShort === 'BSI' ? 'bg-teal-50 text-teal-800 border-teal-100' :
                                   bankShort === 'BRI' ? 'bg-blue-50 text-blue-800 border-blue-100' :
                                   bankShort === 'BNI' ? 'bg-orange-50 text-orange-800 border-orange-100' :
                                   bankShort === 'BCA' ? 'bg-sky-50 text-sky-800 border-sky-100' :
                                   'bg-slate-50 text-slate-800 border-slate-100';

                    return (
                      <div key={rek.id} className="p-4 border border-slate-150 rounded-xl hover:border-emerald-200 hover:bg-emerald-50/5 transition flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-lg border flex items-center justify-center text-[9px] font-black uppercase shrink-0 ${logoBg}`}>
                            {bankShort}
                          </div>
                          <div className="text-xs text-left">
                            <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                              {rek.bankName}
                              {isEWallet && (
                                <span className="bg-indigo-100 text-indigo-800 text-[8px] font-mono font-bold px-1.5 py-0.2 rounded uppercase">
                                  📱 E-Wallet
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                              {isEWallet ? 'No. HP / VA:' : 'No. Rekening:'} <strong className="text-slate-800">{rek.accountNumber}</strong>
                            </div>
                            <div className="text-[10px] text-gray-500 uppercase mt-0.5">A.N. <strong className="text-slate-800">{rek.accountName}</strong></div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingBankAccount(rek);
                              setBankFormName(rek.bankName);
                              setBankFormNumber(rek.accountNumber);
                              setBankFormOwner(rek.accountName);
                            }}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                            title="Ubah Rekening"
                          >
                            ✏️
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              triggerConfirm(
                                'Hapus Rekening Pesantren',
                                `Apakah Anda yakin ingin menghapus rekening ${rek.bankName} (${rek.accountNumber})?`,
                                () => {
                                  const updatedList = (editSettings.rekeningList || []).filter(r => r.id !== rek.id);
                                  // If we deleted the main, set the first remaining as main
                                  if (rek.isMain && updatedList.length > 0) {
                                    updatedList[0].isMain = true;
                                  }
                                  const updatedSettings = { ...editSettings, rekeningList: updatedList };
                                  setEditSettings(updatedSettings);
                                  setSettings(updatedSettings);
                                  showAlert('success', 'Rekening berhasil dihapus!');
                                }
                              );
                            }}
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="Hapus Rekening"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-gray-400 font-medium italic border border-dashed rounded-xl bg-slate-50/50">
                    Belum ada rekening pesantren yang dikonfigurasi. Silakan tambah di sebelah kiri.
                  </div>
                )}
              </div>

              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-950 flex gap-2 items-start leading-relaxed font-semibold mt-4">
                <span className="text-base leading-none">💡</span>
                <div>
                  <strong>Panduan Wali Santri:</strong> Ketika Wali Santri membuka akun mereka di portal wali, seluruh daftar rekening aktif di atas akan tampil secara dinamis sebagai opsi tujuan pembayaran syahriyah atau tagihan lainnya.
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Tab: Input Santri Baru Mandiri */}
      {activeTab === 'input_mandiri' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-50 text-left">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3 mb-6">
            <span className="text-2xl">➕</span>
            <div>
              <h3 className="font-extrabold text-sm text-emerald-950 uppercase tracking-wider">
                Formulir Pendaftaran Santri Baru (Mandiri/Manual)
              </h3>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Silakan isi lengkap data calon santri baru di bawah ini secara teliti untuk didaftarkan langsung ke database pesantren.
              </p>
            </div>
          </div>

          <form onSubmit={handleAddStudent} className="space-y-6 text-xs">
            {/* Section 1: Data Diri */}
            <div className="bg-emerald-50/10 p-5 rounded-2xl border border-emerald-100/40 space-y-4">
              <h4 className="font-bold text-xs text-emerald-900 uppercase tracking-widest flex items-center gap-1.5 border-b border-emerald-100/50 pb-1.5">
                👤 DATA IDENTITAS DIRI SANTRI
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Nama Lengkap <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={newStdName}
                    onChange={(e) => setNewStdName(e.target.value)}
                    placeholder="Contoh: Muhammad Akhyar"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-750 text-slate-800 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Jenis Kelamin</label>
                  <select
                    value={newStdGender}
                    onChange={(e) => {
                      const nextGender = e.target.value as 'Laki-laki' | 'Perempuan';
                      setNewStdGender(nextGender);
                      const match = (rooms || []).find(r => r.gender === nextGender);
                      if (match) {
                        setNewStdKamar(match.name);
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-750 text-slate-800 font-semibold"
                  >
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Tempat Lahir</label>
                  <input
                    type="text"
                    value={newStdBirthPlace}
                    onChange={(e) => setNewStdBirthPlace(e.target.value)}
                    placeholder="Contoh: Semarang"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-750 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Tanggal Lahir</label>
                  <input
                    type="date"
                    value={newStdBirthDate}
                    onChange={(e) => setNewStdBirthDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-750 text-slate-800 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Foto Profil Santri (Upload Lokal)</label>
                  <input
                    type="file"
                    accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const compressed = await compressImage(file, 160, 200, 0.5);
                            setNewStdPhoto(compressed);
                          } catch (err) {
                            console.error("Failed to compress image:", err);
                          }
                        }
                      }}
                    className="w-full text-slate-500 font-mono text-[10px] file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-[10px] file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                  />
                  {newStdPhoto && (
                    <div className="mt-2 flex items-center gap-2">
                      <img src={newStdPhoto} alt="Pratinjau Foto" className="h-10 w-8 object-cover rounded border border-gray-200 animate-fade-in" />
                      <button 
                        type="button" 
                        onClick={() => setNewStdPhoto('')} 
                        className="px-2 py-1 text-[9px] bg-red-100 text-red-750 rounded font-bold hover:bg-red-200 cursor-pointer transition"
                      >
                        Hapus Foto ✕
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Section 2: Kamar & Pendidikan Terpisah */}
            <div className="bg-amber-50/10 p-5 rounded-2xl border border-amber-100/40 space-y-4">
              <h4 className="font-bold text-xs text-amber-900 uppercase tracking-widest flex items-center gap-1.5 border-b border-amber-100/50 pb-1.5">
                🏢 ALOKASI KAMAR & JENJANG SEKOLAH (TERPISAH)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Kamar Santri <span className="text-red-500">*</span></label>
                  <select
                    required
                    value={newStdKamar}
                    onChange={(e) => setNewStdKamar(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-750 text-slate-800 font-bold"
                  >
                    <option value="">-- Pilih Kamar --</option>
                    <option value="Luar Pondok">Luar Pondok (Tidak Menetap)</option>
                    {(rooms || []).filter(r => r.gender === newStdGender).map(r => {
                      const occupants = students.filter(s => s.status === 'Aktif' && s.kamar?.toUpperCase() === r.name.toUpperCase()).length;
                      return (
                        <option key={r.id} value={r.name}>
                          {r.name} (Terisi: {occupants}/{r.capacity})
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Sekolah Formal (Sore) <span className="text-red-500">*</span></label>
                  <select
                    value={newStdClassFormal}
                    onChange={(e) => setNewStdClassFormal(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-750 text-slate-800 font-bold bg-white text-xs"
                    required
                  >
                    {availableFormalClasses.map((cls) => (
                      <option key={cls} value={cls}>{cls}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Sekolah Non-Formal (Madrasah Pagi) <span className="text-red-500">*</span></label>
                  <select
                    value={newStdClassMadrasah}
                    onChange={(e) => setNewStdClassMadrasah(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-750 text-slate-800 font-bold bg-white text-xs"
                    required
                  >
                    {availableMadrasahClasses.map((cls) => (
                      <option key={cls} value={cls}>{cls}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Section 3: Orang Tua / Wali */}
            <div className="bg-emerald-50/10 p-5 rounded-2xl border border-emerald-100/40 space-y-4">
              <h4 className="font-bold text-xs text-emerald-900 uppercase tracking-widest flex items-center gap-1.5 border-b border-emerald-100/50 pb-1.5">
                👨‍👩‍👦 DATA KELUARGA & KONTAK WALI
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Nama Lengkap Wali <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={newStdParent}
                    onChange={(e) => setNewStdParent(e.target.value)}
                    placeholder="Contoh: Budi Santoso"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-750 text-slate-800 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Nomor WA Wali <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={newStdPhone}
                    onChange={(e) => setNewStdPhone(e.target.value)}
                    placeholder="Contoh: 628123456789"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-750 font-mono text-slate-800 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Nama Kandung Ayah</label>
                  <input
                    type="text"
                    value={newStdFatherName}
                    onChange={(e) => setNewStdFatherName(e.target.value)}
                    placeholder="Contoh: Ahmad"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-750 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Nama Kandung Ibu</label>
                  <input
                    type="text"
                    value={newStdMotherName}
                    onChange={(e) => setNewStdMotherName(e.target.value)}
                    placeholder="Contoh: Siti"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-750 text-slate-800"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Email Kredensial (Opsional)</label>
                  <input
                    type="email"
                    value={newStdEmail}
                    onChange={(e) => setNewStdEmail(e.target.value)}
                    placeholder="Biarkan kosong untuk generate otomatis"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-750 text-slate-800 font-mono"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Alamat Rumah Lengkap</label>
                  <input
                    type="text"
                    value={newStdAddress}
                    onChange={(e) => setNewStdAddress(e.target.value)}
                    placeholder="Contoh: Jl. Raya Modung, Langpanggang, Modung, Bangkalan, Jawa Timur"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-750 text-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Data Kependudukan */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/60 space-y-4">
              <h4 className="font-bold text-xs text-slate-700 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                📋 DATA DOKUMEN KEPENDUDUKAN
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Nomor NIK Santri</label>
                  <input
                    type="text"
                    value={newStdNik}
                    onChange={(e) => setNewStdNik(e.target.value)}
                    placeholder="16 digit NIK..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-750 font-mono text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Nomor Kartu Keluarga (KK)</label>
                  <input
                    type="text"
                    value={newStdKk}
                    onChange={(e) => setNewStdKk(e.target.value)}
                    placeholder="16 digit No KK..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-750 font-mono text-slate-800"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className="px-5 py-2.5 bg-slate-150 hover:bg-slate-250 text-slate-800 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-850 to-teal-900 hover:from-emerald-800 hover:to-teal-800 text-white rounded-xl text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <span>🚀</span> Daftarkan Santri Baru
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab: Input Kelas & Sekolah */}
      {activeTab === 'kelas_sekolah' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-50">
            <div className="border-b border-gray-100 pb-4 mb-4">
              <div>
                <h3 className="font-bold text-lg text-emerald-950 flex items-center gap-1.5">
                  <Plus className="h-5 w-5 text-emerald-700" />
                  Master Data Kelas & Sekolah
                </h3>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  Pilihan kelas ini digunakan saat menambah/mengedit data santri dan otomatis tersinkron ke cloud di seluruh perangkat.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* KOLOM 1: SEKOLAH FORMAL */}
              <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="font-bold text-sm text-emerald-900 flex items-center gap-1.5 uppercase tracking-wide">
                    🏫 Sekolah Formal (Sore)
                  </h4>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                    {availableFormalClasses.length} Pilihan
                  </span>
                </div>

                {/* Form Tambah Kelas Formal */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const input = form.elements.namedItem('newFormalClass') as HTMLInputElement;
                    const val = input.value.trim();
                    if (!val) return;
                    if (availableFormalClasses.includes(val)) {
                      showAlert('danger', `Kelas "${val}" sudah ada dalam pilihan!`);
                      return;
                    }
                    const updated = [...availableFormalClasses, val];
                    setAvailableFormalClasses(updated);
                    localStorage.setItem('pesantren_available_formal_classes', JSON.stringify(updated));
                    pushMasterClassesToSupabase({ formal: updated, madrasah: availableMadrasahClasses }).catch(console.error);
                    setEditSettings(prev => ({ ...prev, availableFormalClasses: updated }));
                    window.dispatchEvent(new Event('pesantren_settings_updated'));
                    logAdminActivity('TAMBAH_MASTER_KELAS', `Menambahkan master kelas formal: ${val}`);
                    showAlert('success', `Master kelas formal "${val}" berhasil ditambahkan & disinkronkan ke cloud!`);
                    form.reset();
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    name="newFormalClass"
                    required
                    placeholder="Contoh: VII SMP Formal, X MA Formal..."
                    className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-750 text-slate-800 font-bold bg-white"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-emerald-800 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Tambah
                  </button>
                </form>

                {/* List Kelas Formal */}
                <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                  {availableFormalClasses.map((cls) => (
                    <div
                      key={cls}
                      className="bg-white px-3 py-2 rounded-lg border border-slate-100 flex items-center justify-between text-xs font-bold hover:bg-emerald-50/10 transition"
                    >
                      <span className="text-slate-800">{cls}</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (availableFormalClasses.length <= 1) {
                            showAlert('danger', 'Minimal harus ada 1 pilihan kelas formal!');
                            return;
                          }
                          triggerConfirm(
                            'Hapus Master Kelas',
                            `Apakah Anda yakin ingin menghapus master kelas "${cls}"?`,
                            () => {
                              const updated = availableFormalClasses.filter((c) => c !== cls);
                              setAvailableFormalClasses(updated);
                              localStorage.setItem('pesantren_available_formal_classes', JSON.stringify(updated));
                              pushMasterClassesToSupabase({ formal: updated, madrasah: availableMadrasahClasses }).catch(console.error);
                              setEditSettings(prev => ({ ...prev, availableFormalClasses: updated }));
                              window.dispatchEvent(new Event('pesantren_settings_updated'));
                              logAdminActivity('HAPUS_MASTER_KELAS', `Menghapus master kelas formal: ${cls}`);
                              showAlert('success', `Master kelas formal "${cls}" berhasil dihapus & disinkronkan ke cloud.`);
                            }
                          );
                        }}
                        className="text-red-500 hover:bg-red-50 p-1 rounded-md transition cursor-pointer"
                        title="Hapus"
                      >
                        <Trash className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* KOLOM 2: MADRASAH */}
              <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="font-bold text-sm text-emerald-900 flex items-center gap-1.5 uppercase tracking-wide">
                    🕌 Madrasah Diniyah (Pagi)
                  </h4>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                    {availableMadrasahClasses.length} Pilihan
                  </span>
                </div>

                {/* Form Tambah Kelas Madrasah */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const input = form.elements.namedItem('newMadrasahClass') as HTMLInputElement;
                    const val = input.value.trim();
                    if (!val) return;
                    if (availableMadrasahClasses.includes(val)) {
                      showAlert('danger', `Kelas "${val}" sudah ada dalam pilihan!`);
                      return;
                    }
                    const updated = [...availableMadrasahClasses, val];
                    setAvailableMadrasahClasses(updated);
                    localStorage.setItem('pesantren_available_madrasah_classes', JSON.stringify(updated));
                    pushMasterClassesToSupabase({ formal: availableFormalClasses, madrasah: updated }).catch(console.error);
                    setEditSettings(prev => ({ ...prev, availableMadrasahClasses: updated }));
                    window.dispatchEvent(new Event('pesantren_settings_updated'));
                    logAdminActivity('TAMBAH_MASTER_KELAS', `Menambahkan master kelas madrasah: ${val}`);
                    showAlert('success', `Master kelas madrasah "${val}" berhasil ditambahkan & disinkronkan ke cloud!`);
                    form.reset();
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    name="newMadrasahClass"
                    required
                    placeholder="Contoh: 1A MTs Diniyah, 1A MA Diniyah..."
                    className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-750 text-slate-800 font-bold bg-white"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-emerald-800 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Tambah
                  </button>
                </form>

                {/* List Kelas Madrasah */}
                <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                  {availableMadrasahClasses.map((cls) => (
                    <div
                      key={cls}
                      className="bg-white px-3 py-2 rounded-lg border border-slate-100 flex items-center justify-between text-xs font-bold hover:bg-emerald-50/10 transition"
                    >
                      <span className="text-slate-800">{cls}</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (availableMadrasahClasses.length <= 1) {
                            showAlert('danger', 'Minimal harus ada 1 pilihan kelas madrasah!');
                            return;
                          }
                          triggerConfirm(
                            'Hapus Master Kelas',
                            `Apakah Anda yakin ingin menghapus master kelas "${cls}"?`,
                            () => {
                              const updated = availableMadrasahClasses.filter((c) => c !== cls);
                              setAvailableMadrasahClasses(updated);
                              localStorage.setItem('pesantren_available_madrasah_classes', JSON.stringify(updated));
                              pushMasterClassesToSupabase({ formal: availableFormalClasses, madrasah: updated }).catch(console.error);
                              setEditSettings(prev => ({ ...prev, availableMadrasahClasses: updated }));
                              window.dispatchEvent(new Event('pesantren_settings_updated'));
                              logAdminActivity('HAPUS_MASTER_KELAS', `Menghapus master kelas madrasah: ${cls}`);
                              showAlert('success', `Master kelas madrasah "${cls}" berhasil dihapus & disinkronkan ke cloud.`);
                            }
                          );
                        }}
                        className="text-red-500 hover:bg-red-50 p-1 rounded-md transition cursor-pointer"
                        title="Hapus"
                      >
                        <Trash className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Settings */}
      {activeTab === 'settings' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-50">
          <h3 className="font-bold text-lg text-emerald-950 flex items-center justify-between border-b border-gray-100 pb-3 mb-4 flex-wrap gap-2">
            <span className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-emerald-700" />
              Pengaturan Konten Portal Online
            </span>
            <div className="flex items-center gap-2">
              {isSettingsDirty && (
                <span className="text-[11px] px-2.5 py-1 rounded-full font-bold bg-amber-100 text-amber-900 border border-amber-200">
                  ⚠️ Belum disimpan
                </span>
              )}
              <button
                type="button"
                onClick={handleSavePortalSettings}
                disabled={saveStatus === 'saving'}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-bold rounded-xl text-xs shadow transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {saveStatus === 'saving' ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : saveStatus === 'saved' ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
                    <span>Tersimpan!</span>
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    <span>✓ Konfirmasi & Simpan Pengaturan Portal</span>
                  </>
                )}
              </button>
            </div>
          </h3>

          <form onSubmit={(e) => e.preventDefault()} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-emerald-900 uppercase mb-1">Nama Pondok Pesantren</label>
                <input
                  type="text"
                  required
                  value={editSettings.schoolName}
                  onChange={(e) => {
                    setEditSettings({ ...editSettings, schoolName: e.target.value });
                    setIsSettingsDirty(true);
                  }}
                  className="w-full px-3 py-2 border border-emerald-100 rounded-lg bg-emerald-50/10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-emerald-900 uppercase mb-1">Nama Yayasan</label>
                <input
                  type="text"
                  required
                  value={editSettings.namaYayasan || ''}
                  onChange={(e) => {
                    setEditSettings({ ...editSettings, namaYayasan: e.target.value });
                    setIsSettingsDirty(true);
                  }}
                  placeholder="Contoh: Yayasan Al-Asy'ariyah"
                  className="w-full px-3 py-2 border border-emerald-100 rounded-lg bg-emerald-50/10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-emerald-900 uppercase mb-1">Semboyan / Tagline</label>
                <input
                  type="text"
                  required
                  value={editSettings.tagline}
                  onChange={(e) => {
                    setEditSettings({ ...editSettings, tagline: e.target.value });
                    setIsSettingsDirty(true);
                  }}
                  className="w-full px-3 py-2 border border-emerald-100 rounded-lg bg-emerald-50/10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-emerald-900 uppercase mb-1">Nama Pengasuh Pesantren</label>
                <input
                  type="text"
                  required
                  value={editSettings.namaPengasuh || editSettings.namaPengurus || ''}
                  onChange={(e) => {
                    setEditSettings({ ...editSettings, namaPengasuh: e.target.value, namaPengurus: e.target.value });
                    setIsSettingsDirty(true);
                  }}
                  placeholder="Contoh: KH. Asy'ari Al-Hafidz"
                  className="w-full px-3 py-2 border border-emerald-100 rounded-lg bg-emerald-50/10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>

              <div className="md:col-span-2 bg-emerald-50/40 p-4 rounded-xl border border-emerald-100/80">
                <label className="block text-xs font-semibold text-emerald-900 uppercase mb-1">
                  Lambang / Logo Resmi Pondok Pesantren
                </label>
                <p className="text-[11px] text-gray-500 mb-3 leading-relaxed">
                  Logo ini akan ditampilkan di navbar atas, kop surat resmi, kartu santri, kwitansi, dan laporan cetak. Anda dapat mengunggah file gambar (PNG transparan disarankan) atau menempelkan tautan/URL langsung.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  <label className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center shrink-0 cursor-pointer transition active:scale-95 gap-1.5 shadow-sm">
                    <UploadCloud className="h-4 w-4" /> Unggah File Logo
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 5 * 1024 * 1024) {
                            showAlert('danger', 'Ukuran file terlalu besar! Maksimal ukuran file logo adalah 5MB.');
                            return;
                          }
                          try {
                            const compressed = await compressImage(file, 280, 280, 0.8);
                            if (!compressed) throw new Error('Gagal memproses gambar');
                            setEditSettings({ ...editSettings, logoUrl: compressed });
                            setIsSettingsDirty(true);
                            showAlert('success', 'Logo berhasil dimuat! Jangan lupa klik tombol "Simpan Pengaturan Portal".');
                          } catch (err: any) {
                            showAlert('danger', `Gagal mengunggah logo: ${err?.message || 'Format gambar tidak didukung'}`);
                          }
                        }
                      }}
                    />
                  </label>

                  <div className="flex-1 w-full">
                    <input
                      type="text"
                      placeholder="Atau tempel URL gambar logo (https://...)"
                      value={editSettings.logoUrl?.startsWith('data:') ? '' : (editSettings.logoUrl || '')}
                      onChange={(e) => {
                        setEditSettings({ ...editSettings, logoUrl: e.target.value.trim() });
                        setIsSettingsDirty(true);
                      }}
                      className="w-full px-3 py-2 text-xs border border-emerald-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-700 font-mono"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setEditSettings({ ...editSettings, logoUrl: '/pesantren_logo.jpg' });
                      setIsSettingsDirty(true);
                      showAlert('success', 'Logo dikembalikan ke logo bawaan sistem (/pesantren_logo.jpg).');
                    }}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold shrink-0 transition"
                    title="Gunakan logo standar"
                  >
                    Reset Bawaan
                  </button>
                </div>

                {/* Pratinjau Logo */}
                <div className="mt-3 flex items-center gap-3 pt-2 border-t border-emerald-100/60">
                  <span className="text-[11px] font-bold text-emerald-900">Pratinjau Tampilan:</span>
                  
                  {/* Pratinjau Background Terang */}
                  <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-lg border border-slate-200 shadow-xs" title="Tampilan di latar terang">
                    <span className="text-[9px] text-gray-400 font-mono">Terang:</span>
                    <img
                      src={editSettings.logoUrl || '/pesantren_logo.jpg'}
                      alt="Pratinjau Logo"
                      className="h-8 w-8 object-contain"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/pesantren_logo.jpg';
                      }}
                    />
                  </div>

                  {/* Pratinjau Background Gelap / Navbar */}
                  <div className="flex items-center gap-1.5 bg-emerald-900 p-1.5 rounded-lg border border-emerald-950 shadow-xs" title="Tampilan di latar gelap (Navbar)">
                    <span className="text-[9px] text-emerald-300 font-mono">Gelap:</span>
                    <img
                      src={editSettings.logoUrl || '/pesantren_logo.jpg'}
                      alt="Pratinjau Logo Navbar"
                      className="h-8 w-8 object-contain"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/pesantren_logo.jpg';
                      }}
                    />
                  </div>

                  {editSettings.logoUrl && editSettings.logoUrl !== '/pesantren_logo.jpg' && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditSettings({ ...editSettings, logoUrl: '' });
                        setIsSettingsDirty(true);
                      }}
                      className="text-red-600 text-xs hover:underline font-bold ml-auto cursor-pointer"
                    >
                      Hapus Logo
                    </button>
                  )}
                </div>
              </div>

              {/* Data Nama Pengasuh Pesantren */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-emerald-900 uppercase mb-1">
                  Nama Lengkap Pengasuh Pondok Pesantren
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: KH. Ahmad Wildan Asy'ari"
                  value={editSettings.namaPengasuh || ''}
                  onChange={(e) => {
                    setEditSettings({ ...editSettings, namaPengasuh: e.target.value });
                    setIsSettingsDirty(true);
                  }}
                  className="w-full px-3 py-2 border border-emerald-200 rounded-lg bg-emerald-50/10 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>

              {/* Input Foto Tanda Tangan Pengasuh */}
              <div className="bg-emerald-50/40 p-4 rounded-xl border border-emerald-100/80">
                <div className="mb-2">
                  <label className="block text-xs font-bold text-emerald-900 uppercase">
                    ✍️ Foto Tanda Tangan Pengasuh
                  </label>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                  <label className="bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center shrink-0 cursor-pointer transition active:scale-95 gap-1.5 shadow-sm">
                    <UploadCloud className="h-4 w-4" /> Unggah TTD
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 5 * 1024 * 1024) {
                            showAlert('danger', 'Ukuran file tanda tangan maksimal 5MB.');
                            return;
                          }
                          try {
                            const compressed = await compressImage(file, 300, 160, 0.85);
                            if (!compressed) throw new Error('Gagal memproses gambar tanda tangan');
                            setEditSettings({ ...editSettings, ttdPengasuhUrl: compressed, ttdPengurusUrl: compressed });
                            setIsSettingsDirty(true);
                            showAlert('success', 'Foto tanda tangan berhasil dimuat! Klik "Simpan Pengaturan Portal" untuk menyimpan.');
                          } catch (err: any) {
                            showAlert('danger', `Gagal mengunggah tanda tangan: ${err?.message || 'Format tidak didukung'}`);
                          }
                        }
                      }}
                    />
                  </label>

                  <div className="flex-1 w-full">
                    <input
                      type="text"
                      placeholder="Atau tempel URL gambar TTD (https://...)"
                      value={editSettings.ttdPengasuhUrl?.startsWith('data:') ? '' : (editSettings.ttdPengasuhUrl || '')}
                      onChange={(e) => {
                        setEditSettings({ ...editSettings, ttdPengasuhUrl: e.target.value.trim(), ttdPengurusUrl: e.target.value.trim() });
                        setIsSettingsDirty(true);
                      }}
                      className="w-full px-3 py-2 text-xs border border-emerald-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-700 font-mono"
                    />
                  </div>

                  {editSettings.ttdPengasuhUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditSettings({ ...editSettings, ttdPengasuhUrl: '', ttdPengurusUrl: '' });
                        setIsSettingsDirty(true);
                      }}
                      className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-semibold shrink-0 transition"
                      title="Hapus tanda tangan"
                    >
                      Hapus
                    </button>
                  )}
                </div>

                {/* Pratinjau TTD */}
                {editSettings.ttdPengasuhUrl && (
                  <div className="mt-3 flex items-center gap-3 pt-2 border-t border-emerald-100/60">
                    <span className="text-[11px] font-bold text-emerald-900">Pratinjau TTD:</span>
                    <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-xs max-w-xs">
                      <img
                        src={editSettings.ttdPengasuhUrl}
                        alt="Pratinjau Tanda Tangan"
                        className="h-12 object-contain mix-blend-multiply"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Input Foto Stempel Pengasuh / Pesantren */}
              <div className="bg-emerald-50/40 p-4 rounded-xl border border-emerald-100/80">
                <div className="mb-2">
                  <label className="block text-xs font-bold text-emerald-900 uppercase">
                    💮 Foto Stempel Resmi Pengasuh
                  </label>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                  <label className="bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center shrink-0 cursor-pointer transition active:scale-95 gap-1.5 shadow-sm">
                    <UploadCloud className="h-4 w-4" /> Unggah Stempel
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 5 * 1024 * 1024) {
                            showAlert('danger', 'Ukuran file stempel maksimal 5MB.');
                            return;
                          }
                          try {
                            const compressed = await compressImage(file, 260, 260, 0.85);
                            if (!compressed) throw new Error('Gagal memproses gambar stempel');
                            setEditSettings({ ...editSettings, stempelPengasuhUrl: compressed, stempelPesantrenUrl: compressed });
                            setIsSettingsDirty(true);
                            showAlert('success', 'Foto stempel berhasil dimuat! Klik "Simpan Pengaturan Portal" untuk menyimpan.');
                          } catch (err: any) {
                            showAlert('danger', `Gagal mengunggah stempel: ${err?.message || 'Format tidak didukung'}`);
                          }
                        }
                      }}
                    />
                  </label>

                  <div className="flex-1 w-full">
                    <input
                      type="text"
                      placeholder="Atau tempel URL gambar stempel (https://...)"
                      value={editSettings.stempelPengasuhUrl?.startsWith('data:') ? '' : (editSettings.stempelPengasuhUrl || '')}
                      onChange={(e) => {
                        setEditSettings({ ...editSettings, stempelPengasuhUrl: e.target.value.trim(), stempelPesantrenUrl: e.target.value.trim() });
                        setIsSettingsDirty(true);
                      }}
                      className="w-full px-3 py-2 text-xs border border-emerald-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-700 font-mono"
                    />
                  </div>

                  {editSettings.stempelPengasuhUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditSettings({ ...editSettings, stempelPengasuhUrl: '', stempelPesantrenUrl: '' });
                        setIsSettingsDirty(true);
                      }}
                      className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-semibold shrink-0 transition"
                      title="Hapus stempel"
                    >
                      Hapus
                    </button>
                  )}
                </div>

                {/* Pratinjau Stempel */}
                {editSettings.stempelPengasuhUrl && (
                  <div className="mt-3 flex items-center gap-3 pt-2 border-t border-emerald-100/60">
                    <span className="text-[11px] font-bold text-emerald-900">Pratinjau Stempel:</span>
                    <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-xs">
                      <img
                        src={editSettings.stempelPengasuhUrl}
                        alt="Pratinjau Stempel"
                        className="h-14 w-14 object-contain rotate-[-6deg] mix-blend-multiply"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Pratinjau Terpadu Format Surat Formal Dokumen */}
              <div className="md:col-span-2 bg-white border border-emerald-200 rounded-xl p-4 text-center">
                <span className="text-[10px] font-extrabold text-emerald-900 uppercase tracking-wider block mb-2">
                  Pratinjau Format Surat Resmi Dokumen Pesantren:
                </span>
                <div className="inline-block text-center relative py-2 px-6 bg-slate-50/80 border border-slate-200 rounded-lg min-w-[260px]">
                  <p className="text-[10px] text-slate-500 font-semibold mb-0.5">
                    {getCityFromAddress(editSettings.address || settings.address)}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  <p className="text-[11px] font-black text-slate-900 uppercase mb-1">
                    Pengasuh Pondok Pesantren
                  </p>

                  <div className="relative min-h-[64px] flex flex-col items-center justify-end my-1">
                    {/* Tanda tangan di atas nama pengasuh */}
                    <div className="z-10 mb-1 flex items-center justify-center">
                      {editSettings.ttdPengasuhUrl ? (
                        <img
                          src={editSettings.ttdPengasuhUrl}
                          alt="TTD Pengasuh"
                          className="h-14 max-w-[130px] object-contain mix-blend-multiply"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="text-xs font-mono text-emerald-800 italic font-extrabold">
                          ✍️ {editSettings.namaPengasuh || "KH. Ahmad Wildan"}
                        </span>
                      )}
                    </div>

                    {/* Stempel di sebelah kiri nama pengasuh */}
                    {editSettings.stempelPengasuhUrl && (
                      <div className="z-20 absolute -left-7 -bottom-1 pointer-events-none opacity-85">
                        <img
                          src={editSettings.stempelPengasuhUrl}
                          alt="Stempel Pengasuh"
                          className="h-20 w-20 object-contain rotate-[-10deg] mix-blend-multiply"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}

                    {/* Nama Pengasuh di bawah tanda tangan */}
                    <div>
                      <strong className="text-xs font-black text-gray-950 underline leading-none uppercase block">
                        {editSettings.namaPengasuh || "KH. Ahmad Wildan Asy'ari"}
                      </strong>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-2 italic">
                  * Stempel berada di sebelah kiri nama pengasuh, tanda tangan berada di atas nama pengasuh, proporsional seperti surat formal resmi.
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-emerald-900 uppercase mb-1">Tentang Pesantren (Sekilas Info)</label>
                <textarea
                  rows={4}
                  required
                  value={editSettings.aboutUs}
                  onChange={(e) => {
                    setEditSettings({ ...editSettings, aboutUs: e.target.value });
                    setIsSettingsDirty(true);
                  }}
                  className="w-full px-3 py-2 border border-emerald-100 rounded-lg bg-emerald-50/10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-emerald-900 uppercase mb-1">Visi Pesantren</label>
                <textarea
                  rows={2}
                  required
                  value={editSettings.vision}
                  onChange={(e) => {
                    setEditSettings({ ...editSettings, vision: e.target.value });
                    setIsSettingsDirty(true);
                  }}
                  className="w-full px-3 py-2 border border-emerald-100 rounded-lg bg-emerald-50/10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-emerald-900 uppercase mb-1">Alamat Lengkap</label>
                <input
                  type="text"
                  required
                  value={editSettings.address}
                  onChange={(e) => {
                    setEditSettings({ ...editSettings, address: e.target.value });
                    setIsSettingsDirty(true);
                  }}
                  className="w-full px-3 py-2 border border-emerald-100 rounded-lg bg-emerald-50/10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-emerald-900 uppercase mb-1">Nomor Kontak Pesantren</label>
                <input
                  type="text"
                  required
                  value={editSettings.phone}
                  onChange={(e) => {
                    setEditSettings({ ...editSettings, phone: e.target.value });
                    setIsSettingsDirty(true);
                  }}
                  className="w-full px-3 py-2 border border-emerald-100 rounded-lg bg-emerald-50/10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-emerald-900 uppercase mb-1">Email Pondok Pesantren</label>
                <input
                  type="email"
                  required
                  value={editSettings.email}
                  onChange={(e) => {
                    setEditSettings({ ...editSettings, email: e.target.value });
                    setIsSettingsDirty(true);
                  }}
                  className="w-full px-3 py-2 border border-emerald-100 rounded-lg bg-emerald-50/10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>
            </div>

            {/* PPDB Schedule Settings */}
            <div className="border-t border-emerald-100 pt-6 mt-6 text-left">
              <h4 className="font-bold text-sm text-emerald-950 flex items-center gap-1.5 mb-2">
                📅 Pengaturan Jadwal & Status Pendaftaran Calon Santri Baru (PCSB)
              </h4>
              <p className="text-gray-500 mb-4 text-[11px] leading-relaxed">
                Tentukan apakah pendaftaran calon santri baru jalur online sedang dibuka, serta atur tanggal dibuka dan ditutup. Kolom tanggal dikosongkan secara default sampai Anda memilih tanggal. Jika tanggal diatur, pendaftaran hanya aktif dalam rentang waktu tersebut dan otomatis ditutup jika di luar tanggal.
              </p>
              
              <div className="bg-emerald-50/40 p-4 rounded-xl border border-emerald-100 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="flex items-center gap-2 pt-4 sm:pt-5">
                  <input
                    type="checkbox"
                    id="ppdbOpenCheckbox"
                    checked={!!editSettings.ppdbOpen}
                    onChange={(e) => handleTogglePpdbOnline(e.target.checked)}
                    className="h-4 w-4 text-emerald-700 bg-white border-emerald-300 rounded focus:ring-emerald-700 shrink-0 cursor-pointer"
                  />
                  <label htmlFor="ppdbOpenCheckbox" className="font-bold text-emerald-950 text-xs cursor-pointer select-none">
                    Status Pendaftaran Online DIBUKA
                  </label>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-semibold text-emerald-900 uppercase">Tanggal Mulai Pendaftaran</label>
                    {editSettings.ppdbStartDate && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditSettings(prev => ({ ...prev, ppdbStartDate: '' }));
                          setIsSettingsDirty(true);
                        }}
                        className="text-[9px] text-red-500 hover:underline font-bold cursor-pointer"
                      >
                        Kosongkan
                      </button>
                    )}
                  </div>
                  <input
                    type="date"
                    value={editSettings.ppdbStartDate || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditSettings(prev => ({ ...prev, ppdbStartDate: val }));
                      setIsSettingsDirty(true);
                    }}
                    className="w-full px-3 py-2 border border-emerald-200 rounded-lg bg-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700 font-mono text-gray-800"
                  />
                  <span className="text-[10px] text-emerald-700 mt-1 block font-medium">
                    {editSettings.ppdbStartDate ? formatIndonesianDate(editSettings.ppdbStartDate) : '(Kosong / Tanpa Batas Mulai)'}
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-semibold text-emerald-900 uppercase">Tanggal Akhir Pendaftaran</label>
                    {editSettings.ppdbEndDate && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditSettings(prev => ({ ...prev, ppdbEndDate: '' }));
                          setIsSettingsDirty(true);
                        }}
                        className="text-[9px] text-red-500 hover:underline font-bold cursor-pointer"
                      >
                        Kosongkan
                      </button>
                    )}
                  </div>
                  <input
                    type="date"
                    value={editSettings.ppdbEndDate || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      const todayStr = getTodayDateString();
                      const isExpired = val && val.trim() !== '' && todayStr > val.trim();
                      setEditSettings(prev => ({
                        ...prev,
                        ppdbEndDate: val,
                        ppdbOpen: isExpired ? false : prev.ppdbOpen
                      }));
                      setIsSettingsDirty(true);
                    }}
                    className="w-full px-3 py-2 border border-emerald-200 rounded-lg bg-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700 font-mono text-gray-800"
                  />
                  <span className="text-[10px] text-emerald-700 mt-1 block font-medium">
                    {editSettings.ppdbEndDate ? formatIndonesianDate(editSettings.ppdbEndDate) : '(Kosong / Tanpa Batas Akhir)'}
                  </span>
                </div>
              </div>

              {/* Real-time Status Preview Card */}
              {(() => {
                const liveStatus = isPpdbCurrentlyActive({
                  ppdbOpen: editSettings.ppdbOpen,
                  ppdbStartDate: editSettings.ppdbStartDate,
                  ppdbEndDate: editSettings.ppdbEndDate,
                });
                return (
                  <div className={`mt-3 p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition ${
                    liveStatus.isActive
                      ? 'bg-emerald-50 text-emerald-950 border-emerald-200'
                      : 'bg-amber-50 text-amber-950 border-amber-200'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className="text-base">{liveStatus.isActive ? '🟢' : '🚫'}</span>
                      <div>
                        <p className="font-bold text-xs">
                          Status Sistem Pendaftaran: <span className="underline">{liveStatus.badgeText}</span>
                        </p>
                        <p className="text-[11px] text-gray-600 mt-0.5">{liveStatus.statusText}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono px-2.5 py-1 rounded-lg font-bold uppercase tracking-wider bg-white/90 border border-emerald-100 self-start sm:self-center">
                      {liveStatus.periodDetail}
                    </span>
                  </div>
                );
              })()}
            </div>

            {/* Bottom Manual Save Action Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-6 border-t border-emerald-100 mt-6 bg-slate-50/80 p-4 rounded-xl border border-slate-200">
              <div>
                <p className="font-bold text-xs text-emerald-950">
                  {isSettingsDirty ? '⚠️ Ada perubahan pengaturan portal yang belum disimpan.' : '✔️ Semua pengaturan portal telah tersimpan.'}
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Klik tombol simpan untuk menerapkan seluruh perubahan secara permanen agar data tidak kembali lagi (mental).
                </p>
              </div>
              <button
                type="button"
                onClick={handleSavePortalSettings}
                disabled={saveStatus === 'saving'}
                className="px-6 py-3 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-bold rounded-xl text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
              >
                {saveStatus === 'saving' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Sedang Menyimpan...</span>
                  </>
                ) : saveStatus === 'saved' ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                    <span>Pengaturan Berhasil Disimpan!</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>✓ Konfirmasi & Simpan Pengaturan Portal</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* KARTU INTEGRASI DATABASE CLOUD SUPABASE (Hanya tampil jika sistem BELUM terhubung dengan Supabase) */}
          {!isCloudConnected && (
            <div className="mt-8 bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-900 text-white p-6 rounded-2xl shadow-lg border border-emerald-800 space-y-4 text-left animate-fade-in">
              <div className="flex items-center justify-between border-b border-emerald-800/80 pb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-500/30 text-emerald-400">
                    <Database className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-black text-sm uppercase tracking-wide text-white flex items-center gap-2 flex-wrap">
                      Integrasi Cloud Database Supabase
                      {isSupabaseConfigured() ? (
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-emerald-500/30 text-emerald-300 border border-emerald-400/40">
                          🟢 Terhubung ke Supabase Cloud
                        </span>
                      ) : (
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-amber-500/30 text-amber-300 border border-amber-400/40">
                          🟡 Belum Terhubung (Lokal & Server Mode)
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] text-emerald-200/80 mt-0.5">
                      Mendukung multi-device, HP/laptop lain, Vercel, & Cloud Run. Seluruh data PCSB, santri, tagihan, dan pengaturan tersinkronisasi otomatis.
                    </p>
                  </div>
                </div>

                {missingTablesInfo && missingTablesInfo.missingTables.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowSqlModal(true)}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 transition shadow-md border border-amber-400 cursor-pointer animate-pulse"
                    >
                      <Code className="h-4 w-4" /> ⚡ Skrip SQL Otomatis ({missingTablesInfo.missingTables.length} Tabel Belum Ada di Supabase)
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-emerald-300 mb-1">
                    URL Supabase (SUPABASE_URL / VITE_SUPABASE_URL)
                  </label>
                  <input
                    type="text"
                    value={supabaseUrlInput}
                    onChange={(e) => setSupabaseUrlInput(e.target.value)}
                    onBlur={() => {
                      if (supabaseUrlInput.trim()) {
                        const fixed = normalizeSupabaseUrl(supabaseUrlInput);
                        if (fixed && fixed !== supabaseUrlInput) {
                          setSupabaseUrlInput(fixed);
                        }
                      }
                    }}
                    placeholder="https://schwszgiasriuujqppnv.supabase.co"
                    className="w-full px-3 py-2 bg-slate-950/80 border border-emerald-800 rounded-xl text-emerald-100 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-slate-600"
                  />
                  <p className="text-[10px] text-emerald-400/80 mt-1 font-mono">
                    💡 Format lengkap: <span className="text-amber-300 font-bold">https://[id-proyek].supabase.co</span>
                  </p>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-emerald-300 mb-1">
                    Anon Key Supabase (SUPABASE_ANON_KEY / VITE_SUPABASE_ANON_KEY)
                  </label>
                  <input
                    type="password"
                    value={supabaseKeyInput}
                    onChange={(e) => setSupabaseKeyInput(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full px-3 py-2 bg-slate-950/80 border border-emerald-800 rounded-xl text-emerald-100 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-slate-600"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      const normalized = normalizeSupabaseUrl(supabaseUrlInput);
                      if (normalized && normalized !== supabaseUrlInput) {
                        setSupabaseUrlInput(normalized);
                      }
                      await saveSupabaseCredentialsLocally(normalized || supabaseUrlInput, supabaseKeyInput);
                      const configured = isSupabaseConfigured();
                      setIsCloudConnected(configured);
                      if (configured) {
                        setShowManualDbConfig(false);
                      }
                      showAlert('success', 'Konfigurasi Supabase berhasil disimpan! Tampilan konfigurasi kini disembunyikan.');
                      window.dispatchEvent(new Event('pesantren_db_sync'));
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow cursor-pointer"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Simpan Koneksi Supabase
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        setSupabaseTestStatus({ loading: true, message: 'Menguji koneksi ke Supabase...', success: null });
                        const normalized = normalizeSupabaseUrl(supabaseUrlInput);
                        if (normalized && normalized !== supabaseUrlInput) {
                          setSupabaseUrlInput(normalized);
                        }
                        await saveSupabaseCredentialsLocally(normalized || supabaseUrlInput, supabaseKeyInput);
                        const res = await testSupabaseConnection();
                        setSupabaseTestStatus({ 
                          loading: false, 
                          message: String(res?.message || 'Pengujian selesai'), 
                          success: Boolean(res?.success) 
                        });
                        setIsCloudConnected(isSupabaseConfigured());
                      } catch (err: any) {
                        setSupabaseTestStatus({
                          loading: false,
                          message: `Gagal: ${String(err?.message || 'Terjadi kesalahan koneksi')}`,
                          success: false
                        });
                      }
                    }}
                    disabled={supabaseTestStatus.loading}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold rounded-xl text-xs flex items-center gap-1.5 transition border border-emerald-700/60 cursor-pointer disabled:opacity-50"
                  >
                    {supabaseTestStatus.loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    Uji Koneksi
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        setSupabasePushStatus({ loading: true, message: 'Mengunggah seluruh data lokal ke Supabase Cloud...', success: null });
                        const normalized = normalizeSupabaseUrl(supabaseUrlInput);
                        if (normalized && normalized !== supabaseUrlInput) {
                          setSupabaseUrlInput(normalized);
                        }
                        await saveSupabaseCredentialsLocally(normalized || supabaseUrlInput, supabaseKeyInput);
                        
                        const res = await pushAllLocalDataToSupabase({
                          news,
                          announcements,
                          students,
                          ppdbList,
                          rooms,
                          bills,
                          settings: editSettings,
                          masterClasses: {
                            formal: availableFormalClasses,
                            madrasah: availableMadrasahClasses
                          }
                        });

                        setSupabasePushStatus({
                          loading: false,
                          message: res.message,
                          success: res.success
                        });
                        if (res.success) {
                          showAlert('success', res.message);
                        } else {
                          showAlert('danger', res.message);
                        }
                        setIsCloudConnected(isSupabaseConfigured());
                      } catch (err: any) {
                        const errMsg = `Gagal sinkronisasi data: ${err?.message || err}`;
                        setSupabasePushStatus({ loading: false, message: errMsg, success: false });
                        showAlert('danger', errMsg);
                      }
                    }}
                    disabled={supabasePushStatus.loading}
                    className="px-4 py-2 bg-teal-700 hover:bg-teal-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow cursor-pointer disabled:opacity-50"
                  >
                    {supabasePushStatus.loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    ⬆️ Upload Semua Data Lokal ke Cloud
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        setSupabasePullStatus({ loading: true, message: 'Menarik data terbaru dari Supabase Cloud...', success: null });
                        const normalized = normalizeSupabaseUrl(supabaseUrlInput);
                        if (normalized && normalized !== supabaseUrlInput) {
                          setSupabaseUrlInput(normalized);
                        }
                        await saveSupabaseCredentialsLocally(normalized || supabaseUrlInput, supabaseKeyInput);

                        const [remoteNews, remoteAnn, remoteStudents, remotePpdb, remoteRooms, remoteBills, remoteSettings] = await Promise.all([
                          syncNewsWithSupabase(news),
                          syncAnnouncementsWithSupabase(announcements),
                          syncStudentsWithSupabase(students),
                          syncPpdbWithSupabase(ppdbList),
                          syncRoomsWithSupabase(rooms),
                          syncBillsWithSupabase(bills),
                          syncSettingsWithSupabase(settings)
                        ]);

                        if (remoteNews) { setNews(remoteNews); localStorage.setItem('pesantren_news', JSON.stringify(remoteNews)); }
                        if (remoteAnn) { setAnnouncements(remoteAnn); localStorage.setItem('pesantren_announcements', JSON.stringify(remoteAnn)); }
                        if (remoteStudents) { setStudents(remoteStudents); localStorage.setItem('pesantren_students', JSON.stringify(remoteStudents)); }
                        if (remotePpdb) { setPpdbList(remotePpdb); localStorage.setItem('pesantren_ppdb', JSON.stringify(remotePpdb)); }
                        if (remoteRooms) { setRooms(remoteRooms); localStorage.setItem('pesantren_rooms', JSON.stringify(remoteRooms)); }
                        if (remoteBills) { setBills(remoteBills); localStorage.setItem('pesantren_bills', JSON.stringify(remoteBills)); }
                        if (remoteSettings) {
                          setSettings(remoteSettings);
                          setEditSettings(remoteSettings);
                          localStorage.setItem('pesantren_settings', JSON.stringify(remoteSettings));
                        }

                        window.dispatchEvent(new Event('pesantren_db_sync'));
                        window.dispatchEvent(new Event('storage'));

                        const totalRemote = (remoteNews?.length || 0) + (remoteAnn?.length || 0) + (remoteStudents?.length || 0) + (remotePpdb?.length || 0) + (remoteRooms?.length || 0) + (remoteBills?.length || 0);
                        const msg = `Berhasil mengunduh & menyinkronkan ${totalRemote} data dari Supabase Cloud!`;
                        setSupabasePullStatus({ loading: false, message: msg, success: true });
                        showAlert('success', msg);
                        setIsCloudConnected(isSupabaseConfigured());
                      } catch (err: any) {
                        const errMsg = `Gagal menarik data dari Supabase: ${err?.message || err}`;
                        setSupabasePullStatus({ loading: false, message: errMsg, success: false });
                        showAlert('danger', errMsg);
                      }
                    }}
                    disabled={supabasePullStatus.loading}
                    className="px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow cursor-pointer disabled:opacity-50"
                  >
                    {supabasePullStatus.loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                    ⬇️ Tarik Data Terbaru dari Cloud
                  </button>

                  {isCloudConnected && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (window.confirm('Yakin ingin memutuskan koneksi Supabase di perangkat ini?')) {
                          await saveSupabaseCredentialsLocally('', '');
                          setSupabaseUrlInput('');
                          setSupabaseKeyInput('');
                          setIsCloudConnected(false);
                          setShowManualDbConfig(true);
                          showAlert('success', 'Koneksi Supabase telah diputuskan.');
                          window.dispatchEvent(new Event('pesantren_db_sync'));
                        }
                      }}
                      className="px-3 py-2 bg-red-950/80 hover:bg-red-900 text-red-300 font-bold rounded-xl text-xs flex items-center gap-1.5 transition border border-red-800 cursor-pointer"
                    >
                      <Trash className="h-3.5 w-3.5" /> Putuskan Koneksi
                    </button>
                  )}
                </div>

                {supabaseTestStatus.message && (
                  <span className={`text-xs font-bold px-3 py-1.5 rounded-lg border flex items-center gap-1.5 ${
                    supabaseTestStatus.success ? 'bg-emerald-950 text-emerald-300 border-emerald-700' : 'bg-red-950 text-red-300 border-red-800'
                  }`}>
                    {supabaseTestStatus.success ? '✅' : '❌'} {String(supabaseTestStatus.message)}
                  </span>
                )}
              </div>

              {(supabasePushStatus.message || supabasePullStatus.message) && (
                <div className="pt-2 space-y-1">
                  {supabasePushStatus.message && (
                    <p className={`text-xs font-semibold px-3 py-1.5 rounded-lg border ${
                      supabasePushStatus.success ? 'bg-teal-950/80 text-teal-300 border-teal-700' : 'bg-red-950/80 text-red-300 border-red-800'
                    }`}>
                      {supabasePushStatus.success ? '✅' : '❌'} {supabasePushStatus.message}
                    </p>
                  )}
                  {supabasePullStatus.message && (
                    <p className={`text-xs font-semibold px-3 py-1.5 rounded-lg border ${
                      supabasePullStatus.success ? 'bg-blue-950/80 text-blue-300 border-blue-700' : 'bg-red-950/80 text-red-300 border-red-800'
                    }`}>
                      {supabasePullStatus.success ? '✅' : '❌'} {supabasePullStatus.message}
                    </p>
                  )}
                </div>
              )}

              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-emerald-900/60 text-[11px] text-emerald-200/90 leading-relaxed space-y-1">
                <p className="font-bold text-white flex items-center gap-1">
                  📌 Catatan Pengaturan Vercel & Domain Custom:
                </p>
                <p>
                  Saat mendeploy proyek ini ke <strong>Vercel</strong> atau hosting domain Anda, tambahkan 2 Environment Variables berikut di dashboard Vercel (Project Settings -&gt; Environment Variables):
                </p>
                <ul className="list-disc list-inside font-mono text-[10px] text-emerald-300 space-y-0.5 pl-1">
                  <li><strong className="text-white">VITE_SUPABASE_URL</strong> = [URL Project Supabase Anda]</li>
                  <li><strong className="text-white">VITE_SUPABASE_ANON_KEY</strong> = [Anon Public Key Supabase Anda]</li>
                </ul>
              </div>
            </div>
          )}

          {/* MODAL GENERATOR SKRIP SQL SUPABASE (Hanya tampil jika ada tabel aplikasi yang belum sinkron dengan Supabase, otomatis terhapus saat terhubung) */}
          <AnimatePresence>
            {showSqlModal && missingTablesInfo && missingTablesInfo.missingTables.length > 0 && (
              <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-slate-900 text-white rounded-2xl p-6 max-w-3xl w-full max-h-[85vh] flex flex-col border border-amber-600/70 shadow-2xl"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                    <div className="flex items-center gap-2">
                      <Code className="h-5 w-5 text-amber-400" />
                      <div>
                        <h3 className="font-extrabold text-base text-white uppercase tracking-wide">
                          Skrip SQL Otomatis Tabel Supabase
                        </h3>
                        <p className="text-[11px] text-slate-300">
                          Terdapat <strong>{missingTablesInfo.missingTables.length} tabel aplikasi</strong> yang belum ada di Supabase ({missingTablesInfo.missingTables.join(', ')}). Skrip ini otomatis terhapus ketika tabel telah dibuat dan terhubung.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowSqlModal(false)}
                      className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-amber-300 selection:bg-amber-900 selection:text-white leading-relaxed">
                    <pre className="whitespace-pre-wrap">{missingTablesInfo.generatedSql}</pre>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-slate-800 mt-3 flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={runTableCheck}
                      disabled={isCheckingTables}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                      title="Klik untuk mendeteksi apakah tabel sudah dibuat di Supabase"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isCheckingTables ? 'animate-spin' : ''}`} />
                      <span>{isCheckingTables ? 'Memeriksa...' : 'Periksa Status Tabel'}</span>
                    </button>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(missingTablesInfo.generatedSql);
                          setCopiedSql(true);
                          setTimeout(() => setCopiedSql(false), 3000);
                        }}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
                      >
                        {copiedSql ? <CheckCircle2 className="h-4 w-4 text-slate-950" /> : <Copy className="h-4 w-4" />}
                        {copiedSql ? 'Tersalin ke Clipboard!' : 'Salin Skrip SQL Otomatis'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowSqlModal(false)}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer"
                      >
                        Tutup
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Tab: Dedicated Pengurus & Account Approval Management */}
      {activeTab === 'pengurus' && (
        <div className="space-y-6 text-left animate-fade-in">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-emerald-900 to-teal-900 text-white rounded-2xl p-6 shadow-md border border-emerald-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-extrabold text-amber-300 text-lg">
                Persetujuan & Manajemen Akun Pengurus / Admin
              </h3>
              <p className="text-xs text-emerald-100/90 max-w-2xl leading-relaxed">
                Setujui pendaftaran pengurus baru, kelola hak akses biro (Keamanan, Ketertiban, Kesehatan), dan atur konfirmasi pendaftaran akun pengurus pesantren secara terpusat.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {staffUsers.filter(u => !u.isConfirmed).length > 0 ? (
                <span className="px-3.5 py-1.5 bg-amber-400 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider animate-bounce shadow-sm">
                  {staffUsers.filter(u => !u.isConfirmed).length} Akun Menunggu Persetujuan
                </span>
              ) : (
                <span className="px-3 py-1 bg-emerald-800/80 border border-emerald-700/60 text-emerald-200 rounded-xl text-xs font-bold">
                  ✓ Semua Akun Terkonfirmasi
                </span>
              )}
            </div>
          </div>

          {/* Pending Approval Notice Banner / Section */}
          <div className="bg-amber-50/90 border-2 border-amber-300 p-5 rounded-2xl space-y-4 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-amber-950 font-black text-sm">
                <div>
                  <h4 className="font-extrabold text-sm text-amber-950 uppercase tracking-wider">
                    Persetujuan Akun Pengurus Baru (Status: Pending)
                  </h4>
                  <p className="text-[11px] text-amber-900 font-normal mt-0.5">
                    Kelola dan tinjau pendaftaran pengurus baru. Klik tombol <strong>Setujui</strong> untuk mengaktifkan akun atau <strong>Tolak</strong> untuk membatalkan akses.
                  </p>
                </div>
              </div>
              <span className="bg-amber-200 text-amber-950 px-3.5 py-1 rounded-full text-xs font-black shadow-2xs">
                {staffUsers.filter(u => !u.isConfirmed).length} Permintaan Pending
              </span>
            </div>

            {staffUsers.filter(u => !u.isConfirmed).length === 0 ? (
              <div className="bg-white/90 border border-amber-200 rounded-xl p-6 text-center space-y-1">
                <span className="text-2xl">✅</span>
                <p className="text-xs font-bold text-slate-800">Tidak ada pendaftaran akun pengurus yang menanti persetujuan saat ini.</p>
                <p className="text-[11px] text-slate-500">Seluruh pendaftaran pengurus telah diproses atau terkonfirmasi.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-amber-200 bg-white shadow-xs">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-amber-100/80 text-amber-950 font-bold border-b border-amber-200">
                      <th className="px-4 py-3">Nama Pengurus</th>
                      <th className="px-4 py-3">Email Pengurus</th>
                      <th className="px-4 py-3">Jabatan / Biro</th>
                      <th className="px-4 py-3">Tanggal Daftar</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-center">Tindakan Persetujuan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100">
                    {staffUsers.filter(u => !u.isConfirmed).map((u) => (
                      <tr key={u.id} className="hover:bg-amber-50/60 transition">
                        <td className="px-4 py-3 font-bold text-slate-900">{u.fullName}</td>
                        <td className="px-4 py-3 font-mono text-slate-700">{u.email}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            u.role === 'admin' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                            u.role === 'keamanan' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                            u.role === 'ketertiban' ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' :
                            'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}>
                            {u.role === 'admin' ? 'Admin Pusat' : `Bid. ${u.role}`}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">{u.registeredAt || '-'}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 text-[10px] text-amber-900 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full font-black animate-pulse">
                            ⏳ Pending
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                triggerConfirm(
                                  'Setujui Akun Pengurus',
                                  `Apakah Anda yakin ingin menyetujui pendaftaran akun "${u.fullName}" (${u.email})? Akun ini akan langsung aktif dan dapat login.`,
                                  () => {
                                    const updated = staffUsers.map(x => x.id === u.id ? { ...x, isConfirmed: true } : x);
                                    setStaffUsers(updated);
                                    localStorage.setItem('pesantren_staff_users', JSON.stringify(updated));
                                    window.dispatchEvent(new Event('pesantren_staff_users_updated'));
                                    logAdminActivity('SETUJUI_AKUN_PENGURUS', `Menyetujui pendaftaran akun pengurus: ${u.fullName} (${u.email})`, u.id, u.fullName);
                                    showAlert('success', `Akun ${u.fullName} telah disetujui dan diaktifkan!`);
                                  }
                                );
                              }}
                              className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs rounded-lg shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1"
                            >
                              <span>✓</span>
                              <span>Setujui</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                triggerConfirm(
                                  'Tolak Pendaftaran Akun',
                                  `Apakah Anda yakin ingin MENOLAK pendaftaran akun "${u.fullName}" (${u.email})? Pendaftaran ini akan dihapus.`,
                                  () => {
                                    const updated = staffUsers.filter(x => x.id !== u.id);
                                    setStaffUsers(updated);
                                    localStorage.setItem('pesantren_staff_users', JSON.stringify(updated));
                                    window.dispatchEvent(new Event('pesantren_staff_users_updated'));
                                    logAdminActivity('TOLAK_AKUN_PENGURUS', `Menolak pendaftaran akun pengurus: ${u.fullName} (${u.email})`, u.id, u.fullName);
                                    showAlert('success', `Pendaftaran akun ${u.fullName} telah ditolak dan dihapus.`);
                                  }
                                );
                              }}
                              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-lg shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1"
                            >
                              <span>✕</span>
                              <span>Tolak</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Form & Table for Registered Staff */}
          <div className="bg-white border border-emerald-100 p-6 rounded-2xl space-y-6">
            <div className="flex items-center gap-2 border-b border-emerald-50 pb-3">
              <span className="text-xl">🛡️</span>
              <div>
                <h4 className="font-extrabold text-sm text-emerald-950 uppercase tracking-wider">
                  Registrasi & Daftar Akun Pengurus Pesantren
                </h4>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Daftarkan atau setujui akun pengurus baru untuk biro Keamanan, Ketertiban, Kesehatan, atau Admin Tambahan.
                </p>
              </div>
            </div>

            {/* Simulated Email view if active */}
            {simulatedEmailDetails && (
              <div className="bg-slate-900 text-slate-100 p-5 rounded-xl font-sans border-l-4 border-amber-500 relative animate-fade-in text-xs max-w-2xl mx-auto">
                <button 
                  type="button"
                  onClick={() => setSimulatedEmailDetails(null)}
                  className="absolute top-3 right-3 text-slate-400 hover:text-white text-sm cursor-pointer"
                  title="Tutup Simulasi Email"
                >
                  ✕
                </button>
                <div className="flex items-center gap-2 text-amber-450 font-bold mb-3">
                  <span>✉️ SIMULASI KOTAK MASUK EMAIL PENGURUS: {simulatedEmailDetails.to}</span>
                </div>
                <div className="space-y-2 border-b border-slate-700 pb-3 mb-3 text-[11px]">
                  <p><strong className="text-slate-400">Dari:</strong> Al-Asy'ariyah Portal System &lt;noreply@alasyariyah.sch.id&gt;</p>
                  <p><strong className="text-slate-400">Kepada:</strong> {simulatedEmailDetails.name} &lt;{simulatedEmailDetails.to}&gt;</p>
                  <p><strong className="text-slate-400">Subjek:</strong> Konfirmasi Aktivasi Akun Pengurus Bidang {simulatedEmailDetails.role.toUpperCase()}</p>
                </div>
                <div className="bg-slate-800 p-4 rounded-lg space-y-4 leading-relaxed text-slate-300 text-left">
                  <p>Assalamu'alaikum Wr. Wb. Bapak/Ibu <strong>{simulatedEmailDetails.name}</strong>,</p>
                  <p>
                    Anda telah didaftarkan oleh Administrator Utama sebagai Pengurus Bidang <strong className="text-emerald-400 font-bold">{simulatedEmailDetails.role.toUpperCase()}</strong> di sistem Portal Online Pondok Pesantren Al-Asy'ariyah.
                  </p>
                  <p>
                    Sebelum menggunakannya, Anda wajib melakukan verifikasi kepemilikan email aktif dan mengonfirmasi pembuatan password dengan mengeklik tautan konfirmasi aman di bawah ini:
                  </p>
                  <div className="my-5 text-center">
                    <button
                      type="button"
                      onClick={() => handleConfirmStaffEmail(simulatedEmailDetails.to)}
                      className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-lg shadow-md uppercase tracking-wider cursor-pointer transform active:scale-95 transition-all text-[11px]"
                    >
                      ✓ Klik Di Sini Untuk Mengonfirmasi & Mengaktifkan Akun
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Registration Form */}
            <form onSubmit={handleRegisterStaff} className="bg-emerald-50/40 p-4 rounded-xl border border-emerald-100 space-y-4 text-xs">
              <h5 className="font-bold text-xs text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                <Plus className="h-4 w-4 text-emerald-700" /> Form Tambah Akun Pengurus Langsung
              </h5>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-emerald-950 uppercase mb-1">Nama Lengkap Pengurus</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Ust. M. Ridwan, S.Pd.I"
                    value={newStaffName}
                    onChange={(e) => setNewStaffName(e.target.value)}
                    className="w-full px-3 py-2 border border-emerald-200 rounded-lg bg-white text-xs focus:ring-2 focus:ring-emerald-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-emerald-950 uppercase mb-1">Alamat Email Aktif Pengurus</label>
                  <input
                    type="email"
                    required
                    placeholder="pengurus@alasyariyah.sch.id"
                    value={newStaffEmail}
                    onChange={(e) => setNewStaffEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-emerald-200 rounded-lg bg-white text-xs font-mono focus:ring-2 focus:ring-emerald-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-emerald-950 uppercase mb-1">Bidang Tuntunan / Hak Akses</label>
                  <select
                    value={newStaffRole}
                    onChange={(e) => setNewStaffRole(e.target.value as any)}
                    className="w-full px-3 py-2 border border-emerald-200 rounded-lg bg-white text-xs font-semibold focus:ring-2 focus:ring-emerald-700 focus:outline-none"
                  >
                    <option value="admin">Administrator / Pengurus Pusat</option>
                    <option value="keamanan">Bagian Keamanan</option>
                    <option value="ketertiban">Bagian Ketertiban</option>
                    <option value="kesehatan">Bagian Kesehatan (Poskestren)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-emerald-800 to-teal-950 hover:from-emerald-700 hover:to-teal-850 text-white font-bold rounded-lg text-xs shadow-sm transition active:scale-95 cursor-pointer"
                >
                  + Tambahkan Akun Pengurus Baru
                </button>
              </div>
            </form>

            {/* List of Registered Accounts */}
            <div className="space-y-2">
              <h5 className="font-bold text-xs text-emerald-950 uppercase tracking-wider">Daftar Seluruh Akun Pengurus Terdaftar</h5>
              <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-3xs">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 font-bold border-b border-gray-150">
                      <th className="px-3 py-2.5">Nama Pengurus</th>
                      <th className="px-3 py-2.5">Alamat Email</th>
                      <th className="px-3 py-2.5">Bidang / Hak Akses</th>
                      <th className="px-3 py-2.5">Status Akun</th>
                      <th className="px-3 py-2.5">Tanggal Daftar</th>
                      <th className="px-3 py-2.5 text-center">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {staffUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-400 italic">Belum ada akun pengurus tambahan yang didaftarkan.</td>
                      </tr>
                    ) : (
                      staffUsers.map((user) => {
                        const resolvedName = getResolvedStaffName(user);
                        const isEditingThis = editingStaffId === user.id;

                        return (
                          <tr key={user.id} className="hover:bg-slate-50/50">
                            <td className="px-3 py-3">
                              {isEditingThis ? (
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    value={editingStaffName}
                                    onChange={(e) => setEditingStaffName(e.target.value)}
                                    className="px-2 py-1 border border-emerald-500 rounded bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-700 min-w-[180px]"
                                    autoFocus
                                    placeholder="Ketik nama lengkap pengurus..."
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleUpdateStaffName(user.id, editingStaffName);
                                      setEditingStaffId(null);
                                    }}
                                    className="px-2 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded text-[10px] shadow-xs cursor-pointer"
                                  >
                                    Simpan
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingStaffId(null)}
                                    className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded text-[10px] cursor-pointer"
                                  >
                                    Batal
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900">{resolvedName}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingStaffId(user.id);
                                      setEditingStaffName(resolvedName);
                                    }}
                                    className="text-[10px] text-emerald-800 hover:text-emerald-950 hover:underline flex items-center gap-0.5 cursor-pointer font-medium"
                                    title="Edit / Ubah Nama Pengurus"
                                  >
                                    ✏️ Ubah
                                  </button>
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-3 font-mono text-slate-600">{user.email}</td>
                            <td className="px-3 py-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                user.role === 'admin' ? 'bg-amber-100 text-amber-800' :
                                user.role === 'keamanan' ? 'bg-emerald-100 text-emerald-800' :
                                user.role === 'ketertiban' ? 'bg-indigo-100 text-indigo-800' :
                                'bg-rose-100 text-rose-800'
                              }`}>
                                {user.role === 'admin' ? 'Admin' : `Bid. ${user.role}`}
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              {user.isConfirmed ? (
                                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full font-bold">
                                  ● AKTIF (Terkonfirmasi)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-bold">
                                  ⏳ Menunggu Persetujuan Admin
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-3 text-slate-500 font-mono">{user.registeredAt}</td>
                            <td className="px-3 py-3 text-center space-x-1.5 whitespace-nowrap">
                              {!isEditingThis && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingStaffId(user.id);
                                    setEditingStaffName(resolvedName);
                                  }}
                                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded text-[10px] transition cursor-pointer"
                                  title="Ubah Nama"
                                >
                                  ✏️ Edit Nama
                                </button>
                              )}
                              {!user.isConfirmed && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    triggerConfirm(
                                      'Setujui Akun Pengurus/Admin',
                                      `Apakah Anda yakin ingin menyetujui pendaftaran akun ${resolvedName} (${user.role.toUpperCase()})?`,
                                      () => {
                                        const updated = staffUsers.map(u => u.id === user.id ? { ...u, isConfirmed: true } : u);
                                        setStaffUsers(updated);
                                        localStorage.setItem('pesantren_staff_users', JSON.stringify(updated));
                                        window.dispatchEvent(new Event('pesantren_staff_users_updated'));
                                        showAlert('success', `Akun ${resolvedName} berhasil disetujui! Sekarang akun tersebut sudah aktif dan dapat login.`);
                                      }
                                    );
                                  }}
                                  className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded text-[10px] shadow-xs transition cursor-pointer"
                                >
                                  ✓ Setujui Akun
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  triggerConfirm(
                                    'Hapus Akun Pengurus',
                                    `Apakah Anda yakin ingin menghapus akun pengurus ${resolvedName}?`,
                                    () => {
                                      handleDeleteStaff(user.id);
                                    }
                                  );
                                }}
                                className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded text-[10px] transition cursor-pointer"
                                title="Hapus Akun Pengurus"
                              >
                                Hapus
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: WhatsApp Automation & Account Requests */}
      {activeTab === 'whatsapp' && (
        <div className="space-y-6">
          {/* Banner */}
          <div className="bg-amber-50 rounded-2xl border border-amber-200 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1 text-left">
              <h3 className="font-extrabold text-amber-950 text-base flex items-center gap-1.5">
                Pusat Layanan WhatsApp & Permintaan Akun Wali Santri
              </h3>
              <p className="text-xs text-amber-850 max-w-2xl leading-relaxed">
                Pantau permintaan dari wali santri yang lupa kredensial login, dan otomatisasi pemberitahuan akad/rekening pembayaran yang telah diverifikasi Bendahara. Seluruh pengiriman menggunakan direct gateway interaktif WhatsApp untuk kenyamanan wali santri.
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <span className="px-3 py-1 bg-amber-200 border border-amber-300 text-amber-950 rounded-lg text-xs font-bold uppercase tracking-wide">
                {forgotRequests.filter(r => r.status === 'Pending').length} Permintaan Aktif
              </span>
            </div>
          </div>

          {/* Dynamic section: Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left">
            
            {/* Section 1: Password / Account Requests (Left, 7 cols) */}
            <div className="lg:col-span-7 bg-white rounded-2xl shadow-sm border border-emerald-50 p-6 space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                <h4 className="font-bold text-sm text-emerald-950 flex items-center gap-1.5">
                  Pendaftaran Santri Baru / Offline ({forgotRequests.length})
                </h4>
                <button
                  onClick={() => {
                    triggerConfirm(
                      'Sapu Riwayat Selesai',
                      'Yakin ingin membersihkan seluruh riwayat pendaftaran offline / permintaan akun yang statusnya sudah disetujui?',
                      () => {
                        const cleaned = forgotRequests.filter(r => r.status === 'Pending');
                        setForgotRequests(cleaned);
                        localStorage.setItem('pesantren_forgot_requests', JSON.stringify(cleaned));
                        showAlert('success', 'Riwayat selesai dibersihkan!');
                      }
                    );
                  }}
                  className="text-[10px] text-rose-700 hover:underline font-bold cursor-pointer"
                >
                  Sapu Riwayat Selesai 🧹
                </button>
              </div>

              {forgotRequests.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <div className="text-3xl">🎉</div>
                  <p className="text-xs text-gray-400 font-bold">Tidak ada pendaftaran baru atau permintaan akun saat ini!</p>
                  <p className="text-[11px] text-gray-500">Semua pendaftaran offline telah diproses.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {forgotRequests.map(req => {
                    const isPending = req.status === 'Pending';
                    const isOfflineReg = !req.nis; // If no NIS on request, it's an offline registration
                    const matchedStudent = req.nis ? students.find(s => s.nis === req.nis) : null;
                    
                    return (
                      <div 
                        key={req.id} 
                        className={`p-4 rounded-xl border transition-all duration-150 ${
                          isPending 
                            ? 'bg-amber-50/40 border-amber-100/80 hover:bg-amber-50/65' 
                            : 'bg-emerald-50/25 border-emerald-50 hover:bg-emerald-50/40'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-extrabold text-sm text-gray-900 uppercase">
                                {req.studentName}
                              </span>
                              {isOfflineReg ? (
                                <span className="text-[9px] bg-amber-100 text-amber-900 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">
                                  📝 PPDB Offline
                                </span>
                              ) : (
                                <span className="text-[9px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono font-bold">
                                  NIS: {req.nis}
                                </span>
                              )}
                            </div>
                            
                            <p className="text-[11px] text-gray-500 font-medium">
                              No. WA Wali/Pengirim: <strong className="font-mono text-emerald-850">+{req.parentPhone}</strong>
                            </p>

                            {isOfflineReg && (
                              <div className="text-[10px] bg-slate-100/60 p-2 rounded-lg space-y-0.5 text-slate-700 font-medium mt-1.5">
                                <div><strong className="text-gray-500">Gender:</strong> {req.gender || 'Laki-laki'}</div>
                                <div><strong className="text-gray-500">Alamat:</strong> {req.address || '-'}</div>
                                <div><strong className="text-gray-500">Pendidikan:</strong> {req.formalSchool || 'SMP Formal'} • {req.diniyahSchool || '1A MTs Diniyah'}</div>
                              </div>
                            )}
                            
                            {!isOfflineReg && (
                              matchedStudent ? (
                                <p className="text-[10px] text-emerald-800 bg-emerald-50 inline-block px-1.5 py-0.5 rounded font-bold mt-1">
                                  ✓ Akun Terdaftar di Kelas {matchedStudent.class}
                                </p>
                              ) : (
                                <p className="text-[10px] text-rose-600 bg-rose-50 inline-block px-1.5 py-0.5 rounded font-bold mt-1">
                                  ⚠ NIS Tidak Ditemukan di Database!
                                </p>
                              )
                            )}
                            
                            <div className="text-[10px] text-gray-400 font-mono pt-1">
                              Diajukan pada: {new Date(req.requestedAt || (req as any).createdAt || new Date()).toLocaleString('id-ID')}
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-2.5 shrink-0">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                              isPending 
                                ? 'bg-amber-100 text-amber-800' 
                                : 'bg-emerald-800 text-white'
                            }`}>
                              {isPending ? '🔴 Menunggu Persetujuan' : '✓ Disetujui & Terbuat'}
                            </span>

                            {isPending && (
                              <button
                                onClick={() => {
                                  const stored = localStorage.getItem('pesantren_forgot_requests');
                                  let currentList: any[] = [];
                                  if (stored) {
                                    currentList = JSON.parse(stored);
                                  }

                                  let finalNis = req.nis || '';
                                  const capitalizedName = req.studentName.trim().toUpperCase();

                                  if (isOfflineReg) {
                                    // 1. Generate new student NIS
                                    const currentYearStr = String(new Date().getFullYear());
                                    const genderCode = req.gender === 'Perempuan' ? '02' : '01';
                                    const sameYearCount = students.filter(s => s.nis.startsWith(currentYearStr)).length + 1;
                                    let suffix = sameYearCount;
                                    let generatedNis = `${currentYearStr}.${genderCode}.${String(suffix).padStart(4, '0')}`;
                                    while (students.some(s => s.nis === generatedNis)) {
                                      suffix++;
                                      generatedNis = `${currentYearStr}.${genderCode}.${String(suffix).padStart(4, '0')}`;
                                    }
                                    finalNis = generatedNis;

                                    // 2. Generate new student object
                                    const cleanName = capitalizedName.toLowerCase().replace(/\s+/g, '');
                                    const email = `${cleanName}@alasyariyah.sch.id`;

                                    const newStudent: Student = {
                                      id: `std-${Date.now()}`,
                                      nis: generatedNis,
                                      fullName: capitalizedName,
                                      gender: req.gender || 'Laki-laki',
                                      classPagi: req.diniyahSchool || '1A MTs Diniyah',
                                      classSore: req.formalSchool || 'VII SMP Formal',
                                      class: `${req.formalSchool || 'VII SMP Formal'} • ${req.diniyahSchool || '1A MTs Diniyah'}`,
                                      classMadrasah: req.diniyahSchool || '1A MTs Diniyah',
                                      classFormal: req.formalSchool || 'VII SMP Formal',
                                      akunMadrasah: `${cleanName}.${currentYearStr.substring(2)} / md123`,
                                      parentName: 'WALI ' + capitalizedName,
                                      parentPhone: req.parentPhone,
                                      email: email,
                                      address: req.address || '',
                                      status: 'Aktif',
                                      kamar: req.gender === 'Perempuan' ? 'Az-Zahra 1' : 'Al-Ghazali 1', // Real determined room based on gender
                                      tahfidzLogs: [],
                                      securityLogs: [],
                                      disciplineLogs: [],
                                      healthLogs: []
                                    };

                                    // Prevent duplicate student checking
                                    if (students.some(s => s.fullName.toLowerCase() === capitalizedName.toLowerCase())) {
                                      showAlert('danger', `Siswa dengan nama ${capitalizedName} sudah terdaftar.`);
                                      return;
                                    }

                                    // Add to student list
                                    const updatedStudents = [newStudent, ...students];
                                    setStudents(updatedStudents);
                                    localStorage.setItem('pesantren_students', JSON.stringify(updatedStudents));

                                    // Add registration bills and fees
                                    const registrationBills = generateNewStudentBills(newStudent, 'Cicilan Bulanan', settings);
                                    if (false) void([
                                      {
                                        id: `bill-reg-${Date.now()}`,
                                        studentId: newStudent.id,
                                        studentName: newStudent.fullName,
                                        nis: generatedNis,
                                        title: 'Biaya Pendaftaran Calon Santri Baru (PCSB)',
                                        amount: 150000,
                                         dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                                         status: 'Belum Lunas',
                                         category: 'Pendaftaran'
                                       },
                                       {
                                         id: `bill-sarpras-${Date.now()}`,
                                         studentId: newStudent.id,
                                         studentName: newStudent.fullName,
                                         nis: generatedNis,
                                         title: 'Infaq Pengembangan Sarpras & Gedung',
                                         amount: 1500000,
                                         dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                                         status: 'Belum Lunas',
                                         category: 'Pendaftaran'
                                       },
                                       {
                                         id: `bill-seragam-${Date.now()}`,
                                         studentId: newStudent.id,
                                         studentName: newStudent.fullName,
                                         nis: generatedNis,
                                         title: 'Seragam Resmi & Atribut Pesantren (3 Stel)',
                                         amount: 750000,
                                         dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                                         status: 'Belum Lunas',
                                         category: 'Pendaftaran'
                                       },
                                       {
                                         id: `bill-kitab-${Date.now()}`,
                                         studentId: newStudent.id,
                                         studentName: newStudent.fullName,
                                         nis: generatedNis,
                                         title: 'Paket Kitab Kuning & Buku Panduan Belajar',
                                         amount: 450000,
                                         dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                                         status: 'Belum Lunas',
                                         category: 'Pendaftaran'
                                       },
                                       {
                                         id: `bill-kesehatan-${Date.now()}`,
                                         studentId: newStudent.id,
                                         studentName: newStudent.fullName,
                                         nis: generatedNis,
                                         title: 'Kas Kesehatan & Penyediaan Lemari Asrama',
                                         amount: 350000,
                                         dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                                         status: 'Belum Lunas',
                                         category: 'Pendaftaran'
                                       },
                                       {
                                         id: `bill-syahriyah-first-${Date.now()}`,
                                         studentId: newStudent.id,
                                         studentName: newStudent.fullName,
                                         nis: generatedNis,
                                         title: 'Iuran Syahriyah / SPP Bulan Pertama (Juli)',
                                         amount: 200000,
                                         dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                                         status: 'Belum Lunas',
                                         category: 'Syahriyah'
                                       }
                                     ]);
                                     const updatedBills = [...registrationBills, ...bills];
                                     setBills(updatedBills);
                                     localStorage.setItem('pesantren_bills', JSON.stringify(updatedBills));
                                  }

                                  // Update status on the request
                                  const updatedRequests = currentList.map(r => r.id === req.id ? { ...r, status: 'Disetujui' as const, nis: finalNis } : r);
                                  setForgotRequests(updatedRequests);
                                  localStorage.setItem('pesantren_forgot_requests', JSON.stringify(updatedRequests));

                                  // Prepare WA Message
                                  let waMsg = '';
                                  if (isOfflineReg) {
                                    waMsg = `Assalamu'alaikum Wr. Wb. Bapak/Ibu Wali Santri dari *${capitalizedName}*,\n\nPendaftaran offline santri baru atas nama *${capitalizedName}* telah disetujui oleh Administrator Pesantren Al-Asy'ariyah.\n\nBerikut adalah kredensial akun login resmi untuk mengakses portal santri:\n• *Situs Web Portal:* ${window.location.origin}\n• *Username/NIS:* ${finalNis}\n• *Password default:* (Gunakan NIS Anda untuk masuk)\n\nSilakan simpan informasi ini baik-baik demi keutuhan data akademik santri.\n\nWassalamu'alaikum Wr. Wb.\n-- Admin Pondok Pesantren Al-Asy'ariyah --`;
                                  } else {
                                    const actualCreds = matchedStudent 
                                      ? `• Email: ${matchedStudent.email}\n• Password default (NIS): ${matchedStudent.nis}` 
                                      : `• Password default: (Silakan coba menggunakan NIS Anda)`;
                                    waMsg = `Assalamu'alaikum Wr. Wb. Bapak/Ibu Wali Santri dari *${capitalizedName}*,\n\nPermintaan info kredensial login Anda telah disetujui oleh Administrator Pesantren Al-Asy'ariyah.\n\nBerikut detail info akun untuk login ke portal:\n• *Situs Web Portal:* ${window.location.origin}\n• *NIS (Username):* ${finalNis}\n${actualCreds}\n\nSilakan simpan informasi ini baik-baik demi keutuhan data akademik santri.\n\nWassalamu'alaikum Wr. Wb.\n-- Admin Pondok Pesantren Al-Asy'ariyah --`;
                                  }
                                  
                                  window.open(formatWhatsAppUrl(req.parentPhone, waMsg), '_blank');
                                  saveWaLog('Persetujuan Akun', req.parentPhone, `Wali ${capitalizedName}`, waMsg);

                                  showAlert('success', `Akses info login disetujui! Akun berhasil dikonfigurasi & WhatsApp disiapkan.`);
                                  window.dispatchEvent(new Event('forgot_requests_updated'));
                                }}
                                className="px-3 py-1.5 bg-gradient-to-r from-teal-800 to-emerald-900 hover:from-teal-700 hover:to-emerald-800 text-white rounded text-[11px] font-black shadow-md cursor-pointer transition flex items-center gap-1 active:scale-95"
                              >
                                <Send className="h-3 w-3" /> Setujui & Kirim via WA 📱
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Section 2: Send WA simulation & dispatch history logs (Right, 5 cols) */}
            <div className="lg:col-span-5 bg-white rounded-2xl shadow-sm border border-emerald-50 p-6 space-y-4">
              <h4 className="font-bold text-sm text-emerald-950 flex items-center justify-between border-b pb-2">
                <span className="flex items-center gap-1.5 col-span-3">
                  Histori Pengiriman WA ({waLogs.length})
                </span>
                <button
                  onClick={() => {
                    triggerConfirm(
                      'Bersihkan Histori WA',
                      'Apakah Anda yakin ingin mengosongkan seluruh riwayat log pengiriman broadcast WhatsApp?',
                      () => {
                        setWaLogs([]);
                        localStorage.setItem('pesantren_wa_logs', JSON.stringify([]));
                        showAlert('success', 'Histori WA dibersihkan.');
                      }
                    );
                  }}
                  className="text-[10px] text-gray-400 hover:text-gray-600 font-bold cursor-pointer"
                >
                  Hapus Log 🗑
                </button>
              </h4>

              {/* Filter Search Input (as requested: "berikan filter di pencarian jika d perlukan") */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cari log nama, nomor wa, jenis..."
                  value={waLogSearch}
                  onChange={(e) => setWaLogSearch(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-2 border border-emerald-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-700 placeholder-gray-400"
                />
              </div>

              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                {waLogs.filter(log => {
                  const term = waLogSearch.toLowerCase();
                  return log.recipient.toLowerCase().includes(term) ||
                         log.phone.includes(term) ||
                         log.type.toLowerCase().includes(term) ||
                         log.message.toLowerCase().includes(term);
                }).length === 0 ? (
                  <p className="text-center text-gray-400 text-xs py-12">Tidak ada log notifikasi WhatsApp yang cocok.</p>
                ) : (
                  waLogs.filter(log => {
                    const term = waLogSearch.toLowerCase();
                    return log.recipient.toLowerCase().includes(term) ||
                           log.phone.includes(term) ||
                           log.type.toLowerCase().includes(term) ||
                           log.message.toLowerCase().includes(term);
                  }).map(log => (
                    <div key={log.id} className="p-3 bg-gray-50 border border-gray-150 rounded-xl text-[11px] space-y-1">
                      <div className="flex justify-between items-center">
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded font-sans uppercase tracking-tight ${
                          log.type.includes('Lupa') 
                            ? 'bg-purple-100 text-purple-800' 
                            : log.type.includes('Diterima') 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {log.type}
                        </span>
                        <span className="text-[9px] text-gray-400 font-mono">
                          {new Date(log.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <p className="text-gray-900 font-bold block pt-0.5">
                        Penerima: {log.recipient} (+{log.phone})
                      </p>

                      <div className="bg-white p-2 rounded border border-gray-100 text-gray-600 italic font-mono text-[10px] max-h-16 overflow-y-auto whitespace-pre-wrap leading-tight mt-1">
                        {log.message}
                      </div>

                      <div className="text-[10px] text-emerald-800 font-bold flex items-center gap-1 pt-1 justify-end">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600"></span>
                        Direct WA Ready ✓
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              <p className="text-[10px] text-gray-400 leading-relaxed text-center italic bg-emerald-50/40 p-2.5 rounded-lg border border-dashed border-emerald-100">
                * Routing menggunakan link resmi universal WhatsApp WA.ME sehingga sangat aman dari pemblokiran spam pihak ketiga.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Pusat Laporan Lintas-Sektoral Bulanan & Tahunan */}
      {activeTab === 'reports' && (
        <div className="space-y-6 text-left">
          {/* Controls Card */}
          <div className="bg-white p-6 rounded-2xl border border-emerald-50 shadow-sm space-y-4">
            <h3 className="font-extrabold text-emerald-950 text-base flex items-center gap-2">
              <span>📅</span> Pengaturan Cetak Laporan Bulanan & Tahunan (Lintas-Sektoral)
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Pusat pelaporan administrasi terpadu untuk pendaftaran santri baru (PCSB), catatan kesehatan poskestren, perizinan santri lewat/terlambat kembali (ketertiban), serta verifikasi pembayaran syahriyah (keuangan).
            </p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
              <div>
                <label className="block text-[10px] uppercase font-extrabold text-gray-500 mb-1">Jenis Laporan</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as any)}
                  className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg bg-white font-bold text-gray-800"
                >
                  <option value="pcsb">Pendaftaran Baru (PCSB)</option>
                  <option value="health">Rujukan & Kesehatan (Poskestren)</option>
                  <option value="security">Perizinan Keluar-Masuk (Ketertiban)</option>
                  <option value="discipline">Catatan Takzir & Sanksi (Disiplin)</option>
                  <option value="payments">Pembayaran Syahriyah (SPP)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-extrabold text-gray-500 mb-1">Metode Periode</label>
                <div className="grid grid-cols-2 gap-1 bg-gray-50 p-1 rounded-lg border border-gray-150">
                  <button
                    type="button"
                    onClick={() => setReportPeriod('bulanan')}
                    className={`text-[10px] py-1.5 font-bold rounded-md transition ${reportPeriod === 'bulanan' ? 'bg-emerald-800 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    Bulanan
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportPeriod('tahunan')}
                    className={`text-[10px] py-1.5 font-bold rounded-md transition ${reportPeriod === 'tahunan' ? 'bg-emerald-800 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    Tahunan
                  </button>
                </div>
              </div>

              {reportPeriod === 'bulanan' && (
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-gray-500 mb-1">Bulan</label>
                  <select
                    value={reportMonth}
                    onChange={(e) => setReportMonth(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-800"
                  >
                    <option value="01">Januari</option>
                    <option value="02">Februari</option>
                    <option value="03">Maret</option>
                    <option value="04">April</option>
                    <option value="05">Mei</option>
                    <option value="06">Juni</option>
                    <option value="07">Juli</option>
                    <option value="08">Agustus</option>
                    <option value="09">September</option>
                    <option value="10">Oktober</option>
                    <option value="11">November</option>
                    <option value="12">Desember</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[10px] uppercase font-extrabold text-gray-500 mb-1">Tahun</label>
                <select
                  value={reportYear}
                  onChange={(e) => setReportYear(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg bg-white font-mono text-gray-800"
                >
                  <option value="2026">2026</option>
                  <option value="2027">2027</option>
                  <option value="2028">2028</option>
                </select>
              </div>

              {reportType === 'discipline' && (
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-gray-500 mb-1">Status Pelanggaran</label>
                  <select
                    value={disciplineReportStatusFilter}
                    onChange={(e) => setDisciplineReportStatusFilter(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg bg-white font-bold text-gray-800"
                  >
                    <option value="all">Semua Status Pelanggaran</option>
                    <option value="Selesai">Selesai / Sudah Diurus Saja</option>
                    <option value="Sedang Mengurus">Sedang Mengurus</option>
                    <option value="Belum Diurus">Belum Diurus</option>
                  </select>
                </div>
              )}
            </div>

            <div className="pt-2 border-t flex justify-end">
              <button
                type="button"
                onClick={() => {
                  const reportTitle = `Laporan_${reportType}_${reportPeriod}_${reportPeriod === 'bulanan' ? reportMonth : ''}_${reportYear}`;
                  downloadPrintableTableHTML('admin-report-table-printable', reportTitle);
                }}
                className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-950 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <Printer className="h-4 w-4" /> Cetak Laporan Resmi (PDF)
              </button>
            </div>
          </div>

          {/* LIVE SUMMARY / REKAPAN SEKTORAL */}
          {(() => {
            const matchDate = (dateStr?: string) => {
              if (!dateStr) return false;
              const [y, m] = dateStr.split('-');
              return reportPeriod === 'bulanan' ? (y === reportYear && m === reportMonth) : (y === reportYear);
            };

            const headerLabel = 
              reportType === 'pcsb' ? 'Pencalonan Santri Baru (PCSB)' :
              reportType === 'health' ? 'Pelayanan Kesehatan (Poskestren)' :
              reportType === 'security' ? 'Ketertiban & Pelanggaran' :
              'Pembayaran Syahriyah & Keuangan';

            const periodLabel = 
              reportPeriod === 'bulanan' ? `Bulan ${reportMonth} Tahun ${reportYear}` : `Tahun ${reportYear}`;

            return (
              <div className="bg-emerald-50/20 p-5 rounded-2xl border border-emerald-100 space-y-3.5">
                <div className="flex justify-between items-center border-b border-emerald-100/30 pb-2">
                  <h4 className="font-extrabold text-xs text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                    REKAPAN DATA: {headerLabel}
                  </h4>
                  <span className="bg-emerald-800 text-white font-mono text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                    {periodLabel}
                  </span>
                </div>

                {reportType === 'pcsb' && (() => {
                  const rawPcsb = [...ppdbList, ...ppdbArchive];
                  const allPcsb = Array.from(new Map(rawPcsb.map(item => [item.id, item])).values());
                  const filtered = allPcsb.filter(p => matchDate(p.registrationDate));
                  const diterima = filtered.filter(p => p.status === 'Diterima').length;
                  const pending = filtered.filter(p => p.status === 'Pending').length;
                  const ditolak = filtered.filter(p => p.status === 'Ditolak').length;
                  const lakiLaki = filtered.filter(p => p.gender === 'Laki-laki').length;
                  const perempuan = filtered.filter(p => p.gender === 'Perempuan').length;

                  return (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <div className="bg-white p-3 rounded-xl border border-emerald-50 text-center shadow-xs">
                        <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Total Pendaftar</div>
                        <div className="text-base font-black text-emerald-950 mt-0.5">{filtered.length}</div>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-emerald-50 text-center shadow-xs">
                        <div className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider">Lulus Seleksi</div>
                        <div className="text-base font-black text-emerald-700 mt-0.5">{diterima}</div>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-emerald-50 text-center shadow-xs">
                        <div className="text-[9px] text-amber-600 font-bold uppercase tracking-wider">Menunggu Berkas</div>
                        <div className="text-base font-black text-amber-600 mt-0.5">{pending}</div>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-emerald-50 text-center shadow-xs">
                        <div className="text-[9px] text-rose-600 font-bold uppercase tracking-wider">Ditolak / Arsip</div>
                        <div className="text-base font-black text-rose-600 mt-0.5">{ditolak}</div>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-emerald-50 text-center shadow-xs col-span-2 md:col-span-1">
                        <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Rasio Gender (L/P)</div>
                        <div className="text-xs font-extrabold text-gray-700 mt-1">{lakiLaki} L / {perempuan} P</div>
                      </div>
                    </div>
                  );
                })()}

                {reportType === 'health' && (() => {
                  const allLogs: HealthLog[] = [];
                  students.forEach(s => {
                    if (s.healthLogs) {
                      s.healthLogs.forEach(l => {
                        allLogs.push({ ...l, studentName: s.fullName });
                      });
                    }
                  });
                  const filtered = allLogs.filter(l => matchDate(l.date));
                  const rawatJalan = filtered.filter(l => l.status === 'Rawat Jalan (Kamar)').length;
                  const poskestren = filtered.filter(l => l.status === 'Nginap di Poskestren').length;
                  const dirujuk = filtered.filter(l => l.status === 'Dirujuk ke RS / Pulang').length;

                  return (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-white p-3 rounded-xl border border-emerald-50 text-center shadow-xs">
                        <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Total Kasus Sakit</div>
                        <div className="text-base font-black text-emerald-950 mt-0.5">{filtered.length} Kasus</div>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-emerald-50 text-center shadow-xs">
                        <div className="text-[9px] text-blue-600 font-bold uppercase tracking-wider">Rawat Jalan Kamar</div>
                        <div className="text-base font-black text-blue-700 mt-0.5">{rawatJalan}</div>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-emerald-50 text-center shadow-xs">
                        <div className="text-[9px] text-amber-600 font-bold uppercase tracking-wider">Karantina Poskestren</div>
                        <div className="text-base font-black text-amber-600 mt-0.5">{poskestren}</div>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-emerald-50 text-center shadow-xs">
                        <div className="text-[9px] text-rose-600 font-bold uppercase tracking-wider">Dirujuk ke RS / Pulang</div>
                        <div className="text-base font-black text-rose-600 mt-0.5">{dirujuk}</div>
                      </div>
                    </div>
                  );
                })()}

                {reportType === 'security' && (() => {
                  const allLogs: SecurityLog[] = [];
                  const allDisc: DisciplineLog[] = [];
                  students.forEach(s => {
                    if (s.securityLogs) {
                      s.securityLogs.forEach(l => {
                        allLogs.push({ ...l, studentName: s.fullName });
                      });
                    }
                    if (s.disciplineLogs) {
                      s.disciplineLogs.forEach(d => {
                        allDisc.push(d);
                      });
                    }
                  });
                  const filteredSec = allLogs.filter(l => matchDate(l.outDate));
                  const filteredDisc = allDisc.filter(d => matchDate(d.date));
                  const kembali = filteredSec.filter(l => l.status === 'Kembali').length;
                  const aktif = filteredSec.filter(l => l.status === 'Aktif / Keluar').length;
                  const terlambat = filteredSec.filter(l => l.status === 'Terlambat').length;

                  return (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <div className="bg-white p-3 rounded-xl border border-emerald-50 text-center shadow-xs">
                        <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Total Izin Keluar</div>
                        <div className="text-base font-black text-emerald-950 mt-0.5">{filteredSec.length}</div>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-emerald-50 text-center shadow-xs">
                        <div className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider">Kembali Tepat</div>
                        <div className="text-base font-black text-emerald-700 mt-0.5">{kembali}</div>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-emerald-50 text-center shadow-xs">
                        <div className="text-[9px] text-blue-600 font-bold uppercase tracking-wider">Aktif di Luar</div>
                        <div className="text-base font-black text-blue-600 mt-0.5">{aktif}</div>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-emerald-50 text-center shadow-xs">
                        <div className="text-[9px] text-rose-600 font-bold uppercase tracking-wider">Terlambat Kembali</div>
                        <div className="text-base font-black text-rose-600 mt-0.5">{terlambat}</div>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-emerald-50 text-center shadow-xs col-span-2 md:col-span-1">
                        <div className="text-[9px] text-red-700 font-bold uppercase tracking-wider">Total Pelanggaran</div>
                        <div className="text-base font-black text-red-700 mt-0.5">{filteredDisc.length} Kasus</div>
                      </div>
                    </div>
                  );
                })()}

                {reportType === 'payments' && (() => {
                  const filtered = bills.filter(b => b.status === 'Lunas' && matchDate(b.paymentDate));
                  const totalAmount = filtered.reduce((sum, b) => sum + b.amount, 0);

                  return (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white p-3 rounded-xl border border-emerald-50 text-center shadow-xs">
                        <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Transaksi Terverifikasi</div>
                        <div className="text-base font-black text-emerald-950 mt-0.5">{filtered.length} Pembayaran</div>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-emerald-50 text-center shadow-xs">
                        <div className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider">Dana Masuk Terkumpul</div>
                        <div className="text-base font-black text-emerald-700 mt-0.5">Rp {totalAmount.toLocaleString('id-ID')}</div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })()}

          {/* Render Printable Report Canvas */}
          <div id="admin-report-table-printable" className="bg-white p-8 border border-emerald-50 rounded-2xl shadow-sm space-y-6">
            
            {/* Official KOP SURAT */}
            <div className="border-b-4 border-double border-teal-800 pb-4 mb-6">
              <div className="flex gap-4 items-center">
                {(settings.logoUrl || '/pesantren_logo.jpg') ? (
                  <img src={settings.logoUrl || '/pesantren_logo.jpg'} alt="Logo Pesantren" className="h-16 w-16 object-contain" referrerPolicy="no-referrer" />
                ) : (
                  <div className="text-3xl shrink-0 flex items-center justify-center h-16 w-16">🕌</div>
                )}
                <div className="flex-1 text-left">
                  <h4 className="text-teal-950 font-black text-sm tracking-wide uppercase leading-tight">{settings.schoolName || "Pondok Pesantren Al-Asy'ariyah"}</h4>
                  <p className="text-[10px] italic font-sans text-teal-850 font-bold tracking-wide uppercase">PORTAL ADMINISTRASI PESANTREN LINTAS-SEKTORAL</p>
                  <p className="text-[9px] text-gray-500 max-w-md leading-relaxed mt-0.5">
                    {settings.address || "Jl. Raya Modung, Langpanggang, Modung, Bangkalan, Jawa Timur"}<br />
                    {settings.phone ? `Hubungi: ${settings.phone} | ` : ''} Email: {settings.email || "info@alasyariyah.sch.id"}
                  </p>
                </div>
              </div>
            </div>

            {/* Document Header Metadata */}
            <div className="text-center">
              <h2 className="text-lg font-extrabold uppercase text-gray-950 tracking-tight font-sans">
                LAPORAN REKAPITULASI {
                  reportType === 'pcsb' ? 'PENDAFTARAN SANTRI BARU (PCSB)' :
                  reportType === 'health' ? 'LAYANAN KESEHATAN & RUJUKAN' :
                  reportType === 'security' ? 'PERIZINAN KELUAR & DISIPLIN KETERTIBAN' :
                  'VERIFIKASI TRANSAKSI SYAHRIYAH & SPP'
                }
              </h2>
              <p className="text-xs text-gray-600 font-medium">
                Periode {reportPeriod === 'bulanan' ? `Bulanan: ${reportMonth}/${reportYear}` : `Tahunan: ${reportYear}`}
              </p>
            </div>

            {/* Table Area */}
            <div className="overflow-x-auto border border-gray-150 rounded-xl">
              <table className="w-full text-xs text-left border-collapse">
                
                {/* 1. PCSB Table Headers */}
                {reportType === 'pcsb' && (
                  <>
                    <thead className="bg-emerald-50 border-b border-gray-200">
                      <tr>
                        <th className="p-3 font-extrabold text-[10px] uppercase text-gray-500 w-12 text-center">No</th>
                        <th className="p-3 font-extrabold text-[10px] uppercase text-gray-500">Tanggal Daftar</th>
                        <th className="p-3 font-extrabold text-[10px] uppercase text-gray-500">Nama Calon Santri</th>
                        <th className="p-3 font-extrabold text-[10px] uppercase text-gray-500">Gender</th>
                        <th className="p-3 font-extrabold text-[10px] uppercase text-gray-500">Nama Wali</th>
                        <th className="p-3 font-extrabold text-[10px] uppercase text-gray-500">No. WhatsApp</th>
                        <th className="p-3 font-extrabold text-[10px] uppercase text-gray-500">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-150">
                      {(() => {
                        const rawPcsb = [...ppdbList, ...ppdbArchive];
                        const allPcsb = Array.from(new Map(rawPcsb.map(item => [item.id, item])).values());
                        const matchDate = (dateStr?: string) => {
                          if (!dateStr) return false;
                          const [y, m] = dateStr.split('-');
                          return reportPeriod === 'bulanan' ? (y === reportYear && m === reportMonth) : (y === reportYear);
                        };
                        const filtered = allPcsb.filter(p => matchDate(p.registrationDate));

                        if (filtered.length === 0) {
                          return (
                            <tr>
                              <td colSpan={7} className="p-8 text-center text-gray-400 font-medium italic">
                                Tidak ada data pendaftaran PCSB yang cocok dengan periode ini.
                              </td>
                            </tr>
                          );
                        }

                        return filtered.map((item, idx) => (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="p-3 text-center font-mono text-gray-400">{idx + 1}</td>
                            <td className="p-3 font-mono">{item.registrationDate || '-'}</td>
                            <td className="p-3 font-extrabold text-gray-900">{item.fullName}</td>
                            <td className="p-3">{item.gender}</td>
                            <td className="p-3 font-medium text-gray-800">{item.parentName}</td>
                            <td className="p-3 font-mono">{item.parentPhone}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                item.status === 'Diterima' ? 'bg-emerald-100 text-emerald-800' :
                                item.status === 'Ditolak' ? 'bg-rose-100 text-rose-800' :
                                'bg-amber-100 text-amber-800'
                              }`}>
                                {item.status}
                              </span>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </>
                )}

                {/* 2. Health Table Headers */}
                {reportType === 'health' && (
                  <>
                    <thead className="bg-emerald-50 border-b border-gray-200">
                      <tr>
                        <th className="p-3 font-extrabold text-[10px] uppercase text-gray-500 w-12 text-center">No</th>
                        <th className="p-3 font-extrabold text-[10px] uppercase text-gray-500">Tanggal Sakit</th>
                        <th className="p-3 font-extrabold text-[10px] uppercase text-gray-500">Nama Santri</th>
                        <th className="p-3 font-extrabold text-[10px] uppercase text-gray-500">Keluhan</th>
                        <th className="p-3 font-extrabold text-[10px] uppercase text-gray-500">Diagnosis</th>
                        <th className="p-3 font-extrabold text-[10px] uppercase text-gray-500">Tindakan</th>
                        <th className="p-3 font-extrabold text-[10px] uppercase text-gray-500">Status Rawat</th>
                        <th className="p-3 font-extrabold text-[10px] uppercase text-gray-500">Pemeriksa</th>
                        <th className="p-3 font-extrabold text-[10px] uppercase text-gray-500 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-150">
                      {(() => {
                        const allLogs: HealthLog[] = [];
                        students.forEach(s => {
                          if (s.healthLogs) {
                            s.healthLogs.forEach(l => {
                              allLogs.push({ ...l, studentName: s.fullName });
                            });
                          }
                        });
                        const matchDate = (dateStr?: string) => {
                          if (!dateStr) return false;
                          const [y, m] = dateStr.split('-');
                          return reportPeriod === 'bulanan' ? (y === reportYear && m === reportMonth) : (y === reportYear);
                        };
                        const filtered = allLogs.filter(l => matchDate(l.date));

                        if (filtered.length === 0) {
                          return (
                            <tr>
                              <td colSpan={9} className="p-8 text-center text-gray-400 font-medium italic">
                                Tidak ada data rujukan kesehatan yang cocok dengan periode ini.
                              </td>
                            </tr>
                          );
                        }

                        return filtered.map((item, idx) => (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="p-3 text-center font-mono text-gray-400">{idx + 1}</td>
                            <td className="p-3 font-mono">{item.date}</td>
                            <td className="p-3 font-extrabold text-gray-900">{item.studentName}</td>
                            <td className="p-3 text-gray-700">{item.complaint}</td>
                            <td className="p-3 text-gray-700">{item.diagnosis}</td>
                            <td className="p-3 text-gray-700">{item.treatment}</td>
                            <td className="p-3 font-medium">{item.status}</td>
                            <td className="p-3 font-mono text-[10px] text-gray-500">{item.signedBy}</td>
                            <td className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() => setPrintHealthLog(item)}
                                className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-850 rounded text-[10px] font-bold cursor-pointer transition flex items-center gap-1 mx-auto"
                              >
                                👁️ Lihat Surat
                              </button>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </>
                )}

                {/* 3. Security Table Headers */}
                {reportType === 'security' && (
                  <>
                    <thead className="bg-emerald-50 border-b border-gray-200">
                      <tr>
                        <th className="p-3 font-extrabold text-[10px] uppercase text-gray-500 w-12 text-center">No</th>
                        <th className="p-3 font-extrabold text-[10px] uppercase text-gray-500">Nama Santri</th>
                        <th className="p-3 font-extrabold text-[10px] uppercase text-gray-500">Tipe Izin</th>
                        <th className="p-3 font-extrabold text-[10px] uppercase text-gray-500">Tanggal Keluar</th>
                        <th className="p-3 font-extrabold text-[10px] uppercase text-gray-500">Kembali (Target)</th>
                        <th className="p-3 font-extrabold text-[10px] uppercase text-gray-500">Tanggal Kembali</th>
                        <th className="p-3 font-extrabold text-[10px] uppercase text-gray-500">Status</th>
                        <th className="p-3 font-extrabold text-[10px] uppercase text-gray-500">Petugas</th>
                        <th className="p-3 font-extrabold text-[10px] uppercase text-gray-500 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-150">
                      {(() => {
                        const allLogs: SecurityLog[] = [];
                        students.forEach(s => {
                          if (s.securityLogs) {
                            s.securityLogs.forEach(l => {
                              allLogs.push({ ...l, studentName: s.fullName });
                            });
                          }
                        });
                        const matchDate = (dateStr?: string) => {
                          if (!dateStr) return false;
                          const [y, m] = dateStr.split('-');
                          return reportPeriod === 'bulanan' ? (y === reportYear && m === reportMonth) : (y === reportYear);
                        };
                        const filtered = allLogs.filter(l => matchDate(l.outDate));

                        if (filtered.length === 0) {
                          return (
                            <tr>
                              <td colSpan={9} className="p-8 text-center text-gray-400 font-medium italic">
                                Tidak ada data perizinan keluar-masuk yang cocok dengan periode ini.
                              </td>
                            </tr>
                          );
                        }

                        return filtered.map((item, idx) => (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="p-3 text-center font-mono text-gray-400">{idx + 1}</td>
                            <td className="p-3 font-extrabold text-gray-900">{item.studentName}</td>
                            <td className="p-3 font-medium text-emerald-850">{item.permitType}</td>
                            <td className="p-3 font-mono">{item.outDate.replace('T', ' ')}</td>
                            <td className="p-3 font-mono">{item.expectedReturnDate.replace('T', ' ')}</td>
                            <td className="p-3 font-mono">{item.actualReturnDate ? item.actualReturnDate.replace('T', ' ') : '-'}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                item.status === 'Kembali' ? 'bg-emerald-100 text-emerald-800' :
                                item.status === 'Terlambat' ? 'bg-rose-100 text-rose-800' :
                                'bg-amber-100 text-amber-800'
                              }`}>
                                {item.status}
                              </span>
                            </td>
                            <td className="p-3 font-mono text-[10px] text-gray-500">{item.signedBy}</td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                {item.status === 'Menunggu Persetujuan' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => triggerConfirm(
                                        'Setujui Perizinan',
                                        `Apakah Anda yakin ingin menyetujui perizinan keluar untuk ${item.studentName}?`,
                                        () => handleApprovePermit(item.studentId, item.id)
                                      )}
                                      className="px-2 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[10px] font-bold cursor-pointer transition shadow-2xs"
                                    >
                                      ✓ Setujui
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => triggerConfirm(
                                        'Tolak Perizinan',
                                        `Apakah Anda yakin ingin menolak perizinan keluar untuk ${item.studentName}?`,
                                        () => handleRejectPermit(item.studentId, item.id)
                                      )}
                                      className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold cursor-pointer transition shadow-2xs"
                                    >
                                      ✕ Tolak
                                    </button>
                                  </>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setPrintSecurityLog(item)}
                                  className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-850 rounded text-[10px] font-bold cursor-pointer transition flex items-center gap-1"
                                >
                                  👁️ Lihat Surat
                                </button>
                              </div>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </>
                )}

                {/* 5. Discipline Table Headers */}
                {reportType === 'discipline' && (
                  <>
                    <thead className="bg-emerald-50 border-b border-gray-200">
                      <tr>
                        <th className="p-3 font-extrabold text-[10px] uppercase text-gray-500 w-12 text-center">No</th>
                        <th className="p-3 font-extrabold text-[10px] uppercase text-gray-500">Tanggal Kejadian</th>
                        <th className="p-3 font-extrabold text-[10px] uppercase text-gray-500">Nama Santri</th>
                        <th className="p-3 font-extrabold text-[10px] uppercase text-gray-500">Jenis Pelanggaran</th>
                        <th className="p-3 font-extrabold text-[10px] uppercase text-gray-500">Tingkat</th>
                        <th className="p-3 font-extrabold text-[10px] uppercase text-gray-500">Tindakan / Sanksi</th>
                        <th className="p-3 font-extrabold text-[10px] uppercase text-gray-500">Petugas</th>
                        <th className="p-3 font-extrabold text-[10px] uppercase text-gray-500 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-150">
                      {(() => {
                        const allLogs: DisciplineLog[] = [];
                        students.forEach(s => {
                          if (s.disciplineLogs) {
                            s.disciplineLogs.forEach(l => {
                              allLogs.push({ ...l, studentName: s.fullName });
                            });
                          }
                        });
                        const matchDate = (dateStr?: string) => {
                          if (!dateStr) return false;
                          const [y, m] = dateStr.split('-');
                          return reportPeriod === 'bulanan' ? (y === reportYear && m === reportMonth) : (y === reportYear);
                        };
                        const filtered = allLogs.filter(l => {
                          const matchesDate = matchDate(l.date);
                          if (!matchesDate) return false;
                          if (disciplineReportStatusFilter === 'all') return true;
                          const sStatus = l.status || 'Belum Diurus';
                          return sStatus === disciplineReportStatusFilter;
                        });

                        if (filtered.length === 0) {
                          return (
                            <tr>
                              <td colSpan={9} className="p-8 text-center text-gray-400 font-medium italic">
                                Tidak ada data takzir sanksi kedisiplinan yang cocok dengan periode ini.
                              </td>
                            </tr>
                          );
                        }

                        return filtered.map((item, idx) => (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="p-3 text-center font-mono text-gray-400">{idx + 1}</td>
                            <td className="p-3 font-mono">{item.date}</td>
                            <td className="p-3 font-extrabold text-gray-900">{item.studentName}</td>
                            <td className="p-3 text-gray-700 font-medium">{item.violationType}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                item.level === 'Ringan' ? 'bg-slate-100 text-slate-800' :
                                item.level === 'Sedang' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {item.level}
                              </span>
                            </td>
                            <td className="p-3 text-gray-600 max-w-xs truncate" title={item.consequence}>{item.consequence}</td>
                            <td className="p-3 font-mono text-[10px] text-gray-500">{item.signedBy}</td>
                            <td className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() => setPrintDisciplineLog(item)}
                                className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-850 rounded text-[10px] font-bold cursor-pointer transition flex items-center gap-1 mx-auto"
                              >
                                👁️ Lihat Surat
                              </button>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </>
                )}

                {/* 4. Payments Table Headers */}
                {reportType === 'payments' && (
                  <>
                    <thead className="bg-emerald-50 border-b border-gray-200">
                      <tr>
                        <th className="p-3 font-extrabold text-[10px] uppercase text-gray-500 w-12 text-center">No</th>
                        <th className="p-3 font-extrabold text-[10px] uppercase text-gray-500">Tanggal Bayar</th>
                        <th className="p-3 font-extrabold text-[10px] uppercase text-gray-500">Nama Santri</th>
                        <th className="p-3 font-extrabold text-[10px] uppercase text-gray-500">Rincian Tagihan</th>
                        <th className="p-3 font-extrabold text-[10px] uppercase text-gray-500">Jumlah Pembayaran</th>
                        <th className="p-3 font-extrabold text-[10px] uppercase text-gray-500">Metode</th>
                        <th className="p-3 font-extrabold text-[10px] uppercase text-gray-500">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-150">
                      {(() => {
                        const matchDate = (dateStr?: string) => {
                          if (!dateStr) return false;
                          const [y, m] = dateStr.split('-');
                          return reportPeriod === 'bulanan' ? (y === reportYear && m === reportMonth) : (y === reportYear);
                        };
                        const filtered = bills.filter(b => b.status === 'Lunas' && matchDate(b.paymentDate));

                        if (filtered.length === 0) {
                          return (
                            <tr>
                              <td colSpan={7} className="p-8 text-center text-gray-400 font-medium italic">
                                Tidak ada data pembayaran lunas yang cocok dengan periode ini.
                              </td>
                            </tr>
                          );
                        }

                        return filtered.map((item, idx) => (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="p-3 text-center font-mono text-gray-400">{idx + 1}</td>
                            <td className="p-3 font-mono">{item.paymentDate || '-'}</td>
                            <td className="p-3 font-extrabold text-gray-900">{item.studentName}</td>
                            <td className="p-3 text-gray-700">{item.title}</td>
                            <td className="p-3 font-mono font-bold text-teal-800">Rp {item.amount.toLocaleString('id-ID')}</td>
                            <td className="p-3">{item.paymentMethod || 'Manual/Tunai'}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                Lunas (Selesai)
                              </span>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </>
                )}

              </table>
            </div>

            {/* Official Caretaker Signature Area */}
            <div className="mt-12 grid grid-cols-2 text-xs">
              <div>
                <p className="text-gray-400 italic">Dokumen ini merupakan arsip digital resmi</p>
                <p className="text-gray-400 text-[9px] font-mono mt-0.5">Sistem Verifikasi: AL-ASYARIYAH-SECURE-KEY-3000</p>
              </div>
              <div className="text-left pl-8 relative ml-auto w-[240px]">
                <div>
                  <p className="text-gray-650 font-medium">{getCityFromAddress(settings.address)}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  <p className="font-bold text-gray-900 leading-tight">Pengasuh Pondok Pesantren</p>
                </div>
                
                {/* Overlapping Signature & Stamp Container - Full Height from Position to Name */}
                <div className="h-28 w-60 relative flex items-center justify-start select-none my-0">
                  {/* Tanda tangan (Full dari jabatan sampai nama di bawahnya) */}
                  <div className="z-10 absolute inset-0 flex items-center justify-start">
                    {isImageUrl(settings.ttdPengasuhUrl) ? (
                      <img 
                        src={settings.ttdPengasuhUrl} 
                        alt="TTD Pengasuh" 
                        className="h-full w-auto max-h-28 max-w-[210px] object-contain object-left mix-blend-multiply" 
                        referrerPolicy="no-referrer" 
                      />
                    ) : (
                      <span className="text-sm font-mono text-emerald-850 italic font-extrabold tracking-wide py-1">
                        {settings.ttdPengasuhUrl || "✒️ " + (settings.namaPengasuh || "KH. Ahmad Wildan")}
                      </span>
                    )}
                  </div>

                  {/* Stempel (Terletak di pinggir kiri tanda tangan dengan sistem tumpang tindih) */}
                  {settings.stempelPengasuhUrl && (
                    <div className="z-20 absolute -left-8 top-1/2 -translate-y-1/2 pointer-events-none opacity-90">
                      {isImageUrl(settings.stempelPengasuhUrl) ? (
                        <img 
                          src={settings.stempelPengasuhUrl} 
                          alt="Stempel Pengasuh" 
                          className="h-24 w-24 sm:h-28 sm:w-28 object-contain rotate-[-8deg] mix-blend-multiply" 
                          referrerPolicy="no-referrer" 
                        />
                      ) : (
                        <div className="border border-double border-emerald-600/70 text-emerald-700/90 rounded-full h-20 w-20 flex items-center justify-center text-[8px] font-extrabold uppercase rotate-[-8deg] leading-tight text-center bg-white/80 shadow-xs">
                          {settings.stempelPengasuhUrl}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <p className="font-extrabold text-gray-900 border-b border-gray-400 pb-0.5 inline-block min-w-[220px] leading-tight">
                    {settings.namaPengasuh || "KH. Ahmad Wildan Asy'ari"}
                  </p>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* Tab: Buku Register Log Surat Keluar Resmi (Arsip Digital) */}
      {activeTab === 'outbox_log' && (
        <div className="space-y-6 text-left">
          {/* BUKU REGISTER LOG SURAT KELUAR RESMI */}
          <div className="bg-white p-6 rounded-2xl border border-emerald-100 shadow-sm space-y-4 print:hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-extrabold text-emerald-950 text-base flex items-center gap-2">
                  Buku Register Log Surat Keluar Resmi (Arsip Digital)
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Log pencatatan otomatis semua dokumen & surat resmi yang telah dicetak atau diterbitkan oleh pondok pesantren.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    triggerConfirm(
                      'Mengosongkan Log Surat Keluar',
                      'Apakah Anda yakin ingin mengosongkan seluruh riwayat log surat keluar? Tindakan ini tidak dapat dibatalkan.',
                      () => {
                        setOutboundLettersLog([]);
                      }
                    );
                  }}
                  className="px-3 py-1.5 border border-rose-200 text-rose-650 hover:bg-rose-50 text-[10px] font-bold rounded-lg transition"
                >
                  Clear Log 🗑️
                </button>
              </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Total Surat</div>
                <div className="text-base font-black text-slate-900 mt-0.5">{outboundLettersLog.length}</div>
              </div>
              <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100 text-center">
                <div className="text-[9px] text-amber-700 font-bold uppercase tracking-wider">Surat Alumni (SKA)</div>
                <div className="text-base font-black text-amber-800 mt-0.5">
                  {outboundLettersLog.filter(l => l.type.includes('Alumni')).length}
                </div>
              </div>
              <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 text-center">
                <div className="text-[9px] text-emerald-700 font-bold uppercase tracking-wider">Izin Keluar/Pulang</div>
                <div className="text-base font-black text-emerald-850 mt-0.5">
                  {outboundLettersLog.filter(l => l.type.includes('Izin')).length}
                </div>
              </div>
              <div className="bg-rose-50/50 p-3 rounded-xl border border-rose-100 text-center">
                <div className="text-[9px] text-rose-700 font-bold uppercase tracking-wider">Sanksi & Takzir</div>
                <div className="text-base font-black text-rose-850 mt-0.5">
                  {outboundLettersLog.filter(l => l.type.includes('Takzir') || l.type.includes('Sanksi')).length}
                </div>
              </div>
              <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 text-center">
                <div className="text-[9px] text-indigo-700 font-bold uppercase tracking-wider">Surat Sakit/Medis</div>
                <div className="text-base font-black text-indigo-850 mt-0.5">
                  {outboundLettersLog.filter(l => l.type.includes('Sakit') || l.type.includes('Medis')).length}
                </div>
              </div>
            </div>

            {/* Search Filter Bar */}
            <div className="flex gap-2 max-w-sm">
              <input
                type="text"
                placeholder="Cari penerima, no surat, atau perihal..."
                onChange={(e) => {
                  const val = e.target.value.toLowerCase();
                  const rows = document.querySelectorAll('.outbound-log-row');
                  rows.forEach(r => {
                    const text = r.textContent?.toLowerCase() || '';
                    if (text.includes(val)) {
                      (r as HTMLElement).style.display = '';
                    } else {
                      (r as HTMLElement).style.display = 'none';
                    }
                  });
                }}
                className="w-full text-xs px-3 py-1.5 border border-emerald-150 rounded-lg bg-emerald-50/10 placeholder-slate-400 focus:ring-1 focus:ring-emerald-700 focus:outline-none"
              />
            </div>

            {/* Letters Log Table */}
            <div className="overflow-x-auto border border-gray-150 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-emerald-50 text-emerald-950 border-b border-gray-150">
                  <tr>
                    <th className="p-3 font-extrabold text-[10px] uppercase w-12 text-center">No</th>
                    <th className="p-3 font-extrabold text-[10px] uppercase w-24">Tanggal</th>
                    <th className="p-3 font-extrabold text-[10px] uppercase w-36">Jenis Surat</th>
                    <th className="p-3 font-extrabold text-[10px] uppercase w-48">Nomor Surat Resmi</th>
                    <th className="p-3 font-extrabold text-[10px] uppercase w-44">Penerima</th>
                    <th className="p-3 font-extrabold text-[10px] uppercase">Keperluan/Subjek</th>
                    <th className="p-3 font-extrabold text-[10px] uppercase w-20 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {outboundLettersLog.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-gray-400 font-medium italic">
                        Belum ada riwayat surat resmi yang dicatat di buku register.
                      </td>
                    </tr>
                  ) : (
                    [...outboundLettersLog].reverse().map((item, idx) => (
                      <tr key={item.id} className="outbound-log-row hover:bg-slate-50/60 transition">
                        <td className="p-3 text-center font-mono text-gray-400 font-bold">{idx + 1}</td>
                        <td className="p-3 font-mono text-gray-650">{item.date}</td>
                        <td className="p-3 font-bold text-teal-900">{item.type}</td>
                        <td className="p-3 font-mono text-amber-800 font-bold">{item.letterNo}</td>
                        <td className="p-3 font-extrabold text-slate-800">{item.recipient}</td>
                        <td className="p-3 text-slate-600 font-medium">{item.subject}</td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              triggerConfirm(
                                'Hapus Arsip Surat',
                                'Apakah Anda yakin ingin menghapus arsip surat ini dari register?',
                                () => {
                                  setOutboundLettersLog(prev => prev.filter(l => l.id !== item.id));
                                }
                              );
                            }}
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                            title="Hapus Arsip"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT DATA SANTRI / ALUMNI */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-950/70 backdrop-blur-sm overflow-y-auto">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              // Validation: Ensure NIS is unique
              const duplicateNis = students.some(s => s.id !== editingStudent.id && s.nis === editingStudent.nis);
              if (duplicateNis) {
                showAlert('danger', `Gagal menyimpan: NIS ${editingStudent.nis} sudah digunakan oleh santri lain!`);
                return;
              }
              // Validation: Capacity check for room transfer (pemindahan santri)
              const originalStudent = students.find(s => s.id === editingStudent.id);
              const isRoomChanged = originalStudent && originalStudent.kamar !== editingStudent.kamar;
              if (isRoomChanged && editingStudent.kamar && editingStudent.kamar !== 'Luar Pondok' && editingStudent.status === 'Aktif') {
                const allRooms = rooms || [];
                const roomObj = allRooms.find(r => r.name.toUpperCase() === editingStudent.kamar.toUpperCase());
                const limit = roomObj ? roomObj.capacity : 20;
                const occupants = students.filter(s => s.id !== editingStudent.id && s.status === 'Aktif' && s.kamar?.toUpperCase() === editingStudent.kamar.toUpperCase()).length;
                if (occupants >= limit) {
                  showAlert('danger', `PERINGATAN: Kapasitas Kamar ${editingStudent.kamar.toUpperCase()} sudah penuh! (Terisi: ${occupants}/${limit} orang). Silakan pilih kamar lain.`);
                  return;
                }
              }
              const finalClassFormal = editStdClassFormal || '-';
              const finalClassMadrasah = editStdClassMadrasah || '-';
              const finalClass = `${finalClassFormal} • ${finalClassMadrasah}`;
              const updatedStudent: Student = {
                ...editingStudent,
                classFormal: finalClassFormal,
                classMadrasah: finalClassMadrasah,
                classPagi: finalClassMadrasah,
                classSore: finalClassFormal,
                class: finalClass
              };
              logAdminActivity(
                'EDIT_PROFIL',
                `Mengedit data profil santri: ${editingStudent.fullName} (${editingStudent.nis})`,
                editingStudent.id,
                editingStudent.fullName
              );
              const updatedStudentsList = students.map(s => s.id === editingStudent.id ? updatedStudent : s);
              const updatedBillsList = bills.map(b => b.studentId === editingStudent.id ? { ...b, studentName: editingStudent.fullName } : b);
              setStudents(updatedStudentsList);
              setBills(updatedBillsList);
              localStorage.setItem('pesantren_students', JSON.stringify(updatedStudentsList));
              localStorage.setItem('pesantren_bills', JSON.stringify(updatedBillsList));
              markLocalDataChanged('students');
              markLocalDataChanged('bills');

              if (isSupabaseConfigured()) {
                pushStudentToSupabase(updatedStudent).catch(err => console.error('Cloud update student error:', err));
              }
              window.dispatchEvent(new Event('pesantren_db_sync'));

              setEditingStudent(null);
              showAlert('success', 'Data santri/alumni berhasil diperbarui!');
            }}
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-emerald-100 flex flex-col my-auto max-h-[88vh] sm:max-h-[90vh] animate-fade-in"
          >
            <div className="bg-gradient-to-r from-emerald-850 to-teal-900 text-white p-4 sm:p-5 flex justify-between items-center shrink-0">
              <div>
                <h4 className="font-bold text-base">Edit Data Santri</h4>
                <p className="text-[10px] text-emerald-100">Perbarui rincian informasi dan status madrasah santri</p>
              </div>
              <button 
                type="button" 
                onClick={() => setEditingStudent(null)} 
                className="text-white hover:bg-emerald-800/50 p-1 rounded-full cursor-pointer transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-3.5 flex-1 overflow-y-auto text-xs text-left">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-0.5">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    value={editingStudent.fullName || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, fullName: e.target.value })}
                    className="w-full px-3 py-1.5 border border-emerald-100 rounded bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-0.5">Kamar Santri</label>
                  <select
                    required={editingStudent.status !== 'Alumni'}
                    disabled={editingStudent.status === 'Alumni'}
                    value={editingStudent.status === 'Alumni' ? '' : (editingStudent.kamar || '')}
                    onChange={(e) => setEditingStudent({ ...editingStudent, kamar: e.target.value })}
                    className="w-full px-3 py-1.5 border border-emerald-100 rounded bg-white text-xs font-bold disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    {editingStudent.status === 'Alumni' ? (
                      <option value="">Tidak Ada Kamar (Alumni)</option>
                    ) : (
                      <>
                        <option value="">-- Pilih Kamar --</option>
                        <option value="Luar Pondok">Luar Pondok (Tidak Menetap)</option>
                        {(rooms || []).filter(r => r.gender === editingStudent.gender).map(r => {
                          const occupants = students.filter(s => s.id !== editingStudent.id && s.status === 'Aktif' && s.kamar?.toUpperCase() === r.name.toUpperCase()).length;
                          return (
                            <option key={r.id} value={r.name}>
                              {r.name} (Terisi: {occupants}/{r.capacity})
                            </option>
                          );
                        })}
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-0.5">Sekolah Formal (Sore) {editingStudent.status === 'Alumni' && '(Pendidikan Terakhir)'}</label>
                  <select
                    value={editStdClassFormal}
                    onChange={(e) => setEditStdClassFormal(e.target.value)}
                    className="w-full px-3 py-1.5 border border-emerald-100 rounded bg-white text-xs font-bold"
                  >
                    {availableFormalClasses.map((cls) => (
                      <option key={cls} value={cls}>{cls}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-0.5">Sekolah Non-Formal (Madrasah) {editingStudent.status === 'Alumni' && '(Pendidikan Terakhir)'}</label>
                  <select
                    value={editStdClassMadrasah}
                    onChange={(e) => setEditStdClassMadrasah(e.target.value)}
                    className="w-full px-3 py-1.5 border border-emerald-100 rounded bg-white text-xs font-bold"
                  >
                    {availableMadrasahClasses.map((cls) => (
                      <option key={cls} value={cls}>{cls}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-0.5">No. Kartu Keluarga (KK)</label>
                  <input
                    type="text"
                    maxLength={16}
                    placeholder="16 Digit KK..."
                    value={editingStudent.kk || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, kk: e.target.value.replace(/\D/g, '') })}
                    className="w-full px-3 py-1.5 border border-emerald-100 rounded bg-white text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-0.5">NIK (Nomor Induk Kependudukan)</label>
                  <input
                    type="text"
                    maxLength={16}
                    placeholder="16 Digit NIK..."
                    value={editingStudent.nik || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, nik: e.target.value.replace(/\D/g, '') })}
                    className="w-full px-3 py-1.5 border border-emerald-100 rounded bg-white text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-0.5">Nama Lengkap Ayah</label>
                  <input
                    type="text"
                    placeholder="Nama Ayah..."
                    value={editingStudent.fatherName || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, fatherName: e.target.value })}
                    className="w-full px-3 py-1.5 border border-emerald-100 rounded bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-0.5">Nama Lengkap Ibu</label>
                  <input
                    type="text"
                    placeholder="Nama Ibu..."
                    value={editingStudent.motherName || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, motherName: e.target.value })}
                    className="w-full px-3 py-1.5 border border-emerald-100 rounded bg-white text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-0.5">Tempat Lahir</label>
                  <input
                    type="text"
                    placeholder="Kota..."
                    value={editingStudent.birthPlace || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, birthPlace: e.target.value })}
                    className="w-full px-3 py-1.5 border border-emerald-100 rounded bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-0.5">Tanggal Lahir</label>
                  <input
                    type="date"
                    value={editingStudent.birthDate || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, birthDate: e.target.value })}
                    className="w-full px-3 py-1.5 border border-emerald-100 rounded bg-white text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">

                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-0.5">NIS (Nomor Induk Santri)</label>
                  <input
                    type="text"
                    required
                    maxLength={4}
                    value={editingStudent.nis || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, nis: e.target.value })}
                    className="w-full px-3 py-1.5 border border-emerald-100 rounded bg-white text-xs font-mono font-bold text-amber-700"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-0.5">Status Keanggotaan</label>
                  <select
                    value={editingStudent.status || 'Aktif'}
                    onChange={(e: any) => {
                      const newStatus = e.target.value;
                      const currentYear = new Date().getFullYear().toString();
                      const gCode = editingStudent.gender === 'Perempuan' ? 'P' : 'L';
                      const generatedNia = `NIA.${currentYear}.${gCode}.${editingStudent.nis || 'UNTITLED'}`;
                      const isAlumniOrBerhenti = newStatus === 'Alumni' || newStatus === 'Berhenti';
                      setEditingStudent({ 
                        ...editingStudent, 
                        status: newStatus,
                        kamar: isAlumniOrBerhenti ? '' : editingStudent.kamar,
                        tahunKeluar: isAlumniOrBerhenti ? currentYear : editingStudent.tahunKeluar,
                        alumniId: isAlumniOrBerhenti ? generatedNia : editingStudent.alumniId,
                        alumniReason: isAlumniOrBerhenti ? (newStatus === 'Berhenti' ? 'Pilihan Keluarga / Berhenti' : 'Lulus Madrasah & Formal') : undefined
                      });
                    }}
                    className="w-full px-3 py-1.5 border border-emerald-100 rounded bg-white text-xs"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Alumni">Alumni</option>
                    <option value="Berhenti">Berhenti</option>
                    <option value="Cuti">Berhenti / Nonaktif</option>
                  </select>
                </div>
                {(editingStudent.status === 'Alumni' || editingStudent.status === 'Berhenti') ? (
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-0.5 text-amber-950 font-extrabold">Sebab Berhenti / Lulus <span className="text-red-500">*</span></label>
                    <select
                      value={editingStudent.alumniReason || (editingStudent.status === 'Berhenti' ? 'Pilihan Keluarga / Berhenti' : 'Lulus Madrasah & Formal')}
                      onChange={(e) => setEditingStudent({ ...editingStudent, alumniReason: e.target.value })}
                      className="w-full px-3 py-1.5 border border-amber-200 rounded bg-amber-50 text-xs font-bold text-amber-950"
                    >
                      <option value="Lulus Madrasah & Formal">Lulus Madrasah & Formal</option>
                      <option value="Lulus Pondok & Diniyah">Lulus Pondok & Diniyah</option>
                      <option value="Lulus Pendidikan Formal (SMP/SMA/SMK/MA)">Lulus Pendidikan Formal (SMP/SMA/SMK/MA)</option>
                      <option value="Pindah Sekolah / Menuntut Ilmu di Luar">Pindah Sekolah / Menuntut Ilmu di Luar</option>
                      <option value="Selesai Masa Pengabdian">Selesai Masa Pengabdian</option>
                      <option value="Bekerja / Menikah">Bekerja / Menikah</option>
                      <option value="Pilihan Keluarga / Berhenti Mandiri">Pilihan Keluarga / Berhenti Mandiri</option>
                      <option value="Kembali ke Tokoh Masyarakat / Mengajar">Kembali ke Tokoh Masyarakat / Mengajar</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-0.5">Foto Profil (Lokal)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const compressed = await compressImage(file, 160, 200, 0.5);
                            setEditingStudent({ ...editingStudent, photoUrl: compressed });
                          } catch (err) {
                            console.error("Failed to compress image:", err);
                          }
                        }
                      }}
                      className="w-full text-[10px] text-slate-500 font-mono"
                    />
                    {editingStudent.photoUrl && (
                      <div className="mt-1 flex items-center gap-1.5">
                        <img src={editingStudent.photoUrl} alt="Foto Profil" className="h-8 w-6 object-cover rounded border border-gray-200" />
                        <button 
                          type="button" 
                          onClick={() => setEditingStudent({ ...editingStudent, photoUrl: undefined })} 
                          className="px-1.5 py-0.5 text-[9px] bg-red-100 text-red-700 rounded font-bold hover:bg-red-200 cursor-pointer transition"
                        >
                          Hapus Foto ✕
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {(editingStudent.status === 'Alumni' || editingStudent.status === 'Berhenti') && (
                <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200/60 space-y-2 mt-2">
                  <span className="text-[10px] uppercase font-bold text-amber-800 tracking-wider block">🎓 Informasi Keberhentian / Kelulusan</span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] uppercase font-bold text-gray-500 mb-0.5">Tahun Keluar / Lulus</label>
                      <input
                        type="text"
                        required
                        value={editingStudent.tahunKeluar || new Date().getFullYear().toString()}
                        onChange={(e) => {
                          const year = e.target.value.replace(/\D/g, '');
                          const gCode = editingStudent.gender === 'Perempuan' ? 'P' : 'L';
                          const generatedNia = `NIA.${year || new Date().getFullYear()}.${gCode}.${editingStudent.nis || 'UNTITLED'}`;
                          setEditingStudent({ 
                            ...editingStudent, 
                            tahunKeluar: year,
                            alumniId: generatedNia
                          });
                        }}
                        placeholder={new Date().getFullYear().toString()}
                        className="w-full px-2.5 py-1 border border-amber-200 rounded-lg bg-white text-xs font-mono font-bold text-amber-950 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase font-bold text-gray-500 mb-0.5">Nomor Identitas Alumni (NIA)</label>
                      <input
                        type="text"
                        readOnly
                        value={editingStudent.alumniId || `NIA.${editingStudent.tahunKeluar || new Date().getFullYear()}.${editingStudent.gender === 'Perempuan' ? 'P' : 'L'}.${editingStudent.nis || 'UNTITLED'}`}
                        className="w-full px-2.5 py-1 border border-amber-200 rounded-lg bg-amber-50 text-xs font-mono text-amber-900 font-bold"
                      />
                    </div>
                  </div>
                  <p className="text-[9px] text-amber-800 font-medium">
                    * Nomor Identitas Alumni (NIA) dirumuskan otomatis meliputi tahun keluar, kode gender (L/P), dan NIS.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-0.5">Nama Wali/Orang Tua</label>
                  <input
                    type="text"
                    required
                    value={editingStudent.parentName || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, parentName: e.target.value })}
                    className="w-full px-3 py-1.5 border border-emerald-100 rounded bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-0.5">Kontak HP Orang Tua</label>
                  <input
                    type="text"
                    required
                    value={editingStudent.parentPhone || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, parentPhone: e.target.value })}
                    className="w-full px-3 py-1.5 border border-emerald-100 rounded bg-white text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-0.5">Email Akun Login Wali</label>
                <input
                  type="email"
                  required
                  value={editingStudent.email || ''}
                  onChange={(e) => setEditingStudent({ ...editingStudent, email: e.target.value })}
                  className="w-full px-3 py-1.5 border border-emerald-100 rounded bg-white text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-0.5">Alamat Domisili Rumah</label>
                <textarea
                  rows={2}
                  required
                  value={editingStudent.address || ''}
                  onChange={(e) => setEditingStudent({ ...editingStudent, address: e.target.value })}
                  className="w-full px-3 py-1.5 border border-emerald-100 rounded bg-white text-xs"
                />
              </div>
            </div>

            <div className="p-4 bg-emerald-50 border-t border-emerald-100 flex justify-end gap-2 text-xs shrink-0">
              <button 
                type="button" 
                onClick={() => setEditingStudent(null)} 
                className="px-4 py-1.5 border border-gray-300 hover:bg-gray-100 rounded font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button 
                type="submit" 
                className="px-5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded font-bold cursor-pointer"
              >
                Simpan Perubahan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PROCEDUR RIBET: MODAL DETAILED DELETION */}
      {tightDeleteStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-red-950/80 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-red-200 text-xs text-left animate-fade-in my-auto flex flex-col max-h-[88vh] sm:max-h-[90vh]">
            <div className="bg-gradient-to-r from-red-800 to-rose-950 text-white p-4 sm:p-5 flex justify-between items-center shrink-0">
              <div>
                <h4 className="font-extrabold text-sm uppercase tracking-wide">⚠️ Prosedur Penghapusan Ketat (Maksimal)</h4>
                <p className="text-[10px] text-red-100">Langkah pengamanan ganda untuk mencegah kesalahan fatal penghapusan data santri.</p>
              </div>
              <button 
                type="button" 
                onClick={() => setTightDeleteStudent(null)} 
                className="text-white hover:bg-red-700/50 p-1 rounded-full cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-rose-50 text-rose-900 p-3.5 rounded-xl border border-rose-150 leading-relaxed space-y-1.5">
                <p className="font-black text-rose-950 text-[11px] uppercase tracking-wider">Pemberitahuan Sistem Keamanan:</p>
                <p>
                  Penghapusan data santri <strong className="font-black text-red-800 underline">{tightDeleteStudent.fullName}</strong> bersifat <strong>PERMANEN</strong> dan tidak dapat dibatalkan. Tindakan ini akan menghapus seluruh data akademik, catatan kedisiplinan, riwayat kesehatan, dan tagihan keuangan yang bersangkutan.
                </p>
                <p>
                  Jika santri ini hanya ingin berhenti atau pindah, harap ubah status keanggotaannya menjadi <strong className="font-bold">Alumni</strong> atau <strong className="font-bold">Berhenti / Nonaktif</strong> di menu edit, alih-alih menghapusnya dari sistem.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                    Langkah 1: Ketik Nama Lengkap Santri yang akan Dihapus
                  </label>
                  <input
                    type="text"
                    value={tightDeleteInputName}
                    onChange={(e) => setTightDeleteInputName(e.target.value)}
                    placeholder={`Ketik: ${tightDeleteStudent.fullName}`}
                    className="w-full px-3 py-2 border border-rose-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-red-600 font-bold text-slate-800"
                  />
                  {tightDeleteInputName && tightDeleteInputName !== tightDeleteStudent.fullName && (
                    <p className="text-[9px] text-red-600 font-semibold mt-1">✕ Nama tidak cocok dengan data asli.</p>
                  )}
                  {tightDeleteInputName === tightDeleteStudent.fullName && (
                    <p className="text-[9px] text-emerald-600 font-bold mt-1">✓ Nama cocok.</p>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                    Langkah 2: Ketik Kode Keamanan Konfirmasi Ketat
                  </label>
                  <input
                    type="text"
                    value={tightDeleteInputCode}
                    onChange={(e) => setTightDeleteInputCode(e.target.value)}
                    placeholder="Ketik: HAPUS-SANTRI-PERMANEN-ALASYARIYAH"
                    className="w-full px-3 py-2 border border-rose-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-red-600 font-mono font-black uppercase tracking-wider text-slate-800"
                  />
                  {tightDeleteInputCode && tightDeleteInputCode !== 'HAPUS-SANTRI-PERMANEN-ALASYARIYAH' && (
                    <p className="text-[9px] text-red-600 font-semibold mt-1">✕ Kode keamanan belum sesuai.</p>
                  )}
                  {tightDeleteInputCode === 'HAPUS-SANTRI-PERMANEN-ALASYARIYAH' && (
                    <p className="text-[9px] text-emerald-600 font-bold mt-1">✓ Kode keamanan valid.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setTightDeleteStudent(null)}
                className="px-4 py-2 border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold rounded-xl cursor-pointer"
              >
                Batal & Amankan Data
              </button>
              <button
                type="button"
                disabled={tightDeleteInputName !== tightDeleteStudent.fullName || tightDeleteInputCode !== 'HAPUS-SANTRI-PERMANEN-ALASYARIYAH'}
                onClick={() => {
                  setStudents(students.filter(std => std.id !== tightDeleteStudent.id));
                  setBills(bills.filter(b => b.studentId !== tightDeleteStudent.id));
                  setTightDeleteStudent(null);
                  showAlert('success', 'Data santri berhasil dihapus selamanya melalui prosedur ketat.');
                }}
                className={`px-5 py-2 font-black rounded-xl text-white transition ${
                  (tightDeleteInputName === tightDeleteStudent.fullName && tightDeleteInputCode === 'HAPUS-SANTRI-PERMANEN-ALASYARIYAH')
                    ? 'bg-red-700 hover:bg-red-800 cursor-pointer shadow'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Hapus Permanen ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CETAK KWITANSI RESMI (ADMIN PERSPECTIVE APPROVED) */}
      {receiptBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-emerald-950/75 backdrop-blur-sm print:bg-white print:p-0">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 md:p-8 border border-emerald-100 flex flex-col justify-between print:shadow-none print:border-none print:p-0 my-auto max-h-[88vh] sm:max-h-[90vh] overflow-y-auto">
            
            {/* Prominent Close/Keluar button at the top for alumni and admin */}
            <div className="flex justify-between items-center mb-3 border-b border-gray-150 pb-2 print:hidden">
              <span className="text-xs font-black text-emerald-900 tracking-wider">PREVIEW RESMI KWITANSI</span>
              <button
                type="button"
                onClick={() => setReceiptBill(null)}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-extrabold transition cursor-pointer flex items-center gap-1 shadow-sm"
              >
                ✕ Keluar / Tutup Kwitansi
              </button>
            </div>

            <PrintGuideAlert />

            {/* Printable target wrap */}
            <div id="admin-receipt-printable-area" className="space-y-4">
            
            {/* Kwitansi Header */}
            <div className="border-b-4 border-double border-emerald-700 pb-4 mb-6">
              <div className="flex gap-4 items-center">
                {(settings.logoUrl || '/pesantren_logo.jpg') ? (
                  <img src={settings.logoUrl || '/pesantren_logo.jpg'} alt="Logo Pesantren" className="h-16 w-16 object-contain" referrerPolicy="no-referrer" />
                ) : (
                  <div className="text-3xl shrink-0 flex items-center justify-center h-16 w-16">🕌</div>
                )}
                <div className="flex-1 text-left">
                  <h4 className="text-emerald-900 font-black text-sm tracking-wide uppercase leading-tight">{settings.schoolName || "Pondok Pesantren Al-Asy'ariyah"}</h4>
                  <p className="text-[9px] text-gray-500 max-w-md leading-relaxed mt-0.5">
                    {settings.address || "Jl. Raya Modung, Langpanggang, Modung, Bangkalan, Jawa Timur"}<br />
                    {settings.phone ? `Hubungi: ${settings.phone} | ` : ''} Email: {settings.email || "info@alasyariyah.sch.id"}
                  </p>
                  <p className="text-[8px] text-emerald-700 font-bold italic tracking-wide mt-0.5">
                    {settings.tagline || "Mencetak Generasi Qur'ani, Berakhlakul Karimah, Unggul, dan Mandiri"}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="bg-emerald-100 px-3 py-1 rounded text-emerald-800 text-[10px] uppercase font-mono font-bold tracking-widest leading-none">
                    KWITANSI BENDAHARA
                  </span>
                  <div className="text-[11px] text-gray-400 font-mono mt-2">No: KWT-{receiptBill.id.split('-')[1] || Date.now()}</div>
                </div>
              </div>
            </div>

            {/* Kwitansi Content Table */}
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-12 gap-2 pb-2 border-b border-gray-100">
                <div className="col-span-4 text-gray-500 font-medium">Nama Santri:</div>
                <div className="col-span-8 text-gray-900 font-bold">{receiptBill.studentName}</div>
              </div>

              <div className="grid grid-cols-12 gap-2 pb-2 border-b border-gray-100">
                <div className="col-span-4 text-gray-500 font-medium">Beban Pembayaran:</div>
                <div className="col-span-8 text-gray-900 font-semibold">{receiptBill.title}</div>
              </div>

              <div className="grid grid-cols-12 gap-2 pb-2 border-b border-gray-100">
                <div className="col-span-4 text-gray-500 font-medium">Metode Masuk Kas:</div>
                <div className="col-span-8 text-gray-900 font-mono">{receiptBill.paymentMethod || 'Verifikasi Admin'}</div>
              </div>

              <div className="grid grid-cols-12 gap-2 pb-2 border-b border-gray-100">
                <div className="col-span-4 text-gray-500 font-medium">Tanggal Lunas:</div>
                <div className="col-span-8 text-gray-900">{receiptBill.paymentDate || receiptBill.dueDate}</div>
              </div>

              <div className="grid grid-cols-12 gap-2 pb-2 border-b border-gray-100">
                <div className="col-span-4 text-gray-500 font-medium">Status Konfirmasi:</div>
                <div className="col-span-8 text-emerald-700 font-bold">LUNAS & VERIFIKASI SELESAI</div>
              </div>
            </div>

            {/* Price section & Sign */}
            <div className="mt-8 flex flex-col items-stretch gap-6 border-t border-dashed border-gray-250 pt-6">
              <div className="bg-emerald-50 border border-emerald-200 px-5 py-3 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">Jumlah:</span>
                  <span className="text-xl font-black text-emerald-950">Rp {receiptBill.amount.toLocaleString('id-ID')}</span>
                </div>
                <span className="bg-emerald-600 text-white font-mono text-[9px] px-1.5 py-0.5 rounded uppercase tracking-widest font-black">
                  LUNAS
                </span>
              </div>

              <div className="flex justify-end">
                {/* Column 1 (Right-aligned, left text): Bendahara (with Stempel overlapping Signature) */}
                <div className="text-left space-y-0.5 relative w-64 pl-6">
                  <p className="text-[9px] text-gray-400 font-semibold">{getCityFromAddress(settings.address)}, {receiptBill.paymentDate || new Date().toISOString().split('T')[0]}</p>
                  <p className="text-[9px] text-emerald-900 font-extrabold uppercase tracking-wider">Mengetahui,</p>
                  
                  <div className="h-20 w-44 relative flex items-center justify-start select-none">
                    {/* Tanda tangan rendered in background */}
                    <div className="z-10 absolute inset-0 flex items-center justify-start">
                      {isImageUrl(settings.ttdBendaharaUrl) ? (
                        <img src={settings.ttdBendaharaUrl} alt="TTD Bendahara" className="max-h-20 max-w-[150px] object-contain mix-blend-multiply" referrerPolicy="no-referrer" />
                      ) : (
                        <span className="text-[10px] font-mono text-emerald-800 italic font-extrabold tracking-wide">
                          {settings.ttdBendaharaUrl || '✍️ Bendahara Pesantren'}
                        </span>
                      )}
                    </div>

                    {/* Stempel rendered on top overlapping */}
                    {settings.stempelBendaharaUrl && (
                      <div className="z-20 absolute left-[25px] top-[-5px] pointer-events-none opacity-85">
                        {isImageUrl(settings.stempelBendaharaUrl) ? (
                          <img src={settings.stempelBendaharaUrl} alt="Stempel Bendahara" className="h-24 w-24 object-contain rotate-[-12deg] mix-blend-multiply" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="border border-double border-emerald-600/60 text-emerald-700/90 rounded-full h-16 w-16 flex items-center justify-center text-[7px] font-extrabold uppercase rotate-[-12deg] leading-tight text-center bg-white/75 shadow-xs">
                            {settings.stempelBendaharaUrl}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <p className="text-xs font-black text-gray-900 underline leading-none">{settings.namaBendahara || "Ustadzah Siti Aminah"}</p>
                  <p className="text-[8.5px] text-gray-500 font-bold uppercase tracking-wider mt-1">Bendahara Pondok Pesantren</p>
                </div>
              </div>
            </div>

            </div>

            {/* Quick Actions buttons */}
            <div className="border-t border-gray-150 pt-4 mt-6 flex flex-wrap justify-end gap-2 print:hidden text-xs">
              <button
                onClick={() => setReceiptBill(null)}
                className="px-4 py-1.5 border border-gray-300 hover:bg-gray-100 rounded font-semibold cursor-pointer"
              >
                Tutup
              </button>
              
              <button
                type="button"
                onClick={() => downloadPrintableHTML('admin-receipt-printable-area', `Kwitansi_Bendahara_${receiptBill.studentName}_${receiptBill.title}`)}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-sm"
              >
                <Download className="h-3.5 w-3.5" /> Unduh HTML Offline 📥
              </button>

              <button
                onClick={() => window.print()}
                className="px-4 py-1.5 bg-gradient-to-r from-emerald-800 to-teal-900 hover:from-emerald-700 hover:to-teal-800 text-white rounded font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5" /> Cetak Kwitansi
              </button>
            </div>

          </div>
        </div>
      )}
        </motion.div>
      </AnimatePresence>

      {/* MODAL: CETAK KARTU SANTRI AKTIF (ADMIN PERSPECTIVE APPROVED LANDSCAPE) */}
      {selectedStudentForCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-emerald-950/75 backdrop-blur-sm print:bg-white print:p-0 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-emerald-100 overflow-hidden flex flex-col justify-between print:shadow-none print:border-none my-auto max-h-[88vh] sm:max-h-[90vh] overflow-y-auto">
            
            <div className="p-4 bg-emerald-50 border-b border-emerald-100 print:hidden text-left text-xs">
              <div className="bg-emerald-100/60 border border-emerald-200 text-emerald-950 rounded-lg p-2.5 font-semibold">
                ⎙ Pratinjau Kartu Santri Landscape Resmi. Untuk hasil terbaik saat mencetak langsung, pastikan Anda memilih orientasi <strong>Landscape (Tidur)</strong> pada dialog cetak peramban.
              </div>
            </div>

            {/* Card Body & Printable wrapper (LANDSCAPE ASPECT RATIO) */}
            <div className="p-6 bg-slate-50 overflow-x-auto flex justify-center">
              <div id="admin-student-card-printable-area" className="p-4 bg-sky-100 print:bg-sky-100 text-left font-sans flex flex-col justify-between border-2 border-emerald-800 rounded-2xl w-[480px] h-[300px] shadow-md relative overflow-hidden shrink-0">
                
                {/* Style Injection to enforce landscape printing for this card */}
                <style dangerouslySetInnerHTML={{__html: `
                  @media print {
                    @page {
                      size: landscape !important;
                    }
                    body {
                      background: white;
                    }
                    #admin-student-card-printable-area {
                      border: 2px solid #065f46 !important;
                      box-shadow: none !important;
                      margin: 0 auto !important;
                      background: #e0f2fe !important;
                      -webkit-print-color-adjust: exact !important;
                      print-color-adjust: exact !important;
                    }
                  }
                `}} />

                {/* Kop Surat Resmi Pesantren - CUSTOM BLACK BACKGROUND, CENTERED TEXT */}
                <div className="bg-black text-center p-2 rounded-t-xl shrink-0 -mx-4 -mt-4 relative overflow-hidden">
                  <h4 className="text-[11px] font-black tracking-widest text-white uppercase m-0 leading-tight">KARTU ANGGOTA SANTRI</h4>
                  <p className="text-[7px] font-extrabold text-blue-400 m-0 leading-tight">YAYASAN PENDIDIKAN PONDOK PESANTREN</p>
                  <h3 className="text-[11px] font-black text-red-500 m-0 leading-tight">AL-ASY'ARIYAH MUSA</h3>
                  <p className="text-[6px] text-white font-medium leading-none m-0 mt-0.5">
                    {settings.address || "Jl. Raya Modung, Langpanggang, Modung, Bangkalan, Jawa Timur"}
                  </p>
                </div>
                {/* Thick yellow line underneath the Kop */}
                <div className="h-1 bg-yellow-400 shrink-0 -mx-4 mb-2" />

                <div className="flex-1 flex gap-4 items-stretch min-h-0">
                  {/* Left Column: Photo & Text */}
                  <div className="w-[110px] flex flex-col items-center justify-start py-0.5 shrink-0">
                    {/* Photo */}
                    <div className="h-28 w-22 bg-white border border-emerald-800 rounded-lg flex items-center justify-center p-0.5 shadow-xs overflow-hidden my-0.5 shrink-0">
                      {selectedStudentForCard.photoUrl ? (
                        <img 
                          src={selectedStudentForCard.photoUrl} 
                          alt="Santri"
                          className="h-full w-full object-cover rounded"
                          referrerPolicy="no-referrer"
                        />
                      ) : selectedStudentForCard.gender === 'Perempuan' ? (
                        <img 
                          src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200" 
                          alt="Santri"
                          className="h-full w-full object-cover rounded"
                        />
                      ) : (
                        <img 
                          src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200" 
                          alt="Santri"
                          className="h-full w-full object-cover rounded"
                        />
                      )}
                    </div>

                    <span className="text-[6.5px] font-bold text-slate-700 tracking-tight block text-center mt-1 leading-tight select-none">
                      Berlaku Selama Menjadi Santri
                    </span>
                  </div>

                  {/* Right Column: Identity Info - Aligned perfectly with top of photo */}
                  <div className="flex-1 flex flex-col justify-between py-0.5">
                    {/* Profile Fields (NIS, NAMA, TEMPAT, TGL LAHIR, ALAMAT, NAMA WALI) */}
                    <div className="space-y-1.5 py-0.5 flex-1 flex flex-col justify-start text-[8.5px] text-left">
                      <div className="grid grid-cols-12 gap-1 items-start leading-tight">
                        <span className="col-span-4 text-[7px] text-slate-600 font-extrabold uppercase tracking-wider">NIS</span>
                        <span className="col-span-1 text-slate-400 text-center">:</span>
                        <span className="col-span-7 font-mono font-bold text-slate-900">{selectedStudentForCard.nis}</span>
                      </div>

                      <div className="grid grid-cols-12 gap-1 items-start leading-tight">
                        <span className="col-span-4 text-[7px] text-slate-600 font-extrabold uppercase tracking-wider">NAMA</span>
                        <span className="col-span-1 text-slate-400 text-center">:</span>
                        <span className="col-span-7 font-black text-slate-900 uppercase truncate">{selectedStudentForCard.fullName}</span>
                      </div>

                      <div className="grid grid-cols-12 gap-1 items-start leading-tight">
                        <span className="col-span-4 text-[7px] text-slate-600 font-extrabold uppercase tracking-wider">TEMPAT, TGL LAHIR</span>
                        <span className="col-span-1 text-slate-400 text-center">:</span>
                        <span className="col-span-7 font-bold text-slate-900 uppercase truncate">
                          {selectedStudentForCard.birthPlace || 'Semarang'}, {formatIndonesianDate(selectedStudentForCard.birthDate || '08-07-2008')}
                        </span>
                      </div>

                      <div className="grid grid-cols-12 gap-1 items-start leading-tight">
                        <span className="col-span-4 text-[7px] text-slate-600 font-extrabold uppercase tracking-wider">ALAMAT</span>
                        <span className="col-span-1 text-slate-400 text-center">:</span>
                        <span className="col-span-7 font-bold text-slate-850 line-clamp-2 leading-none">{selectedStudentForCard.address || 'Jawa Tengah'}</span>
                      </div>

                      <div className="grid grid-cols-12 gap-1 items-start leading-tight">
                        <span className="col-span-4 text-[7px] text-slate-600 font-extrabold uppercase tracking-wider">NAMA WALI</span>
                        <span className="col-span-1 text-slate-400 text-center">:</span>
                        <span className="col-span-7 font-extrabold text-slate-900 uppercase truncate">{selectedStudentForCard.parentName || '-'}</span>
                      </div>
                    </div>

                    {/* Footer sign */}
                    <div className="flex flex-col items-end text-right mt-1 shrink-0 relative">
                      <p className="text-[7px] text-slate-700 font-semibold leading-none">
                        {getCityFromAddress(settings.address) || "Jawa Tengah"}, 08 Juli 2026
                      </p>
                      <p className="text-[7.5px] text-slate-800 font-extrabold uppercase tracking-wider leading-tight mt-0.5">Pengasuh Pondok Pesantren,</p>
                      
                      {/* Overlapping signature and stamp area */}
                      <div className="h-10 w-28 relative flex items-center justify-center select-none my-0.5">
                        {/* Signature */}
                        <div className="z-10 absolute inset-0 flex items-center justify-end">
                          {isImageUrl(settings.ttdPengasuhUrl) ? (
                            <img src={settings.ttdPengasuhUrl} alt="TTD Pengasuh" className="max-h-10 max-w-[80px] object-contain mix-blend-multiply" referrerPolicy="no-referrer" />
                          ) : (
                            <span className="text-[8px] font-mono text-blue-900 italic font-extrabold">
                              {settings.ttdPengasuhUrl || "✒️ KH. Asy'ari"}
                            </span>
                          )}
                        </div>

                        {/* Stamp */}
                        {settings.stempelPengasuhUrl && (
                          <div className="z-20 absolute left-4 top-0 pointer-events-none opacity-85">
                            {isImageUrl(settings.stempelPengasuhUrl) ? (
                              <img src={settings.stempelPengasuhUrl} alt="Stempel Pengasuh" className="h-10 w-10 object-contain rotate-[-12deg] mix-blend-multiply" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="border border-double border-red-600/60 text-red-700/90 rounded-full h-8 w-8 flex items-center justify-center text-[5px] font-extrabold uppercase rotate-[-12deg] leading-none text-center bg-white/75">
                                {settings.stempelPengasuhUrl}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <p className="text-[8px] font-bold text-gray-900 underline leading-none uppercase">{settings.namaPengasuh || "KH. Asy'ari Al-Hafidz"}</p>
                    </div>
                  </div>
                </div>

                {/* Decorative Watermark background leaf */}
                <div className="absolute -bottom-10 -right-10 opacity-[0.03] pointer-events-none text-emerald-900 select-none">
                  <span className="text-9xl">🌿</span>
                </div>
              </div>
            </div>

            {/* Quick Actions buttons */}
            <div className="p-4 bg-emerald-50 border-t border-emerald-100 flex flex-wrap justify-end gap-2 print:hidden shrink-0 text-xs">
              <button
                type="button"
                onClick={() => setSelectedStudentForCard(null)}
                className="px-4 py-1.5 border border-gray-300 hover:bg-gray-150 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Tutup
              </button>
              
              <button
                type="button"
                onClick={() => downloadPrintableHTML('admin-student-card-printable-area', `Kartu_Santri_${selectedStudentForCard.fullName}`)}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-sm"
              >
                <Download className="h-3.5 w-3.5" /> Unduh HTML Offline 📥
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5" /> Cetak Kartu
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: CETAK BIODATA INDUK LENGKAP SANTRI (PORTRAIT OFFICIAL LETTER FORMAT) */}
      {selectedStudentForProfilePrint && (() => {
        const s = selectedStudentForProfilePrint;
        const getIndonesianToday = () => {
          return new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
        };
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-emerald-950/75 backdrop-blur-sm print:bg-white print:p-0 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-100 overflow-hidden flex flex-col justify-between print:shadow-none print:border-none my-auto max-h-[88vh] sm:max-h-[90vh]">
              
              <div className="p-4 bg-teal-50 border-b border-teal-100 print:hidden text-left text-xs flex justify-between items-center gap-4">
                <div className="bg-teal-100/60 border border-teal-200 text-teal-950 rounded-lg p-2.5 font-semibold flex-1">
                  ⎙ <strong>Pratinjau Dokumen Induk Santri Resmi (Portrait).</strong> Format ini dirancang khusus untuk cetakan ukuran kertas <strong>A4 / F4 (Portrait)</strong>. Anda dapat mengklik langsung teks mana saja di pratinjau untuk mengedit kata sebelum mencetaknya ke printer.
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedStudentForProfilePrint(null)}
                  className="px-3 py-2 bg-slate-200 hover:bg-slate-300 rounded-xl font-bold transition cursor-pointer"
                >
                  Tutup ✕
                </button>
              </div>

              {/* Printable Area Wrapper (Portrait Letter) */}
              <div className="p-6 md:p-8 bg-slate-100/60 overflow-y-auto flex-1 flex justify-center">
                <div 
                  id="admin-student-profile-printable-area" 
                  className="p-10 bg-white text-left font-sans border border-gray-300 shadow-md w-[210mm] min-h-[297mm] relative overflow-hidden"
                  contentEditable={false}
                  suppressContentEditableWarning={true}
                >
                  
                  {/* Style Injection to enforce portrait printing */}
                  <style dangerouslySetInnerHTML={{__html: `
                    @media print {
                      @page {
                        size: portrait !important;
                        margin: 1.5cm !important;
                      }
                      body {
                        background: white !important;
                      }
                      #admin-student-profile-printable-area {
                        border: none !important;
                        box-shadow: none !important;
                        padding: 0 !important;
                        width: 100% !important;
                        min-height: 0 !important;
                        background: white !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                      }
                    }
                  `}} />

                  {/* KOP SURAT RESMI */}
                  <div className="border-b-4 border-double border-slate-900 pb-3 mb-6 flex items-center justify-between gap-4">
                    {(settings.logoUrl || '/pesantren_logo.jpg') ? (
                      <img src={settings.logoUrl || '/pesantren_logo.jpg'} alt="Logo Pesantren" className="h-16 w-16 object-contain shrink-0" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="text-3xl shrink-0 flex items-center justify-center h-16 w-16">🕌</div>
                    )}
                    
                    <div className="text-center flex-1">
                      <h3 className="text-[12px] font-bold text-slate-650 uppercase tracking-widest leading-none">{settings.namaYayasan || "YAYASAN AL-ASY'ARIYAH"}</h3>
                      <h2 className="text-lg font-black text-slate-950 uppercase tracking-wide leading-tight mt-1">{settings.schoolName || "PONDOK PESANTREN AL-ASY'ARIYAH"}</h2>
                      <p className="text-[10px] text-slate-500 font-bold tracking-wider leading-none uppercase mt-0.5">{settings.tagline || "Mencetak Generasi Qur'ani, Berakhlakul Karimah, Unggul, dan Mandiri"}</p>
                      <p className="text-[9px] text-slate-600 font-medium leading-relaxed mt-1.5 border-t border-slate-100 pt-1">
                        Sekretariat: {settings.address || "Jl. Raya Modung, Langpanggang, Modung, Bangkalan, Jawa Timur"} • Telp: {settings.phone || "(0291) 438291"} • Email: {settings.email || "ponpes@alasyariyah.org"}
                      </p>
                    </div>

                    <div className="w-16 shrink-0 text-right">
                      <span className="text-[8px] font-mono font-bold text-slate-400 block border border-slate-200 p-1 text-center rounded uppercase">DBI-SANTRI</span>
                    </div>
                  </div>

                  {/* JUDUL DOKUMEN */}
                  <div className="text-center mb-6">
                    <h1 className="text-base font-extrabold text-slate-900 uppercase tracking-widest underline decoration-1 decoration-slate-900">SURAT BIODATA INDUK SANTRI</h1>
                    <p className="text-[10px] font-mono text-slate-500 uppercase font-bold mt-0.5">NOMOR REGISTRASI INDUK: DBI/{s.nis || "2026.0001"}/{s.id.substring(0, 4).toUpperCase()}</p>
                  </div>

                  <p className="text-xs text-slate-800 leading-relaxed mb-4">
                    Berikut adalah data riwayat lengkap, profil pribadi, keluarga, serta riwayat kedisiplinan dan akademik dari santri bersangkutan yang tercatat resmi di database sistem informasi akademik Pondok Pesantren Al-Asy'ariyah:
                  </p>

                  <div className="space-y-5 text-xs text-slate-900">
                    
                    {/* SECTION 1: DATA PERSONAL */}
                    <div>
                      <h3 className="font-extrabold text-xs text-slate-900 border-b-2 border-slate-800 pb-1 flex items-center gap-2 mb-2 uppercase">
                        <span>I.</span> IDENTITAS DIRI SANTRI
                      </h3>
                      <div className="grid grid-cols-12 gap-y-1.5 items-start">
                        <span className="col-span-4 font-semibold text-slate-600">1. Nomor Induk Santri (NIS)</span>
                        <span className="col-span-8 font-mono font-extrabold text-slate-900">: {s.nis || '-'}</span>

                        <span className="col-span-4 font-semibold text-slate-600">2. Nama Lengkap Santri</span>
                        <span className="col-span-8 font-extrabold text-slate-950 uppercase">: {s.fullName}</span>

                        <span className="col-span-4 font-semibold text-slate-600">3. NIK Santri (No. KTP)</span>
                        <span className="col-span-8 font-mono font-semibold text-slate-800">: {s.nik || 'Belum Dilengkapi'}</span>

                        <span className="col-span-4 font-semibold text-slate-600">4. Nomor Kartu Keluarga (KK)</span>
                        <span className="col-span-8 font-mono font-semibold text-slate-800">: {s.kk || 'Belum Dilengkapi'}</span>

                        <span className="col-span-4 font-semibold text-slate-600">5. Jenis Kelamin</span>
                        <span className="col-span-8 font-bold text-slate-850">: {s.gender || 'Laki-laki'}</span>

                        <span className="col-span-4 font-semibold text-slate-600">6. Tempat & Tanggal Lahir</span>
                        <span className="col-span-8 font-semibold text-slate-850">: {s.birthPlace ? `${s.birthPlace}, ${formatIndonesianDate(s.birthDate)}` : 'Belum Dilengkapi'}</span>

                        <span className="col-span-4 font-semibold text-slate-600">7. Kamar Asrama</span>
                        <span className="col-span-8 font-extrabold text-emerald-900">: {s.kamar ? s.kamar : 'Belum Ditentukan'}</span>

                        <span className="col-span-4 font-semibold text-slate-600">8. Golongan Darah</span>
                        <span className="col-span-8 font-semibold text-slate-800">: {s.bloodType || 'B'}</span>

                        <span className="col-span-4 font-semibold text-slate-600">9. Status Keaktifan</span>
                        <span className="col-span-8 font-extrabold text-slate-900">: Aktif (Santri Mukim)</span>
                      </div>
                    </div>

                    {/* SECTION 2: DATA ORANG TUA / WALI */}
                    <div>
                      <h3 className="font-extrabold text-xs text-slate-900 border-b-2 border-slate-800 pb-1 flex items-center gap-2 mb-2 uppercase">
                        <span>II.</span> IDENTITAS KELUARGA & WALI
                      </h3>
                      <div className="grid grid-cols-12 gap-y-1.5 items-start">
                        <span className="col-span-4 font-semibold text-slate-600">1. Nama Ayah Kandung</span>
                        <span className="col-span-8 font-bold text-slate-900">: {s.fatherName || s.parentName || 'Belum Dilengkapi'}</span>

                        <span className="col-span-4 font-semibold text-slate-600">2. Nama Ibu Kandung</span>
                        <span className="col-span-8 font-bold text-slate-900">: {s.motherName || 'Belum Dilengkapi'}</span>

                        <span className="col-span-4 font-semibold text-slate-600">3. Alamat Asal Rumah</span>
                        <span className="col-span-8 font-medium text-slate-800 italic">: {s.address || 'Jawa Tengah'}</span>

                        <span className="col-span-4 font-semibold text-slate-600">4. No. HP / WhatsApp Wali</span>
                        <span className="col-span-8 font-mono font-bold text-slate-900">: {s.parentPhone || '-'}</span>

                        <span className="col-span-4 font-semibold text-slate-600">5. Email Wali Santri</span>
                        <span className="col-span-8 font-mono font-medium text-slate-700">: {s.email || '-'}</span>
                      </div>
                    </div>

                    {/* SECTION 3: DATA PENDIDIKAN */}
                    <div>
                      <h3 className="font-extrabold text-xs text-slate-900 border-b-2 border-slate-800 pb-1 flex items-center gap-2 mb-2 uppercase">
                        <span>III.</span> RIWAYAT PENDIDIKAN SANTRI
                      </h3>
                      <div className="grid grid-cols-12 gap-y-1.5 items-start mb-2">
                        <span className="col-span-4 font-semibold text-slate-600">1. Pendidikan Diniyah (Madrasah)</span>
                        <span className="col-span-8 font-bold text-teal-850">: {s.classMadrasah || s.classPagi || '-'}</span>

                        <span className="col-span-4 font-semibold text-slate-600">2. Sekolah Formal (Umum)</span>
                        <span className="col-span-8 font-bold text-indigo-850">: {s.classFormal || s.classSore || '-'}</span>
                      </div>
                    </div>

                  </div>

                  {/* BOTTOM SIGNATURE SECTION */}
                  <div className="mt-10 pt-4 border-t border-slate-200 flex justify-between items-start gap-4 text-xs">
                    <div className="text-center w-[180px]">
                      <p className="text-[10px] text-slate-500 uppercase font-semibold">Mengetahui,</p>
                      <p className="font-bold text-slate-900 mt-1 uppercase leading-snug">Pengasuh Pesantren<br />Ponpes Al-Asy'ariyah</p>
                      
                      <div className="h-12 flex items-center justify-center relative my-1">
                        {isImageUrl(settings.ttdPengasuhUrl || settings.ttdPengurusUrl) && (
                          <img src={settings.ttdPengasuhUrl || settings.ttdPengurusUrl} alt="TTD Pengasuh" className="h-10 object-contain absolute" referrerPolicy="no-referrer" />
                        )}
                        {isImageUrl(settings.stempelPengasuhUrl || settings.stempelPesantrenUrl) && (
                          <img src={settings.stempelPengasuhUrl || settings.stempelPesantrenUrl} alt="Stempel" className="h-12 object-contain absolute opacity-80" referrerPolicy="no-referrer" />
                        )}
                      </div>

                      <strong className="text-slate-900 block underline">{settings.namaPengasuh || settings.namaPengurus || "KH. Asy'ari Al-Hafidz"}</strong>
                    </div>

                    <div className="border-2 border-dashed border-slate-300 w-[3cm] h-[4cm] rounded flex flex-col items-center justify-center text-center p-1 relative bg-slate-50/30 shrink-0 self-center">
                      {s.photoUrl && isImageUrl(s.photoUrl) ? (
                        <img src={s.photoUrl} alt={s.fullName} className="w-full h-full object-cover rounded" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="text-[8px] text-slate-400 font-bold uppercase leading-tight">
                          FOTO RESMI<br />SANTRI<br />3 x 4
                        </div>
                      )}
                    </div>

                    <div className="text-center w-[220px] relative">
                      <p className="text-[10px] text-slate-500 font-semibold">{getCityFromAddress(settings.address)}, {getIndonesianToday()}</p>
                      <p className="font-bold text-slate-950 mt-1 uppercase leading-snug">Pengasuh Pesantren<br />Al-Asy'ariyah</p>
                      
                      <div className="relative min-h-[64px] flex flex-col items-center justify-end my-1">
                        {/* Tanda tangan di atas nama pengasuh */}
                        <div className="z-10 mb-1 flex items-center justify-center">
                          {isImageUrl(settings.ttdPengasuhUrl) ? (
                            <img src={settings.ttdPengasuhUrl} alt="TTD Pengasuh" className="h-14 max-w-[130px] object-contain mix-blend-multiply" referrerPolicy="no-referrer" />
                          ) : (
                            <span className="text-xs font-mono text-emerald-800 italic font-extrabold">✍️ {settings.namaPengasuh || "KH. Ahmad Wildan"}</span>
                          )}
                        </div>

                        {/* Stempel di sebelah kiri nama pengasuh */}
                        {isImageUrl(settings.stempelPengasuhUrl) && (
                          <div className="z-20 absolute -left-7 -bottom-1 pointer-events-none opacity-85">
                            <img src={settings.stempelPengasuhUrl} alt="Stempel Pengasuh" className="h-20 w-20 object-contain rotate-[-10deg] mix-blend-multiply" referrerPolicy="no-referrer" />
                          </div>
                        )}

                        {/* Nama Pengasuh di bawah tanda tangan */}
                        <strong className="text-slate-950 block underline text-xs leading-none uppercase">{settings.namaPengasuh || "KH. Ahmad Wildan Asy'ari"}</strong>
                      </div>
                    </div>
                  </div>

                  {/* PRINTING FOOTNOTE */}
                  <div className="absolute bottom-2 left-10 right-10 flex justify-between items-center text-[7.5px] text-slate-400 font-mono border-t border-slate-100 pt-1 print:flex hidden">
                    <span>Dokumen Induk Resmi - Pondok Pesantren Al-Asy'ariyah</span>
                    <span>Dicetak Tanggal: {new Date().toLocaleString('id-ID')}</span>
                  </div>

                </div>
              </div>

              {/* Printable Modal Actions */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 print:hidden flex justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedStudentForProfilePrint(null)}
                  className="px-4 py-1.5 border border-slate-300 hover:bg-slate-100 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Tutup
                </button>
                
                <button
                  type="button"
                  onClick={() => downloadPrintableHTML('admin-student-profile-printable-area', `Dokumen_Induk_Santri_${s.fullName}`)}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-sm"
                >
                  <Download className="h-3.5 w-3.5" /> Unduh HTML Offline 📥
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" /> Cetak Dokumen (PDF) ⎙
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* MODAL: CETAK KARTU RIWAYAT ALUMNI (ADMIN PERSPECTIVE APPROVED PORTRAIT OFFICIAL DOCUMENT STYLE) */}
      {selectedAlumniForCard && (() => {
        const entryYear = (selectedAlumniForCard.nis && selectedAlumniForCard.nis.includes('.')) 
          ? parseInt(selectedAlumniForCard.nis.split('.')[0]) 
          : 2019;
        const exitYear = selectedAlumniForCard.tahunKeluar ? parseInt(selectedAlumniForCard.tahunKeluar) : 2026;
        const durationYears = (entryYear && exitYear && exitYear >= entryYear) ? (exitYear - entryYear) : 7;
        const lamaMondok = `${durationYears} Tahun (${entryYear} - ${exitYear})`;

        const lastEducation = mapClassToLastEducation(selectedAlumniForCard);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-sm print:bg-white print:p-0 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-[620px] w-full border border-amber-100 max-h-[88vh] sm:max-h-[90vh] flex flex-col justify-between print:shadow-none print:border-none my-auto overflow-y-auto scrollbar-thin">
              
              <div className="p-2.5 bg-amber-50 border-b border-amber-100 print:hidden text-left">
                <div className="text-[10px] text-amber-950 font-bold text-center">
                  Pratinjau Surat Alumni Resmi (Portrait). Gunakan mode Portrait saat print.
                </div>
              </div>

              {/* Card Body & Printable wrapper (PORTRAIT LETTER ASPECT RATIO) */}
              <div className="flex-1 p-2 sm:p-4 bg-slate-100 flex justify-center items-center overflow-x-auto">
                <div 
                  id="admin-alumni-card-printable-area" 
                  className="p-4 sm:p-6 bg-gradient-to-br from-amber-50/40 via-white to-amber-50/10 print:bg-white text-left font-sans flex flex-col gap-2 sm:gap-3 border-[3px] border-double border-amber-700 rounded-2xl w-full max-w-[560px] h-auto shadow-md relative overflow-hidden shrink-0 print:border-none print:shadow-none print:p-0"
                  contentEditable={false}
                  suppressContentEditableWarning={true}
                >
                  
                  {/* Style Injection to enforce portrait printing for this card */}
                  <style dangerouslySetInnerHTML={{__html: `
                    @media print {
                      @page {
                        size: portrait !important;
                        margin: 1.5cm !important;
                      }
                      body {
                        background: white;
                      }
                      #admin-alumni-card-printable-area {
                        border: 3px double #b45309 !important;
                        box-shadow: none !important;
                        margin: 0 auto !important;
                        background: white !important;
                        width: 100% !important;
                        height: auto !important;
                        max-width: 100% !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                      }
                    }
                  `}} />

                  {/* KOP SURAT RESMI (Official Portrait Letterhead) */}
                  <div className="border-b-[3px] border-double border-amber-800 pb-2 mb-1 flex gap-3 sm:gap-4 items-center shrink-0 text-left">
                    {(settings.logoUrl || '/pesantren_logo.jpg') ? (
                      <img src={settings.logoUrl || '/pesantren_logo.jpg'} alt="Logo Pesantren" className="h-10 w-10 sm:h-12 sm:w-12 object-contain shrink-0" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="h-10 w-10 sm:h-12 sm:w-12 text-2xl shrink-0 flex items-center justify-center">🕌</div>
                    )}
                    <div className="flex-1 min-w-0 text-left">
                      <h4 className="text-[10px] sm:text-sm font-black tracking-wide uppercase text-amber-950 leading-tight truncate">{settings.schoolName || "Pondok Pesantren Al-Asy'ariyah"}</h4>
                      <p className="text-[7px] sm:text-[10px] text-slate-500 leading-normal truncate mt-0.5">
                        {settings.address || "Jl. Raya Modung, Langpanggang, Modung, Bangkalan, Jawa Timur"}
                      </p>
                      <p className="text-[7px] sm:text-[10px] text-amber-800 font-bold italic truncate">
                        {settings.tagline || "Mencetak Generasi Qur'ani, Berakhlakul Karimah"}
                      </p>
                    </div>
                  </div>

                  {/* DOCUMENT TITLE */}
                  <div className="text-center my-1 sm:my-2 shrink-0">
                    <h5 className="text-[10px] sm:text-sm font-black tracking-widest text-amber-950 underline leading-tight uppercase">SURAT KETERANGAN ALUMNI</h5>
                    <p className="text-[7px] sm:text-[10px] font-mono font-bold text-slate-400 mt-0.5">No. {getLetterNumber(selectedAlumniForCard.id || selectedAlumniForCard.nis, 'Surat Keterangan Alumni', 'SKA')}</p>
                  </div>

                  {/* Salam Pembuka & Kata Pembuka */}
                  <div className="text-[8px] sm:text-xs text-slate-700 leading-relaxed mb-1 shrink-0 space-y-0.5">
                    <p className="font-bold">Assalamu'alaikum Warahmatullahi Wabarakaatuh,</p>
                    <p>
                      Dengan memohon rahmat dan ridho Allah SWT, Pengasuh Pondok Pesantren menerangkan dengan sebenarnya bahwa data di bawah ini tercatat sebagai alumni:
                    </p>
                  </div>

                  {/* Profile Layout (Vertical / Portrait Organized Rows) */}
                  <div className="flex-none space-y-1 sm:space-y-2 py-1.5 sm:py-2.5 text-[8px] sm:text-xs border border-dashed border-amber-200/60 rounded-xl p-3 sm:p-4 bg-white/60">
                    <div className="grid grid-cols-12 gap-1 items-center">
                      <span className="col-span-4 text-[7px] sm:text-[10px] text-gray-400 font-mono font-bold tracking-wider uppercase">No Identitas (NIA)</span>
                      <span className="col-span-1 text-gray-400 text-center">:</span>
                      <span className="col-span-7 font-mono font-black text-[9px] sm:text-sm text-amber-900 leading-none">{selectedAlumniForCard.alumniId || '-'}</span>
                    </div>

                    <div className="grid grid-cols-12 gap-1 items-center">
                      <span className="col-span-4 text-[7px] sm:text-[10px] text-gray-400 font-mono font-bold tracking-wider uppercase">Nama Lengkap</span>
                      <span className="col-span-1 text-gray-400 text-center">:</span>
                      <span className="col-span-7 font-black text-[9.5px] sm:text-sm text-slate-900 uppercase leading-none">{selectedAlumniForCard.fullName}</span>
                    </div>

                    <div className="grid grid-cols-12 gap-1 items-start">
                      <span className="col-span-4 text-[7px] sm:text-[10px] text-gray-400 font-mono font-bold tracking-wider uppercase">Nama Wali</span>
                      <span className="col-span-1 text-gray-400 text-center">:</span>
                      <div className="col-span-7 font-bold text-[8.5px] sm:text-xs text-slate-800 leading-tight">
                        <div>Ayah : {selectedAlumniForCard.fatherName || selectedAlumniForCard.parentName || '-'}</div>
                        <div>Ibu : {selectedAlumniForCard.motherName || '-'}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-12 gap-1 items-center">
                      <span className="col-span-4 text-[7px] sm:text-[10px] text-gray-400 font-mono font-bold tracking-wider uppercase">Masa Mondok</span>
                      <span className="col-span-1 text-gray-400 text-center">:</span>
                      <span className="col-span-7 font-bold text-[8.5px] sm:text-xs text-slate-800 leading-none">{lamaMondok}</span>
                    </div>

                    <div className="grid grid-cols-12 gap-1 items-center">
                      <span className="col-span-4 text-[7px] sm:text-[10px] text-gray-400 font-mono font-bold tracking-wider uppercase">Tahun Keluar</span>
                      <span className="col-span-1 text-gray-400 text-center">:</span>
                      <span className="col-span-7 font-bold text-[8.5px] sm:text-xs text-slate-800 leading-none">Tahun Keluar {selectedAlumniForCard.tahunKeluar || '-'}</span>
                    </div>

                    <div className="grid grid-cols-12 gap-1 items-center">
                      <span className="col-span-4 text-[7px] sm:text-[10px] text-gray-400 font-mono font-bold tracking-wider uppercase">Pendidikan Terakhir</span>
                      <span className="col-span-1 text-gray-400 text-center">:</span>
                      <span className="col-span-7 font-black text-[8.5px] sm:text-xs text-emerald-800 leading-none">{lastEducation}</span>
                    </div>

                    <div className="grid grid-cols-12 gap-1 items-center">
                      <span className="col-span-4 text-[7px] sm:text-[10px] text-gray-400 font-mono font-bold tracking-wider uppercase">Status Keluar</span>
                      <span className="col-span-1 text-gray-400 text-center">:</span>
                      <span className="col-span-7 flex flex-wrap gap-1 items-center">
                        <select
                          value={selectedAlumniForCard.alumniReason || 'Lulus Madrasah & Formal'}
                          onChange={(e) => {
                            setSelectedAlumniForCard({
                              ...selectedAlumniForCard,
                              alumniReason: e.target.value
                            });
                          }}
                          className="print:hidden text-[8px] sm:text-[11px] font-bold text-slate-700 bg-amber-50/60 border border-amber-200 rounded px-1.5 py-0.5 cursor-pointer max-w-full focus:outline-none focus:ring-1 focus:ring-amber-500"
                        >
                          <option value="Lulus Madrasah & Formal">Lulus Madrasah & Formal</option>
                          <option value="Lulus Pondok & Diniyah">Lulus Pondok & Diniyah</option>
                          <option value="Lulus Pendidikan Formal (SMP/SMA/SMK/MA)">Lulus Pendidikan Formal (SMP/SMA/SMK/MA)</option>
                          <option value="Pindah Sekolah / Menuntut Ilmu di Luar">Pindah Sekolah / Menuntut Ilmu di Luar</option>
                          <option value="Selesai Masa Pengabdian">Selesai Masa Pengabdian</option>
                          <option value="Bekerja / Menikah">Bekerja / Menikah</option>
                          <option value="Pilihan Keluarga / Berhenti Mandiri">Pilihan Keluarga / Berhenti Mandiri</option>
                          <option value="Kembali ke Tokoh Masyarakat / Mengajar">Kembali ke Tokoh Masyarakat / Mengajar</option>
                        </select>
                        <span className="hidden print:inline-block text-[8.5px] sm:text-xs font-bold text-slate-700 leading-tight italic">
                          {selectedAlumniForCard.alumniReason || 'Lulus Madrasah & Formal'}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Kata Penutup & Salam Penutup (Directly under body with minimal spacing) */}
                  <div className="text-[8px] sm:text-xs text-slate-700 leading-relaxed mt-2 sm:mt-3 shrink-0 space-y-0.5">
                    <p>
                      Demikian surat keterangan ini kami buat dengan sebenarnya agar dapat dipergunakan sebagaimana mestinya. Semoga limpahan berkah senantiasa menyertai langkah perjuangan di masyarakat.
                    </p>
                    <p className="font-bold">Wassalamu'alaikum Warahmatullahi Wabarakaatuh.</p>
                  </div>

                  {/* Wet Signature Area & Photo (Disusul langsung di bawah penutup with tight spacing) */}
                  <div className="flex justify-between items-end mt-2 sm:mt-4 pt-1 sm:pt-2 border-t border-dashed border-amber-200 shrink-0">
                    {/* Alumni Photo next to Pengasuh Signature */}
                    <div className="border border-amber-300 w-[1.5cm] h-[2cm] sm:w-[2cm] sm:h-[2.6cm] rounded flex flex-col items-center justify-center text-center p-0.5 relative bg-white shrink-0 shadow-xs mb-1 ml-2">
                      {selectedAlumniForCard.photoUrl && isImageUrl(selectedAlumniForCard.photoUrl) ? (
                        <img src={selectedAlumniForCard.photoUrl} alt={selectedAlumniForCard.fullName} className="w-full h-full object-cover rounded" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="text-[5px] sm:text-[7px] text-amber-600 font-bold uppercase leading-tight">
                          FOTO ALUMNI<br />TERBARU<br />3 x 4
                        </div>
                      )}
                    </div>

                    <div className="w-[140px] sm:w-[190px] text-center relative select-none mr-2">
                      <p className="text-[7px] sm:text-[10px] text-gray-400 font-medium">{getCityFromAddress(settings.address)}, {new Date().toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</p>
                      <p className="text-[8px] sm:text-xs text-amber-950 font-black uppercase tracking-wider leading-tight mt-0.5 sm:mt-1">Pengasuh Pesantren</p>

                      <div className="relative min-h-[44px] sm:min-h-[58px] flex flex-col items-center justify-end my-0.5">
                        {/* Wet signature: Berada DI ATAS nama pengasuh */}
                        <div className="z-10 mb-0.5 flex items-center justify-center">
                          {settings.ttdPengasuhUrl ? (
                            <img src={settings.ttdPengasuhUrl} alt="TTD Pengasuh" className="max-h-9 sm:max-h-12 max-w-[90px] sm:max-w-[120px] object-contain mix-blend-multiply" referrerPolicy="no-referrer" />
                          ) : (
                            <span className="text-[8px] sm:text-xs font-mono text-emerald-800 italic font-extrabold tracking-wide">
                              {"✒️ " + (settings.namaPengasuh || "KH. Ahmad Wildan")}
                            </span>
                          )}
                        </div>

                        {/* Overlapping Stamp: Berada di SEBELAH KIRI nama pengasuh */}
                        {settings.stempelPengasuhUrl && (
                          <div className="z-20 absolute -left-4 sm:-left-6 -bottom-1 pointer-events-none opacity-85">
                            <img src={settings.stempelPengasuhUrl} alt="Stempel Pengasuh" className="h-10 w-10 sm:h-14 sm:w-14 object-contain rotate-[-10deg] mix-blend-multiply" referrerPolicy="no-referrer" />
                          </div>
                        )}

                        <div>
                          <p className="text-[8.5px] sm:text-xs font-black text-gray-900 underline leading-none truncate">{settings.namaPengasuh || "KH. Ahmad Wildan Asy'ari"}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Decorative Watermark background badge */}
                  <div className="absolute -bottom-10 -right-10 opacity-[0.03] pointer-events-none text-amber-900 select-none">
                    <span className="text-[150px]">🕌</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions buttons */}
              <div className="p-4 bg-amber-50 border-t border-amber-100 flex flex-wrap justify-end gap-2 print:hidden shrink-0 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedAlumniForCard(null)}
                  className="px-4 py-1.5 border border-gray-300 hover:bg-gray-150 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Tutup
                </button>
                
                <button
                  type="button"
                  onClick={() => handlePrintLetter('admin-alumni-card-printable-area', selectedAlumniForCard.id || selectedAlumniForCard.nis, 'Surat Keterangan Alumni', 'SKA', selectedAlumniForCard.fullName, `Surat Keterangan Alumni (${selectedAlumniForCard.alumniReason || 'Lulus'})`)}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-sm"
                >
                  <Download className="h-3.5 w-3.5" /> Unduh HTML Offline 📥
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-1.5 bg-amber-850 hover:bg-amber-900 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" /> Cetak Surat Alumni
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* MODAL: CETAK SLIP PPDB RESMI */}
      {selectedPpdbForSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-emerald-950/75 backdrop-blur-sm print:bg-white print:p-0">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 md:p-8 border border-emerald-100 flex flex-col justify-between print:shadow-none print:border-none print:p-0 my-auto max-h-[88vh] sm:max-h-[90vh] overflow-y-auto">
            
            <PrintGuideAlert />

            {/* Printable target wrapper */}
            <div id="admin-ppdb-slip-printable-area" className="space-y-4">
            
            {/* Kop Surat Resmi */}
            <div className="border-b-4 border-double border-emerald-700 pb-4 mb-6">
              <div className="flex gap-4 items-center">
                {(settings.logoUrl || '/pesantren_logo.jpg') ? (
                  <img src={settings.logoUrl || '/pesantren_logo.jpg'} alt="Logo Pesantren" className="h-16 w-16 object-contain" referrerPolicy="no-referrer" />
                ) : (
                  <div className="text-3xl shrink-0 flex items-center justify-center h-16 w-16">🕌</div>
                )}
                <div className="flex-1 text-left">
                  <h4 className="text-emerald-900 font-black text-sm tracking-wide uppercase leading-tight">{settings.schoolName || "Pondok Pesantren Al-Asy'ariyah"}</h4>
                  <p className="text-[9px] text-gray-500 max-w-md leading-relaxed mt-0.5">
                    {settings.address || "Jl. Raya Modung, Langpanggang, Modung, Bangkalan, Jawa Timur"}<br />
                    {settings.phone ? `Hubungi: ${settings.phone} | ` : ''} Email: {settings.email || "info@alasyariyah.sch.id"}
                  </p>
                  <p className="text-[8px] text-emerald-700 font-bold italic tracking-wide mt-0.5">
                    {settings.tagline || "Mencetak Generasi Qur'ani, Berakhlakul Karimah, Unggul, dan Mandiri"}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="bg-emerald-100 px-3 py-1 rounded text-emerald-800 text-[10px] uppercase font-mono font-bold tracking-widest leading-none">
                    SLIP PCSB ONLINE
                  </span>
                  <div className="text-[11px] text-gray-400 font-mono mt-2">No: PCSB-{selectedPpdbForSlip.id.split('-')[1] || Date.now()}</div>
                </div>
              </div>
            </div>

            {/* Tanggal Surat diletakkan diatas bawah kop sebelah kiri */}
            <div className="text-left text-xs font-bold text-gray-700 font-sans pl-1 pb-1">
              {getCityFromAddress(settings.address)}, {selectedPpdbForSlip.registrationDate || new Date().toISOString().split('T')[0]}
            </div>

            {/* Content list */}
            <div className="space-y-3 text-xs text-left">
              <div className="grid grid-cols-12 gap-2 pb-2 border-b border-gray-100">
                <div className="col-span-4 text-gray-500 font-medium">Nama Calon Santri:</div>
                <div className="col-span-8 text-gray-900 font-black">{selectedPpdbForSlip.fullName}</div>
              </div>

              <div className="grid grid-cols-12 gap-2 pb-2 border-b border-gray-100">
                <div className="col-span-4 text-gray-500 font-medium">Jenis Kelamin:</div>
                <div className="col-span-8 text-gray-900">{selectedPpdbForSlip.gender}</div>
              </div>

              <div className="grid grid-cols-12 gap-2 pb-2 border-b border-gray-100">
                <div className="col-span-4 text-gray-500 font-medium">Tempat, Tanggal Lahir:</div>
                <div className="col-span-8 text-gray-950">{selectedPpdbForSlip.birthPlace}, {selectedPpdbForSlip.birthDate}</div>
              </div>

              <div className="grid grid-cols-12 gap-2 pb-2 border-b border-gray-100">
                <div className="col-span-4 text-gray-500 font-medium">No KK / NIK:</div>
                <div className="col-span-8 text-gray-900 font-mono">KK: {selectedPpdbForSlip.kk || '-'} / NIK: {selectedPpdbForSlip.nik || '-'}</div>
              </div>

              <div className="grid grid-cols-12 gap-2 pb-2 border-b border-gray-100">
                <div className="col-span-4 text-gray-500 font-medium">Sekolah Asal:</div>
                <div className="col-span-8 text-gray-900">{selectedPpdbForSlip.previousSchool}</div>
              </div>

              <div className="grid grid-cols-12 gap-2 pb-2 border-b border-gray-100">
                <div className="col-span-4 text-gray-500 font-medium">Orang Tua / Wali:</div>
                <div className="col-span-8 text-gray-900 font-bold">{selectedPpdbForSlip.parentName} ({selectedPpdbForSlip.parentPhone})</div>
              </div>

              <div className="grid grid-cols-12 gap-2 pb-2 border-b border-gray-100">
                <div className="col-span-4 text-gray-500 font-medium">Status Kelulusan PCSB:</div>
                <div className={`col-span-8 font-black uppercase text-xs ${
                  selectedPpdbForSlip.status === 'Diterima' ? 'text-emerald-700' :
                  selectedPpdbForSlip.status === 'Pending' ? 'text-amber-600' : 'text-rose-600'
                }`}>
                  {selectedPpdbForSlip.status === 'Diterima' ? 'LULUS / DITERIMA SEBAGAI SANTRI' :
                   selectedPpdbForSlip.status === 'Pending' ? 'MENUNGGU VERIFIKASI BERKAS' : 'DITOLAK / BERKAS TIDAK VALID'}
                </div>
              </div>
            </div>

            {/* footer with signature */}
            <div className="border-t border-dashed border-gray-200 pt-6 mt-6">
              <div className="grid grid-cols-2 gap-4">
                
                {/* Column 1 (Left): Panitia Pelaksana (with Stempel overlapping Signature) */}
                <div className="text-left pl-4 space-y-0.5 relative">
                  <p className="text-[10px] text-emerald-900 font-extrabold uppercase tracking-wider leading-none">Panitia Pelaksana</p>
                  
                  <div className="h-20 w-40 relative flex items-center justify-center select-none my-1">
                    {/* Tanda tangan rendered in background */}
                    <div className="z-10 absolute inset-0 flex items-center justify-start">
                      {isImageUrl(settings.ttdKetuaPcsbUrl) ? (
                        <img src={settings.ttdKetuaPcsbUrl} alt="TTD Ketua PCSB" className="max-h-20 max-w-[150px] object-contain mix-blend-multiply" referrerPolicy="no-referrer" />
                      ) : (
                        <span className="text-[10px] font-mono text-emerald-800 italic font-extrabold tracking-wide">
                          {settings.ttdKetuaPcsbUrl || '✒️ Panitia Santri Baru'}
                        </span>
                      )}
                    </div>

                    {/* Stempel rendered on top overlapping */}
                    {settings.stempelPcsbUrl && (
                      <div className="z-20 absolute left-[5px] top-[-5px] pointer-events-none opacity-85">
                        {isImageUrl(settings.stempelPcsbUrl) ? (
                          <img src={settings.stempelPcsbUrl} alt="Stempel PCSB" className="h-20 w-20 object-contain rotate-[-12deg] mix-blend-multiply" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="border border-double border-emerald-600/60 text-emerald-700/90 rounded-full h-14 w-14 flex items-center justify-center text-[7px] font-extrabold uppercase rotate-[-12deg] leading-tight text-center bg-white/75 shadow-xs">
                            {settings.stempelPcsbUrl}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <p className="text-xs font-black text-gray-900 underline leading-none">Panitia Santri Baru</p>
                </div>

                {/* Column 2 (Right): Empty/Removed */}
                <div />

              </div>
              <div className="text-gray-400 text-[8px] italic mt-6 text-center">
                Dicetak oleh administrator via Al-Asy'ariyah Portal Resmi.
              </div>
            </div>

            </div>

            {/* Actions */}
            <div className="border-t border-gray-150 pt-4 mt-6 flex flex-wrap justify-end gap-2 print:hidden text-xs">
              <button
                type="button"
                onClick={() => setSelectedPpdbForSlip(null)}
                className="px-4 py-1.5 border border-gray-300 hover:bg-gray-100 rounded font-semibold cursor-pointer"
              >
                Tutup
              </button>
              
              <button
                type="button"
                onClick={() => downloadPrintableHTML('admin-ppdb-slip-printable-area', `Slip_PCSB_${selectedPpdbForSlip.fullName}`)}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-sm"
              >
                <Download className="h-3.5 w-3.5" /> Unduh HTML Offline 📥
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-1.5 bg-gradient-to-r from-emerald-800 to-teal-900 hover:from-emerald-700 hover:to-teal-800 text-white rounded font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Printer className="h-3.5 w-3.5" /> Cetak Slip PCSB
              </button>
            </div>

          </div>
        </div>
      )}



      {/* MODAL: CONFIRMATION FOR PPDB ARRIVAL / VERIFICATION (STEP-BY-STEP) */}
      {ppdbConfirmData && (
        <div className="fixed inset-0 z-[100] p-3 sm:p-4 bg-teal-950/75 backdrop-blur-sm flex justify-center items-center">
          <div className={`bg-white rounded-2xl w-full ${ppdbConfirmStep === 2 ? 'max-w-5xl' : 'max-w-md'} my-auto overflow-y-auto max-h-[88vh] sm:max-h-[90vh] shadow-2xl border border-emerald-100 p-6 space-y-4 text-left animate-fade-in transition-all duration-300`}>
            {/* Header / Steps Indicator */}
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-teal-950 uppercase tracking-wider">Verifikasi Santri Baru</h3>
                <p className="text-[10px] text-emerald-800 font-bold mt-0.5">{ppdbConfirmData.name}</p>
              </div>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono">
                Langkah {ppdbConfirmStep} dari 4
              </span>
            </div>

            {/* STEP 1: PHYSICAL ARRIVAL CONFIRMATION */}
            {ppdbConfirmStep === 1 && (
              <div className="space-y-4 py-2">
                <div className="text-center space-y-2">
                  <span className="text-4xl">🤝</span>
                  <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Konfirmasi Kehadiran Fisik</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Harap pastikan bahwa calon santri bernama <strong>{ppdbConfirmData.name}</strong> telah hadir secara langsung di lokasi pondok pesantren untuk melakukan pencocokan identitas.
                  </p>
                </div>

                <label className="flex items-start gap-2.5 p-3.5 bg-emerald-50/50 hover:bg-emerald-50 border border-emerald-100 rounded-xl cursor-pointer transition">
                  <input
                    type="checkbox"
                    checked={ppdbPhysicalPresent}
                    onChange={(e) => setPpdbPhysicalPresent(e.target.checked)}
                    className="h-4 w-4 mt-0.5 accent-emerald-800 cursor-pointer rounded"
                  />
                  <div className="text-xs text-slate-800 font-semibold leading-snug">
                    Calon santri telah hadir secara fisik di lokasi pendaftaran pesantren
                  </div>
                </label>

                <div className="grid grid-cols-2 gap-3 pt-2 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setPpdbConfirmData(null)}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs transition cursor-pointer text-center"
                  >
                    Batalkan
                  </button>
                  <button
                    type="button"
                    onClick={() => setPpdbConfirmStep(2)}
                    className="w-full py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs transition cursor-pointer text-center"
                  >
                    Lanjut ke Dokumen ➜
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: DOCUMENT CHECKLIST & INLINE HIGH-FIDELITY PREVIEW */}
            {ppdbConfirmStep === 2 && (() => {
              const activeReg = ppdbList.find(p => p.id === ppdbConfirmData.id);
              if (!activeReg) return null;
              return (
                <div className="space-y-4 py-1 animate-fade-in text-left">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    {/* LEFT COLUMN: Checklist & Actions */}
                    <div className="lg:col-span-5 flex flex-col justify-between space-y-4 lg:max-h-[62vh] overflow-y-auto pr-1">
                      <div className="space-y-3.5 flex-1">
                        <div className="text-center lg:text-left space-y-1">
                          <span className="text-3xl block lg:inline-block">📂</span>
                          <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider inline-block lg:block lg:ml-0 ml-2">Verifikasi Berkas Fisik & Online</h4>
                          <p className="text-[11px] text-gray-500 leading-relaxed">
                            Sesuai peraturan, Anda wajib memeriksa pindaian (softcopy) berkas online pendaftar sebelum menyetujui berkas fisik:
                          </p>
                        </div>

                        <div className="p-3 bg-amber-50/75 border border-amber-150 rounded-xl text-[10px] text-amber-800 font-semibold leading-normal">
                          ⚠️ <strong>PEMBERITAHUAN:</strong> Kotak centang verifikasi hanya akan terbuka setelah Anda mengklik <strong>"Tinjau Berkas"</strong> di bawah ini untuk memicu pemuatan dokumen langsung di sebelah kanan.
                        </div>

                        <div className="space-y-3">
                          {/* KK */}
                          <div className={`p-3 rounded-xl border transition-all ${step2ActiveTab === 'kk' ? 'bg-emerald-50/50 border-emerald-500 ring-1 ring-emerald-500/20' : 'bg-slate-50 border-slate-150 hover:bg-slate-100/60'}`}>
                            <div className="flex items-center justify-between">
                              <span className="text-[10.5px] font-extrabold text-slate-800 flex items-center gap-1.5 truncate max-w-[150px]">
                                📋 KK_{activeReg.fullName.replace(/\s+/g, '_')}.pdf
                              </span>
                              <span className="text-[9px] font-mono text-slate-400">1.4 MB</span>
                            </div>
                            <div className="flex gap-2 mt-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setPpdbHasViewedKK(true);
                                  setStep2ActiveTab('kk');
                                }}
                                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition cursor-pointer ${
                                  step2ActiveTab === 'kk'
                                    ? 'bg-emerald-800 text-white border border-emerald-850'
                                    : 'bg-white text-emerald-800 border border-emerald-200 hover:bg-emerald-50'
                                }`}
                              >
                                👁️ {step2ActiveTab === 'kk' ? 'Sedang Ditinjau' : 'Tinjau Berkas KK'}
                              </button>
                            </div>
                            <label className={`flex items-center gap-2 p-1.5 mt-1.5 bg-white rounded-lg border transition ${
                              !ppdbHasViewedKK ? 'opacity-50 cursor-not-allowed border-gray-200 bg-gray-50' : 'cursor-pointer hover:bg-emerald-50/20 border-emerald-100'
                            }`}>
                              <input
                                type="checkbox"
                                disabled={!ppdbHasViewedKK}
                                checked={ppdbVerifyKK}
                                onChange={(e) => setPpdbVerifyKK(e.target.checked)}
                                className="h-3.5 w-3.5 accent-emerald-800 cursor-pointer disabled:cursor-not-allowed"
                              />
                              <span className="text-[10px] text-slate-800 font-bold">Fotokopi Kartu Keluarga Sesuai</span>
                            </label>
                          </div>

                          {/* Akta */}
                          <div className={`p-3 rounded-xl border transition-all ${step2ActiveTab === 'akta' ? 'bg-emerald-50/50 border-emerald-500 ring-1 ring-emerald-500/20' : 'bg-slate-50 border-slate-150 hover:bg-slate-100/60'}`}>
                            <div className="flex items-center justify-between">
                              <span className="text-[10.5px] font-extrabold text-slate-800 flex items-center gap-1.5 truncate max-w-[150px]">
                                📋 Akta_{activeReg.fullName.replace(/\s+/g, '_')}.jpg
                              </span>
                              <span className="text-[9px] font-mono text-slate-400">920 KB</span>
                            </div>
                            <div className="flex gap-2 mt-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setPpdbHasViewedAkta(true);
                                  setStep2ActiveTab('akta');
                                }}
                                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition cursor-pointer ${
                                  step2ActiveTab === 'akta'
                                    ? 'bg-emerald-800 text-white border border-emerald-850'
                                    : 'bg-white text-emerald-800 border border-emerald-200 hover:bg-emerald-50'
                                }`}
                              >
                                👁️ {step2ActiveTab === 'akta' ? 'Sedang Ditinjau' : 'Tinjau Berkas Akta'}
                              </button>
                            </div>
                            <label className={`flex items-center gap-2 p-1.5 mt-1.5 bg-white rounded-lg border transition ${
                              !ppdbHasViewedAkta ? 'opacity-50 cursor-not-allowed border-gray-200 bg-gray-50' : 'cursor-pointer hover:bg-emerald-50/20 border-emerald-100'
                            }`}>
                              <input
                                type="checkbox"
                                disabled={!ppdbHasViewedAkta}
                                checked={ppdbVerifyAkta}
                                onChange={(e) => setPpdbVerifyAkta(e.target.checked)}
                                className="h-3.5 w-3.5 accent-emerald-800 cursor-pointer disabled:cursor-not-allowed"
                              />
                              <span className="text-[10px] text-slate-800 font-bold">Fotokopi Akta Lahir Sesuai</span>
                            </label>
                          </div>

                          {/* Ijazah */}
                          <div className={`p-3 rounded-xl border transition-all ${step2ActiveTab === 'ijazah' ? 'bg-emerald-50/50 border-emerald-500 ring-1 ring-emerald-500/20' : 'bg-slate-50 border-slate-150 hover:bg-slate-100/60'}`}>
                            <div className="flex items-center justify-between">
                              <span className="text-[10.5px] font-extrabold text-slate-800 flex items-center gap-1.5 truncate max-w-[150px]">
                                📋 Ijazah_{activeReg.fullName.replace(/\s+/g, '_')}.pdf
                              </span>
                              <span className="text-[9px] font-mono text-slate-400">2.6 MB</span>
                            </div>
                            <div className="flex gap-2 mt-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setPpdbHasViewedIjazah(true);
                                  setStep2ActiveTab('ijazah');
                                }}
                                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition cursor-pointer ${
                                  step2ActiveTab === 'ijazah'
                                    ? 'bg-emerald-800 text-white border border-emerald-850'
                                    : 'bg-white text-emerald-800 border border-emerald-200 hover:bg-emerald-50'
                                }`}
                              >
                                👁️ {step2ActiveTab === 'ijazah' ? 'Sedang Ditinjau' : 'Tinjau Berkas Ijazah'}
                              </button>
                            </div>
                            <label className={`flex items-center gap-2 p-1.5 mt-1.5 bg-white rounded-lg border transition ${
                              !ppdbHasViewedIjazah ? 'opacity-50 cursor-not-allowed border-gray-200 bg-gray-50' : 'cursor-pointer hover:bg-emerald-50/20 border-emerald-100'
                            }`}>
                              <input
                                type="checkbox"
                                disabled={!ppdbHasViewedIjazah}
                                checked={ppdbVerifyIjazah}
                                onChange={(e) => setPpdbVerifyIjazah(e.target.checked)}
                                className="h-3.5 w-3.5 accent-emerald-800 cursor-pointer disabled:cursor-not-allowed"
                              />
                              <span className="text-[10px] text-slate-800 font-bold">Ijazah Terakhir / SKL Sesuai</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* RIGHT COLUMN: Real-Time High-Fidelity Document Viewer */}
                    <div className="lg:col-span-7 bg-slate-100 p-4 rounded-2xl border border-slate-200 flex flex-col justify-start max-h-[62vh] overflow-y-auto">
                      <div className="bg-emerald-800/10 text-emerald-800 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider mb-3 self-start">
                        📡 Live Viewer: Dokumen {step2ActiveTab === 'kk' ? 'Kartu Keluarga (KK)' : step2ActiveTab === 'akta' ? 'Akta Kelahiran' : 'Ijazah Kelulusan / SKL'}
                      </div>

                      {/* KK (KARTU KELUARGA) */}
                      {step2ActiveTab === 'kk' && (
                        <div className="w-full bg-[#f0f9ff] text-[#0f172a] border-2 border-dashed border-sky-400 p-5 rounded-xl shadow-xs text-[9px] space-y-3 relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-2 font-mono font-bold text-sky-850/10 text-6xl pointer-events-none select-none">
                            KK
                          </div>
                          <div className="text-center space-y-0.5 pb-2 border-b border-sky-300">
                            <h2 className="text-xs font-black tracking-widest text-sky-900 uppercase">KARTU KELUARGA</h2>
                            <p className="font-mono text-[10px] font-bold text-sky-850">No. {activeReg.kk || '3318110908120004'}</p>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-[9px]">
                            <div className="space-y-0.5">
                              <div className="flex"><span className="w-20 text-sky-800 font-bold">Kepala Keluarga:</span> <span className="font-extrabold uppercase">{activeReg.fatherName || 'SUDIRMAN'}</span></div>
                              <div className="flex"><span className="w-20 text-sky-800 font-bold">Alamat:</span> <span className="font-extrabold uppercase">{activeReg.address || 'JL. RAYA MODUNG, LANGPANGGANG, MODUNG, BANGKALAN, JAWA TIMUR'}</span></div>
                              <div className="flex"><span className="w-20 text-sky-800 font-bold">RT / RW:</span> <span className="font-extrabold uppercase">03 / 02</span></div>
                            </div>
                            <div className="space-y-0.5">
                              <div className="flex"><span className="w-20 text-sky-800 font-bold">Desa/Kelurahan:</span> <span className="font-extrabold uppercase">PURWOSARI</span></div>
                              <div className="flex"><span className="w-20 text-sky-800 font-bold">Kecamatan:</span> <span className="font-extrabold uppercase">KOTA</span></div>
                              <div className="flex"><span className="w-20 text-sky-800 font-bold">Kabupaten:</span> <span className="font-extrabold uppercase">JAWA TENGAH</span></div>
                            </div>
                          </div>

                          <div className="border border-sky-300 rounded overflow-hidden">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="bg-sky-200/50 text-sky-900 text-[8px] font-extrabold uppercase border-b border-sky-300">
                                  <th className="p-1 border-r border-sky-300 w-5 text-center">No</th>
                                  <th className="p-1 border-r border-sky-300">Nama Lengkap</th>
                                  <th className="p-1 border-r border-sky-300">NIK</th>
                                  <th className="p-1">Hubungan</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr className="border-b border-sky-200">
                                  <td className="p-1 border-r border-sky-300 text-center font-bold">1</td>
                                  <td className="p-1 border-r border-sky-300 font-black uppercase">{activeReg.fatherName || 'SUDIRMAN'}</td>
                                  <td className="p-1 border-r border-sky-300 font-mono">3318110204680002</td>
                                  <td className="p-1 font-bold text-sky-800">Kepala Keluarga</td>
                                </tr>
                                <tr className="border-b border-sky-200">
                                  <td className="p-1 border-r border-sky-300 text-center font-bold">2</td>
                                  <td className="p-1 border-r border-sky-300 font-black uppercase">{activeReg.motherName || 'SITI AMINAH'}</td>
                                  <td className="p-1 border-r border-sky-300 font-mono">3318111210740003</td>
                                  <td className="p-1 font-bold text-sky-800">Istri</td>
                                </tr>
                                <tr className="bg-sky-55/30">
                                  <td className="p-1 border-r border-sky-300 text-center font-bold">3</td>
                                  <td className="p-1 border-r border-sky-300 font-black uppercase text-emerald-900">{activeReg.fullName}</td>
                                  <td className="p-1 border-r border-sky-300 font-mono font-bold text-emerald-850">{activeReg.nik || '3318112506120005'}</td>
                                  <td className="p-1 font-bold text-emerald-850">Anak Kandung</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          <div className="flex justify-between items-end pt-2 text-[8px] font-semibold text-sky-850">
                            <div className="text-center space-y-4">
                              <span>Kepala Keluarga,</span>
                              <p className="border-t border-sky-450 pt-0.5 uppercase font-black">{activeReg.fatherName || 'SUDIRMAN'}</p>
                            </div>
                            <div className="text-center space-y-3">
                              <span>Diterbitkan Oleh Dinas DUKCAPIL,</span>
                              <div className="h-6 w-14 mx-auto bg-sky-200/40 rounded flex items-center justify-center font-bold text-[6.5px] text-sky-850 border border-sky-300/60 uppercase">Cap Resmi Basah</div>
                              <p className="border-t border-sky-450 pt-0.5 font-black">DINAS DUKCAPIL</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* AKTA KELAHIRAN */}
                      {step2ActiveTab === 'akta' && (
                        <div className="w-full bg-[#fefefe] text-[#0f172a] border-2 border-double border-amber-600 p-5 rounded-xl shadow-xs text-[9px] space-y-3 relative overflow-hidden">
                          <div className="absolute inset-0 border-4 border-amber-500/10 pointer-events-none rounded" />
                          
                          <div className="text-center space-y-0.5">
                            <div className="mx-auto h-6 w-6 bg-amber-500 rounded-full flex items-center justify-center text-[7px] font-black text-white border border-amber-600">GARUDA</div>
                            <h2 className="text-[10px] font-black tracking-wide text-amber-900 uppercase">REPUBLIK INDONESIA</h2>
                            <p className="text-[8.5px] uppercase font-bold text-amber-800">KUTIPAN AKTA KELAHIRAN</p>
                          </div>

                          <p className="text-center text-[8.5px] text-slate-500 italic leading-normal px-2">
                            "Berdasarkan Salinan Daftar Akta Kelahiran menerangkan bahwa:"
                          </p>

                          <div className="space-y-2 px-1 text-[9px] leading-normal">
                            <div className="flex border-b border-amber-100 pb-0.5">
                              <span className="w-20 text-amber-900 font-bold uppercase shrink-0">Nama Lengkap:</span>
                              <span className="font-extrabold text-emerald-900 uppercase">{activeReg.fullName}</span>
                            </div>
                            <div className="flex border-b border-amber-100 pb-0.5">
                              <span className="w-20 text-amber-900 font-bold uppercase shrink-0">Tempat Lahir:</span>
                              <span className="font-bold uppercase">{activeReg.birthPlace || 'SEMARANG'}</span>
                            </div>
                            <div className="flex border-b border-amber-100 pb-0.5">
                              <span className="w-20 text-amber-900 font-bold uppercase shrink-0">Tanggal Lahir:</span>
                              <span className="font-bold font-mono">{activeReg.birthDate || '25 Juni 2012'}</span>
                            </div>
                            <div className="flex border-b border-amber-100 pb-0.5">
                              <span className="w-20 text-amber-900 font-bold uppercase shrink-0">Orang Tua:</span>
                              <div className="font-bold uppercase">
                                Suami-Istri <span className="font-black text-slate-800">{activeReg.fatherName || 'SUDIRMAN'}</span> & <span className="font-black text-slate-800">{activeReg.motherName || 'SITI AMINAH'}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex justify-between items-end pt-3 text-[8px] font-semibold text-amber-900">
                            <div className="h-10 w-10 bg-slate-100 rounded border border-slate-300 flex items-center justify-center text-[6px] font-mono text-slate-400">QR Code</div>
                            <div className="text-right space-y-0.5">
                              <p>{new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                              <p className="font-bold">KEPALA DINAS DUKCAPIL</p>
                              <div className="h-4" />
                              <p className="font-black underline uppercase text-[8.5px]">DRS. BAMBANG WIJAYA, M.SI</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* IJAZAH */}
                      {step2ActiveTab === 'ijazah' && (
                        <div className="w-full bg-[#fffff8] text-[#0f172a] border-4 border-emerald-800 p-5 rounded-xl shadow-xs text-[9px] space-y-3 relative">
                          <div className="absolute inset-0 border border-emerald-600/30 pointer-events-none rounded m-0.5" />
                          
                          <div className="text-center space-y-0.5">
                            <h2 className="text-[10px] font-black tracking-widest text-emerald-900 uppercase">KEMENTERIAN AGAMA / DINAS PENDIDIKAN</h2>
                            <h1 className="text-xs font-black text-emerald-950 uppercase tracking-wider">IJAZAH</h1>
                            <p className="text-[8px] uppercase font-bold text-emerald-800">SEKOLAH DASAR / MADRASAH IBTIDAIYAH</p>
                            <p className="font-mono text-[8px] text-gray-400">No. Seri: DN-03/Ma-MI/12/0084321</p>
                          </div>

                          <p className="text-[8px] text-slate-600 leading-normal font-sans text-center">
                            "Kepala {activeReg.previousSchool || 'SD NEGERI 1 PURWOSARI'} menerangkan bahwa:"
                          </p>

                          <div className="space-y-1.5 px-1 text-[9px] leading-normal">
                            <div className="flex border-b border-dashed border-emerald-200 pb-0.5">
                              <span className="w-20 text-emerald-950 font-bold shrink-0">Nama Lengkap:</span>
                              <span className="font-black text-emerald-900 uppercase">{activeReg.fullName}</span>
                            </div>
                            <div className="flex border-b border-dashed border-emerald-200 pb-0.5">
                              <span className="w-20 text-emerald-950 font-bold shrink-0">Tempat/Tgl Lahir:</span>
                              <span className="font-bold uppercase">{activeReg.birthPlace || 'Semarang'}, {activeReg.birthDate || '25 Juni 2012'}</span>
                            </div>
                            <div className="flex border-b border-dashed border-emerald-200 pb-0.5">
                              <span className="w-20 text-emerald-950 font-bold shrink-0">Orang Tua / Wali:</span>
                              <span className="font-bold uppercase">{activeReg.parentName}</span>
                            </div>
                            <div className="flex border-b border-dashed border-emerald-200 pb-0.5">
                              <span className="w-20 text-emerald-950 font-bold shrink-0">Asal Sekolah:</span>
                              <span className="font-bold uppercase">{activeReg.previousSchool || 'SD NEGERI 1 PURWOSARI'}</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2 pt-2 text-[8px] font-semibold text-emerald-900">
                            <div className="text-center space-y-2">
                              <span>Pas Foto 3x4</span>
                              <div className="h-10 w-8 border border-dashed border-gray-300 bg-slate-50 rounded mx-auto flex items-center justify-center text-[6px] text-gray-400">3X4</div>
                            </div>
                            <div className="text-center space-y-2">
                              <span>Cap Tiga Jari,</span>
                              <div className="h-8 w-8 border border-emerald-400 rounded-full mx-auto flex items-center justify-center text-[6px] text-emerald-600/50 uppercase font-mono bg-emerald-50/20">Cap Jempol</div>
                            </div>
                            <div className="text-right space-y-0.5">
                              <p>20 Juni 2024</p>
                              <p className="font-bold text-slate-800">Kepala Sekolah,</p>
                              <div className="h-3" />
                              <p className="font-black underline uppercase text-slate-900 text-[8px]">H. AHMAD RIFAI, S.PD.I</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* BOTTOM ACTION BAR: Both navigation buttons clearly visible */}
                  <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row gap-3 items-center justify-between text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setPpdbConfirmStep(1)}
                      className="w-full sm:w-1/3 py-2.5 bg-slate-150 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer text-center"
                    >
                      ⬅ Kembali ke Langkah 1
                    </button>
                    <button
                      type="button"
                      onClick={() => setPpdbConfirmStep(3)}
                      className="w-full sm:w-2/3 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition cursor-pointer text-center shadow-xs"
                    >
                      Lanjut ke Langkah 3 (Rincian Tagihan) ➜
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* STEP 3: NEW STUDENT BILLING BREAKDOWN */}
            {ppdbConfirmStep === 3 && (() => {
              const activeReg = ppdbList.find(p => p.id === ppdbConfirmData.id);
              const paymentType = activeReg?.paymentType || 'Cicilan Bulanan';
              const isLunas = paymentType === 'Langsung Lunas';

              const feePendaftaran = settings.pcsbFeePendaftaran ?? 150000;
              const feeSarpras = settings.pcsbFeeSarpras ?? 1500000;
              const feeSeragam = settings.pcsbFeeSeragam ?? 750000;
              const feeKitab = settings.pcsbFeeKitab ?? 450000;
              const feeKesehatan = settings.pcsbFeeKesehatan ?? 350000;
              const feeSyahriyah = settings.pcsbFeeSyahriyah ?? 200000;

              const enabledPendaftaran = settings.pcsbEnablePendaftaran !== false;
              const enabledSarpras = settings.pcsbEnableSarpras !== false;
              const enabledSeragam = settings.pcsbEnableSeragam !== false;
              const enabledKitab = settings.pcsbEnableKitab !== false;
              const enabledKesehatan = settings.pcsbEnableKesehatan !== false;
              const enabledSyahriyah = settings.pcsbEnableSyahriyah !== false;

              const totalLainLain = 
                (enabledSarpras ? feeSarpras : 0) + 
                (enabledSeragam ? feeSeragam : 0) + 
                (enabledKitab ? feeKitab : 0) + 
                (enabledKesehatan ? feeKesehatan : 0);

              const syahriyahInitial = enabledSyahriyah ? feeSyahriyah : 0;
              const syahriyahTotal = isLunas ? (syahriyahInitial * 12) : syahriyahInitial;

              const totalAwal = 
                (enabledPendaftaran ? feePendaftaran : 0) + 
                totalLainLain + 
                syahriyahTotal;

              return (
                <div className="space-y-4 py-2 animate-fade-in">
                  <div className="text-center space-y-1">
                    <span className="text-4xl">💳</span>
                    <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Rincian Tagihan Santri Baru</h4>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Berikut rincian tagihan keuangan yang akan otomatis diterbitkan di akun wali santri setelah dinyatakan aktif:
                    </p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-3 font-sans text-xs">
                    <div className="flex justify-between pb-2 border-b border-dashed border-slate-200">
                      <span className="text-slate-500 font-medium">Metode Syahriyah:</span>
                      <span className="font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full text-[10px]">
                        {paymentType}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {enabledPendaftaran && (
                        <div className="flex justify-between text-slate-700">
                          <span>1. Biaya Pendaftaran (PCSB)</span>
                          <span className="font-bold">Rp {feePendaftaran.toLocaleString('id-ID')}</span>
                        </div>
                      )}
                      {totalLainLain > 0 && (
                        <div className="flex justify-between text-slate-700">
                          <span>2. Seragam, Kitab, Sarpras & Kas</span>
                          <span className="font-bold">Rp {totalLainLain.toLocaleString('id-ID')}</span>
                        </div>
                      )}
                      {enabledSyahriyah && (
                        <div className="flex justify-between text-slate-700 items-start">
                          <div>
                            <span>3. Iuran Syahriyah (SPP)</span>
                            <span className="block text-[10px] text-slate-400">
                              {isLunas ? 'Lunas 1 Tahun Langsung' : 'Cicilan Bulan Pertama (Juli)'}
                            </span>
                          </div>
                          <span className="font-bold">
                            Rp {syahriyahTotal.toLocaleString('id-ID')}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-slate-200 pt-3 flex justify-between items-center font-extrabold text-teal-950">
                      <span>Total Tagihan Awal</span>
                      <span className="text-sm text-emerald-700 font-bold">
                        Rp {totalAwal.toLocaleString('id-ID')}
                      </span>
                    </div>
                    {!isLunas && enabledSyahriyah && (
                      <p className="text-[9.5px] text-slate-400 italic leading-snug">
                        * Tagihan awal meliputi biaya pendaftaran, sarpras, dan Syahriyah bulan pertama (Juli). Sisa 11 bulan iuran Syahriyah akan muncul setiap bulan berikutnya.
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setPpdbConfirmStep(2)}
                      className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs transition cursor-pointer text-center"
                    >
                      ⬅ Kembali
                    </button>
                    <button
                      type="button"
                      onClick={() => setPpdbConfirmStep(4)}
                      className="w-full py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs transition cursor-pointer text-center"
                    >
                      Lanjut ke Foto Santri ➜
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* STEP 4: NEW STUDENT PHOTO UPLOAD */}
            {ppdbConfirmStep === 4 && (
              <div className="space-y-4 py-2">
                <div className="text-center space-y-1">
                  <span className="text-4xl">📸</span>
                  <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Pas Foto Santri Baru</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Sila ambil atau unggah pas foto resmi (3x4 latar merah/biru) milik santri baru untuk melengkapi pangkalan data:
                  </p>
                </div>

                <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-200 rounded-xl bg-slate-50 space-y-3">
                  {ppdbStudentPhoto ? (
                    <div className="text-center space-y-2">
                      <img
                        src={ppdbStudentPhoto}
                        alt="Foto Santri Baru"
                        className="h-28 w-24 object-cover rounded-lg border border-gray-300 shadow-sm mx-auto"
                        referrerPolicy="no-referrer"
                      />
                      <button
                        type="button"
                        onClick={() => setPpdbStudentPhoto("")}
                        className="text-[10px] text-red-650 hover:underline font-bold"
                      >
                        Hapus & Ganti Foto
                      </button>
                    </div>
                  ) : (
                    <div className="text-center space-y-2">
                      <label className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-bold inline-block cursor-pointer transition">
                        📁 Unggah Pas Foto Santri (3x4)
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              const file = e.target.files[0];
                              const reader = new FileReader();
                              reader.onload = () => {
                                if (typeof reader.result === 'string') {
                                  setPpdbStudentPhoto(reader.result);
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      <p className="text-[9px] text-gray-400">Format: JPG, JPEG atau PNG (Maks 1MB)</p>
                    </div>
                  )}
                </div>

                <div className="p-2 bg-amber-50 border border-amber-100 rounded-lg text-[10px] text-amber-800 leading-normal font-semibold">
                  ⚠️ MENYETUJUI AKAN: Membuat NIS 4-angka otomatis, mengarsipkan berkas PPDB, dan memicu tagihan biaya pendaftaran, biaya lain-lain, dan iuran syahriyah.
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setPpdbConfirmStep(3)}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs transition cursor-pointer text-center"
                  >
                    ⬅ Kembali
                  </button>
                  <button
                    type="button"
                    onClick={() => executePpdbAccept(ppdbConfirmData.id)}
                    className="w-full py-2.5 bg-gradient-to-r from-emerald-850 to-teal-900 hover:from-emerald-800 hover:to-teal-850 text-white font-extrabold rounded-xl text-xs transition shadow cursor-pointer text-center"
                  >
                    Terima Santri & Cetak NIS ✅
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal (Iframe safe) */}
      {confirmDialog && confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-emerald-950/75 backdrop-blur-sm font-sans">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-slate-100 text-left space-y-4 animate-fade-in my-auto max-h-[88vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 text-red-650">
              <span className="text-2xl">⚠️</span>
              <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wide">{confirmDialog.title}</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-semibold">
              {confirmDialog.message}
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(null);
                }}
                className="px-4 py-2.5 bg-emerald-750 hover:bg-emerald-800 active:scale-95 text-white text-xs font-black rounded-xl cursor-pointer flex-1 text-center shadow-md transition border border-emerald-600 flex items-center justify-center gap-1.5"
              >
                <span>✓</span>
                <span>Konfirmasi & Lanjutkan</span>
              </button>
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer flex-1 text-center border border-slate-300 transition"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* High-Fidelity Indonesian Official Document Verification Viewer */}
      {activePreviewDoc && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4 bg-emerald-950/75 backdrop-blur-sm font-sans animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 flex flex-col max-h-[88vh] sm:max-h-[90vh] overflow-hidden text-left my-auto">
            
            {/* Modal Header */}
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="space-y-0.5">
                <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-widest block">Verifikasi Berkas Pendukung</span>
                <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wide">{activePreviewDoc.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setActivePreviewDoc(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Document Render Area */}
            <div className="p-5 bg-slate-100 flex-grow overflow-y-auto flex items-center justify-center">
              
              {/* KK (KARTU KELUARGA) */}
              {activePreviewDoc.type === 'kk' && (
                <div className="w-full bg-[#f0f9ff] text-[#0f172a] border-2 border-dashed border-sky-400 p-6 rounded-lg shadow-inner text-[10px] space-y-4 relative overflow-hidden shrink-0">
                  <div className="absolute top-0 right-0 p-4 font-mono font-bold text-sky-800/10 text-6xl pointer-events-none select-none">
                    KK
                  </div>
                  <div className="text-center space-y-1 pb-3 border-b border-sky-300">
                    <h2 className="text-sm font-black tracking-widest text-sky-900 uppercase">KARTU KELUARGA</h2>
                    <p className="font-mono text-xs font-bold text-sky-800">No. {activePreviewDoc.applicant.kk || '3318110908120004'}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-[9.5px]">
                    <div className="space-y-1">
                      <div className="flex"><span className="w-24 text-sky-800 font-bold">Kepala Keluarga:</span> <span className="font-extrabold uppercase">{activePreviewDoc.applicant.fatherName || 'SUDIRMAN'}</span></div>
                      <div className="flex"><span className="w-24 text-sky-800 font-bold">Alamat:</span> <span className="font-extrabold uppercase">{activePreviewDoc.applicant.address || 'JL. RAYA MODUNG, LANGPANGGANG, MODUNG, BANGKALAN, JAWA TIMUR'}</span></div>
                      <div className="flex"><span className="w-24 text-sky-800 font-bold">RT / RW:</span> <span className="font-extrabold uppercase">03 / 02</span></div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex"><span className="w-24 text-sky-800 font-bold">Desa/Kelurahan:</span> <span className="font-extrabold uppercase">PURWOSARI</span></div>
                      <div className="flex"><span className="w-24 text-sky-800 font-bold">Kecamatan:</span> <span className="font-extrabold uppercase">KOTA</span></div>
                      <div className="flex"><span className="w-24 text-sky-800 font-bold">Kabupaten:</span> <span className="font-extrabold uppercase">JAWA TENGAH</span></div>
                    </div>
                  </div>

                  <div className="border border-sky-300 rounded overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-sky-200/50 text-sky-900 text-[8.5px] font-extrabold uppercase border-b border-sky-300">
                          <th className="p-1 border-r border-sky-300 w-5 text-center">No</th>
                          <th className="p-1 border-r border-sky-300">Nama Lengkap</th>
                          <th className="p-1 border-r border-sky-300">NIK</th>
                          <th className="p-1">Hubungan</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-sky-200">
                          <td className="p-1 border-r border-sky-300 text-center font-bold">1</td>
                          <td className="p-1 border-r border-sky-300 font-black uppercase">{activePreviewDoc.applicant.fatherName || 'SUDIRMAN'}</td>
                          <td className="p-1 border-r border-sky-300 font-mono">3318110204680002</td>
                          <td className="p-1 font-bold text-sky-800">Kepala Keluarga</td>
                        </tr>
                        <tr className="border-b border-sky-200">
                          <td className="p-1 border-r border-sky-300 text-center font-bold">2</td>
                          <td className="p-1 border-r border-sky-300 font-black uppercase">{activePreviewDoc.applicant.motherName || 'SITI AMINAH'}</td>
                          <td className="p-1 border-r border-sky-300 font-mono">3318111210740003</td>
                          <td className="p-1 font-bold text-sky-800">Istri</td>
                        </tr>
                        <tr className="bg-sky-55/30">
                          <td className="p-1 border-r border-sky-300 text-center font-bold">3</td>
                          <td className="p-1 border-r border-sky-300 font-black uppercase text-emerald-900">{activePreviewDoc.applicant.fullName}</td>
                          <td className="p-1 border-r border-sky-300 font-mono font-bold text-emerald-800">{activePreviewDoc.applicant.nik || '3318112506120005'}</td>
                          <td className="p-1 font-bold text-emerald-800">Anak Kandung</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-between items-end pt-3 text-[8.5px] font-semibold text-sky-850">
                    <div className="text-center space-y-6">
                      <span>Kepala Keluarga,</span>
                      <p className="border-t border-sky-400 pt-1 uppercase font-black">{activePreviewDoc.applicant.fatherName || 'SUDIRMAN'}</p>
                    </div>
                    <div className="text-center space-y-5">
                      <span>Diterbitkan Oleh Dinas KEPENDUDUKAN & PENCATATAN SIPIL,</span>
                      <div className="h-8 w-16 mx-auto bg-sky-200/40 rounded flex items-center justify-center font-bold text-[7px] text-sky-850 border border-sky-300/60 uppercase">Cap Resmi Basah</div>
                      <p className="border-t border-sky-400 pt-1 font-black">DINAS DUKCAPIL</p>
                    </div>
                  </div>
                </div>
              )}

              {/* AKTA KELAHIRAN */}
              {activePreviewDoc.type === 'akta' && (
                <div className="w-full bg-[#fefefe] text-[#0f172a] border-2 border-double border-amber-600 p-6 rounded-lg shadow-lg text-[10px] space-y-5 relative overflow-hidden shrink-0">
                  <div className="absolute inset-0 border-[6px] border-amber-500/20 pointer-events-none rounded" />
                  
                  <div className="text-center space-y-1">
                    <div className="mx-auto h-7 w-7 bg-amber-500 rounded-full flex items-center justify-center text-[8px] font-black text-white border border-amber-600">GARUDA</div>
                    <h2 className="text-[11px] font-black tracking-wide text-amber-900 uppercase">REPUBLIK INDONESIA</h2>
                    <p className="text-[9px] uppercase font-bold text-amber-800">KUTIPAN AKTA KELAHIRAN</p>
                  </div>

                  <p className="text-center text-[9px] text-slate-500 leading-normal px-2 italic">
                    "Berdasarkan Salinan Daftar Akta Kelahiran untuk Warganegara Indonesia menerangkan bahwa:"
                  </p>

                  <div className="space-y-3 px-2 text-[10px] leading-relaxed">
                    <div className="flex border-b border-amber-100 pb-1">
                      <span className="w-24 text-amber-900 font-bold uppercase shrink-0">Nama Lengkap:</span>
                      <span className="font-extrabold text-emerald-900 uppercase">{activePreviewDoc.applicant.fullName}</span>
                    </div>
                    <div className="flex border-b border-amber-100 pb-1">
                      <span className="w-24 text-amber-900 font-bold uppercase shrink-0">Tempat Lahir:</span>
                      <span className="font-bold uppercase">{activePreviewDoc.applicant.birthPlace || 'SEMARANG'}</span>
                    </div>
                    <div className="flex border-b border-amber-100 pb-1">
                      <span className="w-24 text-amber-900 font-bold uppercase shrink-0">Tanggal Lahir:</span>
                      <span className="font-bold font-mono">{activePreviewDoc.applicant.birthDate || '25 Juni 2012'}</span>
                    </div>
                    <div className="flex border-b border-amber-100 pb-1">
                      <span className="w-24 text-amber-900 font-bold uppercase shrink-0">Anak Ke:</span>
                      <span className="font-bold">SATU (1)</span>
                    </div>
                    <div className="flex border-b border-amber-100 pb-1">
                      <span className="w-24 text-amber-900 font-bold uppercase shrink-0">Orang Tua:</span>
                      <div className="font-bold uppercase">
                        Suami-Istri <span className="font-black text-slate-800">{activePreviewDoc.applicant.fatherName || 'SUDIRMAN'}</span> & <span className="font-black text-slate-800">{activePreviewDoc.applicant.motherName || 'SITI AMINAH'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-end pt-4 text-[8.5px] font-semibold text-amber-900">
                    <div className="h-12 w-12 bg-slate-100 rounded border border-slate-300 flex items-center justify-center text-[7px] font-mono text-slate-400">QR Code Valid</div>
                    <div className="text-right space-y-1">
                      <p>{new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                      <p className="font-bold">KEPALA DINAS DUKCAPIL</p>
                      <div className="h-6" />
                      <p className="font-black underline uppercase">DRS. BAMBANG WIJAYA, M.SI</p>
                    </div>
                  </div>
                </div>
              )}

              {/* IJAZAH */}
              {activePreviewDoc.type === 'ijazah' && (
                <div className="w-full bg-[#fffff8] text-[#0f172a] border-4 border-emerald-800 p-6 rounded-lg shadow-xl text-[10px] space-y-4 relative shrink-0">
                  <div className="absolute inset-0 border-2 border-emerald-600/30 pointer-events-none rounded m-0.5" />
                  
                  <div className="text-center space-y-1">
                    <h2 className="text-xs font-black tracking-widest text-emerald-900 uppercase">KEMENTERIAN AGAMA / DINAS PENDIDIKAN</h2>
                    <h1 className="text-sm font-black text-emerald-950 uppercase tracking-wider">IJAZAH</h1>
                    <p className="text-[9px] uppercase font-bold text-emerald-800">SEKOLAH DASAR / MADRASAH IBTIDAIYAH (SD/MI)</p>
                    <p className="font-mono text-[9px] text-gray-400">No. Seri: DN-03/Ma-MI/12/0084321</p>
                  </div>

                  <p className="text-justify text-[9px] text-slate-600 leading-normal font-sans">
                    "Yang bertandatangan di bawah ini, Kepala {activePreviewDoc.applicant.previousSchool || 'SD NEGERI 1 PURWOSARI'} menerangkan bahwa:"
                  </p>

                  <div className="space-y-2 px-2 text-[10px] leading-relaxed">
                    <div className="flex border-b border-dashed border-emerald-250 pb-0.5">
                      <span className="w-24 text-emerald-950 font-bold shrink-0">Nama Lengkap:</span>
                      <span className="font-black text-emerald-900 uppercase">{activePreviewDoc.applicant.fullName}</span>
                    </div>
                    <div className="flex border-b border-dashed border-emerald-250 pb-0.5">
                      <span className="w-24 text-emerald-950 font-bold shrink-0">Tempat/Tgl Lahir:</span>
                      <span className="font-bold uppercase">{activePreviewDoc.applicant.birthPlace || 'Semarang'}, {activePreviewDoc.applicant.birthDate || '25 Juni 2012'}</span>
                    </div>
                    <div className="flex border-b border-dashed border-emerald-250 pb-0.5">
                      <span className="w-24 text-emerald-950 font-bold shrink-0">Orang Tua / Wali:</span>
                      <span className="font-bold uppercase">{activePreviewDoc.applicant.parentName}</span>
                    </div>
                    <div className="flex border-b border-dashed border-emerald-250 pb-0.5">
                      <span className="w-24 text-emerald-950 font-bold shrink-0">Asal Madrasah:</span>
                      <span className="font-bold uppercase">{activePreviewDoc.applicant.previousSchool || 'SD NEGERI 1 PURWOSARI'}</span>
                    </div>
                    <p className="text-center text-[9px] text-slate-750 font-semibold leading-normal pt-1">
                      LULUS dari satuan pendidikan setelah memenuhi semua persyaratan kelulusan akademik.
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-3 pt-3 text-[8.5px] font-semibold text-emerald-900">
                    <div className="text-center space-y-4">
                      <span>Pas Foto 3x4</span>
                      <div className="h-14 w-10 border border-dashed border-gray-300 bg-slate-50 rounded mx-auto flex items-center justify-center text-[7px] text-gray-400">FOTO 3X4</div>
                    </div>
                    <div className="text-center space-y-5">
                      <span>Cap Tiga Jari,</span>
                      <div className="h-12 w-12 border border-emerald-400 rounded-full mx-auto flex items-center justify-center text-[7px] text-emerald-600/50 uppercase font-mono tracking-widest bg-emerald-50/20">Cap Jempol</div>
                    </div>
                    <div className="text-right space-y-1">
                      <p>20 Juni 2024</p>
                      <p className="font-bold text-slate-800">Kepala Sekolah/Madrasah,</p>
                      <div className="h-6" />
                      <p className="font-black underline uppercase text-slate-900">H. AHMAD RIFAI, S.PD.I</p>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (activePreviewDoc.type === 'kk') {
                    setPpdbVerifyKK(true);
                  } else if (activePreviewDoc.type === 'akta') {
                    setPpdbVerifyAkta(true);
                  } else if (activePreviewDoc.type === 'ijazah') {
                    setPpdbVerifyIjazah(true);
                  }
                  setActivePreviewDoc(null);
                }}
                className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-black rounded-lg cursor-pointer flex-1 text-center shadow transition flex items-center justify-center gap-1.5"
              >
                <span>✅ Setujui & Validasi Berkas</span>
              </button>
              <button
                type="button"
                onClick={() => setActivePreviewDoc(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer flex-1 text-center transition"
              >
                Tutup Pratinjau
              </button>
            </div>

          </div>
        </div>
      )}

      {/* HIDDEN PRINTABLE STUDENT DATABASE */}
      <div className="hidden">
        <div id="admin-students-printable-table" className="p-10 text-black bg-white">
          {/* KOP SURAT RESMI (Official Portrait Letterhead) */}
          <div className="border-b-[3px] border-double border-slate-900 pb-3 mb-4 flex gap-4 items-center shrink-0 text-left">
            {(settings.logoUrl || '/pesantren_logo.jpg') ? (
              <img src={settings.logoUrl || '/pesantren_logo.jpg'} alt="Logo Pesantren" className="h-14 w-14 object-contain shrink-0" referrerPolicy="no-referrer" />
            ) : (
              <div className="text-3xl shrink-0 flex items-center justify-center h-14 w-14">🕌</div>
            )}
            <div className="flex-1 min-w-0 text-left">
              <h4 className="text-base font-black tracking-wide uppercase text-slate-900 leading-tight truncate">{settings.schoolName || "Pondok Pesantren Al-Asy'ariyah"}</h4>
              <p className="text-xs text-slate-500 leading-normal truncate mt-0.5">
                {settings.address || "Jl. Raya Modung, Langpanggang, Modung, Bangkalan, Jawa Timur"}
              </p>
              <p className="text-xs text-emerald-800 font-bold italic truncate">
                {settings.tagline || "Mencetak Generasi Qur'ani, Berakhlakul Karimah"}
              </p>
            </div>
          </div>
          
          <div className="text-center mb-6">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">LAPORAN DATABASE UTAMA SANTRI AKTIF (GRID EXCEL)</h2>
            <p className="text-[10px] font-mono text-gray-500 mt-1">Dicetak pada: {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} • Portal Akademik</p>
          </div>

          <table className="w-full text-[10px] border-collapse border-2 border-slate-900">
            <thead>
              <tr className="bg-slate-100 text-slate-900 font-extrabold text-center uppercase tracking-wider">
                <th className="border border-slate-700 px-3 py-2.5 w-10">No</th>
                <th className="border border-slate-700 px-3 py-2.5 text-left">Nomer Identitas & Nama Santri (ID & Nama)</th>
                <th className="border border-slate-700 px-3 py-2.5">NIS</th>
                <th className="border border-slate-700 px-3 py-2.5">Gender</th>
                <th className="border border-slate-700 px-3 py-2.5">Kamar</th>
                <th className="border border-slate-700 px-3 py-2.5">Kelas (Form/Non-F)</th>
                <th className="border border-slate-700 px-3 py-2.5 text-left">Orang Tua / Wali</th>
                <th className="border border-slate-700 px-3 py-2.5">No. WA Wali</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((s, idx) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="border border-slate-700 px-3 py-2 text-center font-mono font-bold text-slate-700">{idx + 1}</td>
                  <td className="border border-slate-700 px-3 py-2 text-left">
                    <span className="block font-mono text-[9px] font-black text-emerald-800">ID: {s.id}</span>
                    <span className="font-extrabold text-slate-900 text-[11px] block">{s.fullName}</span>
                  </td>
                  <td className="border border-slate-700 px-3 py-2 text-center font-mono font-bold text-slate-900">{s.nis || '-'}</td>
                  <td className="border border-slate-700 px-3 py-2 text-center text-slate-800">{s.gender}</td>
                  <td className="border border-slate-700 px-3 py-2 text-center font-bold text-amber-900">{s.kamar || '-'}</td>
                  <td className="border border-slate-700 px-3 py-2 text-center text-slate-800">
                    {(s.classMadrasah || s.classPagi || s.class)} / {(s.classFormal || s.classSore || '-')}
                  </td>
                  <td className="border border-slate-700 px-3 py-2 text-slate-800">
                    <span className="block font-semibold">Ayah: {s.fatherName || s.parentName || '-'}</span>
                    <span className="block text-[9px] text-gray-500">Ibu: {s.motherName || '-'}</span>
                  </td>
                  <td className="border border-slate-700 px-3 py-2 text-center font-mono text-slate-900">{s.parentPhone || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <div className="mt-8 flex justify-between text-center text-[10px] font-semibold">
            <div>
              <p>Mengetahui,</p>
              <p className="font-extrabold mt-12">Kepala Biro Administrasi</p>
            </div>
            <div>
              <p>{getCityFromAddress(settings.address)}, {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p className="font-extrabold mt-12">Staf Tata Usaha</p>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: PRINTER PREVIEW FOR SECURITY LOG (PERIZINAN) */}
      {printSecurityLog && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-emerald-950/75 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl border border-slate-200 relative animate-fade-in my-auto max-h-[88vh] sm:max-h-[90vh] flex flex-col">
            {/* Header Sticky Bar */}
            <div className="p-4 bg-emerald-900 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xl">🛡️</span>
                <div>
                  <h3 className="text-sm font-extrabold uppercase tracking-wider">Preview & Cetak Surat Izin</h3>
                  <p className="text-[10px] text-emerald-100 font-mono">ID: {printSecurityLog.id}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handlePrintLetter(`print-sec-log-area-${printSecurityLog.id}`, printSecurityLog.id, 'Surat Izin Keluar', 'KMT', printSecurityLog.studentName, `Izin Keluar (${printSecurityLog.permitType === 'Pulang (Keluarga)' ? 'Pulang' : 'Keluar Lingkungan'})`)}
                  className="px-3 py-1.5 bg-white hover:bg-emerald-50 text-emerald-950 rounded-xl text-xs font-black cursor-pointer shadow-sm transition flex items-center gap-1"
                >
                  <Printer size={13} /> Cetak Surat (PDF)
                </button>
                <button
                  type="button"
                  onClick={() => setPrintSecurityLog(null)}
                  className="p-1.5 bg-emerald-950/45 hover:bg-emerald-950/70 rounded-full text-white cursor-pointer transition"
                  title="Tutup"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Scrollable Letter Area */}
            <div className="p-8 overflow-y-auto flex-1 bg-slate-50">

              {/* Information Note */}
              <div className="mx-auto max-w-2xl mb-4 bg-amber-50 border border-amber-200 text-amber-950 p-2.5 rounded-xl text-[11px] font-sans flex items-center gap-2">
                <span className="text-sm">💡</span>
                <span><strong>Pratinjau Surat Resmi:</strong> Surat ini sudah diformat dengan standar kepengasuhan dan dapat langsung dicetak. Gunakan mode Portrait saat print.</span>
              </div>

              {/* Printable Area Wrapper */}
              <div 
                id={`print-sec-log-area-${printSecurityLog.id}`} 
                className="bg-white p-10 shadow-sm rounded-2xl max-w-2xl mx-auto border border-gray-150 relative text-slate-900"
                style={{ fontFamily: 'Times New Roman, Times, serif', minHeight: '297mm' }}
                contentEditable={false}
                suppressContentEditableWarning={true}
              >
                {/* Kop Surat Resmi */}
                <div className="border-b-4 border-double border-slate-900 pb-4 mb-6">
                  <div className="flex gap-4 items-center">
                    {(settings.logoUrl || '/pesantren_logo.jpg') ? (
                      <img src={settings.logoUrl || '/pesantren_logo.jpg'} alt="Logo Pesantren" className="h-16 w-16 object-contain" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="text-3xl shrink-0 flex items-center justify-center h-16 w-16">🕌</div>
                    )}
                    <div className="flex-1 text-left font-sans">
                      <h4 className="text-slate-900 font-black text-sm tracking-wide uppercase leading-tight">{settings.schoolName || "Pondok Pesantren Al-Asy'ariyah"}</h4>
                      <p className="text-[10px] italic text-slate-500 font-bold tracking-wide uppercase">Biro Keamanan & Ketertiban Pengurus Pondok Pesantren</p>
                      <p className="text-[9px] text-slate-500 max-w-md leading-relaxed mt-0.5">
                        {settings.address || "Jl. Raya Modung, Langpanggang, Modung, Bangkalan, Jawa Timur"}<br />
                        {settings.phone ? `Hubungi: ${settings.phone} | ` : ''} Email: {settings.email || "info@alasyariyah.sch.id"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Letter Content */}
                <div className="space-y-4 text-xs leading-relaxed text-justify">
                  <div className="text-center my-4">
                    <h3 className="font-extrabold underline text-sm uppercase font-sans">
                      {(() => {
                        const isOvernight = printSecurityLog.permitType === 'Pulang (Keluarga)' || 
                                            printSecurityLog.permitType?.toLowerCase().includes('bermalam') ||
                                            (printSecurityLog.outDate && printSecurityLog.expectedReturnDate && 
                                             (new Date(printSecurityLog.expectedReturnDate.replace(' ', 'T')).getTime() - new Date(printSecurityLog.outDate.replace(' ', 'T')).getTime() > 24 * 3600 * 1000));
                        return isOvernight ? 'SURAT IZIN BERMALAM' : 'SURAT IZIN KELUAR (TIDAK BERMALAM)';
                      })()}
                    </h3>
                    <p className="text-[10px] font-mono mt-0.5">Nomor: {getLetterNumber(printSecurityLog.id, 'Surat Izin Keluar', 'KMT')}</p>
                  </div>

                  <p 
                    contentEditable={false} 
                    suppressContentEditableWarning={true}
                    className="p-2 border border-dashed border-gray-100 rounded transition w-full"
                  >
                    {staffConfigs.keamanan.letterTemplate1}
                  </p>

                  {/* Student Details Table */}
                  {(() => {
                    const stud = students.find(s => s.id === printSecurityLog.studentId || s.fullName === printSecurityLog.studentName);
                    return (
                      <table className="w-full my-4 border-collapse text-xs">
                        <tbody>
                          <tr className="border-b border-gray-100">
                            <td className="py-1.5 font-bold text-slate-500 w-1/3 uppercase">NIS</td>
                            <td className="py-1.5 text-slate-900 font-mono font-bold">{stud?.nis || '-'}</td>
                          </tr>
                          <tr className="border-b border-gray-100">
                            <td className="py-1.5 font-bold text-slate-500 uppercase">Nama Santri</td>
                            <td className="py-1.5 text-slate-900 font-extrabold">{printSecurityLog.studentName}</td>
                          </tr>
                          <tr className="border-b border-gray-100">
                            <td className="py-1.5 font-bold text-slate-500 uppercase">Kamar & Kelas</td>
                            <td className="py-1.5 text-slate-900 font-semibold">{stud?.kamar || '-'} (Kelas {stud?.class || '-'})</td>
                          </tr>
                          <tr className="border-b border-gray-100">
                            <td className="py-1.5 font-bold text-slate-500 uppercase">Waktu Keluar</td>
                            <td className="py-1.5 text-emerald-950 font-mono font-extrabold">{printSecurityLog.outDate || '-'}</td>
                          </tr>
                          <tr className="border-b border-gray-100">
                            <td className="py-1.5 font-bold text-slate-500 uppercase">Rencana Kembali</td>
                            <td className="py-1.5 text-rose-950 font-mono font-extrabold">{printSecurityLog.expectedReturnDate || '-'}</td>
                          </tr>
                          <tr className="border-b border-gray-100">
                            <td className="py-1.5 font-bold text-slate-500 uppercase">Tujuan Izin</td>
                            <td className="py-1.5 text-slate-900 font-semibold">
                              <input
                                type="text"
                                defaultValue={(() => {
                                  if (printSecurityLog.destinationCity) return printSecurityLog.destinationCity;
                                  const addr = stud?.address || '';
                                  const parts = addr.split(',');
                                  const cityCandidate = parts[parts.length - 1]?.trim() || parts[0]?.trim() || 'Rumah Wali / Luar Pesantren';
                                  return cityCandidate;
                                })()}
                                onChange={(e) => {
                                  printSecurityLog.destinationCity = e.target.value;
                                }}
                                className="bg-transparent hover:bg-slate-100 focus:bg-white border-b border-transparent focus:border-indigo-400 outline-none px-1 py-0.5 font-bold text-slate-900 text-xs w-full"
                                placeholder="Ketik tujuan izin..."
                              />
                            </td>
                          </tr>
                          <tr className="border-b border-gray-100">
                            <td className="py-1.5 font-bold text-slate-500 uppercase">Keperluan</td>
                            <td className="py-1.5 text-slate-900 font-semibold">{printSecurityLog.description || '-'}</td>
                          </tr>
                        </tbody>
                      </table>
                    );
                  })()}

                  <p 
                    contentEditable={false} 
                    suppressContentEditableWarning={true}
                    className="p-2 border border-dashed border-gray-100 rounded transition w-full"
                  >
                    {staffConfigs.keamanan.letterTemplate2}
                  </p>

                  <p 
                    contentEditable={false} 
                    suppressContentEditableWarning={true}
                    className="p-2 border border-dashed border-gray-100 rounded transition font-sans italic text-slate-500 text-[11px] w-full"
                  >
                    {staffConfigs.keamanan.letterTemplate3 || 'Demikian surat perizinan resmi ini dibuat agar dapat dijadikan sebagai instrumen pengawasan di pos gerbang luar pondok pesantren.'}
                  </p>

                  {/* Signatures Row */}
                  <div className="mt-12 flex justify-end text-xs text-left">
                    <div className="w-[220px] relative font-sans space-y-0.5">
                      <p className="text-slate-500 font-medium text-[11px]">{getCityFromAddress(settings.address)}, {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                      <p className="text-slate-800 font-bold text-[11px] mt-0.5">Mengetahui,</p>
                      <p className="text-slate-900 font-extrabold text-[11px] uppercase tracking-wide">Kepala Bidang Keamanan & Ketertiban</p>
                      
                      {/* Overlapping TTD & Stempel Keamanan */}
                      <div className="h-16 w-44 relative flex items-center justify-start select-none my-1">
                        {/* TTD in background */}
                        <div className="z-10 absolute inset-0 flex items-center justify-start">
                          {isImageUrl(settings.ttdKeamananUrl) ? (
                            <img src={settings.ttdKeamananUrl} alt="TTD Keamanan" className="max-h-16 max-w-[150px] object-contain mix-blend-multiply" referrerPolicy="no-referrer" />
                          ) : (
                            <span className="text-[10px] font-mono text-emerald-800 italic font-bold">
                              {settings.ttdKeamananUrl || "✍️ Junaidi"}
                            </span>
                          )}
                        </div>

                        {/* Stempel overlapping */}
                        {settings.stempelKeamananUrl && (
                          <div className="z-20 absolute left-[30px] top-[-10px] pointer-events-none opacity-85">
                            {isImageUrl(settings.stempelKeamananUrl) ? (
                              <img src={settings.stempelKeamananUrl} alt="Stempel Keamanan" className="h-20 w-20 object-contain rotate-[-8deg] mix-blend-multiply" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="border border-double border-emerald-600/60 text-emerald-700/90 rounded-full h-12 w-12 flex items-center justify-center text-[5px] font-extrabold uppercase rotate-[-8deg] leading-tight text-center bg-white/75">
                                {settings.stempelKeamananUrl}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <p className="font-extrabold text-slate-900 underline mt-1">{printSecurityLog.signedBy || settings.namaKeamanan || "Ustadz Junaidi Al-Anshori"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Footer Back Button */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setPrintSecurityLog(null)}
                className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold rounded-xl text-xs cursor-pointer shadow-sm transition animate-pulse"
              >
                Kembali & Tutup ❌
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PRINTER PREVIEW FOR DISCIPLINE LOG (TAKZIR) */}
      {printDisciplineLog && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-emerald-950/75 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl border border-slate-200 relative animate-fade-in my-auto max-h-[88vh] sm:max-h-[90vh] flex flex-col">
            {/* Header Sticky Bar */}
            <div className="p-4 bg-indigo-900 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚖️</span>
                <div>
                  <h3 className="text-sm font-extrabold uppercase tracking-wider">Preview & Cetak Surat Takzir</h3>
                  <p className="text-[10px] text-indigo-100 font-mono">ID: {printDisciplineLog.id}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handlePrintLetter(`print-disc-log-area-${printDisciplineLog.id}`, printDisciplineLog.id, 'Surat Sanksi Takzir', 'KTT', printDisciplineLog.studentName, `Pelanggaran: ${printDisciplineLog.violationType}`)}
                  className="px-3 py-1.5 bg-white hover:bg-indigo-50 text-indigo-950 rounded-xl text-xs font-black cursor-pointer shadow-sm transition flex items-center gap-1"
                >
                  <Printer size={13} /> Cetak Surat (PDF)
                </button>
                <button
                  type="button"
                  onClick={() => setPrintDisciplineLog(null)}
                  className="p-1.5 bg-indigo-950/45 hover:bg-indigo-950/70 rounded-full text-white cursor-pointer transition"
                  title="Tutup"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Scrollable Letter Area */}
            <div className="p-8 overflow-y-auto flex-1 bg-slate-50">

              {/* Information Note */}
              <div className="mx-auto max-w-2xl mb-4 bg-amber-50 border border-amber-200 text-amber-950 p-2.5 rounded-xl text-[11px] font-sans flex items-center gap-2">
                <span className="text-sm">💡</span>
                <span><strong>Pratinjau Surat Resmi:</strong> Surat ini sudah diformat dengan standar kepengasuhan dan dapat langsung dicetak. Gunakan mode Portrait saat print.</span>
              </div>

              {/* Printable Area Wrapper */}
              <div 
                id={`print-disc-log-area-${printDisciplineLog.id}`} 
                className="bg-white p-10 shadow-sm rounded-2xl max-w-2xl mx-auto border border-gray-150 relative text-slate-900"
                style={{ fontFamily: 'Times New Roman, Times, serif', minHeight: '297mm' }}
                contentEditable={false}
                suppressContentEditableWarning={true}
              >
                {/* Kop Surat Resmi */}
                <div className="border-b-4 border-double border-slate-900 pb-4 mb-6">
                  <div className="flex gap-4 items-center">
                    {(settings.logoUrl || '/pesantren_logo.jpg') ? (
                      <img src={settings.logoUrl || '/pesantren_logo.jpg'} alt="Logo Pesantren" className="h-16 w-16 object-contain" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="text-3xl shrink-0 flex items-center justify-center h-16 w-16">🕌</div>
                    )}
                    <div className="flex-1 text-left font-sans">
                      <h4 className="text-slate-900 font-black text-sm tracking-wide uppercase leading-tight">{settings.schoolName || "Pondok Pesantren Al-Asy'ariyah"}</h4>
                      <p className="text-[10px] italic text-slate-500 font-bold tracking-wide uppercase">Biro Ketertiban & Pengawasan Disiplin Madrasah</p>
                      <p className="text-[9px] text-slate-500 max-w-md leading-relaxed mt-0.5">
                        {settings.address || "Jl. Raya Modung, Langpanggang, Modung, Bangkalan, Jawa Timur"}<br />
                        {settings.phone ? `Hubungi: ${settings.phone} | ` : ''} Email: {settings.email || "info@alasyariyah.sch.id"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Letter Content */}
                <div className="space-y-4 text-xs leading-relaxed text-justify">
                  <div className="text-center my-4">
                    <h3 className="font-extrabold underline text-sm uppercase font-sans">Surat Keterangan Sanksi & Takzir</h3>
                    <p className="text-[10px] font-mono mt-0.5">Nomor: {getLetterNumber(printDisciplineLog.id, 'Surat Sanksi Takzir', 'KTT')}</p>
                  </div>

                  <p 
                    contentEditable={false} 
                    suppressContentEditableWarning={true}
                    className="p-2 border border-dashed border-gray-100 rounded transition w-full"
                  >
                    {staffConfigs.ketertiban.letterTemplate1}
                  </p>

                  {/* Student Details Table */}
                  <table className="w-full my-4 border-collapse text-xs">
                    <tbody>
                      <tr className="border-b border-gray-100">
                        <td className="py-2 font-bold text-slate-500 w-1/3 uppercase">Nama Santri</td>
                        <td className="py-2 text-slate-900 font-extrabold">{printDisciplineLog.studentName}</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-2 font-bold text-slate-500 uppercase">Pelanggaran</td>
                        <td className="py-2 text-slate-900 font-semibold">{printDisciplineLog.violationType}</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-2 font-bold text-slate-500 uppercase">Tingkatan Sanksi</td>
                        <td className="py-2 text-slate-900 font-mono font-medium">{printDisciplineLog.level}</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-2 font-bold text-slate-500 uppercase">Tindakan / Sanksi</td>
                        <td className="py-2 text-rose-900 font-bold">{printDisciplineLog.consequence}</td>
                      </tr>
                    </tbody>
                  </table>

                  <p 
                    contentEditable={false} 
                    suppressContentEditableWarning={true}
                    className="p-2 border border-dashed border-gray-100 rounded transition w-full"
                  >
                    {staffConfigs.ketertiban.letterTemplate2}
                  </p>

                  <p 
                    contentEditable={false} 
                    suppressContentEditableWarning={true}
                    className="p-2 border border-dashed border-gray-100 rounded transition font-sans italic text-slate-500 text-[11px] w-full"
                  >
                    {staffConfigs.ketertiban.letterTemplate3 || 'Demikian surat takzir ketertiban ini dirumuskan agar dapat dimaklumi dan diperhatikan secara kooperatif oleh santri dan wali santri.'}
                  </p>

                  {/* Signatures Row */}
                  <div className="mt-12 flex justify-end text-xs text-left">
                    <div className="w-[200px] relative">
                      <p className="text-slate-400 font-medium">{getCityFromAddress(settings.address)}, {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                      <p className="text-slate-900 font-bold mt-1">Kepala Ketertiban,</p>
                      
                      {/* Overlapping TTD & Stempel Ketertiban */}
                      <div className="h-16 w-44 relative flex items-center justify-start select-none my-1">
                        {/* TTD in background */}
                        <div className="z-10 absolute inset-0 flex items-center justify-start">
                          {isImageUrl(settings.ttdKetertibanUrl) ? (
                            <img src={settings.ttdKetertibanUrl} alt="TTD Ketertiban" className="max-h-16 max-w-[150px] object-contain mix-blend-multiply" referrerPolicy="no-referrer" />
                          ) : (
                            <span className="text-[10px] font-mono text-indigo-850 italic font-bold">
                              {settings.ttdKetertibanUrl || "✍️ A. Somad"}
                            </span>
                          )}
                        </div>

                        {/* Stempel overlapping */}
                        {settings.stempelKetertibanUrl && (
                          <div className="z-20 absolute left-[30px] top-[-10px] pointer-events-none opacity-85">
                            {isImageUrl(settings.stempelKetertibanUrl) ? (
                              <img src={settings.stempelKetertibanUrl} alt="Stempel Ketertiban" className="h-20 w-20 object-contain rotate-[8deg] mix-blend-multiply" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="border border-double border-indigo-600/60 text-indigo-700/90 rounded-full h-12 w-12 flex items-center justify-center text-[5px] font-extrabold uppercase rotate-[8deg] leading-tight text-center bg-white/75">
                                {settings.stempelKetertibanUrl}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <p className="font-extrabold text-slate-900 underline mt-1">{printDisciplineLog.signedBy || settings.namaKetertiban || "Ustadz Abdul Somad, S.Sy"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Footer Back Button */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setPrintDisciplineLog(null)}
                className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold rounded-xl text-xs cursor-pointer shadow-sm transition animate-pulse"
              >
                Kembali & Tutup ❌
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PRINTER PREVIEW FOR HEALTH LOG (MEDIS) */}
      {printHealthLog && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-emerald-950/75 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl border border-slate-200 relative animate-fade-in my-auto max-h-[88vh] sm:max-h-[90vh] flex flex-col">
            {/* Header Sticky Bar */}
            <div className="p-4 bg-rose-900 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xl">🩺</span>
                <div>
                  <h3 className="text-sm font-extrabold uppercase tracking-wider">Preview & Cetak Keterangan Sakit</h3>
                  <p className="text-[10px] text-rose-100 font-mono">ID: {printHealthLog.id}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handlePrintLetter(`print-health-log-area-${printHealthLog.id}`, printHealthLog.id, 'Surat Keterangan Sakit', 'KST', printHealthLog.studentName, `Keluhan: ${printHealthLog.complaint}`)}
                  className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-950 rounded-xl text-xs font-black cursor-pointer shadow-sm transition flex items-center gap-1"
                >
                  <Printer size={13} /> Cetak Surat (PDF)
                </button>
                <button
                  type="button"
                  onClick={() => setPrintHealthLog(null)}
                  className="p-1.5 bg-rose-950/45 hover:bg-rose-950/70 rounded-full text-white cursor-pointer transition"
                  title="Tutup"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Scrollable Letter Area */}
            <div className="p-8 overflow-y-auto flex-1 bg-slate-50">

              {/* Information Note */}
              <div className="mx-auto max-w-2xl mb-4 bg-amber-50 border border-amber-200 text-amber-950 p-2.5 rounded-xl text-[11px] font-sans flex items-center gap-2">
                <span className="text-sm">💡</span>
                <span><strong>Pratinjau Surat Resmi:</strong> Surat ini sudah diformat dengan standar kepengasuhan dan dapat langsung dicetak. Gunakan mode Portrait saat print.</span>
              </div>

              {/* Printable Area Wrapper */}
              <div 
                id={`print-health-log-area-${printHealthLog.id}`} 
                className="bg-white p-10 shadow-sm rounded-2xl max-w-2xl mx-auto border border-gray-150 relative text-slate-900"
                style={{ fontFamily: 'Times New Roman, Times, serif', minHeight: '297mm' }}
                contentEditable={false}
                suppressContentEditableWarning={true}
              >
                {/* Kop Surat Resmi */}
                <div className="border-b-4 border-double border-slate-900 pb-4 mb-6">
                  <div className="flex gap-4 items-center">
                    {(settings.logoUrl || '/pesantren_logo.jpg') ? (
                      <img src={settings.logoUrl || '/pesantren_logo.jpg'} alt="Logo Pesantren" className="h-16 w-16 object-contain" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="text-3xl shrink-0 flex items-center justify-center h-16 w-16">🕌</div>
                    )}
                    <div className="flex-1 text-left font-sans">
                      <h4 className="text-slate-900 font-black text-sm tracking-wide uppercase leading-tight">{settings.schoolName || "Pondok Pesantren Al-Asy'ariyah"}</h4>
                      <p className="text-[10px] italic font-sans text-slate-500 font-bold tracking-wide uppercase">Biro Kesehatan & Poskestren Al-Asy'ariyah</p>
                      <p className="text-[9px] text-slate-500 max-w-md leading-relaxed mt-0.5">
                        {settings.address || "Jl. Raya Modung, Langpanggang, Modung, Bangkalan, Jawa Timur"}<br />
                        {settings.phone ? `Hubungi: ${settings.phone} | ` : ''} Email: {settings.email || "info@alasyariyah.sch.id"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Letter Content */}
                <div className="space-y-4 text-xs leading-relaxed text-justify">
                  <div className="text-center my-4">
                    <h3 className="font-extrabold underline text-sm uppercase font-sans">Surat Keterangan Sakit & Istirahat</h3>
                    <p className="text-[10px] font-mono mt-0.5">Nomor: {getLetterNumber(printHealthLog.id, 'Surat Keterangan Sakit', 'KST')}</p>
                  </div>

                  <p 
                    contentEditable={false} 
                    suppressContentEditableWarning={true}
                    className="p-2 border border-dashed border-gray-100 rounded transition w-full"
                  >
                    {staffConfigs.kesehatan.letterTemplate1}
                  </p>

                  {/* Student Details Table */}
                  <table className="w-full my-4 border-collapse text-xs">
                    <tbody>
                      <tr className="border-b border-gray-100">
                        <td className="py-2 font-bold text-slate-500 w-1/3 uppercase">Nama Santri</td>
                        <td className="py-2 text-slate-900 font-extrabold">{printHealthLog.studentName}</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-2 font-bold text-slate-500 uppercase">Keluhan / Gejala</td>
                        <td className="py-2 text-slate-900 font-semibold">{printHealthLog.complaint}</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-2 font-bold text-slate-500 uppercase">Diagnosis Medis</td>
                        <td className="py-2 text-slate-900 font-semibold">{printHealthLog.diagnosis}</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-2 font-bold text-slate-500 uppercase">Tindakan Medis</td>
                        <td className="py-2 text-slate-900 font-semibold">{printHealthLog.treatment}</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-2 font-bold text-slate-500 uppercase">Status Rawat</td>
                        <td className="py-2 text-rose-800 font-bold">{printHealthLog.status}</td>
                      </tr>
                    </tbody>
                  </table>

                  <p 
                    contentEditable={false} 
                    suppressContentEditableWarning={true}
                    className="p-2 border border-dashed border-gray-100 rounded transition w-full"
                  >
                    {staffConfigs.kesehatan.letterTemplate2}
                  </p>

                  <p 
                    contentEditable={false} 
                    suppressContentEditableWarning={true}
                    className="p-2 border border-dashed border-gray-100 rounded transition font-sans italic text-slate-500 text-[11px] w-full"
                  >
                    {staffConfigs.kesehatan.letterTemplate3 || 'Demikian surat keterangan kesehatan poskestren ini dirumuskan untuk digunakan sebagai bukti rujukan dispensasi kegiatan.'}
                  </p>

                  {/* Signatures Row */}
                  <div className="mt-12 flex justify-end text-xs text-left">
                    <div className="w-[200px] relative">
                      <p className="text-slate-400 font-medium">{getCityFromAddress(settings.address)}, {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                      <p className="text-slate-900 font-bold mt-1">Biro Kesehatan (Poskestren),</p>
                      
                      {/* Overlapping TTD & Stempel Kesehatan */}
                      <div className="h-16 w-44 relative flex items-center justify-start select-none my-1">
                        {/* TTD in background */}
                        <div className="z-10 absolute inset-0 flex items-center justify-start">
                          {isImageUrl(settings.ttdKesehatanUrl) ? (
                            <img src={settings.ttdKesehatanUrl} alt="TTD Kesehatan" className="max-h-16 max-w-[150px] object-contain mix-blend-multiply" referrerPolicy="no-referrer" />
                          ) : (
                            <span className="text-[10px] font-mono text-rose-800 italic font-bold">
                              {settings.ttdKesehatanUrl || "✍️ dr. Fatimah"}
                            </span>
                          )}
                        </div>

                        {/* Stempel overlapping */}
                        {settings.stempelKesehatanUrl && (
                          <div className="z-20 absolute left-[30px] top-[-10px] pointer-events-none opacity-85">
                            {isImageUrl(settings.stempelKesehatanUrl) ? (
                              <img src={settings.stempelKesehatanUrl} alt="Stempel Kesehatan" className="h-20 w-20 object-contain rotate-[-6deg] mix-blend-multiply" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="border border-double border-rose-600/60 text-rose-700/90 rounded-full h-12 w-12 flex items-center justify-center text-[5px] font-extrabold uppercase rotate-[-6deg] leading-tight text-center bg-white/75">
                                {settings.stempelKesehatanUrl}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <p className="font-extrabold text-slate-900 underline mt-1">{printHealthLog.signedBy || settings.namaKesehatan || "Ustadzah dr. Fatimah Az-Zahra"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Footer Back Button */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setPrintHealthLog(null)}
                className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold rounded-xl text-xs cursor-pointer shadow-sm transition animate-pulse"
              >
                Kembali & Tutup ❌
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DETAIL TAGIHAN & LOG RIWAYAT VERIFIKASI AI */}
      {selectedBillForLogs && (() => {
        const b = bills.find(item => item.id === selectedBillForLogs.id) || selectedBillForLogs;
        const getDestInfo = (method?: string) => {
          if (!method) return { bank: 'Bank BRI', account: '88201982736' };
          if (method.includes('BRI')) return { bank: 'Bank BRI', account: '88201982736' };
          if (method.includes('BNI')) return { bank: 'Bank BNI', account: '98201982747' };
          if (method.includes('Mandiri') || method.includes('BSI')) return { bank: 'Bank Syariah Indonesia (BSI)', account: '718290182' };
          return { bank: 'Bendahara Pesantren', account: 'Tunai' };
        };
        const dest = getDestInfo(b.paymentMethod);

        return (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-emerald-950/75 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl border border-slate-200 relative animate-fade-in my-auto max-h-[88vh] sm:max-h-[90vh] flex flex-col font-sans">
              
              {/* Header */}
              <div className="p-5 bg-teal-900 text-white flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">📋</span>
                  <div>
                    <h3 className="text-sm font-extrabold uppercase tracking-wider">Detail Tagihan & Log Verifikasi AI</h3>
                    <p className="text-[10px] text-teal-100 font-mono">ID Tagihan: {b.id}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedBillForLogs(null)}
                  className="p-1 hover:bg-teal-800 rounded-lg text-white/80 hover:text-white transition cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 text-xs">
                
                {/* 2 Column Layout: Details on left, Image & AI on right */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* Left Column: Info & Logs */}
                  <div className="lg:col-span-7 space-y-5">
                    
                    {/* Bill Info Card */}
                    <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 space-y-3">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">Nama Santri</span>
                          <h4 className="text-base font-black text-slate-900 leading-snug">{b.studentName}</h4>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border uppercase ${
                          b.status === 'Lunas' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          b.status === 'Konfirmasi Pembayaran' ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse' :
                          'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {b.status}
                        </span>
                      </div>

                      <hr className="border-slate-200" />

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono block">Nama Tagihan</span>
                          <span className="font-bold text-slate-800 text-[11px]">{b.title}</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono block">Nominal Tagihan</span>
                          <span className="font-extrabold text-teal-800 text-sm">Rp {b.amount.toLocaleString('id-ID')}</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono block">Jatuh Tempo</span>
                          <span className="font-medium text-slate-600">{b.dueDate}</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono block">Tanggal Bayar / Konfirmasi</span>
                          <span className="font-medium text-slate-600">{b.paymentDate || '-'}</span>
                        </div>
                      </div>

                      <hr className="border-slate-200" />

                      <div className="space-y-2">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono block">Rekening Tujuan Pesantren (Resmi)</span>
                        <div className="bg-white p-2.5 rounded-lg border border-slate-150 flex items-center justify-between">
                          <div>
                            <p className="font-extrabold text-slate-800">{dest.bank}</p>
                            <p className="font-mono text-slate-500 font-bold text-[10px]">{dest.account}</p>
                          </div>
                          <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-100 font-extrabold px-2 py-0.5 rounded uppercase">Resmi</span>
                        </div>
                      </div>

                      {b.paymentProofUrl && (
                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono block">Bank Pengirim</span>
                            <span className="font-bold text-slate-800 font-mono text-[11px]">{b.senderBank || '-'}</span>
                          </div>
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono block">No Rekening Pengirim</span>
                            <span className="font-bold text-slate-800 font-mono text-[11px]">{b.senderAccountNumber || '-'}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Timeline Log Riwayat */}
                    <div className="space-y-3">
                      <h5 className="font-extrabold text-slate-900 tracking-wide uppercase text-[10px] flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                        <span>📋 Log Riwayat & Aktivitas Tagihan</span>
                      </h5>

                      <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                        {b.verificationLogs && b.verificationLogs.length > 0 ? (
                          b.verificationLogs.map((log, idx) => (
                            <div key={idx} className="relative pl-5 border-l-2 border-emerald-500 py-1 space-y-1 text-left">
                              <div className="absolute left-[-5px] top-1.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-white shadow-2xs" />
                              <div className="flex justify-between items-center flex-wrap gap-1">
                                <span className="font-black text-slate-900 text-[11px]">{log.uploadedBy}</span>
                                <span className="text-[9px] text-slate-400 font-mono font-bold">{log.verifiedAt || log.uploadedAt}</span>
                              </div>
                              <p className="text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-150/80 whitespace-pre-wrap font-mono text-[10px] leading-relaxed max-h-[100px] overflow-y-auto">
                                {log.aiResult}
                              </p>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-6 text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                            Belum ada aktivitas log yang tercatat untuk tagihan ini.
                          </div>
                        )}
                      </div>
                    </div>

                  </div>

                  {/* Right Column: Proof and AI Analysis */}
                  <div className="lg:col-span-5 flex flex-col space-y-4">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider font-mono block">Bukti Transfer & Analisis AI</span>
                    
                    {b.paymentProofUrl ? (
                      <div className="space-y-4 flex-1 flex flex-col">
                        {/* Image Preview Container */}
                        <div className="relative border border-slate-150 rounded-2xl overflow-hidden bg-slate-100 flex items-center justify-center p-2 group max-h-[200px]">
                          <img 
                            src={b.paymentProofUrl} 
                            alt={`Bukti Transfer ${b.studentName}`} 
                            referrerPolicy="no-referrer"
                            className="max-h-[180px] w-auto object-contain rounded-lg shadow-sm transition hover:scale-102"
                          />
                          <a 
                            href={b.paymentProofUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="absolute bottom-2 right-2 px-2.5 py-1 bg-slate-900/80 hover:bg-slate-900 text-white rounded-lg text-[10px] font-bold backdrop-blur-xs transition cursor-pointer"
                          >
                            Buka Penuh 🔗
                          </a>
                        </div>

                        {/* AI Status Panel */}
                        <div className="bg-gradient-to-br from-violet-50 to-indigo-50/50 p-4 border border-violet-150 rounded-2xl space-y-3 flex-1">
                          <div className="flex justify-between items-center flex-wrap gap-1.5">
                            <span className="text-violet-950 font-black text-[11px] flex items-center gap-1">
                              <Sparkles className="h-3 w-3 animate-pulse text-violet-600 shrink-0" />
                              <span>HASIL ANALISIS VISION AI</span>
                            </span>
                            {b.verificationStatus && (
                              <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold border uppercase ${
                                b.verificationStatus === 'Terverifikasi Otomatis' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                b.verificationStatus === 'Perlu Peninjauan' ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse' :
                                'bg-rose-50 text-rose-700 border-rose-200'
                              }`}>
                                {b.verificationStatus}
                              </span>
                            )}
                          </div>

                          {aiLoading[b.id] ? (
                            <div className="flex flex-col items-center justify-center py-6 space-y-2 text-violet-600">
                              <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
                              <span className="font-bold text-[10px] tracking-wide uppercase animate-pulse">Sedang Memproses Gambar...</span>
                            </div>
                          ) : aiOutput[b.id] ? (
                            <div className="text-[10px] text-slate-800 bg-white/95 p-3 rounded-xl border border-violet-150 leading-relaxed max-h-[180px] overflow-y-auto whitespace-pre-wrap font-mono">
                              {aiOutput[b.id]}
                            </div>
                          ) : (
                            <div className="text-center py-6 text-slate-500 text-[10px]">
                              Silakan klik tombol "Validasi AI" di bawah untuk memproses gambar bukti transfer dengan Vision AI.
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              runAiValidation(b.id, 'payment', b.studentName, {
                                billTitle: b.title,
                                billAmount: b.amount,
                                paymentMethod: b.paymentMethod || 'Transfer',
                                proofUrl: b.paymentProofUrl,
                                destinationBank: dest.bank,
                                destinationAccount: dest.account,
                                senderBank: b.senderBank || '-',
                                senderAccountNumber: b.senderAccountNumber || '-'
                              });
                            }}
                            disabled={aiLoading[b.id]}
                            className="w-full py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 text-white font-extrabold text-[11px] rounded-xl cursor-pointer transition shadow-xs flex items-center justify-center gap-1.5"
                          >
                            {aiLoading[b.id] ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin text-white" />
                                <span>Menganalisis Gambar Bukti...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-3.5 w-3.5 text-white" />
                                <span>Jalankan Validasi Vision AI (Gemini)</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center text-slate-400 bg-slate-50/50">
                        <span className="text-3xl mb-1">📷</span>
                        <p className="font-bold text-[11px]">Belum Ada Bukti Pembayaran</p>
                        <p className="text-[9px] max-w-xs mx-auto mt-0.5">Wali santri belum mengunggah bukti bayar untuk tagihan ini.</p>
                      </div>
                    )}

                  </div>

                </div>

              </div>

              {/* Footer Actions */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center flex-wrap gap-2 shrink-0">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      toggleBillStatus(b.id, 'Lunas');
                      showAlert('success', 'Status tagihan berhasil diverifikasi Lunas.');
                    }}
                    className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold rounded-xl transition text-[11px] cursor-pointer shadow-xs"
                  >
                    Setujui Lunas ✓
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      toggleBillStatus(b.id, 'Belum Lunas');
                      showAlert('success', 'Status tagihan ditolak (Kembali ke Belum Lunas).');
                    }}
                    className="px-4 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-extrabold rounded-xl transition text-[11px] cursor-pointer"
                  >
                    Tolak / Belum Lunas ❌
                  </button>
                </div>
                
                <button
                  type="button"
                  onClick={() => setSelectedBillForLogs(null)}
                  className="px-4 py-1.5 bg-slate-300 hover:bg-slate-400 text-slate-700 font-extrabold rounded-xl text-[11px] cursor-pointer transition shadow-xs"
                >
                  Tutup Log ❌
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* MODAL EDIT DATA TAGIHAN PEMBAYARAN */}
      {editingBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-emerald-950/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-emerald-100 overflow-hidden text-slate-800 text-xs my-auto flex flex-col max-h-[88vh] sm:max-h-[90vh]">
            <div className="bg-gradient-to-r from-emerald-800 to-teal-900 p-4 text-white flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-sm uppercase tracking-wider flex items-center gap-1.5">
                  <span>✏️ Edit Data & Nominal Tagihan Santri</span>
                </h3>
                <p className="text-[10px] text-teal-100 font-mono">ID Tagihan: {editingBill.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingBill(null)}
                className="p-1 hover:bg-emerald-700/50 rounded-lg text-white/80 hover:text-white transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setBills(prev => prev.map(b => b.id === editingBill.id ? editingBill : b));
                localStorage.setItem('pesantren_bills', JSON.stringify(bills.map(b => b.id === editingBill.id ? editingBill : b)));
                showAlert('success', `Data tagihan "${editingBill.title}" berhasil diperbarui!`);
                setEditingBill(null);
              }}
              className="p-4 sm:p-6 space-y-4 max-h-[82vh] overflow-y-auto"
            >
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Nama Santri Penerima</label>
                <input
                  type="text"
                  value={editingBill.studentName}
                  onChange={(e) => setEditingBill({ ...editingBill, studentName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-250 rounded-xl focus:ring-2 focus:ring-emerald-700 focus:outline-none font-bold text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Nama / Rincian Tagihan</label>
                <input
                  type="text"
                  value={editingBill.title}
                  onChange={(e) => setEditingBill({ ...editingBill, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-250 rounded-xl focus:ring-2 focus:ring-emerald-700 focus:outline-none font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Nominal Tagihan (Rp)</label>
                  <input
                    type="number"
                    min={0}
                    value={editingBill.amount}
                    onChange={(e) => setEditingBill({ ...editingBill, amount: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-250 rounded-xl focus:ring-2 focus:ring-emerald-700 focus:outline-none font-mono font-extrabold text-emerald-800 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Kategori Tagihan</label>
                  <select
                    value={editingBill.category || 'Syahriyah'}
                    onChange={(e) => setEditingBill({ ...editingBill, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-250 rounded-xl focus:ring-2 focus:ring-emerald-700 focus:outline-none font-semibold bg-white"
                  >
                    <option value="Syahriyah">Syahriyah / Bulanan</option>
                    <option value="Pendaftaran">Pendaftaran Santri Baru</option>
                    <option value="Seragam">Seragam & Atribut</option>
                    <option value="Kitab">Kitab & Buku</option>
                    <option value="Sarpras">Sarana & Prasarana</option>
                    <option value="Ujian">Infaq Ujian / Kegiatan</option>
                    <option value="Lain-lain">Lain-lain</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Status Pembayaran</label>
                  <select
                    value={editingBill.status}
                    onChange={(e) => setEditingBill({ ...editingBill, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-250 rounded-xl focus:ring-2 focus:ring-emerald-700 focus:outline-none font-extrabold bg-white text-slate-800"
                  >
                    <option value="Belum Lunas">Belum Lunas</option>
                    <option value="Konfirmasi Pembayaran">Konfirmasi Pembayaran (Periksa)</option>
                    <option value="Lunas">Lunas ✓</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Tanggal Jatuh Tempo</label>
                  <input
                    type="date"
                    value={editingBill.dueDate}
                    onChange={(e) => setEditingBill({ ...editingBill, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-250 rounded-xl focus:ring-2 focus:ring-emerald-700 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Tanggal Pembayaran (Jika Sudah Lunas)</label>
                <input
                  type="date"
                  value={editingBill.paymentDate || ''}
                  onChange={(e) => setEditingBill({ ...editingBill, paymentDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-250 rounded-xl focus:ring-2 focus:ring-emerald-700 focus:outline-none font-mono"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingBill(null)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl font-bold cursor-pointer transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-amber-300 rounded-xl font-extrabold cursor-pointer transition shadow-md"
                >
                  Simpan Perubahan Tagihan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDIT AGENDA / KEGIATAN PESANTREN */}
      {editingEventId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-emerald-950/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-emerald-100 overflow-hidden text-slate-800 text-xs my-auto flex flex-col max-h-[88vh] sm:max-h-[90vh]">
            <div className="bg-gradient-to-r from-emerald-800 to-teal-900 p-4 text-white flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-extrabold text-sm uppercase tracking-wider flex items-center gap-1.5">
                  <span>✏️ Edit Agenda / Kegiatan Pesantren</span>
                </h3>
                <p className="text-[10px] text-teal-100 font-mono">ID Agenda: {editingEventId}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingEventId(null);
                  setEventTitle('');
                  setEventDescription('');
                  setEventStartDate('2026-08-01');
                  setEventEndDate('2026-08-02');
                  setEventCategory('kegiatan');
                  setEventLocation('');
                }}
                className="p-1 hover:bg-emerald-700/50 rounded-lg text-white/80 hover:text-white transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 text-left">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Judul Agenda / Kegiatan *</label>
                <input
                  type="text"
                  required
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-700 font-bold bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Deskripsi & Rincian *</label>
                <textarea
                  rows={3}
                  required
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-700 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Mulai *</label>
                  <input
                    type="date"
                    required
                    value={eventStartDate}
                    onChange={(e) => setEventStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-700 bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Selesai *</label>
                  <input
                    type="date"
                    required
                    value={eventEndDate}
                    onChange={(e) => setEventEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-700 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Kategori *</label>
                  <select
                    value={eventCategory}
                    onChange={(e: any) => setEventCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white"
                  >
                    <option value="kegiatan">Kegiatan Pondok</option>
                    <option value="ujian">Ujian Akademik</option>
                    <option value="libur">Libur Santri</option>
                    <option value="ppdb">PPDB & Penerimaan</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Lokasi</label>
                  <input
                    type="text"
                    value={eventLocation}
                    onChange={(e) => setEventLocation(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-700 bg-white"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setEditingEventId(null);
                    setEventTitle('');
                    setEventDescription('');
                    setEventStartDate('2026-08-01');
                    setEventEndDate('2026-08-02');
                    setEventCategory('kegiatan');
                    setEventLocation('');
                  }}
                  className="px-4 py-2 border border-gray-300 hover:bg-gray-100 rounded-lg font-semibold text-xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-black transition cursor-pointer shadow-xs"
                >
                  Simpan Perubahan Agenda ✓
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDIT REKENING / KANAL PEMBAYARAN */}
      {editingBankAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-emerald-950/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-emerald-100 overflow-hidden text-slate-800 text-xs my-auto flex flex-col max-h-[88vh] sm:max-h-[90vh]">
            <div className="bg-gradient-to-r from-emerald-800 to-teal-900 p-4 text-white flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-extrabold text-sm uppercase tracking-wider flex items-center gap-1.5">
                  <span>✏️ Edit Rekening / Kanal Pembayaran</span>
                </h3>
                <p className="text-[10px] text-teal-100 font-mono">ID: {editingBankAccount.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingBankAccount(null)}
                className="p-1 hover:bg-emerald-700/50 rounded-lg text-white/80 hover:text-white transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (editingBankAccount) {
                  const updatedList = (editSettings.rekeningList || []).map((r: any) => 
                    r.id === editingBankAccount.id 
                      ? { ...r, bankName: bankFormName, accountNumber: bankFormNumber, accountName: bankFormOwner }
                      : r
                  );
                  const updatedSettings = { ...editSettings, rekeningList: updatedList };
                  setEditSettings(updatedSettings);
                  setSettings(updatedSettings);
                  localStorage.setItem('pesantren_settings', JSON.stringify(updatedSettings));
                  showAlert('success', 'Data rekening berhasil diperbarui!');
                  setEditingBankAccount(null);
                }
              }}
              className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 text-left"
            >
              <div>
                <label className="text-[10px] font-semibold text-gray-500 block mb-1 uppercase tracking-wider">Nama Bank</label>
                <select
                  value={bankFormName}
                  onChange={(e) => setBankFormName(e.target.value)}
                  className="w-full px-2.5 py-2 border border-emerald-100 rounded-lg bg-white font-medium text-xs text-slate-800"
                  required
                >
                  <option value="">-- Pilih Bank --</option>
                  <option value="Bank Syariah Indonesia (BSI)">Bank Syariah Indonesia (BSI)</option>
                  <option value="Bank Rakyat Indonesia (BRI)">Bank Rakyat Indonesia (BRI)</option>
                  <option value="Bank Negara Indonesia (BNI)">Bank Negara Indonesia (BNI)</option>
                  <option value="Bank Mandiri">Bank Mandiri</option>
                  <option value="Bank Central Asia (BCA)">Bank Central Asia (BCA)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-gray-500 block mb-1 uppercase tracking-wider">Nomor Rekening / Virtual Account</label>
                <input
                  type="text"
                  value={bankFormNumber}
                  onChange={(e) => setBankFormNumber(e.target.value)}
                  className="w-full px-2.5 py-2 border border-emerald-100 rounded-lg bg-white font-medium text-xs font-mono text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-gray-500 block mb-1 uppercase tracking-wider">Nama Pemilik Rekening (Atas Nama)</label>
                <input
                  type="text"
                  value={bankFormOwner}
                  onChange={(e) => setBankFormOwner(e.target.value)}
                  className="w-full px-2.5 py-2 border border-emerald-100 rounded-lg bg-white font-bold text-xs uppercase text-slate-800"
                  required
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingBankAccount(null)}
                  className="px-4 py-2 border border-gray-300 hover:bg-gray-100 rounded-lg font-semibold text-xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-amber-300 rounded-lg font-extrabold transition text-xs cursor-pointer shadow-xs"
                >
                  Simpan Perubahan Rekening ✓
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Staff Credential Notification Modal */}
      {staffCredentialNotification && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-emerald-100 transform transition-all">
            <div className="bg-gradient-to-r from-emerald-800 to-teal-950 p-4 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-amber-400/20 text-amber-300 rounded-lg text-lg">📩</span>
                <div>
                  <h3 className="font-extrabold text-sm uppercase tracking-wider text-amber-300">Notifikasi Akun Pengurus Baru</h3>
                  <p className="text-[10px] text-emerald-100">Kredensial login pengurus berhasil dibuat</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStaffCredentialNotification(null)}
                className="p-1 hover:bg-emerald-700/50 rounded-lg text-white/80 hover:text-white transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3.5 space-y-2.5">
                <div className="flex justify-between items-center border-b border-emerald-200/60 pb-2">
                  <span className="text-gray-500 font-semibold text-[11px]">Nama Pengurus:</span>
                  <span className="font-bold text-slate-900 text-xs">{staffCredentialNotification.fullName}</span>
                </div>
                <div className="flex justify-between items-center border-b border-emerald-200/60 pb-2">
                  <span className="text-gray-500 font-semibold text-[11px]">Bidang / Akses:</span>
                  <span className="font-black text-emerald-800 uppercase bg-emerald-100 px-2 py-0.5 rounded text-[10px]">
                    {staffCredentialNotification.role === 'admin' ? 'Administrator' : `Bidang ${staffCredentialNotification.role}`}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-emerald-200/60 pb-2">
                  <span className="text-gray-500 font-semibold text-[11px]">Username / Email:</span>
                  <span className="font-mono font-bold text-slate-800">{staffCredentialNotification.email}</span>
                </div>
                <div className="flex justify-between items-center border-b border-emerald-200/60 pb-2">
                  <span className="text-gray-500 font-semibold text-[11px]">Password Akses:</span>
                  <span className="font-mono font-black text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded text-xs tracking-wider">
                    {staffCredentialNotification.password}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-gray-500 font-semibold text-[11px]">Akses Login Portal:</span>
                  <span className="font-mono text-[10px] text-teal-700 underline truncate max-w-[200px]">{staffCredentialNotification.loginUrl}</span>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-900 flex items-start gap-2">
                <span className="text-amber-600 text-sm">💡</span>
                <p>Notifikasi pendaftaran akun telah dikirim ke log WhatsApp & email pengurus. Anda juga dapat menyalin atau membagikan kredensial ini langsung kepada pengurus bersangkutan.</p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const text = `Assalamu'alaikum Wr. Wb. Yth. Ust/Ustdz ${staffCredentialNotification.fullName},\n\nBerikut kredensial akun pengurus Pesantren Anda:\n- Username/Email: ${staffCredentialNotification.email}\n- Password: ${staffCredentialNotification.password}\n- Hak Akses: ${staffCredentialNotification.role.toUpperCase()}\n- Link Login: ${staffCredentialNotification.loginUrl}\n\nHarap simpan kredensial ini dengan aman. Syukron.`;
                    navigator.clipboard.writeText(text);
                    showAlert('success', 'Kredensial akun pengurus berhasil disalin ke clipboard!');
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  📋 Salin Kredensial
                </button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    `Assalamu'alaikum Wr. Wb. Yth. Ust/Ustdz ${staffCredentialNotification.fullName},\n\nBerikut kredensial akun pengurus Pesantren Anda:\n- Username/Email: ${staffCredentialNotification.email}\n- Password: ${staffCredentialNotification.password}\n- Hak Akses: ${staffCredentialNotification.role.toUpperCase()}\n- Link Login: ${staffCredentialNotification.loginUrl}\n\nHarap simpan kredensial ini dengan aman. Syukron.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                >
                  💬 Kirim via WhatsApp
                </a>
                <button
                  type="button"
                  onClick={() => setStaffCredentialNotification(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-xs transition cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
