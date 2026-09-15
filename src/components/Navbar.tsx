import React from 'react';
import { BookOpen, LogIn, LogOut, Shield, User, Menu, X, Landmark, GraduationCap, Users, Sun, Moon, CreditCard, Sparkles } from 'lucide-react';
import { UserSession, Student, PortalSettings } from '../types';
import { isPpdbCurrentlyActive } from '../lib/dateUtils';
import { isSupabaseConfigured, pushSettingsToSupabase, pushStaffConfigToSupabase } from '../lib/supabase';

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
  settings?: PortalSettings;
  ppdbOpen?: boolean;
  ppdbStartDate?: string;
  ppdbEndDate?: string;
  
  // Dashboard tab states for unified top-right hamburger menu
  adminTab?: 'overview' | 'news_ann' | 'ppdb' | 'students' | 'kamar' | 'alumni' | 'bills' | 'rekening' | 'settings' | 'whatsapp' | 'input_mandiri' | 'reports' | 'outbox_log' | 'kelas_sekolah' | 'pengurus';
  setAdminTab?: (tab: any) => void;
  staffTab?: 'students' | 'history' | 'profile' | 'skck' | 'takzir_letter';
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

  // Profile Modal states
  const [profileUpdateTrigger, setProfileUpdateTrigger] = React.useState(0);
  const [pendingStaffCount, setPendingStaffCount] = React.useState<number>(0);

  const checkPendingStaff = React.useCallback(() => {
    try {
      const saved = localStorage.getItem('pesantren_staff_users');
      if (saved) {
        const users = JSON.parse(saved);
        if (Array.isArray(users)) {
          const count = users.filter((u: any) => u && u.isConfirmed === false).length;
          setPendingStaffCount(count);
          return;
        }
      }
    } catch (e) {}
    setPendingStaffCount(0);
  }, []);

  React.useEffect(() => {
    checkPendingStaff();
    window.addEventListener('pesantren_staff_users_updated', checkPendingStaff);
    window.addEventListener('storage', checkPendingStaff);
    return () => {
      window.removeEventListener('pesantren_staff_users_updated', checkPendingStaff);
      window.removeEventListener('storage', checkPendingStaff);
    };
  }, [checkPendingStaff]);

  React.useEffect(() => {
    const handleUpdate = () => setProfileUpdateTrigger(prev => prev + 1);
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
        adminName = 'Muarif Samsul';
      }
      if (!adminName) {
        adminName = 'Admin Utama';
      }
      userName = adminName;
      userEmail = session.email || 'muarifsamsul082@gmail.com';
      userIdentifier = userEmail;
      defaultPass = 'admin123';
    } else if (['keamanan', 'ketertiban', 'kesehatan'].includes(session.role)) {
      let staffName = '';
      const defaults: Record<string, string> = {
        keamanan: 'Ustadz Junaidi Al-Anshori',
        ketertiban: 'Ustadz Abdul Somad, S.Sy',
        kesehatan: 'Ustadzah dr. Fatimah Az-Zahra'
      };
      try {
        const storedConfig = localStorage.getItem(`${session.role}_config`);
        if (storedConfig) {
          const parsed = JSON.parse(storedConfig);
          if (parsed.name) staffName = parsed.name;
        }
      } catch (e) {}
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

      // Update in staff users list
      try {
        const staffUsers = JSON.parse(localStorage.getItem('pesantren_staff_users') || '[]');
        let changed = false;
        const updatedStaff = staffUsers.map((u: any) => {
          if (u && u.email && u.email.toLowerCase() === emailKey) {
            changed = true;
            return { ...u, fullName: newName, name: newName };
          }
          return u;
        });
        if (changed) {
          localStorage.setItem('pesantren_staff_users', JSON.stringify(updatedStaff));
          window.dispatchEvent(new Event('pesantren_staff_users_updated'));
        }
      } catch (e) {}

      // Update current session object in storage
      try {
        const storedSess = localStorage.getItem('pesantren_session');
        if (storedSess) {
          const parsed = JSON.parse(storedSess);
          parsed.fullName = newName;
          parsed.roleName = newName;
          localStorage.setItem('pesantren_session', JSON.stringify(parsed));
        }
      } catch (e) {}

      window.dispatchEvent(new Event('pesantren_admin_name_updated'));
      window.dispatchEvent(new Event('pesantren_db_sync'));
      setProfileSuccess('Nama profil akun Admin berhasil disimpan!');
    } else if (session && ['keamanan', 'ketertiban', 'kesehatan'].includes(session.role)) {
      try {
        const cfgKey = `${session.role}_config`;
        const stored = localStorage.getItem(cfgKey);
        const parsed = stored ? JSON.parse(stored) : {};
        parsed.name = newName;
        localStorage.setItem(cfgKey, JSON.stringify(parsed));
        if (isSupabaseConfigured()) {
          await pushStaffConfigToSupabase(session.role, { name: newName });
        }
      } catch (e) {
        console.error(e);
      }
      window.dispatchEvent(new Event('staff_configs_updated'));
      window.dispatchEvent(new Event('pesantren_db_sync'));
      setProfileSuccess('Nama profil Pengurus & sapaan dashboard berhasil disimpan!');
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
    { id: 'profile', label: 'Profil' },
    { id: 'news', label: 'Berita' },
    { id: 'announcements', label: 'Pengumuman' },
    ...(ppdbStatus.isActive ? [{ id: 'ppdb', label: 'Pendaftaran PCSB', highlight: true }] : []),
  ];

  const handleNavClick = (viewId: string) => {
    setView(viewId);
    setIsNavOpen(false);
    setIsAccountOpen(false);
  };

  // Close menu and change tab on dashboard (clean navigation on all device sizes)
  const handleAdminTabClick = (tab: any) => {
    if (setAdminTab) setAdminTab(tab);
    setView('admin-dashboard');
    setIsNavOpen(false);
    setIsAccountOpen(false);
  };

  const handleStaffTabClick = (tab: any) => {
    if (setStaffTab) setStaffTab(tab);
    setView('staff-dashboard');
    setIsNavOpen(false);
    setIsAccountOpen(false);
  };

  const handleSantriTabClick = (tab: any) => {
    if (setSantriTab) setSantriTab(tab);
    setView('santri-dashboard');
    setIsNavOpen(false);
    setIsAccountOpen(false);
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

              <div className="flex flex-col items-start justify-center min-w-0">
                {/* Tampilan HP/Mobile: 2 baris jika namanya diawali Pondok Pesantren */}
                {schoolName.toLowerCase().startsWith('pondok pesantren') ? (
                  <div className="flex flex-col items-start md:hidden leading-tight">
                    <span className="text-[10px] min-[360px]:text-[11px] font-black uppercase text-amber-200/90 tracking-wider font-sans">
                      Pondok Pesantren
                    </span>
                    <span className="text-[14px] min-[360px]:text-[16px] sm:text-[18px] font-black text-white tracking-wide font-sans truncate max-w-[125px] min-[360px]:max-w-[155px] min-[375px]:max-w-[175px] min-[414px]:max-w-[205px]">
                      {schoolName.slice(16).trim()}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-start md:hidden leading-tight">
                    {schoolName.length > 16 ? (
                      <>
                        <span className="text-[10px] min-[360px]:text-[11px] font-black uppercase text-amber-200/90 tracking-wider font-sans">
                          Pesantren
                        </span>
                        <span className="text-[14px] min-[360px]:text-[16px] sm:text-[18px] font-black text-white tracking-wide font-sans truncate max-w-[125px] min-[360px]:max-w-[155px] min-[375px]:max-w-[175px] min-[414px]:max-w-[205px]">
                          {schoolName}
                        </span>
                      </>
                    ) : (
                      <span className="text-[14px] min-[360px]:text-[16px] sm:text-[18px] font-black text-white tracking-wide font-sans truncate max-w-[125px] min-[360px]:max-w-[155px] min-[375px]:max-w-[175px] min-[414px]:max-w-[205px]">
                        {schoolName}
                      </span>
                    )}
                  </div>
                )}

                {/* Tampilan Desktop (Tablet ke atas): Lengkap tanpa pemotongan/truncate */}
                <div className="hidden md:flex flex-col justify-center leading-tight">
                  {schoolName.toLowerCase().startsWith('pondok pesantren') ? (
                    <>
                      <span className="text-[10px] lg:text-[11px] font-black uppercase text-amber-200/90 tracking-widest font-sans">
                        Pondok Pesantren
                      </span>
                      <span className="text-[16px] lg:text-[20px] xl:text-[22px] font-black text-white hover:text-amber-100 transition tracking-wide font-sans whitespace-nowrap">
                        {schoolName.slice(16).trim()}
                      </span>
                    </>
                  ) : (
                    <span className="text-base md:text-[17px] lg:text-[20px] xl:text-[22px] font-black text-amber-100 hover:text-white transition whitespace-nowrap tracking-wide font-sans">
                      {schoolName}
                    </span>
                  )}
                </div>
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
              <div className="hidden md:flex items-center space-x-2">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                      item.highlight
                        ? 'bg-amber-400 text-emerald-950 hover:bg-amber-300 shadow-sm'
                        : currentView === item.id
                        ? 'bg-emerald-700 text-white border border-amber-400'
                        : 'text-emerald-100 hover:bg-emerald-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}

            {/* Login / Masuk Button (Visible only when NOT logged in) */}
            {!session && (
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
            className="fixed inset-0 bg-slate-950/20 backdrop-blur-[1px] z-45 cursor-default animate-fade-in"
            onClick={() => setIsNavOpen(false)}
          />
          <div className="absolute right-4 top-14 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-emerald-100 dark:border-slate-800 z-50 divide-y divide-slate-100 dark:divide-slate-800 py-1 max-h-[80vh] overflow-y-auto text-slate-800 dark:text-slate-100 text-left animate-fade-in">
            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-950/40 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/40">
              <span className="text-[10px] uppercase font-mono font-extrabold text-emerald-700 dark:text-emerald-450">
                {!session ? 'Navigasi Portal' : 'Menu Walisantri'}
              </span>
              <button
                type="button"
                onClick={() => setIsNavOpen(false)}
                className="text-slate-400 hover:text-rose-600 dark:text-slate-500 dark:hover:text-rose-450 transition p-1 rounded-lg"
                title="Tutup Menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="py-1">
              {!session ? (
                // Public Menu Items
                menuItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full text-left px-4 py-2.5 text-xs font-bold transition flex items-center justify-between ${
                      currentView === item.id 
                        ? 'bg-emerald-50 text-emerald-800 dark:bg-slate-800 dark:text-amber-400' 
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>{item.label}</span>
                    {item.highlight && (
                      <span className="bg-amber-400 text-emerald-950 text-[8px] px-1.5 py-0.5 rounded-md font-black uppercase tracking-wide">
                        Baru
                      </span>
                    )}
                  </button>
                ))
              ) : (
                // Santri / Walisantri Menu Items
                <div className="space-y-0.5">
                  <button
                    type="button"
                    onClick={() => { handleSantriTabClick('tagihan'); setIsNavOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-xs font-bold transition flex items-center gap-2 ${
                      santriTab === 'tagihan' && currentView === 'santri-dashboard' ? 'bg-emerald-50 text-emerald-800 dark:bg-slate-800 dark:text-amber-400' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>Tagihan & Pembayaran</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { handleSantriTabClick('pelanggaran'); setIsNavOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-xs font-bold transition flex items-center gap-2 ${
                      santriTab === 'pelanggaran' && currentView === 'santri-dashboard' ? 'bg-emerald-50 text-emerald-800 dark:bg-slate-800 dark:text-amber-400' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>Pelanggaran & Takzir</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { handleSantriTabClick('kesehatan'); setIsNavOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-xs font-bold transition flex items-center gap-2 ${
                      santriTab === 'kesehatan' && currentView === 'santri-dashboard' ? 'bg-emerald-50 text-emerald-800 dark:bg-slate-800 dark:text-amber-400' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>Riwayat Medis Sakit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { handleSantriTabClick('perizinan'); setIsNavOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-xs font-bold transition flex items-center gap-2 ${
                      santriTab === 'perizinan' && currentView === 'santri-dashboard' ? 'bg-emerald-50 text-emerald-800 dark:bg-slate-800 dark:text-amber-400' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>Pengajuan Izin Keluar</span>
                  </button>
                  {showStudentCard && (
                    <button
                      type="button"
                      onClick={() => { triggerStudentCard(); setIsNavOpen(false); }}
                      className="w-full text-left px-4 py-2.5 text-xs font-bold transition flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <span>Kartu Santri Digital</span>
                    </button>
                  )}
                  
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-2 pb-1 px-3">
                    <button
                      type="button"
                      onClick={() => {
                        onLogout();
                        setIsNavOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-extrabold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition flex items-center justify-center gap-1.5 cursor-pointer border border-rose-200 dark:border-rose-950/40 rounded-xl"
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

          <div className="fixed left-0 top-0 bottom-0 w-64 bg-white dark:bg-slate-950 shadow-2xl z-50 flex flex-col divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-100 text-left animate-fade-in lg:top-16 lg:h-[calc(100vh-4rem)] lg:shadow-none lg:border-r lg:border-slate-150 dark:lg:border-slate-850 lg:z-30">
            
            {/* Header inside drawer */}
            <div className="px-4 py-4 bg-gradient-to-r from-emerald-800 to-teal-900 text-white flex items-center justify-between">
              <div>
                <div className="text-[13px] uppercase font-black tracking-wider text-amber-200">
                  Menu Utama
                </div>
                {session && (
                  <div className="text-[11px] font-bold text-emerald-100 truncate max-w-[170px] mt-0.5">
                    👤 {userName}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsAccountOpen(false)}
                className="text-white/60 hover:text-white transition p-1 rounded-lg"
                title="Tutup Menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Drawer Menu Content (Scroll Area) */}
            <div className="flex-1 overflow-y-auto py-2 divide-y divide-slate-50 dark:divide-slate-900">
              
              {/* ADMIN MENU OPTIONS */}
              {session.role === 'admin' && (
                <div className="py-1">
                  <div className="px-4 py-1 text-[9px] uppercase font-mono font-bold text-slate-400">
                    Layanan Utama
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAdminTabClick('overview')}
                    className={`w-full text-left px-4 py-2 text-xs font-bold transition flex items-center gap-2 ${
                      adminTab === 'overview' && currentView === 'admin-dashboard' ? 'bg-emerald-800 text-white' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    Statistik Utama (Grafik)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdminTabClick('news_ann')}
                    className={`w-full text-left px-4 py-2 text-xs font-bold transition flex items-center gap-2 ${
                      adminTab === 'news_ann' && currentView === 'admin-dashboard' ? 'bg-emerald-800 text-white' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    Berita & Pengumuman
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdminTabClick('ppdb')}
                    className={`w-full text-left px-4 py-2 text-xs font-bold transition flex items-center gap-2 ${
                      adminTab === 'ppdb' && currentView === 'admin-dashboard' ? 'bg-emerald-800 text-white' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    Pendaftar PCSB Baru
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdminTabClick('students')}
                    className={`w-full text-left px-4 py-2 text-xs font-bold transition flex items-center gap-2 ${
                      adminTab === 'students' && currentView === 'admin-dashboard' ? 'bg-emerald-800 text-white' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    Manajemen Data Santri
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdminTabClick('kamar')}
                    className={`w-full text-left px-4 py-2 text-xs font-bold transition flex items-center gap-2 ${
                      adminTab === 'kamar' && currentView === 'admin-dashboard' ? 'bg-emerald-800 text-white' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    Manajemen Kamar & Quota
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdminTabClick('alumni')}
                    className={`w-full text-left px-4 py-2 text-xs font-bold transition flex items-center gap-2 ${
                      adminTab === 'alumni' && currentView === 'admin-dashboard' ? 'bg-emerald-800 text-white' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    Database Alumni Pesantren
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdminTabClick('bills')}
                    className={`w-full text-left px-4 py-2 text-xs font-bold transition flex items-center gap-2 ${
                      adminTab === 'bills' && currentView === 'admin-dashboard' ? 'bg-emerald-800 text-white' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    Tagihan & Keuangan SPP
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdminTabClick('rekening')}
                    className={`w-full text-left px-4 py-2 text-xs font-bold transition flex items-center gap-2 ${
                      adminTab === 'rekening' && currentView === 'admin-dashboard' ? 'bg-emerald-800 text-white' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    Rekening Pesantren
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdminTabClick('reports')}
                    className={`w-full text-left px-4 py-2 text-xs font-bold transition flex items-center gap-2 ${
                      adminTab === 'reports' && currentView === 'admin-dashboard' ? 'bg-emerald-800 text-white' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    Rekapan Laporan Terpadu
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdminTabClick('outbox_log')}
                    className={`w-full text-left px-4 py-2 text-xs font-bold transition flex items-center gap-2 ${
                      adminTab === 'outbox_log' && currentView === 'admin-dashboard' ? 'bg-emerald-800 text-white' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    Register Log Surat Keluar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdminTabClick('whatsapp')}
                    className={`w-full text-left px-4 py-2 text-xs font-bold transition flex items-center gap-2 ${
                      adminTab === 'whatsapp' && currentView === 'admin-dashboard' ? 'bg-emerald-800 text-white' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    Broadcast WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdminTabClick('input_mandiri')}
                    className={`w-full text-left px-4 py-2 text-xs font-bold transition flex items-center gap-2 ${
                      adminTab === 'input_mandiri' && currentView === 'admin-dashboard' ? 'bg-emerald-800 text-white' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    Pendaftaran Offline Santri
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdminTabClick('kelas_sekolah')}
                    className={`w-full text-left px-4 py-2 text-xs font-bold transition flex items-center gap-2 ${
                      adminTab === 'kelas_sekolah' && currentView === 'admin-dashboard' ? 'bg-emerald-800 text-white' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    Input Kelas & Sekolah
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdminTabClick('pengurus')}
                    className={`w-full text-left px-4 py-2 text-xs font-bold transition flex items-center justify-between ${
                      adminTab === 'pengurus' && currentView === 'admin-dashboard' ? 'bg-emerald-800 text-white' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span>Persetujuan & Akun Pengurus</span>
                    </span>
                    {pendingStaffCount > 0 && (
                      <span className="bg-amber-400 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-full animate-bounce shadow-xs">
                        {pendingStaffCount} Menunggu
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdminTabClick('settings')}
                    className={`w-full text-left px-4 py-2 text-xs font-bold transition flex items-center gap-2 ${
                      adminTab === 'settings' && currentView === 'admin-dashboard' ? 'bg-emerald-800 text-white' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    Pengaturan Portal
                  </button>
                </div>
              )}

              {/* STAFF MENU OPTIONS */}
              {['keamanan', 'ketertiban', 'kesehatan'].includes(session.role) && (
                <div className="py-1">
                  <div className="px-4 py-1 text-[9px] uppercase font-mono font-bold text-slate-400">
                    Biro {session.role.toUpperCase()}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleStaffTabClick('students')}
                    className={`w-full text-left px-4 py-2.5 text-xs font-bold transition flex items-center gap-2 ${
                      staffTab === 'students' && currentView === 'staff-dashboard' ? 'bg-emerald-800 text-white' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    Layanan Input & Data
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStaffTabClick('history')}
                    className={`w-full text-left px-4 py-2.5 text-xs font-bold transition flex items-center gap-2 ${
                      staffTab === 'history' && currentView === 'staff-dashboard' ? 'bg-emerald-800 text-white' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    Riwayat Log & Surat
                  </button>
                  {session.role === 'keamanan' && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleStaffTabClick('skck')}
                        className={`w-full text-left px-4 py-2.5 text-xs font-bold transition flex items-center gap-2 ${
                          staffTab === 'skck' && currentView === 'staff-dashboard' ? 'bg-emerald-800 text-white' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        Cetak Surat SKCK
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStaffTabClick('takzir_letter')}
                        className={`w-full text-left px-4 py-2.5 text-xs font-bold transition flex items-center gap-2 ${
                          staffTab === 'takzir_letter' && currentView === 'staff-dashboard' ? 'bg-emerald-800 text-white' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        Rekam Jejak Takzir
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => handleStaffTabClick('profile')}
                    className={`w-full text-left px-4 py-2.5 text-xs font-bold transition flex items-center gap-2 ${
                      staffTab === 'profile' && currentView === 'staff-dashboard' ? 'bg-emerald-800 text-white' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    Kewenangan & Tanda Tangan
                  </button>
                </div>
              )}
            </div>

            {/* Footer inside drawer with logout */}
            <div className="p-3 bg-slate-50 dark:bg-slate-900 shrink-0">
              <button
                type="button"
                onClick={() => {
                  onLogout();
                  setIsAccountOpen(false);
                }}
                className="w-full text-left px-4 py-2.5 text-xs font-extrabold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition flex items-center justify-center gap-2 cursor-pointer border border-rose-200 dark:border-rose-950/40 rounded-xl"
              >
                <span>Keluar Sesi</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Profile Modal */}
      {isProfileModalOpen && session && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-emerald-100 flex flex-col text-slate-800 animate-fade-in">
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
                    📸 Ganti Foto Sendiri
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
                  🔑 GANTI PASSWORD AKUN
                </h5>

                {profileError && (
                  <div className="text-[11px] text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-100 font-bold">
                    ⚠️ {profileError}
                  </div>
                )}

                {profileSuccess && (
                  <div className="text-[11px] text-emerald-600 bg-emerald-50 p-2.5 rounded-lg border border-emerald-100 font-bold">
                    ✅ {profileSuccess}
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
