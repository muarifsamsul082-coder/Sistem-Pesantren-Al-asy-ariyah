import React from 'react';
import { BookOpen, LogIn, LogOut, Shield, User, Menu, X, Landmark, GraduationCap, Users, Sun, Moon, CreditCard, Sparkles, Home, Search, HelpCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { UserSession, Student, PortalSettings, PCSBRegistration } from '../types';
import { isPpdbCurrentlyActive } from '../lib/dateUtils';
import { isSupabaseConfigured, pushSettingsToSupabase, pushStaffConfigToSupabase, pushAllStaffUsersToSupabase, getDeletedIdsSet } from '../lib/supabase';

interface NavbarProps {
  currentView: string;
  setView: (view: string) => void;
  session: UserSession | null;
  onLogout: () => void;
  onOpenLogin: () => void;
  schoolName: string;
  logoUrl?: string;
  darkMode?: boolean;
  setDarkMode?: (val: boolean) => void;
  students?: Student[];
  ppdbList?: PCSBRegistration[];
  settings?: PortalSettings;
  ppdbOpen?: boolean;
  ppdbStartDate?: string;
  ppdbEndDate?: string;
  
  adminTab?: 'overview' | 'perizinan' | 'news_ann' | 'ppdb' | 'students' | 'kamar' | 'alumni' | 'bills' | 'laporan_keuangan' | 'rekening' | 'settings' | 'whatsapp' | 'input_mandiri' | 'reports' | 'outbox_log' | 'kelas_sekolah' | 'pengurus' | 'akun_pengurus' | 'staff_activity_log';
  setAdminTab?: (tab: any) => void;
  staffTab?: 'students' | 'history' | 'profile' | 'skck' | 'takzir_letter' | 'letters';
  setStaffTab?: (tab: any) => void;
  santriTab?: 'tagihan' | 'pelanggaran' | 'kesehatan' | 'pengumuman' | 'perizinan';
  setSantriTab?: (tab: any) => void;
  showStudentCard?: boolean;
  setShowStudentCard?: (show: boolean) => void;
  isAccountOpen?: boolean;
  setIsAccountOpen?: (val: boolean) => void;
}

export default function Navbar({
  currentView,
  setView,
  session,
  onLogout,
  onOpenLogin,
  schoolName,
  logoUrl,
  darkMode = false,
  setDarkMode = () => {},
  students = [],
  ppdbList = [],
  settings,
  ppdbOpen,
  ppdbStartDate,
  ppdbEndDate,
  adminTab,
  setAdminTab,
  staffTab,
  setStaffTab,
  santriTab,
  setSantriTab,
  showStudentCard,
  setShowStudentCard,
  isAccountOpen: propIsAccountOpen,
  setIsAccountOpen: propSetIsAccountOpen
}: NavbarProps) {
  const [isNavOpen, setIsNavOpen] = React.useState(false);
  const [logoImgError, setLogoImgError] = React.useState(false);

  // Admin menu accordions: only for Pembayaran, Log Surat & Sistem, and Persetujuan & Daftar Pengurus
  const [navSearchQuery, setNavSearchQuery] = React.useState('');
  const [adminMenuAccordions, setAdminMenuAccordions] = React.useState<Record<string, boolean>>({
    pembayaran: true,
    pengurus: true,
    log: false,
  });

  const toggleAdminAccordion = (category: string) => {
    setAdminMenuAccordions(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  // Automatically expand group containing active tab
  React.useEffect(() => {
    if (!adminTab) return;
    if (['bills', 'laporan_keuangan', 'rekening'].includes(adminTab)) {
      setAdminMenuAccordions(prev => ({ ...prev, pembayaran: true }));
    } else if (['akun_pengurus', 'pengurus'].includes(adminTab)) {
      setAdminMenuAccordions(prev => ({ ...prev, pengurus: true }));
    } else if (['outbox_log', 'staff_activity_log'].includes(adminTab)) {
      setAdminMenuAccordions(prev => ({ ...prev, log: true }));
    }
  }, [adminTab]);

  const activeLogo = logoUrl || settings?.logoUrl || '';

  React.useEffect(() => {
    setLogoImgError(false);
  }, [activeLogo]);

  const ppdbStatus = isPpdbCurrentlyActive({
    ppdbOpen: settings?.ppdbOpen ?? ppdbOpen,
    ppdbStartDate: settings?.ppdbStartDate ?? ppdbStartDate,
    ppdbEndDate: settings?.ppdbEndDate ?? ppdbEndDate
  });
  
  // Use passed state or local fallback if not provided
  const [localAccountOpen, setLocalAccountOpen] = React.useState(false);
  const isAccountOpen = propIsAccountOpen !== undefined ? propIsAccountOpen : localAccountOpen;
  const setIsAccountOpen = propSetIsAccountOpen !== undefined ? propSetIsAccountOpen : setLocalAccountOpen;

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const isMobile = window.innerWidth < 1024;
    const shouldLock = isNavOpen || (isMobile && session?.role !== 'santri' && isAccountOpen);
    if (shouldLock) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isNavOpen, isAccountOpen, session]);

  // Profile Modal & Verification Notification states
  const [profileUpdateTrigger, setProfileUpdateTrigger] = React.useState(0);
  const [pendingStaffCount, setPendingStaffCount] = React.useState<number>(0);
  const [pendingPcsbCount, setPendingPcsbCount] = React.useState<number>(0);

  const checkPendingCounts = React.useCallback(() => {
    try {
      const saved = localStorage.getItem('pesantren_staff_users');
      if (saved) {
        const users = JSON.parse(saved);
        if (Array.isArray(users)) {
          const count = users.filter((u: any) => u && u.isConfirmed === false).length;
          setPendingStaffCount(count);
        } else {
          setPendingStaffCount(0);
        }
      } else {
        setPendingStaffCount(0);
      }
    } catch (e) {
      setPendingStaffCount(0);
    }

    try {
      const delPpdb = getDeletedIdsSet('ppdb');
      if (Array.isArray(ppdbList)) {
        const count = ppdbList.filter((p: any) => p && p.id && !delPpdb.has(p.id) && (p.status === 'Pending' || p.status === 'Diproses')).length;
        setPendingPcsbCount(count);
      } else {
        const savedPpdb = localStorage.getItem('pesantren_ppdb');
        if (savedPpdb) {
          const list = JSON.parse(savedPpdb);
          if (Array.isArray(list)) {
            const count = list.filter((p: any) => p && p.id && !delPpdb.has(p.id) && (p.status === 'Pending' || p.status === 'Diproses')).length;
            setPendingPcsbCount(count);
          } else {
            setPendingPcsbCount(0);
          }
        } else {
          setPendingPcsbCount(0);
        }
      }
    } catch (e) {
      setPendingPcsbCount(0);
    }
  }, [ppdbList]);

  React.useEffect(() => {
    checkPendingCounts();
  }, [ppdbList, checkPendingCounts]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      checkPendingCounts();
    }, 0);
    const handleUpdate = () => {
      setTimeout(() => {
        checkPendingCounts();
      }, 0);
    };
    window.addEventListener('pesantren_staff_users_updated', handleUpdate);
    window.addEventListener('pesantren_ppdb_updated', handleUpdate);
    window.addEventListener('pesantren_db_sync', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('pesantren_staff_users_updated', handleUpdate);
      window.removeEventListener('pesantren_ppdb_updated', handleUpdate);
      window.removeEventListener('pesantren_db_sync', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [checkPendingCounts]);

  React.useEffect(() => {
    const handleUpdate = () => {
      setTimeout(() => {
        setProfileUpdateTrigger(prev => prev + 1);
      }, 0);
    };
    window.addEventListener('staff_configs_updated', handleUpdate);
    window.addEventListener('pesantren_settings_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('staff_configs_updated', handleUpdate);
      window.removeEventListener('pesantren_settings_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const [isProfileModalOpen, setIsProfileModalOpen] = React.useState(false);
  const [showAccountDetails, setShowAccountDetails] = React.useState(false);
  const [currentPasswordInput, setCurrentPasswordInput] = React.useState('');
  const [newPasswordInput, setNewPasswordInput] = React.useState('');
  const [profileError, setProfileError] = React.useState('');
  const [profileSuccess, setProfileSuccess] = React.useState('');

  const [customNameInput, setCustomNameInput] = React.useState('');
  const [customAvatar, setCustomAvatar] = React.useState<string>(() => {
    if (!session) return '';
    return localStorage.getItem(`pesantren_avatar_${session.email || session.role || 'default'}`) || '';
  });

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setCustomAvatar(base64String);
        if (session) {
          localStorage.setItem(`pesantren_avatar_${session.email || session.role || 'default'}`, base64String);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Get current user details and identifier (Unified with dashboard greetings)
  let userName = 'User';
  let userEmail = '-';
  let userIdentifier = ''; // used for keying custom passwords
  let defaultPass = '';

  if (session) {
    if (session.role === 'admin') {
      const emailKey = (session.email || 'muarifsamsul082@gmail.com').toLowerCase();
      let adminName = session.fullName || '';
      if (!adminName) {
        adminName = localStorage.getItem('admin_custom_name_' + emailKey) || '';
      }
      if (!adminName) {
        try {
          const staffUsers = JSON.parse(localStorage.getItem('pesantren_staff_users') || '[]');
          const found = staffUsers.find((u: any) => u && u.email && u.email.toLowerCase() === emailKey);
          if (found && (found.fullName || found.name)) adminName = found.fullName || found.name;
        } catch (e) {}
      }
      if (!adminName && emailKey === 'muarifsamsul082@gmail.com') {
        adminName = 'Ustadz Samsul';
      }
      if (!adminName) {
        adminName = 'Admin Utama';
      }
      userName = adminName;
      userEmail = session.email || 'muarifsamsul082@gmail.com';
      userIdentifier = userEmail;
      defaultPass = 'admin123';
    } else if (['keamanan', 'ketertiban', 'kesehatan'].includes(session.role)) {
      const emailKey = (session.email || `${session.role}@alasyariyah.sch.id`).toLowerCase();
      let staffName = localStorage.getItem('staff_custom_name_' + emailKey) || 
                      localStorage.getItem('staff_custom_name_' + session.role) || 
                      session.fullName || '';
      if (!staffName) {
        try {
          const staffUsers = JSON.parse(localStorage.getItem('pesantren_staff_users') || '[]');
          const found = staffUsers.find((u: any) => (u && u.email && u.email.toLowerCase() === emailKey) || u.role === session.role);
          if (found && (found.fullName || found.name)) staffName = found.fullName || found.name;
        } catch (e) {}
      }
      if (!staffName) {
        try {
          const storedConfig = localStorage.getItem(`${session.role}_config`);
          if (storedConfig) {
            const parsed = JSON.parse(storedConfig);
            if (parsed.name) staffName = parsed.name;
          }
        } catch (e) {}
      }
      const defaults: Record<string, string> = {
        keamanan: 'Petugas Keamanan',
        ketertiban: 'Petugas Ketertiban',
        kesehatan: 'Petugas Kesehatan'
      };
      if (!staffName) staffName = defaults[session.role] || `Biro ${session.role}`;
      userName = staffName;
      userEmail = session.email || `${session.role}@alasyariyah.sch.id`;
      userIdentifier = userEmail;
      defaultPass = `${session.role}123`;
    } else if (session.role === 'santri') {
      const curStudent = (students || []).find(s => s.id === session.studentId);
      if (curStudent?.parentName) {
        userName = `Bpk/Ibu ${curStudent.parentName}`;
      } else if (curStudent?.fullName) {
        userName = `Wali Santri ${curStudent.fullName}`;
      } else {
        userName = 'Wali Santri';
      }
      userEmail = curStudent?.parentPhone || session.email || '-';
      userIdentifier = (curStudent?.parentPhone || '').replace(/[^0-9]/g, '');
      defaultPass = curStudent?.nis || '';
    }
  }

  React.useEffect(() => {
    if (isProfileModalOpen && userName) {
      setCustomNameInput(userName);
    }
  }, [isProfileModalOpen, userName]);

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    if (!currentPasswordInput || !newPasswordInput) {
      setProfileError('Harap isi password sebelumnya dan password baru!');
      return;
    }

    let customPasswords: Record<string, string> = {};
    try {
      customPasswords = JSON.parse(localStorage.getItem('pesantren_custom_passwords') || '{}');
    } catch (err) {
      console.error(err);
    }

    const correctCurrentPassword = customPasswords[userIdentifier] || defaultPass;

    if (currentPasswordInput.trim() !== correctCurrentPassword) {
      setProfileError('Password sebelumnya tidak cocok!');
      return;
    }

    if (newPasswordInput.trim().length < 4) {
      setProfileError('Password baru minimal 4 karakter!');
      return;
    }

    customPasswords[userIdentifier] = newPasswordInput.trim();
    localStorage.setItem('pesantren_custom_passwords', JSON.stringify(customPasswords));

    setProfileSuccess('Password berhasil diperbarui!');
    setCurrentPasswordInput('');
    setNewPasswordInput('');
  };

  const handleSaveProfileName = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    if (!customNameInput.trim()) {
      setProfileError('Nama tidak boleh kosong!');
      return;
    }

    const newName = customNameInput.trim();

    if (session?.role === 'admin') {
      const emailKey = (session.email || 'muarifsamsul082@gmail.com').toLowerCase();
      localStorage.setItem('admin_custom_name_' + emailKey, newName);
      localStorage.setItem('admin_custom_name_muarifsamsul082@gmail.com', newName);
      localStorage.setItem('admin_custom_name_admin@alasyariyah.sch.id', newName);

      // 1. Update in staff users list and sync to menu persetujuan & akun pengurus
      try {
        const staffUsers = JSON.parse(localStorage.getItem('pesantren_staff_users') || '[]');
        let found = false;
        const updatedStaff = staffUsers.map((u: any) => {
          if (
            u.role === 'admin' ||
            u.id === 'usr-admin' ||
            (u.email && (u.email.toLowerCase() === emailKey || u.email.toLowerCase() === 'admin@alasyariyah.sch.id' || u.email.toLowerCase() === 'muarifsamsul082@gmail.com'))
          ) {
            found = true;
            return { ...u, fullName: newName, name: newName };
          }
          return u;
        });

        if (!found) {
          updatedStaff.unshift({
            id: 'usr-admin',
            fullName: newName,
            name: newName,
            email: emailKey,
            role: 'admin',
            isConfirmed: true,
            registeredAt: new Date().toISOString().split('T')[0]
          });
        }

        localStorage.setItem('pesantren_staff_users', JSON.stringify(updatedStaff));
        window.dispatchEvent(new Event('pesantren_staff_users_updated'));
        if (isSupabaseConfigured()) {
          pushAllStaffUsersToSupabase(updatedStaff).catch(() => {});
        }
        fetch('/api/staff-users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedStaff)
        }).catch(() => {});
      } catch (e) {}

      // 2. Update settings only if user holds specific official role
      try {
        const curSettings = JSON.parse(localStorage.getItem('pesantren_settings') || '{}');
        const userRole = (session?.role || '').toLowerCase().trim();
        const updatedSettings = {
          ...curSettings,
          // Only update namaPengasuh if the logged-in user is explicitly the Pengasuh role
          ...(userRole.includes('pengasuh') ? { namaPengasuh: newName } : {})
        };
        localStorage.setItem('pesantren_settings', JSON.stringify(updatedSettings));
        window.dispatchEvent(new CustomEvent('pesantren_settings_updated', { detail: updatedSettings }));
        fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedSettings)
        }).catch(() => {});
        if (isSupabaseConfigured()) {
          pushSettingsToSupabase(updatedSettings).catch(() => {});
        }
      } catch (e) {}

      // 3. Update current session object in storage
      try {
        const storedSess = sessionStorage.getItem('pesantren_session') || localStorage.getItem('pesantren_session');
        if (storedSess) {
          const parsed = JSON.parse(storedSess);
          parsed.fullName = newName;
          parsed.roleName = newName;
          sessionStorage.setItem('pesantren_session', JSON.stringify(parsed));
          localStorage.setItem('pesantren_session', JSON.stringify(parsed));
        }
      } catch (e) {}

      window.dispatchEvent(new Event('pesantren_admin_name_updated'));
      window.dispatchEvent(new Event('pesantren_staff_users_updated'));
      window.dispatchEvent(new Event('pesantren_db_sync'));
      setProfileUpdateTrigger(prev => prev + 1);
      setProfileSuccess('Nama profil akun berhasil disinkronkan ke akun pengurus & menu persetujuan!');
    } else if (session && ['keamanan', 'ketertiban', 'kesehatan'].includes(session.role)) {
      const emailKey = (session.email || `${session.role}@alasyariyah.sch.id`).toLowerCase();
      localStorage.setItem('staff_custom_name_' + emailKey, newName);
      localStorage.setItem('staff_custom_name_' + session.role, newName);

      // Update in staff users list and sync to menu persetujuan & database
      try {
        const staffUsers = JSON.parse(localStorage.getItem('pesantren_staff_users') || '[]');
        let found = false;
        const updatedStaff = staffUsers.map((u: any) => {
          if (
            (u.email && u.email.toLowerCase() === emailKey) ||
            u.role === session.role ||
            (session.userId && u.id === session.userId)
          ) {
            found = true;
            return { ...u, fullName: newName, name: newName };
          }
          return u;
        });

        if (!found) {
          updatedStaff.push({
            id: session.userId || `usr-${session.role}`,
            fullName: newName,
            name: newName,
            email: emailKey,
            role: session.role,
            isConfirmed: true,
            registeredAt: new Date().toISOString().split('T')[0]
          });
        }

        localStorage.setItem('pesantren_staff_users', JSON.stringify(updatedStaff));
        window.dispatchEvent(new Event('pesantren_staff_users_updated'));
        if (isSupabaseConfigured()) {
          pushAllStaffUsersToSupabase(updatedStaff).catch(() => {});
        }
        // Broadcast to server
        fetch('/api/staff-users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedStaff)
        }).catch(e => console.warn('Failed to push staff user:', e));
      } catch (e) {}

      // Update current session in storage
      try {
        const storedSess = sessionStorage.getItem('pesantren_session') || localStorage.getItem('pesantren_session');
        if (storedSess) {
          const parsed = JSON.parse(storedSess);
          parsed.fullName = newName;
          parsed.roleName = newName;
          sessionStorage.setItem('pesantren_session', JSON.stringify(parsed));
          localStorage.setItem('pesantren_session', JSON.stringify(parsed));
        }
      } catch (e) {}

      // Synchronize directly with pesantren_settings so admin "Daftar Pengurus" updates immediately
      try {
        const curSettings = JSON.parse(localStorage.getItem('pesantren_settings') || '{}');
        const updatedSettings = { ...curSettings };
        if (session.role === 'keamanan') updatedSettings.namaKeamanan = newName;
        else if (session.role === 'ketertiban') updatedSettings.namaKetertiban = newName;
        else if (session.role === 'kesehatan') updatedSettings.namaKesehatan = newName;
        else if (session.role.includes('bendahara')) {
          updatedSettings.namaBendaharaPutra = newName;
          updatedSettings.namaBendahara = newName;
        } else if (session.role.includes('yayasan')) {
          updatedSettings.namaKetuaYayasan = newName;
        }

        localStorage.setItem('pesantren_settings', JSON.stringify(updatedSettings));
        window.dispatchEvent(new CustomEvent('pesantren_settings_updated', { detail: updatedSettings }));
        fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedSettings)
        }).catch(() => {});
        if (isSupabaseConfigured()) {
          pushSettingsToSupabase(updatedSettings).catch(() => {});
        }
      } catch (e) {}

      try {
        const cfgKey = `${session.role}_config`;
        const stored = localStorage.getItem(cfgKey);
        const parsed = stored ? JSON.parse(stored) : {};
        parsed.name = newName;
        localStorage.setItem(cfgKey, JSON.stringify(parsed));
        fetch('/api/staff-configs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: session.role, config: { name: newName } })
        }).catch(() => {});
        if (isSupabaseConfigured()) {
          await pushStaffConfigToSupabase(session.role, { name: newName });
        }
      } catch (e) {
        console.error(e);
      }
      window.dispatchEvent(new Event('staff_configs_updated'));
      window.dispatchEvent(new Event('pesantren_db_sync'));
      setProfileUpdateTrigger(prev => prev + 1);
      setProfileSuccess('Nama profil Pengurus berhasil disimpan dan disinkronkan ke seluruh sistem!');
    }
  };

  const getAvatarUrl = () => {
    if (customAvatar) return customAvatar;
    if (!session) return '';
    if (session.role === 'admin') {
      return 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80';
    } else if (session.role === 'santri') {
      return 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80';
    } else {
      return 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80';
    }
  };

  const menuItems = [
    { id: 'home', label: 'Beranda' },
    { id: 'profile', label: 'Visi & Misi' },
    { id: 'news', label: 'Berita' },
    { id: 'announcements', label: 'Pengumuman' },
    ...(ppdbStatus.isActive ? [{ id: 'ppdb', label: 'Pendaftaran PCSB', highlight: true }] : []),
  ];

  const handleNavClick = (viewId: string) => {
    if (['home', 'profile', 'news', 'announcements'].includes(viewId)) {
      setView('home');
      setTimeout(() => {
        if (viewId === 'home') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          const el = document.getElementById(viewId);
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }
      }, 80);
    } else {
      setView(viewId);
    }
    setIsNavOpen(false);
    setIsAccountOpen(false);
  };

  // Close menu and change tab on dashboard
  // On desktop (screen >= 1024px), KEEP menu visible continuously until user clicks X button!
  const isDesktop = () => typeof window !== 'undefined' && window.innerWidth >= 1024;

  const handleAdminTabClick = (tab: any) => {
    if (setAdminTab) setAdminTab(tab);
    setView('admin-dashboard');
    setIsNavOpen(false);
    if (!isDesktop()) {
      setIsAccountOpen(false);
    }
  };

  const handleStaffTabClick = (tab: any) => {
    if (setStaffTab) setStaffTab(tab);
    setView('staff-dashboard');
    setIsNavOpen(false);
    if (!isDesktop()) {
      setIsAccountOpen(false);
    }
  };

  const handleSantriTabClick = (tab: any) => {
    if (setSantriTab) setSantriTab(tab);
    setView('santri-dashboard');
    setIsNavOpen(false);
    if (!isDesktop()) {
      setIsAccountOpen(false);
    }
  };

  const triggerStudentCard = () => {
    if (setShowStudentCard) setShowStudentCard(true);
    setView('santri-dashboard');
    setIsNavOpen(false);
    setIsAccountOpen(false);
  };

  return (
    <nav className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white sticky top-0 z-45 shadow-md font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* LEFT: Logo area & Title */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1 relative animate-fade-in">
            <div 
              className="cursor-pointer flex items-center gap-2.5 min-w-0 max-w-full" 
              onClick={() => {
                if (session) {
                  if (session.role === 'admin') setView('admin-dashboard');
                  else if (session.role === 'santri') setView('santri-dashboard');
                  else setView('staff-dashboard');
                } else {
                  setView('home');
                }
              }}
            >
              {!logoImgError && activeLogo ? (
                <img 
                  src={activeLogo} 
                  alt="Logo Pesantren" 
                  onError={() => setLogoImgError(true)}
                  className="h-9 w-9 sm:h-10 sm:w-10 object-contain shrink-0 rounded-md bg-white/10 p-0.5" 
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="h-9 w-9 sm:h-10 sm:w-10 bg-emerald-700/80 rounded-md flex items-center justify-center text-amber-300 shrink-0 border border-emerald-500/40 shadow-xs">
                  <Landmark className="h-5 w-5" />
                </div>
              )}

              <div className="flex flex-col items-start justify-center min-w-0 leading-tight">
                <span className="text-[13.5px] min-[360px]:text-[15px] sm:text-[17px] md:text-[19px] font-black text-white hover:text-amber-200 transition tracking-wide font-sans whitespace-nowrap">
                  Pondok Pesantren Al-Asy'ariyah
                </span>
                <span className="text-[9px] min-[360px]:text-[10px] sm:text-[11px] font-medium text-emerald-200/80 tracking-wider font-sans whitespace-nowrap">
                  Mancengan Barat, Modung, Bangkalan
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT: User info and Hamburg menu button */}
          <div className="flex items-center gap-2 sm:gap-4">
            
            {/* Profile Menu (Only when logged in) */}
            {session ? (
              <button
                type="button"
                onClick={() => {
                  setIsProfileModalOpen(true);
                  setCustomNameInput(userName);
                  setProfileError('');
                  setProfileSuccess('');
                  setCurrentPasswordInput('');
                  setNewPasswordInput('');
                }}
                className="p-1 hover:bg-emerald-900/25 text-amber-200 rounded-full transition cursor-pointer flex items-center justify-center gap-2 border border-emerald-800/40 font-sans pr-3.5 pl-1.5 py-1 bg-emerald-950/25"
                title={`Akun: ${userName}`}
              >
                <img
                  src={getAvatarUrl()}
                  alt="Avatar"
                  className="h-6 w-6 rounded-full object-cover border border-emerald-600/30"
                  referrerPolicy="no-referrer"
                />
                <span className="text-[10px] font-extrabold tracking-wider hidden sm:inline text-amber-100 max-w-[140px] truncate">
                  {userName}
                </span>
              </button>
            ) : null}

            {/* Public Links (Visible only when NOT logged in) */}
            {!session && (
              <div className="hidden md:flex items-center space-x-1.5">
                {currentView === 'ppdb' ? (
                  <>
                    <button
                      onClick={() => handleNavClick('home')}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all text-emerald-100 hover:bg-emerald-900/50 hover:text-amber-250 cursor-pointer flex items-center gap-1.5"
                    >
                      <Home className="h-3.5 w-3.5 text-amber-300" />
                      <span>Beranda</span>
                    </button>
                    <button
                      onClick={() => window.dispatchEvent(new CustomEvent('open_pcsb_panduan'))}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all text-emerald-100 hover:bg-emerald-900/50 hover:text-amber-250 cursor-pointer flex items-center gap-1.5"
                    >
                      <BookOpen className="h-3.5 w-3.5 text-emerald-300" />
                      <span>Panduan Pendaftaran</span>
                    </button>
                    <button
                      onClick={() => window.dispatchEvent(new CustomEvent('open_pcsb_check_status'))}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all text-emerald-100 hover:bg-emerald-900/50 hover:text-amber-250 cursor-pointer flex items-center gap-1.5"
                    >
                      <Search className="h-3.5 w-3.5 text-amber-300" />
                      <span>Cek Status</span>
                    </button>
                  </>
                ) : (
                  menuItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                        item.highlight
                          ? 'bg-amber-400 text-emerald-950 hover:bg-amber-300 shadow-sm font-extrabold'
                          : currentView === item.id
                          ? 'bg-emerald-900/80 text-amber-300 border border-emerald-700/60 shadow-xs font-extrabold'
                          : 'text-emerald-100 hover:bg-emerald-900/50 hover:text-amber-200'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Login / Masuk Button (Hidden when on ppdb registration form) */}
            {!session && currentView !== 'ppdb' && (
              <button
                onClick={onOpenLogin}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-400 text-emerald-950 rounded-lg text-xs font-extrabold hover:bg-amber-350 transition-all cursor-pointer shadow-sm border border-amber-350"
              >
                <LogIn className="h-3.5 w-3.5" />
                Login
              </button>
            )}

            {/* Navigation Hamburger on the Right (Visible for non-logged in or santri/walisantri session) */}
            {(!session || session.role === 'santri') && (
              <button
                type="button"
                onClick={() => setIsNavOpen(!isNavOpen)}
                className={`p-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer border shadow-xs ${
                  isNavOpen 
                    ? 'bg-amber-400 text-emerald-950 border-amber-350 font-extrabold animate-pulse'
                    : 'bg-emerald-950/40 hover:bg-emerald-950/70 text-amber-250 border-emerald-900/20'
                }`}
                aria-label="Toggle Menu Navigasi"
              >
                <Menu className="h-4 w-4" />
                <span className="text-[10px] font-extrabold uppercase tracking-wider hidden sm:inline">
                  {isNavOpen ? 'Tutup' : 'Menu'}
                </span>
              </button>
            )}

            {/* Navigation Hamburger on the Right (Visible for admin/pengurus session) */}
            {session && session.role !== 'santri' && (
              <button
                type="button"
                onClick={() => setIsAccountOpen(!isAccountOpen)}
                className={`p-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer border shadow-xs ${
                  isAccountOpen 
                    ? 'bg-amber-400 text-emerald-950 border-amber-350 font-extrabold animate-pulse'
                    : 'bg-emerald-950/40 hover:bg-emerald-950/70 text-amber-250 border-emerald-900/20'
                }`}
                aria-label="Toggle Menu Akun"
              >
                <Menu className="h-4 w-4" />
                <span className="text-[10px] font-extrabold uppercase tracking-wider hidden sm:inline">
                  {isAccountOpen ? 'Tutup' : 'Menu'}
                </span>
              </button>
            )}

          </div>

        </div>
      </div>

      {/* RIGHT SIDE DRAWER / DROPDOWN FOR GENERAL OR SANTRI NAVIGATION */}
      {isNavOpen && (!session || session.role === 'santri') && (
        <>
          <div 
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-[2px] z-45 cursor-default animate-fade-in"
            onClick={() => setIsNavOpen(false)}
          />
          <div className="absolute right-4 top-14 w-64 bg-emerald-950/95 backdrop-blur-md rounded-2xl shadow-2xl border border-emerald-700/60 z-50 divide-y divide-emerald-800/60 py-1 max-h-[80vh] overflow-y-auto text-emerald-100 text-left animate-fade-in">
            <div className="px-4 py-3 bg-emerald-900/80 flex items-center justify-between border-b border-emerald-800/60">
              <span className="text-[10px] uppercase font-mono font-extrabold text-amber-300">
                {!session ? (currentView === 'ppdb' ? 'Menu Pendaftaran' : 'Navigasi Portal') : 'Menu Walisantri'}
              </span>
              <button
                type="button"
                onClick={() => setIsNavOpen(false)}
                className="text-emerald-300 hover:text-rose-400 transition p-1 rounded-lg"
                title="Tutup Menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="py-1">
              {!session ? (
                currentView === 'ppdb' ? (
                  // Focused PPDB Menu Items: Beranda, Panduan Pendaftaran, Cek Status, Bantuan Panitia
                  <div className="space-y-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        handleNavClick('home');
                        setIsNavOpen(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs font-bold transition flex items-center gap-2.5 cursor-pointer text-emerald-100 hover:bg-emerald-900/60 hover:text-amber-300"
                    >
                      <Home className="h-4 w-4 text-amber-300" />
                      <span>Beranda Portal</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('open_pcsb_panduan'));
                        setIsNavOpen(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs font-bold transition flex items-center gap-2.5 cursor-pointer text-emerald-100 hover:bg-emerald-900/60 hover:text-amber-300"
                    >
                      <BookOpen className="h-4 w-4 text-emerald-300" />
                      <span>Panduan Pendaftaran</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('open_pcsb_check_status'));
                        setIsNavOpen(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs font-bold transition flex items-center gap-2.5 cursor-pointer text-emerald-100 hover:bg-emerald-900/60 hover:text-amber-300"
                    >
                      <Search className="h-4 w-4 text-amber-300" />
                      <span>Cek Status Pendaftaran</span>
                    </button>
                    <a
                      href="https://wa.me/6281234567890?text=Assalamu'alaikum%20Panitia%20PPDB%20Ponpes%20Al-Asy'ariyah,%20saya%20ingin%20bertanya%20tentang%20pendaftaran"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setIsNavOpen(false)}
                      className="w-full text-left px-4 py-2.5 text-xs font-bold transition flex items-center gap-2.5 cursor-pointer text-emerald-100 hover:bg-emerald-900/60 hover:text-emerald-200"
                    >
                      <HelpCircle className="h-4 w-4 text-emerald-400" />
                      <span>Bantuan Panitia (WA)</span>
                    </a>
                  </div>
                ) : (
                  // Public Menu Items
                  menuItems.map((item) => {
                    const hrefHash = item.id === 'home' ? '#home' : item.id === 'profile' ? '#profil' : item.id === 'news' ? '#berita' : item.id === 'announcements' ? '#pengumuman' : '#ppdb';
                    return (
                      <a
                        key={item.id}
                        href={hrefHash}
                        onClick={(e) => {
                          e.preventDefault();
                          handleNavClick(item.id);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                          currentView === item.id 
                            ? 'bg-emerald-800 text-amber-300' 
                            : 'text-emerald-100 hover:bg-emerald-900/60 hover:text-white'
                        }`}
                      >
                        <span>{item.label}</span>
                        {item.highlight && (
                          <span className="bg-amber-400 text-emerald-950 text-[8px] px-1.5 py-0.5 rounded-md font-black uppercase tracking-wide">
                            Baru
                          </span>
                        )}
                      </a>
                    );
                  })
                )
              ) : (
                // Santri / Walisantri Menu Items
                <div className="space-y-0.5">
                  <a
                    href="#santri/tagihan"
                    onClick={(e) => { e.preventDefault(); handleSantriTabClick('tagihan'); setIsNavOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                      santriTab === 'tagihan' && currentView === 'santri-dashboard' ? 'bg-emerald-800 text-amber-300' : 'text-emerald-100 hover:bg-emerald-900/60 hover:text-white'
                    }`}
                  >
                    <span>Tagihan & Pembayaran</span>
                  </a>
                  <a
                    href="#santri/pelanggaran"
                    onClick={(e) => { e.preventDefault(); handleSantriTabClick('pelanggaran'); setIsNavOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                      santriTab === 'pelanggaran' && currentView === 'santri-dashboard' ? 'bg-emerald-800 text-amber-300' : 'text-emerald-100 hover:bg-emerald-900/60 hover:text-white'
                    }`}
                  >
                    <span>Pelanggaran & Takzir</span>
                  </a>
                  <a
                    href="#santri/kesehatan"
                    onClick={(e) => { e.preventDefault(); handleSantriTabClick('kesehatan'); setIsNavOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                      santriTab === 'kesehatan' && currentView === 'santri-dashboard' ? 'bg-emerald-800 text-amber-300' : 'text-emerald-100 hover:bg-emerald-900/60 hover:text-white'
                    }`}
                  >
                    <span>Riwayat Medis Sakit</span>
                  </a>
                  <a
                    href="#santri/perizinan"
                    onClick={(e) => { e.preventDefault(); handleSantriTabClick('perizinan'); setIsNavOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                      santriTab === 'perizinan' && currentView === 'santri-dashboard' ? 'bg-emerald-800 text-amber-300' : 'text-emerald-100 hover:bg-emerald-900/60 hover:text-white'
                    }`}
                  >
                    <span>Pengajuan Izin Keluar</span>
                  </a>
                  {showStudentCard && (
                    <a
                      href="#santri/kartu"
                      onClick={(e) => { e.preventDefault(); triggerStudentCard(); setIsNavOpen(false); }}
                      className="w-full text-left px-4 py-2.5 text-xs font-bold transition flex items-center gap-2 text-emerald-100 hover:bg-emerald-900/60 hover:text-white cursor-pointer"
                    >
                      <span>Kartu Santri Digital</span>
                    </a>
                  )}
                  
                  <div className="border-t border-emerald-800/60 pt-2 pb-1 px-3">
                    <button
                      type="button"
                      onClick={() => {
                        onLogout();
                        setIsNavOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-extrabold text-rose-300 hover:bg-rose-950/40 transition flex items-center justify-center gap-1.5 cursor-pointer border border-rose-800/50 rounded-xl"
                    >
                      <span>Keluar Sesi</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* SIDE-ALIGNED LEFT DRAWER FOR ACCOUNT / SESSION MENU */}
      {session && session.role !== 'santri' && isAccountOpen && (
        <>
          {/* Backdrop for Account Menu if opened */}
          <div 
            className="fixed inset-0 bg-slate-950/30 backdrop-blur-[1px] z-45 cursor-default lg:hidden"
            onClick={() => setIsAccountOpen(false)}
          />

          <div className="fixed left-0 top-0 bottom-0 w-64 bg-[#07241a] text-slate-100 shadow-2xl z-50 flex flex-col text-left animate-fade-in lg:top-16 lg:h-[calc(100vh-4rem)] lg:shadow-none lg:border-r lg:border-[#0d3f2d] lg:z-30">
            
            {/* Header inside drawer - SIP Monogram */}
            <div className="px-4 py-3.5 bg-[#051c14] border-b border-[#0d3f2d] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 border border-emerald-500/20 flex items-center justify-center shadow-xs">
                  <span className="text-amber-300 font-black text-xs tracking-wider">SIP</span>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-white font-extrabold text-xs tracking-wide">SIP</span>
                    <span className="text-[9px] text-amber-300 font-bold px-1.5 py-0.5 rounded bg-amber-400/10 border border-amber-400/25">v2.6</span>
                  </div>
                  <div className="text-[10px] text-emerald-200/70 truncate max-w-[130px]">
                    Sistem Informasi Pesantren
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAccountOpen(false)}
                className="text-emerald-300/60 hover:text-white transition p-1 rounded-lg hover:bg-emerald-900/50 lg:hidden"
                title="Tutup Menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Quick Search */}
            <div className="px-3 pt-3 pb-2 bg-[#07241a] shrink-0">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-emerald-300/50" />
                <input 
                  type="text" 
                  placeholder="Cari menu... Ctrl K" 
                  value={navSearchQuery} 
                  onChange={(e) => setNavSearchQuery(e.target.value)} 
                  className="w-full bg-[#0c3325] text-white placeholder:text-emerald-200/40 text-xs rounded-xl pl-9 pr-3 py-2 border border-[#16503c] focus:outline-none focus:border-amber-400/60 transition"
                />
              </div>
            </div>

            {/* Drawer Menu Content (Scroll Area) */}
            <div className="flex-1 overflow-y-auto px-2 py-1 space-y-3 custom-scrollbar">
              
              {/* ADMIN MENU OPTIONS - GROUPED INTO CLEAN CATEGORIES */}
              {session.role === 'admin' && (() => {
                const q = navSearchQuery.toLowerCase().trim();
                const matches = (label: string) => !q || label.toLowerCase().includes(q);

                return (
                  <div className="space-y-3">
                    {/* Beranda Overview */}
                    {matches('Beranda Overview Dashboard') && (
                      <a
                        href="#admin/overview"
                        onClick={(e) => { e.preventDefault(); handleAdminTabClick('overview'); }}
                        className={`w-full text-left px-3.5 py-2.5 text-xs rounded-xl transition flex items-center justify-between cursor-pointer ${
                          adminTab === 'overview' && currentView === 'admin-dashboard' 
                            ? 'bg-[#124b38] text-white font-bold border-l-4 border-emerald-400 pl-2.5 shadow-xs' 
                            : 'text-emerald-100/75 hover:bg-[#0c3325] hover:text-white'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <Home className="w-4 h-4 text-emerald-300/70" />
                          <span>Beranda</span>
                        </span>
                      </a>
                    )}

                    {/* CATEGORY: SANTRI */}
                    {(matches('santri') || matches('kamar') || matches('ppdb') || matches('offline')) && (
                      <div className="space-y-0.5">
                        <div className="px-3 pt-2 pb-1 text-[10px] uppercase font-black tracking-wider text-amber-400/90 flex items-center justify-between">
                          <span>SANTRI</span>
                        </div>

                        {matches('Data Santri Kesantrian') && (
                          <a
                            href="#admin/santri"
                            onClick={(e) => { e.preventDefault(); handleAdminTabClick('students'); }}
                            className={`w-full text-left px-3.5 py-2 text-xs rounded-xl transition flex items-center justify-between cursor-pointer ${
                              adminTab === 'students' && currentView === 'admin-dashboard' 
                                ? 'bg-[#124b38] text-white font-bold border-l-4 border-emerald-400 pl-2.5 shadow-xs' 
                                : 'text-emerald-100/75 hover:bg-[#0c3325] hover:text-white'
                            }`}
                          >
                            <span>Kesantrian / Data Santri</span>
                          </a>
                        )}

                        {matches('Perizinan Santri Keluar Masuk Pulang') && (
                          <a
                            href="#admin/perizinan"
                            onClick={(e) => { e.preventDefault(); handleAdminTabClick('perizinan'); }}
                            className={`w-full text-left px-3.5 py-2 text-xs rounded-xl transition flex items-center justify-between cursor-pointer ${
                              adminTab === 'perizinan' && currentView === 'admin-dashboard' 
                                ? 'bg-[#124b38] text-white font-bold border-l-4 border-emerald-400 pl-2.5 shadow-xs' 
                                : 'text-emerald-100/75 hover:bg-[#0c3325] hover:text-white'
                            }`}
                          >
                            <span>Perizinan Santri</span>
                          </a>
                        )}

                        {matches('Kamar Asrama') && (
                          <a
                            href="#admin/kamar"
                            onClick={(e) => { e.preventDefault(); handleAdminTabClick('kamar'); }}
                            className={`w-full text-left px-3.5 py-2 text-xs rounded-xl transition flex items-center justify-between cursor-pointer ${
                              adminTab === 'kamar' && currentView === 'admin-dashboard' 
                                ? 'bg-[#124b38] text-white font-bold border-l-4 border-emerald-400 pl-2.5 shadow-xs' 
                                : 'text-emerald-100/75 hover:bg-[#0c3325] hover:text-white'
                            }`}
                          >
                            <span>Kamar Asrama</span>
                          </a>
                        )}

                        {matches('Pendaftaran Santri Baru PPDB PCSB') && (
                          <a
                            href="#admin/ppdb"
                            onClick={(e) => { e.preventDefault(); handleAdminTabClick('ppdb'); }}
                            className={`w-full text-left px-3.5 py-2 text-xs rounded-xl transition flex items-center justify-between cursor-pointer ${
                              adminTab === 'ppdb' && currentView === 'admin-dashboard' 
                                ? 'bg-[#124b38] text-white font-bold border-l-4 border-emerald-400 pl-2.5 shadow-xs' 
                                : 'text-emerald-100/75 hover:bg-[#0c3325] hover:text-white'
                            }`}
                          >
                            <span>Pendaftaran Baru (PCSB)</span>
                            {pendingPcsbCount > 0 && (
                              <span className="bg-amber-400 text-slate-950 font-bold text-[9px] px-1.5 py-0.5 rounded-full">
                                {pendingPcsbCount}
                              </span>
                            )}
                          </a>
                        )}

                        {matches('Pendaftaran Offline Santri Input Mandiri') && (
                          <a
                            href="#admin/input-mandiri"
                            onClick={(e) => { e.preventDefault(); handleAdminTabClick('input_mandiri'); }}
                            className={`w-full text-left px-3.5 py-2 text-xs rounded-xl transition flex items-center justify-between cursor-pointer ${
                              adminTab === 'input_mandiri' && currentView === 'admin-dashboard' 
                                ? 'bg-[#124b38] text-white font-bold border-l-4 border-emerald-400 pl-2.5 shadow-xs' 
                                : 'text-emerald-100/75 hover:bg-[#0c3325] hover:text-white'
                            }`}
                          >
                            <span>Pendaftaran Offline Santri</span>
                          </a>
                        )}
                      </div>
                    )}

                    {/* CATEGORY: AKADEMIK */}
                    {(matches('akademik') || matches('kelas') || matches('sekolah') || matches('alumni') || matches('berita')) && (
                      <div className="space-y-0.5">
                        <div className="px-3 pt-2 pb-1 text-[10px] uppercase font-black tracking-wider text-amber-400/90 flex items-center justify-between">
                          <span>AKADEMIK</span>
                        </div>

                        {matches('Kelas & Sekolah Formal') && (
                          <a
                            href="#admin/kelas"
                            onClick={(e) => { e.preventDefault(); handleAdminTabClick('kelas_sekolah'); }}
                            className={`w-full text-left px-3.5 py-2 text-xs rounded-xl transition flex items-center justify-between cursor-pointer ${
                              adminTab === 'kelas_sekolah' && currentView === 'admin-dashboard' 
                                ? 'bg-[#124b38] text-white font-bold border-l-4 border-emerald-400 pl-2.5 shadow-xs' 
                                : 'text-emerald-100/75 hover:bg-[#0c3325] hover:text-white'
                            }`}
                          >
                            <span>Kelas & Sekolah Formal</span>
                          </a>
                        )}

                        {matches('Database Alumni Kelulusan') && (
                          <a
                            href="#admin/alumni"
                            onClick={(e) => { e.preventDefault(); handleAdminTabClick('alumni'); }}
                            className={`w-full text-left px-3.5 py-2 text-xs rounded-xl transition flex items-center justify-between cursor-pointer ${
                              adminTab === 'alumni' && currentView === 'admin-dashboard' 
                                ? 'bg-[#124b38] text-white font-bold border-l-4 border-emerald-400 pl-2.5 shadow-xs' 
                                : 'text-emerald-100/75 hover:bg-[#0c3325] hover:text-white'
                            }`}
                          >
                            <span>Database Alumni</span>
                          </a>
                        )}

                        {matches('Berita & Pengumuman Agenda') && (
                          <a
                            href="#admin/berita"
                            onClick={(e) => { e.preventDefault(); handleAdminTabClick('news_ann'); }}
                            className={`w-full text-left px-3.5 py-2 text-xs rounded-xl transition flex items-center justify-between cursor-pointer ${
                              adminTab === 'news_ann' && currentView === 'admin-dashboard' 
                                ? 'bg-[#124b38] text-white font-bold border-l-4 border-emerald-400 pl-2.5 shadow-xs' 
                                : 'text-emerald-100/75 hover:bg-[#0c3325] hover:text-white'
                            }`}
                          >
                            <span>Berita & Pengumuman</span>
                          </a>
                        )}
                      </div>
                    )}

                    {/* CATEGORY: KEUANGAN */}
                    {(matches('keuangan') || matches('tagihan') || matches('spp') || matches('rekening') || matches('kas')) && (
                      <div className="space-y-0.5">
                        <div className="px-3 pt-2 pb-1 text-[10px] uppercase font-black tracking-wider text-amber-400/90 flex items-center justify-between">
                          <span>KEUANGAN</span>
                        </div>

                        {matches('Tagihan & Keuangan SPP Iuran Bulanan') && (
                          <a
                            href="#admin/tagihan"
                            onClick={(e) => { e.preventDefault(); handleAdminTabClick('bills'); }}
                            className={`w-full text-left px-3.5 py-2 text-xs rounded-xl transition flex items-center justify-between cursor-pointer ${
                              adminTab === 'bills' && currentView === 'admin-dashboard' 
                                ? 'bg-[#124b38] text-white font-bold border-l-4 border-emerald-400 pl-2.5 shadow-xs' 
                                : 'text-emerald-100/75 hover:bg-[#0c3325] hover:text-white'
                            }`}
                          >
                            <span>Iuran Bulanan / Tagihan SPP</span>
                          </a>
                        )}

                        {matches('Laporan Keuangan & Kas') && (
                          <a
                            href="#admin/keuangan"
                            onClick={(e) => { e.preventDefault(); handleAdminTabClick('laporan_keuangan'); }}
                            className={`w-full text-left px-3.5 py-2 text-xs rounded-xl transition flex items-center justify-between cursor-pointer ${
                              adminTab === 'laporan_keuangan' && currentView === 'admin-dashboard' 
                                ? 'bg-[#124b38] text-white font-bold border-l-4 border-emerald-400 pl-2.5 shadow-xs' 
                                : 'text-emerald-100/75 hover:bg-[#0c3325] hover:text-white'
                            }`}
                          >
                            <span>Laporan Keuangan & Kas</span>
                          </a>
                        )}

                        {matches('Rekening Pesantren Pembayaran') && (
                          <a
                            href="#admin/rekening"
                            onClick={(e) => { e.preventDefault(); handleAdminTabClick('rekening'); }}
                            className={`w-full text-left px-3.5 py-2 text-xs rounded-xl transition flex items-center justify-between cursor-pointer ${
                              adminTab === 'rekening' && currentView === 'admin-dashboard' 
                                ? 'bg-[#124b38] text-white font-bold border-l-4 border-emerald-400 pl-2.5 shadow-xs' 
                                : 'text-emerald-100/75 hover:bg-[#0c3325] hover:text-white'
                            }`}
                          >
                            <span>Rekening Pesantren</span>
                          </a>
                        )}
                      </div>
                    )}

                    {/* CATEGORY: DATA MASTER & SISTEM */}
                    {(matches('master') || matches('pengurus') || matches('whatsapp') || matches('laporan') || matches('log') || matches('settings') || matches('portal')) && (
                      <div className="space-y-0.5">
                        <div className="px-3 pt-2 pb-1 text-[10px] uppercase font-black tracking-wider text-amber-400/90 flex items-center justify-between">
                          <span>DATA MASTER & SISTEM</span>
                        </div>

                        {matches('Daftar Pengurus & Tanda Tangan') && (
                          <a
                            href="#admin/pengurus"
                            onClick={(e) => { e.preventDefault(); handleAdminTabClick('pengurus'); }}
                            className={`w-full text-left px-3.5 py-2 text-xs rounded-xl transition flex items-center justify-between cursor-pointer ${
                              adminTab === 'pengurus' && currentView === 'admin-dashboard' 
                                ? 'bg-[#124b38] text-white font-bold border-l-4 border-emerald-400 pl-2.5 shadow-xs' 
                                : 'text-emerald-100/75 hover:bg-[#0c3325] hover:text-white'
                            }`}
                          >
                            <span>Nama Pengurus & Tanda Tangan</span>
                          </a>
                        )}

                        {matches('Persetujuan Akun Pengurus Hak Akses') && (
                          <a
                            href="#admin/akun-pengurus"
                            onClick={(e) => { e.preventDefault(); handleAdminTabClick('akun_pengurus'); }}
                            className={`w-full text-left px-3.5 py-2 text-xs rounded-xl transition flex items-center justify-between cursor-pointer ${
                              adminTab === 'akun_pengurus' && currentView === 'admin-dashboard' 
                                ? 'bg-[#124b38] text-white font-bold border-l-4 border-emerald-400 pl-2.5 shadow-xs' 
                                : 'text-emerald-100/75 hover:bg-[#0c3325] hover:text-white'
                            }`}
                          >
                            <span>Persetujuan Akun Pengurus</span>
                            {pendingStaffCount > 0 && (
                              <span className="bg-amber-400 text-slate-950 font-bold text-[9px] px-1.5 py-0.5 rounded-full">
                                {pendingStaffCount}
                              </span>
                            )}
                          </a>
                        )}

                        {matches('Broadcast WhatsApp Pesan') && (
                          <a
                            href="#admin/whatsapp"
                            onClick={(e) => { e.preventDefault(); handleAdminTabClick('whatsapp'); }}
                            className={`w-full text-left px-3.5 py-2 text-xs rounded-xl transition flex items-center justify-between cursor-pointer ${
                              adminTab === 'whatsapp' && currentView === 'admin-dashboard' 
                                ? 'bg-[#124b38] text-white font-bold border-l-4 border-emerald-400 pl-2.5 shadow-xs' 
                                : 'text-emerald-100/75 hover:bg-[#0c3325] hover:text-white'
                            }`}
                          >
                            <span>Broadcast WhatsApp</span>
                          </a>
                        )}

                        {matches('Rekapan Laporan Terpadu Cetak A4') && (
                          <a
                            href="#admin/reports"
                            onClick={(e) => { e.preventDefault(); handleAdminTabClick('reports'); }}
                            className={`w-full text-left px-3.5 py-2 text-xs rounded-xl transition flex items-center justify-between cursor-pointer ${
                              adminTab === 'reports' && currentView === 'admin-dashboard' 
                                ? 'bg-[#124b38] text-white font-bold border-l-4 border-emerald-400 pl-2.5 shadow-xs' 
                                : 'text-emerald-100/75 hover:bg-[#0c3325] hover:text-white'
                            }`}
                          >
                            <span>Rekapan Laporan Terpadu</span>
                          </a>
                        )}

                        {matches('Log Surat Keluar') && (
                          <a
                            href="#admin/surat-keluar"
                            onClick={(e) => { e.preventDefault(); handleAdminTabClick('outbox_log'); }}
                            className={`w-full text-left px-3.5 py-2 text-xs rounded-xl transition flex items-center justify-between cursor-pointer ${
                              adminTab === 'outbox_log' && currentView === 'admin-dashboard' 
                                ? 'bg-[#124b38] text-white font-bold border-l-4 border-emerald-400 pl-2.5 shadow-xs' 
                                : 'text-emerald-100/75 hover:bg-[#0c3325] hover:text-white'
                            }`}
                          >
                            <span>Log Surat Keluar</span>
                          </a>
                        )}

                        {matches('Log Sistem Audit Pengurus') && (
                          <a
                            href="#admin/audit-log"
                            onClick={(e) => { e.preventDefault(); handleAdminTabClick('staff_activity_log'); }}
                            className={`w-full text-left px-3.5 py-2 text-xs rounded-xl transition flex items-center justify-between cursor-pointer ${
                              adminTab === 'staff_activity_log' && currentView === 'admin-dashboard' 
                                ? 'bg-[#124b38] text-white font-bold border-l-4 border-emerald-400 pl-2.5 shadow-xs' 
                                : 'text-emerald-100/75 hover:bg-[#0c3325] hover:text-white'
                            }`}
                          >
                            <span>Log Sistem & Audit</span>
                          </a>
                        )}

                        {matches('Pengaturan Portal Brosur Supabase') && (
                          <a
                            href="#admin/settings"
                            onClick={(e) => { e.preventDefault(); handleAdminTabClick('settings'); }}
                            className={`w-full text-left px-3.5 py-2 text-xs rounded-xl transition flex items-center justify-between cursor-pointer ${
                              adminTab === 'settings' && currentView === 'admin-dashboard' 
                                ? 'bg-[#124b38] text-white font-bold border-l-4 border-emerald-400 pl-2.5 shadow-xs' 
                                : 'text-emerald-100/75 hover:bg-[#0c3325] hover:text-white'
                            }`}
                          >
                            <span>Pengaturan Portal & Brosur</span>
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* STAFF MENU OPTIONS */}
              {['keamanan', 'ketertiban', 'kesehatan'].includes(session.role) && (
                <div className="space-y-1">
                  <div className="px-3 pt-2 pb-1 text-[10px] uppercase font-black tracking-wider text-amber-400/90">
                    Biro {session.role.toUpperCase()}
                  </div>
                  <a
                    href="#staff/santri"
                    onClick={(e) => { e.preventDefault(); handleStaffTabClick('students'); }}
                    className={`w-full text-left px-3.5 py-2 text-xs rounded-xl transition flex items-center gap-2 cursor-pointer ${
                      staffTab === 'students' && currentView === 'staff-dashboard' 
                        ? 'bg-[#124b38] text-white font-bold border-l-4 border-emerald-400 pl-2.5 shadow-xs' 
                        : 'text-emerald-100/75 hover:bg-[#0c3325] hover:text-white'
                    }`}
                  >
                    <span>Monitoring & Input Santri</span>
                  </a>
                  <a
                    href="#staff/riwayat"
                    onClick={(e) => { e.preventDefault(); handleStaffTabClick('history'); }}
                    className={`w-full text-left px-3.5 py-2 text-xs rounded-xl transition flex items-center gap-2 cursor-pointer ${
                      staffTab === 'history' && currentView === 'staff-dashboard' 
                        ? 'bg-[#124b38] text-white font-bold border-l-4 border-emerald-400 pl-2.5 shadow-xs' 
                        : 'text-emerald-100/75 hover:bg-[#0c3325] hover:text-white'
                    }`}
                  >
                    <span>Riwayat & Laporan Bulanan</span>
                  </a>
                  <a
                    href="#staff/surat"
                    onClick={(e) => { e.preventDefault(); handleStaffTabClick('letters'); }}
                    className={`w-full text-left px-3.5 py-2 text-xs rounded-xl transition flex items-center gap-2 cursor-pointer ${
                      (staffTab === 'letters' || staffTab === 'skck' || staffTab === 'takzir_letter') && currentView === 'staff-dashboard' 
                        ? 'bg-[#124b38] text-white font-bold border-l-4 border-emerald-400 pl-2.5 shadow-xs' 
                        : 'text-emerald-100/75 hover:bg-[#0c3325] hover:text-white'
                    }`}
                  >
                    <span>Penerbitan & Draf Surat</span>
                  </a>
                  <a
                    href="#staff/profil"
                    onClick={(e) => { e.preventDefault(); handleStaffTabClick('profile'); }}
                    className={`w-full text-left px-3.5 py-2 text-xs rounded-xl transition flex items-center gap-2 cursor-pointer ${
                      staffTab === 'profile' && currentView === 'staff-dashboard' 
                        ? 'bg-[#124b38] text-white font-bold border-l-4 border-emerald-400 pl-2.5 shadow-xs' 
                        : 'text-emerald-100/75 hover:bg-[#0c3325] hover:text-white'
                    }`}
                  >
                    <span>Profil & Tanda Tangan</span>
                  </a>
                </div>
              )}
            </div>

            {/* Bottom Quote Card & Session Logout */}
            <div className="p-3 bg-[#051c14] border-t border-[#0d3f2d] shrink-0 space-y-2.5">
              <div className="p-2.5 rounded-xl bg-[#092b1f] border border-[#134e38] text-left flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-emerald-900/80 flex items-center justify-center shrink-0 text-amber-300">
                  <Moon className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] italic font-medium text-emerald-100/90 leading-tight">
                    "Bersama membangun generasi berakhlak mulia."
                  </p>
                  <span className="text-[8px] text-amber-300/80 font-bold block mt-1 whitespace-nowrap">
                    Pondok Pesantren Al-Asy'ariyah
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  onLogout();
                  setIsAccountOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-xs font-bold text-rose-300 hover:text-white hover:bg-rose-950/40 transition flex items-center justify-center gap-2 cursor-pointer border border-rose-900/50 rounded-xl"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Keluar Sesi</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Profile Modal */}
      {isProfileModalOpen && session && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-emerald-100 flex flex-col text-slate-800 animate-fade-in my-auto mx-auto max-h-[90vh]">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white p-5 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <img
                  src={getAvatarUrl()}
                  alt="Profil"
                  className="h-10 w-10 rounded-full object-cover border-2 border-white/20 animate-fade-in"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h4 className="font-bold text-sm">Profil Akun Saya</h4>
                  <p className="text-[10px] text-emerald-150">Ganti foto profil dan password Anda</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setIsProfileModalOpen(false)} 
                className="text-white/80 hover:text-white hover:bg-emerald-700/50 p-1.5 rounded-full transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              
              {/* SECTION: Avatar Upload */}
              <div className="flex flex-col items-center space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="relative group">
                  <img
                    src={getAvatarUrl()}
                    alt="Foto Profil"
                    className="h-24 w-24 rounded-full object-cover border-4 border-emerald-600 shadow-md animate-fade-in"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    id="avatar-upload-file"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                  <label
                    htmlFor="avatar-upload-file"
                    className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-black cursor-pointer shadow-sm transition flex items-center gap-1"
                  >
                    Ganti Foto Profil
                  </label>
                  {customAvatar && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomAvatar('');
                        localStorage.removeItem(`pesantren_avatar_${session?.email || session?.role || 'default'}`);
                      }}
                      className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-[11px] font-bold transition"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>

              {/* SECTION: Profile Info & Name Customization */}
              <div className="space-y-3.5">
                {session?.role === 'admin' || ['keamanan', 'ketertiban', 'kesehatan'].includes(session?.role || '') ? (
                  <form onSubmit={handleSaveProfileName} className="space-y-2">
                    <label className="block text-[10px] uppercase font-bold text-emerald-900 mb-1">Nama Profil Pengurus / Admin</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        value={customNameInput}
                        onChange={(e) => setCustomNameInput(e.target.value)}
                        placeholder="Ketik nama kustom Anda..."
                        className="w-full px-3 py-2 border border-emerald-200 rounded-xl bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                      />
                      <button
                        type="submit"
                        className="px-3 py-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shrink-0 shadow-sm transition active:scale-95 cursor-pointer"
                      >
                        Simpan Nama
                      </button>
                    </div>
                  </form>
                ) : (
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Nama Lengkap</label>
                    <div className="w-full px-3 py-2 border border-slate-150 rounded-xl bg-slate-50 text-xs font-bold text-slate-500">
                      {userName}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Email / No. HP (Akun Active)</label>
                  <div className="w-full px-3 py-2 border border-slate-150 rounded-xl bg-slate-50 text-xs font-bold text-slate-500">
                    {userEmail}
                  </div>
                </div>
              </div>

              {/* SECTION: Password Change Form (Always Directly Displayed!) */}
              <form onSubmit={handlePasswordChange} className="space-y-3.5 pt-4 border-t border-slate-100">
                <h5 className="text-[11px] uppercase font-bold text-emerald-900 tracking-wider">
                  GANTI PASSWORD AKUN
                </h5>

                {profileError && (
                  <div className="text-[11px] text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-100 font-bold">️ {profileError}
                  </div>
                )}

                {profileSuccess && (
                  <div className="text-[11px] text-emerald-600 bg-emerald-50 p-2.5 rounded-lg border border-emerald-100 font-bold">
                    {profileSuccess}
                  </div>
                )}

                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Password Sebelumnya <span className="text-red-500">*</span></label>
                  <input
                    type="password"
                    required
                    placeholder="Ketik password saat ini..."
                    value={currentPasswordInput}
                    onChange={(e) => setCurrentPasswordInput(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-700 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Password Baru <span className="text-red-500">*</span></label>
                  <input
                    type="password"
                    required
                    placeholder="Ketik password baru..."
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-700 bg-white"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl font-bold text-xs shadow-sm transition active:scale-[0.98] cursor-pointer"
                >
                  Simpan Password Baru
                </button>
              </form>

              {/* Logout & Close buttons */}
              <div className="border-t border-slate-100 pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  className="flex-1 py-2 px-3 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-500 transition cursor-pointer text-center"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileModalOpen(false);
                    onLogout();
                  }}
                  className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Keluar Sesi</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
