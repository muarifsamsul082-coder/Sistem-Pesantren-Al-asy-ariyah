import React from 'react';
import { User, Phone, MapPin, Calendar, Award, CheckCircle, Sparkles, Send, Printer, Download, Upload, FileText, X } from 'lucide-react';
import { PCSBRegistration, PortalSettings } from '../types';
import { downloadPrintableHTML, PrintGuideAlert } from './PrintHelper';
import { isPpdbCurrentlyActive, formatIndonesianDate } from '../lib/dateUtils';

interface PCSBFormProps {
  onSubmit: (registration: Omit<PCSBRegistration, 'id' | 'registrationDate' | 'status'>) => void;
  ppdbOpen?: boolean;
  ppdbStartDate?: string;
  ppdbEndDate?: string;
  settings?: PortalSettings;
  onBackToHome?: () => void;
}

export default function PCSBForm({ onSubmit, ppdbOpen, ppdbStartDate, ppdbEndDate, settings: propSettings, onBackToHome }: PCSBFormProps) {
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

  const feeSyahriyah1Tahun = feeSyahriyah * 12;

  const formatRupiah = (val: number) => {
    return 'Rp ' + val.toLocaleString('id-ID');
  };

  const [uploadedFiles, setUploadedFiles] = React.useState<Record<string, { name: string, size: string }>>({});
  const [dragActive, setDragActive] = React.useState<Record<string, boolean>>({});

  const handleDrag = (e: React.DragEvent, key: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(prev => ({ ...prev, [key]: true }));
    } else if (e.type === "dragleave") {
      setDragActive(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleDrop = (e: React.DragEvent, key: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(prev => ({ ...prev, [key]: false }));
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setUploadedFiles(prev => ({
        ...prev,
        [key]: { name: file.name, size: (file.size / 1024).toFixed(1) + " KB" }
      }));
    }
  };

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
    bloodType: 'O',
    healthHistory: '',
    paymentType: 'Cicilan Bulanan' as 'Cicilan Bulanan' | 'Langsung Lunas'
  });

  const [submitted, setSubmitted] = React.useState(false);
  const [viewingSlip, setViewingSlip] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const resolvedParentName = formData.fatherName || formData.motherName || 'Wali Santri';
    const finalData = { ...formData, parentName: resolvedParentName };
    if (!finalData.fullName || !finalData.parentPhone || !finalData.parentName) {
      alert('Harap isi nama lengkap, nama orang tua, dan nomor telepon.');
      return;
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
      bloodType: 'O',
      healthHistory: '',
      paymentType: 'Cicilan Bulanan'
    });
    setSubmitted(false);
    setViewingSlip(false);
  };

  const activePPDB = isPpdbCurrentlyActive({
    ppdbOpen: settings.ppdbOpen ?? ppdbOpen,
    ppdbStartDate: settings.ppdbStartDate ?? ppdbStartDate,
    ppdbEndDate: settings.ppdbEndDate ?? ppdbEndDate
  });

  if (!activePPDB.isActive) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl mx-auto border border-red-100 text-center space-y-6 my-12 animate-fade-in">
        <div className="inline-flex p-4 bg-red-100 text-red-800 rounded-full text-2xl">
          🚫
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-gray-900 border-none">
            {activePPDB.reason === 'not_started' ? 'Pendaftaran Calon Santri Baru Belum Dibuka' :
             activePPDB.reason === 'ended' ? 'Pendaftaran Calon Santri Baru Telah Ditutup' :
             'Pendaftaran Calon Santri Baru Sedang Ditutup'}
          </h2>
          <p className="text-gray-600 text-sm leading-relaxed max-w-md mx-auto font-medium">
            {activePPDB.statusText}
          </p>
          <p className="text-gray-500 text-xs leading-relaxed max-w-sm mx-auto pt-2">
            Silakan hubungi panitia atau kesekretariatan Pondok Pesantren jika Anda memiliki pertanyaan lebih lanjut terkait informasi pendaftaran santri baru.
          </p>
        </div>
        {onBackToHome && (
          <div className="pt-2">
            <button
              type="button"
              onClick={onBackToHome}
              className="px-6 py-2.5 bg-emerald-850 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold shadow transition cursor-pointer"
            >
              ← Kembali ke Beranda
            </button>
          </div>
        )}
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl mx-auto border border-emerald-100 text-center space-y-6">
        <div className="inline-flex p-4 bg-emerald-100 text-emerald-800 rounded-full">
          <CheckCircle className="h-12 w-12" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-emerald-950">Pendaftaran Berhasil Dikirim!</h2>
          <p className="text-emerald-800 text-sm leading-relaxed max-w-md mx-auto">
            Alhamdulillah, berkas pendaftaran calon santri atas nama <strong className="text-emerald-950">{formData.fullName}</strong> telah kami terima.
          </p>
        </div>
        <div className="p-4 bg-emerald-50 rounded-xl text-left text-xs text-emerald-800 space-y-2 max-w-md mx-auto border border-emerald-100">
          <p className="font-bold text-emerald-950">Langkah Selanjutnya:</p>
          <ol className="list-decimal pl-4 space-y-1 font-medium">
            <li>Simpan bukti pendaftaran ini dengan mengklik tombol cetak slip di bawah.</li>
            <li>Admin Pesantren akan memverifikasi kelengkapan data pendaftaran Anda.</li>
            <li>Anda akan dihubungi oleh panitia PCSB melalui nomor WhatsApp (<strong className="font-mono">{formData.parentPhone}</strong>) untuk jadwal wawancara, tes penempatan, dan penjemputan berkas.</li>
          </ol>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <button
            type="button"
            onClick={() => setViewingSlip(true)}
            className="px-6 py-2.5 bg-gradient-to-r from-emerald-800 to-teal-900 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl text-sm font-bold shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer w-full sm:w-auto"
          >
            <Printer className="h-4 w-4" /> Cetak Slip PCSB Mandiri ⎙
          </button>
          
          <button
            type="button"
            onClick={handleReset}
            className="px-6 py-2.5 border border-gray-300 hover:bg-gray-150 text-gray-700 rounded-xl text-sm font-semibold transition w-full sm:w-auto cursor-pointer"
          >
            Daftarkan Calon Santri Lain
          </button>
        </div>        {/* PRINTABLE SLIP MODAL FOR THE REGISTERED USER */}
        {viewingSlip && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-950/75 backdrop-blur-sm overflow-y-auto print:bg-white print:p-0">
            <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 md:p-8 border border-emerald-100 flex flex-col justify-between print:shadow-none print:border-none print:p-0 my-8">
              
              <PrintGuideAlert />

              {/* Printable Wrapper */}
              <div id="ppdb-slip-receipt-printable-area" className="space-y-4">
                {/* Kop Surat Header */}
                <div className="border-b-2 border-emerald-700 pb-4 mb-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1 text-left">
                      <h4 className="text-emerald-900 font-extrabold text-base sm:text-lg tracking-wide uppercase">Pondok Pesantren Al-Asy'ariyah</h4>
                      <p className="text-[10px] text-gray-500 max-w-sm leading-relaxed">
                        Jl. Raya Modung, Langpanggang, Modung, Bangkalan, Jawa Timur<br />
                        Mencetak Generasi Qur'ani, Berakhlakul Karimah, Unggul, dan Mandiri
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="bg-emerald-100 px-3 py-1 rounded text-emerald-800 text-[10px] uppercase font-mono font-bold tracking-widest leading-none">
                        BUKTI PENDAFTARAN
                      </span>
                      <div className="text-[11px] text-gray-400 font-mono mt-2">ID: PCSB-{Math.floor(Math.random() * 900000 + 100000)}</div>
                    </div>
                  </div>
                </div>

                {/* Event Content Details */}
                <div className="space-y-3 text-xs text-left">
                  <div className="grid grid-cols-12 gap-2 pb-2 border-b border-gray-100">
                    <div className="col-span-4 text-gray-500 font-medium">Nama Lengkap:</div>
                    <div className="col-span-8 text-gray-900 font-black">{formData.fullName}</div>
                  </div>

                  <div className="grid grid-cols-12 gap-2 pb-2 border-b border-gray-100">
                    <div className="col-span-4 text-gray-500 font-medium">Jenis Kelamin:</div>
                    <div className="col-span-8 text-gray-900">{formData.gender}</div>
                  </div>

                  <div className="grid grid-cols-12 gap-2 pb-2 border-b border-gray-100">
                    <div className="col-span-4 text-gray-500 font-medium">Tempat, Tgl Lahir:</div>
                    <div className="col-span-8 text-gray-950">{formData.birthPlace}, {formData.birthDate}</div>
                  </div>

                  <div className="grid grid-cols-12 gap-2 pb-2 border-b border-gray-100">
                    <div className="col-span-4 text-gray-500 font-medium">Nomor NIK / KK:</div>
                    <div className="col-span-8 text-gray-900 font-mono">NIK: {formData.nik} / KK: {formData.kk}</div>
                  </div>

                  <div className="grid grid-cols-12 gap-2 pb-2 border-b border-gray-100">
                    <div className="col-span-4 text-gray-500 font-medium">Nama Orang Tua:</div>
                    <div className="col-span-8 text-gray-900 font-bold">Ayah: {formData.fatherName} / Ibu: {formData.motherName}</div>
                  </div>

                  <div className="grid grid-cols-12 gap-2 pb-2 border-b border-gray-100">
                    <div className="col-span-4 text-gray-500 font-medium">Sekolah Asal:</div>
                    <div className="col-span-8 text-gray-900">{formData.previousSchool}</div>
                  </div>

                  <div className="grid grid-cols-12 gap-2 pb-2 border-b border-gray-100">
                    <div className="col-span-4 text-gray-500 font-medium">Kontak WhatsApp:</div>
                    <div className="col-span-8 text-emerald-800 font-mono font-bold">{formData.parentPhone}</div>
                  </div>

                  <div className="grid grid-cols-12 gap-2 pb-2 border-b border-gray-100">
                    <div className="col-span-4 text-gray-500 font-medium">Alamat Rumah:</div>
                    <div className="col-span-8 text-gray-800">{formData.address}</div>
                  </div>

                  <div className="grid grid-cols-12 gap-2 pb-2 border-b border-gray-100">
                    <div className="col-span-4 text-gray-500 font-medium">Status Pengajuan:</div>
                    <div className="col-span-8 text-amber-600 font-black uppercase">MENUNGGU VERIFIKASI BERKAS</div>
                  </div>
                </div>

                {/* Tanda Tangan */}
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div className="text-gray-400 text-[10px] italic text-left">
                    Dokumen ini sah dicetak langsung setelah pengisian online sistem PCSB Mandiri Al-Asy'ariyah.
                  </div>

                  <div className="text-center space-y-1 w-44">
                    <p className="text-[10px] text-gray-400">{new Date().toISOString().split('T')[0]}</p>
                    <div className="relative inline-block py-1">
                      <span className="absolute top-1 left-2/4 -translate-x-2/4 border border-emerald-300 text-emerald-600/70 rounded-full text-[8px] font-bold px-1 uppercase rotate-6 border-dashed whitespace-nowrap bg-white">
                        PCSB ONLINE SYSTEM
                      </span>
                      <div className="h-6 w-20 mx-auto opacity-10 bg-[radial-gradient(#059669_1px,transparent_1px)] bg-[size:4px_4px]" />
                    </div>
                    <p className="text-xs font-bold text-gray-900 border-b border-gray-300 pb-0.5 inline-block">{formData.parentName}</p>
                    <p className="text-[9px] text-gray-400 uppercase tracking-wider block font-bold leading-none">Pendaftar / Wali Santri</p>
                  </div>
                </div>
              </div>

              {/* Actions footer */}
              <div className="border-t border-gray-150 pt-4 mt-6 flex flex-wrap justify-end gap-2 print:hidden">
                <button
                  type="button"
                  onClick={() => setViewingSlip(false)}
                  className="px-4 py-1.5 border border-gray-300 hover:bg-gray-100 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Tutup
                </button>
                
                <button
                  type="button"
                  onClick={() => downloadPrintableHTML('ppdb-slip-receipt-printable-area', `Slip_Pendaftaran_${formData.fullName}`)}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-sm"
                >
                  <Download className="h-3.5 w-3.5" /> Unduh HTML Offline 📥
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-1.5 bg-gradient-to-r from-emerald-800 to-teal-900 hover:from-emerald-700 hover:to-teal-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-sm"
                >
                  <Printer className="h-3.5 w-3.5" /> Cetak Slip ⎙
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-3xl mx-auto border border-emerald-100">
      <div className="bg-gradient-to-r from-emerald-850 to-teal-900 px-6 py-8 text-white">
        <div className="flex items-center gap-3">
          <div className="bg-amber-400 p-2.5 rounded-xl text-emerald-950">
            <Sparkles className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold">Penerimaan Calon Santri Baru</h2>
            <p className="text-emerald-100 text-xs">Pondok Pesantren Al-Asy'ariyah • Tahun Ajaran 2026/2027</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
        
        {/* Section 1: Data Calon Santri */}
        <div>
          <h3 className="text-sm font-bold text-emerald-900 uppercase tracking-widest border-b border-emerald-100 pb-2 mb-4">
            I. Identitas Calon Santri
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-emerald-800 mb-1">Nama Lengkap Calon Santri *</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-emerald-600/40" />
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Contoh: Muhammad Akhyar"
                  className="w-full pl-10 pr-4 py-2 border border-emerald-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700 bg-emerald-50/10"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-emerald-800 mb-1">Jenis Kelamin *</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, gender: 'Laki-laki' })}
                  className={`py-2 px-3 text-sm rounded-lg border text-center font-medium transition ${
                    formData.gender === 'Laki-laki'
                      ? 'bg-emerald-800 text-white border-emerald-800'
                      : 'border-emerald-100 text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  Laki-laki (Putra)
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, gender: 'Perempuan' })}
                  className={`py-2 px-3 text-sm rounded-lg border text-center font-medium transition ${
                    formData.gender === 'Perempuan'
                      ? 'bg-emerald-800 text-white border-emerald-800'
                      : 'border-emerald-100 text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  Perempuan (Putri)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-emerald-800 mb-1">Tempat Lahir *</label>
              <input
                type="text"
                required
                value={formData.birthPlace}
                onChange={(e) => setFormData({ ...formData, birthPlace: e.target.value })}
                placeholder="Contoh: Semarang"
                className="w-full px-4 py-2 border border-emerald-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700 bg-emerald-50/10"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-emerald-800 mb-1">Tanggal Lahir *</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-emerald-600/40" />
                <input
                  type="date"
                  required
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-emerald-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700 bg-emerald-50/10"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-emerald-800 mb-1">NIK Calon Santri (16 Digit) *</label>
              <input
                type="text"
                required
                maxLength={16}
                pattern="[0-9]{16}"
                title="NIK harus berupa 16 digit angka"
                value={formData.nik}
                onChange={(e) => setFormData({ ...formData, nik: e.target.value.replace(/\D/g, '') })}
                placeholder="Contoh: 331812XXXXXXXXXX"
                className="w-full px-4 py-2 border border-emerald-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700 bg-emerald-50/10 font-mono"
              />
            </div>



            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-emerald-800 mb-1">Sekolah Asal (SD/MI/SMP/MTs) *</label>
              <div className="relative">
                <Award className="absolute left-3 top-2.5 h-4 w-4 text-emerald-600/40" />
                <input
                  type="text"
                  required
                  value={formData.previousSchool}
                  onChange={(e) => setFormData({ ...formData, previousSchool: e.target.value })}
                  placeholder="Contoh: MI Al-Khoiriyah"
                  className="w-full pl-10 pr-4 py-2 border border-emerald-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700 bg-emerald-50/10"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Data Orang Tua / Wali */}
        <div>
          <h3 className="text-sm font-bold text-emerald-900 uppercase tracking-widest border-b border-emerald-100 pb-2 mb-4">
            II. Identitas Orang Tua / Wali
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-emerald-800 mb-1">No. Kartu Keluarga (KK) (16 Digit) *</label>
              <input
                type="text"
                required
                maxLength={16}
                pattern="[0-9]{16}"
                title="Nomor KK harus 16 digit angka"
                value={formData.kk}
                onChange={(e) => setFormData({ ...formData, kk: e.target.value.replace(/\D/g, '') })}
                placeholder="Contoh: 331811XXXXXXXXXX"
                className="w-full px-4 py-2 border border-emerald-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700 bg-emerald-50/10 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-emerald-800 mb-1">Nama Lengkap Ayah Kandung *</label>
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
                className="w-full px-4 py-2 border border-emerald-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700 bg-emerald-50/10"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-emerald-800 mb-1">Nama Lengkap Ibu Kandung *</label>
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
                placeholder="Contoh: Nur Fatimah"
                className="w-full px-4 py-2 border border-emerald-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700 bg-emerald-50/10"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-emerald-800 mb-1">Nomor WhatsApp Wali Aktif *</label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-emerald-600/40" />
                <input
                  type="tel"
                  required
                  value={formData.parentPhone}
                  onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                  placeholder="Contoh: 081234567890"
                  className="w-full pl-10 pr-4 py-2 border border-emerald-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700 bg-emerald-50/10 font-mono"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-emerald-800 mb-1">Alamat Rumah Lengkap *</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-emerald-600/40" />
                <textarea
                  required
                  rows={3}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Contoh: Jl. Raya Modung, Langpanggang, Modung, Bangkalan, Jawa Timur"
                  className="w-full pl-10 pr-4 py-2 border border-emerald-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700 bg-emerald-50/10"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Rincian Biaya & Pilihan Pembayaran */}
        <div>
          <h3 className="text-sm font-bold text-emerald-900 uppercase tracking-widest border-b border-emerald-100 pb-2 mb-4 flex items-center gap-2">
            <span>💸</span> III. Rincian Biaya & Pilihan Syahriah Santri Baru
          </h3>
          <p className="text-[11px] text-gray-500 mb-4">
            Silakan tinjau rincian komponen biaya yang wajib dibayarkan oleh wali santri baru dan pilih preferensi metode pelunasan Syahriah (SPP) 1 tahun.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-emerald-50/40 border border-emerald-100/80 p-4 rounded-xl text-center">
              <span className="text-lg">📝</span>
              <div className="text-[10px] text-emerald-850 font-bold uppercase mt-1">Uang Pendaftaran</div>
              <div className="text-base font-black text-emerald-950 mt-1">{formatRupiah(feePendaftaran)}</div>
              <span className="text-[9px] text-gray-400 block mt-0.5">Wajib dibayar di awal</span>
            </div>

            <div className="bg-emerald-50/40 border border-emerald-100/80 p-4 rounded-xl text-center">
              <span className="text-lg">🎒</span>
              <div className="text-[10px] text-emerald-850 font-bold uppercase mt-1">Uang Lain-lain</div>
              <div className="text-base font-black text-emerald-950 mt-1">{formatRupiah(feeLainLain)}</div>
              <span className="text-[9px] text-gray-400 block mt-0.5">Sarpras, Seragam, Kitab, & Kas</span>
            </div>

            <div className="bg-emerald-50/40 border border-emerald-100/80 p-4 rounded-xl text-center">
              <span className="text-lg">🕌</span>
              <div className="text-[10px] text-emerald-850 font-bold uppercase mt-1">Syahriyah (SPP) 1 Tahun</div>
              <div className="text-base font-black text-emerald-950 mt-1">{formatRupiah(feeSyahriyah1Tahun)}</div>
              <span className="text-[9px] text-gray-400 block mt-0.5">Iuran pendidikan 1 tahun</span>
            </div>
          </div>

          <div className="bg-emerald-50/20 border border-emerald-100/60 p-5 rounded-2xl space-y-4">
            <label className="block text-xs font-bold text-emerald-900 uppercase tracking-wider mb-2">Preferensi Metode Bayar Syahriyah:</label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, paymentType: 'Cicilan Bulanan' })}
                className={`p-4 rounded-xl border text-left transition relative flex flex-col space-y-1 cursor-pointer ${
                  formData.paymentType === 'Cicilan Bulanan'
                    ? 'border-emerald-700 bg-white shadow-sm ring-2 ring-emerald-700/20'
                    : 'border-emerald-100 bg-white/50 hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">Cicilan Bulanan</span>
                  <input
                    type="radio"
                    checked={formData.paymentType === 'Cicilan Bulanan'}
                    readOnly
                    className="h-4 w-4 accent-emerald-800"
                  />
                </div>
                <p className="text-[11px] font-bold text-emerald-800">{formatRupiah(feeSyahriyah)} / Bulan</p>
                <p className="text-[10px] text-gray-400 font-medium leading-relaxed">Dibayar bertahap setiap bulan selama 12 bulan.</p>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, paymentType: 'Langsung Lunas' })}
                className={`p-4 rounded-xl border text-left transition relative flex flex-col space-y-1 cursor-pointer ${
                  formData.paymentType === 'Langsung Lunas'
                    ? 'border-emerald-700 bg-white shadow-sm ring-2 ring-emerald-700/20'
                    : 'border-emerald-100 bg-white/50 hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">Langsung Lunas (1 Tahun)</span>
                  <input
                    type="radio"
                    checked={formData.paymentType === 'Langsung Lunas'}
                    readOnly
                    className="h-4 w-4 accent-emerald-800"
                  />
                </div>
                <p className="text-[11px] font-bold text-emerald-800">{formatRupiah(feeSyahriyah1Tahun)} / Tahun</p>
                <p className="text-[10px] text-gray-400 font-medium leading-relaxed">Melunasi seluruh biaya Syahriah 1 tahun sekaligus di awal.</p>
              </button>
            </div>

            <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-150 text-[10px] text-amber-800 leading-relaxed font-semibold">
              ℹ️ <strong>Catatan Syahriyah:</strong> Preferensi metode di atas akan tersimpan. Biaya bulanan (Syahriyah/SPP) baru akan diterbitkan dan muncul di Portal Wali Santri setelah calon santri resmi melakukan verifikasi kehadiran fisik dan berkas di pondok pesantren.
            </div>
          </div>
        </div>

        {/* Section 4: Berkas Persyaratan Kelengkapan */}
        <div>
          <h3 className="text-sm font-bold text-emerald-900 uppercase tracking-widest border-b border-emerald-100 pb-2 mb-4 flex items-center gap-2">
            <span>📎</span> IV. Berkas Kelengkapan Calon Santri (Persyaratan Fisik / Unggah Softcopy)
          </h3>
          <p className="text-[11px] text-gray-500 mb-4">
            Silakan unggah pindaian (softcopy) dokumen pendukung di bawah ini. Anda juga wajib membawa dokumen fisik asli/fotokopi saat hadir melakukan verifikasi di pesantren.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { key: 'kk_file', label: 'Fotokopi Kartu Keluarga (KK) *', desc: 'Format PDF/JPG, Maksimal 2MB' },
              { key: 'akta_file', label: 'Fotokopi Akta Kelahiran *', desc: 'Format PDF/JPG, Maksimal 2MB' },
              { key: 'ijazah_file', label: 'Ijazah Terakhir / Surat Lulus (SKL) *', desc: 'Format PDF/JPG, Maksimal 5MB' },
            ].map(({ key, label, desc }) => {
              const file = uploadedFiles[key];
              const isDrag = !!dragActive[key];
              return (
                <div key={key} className="p-4 rounded-xl border border-dashed border-emerald-200/80 bg-emerald-50/5 flex flex-col justify-between space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-emerald-850 mb-0.5">{label}</label>
                    <span className="text-[10px] text-gray-400 block mb-2">{desc}</span>
                  </div>

                  <div
                    onDragEnter={(e) => handleDrag(e, key)}
                    onDragOver={(e) => handleDrag(e, key)}
                    onDragLeave={(e) => handleDrag(e, key)}
                    onDrop={(e) => handleDrop(e, key)}
                    className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all ${
                      file
                        ? 'border-emerald-500 bg-emerald-50/20'
                        : isDrag
                        ? 'border-amber-400 bg-amber-50/30 scale-[0.98]'
                        : 'border-gray-200 hover:border-emerald-600 hover:bg-emerald-50/10'
                    }`}
                    style={{ minHeight: '100px' }}
                  >
                    <input
                      type="file"
                      id={`file-input-${key}`}
                      className="hidden"
                      onChange={(e) => handleFileChange(e, key)}
                      accept="image/*,application/pdf"
                    />

                    {file ? (
                      <div className="flex flex-col items-center justify-center space-y-1">
                        <FileText className="h-8 w-8 text-emerald-600" />
                        <p className="text-[11px] font-semibold text-emerald-950 truncate max-w-full font-mono px-2">{file.name}</p>
                        <p className="text-[10px] text-gray-500 font-mono">{file.size}</p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(key);
                          }}
                          className="mt-2 text-[10px] font-bold text-red-650 hover:text-red-800 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-md border border-red-200 flex items-center gap-1 transition"
                        >
                          <X className="h-3 w-3" /> Hapus Berkas
                        </button>
                      </div>
                    ) : (
                      <label htmlFor={`file-input-${key}`} className="cursor-pointer flex flex-col items-center justify-center space-y-1.5 py-1">
                        <Upload className="h-6 w-6 text-emerald-600/60" />
                        <p className="text-[11px] font-medium text-emerald-900">
                          <span className="font-bold underline text-emerald-700">Klik untuk upload</span> atau seret file ke sini
                        </p>
                        <p className="text-[9px] text-gray-400">PDF, JPG, JPEG, atau PNG</p>
                      </label>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 5: Rincian Tagihan Pendaftaran & Biaya Awal (Wajib) */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest border-b border-slate-200 pb-2 flex items-center gap-2">
            <span>💳</span> V. Rincian Jumlah Tagihan Pendaftaran & Biaya Masuk Santri Baru
          </h3>
          <p className="text-[11px] text-gray-500">
            Berikut adalah rincian lengkap seluruh item tagihan keuangan awal untuk Santri Baru:
          </p>
          <div className="space-y-2 bg-white p-4 rounded-xl border border-slate-150 text-xs">
            {(() => {
              const billingItems = [
                {
                  enabled: enabledPendaftaran,
                  title: (
                    <span>
                      Biaya Pendaftaran Calon Santri Baru (PCSB){' '}
                      <span className="text-[10px] text-emerald-700 font-bold">(Wajib Segera)</span>
                    </span>
                  ),
                  amount: feePendaftaran,
                },
                {
                  enabled: enabledSarpras,
                  title: 'Infaq Pengembangan Sarpras & Gedung',
                  amount: feeSarpras,
                },
                {
                  enabled: enabledSeragam,
                  title: 'Seragam Resmi & Atribut Pesantren (3 Stel)',
                  amount: feeSeragam,
                },
                {
                  enabled: enabledKitab,
                  title: 'Paket Kitab Kuning & Buku Panduan Belajar',
                  amount: feeKitab,
                },
                {
                  enabled: enabledKesehatan,
                  title: 'Kas Kesehatan & Penyediaan Lemari Asrama',
                  amount: feeKesehatan,
                },
                {
                  enabled: enabledSyahriyah,
                  title: 'Iuran Syahriyah / SPP Bulan Pertama (Juli)',
                  amount: feeSyahriyah,
                },
              ];

              return billingItems
                .filter((item) => item.enabled)
                .map((item, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between text-slate-700 pt-1 pb-2 border-b border-slate-100 first:pt-0"
                  >
                    <span className="font-medium">
                      {idx + 1}. {item.title}
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      {formatRupiah(item.amount)}
                    </span>
                  </div>
                ));
            })()}
            <div className="flex justify-between items-center text-emerald-950 font-black text-sm pt-2">
              <span>Total Estimasi Biaya Masuk Awal</span>
              <span className="font-mono text-emerald-800 text-base">
                {formatRupiah(
                  (enabledPendaftaran ? feePendaftaran : 0) +
                  feeLainLain +
                  (enabledSyahriyah ? feeSyahriyah : 0)
                )}
              </span>
            </div>
          </div>
          <div className="p-3 bg-teal-50 border border-teal-100 rounded-xl text-[10.5px] text-teal-850 leading-relaxed font-semibold">
            📢 <strong>Informasi Tampilan Tagihan:</strong> Biaya Pendaftaran ({formatRupiah(feePendaftaran)}) tertera di formulir ini untuk registrasi awal. Seluruh rincian biaya masuk awal di atas beserta SPP bulanan berikutnya akan otomatis diterbitkan dan ditampilkan secara transparan di <strong>Portal Wali Santri</strong> setelah calon santri dinyatakan Lulus dan Diterima.
          </div>
        </div>

        <div className="p-4 bg-emerald-50 rounded-xl text-emerald-800 text-xs leading-relaxed border border-emerald-100">
          ⚠️ Dengan mengklik tombol <strong>"Kirim Formulir Pendaftaran"</strong>, Anda menyatakan bahwa seluruh data yang diisi adalah benar, sah, dan dapat dipertanggungjawabkan serta setuju untuk mengikuti semua prosedur Penerimaan Calon Santri Baru Pondok Pesantren Al-Asy'ariyah.
        </div>

        <button
          type="submit"
          className="w-full py-3 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-sm font-bold shadow-md transition flex items-center justify-center gap-2"
        >
          <Send className="h-4 w-4" />
          Kirim Formulir Pendaftaran Calon Santri
        </button>
      </form>
    </div>
  );
}
