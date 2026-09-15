import React from 'react';
import { 
  X, 
  GraduationCap, 
  Mail, 
  Key, 
  Sparkles, 
  Check, 
  Users, 
  Eye, 
  EyeOff, 
  User,
  MessageSquare, 
  AlertCircle
} from 'lucide-react';
import { UserSession } from '../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (session: UserSession) => void;
}

export default function LoginModal({ isOpen, onClose, onLoginSuccess }: LoginModalProps) {
  // Only 2 tabs: 'pengurus' and 'wali'
  const [activeTab, setActiveTab] = React.useState<'pengurus' | 'wali'>('pengurus');
  
  // Input fields
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [username, setUsername] = React.useState('');
  const [waliPassword, setWaliPassword] = React.useState('');
  
  // Visibility toggles
  const [showPassword, setShowPassword] = React.useState(false);
  const [showWaliPassword, setShowWaliPassword] = React.useState(false);
  
  // Status messages
  const [error, setError] = React.useState('');
  const [successMsg, setSuccessMsg] = React.useState('');

  // Sub-view: Staff registration
  const [isDaftarStaff, setIsDaftarStaff] = React.useState(false);

  // Staff registration form state
  const [regFullName, setRegFullName] = React.useState('');
  const [regEmail, setRegEmail] = React.useState('');
  const [regRole, setRegRole] = React.useState<'admin' | 'keamanan' | 'ketertiban' | 'kesehatan'>('admin');
  const [regPassword, setRegPassword] = React.useState('');

  // Reset states when closed
  React.useEffect(() => {
    if (!isOpen) {
      setEmail('');
      setPassword('');
      setUsername('');
      setWaliPassword('');
      setError('');
      setSuccessMsg('');
      setIsDaftarStaff(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Get Admin phone number from settings for direct WhatsApp contact
  const getAdminPhone = (): string => {
    try {
      const saved = localStorage.getItem('pesantren_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.phone) {
          const cleaned = parsed.phone.replace(/[^0-9]/g, '');
          if (cleaned.startsWith('0')) return '62' + cleaned.slice(1);
          if (cleaned.startsWith('62')) return cleaned;
          return '62' + cleaned;
        }
      }
    } catch (e) {}
    return '6281234567890';
  };

  // Direct WhatsApp contact handler
  const handleDirectWhatsAppAdmin = () => {
    const phone = getAdminPhone();
    const message = encodeURIComponent(
      "Assalamu'alaikum Admin Pesantren Al-Asy'ariyah, saya wali santri membutuhkan bantuan informasi akun login portal pesantren."
    );
    const waUrl = `https://wa.me/${phone}?text=${message}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  // Submit Login handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (activeTab === 'pengurus') {
      // ----------------------------------------------------
      // LOGIN PENGURUS: EMAIL & PASSWORD
      // ----------------------------------------------------
      if (!email.trim() || !password.trim()) {
        setError('Harap isi Email dan Password.');
        return;
      }

      const inputEmail = email.trim().toLowerCase();
      const inputPassword = password.trim();

      // 1. Default system accounts
      const defaultAccounts = [
        {
          id: 'admin-main',
          fullName: localStorage.getItem('admin_custom_name_muarifsamsul082@gmail.com') || 'Muarif Samsul',
          email: 'muarifsamsul082@gmail.com',
          role: 'admin' as const,
          isConfirmed: true,
          password: 'admin123'
        },
        {
          id: 'staff-keamanan',
          fullName: 'Ustadz Junaidi Al-Anshori',
          email: 'keamanan@alasyariyah.sch.id',
          role: 'keamanan' as const,
          isConfirmed: true,
          password: 'keamanan123'
        },
        {
          id: 'staff-ketertiban',
          fullName: 'Ustadz Abdul Somad, S.Sy',
          email: 'ketertiban@alasyariyah.sch.id',
          role: 'ketertiban' as const,
          isConfirmed: true,
          password: 'ketertiban123'
        },
        {
          id: 'staff-kesehatan',
          fullName: 'Ustadzah dr. Fatimah Az-Zahra',
          email: 'kesehatan@alasyariyah.sch.id',
          role: 'kesehatan' as const,
          isConfirmed: true,
          password: 'kesehatan123'
        }
      ];

      // 2. Load registered accounts from localStorage
      let storedUsers: any[] = [];
      try {
        const saved = localStorage.getItem('pesantren_staff_users');
        if (saved) {
          storedUsers = JSON.parse(saved);
          if (!Array.isArray(storedUsers)) storedUsers = [];
        }
      } catch (e) {
        console.error(e);
      }

      // Combine users (stored accounts take precedence for matching)
      const allAccounts = [...storedUsers, ...defaultAccounts];
      const matchedUser = allAccounts.find(u => u && u.email && u.email.toLowerCase() === inputEmail);

      if (!matchedUser) {
        setError('Akun dengan email tersebut tidak ditemukan. Silakan periksa kembali atau klik "Belum punya akun" untuk mendaftar.');
        return;
      }

      // Check if pending approval
      if (matchedUser.isConfirmed === false) {
        setError(`Akun (${inputEmail}) Anda masih menunggu persetujuan (konfirmasi) dari Admin Utama.`);
        return;
      }

      // Retrieve custom password if set
      let customPasswords: Record<string, string> = {};
      try {
        customPasswords = JSON.parse(localStorage.getItem('pesantren_custom_passwords') || '{}');
      } catch (e) {}

      const expectedPassword = customPasswords[inputEmail] || matchedUser.password || matchedUser.tempPassword || `${matchedUser.role}123`;

      if (inputPassword === expectedPassword || (inputEmail === 'muarifsamsul082@gmail.com' && inputPassword === 'admin123')) {
        // Success!
        setEmail('');
        setPassword('');
        setError('');
        onClose();
        const customName = localStorage.getItem('admin_custom_name_' + inputEmail) || localStorage.getItem('staff_custom_name_' + inputEmail);
        const resolvedFullName = customName || matchedUser.fullName || matchedUser.name || (inputEmail === 'muarifsamsul082@gmail.com' ? 'Muarif Samsul' : 'Pengurus');
        
        // Also persist custom name for this email so it's permanently retained
        if (resolvedFullName && !customName) {
          localStorage.setItem('admin_custom_name_' + inputEmail, resolvedFullName);
          localStorage.setItem('staff_custom_name_' + inputEmail, resolvedFullName);
        }

        onLoginSuccess({
          role: matchedUser.role || 'admin',
          email: matchedUser.email,
          fullName: resolvedFullName,
          roleName: resolvedFullName
        });
      } else {
        setError('Password yang Anda masukkan salah. Silakan periksa kembali.');
      }

    } else {
      // ----------------------------------------------------
      // LOGIN WALI SANTRI: USERNAME & PASSWORD
      // ----------------------------------------------------
      if (!username.trim() || !waliPassword.trim()) {
        setError('Harap isi Username dan Password.');
        return;
      }

      let storedStudents: any[] = [];
      try {
        const saved = localStorage.getItem('pesantren_students');
        if (saved) {
          storedStudents = JSON.parse(saved);
          if (!Array.isArray(storedStudents)) storedStudents = [];
        }
      } catch (e) {
        console.error(e);
      }

      const cleanInputUsername = username.trim().replace(/[^0-9]/g, '');
      const cleanInputPassword = waliPassword.trim();

      const match = storedStudents.find((s: any) => {
        if (!s) return false;
        const sPhone = (s.parentPhone || '').replace(/[^0-9]/g, '');
        const sNis = (s.nis || '').trim();
        const sId = (s.id || '').trim();
        
        // Match username with phone or id or name, and password with NIS/ID
        const usernameMatches = sPhone === cleanInputUsername || 
          (cleanInputUsername.length >= 8 && sPhone.endsWith(cleanInputUsername)) ||
          s.id?.toLowerCase() === username.trim().toLowerCase() ||
          s.nis?.toLowerCase() === username.trim().toLowerCase();

        const passwordMatches = sNis === cleanInputPassword || sId === cleanInputPassword;
        return usernameMatches && passwordMatches;
      });

      if (match) {
        if (match.status === 'Alumni') {
          setError(`Akses Ditolak: Santri atas nama "${match.fullName || 'Santri'}" telah berstatus sebagai ALUMNI. Akses login portal wali santri dinonaktifkan untuk santri yang sudah menjadi alumni.`);
          return;
        }

        setUsername('');
        setWaliPassword('');
        setError('');
        onClose();
        onLoginSuccess({
          role: 'santri',
          email: match.email || 'santri@alasyariyah.sch.id',
          studentId: match.id
        });
      } else {
        setError('Username atau Password salah atau belum terdaftar. Silakan hubungi admin jika membutuhkan bantuan.');
      }
    }
  };

  // Staff registration submit
  const handleRegStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!regFullName.trim() || !regEmail.trim() || !regPassword.trim()) {
      setError('Harap isi semua kolom pendaftaran!');
      return;
    }

    const emailClean = regEmail.trim().toLowerCase();

    let storedUsers: any[] = [];
    try {
      const saved = localStorage.getItem('pesantren_staff_users');
      if (saved) {
        storedUsers = JSON.parse(saved);
        if (!Array.isArray(storedUsers)) storedUsers = [];
      }
    } catch (e) { console.error(e); }

    if (storedUsers.some((u: any) => u && u.email && u.email.toLowerCase() === emailClean)) {
      setError('Email tersebut sudah terdaftar! Silakan gunakan email lain.');
      return;
    }

    const newUser = {
      id: `usr-${Date.now()}`,
      fullName: regFullName.trim(),
      email: emailClean,
      role: regRole,
      isConfirmed: false, // Requires admin approval
      registeredAt: new Date().toISOString().split('T')[0]
    };

    const updatedUsers = [...storedUsers, newUser];
    localStorage.setItem('pesantren_staff_users', JSON.stringify(updatedUsers));
    window.dispatchEvent(new Event('pesantren_staff_users_updated'));

    // Save custom password
    let customPasswords: Record<string, string> = {};
    try {
      customPasswords = JSON.parse(localStorage.getItem('pesantren_custom_passwords') || '{}');
    } catch (e) {}
    customPasswords[emailClean] = regPassword.trim();
    localStorage.setItem('pesantren_custom_passwords', JSON.stringify(customPasswords));

    // Save profile name specifically for this account email
    localStorage.setItem('admin_custom_name_' + emailClean, regFullName.trim());
    localStorage.setItem('staff_custom_name_' + emailClean, regFullName.trim());
    if (regRole !== 'admin') {
      localStorage.setItem(`${regRole}_config`, JSON.stringify({ name: regFullName.trim() }));
    }

    setSuccessMsg(`Pendaftaran atas nama "${regFullName.trim()}" berhasil! Akun Anda sedang menunggu persetujuan dari Admin Utama.`);
    setEmail(emailClean);
    setPassword(regPassword.trim());
    setIsDaftarStaff(false);
    setActiveTab('pengurus');
    setRegFullName('');
    setRegEmail('');
    setRegPassword('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-950/70 backdrop-blur-sm animate-fade-in font-sans">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-emerald-100 flex flex-col max-h-[90vh]">
        
        {/* Header decoration */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-900 px-6 py-6 text-white relative shrink-0">
          <button 
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-emerald-100 hover:text-white hover:bg-emerald-700/50 p-1.5 rounded-full transition cursor-pointer"
            title="Tutup Modal"
          >
            <X className="h-5 w-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="bg-amber-400 p-2.5 rounded-xl text-emerald-950 shadow-md">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-xl leading-tight">Portal Al-Asy'ariyah</h3>
              <p className="text-emerald-100 text-xs">
                {isDaftarStaff 
                  ? 'Pendaftaran Akun Pengurus' 
                  : 'Silakan masuk ke akun Anda'}
              </p>
            </div>
          </div>
        </div>

        {/* 2 Tabs: Pengurus & Wali Santri (Clean, no numbering) */}
        {!isDaftarStaff && (
          <div className="flex border-b border-emerald-100 bg-emerald-50/40 shrink-0">
            <button
              type="button"
              onClick={() => { 
                setActiveTab('pengurus'); 
                setError(''); 
                setSuccessMsg(''); 
                setEmail(''); 
                setPassword(''); 
              }}
              className={`flex-1 py-3.5 px-4 flex items-center justify-center gap-2 font-bold text-xs sm:text-sm transition-all border-b-2 cursor-pointer ${
                activeTab === 'pengurus'
                  ? 'border-emerald-700 text-emerald-900 bg-white font-extrabold shadow-xs'
                  : 'border-transparent text-emerald-700/70 hover:text-emerald-950 hover:bg-emerald-100/40'
              }`}
            >
              <Users className="h-4 w-4 shrink-0 text-emerald-700" />
              <span>Pengurus</span>
            </button>

            <button
              type="button"
              onClick={() => { 
                setActiveTab('wali'); 
                setError(''); 
                setSuccessMsg(''); 
                setUsername(''); 
                setWaliPassword(''); 
              }}
              className={`flex-1 py-3.5 px-4 flex items-center justify-center gap-2 font-bold text-xs sm:text-sm transition-all border-b-2 cursor-pointer ${
                activeTab === 'wali'
                  ? 'border-emerald-700 text-emerald-900 bg-white font-extrabold shadow-xs'
                  : 'border-transparent text-emerald-700/70 hover:text-emerald-950 hover:bg-emerald-100/40'
              }`}
            >
              <GraduationCap className="h-4 w-4 shrink-0 text-emerald-700" />
              <span>Wali Santri</span>
            </button>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs leading-relaxed font-semibold flex items-start gap-2 animate-fade-in">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Success message */}
          {successMsg && (
            <div className="mb-4 p-3.5 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-xl text-xs flex items-start gap-2.5 font-semibold leading-relaxed animate-fade-in">
              <Check className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ---------------------------------------------------- */}
          {/* VIEW 1: REGISTRATION PENGURUS (Belum Punya Akun) */}
          {/* ---------------------------------------------------- */}
          {isDaftarStaff ? (
            <form onSubmit={handleRegStaffSubmit} className="space-y-4 text-left">
              <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-100 text-left">
                <h4 className="font-bold text-xs text-emerald-950 mb-0.5 flex items-center gap-1.5">
                  📝 Pendaftaran Akun Pengurus
                </h4>
                <p className="text-[11px] text-emerald-800 leading-snug">
                  Daftarkan akun pengurus baru untuk mengelola portal pesantren. Akun akan aktif setelah dikonfirmasi oleh Admin Utama.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Lengkap <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder="Masukkan nama lengkap..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-700 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="Masukkan email..."
                      className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-700 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Jabatan <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-700 bg-white"
                  >
                    <option value="admin">Admin Utama</option>
                    <option value="keamanan">Keamanan</option>
                    <option value="ketertiban">Ketertiban</option>
                    <option value="kesehatan">Kesehatan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="password"
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Masukkan password..."
                      className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-700 bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => { setIsDaftarStaff(false); setError(''); }}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-emerald-800 to-teal-900 hover:from-emerald-700 hover:to-teal-800 text-white rounded-lg text-xs font-bold transition shadow-md cursor-pointer"
                >
                  Daftar
                </button>
              </div>
            </form>

          ) : (
            /* ---------------------------------------------------- */
            /* VIEW 2: CLEAN 2-TAB LOGIN FORM                       */
            /* ---------------------------------------------------- */
            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              
              {activeTab === 'pengurus' ? (
                /* LOGIN PENGURUS: EMAIL & PASSWORD ONLY */
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Masukkan email..."
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-700 bg-white placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <Key className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Masukkan password..."
                        className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-700 bg-white placeholder:text-slate-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-700 transition focus:outline-none cursor-pointer"
                        title={showPassword ? "Sembunyikan Password" : "Tampilkan Password"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                /* LOGIN WALI SANTRI: USERNAME & PASSWORD ONLY */
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Username
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Masukkan username..."
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-700 bg-white placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <Key className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                      <input
                        type={showWaliPassword ? "text" : "password"}
                        required
                        value={waliPassword}
                        onChange={(e) => setWaliPassword(e.target.value)}
                        placeholder="Masukkan password..."
                        className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-700 bg-white placeholder:text-slate-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowWaliPassword(!showWaliPassword)}
                        className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-700 transition focus:outline-none cursor-pointer"
                        title={showWaliPassword ? "Sembunyikan Password" : "Tampilkan Password"}
                      >
                        {showWaliPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-emerald-800 to-teal-900 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl text-sm font-bold shadow-md transition duration-150 mt-2 cursor-pointer active:scale-[0.99] flex items-center justify-center gap-2"
              >
                <span>Masuk</span>
              </button>

              {/* Below Form Links as requested */}
              {activeTab === 'pengurus' ? (
                /* Pengurus: Tulisan "Belum punya akun" di bawah tombol */
                <div className="text-center pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDaftarStaff(true);
                      setError('');
                      setSuccessMsg('');
                    }}
                    className="text-xs font-bold text-emerald-800 hover:text-emerald-950 hover:underline cursor-pointer inline-flex items-center gap-1"
                  >
                    <span>Belum punya akun?</span>
                    <span className="text-amber-600 font-extrabold">Daftar</span>
                  </button>
                </div>
              ) : (
                /* Wali Santri: Tulisan "Hubungi Admin" langsung membuka chat WhatsApp admin terdaftar */
                <div className="text-center pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleDirectWhatsAppAdmin}
                    className="text-xs font-bold text-emerald-800 hover:text-emerald-950 hover:underline cursor-pointer inline-flex items-center gap-1.5"
                    title="Buka WhatsApp Admin"
                  >
                    <MessageSquare className="h-3.5 w-3.5 text-emerald-700" />
                    <span>Lupa akun?</span>
                    <span className="text-emerald-900 font-extrabold underline">Hubungi Admin</span>
                  </button>
                </div>
              )}

            </form>
          )}
        </div>
      </div>
    </div>
  );
}
