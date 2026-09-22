import React from 'react';
import { 
  Shield, 
  FileText, 
  Plus, 
  Check, 
  Calendar, 
  Printer, 
  Download,
  Heart, 
  AlertTriangle, 
  Settings, 
  Search, 
  Users, 
  Signature, 
  User, 
  Clock, 
  Activity, 
  Sparkles,
  Award,
  BookOpen,
  MoreVertical,
  Edit2,
  Trash2,
  Eye,
  X,
  Sun,
  Moon,
  EyeOff,
  Menu,
  LogOut,
  Loader2
} from 'lucide-react';
import { Student, SecurityLog, DisciplineLog, HealthLog, UserSession } from '../types';
import { downloadPrintableHTML, PrintGuideAlert } from './PrintHelper';
import { isSupabaseConfigured, pushAllStudentsToSupabase, pushStaffConfigToSupabase, markLocalDataChanged } from '../lib/supabase';

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

interface StaffDashboardProps {
  session: UserSession;
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  onLogout?: () => void;
  activeSubTab: 'students' | 'history' | 'profile' | 'skck' | 'takzir_letter';
  setActiveSubTab: (tab: 'students' | 'history' | 'profile' | 'skck' | 'takzir_letter') => void;
}

export default function StaffDashboard({ 
  session, 
  students, 
  setStudents, 
  onLogout,
  activeSubTab,
  setActiveSubTab
}: StaffDashboardProps) {
  const role = session.role as 'keamanan' | 'ketertiban' | 'kesehatan';
  
  const pesantrenSettings = React.useMemo(() => {
    try {
      const stored = localStorage.getItem('pesantren_settings');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return {
      schoolName: "Pondok Pesantren Al-Asy'ariyah",
      namaYayasan: "Yayasan Al-Asy'ariyah",
      address: "Jl. Raya Modung, Langpanggang, Modung, Bangkalan, Jawa Timur",
      phone: "",
      email: "info@alasyariyah.sch.id",
      tagline: "Mencetak Generasi Qur'ani, Berakhlakul Karimah, Unggul, dan Mandiri",
      logoUrl: "/pesantren_logo.jpg"
    };
  }, []);
  
  const isImageUrl = (str?: string): boolean => {
    if (!str) return false;
    return str.startsWith('http://') || str.startsWith('https://') || str.startsWith('/') || str.startsWith('data:image/');
  };

  const [outboundLettersLog, setOutboundLettersLog] = React.useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('pesantren_outbound_letters_log');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error(e);
      return [];
    }
  });

  React.useEffect(() => {
    localStorage.setItem('pesantren_outbound_letters_log', JSON.stringify(outboundLettersLog));
  }, [outboundLettersLog]);

  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeSubTab, role]);

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
    }
    downloadPrintableHTML(elementId, `${type.replace(/\s+/g, '_')}_${recipient.replace(/\s+/g, '_')}`);
  };
  
  // Tab states values: 'students' | 'history' | 'profile'
  const [isStaffMenuOpen, setIsStaffMenuOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedStudent, setSelectedStudent] = React.useState<Student | null>(null);
  const [inputSearchTerm, setInputSearchTerm] = React.useState('');
  const [inputSelectedStudentId, setInputSelectedStudentId] = React.useState('');

  // Form states
  const [showAddModal, setShowAddModal] = React.useState(false);

  // Signature / Custom config for the department
  const [deptName, setDeptName] = React.useState('');
  const [deptSignature, setDeptSignature] = React.useState('');
  const [deptSeal, setDeptSeal] = React.useState('');
  const [letterTemplate1, setLetterTemplate1] = React.useState('');
  const [letterTemplate2, setLetterTemplate2] = React.useState('');
  const [letterTemplate3, setLetterTemplate3] = React.useState('');

  // 1. Keamanan states
  const [permitType, setPermitType] = React.useState<'Keluar Lingkungan' | 'Pulang (Keluarga)'>('Keluar Lingkungan');
  const [permitDesc, setPermitDesc] = React.useState('');
  const [expectedReturn, setExpectedReturn] = React.useState('');

  // 2. Ketertiban states
  const [violationType, setViolationType] = React.useState('');
  const [violationLevel, setViolationLevel] = React.useState<'Ringan' | 'Sedang' | 'Berat'>('Ringan');
  const [violationPoints, setViolationPoints] = React.useState(2);
  const [violationConsequence, setViolationConsequence] = React.useState('');

  // 3. Kesehatan states
  const [complaint, setComplaint] = React.useState('');
  const [diagnosis, setDiagnosis] = React.useState('');
  const [treatment, setTreatment] = React.useState('');
  const [healthStatus, setHealthStatus] = React.useState<'Rawat Jalan (Kamar)' | 'Nginap di Poskestren' | 'Dirujuk ke RS / Pulang'>('Rawat Jalan (Kamar)');
  const [customInputType, setCustomInputType] = React.useState<'takzir' | 'izin' | 'kesehatan'>(role === 'ketertiban' ? 'izin' : role === 'kesehatan' ? 'kesehatan' : 'izin');
  const [staffSubTab, setStaffSubTab] = React.useState<'perizinan' | 'takzir' | 'kesehatan'>(
    role === 'ketertiban' ? 'takzir' : role === 'kesehatan' ? 'kesehatan' : 'perizinan'
  );

  React.useEffect(() => {
    if (role === 'ketertiban') {
      setStaffSubTab('takzir');
    } else if (role === 'kesehatan') {
      setStaffSubTab('kesehatan');
    } else {
      setStaffSubTab('perizinan');
    }
  }, [role]);

  // AI Validation Assistant states
  const [aiOutput, setAiOutput] = React.useState<{[key: string]: string}>({});
  const [aiLoading, setAiLoading] = React.useState<{[key: string]: boolean}>({});

  // Statistics Filter states
  const [statsMonth, setStatsMonth] = React.useState<string>('Semua');
  const [statsYear, setStatsYear] = React.useState<string>('Semua');

  const runAiValidation = async (studentId: string, type: 'izin' | 'general', student: Student, extraPrompt?: string) => {
    setAiLoading(prev => ({ ...prev, [studentId]: true }));
    try {
      const response = await fetch('/api/ai/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type,
          studentData: student,
          contextData: {
            purpose: "Permohonan Evaluasi Kedisiplinan & Kelayakan Perizinan Keluar",
            expectedReturn: "Sesuai Standar Operasional Pesantren"
          },
          extraPrompt
        })
      });
      if (response.ok) {
        const resData = await response.json();
        if (resData.result) {
          setAiOutput(prev => ({ ...prev, [studentId]: resData.result }));
          return;
        }
      }
      throw new Error("Server API tidak merespons atau mengembalikan format non-JSON");
    } catch (e: any) {
      // Fallback rule-based AI assistant output for static deployment or API offline
      const points = student?.disciplineLogs?.filter((d: any) => d.status !== 'Selesai').reduce((sum: number, d: any) => sum + d.points, 0) || 0;
      let fallbackText = '';
      if (type === 'izin') {
        if (points > 10) {
          fallbackText = `🤖 [REKOMENDASI AI: TOLAK]\n\nSantri ${student?.fullName || 'ybs'} memiliki total ${points} poin pelanggaran aktif. Berdasarkan SOP Pesantren, perizinan keluar sebaiknya DITOLAK atau diberikan catatan pembinaan khusus.`;
        } else {
          fallbackText = `🤖 [REKOMENDASI AI: SETUJU]\n\nSantri ${student?.fullName || 'ybs'} memiliki ${points} poin pelanggaran aktif (di bawah ambang batas 10 poin). Permohonan izin keluar teridentifikasi aman dan layak disetujui.`;
        }
      } else {
        fallbackText = `🤖 [ASISTEN AI PESANTREN]\n\nData santri ${student?.fullName || 'ybs'} (Kelas ${student?.class || '-'}) telah ditinjau. Sistem merekomendasikan penanganan administrasi sesuai standar operasional pondok.`;
      }
      setAiOutput(prev => ({ ...prev, [studentId]: fallbackText }));
    } finally {
      setAiLoading(prev => ({ ...prev, [studentId]: false }));
    }
  };

  React.useEffect(() => {
    if (role === 'ketertiban') {
      setCustomInputType('izin');
    } else if (role === 'kesehatan') {
      setCustomInputType('kesehatan');
    } else {
      setCustomInputType('takzir');
    }
  }, [role]);

  // 4. SKCK states (Keamanan)
  const [skckNis, setSkckNis] = React.useState('');
  const [skckReason, setSkckReason] = React.useState('Sebagai syarat sah administrasi kurban, mutasi pesantren formal, dan pendaftaran jenjang karir lanjutan.');

  // Print slip layout trigger
  const [printSecurityLog, setPrintSecurityLog] = React.useState<SecurityLog | null>(null);
  const [printDisciplineLog, setPrintDisciplineLog] = React.useState<DisciplineLog | null>(null);
  const [printHealthLog, setPrintHealthLog] = React.useState<HealthLog | null>(null);
  const [viewOnlyMode, setViewOnlyMode] = React.useState(false);

  // Custom Confirmation Dialog State
  const [confirmInputText, setConfirmInputText] = React.useState('');
  const [confirmDialog, setConfirmDialog] = React.useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    requireInput?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const triggerConfirm = (title: string, message: string, onConfirm: () => void, requireInput?: string) => {
    setConfirmInputText('');
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      onConfirm,
      requireInput,
    });
  };

  // Actions Dropdown & Editing logs states
  const [activeDropdownId, setActiveDropdownId] = React.useState<string | null>(null);
  const [activeStudentCardDropdownId, setActiveStudentCardDropdownId] = React.useState<string | null>(null);
  const [editingLog, setEditingLog] = React.useState<{ id: string; type: 'security' | 'discipline' | 'health'; values: any } | null>(null);

  // Load staff profile settings from localStorage on init
  React.useEffect(() => {
    const configKey = `${role}_config`;
    const saved = localStorage.getItem(configKey);
    const userEmail = session?.email || '';
    const customStaffName = userEmail ? localStorage.getItem(`staff_custom_name_${userEmail}`) : null;
    const accountName = customStaffName || (session?.fullName && session.fullName !== 'Muhammad' ? session.fullName : '');

    const defaults = {
      keamanan: {
        name: accountName || 'Ustadz Junaidi Al-Anshori',
        signature: '✍️ Junaidi',
        seal: '🛡️ STEMPEL KEAMANAN AL-ASY\'ARIYAH',
        letterTemplate1: 'Sehubungan dengan pelanggaran tertulis pedoman kedisplinan pondok pesantren, diberikan sanksi resmi kepada santri berikut:',
        letterTemplate2: '* Keterangan penting: Pelanggaran telah dicatatkan dalam server kesiswaan. Jika point melampaui batas toleransi (50 point), maka pihak pesantren berhak melakukan pemanggilan secara resmi kepada Wali Santri secara tertulis.',
        letterTemplate3: ''
      },
      ketertiban: {
        name: accountName || 'Ustadz Abdul Somad, S.Sy',
        signature: '✒️ Abdul Somad',
        seal: '📜 STEMPEL KETERTIBAN',
        letterTemplate1: 'Diberikan izin kepada santri yang identitasnya tertera di bawah ini untuk meninggalkan area pondok pesantren sesuai rincian:',
        letterTemplate2: 'Sepanjang pengamatan lahiriah murni kami, yang bersangkutan selama berada di lingkungan Pondok Pesantren Al-Asy\'ariyah benar-benar Berkelakuan Baik, Taat Beribadah, serta bebas/bersih dari sanksi-sanksi pelanggaran berat hukum pondok pesantren.',
        letterTemplate3: 'Demikian surat keterangan catatan kelakuan baik ini dibuat untuk dapat dipergunakan sebagaimana mestinya dengan penuh rasa tanggung jawab.'
      },
      kesehatan: {
        name: accountName || 'Ustadzah dr. Fatimah Az-Zahra',
        signature: '⚕️ Fatimah',
        seal: '🩺 POSKESTREN AL-ASY\'ARIYAH',
        letterTemplate1: 'Menerangkan dengan ini bahwa santri yang tercantum di bawah ini sedang dalam perawatan kami:',
        letterTemplate2: '* Rekomendasi Medis: Diberikan dispensasi untuk beristirahat penuh dari kegiatan quranic, kelas diniyah, and sekolah umum selama proses pemulihan berlangsung. Mohon dijaga kebersihan makanan dan pola istirahatnya.',
        letterTemplate3: ''
      }
    };

    if (saved) {
      const parsed = JSON.parse(saved);
      // Prioritas nama: nama akun terdaftar > nama yang disimpan di config > default
      const finalName = accountName || parsed.name || defaults[role].name;
      setDeptName(finalName);
      setDeptSignature(parsed.signature || defaults[role].signature);
      setDeptSeal(parsed.seal || defaults[role].seal);
      setLetterTemplate1(parsed.letterTemplate1 || defaults[role].letterTemplate1);
      setLetterTemplate2(parsed.letterTemplate2 || defaults[role].letterTemplate2);
      setLetterTemplate3(parsed.letterTemplate3 || defaults[role].letterTemplate3);
    } else {
      setDeptName(accountName || defaults[role].name);
      setDeptSignature(defaults[role].signature);
      setDeptSeal(defaults[role].seal);
      setLetterTemplate1(defaults[role].letterTemplate1);
      setLetterTemplate2(defaults[role].letterTemplate2);
      setLetterTemplate3(defaults[role].letterTemplate3);
    }
  }, [role, session]);

  // Listener sinkronisasi nama pengurus secara real-time
  React.useEffect(() => {
    const handleNameSync = () => {
      const userEmail = (session?.email || `${role}@alasyariyah.sch.id`).toLowerCase();
      const customStaffName = localStorage.getItem('staff_custom_name_' + userEmail);
      if (customStaffName) {
        setDeptName(customStaffName);
        return;
      }
      try {
        const staffList = JSON.parse(localStorage.getItem('pesantren_staff_users') || '[]');
        const found = staffList.find((u: any) => (u.email && u.email.toLowerCase() === userEmail) || u.role === role);
        if (found && (found.fullName || found.name)) {
          setDeptName(found.fullName || found.name);
        }
      } catch (e) {}
    };

    window.addEventListener('pesantren_staff_users_updated', handleNameSync);
    window.addEventListener('staff_configs_updated', handleNameSync);
    window.addEventListener('pesantren_admin_name_updated', handleNameSync);
    return () => {
      window.removeEventListener('pesantren_staff_users_updated', handleNameSync);
      window.removeEventListener('staff_configs_updated', handleNameSync);
      window.removeEventListener('pesantren_admin_name_updated', handleNameSync);
    };
  }, [role, session]);

  const persistStudents = (updated: Student[]) => {
    setStudents(updated);
    markLocalDataChanged('students');
    try {
      localStorage.setItem('pesantren_students', JSON.stringify(updated));
    } catch (e) {
      console.error("Local storage error:", e);
    }
    window.dispatchEvent(new Event('pesantren_db_sync'));
    if (isSupabaseConfigured()) {
      pushAllStudentsToSupabase(updated).catch(e => console.error("Cloud push students error:", e));
    }
  };

  // Save profile settings
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const configKey = `${role}_config`;
    const dataObj = { 
      name: deptName, 
      signature: deptSignature, 
      seal: deptSeal,
      letterTemplate1,
      letterTemplate2,
      letterTemplate3
    };
    localStorage.setItem(configKey, JSON.stringify(dataObj));
    
    // Sinkronkan nama pengurus ke daftar akun pengurus terdaftar & menu persetujuan
    const userEmail = (session?.email || `${role}@alasyariyah.sch.id`).toLowerCase();
    localStorage.setItem('staff_custom_name_' + userEmail, deptName);
    try {
      const staffUsers = JSON.parse(localStorage.getItem('pesantren_staff_users') || '[]');
      let changed = false;
      const updatedStaff = staffUsers.map((u: any) => {
        if (u && (u.email?.toLowerCase() === userEmail || u.role === role)) {
          changed = true;
          return { ...u, fullName: deptName, name: deptName };
        }
        return u;
      });
      if (changed) {
        localStorage.setItem('pesantren_staff_users', JSON.stringify(updatedStaff));
        window.dispatchEvent(new Event('pesantren_staff_users_updated'));
        fetch('/api/staff-users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: userEmail, fullName: deptName, name: deptName, role })
        }).catch(() => {});
      }
    } catch (e) {}

    // Update session jika ada
    try {
      const storedSess = localStorage.getItem('pesantren_session');
      if (storedSess) {
        const parsed = JSON.parse(storedSess);
        parsed.fullName = deptName;
        localStorage.setItem('pesantren_session', JSON.stringify(parsed));
      }
    } catch (e) {}

    // Dispatch custom event to notify admin and cloud sync
    window.dispatchEvent(new Event('pesantren_staff_users_updated'));
    window.dispatchEvent(new Event('pesantren_admin_name_updated'));
    window.dispatchEvent(new Event('staff_configs_updated'));
    window.dispatchEvent(new Event('pesantren_db_sync'));
    fetch('/api/staff-configs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, config: dataObj })
    }).catch(() => {});
    if (isSupabaseConfigured()) {
      pushStaffConfigToSupabase(role, { name: deptName, signature: deptSignature, seal: deptSeal }).catch(e => console.error(e));
    }
    alert('Profil dan draf template surat berhasil diperbarui serta disinkronkan ke seluruh sistem!');
  };

  // Helper to dynamically get any department configuration
  const getStaffConfig = (dept: 'keamanan' | 'ketertiban' | 'kesehatan') => {
    const saved = localStorage.getItem(`${dept}_config`);
    const defaults = {
      keamanan: {
        name: 'Ustadz Junaidi Al-Anshori',
        signature: '✍️ Junaidi',
        seal: '🛡️ STEMPEL KEAMANAN AL-ASY\'ARIYAH',
        letterTemplate1: 'Sehubungan dengan pelanggaran tertulis pedoman kedisplinan pondok pesantren, diberikan sanksi resmi kepada santri berikut:',
        letterTemplate2: '* Keterangan penting: Pelanggaran telah dicatatkan dalam server kesiswaan. Jika point melampaui batas toleransi (50 point), maka pihak pesantren berhak melakukan pemanggilan secara resmi kepada Wali Santri secara tertulis.',
        letterTemplate3: ''
      },
      ketertiban: {
        name: 'Ustadz Abdul Somad, S.Sy',
        signature: '✒️ Abdul Somad',
        seal: '📜 STEMPEL KETERTIBAN',
        letterTemplate1: 'Diberikan izin kepada santri yang identitasnya tertera di bawah ini untuk meninggalkan area pondok pesantren sesuai rincian:',
        letterTemplate2: 'Sepanjang pengamatan lahiriah murni kami, yang bersangkutan selama berada di lingkungan Pondok Pesantren Al-Asy\'ariyah benar-benar Berkelakuan Baik, Taat Beribadah, serta bebas/bersih dari sanksi-sanksi pelanggaran berat hukum pondok pesantren.',
        letterTemplate3: 'Demikian surat keterangan catatan kelakuan baik ini dibuat untuk dapat dipergunakan sebagaimana mestinya dengan penuh rasa tanggung jawab.'
      },
      kesehatan: {
        name: 'Ustadzah dr. Fatimah Az-Zahra',
        signature: '⚕️ Fatimah',
        seal: '🩺 POSKESTREN AL-ASY\'ARIYAH',
        letterTemplate1: 'Menerangkan dengan ini bahwa santri yang tercantum di bawah ini sedang dalam perawatan kami:',
        letterTemplate2: '* Rekomendasi Medis: Diberikan dispensasi untuk beristirahat penuh dari kegiatan quranic, kelas diniyah, and sekolah umum selama proses pemulihan berlangsung. Mohon dijaga kebersihan makanan dan pola istirahatnya.',
        letterTemplate3: ''
      }
    };

    const sharedPengasuhSig = pesantrenSettings?.ttdPengasuhUrl || pesantrenSettings?.ttdPengurusUrl || '';
    const sharedPengasuhSeal = pesantrenSettings?.stempelPengasuhUrl || pesantrenSettings?.stempelPesantrenUrl || '';

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          name: parsed.name || defaults[dept].name,
          signature: sharedPengasuhSig || parsed.signature || defaults[dept].signature,
          seal: sharedPengasuhSeal || parsed.seal || defaults[dept].seal,
          letterTemplate1: parsed.letterTemplate1 || defaults[dept].letterTemplate1,
          letterTemplate2: parsed.letterTemplate2 || defaults[dept].letterTemplate2,
          letterTemplate3: parsed.letterTemplate3 || defaults[dept].letterTemplate3
        };
      } catch (e) {
        // ignore
      }
    }
    return {
      ...defaults[dept],
      signature: sharedPengasuhSig || defaults[dept].signature,
      seal: sharedPengasuhSeal || defaults[dept].seal
    };
  };

  // Automatically adjust default points based on level
  React.useEffect(() => {
    if (violationLevel === 'Ringan') setViolationPoints(2);
    else if (violationLevel === 'Sedang') setViolationPoints(5);
    else if (violationLevel === 'Berat') setViolationPoints(15);
  }, [violationLevel]);

  // Insert items handler
  const handleAddRecordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;

    const updatedStudents = students.map(s => {
      if (s.id === selectedStudent.id) {
        if (customInputType === 'izin') {
          const newSec: SecurityLog = {
            id: `sec-${Date.now()}`,
            studentId: s.id,
            studentName: s.fullName,
            permitType,
            description: permitDesc,
            outDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
            expectedReturnDate: expectedReturn,
            status: 'Aktif / Keluar',
            signedBy: deptName || 'Ketertiban Perizinan'
          };
          return {
            ...s,
            securityLogs: [newSec, ...(s.securityLogs || [])]
          };
        } else if (customInputType === 'takzir') {
          const newDisc: DisciplineLog = {
            id: `disc-${Date.now()}`,
            studentId: s.id,
            studentName: s.fullName,
            violationType,
            level: violationLevel,
            points: Number(violationPoints),
            consequence: violationConsequence,
            date: new Date().toISOString().split('T')[0],
            signedBy: deptName || 'Keamanan Ketertiban',
            status: 'Belum Diurus'
          };
          return {
            ...s,
            disciplineLogs: [newDisc, ...(s.disciplineLogs || [])]
          };
        } else if (customInputType === 'kesehatan') {
          const newHeal: HealthLog = {
            id: `heal-${Date.now()}`,
            studentId: s.id,
            studentName: s.fullName,
            complaint,
            diagnosis,
            treatment,
            status: healthStatus,
            date: new Date().toISOString().split('T')[0],
            signedBy: deptName || 'Poskestren'
          };
          return {
            ...s,
            healthLogs: [newHeal, ...(s.healthLogs || [])]
          };
        }
      }
      return s;
    });

    persistStudents(updatedStudents);
    
    // Reset forms
    setPermitDesc('');
    setExpectedReturn('');
    setViolationType('');
    setViolationConsequence('');
    setComplaint('');
    setDiagnosis('');
    setTreatment('');
    setSearchTerm('');
    setInputSearchTerm('');
    setInputSelectedStudentId('');
    setShowAddModal(false);
    setSelectedStudent(null);
  };

  // Update Security Status (Returned / Late)
  const handleUpdateReturnStatus = (studentId: string, logId: string, isLate: boolean) => {
    const updated = students.map(s => {
      if (s.id === studentId) {
        let updatedDisciplineLogs = s.disciplineLogs || [];
        const updatedLogs = (s.securityLogs || []).map(log => {
          if (log.id === logId) {
            if (isLate) {
              const newDisc: DisciplineLog = {
                id: `disc-auto-${Date.now()}`,
                studentId: s.id,
                studentName: s.fullName,
                violationType: `Keterlambatan Kembali (${log.permitType})`,
                level: 'Sedang',
                points: 5,
                consequence: "Ta'zir disiplin keterlambatan (Membersihkan pos keamanan / sanksi luring)",
                date: new Date().toISOString().split('T')[0],
                signedBy: deptName || 'Keamanan Pos Penjagaan',
                status: 'Belum Diurus'
              };
              updatedDisciplineLogs = [newDisc, ...updatedDisciplineLogs];
            }
            return {
              ...log,
              status: isLate ? 'Terlambat' as const : 'Kembali' as const,
              actualReturnDate: new Date().toISOString().replace('T', ' ').substring(0, 16)
            };
          }
          return log;
        });
        return { 
          ...s, 
          securityLogs: updatedLogs,
          disciplineLogs: updatedDisciplineLogs
        };
      }
      return s;
    });
    persistStudents(updated);
  };

  const handleApprovePermit = (studentId: string, logId: string) => {
    const updated = students.map(s => {
      if (s.id === studentId) {
        const updatedLogs = (s.securityLogs || []).map(log => {
          if (log.id === logId) {
            return {
              ...log,
              status: 'Aktif / Keluar' as const,
              signedBy: deptSignature || getStaffConfig('keamanan').signature || 'Petugas Keamanan'
            };
          }
          return log;
        });
        return { ...s, securityLogs: updatedLogs };
      }
      return s;
    });
    persistStudents(updated);
  };

  const handleRejectPermit = (studentId: string, logId: string) => {
    const updated = students.map(s => {
      if (s.id === studentId) {
        const updatedLogs = (s.securityLogs || []).map(log => {
          if (log.id === logId) {
            return {
              ...log,
              status: 'Ditolak' as const,
              signedBy: deptSignature || getStaffConfig('keamanan').signature || 'Petugas Keamanan'
            };
          }
          return log;
        });
        return { ...s, securityLogs: updatedLogs };
      }
      return s;
    });
    persistStudents(updated);
  };

  // Delete Log from a student record database
  const handleDeleteLog = (logId: string, logType: 'security' | 'discipline' | 'health') => {
    triggerConfirm(
      'Hapus Catatan Riwayat (Keamanan Ganda)',
      'PERINGATAN: Menghapus catatan log santri ini dapat mengganggu validitas audit kesiswaan. Untuk menghindari penghapusan tidak sengaja, harap masukkan kata kunci konfirmasi.',
      () => {
        const updated = students.map(s => {
          if (logType === 'security') {
            return {
              ...s,
              securityLogs: (s.securityLogs || []).filter(l => l.id !== logId)
            };
          } else if (logType === 'discipline') {
            return {
              ...s,
              disciplineLogs: (s.disciplineLogs || []).filter(l => l.id !== logId)
            };
          } else {
            return {
              ...s,
              healthLogs: (s.healthLogs || []).filter(l => l.id !== logId)
            };
          }
        });
        persistStudents(updated);
      },
      'HAPUS'
    );
  };

  // Edit Log inside a student record
  const handleEditLog = (logId: string, logType: 'security' | 'discipline' | 'health', updatedValues: any) => {
    const updated = students.map(s => {
      if (logType === 'security') {
        const hasLog = (s.securityLogs || []).some(l => l.id === logId);
        if (hasLog) {
          const updatedLogs = (s.securityLogs || []).map(l => l.id === logId ? { ...l, ...updatedValues } : l);
          return { ...s, securityLogs: updatedLogs };
        }
      } else if (logType === 'discipline') {
        const hasLog = (s.disciplineLogs || []).some(l => l.id === logId);
        if (hasLog) {
          const updatedLogs = (s.disciplineLogs || []).map(l => l.id === logId ? { ...l, ...updatedValues } : l);
          return { ...s, disciplineLogs: updatedLogs };
        }
      } else {
        const hasLog = (s.healthLogs || []).some(l => l.id === logId);
        if (hasLog) {
          const updatedLogs = (s.healthLogs || []).map(l => l.id === logId ? { ...l, ...updatedValues } : l);
          return { ...s, healthLogs: updatedLogs };
        }
      }
      return s;
    });
    persistStudents(updated);
  };

  // Calculate Violation Points for a student
  const getDisciplinePoints = (s: Student) => {
    return (s.disciplineLogs || []).reduce((sum, log) => sum + log.points, 0);
  };

  // Filtered list of students
  const filteredStudents = students.filter(s => 
    s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.nis.includes(searchTerm)
  );

  // All logs compiled for history tab
  const allSecurityLogs: SecurityLog[] = [];
  const allDisciplineLogs: DisciplineLog[] = [];
  const allHealthLogs: HealthLog[] = [];

  students.forEach(s => {
    if (s.securityLogs) allSecurityLogs.push(...s.securityLogs);
    if (s.disciplineLogs) allDisciplineLogs.push(...s.disciplineLogs);
    if (s.healthLogs) allHealthLogs.push(...s.healthLogs);
  });

  // Sort logs by date descending
  allSecurityLogs.sort((a,b) => b.id.localeCompare(a.id));
  allDisciplineLogs.sort((a,b) => b.id.localeCompare(a.id));
  allHealthLogs.sort((a,b) => b.id.localeCompare(a.id));

  // Find all students who have 'Terlambat' security status logs OR whose active permits are overdue (return date is past now)
  const violatorsFromDiscipline = React.useMemo(() => {
    const list: Array<{ student: Student; log: SecurityLog; isPastExpected: boolean }> = [];
    students.forEach(s => {
      (s.securityLogs || []).forEach(log => {
        const isLateStatus = log.status === 'Terlambat';
        let isPastExpected = false;
        if (log.status === 'Aktif / Keluar' && log.expectedReturnDate) {
          try {
            const returnDate = new Date(log.expectedReturnDate.replace(' ', 'T'));
            isPastExpected = returnDate < new Date();
          } catch (e) {
            // ignore
          }
        }
        if (isLateStatus || isPastExpected) {
          list.push({ student: s, log, isPastExpected });
        }
      });
    });
    return list;
  }, [students]);

  // Role Theme definitions
  const roleThemes = {
    keamanan: {
      accent: 'emerald',
      bgTheme: 'bg-emerald-50 text-emerald-800',
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      iconBg: 'bg-emerald-100 text-emerald-700',
      textAccent: 'text-emerald-700',
      borderAccent: 'border-emerald-200',
      title: 'Bidang Keamanan (Pencatatan Pelanggaran & Takzir)',
      colorClass: 'emerald'
    },
    ketertiban: {
      accent: 'indigo',
      bgTheme: 'bg-indigo-50 text-indigo-800',
      badge: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      iconBg: 'bg-indigo-100 text-indigo-700',
      textAccent: 'text-indigo-700',
      borderAccent: 'border-indigo-200',
      title: 'Biro Ketertiban (Perizinan & Izin Keluar)',
      colorClass: 'indigo'
    },
    kesehatan: {
      accent: 'rose',
      bgTheme: 'bg-rose-50 text-rose-800',
      badge: 'bg-rose-100 text-rose-800 border-rose-200',
      iconBg: 'bg-rose-100 text-rose-700',
      textAccent: 'text-rose-700',
      borderAccent: 'border-rose-200',
      title: 'Staf Pos Kesehatan Pesantren (Poskestren)',
      colorClass: 'rose'
    }
  };

  const theme = roleThemes[role];

  return (
    <div className="min-h-screen bg-slate-50/70 font-sans p-4 sm:p-6 lg:p-8">
      
      {/* Sapaan Salam Friendly */}
      <div className="mb-6 font-sans text-left bg-gradient-to-r from-emerald-800 to-emerald-950 p-5 rounded-2xl border border-emerald-950 flex items-center gap-4 shadow-md text-white animate-fade-in">
        <span className="text-3xl filter drop-shadow">💚</span>
        <div>
          <h2 className="text-sm font-black tracking-wide uppercase">
            Assalamu'alaikum Wr. Wb. Selamat berkhidmah, <span className="text-amber-300 underline decoration-amber-400 decoration-2 font-black">{deptName || 'Ustadz Pengurus'}</span>!
          </h2>
          <p className="text-emerald-100 text-xs mt-1 leading-relaxed font-medium">
            Selamat mengabdi selaku <strong className="text-amber-200 uppercase font-extrabold">{role === 'keamanan' ? 'Kepala Bidang Keamanan & Ketertiban (Kamtib)' : role === 'ketertiban' ? 'Kepala Bidang Ketertiban Santri & Perizinan' : 'Kepala Bidang Layanan Medis Poskestren'}</strong>. Semoga segala pengabdian tulus Anda dalam membina ketertiban, keamanan, dan kesehatan para santri senantiasa diridhoi Allah SWT serta membawa berkah.
          </p>
        </div>
      </div>



      {/* Sub Tab: Profile Settings */}
      {activeSubTab === 'profile' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 max-w-xl animate-fade-in">
          <div className="flex items-center gap-2.5 border-b border-dashed border-slate-100 pb-3 mb-4">
            <Signature className="h-5 w-5 text-emerald-700" />
            <h2 className="font-extrabold text-sm text-slate-900 uppercase tracking-widest">Pengaturan Profil & Draf Surat</h2>
          </div>
          <p className="text-xs text-slate-500 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-200/50 leading-relaxed">
            * Silakan tentukan nama lengkap pengurus serta redaksi kata baku dalam surat resmi yang diterbitkan oleh bidang Anda.
          </p>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nama Resmi Pengurus</label>
              <input
                type="text"
                required
                value={deptName}
                onChange={(e) => setDeptName(e.target.value)}
                placeholder="Contoh: Ustadz Hasanuddin, S.Pd"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
            </div>

            {/* Custom Wording / Templates */}
            <div className="border-t border-dashed border-slate-200 pt-4 space-y-4">
              <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                📝 Edit Redaksi / Isi Kata dalam Surat
              </h3>
              <p className="text-[10px] text-slate-500">
                Sesuaikan kata-kata baku yang dicantumkan pada surat resmi yang diterbitkan oleh bidang Anda.
              </p>
              
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  {role === 'ketertiban' ? 'Redaksi Surat Izin (Keluar Pondok)' :
                   role === 'keamanan' ? 'Pernyataan Pembuka Surat Sanksi / Takzir' :
                   'Pernyataan Pembuka Surat Keterangan Sakit'}
                </label>
                <textarea
                  required
                  rows={2}
                  value={letterTemplate1}
                  onChange={(e) => setLetterTemplate1(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700 font-sans"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  {role === 'ketertiban' ? 'Catatan / Ketentuan Tambahan (Bawah Surat Izin)' :
                   role === 'keamanan' ? 'Ketentuan Penting Sanksi & Takzir (Bawah)' :
                   'Rekomendasi Medis / Istirahat Sakit (Bawah)'}
                </label>
                <textarea
                  required
                  rows={3}
                  value={letterTemplate2}
                  onChange={(e) => setLetterTemplate2(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700 font-sans"
                />
              </div>
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-850 to-teal-900 hover:from-emerald-800 hover:to-teal-800 text-white rounded-lg text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer w-full text-center uppercase"
            >
              Simpan Identitas & Template Surat
            </button>
          </form>
        </div>
      )}

      {/* Sub Tab: SKCK Penerbitan or Takzir Letter */}
      {((activeSubTab === 'skck' || activeSubTab === 'takzir_letter')) && role === 'keamanan' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 max-w-3xl space-y-6 animate-fade-in">
          <div className="flex items-center gap-2 border-b border-dashed border-slate-150 pb-3">
            <Shield className="h-5 w-5 text-emerald-800" />
            <h2 className="font-extrabold text-sm text-slate-900 uppercase tracking-widest">
              {activeSubTab === 'skck' 
                ? "Layanan Administrasi SKCK (Surat Keterangan Catatan Kelakuan Baik)" 
                : "Layanan Rekam Jejak Takzir & Kedisiplinan"}
            </h2>
          </div>
          <p className="text-xs text-slate-500 leading-normal">
            {activeSubTab === 'skck' 
              ? "* Silakan ketik atau masukkan NIS santri untuk mencari data dari database Keamanan. Setelah santri terverifikasi, Anda dapat mengetik sendiri alasan/keperluan penerbitan SKCK ini secara luring."
              : "* Silakan ketik atau masukkan NIS santri untuk memverifikasi dan mencetak Surat Rekam Jejak Takzir Santri."}
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Cari / Input NIS Santri</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Contoh: 2021.01.0001 (atau ketik nama santri)"
                  value={skckNis}
                  onChange={(e) => setSkckNis(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-700 focus:outline-none font-mono text-slate-900"
                />
              </div>
              <div className="mt-1 flex flex-wrap gap-1 items-center">
                <span className="text-[10px] text-slate-400 font-bold">Rekomendasi Santri:</span>
                {students.slice(0, 4).map(s => (
                  <button 
                    key={s.id} 
                    type="button" 
                    onClick={() => setSkckNis(s.nis)}
                    className="text-[10px] bg-slate-50 hover:bg-slate-100 rounded px-1.5 py-0.5 border border-slate-200 text-slate-700 font-mono"
                  >
                    {s.fullName} ({s.nis})
                  </button>
                ))}
              </div>
            </div>

            {(() => {
              const matchedStudent = students.find(s => s.nis === skckNis.trim() || s.fullName.toLowerCase().includes(skckNis.trim().toLowerCase()));
              if (!matchedStudent) {
                if (skckNis) {
                  return (
                    <div className="text-xs text-red-600 bg-red-50 p-3 rounded font-medium">
                      ❌ Santri dengan NIS atau nama "{skckNis}" tidak ditemukan di basis data Pesantren.
                    </div>
                  );
                }
                return null;
              }

              // Filter active (unresolved) logs
              const activeLogs = (matchedStudent.disciplineLogs || []).filter(log => log.status !== 'Selesai');
              const hasActiveViolations = activeLogs.length > 0;
              const pts = (matchedStudent.disciplineLogs || []).reduce((acc, log) => acc + log.points, 0);

              return (
                <div className="space-y-4 border-t border-slate-100 pt-4 font-sans">
                  <div className="bg-emerald-50/40 p-4 rounded-xl border border-emerald-100/70 space-y-2">
                    <h4 className="font-bold text-xs text-slate-900 border-b border-emerald-100 pb-1.5 uppercase tracking-wide">Data Profil Terverifikasi</h4>
                    <div className="grid grid-cols-3 gap-y-1.5 text-xs text-slate-805">
                      <span className="font-medium text-slate-500">Nama Lengkap</span>
                      <span className="col-span-2 font-bold text-slate-900">: {matchedStudent.fullName}</span>
                      
                      <span className="font-medium text-slate-500">NIS (4 Digit)</span>
                      <span className="col-span-2 font-mono font-extrabold text-emerald-950">: {matchedStudent.nis}</span>
                      
                      <span className="font-medium text-slate-500">Kelas Pagi Sore</span>
                      <span className="col-span-2 font-bold px-1.5 py-0.5 bg-emerald-100 border border-emerald-250 text-emerald-950 rounded uppercase text-[10px] w-fit">: {matchedStudent.class}</span>

                      <span className="font-medium text-slate-500">Orang Tua / Wali</span>
                      <span className="col-span-2">: {matchedStudent.parentName}</span>

                      <span className="font-medium text-slate-555">Pembawa/Wali No. HP</span>
                      <span className="col-span-2 font-mono">{matchedStudent.parentPhone}</span>

                      <span className="font-medium text-slate-500">Status Kedisiplinan</span>
                      <span className="col-span-2">
                        <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                          hasActiveViolations ? 'bg-amber-100 text-amber-900 border border-amber-200' : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                        }`}>
                          {hasActiveViolations 
                            ? `${activeLogs.length} Pelanggaran Aktif (Perlu Bimbingan)` 
                            : 'Sangat Baik (Bebas Pelanggaran Aktif)'}
                        </span>
                      </span>
                    </div>
                  </div>

                  {activeSubTab === 'skck' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Ketik Alasan / Keperluan (Bisa Diedit Sesuka Anda)</label>
                      <textarea
                        required
                        value={skckReason}
                        onChange={(e) => setSkckReason(e.target.value)}
                        placeholder="Contoh: Digunakan sebagai syarat sah pemindahan domisili pondok dan melanjutkan studi di Perguruan Tinggi Agama Islam."
                        rows={3}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700 text-slate-850"
                      />
                    </div>
                  )}

                  {/* Editor helpful tip inside SKCK page */}
                  {(!hasActiveViolations || activeSubTab === 'takzir_letter') && (
                    <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg p-2.5 text-[11px] font-sans flex items-center gap-2">
                      <span className="text-sm">💡</span>
                      <span><strong>Kolom Editor Surat Interaktif:</strong> Paragraf surat di bawah ini dapat diklik dan diedit kata-katanya secara langsung di layar sebelum dicetak / diunduh.</span>
                    </div>
                  )}

                  {activeSubTab === 'skck' && hasActiveViolations ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-xs text-amber-950 font-sans space-y-3">
                      <p className="font-extrabold text-sm flex items-center gap-1.5 text-amber-950">⚠️ PENERBITAN SKCK TERKUNCI (SANKSI BELUM SELESAI)</p>
                      <p>Santri <strong>{matchedStudent.fullName}</strong> saat ini tercatat memiliki {activeLogs.length} catatan pelanggaran yang <strong>belum diselesaikan (status: Belum Diurus atau Sedang Mengurus)</strong>.</p>
                      <p className="text-[11.5px] text-amber-900 leading-relaxed">Sesuai peraturan pesantren, Surat Keterangan Catatan Keamanan / Kelakuan Baik (SKCK) hanya dapat dicetak apabila seluruh bimbingan sanksi ta'zir santri telah dinyatakan <strong>Selesai</strong> oleh Bagian Keamanan.</p>
                      <p>Silakan selesaikan pengurusan sanksi terlebih dahulu atau cetak <strong>Surat Rekam Jejak Takzir</strong> untuk santri ini melalui menu Rekam Jejak Takzir.</p>
                    </div>
                  ) : (
                    <>
                      {/* Document Print Area */}
                      <div className="border border-slate-300 rounded-xl p-6 bg-white font-serif shadow-xs text-slate-900 relative" id="skck-print-area">
                    <div className="text-center border-b-2 border-slate-950 pb-3 mb-4 animate-fade-in">
                      <h2 className="font-extrabold text-base uppercase leading-tight font-sans text-slate-950">{pesantrenSettings.namaYayasan || "YAYASAN AL-ASY'ARIYAH"}</h2>
                      <h3 className="font-black text-sm uppercase leading-tight font-sans text-slate-900">{pesantrenSettings.schoolName || "Pondok Pesantren Al-Asy'ariyah"}</h3>
                      <p className="text-[10px] italic font-sans text-slate-600 font-bold tracking-wider uppercase">Lembaga Keamanan, Ketertiban, dan Kedisplinan Santri (LKSD)</p>
                      <p className="text-[8px] font-sans text-slate-600 mt-0.5 font-medium">
                        {pesantrenSettings.address || "Jl. Raya Modung, Langpanggang, Modung, Bangkalan, Jawa Timur"}
                      </p>
                      <p className="text-[8px] font-sans text-slate-600 font-medium">
                        Telp: {pesantrenSettings.phone || "(0291) 438291"} | Email: {pesantrenSettings.email || "info@alasyariyah.sch.id"}
                      </p>
                    </div>

                    {(activeSubTab === 'takzir_letter') ? (
                      /* ADAPTIVE TYPE A: SURAT REKAP PELANGGARAN & PANDUAN PEMUTIHAN SANKSI (If they have violations) */
                      <>
                        <div className="text-center mb-5 font-serif animate-fade-in">
                          <h4 className="font-black text-xs sm:text-sm tracking-wide underline uppercase text-slate-950 block">SURAT KETERANGAN REKAM JEJAK KEDISIPLINAN & BIMBINGAN SANKSI TA'ZIR</h4>
                          <p className="text-[10px] font-mono mt-0.5 text-slate-500">Nomor: {getLetterNumber(matchedStudent.id + '_KTT', 'Surat Rekap Sanksi Ta\'zir', 'KTT')}</p>
                        </div>

                        <div className="space-y-4 text-xs leading-relaxed font-serif text-justify animate-fade-in">
                          <p 
                            contentEditable={true} 
                            suppressContentEditableWarning={true}
                            className="indent-8 text-slate-950 font-serif focus:bg-amber-50/20 focus:outline-none focus:ring-1 focus:ring-slate-350 p-1 rounded cursor-text"
                          >
                            Berdasarkan pencatatan resmi harian dan hasil penilaian berkala kesiswaan oleh Bagian Keamanan Pondok Pesantren Al-Asy'ariyah, dengan ini menerangkan dengan sebenarnya bahwa santri yang bersangkutan di bawah ini:
                          </p>

                          <table className="w-full max-w-lg mx-auto font-sans text-xs border-collapse my-2">
                            <tbody>
                              <tr className="border-b border-slate-200">
                                <td className="py-2 px-2 font-bold text-slate-500 text-left">NIS (4 DIGIT)</td>
                                <td className="py-2 px-2 font-mono font-black text-emerald-900 text-left">: {matchedStudent.nis}</td>
                              </tr>
                              <tr className="border-b border-slate-200">
                                <td className="py-2 px-2 font-bold text-slate-500 w-1/3 text-left">NAMA LENGKAP</td>
                                <td className="py-2 px-2 font-black text-slate-950 text-left">: {matchedStudent.fullName}</td>
                              </tr>
                              <tr className="border-b border-slate-200">
                                <td className="py-2 px-2 font-bold text-slate-500 text-left">KELAS / ASRAMA</td>
                                <td className="py-2 px-2 font-semibold text-slate-800 text-left">: {matchedStudent.class} {matchedStudent.kamar ? `/ ${matchedStudent.kamar}` : ''}</td>
                              </tr>
                              <tr className="border-b border-slate-200">
                                <td className="py-2 px-2 font-bold text-slate-500 text-left">WALI / ORANG TUA</td>
                                <td className="py-2 px-2 text-left">: {matchedStudent.parentName}</td>
                              </tr>
                            </tbody>
                          </table>

                          <p className="text-slate-950 font-serif">
                            Dinyatakan memiliki <strong>{(matchedStudent.disciplineLogs || []).filter(log => log.status !== 'Selesai').length} catatan pelanggaran aktif (belum selesai)</strong> dengan total bobot kedisiplinan sebesar <strong className="text-red-700 font-bold">{(matchedStudent.disciplineLogs || []).filter(log => log.status !== 'Selesai').reduce((acc, log) => acc + log.points, 0)} Point Ta'zir</strong>. Berikut rincian pelanggaran yang belum diputihkan:
                          </p>

                          <div className="border border-slate-300 rounded-lg overflow-hidden font-sans my-2">
                            <table className="w-full text-left text-[10px] border-collapse bg-slate-50/50">
                              <thead>
                                <tr className="bg-slate-100 text-slate-600 font-extrabold uppercase border-b border-slate-200">
                                  <th className="py-1.5 px-2">Tanggal</th>
                                  <th className="py-1.5 px-2">Bentuk Pelanggaran</th>
                                  <th className="py-1.5 px-2">Poin</th>
                                  <th className="py-1.5 px-2">Kewajiban Sanksi (Bimbingan)</th>
                                  <th className="py-1.5 px-2">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(matchedStudent.disciplineLogs || []).filter(log => log.status !== 'Selesai').map(log => (
                                  <tr key={log.id} className="border-b border-slate-200 bg-white">
                                    <td className="py-1.5 px-2 font-mono">{log.date}</td>
                                    <td className="py-1.5 px-2 font-bold text-slate-900">{log.violationType}</td>
                                    <td className="py-1.5 px-2 font-black text-red-700 font-mono">{log.points} Pts</td>
                                    <td className="py-1.5 px-2 italic text-slate-600">{log.consequence}</td>
                                    <td className="py-1.5 px-2">
                                      <select
                                        value={log.status || 'Belum Diurus'}
                                        onChange={(e) => {
                                          const newStatus = e.target.value as 'Belum Diurus' | 'Sedang Mengurus' | 'Selesai';
                                          handleEditLog(log.id, 'discipline', { status: newStatus });
                                        }}
                                        className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold focus:outline-none focus:ring-1 focus:ring-indigo-500 border cursor-pointer ${
                                          log.status === 'Selesai' ? 'bg-emerald-50 text-emerald-850 border-emerald-200' :
                                          log.status === 'Sedang Mengurus' ? 'bg-amber-50 text-amber-850 border-amber-200' :
                                          'bg-red-50 text-red-850 border-red-200'
                                        }`}
                                      >
                                        <option value="Belum Diurus">Belum Diurus</option>
                                        <option value="Sedang Mengurus">Sedang Mengurus</option>
                                        <option value="Selesai">Selesai</option>
                                      </select>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          <p 
                            contentEditable={true} 
                            suppressContentEditableWarning={true}
                            className="indent-8 text-slate-950 font-serif focus:bg-amber-50/20 focus:outline-none focus:ring-1 focus:ring-slate-350 p-1 rounded cursor-text"
                          >
                            Demikian surat keterangan ini diterbitkan secara resmi khusus sebagai lembar instruksi bimbingan agar wali santri dan santri yang bersangkutan dapat bersinergi menyelesaikan kewajiban di atas demi terciptanya akhlakul karimah di lingkungan pesantren.
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-center mb-5 font-serif animate-fade-in">
                          <h4 className="font-black text-xs sm:text-sm tracking-wide underline uppercase text-slate-950 block">SURAT KETERANGAN CATATAN KEAMANAN / KELAKUAN BAIK (SKCK)</h4>
                          <p className="text-[10px] font-mono mt-0.5 text-slate-500">Nomor: {getLetterNumber(matchedStudent.id + '_SKCK', 'Surat Keterangan Kelakuan Baik (SKCK)', 'SKCK')}</p>
                        </div>

                        <div className="space-y-3 text-xs leading-relaxed font-serif text-justify">
                          <p 
                            contentEditable={true} 
                            suppressContentEditableWarning={true}
                            className="indent-8 text-slate-950 font-serif focus:bg-amber-50/20 focus:outline-none focus:ring-1 focus:ring-slate-350 p-1 rounded cursor-text"
                            title="Klik untuk mengedit baris paragraf ini secara langsung"
                          >
                            Berdasarkan catatan register harian dan hasil penilaian ketat hukum kepondokan oleh Bagian Keamanan Pondok Pesantren Al-Asy'ariyah, menerangkan dengan sebenarnya bahwa santri yang tersebut di bawah ini:
                          </p>

                          <table className="w-full max-w-lg mx-auto font-sans text-xs border-collapse">
                            <tbody>
                              <tr className="border-b border-slate-200">
                                <td className="py-2 px-2 font-bold text-slate-500 text-left">NIS (4 DIGIT)</td>
                                <td className="py-2 px-2 font-mono font-black text-emerald-900 text-left">: {matchedStudent.nis}</td>
                              </tr>
                              <tr className="border-b border-slate-200">
                                <td className="py-2 px-2 font-bold text-slate-500 w-1/3 text-left">NAMA LENGKAP</td>
                                <td className="py-2 px-2 font-black text-slate-950 text-left">: {matchedStudent.fullName}</td>
                              </tr>
                              <tr className="border-b border-slate-200">
                                <td className="py-2 px-2 font-bold text-slate-500 text-left">KELAS PAGI SORE</td>
                                <td className="py-2 px-2 font-semibold text-slate-800 text-left">: {matchedStudent.class}</td>
                              </tr>
                              <tr className="border-b border-slate-200">
                                <td className="py-2 px-2 font-bold text-slate-500 text-left">ORANG TUA / WALI</td>
                                <td className="py-2 px-2 text-left">: {matchedStudent.parentName}</td>
                              </tr>
                              <tr>
                                <td className="py-2 px-2 font-bold text-slate-500 text-left">ALAMAT RUMAH</td>
                                <td className="py-2 px-2 text-left">: {matchedStudent.address}</td>
                              </tr>
                            </tbody>
                          </table>

                          <p 
                            contentEditable={true} 
                            suppressContentEditableWarning={true}
                            className="indent-8 text-slate-950 font-serif focus:bg-amber-50/20 focus:outline-none focus:ring-1 focus:ring-slate-350 p-1 rounded cursor-text"
                            title="Klik untuk mengedit baris paragraf ini secara langsung"
                          >
                            {getStaffConfig('keamanan').letterTemplate2}
                          </p>

                          <p 
                            contentEditable={true} 
                            suppressContentEditableWarning={true}
                            className="indent-8 text-slate-950 font-serif focus:bg-amber-50/20 focus:outline-none focus:ring-1 focus:ring-slate-350 p-1 rounded cursor-text"
                            title="Klik untuk mengedit baris paragraf ini secara langsung"
                          >
                            Surat keterangan ini diterbitkan secara resmi khusus atas keperluan: <strong className="font-bold italic">"{skckReason}"</strong>.
                          </p>

                          <p 
                            contentEditable={true} 
                            suppressContentEditableWarning={true}
                            className="indent-8 text-slate-950 font-serif focus:bg-amber-50/20 focus:outline-none focus:ring-1 focus:ring-slate-350 p-1 rounded cursor-text"
                            title="Klik untuk mengedit baris paragraf ini secara langsung"
                          >
                            {getStaffConfig('keamanan').letterTemplate3}
                          </p>
                        </div>

                        {/* Signature Block */}
                        <div className="grid grid-cols-2 gap-4 border-t border-dashed border-slate-300 mt-6 pt-4 font-sans text-center">
                          <div className="flex flex-col items-center justify-center text-center">
                            {isImageUrl(getStaffConfig('keamanan').seal) ? (
                              <img 
                                src={getStaffConfig('keamanan').seal} 
                                alt="Stempel Keamanan" 
                                className="h-14 object-contain rotate-[-6deg] select-none mix-blend-multiply" 
                                referrerPolicy="no-referrer" 
                              />
                            ) : (
                              <div className="border border-emerald-600 border-dashed rounded p-1 text-[8px] uppercase font-mono font-black text-emerald-800 rotate-[-6deg] max-w-[124px] leading-tight mb-2">
                                {getStaffConfig('keamanan').seal || '🛡️ STEMPEL KEAMANAN'}
                              </div>
                            )}
                          </div>
                          <div className="space-y-0.5 text-right pr-6">
                            <p className="text-[10px] text-slate-400">{getCityFromAddress(pesantrenSettings.address)}, {new Date().toISOString().split('T')[0]}</p>
                            <p className="text-[10px] text-emerald-950 font-black uppercase tracking-wide text-right">Mengetahui, Kabid Keamanan</p>
                            <div className="h-8 flex items-center justify-end text-xs font-mono text-emerald-850 italic font-bold">
                              {isImageUrl(getStaffConfig('keamanan').signature) ? (
                                <img 
                                  src={getStaffConfig('keamanan').signature} 
                                  alt="Tanda Tangan" 
                                  className="h-7 object-contain select-none" 
                                  referrerPolicy="no-referrer" 
                                />
                              ) : (
                                <span>{getStaffConfig('keamanan').signature || '✍️ M. Hasanuddin'}</span>
                              )}
                            </div>
                            <p className="text-[11px] font-bold text-slate-900 underline leading-none text-right">{deptName || getStaffConfig('keamanan').name || session?.fullName || 'Ustadz Pengurus Keamanan'}</p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const styleNode = document.createElement('style');
                        styleNode.innerHTML = `@media print { body { visibility: hidden; } #skck-print-area { visibility: visible; position: absolute; left: 0; top: 0; width: 100%; } }`;
                        document.head.appendChild(styleNode);
                        
                        const letterType = pts > 0 ? 'Surat Rekap Sanksi Ta\'zir' : 'Surat Keterangan Kelakuan Baik (SKCK)';
                        const letterCode = pts > 0 ? 'KTT' : 'SKCK';
                        const letterNo = getLetterNumber(matchedStudent.id + '_' + letterCode, letterType, letterCode);
                        if (!outboundLettersLog.some(l => l.id === matchedStudent.id + '_' + letterCode)) {
                          setOutboundLettersLog(prev => [
                            ...prev,
                            {
                              id: matchedStudent.id + '_' + letterCode,
                              type: letterType,
                              recipient: matchedStudent.fullName,
                              subject: pts > 0 ? `Bimbingan Sanksi Ta'zir (${pts} pts)` : `SKCK: ${skckReason}`,
                              letterNo,
                              date: new Date().toISOString().split('T')[0]
                            }
                          ]);
                        }
                        
                        window.print();
                        document.head.removeChild(styleNode);
                      }}
                      className="px-4 py-2 bg-indigo-700 hover:bg-indigo-850 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow cursor-pointer"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      {pts > 0 ? 'Cetak Surat Takzir ⎙' : 'Cetak SKCK langsung ⎙'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const styleNode = document.createElement('style');
                        styleNode.innerHTML = `@media print { body { visibility: hidden; } #skck-print-area { visibility: visible; position: absolute; left: 0; top: 0; width: 100%; } }`;
                        document.head.appendChild(styleNode);
                        const cleanHTML = document.getElementById('skck-print-area')?.innerHTML || '';
                        
                        const htmlContent = `
                        <!DOCTYPE html>
                        <html lang="id">
                        <head>
                          <meta charset="UTF-8">
                          <title>${pts > 0 ? 'SURAT_TAXZIR_SANTRI' : 'SKCK_SANTRI'}_${matchedStudent.fullName.toUpperCase()}</title>
                          <script src="https://cdn.tailwindcss.com"></script>
                        </head>
                        <body onload="window.print()" class="p-10 font-serif">
                          <div class="border border-slate-350 p-6 rounded-lg bg-white max-w-2xl mx-auto">
                            ${cleanHTML}
                          </div>
                        </body>
                        </html>
                        `;
                        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.setAttribute('download', `${pts > 0 ? 'SURAT_TAXZIR' : 'SKCK'}_SANTRI_${matchedStudent.fullName.toUpperCase()}_OFFLINE.html`);
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);
                        document.head.removeChild(styleNode);
                      }}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-300 rounded-lg cursor-pointer"
                    >
                      Unduh Berkas Offline 📥
                    </button>
                  </div>
                    </>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Sub Tab: Log History */}
      {activeSubTab === 'history' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 animate-fade-in">
          <div className="flex items-center justify-between border-b border-dashed border-slate-100 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-800" />
              <h2 className="font-extrabold text-sm text-slate-900 uppercase tracking-widest">
                Riwayat Log Tindakan Pondok Pesantren
              </h2>
            </div>
            <span className="text-[10px] font-mono text-slate-400">Diurutkan berdasarkan yang terbaru dihimpun</span>
          </div>

          {/* Role-based history indicator for account role */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {role === 'kesehatan' ? (
              <div className="px-4 py-2 rounded-xl text-xs font-extrabold bg-rose-800 text-white shadow-md flex items-center gap-2 uppercase tracking-wider">
                🩺 Riwayat Pelayanan Medis ({allHealthLogs.length} Data)
              </div>
            ) : (role === 'keamanan' || role === 'ketertiban') ? (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStaffSubTab('perizinan')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                    staffSubTab === 'perizinan' ? 'bg-emerald-800 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  🛡️ Riwayat Perizinan Santri ({allSecurityLogs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStaffSubTab('takzir')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                    staffSubTab === 'takzir' ? 'bg-indigo-800 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  ⚖️ Riwayat Takzir & Sanksi Pelanggaran ({allDisciplineLogs.length})
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStaffSubTab('perizinan')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                    staffSubTab === 'perizinan' ? 'bg-emerald-800 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  🛡️ Riwayat Perizinan Santri ({allSecurityLogs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStaffSubTab('takzir')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                    staffSubTab === 'takzir' ? 'bg-indigo-800 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  ⚖️ Riwayat Takzir & Sanksi Pelanggaran ({allDisciplineLogs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStaffSubTab('kesehatan')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                    staffSubTab === 'kesehatan' ? 'bg-rose-800 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  🩺 Riwayat Pelayanan Medis ({allHealthLogs.length})
                </button>
              </div>
            )}
          </div>

          {staffSubTab === 'perizinan' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider bg-slate-50/50">
                    <th className="py-2.5 px-3">Nama Santri</th>
                    <th className="py-2.5 px-3">Jenis Izin</th>
                    <th className="py-2.5 px-3">Keterangan Keperluan</th>
                    <th className="py-2.5 px-3">Tanggal Keluar</th>
                    <th className="py-2.5 px-3">Rencana Kembali</th>
                    <th className="py-2.5 px-3">Kembali Aktual</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {allSecurityLogs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">Belum ada riwayat perizinan santri.</td>
                    </tr>
                  ) : (
                    allSecurityLogs.map(log => (
                      <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                        <td className="py-3 px-3 font-semibold text-slate-900">{log.studentName}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.permitType === 'Pulang (Keluarga)' ? 'bg-indigo-100 text-indigo-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {log.permitType}
                          </span>
                        </td>
                        <td className="py-3 px-3 max-w-xs truncate" title={log.description}>{log.description}</td>
                        <td className="py-3 px-3 font-mono">{log.outDate}</td>
                        <td className="py-3 px-3 font-mono text-indigo-750">{log.expectedReturnDate}</td>
                        <td className="py-3 px-3 font-mono text-emerald-800">{log.actualReturnDate || '-'}</td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.status === 'Kembali' ? 'bg-emerald-100 text-emerald-800' :
                            log.status === 'Terlambat' ? 'bg-rose-100 text-rose-800' : 'bg-yellow-100 text-yellow-800 animate-pulse'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right relative whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            {log.status === 'Menunggu Persetujuan' && (
                              <div className="flex gap-1 mr-1">
                                <button
                                  type="button"
                                  onClick={() => handleApprovePermit(log.studentId, log.id)}
                                  className="px-2 py-0.5 bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-bold rounded cursor-pointer transition shadow-3xs"
                                >
                                  ✓ Setujui
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRejectPermit(log.studentId, log.id)}
                                  className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold rounded cursor-pointer transition shadow-3xs"
                                >
                                  ✕ Tolak
                                </button>
                              </div>
                            )}

                            {log.status === 'Aktif / Keluar' && (
                              <div className="flex gap-1 mr-1">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateReturnStatus(log.studentId, log.id, false)}
                                  className="px-2 py-0.5 bg-emerald-700 hover:bg-emerald-800 bg-opacity-90 text-white text-[10px] font-bold rounded cursor-pointer transition shadow-3xs"
                                >
                                  Kembali
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateReturnStatus(log.studentId, log.id, true)}
                                  className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold rounded cursor-pointer transition shadow-3xs"
                                >
                                  Terlambat
                                </button>
                              </div>
                            )}

                            <div className="relative inline-block">
                              <button
                                type="button"
                                onClick={() => setActiveDropdownId(activeDropdownId === log.id ? null : log.id)}
                                className="p-1 hover:bg-slate-100 rounded-full transition text-slate-500 hover:text-emerald-950 cursor-pointer"
                                title="Aksi"
                              >
                                <MoreVertical className="h-4 w-4 inline" />
                              </button>

                              {activeDropdownId === log.id && (
                                <div className="absolute right-0 mt-1 w-36 bg-white border border-slate-200 rounded-xl shadow-lg z-30 overflow-hidden text-left py-1">
                                  <button
                                    onClick={() => {
                                      setPrintSecurityLog(log);
                                      setViewOnlyMode(true);
                                      setActiveDropdownId(null);
                                    }}
                                    className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-1.5 text-[11px] font-medium text-slate-700 cursor-pointer"
                                  >
                                    <Eye className="h-3.5 w-3.5 text-slate-500" /> Lihat Surat
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingLog({ id: log.id, type: 'security', values: { ...log } });
                                      setActiveDropdownId(null);
                                    }}
                                    className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800 cursor-pointer"
                                  >
                                    <Edit2 className="h-3.5 w-3.5 text-emerald-700" /> Edit Isian
                                  </button>
                                  <button
                                    onClick={() => {
                                      handleDeleteLog(log.id, 'security');
                                      setActiveDropdownId(null);
                                    }}
                                    className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-1.5 text-[11px] font-bold text-red-600 cursor-pointer"
                                  >
                                    <Trash2 className="h-3.5 w-3.5 text-red-500" /> Hapus Data
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {staffSubTab === 'takzir' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider bg-slate-50/50">
                    <th className="py-2.5 px-3">Nama Santri</th>
                    <th className="py-2.5 px-3">Jenis Pelanggaran</th>
                    <th className="py-2.5 px-3">Kategori</th>
                    <th className="py-2.5 px-3">Sanksi / Tindakan</th>
                    <th className="py-2.5 px-3">Tanggal Catat</th>
                    <th className="py-2.5 px-3">Tanda Tangan</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {allDisciplineLogs.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">Belum ada riwayat pencatatan takzir.</td>
                    </tr>
                  ) : (
                    allDisciplineLogs.map(log => (
                      <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                        <td className="py-3 px-3 font-semibold text-slate-900">{log.studentName}</td>
                        <td className="py-3 px-3 uppercase font-mono text-[11px] font-bold text-red-900">{log.violationType}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.level === 'Ringan' ? 'bg-yellow-100 text-amber-800 bg-amber-150' :
                            log.level === 'Sedang' ? 'bg-orange-100 text-orange-850' : 'bg-red-100 text-red-800 font-extrabold'
                          }`}>
                            {log.level}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-600 font-bold italic">{log.consequence}</td>
                        <td className="py-3 px-3 font-mono">{log.date}</td>
                        <td className="py-3 px-3 font-mono text-slate-400">{log.signedBy}</td>
                        <td className="py-3 px-3">
                          <select
                            value={log.status || 'Belum Diurus'}
                            onChange={(e) => {
                              const newStatus = e.target.value as 'Belum Diurus' | 'Sedang Mengurus' | 'Selesai';
                              handleEditLog(log.id, 'discipline', { status: newStatus });
                            }}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold focus:outline-none focus:ring-1 focus:ring-indigo-500 border cursor-pointer ${
                              log.status === 'Selesai' ? 'bg-emerald-50 text-emerald-850 border-emerald-200' :
                              log.status === 'Sedang Mengurus' ? 'bg-amber-50 text-amber-850 border-amber-200' :
                              'bg-red-50 text-red-850 border-red-200'
                            }`}
                          >
                            <option value="Belum Diurus">Belum Diurus</option>
                            <option value="Sedang Mengurus">Sedang Mengurus</option>
                            <option value="Selesai">Selesai</option>
                          </select>
                        </td>
                        <td className="py-3 px-3 text-right relative">
                          <div className="relative inline-block">
                            <button
                              type="button"
                              onClick={() => setActiveDropdownId(activeDropdownId === log.id ? null : log.id)}
                              className="p-1 hover:bg-slate-100 rounded-full transition text-slate-500 hover:text-indigo-950 cursor-pointer"
                              title="Aksi"
                            >
                              <MoreVertical className="h-4 w-4 inline" />
                            </button>

                            {activeDropdownId === log.id && (
                              <div className="absolute right-0 mt-1 w-36 bg-white border border-slate-205 rounded-xl shadow-lg z-30 overflow-hidden text-left py-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPrintDisciplineLog(log);
                                    setViewOnlyMode(true);
                                    setActiveDropdownId(null);
                                  }}
                                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-1.5 text-[11px] font-medium text-slate-700 cursor-pointer"
                                >
                                  <Eye className="h-3.5 w-3.5 text-slate-500" /> Lihat Surat
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingLog({ id: log.id, type: 'discipline', values: { ...log } });
                                    setActiveDropdownId(null);
                                  }}
                                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-1.5 text-[11px] font-semibold text-indigo-800 cursor-pointer"
                                >
                                  <Edit2 className="h-3.5 w-3.5 text-indigo-750" /> Edit Isian
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleDeleteLog(log.id, 'discipline');
                                    setActiveDropdownId(null);
                                  }}
                                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-1.5 text-[11px] font-bold text-red-650 cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-red-500" /> Hapus Data
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {staffSubTab === 'kesehatan' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider bg-slate-50/50">
                    <th className="py-2.5 px-3">Nama Santri</th>
                    <th className="py-2.5 px-3">Keluhan Sakit</th>
                    <th className="py-2.5 px-3">Diagnosis Medis</th>
                    <th className="py-2.5 px-3">Penanganan / Terapi</th>
                    <th className="py-2.5 px-3 text-center">Status Rawat</th>
                    <th className="py-2.5 px-3">Tanggal Catat</th>
                    <th className="py-2.5 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {allHealthLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">Belum ada riwayat medis Poskestren.</td>
                    </tr>
                  ) : (
                    allHealthLogs.map(log => (
                      <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                        <td className="py-3 px-3 font-semibold text-slate-900">{log.studentName}</td>
                        <td className="py-3 px-3 font-semibold text-red-950">{log.complaint}</td>
                        <td className="py-3 px-3 italic">{log.diagnosis}</td>
                        <td className="py-3 px-3 text-slate-600">{log.treatment}</td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.status === 'Nginap di Poskestren' ? 'bg-rose-100 text-rose-800' :
                            log.status === 'Dirujuk ke RS / Pulang' ? 'bg-orange-100 text-orange-850' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono">{log.date}</td>
                        <td className="py-3 px-3 text-right relative">
                          <div className="relative inline-block">
                            <button
                              type="button"
                              onClick={() => setActiveDropdownId(activeDropdownId === log.id ? null : log.id)}
                              className="p-1 hover:bg-slate-100 rounded-full transition text-slate-500 hover:text-rose-955 cursor-pointer"
                              title="Aksi"
                            >
                              <MoreVertical className="h-4 w-4 inline" />
                            </button>

                            {activeDropdownId === log.id && (
                              <div className="absolute right-0 mt-1 w-36 bg-white border border-slate-205 rounded-xl shadow-lg z-30 overflow-hidden text-left py-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPrintHealthLog(log);
                                    setViewOnlyMode(true);
                                    setActiveDropdownId(null);
                                  }}
                                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-1.5 text-[11px] font-medium text-slate-700 cursor-pointer"
                                >
                                  <Eye className="h-3.5 w-3.5 text-slate-500" /> Lihat Surat
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingLog({ id: log.id, type: 'health', values: { ...log } });
                                    setActiveDropdownId(null);
                                  }}
                                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-1.5 text-[11px] font-semibold text-rose-850 cursor-pointer"
                                >
                                  <Edit2 className="h-3.5 w-3.5 text-rose-700 font-medium" /> Edit Isian
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleDeleteLog(log.id, 'health');
                                    setActiveDropdownId(null);
                                  }}
                                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-1.5 text-[11px] font-bold text-red-650 cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-red-500" /> Hapus Data
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Sub Tab: Student Main List */}
      {activeSubTab === 'students' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 animate-fade-in">

          {/* GRAPHS AND ANALYTICS ACCORDING TO ROLE AUTHORITY */}
          <div className="mb-8 p-6 bg-gradient-to-b from-slate-50 to-white rounded-2xl border border-slate-200/80">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-dashed border-slate-200 pb-3 mb-5">
              <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-widest flex items-center gap-1.5">
                <span>📊</span> Visualisasi Tren & Statistik Real-Time ({theme.title.split('(')[0]})
              </h3>
              <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                <div className="min-w-[120px]">
                  <select
                    value={statsMonth}
                    onChange={(e) => setStatsMonth(e.target.value)}
                    className="w-full bg-white border border-slate-250 text-[11px] rounded-lg px-2.5 py-1.5 font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-700 shadow-2xs"
                  >
                    <option value="Semua">Semua Bulan</option>
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
                <div className="min-w-[100px]">
                  <select
                    value={statsYear}
                    onChange={(e) => setStatsYear(e.target.value)}
                    className="w-full bg-white border border-slate-250 text-[11px] rounded-lg px-2.5 py-1.5 font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-700 shadow-2xs"
                  >
                    <option value="Semua">Semua Tahun</option>
                    <option value="2024">2024</option>
                    <option value="2025">2025</option>
                    <option value="2026">2026</option>
                    <option value="2027">2027</option>
                  </select>
                </div>
              </div>
            </div>
            
            {role === 'keamanan' && (() => {
              const filteredLogs = students.flatMap(s => s.disciplineLogs || []).filter(l => {
                if (!l.date) return false;
                if (statsYear !== 'Semua') {
                  const year = l.date.split('-')[0];
                  if (year !== statsYear) return false;
                }
                if (statsMonth !== 'Semua') {
                  const month = l.date.split('-')[1];
                  if (month !== statsMonth) return false;
                }
                return true;
              });

              const lightViolations = filteredLogs.filter(l => l.level === 'Ringan').length;
              const mediumViolations = filteredLogs.filter(l => l.level === 'Sedang').length;
              const heavyViolations = filteredLogs.filter(l => l.level === 'Berat').length;
              const totalV = lightViolations + mediumViolations + heavyViolations;
              
              const maxVal = Math.max(lightViolations, mediumViolations, heavyViolations, 1);
              const getPercent = (v: number) => (v / maxVal) * 100;
              
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div className="space-y-3.5">
                    <p className="text-[11px] text-slate-500 font-medium">Grafik di bawah ini memetakan total akumulasi takzir (pelanggaran kedisiplinan) santri aktif berdasarkan tingkat bobot pelanggaran:</p>
                    <div className="space-y-2.5">
                      <div>
                        <div className="flex justify-between text-[11px] font-bold text-emerald-800 mb-1">
                          <span>Ringan (Sanksi Edukatif)</span>
                          <span>{lightViolations} Kasus</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden border border-slate-200">
                          <div className="bg-emerald-600 h-full rounded-full transition-all duration-500" style={{ width: `${getPercent(lightViolations)}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[11px] font-bold text-amber-700 mb-1">
                          <span>Sedang (Ta'zir Menengah)</span>
                          <span>{mediumViolations} Kasus</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden border border-slate-200">
                          <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${getPercent(mediumViolations)}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[11px] font-bold text-rose-800 mb-1">
                          <span>Berat (Peringatan & Skorsing)</span>
                          <span>{heavyViolations} Kasus</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden border border-slate-200">
                          <div className="bg-rose-600 h-full rounded-full transition-all duration-500" style={{ width: `${getPercent(heavyViolations)}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-150 flex flex-col items-center justify-center">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">Komposisi Kasus</span>
                    <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                      {totalV > 0 ? (
                        <>
                          <circle cx="18" cy="18" r="15.915" fill="none" stroke="#059669" strokeWidth="3" strokeDasharray={`${(lightViolations/totalV)*100} ${100 - (lightViolations/totalV)*100}`} strokeDashoffset="100" />
                          <circle cx="18" cy="18" r="15.915" fill="none" stroke="#d97706" strokeWidth="3" strokeDasharray={`${(mediumViolations/totalV)*100} ${100 - (mediumViolations/totalV)*100}`} strokeDashoffset={`${100 - (lightViolations/totalV)*100}`} />
                          <circle cx="18" cy="18" r="15.915" fill="none" stroke="#dc2626" strokeWidth="3" strokeDasharray={`${(heavyViolations/totalV)*100} ${100 - (heavyViolations/totalV)*100}`} strokeDashoffset={`${100 - (lightViolations/totalV)*100 - (mediumViolations/totalV)*100}`} />
                        </>
                      ) : (
                        <circle cx="18" cy="18" r="15.915" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                      )}
                    </svg>
                    <div className="flex gap-3 mt-3 text-[10px] font-bold">
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-600" /> Ringan</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Sedang</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-600" /> Berat</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {role === 'ketertiban' && (() => {
              const filteredLogs = students.flatMap(s => s.securityLogs || []).filter(l => {
                if (!l.outDate) return false;
                const datePart = l.outDate.split('T')[0];
                if (statsYear !== 'Semua') {
                  const year = datePart.split('-')[0];
                  if (year !== statsYear) return false;
                }
                if (statsMonth !== 'Semua') {
                  const month = datePart.split('-')[1];
                  if (month !== statsMonth) return false;
                }
                return true;
              });

              const returned = filteredLogs.filter(l => l.status === 'Kembali').length;
              const activeOut = filteredLogs.filter(l => l.status === 'Aktif / Keluar').length;
              const late = filteredLogs.filter(l => l.status === 'Terlambat').length;
              const totalP = returned + activeOut + late;
              
              const maxVal = Math.max(returned, activeOut, late, 1);
              const getPercent = (v: number) => (v / maxVal) * 100;
              
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div className="space-y-3.5">
                    <p className="text-[11px] text-slate-500 font-medium">Grafik di bawah ini memetakan status sirkulasi perizinan keluar santri untuk memastikan tertib administrasi perizinan pesantren:</p>
                    <div className="space-y-2.5">
                      <div>
                        <div className="flex justify-between text-[11px] font-bold text-emerald-800 mb-1">
                          <span>Sudah Kembali (Selesai Izin)</span>
                          <span>{returned} Santri</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden border border-slate-200">
                          <div className="bg-emerald-600 h-full rounded-full transition-all duration-500" style={{ width: `${getPercent(returned)}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[11px] font-bold text-amber-700 mb-1">
                          <span>Aktif / Sedang Di Luar</span>
                          <span>{activeOut} Santri</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden border border-slate-200">
                          <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${getPercent(activeOut)}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[11px] font-bold text-rose-800 mb-1">
                          <span>Terlambat Kembali (Lewat Batas)</span>
                          <span>{late} Santri</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden border border-slate-200">
                          <div className="bg-rose-600 h-full rounded-full transition-all duration-500" style={{ width: `${getPercent(late)}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-150 flex flex-col items-center justify-center">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">Rasio Sirkulasi Izin</span>
                    <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                      {totalP > 0 ? (
                        <>
                          <circle cx="18" cy="18" r="15.915" fill="none" stroke="#059669" strokeWidth="3" strokeDasharray={`${(returned/totalP)*100} ${100 - (returned/totalP)*100}`} strokeDashoffset="100" />
                          <circle cx="18" cy="18" r="15.915" fill="none" stroke="#d97706" strokeWidth="3" strokeDasharray={`${(activeOut/totalP)*100} ${100 - (activeOut/totalP)*100}`} strokeDashoffset={`${100 - (returned/totalP)*100}`} />
                          <circle cx="18" cy="18" r="15.915" fill="none" stroke="#dc2626" strokeWidth="3" strokeDasharray={`${(late/totalP)*100} ${100 - (late/totalP)*100}`} strokeDashoffset={`${100 - (returned/totalP)*100 - (activeOut/totalP)*100}`} />
                        </>
                      ) : (
                        <circle cx="18" cy="18" r="15.915" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                      )}
                    </svg>
                    <div className="flex gap-3 mt-3 text-[10px] font-bold">
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-600" /> Kembali</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Di Luar</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-600" /> Terlambat</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {role === 'kesehatan' && (() => {
              const filteredLogs = students.flatMap(s => s.healthLogs || []).filter(l => {
                if (!l.date) return false;
                if (statsYear !== 'Semua') {
                  const year = l.date.split('-')[0];
                  if (year !== statsYear) return false;
                }
                if (statsMonth !== 'Semua') {
                  const month = l.date.split('-')[1];
                  if (month !== statsMonth) return false;
                }
                return true;
              });

              const outpatient = filteredLogs.filter(l => l.status === 'Rawat Jalan (Kamar)').length;
              const inpatient = filteredLogs.filter(l => l.status === 'Nginap di Poskestren').length;
              const referred = filteredLogs.filter(l => l.status === 'Dirujuk ke RS / Pulang').length;
              const totalK = outpatient + inpatient + referred;
              
              const maxVal = Math.max(outpatient, inpatient, referred, 1);
              const getPercent = (v: number) => (v / maxVal) * 100;
              
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div className="space-y-3.5">
                    <p className="text-[11px] text-slate-500 font-medium">Grafik di bawah ini memetakan jenis penanganan medis santri sakit yang tercatat di Pos Kesehatan Pesantren (Poskestren):</p>
                    <div className="space-y-2.5">
                      <div>
                        <div className="flex justify-between text-[11px] font-bold text-emerald-800 mb-1">
                          <span>Rawat Jalan (Istirahat Kamar)</span>
                          <span>{outpatient} Santri</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden border border-slate-200">
                          <div className="bg-emerald-600 h-full rounded-full transition-all duration-500" style={{ width: `${getPercent(outpatient)}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[11px] font-bold text-amber-700 mb-1">
                          <span>Opname / Nginap di Poskestren</span>
                          <span>{inpatient} Santri</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden border border-slate-200">
                          <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${getPercent(inpatient)}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[11px] font-bold text-rose-800 mb-1">
                          <span>Rujukan Rumah Sakit / Pulang Mandiri</span>
                          <span>{referred} Santri</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden border border-slate-200">
                          <div className="bg-rose-600 h-full rounded-full transition-all duration-500" style={{ width: `${getPercent(referred)}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-150 flex flex-col items-center justify-center">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">Penyebaran Kondisi</span>
                    <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                      {totalK > 0 ? (
                        <>
                          <circle cx="18" cy="18" r="15.915" fill="none" stroke="#059669" strokeWidth="3" strokeDasharray={`${(outpatient/totalK)*100} ${100 - (outpatient/totalK)*100}`} strokeDashoffset="100" />
                          <circle cx="18" cy="18" r="15.915" fill="none" stroke="#d97706" strokeWidth="3" strokeDasharray={`${(inpatient/totalK)*100} ${100 - (inpatient/totalK)*100}`} strokeDashoffset={`${100 - (outpatient/totalK)*100}`} />
                          <circle cx="18" cy="18" r="15.915" fill="none" stroke="#dc2626" strokeWidth="3" strokeDasharray={`${(referred/totalK)*100} ${100 - (referred/totalK)*100}`} strokeDashoffset={`${100 - (outpatient/totalK)*100 - (inpatient/totalK)*100}`} />
                        </>
                      ) : (
                        <circle cx="18" cy="18" r="15.915" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                      )}
                    </svg>
                    <div className="flex gap-3 mt-3 text-[10px] font-bold">
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-600" /> Rawat Jalan</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Opname</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-600" /> Rujukan/Pulang</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
          
          {/* Unified Quick Input Log Form for security/permits (Keamanan/Ketertiban/Kesehatan) */}
          <div className={`p-4 sm:p-5 rounded-2xl border mb-6 ${
            role === 'ketertiban' ? 'bg-indigo-50/40 border-indigo-100' :
            role === 'kesehatan' ? 'bg-rose-50/40 border-rose-100' :
            'bg-emerald-50 bg-opacity-30 border-emerald-100/70'
          }`}>
            <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              {role === 'ketertiban' && <>🛡️ Input Surat Izin Baru (Ketertiban)</>}
              {role === 'kesehatan' && <>🩺 Input Surat Keterangan Baru (Poskestren)</>}
              {role === 'keamanan' && <>⚖️ Input Catatan Takzir / Pelanggaran Baru</>}
            </h3>
            <p className="text-[11px] text-slate-500 mb-4">
              {role === 'ketertiban' && 'Silakan pilih nama santri di bawah ini untuk menginput dan menerbitkan Surat Izin (Keluar/Sambang) secara cepat.'}
              {role === 'kesehatan' && 'Silakan pilih nama santri di bawah ini untuk membuat Surat Keterangan / Catatan Pelayanan Medis baru.'}
              {role === 'keamanan' && 'Silakan pilih nama santri di bawah ini untuk mencatat log takzir sanksi kedisiplinan santri.'}
            </p>



            {(() => {
              const filteredOptions = inputSearchTerm.trim() === '' ? [] : students.filter(s => 
                s.fullName.toLowerCase().includes(inputSearchTerm.toLowerCase()) ||
                s.nis.includes(inputSearchTerm)
              );

              return (
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (!inputSelectedStudentId) {
                    alert('Silakan pilih nama santri terlebih dahulu!');
                    return;
                  }
                  const foundStud = students.find(s => s.id === inputSelectedStudentId);
                  if (foundStud) {
                    setSelectedStudent(foundStud);
                    setShowAddModal(true);
                    // Clear the search box and selected student dropdown immediately!
                    setInputSearchTerm('');
                    setInputSelectedStudentId('');
                  }
                }} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                  <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Cari Nama / NIS Santri</label>
                      <input
                        type="text"
                        value={inputSearchTerm}
                        onChange={(e) => {
                          setInputSearchTerm(e.target.value);
                          setInputSelectedStudentId(''); // Reset selection when typing
                        }}
                        placeholder="Ketik Nama atau NIS..."
                        className="w-full shadow-3xs border border-slate-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-emerald-700 focus:outline-none bg-white text-slate-800 font-semibold h-9"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Pilih Data Santri</label>
                      <select 
                        value={inputSelectedStudentId}
                        onChange={(e) => setInputSelectedStudentId(e.target.value)}
                        required 
                        className="w-full shadow-3xs border border-slate-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-emerald-700 focus:outline-none bg-white text-slate-800 font-semibold h-9"
                      >
                        {inputSearchTerm.trim() === '' ? (
                          <option value="">-- Ketik pencarian terlebih dahulu --</option>
                        ) : filteredOptions.length === 0 ? (
                          <option value="">-- Tidak ditemukan santri --</option>
                        ) : (
                          <>
                            <option value="">-- Pilih ({filteredOptions.length} kecocokan) --</option>
                            {filteredOptions.map(s => (
                              <option key={s.id} value={s.id}>{s.fullName} ({s.nis})</option>
                            ))}
                          </>
                        )}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Kategori Dokumen / Log</label>
                    <select
                      value={customInputType}
                      onChange={(e) => setCustomInputType(e.target.value as any)}
                      className="w-full h-9 px-2.5 border border-slate-200 rounded-lg text-xs font-bold bg-white text-slate-800 focus:ring-2 focus:ring-emerald-700 focus:outline-none"
                    >
                      <option value="izin">🛡️ Surat Perizinan (Izin Keluar/Pulang)</option>
                      <option value="takzir">⚖️ Catatan Takzir & Pelanggaran</option>
                      <option value="kesehatan">🩺 Rekam Pelayanan Medis Poskestren</option>
                    </select>
                  </div>
                  <button type="submit" className="w-full h-9 bg-emerald-800 hover:bg-emerald-950 text-white font-bold text-xs rounded-lg transition duration-150 uppercase shadow-xs flex items-center justify-center gap-1.5 cursor-pointer">
                    <Plus className="h-3.5 w-3.5" /> Buka Lembar Input
                  </button>
                </form>
              );
            })()}
          </div>

          {/* Search bar and Filters */}
          <div className="flex flex-col sm:flex-row items-center gap-4 justify-between mb-6">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari santri berdasarkan Nama atau NIS..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-700 focus:outline-none"
              />
            </div>
            
            <span className="text-xs text-slate-400 font-semibold font-mono">
              {searchTerm.trim() === '' ? (
                'Ketik Nama atau NIS untuk memulai pencarian...'
              ) : (
                `Hasil: ${filteredStudents.length} Santri ditemukan`
              )}
            </span>
          </div>

          {/* Student Grids layout */}
          {searchTerm.trim() === '' ? (
            <div className="text-center py-12 px-4 border border-dashed border-slate-200 rounded-2xl bg-slate-50/40">
              <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                <Search className="h-5 w-5" />
              </div>
              <p className="text-slate-800 font-extrabold text-xs uppercase tracking-wider">Cari Santri Berdasarkan Nama / NIS</p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                Sesuai kebijakan pengurus, database tidak ditampilkan secara penuh demi efisiensi halaman. Masukkan Nama atau NIS untuk memanggil rekam data santri.
              </p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-12 px-4 border border-dashed border-red-100 rounded-2xl bg-red-50/20">
              <p className="text-red-800 font-extrabold text-xs uppercase tracking-wider">Santri Tidak Ditemukan</p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                Kueri pencarian "{searchTerm}" tidak cocok dengan data Nama atau NIS di database santri aktif.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStudents.map(student => {
                return (
                  <div 
                    key={student.id}
                    className="bg-white rounded-xl p-5 border border-slate-150/70 shadow-xs hover:border-emerald-500 transition duration-150 flex flex-col justify-between"
                  >
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900 tracking-tight leading-none mb-1">{student.fullName}</h3>
                      <p className="text-[10px] font-bold text-slate-500 font-mono mt-1">NIS: {student.nis}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedStudent(student);
                          setCustomInputType('izin');
                          setShowAddModal(true);
                          setSearchTerm('');
                          setInputSearchTerm('');
                          setInputSelectedStudentId('');
                        }}
                        className="w-full py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold text-[11px] rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer shadow-3xs"
                      >
                        🛡️ + Surat Perizinan
                      </button>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStudent(student);
                            setCustomInputType('takzir');
                            setShowAddModal(true);
                            setSearchTerm('');
                            setInputSearchTerm('');
                            setInputSelectedStudentId('');
                          }}
                          className="py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 font-bold text-[10px] rounded-lg border border-indigo-200 transition cursor-pointer"
                        >
                          ⚖️ + Takzir
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStudent(student);
                            setCustomInputType('kesehatan');
                            setShowAddModal(true);
                            setSearchTerm('');
                            setInputSearchTerm('');
                            setInputSelectedStudentId('');
                          }}
                          className="py-1 bg-rose-50 hover:bg-rose-100 text-rose-900 font-bold text-[10px] rounded-lg border border-rose-200 transition cursor-pointer"
                        >
                          🩺 + Medis
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* INPUT DATA RECORD MODAL */}
      {showAddModal && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-950/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-emerald-100 my-auto max-h-[92vh] flex flex-col">
            
            {/* Modal header */}
            <div className="p-4 bg-gradient-to-r from-emerald-800 to-teal-900 text-white">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <h3 className="font-extrabold text-sm uppercase tracking-wider">Input Catatan / Tindakan Baru</h3>
                  <p className="text-xs text-emerald-100 mt-0.5">Santri: <strong className="text-amber-300">{selectedStudent.fullName}</strong> ({selectedStudent.nis})</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setSelectedStudent(null);
                  }}
                  className="p-1 rounded bg-emerald-900/60 hover:bg-emerald-900 text-teal-100 hover:text-white text-xs font-bold transition cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Tab Selector inside Modal */}
              <div className="grid grid-cols-3 gap-1 mt-3 bg-emerald-950/40 p-1 rounded-xl text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setCustomInputType('izin')}
                  className={`py-1 rounded-lg transition cursor-pointer ${
                    customInputType === 'izin' ? 'bg-white text-emerald-900 font-extrabold shadow-3xs' : 'text-teal-100 hover:text-white'
                  }`}
                >
                  🛡️ Perizinan
                </button>
                <button
                  type="button"
                  onClick={() => setCustomInputType('takzir')}
                  className={`py-1 rounded-lg transition cursor-pointer ${
                    customInputType === 'takzir' ? 'bg-white text-emerald-900 font-extrabold shadow-3xs' : 'text-teal-100 hover:text-white'
                  }`}
                >
                  ⚖️ Takzir
                </button>
                <button
                  type="button"
                  onClick={() => setCustomInputType('kesehatan')}
                  className={`py-1 rounded-lg transition cursor-pointer ${
                    customInputType === 'kesehatan' ? 'bg-white text-emerald-900 font-extrabold shadow-3xs' : 'text-teal-100 hover:text-white'
                  }`}
                >
                  🩺 Medis
                </button>
              </div>
            </div>

            <form onSubmit={handleAddRecordSubmit} className="p-5 space-y-4">

              {/* Form 1: Ketertiban (Perizinan) Form */}
              {customInputType === 'izin' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Jenis Izin</label>
                    <select
                      value={permitType}
                      onChange={(e) => setPermitType(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-700 bg-white text-slate-855 font-semibold"
                    >
                      <option value="Keluar Lingkungan">Keluar Lingkungan (Beli Kitab / ATM / Fotokopi)</option>
                      <option value="Pulang (Keluarga)">Pulang Sambang Keluarga (Sakit / Kepentingan Penting)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Rincian Tujuan & Alasan Keperluan</label>
                    <textarea
                      required
                      value={permitDesc}
                      onChange={(e) => setPermitDesc(e.target.value)}
                      placeholder="Contoh: Menghadiri walimatussafar paman di Cilacap, dijemput orang tua kandung."
                      rows={3}
                      className="w-full px-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-700 text-slate-800 placeholder-slate-400 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Rencana Batas Tanggal Kembali</label>
                    <input
                      type="datetime-local"
                      required
                      value={expectedReturn}
                      onChange={(e) => setExpectedReturn(e.target.value.replace('T', ' '))}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-indigo-700 font-medium font-mono"
                    />
                  </div>
                </>
              )}

              {/* Form 2: Keamanan (Takzir Pelanggaran) Form */}
              {customInputType === 'takzir' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nama / Deskripsi Pelanggaran</label>
                    <input
                      type="text"
                      required
                      value={violationType}
                      onChange={(e) => setViolationType(e.target.value)}
                      placeholder="Contoh: Menggunakan barang orang lain tanpa izin (Ghozab)"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700 text-slate-800 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Kategori Tingkatan</label>
                    <select
                      value={violationLevel}
                      onChange={(e) => setViolationLevel(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700 bg-white text-slate-850 font-semibold"
                    >
                      <option value="Ringan">Ringan (E.g. Terlambat)</option>
                      <option value="Sedang">Sedang (E.g. Ghozab)</option>
                      <option value="Berat">Berat (E.g. Merokok/Keluar Malam)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Sanksi / Ta'zir yang Diberikan</label>
                    <textarea
                      required
                      value={violationConsequence}
                      onChange={(e) => setViolationConsequence(e.target.value)}
                      placeholder="Contoh: Membersihkan toilet umum komplek barat dan menghafal 1 halaman surah Yasin"
                      rows={2}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700 font-medium"
                    />
                  </div>
                </>
              )}

              {/* Form 3: Kesehatan Form */}
              {customInputType === 'kesehatan' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Keluhan Kesehatan / Sakit</label>
                    <input
                      type="text"
                      required
                      value={complaint}
                      onChange={(e) => setComplaint(e.target.value)}
                      placeholder="Contoh: Demam tinggi 38.5C dan pusing pening"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-700"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Prakiraan Diagnosa</label>
                      <input
                        type="text"
                        required
                        value={diagnosis}
                        onChange={(e) => setDiagnosis(e.target.value)}
                        placeholder="Contoh: Kelelahan mendalam & demam"
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-700"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Pemberian Obat / Terapis</label>
                      <input
                        type="text"
                        required
                        value={treatment}
                        onChange={(e) => setTreatment(e.target.value)}
                        placeholder="Contoh: Paracetamol 3x1 & Amoxicillin"
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-700"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Rekomendasi Perawatan</label>
                    <select
                      value={healthStatus}
                      onChange={(e) => setHealthStatus(e.target.value as any)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-rose-750 text-slate-800"
                    >
                      <option value="Rawat Jalan (Kamar)">Rawat Jalan di Kamar Santri</option>
                      <option value="Nginap di Poskestren">Opname / Rawat Inap di Klinik Poskestren</option>
                      <option value="Dirujuk ke RS / Pulang">Dirujuk ke Rumah Sakit terdekat / Dipulangkan sementara</option>
                    </select>
                  </div>
                </>
              )}

              {/* Modal footer btns */}
              <div className="flex gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setSelectedStudent(null);
                  }}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-2 bg-gradient-to-r ${
                    role === 'keamanan' ? 'from-emerald-800 to-emerald-950 hover:opacity-95' :
                    role === 'ketertiban' ? 'from-indigo-800 to-indigo-950 hover:opacity-95' :
                    'from-rose-800 to-rose-950 hover:opacity-95'
                  } text-white rounded-lg text-xs font-bold shadow-md cursor-pointer`}
                >
                  Simpan Catatan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POPUP SLIP LAYOUTS FOR PRINTS */}

      {/* 1. Slip Izin Pulang/Keluar */}
      {printSecurityLog && (() => {
        const studentInfo = students.find(s => s.id === printSecurityLog.studentId || s.fullName === printSecurityLog.studentName);
        const config = getStaffConfig('ketertiban');
        
        let slipTitle = "SURAT IDZIN KELUAR TIDAK BERMALAM";
        try {
          const d1 = new Date(printSecurityLog.outDate.trim().replace(' ', 'T'));
          const d2 = new Date(printSecurityLog.expectedReturnDate.trim().replace(' ', 'T'));
          const diffMs = d2.getTime() - d1.getTime();
          const diffDays = diffMs / (1000 * 60 * 60 * 24);
          
          const date1Str = printSecurityLog.outDate.split(' ')[0] || printSecurityLog.outDate;
          const date2Str = printSecurityLog.expectedReturnDate.split(' ')[0] || printSecurityLog.expectedReturnDate;
          const isOvernight = date1Str !== date2Str || diffDays >= 1.0;

          if (isOvernight) {
            slipTitle = "SURAT IDZIN KELUAR BERMALAM";
          } else {
            slipTitle = "SURAT IDZIN KELUAR TIDAK BERMALAM";
          }
        } catch (e) {
          slipTitle = "SURAT IDZIN KELUAR TIDAK BERMALAM";
        }

        return (
          <div 
            onClick={() => setPrintSecurityLog(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-950/70 backdrop-blur-sm cursor-pointer overflow-y-auto"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl p-6 max-w-lg w-full font-serif border border-emerald-100 relative cursor-default my-auto max-h-[92vh] flex flex-col overflow-y-auto"
            >
              <button 
                onClick={() => setPrintSecurityLog(null)} 
                className="absolute top-3 right-3 text-slate-400 hover:text-slate-650 hover:bg-slate-100 p-1 rounded-full cursor-pointer print:hidden transition"
                title="Batal Print"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="text-[10px] bg-amber-50 text-amber-900 border border-amber-200 p-2.5 rounded mb-4 font-sans flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex-1">
                  💡 Paragraf surat ini dapat diklik dan diedit langsung sebelum mencetak.
                </div>
                <button
                  onClick={() => setPrintSecurityLog(null)}
                  className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-black cursor-pointer shrink-0 transition"
                >
                  Kembali & Tutup ✕
                </button>
              </div>

              {/* Printable Wrapper */}
              <div id="security-letter-to-print" className="p-2 bg-white text-left font-sans">
                {/* Kop Surat Resmi */}
                <div className="border-b-4 border-double border-slate-900 pb-4 mb-6 flex items-center">
                  {pesantrenSettings.logoUrl ? (
                    <img src={pesantrenSettings.logoUrl} alt="Logo Pesantren" className="h-14 w-14 object-contain mr-4 shrink-0" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="h-14 w-14 bg-slate-50 rounded-full border border-slate-200 flex items-center justify-center text-xl mr-4 shrink-0 select-none">🕌</div>
                  )}
                  <div className="flex-1">
                    <h4 className="text-slate-900 font-black text-sm tracking-wide uppercase leading-tight">
                      {pesantrenSettings.schoolName || "Pondok Pesantren Al-Asy'ariyah"}
                    </h4>
                    <p className="text-[10px] italic text-slate-500 font-bold tracking-wide uppercase">Biro Keamanan & Ketertiban Pengurus Pondok Pesantren</p>
                    <p className="text-[9px] text-slate-500 mt-0.5">
                      {pesantrenSettings.address || "Jl. Raya Modung, Langpanggang, Modung, Bangkalan, Jawa Timur"}
                    </p>
                    <p className="text-[9px] text-slate-500 font-medium">
                      Telp: {pesantrenSettings.phone || "(0291) 438291"} | Email: {pesantrenSettings.email || "info@alasyariyah.sch.id"}
                    </p>
                  </div>
                </div>

                <div className="text-center mb-6">
                  <h3 className="font-extrabold text-base tracking-wider underline uppercase text-slate-950" contentEditable={true} suppressContentEditableWarning={true}>
                    {(() => {
                      const isOvernight = printSecurityLog.permitType === 'Pulang (Keluarga)' || 
                                          printSecurityLog.permitType?.toLowerCase().includes('bermalam') ||
                                          (printSecurityLog.outDate && printSecurityLog.expectedReturnDate && 
                                           (new Date(printSecurityLog.expectedReturnDate.replace(' ', 'T')).getTime() - new Date(printSecurityLog.outDate.replace(' ', 'T')).getTime() > 24 * 3600 * 1000));
                      return isOvernight ? 'SURAT IZIN BERMALAM' : 'SURAT IZIN KELUAR (TIDAK BERMALAM)';
                    })()}
                  </h3>
                  <p className="text-[10px] font-mono mt-0.5 text-slate-500">Nomor: {getLetterNumber(printSecurityLog.id, 'Surat Izin Keluar', 'KMT')}</p>
                </div>

                <div className="space-y-2 text-xs text-slate-900 leading-relaxed mb-6">
                  <p contentEditable={true} suppressContentEditableWarning={true} className="cursor-text focus:bg-amber-50/30">{getStaffConfig('ketertiban').letterTemplate1}</p>
                  
                  <table className="w-full my-4 border-collapse text-[11px] font-sans">
                    <tbody>
                      <tr className="border-b border-slate-100">
                        <td className="py-1.5 font-bold text-slate-500 w-1/3 uppercase">NIS</td>
                        <td className="py-1.5 text-slate-900 font-mono font-bold">{studentInfo?.nis || '-'}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-1.5 font-bold text-slate-500 uppercase">Nama Santri</td>
                        <td className="py-1.5 text-slate-900 font-extrabold">{printSecurityLog.studentName}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-1.5 font-bold text-slate-500 uppercase">Kamar & Kelas</td>
                        <td className="py-1.5 text-slate-900 font-semibold">{studentInfo?.kamar || '-'} (Kelas {studentInfo?.class || '-'})</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-1.5 font-bold text-slate-500 uppercase">Waktu Keluar</td>
                        <td className="py-1.5 text-emerald-950 font-mono font-extrabold">{printSecurityLog.outDate || '-'}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-1.5 font-bold text-slate-500 uppercase">Rencana Kembali</td>
                        <td className="py-1.5 text-rose-950 font-mono font-extrabold">{printSecurityLog.expectedReturnDate || '-'}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-1.5 font-bold text-slate-500 uppercase">Tujuan Izin</td>
                        <td className="py-1.5 text-slate-900 font-bold">
                          {printSecurityLog.destinationCity || printSecurityLog.destination || (printSecurityLog.permitType === 'Pulang (Keluarga)' ? 'Rumah Wali / Keluarga' : 'Luar Lingkungan Pesantren')}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-1.5 font-bold text-slate-500 uppercase">Keperluan</td>
                        <td className="py-1.5 text-slate-900 font-semibold">{printSecurityLog.description || '-'}</td>
                      </tr>
                    </tbody>
                  </table>
                  
                  <p contentEditable={true} suppressContentEditableWarning={true} className="text-[10px] italic mt-2 text-slate-500 leading-normal cursor-text focus:bg-amber-50/30">
                    * Keterangan penting: Lembaran lapor ini wajib dibawa oleh santri dan diserahkan kembali ke pos penjagaan keamanan saat tiba kembali di pondok sesuai tenggat waktu yang tercatat. Keterlambatan akan dikenakan sanksi disiplin!
                  </p>
                </div>

               {/* Signature Area */}
              <div className="border-t border-dashed border-slate-200 pt-4 flex justify-end text-left text-xs">
                <div className="w-[220px] relative font-sans space-y-0.5">
                  <p className="text-[10px] text-slate-500 font-medium">{getCityFromAddress(pesantrenSettings.address)}, {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  <p className="text-[10px] text-slate-800 font-bold">Mengetahui,</p>
                  <p className="text-[10px] text-slate-900 font-extrabold uppercase tracking-wide">
                    {role === 'ketertiban' ? 'Kepala Bidang Ketertiban & Keamanan' : role === 'keamanan' ? 'Kepala Bidang Keamanan' : 'Pengurus Pondok Pesantren'}
                  </p>
                  
                  {/* TTD and overlapping Stempel */}
                  <div className="h-10 w-full relative flex items-center justify-start select-none my-1">
                    {/* TTD in background */}
                    <div className="z-10 absolute inset-0 flex items-center justify-start">
                      {isImageUrl(config.signature) ? (
                        <img src={config.signature} alt="Tanda Tangan" className="h-10 object-contain select-none" referrerPolicy="no-referrer" />
                      ) : (
                        <span className="text-[10px] font-mono text-indigo-850 italic font-bold">{config.signature || '✒️ Syarifudin'}</span>
                      )}
                    </div>

                    {/* Overlapping Stempel */}
                    <div className="z-20 absolute left-[30px] top-[-10px] pointer-events-none opacity-85">
                      {isImageUrl(config.seal) ? (
                        <img src={config.seal} alt="Stempel Biro" className="h-14 w-14 object-contain select-none mix-blend-multiply rotate-[-6deg]" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="border border-indigo-600 border-double rounded h-8 w-8 flex items-center justify-center text-[5px] uppercase select-none font-bold text-indigo-800 rotate-[-6deg] leading-tight text-center bg-white/75">
                          TTD
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-[11px] font-bold text-slate-900 underline leading-none">{config.name || 'Ustadz Ahmad Syarifudin, S.H.I'}</p>
                </div>
              </div>
              </div>

              <div className="mt-6 flex gap-2 font-sans">
                {viewOnlyMode ? (
                  <button
                    type="button"
                    onClick={() => {
                      setPrintSecurityLog(null);
                      setViewOnlyMode(false);
                    }}
                    className="w-full px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded cursor-pointer text-center"
                  >
                    Kembali & Tutup ✕
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handlePrintLetter('security-letter-to-print', printSecurityLog.id, 'Surat Izin Keluar', 'KMT', printSecurityLog.studentName, printSecurityLog.permitType)}
                      className="px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded cursor-pointer flex-1 text-center uppercase shadow-xs transition duration-150"
                    >
                      Print Surat ⎙
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrintSecurityLog(null)}
                      className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded cursor-pointer flex-1 text-center"
                    >
                      Batal Print ✕
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* 2. Slip Keputusan Sanksi Takzir */}
      {printDisciplineLog && (() => {
        const studentInfo = students.find(s => s.id === printDisciplineLog.studentId || s.fullName === printDisciplineLog.studentName);
        const config = getStaffConfig('keamanan');

        return (
          <div 
            onClick={() => setPrintDisciplineLog(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-emerald-950/75 backdrop-blur-sm cursor-pointer"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl p-6 max-w-lg w-full font-serif border border-emerald-100 relative cursor-default my-auto max-h-[88vh] sm:max-h-[90vh] flex flex-col overflow-y-auto"
            >
              <button 
                onClick={() => setPrintDisciplineLog(null)} 
                className="absolute top-3 right-3 text-slate-400 hover:text-slate-650 hover:bg-slate-100 p-1 rounded-full cursor-pointer print:hidden transition"
                title="Batal Print"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="text-[10px] bg-amber-50 text-amber-900 border border-amber-200 p-2.5 rounded mb-4 font-sans flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex-1">
                  💡 Paragraf surat ini dapat diklik dan diedit langsung sebelum mencetak.
                </div>
                <button
                  onClick={() => setPrintDisciplineLog(null)}
                  className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-black cursor-pointer shrink-0 transition"
                >
                  Kembali & Tutup ✕
                </button>
              </div>

              {/* Printable Wrapper */}
              <div id="discipline-letter-to-print" className="p-2 bg-white text-left font-sans">
                {/* Kop Surat Resmi */}
                <div className="border-b-4 border-double border-slate-900 pb-4 mb-6 flex items-center">
                  {pesantrenSettings.logoUrl ? (
                    <img src={pesantrenSettings.logoUrl} alt="Logo Pesantren" className="h-14 w-14 object-contain mr-4 shrink-0" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="h-14 w-14 bg-slate-50 rounded-full border border-slate-200 flex items-center justify-center text-xl mr-4 shrink-0 select-none">🕌</div>
                  )}
                  <div className="flex-1">
                    <h4 className="text-slate-900 font-black text-sm tracking-wide uppercase leading-tight">
                      {pesantrenSettings.schoolName || "Pondok Pesantren Al-Asy'ariyah"}
                    </h4>
                    <p className="text-[10px] italic text-slate-500 font-bold tracking-wide uppercase">Lembaga Penegakan Disiplin Santri (LPD)</p>
                    <p className="text-[9px] text-slate-500 mt-0.5">
                      {pesantrenSettings.address || "Jl. Raya Modung, Langpanggang, Modung, Bangkalan, Jawa Timur"}
                    </p>
                    <p className="text-[9px] text-slate-500 font-medium">
                      Telp: {pesantrenSettings.phone || "(0291) 438291"} | Email: {pesantrenSettings.email || "info@alasyariyah.sch.id"}
                    </p>
                  </div>
                </div>

              <div className="text-center mb-6">
                <h3 className="font-bold text-sm tracking-wider underline uppercase text-slate-950" contentEditable={true} suppressContentEditableWarning={true}>Surat Keterangan Sanksi & Keputusan Takzir</h3>
                <p className="text-[10px] font-mono mt-0.5 text-slate-500">Nomor: {getLetterNumber(printDisciplineLog.id, 'Surat Sanksi Takzir', 'KTT')}</p>
              </div>

              <div className="space-y-2 text-xs text-slate-900 leading-relaxed mb-6">
                <p contentEditable={true} suppressContentEditableWarning={true} className="cursor-text focus:bg-amber-50/30">{getStaffConfig('keamanan').letterTemplate1}</p>
                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded border border-slate-150 font-sans text-[11px]" id="print-discipline-card">
                  <span className="font-bold text-slate-500">NIS (4 Digit)</span>
                  <span className="col-span-2 font-mono font-bold text-slate-800">: {studentInfo?.nis || '-'}</span>

                  <span className="font-bold text-slate-500">Nama Santri</span>
                  <span className="col-span-2 font-black text-slate-950">: {printDisciplineLog.studentName}</span>

                  <span className="font-bold text-slate-500">Kelas Pagi Sore</span>
                  <span className="col-span-2 font-semibold text-slate-800">: {studentInfo?.class || '-'}</span>

                  <span className="font-bold text-slate-500">Bentuk Pelanggaran</span>
                  <span className="col-span-2 font-bold text-red-900 focus:bg-amber-50/20" contentEditable={true} suppressContentEditableWarning={true}>: {printDisciplineLog.violationType}</span>
                  
                  <span className="font-bold text-slate-500">Tingkat Penilaian</span>
                  <span className="col-span-2 font-bold text-amber-900">: {printDisciplineLog.level}</span>
                  
                  <span className="font-bold text-slate-500">Wajib Menjalankan</span>
                  <span className="col-span-2 font-bold italic text-slate-900 focus:bg-amber-50/20" contentEditable={true} suppressContentEditableWarning={true}>: {printDisciplineLog.consequence}</span>
                </div>
                <p contentEditable={true} suppressContentEditableWarning={true} className="text-[10px] italic mt-2 text-slate-500 leading-normal cursor-text focus:bg-amber-50/30">
                  {getStaffConfig('keamanan').letterTemplate2}
                </p>
              </div>

               {/* Signature Area */}
              <div className="border-t border-dashed border-slate-200 pt-4 flex justify-end text-left text-xs">
                <div className="w-[200px] relative font-sans space-y-0.5">
                  <p className="text-[10px] text-slate-400 font-medium">{getCityFromAddress(pesantrenSettings.address)}, {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  <p className="text-[10px] text-emerald-955 font-extrabold uppercase tracking-wide">Mengetahui, Penguji Takzir</p>
                  
                  {/* TTD and overlapping Stempel */}
                  <div className="h-10 w-full relative flex items-center justify-start select-none my-1">
                    {/* TTD in background */}
                    <div className="z-10 absolute inset-0 flex items-center justify-start">
                      {isImageUrl(config.signature) ? (
                        <img src={config.signature} alt="Tanda Tangan" className="h-10 object-contain select-none" referrerPolicy="no-referrer" />
                      ) : (
                        <span className="text-[10px] font-mono text-emerald-850 italic font-bold">{config.signature || '✍️ M. Hasanuddin'}</span>
                      )}
                    </div>

                    {/* Overlapping Stempel */}
                    <div className="z-20 absolute left-[30px] top-[-10px] pointer-events-none opacity-85">
                      {isImageUrl(config.seal) ? (
                        <img src={config.seal} alt="Stempel Biro" className="h-14 w-14 object-contain select-none mix-blend-multiply rotate-[-5deg]" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="border border-emerald-600 border-double rounded h-8 w-8 flex items-center justify-center text-[5px] uppercase select-none font-bold text-emerald-800 rotate-[-5deg] leading-tight text-center bg-white/75">
                          TTD
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-[11px] font-bold text-slate-900 underline leading-none">{config.name || deptName || session?.fullName || 'Ustadz Pengurus Pesantren'}</p>
                </div>
              </div>
              </div>

              <div className="mt-6 flex gap-2 font-sans">
                {viewOnlyMode ? (
                  <button
                    type="button"
                    onClick={() => {
                      setPrintDisciplineLog(null);
                      setViewOnlyMode(false);
                    }}
                    className="w-full px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded cursor-pointer text-center"
                  >
                    Kembali & Tutup ✕
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handlePrintLetter('discipline-letter-to-print', printDisciplineLog.id, 'Surat Sanksi Takzir', 'KTT', printDisciplineLog.studentName, printDisciplineLog.violationType)}
                      className="px-3.5 py-1.5 bg-indigo-850 hover:bg-indigo-905 text-white text-xs font-bold rounded cursor-pointer flex-1 text-center uppercase animate-fade-in shadow-xs transition duration-150"
                    >
                      Print Surat ⎙
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrintDisciplineLog(null)}
                      className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded cursor-pointer flex-1 text-center"
                    >
                      Batal Print ✕
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {printHealthLog && (() => {
        const studentInfo = students.find(s => s.id === printHealthLog.studentId || s.fullName === printHealthLog.studentName);
        const config = getStaffConfig('kesehatan');

        return (
          <div 
            onClick={() => setPrintHealthLog(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-emerald-950/75 backdrop-blur-sm cursor-pointer"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl p-6 max-w-lg w-full font-serif border border-emerald-100 relative cursor-default my-auto max-h-[88vh] sm:max-h-[90vh] flex flex-col overflow-y-auto"
            >
              <button 
                onClick={() => setPrintHealthLog(null)} 
                className="absolute top-3 right-3 text-slate-400 hover:text-slate-650 hover:bg-slate-100 p-1 rounded-full cursor-pointer print:hidden transition"
                title="Batal Print"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="text-[10px] bg-amber-50 text-amber-900 border border-amber-200 p-2.5 rounded mb-4 font-sans flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex-1">
                  💡 Paragraf surat ini dapat diklik dan diedit langsung sebelum mencetak.
                </div>
                <button
                  onClick={() => setPrintHealthLog(null)}
                  className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-black cursor-pointer shrink-0 transition"
                >
                  Kembali & Tutup ✕
                </button>
              </div>

              {/* Printable Wrapper */}
              <div id="health-letter-to-print" className="p-2 bg-white text-left font-sans">
                {/* Kop Surat Resmi */}
                <div className="border-b-4 border-double border-slate-900 pb-4 mb-6 flex items-center">
                  {pesantrenSettings.logoUrl ? (
                    <img src={pesantrenSettings.logoUrl} alt="Logo Pesantren" className="h-14 w-14 object-contain mr-4 shrink-0" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="h-14 w-14 bg-slate-50 rounded-full border border-slate-200 flex items-center justify-center text-xl mr-4 shrink-0 select-none">🕌</div>
                  )}
                  <div className="flex-1">
                    <h4 className="text-slate-900 font-black text-sm tracking-wide uppercase leading-tight">
                      {pesantrenSettings.schoolName || "Pondok Pesantren Al-Asy'ariyah"}
                    </h4>
                    <p className="text-[10px] italic text-slate-500 font-bold tracking-wide uppercase">Pos Kesehatan Pesantren (Poskestren) Al-Asy'ariyah</p>
                    <p className="text-[9px] text-slate-500 mt-0.5">
                      {pesantrenSettings.address || "Jl. Raya Modung, Langpanggang, Modung, Bangkalan, Jawa Timur"}
                    </p>
                    <p className="text-[9px] text-slate-500 font-medium">
                      Telp: {pesantrenSettings.phone || "(0291) 438291"} | Email: {pesantrenSettings.email || "info@alasyariyah.sch.id"}
                    </p>
                  </div>
                </div>

              <div className="text-center mb-6">
                <h3 className="font-bold text-sm tracking-wider underline uppercase text-slate-900" contentEditable={true} suppressContentEditableWarning={true}>Surat Keterangan Rawat & Istirahat Sakit</h3>
                <p className="text-[10px] font-mono mt-0.5 text-slate-500">Nomor: {getLetterNumber(printHealthLog.id, 'Surat Keterangan Sakit', 'KST')}</p>
              </div>

              <div className="space-y-2 text-xs text-slate-900 leading-relaxed mb-6">
                <p contentEditable={true} suppressContentEditableWarning={true} className="cursor-text focus:bg-amber-50/30">{getStaffConfig('kesehatan').letterTemplate1}</p>
                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded border border-slate-150 font-sans text-[11px]" id="print-health-card">
                  <span className="font-bold text-slate-500">NIS (4 Digit)</span>
                  <span className="col-span-2 font-mono font-bold text-slate-800">: {studentInfo?.nis || '-'}</span>

                  <span className="font-bold text-slate-500">Nama Santri</span>
                  <span className="col-span-2 font-black">: {printHealthLog.studentName}</span>

                  <span className="font-bold text-slate-500">Kelas Pagi Sore</span>
                  <span className="col-span-2 font-semibold text-slate-800">: {studentInfo?.class || '-'}</span>

                  <span className="font-bold text-slate-500">Keluhan Utama</span>
                  <span className="col-span-2 font-bold text-red-900 focus:bg-amber-50/20" contentEditable={true} suppressContentEditableWarning={true}>: {printHealthLog.complaint}</span>
                  
                  <span className="font-bold text-slate-500">Diagnosis Medis</span>
                  <span className="col-span-2 italic font-semibold focus:bg-amber-50/25" contentEditable={true} suppressContentEditableWarning={true}>: {printHealthLog.diagnosis}</span>
                  
                  <span className="font-bold text-slate-500">Tindakan / Terapi</span>
                  <span className="col-span-2 font-bold text-emerald-950 focus:bg-amber-50/25" contentEditable={true} suppressContentEditableWarning={true}>: {printHealthLog.treatment}</span>
                  
                  <span className="font-bold text-slate-500">Status Perawatan</span>
                  <span className="col-span-2 font-bold uppercase text-rose-800">: {printHealthLog.status}</span>
                </div>
                <p contentEditable={true} suppressContentEditableWarning={true} className="text-[10px] italic mt-2 text-slate-500 leading-normal cursor-text focus:bg-amber-50/30">
                  {getStaffConfig('kesehatan').letterTemplate2}
                </p>
              </div>

               {/* Signature Area */}
              <div className="border-t border-dashed border-slate-200 pt-4 flex justify-end text-left text-xs">
                <div className="w-[200px] relative font-sans space-y-0.5">
                  <p className="text-[10px] text-rose-400 font-medium">{getCityFromAddress(pesantrenSettings.address)}, {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  <p className="text-[10px] text-rose-955 font-extrabold uppercase tracking-wide">Mengetahui, Petugas Medis</p>
                  
                  {/* TTD and overlapping Stempel */}
                  <div className="h-10 w-full relative flex items-center justify-start select-none my-1">
                    {/* TTD in background */}
                    <div className="z-10 absolute inset-0 flex items-center justify-start">
                      {isImageUrl(config.signature) ? (
                        <img src={config.signature} alt="Tanda Tangan" className="h-10 object-contain select-none" referrerPolicy="no-referrer" />
                      ) : (
                        <span className="text-[10px] font-mono text-rose-800 italic font-bold">{config.signature || '⚕️ Fatimah'}</span>
                      )}
                    </div>

                    {/* Overlapping Stempel */}
                    <div className="z-20 absolute left-[30px] top-[-10px] pointer-events-none opacity-85">
                      {isImageUrl(config.seal) ? (
                        <img src={config.seal} alt="Stempel Biro" className="h-14 w-14 object-contain select-none mix-blend-multiply rotate-[-4deg]" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="border border-rose-600 border-double rounded h-8 w-8 flex items-center justify-center text-[5px] uppercase select-none font-bold text-rose-800 rotate-[-4deg] leading-tight text-center bg-white/75">
                          TTD
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-[11px] font-bold text-slate-900 underline leading-none">{config.name || 'Ustadzah Fatimah, Amd.Kep'}</p>
                </div>
              </div>
              </div>

              <div className="mt-6 flex gap-2 font-sans">
                {viewOnlyMode ? (
                  <button
                    type="button"
                    onClick={() => {
                      setPrintHealthLog(null);
                      setViewOnlyMode(false);
                    }}
                    className="w-full px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded cursor-pointer text-center"
                  >
                    Kembali & Tutup ✕
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handlePrintLetter('health-letter-to-print', printHealthLog.id, 'Surat Keterangan Sakit', 'KST', printHealthLog.studentName, printHealthLog.complaint)}
                      className="px-3.5 py-1.5 bg-rose-800 hover:bg-rose-900 text-white text-xs font-bold rounded cursor-pointer flex-1 text-center uppercase shadow-xs transition duration-150"
                    >
                      Print Surat ⎙
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrintHealthLog(null)}
                      className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded cursor-pointer flex-1 text-center"
                    >
                      Batal Print ✕
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {editingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-emerald-950/75 backdrop-blur-sm font-sans">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-emerald-100 flex flex-col my-auto max-h-[88vh] sm:max-h-[90vh] animate-fade-in text-xs">
            <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white p-4 sm:p-5 flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-extrabold text-sm uppercase tracking-wider flex items-center gap-2">
                  ✏️ Edit Isian Catatan ({editingLog.type === 'security' ? 'Keamanan' : editingLog.type === 'discipline' ? 'Ketertiban' : 'Kesehatan'})
                </h3>
                <p className="text-[10px] text-teal-100 font-mono mt-0.5">ID: {editingLog.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingLog(null)}
                className="text-teal-100 hover:text-white p-1 rounded-lg transition cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleEditLog(editingLog.id, editingLog.type, editingLog.values);
                setEditingLog(null);
              }}
              className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 text-left"
            >
              {editingLog.type === 'security' && (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Jenis Perizinan</label>
                    <select
                      value={editingLog.values.permitType || 'Keluar Lingkungan'}
                      onChange={(e) => setEditingLog({
                        ...editingLog,
                        values: { ...editingLog.values, permitType: e.target.value }
                      })}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-emerald-700 bg-white"
                    >
                      <option value="Keluar Lingkungan">Keluar Lingkungan</option>
                      <option value="Pulang (Keluarga)">Pulang (Keluarga)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Alasan / Keterangan</label>
                    <textarea
                      rows={3}
                      value={editingLog.values.description || ''}
                      onChange={(e) => setEditingLog({
                        ...editingLog,
                        values: { ...editingLog.values, description: e.target.value }
                      })}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-emerald-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tenggat Waktu Kembali</label>
                    <input
                      type="text"
                      placeholder="YYYY-MM-DD HH:MM"
                      value={editingLog.values.expectedReturnDate || ''}
                      onChange={(e) => setEditingLog({
                        ...editingLog,
                        values: { ...editingLog.values, expectedReturnDate: e.target.value }
                      })}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-emerald-700"
                    />
                  </div>
                </>
              )}

              {editingLog.type === 'discipline' && (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Bentuk Pelanggaran</label>
                    <input
                      type="text"
                      value={editingLog.values.violationType || ''}
                      onChange={(e) => setEditingLog({
                        ...editingLog,
                        values: { ...editingLog.values, violationType: e.target.value }
                      })}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-indigo-700 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tingkat Penilaian</label>
                    <select
                      value={editingLog.values.level || 'Ringan'}
                      onChange={(e) => setEditingLog({
                        ...editingLog,
                        values: { ...editingLog.values, level: e.target.value as any }
                      })}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-indigo-700 bg-white"
                    >
                      <option value="Ringan">Ringan (Denda Diniyah)</option>
                      <option value="Sedang">Sedang (Bakti Sosial)</option>
                      <option value="Berat">Berat (Panggilan Wali / Skorsing)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Sanksi / Wajib Menjalankan</label>
                    <textarea
                      rows={2}
                      value={editingLog.values.consequence || ''}
                      onChange={(e) => setEditingLog({
                        ...editingLog,
                        values: { ...editingLog.values, consequence: e.target.value }
                      })}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-indigo-700 font-medium italic"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Status Sanksi (Pemutihan)</label>
                    <select
                      value={editingLog.values.status || 'Belum Diurus'}
                      onChange={(e) => setEditingLog({
                        ...editingLog,
                        values: { ...editingLog.values, status: e.target.value as any }
                      })}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-indigo-700 bg-white"
                    >
                      <option value="Belum Diurus">Belum Diurus 🔴</option>
                      <option value="Sedang Mengurus">Sedang Mengurus 🟡</option>
                      <option value="Selesai">Selesai (Sudah Diputihkan) 🟢</option>
                    </select>
                  </div>
                </>
              )}

              {editingLog.type === 'health' && (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Keluhan Utama</label>
                    <input
                      type="text"
                      value={editingLog.values.complaint || ''}
                      onChange={(e) => setEditingLog({
                        ...editingLog,
                        values: { ...editingLog.values, complaint: e.target.value }
                      })}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-rose-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Diagnosis Medis</label>
                    <input
                      type="text"
                      value={editingLog.values.diagnosis || ''}
                      onChange={(e) => setEditingLog({
                        ...editingLog,
                        values: { ...editingLog.values, diagnosis: e.target.value }
                      })}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-rose-700 italic font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tindakan / Terapi</label>
                    <input
                      type="text"
                      value={editingLog.values.treatment || ''}
                      onChange={(e) => setEditingLog({
                        ...editingLog,
                        values: { ...editingLog.values, treatment: e.target.value }
                      })}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-rose-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Status Perawatan</label>
                    <select
                      value={editingLog.values.status || 'Rawat Jalan (Kamar)'}
                      onChange={(e) => setEditingLog({
                        ...editingLog,
                        values: { ...editingLog.values, status: e.target.value as any }
                      })}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-rose-700 bg-white font-semibold"
                    >
                      <option value="Rawat Jalan (Kamar)">Rawat Jalan (Kamar)</option>
                      <option value="Nginap di Poskestren">Nginap di Poskestren</option>
                      <option value="Dirujuk ke RS / Pulang">Dirujuk ke RS / Pulang</option>
                    </select>
                  </div>
                </>
              )}

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2 shrink-0 -mx-5 -mb-5 sm:-mx-6 sm:-mb-6 mt-4">
                <button
                  type="button"
                  onClick={() => setEditingLog(null)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-bold transition cursor-pointer text-slate-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold rounded-xl text-xs cursor-pointer shadow-md transition"
                >
                  Simpan Perubahan ✓
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-emerald-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-55">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-emerald-100 text-center space-y-4 my-auto max-h-[88vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 text-red-600">
              <Trash2 className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-900">{confirmDialog.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-semibold">{confirmDialog.message}</p>
            </div>

            {confirmDialog.requireInput && (
              <div className="space-y-2 text-left bg-slate-50 p-3 rounded-xl border border-slate-100">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  Pengamanan Ganda: Masukkan Kata Kunci
                </label>
                <input
                  type="text"
                  value={confirmInputText}
                  onChange={(e) => setConfirmInputText(e.target.value)}
                  placeholder={`Ketik: ${confirmDialog.requireInput}`}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-center focus:outline-none focus:ring-2 focus:ring-red-600 uppercase"
                />
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-xl text-xs transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={confirmDialog.requireInput ? confirmInputText.toUpperCase() !== confirmDialog.requireInput.toUpperCase() : false}
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                }}
                className={`flex-1 px-4 py-2 text-white font-extrabold rounded-xl text-xs transition cursor-pointer shadow-sm ${
                  confirmDialog.requireInput && confirmInputText.toUpperCase() !== confirmDialog.requireInput.toUpperCase()
                    ? 'bg-slate-300 cursor-not-allowed text-slate-400'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
