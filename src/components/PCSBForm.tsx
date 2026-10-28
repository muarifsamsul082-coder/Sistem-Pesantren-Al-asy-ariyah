import React from 'react';
import { 
  User, Phone, MapPin, Calendar, Award, CheckCircle, Sparkles, Send, 
  Printer, Download, Upload, FileText, X, BookOpen, Search, HelpCircle, 
  ArrowLeft, Check, ShieldCheck, Clock, FileCheck
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

  // Modals state for Guide & Status Check
  const [isGuideOpen, setIsGuideOpen] = React.useState(false);
  const [isCheckStatusOpen, setIsCheckStatusOpen] = React.useState(false);
  const [statusSearchQuery, setStatusSearchQuery] = React.useState('');
  const [statusSearchResult, setStatusSearchResult] = React.useState<any>(null);
  const [statusSearchError, setStatusSearchError] = React.useState('');

  // Listen to navigation events from Navbar
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

  // Form State - Cleaned of bloodType, hafalan, tahfidz
  const [formData, setFormData] = React.useState({
    fullName: '',
    gender: 'Laki-laki' as 'Laki-laki' | 'Perempuan',
    birthPlace: '',
    birthDate: '',
    parentName: '',
    parentPhone: '',
    address: '',
    previousSchool: '',
    kk: '',
    nik: '',
    fatherName: '',
    motherName: '',
    healthHistory: '',
    paymentType: 'Cicilan Bulanan' as 'Cicilan Bulanan' | 'Langsung Lunas'
  });

  const [submitted, setSubmitted] = React.useState(false);
  const [registrationId, setRegistrationId] = React.useState('');
  const [viewingSlip, setViewingSlip] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const resolvedParentName = formData.fatherName || formData.motherName || 'Wali Santri';
    const finalData = { ...formData, parentName: resolvedParentName };

    if (!finalData.fullName.trim()) {
      alert('Mohon isi nama lengkap calon santri.');
      return;
    }
    if (!finalData.parentPhone.trim()) {
      alert('Mohon isi nomor WhatsApp wali aktif.');
      return;
    }

    const generatedId = `PCSB-${Math.floor(Math.random() * 900000 + 100000)}`;
    setRegistrationId(generatedId);

    // Save to local list for status check
    try {
      const existingList = JSON.parse(localStorage.getItem('pesantren_ppdb_list') || '[]');
      const newEntry = {
        ...finalData,
        id: generatedId,
        registrationDate: new Date().toISOString().split('T')[0],
        status: 'Pending'
      };
      existingList.unshift(newEntry);
      localStorage.setItem('pesantren_ppdb_list', JSON.stringify(existingList));
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
      birthPlace: '',
      birthDate: '',
      parentName: '',
      parentPhone: '',
      address: '',
      previousSchool: '',
      kk: '',
      nik: '',
      fatherName: '',
      motherName: '',
      healthHistory: '',
      paymentType: 'Cicilan Bulanan'
    });
    setUploadedFiles({});
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
        setStatusSearchError('Data pendaftaran tidak ditemukan. Pastikan NIK atau nomor WhatsApp sesuai saat mendaftar.');
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

  // Submitted Success View
  if (submitted) {
    return (
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl mx-auto border border-emerald-200 text-center space-y-6 animate-fade-in my-6">
        <div className="inline-flex p-4 bg-emerald-100 text-emerald-850 rounded-2xl">
          <CheckCircle className="h-12 w-12 text-emerald-700" />
        </div>
        <div className="space-y-2">
          <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-mono font-bold rounded-full">
            KODE: {registrationId}
          </span>
          <h2 className="text-2xl font-black text-slate-900">Pendaftaran Berhasil Dikirim!</h2>
          <p className="text-slate-600 text-sm max-w-md mx-auto">
            Alhamdulillah, formulir pendaftaran calon santri atas nama <strong className="text-emerald-900">{formData.fullName}</strong> telah diterima oleh panitia.
          </p>
        </div>

        <div className="p-4 bg-emerald-50/70 rounded-2xl text-left text-xs text-emerald-900 space-y-2 max-w-md mx-auto border border-emerald-200/80">
          <p className="font-bold flex items-center gap-1.5 text-emerald-950">
            <Check className="h-4 w-4 text-emerald-700" /> Tahapan Selanjutnya:
          </p>
          <ol className="list-decimal pl-5 space-y-1.5 text-emerald-800 leading-relaxed">
            <li>Simpan atau cetak <strong>Slip Bukti Pendaftaran</strong> di bawah ini.</li>
            <li>Panitia akan memverifikasi berkas dan menghubungi nomor WhatsApp (<span className="font-mono font-bold">{formData.parentPhone}</span>).</li>
            <li>Membawa berkas fisik saat jadwal wawancara santri & wali santri di pondok pesantren.</li>
          </ol>
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
            className="px-6 py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-semibold transition w-full sm:w-auto cursor-pointer"
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
                    <div className="col-span-4 text-slate-500 font-medium">NIK / No. KK:</div>
                    <div className="col-span-8 text-slate-900 font-mono">NIK: {formData.nik || '-'} | KK: {formData.kk || '-'}</div>
                  </div>
                  <div className="grid grid-cols-12 gap-2 py-1.5 border-b border-slate-100">
                    <div className="col-span-4 text-slate-500 font-medium">Nama Orang Tua:</div>
                    <div className="col-span-8 text-slate-900 font-medium">Ayah: {formData.fatherName || '-'} | Ibu: {formData.motherName || '-'}</div>
                  </div>
                  <div className="grid grid-cols-12 gap-2 py-1.5 border-b border-slate-100">
                    <div className="col-span-4 text-slate-500 font-medium">WhatsApp Wali:</div>
                    <div className="col-span-8 text-emerald-800 font-mono font-bold">{formData.parentPhone}</div>
                  </div>
                  <div className="grid grid-cols-12 gap-2 py-1.5 border-b border-slate-100">
                    <div className="col-span-4 text-slate-500 font-medium">Sekolah Asal:</div>
                    <div className="col-span-8 text-slate-900">{formData.previousSchool || '-'}</div>
                  </div>
                  <div className="grid grid-cols-12 gap-2 py-1.5 border-b border-slate-100">
                    <div className="col-span-4 text-slate-500 font-medium">Alamat:</div>
                    <div className="col-span-8 text-slate-800">{formData.address || '-'}</div>
                  </div>
                  <div className="grid grid-cols-12 gap-2 py-1.5 border-b border-slate-100">
                    <div className="col-span-4 text-slate-500 font-medium">Status Pendaftaran:</div>
                    <div className="col-span-8 text-amber-600 font-bold uppercase">MENUNGGU VERIFIKASI PANITIA</div>
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Top Header Card with Pondok Gate Picture */}
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

        {/* Quick Action Navigation Bar */}
        <div className="px-5 py-3.5 bg-emerald-50/70 border-b border-emerald-100 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsGuideOpen(true)}
              className="px-3.5 py-1.5 bg-white hover:bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <BookOpen className="h-3.5 w-3.5 text-emerald-700" />
              <span>Panduan Pendaftaran</span>
            </button>
            <button
              type="button"
              onClick={() => setIsCheckStatusOpen(true)}
              className="px-3.5 py-1.5 bg-white hover:bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Search className="h-3.5 w-3.5 text-amber-600" />
              <span>Cek Status Pendaftaran</span>
            </button>
            <a
              href="https://wa.me/6281234567890?text=Assalamu'alaikum%20Panitia%20PSB%20Ponpes%20Al-Asy'ariyah,%20saya%20ingin%20bertanya%20tentang%20pendaftaran"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <HelpCircle className="h-3.5 w-3.5 text-amber-300" />
              <span>Bantuan WA Panitia</span>
            </a>
          </div>

          {onBackToHome && (
            <button
              type="button"
              onClick={onBackToHome}
              className="text-xs font-bold text-slate-500 hover:text-emerald-800 transition flex items-center gap-1 py-1 cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Kembali ke Beranda</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Registration Form */}
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Section 1: Data Calon Santri */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-200/80 space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-850 flex items-center justify-center font-bold text-sm">
              1
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Identitas Calon Santri</h2>
              <p className="text-xs text-slate-500">Lengkapi data pribadi santri baru sesuai akta/kartu keluarga.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
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

            {/* Health History */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Riwayat Penyakit Khusus (Bila Ada)
              </label>
              <input
                type="text"
                value={formData.healthHistory}
                onChange={(e) => setFormData({ ...formData, healthHistory: e.target.value })}
                placeholder="Tulis '-' jika tidak ada riwayat penyakit"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-250 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700 bg-slate-50/50"
              />
            </div>

          </div>
        </div>

        {/* Section 2: Data Orang Tua / Wali */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-200/80 space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-850 flex items-center justify-center font-bold text-sm">
              2
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Data Orang Tua / Wali & Kontak</h2>
              <p className="text-xs text-slate-500">Nomor WhatsApp wajib aktif untuk pengiriman bukti dan jadwal observasi.</p>
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

            {/* No. KK */}
            <div>
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
        </div>

        {/* Section 3: Ringkasan Biaya & Dokumen Berkas */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-200/80 space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-850 flex items-center justify-center font-bold text-sm">
              3
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Ringkasan Biaya Masuk & Berkas</h2>
              <p className="text-xs text-slate-500">Transparansi biaya santri baru dan kelengkapan dokumen.</p>
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
                Bisa diserahkan langsung saat wawancara
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

        </div>

        {/* Terms agreement note */}
        <div className="p-4 bg-emerald-50/80 rounded-2xl border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2.5">
          <ShieldCheck className="h-5 w-5 text-emerald-700 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Dengan mengirimkan formulir ini, Anda menyatakan bahwa data yang diisi adalah benar dan sah. Panitia akan segera menghubungi nomor WhatsApp Anda untuk konfirmasi jadwal observasi dan tes santri baru.
          </p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full py-3.5 bg-gradient-to-r from-emerald-800 via-emerald-850 to-teal-850 hover:from-emerald-750 hover:to-teal-800 text-white font-extrabold text-base rounded-2xl shadow-lg transition-all transform active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer border border-emerald-700/60"
        >
          <Send className="h-4 w-4" />
          <span>Kirim Formulir Pendaftaran Sekarang</span>
        </button>

      </form>

      {/* PANDUAN PENDAFTARAN MODAL */}
      {isGuideOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-7 border border-emerald-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-emerald-800" />
                <h3 className="font-extrabold text-slate-900 text-base">Panduan Pendaftaran Santri Baru</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsGuideOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-2">
                <h4 className="font-extrabold text-emerald-900 uppercase text-[11px] tracking-wider">
                  Alur & Langkah Pendaftaran:
                </h4>
                <div className="space-y-2.5">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex gap-3">
                    <span className="w-5 h-5 rounded-full bg-emerald-800 text-white flex items-center justify-center font-bold text-[10px] shrink-0">1</span>
                    <div>
                      <strong className="text-slate-900 block">Pengisian Formulir Online</strong>
                      <span className="text-slate-600">Isi data calon santri dan orang tua secara lengkap melalui formulir ini.</span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex gap-3">
                    <span className="w-5 h-5 rounded-full bg-emerald-800 text-white flex items-center justify-center font-bold text-[10px] shrink-0">2</span>
                    <div>
                      <strong className="text-slate-900 block">Konfirmasi Panitia & Cetak Slip</strong>
                      <span className="text-slate-600">Simpan slip bukti pendaftaran. Panitia akan mengirimkan konfirmasi via WhatsApp.</span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex gap-3">
                    <span className="w-5 h-5 rounded-full bg-emerald-800 text-white flex items-center justify-center font-bold text-[10px] shrink-0">3</span>
                    <div>
                      <strong className="text-slate-900 block">Wawancara & Observasi di Pondok</strong>
                      <span className="text-slate-600">Hadir ke pondok pesantren bersama calon santri untuk tes baca Al-Qur'an dan wawancara wali.</span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex gap-3">
                    <span className="w-5 h-5 rounded-full bg-emerald-800 text-white flex items-center justify-center font-bold text-[10px] shrink-0">4</span>
                    <div>
                      <strong className="text-slate-900 block">Diterima & Penempatan Asrama</strong>
                      <span className="text-slate-600">Pengambilan seragam, kitab, pembagian kamar asrama, dan mulai masa orientasi santri baru.</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                <h4 className="font-extrabold text-emerald-900 uppercase text-[11px] tracking-wider">
                  Syarat Berkas yang Wajib Dibawa Saat Tes:
                </h4>
                <ul className="list-disc pl-5 space-y-1 text-slate-700">
                  <li>Fotokopi Kartu Keluarga (KK) 2 lembar</li>
                  <li>Fotokopi Akta Kelahiran 2 lembar</li>
                  <li>Fotokopi Ijazah / Surat Keterangan Lulus (SKL)</li>
                  <li>Pas foto santri ukuran 3x4 (3 lembar) berlatar belakang merah/biru</li>
                </ul>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsGuideOpen(false)}
                className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Saya Mengerti
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CEK STATUS PENDAFTARAN MODAL */}
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
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs space-y-2 animate-fade-in text-left">
                <div className="flex items-center justify-between pb-2 border-b border-emerald-200">
                  <span className="font-mono font-bold text-emerald-950 text-[11px]">{statusSearchResult.id}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    statusSearchResult.status === 'Diterima' 
                      ? 'bg-emerald-700 text-white' 
                      : statusSearchResult.status === 'Ditolak'
                      ? 'bg-rose-700 text-white'
                      : 'bg-amber-400 text-emerald-950'
                  }`}>
                    {statusSearchResult.status || 'Pending'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Nama Santri:</span>
                  <strong className="text-slate-900 text-sm">{statusSearchResult.fullName}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Wali Santri / Telepon:</span>
                  <span className="text-slate-800">{statusSearchResult.parentName || statusSearchResult.fatherName} • {statusSearchResult.parentPhone}</span>
                </div>
                <div className="pt-1 text-[11px] text-emerald-800">
                  {statusSearchResult.status === 'Diterima' 
                    ? '🎉 Selamat! Calon santri telah dinyatakan Diterima. Silakan hubungi panitia untuk jadwal kedatangan.'
                    : '⏳ Berkas pendaftaran sedang dalam antrean verifikasi oleh kesekretariatan pondok.'}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
