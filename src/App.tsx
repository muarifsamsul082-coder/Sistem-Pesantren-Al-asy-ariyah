import React from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import PublicPortal from './components/PublicPortal';
import PCSBForm from './components/PCSBForm';
import AdminDashboard from './components/AdminDashboard';
import SantriDashboard from './components/SantriDashboard';
import StaffDashboard from './components/StaffDashboard';
import LoginModal from './components/LoginModal';
import { UserSession, News, Announcement, PCSBRegistration, Student, Bill, PortalSettings, Room } from './types';
import { autoAdjustPpdbSettings } from './lib/dateUtils';

// Default Portal Settings fallback (without mockData dependency)
export const DEFAULT_SETTINGS: PortalSettings = {
  schoolName: "Pondok Pesantren Al-Asy'ariyah",
  namaYayasan: "Yayasan Al-Asy'ariyah",
  logoUrl: "/pesantren_logo.jpg",
  tagline: "Mencetak Generasi Qur'ani, Berakhlakul Karimah, Unggul, dan Mandiri",
  aboutUs: "Pondok Pesantren Al-Asy'ariyah didirikan dengan visi melahirkan generasi Islam yang kokoh dalam iman, luas dan mendalam dalam bekal ilmu keislaman klasik serta modern, serta mandiri dalam pengabdian kepada bangsa dan negara.",
  vision: "Terwujudnya pusat pendidikan Islam rujukan yang unggul dalam mencetak ulama handal, cendekiawan saleh, dan pemimpin yang amanah berlandaskan nilai-nilai Ahlussunnah wal Jama'ah.",
  mission: [
    "Menyelenggarakan pendidikan kepesantrenan berasas salafus shalih dengan metode pembelajaran kontemporer.",
    "Menanamkan pembiasaan akhlak mulia, disiplin ibadah, dan kemandirian santri.",
    "Meningkatkan keterampilan pengingat Al-Qur'an dan pengkajian kitab kuning secara mendalam.",
    "Mengembangkan bakat santri di bidang bahasa, sains, dan kewirausahaan untuk menjawab tantangan zaman."
  ],
  address: "Jl. Raya Modung, Langpanggang, Modung, Bangkalan, Jawa Timur",
  phone: "0812-3456-7890",
  email: "info@alasyariyah.sch.id",
  accentColor: "#0f766e",
  stempelPesantrenUrl: "🟢 STEMPEL PONPES AL-ASY'ARIYAH",
  namaPengurus: "Ustadz Ahmad Wildan, M.Pd",
  ttdPengurusUrl: "✍️ Ahmad Wildan",
  namaPengasuh: "KH. Asy'ari Al-Hafidz",
  stempelPengasuhUrl: "🌟 STEMPEL KHAS PENGASUH",
  ttdPengasuhUrl: "✒️ KH. Asy'ari",
  namaKetuaPcsb: "Ustadz Muhammad Syakir, S.Ag",
  ttdKetuaPcsbUrl: "✒️ M. Syakir",
  stempelPcsbUrl: "💠 STEMPEL PANITIA PCSB",
  namaBendahara: "Ustadzah Siti Aminah",
  ttdBendaharaUrl: "✍️ Siti Aminah",
  stempelBendaharaUrl: "💰 STEMPEL BENDAHARA PONPES",
  namaKeamanan: "Ustadz Junaidi Al-Anshori",
  ttdKeamananUrl: "🛡️ Junaidi",
  stempelKeamananUrl: "👮 STEMPEL DEPT KEAMANAN",
  namaKetertiban: "Ustadz Abdul Somad, S.Sy",
  ttdKetertibanUrl: "📜 A. Somad",
  stempelKetertibanUrl: "⚖️ STEMPEL DEPT KETERTIBAN",
  namaKesehatan: "Ustadzah dr. Fatimah Az-Zahra",
  ttdKesehatanUrl: "🩺 dr. Fatimah",
  stempelKesehatanUrl: "🏥 STEMPEL POSKESTREN",
  namaAkademik: "Ustadz Dr. H. Muhaimin, M.A",
  ttdAkademikUrl: "🎓 H. Muhaimin",
  stempelAkademikUrl: "📚 STEMPEL DEPT AKADEMIK",
  ppdbOpen: true,
  ppdbStartDate: "",
  ppdbEndDate: "",
  pesantrenBankName: "Bank Syariah Indonesia (BSI)",
  pesantrenBankAccountNumber: "718290182",
  pesantrenBankAccountName: "BEND. PONPES AL-ASYARIYAH",
  rekeningList: [
    { id: 'rek-1', bankName: 'Bank Syariah Indonesia (BSI)', accountNumber: '718290182', accountName: 'BEND. PONPES AL-ASYARIYAH', isMain: true, type: 'bank' },
    { id: 'rek-2', bankName: 'Bank Rakyat Indonesia (BRI)', accountNumber: '0029-01-000456-30-2', accountName: 'YAYASAN AL-ASYARIYAH', type: 'bank' },
    { id: 'rek-3', bankName: 'Bank Central Asia (BCA)', accountNumber: '0312345678', accountName: 'AL-ASYARIYAH MUSA', type: 'bank' },
    { id: 'rek-4', bankName: 'DANA E-Wallet', accountNumber: '081234567890', accountName: 'PONPES AL-ASYARIYAH DANA', type: 'ewallet' },
    { id: 'rek-5', bankName: 'GoPay / OVO / ShopeePay', accountNumber: '081234567890', accountName: 'PONPES AL-ASYARIYAH', type: 'ewallet' },
    { id: 'rek-6', bankName: 'QRIS All Payment', accountNumber: 'ID102030405060708', accountName: 'YAYASAN AL-ASYARIYAH (QRIS)', type: 'ewallet' }
  ]
};

// Supabase Cloud Storage Sync
import {
  isSupabaseConfigured,
  initSupabaseFromRemoteConfig,
  syncNewsWithSupabase,
  syncAnnouncementsWithSupabase,
  syncStudentsWithSupabase,
  syncPpdbWithSupabase,
  syncRoomsWithSupabase,
  syncBillsWithSupabase,
  syncSettingsWithSupabase,
  syncStaffUsersWithSupabase,
  pushAllStaffUsersToSupabase,
  syncMasterClassesWithSupabase,
  pushMasterClassesToSupabase,
  pushSettingsToSupabase,
  pushPpdbToSupabase,
  subscribeToSupabaseRealtime
} from './lib/supabase';

export default function App() {
  const [currentView, setViewState] = React.useState<string>(() => {
    try {
      // Restore view on refresh within same tab session, or default to home on fresh visit
      const saved = sessionStorage.getItem('pesantren_current_view');
      if (saved) return saved;
    } catch (e) {}
    return 'home';
  });

  const setView = (view: string) => {
    setViewState(view);
    try {
      sessionStorage.setItem('pesantren_current_view', view);
    } catch (e) {}
  };

  const [session, setSession] = React.useState<UserSession | null>(null);
  const [isLoginOpen, setIsLoginOpen] = React.useState(false);
  const [isAccountOpen, setIsAccountOpen] = React.useState(false);

  // Note: Account sidebar is not auto-opened on initial load to keep entry view clean and safe


  const [viewArticleId, setViewArticleId] = React.useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('newsId') || params.get('articleId');
  });

  const [darkMode, setDarkMode] = React.useState<boolean>(() => {
    return localStorage.getItem('pesantren_dark_mode') === 'true';
  });

  React.useEffect(() => {
    localStorage.setItem('pesantren_dark_mode', String(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // States loaded from localStorage
  const [news, setNews] = React.useState<News[]>([]);
  const [announcements, setAnnouncements] = React.useState<Announcement[]>([]);
  const [ppdbList, setPpdbList] = React.useState<PCSBRegistration[]>([]);
  const [students, setStudents] = React.useState<Student[]>([]);
  const [rooms, setRooms] = React.useState<Room[]>([]);
  const [bills, setBills] = React.useState<Bill[]>([]);
  const [settings, setSettings] = React.useState<PortalSettings>(DEFAULT_SETTINGS);

  const [availableFormalClasses, setAvailableFormalClasses] = React.useState<string[]>(() => {
    const saved = localStorage.getItem('pesantren_available_formal_classes');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return ['VII SMP Formal', 'VIII SMP Formal', 'IX SMP Formal', 'X MA Formal', 'XI MA Formal', 'XII MA Formal', '-'];
  });

  const [availableMadrasahClasses, setAvailableMadrasahClasses] = React.useState<string[]>(() => {
    const saved = localStorage.getItem('pesantren_available_madrasah_classes');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return ['1A MTs Diniyah', '1B MTs Diniyah', '2A MTs Diniyah', '2B MTs Diniyah', '3A MTs Diniyah', '1A MA Diniyah', '2A MA Diniyah', '3A MA Diniyah'];
  });

  React.useEffect(() => {
    localStorage.setItem('pesantren_available_formal_classes', JSON.stringify(availableFormalClasses));
  }, [availableFormalClasses]);

  React.useEffect(() => {
    localStorage.setItem('pesantren_available_madrasah_classes', JSON.stringify(availableMadrasahClasses));
  }, [availableMadrasahClasses]);

  // Pull-to-refresh states
  const [pullDistance, setPullDistance] = React.useState(0);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [showToast, setShowToast] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState('');

  // Dashboard tab states for global unified hamburger menu control
  const [adminTab, setAdminTabState] = React.useState<'overview' | 'news_ann' | 'ppdb' | 'students' | 'kamar' | 'alumni' | 'bills' | 'rekening' | 'settings' | 'whatsapp' | 'input_mandiri' | 'reports' | 'outbox_log' | 'kelas_sekolah' | 'pengurus'>(() => {
    try {
      const saved = localStorage.getItem('pesantren_admin_active_tab');
      if (saved) return saved as any;
    } catch (e) {}
    return 'overview';
  });

  const setAdminTab = (tab: any) => {
    setAdminTabState(tab);
    try {
      localStorage.setItem('pesantren_admin_active_tab', tab);
    } catch (e) {}
  };
  const [staffTab, setStaffTab] = React.useState<'students' | 'history' | 'profile' | 'skck' | 'takzir_letter'>('students');
  const [santriTab, setSantriTab] = React.useState<'tagihan' | 'pelanggaran' | 'kesehatan' | 'pengumuman' | 'perizinan'>('tagihan');
  const [showStudentCard, setShowStudentCard] = React.useState(false);

  const touchStartRef = React.useRef<number | null>(null);
  const [isMouseDown, setIsMouseDown] = React.useState(false);
  const mouseDownYRef = React.useRef<number | null>(null);

  // Unified loader setup
  const loadLocalDatabase = () => {
    const getOrSet = (key: string, initialData: any) => {
      try {
        const stored = localStorage.getItem(key);
        if (!stored) {
          localStorage.setItem(key, JSON.stringify(initialData));
          return initialData;
        }
        return JSON.parse(stored);
      } catch (e) {
        console.error(`Failed to parse localStorage for key: ${key}. Resetting to initial data.`, e);
        try {
          localStorage.setItem(key, JSON.stringify(initialData));
        } catch (setErr) {
          console.error("Failed to set localStorage", setErr);
        }
        return initialData;
      }
    };

    setNews(getOrSet('pesantren_news', []));
    setAnnouncements(getOrSet('pesantren_announcements', []));
    
    // Ensure uppercase names in PPDB
    let loadedPpdb = getOrSet('pesantren_ppdb', []);
    if (!Array.isArray(loadedPpdb)) {
      loadedPpdb = [];
    }
    const mappedPpdb = loadedPpdb.map((p: any) => {
      if (!p) return null;
      return {
        ...p,
        fullName: (p.fullName || '').toUpperCase(),
        parentName: (p.parentName || '').toUpperCase(),
        fatherName: (p.fatherName || '').toUpperCase(),
        motherName: (p.motherName || '').toUpperCase(),
      };
    }).filter(Boolean);
    setPpdbList(mappedPpdb);

    // Load & Normalize Rooms FIRST so student room assignments can be validated against valid room names
    let loadedRooms = getOrSet('pesantren_rooms', []);
    if (!Array.isArray(loadedRooms)) {
      loadedRooms = [];
    }
    let roomsModified = false;
    loadedRooms = loadedRooms.map((r: any) => {
      if (!r) return r;
      let cleanName = (r.name || '').replace(/^Kamar\s+/i, '').trim();
      if (cleanName !== r.name) {
        roomsModified = true;
      }
      return {
        ...r,
        name: cleanName
      };
    });

    const validMaleRooms = loadedRooms.filter((r: any) => r && r.gender === 'Laki-laki').map((r: any) => r.name);
    const validFemaleRooms = loadedRooms.filter((r: any) => r && r.gender === 'Perempuan').map((r: any) => r.name);

    if (roomsModified) {
      try {
        localStorage.setItem('pesantren_rooms', JSON.stringify(loadedRooms));
      } catch (err) {}
    }
    setRooms(loadedRooms);

    // Students
    let loadedStudents = getOrSet('pesantren_students', []);
    if (!Array.isArray(loadedStudents)) {
      loadedStudents = [];
    }

    const seenNis = new Set<string>();
    let wasModified = false;
    let maleRoomIdx = 0;
    let femaleRoomIdx = 0;

    const processedStudents = loadedStudents.map((s: any) => {
      if (!s) return null;
      let currentNis = s.nis || 'UNTITLED';
      let currentKamar = (s.kamar || '').replace(/^Kamar\s+/i, '').trim();

      if (currentKamar !== s.kamar) {
        wasModified = true;
      }

      // Check if student's room exists in valid rooms for their gender
      const validRooms = s.gender === 'Perempuan' ? validFemaleRooms : validMaleRooms;
      if (s.status === 'Aktif') {
        if (!currentKamar || !validRooms.includes(currentKamar)) {
          if (validRooms.length > 0) {
            if (s.gender === 'Perempuan') {
              currentKamar = validFemaleRooms[femaleRoomIdx % validFemaleRooms.length];
              femaleRoomIdx++;
            } else {
              currentKamar = validMaleRooms[maleRoomIdx % validMaleRooms.length];
              maleRoomIdx++;
            }
          } else {
            currentKamar = s.gender === 'Perempuan' ? 'Az-Zahra 1' : 'Al-Ghazali 1';
          }
          wasModified = true;
        }
      }

      // Ensure NIS is 4 digits
      let cleanNis = currentNis.replace(/[^0-9]/g, '');
      if (cleanNis.length !== 4) {
        const numVal = parseInt(cleanNis, 10);
        cleanNis = isNaN(numVal) || numVal <= 0 ? '0001' : String(numVal).padStart(4, '0');
      }

      currentNis = cleanNis;

      // Handle duplicate NIS in 4-digit format
      while (seenNis.has(currentNis)) {
        wasModified = true;
        let numericNis = parseInt(currentNis, 10);
        if (isNaN(numericNis) || numericNis <= 0) {
          numericNis = 1;
        }
        const nextNum = (numericNis + 1) % 10000;
        currentNis = String(nextNum).padStart(4, '0');
      }
      seenNis.add(currentNis);

      return {
        ...s,
        nis: currentNis,
        kamar: currentKamar,
        fullName: (s.fullName || '').toUpperCase(),
        parentName: (s.parentName || '').toUpperCase(),
        fatherName: (s.fatherName || '').toUpperCase(),
        motherName: (s.motherName || '').toUpperCase(),
        guardianName: s.guardianName ? s.guardianName.toUpperCase() : undefined,
      };
    }).filter(Boolean);

    try {
      localStorage.setItem('pesantren_students', JSON.stringify(processedStudents));
    } catch (setErr) {
      console.error("Failed to save pesantren_students", setErr);
    }
    setStudents(processedStudents);

    setBills(getOrSet('pesantren_bills', []));
    
    // Ensure settings has bank & e-wallet accounts merged
    const loadedSettings = getOrSet('pesantren_settings', DEFAULT_SETTINGS);
    const existingReks = loadedSettings.rekeningList || [];
    const mergedSettings = {
      ...DEFAULT_SETTINGS,
      ...loadedSettings,
      rekeningList: existingReks.length > 0 ? existingReks : DEFAULT_SETTINGS.rekeningList
    };
    const adjustedSettings = autoAdjustPpdbSettings(mergedSettings);
    setSettings(adjustedSettings);
  };

  // Trigger loading & initialization on Component Mount & listen for multi-tab storage & Supabase Realtime sync
  React.useEffect(() => {
    loadLocalDatabase();

    let realtimeChannel: any = null;
    let intervalId: any = null;

    const getLocal = <T,>(key: string, fallback: T): T => {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch {
        return fallback;
      }
    };

    // Dedicated server-level sync for settings, PPDB, and students across all devices
    const syncServerSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const json = await res.json();
          if (json && json.success && json.settings) {
            const remoteSettings = json.settings;
            const currentLocal = getLocal<PortalSettings>('pesantren_settings', DEFAULT_SETTINGS);
            const mergedSettings: PortalSettings = {
              ...currentLocal,
              ...remoteSettings,
              ppdbOpen: typeof remoteSettings.ppdbOpen === 'boolean' ? remoteSettings.ppdbOpen : currentLocal.ppdbOpen,
              ppdbStartDate: remoteSettings.ppdbStartDate !== undefined ? remoteSettings.ppdbStartDate : (currentLocal.ppdbStartDate || ''),
              ppdbEndDate: remoteSettings.ppdbEndDate !== undefined ? remoteSettings.ppdbEndDate : (currentLocal.ppdbEndDate || ''),
            };
            const adjusted = autoAdjustPpdbSettings(mergedSettings);
            setSettings(adjusted);
            localStorage.setItem('pesantren_settings', JSON.stringify(adjusted));

            if (Array.isArray(adjusted.availableFormalClasses) && adjusted.availableFormalClasses.length > 0) {
              setAvailableFormalClasses(adjusted.availableFormalClasses);
              localStorage.setItem('pesantren_available_formal_classes', JSON.stringify(adjusted.availableFormalClasses));
            }
            if (Array.isArray(adjusted.availableMadrasahClasses) && adjusted.availableMadrasahClasses.length > 0) {
              setAvailableMadrasahClasses(adjusted.availableMadrasahClasses);
              localStorage.setItem('pesantren_available_madrasah_classes', JSON.stringify(adjusted.availableMadrasahClasses));
            }
          }
        }
      } catch (e) {
        // network or server error handled gracefully
      }

      // Sync PPDB from server across devices
      try {
        const ppdbRes = await fetch('/api/ppdb');
        if (ppdbRes.ok) {
          const ppdbJson = await ppdbRes.json();
          if (ppdbJson && ppdbJson.success && Array.isArray(ppdbJson.ppdb)) {
            const serverPpdb = ppdbJson.ppdb;
            const localPpdb = getLocal<PCSBRegistration[]>('pesantren_ppdb', []);
            
            // If local has new items not on server, push them
            const serverIds = new Set(serverPpdb.map((p: any) => p.id));
            const unsynced = localPpdb.filter(p => p && p.id && !serverIds.has(p.id));
            if (unsynced.length > 0 && serverPpdb.length > 0) {
              // Push unsynced items to server
              unsynced.forEach(item => {
                fetch('/api/ppdb', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(item)
                }).catch(() => {});
              });
              const merged = [...unsynced, ...serverPpdb];
              setPpdbList(merged);
              localStorage.setItem('pesantren_ppdb', JSON.stringify(merged));
            } else if (serverPpdb.length > 0 || localPpdb.length === 0) {
              setPpdbList(serverPpdb);
              localStorage.setItem('pesantren_ppdb', JSON.stringify(serverPpdb));
            } else if (localPpdb.length > 0 && serverPpdb.length === 0) {
              // Push local to server to initialize server database
              fetch('/api/ppdb', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(localPpdb)
              }).catch(() => {});
            }
          }
        }
      } catch (e) {}

      // Sync PPDB Archive from server across devices
      try {
        const archRes = await fetch('/api/ppdb-archive');
        if (archRes.ok) {
          const archJson = await archRes.json();
          if (archJson && archJson.success && Array.isArray(archJson.archive)) {
            const serverArchive = archJson.archive;
            const localArchive = getLocal<any[]>('pesantren_ppdb_archive', []);
            if (serverArchive.length > 0) {
              const map = new Map<string, any>();
              localArchive.forEach(item => { if (item && item.id) map.set(item.id, item); });
              serverArchive.forEach((item: any) => { if (item && item.id) map.set(item.id, item); });
              const merged = Array.from(map.values());
              localStorage.setItem('pesantren_ppdb_archive', JSON.stringify(merged));
            } else if (localArchive.length > 0) {
              fetch('/api/ppdb-archive', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(localArchive)
              }).catch(() => {});
            }
          }
        }
      } catch (e) {}

      // Sync Students from server across devices
      try {
        const stdRes = await fetch('/api/students');
        if (stdRes.ok) {
          const stdJson = await stdRes.json();
          if (stdJson && stdJson.success && Array.isArray(stdJson.students) && stdJson.students.length > 0) {
            const localStd = getLocal<Student[]>('pesantren_students', []);
            const map = new Map<string, Student>();
            localStd.forEach(s => { if (s && s.id) map.set(s.id, s); });
            stdJson.students.forEach((s: Student) => { if (s && s.id) map.set(s.id, s); });
            const merged = Array.from(map.values());
            setStudents(merged);
            localStorage.setItem('pesantren_students', JSON.stringify(merged));
          }
        }
      } catch (e) {}

      // Sync Staff Users from server across devices
      try {
        const staffRes = await fetch('/api/staff-users');
        if (staffRes.ok) {
          const staffJson = await staffRes.json();
          if (staffJson && staffJson.success && Array.isArray(staffJson.staffUsers) && staffJson.staffUsers.length > 0) {
            const localStaff = getLocal<any[]>('pesantren_staff_users', []);
            const map = new Map<string, any>();
            localStaff.forEach(u => { if (u && u.email) map.set(u.email.toLowerCase(), u); });
            staffJson.staffUsers.forEach((u: any) => { 
              if (u && u.email) {
                map.set(u.email.toLowerCase(), u);
                // Also cache name to local storage so device immediately shows resolved name
                const resolvedName = u.fullName || u.name;
                if (resolvedName) {
                  localStorage.setItem('staff_custom_name_' + u.email.toLowerCase(), resolvedName);
                  if (u.role === 'admin') {
                    localStorage.setItem('admin_custom_name_' + u.email.toLowerCase(), resolvedName);
                  }
                }
              }
            });
            const merged = Array.from(map.values());
            localStorage.setItem('pesantren_staff_users', JSON.stringify(merged));
            
            // Check if current user session needs updated name
            const currentSess = getLocal<any>('pesantren_session', null);
            if (currentSess && currentSess.email) {
              const matched = merged.find(u => u.email.toLowerCase() === currentSess.email.toLowerCase());
              if (matched && (matched.fullName || matched.name) && currentSess.fullName !== (matched.fullName || matched.name)) {
                const updatedSess = { ...currentSess, fullName: matched.fullName || matched.name };
                setSession(updatedSess);
                localStorage.setItem('pesantren_session', JSON.stringify(updatedSess));
              }
            }
            
            window.dispatchEvent(new Event('pesantren_staff_users_updated'));
          }
        }
      } catch (e) {}

      // Sync Staff Configs (names, templates, signatures, stamps) across devices
      try {
        const configRes = await fetch('/api/staff-configs');
        if (configRes.ok) {
          const configJson = await configRes.json();
          if (configJson && configJson.success && configJson.configs) {
            const configs = configJson.configs;
            (['keamanan', 'ketertiban', 'kesehatan'] as const).forEach(dept => {
              if (configs[dept]) {
                const existing = getLocal<any>(`${dept}_config`, {});
                const merged = { ...existing, ...configs[dept] };
                localStorage.setItem(`${dept}_config`, JSON.stringify(merged));
                if (merged.name) {
                  localStorage.setItem(`staff_custom_name_${dept}@alasyariyah.sch.id`, merged.name);
                }
              }
            });
            window.dispatchEvent(new Event('staff_configs_updated'));
          }
        }
      } catch (e) {}
    };

    const refreshCloudData = async () => {
      // Always sync server settings first so all devices receive PPDB status updates
      await syncServerSettings();

      if (!isSupabaseConfigured()) return;
      try {

        const currentLocalNews = getLocal<News[]>('pesantren_news', []);
        const remoteNews = await syncNewsWithSupabase(currentLocalNews);
        if (Array.isArray(remoteNews)) {
          setNews(remoteNews);
          localStorage.setItem('pesantren_news', JSON.stringify(remoteNews));
        }

        const currentLocalAnn = getLocal<Announcement[]>('pesantren_announcements', []);
        const remoteAnn = await syncAnnouncementsWithSupabase(currentLocalAnn);
        if (Array.isArray(remoteAnn)) {
          setAnnouncements(remoteAnn);
          localStorage.setItem('pesantren_announcements', JSON.stringify(remoteAnn));
        }

        const currentLocalStudents = getLocal<Student[]>('pesantren_students', []);
        const remoteStudents = await syncStudentsWithSupabase(currentLocalStudents);
        if (Array.isArray(remoteStudents)) {
          setStudents(remoteStudents);
          localStorage.setItem('pesantren_students', JSON.stringify(remoteStudents));
        }

        const currentLocalPpdb = getLocal<PCSBRegistration[]>('pesantren_ppdb', []);
        const remotePpdb = await syncPpdbWithSupabase(currentLocalPpdb);
        if (Array.isArray(remotePpdb)) {
          setPpdbList(remotePpdb);
          localStorage.setItem('pesantren_ppdb', JSON.stringify(remotePpdb));
        }

        const currentLocalRooms = getLocal<Room[]>('pesantren_rooms', []);
        const remoteRooms = await syncRoomsWithSupabase(currentLocalRooms);
        if (Array.isArray(remoteRooms)) {
          setRooms(remoteRooms);
          localStorage.setItem('pesantren_rooms', JSON.stringify(remoteRooms));
        }

        const currentLocalBills = getLocal<Bill[]>('pesantren_bills', []);
        const remoteBills = await syncBillsWithSupabase(currentLocalBills);
        if (Array.isArray(remoteBills)) {
          setBills(remoteBills);
          localStorage.setItem('pesantren_bills', JSON.stringify(remoteBills));
        }

        const currentLocalSettings = getLocal<PortalSettings>('pesantren_settings', DEFAULT_SETTINGS);
        const remoteSettings = await syncSettingsWithSupabase(currentLocalSettings);
        if (remoteSettings) {
          const mergedSettings: PortalSettings = {
            ...currentLocalSettings,
            ...remoteSettings,
            ppdbOpen: typeof remoteSettings.ppdbOpen === 'boolean' ? remoteSettings.ppdbOpen : currentLocalSettings.ppdbOpen,
            ppdbStartDate: remoteSettings.ppdbStartDate !== undefined ? remoteSettings.ppdbStartDate : (currentLocalSettings.ppdbStartDate || ''),
            ppdbEndDate: remoteSettings.ppdbEndDate !== undefined ? remoteSettings.ppdbEndDate : (currentLocalSettings.ppdbEndDate || ''),
          };
          const adjusted = autoAdjustPpdbSettings(mergedSettings);
          setSettings(adjusted);
          localStorage.setItem('pesantren_settings', JSON.stringify(adjusted));

          if (Array.isArray(adjusted.availableFormalClasses) && adjusted.availableFormalClasses.length > 0) {
            setAvailableFormalClasses(adjusted.availableFormalClasses);
            localStorage.setItem('pesantren_available_formal_classes', JSON.stringify(adjusted.availableFormalClasses));
          }
          if (Array.isArray(adjusted.availableMadrasahClasses) && adjusted.availableMadrasahClasses.length > 0) {
            setAvailableMadrasahClasses(adjusted.availableMadrasahClasses);
            localStorage.setItem('pesantren_available_madrasah_classes', JSON.stringify(adjusted.availableMadrasahClasses));
          }
        }

        // Sinkronisasi data Akun Pengurus & Hak Akses (staff_users)
        const currentLocalStaff = getLocal<any[]>('pesantren_staff_users', []);
        const remoteStaff = await syncStaffUsersWithSupabase(currentLocalStaff);
        if (Array.isArray(remoteStaff) && remoteStaff.length > 0) {
          localStorage.setItem('pesantren_staff_users', JSON.stringify(remoteStaff));
          window.dispatchEvent(new Event('pesantren_staff_users_updated'));
        }

        // Sinkronisasi data Master Kelas & Sekolah (Formal & Madrasah Diniyah)
        const currentLocalFormal = getLocal<string[]>('pesantren_available_formal_classes', availableFormalClasses);
        const currentLocalMadrasah = getLocal<string[]>('pesantren_available_madrasah_classes', availableMadrasahClasses);
        const remoteClasses = await syncMasterClassesWithSupabase({
          formal: currentLocalFormal,
          madrasah: currentLocalMadrasah
        });
        if (remoteClasses) {
          if (Array.isArray(remoteClasses.formal) && remoteClasses.formal.length > 0) {
            setAvailableFormalClasses(remoteClasses.formal);
            localStorage.setItem('pesantren_available_formal_classes', JSON.stringify(remoteClasses.formal));
          }
          if (Array.isArray(remoteClasses.madrasah) && remoteClasses.madrasah.length > 0) {
            setAvailableMadrasahClasses(remoteClasses.madrasah);
            localStorage.setItem('pesantren_available_madrasah_classes', JSON.stringify(remoteClasses.madrasah));
          }
        }
      } catch (err) {
        console.error("Supabase cloud sync error:", err);
      }
    };

    const setupSupabaseAndSync = async () => {
      // 1. Check server-side config if local not set
      await initSupabaseFromRemoteConfig();

      // 2. Perform initial sync
      await refreshCloudData();

      // 3. Setup realtime WebSocket listener if Supabase is active
      if (isSupabaseConfigured()) {
        if (realtimeChannel) realtimeChannel.unsubscribe();
        realtimeChannel = subscribeToSupabaseRealtime(() => {
          refreshCloudData();
        });
      }

      // 4. Polling interval fallback (every 5 seconds) to ensure multi-device sync
      if (intervalId) clearInterval(intervalId);
      intervalId = setInterval(() => {
        refreshCloudData();
      }, 5000);
    };

    setupSupabaseAndSync();

    const handleStorageChange = () => {
      loadLocalDatabase();
      refreshCloudData();
    };

    const handleWindowFocus = () => {
      refreshCloudData();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('pesantren_db_sync', handleStorageChange);
    window.addEventListener('pesantren_settings_updated', handleStorageChange);
    window.addEventListener('focus', handleWindowFocus);

    // Restore login session if saved
    const storedSession = localStorage.getItem('pesantren_session');
    if (storedSession) {
      const parsedSess = JSON.parse(storedSession);
      if (parsedSess.role === 'santri') {
        const studentId = parsedSess.studentId;
        const localStudents = getLocal<Student[]>('pesantren_students', []);
        const currentStudent = localStudents.find(s => s.id === studentId);
        if (currentStudent && currentStudent.status === 'Alumni') {
          localStorage.removeItem('pesantren_session');
          setSession(null);
          setView('home');
          return;
        }
      }
      setSession(parsedSess);
      setAdminTab('overview');
      setStaffTab('students');
      setSantriTab('tagihan');
      if (parsedSess.role === 'admin') {
        setView('admin-dashboard');
      } else if (parsedSess.role === 'santri') {
        setView('santri-dashboard');
      } else if (['keamanan', 'ketertiban', 'kesehatan'].includes(parsedSess.role)) {
        setView('staff-dashboard');
      }
    }

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('pesantren_db_sync', handleStorageChange);
      window.removeEventListener('pesantren_settings_updated', handleStorageChange);
      window.removeEventListener('focus', handleWindowFocus);
      if (realtimeChannel) realtimeChannel.unsubscribe();
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  // Update localStorage when lists change
  React.useEffect(() => {
    if (news.length > 0) localStorage.setItem('pesantren_news', JSON.stringify(news));
  }, [news]);

  React.useEffect(() => {
    if (announcements.length > 0) localStorage.setItem('pesantren_announcements', JSON.stringify(announcements));
  }, [announcements]);

  React.useEffect(() => {
    if (ppdbList.length > 0) {
      try {
        localStorage.setItem('pesantren_ppdb', JSON.stringify(ppdbList));
      } catch (err) {
        console.error("Failed to save PPDB list:", err);
      }
    }
  }, [ppdbList]);

  React.useEffect(() => {
    if (students.length > 0) {
      try {
        localStorage.setItem('pesantren_students', JSON.stringify(students));
      } catch (err) {
        console.error("Failed to save student data:", err);
        setToastMessage('⚠️ Gagal menyimpan data (Penyimpanan browser penuh). Harap gunakan foto profil berukuran lebih kecil.');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 5000);
      }
    }
  }, [students]);

  React.useEffect(() => {
    if (rooms.length > 0) {
      try {
        localStorage.setItem('pesantren_rooms', JSON.stringify(rooms));
      } catch (err) {
        console.error("Failed to save rooms:", err);
      }
    }
  }, [rooms]);

  React.useEffect(() => {
    if (bills.length > 0) {
      try {
        localStorage.setItem('pesantren_bills', JSON.stringify(bills));
      } catch (err) {
        console.error("Failed to save bills:", err);
      }
    }
  }, [bills]);

  const saveSettings = (newSettings: PortalSettings) => {
    const adjusted = autoAdjustPpdbSettings(newSettings);
    setSettings(adjusted);
    localStorage.setItem('pesantren_settings', JSON.stringify(adjusted));
    pushSettingsToSupabase(adjusted).catch(e => console.error("Push settings error:", e));
  };


  const handleLoginSuccess = (newSession: UserSession) => {
    setSession(newSession);
    localStorage.setItem('pesantren_session', JSON.stringify(newSession));
    
    // Always open first/statistics tab on login
    setAdminTab('overview');
    setStaffTab('students');
    setSantriTab('tagihan');

    // Redirect based on role
    if (newSession.role === 'admin') {
      setView('admin-dashboard');
    } else if (newSession.role === 'santri') {
      setView('santri-dashboard');
    } else if (['keamanan', 'ketertiban', 'kesehatan'].includes(newSession.role)) {
      setView('staff-dashboard');
    }
  };

  const handleLogout = () => {
    setSession(null);
    localStorage.removeItem('pesantren_session');
    setView('home');
  };

  // Submit PCSB Online
  const handlePpdbSubmit = async (newReg: Omit<PCSBRegistration, 'id' | 'registrationDate' | 'status'>) => {
    const regWithId: PCSBRegistration = {
      ...newReg,
      id: `ppdb-${Date.now()}`,
      registrationDate: new Date().toISOString().split('T')[0],
      status: 'Pending'
    };
    const updatedList = [regWithId, ...ppdbList];
    setPpdbList(updatedList);
    try {
      localStorage.setItem('pesantren_ppdb', JSON.stringify(updatedList));
    } catch (e) {
      console.error(e);
    }
    window.dispatchEvent(new Event('pesantren_db_sync'));

    // Push to server for multi-device cross-browser access
    try {
      fetch('/api/ppdb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regWithId)
      }).catch(e => console.warn("Failed to push to /api/ppdb:", e));
    } catch (e) {}

    if (!isSupabaseConfigured()) {
      await initSupabaseFromRemoteConfig();
    }
    if (isSupabaseConfigured()) {
      await pushPpdbToSupabase(regWithId).catch(err => console.error("Error pushing PPDB to Supabase:", err));
      window.dispatchEvent(new Event('pesantren_db_sync'));
    }
  };

  // Current logged in student obj for the student screen (Alumni cannot login as active santri/wali)
  const currentStudent = session?.studentId 
    ? students.find(s => s.id === session.studentId && s.status !== 'Alumni') 
    : null;

  // Auto-logout if student transitioned to alumni while session is active
  React.useEffect(() => {
    if (session?.role === 'santri' && session.studentId) {
      const std = students.find(s => s.id === session.studentId);
      if (std && std.status === 'Alumni') {
        handleLogout();
        setToastMessage(`Akses login wali santri dinonaktifkan karena status santri telah menjadi ALUMNI.`);
        setShowToast(true);
      }
    }
  }, [students, session]);

  // Touch Gesture Handlers for Pull to Refresh
  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0 && !isRefreshing) {
      touchStartRef.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartRef.current !== null && !isRefreshing) {
      const currentY = e.touches[0].clientY;
      const distance = currentY - touchStartRef.current;
      if (distance > 0) {
        const dampened = Math.min(100, distance * 0.45);
        setPullDistance(dampened);
        // Prevent scroll when dragging down
        if (dampened > 10 && e.cancelable) {
          e.preventDefault();
        }
      }
    }
  };

  const handleTouchEnd = () => {
    if (touchStartRef.current !== null && !isRefreshing) {
      if (pullDistance >= 70) {
        triggerRefresh();
      } else {
        setPullDistance(0);
      }
      touchStartRef.current = null;
    }
  };

  // Mouse Drag Handlers for Desktop Pull to Refresh
  const handleMouseDown = (e: React.MouseEvent) => {
    if (window.scrollY === 0 && !isRefreshing) {
      setIsMouseDown(true);
      mouseDownYRef.current = e.clientY;
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isMouseDown && mouseDownYRef.current !== null && !isRefreshing) {
      const distance = e.clientY - mouseDownYRef.current;
      if (distance > 0) {
        setPullDistance(Math.min(100, distance * 0.45));
      }
    }
  };

  const handleMouseUp = () => {
    if (isMouseDown && !isRefreshing) {
      setIsMouseDown(false);
      if (pullDistance >= 70) {
        triggerRefresh();
      } else {
        setPullDistance(0);
      }
      mouseDownYRef.current = null;
    }
  };

  // Pull-to-refresh execution
  const triggerRefresh = () => {
    setIsRefreshing(true);
    setPullDistance(65);

    setTimeout(() => {
      // Re-read local storage
      const getOrSet = (key: string, initialData: any) => {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : initialData;
      };

      setNews(getOrSet('pesantren_news', []));
      setAnnouncements(getOrSet('pesantren_announcements', []));
      setPpdbList(getOrSet('pesantren_ppdb', []));
      setStudents(getOrSet('pesantren_students', []));
      setRooms(getOrSet('pesantren_rooms', []));
      setBills(getOrSet('pesantren_bills', []));
      setSettings(getOrSet('pesantren_settings', DEFAULT_SETTINGS));

      setIsRefreshing(false);
      setPullDistance(0);
    }, 800);
  };

  // Clear local storage and reset to empty state & default settings
  const masterResetDatabase = () => {
    setIsRefreshing(true);
    setPullDistance(65);

    setTimeout(() => {
      localStorage.removeItem('pesantren_news');
      localStorage.removeItem('pesantren_announcements');
      localStorage.removeItem('pesantren_ppdb');
      localStorage.removeItem('pesantren_ppdb_archive');
      localStorage.removeItem('pesantren_students');
      localStorage.removeItem('pesantren_rooms');
      localStorage.removeItem('pesantren_bills');
      localStorage.removeItem('pesantren_settings');

      setNews([]);
      setAnnouncements([]);
      setPpdbList([]);
      setStudents([]);
      setRooms([]);
      setBills([]);
      setSettings(DEFAULT_SETTINGS);

      setIsRefreshing(false);
      setPullDistance(0);

      setToastMessage('Data lokal berhasil dibersihkan! 🧹🎉');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }, 1500);
  };

  if (viewArticleId) {
    const article = news.find(n => n.id === viewArticleId);
    if (article) {
      return (
        <div className="min-h-screen bg-slate-50 font-sans selection:bg-amber-400 selection:text-teal-950 p-4 md:p-12">
          <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-xl border border-gray-150 overflow-hidden">
            {/* Kop Surat Header style */}
            <div className="bg-gradient-to-r from-emerald-900 to-teal-950 text-white p-6 md:p-8 text-center border-b-4 border-amber-400 relative">
              <h1 className="text-xl md:text-2xl font-black tracking-wide uppercase font-sans">{settings.schoolName}</h1>
              <p className="text-[10px] md:text-xs text-emerald-100/90 font-medium tracking-wide mt-1">
                Alamat: {settings.address} | Telp: {settings.phone}
              </p>
            </div>
            
            <div className="p-6 md:p-10 space-y-6">
              {/* Back to Portal button */}
              <button 
                onClick={() => {
                  setViewArticleId(null);
                  window.history.pushState({}, '', window.location.pathname);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition duration-150 cursor-pointer"
              >
                ← Kembali ke Portal Beranda
              </button>

              <div className="relative h-64 sm:h-80 md:h-96 rounded-2xl overflow-hidden bg-slate-100 border border-gray-150">
                <img 
                  src={article.image} 
                  alt={article.title} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <span className="absolute top-4 left-4 bg-emerald-800 text-white font-extrabold text-[9px] uppercase px-3 py-1 rounded-full tracking-wider shadow-sm">
                  {article.category}
                </span>
              </div>

              <div className="space-y-3">
                <h2 className="text-xl md:text-3xl font-black text-slate-900 leading-tight">
                  {article.title}
                </h2>
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 font-mono">
                  <span>Penulis: <span className="font-bold text-slate-600">{article.author}</span></span>
                  <span>•</span>
                  <span>Tanggal: <span className="font-bold text-slate-600">{article.date}</span></span>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-6">
                <p className="text-gray-700 text-sm md:text-base leading-relaxed whitespace-pre-line font-sans">
                  {article.content}
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }
  }

  return (
    <div 
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className="min-h-screen bg-neutral-50/70 text-neutral-800 flex flex-col font-sans selection:bg-amber-400 selection:text-teal-950"
    >
      
      {/* Top sticky navbar */}
      <Navbar 
        currentView={currentView}
        setView={setView}
        session={session}
        onLogout={handleLogout}
        onOpenLogin={() => setIsLoginOpen(true)}
        schoolName={settings.schoolName}
        logoUrl={settings.logoUrl}
        settings={settings}
        ppdbOpen={settings.ppdbOpen}
        ppdbStartDate={settings.ppdbStartDate}
        ppdbEndDate={settings.ppdbEndDate}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        students={students}
        adminTab={adminTab}
        setAdminTab={setAdminTab}
        staffTab={staffTab}
        setStaffTab={setStaffTab}
        santriTab={santriTab}
        setSantriTab={setSantriTab}
        showStudentCard={showStudentCard}
        setShowStudentCard={setShowStudentCard}
        isAccountOpen={isAccountOpen}
        setIsAccountOpen={setIsAccountOpen}
      />



      {/* Main Container */}
      <main className={`flex-grow flex flex-col transition-all duration-300 ${session && isAccountOpen ? 'lg:pl-64' : ''}`}>
        {currentView === 'home' && (
          <div className="flex-grow flex flex-col bg-white">
            <Hero 
              onJoinPCSB={() => setView('ppdb')} 
              schoolName={settings.schoolName}
              tagline={settings.tagline}
              ppdbOpen={settings.ppdbOpen}
              ppdbStartDate={settings.ppdbStartDate}
              ppdbEndDate={settings.ppdbEndDate}
            />
            <PublicPortal 
              news={news}
              announcements={announcements}
              settings={settings}
              setView={setView}
              onOpenLogin={() => setIsLoginOpen(true)}
              session={session}
              className="flex-grow"
              currentView="home"
            />
          </div>
        )}

        {currentView === 'profile' && (
          <div className="flex-grow flex flex-col bg-slate-50">
            <PublicPortal 
              news={news}
              announcements={announcements}
              settings={settings}
              setView={setView}
              onOpenLogin={() => setIsLoginOpen(true)}
              session={session}
              className="flex-grow"
              currentView="profile"
            />
          </div>
        )}

        {currentView === 'news' && (
          <div className="flex-grow flex flex-col bg-slate-50 py-8">
            <PublicPortal 
              news={news}
              announcements={announcements}
              settings={settings}
              setView={setView}
              onOpenLogin={() => setIsLoginOpen(true)}
              session={session}
              className="flex-grow"
              currentView="news"
            />
          </div>
        )}

        {currentView === 'announcements' && (
          <div className="flex-grow flex flex-col bg-slate-50 py-8">
            <PublicPortal 
              news={news}
              announcements={announcements}
              settings={settings}
              setView={setView}
              onOpenLogin={() => setIsLoginOpen(true)}
              session={session}
              className="flex-grow"
              currentView="announcements"
            />
          </div>
        )}

        {currentView === 'ppdb' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <PCSBForm 
              onSubmit={handlePpdbSubmit} 
              ppdbOpen={settings.ppdbOpen}
              ppdbStartDate={settings.ppdbStartDate}
              ppdbEndDate={settings.ppdbEndDate}
              settings={settings}
              onBackToHome={() => setView('home')}
            />
          </div>
        )}

        {currentView === 'admin-dashboard' && (
          session?.role === 'admin' ? (
            <AdminDashboard 
              students={students}
              setStudents={setStudents}
              rooms={rooms}
              setRooms={setRooms}
              bills={bills}
              setBills={setBills}
              news={news}
              setNews={setNews}
              announcements={announcements}
              setAnnouncements={setAnnouncements}
              ppdbList={ppdbList}
              setPpdbList={setPpdbList}
              settings={settings}
              setSettings={saveSettings}
              onLogout={handleLogout}
              activeTab={adminTab}
              setActiveTab={setAdminTab}
              session={session}
              availableFormalClasses={availableFormalClasses}
              setAvailableFormalClasses={setAvailableFormalClasses}
              availableMadrasahClasses={availableMadrasahClasses}
              setAvailableMadrasahClasses={setAvailableMadrasahClasses}
            />
          ) : (
            <div className="max-w-md mx-auto p-12 text-center space-y-4">
              <h2 className="text-xl font-bold text-red-700">Akses Ditolak</h2>
              <p className="text-xs text-gray-500">Anda harus masuk dengan akun administrator muarifsamsul082@gmail.com</p>
              <button 
                onClick={() => setIsLoginOpen(true)} 
                className="px-4 py-2 bg-emerald-800 text-white rounded font-bold text-xs"
              >
                Log In Admin
              </button>
            </div>
          )
        )}

        {currentView === 'santri-dashboard' && (
          session?.role === 'santri' && currentStudent ? (
            <SantriDashboard 
              student={currentStudent}
              bills={bills}
              setBills={setBills}
              announcements={announcements}
              settings={settings}
              onLogout={handleLogout}
              activeSantriTab={santriTab}
              setActiveSantriTab={setSantriTab}
              showStudentCard={showStudentCard}
              setShowStudentCard={setShowStudentCard}
              students={students}
              setStudents={setStudents}
            />
          ) : (
            <div className="max-w-md mx-auto p-12 text-center space-y-4">
              <h2 className="text-xl font-bold text-red-700">Akses Portal Ditolak</h2>
              <p className="text-xs text-gray-500">Silakan login sebagai santri menggunakan NISN resmi Anda.</p>
              <button 
                onClick={() => setIsLoginOpen(true)} 
                className="px-4 py-2 bg-emerald-800 text-white rounded font-bold text-xs"
              >
                Log In Santri
              </button>
            </div>
          )
        )}

        {currentView === 'staff-dashboard' && (
          session && ['keamanan', 'ketertiban', 'kesehatan'].includes(session.role) ? (
            <StaffDashboard 
              session={session}
              students={students}
              setStudents={setStudents}
              onLogout={handleLogout}
              activeSubTab={staffTab}
              setActiveSubTab={setStaffTab}
            />
          ) : (
            <div className="max-w-md mx-auto p-12 text-center space-y-4">
              <h2 className="text-xl font-bold text-red-700">Akses Pengurus Ditolak</h2>
              <p className="text-xs text-gray-500">Silakan login sebagai pengurus bidang.</p>
              <button 
                onClick={() => setIsLoginOpen(true)} 
                className="px-4 py-2 bg-emerald-800 text-white rounded font-bold text-xs"
              >
                Log In Pengurus
              </button>
            </div>
          )
        )}
      </main>

      {/* Unified Login modal */}
      <LoginModal 
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

    </div>
  );
}
