import React from 'react';
import { 
  User, Phone, MapPin, Calendar, Award, CheckCircle, Sparkles, Send, 
  Printer, Download, Upload, FileText, X, BookOpen, Search, HelpCircle, 
  ArrowLeft, Check, ShieldCheck, Clock, FileCheck, AlertCircle, ChevronRight,
  Eye, RefreshCw
} from 'lucide-react';
import { PCSBRegistration, PortalSettings } from '../types';
import { downloadPrintableHTML, PrintGuideAlert } from './PrintHelper';
import { isPpdbCurrentlyActive } from '../lib/dateUtils';

interface PCSBFormProps {
  onSubmit: (registration: Omit<PCSBRegistration, 'id' | 'registrationDate' | 'status'>) => void;
  ppdbOpen?: boolean;
  ppdbStartDate?: string;
  ppdbEndDate?: string;
  settings?: PortalSettings;
  onBackToHome?: () => void;
}

export type RegistrationStatusType = 'Diproses' | 'Diterima' | 'Perlu Dokumen' | 'Ditolak';

export default function PCSBForm({ 
  onSubmit, 
  ppdbOpen, 
  ppdbStartDate, 
  ppdbEndDate, 
  settings: propSettings, 
  onBackToHome 
}: PCSBFormProps) {
  const settings = React.useMemo(() => {
    if (propSettings) return propSettings;
    try {
      const stored = localStorage.getItem('pesantren_settings');
      if (stored) {
        return JSON.parse(stored) as PortalSettings;
      }
    } catch (e) {
      console.error('Failed to parse pesantren_settings', e);
    }
    return {
      schoolName: "Pondok Pesantren Al-Asy'ariyah",
      tagline: "Unggul dalam Ilmu, Mulia dalam Akhlak, Berkhidmat untuk Umat",
      ppdbOpen: true,
      ppdbStartDate: "",
      ppdbEndDate: "",
      pcsbFeePendaftaran: 150000,
      pcsbFeeSarpras: 1500000,
      pcsbFeeSeragam: 750000,
      pcsbFeeKitab: 450000,
      pcsbFeeKesehatan: 350000,
      pcsbFeeSyahriyah: 200000,
      pcsbEnablePendaftaran: true,
      pcsbEnableSarpras: true,
      pcsbEnableSeragam: true,
      pcsbEnableKitab: true,
      pcsbEnableKesehatan: true,
      pcsbEnableSyahriyah: true,
    } as any;
  }, [propSettings]);

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

  const feeLainLain = 
    (enabledSarpras ? feeSarpras : 0) + 
    (enabledSeragam ? feeSeragam : 0) + 
    (enabledKitab ? feeKitab : 0) + 
    (enabledKesehatan ? feeKesehatan : 0);

  const totalEstimasiAwal = (enabledPendaftaran ? feePendaftaran : 0) + feeLainLain + (enabledSyahriyah ? feeSyahriyah : 0);

  const formatRupiah = (val: number) => {
    return 'Rp ' + val.toLocaleString('id-ID');
  };

  // Stepper state (1: Data Santri, 2: Data Orang Tua, 3: Biaya & Berkas)
  const [currentStep, setCurrentStep] = React.useState<1 | 2 | 3>(1);
  const [stepError, setStepError] = React.useState('');

  // Modals state for Guide & Status Check (opened from hamburger or quick links)
  const [isGuideOpen, setIsGuideOpen] = React.useState(false);
  const [isCheckStatusOpen, setIsCheckStatusOpen] = React.useState(false);
  const [statusSearchQuery, setStatusSearchQuery] = React.useState('');
  const [statusSearchResult, setStatusSearchResult] = React.useState<any>(null);
  const [statusSearchError, setStatusSearchError] = React.useState('');

  // Check if user already has a saved registration in this browser
  const [existingRegistration, setExistingRegistration] = React.useState<any>(null);

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem('last_pcsb_registration');
      if (stored) {
        setExistingRegistration(JSON.parse(stored));
      }
    } catch (e) {}
  }, []);

  // Listen to navigation events from Navbar hamburger menu
  React.useEffect(() => {
    const handleOpenPanduan = () => setIsGuideOpen(true);
    const handleOpenCheckStatus = () => setIsCheckStatusOpen(true);

    window.addEventListener('open_pcsb_panduan', handleOpenPanduan);
    window.addEventListener('open_pcsb_check_status', handleOpenCheckStatus);

    return () => {
      window.removeEventListener('open_pcsb_panduan', handleOpenPanduan);
      window.removeEventListener('open_pcsb_check_status', handleOpenCheckStatus);
    };
  }, []);

  const [uploadedFiles, setUploadedFiles] = React.useState<Record<string, { name: string, size: string }>>({});

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedFiles(prev => ({
        ...prev,
        [key]: { name: file.name, size: (file.size / 1024).toFixed(1) + " KB" }
      }));
    }
  };

  const removeFile = (key: string) => {
    setUploadedFiles(prev => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
  };

  // Form State - Cleaned of bloodType, hafalan, tahfidz, enriched with complete pesantren fields
  const [formData, setFormData] = React.useState({
    fullName: '',
    gender: 'Laki-laki' as 'Laki-laki' | 'Perempuan',
    jenjangPendidikan: 'Madrasah Diniyah' as 'Madrasah Diniyah' | 'SMP' | 'SMA',
    birthPlace: '',
    birthDate: '',
    parentName: '',
    parentPhone: '',
    waAlternatif: '',
    address: '',
    previousSchool: '',
    kk: '',
    nik: '',
    nisn: '',
    anakKe: '1',
    jumlahSaudara: '1',
    statusKeluarga: 'Lengkap' as 'Lengkap' | 'Yatim' | 'Piatu' | 'Yatim Piatu',
    fatherName: '',
    motherName: '',
    pekerjaanAyah: '',
    pekerjaanIbu: '',
    penghasilanOrtu: 'Rp 1.500.000 - Rp 3.000.000',
    ukuranSeragam: 'M' as 'S' | 'M' | 'L' | 'XL' | 'XXL',
    healthHistory: '',
    paymentType: 'Cicilan Bulanan' as 'Cicilan Bulanan' | 'Langsung Lunas'
  });

  const [submitted, setSubmitted] = React.useState(false);
  const [registrationId, setRegistrationId] = React.useState('');
  const [currentLiveStatus, setCurrentLiveStatus] = React.useState<RegistrationStatusType>('Diproses');
  const [viewingSlip, setViewingSlip] = React.useState(false);

  // Prevent background scrolling when any modal/popup is open
  React.useEffect(() => {
    if (viewingSlip || isGuideOpen || isCheckStatusOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev || '';
      };
    }
  }, [viewingSlip, isGuideOpen, isCheckStatusOpen]);

  // Validate Step 1 before moving to Step 2
  const handleNextStep1 = () => {
    setStepError('');
    if (!formData.fullName.trim()) {
      setStepError('Mohon lengkapi Nama Lengkap Calon Santri untuk melanjutkan ke langkah berikutnya.');
      return;
    }
    setCurrentStep(2);
    window.scrollTo({ top: 180, behavior: 'smooth' });
  };

  // Validate Step 2 before moving to Step 3
  const handleNextStep2 = () => {
    setStepError('');
    if (!formData.parentPhone.trim()) {
      setStepError('Mohon isi Nomor WhatsApp Wali aktif agar panitia dapat menghubungi.');
      return;
    }
    setCurrentStep(3);
    window.scrollTo({ top: 180, behavior: 'smooth' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStepError('');

    const resolvedParentName = formData.fatherName || formData.motherName || 'Wali Santri';
    const finalData = { ...formData, parentName: resolvedParentName };

    if (!finalData.fullName.trim() || !finalData.parentPhone.trim()) {
      setStepError('Mohon lengkapi seluruh isian wajib.');
      return;
    }

    const generatedId = `PCSB-${Math.floor(Math.random() * 900000 + 100000)}`;
    setRegistrationId(generatedId);
    setCurrentLiveStatus('Diproses');

    // Save to local list for status check & real-time badge tracking
    const newEntry = {
      ...finalData,
      id: generatedId,
      registrationDate: new Date().toISOString().split('T')[0],
      status: 'Diproses'
    };

    try {
      const existingList = JSON.parse(localStorage.getItem('pesantren_ppdb_list') || '[]');
      existingList.unshift(newEntry);
      localStorage.setItem('pesantren_ppdb_list', JSON.stringify(existingList));
      localStorage.setItem('last_pcsb_registration', JSON.stringify(newEntry));
      setExistingRegistration(newEntry);
    } catch (err) {
      console.warn('Local storage save error:', err);
    }

    onSubmit(finalData);
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReset = () => {
    setFormData({
      fullName: '',
      gender: 'Laki-laki',
      jenjangPendidikan: 'Madrasah Diniyah',
      birthPlace: '',
      birthDate: '',
      parentName: '',
      parentPhone: '',
      waAlternatif: '',
      address: '',
      previousSchool: '',
      kk: '',
      nik: '',
      nisn: '',
      anakKe: '1',
      jumlahSaudara: '1',
      statusKeluarga: 'Lengkap',
      fatherName: '',
      motherName: '',
      pekerjaanAyah: '',
      pekerjaanIbu: '',
      penghasilanOrtu: 'Rp 1.500.000 - Rp 3.000.000',
      ukuranSeragam: 'M',
      healthHistory: '',
      paymentType: 'Cicilan Bulanan'
    });
    setUploadedFiles({});
    setCurrentStep(1);
    setStepError('');
    setSubmitted(false);
    setViewingSlip(false);
  };

  const handleSearchStatus = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusSearchError('');
    setStatusSearchResult(null);

    const query = statusSearchQuery.trim().toLowerCase();
    if (!query) {
      setStatusSearchError('Masukkan NIK, No. WA, atau Kode Pendaftaran.');
      return;
    }

    try {
      const list = JSON.parse(localStorage.getItem('pesantren_ppdb_list') || '[]');
      const found = list.find((item: any) => 
        (item.id && item.id.toLowerCase().includes(query)) ||
        (item.nik && item.nik.includes(query)) ||
        (item.parentPhone && item.parentPhone.includes(query)) ||
        (item.fullName && item.fullName.toLowerCase().includes(query))
      );

      if (found) {
        setStatusSearchResult(found);
      } else {
        setStatusSearchError('Data pendaftaran tidak ditemukan. Pastikan NIK atau nomor WhatsApp sesuai.');
      }
    } catch (err) {
      setStatusSearchError('Terjadi kesalahan saat memeriksa data.');
    }
  };

  const activePPDB = isPpdbCurrentlyActive({
    ppdbOpen: settings.ppdbOpen ?? ppdbOpen,
    ppdbStartDate: settings.ppdbStartDate ?? ppdbStartDate,
    ppdbEndDate: settings.ppdbEndDate ?? ppdbEndDate
  });

  if (!activePPDB.isActive) {
    return (
      <div className="bg-white rounded-3xl shadow-xl p-8 max-w-2xl mx-auto border border-emerald-100 text-center space-y-6 my-12 animate-fade-in">
        <div className="inline-flex p-4 bg-amber-100 text-amber-800 rounded-2xl text-2xl">
          ⏳
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-900">
            {activePPDB.reason === 'not_started' ? 'Pendaftaran Santri Baru Belum Dibuka' :
             activePPDB.reason === 'ended' ? 'Pendaftaran Santri Baru Telah Ditutup' :
             'Pendaftaran Santri Baru Sedang Ditutup'}
          </h2>
          <p className="text-slate-600 text-sm leading-relaxed max-w-md mx-auto">
            {activePPDB.statusText}
          </p>
        </div>
        {onBackToHome && (
          <div className="pt-3">
            <button
              type="button"
              onClick={onBackToHome}
              className="px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold shadow transition cursor-pointer"
            >
              ← Kembali ke Beranda
            </button>
          </div>
        )}
      </div>
    );
  }

  // Component: Real-time Status Visual Badge Helper
  const renderStatusBadge = (status: RegistrationStatusType) => {
    switch (status) {
      case 'Diterima':
        return (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-xs font-black text-xs uppercase tracking-wide">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-ping" />
            <CheckCircle className="h-4 w-4 text-emerald-700" />
            <span>Status: Diterima (Resmi Lulus Seleksi)</span>
          </div>
        );
      case 'Perlu Dokumen':
        return (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-100 text-amber-950 border border-amber-300 shadow-xs font-black text-xs uppercase tracking-wide">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <AlertCircle className="h-4 w-4 text-amber-700" />
            <span>Status: Perlu Dokumen (Lengkapi Berkas)</span>
          </div>
        );
      case 'Ditolak':
        return (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-100 text-rose-950 border border-rose-300 shadow-xs font-black text-xs uppercase tracking-wide">
            <X className="h-4 w-4 text-rose-700" />
            <span>Status: Tidak Memenuhi Syarat</span>
          </div>
        );
      case 'Diproses':
      default:
        return (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 text-amber-900 border border-amber-250 shadow-xs font-black text-xs uppercase tracking-wide">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
            <Clock className="h-4 w-4 text-amber-600" />
            <span>Status: Diproses (Sedang Diverifikasi)</span>
          </div>
        );
    }
  };

  // Submitted Success View with Real-Time Badge Feedback
  if (submitted) {
    return (
      <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-9 max-w-2xl mx-auto border border-emerald-200 text-center space-y-6 animate-fade-in my-6">
        
        {/* Top Real-time Live Badge */}
        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Umpan Balik Status Pendaftaran Real-Time
          </div>
          {renderStatusBadge(currentLiveStatus)}
        </div>

        <div className="space-y-2">
          <span className="px-3 py-1 bg-slate-100 text-slate-800 border border-slate-200 text-xs font-mono font-bold rounded-lg inline-block">
            NO. REGISTRASI: {registrationId}
          </span>
          <h2 className="text-2xl font-black text-slate-900">
            Formulir Pendaftaran Berhasil Dikirim!
          </h2>
          <p className="text-slate-600 text-sm max-w-md mx-auto">
            Terima kasih telah mendaftar. Data atas nama <strong className="text-emerald-950">{formData.fullName}</strong> telah masuk dan tersimpan pada sistem penerimaan santri.
          </p>
        </div>

        {/* Real-time Progress Tracking Timeline */}
        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 text-left space-y-3">
          <div className="flex items-center justify-between text-xs font-extrabold text-slate-900 pb-2 border-b border-slate-200">
            <span>Alur Status Pendaftaran Anda</span>
            <span className="text-emerald-800 font-mono text-[11px]">Terhubung Langsung</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
            <div className={`p-3 rounded-xl border flex items-start gap-2 ${
              currentLiveStatus === 'Diproses' ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400/20' : 'bg-white border-slate-250'
            }`}>
              <div className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                1
              </div>
              <div>
                <strong className="block text-slate-900 text-xs">Diproses</strong>
                <span className="text-[11px] text-slate-600 leading-tight block">Verifikasi berkas administratif oleh panitia.</span>
              </div>
            </div>

            <div className={`p-3 rounded-xl border flex items-start gap-2 ${
              currentLiveStatus === 'Perlu Dokumen' ? 'bg-amber-100/70 border-amber-400 ring-2 ring-amber-500/20' : 'bg-white border-slate-250'
            }`}>
              <div className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                2
              </div>
              <div>
                <strong className="block text-slate-900 text-xs">Perlu Dokumen</strong>
                <span className="text-[11px] text-slate-600 leading-tight block">Lengkapi berkas fisik saat wawancara.</span>
              </div>
            </div>

            <div className={`p-3 rounded-xl border flex items-start gap-2 ${
              currentLiveStatus === 'Diterima' ? 'bg-emerald-100 border-emerald-400 ring-2 ring-emerald-500/20' : 'bg-white border-slate-250'
            }`}>
              <div className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                3
              </div>
              <div>
                <strong className="block text-slate-900 text-xs">Diterima</strong>
                <span className="text-[11px] text-slate-600 leading-tight block">Penetapan santri & pembagian asrama.</span>
              </div>
            </div>
          </div>

          {/* Interactive Simulation / Status Switcher */}
          <div className="mt-2 pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-slate-500">
              Uji Coba Tampilan Status Real-Time:
            </span>
            <div className="flex items-center gap-1.5">
              {(['Diproses', 'Perlu Dokumen', 'Diterima'] as RegistrationStatusType[]).map((statusChoice) => (
                <button
                  key={statusChoice}
                  type="button"
                  onClick={() => setCurrentLiveStatus(statusChoice)}
                  className={`px-2.5 py-1 text-[10.5px] font-bold rounded-lg transition cursor-pointer ${
                    currentLiveStatus === statusChoice
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-250'
                  }`}
                >
                  {statusChoice}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Dynamic Contextual Guidance based on active status */}
        <div className="p-4 rounded-2xl text-left text-xs leading-relaxed border transition-all">
          {currentLiveStatus === 'Diproses' && (
            <div className="bg-amber-50/70 border-amber-200 text-amber-950 p-3.5 rounded-xl space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-amber-900">
                <Clock className="h-4 w-4 text-amber-600" /> Sedang Dalam Tahap Verifikasi
              </p>
              <p className="text-[11.5px] text-amber-800">
                Panitia PSB Pondok Pesantren Al-Asy'ariyah sedang meneliti kelengkapan pendaftaran Anda. Kami akan menghubungi nomor WhatsApp (<span className="font-mono font-bold">{formData.parentPhone}</span>) untuk jadwal wawancara langsung.
              </p>
            </div>
          )}

          {currentLiveStatus === 'Perlu Dokumen' && (
            <div className="bg-amber-100/70 border-amber-300 text-amber-950 p-3.5 rounded-xl space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-amber-900">
                <AlertCircle className="h-4 w-4 text-amber-700" /> Dokumen Fisik Perlu Dilengkapi
              </p>
              <p className="text-[11.5px] text-amber-850">
                Harap membawa berkas fisik asli/fotokopi (Kartu Keluarga, Akta Kelahiran, dan Ijazah/Surat Keterangan Lulus) saat hadir ke pondok pesantren untuk diverifikasi panitia.
              </p>
            </div>
          )}

          {currentLiveStatus === 'Diterima' && (
            <div className="bg-emerald-50 border-emerald-300 text-emerald-950 p-3.5 rounded-xl space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-emerald-900">
                <CheckCircle className="h-4 w-4 text-emerald-700" /> Selamat! Calon Santri Diterima
              </p>
              <p className="text-[11.5px] text-emerald-800">
                Calon santri dinyatakan lulus dan resmi diterima sebagai santri baru di Pondok Pesantren Al-Asy'ariyah. Silakan cetak slip pendaftaran di bawah sebagai bukti resmi saat daftar ulang dan pengambilan seragam.
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center pt-2">
          <button
            type="button"
            onClick={() => setViewingSlip(true)}
            className="px-6 py-3 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-sm font-bold shadow-md transition flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto"
          >
            <Printer className="h-4 w-4" /> Cetak Slip Bukti Pendaftaran
          </button>
          
          <button
            type="button"
            onClick={handleReset}
            className="px-6 py-3 border border-slate-250 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-semibold transition w-full sm:w-auto cursor-pointer"
          >
            Daftarkan Calon Santri Lain
          </button>
        </div>

        {/* Printable Slip Modal */}
        {viewingSlip && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto print:bg-white print:p-0">
            <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 md:p-8 border border-emerald-100 flex flex-col justify-between print:shadow-none print:border-none print:p-0 my-8 text-left">
              <PrintGuideAlert />

              <div id="ppdb-slip-receipt-printable-area" className="space-y-4">
                <div className="border-b-2 border-emerald-800 pb-4 mb-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-0.5">
                      <h4 className="text-emerald-950 font-black text-base uppercase">Pondok Pesantren Al-Asy'ariyah</h4>
                      <p className="text-[10px] text-gray-500 leading-tight">
                        Mancengan Barat, Modung, Bangkalan, Madura, Jawa Timur<br />
                        Mencetak Generasi Qur'ani, Berakhlakul Karimah, Unggul, dan Mandiri
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="bg-emerald-100 px-2.5 py-1 rounded text-emerald-900 text-[10px] uppercase font-mono font-bold">
                        SLIP PENDAFTARAN
                      </span>
                      <div className="text-[11px] text-slate-500 font-mono font-bold mt-1.5">{registrationId}</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="grid grid-cols-12 gap-2 py-1.5 border-b border-slate-100">
                    <div className="col-span-4 text-slate-500 font-medium">Jenjang / Program:</div>
                    <div className="col-span-8 text-emerald-900 font-bold">{formData.jenjangPendidikan || 'Madrasah Diniyah'}</div>
                  </div>
                  <div className="grid grid-cols-12 gap-2 py-1.5 border-b border-slate-100">
                    <div className="col-span-4 text-slate-500 font-medium">Nama Calon Santri:</div>
                    <div className="col-span-8 text-slate-900 font-bold">{formData.fullName}</div>
                  </div>
                  <div className="grid grid-cols-12 gap-2 py-1.5 border-b border-slate-100">
                    <div className="col-span-4 text-slate-500 font-medium">Jenis Kelamin:</div>
                    <div className="col-span-8 text-slate-900">{formData.gender}</div>
                  </div>
                  <div className="grid grid-cols-12 gap-2 py-1.5 border-b border-slate-100">
                    <div className="col-span-4 text-slate-500 font-medium">Tempat, Tanggal Lahir:</div>
                    <div className="col-span-8 text-slate-900">{formData.birthPlace || '-'}, {formData.birthDate || '-'}</div>
                  </div>
                  <div className="grid grid-cols-12 gap-2 py-1.5 border-b border-slate-100">
                    <div className="col-span-4 text-slate-500 font-medium">NIK / NISN / No. KK:</div>
                    <div className="col-span-8 text-slate-900 font-mono text-[11px]">
                      NIK: {formData.nik || '-'} {formData.nisn ? `| NISN: ${formData.nisn}` : ''} | KK: {formData.kk || '-'}
                    </div>
                  </div>
                  <div className="grid grid-cols-12 gap-2 py-1.5 border-b border-slate-100">
                    <div className="col-span-4 text-slate-500 font-medium">Status Keluarga:</div>
                    <div className="col-span-8 text-slate-900">
                      Anak ke-{formData.anakKe || 1} dari {formData.jumlahSaudara || 1} bersaudara • Status: {formData.statusKeluarga || 'Lengkap'}
                    </div>
                  </div>
                  <div className="grid grid-cols-12 gap-2 py-1.5 border-b border-slate-100">
                    <div className="col-span-4 text-slate-500 font-medium">Nama Orang Tua:</div>
                    <div className="col-span-8 text-slate-900 font-medium">
                      Ayah: {formData.fatherName || '-'} {formData.pekerjaanAyah ? `(${formData.pekerjaanAyah})` : ''} | 
                      Ibu: {formData.motherName || '-'} {formData.pekerjaanIbu ? `(${formData.pekerjaanIbu})` : ''}
                    </div>
                  </div>
                  <div className="grid grid-cols-12 gap-2 py-1.5 border-b border-slate-100">
                    <div className="col-span-4 text-slate-500 font-medium">Kontak WhatsApp:</div>
                    <div className="col-span-8 text-emerald-800 font-mono font-bold">
                      {formData.parentPhone} {formData.waAlternatif ? `(Alt: ${formData.waAlternatif})` : ''}
                    </div>
                  </div>
                  <div className="grid grid-cols-12 gap-2 py-1.5 border-b border-slate-100">
                    <div className="col-span-4 text-slate-500 font-medium">Sekolah Asal:</div>
                    <div className="col-span-8 text-slate-900">{formData.previousSchool || '-'}</div>
                  </div>
                  <div className="grid grid-cols-12 gap-2 py-1.5 border-b border-slate-100">
                    <div className="col-span-4 text-slate-500 font-medium">Ukuran Seragam:</div>
                    <div className="col-span-8 text-slate-900 font-bold">Ukuran {formData.ukuranSeragam || 'M'}</div>
                  </div>
                  <div className="grid grid-cols-12 gap-2 py-1.5 border-b border-slate-100">
                    <div className="col-span-4 text-slate-500 font-medium">Alamat:</div>
                    <div className="col-span-8 text-slate-800">{formData.address || '-'}</div>
                  </div>
                  <div className="grid grid-cols-12 gap-2 py-1.5 border-b border-slate-100">
                    <div className="col-span-4 text-slate-500 font-medium">Status Pendaftaran:</div>
                    <div className="col-span-8 font-black uppercase text-emerald-850">
                      {currentLiveStatus}
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-dashed border-slate-300 flex items-end justify-between">
                  <div className="text-center p-2">
                    <div className="border border-emerald-400 text-emerald-800 rounded-full h-16 w-16 flex items-center justify-center text-[7px] font-mono font-bold uppercase rotate-[-6deg] bg-emerald-50/50">
                      PANITIA PSB
                    </div>
                  </div>
                  <div className="text-left space-y-1 w-[200px]">
                    <p className="text-[10px] text-slate-400">
                      {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    <p className="text-[10px] text-slate-900 font-bold uppercase">Wali Santri,</p>
                    <div className="h-10" />
                    <p className="text-xs font-bold text-slate-900 border-b border-slate-400 pb-0.5 inline-block">
                      {formData.parentName || 'Orang Tua / Wali'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-150 pt-4 mt-6 flex justify-end gap-2 print:hidden">
                <button
                  type="button"
                  onClick={() => setViewingSlip(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => downloadPrintableHTML('ppdb-slip-receipt-printable-area', `Slip_PSB_${formData.fullName}`)}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Download className="h-3.5 w-3.5" /> Unduh Dokumen
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Printer className="h-3.5 w-3.5" /> Cetak
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Calculate percentage for progress bar
  const stepPercentage = currentStep === 1 ? 33 : currentStep === 2 ? 66 : 100;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Active Submission Alert Banner if User Already Registered in this Browser */}
      {existingRegistration && !submitted && (
        <div className="bg-amber-50/90 border border-amber-250 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping shrink-0" />
            <div className="text-xs">
              <span className="font-bold text-amber-950">Pendaftaran Aktif Terakhir: </span>
              <span className="text-slate-800 font-semibold">{existingRegistration.fullName} ({existingRegistration.id})</span>
              <div className="mt-0.5">
                {renderStatusBadge((existingRegistration.status as RegistrationStatusType) || 'Diproses')}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setRegistrationId(existingRegistration.id);
              setCurrentLiveStatus((existingRegistration.status as RegistrationStatusType) || 'Diproses');
              setFormData({
                fullName: existingRegistration.fullName || '',
                gender: existingRegistration.gender || 'Laki-laki',
                jenjangPendidikan: existingRegistration.jenjangPendidikan || 'Madrasah Diniyah',
                birthPlace: existingRegistration.birthPlace || '',
                birthDate: existingRegistration.birthDate || '',
                parentName: existingRegistration.parentName || '',
                parentPhone: existingRegistration.parentPhone || '',
                waAlternatif: existingRegistration.waAlternatif || '',
                address: existingRegistration.address || '',
                previousSchool: existingRegistration.previousSchool || '',
                kk: existingRegistration.kk || '',
                nik: existingRegistration.nik || '',
                nisn: existingRegistration.nisn || '',
                anakKe: existingRegistration.anakKe || '1',
                jumlahSaudara: existingRegistration.jumlahSaudara || '1',
                statusKeluarga: existingRegistration.statusKeluarga || 'Lengkap',
                fatherName: existingRegistration.fatherName || '',
                motherName: existingRegistration.motherName || '',
                pekerjaanAyah: existingRegistration.pekerjaanAyah || '',
                pekerjaanIbu: existingRegistration.pekerjaanIbu || '',
                penghasilanOrtu: existingRegistration.penghasilanOrtu || 'Rp 1.500.000 - Rp 3.000.000',
                ukuranSeragam: existingRegistration.ukuranSeragam || 'M',
                healthHistory: existingRegistration.healthHistory || '',
                paymentType: existingRegistration.paymentType || 'Cicilan Bulanan'
              });
              setSubmitted(true);
            }}
            className="px-3 py-1.5 bg-amber-400 hover:bg-amber-350 text-emerald-950 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1 shadow-xs cursor-pointer shrink-0"
          >
            <Eye className="h-3.5 w-3.5" />
            <span>Lihat Status & Slip</span>
          </button>
        </div>
      )}

      {/* Top Header Card with Pondok Gate Picture (NO action buttons beneath - unified in hamburger menu) */}
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-emerald-100">
        <div className="relative h-44 sm:h-52 overflow-hidden bg-emerald-950">
          <img 
            src="/assets/aistudio/IMG_20260826_054619_658_fe99f9ad.jpg" 
            alt="Gerbang Pondok Pesantren Al-Asy'ariyah"
            className="w-full h-full object-cover object-[center_35%] filter brightness-90 contrast-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-emerald-950/70 to-emerald-900/40" />

          {/* Banner Floating Content */}
          <div className="absolute inset-0 p-6 sm:p-8 flex flex-col justify-end text-white">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-amber-400 text-emerald-950 font-black text-[10px] uppercase tracking-wider rounded-lg shadow-sm">
                PENERIMAAN SANTRI BARU (PSB)
              </span>
              <span className="px-3 py-1 bg-emerald-900/80 backdrop-blur-xs border border-emerald-500/40 text-amber-200 text-[10px] font-bold rounded-lg">
                Tahun Ajaran 2026 / 2027
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white drop-shadow-md">
              Formulir Pendaftaran Calon Santri Baru
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100 font-medium max-w-xl mt-1 drop-shadow-xs">
              {settings.schoolName || "Pondok Pesantren Al-Asy'ariyah"} • Mancengan Barat, Modung, Bangkalan
            </p>
          </div>
        </div>
      </div>

      {/* SIMPLE PROGRESS BAR AT TOP OF REGISTRATION FORM */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200/90 space-y-3">
        {/* Progress Header Info */}
        <div className="flex items-center justify-between text-xs font-extrabold">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-mono text-[11px]">
              Langkah {currentStep} dari 3
            </span>
            <span className="text-slate-800 hidden sm:inline">
              {currentStep === 1 && '• Identitas Calon Santri'}
              {currentStep === 2 && '• Data Orang Tua / Wali & Kontak'}
              {currentStep === 3 && '• Ringkasan Biaya Masuk & Berkas'}
            </span>
          </div>
          <span className="text-emerald-800 font-mono text-xs">{stepPercentage}% Selesai</span>
        </div>

        {/* Animated Visual Progress Track */}
        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-emerald-600 to-teal-500 h-2.5 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${stepPercentage}%` }}
          />
        </div>

        {/* Stepper Dots & Labels (Anti-collision for mobile portrait) */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 pt-1 text-center">
          <button
            type="button"
            onClick={() => {
              setStepError('');
              setCurrentStep(1);
            }}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-1.5 px-1 sm:px-2 rounded-xl transition cursor-pointer text-xs min-w-0 ${
              currentStep === 1 
                ? 'bg-emerald-50 text-emerald-900 font-extrabold border border-emerald-200' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
              currentStep >= 1 ? 'bg-emerald-800 text-white' : 'bg-slate-200 text-slate-600'
            }`}>
              {currentStep > 1 ? <Check className="h-3 w-3" /> : '1'}
            </span>
            <span className="truncate sm:hidden text-[11px] font-bold">Santri</span>
            <span className="truncate hidden sm:inline">1. Data Santri</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setStepError('');
              setCurrentStep(2);
            }}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-1.5 px-1 sm:px-2 rounded-xl transition cursor-pointer text-xs min-w-0 ${
              currentStep === 2 
                ? 'bg-emerald-50 text-emerald-900 font-extrabold border border-emerald-200' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
              currentStep >= 2 ? 'bg-emerald-800 text-white' : 'bg-slate-200 text-slate-600'
            }`}>
              {currentStep > 2 ? <Check className="h-3 w-3" /> : '2'}
            </span>
            <span className="truncate sm:hidden text-[11px] font-bold">Wali</span>
            <span className="truncate hidden sm:inline">2. Orang Tua / Wali</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setStepError('');
              setCurrentStep(3);
            }}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-1.5 px-1 sm:px-2 rounded-xl transition cursor-pointer text-xs min-w-0 ${
              currentStep === 3 
                ? 'bg-emerald-50 text-emerald-900 font-extrabold border border-emerald-200' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
              currentStep === 3 ? 'bg-emerald-800 text-white' : 'bg-slate-200 text-slate-600'
            }`}>
              3
            </span>
            <span className="truncate sm:hidden text-[11px] font-bold">Biaya</span>
            <span className="truncate hidden sm:inline">3. Biaya & Berkas</span>
          </button>
        </div>
      </div>

      {/* Validation Alert */}
      {stepError && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl flex items-center gap-2 animate-shake">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{stepError}</span>
        </div>
      )}

      {/* Multi-Step Form with Enter-Key Safeguard */}
      <form 
        onSubmit={handleSubmit} 
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
            e.preventDefault();
            if (currentStep === 1) {
              handleNextStep1();
            } else if (currentStep === 2) {
              handleNextStep2();
            }
          }
        }}
        className="space-y-6"
      >

        {/* STEP 1: IDENTITAS CALON SANTRI */}
        {currentStep === 1 && (
          <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-200/80 space-y-5 animate-fade-in">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-850 flex items-center justify-center font-bold text-sm">
                1
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900">Identitas Calon Santri</h2>
                <p className="text-xs text-slate-500">Lengkapi data diri calon santri sesuai Akta Kelahiran atau Kartu Keluarga.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Pilihan Jenjang / Program Pendidikan */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Pilihan Jenjang & Program Pendidikan <span className="text-rose-600">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    { val: 'Madrasah Diniyah', label: 'Madrasah Diniyah', desc: 'Kajian kitab kuning, fiqh, & akhlakul karimah' },
                    { val: 'SMP', label: 'SMP', desc: 'Sekolah Menengah Pertama formal terakreditasi' },
                    { val: 'SMA', label: 'SMA', desc: 'Sekolah Menengah Atas formal terakreditasi' }
                  ].map((p) => (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => setFormData({ ...formData, jenjangPendidikan: p.val as any })}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                        formData.jenjangPendidikan === p.val
                          ? 'bg-emerald-50 border-emerald-700 ring-2 ring-emerald-700/20 text-emerald-950 font-bold'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className="text-xs font-bold">{p.label}</span>
                      <span className="text-[10.5px] text-slate-500 mt-1">{p.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Full Name */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Nama Lengkap Calon Santri <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="Contoh: Muhammad Akhyar"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-250 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700 bg-slate-50/50"
                  />
                </div>
              </div>

              {/* Gender Toggle */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Jenis Kelamin <span className="text-rose-600">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, gender: 'Laki-laki' })}
                    className={`py-2.5 px-4 rounded-xl border text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                      formData.gender === 'Laki-laki'
                        ? 'bg-emerald-800 text-white border-emerald-800 shadow-sm'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>👦 Santri Putra (Laki-laki)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, gender: 'Perempuan' })}
                    className={`py-2.5 px-4 rounded-xl border text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                      formData.gender === 'Perempuan'
                        ? 'bg-emerald-800 text-white border-emerald-800 shadow-sm'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>👧 Santri Putri (Perempuan)</span>
                  </button>
                </div>
              </div>

              {/* NIK */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  NIK Calon Santri (16 Digit) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={16}
                  value={formData.nik}
                  onChange={(e) => setFormData({ ...formData, nik: e.target.value.replace(/\D/g, '') })}
                  placeholder="Contoh: 352611XXXXXXXXXX"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-250 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700 bg-slate-50/50 font-mono"
                />
              </div>

              {/* NISN (Opsional) */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  NISN (Nomor Induk Siswa Nasional) <span className="text-slate-400 font-normal">(Opsional)</span>
                </label>
                <input
                  type="text"
                  maxLength={10}
                  value={formData.nisn}
                  onChange={(e) => setFormData({ ...formData, nisn: e.target.value.replace(/\D/g, '') })}
                  placeholder="Contoh: 0081234567"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-250 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700 bg-slate-50/50 font-mono"
                />
              </div>

              {/* Birth Place */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Tempat Lahir <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.birthPlace}
                  onChange={(e) => setFormData({ ...formData, birthPlace: e.target.value })}
                  placeholder="Contoh: Bangkalan"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-250 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700 bg-slate-50/50"
                />
              </div>

              {/* Birth Date */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Tanggal Lahir <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="date"
                    required
                    value={formData.birthDate}
                    onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-250 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700 bg-slate-50/50"
                  />
                </div>
              </div>

              {/* Anak Ke & Jumlah Saudara */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Anak Ke- <span className="text-slate-400 font-normal">(dalam keluarga)</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={formData.anakKe}
                    onChange={(e) => setFormData({ ...formData, anakKe: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-250 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700 bg-slate-50/50"
                    placeholder="Anak ke"
                  />
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <span>dari</span>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={formData.jumlahSaudara}
                      onChange={(e) => setFormData({ ...formData, jumlahSaudara: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-250 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700 bg-slate-50/50"
                      placeholder="Jml saudara"
                    />
                  </div>
                </div>
              </div>

              {/* Previous School */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Sekolah Asal (SD / MI / SMP / MTs) <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <Award className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={formData.previousSchool}
                    onChange={(e) => setFormData({ ...formData, previousSchool: e.target.value })}
                    placeholder="Contoh: MI Al-Khoiriyah Modung"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-250 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700 bg-slate-50/50"
                  />
                </div>
              </div>

              {/* Health History */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Riwayat Penyakit Khusus (Bila Ada)
                </label>
                <input
                  type="text"
                  value={formData.healthHistory}
                  onChange={(e) => setFormData({ ...formData, healthHistory: e.target.value })}
                  placeholder="Tulis '-' jika tidak memiliki riwayat sakit khusus"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-250 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700 bg-slate-50/50"
                />
              </div>

            </div>

            {/* Step 1 Next Button */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleNextStep1}
                className="w-full sm:w-auto px-7 py-3 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-sm font-bold shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Lanjut: Data Orang Tua / Wali</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: DATA ORANG TUA / WALI */}
        {currentStep === 2 && (
          <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-200/80 space-y-5 animate-fade-in">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-850 flex items-center justify-center font-bold text-sm">
                2
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900">Data Orang Tua / Wali & Kontak</h2>
                <p className="text-xs text-slate-500">Nomor WhatsApp wajib aktif untuk pemberitahuan status dan jadwal tes.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Father Name */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Nama Ayah Kandung <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.fatherName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData(prev => ({
                      ...prev,
                      fatherName: val,
                      parentName: val || prev.motherName || 'Wali Santri'
                    }));
                  }}
                  placeholder="Contoh: Suryono"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-250 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700 bg-slate-50/50"
                />
              </div>

              {/* Mother Name */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Nama Ibu Kandung <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.motherName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData(prev => ({
                      ...prev,
                      motherName: val,
                      parentName: prev.fatherName || val || 'Wali Santri'
                    }));
                  }}
                  placeholder="Contoh: Siti Fatimah"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-250 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700 bg-slate-50/50"
                />
              </div>

              {/* Pekerjaan Ayah */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Pekerjaan Ayah
                </label>
                <input
                  type="text"
                  value={formData.pekerjaanAyah}
                  onChange={(e) => setFormData({ ...formData, pekerjaanAyah: e.target.value })}
                  placeholder="Contoh: Wiraswasta / Petani / Karyawan"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-250 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700 bg-slate-50/50"
                />
              </div>

              {/* Pekerjaan Ibu */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Pekerjaan Ibu
                </label>
                <input
                  type="text"
                  value={formData.pekerjaanIbu}
                  onChange={(e) => setFormData({ ...formData, pekerjaanIbu: e.target.value })}
                  placeholder="Contoh: Ibu Rumah Tangga / Guru / Pedagang"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-250 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700 bg-slate-50/50"
                />
              </div>

              {/* Status Anak dalam Keluarga */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Status Anak dalam Keluarga
                </label>
                <select
                  value={formData.statusKeluarga}
                  onChange={(e) => setFormData({ ...formData, statusKeluarga: e.target.value as any })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-250 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700 bg-slate-50/50"
                >
                  <option value="Lengkap">Lengkap (Ayah & Ibu)</option>
                  <option value="Yatim">Yatim (Ayah Wafat)</option>
                  <option value="Piatu">Piatu (Ibu Wafat)</option>
                  <option value="Yatim Piatu">Yatim Piatu</option>
                </select>
              </div>

              {/* Estimasi Penghasilan Orang Tua */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Estimasi Penghasilan Orang Tua / Bulan
                </label>
                <select
                  value={formData.penghasilanOrtu}
                  onChange={(e) => setFormData({ ...formData, penghasilanOrtu: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-250 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700 bg-slate-50/50"
                >
                  <option value="< Rp 1.500.000">&lt; Rp 1.500.000</option>
                  <option value="Rp 1.500.000 - Rp 3.000.000">Rp 1.500.000 - Rp 3.000.000</option>
                  <option value="Rp 3.000.000 - Rp 5.000.000">Rp 3.000.000 - Rp 5.000.000</option>
                  <option value="> Rp 5.000.000">&gt; Rp 5.000.000</option>
                </select>
              </div>

              {/* WhatsApp Phone */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Nomor WhatsApp Wali Aktif <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3 h-4 w-4 text-emerald-600" />
                  <input
                    type="tel"
                    required
                    value={formData.parentPhone}
                    onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                    placeholder="Contoh: 081234567890"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-250 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700 bg-slate-50/50 font-mono"
                  />
                </div>
              </div>

              {/* WhatsApp Alternatif */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Nomor WhatsApp Alternatif / Kontak Lain <span className="text-slate-400 font-normal">(Opsional)</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="tel"
                    value={formData.waAlternatif}
                    onChange={(e) => setFormData({ ...formData, waAlternatif: e.target.value })}
                    placeholder="Contoh: 085712345678"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-250 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700 bg-slate-50/50 font-mono"
                  />
                </div>
              </div>

              {/* No. KK */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  No. Kartu Keluarga (KK) (16 Digit) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={16}
                  value={formData.kk}
                  onChange={(e) => setFormData({ ...formData, kk: e.target.value.replace(/\D/g, '') })}
                  placeholder="Contoh: 352611XXXXXXXXXX"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-250 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700 bg-slate-50/50 font-mono"
                />
              </div>

              {/* Full Address */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Alamat Tempat Tinggal Lengkap <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <textarea
                    required
                    rows={2}
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Dusun, RT/RW, Desa/Kelurahan, Kecamatan, Kabupaten/Kota"
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-250 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700 bg-slate-50/50"
                  />
                </div>
              </div>

            </div>

            {/* Step 2 Navigation Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row justify-between gap-3">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-5 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer order-2 sm:order-1"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Kembali ke Data Santri</span>
              </button>

              <button
                type="button"
                onClick={handleNextStep2}
                className="px-7 py-3 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-sm font-bold shadow-md transition flex items-center justify-center gap-2 cursor-pointer order-1 sm:order-2"
              >
                <span>Lanjut: Biaya & Berkas</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: BIAYA MASUK & BERKAS */}
        {currentStep === 3 && (
          <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-200/80 space-y-5 animate-fade-in">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-850 flex items-center justify-center font-bold text-sm">
                3
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900">Ringkasan Biaya Masuk, Seragam & Berkas</h2>
                <p className="text-xs text-slate-500">Transparansi rincian biaya awal, ukuran seragam, dan kelengkapan berkas calon santri.</p>
              </div>
            </div>

            {/* Pilihan Ukuran Seragam Santri */}
            <div className="p-4 rounded-2xl border border-slate-250 bg-slate-50/80 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900">
                  Ukuran Seragam Calon Santri (Paket 3 Stel):
                </label>
                <span className="text-[11px] text-slate-500 font-medium">Bisa ditukar saat fitting di pondok</span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {(['S', 'M', 'L', 'XL', 'XXL'] as const).map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setFormData({ ...formData, ukuranSeragam: sz })}
                    className={`py-2 px-3 rounded-xl border text-xs font-extrabold transition cursor-pointer text-center ${
                      formData.ukuranSeragam === sz
                        ? 'bg-emerald-800 text-white border-emerald-800 shadow-xs'
                        : 'bg-white border-slate-250 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Size {sz}
                  </button>
                ))}
              </div>
            </div>

            {/* Compact Fee Summary */}
            <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-emerald-200/80">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                    Biaya Pendaftaran Awal
                  </span>
                  <div className="text-xl font-black text-emerald-950 mt-1">
                    {formatRupiah(feePendaftaran)}
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-xs text-slate-500 font-medium block">
                    Total Estimasi Paket Masuk Awal:
                  </span>
                  <span className="text-base font-black text-slate-800">
                    {formatRupiah(totalEstimasiAwal)}
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    (Termasuk Seragam 3 Stel, Kitab Kuning, Sarpras, & SPP Bln 1)
                  </span>
                </div>
              </div>

              {/* Skema Pilihan Pembayaran SPP */}
              <div className="pt-3">
                <label className="block text-xs font-bold text-emerald-950 mb-2">
                  Pilihan Skema Pembayaran SPP (Syahriyah):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, paymentType: 'Cicilan Bulanan' })}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                      formData.paymentType === 'Cicilan Bulanan'
                        ? 'border-emerald-700 bg-white ring-2 ring-emerald-700/20 font-bold'
                        : 'border-emerald-100 bg-white/70 hover:bg-white text-slate-600'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900">Cicilan Bulanan</div>
                      <div className="text-[11px] text-emerald-800 font-bold">{formatRupiah(feeSyahriyah)} / bulan</div>
                    </div>
                    <input
                      type="radio"
                      checked={formData.paymentType === 'Cicilan Bulanan'}
                      readOnly
                      className="h-4 w-4 accent-emerald-800"
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, paymentType: 'Langsung Lunas' })}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                      formData.paymentType === 'Langsung Lunas'
                        ? 'border-emerald-700 bg-white ring-2 ring-emerald-700/20 font-bold'
                        : 'border-emerald-100 bg-white/70 hover:bg-white text-slate-600'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900">Langsung Lunas 1 Tahun</div>
                      <div className="text-[11px] text-emerald-800 font-bold">{formatRupiah(feeSyahriyah * 12)} / tahun</div>
                    </div>
                    <input
                      type="radio"
                      checked={formData.paymentType === 'Langsung Lunas'}
                      readOnly
                      className="h-4 w-4 accent-emerald-800"
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Simple Document Uploads */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-800">
                  Unggah Berkas Pendukung (Opsional saat daftar online)
                </label>
                <span className="text-[11px] text-slate-400">
                  Bisa diserahkan langsung saat wawancara di pondok
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: 'kk_file', label: 'Fotokopi KK (Kartu Keluarga)' },
                  { key: 'akta_file', label: 'Akta Kelahiran / Surat Kelulusan' },
                ].map(({ key, label }) => {
                  const file = uploadedFiles[key];
                  return (
                    <div key={key} className="p-3 rounded-xl border border-slate-200 bg-slate-50/60">
                      <div className="text-xs font-semibold text-slate-700 mb-2">{label}</div>
                      {file ? (
                        <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-emerald-200">
                          <div className="flex items-center gap-2 truncate">
                            <FileCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                            <span className="text-xs font-mono text-emerald-950 truncate">{file.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(key)}
                            className="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex items-center justify-center gap-2 px-3 py-2 bg-white hover:bg-slate-100 border border-slate-250 border-dashed rounded-lg text-xs font-medium text-slate-600 cursor-pointer transition">
                          <Upload className="h-3.5 w-3.5 text-slate-400" />
                          <span>Pilih File (Foto / PDF)</span>
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={(e) => handleFileChange(e, key)}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Terms agreement note */}
            <div className="p-4 bg-emerald-50/80 rounded-2xl border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2.5">
              <ShieldCheck className="h-5 w-5 text-emerald-700 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Dengan mengirimkan formulir ini, Anda menyatakan data yang diisi adalah benar dan sah. Panitia akan segera memproses pendaftaran Anda secara real-time dan menghubungi nomor WhatsApp wali.
              </p>
            </div>

            {/* Step 3 Navigation Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row justify-between gap-3">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-5 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer order-2 sm:order-1"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Kembali ke Data Orang Tua</span>
              </button>

              <button
                type="submit"
                className="px-8 py-3.5 bg-gradient-to-r from-emerald-800 via-emerald-850 to-teal-850 hover:from-emerald-750 hover:to-teal-800 text-white font-extrabold text-sm rounded-xl shadow-lg transition-all transform active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer border border-emerald-700/60 order-1 sm:order-2"
              >
                <Send className="h-4 w-4" />
                <span>Kirim Formulir Pendaftaran Sekarang</span>
              </button>
            </div>

          </div>
        )}

      </form>

      {/* PANDUAN PENDAFTARAN MODAL (Triggered via Hamburger Menu) */}
      {isGuideOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 sm:p-8 border border-emerald-100 space-y-5 max-h-[90vh] overflow-y-auto text-left">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-150">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-mono text-[10.5px] font-bold uppercase">
                  <Sparkles className="h-3 w-3 text-amber-500" />
                  <span>SOP & Panduan Resmi PPDB 2026/2027</span>
                </div>
                <h3 className="font-black text-slate-900 text-lg sm:text-xl">
                  Prosedur & Panduan Pendaftaran Santri Baru
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {settings.schoolName || "Pondok Pesantren Al-Asy'ariyah"} • Modung, Bangkalan
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsGuideOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition"
                title="Tutup Panduan"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Printable Content Wrapper */}
            <div id="panduan-pendaftaran-printable-area" className="space-y-5 text-xs">
              
              {/* SECTION 1: 4 TAHAPAN ALUR PENDAFTARAN */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-emerald-950 font-black text-xs uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  I. Alur & Prosedur Pendaftaran (4 Tahap)
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/90 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-800 text-white flex items-center justify-center font-black text-[10px] shrink-0">1</span>
                      <strong className="text-slate-900 text-xs">Pengisian Formulir Online</strong>
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      Wali santri mengisi formulir secara bertahap (3 langkah: Data Santri, Data Orang Tua/Wali & WhatsApp, serta Ringkasan Biaya Masuk & Berkas).
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/90 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-800 text-white flex items-center justify-center font-black text-[10px] shrink-0">2</span>
                      <strong className="text-slate-900 text-xs">Cetak Slip & Pantau Status</strong>
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      Setelah submit, simpan <strong>Slip Bukti Pendaftaran</strong>. Pantau status real-time (🟡 <em>Diproses</em>, 🟠 <em>Perlu Dokumen</em>, 🟢 <em>Diterima</em>) di portal.
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/90 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-800 text-white flex items-center justify-center font-black text-[10px] shrink-0">3</span>
                      <strong className="text-slate-900 text-xs">Wawancara & Observasi</strong>
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      Panitia mengonfirmasi jadwal via WhatsApp. Calon santri dan wali hadir ke pondok untuk tes membaca Al-Qur'an dasar dan wawancara kesiapan santri.
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/90 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-800 text-white flex items-center justify-center font-black text-[10px] shrink-0">4</span>
                      <strong className="text-slate-900 text-xs">Kelulusan & Masuk Asrama</strong>
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      Santri yang berstatus 🟢 <strong>Diterima</strong> dapat menyelesaikan administrasi paket seragam/kitab dan langsung memperoleh kamar asrama santri.
                    </p>
                  </div>
                </div>
              </div>

              {/* SECTION 2: PERSYARATAN BERKAS & DOKUMEN */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-2 text-emerald-950 font-black text-xs uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  II. Berkas Persyaratan Administrasi
                </div>
                
                <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200/80 space-y-2">
                  <p className="font-semibold text-emerald-950 text-xs">
                    Dokumen yang diserahkan saat verifikasi fisik di pondok:
                  </p>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                      <span>Fotokopi Kartu Keluarga (KK) 2 lembar</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                      <span>Fotokopi Akta Kelahiran 2 lembar</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                      <span>Fotokopi Ijazah / SKL Legalisir 2 lembar</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                      <span>Pas Foto Santri 3x4 berwarna (3 lembar)</span>
                    </li>
                  </ul>
                  <div className="pt-2 border-t border-emerald-200/60 text-[10.5px] text-emerald-900 font-medium">
                    💡 <em>Catatan Khusus:</em> Sistem pendaftaran Al-Asy'ariyah <strong>tidak mempersyaratkan golongan darah</strong> dan <strong>tidak mewajibkan hafalan Al-Qur'an awal</strong>. Pondok menerima santri dari berbagai latar belakang untuk dibina dari tingkat dasar.
                  </div>
                </div>
              </div>

              {/* SECTION 3: BIAYA MASUK & SKEMA SPP */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-2 text-emerald-950 font-black text-xs uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  III. Rincian Biaya Masuk & Skema Syahriyah (SPP)
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 text-xs">
                    <span className="font-medium text-slate-700">Biaya Formulir & Pendaftaran Awal</span>
                    <span className="font-mono font-bold text-slate-900">{formatRupiah(feePendaftaran)}</span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 text-xs">
                    <span className="font-medium text-slate-700">Total Paket Masuk Awal (Sarpras, Seragam 3 Stel, Kitab Kuning, Kas Kesehatan & SPP Bln 1)</span>
                    <span className="font-mono font-bold text-emerald-900">{formatRupiah(totalEstimasiAwal)}</span>
                  </div>
                  <div className="text-[11px] text-slate-600 leading-relaxed">
                    <strong>Pilihan Pembayaran SPP (Syahriyah):</strong> Wali santri dapat memilih skema <em>Cicilan Bulanan</em> ({formatRupiah(feeSyahriyah)}/bulan) atau <em>Langsung Lunas 1 Tahun</em> ({formatRupiah(feeSyahriyah * 12)}/tahun).
                  </div>
                </div>
              </div>

              {/* SECTION 4: KONTAK & SEKRETARIAT */}
              <div className="p-4 bg-teal-50/70 rounded-2xl border border-teal-200 text-teal-950 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-xs text-teal-950">
                  <HelpCircle className="h-4 w-4 text-teal-700" />
                  <span>Sekretariat Panitia PSB Pondok Pesantren</span>
                </div>
                <p className="text-[11px] text-teal-900 leading-relaxed">
                  Alamat: Jl. Raya Modung, Mancengan Barat, Modung, Bangkalan, Madura, Jawa Timur.<br />
                  WhatsApp Panitia: <strong className="font-mono">0812-3456-7890</strong> • Buka setiap hari kerja (08.00 - 16.00 WIB).
                </p>
              </div>

              {/* SECTION: UNDUH BROSUR RESMI PPDB */}
              <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-250 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div>
                  <div className="font-extrabold text-xs text-amber-950 flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-amber-700" />
                    <span>Brosur Resmi Penerimaan Santri Baru (PPDB)</span>
                  </div>
                  <p className="text-[11px] text-amber-900 mt-0.5">
                    {settings.brosurPcsbUrl 
                      ? `Tersedia berkas brosur resmi: ${settings.brosurPcsbName || 'Brosur_Pendaftaran.pdf'}` 
                      : 'Unduh brosur digital lengkap dengan rincian jadwal, kurikulum, dan fasilitas pesantren.'}
                  </p>
                </div>
                {settings.brosurPcsbUrl ? (
                  <a
                    href={settings.brosurPcsbUrl}
                    download={settings.brosurPcsbName || "Brosur_PPDB_Ponpes_Al_Asyariyah"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm shrink-0"
                  >
                    <Download className="h-3.5 w-3.5 text-amber-300" />
                    <span>Unduh Brosur Resmi</span>
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => downloadPrintableHTML('panduan-pendaftaran-printable-area', 'Brosur_Panduan_PPDB_Al_Asyariyah')}
                    className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm shrink-0"
                  >
                    <Download className="h-3.5 w-3.5 text-amber-300" />
                    <span>Unduh Brosur PDF</span>
                  </button>
                )}
              </div>

            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-150 flex flex-wrap items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={() => downloadPrintableHTML('panduan-pendaftaran-printable-area', 'Panduan_Pendaftaran_Ponpes_Al_Asyariyah')}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Unduh Dokumen Panduan</span>
              </button>

              <button
                type="button"
                onClick={() => setIsGuideOpen(false)}
                className="px-6 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-sm"
              >
                Saya Mengerti & Lanjutkan Pendaftaran
              </button>
            </div>

          </div>
        </div>
      )}

      {/* CEK STATUS PENDAFTARAN MODAL (Triggered via Hamburger Menu) */}
      {isCheckStatusOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-7 border border-emerald-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Search className="h-5 w-5 text-amber-600" />
                <h3 className="font-extrabold text-slate-900 text-base">Cek Status Pendaftaran</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCheckStatusOpen(false);
                  setStatusSearchResult(null);
                  setStatusSearchError('');
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSearchStatus} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Masukkan NIK, No. WA, atau Kode Pendaftaran:
                </label>
                <div className="relative">
                  <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={statusSearchQuery}
                    onChange={(e) => setStatusSearchQuery(e.target.value)}
                    placeholder="Contoh: PCSB-123456 atau 08123456789"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-250 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
              >
                <Search className="h-3.5 w-3.5" />
                <span>Cari Status</span>
              </button>
            </form>

            {statusSearchError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                {statusSearchError}
              </div>
            )}

            {statusSearchResult && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-2.5 animate-fade-in text-left">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="font-mono font-bold text-emerald-950 text-[11px]">{statusSearchResult.id}</span>
                  {renderStatusBadge((statusSearchResult.status as RegistrationStatusType) || 'Diproses')}
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Nama Santri:</span>
                  <strong className="text-slate-900 text-sm">{statusSearchResult.fullName}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Wali Santri / Telepon:</span>
                  <span className="text-slate-800">{statusSearchResult.parentName || statusSearchResult.fatherName} • {statusSearchResult.parentPhone}</span>
                </div>
                <div className="pt-1 text-[11px] font-medium text-slate-700">
                  {statusSearchResult.status === 'Diterima' 
                    ? '🎉 Selamat! Calon santri telah dinyatakan Lulus & Diterima. Silakan hubungi panitia untuk kedatangan asrama.'
                    : statusSearchResult.status === 'Perlu Dokumen'
                    ? '⚠️ Masih ada berkas pendukung fisik yang perlu dilengkapi saat verifikasi di pondok.'
                    : '⏳ Berkas pendaftaran sedang dalam antrean verifikasi administrasi oleh panitia.'}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
