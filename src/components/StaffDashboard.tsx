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
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Filter,
  ArrowUpRight,
  BarChart3,
  Send,
  RefreshCw,
  FileSpreadsheet,
  Layers,
  Phone,
  Home
} from 'lucide-react';
import { Student, SecurityLog, DisciplineLog, HealthLog, UserSession } from '../types';
import { downloadPrintableHTML, PrintGuideAlert } from './PrintHelper';
import { 
  isSupabaseConfigured, 
  pushAllStudentsToSupabase, 
  pushStaffConfigToSupabase, 
  pushAllStaffUsersToSupabase, 
  pushSettingsToSupabase,
  markLocalDataChanged 
} from '../lib/supabase';
import { recordStaffAuditLog } from '../lib/auditLogger';

const INDONESIAN_MONTHS = [
  { value: '01', name: 'Januari' },
  { value: '02', name: 'Februari' },
  { value: '03', name: 'Maret' },
  { value: '04', name: 'April' },
  { value: '05', name: 'Mei' },
  { value: '06', name: 'Juni' },
  { value: '07', name: 'Juli' },
  { value: '08', name: 'Agustus' },
  { value: '09', name: 'September' },
  { value: '10', name: 'Oktober' },
  { value: '11', name: 'November' },
  { value: '12', name: 'Desember' }
];

const getCityFromAddress = (addr: string) => {
  if (!addr) return 'Jawa Timur';
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
  return parts[0]?.trim() || 'Jawa Timur';
};

interface StaffDashboardProps {
  session: UserSession;
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  onLogout?: () => void;
  activeSubTab: 'students' | 'history' | 'profile' | 'skck' | 'takzir_letter' | 'letters';
  setActiveSubTab: (tab: any) => void;
}

export default function StaffDashboard({ 
  session, 
  students, 
  setStudents, 
  onLogout,
  activeSubTab,
  setActiveSubTab
}: StaffDashboardProps) {
  const role = (session.role as 'keamanan' | 'ketertiban' | 'kesehatan') || 'keamanan';

  // Normalize sub-tabs for backwards compatibility
  const currentTab = React.useMemo(() => {
    if (activeSubTab === 'skck' || activeSubTab === 'takzir_letter' || activeSubTab === 'letters') {
      return 'letters';
    }
    if (activeSubTab === 'history') return 'history';
    if (activeSubTab === 'profile') return 'profile';
    return 'students';
  }, [activeSubTab]);

  const setTab = (tab: 'students' | 'history' | 'letters' | 'profile') => {
    setActiveSubTab(tab);
  };

  const currentMonthNum = String(new Date().getMonth() + 1).padStart(2, '0');
  const currentYearNum = String(new Date().getFullYear());
  const currentMonthName = INDONESIAN_MONTHS.find(m => m.value === currentMonthNum)?.name || 'Bulan Ini';

  // Report Month & Year Filter (defaults to CURRENT active month)
  const [selectedMonth, setSelectedMonth] = React.useState<string>(currentMonthNum);
  const [selectedYear, setSelectedYear] = React.useState<string>(currentYearNum);

  // Portal settings
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
      phone: "(0291) 438291",
      email: "info@alasyariyah.sch.id",
      tagline: "Mencetak Generasi Qur'ani, Berakhlakul Karimah, Unggul, dan Mandiri",
      logoUrl: "/pesantren_logo.jpg"
    };
  }, []);

  const isImageUrl = (str?: string): boolean => {
    if (!str) return false;
    return str.startsWith('http://') || str.startsWith('https://') || str.startsWith('/') || str.startsWith('data:image/');
  };

  // Staff Config / Signatures
  const [deptName, setDeptName] = React.useState('');
  const [deptSignature, setDeptSignature] = React.useState('');
  const [deptSeal, setDeptSeal] = React.useState('');
  const [letterTemplate1, setLetterTemplate1] = React.useState('');
  const [letterTemplate2, setLetterTemplate2] = React.useState('');
  const [letterTemplate3, setLetterTemplate3] = React.useState('');
  const [profileSaveSuccess, setProfileSaveSuccess] = React.useState<string>('');

  // Outbound letters log
  const [outboundLettersLog, setOutboundLettersLog] = React.useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('pesantren_outbound_letters_log');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
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
    return `${seq}/${code}/PP.AM/${roman}/${year}`;
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
    // Record audit log for letter generation
    recordStaffAuditLog({
      actorName: deptName || session.fullName || `Pengurus ${role}`,
      actorRole: role,
      actorEmail: session.email,
      actionType: 'CETAK_SURAT',
      actionTitle: `Penerbitan ${type}`,
      targetName: recipient,
      description: `Menerbitkan dan mencetak ${type} resmi (No: ${letterNo}) untuk ${recipient} dengan perihal: "${subject}"`
    });
    downloadPrintableHTML(elementId, `${type.replace(/\s+/g, '_')}_${recipient.replace(/\s+/g, '_')}`);
  };

  // Role Default Configs
  const roleDefaults = React.useMemo(() => ({
    keamanan: {
      roleTitle: 'Bidang Keamanan (Kamtib)',
      deptLabel: 'Kepala Bidang Keamanan & Pos Penjagaan',
      subTitle: 'Pengawasan Perizinan Santri Keluar / Pulang & Ketertiban Pos',
      color: 'emerald',
      code: 'KMN',
      defaultName: 'Ustadz Junaidi Al-Anshori',
      signature: 'Junaidi',
      seal: '️ STEMPEL KEAMANAN AL-ASY\'ARIYAH',
      letter1Name: 'Surat Izin Keluar Lingkungan (Tidak Bermalam)',
      letter2Name: 'Surat Izin Pulang / Keluar Bermalam (Sambang Keluarga)',
      letter3Name: 'Surat Keterangan Catatan Keamanan / Kelakuan Baik (SKCK)',
      letterTemplate1: 'Dengan ini diberikan izin kepada santri tertera di bawah ini untuk meninggalkan area pondok pesantren dengan rincian jadwal sebagai berikut:',
      letterTemplate2: '* Ketentuan Khusus: Surat izin resmi ini wajib dibawa dan diserahkan kembali kepada petugas pos penjagaan keamanan saat santri tiba di pondok. Keterlambatan akan dikenakan sanksi tata tertib.',
      letterTemplate3: 'Menerangkan bahwa santri bersangkutan berkelakuan baik, mematuhi tata tertib keamanan, dan tidak sedang dalam masa sanksi berat pelanggaran pesantren.'
    },
    ketertiban: {
      roleTitle: 'Bidang Ketertiban & Kedisiplinan',
      deptLabel: 'Kepala Bidang Ketertiban & Ta\'zir Santri',
      subTitle: 'Penegakan Tata Tertib, Penilaian Poin, Ta\'zir & Pemanggilan Wali',
      color: 'indigo',
      code: 'KTT',
      defaultName: 'Ustadz Abdul Somad, S.Sy',
      signature: 'Abdul Somad',
      seal: 'STEMPEL KETERTIBAN AL-ASY\'ARIYAH',
      letter1Name: 'Surat Pemberitahuan Pelanggaran & Instruksi Ta\'zir',
      letter2Name: 'Surat Panggilan Orang Tua / Wali Santri (Bimbingan Khusus)',
      letter3Name: 'Surat Rekam Jejak Kedisiplinan & Pemutihan Sanksi Ta\'zir',
      letterTemplate1: 'Berdasarkan catatan penegakan tata tertib pesantren, telah terbukti melakukan pelanggaran disiplin dan diberikan sanksi edukatif sebagai berikut:',
      letterTemplate2: '* Peringatan Khusus: Apabila pelanggaran berulang atau akumulasi poin kedisiplinan mencapai ambang batas toleransi, santri akan disidangkan dan orang tua/wali wajib hadir ke pesantren.',
      letterTemplate3: 'Demikian lembar instruksi sanksi ta\'zir ini dibuat untuk dilaksanakan dengan penuh kesungguhan dan tanggung jawab demi perbaikan akhlak santri.'
    },
    kesehatan: {
      roleTitle: 'Pos Kesehatan Pesantren (Poskestren)',
      deptLabel: 'Penanggung Jawab Medis Poskestren',
      subTitle: 'Pelayanan Kesehatan Santri, Pengobatan, Rawat Inap & Rujukan Medis',
      color: 'rose',
      code: 'KST',
      defaultName: 'Ustadzah dr. Fatimah Az-Zahra',
      signature: 'dr. Fatimah',
      seal: '🩺 POSKESTREN AL-ASY\'ARIYAH',
      letter1Name: 'Surat Keterangan Sakit & Dispensasi Istirahat Poskestren',
      letter2Name: 'Surat Rujukan Medis Fasilitas Kesehatan / Rumah Sakit',
      letter3Name: 'Surat Rekomendasi Pemulangan Mandiri Santri Sakit',
      letterTemplate1: 'Menerangkan dengan sesungguhnya bahwa santri tertera di bawah ini telah diperiksa kesehatannya di Poskestren dan memerlukan penanganan medis:',
      letterTemplate2: '* Rekomendasi Medis: Diberikan dispensasi untuk beristirahat penuh dari kegiatan pengajian diniyah, sekolah formal, and piket pondok selama masa pemulihan.',
      letterTemplate3: 'Demikian surat keterangan pemeriksaan medis ini dibuat untuk dapat dipergunakan sebagaimana mestinya.'
    }
  }), []);

  const currentRoleInfo = roleDefaults[role] || roleDefaults.keamanan;

  // Load config on mount
  React.useEffect(() => {
    const configKey = `${role}_config`;
    const saved = localStorage.getItem(configKey);
    const userEmail = session?.email || '';
    const customStaffName = userEmail ? localStorage.getItem(`staff_custom_name_${userEmail}`) : null;
    const accountName = customStaffName || (session?.fullName && session.fullName !== 'Muhammad' ? session.fullName : '');

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setDeptName(accountName || parsed.name || currentRoleInfo.defaultName);
        setDeptSignature(parsed.signature || currentRoleInfo.signature);
        setDeptSeal(parsed.seal || currentRoleInfo.seal);
        setLetterTemplate1(parsed.letterTemplate1 || currentRoleInfo.letterTemplate1);
        setLetterTemplate2(parsed.letterTemplate2 || currentRoleInfo.letterTemplate2);
        setLetterTemplate3(parsed.letterTemplate3 || currentRoleInfo.letterTemplate3);
        return;
      } catch (e) {}
    }
    setDeptName(accountName || currentRoleInfo.defaultName);
    setDeptSignature(currentRoleInfo.signature);
    setDeptSeal(currentRoleInfo.seal);
    setLetterTemplate1(currentRoleInfo.letterTemplate1);
    setLetterTemplate2(currentRoleInfo.letterTemplate2);
    setLetterTemplate3(currentRoleInfo.letterTemplate3);
  }, [role, session, currentRoleInfo]);

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
    
    const userEmail = (session?.email || `${role}@alasyariyah.sch.id`).toLowerCase();
    localStorage.setItem('staff_custom_name_' + userEmail, deptName);
    localStorage.setItem('staff_custom_name_' + role, deptName);
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
        if (isSupabaseConfigured()) {
          pushAllStaffUsersToSupabase(updatedStaff).catch(() => {});
        }
        fetch('/api/staff-users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedStaff)
        }).catch(() => {});
      }
    } catch (e) {}

    // Also synchronize directly with pesantren_settings so "Daftar Pengurus" in admin matches 1:1
    try {
      const curSettings = JSON.parse(localStorage.getItem('pesantren_settings') || '{}');
      const updatedSettings = { ...curSettings };
      if (role === 'keamanan') {
        updatedSettings.namaKeamanan = deptName;
        if (deptSignature) updatedSettings.ttdKeamananUrl = deptSignature;
        if (deptSeal) updatedSettings.stempelKeamananUrl = deptSeal;
      } else if (role === 'ketertiban') {
        updatedSettings.namaKetertiban = deptName;
        if (deptSignature) updatedSettings.ttdKetertibanUrl = deptSignature;
        if (deptSeal) updatedSettings.stempelKetertibanUrl = deptSeal;
      } else if (role === 'kesehatan') {
        updatedSettings.namaKesehatan = deptName;
        if (deptSignature) updatedSettings.ttdKesehatanUrl = deptSignature;
        if (deptSeal) updatedSettings.stempelKesehatanUrl = deptSeal;
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

    window.dispatchEvent(new Event('pesantren_staff_users_updated'));
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
    recordStaffAuditLog({
      actorName: deptName || session.fullName || `Pengurus ${role}`,
      actorRole: role,
      actorEmail: session.email,
      actionType: 'UBAH_PROFIL',
      actionTitle: `Pembaruan Profil & Spesimen TTD (${role.toUpperCase()})`,
      description: `Pengurus memperbarui data profil nama pejabat (${deptName}) dan spesimen stempel/tanda tangan digital dinas biro ${role}`
    });
    setProfileSaveSuccess('Profil jabatan dan draf surat berhasil diperbarui serta disinkronkan!');
    setTimeout(() => setProfileSaveSuccess(''), 4000);
  };

  // Persist students helper
  const persistStudents = (updated: Student[]) => {
    setStudents(updated);
    markLocalDataChanged('students');
    try {
      localStorage.setItem('pesantren_students', JSON.stringify(updated));
    } catch (e) {
      console.error("Local storage error:", e);
    }
    fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    }).catch(e => console.warn("Server sync students error:", e));
    if (isSupabaseConfigured()) {
      pushAllStudentsToSupabase(updated).catch(e => console.error("Cloud push students error:", e));
    }
    setTimeout(() => {
      window.dispatchEvent(new Event('pesantren_db_sync'));
    }, 0);
  };

  // ============================================================================
  // STREAMLINED STUDENT INPUT STATE (TIDAK RIBET & HANYA SESUAI JABATAN)
  // ============================================================================
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [selectedStudentForInput, setSelectedStudentForInput] = React.useState<Student | null>(null);
  const [studentSearchKeyword, setStudentSearchKeyword] = React.useState('');
  const [isSearchingStudent, setIsSearchingStudent] = React.useState(false);
  const [sendWhatsAppOnRecord, setSendWhatsAppOnRecord] = React.useState<boolean>(true);
  const [actionSuccessToast, setActionSuccessToast] = React.useState<string>('');

  const triggerToast = (msg: string) => {
    setActionSuccessToast(msg);
    setTimeout(() => setActionSuccessToast(''), 4500);
  };

  // 1. KEAMANAN ONLY FORM FIELDS
  const [secPermitType, setSecPermitType] = React.useState<'Keluar Lingkungan' | 'Pulang (Keluarga)'>('Keluar Lingkungan');
  const [secPermitDesc, setSecPermitDesc] = React.useState('');
  const [secOutDate, setSecOutDate] = React.useState(new Date().toISOString().replace('T', ' ').substring(0, 16));
  const [secExpectedReturn, setSecExpectedReturn] = React.useState('');
  const [secDestination, setSecDestination] = React.useState('');

  // 2. KETERTIBAN ONLY FORM FIELDS
  const [discViolationType, setDiscViolationType] = React.useState('');
  const [discViolationLevel, setDiscViolationLevel] = React.useState<'Ringan' | 'Sedang' | 'Berat'>('Ringan');
  const [discViolationPoints, setDiscViolationPoints] = React.useState(2);
  const [discConsequence, setDiscConsequence] = React.useState('');
  const [discDate, setDiscDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [discStatus, setDiscStatus] = React.useState<'Belum Diurus' | 'Sedang Mengurus' | 'Selesai'>('Belum Diurus');

  // Auto adjust points on level change
  React.useEffect(() => {
    if (discViolationLevel === 'Ringan') setDiscViolationPoints(2);
    else if (discViolationLevel === 'Sedang') setDiscViolationPoints(5);
    else if (discViolationLevel === 'Berat') setDiscViolationPoints(15);
  }, [discViolationLevel]);

  // 3. KESEHATAN ONLY FORM FIELDS
  const [healComplaint, setHealComplaint] = React.useState('');
  const [healDiagnosis, setHealDiagnosis] = React.useState('');
  const [healTreatment, setHealTreatment] = React.useState('');
  const [healStatus, setHealStatus] = React.useState<'Rawat Jalan (Kamar)' | 'Nginap di Poskestren' | 'Dirujuk ke RS / Pulang'>('Rawat Jalan (Kamar)');
  const [healDate, setHealDate] = React.useState(new Date().toISOString().split('T')[0]);

  // Preset quick fill helpers for Keamanan
  const setReturnPreset = (hours: number, days = 0) => {
    const d = new Date();
    if (days > 0) {
      d.setDate(d.getDate() + days);
      d.setHours(17, 0, 0, 0);
    } else {
      d.setHours(d.getHours() + hours);
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    setSecExpectedReturn(`${year}-${month}-${day} ${hh}:${mm}`);
  };

  // Search filtered student list for autocomplete
  const studentAutocompleteResults = React.useMemo(() => {
    const q = studentSearchKeyword.trim().toLowerCase();
    if (!q) return [];
    return students
      .filter(s => {
        if (!s || s.status === 'Alumni') return false;
        const nMatch = s.fullName && s.fullName.toLowerCase().includes(q);
        const nisMatch = s.nis && String(s.nis).toLowerCase().includes(q);
        const kMatch = s.kamar && s.kamar.toLowerCase().includes(q);
        return Boolean(nMatch || nisMatch || kMatch);
      })
      .slice(0, 8);
  }, [students, studentSearchKeyword]);

  // Reset form
  const resetFormFields = () => {
    setSelectedStudentForInput(null);
    setStudentSearchKeyword('');
    setIsSearchingStudent(false);
    
    // Keamanan
    setSecPermitType('Keluar Lingkungan');
    setSecPermitDesc('');
    setSecDestination('');
    setSecOutDate(new Date().toISOString().replace('T', ' ').substring(0, 16));
    setSecExpectedReturn('');

    // Ketertiban
    setDiscViolationType('');
    setDiscViolationLevel('Ringan');
    setDiscViolationPoints(2);
    setDiscConsequence('');
    setDiscDate(new Date().toISOString().split('T')[0]);
    setDiscStatus('Belum Diurus');

    // Kesehatan
    setHealComplaint('');
    setHealDiagnosis('');
    setHealTreatment('');
    setHealStatus('Rawat Jalan (Kamar)');
    setHealDate(new Date().toISOString().split('T')[0]);
  };

  // Open input modal with optional preselected student
  const openInputModal = (student?: Student) => {
    resetFormFields();
    if (student) {
      setSelectedStudentForInput(student);
    }
    // Set default expected return for Keamanan (+3 hours)
    if (role === 'keamanan') {
      setReturnPreset(3);
    }
    setShowAddModal(true);
  };

  // Submit record according to STRICT JABATAN
  const handleSaveRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentForInput) {
      alert('Silakan pilih data santri terlebih dahulu.');
      return;
    }

    const targetStudent = selectedStudentForInput;
    let successMessage = '';
    let waMsg = '';
    const schoolName = pesantrenSettings.schoolName || "Pondok Pesantren Al-Asy'ariyah";

    const updatedStudents = students.map(s => {
      if (s.id !== targetStudent.id) return s;

      if (role === 'keamanan') {
        const newSec: SecurityLog = {
          id: `sec-${Date.now()}`,
          studentId: s.id,
          studentName: s.fullName,
          permitType: secPermitType,
          description: secPermitDesc || (secPermitType === 'Pulang (Keluarga)' ? 'Kepentingan Keluarga' : 'Izin Keluar Lingkungan'),
          outDate: secOutDate || new Date().toISOString().replace('T', ' ').substring(0, 16),
          expectedReturnDate: secExpectedReturn || new Date().toISOString().replace('T', ' ').substring(0, 16),
          status: 'Aktif / Keluar',
          signedBy: deptName || currentRoleInfo.defaultName
        };

        successMessage = `Surat Izin ${secPermitType} untuk santri ${s.fullName} berhasil dicatat & aktif!`;
        waMsg = `Assalamu'alaikum Wr. Wb. Yth. Bapak/Ibu Wali dari *${s.fullName}* (NIS: ${s.nis || '-'}),\n\nKami menginformasikan bahwa ananda telah diberikan Surat Izin (${secPermitType}) oleh Pengurus Keamanan *${schoolName}*:\n\n*Keperluan/Tujuan:* ${secPermitDesc || '-'}\n*Waktu Keluar:* ${secOutDate}\n⏰ *Batas Waktu Kembali:* ${secExpectedReturn}\n\nMohon bantuannya untuk memastikan ananda tiba kembali di pesantren tepat pada waktunya.\n\nWassalamu'alaikum Wr. Wb.\n_Pengurus Keamanan & Penjagaan ${schoolName}_`;

        recordStaffAuditLog({
          actorName: deptName || session.fullName || 'Petugas Keamanan',
          actorRole: 'keamanan',
          actorEmail: session.email,
          actionType: 'TAMBAH_IZIN',
          actionTitle: `Penerbitan Surat Izin ${secPermitType}`,
          targetName: s.fullName,
          targetId: s.id,
          description: `Menerbitkan surat izin (${secPermitType}) untuk ${s.fullName}. Keperluan: "${secPermitDesc || '-'}", Keluar: ${secOutDate}, Batas Kembali: ${secExpectedReturn}`
        });

        return {
          ...s,
          securityLogs: [newSec, ...(s.securityLogs || [])]
        };
      }

      if (role === 'ketertiban') {
        const newDisc: DisciplineLog = {
          id: `disc-${Date.now()}`,
          studentId: s.id,
          studentName: s.fullName,
          violationType: discViolationType || 'Pelanggaran Disiplin',
          level: discViolationLevel,
          points: Number(discViolationPoints) || 2,
          consequence: discConsequence || 'Bimbingan tata tertib pesantren',
          date: discDate || new Date().toISOString().split('T')[0],
          signedBy: deptName || currentRoleInfo.defaultName,
          status: discStatus
        };

        successMessage = `Catatan pelanggaran ${discViolationLevel} (${discViolationPoints} Poin) untuk ${s.fullName} berhasil dicatat!`;
        waMsg = `Assalamu'alaikum Wr. Wb. Yth. Bapak/Ibu Wali dari *${s.fullName}* (NIS: ${s.nis || '-'}),\n\nKami menyampaikan catatan pembinaan kedisiplinan santri dari Bidang Ketertiban *${schoolName}*:\n\n*Bentuk Pelanggaran:* ${discViolationType}\n️ *Tingkat/Poin:* ${discViolationLevel} (${discViolationPoints} Poin)\n️ *Bentuk Sanksi/Ta'zir:* ${discConsequence || '-'}\n*Tanggal:* ${discDate}\n\nMohon doa dan kerja sama bapak/ibu wali santri untuk terus membina ananda agar selalu berakhlakul karimah.\n\nWassalamu'alaikum Wr. Wb.\n_Pengurus Ketertiban & Kedisiplinan ${schoolName}_`;

        recordStaffAuditLog({
          actorName: deptName || session.fullName || 'Petugas Ketertiban',
          actorRole: 'ketertiban',
          actorEmail: session.email,
          actionType: 'TAMBAH_PELANGGARAN',
          actionTitle: `Pencatatan Pelanggaran (${discViolationLevel} - ${discViolationPoints} Poin)`,
          targetName: s.fullName,
          targetId: s.id,
          description: `Mencatat pelanggaran untuk santri ${s.fullName}: "${discViolationType}", Tingkat: ${discViolationLevel} (${discViolationPoints} poin), Sanksi: "${discConsequence || '-'}", Status: ${discStatus}`
        });

        return {
          ...s,
          disciplineLogs: [newDisc, ...(s.disciplineLogs || [])]
        };
      }

      if (role === 'kesehatan') {
        const newHeal: HealthLog = {
          id: `heal-${Date.now()}`,
          studentId: s.id,
          studentName: s.fullName,
          complaint: healComplaint || 'Pemeriksaan Kesehatan',
          diagnosis: healDiagnosis || 'Pemeriksaan Medis Rutin',
          treatment: healTreatment || 'Perawatan Medis',
          status: healStatus,
          date: healDate || new Date().toISOString().split('T')[0],
          signedBy: deptName || currentRoleInfo.defaultName
        };

        successMessage = `Catatan rekam medis untuk santri ${s.fullName} berhasil disimpan!`;
        waMsg = `Assalamu'alaikum Wr. Wb. Yth. Bapak/Ibu Wali dari *${s.fullName}* (NIS: ${s.nis || '-'}),\n\nKami menginformasikan kondisi kesehatan ananda yang telah diperiksa di Poskestren *${schoolName}*:\n\n🩺 *Keluhan:* ${healComplaint}\n*Diagnosa:* ${healDiagnosis}\n*Tindakan/Obat:* ${healTreatment}\n*Status Perawatan:* ${healStatus}\n\nSaat ini ananda dalam pengawasan tim medis poskestren. Mohon sambung doa untuk kesembuhan ananda.\n\nWassalamu'alaikum Wr. Wb.\n_Tim Medis Poskestren ${schoolName}_`;

        recordStaffAuditLog({
          actorName: deptName || session.fullName || 'Petugas Kesehatan',
          actorRole: 'kesehatan',
          actorEmail: session.email,
          actionType: 'INPUT_REKAM_MEDIS',
          actionTitle: 'Pencatatan Rekam Medis Poskestren',
          targetName: s.fullName,
          targetId: s.id,
          description: `Mencatat rekam medis santri ${s.fullName}. Keluhan: "${healComplaint}", Diagnosa: "${healDiagnosis}", Tindakan/Obat: "${healTreatment}", Status: ${healStatus}`
        });

        return {
          ...s,
          healthLogs: [newHeal, ...(s.healthLogs || [])]
        };
      }

      return s;
    });

    persistStudents(updatedStudents);

    // Send WhatsApp notification if enabled
    if (sendWhatsAppOnRecord && targetStudent.parentPhone && waMsg) {
      const rawPhone = targetStudent.parentPhone.replace(/[^0-9]/g, '');
      const cleanPhone = rawPhone.startsWith('0') ? '62' + rawPhone.slice(1) : rawPhone.startsWith('62') ? rawPhone : '62' + rawPhone;
      fetch('/api/send-wa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: cleanPhone, message: waMsg })
      }).catch(err => console.warn('Auto-WA staff dispatch skipped:', err));
    }

    setShowAddModal(false);
    resetFormFields();
    triggerToast(successMessage);
  };

  // Quick Action: Keamanan mark return / late
  const handleUpdateReturnStatus = (studentId: string, logId: string, isLate: boolean) => {
    let studentName = '';
    const updated = students.map(s => {
      if (s.id !== studentId) return s;
      studentName = s.fullName;
      let discLogs = s.disciplineLogs || [];
      const secLogs = (s.securityLogs || []).map(log => {
        if (log.id !== logId) return log;
        if (isLate) {
          const autoDisc: DisciplineLog = {
            id: `disc-auto-${Date.now()}`,
            studentId: s.id,
            studentName: s.fullName,
            violationType: `Keterlambatan Kembali Izin (${log.permitType})`,
            level: 'Sedang',
            points: 5,
            consequence: "Ta'zir kedisiplinan keterlambatan (Piket pos penjagaan / sanksi edukatif)",
            date: new Date().toISOString().split('T')[0],
            signedBy: deptName || currentRoleInfo.defaultName,
            status: 'Belum Diurus'
          };
          discLogs = [autoDisc, ...discLogs];
        }
        return {
          ...log,
          status: isLate ? 'Terlambat' as const : 'Kembali' as const,
          actualReturnDate: new Date().toISOString().replace('T', ' ').substring(0, 16)
        };
      });
      return { ...s, securityLogs: secLogs, disciplineLogs: discLogs };
    });

    persistStudents(updated);

    recordStaffAuditLog({
      actorName: deptName || session.fullName || 'Petugas Keamanan',
      actorRole: 'keamanan',
      actorEmail: session.email,
      actionType: 'UPDATE_KEPULANGAN',
      actionTitle: isLate ? 'Status Terlambat Kembali (Kena Ta\'zir)' : 'Status Kembali Tepat Waktu',
      targetName: studentName,
      targetId: studentId,
      description: isLate
        ? `Menandai santri ${studentName} TERLAMBAT kembali ke pondok dan otomatis mengenakan 5 poin sanksi ta'zir kedisiplinan`
        : `Mengonfirmasi santri ${studentName} telah KEMBALI ke pondok pesantren tepat waktu`
    });

    triggerToast(isLate 
      ? `Santri ${studentName} ditandai TERLAMBAT dan dikenakan sanksi ta'zir kedisiplinan.`
      : `Santri ${studentName} dikonfirmasi telah KEMBALI di pesantren tepat waktu.`
    );
  };

  // Quick Action: Ketertiban change sanction status
  const handleUpdateDisciplineStatus = (studentId: string, logId: string, newStatus: 'Belum Diurus' | 'Sedang Mengurus' | 'Selesai') => {
    let studentName = '';
    const updated = students.map(s => {
      if (s.id !== studentId) return s;
      studentName = s.fullName;
      const discLogs = (s.disciplineLogs || []).map(log => {
        if (log.id !== logId) return log;
        return { ...log, status: newStatus };
      });
      return { ...s, disciplineLogs: discLogs };
    });
    persistStudents(updated);

    recordStaffAuditLog({
      actorName: deptName || session.fullName || 'Petugas Ketertiban',
      actorRole: 'ketertiban',
      actorEmail: session.email,
      actionType: 'STATUS_TAZIR',
      actionTitle: `Update Status Ta'zir (${newStatus})`,
      targetName: studentName,
      targetId: studentId,
      description: `Mengubah status penanganan sanksi ta'zir santri ${studentName} menjadi: "${newStatus}"`
    });

    triggerToast(`Status sanksi ta'zir diperbarui menjadi: ${newStatus}`);
  };

  // Quick Action: Kesehatan change recovery status
  const handleUpdateHealthStatus = (studentId: string, logId: string, newStatus: any) => {
    let studentName = '';
    const updated = students.map(s => {
      if (s.id !== studentId) return s;
      studentName = s.fullName;
      const healLogs = (s.healthLogs || []).map(log => {
        if (log.id !== logId) return log;
        return { ...log, status: newStatus };
      });
      return { ...s, healthLogs: healLogs };
    });
    persistStudents(updated);

    recordStaffAuditLog({
      actorName: deptName || session.fullName || 'Petugas Kesehatan',
      actorRole: 'kesehatan',
      actorEmail: session.email,
      actionType: 'STATUS_RAWAT',
      actionTitle: `Update Status Perawatan Medis (${newStatus})`,
      targetName: studentName,
      targetId: studentId,
      description: `Mengubah status rawat medis santri ${studentName} menjadi: "${newStatus}"`
    });

    triggerToast(`Status perawatan santri diperbarui menjadi: ${newStatus}`);
  };

  // Delete Log with confirmation
  const [deleteConfirmTarget, setDeleteConfirmTarget] = React.useState<{ id: string; studentId: string; type: 'security' | 'discipline' | 'health' } | null>(null);

  const executeDeleteLog = () => {
    if (!deleteConfirmTarget) return;
    const { id, studentId, type } = deleteConfirmTarget;
    let targetName = '';
    const updated = students.map(s => {
      if (s.id !== studentId) return s;
      targetName = s.fullName;
      if (type === 'security') {
        return { ...s, securityLogs: (s.securityLogs || []).filter(l => l.id !== id) };
      }
      if (type === 'discipline') {
        return { ...s, disciplineLogs: (s.disciplineLogs || []).filter(l => l.id !== id) };
      }
      return { ...s, healthLogs: (s.healthLogs || []).filter(l => l.id !== id) };
    });
    persistStudents(updated);

    recordStaffAuditLog({
      actorName: deptName || session.fullName || `Petugas ${role}`,
      actorRole: role,
      actorEmail: session.email,
      actionType: 'HAPUS_DATA',
      actionTitle: `Hapus Catatan ${type === 'security' ? 'Perizinan' : type === 'discipline' ? 'Pelanggaran' : 'Kesehatan'}`,
      targetName,
      targetId: studentId,
      description: `Menghapus 1 entri catatan riwayat ${type} santri ${targetName}`
    });

    setDeleteConfirmTarget(null);
    triggerToast('Data riwayat berhasil dihapus.');
  };

  // Print popup states
  const [printSecurityTarget, setPrintSecurityTarget] = React.useState<SecurityLog | null>(null);
  const [printDisciplineTarget, setPrintDisciplineTarget] = React.useState<DisciplineLog | null>(null);
  const [printHealthTarget, setPrintHealthTarget] = React.useState<HealthLog | null>(null);

  // Month-filtered logs for the current role
  const allLogsForRole = React.useMemo(() => {
    const result: Array<{
      id: string;
      studentId: string;
      studentName: string;
      student?: Student;
      date: string;
      typeLabel: string;
      desc: string;
      status: string;
      points?: number;
      raw: any;
    }> = [];

    students.forEach(s => {
      if (role === 'keamanan' && s.securityLogs) {
        s.securityLogs.forEach(l => {
          const logDate = l.outDate ? l.outDate.split(' ')[0] : (l.actualReturnDate ? l.actualReturnDate.split(' ')[0] : '');
          result.push({
            id: l.id,
            studentId: s.id,
            studentName: s.fullName,
            student: s,
            date: logDate,
            typeLabel: l.permitType,
            desc: l.description,
            status: l.status,
            raw: l
          });
        });
      } else if (role === 'ketertiban' && s.disciplineLogs) {
        s.disciplineLogs.forEach(l => {
          result.push({
            id: l.id,
            studentId: s.id,
            studentName: s.fullName,
            student: s,
            date: l.date,
            typeLabel: `${l.level} (${l.points} Pts)`,
            desc: `${l.violationType} - Sanksi: ${l.consequence}`,
            status: l.status,
            points: l.points,
            raw: l
          });
        });
      } else if (role === 'kesehatan' && s.healthLogs) {
        s.healthLogs.forEach(l => {
          result.push({
            id: l.id,
            studentId: s.id,
            studentName: s.fullName,
            student: s,
            date: l.date,
            typeLabel: l.status,
            desc: `Keluhan: ${l.complaint} | Diagnosa: ${l.diagnosis} | Terapi: ${l.treatment}`,
            status: l.status,
            raw: l
          });
        });
      }
    });

    // Sort by id / date descending
    result.sort((a, b) => b.id.localeCompare(a.id));
    return result;
  }, [students, role]);

  // Current Month Logs (for dashboard initial view & early month refresh)
  const currentMonthLogs = React.useMemo(() => {
    const prefix = `${currentYearNum}-${currentMonthNum}`;
    return allLogsForRole.filter(l => l.date && l.date.startsWith(prefix));
  }, [allLogsForRole, currentYearNum, currentMonthNum]);

  // Selected Month Report Logs
  const selectedMonthLogs = React.useMemo(() => {
    if (selectedMonth === 'ALL') {
      if (selectedYear === 'ALL') return allLogsForRole;
      return allLogsForRole.filter(l => l.date && l.date.startsWith(selectedYear));
    }
    const prefix = `${selectedYear}-${selectedMonth}`;
    return allLogsForRole.filter(l => l.date && l.date.startsWith(prefix));
  }, [allLogsForRole, selectedMonth, selectedYear]);

  // Active / Urgent Cases requiring attention
  const activeCasesForRole = React.useMemo(() => {
    if (role === 'keamanan') {
      // Santri currently out
      return allLogsForRole.filter(l => l.status === 'Aktif / Keluar' || l.status === 'Terlambat');
    }
    if (role === 'ketertiban') {
      // Santri with unresolved violations
      return allLogsForRole.filter(l => l.status === 'Belum Diurus' || l.status === 'Sedang Mengurus');
    }
    // Kesehatan: Santri currently being treated
    return allLogsForRole.filter(l => l.status === 'Rawat Jalan (Kamar)' || l.status === 'Nginap di Poskestren');
  }, [allLogsForRole, role]);

  // General search term on Dashboard student list
  const [dashSearchTerm, setDashSearchTerm] = React.useState('');
  const filteredStudentsForDash = React.useMemo(() => {
    const q = dashSearchTerm.trim().toLowerCase();
    if (!q) return [];
    return students.filter(s => {
      if (!s || s.status === 'Alumni') return false;
      const nMatch = s.fullName && s.fullName.toLowerCase().includes(q);
      const nisMatch = s.nis && String(s.nis).toLowerCase().includes(q);
      const kMatch = s.kamar && s.kamar.toLowerCase().includes(q);
      const cMatch = s.class && s.class.toLowerCase().includes(q);
      return Boolean(nMatch || nisMatch || kMatch || cMatch);
    });
  }, [students, dashSearchTerm]);

  // Selected student for detail preview
  const [previewStudent, setPreviewStudent] = React.useState<Student | null>(null);

  return (
    <div className="min-h-screen bg-slate-50/70 font-sans pb-16">
      
      {/* Toast Notification */}
      {actionSuccessToast && (
        <div className="fixed top-20 right-4 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2.5 text-xs animate-fade-in font-medium">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{actionSuccessToast}</span>
        </div>
      )}

      {/* TOP ROLE HEADER & TAB NAVIGATION */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-950 to-slate-950 text-white border-b border-emerald-950/60 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            <div className="flex items-center gap-3.5">
              <div className="h-12 w-12 rounded-2xl bg-emerald-800/80 border border-emerald-500/30 flex items-center justify-center text-amber-300 shadow-inner shrink-0">
                {role === 'keamanan' && <Shield className="h-6 w-6" />}
                {role === 'ketertiban' && <AlertTriangle className="h-6 w-6" />}
                {role === 'kesehatan' && <Heart className="h-6 w-6" />}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-base sm:text-lg font-black tracking-wide text-white uppercase font-sans">
                    {currentRoleInfo.roleTitle}
                  </h1>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-black uppercase">
                    KODE: {currentRoleInfo.code}
                  </span>
                </div>
                <p className="text-xs text-emerald-200/90 font-medium mt-0.5">
                  Berkhidmah: <strong className="text-amber-200 font-bold">{deptName || currentRoleInfo.defaultName}</strong> • {currentRoleInfo.subTitle}
                </p>
              </div>
            </div>

            {/* Quick Action Button */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openInputModal()}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>
                  {role === 'keamanan' && 'Input Izin Keluar'}
                  {role === 'ketertiban' && 'Input Catatan Takzir'}
                  {role === 'kesehatan' && 'Input Catatan Medis'}
                </span>
              </button>
            </div>
          </div>

          {/* Sub-Tabs Bar */}
          <div className="flex items-center gap-1 mt-6 border-b border-emerald-800/60 overflow-x-auto text-xs font-bold no-scrollbar">
            <button
              type="button"
              onClick={() => setTab('students')}
              className={`px-4 py-2.5 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                currentTab === 'students'
                  ? 'border-amber-400 text-amber-300 font-black bg-white/5'
                  : 'border-transparent text-emerald-100/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <Activity className="h-4 w-4" />
              <span>Dashboard & Input Santri</span>
            </button>

            <button
              type="button"
              onClick={() => setTab('history')}
              className={`px-4 py-2.5 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                currentTab === 'history'
                  ? 'border-amber-400 text-amber-300 font-black bg-white/5'
                  : 'border-transparent text-emerald-100/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Riwayat & Laporan Bulanan</span>
              {currentMonthLogs.length > 0 && (
                <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-700 text-white font-mono font-bold">
                  {currentMonthLogs.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setTab('letters')}
              className={`px-4 py-2.5 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                currentTab === 'letters'
                  ? 'border-amber-400 text-amber-300 font-black bg-white/5'
                  : 'border-transparent text-emerald-100/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <Printer className="h-4 w-4" />
              <span>Penerbitan & Draf Surat</span>
            </button>

            <button
              type="button"
              onClick={() => setTab('profile')}
              className={`px-4 py-2.5 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                currentTab === 'profile'
                  ? 'border-amber-400 text-amber-300 font-black bg-white/5'
                  : 'border-transparent text-emerald-100/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <Signature className="h-4 w-4" />
              <span>Profil & TTD Jabatan</span>
            </button>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">

        {/* ========================================================================= */}
        {/* TAB 1: DASHBOARD UTAMA & MONITORING AKTIF                                  */}
        {/* ========================================================================= */}
        {currentTab === 'students' && (
          <div className="space-y-6 animate-fade-in">

            {/* Monthly Reset Banner / Indicator */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0 border border-emerald-100">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-mono font-bold text-slate-400">Periode Operasional Berjalan</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold">Auto-Refresh Awal Bulan</span>
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Bulan {currentMonthName} {currentYearNum}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <span>Total Santri Aktif Pesantren: <strong className="text-slate-900 font-bold">{students.filter(s => s.status !== 'Alumni').length}</strong> Santri</span>
                <button
                  type="button"
                  onClick={() => openInputModal()}
                  className="ml-2 px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Input Data Santri</span>
                </button>
              </div>
            </div>

            {/* 4 SUMMARY METRIC CARDS (ROLE-SPECIFIC, ZERO-PILL DISCIPLINE) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              
              {/* Card 1 */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  {role === 'keamanan' && 'Santri Sedang di Luar'}
                  {role === 'ketertiban' && 'Pelanggaran Belum Diurus'}
                  {role === 'kesehatan' && 'Sedang Rawat / Sakit'}
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
                    {activeCasesForRole.length}
                  </span>
                  <span className="text-[11px] text-amber-700 font-bold">Aktif Dipantau</span>
                </div>
                <p className="mt-1 text-[10px] text-slate-400">
                  {role === 'keamanan' && 'Memerlukan pengecekan saat kembali'}
                  {role === 'ketertiban' && 'Menunggu penyelesaian sanksi ta\'zir'}
                  {role === 'kesehatan' && 'Dalam pengawasan medis poskestren'}
                </p>
              </div>

              {/* Card 2 */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  {role === 'keamanan' && `Izin Keluar (${currentMonthName})`}
                  {role === 'ketertiban' && `Kasus (${currentMonthName})`}
                  {role === 'kesehatan' && `Kunjungan (${currentMonthName})`}
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-emerald-800 font-mono">
                    {currentMonthLogs.length}
                  </span>
                  <span className="text-[11px] text-emerald-700 font-bold">Bulan Ini</span>
                </div>
                <p className="mt-1 text-[10px] text-slate-400">
                  Total tercatat periode {currentMonthName} {currentYearNum}
                </p>
              </div>

              {/* Card 3 */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  {role === 'keamanan' && 'Terlambat Kembali'}
                  {role === 'ketertiban' && 'Akumulasi Poin Bulan Ini'}
                  {role === 'kesehatan' && 'Opname / Rawat Inap'}
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-rose-800 font-mono">
                    {role === 'keamanan' && allLogsForRole.filter(l => l.status === 'Terlambat').length}
                    {role === 'ketertiban' && currentMonthLogs.reduce((sum, l) => sum + (l.points || 0), 0)}
                    {role === 'kesehatan' && allLogsForRole.filter(l => l.status === 'Nginap di Poskestren').length}
                  </span>
                  <span className="text-[11px] text-rose-700 font-bold">
                    {role === 'ketertiban' ? 'Poin' : 'Perlu Tindakan'}
                  </span>
                </div>
                <p className="mt-1 text-[10px] text-slate-400">
                  {role === 'keamanan' && 'Telah lewat batas waktu kembali'}
                  {role === 'ketertiban' && 'Total bobot pelanggaran bulan ini'}
                  {role === 'kesehatan' && 'Santri menginap di pos kesehatan'}
                </p>
              </div>

              {/* Card 4 */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  {role === 'keamanan' && 'Selesai Tepat Waktu'}
                  {role === 'ketertiban' && 'Ta\'zir Telah Diputihkan'}
                  {role === 'kesehatan' && 'Sembuh & Selesai'}
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
                    {role === 'keamanan' && allLogsForRole.filter(l => l.status === 'Kembali').length}
                    {role === 'ketertiban' && allLogsForRole.filter(l => l.status === 'Selesai').length}
                    {role === 'kesehatan' && allLogsForRole.filter(l => l.status === 'Rawat Jalan (Kamar)' || l.status === 'Dirujuk ke RS / Pulang').length}
                  </span>
                  <span className="text-[11px] text-slate-600 font-bold">Total Selesai</span>
                </div>
                <p className="mt-1 text-[10px] text-slate-400">
                  {role === 'keamanan' && 'Telah kembali ke pondok'}
                  {role === 'ketertiban' && 'Sanksi tuntas dilaksanakan'}
                  {role === 'kesehatan' && 'Santri telah kembali belajar'}
                </p>
              </div>
            </div>

            {/* TABEL 1: KASUS AKTIF / MEMERLUKAN PERHATIAN SEGERA */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                    <span>
                      {role === 'keamanan' && 'Daftar Santri Sedang Izin Keluar (Perlu Kontrol Pos)'}
                      {role === 'ketertiban' && 'Daftar Sanksi Ta\'zir Aktif yang Belum Selesai'}
                      {role === 'kesehatan' && 'Daftar Santri dalam Perawatan Poskestren'}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Data dipantau langsung untuk ketertiban dan akuntabilitas kepengurusan pesantren.
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-slate-600">
                  Total: {activeCasesForRole.length} Santri
                </span>
              </div>

              {activeCasesForRole.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                  <p className="font-bold text-slate-700">Alhamdulillah, tidak ada santri yang berstatus aktif/tertunggak.</p>
                  <p className="text-[11px] mt-1">Semua data santri dalam kondisi tertib dan telah terselesaikan.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider bg-slate-50/70 text-[10px]">
                        <th className="py-3 px-4">Nama Santri & NIS</th>
                        <th className="py-3 px-4">Kamar / Kelas</th>
                        <th className="py-3 px-4">
                          {role === 'keamanan' && 'Jenis & Keperluan Izin'}
                          {role === 'ketertiban' && 'Pelanggaran & Ta\'zir'}
                          {role === 'kesehatan' && 'Keluhan & Diagnosa'}
                        </th>
                        <th className="py-3 px-4">
                          {role === 'keamanan' && 'Waktu Keluar / Batas Kembali'}
                          {role === 'ketertiban' && 'Tanggal / Poin Ta\'zir'}
                          {role === 'kesehatan' && 'Tanggal & Rekomendasi'}
                        </th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-right">Aksi Cepat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeCasesForRole.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4">
                            <strong className="text-slate-900 block font-bold">{item.studentName}</strong>
                            <span className="text-[10px] font-mono text-emerald-800 font-bold">NIS: {item.student?.nis || '-'}</span>
                          </td>
                          <td className="py-3 px-4 text-slate-600 font-medium">
                            <div>{item.student?.kamar || 'Kamar -'}</div>
                            <div className="text-[10px] text-slate-400">{item.student?.class || '-'}</div>
                          </td>
                          <td className="py-3 px-4 max-w-xs">
                            <span className="font-bold text-slate-800 block text-[11px]">{item.typeLabel}</span>
                            <span className="text-[11px] text-slate-500 line-clamp-2">{item.desc}</span>
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px]">
                            {role === 'keamanan' ? (
                              <div>
                                <div className="text-slate-500">Keluar: {item.raw?.outDate}</div>
                                <div className="font-bold text-rose-700">Kembali: {item.raw?.expectedReturnDate}</div>
                              </div>
                            ) : (
                              <div>
                                <div className="text-slate-900 font-bold">{item.date}</div>
                                {item.points && <div className="text-rose-700 font-bold">{item.points} Poin Sanksi</div>}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.status === 'Terlambat' ? 'bg-rose-100 text-rose-800' :
                              item.status === 'Aktif / Keluar' ? 'bg-amber-100 text-amber-900' :
                              item.status === 'Belum Diurus' ? 'bg-rose-100 text-rose-800' :
                              item.status === 'Sedang Mengurus' ? 'bg-blue-100 text-blue-900' :
                              'bg-emerald-100 text-emerald-900'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Keamanan quick action */}
                              {role === 'keamanan' && item.status === 'Aktif / Keluar' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateReturnStatus(item.studentId, item.id, false)}
                                    className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[10px] font-bold cursor-pointer transition shadow-xs"
                                    title="Santri sudah tiba di pondok tepat waktu"
                                  >
                                    Kembali Tepat Waktu
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateReturnStatus(item.studentId, item.id, true)}
                                    className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold cursor-pointer transition shadow-xs"
                                    title="Santri terlambat dari batas waktu izin"
                                  >
                                    Terlambat
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setPrintSecurityTarget(item.raw)}
                                    className="p-1 hover:bg-slate-100 rounded text-slate-600 cursor-pointer"
                                    title="Cetak Slip Izin"
                                  >
                                    <Printer className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              )}

                              {/* Ketertiban quick action */}
                              {role === 'ketertiban' && (
                                <>
                                  <select
                                    value={item.status}
                                    onChange={(e) => handleUpdateDisciplineStatus(item.studentId, item.id, e.target.value as any)}
                                    className="px-2 py-1 text-[10px] font-bold border border-slate-200 rounded-lg bg-white text-slate-800 cursor-pointer"
                                  >
                                    <option value="Belum Diurus">Belum Diurus</option>
                                    <option value="Sedang Mengurus">Sedang Mengurus</option>
                                    <option value="Selesai">Selesai (Pemutihan)</option>
                                  </select>
                                  <button
                                    type="button"
                                    onClick={() => setPrintDisciplineTarget(item.raw)}
                                    className="p-1 hover:bg-slate-100 rounded text-slate-600 cursor-pointer"
                                    title="Cetak Surat Sanksi Ta'zir"
                                  >
                                    <Printer className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              )}

                              {/* Kesehatan quick action */}
                              {role === 'kesehatan' && (
                                <>
                                  <select
                                    value={item.status}
                                    onChange={(e) => handleUpdateHealthStatus(item.studentId, item.id, e.target.value)}
                                    className="px-2 py-1 text-[10px] font-bold border border-slate-200 rounded-lg bg-white text-slate-800 cursor-pointer"
                                  >
                                    <option value="Rawat Jalan (Kamar)">Rawat Jalan (Kamar)</option>
                                    <option value="Nginap di Poskestren">Opname Poskestren</option>
                                    <option value="Dirujuk ke RS / Pulang">Dirujuk RS / Pulang</option>
                                  </select>
                                  <button
                                    type="button"
                                    onClick={() => setPrintHealthTarget(item.raw)}
                                    className="p-1 hover:bg-slate-100 rounded text-slate-600 cursor-pointer"
                                    title="Cetak Surat Keterangan Sakit"
                                  >
                                    <Printer className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* PENCARIAN & INPUT CEPAT SANTRI */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-emerald-800" />
                    <span>Cari Santri untuk Input Data Baru</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Cari santri berdasarkan Nama, NIS, Kamar, atau Kelas untuk membuka formulir input instan.
                  </p>
                </div>

                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Ketik Nama, NIS, atau Kamar..."
                    value={dashSearchTerm}
                    onChange={(e) => setDashSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-700 bg-slate-50/50"
                  />
                  {dashSearchTerm && (
                    <button
                      type="button"
                      onClick={() => setDashSearchTerm('')}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {!dashSearchTerm.trim() ? (
                <div className="p-6 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 text-center">
                  <Search className="h-6 w-6 text-slate-400 mx-auto mb-1.5" />
                  <p className="text-xs font-bold text-slate-700">Ketik Nama atau NIS Santri di Kolom Pencarian</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Hanya menampilkan data yang relevan agar halaman tetap ringan dan cepat.
                  </p>
                  <button
                    type="button"
                    onClick={() => openInputModal()}
                    className="mt-3 px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Atau Buka Modal Input Langsung</span>
                  </button>
                </div>
              ) : filteredStudentsForDash.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs bg-rose-50/30 rounded-xl border border-dashed border-rose-200">
                  <p className="font-bold text-rose-800">Santri tidak ditemukan</p>
                  <p className="text-[11px] mt-0.5">Tidak ada kecocokan dengan kueri "{dashSearchTerm}".</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredStudentsForDash.slice(0, 12).map(std => {
                    const secCount = (std.securityLogs || []).length;
                    const discCount = (std.disciplineLogs || []).length;
                    const pts = (std.disciplineLogs || []).reduce((sum, d) => sum + d.points, 0);
                    const healCount = (std.healthLogs || []).length;

                    return (
                      <div key={std.id} className="p-3.5 rounded-xl border border-slate-200 hover:border-emerald-300 hover:shadow-xs transition bg-white flex flex-col justify-between gap-3">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <strong className="text-xs font-bold text-slate-900 block">{std.fullName}</strong>
                              <span className="text-[10px] font-mono text-emerald-800 font-bold">NIS: {std.nis || '-'}</span>
                            </div>
                            <span className="text-[9px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">
                              {std.kamar || 'Kamar -'}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-1">
                            Kelas: {std.class || '-'} • Wali: {std.parentName || '-'}
                          </div>

                          {/* Quick summary for role */}
                          <div className="mt-2 pt-2 border-t border-dashed border-slate-100 flex items-center gap-2 text-[10px] text-slate-600">
                            {role === 'keamanan' && (
                              <span>Total Izin Keluar: <strong className="text-slate-900">{secCount} kali</strong></span>
                            )}
                            {role === 'ketertiban' && (
                              <span>Total Pelanggaran: <strong className={pts > 10 ? 'text-rose-700 font-bold' : 'text-slate-900'}>{discCount} ({pts} Pts)</strong></span>
                            )}
                            {role === 'kesehatan' && (
                              <span>Catatan Medis: <strong className="text-slate-900">{healCount} kali</strong></span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => openInputModal(std)}
                            className="flex-1 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-bold text-center transition flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Plus className="h-3 w-3" />
                            <span>Input untuk Santri Ini</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: RIWAYAT DATA & LAPORAN BULANAN (DENGAN FILTER BULAN SPESIFIK)       */}
        {/* ========================================================================= */}
        {currentTab === 'history' && (
          <div className="space-y-6 animate-fade-in">
            
            {/* MONTH SELECTOR BAR & REPORT ACTIONS */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-emerald-800" />
                  <span>Rekapitulasi & Laporan Bulanan {currentRoleInfo.roleTitle}</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Pilih bulan dan tahun di bawah ini untuk melihat dan mencetak laporan resmi pada periode tertentu.
                </p>
              </div>

              {/* Filter controls */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-transparent text-xs font-bold text-slate-800 px-2 py-1 focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">Semua Bulan</option>
                    {INDONESIAN_MONTHS.map(m => (
                      <option key={m.value} value={m.value}>{m.name}</option>
                    ))}
                  </select>

                  <span className="text-slate-300">|</span>

                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="bg-transparent text-xs font-bold text-slate-800 px-2 py-1 focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">Semua Tahun</option>
                    <option value="2024">2024</option>
                    <option value="2025">2025</option>
                    <option value="2026">2026</option>
                    <option value="2027">2027</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedMonth(currentMonthNum);
                    setSelectedYear(currentYearNum);
                  }}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                  title="Kembali ke Bulan Berjalan"
                >
                  Bulan Ini
                </button>

                <button
                  type="button"
                  onClick={() => downloadPrintableHTML('monthly-report-printable', `LAPORAN_BULANAN_${currentRoleInfo.code}_${selectedMonth}_${selectedYear}`)}
                  className="px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Cetak Laporan Bulanan (PDF/A4)</span>
                </button>
              </div>
            </div>

            {/* REPORT SUMMARY CARD */}
            <div className="bg-gradient-to-r from-slate-900 to-emerald-950 text-white p-5 rounded-2xl shadow-md border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono text-emerald-300 uppercase tracking-widest font-bold">
                  Status Rekap Periode Terpilih
                </span>
                <h4 className="text-base sm:text-lg font-black mt-0.5 text-white">
                  Laporan {selectedMonth === 'ALL' ? 'Seluruh Bulan' : INDONESIAN_MONTHS.find(m => m.value === selectedMonth)?.name} {selectedYear === 'ALL' ? 'Seluruh Tahun' : selectedYear}
                </h4>
                <p className="text-xs text-emerald-100/80 mt-1">
                  Total dokumen tercatat: <strong className="text-amber-300 font-bold">{selectedMonthLogs.length} Catatan</strong>
                </p>
              </div>

              <div className="flex gap-4">
                <div className="text-right">
                  <span className="text-[10px] uppercase text-emerald-200/80 font-bold block">Tuntas / Selesai</span>
                  <span className="text-xl font-black font-mono text-emerald-300">
                    {selectedMonthLogs.filter(l => l.status === 'Kembali' || l.status === 'Selesai' || l.status.includes('Rawat Jalan')).length}
                  </span>
                </div>
                <div className="text-right pl-4 border-l border-emerald-800/80">
                  <span className="text-[10px] uppercase text-emerald-200/80 font-bold block">Aktif / Perlu Tindakan</span>
                  <span className="text-xl font-black font-mono text-amber-300">
                    {selectedMonthLogs.filter(l => l.status === 'Aktif / Keluar' || l.status === 'Belum Diurus' || l.status === 'Terlambat').length}
                  </span>
                </div>
              </div>
            </div>

            {/* TABEL DATA LENGKAP LAPORAN */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                  Rincian Data ({selectedMonthLogs.length} Catatan)
                </h4>
                <span className="text-[11px] font-mono text-slate-400">
                  Diurutkan berdasarkan waktu terbaru
                </span>
              </div>

              {selectedMonthLogs.length === 0 ? (
                <div className="p-10 text-center text-slate-400 text-xs">
                  <FileText className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-bold text-slate-600">Tidak ada catatan data pada periode bulan ini.</p>
                  <p className="text-[11px] mt-0.5">Pilih bulan lain pada dropdown filter di atas atau input data baru.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider bg-slate-50/70 text-[10px]">
                        <th className="py-3 px-4">No</th>
                        <th className="py-3 px-4">Tanggal</th>
                        <th className="py-3 px-4">Nama Santri & NIS</th>
                        <th className="py-3 px-4">Kamar / Kelas</th>
                        <th className="py-3 px-4">Jenis Catatan</th>
                        <th className="py-3 px-4">Keterangan / Rincian</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedMonthLogs.map((log, idx) => (
                        <tr key={log.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">{idx + 1}</td>
                          <td className="py-3 px-4 font-mono font-medium text-slate-700 whitespace-nowrap">{log.date || '-'}</td>
                          <td className="py-3 px-4">
                            <strong className="text-slate-900 block font-bold">{log.studentName}</strong>
                            <span className="text-[10px] font-mono text-emerald-800 font-bold">NIS: {log.student?.nis || '-'}</span>
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            <div>{log.student?.kamar || '-'}</div>
                            <div className="text-[10px] text-slate-400">{log.student?.class || '-'}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-800">{log.typeLabel}</span>
                          </td>
                          <td className="py-3 px-4 max-w-sm">
                            <span className="text-slate-600 line-clamp-2">{log.desc}</span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              log.status === 'Kembali' || log.status === 'Selesai' ? 'bg-emerald-100 text-emerald-800' :
                              log.status === 'Terlambat' ? 'bg-rose-100 text-rose-800' :
                              'bg-amber-100 text-amber-900'
                            }`}>
                              {log.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              {role === 'keamanan' && (
                                <button
                                  type="button"
                                  onClick={() => setPrintSecurityTarget(log.raw)}
                                  className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-emerald-800 rounded transition cursor-pointer"
                                  title="Cetak Surat Izin"
                                >
                                  <Printer className="h-3.5 w-3.5" />
                                </button>
                              )}
                              {role === 'ketertiban' && (
                                <button
                                  type="button"
                                  onClick={() => setPrintDisciplineTarget(log.raw)}
                                  className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-indigo-800 rounded transition cursor-pointer"
                                  title="Cetak Surat Ta'zir"
                                >
                                  <Printer className="h-3.5 w-3.5" />
                                </button>
                              )}
                              {role === 'kesehatan' && (
                                <button
                                  type="button"
                                  onClick={() => setPrintHealthTarget(log.raw)}
                                  className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-rose-800 rounded transition cursor-pointer"
                                  title="Cetak Surat Sakit"
                                >
                                  <Printer className="h-3.5 w-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmTarget({ id: log.id, studentId: log.studentId, type: role === 'keamanan' ? 'security' : role === 'ketertiban' ? 'discipline' : 'health' })}
                                className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                                title="Hapus Catatan"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
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

            {/* HIDDEN PRINTABLE CONTAINER FOR OFFICIAL MONTHLY REPORT (A4 KOP RESMI) */}
            <div id="monthly-report-printable" className="hidden print:block p-8 bg-white font-serif text-slate-900">
              {/* Kop Surat Resmi */}
              <div className="border-b-4 border-double border-slate-900 pb-3 mb-5 flex items-center">
                {pesantrenSettings.logoUrl ? (
                  <img src={pesantrenSettings.logoUrl} alt="Logo" className="h-16 w-16 object-contain mr-4 shrink-0" referrerPolicy="no-referrer" />
                ) : null}
                <div className="flex-1 text-center font-sans">
                  <h3 className="font-extrabold text-sm uppercase leading-tight tracking-wider text-slate-900">
                    {pesantrenSettings.namaYayasan || "YAYASAN AL-ASY'ARIYAH"}
                  </h3>
                  <h2 className="font-black text-base uppercase leading-tight tracking-wide text-slate-950">
                    {pesantrenSettings.schoolName || "Pondok Pesantren Al-Asy'ariyah"}
                  </h2>
                  <p className="text-[10px] italic font-bold tracking-wider uppercase text-slate-700">
                    {currentRoleInfo.deptLabel}
                  </p>
                  <p className="text-[9px] text-slate-600 mt-0.5">
                    {pesantrenSettings.address || "Jl. Raya Modung, Langpanggang, Modung, Bangkalan, Jawa Timur"} | Telp: {pesantrenSettings.phone || "(0291) 438291"}
                  </p>
                </div>
              </div>

              {/* Judul Laporan */}
              <div className="text-center mb-5 font-sans">
                <h3 className="font-black text-sm uppercase underline tracking-wider">
                  LAPORAN BULANAN {currentRoleInfo.roleTitle.toUpperCase()}
                </h3>
                <p className="text-[10px] font-mono mt-0.5 text-slate-600">
                  Periode: {selectedMonth === 'ALL' ? 'Semua Bulan' : INDONESIAN_MONTHS.find(m => m.value === selectedMonth)?.name} {selectedYear === 'ALL' ? 'Semua Tahun' : selectedYear}
                </p>
              </div>

              {/* Tabel Cetak Laporan */}
              <table className="w-full text-left text-[10px] border-collapse font-sans mb-8 border border-slate-900">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-900 font-bold uppercase text-slate-900">
                    <th className="py-2 px-2 border-r border-slate-900 text-center">No</th>
                    <th className="py-2 px-2 border-r border-slate-900">Tanggal</th>
                    <th className="py-2 px-2 border-r border-slate-900">Nama Santri (NIS)</th>
                    <th className="py-2 px-2 border-r border-slate-900">Kamar / Kelas</th>
                    <th className="py-2 px-2 border-r border-slate-900">Jenis Catatan</th>
                    <th className="py-2 px-2 border-r border-slate-900">Keterangan / Tindakan</th>
                    <th className="py-2 px-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {selectedMonthLogs.map((log, i) => (
                    <tr key={log.id}>
                      <td className="py-1.5 px-2 border-r border-slate-900 text-center font-mono">{i + 1}</td>
                      <td className="py-1.5 px-2 border-r border-slate-900 font-mono">{log.date}</td>
                      <td className="py-1.5 px-2 border-r border-slate-900 font-bold">{log.studentName} ({log.student?.nis || '-'})</td>
                      <td className="py-1.5 px-2 border-r border-slate-900">{log.student?.kamar || '-'}</td>
                      <td className="py-1.5 px-2 border-r border-slate-900 font-semibold">{log.typeLabel}</td>
                      <td className="py-1.5 px-2 border-r border-slate-900">{log.desc}</td>
                      <td className="py-1.5 px-2 text-center font-bold">{log.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Tanda Tangan Berjenjang */}
              <div className="flex justify-between items-start font-sans text-xs mt-8 pt-4">
                <div className="text-center w-56 space-y-1">
                  <p className="text-[11px] text-slate-600">Mengetahui,</p>
                  <p className="font-bold text-slate-900">Pengasuh / Pimpinan Pondok</p>
                  <div className="h-16 flex items-center justify-center">
                    {pesantrenSettings.ttdPengasuhUrl ? (
                      <img src={pesantrenSettings.ttdPengasuhUrl} alt="TTD" className="h-14 object-contain" referrerPolicy="no-referrer" />
                    ) : null}
                  </div>
                  <p className="font-black text-slate-950 underline">{pesantrenSettings.namaPengasuh || 'KH. M. Syamsul Arifin'}</p>
                  <p className="text-[10px] text-slate-500">Pengasuh Pesantren</p>
                </div>

                <div className="text-center w-56 space-y-1">
                  <p className="text-[11px] text-slate-600">
                    {getCityFromAddress(pesantrenSettings.address)}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  <p className="font-bold text-slate-900">{currentRoleInfo.deptLabel}</p>
                  <div className="h-16 flex items-center justify-center">
                    {deptSignature && isImageUrl(deptSignature) ? (
                      <img src={deptSignature} alt="TTD" className="h-14 object-contain" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="font-serif italic font-bold text-sm text-slate-900 underline">{deptSignature || 'Tanda Tangan'}</span>
                    )}
                  </div>
                  <p className="font-black text-slate-950 underline">{deptName || currentRoleInfo.defaultName}</p>
                  <p className="text-[10px] text-slate-500">Kepala Bidang Terkait</p>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: PENERBITAN & DRAF SURAT RESMI (DISESUAIKAN UNTUK MASING-MASING PERAN) */}
        {/* ========================================================================= */}
        {currentTab === 'letters' && (
          <div className="space-y-6 animate-fade-in">
            
            {/* Header info */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <Printer className="h-4 w-4 text-emerald-800" />
                  <span>Draf Format Surat Resmi {currentRoleInfo.roleTitle}</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Format surat di bawah ini telah disesuaikan secara khusus dengan kewenangan {currentRoleInfo.deptLabel}.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setTab('profile')}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <Settings className="h-3.5 w-3.5" />
                <span>Ubah Redaksi & TTD</span>
              </button>
            </div>

            {/* LIST OF 3 ROLE-SPECIFIC LETTER FORMATS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Surat 1 */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between gap-4">
                <div>
                  <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold text-xs mb-3">
                    <FileText className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-mono text-emerald-800 font-bold uppercase">Format Surat 01</span>
                  <h4 className="text-sm font-extrabold text-slate-900 mt-1">
                    {currentRoleInfo.letter1Name}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1.5 line-clamp-3">
                    {letterTemplate1 || currentRoleInfo.letterTemplate1}
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-400">Kode: {currentRoleInfo.code}-01</span>
                  <button
                    type="button"
                    onClick={() => setTab('profile')}
                    className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Edit Format</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Surat 2 */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between gap-4">
                <div>
                  <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-800 flex items-center justify-center font-bold text-xs mb-3">
                    <FileText className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-mono text-indigo-800 font-bold uppercase">Format Surat 02</span>
                  <h4 className="text-sm font-extrabold text-slate-900 mt-1">
                    {currentRoleInfo.letter2Name}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1.5 line-clamp-3">
                    {letterTemplate2 || currentRoleInfo.letterTemplate2}
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-400">Kode: {currentRoleInfo.code}-02</span>
                  <button
                    type="button"
                    onClick={() => setTab('profile')}
                    className="text-xs font-bold text-indigo-800 hover:text-indigo-950 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Edit Format</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Surat 3 */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between gap-4">
                <div>
                  <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-800 flex items-center justify-center font-bold text-xs mb-3">
                    <FileText className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-mono text-rose-800 font-bold uppercase">Format Surat 03</span>
                  <h4 className="text-sm font-extrabold text-slate-900 mt-1">
                    {currentRoleInfo.letter3Name}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1.5 line-clamp-3">
                    {letterTemplate3 || currentRoleInfo.letterTemplate3}
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-400">Kode: {currentRoleInfo.code}-03</span>
                  <button
                    type="button"
                    onClick={() => setTab('profile')}
                    className="text-xs font-bold text-rose-800 hover:text-rose-950 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Edit Format</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

            </div>

            {/* PREVIEW SAMPLE LETTER */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 font-serif">
              <div className="border-b border-slate-200 pb-3 mb-4 font-sans flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Pratinjau Draf Standar Pesantren</span>
                  <h4 className="text-xs font-extrabold text-slate-900 uppercase">
                    Format Surat Resmi: {currentRoleInfo.letter1Name}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => downloadPrintableHTML('sample-letter-preview', `FORMAT_SURAT_${currentRoleInfo.code}`)}
                  className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Cetak Draf</span>
                </button>
              </div>

              <div id="sample-letter-preview" className="p-6 bg-white border border-slate-200 rounded-xl text-xs space-y-4 text-slate-900">
                {/* Kop */}
                <div className="border-b-4 border-double border-slate-900 pb-3 flex items-center font-sans">
                  {pesantrenSettings.logoUrl ? (
                    <img src={pesantrenSettings.logoUrl} alt="Logo" className="h-14 w-14 object-contain mr-4 shrink-0" referrerPolicy="no-referrer" />
                  ) : null}
                  <div className="flex-1 text-center">
                    <h4 className="font-extrabold text-xs uppercase leading-tight">{pesantrenSettings.namaYayasan || "YAYASAN AL-ASY'ARIYAH"}</h4>
                    <h3 className="font-black text-sm uppercase leading-tight text-slate-950">{pesantrenSettings.schoolName || "Pondok Pesantren Al-Asy'ariyah"}</h3>
                    <p className="text-[10px] italic font-bold tracking-wider uppercase text-slate-600">{currentRoleInfo.deptLabel}</p>
                    <p className="text-[9px] text-slate-500">{pesantrenSettings.address}</p>
                  </div>
                </div>

                <div className="text-center font-sans">
                  <h4 className="font-black text-sm uppercase underline">{currentRoleInfo.letter1Name}</h4>
                  <p className="text-[10px] font-mono text-slate-500 mt-0.5">Nomor: 01/{currentRoleInfo.code}/PP.AM/X/2026</p>
                </div>

                <p className="indent-8 text-slate-800 font-serif leading-relaxed">
                  {letterTemplate1 || currentRoleInfo.letterTemplate1}
                </p>

                <table className="w-full max-w-md mx-auto font-sans text-xs border-collapse my-2">
                  <tbody>
                    <tr className="border-b border-slate-100">
                      <td className="py-1 font-bold text-slate-500 w-1/3">NIS / ID</td>
                      <td className="py-1 font-mono font-bold">: 0012</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="py-1 font-bold text-slate-500">Nama Lengkap</td>
                      <td className="py-1 font-extrabold">: (Nama Lengkap Santri)</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="py-1 font-bold text-slate-500">Kelas & Kamar</td>
                      <td className="py-1">: VII SMP Formal / Kamar Al-Ghazali 1</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="py-1 font-bold text-slate-500">Keterangan Khusus</td>
                      <td className="py-1">: Sesuai ketentuan operasional pesantren</td>
                    </tr>
                  </tbody>
                </table>

                <p className="text-[11px] text-slate-600 italic font-sans leading-normal">
                  {letterTemplate2 || currentRoleInfo.letterTemplate2}
                </p>

                {/* TTD */}
                <div className="pt-4 flex justify-end font-sans text-xs">
                  <div className="w-56 text-left space-y-1">
                    <p className="text-[11px] text-slate-600">
                      {getCityFromAddress(pesantrenSettings.address)}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    <p className="font-bold text-slate-900">{currentRoleInfo.deptLabel}</p>
                    <div className="h-16 flex items-center justify-start">
                      {deptSignature && isImageUrl(deptSignature) ? (
                        <img src={deptSignature} alt="TTD" className="h-14 object-contain" referrerPolicy="no-referrer" />
                      ) : (
                        <span className="font-serif italic font-bold text-sm text-slate-900 underline">{deptSignature || 'Tanda Tangan'}</span>
                      )}
                    </div>
                    <p className="font-black text-slate-950 underline leading-none">{deptName || currentRoleInfo.defaultName}</p>
                    <p className="text-[10px] text-slate-500">Pejabat Berwenang</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: PROFIL JABATAN & DRAF SURAT                                         */}
        {/* ========================================================================= */}
        {currentTab === 'profile' && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 max-w-2xl mx-auto animate-fade-in">
            <div className="flex items-center gap-2.5 border-b border-dashed border-slate-200 pb-3 mb-4">
              <Signature className="h-5 w-5 text-emerald-800" />
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">
                  Pengaturan Profil & Draf Surat {currentRoleInfo.roleTitle}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Sesuaikan nama resmi pengurus, tanda tangan, stempel, dan kalimat baku dalam surat.
                </p>
              </div>
            </div>

            {profileSaveSuccess && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-bold flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{profileSaveSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nama Resmi Pejabat / Pengurus
                </label>
                <input
                  type="text"
                  required
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  placeholder="Contoh: Ustadz Hasanuddin, S.Pd"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700 font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Nama Teks Tanda Tangan
                  </label>
                  <input
                    type="text"
                    value={deptSignature}
                    onChange={(e) => setDeptSignature(e.target.value)}
                    placeholder="Contoh: Hasanuddin"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-700 font-serif italic"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Teks Stempel Resmi
                  </label>
                  <input
                    type="text"
                    value={deptSeal}
                    onChange={(e) => setDeptSeal(e.target.value)}
                    placeholder="Contoh: STEMPEL KEAMANAN"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  />
                </div>
              </div>

              {/* ROLE SPECIFIC LETTER PARAGRAPHS */}
              <div className="border-t border-slate-200 pt-4 space-y-4">
                <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
                  Penyesuaian Kalimat Redaksi Surat Khusus {currentRoleInfo.roleTitle}
                </h4>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    1. Kalimat Pembuka ({currentRoleInfo.letter1Name})
                  </label>
                  <textarea
                    rows={2}
                    value={letterTemplate1}
                    onChange={(e) => setLetterTemplate1(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    2. Catatan Khusus / Ketentuan ({currentRoleInfo.letter2Name})
                  </label>
                  <textarea
                    rows={2}
                    value={letterTemplate2}
                    onChange={(e) => setLetterTemplate2(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    3. Kalimat Penutup ({currentRoleInfo.letter3Name})
                  </label>
                  <textarea
                    rows={2}
                    value={letterTemplate3}
                    onChange={(e) => setLetterTemplate3(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer"
                >
                  Simpan Perubahan Profil & Format Surat
                </button>
              </div>
            </form>
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* MODAL INPUT DATA SANTRI (STREAMLINED, TIDAK RIBET, SESUAI JABATAN)          */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div 
          onClick={() => setShowAddModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 flex flex-col my-auto max-h-[92vh] animate-fade-in text-xs font-sans"
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-900 to-teal-950 text-white p-4 sm:p-5 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-emerald-800 flex items-center justify-center text-amber-300">
                  {role === 'keamanan' && <Shield className="h-4 w-4" />}
                  {role === 'ketertiban' && <AlertTriangle className="h-4 w-4" />}
                  {role === 'kesehatan' && <Heart className="h-4 w-4" />}
                </div>
                <div>
                  <h3 className="font-extrabold text-sm uppercase tracking-wider text-white">
                    {role === 'keamanan' && 'Input Surat Izin Keluar Santri'}
                    {role === 'ketertiban' && 'Input Catatan Takzir & Disiplin'}
                    {role === 'kesehatan' && 'Input Catatan Medis Poskestren'}
                  </h3>
                  <p className="text-[10px] text-emerald-200 font-medium">
                    Kewenangan Khusus: {currentRoleInfo.deptLabel}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-emerald-200 hover:text-white p-1 rounded-lg transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRecord} className="p-5 space-y-4 overflow-y-auto flex-1 text-left">
              
              {/* STEP 1: PILIH SANTRI DENGAN MUDAH (TIDAK RIBET) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Pilih Santri <span className="text-rose-500">*</span>
                </label>

                {!selectedStudentForInput ? (
                  <div className="relative">
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        autoFocus
                        placeholder="Ketik Nama, NIS, atau Kamar santri..."
                        value={studentSearchKeyword}
                        onChange={(e) => {
                          setStudentSearchKeyword(e.target.value);
                          setIsSearchingStudent(true);
                        }}
                        onFocus={() => setIsSearchingStudent(true)}
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-700 bg-slate-50/50"
                      />
                    </div>

                    {/* Autocomplete Dropdown */}
                    {isSearchingStudent && studentSearchKeyword.trim() && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 max-h-48 overflow-y-auto divide-y divide-slate-100">
                        {studentAutocompleteResults.length === 0 ? (
                          <div className="p-3 text-center text-slate-400 text-[11px]">
                            Santri tidak ditemukan dengan kata kunci "{studentSearchKeyword}".
                          </div>
                        ) : (
                          studentAutocompleteResults.map(s => (
                            <div
                              key={s.id}
                              onClick={() => {
                                setSelectedStudentForInput(s);
                                setStudentSearchKeyword('');
                                setIsSearchingStudent(false);
                              }}
                              className="p-2.5 hover:bg-emerald-50 cursor-pointer flex items-center justify-between text-xs transition"
                            >
                              <div>
                                <strong className="text-slate-900 block font-bold">{s.fullName}</strong>
                                <span className="text-[10px] text-slate-400">
                                  NIS: <strong className="text-emerald-800">{s.nis || '-'}</strong> • Kamar: {s.kamar || '-'}
                                </span>
                              </div>
                              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                                Pilih
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-9 w-9 rounded-full bg-emerald-800 text-white flex items-center justify-center font-bold text-xs shrink-0">
                        {selectedStudentForInput.fullName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <strong className="text-slate-900 text-xs font-extrabold truncate block">
                          {selectedStudentForInput.fullName}
                        </strong>
                        <span className="text-[10px] text-emerald-800 font-mono font-bold">
                          NIS: {selectedStudentForInput.nis || '-'} • {selectedStudentForInput.kamar || 'Kamar -'} (Kelas {selectedStudentForInput.class || '-'})
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedStudentForInput(null)}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 cursor-pointer transition shrink-0"
                    >
                      Ganti Santri
                    </button>
                  </div>
                )}
              </div>

              {/* STEP 2: FORMULIR KHUSUS SESUAI JABATAN (HANYA SATU JABATAN) */}

              {/* A. FORM KHUSUS KEAMANAN (PERIZINAN) */}
              {role === 'keamanan' && (
                <div className="space-y-3.5 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Jenis Izin
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSecPermitType('Keluar Lingkungan')}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition text-center cursor-pointer ${
                          secPermitType === 'Keluar Lingkungan'
                            ? 'bg-emerald-800 text-white border-emerald-800 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        Izin Keluar Lingkungan (Siang/Sore)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSecPermitType('Pulang (Keluarga)')}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition text-center cursor-pointer ${
                          secPermitType === 'Pulang (Keluarga)'
                            ? 'bg-emerald-800 text-white border-emerald-800 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        Izin Pulang Bermalam (Keluarga)
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Keperluan / Alasan Izin
                    </label>
                    {/* Quick preset chips */}
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {['Beli Kitab / ATK', 'Ke ATM / Bank', 'Periksa Dokter', 'Acara Keluarga', 'Takziyah'].map(chip => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => setSecPermitDesc(chip)}
                          className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-medium transition cursor-pointer"
                        >
                          + {chip}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Mengambil uang di ATM dan fotokopi materi kitab"
                      value={secPermitDesc}
                      onChange={(e) => setSecPermitDesc(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-700"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        Waktu Keluar
                      </label>
                      <input
                        type="text"
                        value={secOutDate}
                        onChange={(e) => setSecOutDate(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-medium focus:ring-2 focus:ring-emerald-700"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        Batas Waktu Kembali
                      </label>
                      {/* Presets */}
                      <div className="flex gap-1 mb-1.5">
                        <button
                          type="button"
                          onClick={() => setReturnPreset(3)}
                          className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded text-[9px] font-bold hover:bg-emerald-100 cursor-pointer"
                        >
                          +3 Jam
                        </button>
                        <button
                          type="button"
                          onClick={() => setReturnPreset(5)}
                          className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded text-[9px] font-bold hover:bg-emerald-100 cursor-pointer"
                        >
                          Sore (17:00)
                        </button>
                        <button
                          type="button"
                          onClick={() => setReturnPreset(0, 1)}
                          className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded text-[9px] font-bold hover:bg-emerald-100 cursor-pointer"
                        >
                          Besok
                        </button>
                        <button
                          type="button"
                          onClick={() => setReturnPreset(0, 3)}
                          className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded text-[9px] font-bold hover:bg-emerald-100 cursor-pointer"
                        >
                          3 Hari
                        </button>
                      </div>
                      <input
                        type="text"
                        required
                        value={secExpectedReturn}
                        onChange={(e) => setSecExpectedReturn(e.target.value)}
                        placeholder="YYYY-MM-DD HH:MM"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold text-rose-800 focus:ring-2 focus:ring-emerald-700"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* B. FORM KHUSUS KETERTIBAN (PELANGGARAN & TA'ZIR) */}
              {role === 'ketertiban' && (
                <div className="space-y-3.5 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Bentuk Pelanggaran Disiplin
                    </label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {['Terlambat Shalat Berjamaah', 'Keluar Tanpa Izin (Kabur)', 'Ghozab Barang/Sandal', 'Merokok / Vape', 'Bolos Pengajian Diniyah'].map(chip => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => setDiscViolationType(chip)}
                          className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-medium transition cursor-pointer"
                        >
                          + {chip}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Terlambat mengikuti shalat maghrib berjamaah di masjid"
                      value={discViolationType}
                      onChange={(e) => setDiscViolationType(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-700"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        Tingkat Pelanggaran
                      </label>
                      <select
                        value={discViolationLevel}
                        onChange={(e) => setDiscViolationLevel(e.target.value as any)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-white focus:ring-2 focus:ring-indigo-700"
                      >
                        <option value="Ringan">Ringan (E.g. Terlambat)</option>
                        <option value="Sedang">Sedang (E.g. Ghozab)</option>
                        <option value="Berat">Berat (E.g. Merokok/Keluar Malam)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        Bobot Poin Ta'zir
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={discViolationPoints}
                        onChange={(e) => setDiscViolationPoints(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold text-rose-700 focus:ring-2 focus:ring-indigo-700"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Sanksi Edukatif / Ta'zir yang Diberikan
                    </label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {['Membaca Al-Qur\'an 1 Juz', 'Membersihkan Halaman Masjid', 'Menghafal Surah Yasin', 'Piket Dapur Umum', 'Peringatan Lisan'].map(chip => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => setDiscConsequence(chip)}
                          className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-medium transition cursor-pointer"
                        >
                          + {chip}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Membersihkan selasar masjid dan membaca Al-Qur'an 1 juz"
                      value={discConsequence}
                      onChange={(e) => setDiscConsequence(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-700"
                    />
                  </div>
                </div>
              )}

              {/* C. FORM KHUSUS KESEHATAN (POSKESTREN) */}
              {role === 'kesehatan' && (
                <div className="space-y-3.5 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Keluhan / Gejala Sakit Santri
                    </label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {['Demam & Menggigil', 'Sakit Kepala / Pusing', 'Sakit Perut / Maag', 'Batuk & Flu Pilek', 'Luka / Cedera Ringan'].map(chip => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => setHealComplaint(chip)}
                          className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-medium transition cursor-pointer"
                        >
                          + {chip}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Demam 38°C disertai pusing dan lemas"
                      value={healComplaint}
                      onChange={(e) => setHealComplaint(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-rose-700"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        Prakiraan Diagnosa
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: Febris / Gejala Tifus Ringan"
                        value={healDiagnosis}
                        onChange={(e) => setHealDiagnosis(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-rose-700"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        Tindakan & Pemberian Obat
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: Paracetamol 500mg 3x1 & Vitamin C"
                        value={healTreatment}
                        onChange={(e) => setHealTreatment(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-rose-700"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Rekomendasi Perawatan
                    </label>
                    <select
                      value={healStatus}
                      onChange={(e) => setHealStatus(e.target.value as any)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-white text-slate-800 focus:ring-2 focus:ring-rose-700"
                    >
                      <option value="Rawat Jalan (Kamar)">Rawat Jalan di Kamar Asrama</option>
                      <option value="Nginap di Poskestren">Opname / Rawat Inap di Poskestren</option>
                      <option value="Dirujuk ke RS / Pulang">Dirujuk ke RS Terdekat / Pulang Sementara</option>
                    </select>
                  </div>
                </div>
              )}

              {/* WHATSAPP AUTOMATION TOGGLE */}
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-emerald-800 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-emerald-950">Kirim Notifikasi WhatsApp Otomatis ke Wali</div>
                    <div className="text-[10px] text-emerald-700">Pemberitahuan resmi otomatis terkirim ke HP wali santri</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={sendWhatsAppOnRecord}
                  onChange={(e) => setSendWhatsAppOnRecord(e.target.checked)}
                  className="h-4 w-4 text-emerald-700 rounded border-emerald-300 focus:ring-emerald-600 cursor-pointer"
                />
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!selectedStudentForInput}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold text-white shadow-md transition cursor-pointer ${
                    !selectedStudentForInput 
                      ? 'bg-slate-300 cursor-not-allowed' 
                      : 'bg-emerald-800 hover:bg-emerald-900'
                  }`}
                >
                  Simpan Catatan Resmi
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* POPUP SLIP CETAK: 1. SURAT IZIN KELUAR KEAMANAN                            */}
      {/* ========================================================================= */}
      {printSecurityTarget && (
        <div 
          onClick={() => setPrintSecurityTarget(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl p-6 max-w-lg w-full font-serif border border-emerald-100 relative max-h-[92vh] overflow-y-auto animate-fade-in text-xs"
          >
            <button 
              onClick={() => setPrintSecurityTarget(null)} 
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 p-1 rounded-full cursor-pointer print:hidden"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Printable Area */}
            <div id="security-slip-print" className="p-4 bg-white text-left font-sans">
              <div className="border-b-4 border-double border-slate-900 pb-3 mb-4 flex items-center">
                {pesantrenSettings.logoUrl ? (
                  <img src={pesantrenSettings.logoUrl} alt="Logo" className="h-14 w-14 object-contain mr-3 shrink-0" referrerPolicy="no-referrer" />
                ) : null}
                <div className="flex-1">
                  <h4 className="text-slate-900 font-black text-xs uppercase leading-tight">{pesantrenSettings.schoolName}</h4>
                  <p className="text-[10px] italic text-slate-500 font-bold uppercase">Biro Keamanan & Ketertiban Pengurus Pondok Pesantren</p>
                  <p className="text-[9px] text-slate-500">{pesantrenSettings.address}</p>
                </div>
              </div>

              <div className="text-center mb-4">
                <h3 className="font-extrabold text-sm tracking-wider underline uppercase text-slate-950">
                  {printSecurityTarget.permitType === 'Pulang (Keluarga)' ? 'SURAT IZIN KELUAR BERMALAM' : 'SURAT IZIN KELUAR (TIDAK BERMALAM)'}
                </h3>
                <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                  Nomor: {getLetterNumber(printSecurityTarget.id, 'Surat Izin Keluar', 'KMN')}
                </p>
              </div>

              <p className="text-[11px] text-slate-800 leading-relaxed mb-3">
                {letterTemplate1 || currentRoleInfo.letterTemplate1}
              </p>

              <table className="w-full my-3 border-collapse text-[11px] font-sans">
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="py-1 font-bold text-slate-500 w-1/3">NAMA SANTRI</td>
                    <td className="py-1 font-extrabold text-slate-900">: {printSecurityTarget.studentName}</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-1 font-bold text-slate-500">JENIS IZIN</td>
                    <td className="py-1 font-bold text-emerald-900">: {printSecurityTarget.permitType}</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-1 font-bold text-slate-500">KEPERLUAN</td>
                    <td className="py-1 text-slate-800">: {printSecurityTarget.description}</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-1 font-bold text-slate-500">WAKTU KELUAR</td>
                    <td className="py-1 font-mono font-bold text-slate-900">: {printSecurityTarget.outDate}</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-1 font-bold text-slate-500">BATAS KEMBALI</td>
                    <td className="py-1 font-mono font-black text-rose-800">: {printSecurityTarget.expectedReturnDate}</td>
                  </tr>
                </tbody>
              </table>

              <p className="text-[10px] italic text-slate-500 leading-normal mb-4">
                {letterTemplate2 || currentRoleInfo.letterTemplate2}
              </p>

              <div className="pt-2 flex justify-end text-xs font-sans">
                <div className="w-52 text-left space-y-1">
                  <p className="text-[10px] text-slate-600">
                    {getCityFromAddress(pesantrenSettings.address)}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  <p className="font-bold text-slate-900">{currentRoleInfo.deptLabel}</p>
                  <div className="h-14 flex items-center justify-start">
                    {deptSignature && isImageUrl(deptSignature) ? (
                      <img src={deptSignature} alt="TTD" className="h-12 object-contain" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="font-serif italic font-bold text-sm text-slate-900 underline">{deptSignature || 'Syarifudin'}</span>
                    )}
                  </div>
                  <p className="font-black text-slate-950 underline leading-none">{deptName || currentRoleInfo.defaultName}</p>
                  <p className="text-[9px] text-slate-500">Petugas Pos Keamanan</p>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex gap-2 font-sans print:hidden">
              <button
                type="button"
                onClick={() => handlePrintLetter('security-slip-print', printSecurityTarget.id, 'Surat Izin Keluar', 'KMN', printSecurityTarget.studentName, printSecurityTarget.permitType)}
                className="flex-1 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Printer className="h-4 w-4" />
                <span>Cetak Slip Izin</span>
              </button>
              <button
                type="button"
                onClick={() => setPrintSecurityTarget(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* POPUP SLIP CETAK: 2. SURAT KEPUTUSAN SANKSI TA'ZIR KETERTIBAN              */}
      {/* ========================================================================= */}
      {printDisciplineTarget && (
        <div 
          onClick={() => setPrintDisciplineTarget(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl p-6 max-w-lg w-full font-serif border border-indigo-100 relative max-h-[92vh] overflow-y-auto animate-fade-in text-xs"
          >
            <button 
              onClick={() => setPrintDisciplineTarget(null)} 
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 p-1 rounded-full cursor-pointer print:hidden"
            >
              <X className="h-4 w-4" />
            </button>

            <div id="discipline-slip-print" className="p-4 bg-white text-left font-sans">
              <div className="border-b-4 border-double border-slate-900 pb-3 mb-4 flex items-center">
                {pesantrenSettings.logoUrl ? (
                  <img src={pesantrenSettings.logoUrl} alt="Logo" className="h-14 w-14 object-contain mr-3 shrink-0" referrerPolicy="no-referrer" />
                ) : null}
                <div className="flex-1">
                  <h4 className="text-slate-900 font-black text-xs uppercase leading-tight">{pesantrenSettings.schoolName}</h4>
                  <p className="text-[10px] italic text-slate-500 font-bold uppercase">Lembaga Penegakan Disiplin & Ta'zir Santri</p>
                  <p className="text-[9px] text-slate-500">{pesantrenSettings.address}</p>
                </div>
              </div>

              <div className="text-center mb-4">
                <h3 className="font-extrabold text-sm tracking-wider underline uppercase text-slate-950">
                  SURAT INSTRUKSI PEMBINAAN KEDISIPLINAN & TA'ZIR
                </h3>
                <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                  Nomor: {getLetterNumber(printDisciplineTarget.id, 'Surat Ta\'zir', 'KTT')}
                </p>
              </div>

              <p className="text-[11px] text-slate-800 leading-relaxed mb-3">
                {letterTemplate1 || currentRoleInfo.letterTemplate1}
              </p>

              <table className="w-full my-3 border-collapse text-[11px] font-sans">
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="py-1 font-bold text-slate-500 w-1/3">NAMA SANTRI</td>
                    <td className="py-1 font-extrabold text-slate-900">: {printDisciplineTarget.studentName}</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-1 font-bold text-slate-500">BENTUK PELANGGARAN</td>
                    <td className="py-1 font-bold text-rose-800">: {printDisciplineTarget.violationType}</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-1 font-bold text-slate-500">TINGKAT & POIN</td>
                    <td className="py-1 font-bold text-amber-800">: {printDisciplineTarget.level} ({printDisciplineTarget.points} Poin)</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-1 font-bold text-slate-500">SANKSI WAJIB</td>
                    <td className="py-1 font-semibold text-slate-900">: {printDisciplineTarget.consequence}</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-1 font-bold text-slate-500">TANGGAL</td>
                    <td className="py-1 font-mono">: {printDisciplineTarget.date}</td>
                  </tr>
                </tbody>
              </table>

              <p className="text-[10px] italic text-slate-500 leading-normal mb-4">
                {letterTemplate2 || currentRoleInfo.letterTemplate2}
              </p>

              <div className="pt-2 flex justify-end text-xs font-sans">
                <div className="w-52 text-left space-y-1">
                  <p className="text-[10px] text-slate-600">
                    {getCityFromAddress(pesantrenSettings.address)}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  <p className="font-bold text-slate-900">{currentRoleInfo.deptLabel}</p>
                  <div className="h-14 flex items-center justify-start">
                    {deptSignature && isImageUrl(deptSignature) ? (
                      <img src={deptSignature} alt="TTD" className="h-12 object-contain" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="font-serif italic font-bold text-sm text-slate-900 underline">{deptSignature || 'Abdul Somad'}</span>
                    )}
                  </div>
                  <p className="font-black text-slate-950 underline leading-none">{deptName || currentRoleInfo.defaultName}</p>
                  <p className="text-[9px] text-slate-500">Kepala Bidang Ketertiban</p>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex gap-2 font-sans print:hidden">
              <button
                type="button"
                onClick={() => handlePrintLetter('discipline-slip-print', printDisciplineTarget.id, 'Surat Sanksi Ta\'zir', 'KTT', printDisciplineTarget.studentName, printDisciplineTarget.violationType)}
                className="flex-1 py-2 bg-indigo-800 hover:bg-indigo-900 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Printer className="h-4 w-4" />
                <span>Cetak Surat Sanksi Ta'zir</span>
              </button>
              <button
                type="button"
                onClick={() => setPrintDisciplineTarget(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* POPUP SLIP CETAK: 3. SURAT KETERANGAN SAKIT POSKESTREN                    */}
      {/* ========================================================================= */}
      {printHealthTarget && (
        <div 
          onClick={() => setPrintHealthTarget(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl p-6 max-w-lg w-full font-serif border border-rose-100 relative max-h-[92vh] overflow-y-auto animate-fade-in text-xs"
          >
            <button 
              onClick={() => setPrintHealthTarget(null)} 
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 p-1 rounded-full cursor-pointer print:hidden"
            >
              <X className="h-4 w-4" />
            </button>

            <div id="health-slip-print" className="p-4 bg-white text-left font-sans">
              <div className="border-b-4 border-double border-slate-900 pb-3 mb-4 flex items-center">
                {pesantrenSettings.logoUrl ? (
                  <img src={pesantrenSettings.logoUrl} alt="Logo" className="h-14 w-14 object-contain mr-3 shrink-0" referrerPolicy="no-referrer" />
                ) : null}
                <div className="flex-1">
                  <h4 className="text-slate-900 font-black text-xs uppercase leading-tight">{pesantrenSettings.schoolName}</h4>
                  <p className="text-[10px] italic text-slate-500 font-bold uppercase">Pos Kesehatan Pesantren (Poskestren) Al-Asy'ariyah</p>
                  <p className="text-[9px] text-slate-500">{pesantrenSettings.address}</p>
                </div>
              </div>

              <div className="text-center mb-4">
                <h3 className="font-extrabold text-sm tracking-wider underline uppercase text-slate-950">
                  SURAT KETERANGAN PEMERIKSAAN MEDIS & DISPENSASI
                </h3>
                <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                  Nomor: {getLetterNumber(printHealthTarget.id, 'Surat Keterangan Sakit', 'KST')}
                </p>
              </div>

              <p className="text-[11px] text-slate-800 leading-relaxed mb-3">
                {letterTemplate1 || currentRoleInfo.letterTemplate1}
              </p>

              <table className="w-full my-3 border-collapse text-[11px] font-sans">
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="py-1 font-bold text-slate-500 w-1/3">NAMA SANTRI</td>
                    <td className="py-1 font-extrabold text-slate-900">: {printHealthTarget.studentName}</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-1 font-bold text-slate-500">KELUHAN UTAMA</td>
                    <td className="py-1 font-bold text-rose-800">: {printHealthTarget.complaint}</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-1 font-bold text-slate-500">DIAGNOSA MEDIS</td>
                    <td className="py-1 font-semibold text-slate-900">: {printHealthTarget.diagnosis}</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-1 font-bold text-slate-500">TERAPI & OBAT</td>
                    <td className="py-1 text-slate-800">: {printHealthTarget.treatment}</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-1 font-bold text-slate-500">STATUS RAWAT</td>
                    <td className="py-1 font-bold text-amber-800">: {printHealthTarget.status}</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-1 font-bold text-slate-500">TANGGAL PERIKSA</td>
                    <td className="py-1 font-mono">: {printHealthTarget.date}</td>
                  </tr>
                </tbody>
              </table>

              <p className="text-[10px] italic text-slate-500 leading-normal mb-4">
                {letterTemplate2 || currentRoleInfo.letterTemplate2}
              </p>

              <div className="pt-2 flex justify-end text-xs font-sans">
                <div className="w-52 text-left space-y-1">
                  <p className="text-[10px] text-slate-600">
                    {getCityFromAddress(pesantrenSettings.address)}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  <p className="font-bold text-slate-900">{currentRoleInfo.deptLabel}</p>
                  <div className="h-14 flex items-center justify-start">
                    {deptSignature && isImageUrl(deptSignature) ? (
                      <img src={deptSignature} alt="TTD" className="h-12 object-contain" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="font-serif italic font-bold text-sm text-slate-900 underline">{deptSignature || 'dr. Fatimah'}</span>
                    )}
                  </div>
                  <p className="font-black text-slate-950 underline leading-none">{deptName || currentRoleInfo.defaultName}</p>
                  <p className="text-[9px] text-slate-500">Petugas Medis Poskestren</p>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex gap-2 font-sans print:hidden">
              <button
                type="button"
                onClick={() => handlePrintLetter('health-slip-print', printHealthTarget.id, 'Surat Keterangan Sakit', 'KST', printHealthTarget.studentName, printHealthTarget.complaint)}
                className="flex-1 py-2 bg-rose-800 hover:bg-rose-900 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Printer className="h-4 w-4" />
                <span>Cetak Surat Sakit</span>
              </button>
              <button
                type="button"
                onClick={() => setPrintHealthTarget(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL FOR DELETE */}
      {deleteConfirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs font-sans">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl border border-slate-200">
            <div className="h-12 w-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-900">Hapus Catatan Riwayat?</h4>
              <p className="text-xs text-slate-500 mt-1">
                Catatan ini akan dihapus permanen dari basis data santri dan server pesantren.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmTarget(null)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={executeDeleteLog}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs cursor-pointer"
              >
                Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
