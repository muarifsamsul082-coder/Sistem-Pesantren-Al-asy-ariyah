import React from 'react';
import { X, Printer, Download, Share2, CheckCircle2, AlertCircle, FileText, User, School, Calendar, DollarSign } from 'lucide-react';
import { Student, Bill, PortalSettings } from '../types';
import { downloadPrintableA4ReceiptHTML, PrintGuideAlert } from './PrintHelper';

interface StudentBillingReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  allStudents?: Student[];
  onSelectStudent?: (student: Student) => void;
  bills: Bill[];
  settings: PortalSettings;
  onClearObligations?: (studentId: string, studentName: string) => void;
}

export const StudentBillingReceiptModal: React.FC<StudentBillingReceiptModalProps> = ({
  isOpen,
  onClose,
  student,
  allStudents = [],
  onSelectStudent,
  bills,
  settings,
  onClearObligations,
}) => {
  const [selectedStudentId, setSelectedStudentId] = React.useState<string>(student?.id || '');
  const [studentSearch, setStudentSearch] = React.useState<string>('');

  React.useEffect(() => {
    if (student) {
      setSelectedStudentId(student.id);
    }
  }, [student]);

  if (!isOpen) return null;

  // Resolve active student
  const activeStudent = student || allStudents.find(s => s.id === selectedStudentId) || allStudents[0] || null;

  if (!activeStudent) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-950/80 backdrop-blur-sm">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full text-center space-y-4">
          <AlertCircle className="h-10 w-10 text-amber-500 mx-auto" />
          <h3 className="font-bold text-gray-900 text-base">Data Santri Tidak Ditemukan</h3>
          <p className="text-xs text-gray-500">Tidak ada santri yang dipilih untuk mencetak rekapitulasi tagihan.</p>
          <button
            onClick={onClose}
            className="w-full py-2 bg-emerald-800 text-white font-bold rounded-xl text-xs hover:bg-emerald-700 transition"
          >
            Tutup
          </button>
        </div>
      </div>
    );
  }

  // Filter bills strictly belonging to this student (by studentId or match by NIS / fullName)
  const studentBills = bills.filter(b => 
    b.studentId === activeStudent.id ||
    (b.nis && activeStudent.nis && b.nis === activeStudent.nis) ||
    (b.studentName && activeStudent.fullName && b.studentName.trim().toLowerCase() === activeStudent.fullName.trim().toLowerCase())
  );

  // Compute breakdown totals
  const totalAmount = studentBills.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
  const paidBills = studentBills.filter(b => b.status === 'Lunas');
  const unpaidBills = studentBills.filter(b => b.status === 'Belum Lunas');
  const pendingVerifyBills = studentBills.filter(b => b.status === 'Konfirmasi Pembayaran');

  const paidAmount = paidBills.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
  const unpaidAmount = unpaidBills.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
  const pendingAmount = pendingVerifyBills.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);

  const isAlumni = activeStudent.status === 'Alumni' || 
    (activeStudent as any).alumniReason !== undefined || 
    (activeStudent as any).tahunKeluar !== undefined;

  // Status evaluasi akurat: jika tidak memiliki tagihan atau total tagihan 0, berarti BEBAS TANGGUNGAN (LUNAS)
  const hasNoObligations = studentBills.length === 0 || totalAmount === 0;
  const isFullyPaid = !hasNoObligations && unpaidAmount === 0 && pendingAmount === 0;
  const isPendingVerification = !hasNoObligations && unpaidAmount === 0 && pendingAmount > 0;
  const isUnpaid = !hasNoObligations && unpaidAmount > 0;

  const paymentPercentage = totalAmount > 0 
    ? Math.round((paidAmount / totalAmount) * 100) 
    : (hasNoObligations ? 100 : 0);

  // For alumni, if there are no unpaid bills or no obligations, they are 100% BEBAS TANGGUNGAN
  const isAlumniBebasTanggungan = isAlumni && (unpaidAmount === 0);

  // Resolve bendahara based on student's gender
  const isPutra = activeStudent.gender === 'Laki-laki' || (activeStudent.gender as any) === 'Putra';
  const bendaharaName = isPutra
    ? (settings.namaBendaharaPutra || settings.namaBendahara || 'Ustadz Ahmad Fauzi, S.E.')
    : (settings.namaBendaharaPutri || settings.namaBendahara || 'Ustadzah Siti Aminah, S.E.');
  const bendaharaTtd = isPutra
    ? (settings.ttdBendaharaPutraUrl || settings.ttdBendaharaUrl)
    : (settings.ttdBendaharaPutriUrl || settings.ttdBendaharaUrl);
  const bendaharaStempel = isPutra
    ? (settings.stempelBendaharaPutraUrl || settings.stempelBendaharaUrl || settings.stempelPesantrenUrl)
    : (settings.stempelBendaharaPutriUrl || settings.stempelBendaharaUrl || settings.stempelPesantrenUrl);
  const bendaharaJabatan = isPutra ? 'Bendahara Asrama Putra' : 'Bendahara Asrama Putri';

  // Helper to extract city from address
  const getCityFromAddress = (addr?: string): string => {
    if (!addr) return 'Bangkalan';
    const parts = addr.split(',');
    return parts.length > 2 ? parts[parts.length - 2].trim() : 'Bangkalan';
  };

  const isImageUrl = (val?: string): boolean => {
    if (!val) return false;
    return val.startsWith('data:image/') || val.startsWith('http') || val.startsWith('/uploads/');
  };

  const todayFormatted = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const invoiceNumber = isAlumni
    ? (isAlumniBebasTanggungan 
        ? `SK-BT/${activeStudent.nis || 'ALM'}/${new Date().getFullYear()}`
        : `SK-TG/${activeStudent.nis || 'ALM'}/${new Date().getFullYear()}`)
    : `INV-${activeStudent.nis || 'STD'}-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  const documentTitle = isAlumni
    ? (isAlumniBebasTanggungan ? `Surat_Bebas_Tanggungan_${activeStudent.fullName.replace(/\s+/g, '_')}_NIS_${activeStudent.nis}` : `Surat_Tunggakan_Alumni_${activeStudent.fullName.replace(/\s+/g, '_')}_NIS_${activeStudent.nis}`)
    : `Rekap_Tagihan_${activeStudent.fullName.replace(/\s+/g, '_')}_NIS_${activeStudent.nis}`;

  // Filter student dropdown list
  const filteredStudents = allStudents.filter(s =>
    (s.fullName || '').toLowerCase().includes(studentSearch.toLowerCase()) ||
    (s.nis || '').includes(studentSearch)
  );

  const handlePrint = () => {
    downloadPrintableA4ReceiptHTML('student-billing-a4-printable-area', documentTitle);
  };

  const handleSendWhatsApp = () => {
    if (!activeStudent.parentPhone) {
      alert('Nomor HP/WhatsApp Wali Santri tidak tersedia dalam data santri.');
      return;
    }

    const cleanPhone = activeStudent.parentPhone.replace(/[^0-9]/g, '');
    const targetPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;

    let itemsList = studentBills.map((b, i) => 
      `${i + 1}. *${b.title}* - Rp ${Number(b.amount).toLocaleString('id-ID')} [${b.status.toUpperCase()}]`
    ).join('\n');

    if (!itemsList) {
      itemsList = 'Tidak ada catatan tagihan terdaftar.';
    }

    const statusLabel = hasNoObligations
      ? 'BEBAS TANGGUNGAN (LUNAS / NIHIL)'
      : isFullyPaid
      ? 'LUNAS 100% (BEBAS TUNGGAKAN)'
      : isPendingVerification
      ? 'MENUNGGU VERIFIKASI RESI'
      : 'BELUM LUNAS';

    const waMsg = `*LEMBAR REKAPITULASI TAGIHAN & PEMBAYARAN*\n*${settings.schoolName || "Pondok Pesantren Al-Asy'ariyah"}*\n\n` +
      `Yth. Bapak/Ibu Wali dari:\n` +
      `• *Nama:* ${activeStudent.fullName}\n` +
      `• *NIS:* ${activeStudent.nis}\n` +
      `• *Kelas:* ${activeStudent.class || '-'}\n` +
      `• *Kamar:* ${activeStudent.kamar || '-'}\n\n` +
      `*RINGKASAN KEUANGAN:*\n` +
      `• Total Tagihan: Rp ${totalAmount.toLocaleString('id-ID')}\n` +
      `• Total Lunas: Rp ${paidAmount.toLocaleString('id-ID')} (${paymentPercentage}%)\n` +
      `• Sisa Belum Lunas: *Rp ${unpaidAmount.toLocaleString('id-ID')}*\n` +
      (pendingAmount > 0 ? `• Menunggu Verifikasi: Rp ${pendingAmount.toLocaleString('id-ID')}\n` : '') +
      `• Status: *${statusLabel}*\n\n` +
      `*RINCIAN TAGIHAN:*\n${itemsList}\n\n` +
      `_Pemberitahuan resmi dari Bendahara Pondok Pesantren._\n` +
      `Terima kasih atas kerja sama dan kepedulian Bapak/Ibu Wali.`;

    const waUrl = `https://api.whatsapp.com/send?phone=${targetPhone}&text=${encodeURIComponent(waMsg)}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-emerald-950/85 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[96vh] flex flex-col overflow-hidden border border-emerald-100 print:shadow-none print:border-none print:max-h-none print:w-full">
        
        {/* Top Action Bar (hidden in print) */}
        <div className="p-4 bg-gradient-to-r from-emerald-900 to-teal-950 text-white flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-emerald-800/80 rounded-xl text-amber-300">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-sm sm:text-base leading-tight truncate">
                Rekap Tagihan & Kwitansi Santri (Format Cetak A4)
              </h3>
              <p className="text-[11px] text-emerald-200">
                Laporan resmi komprehensif memuat identitas santri, rincian biaya, dan ringkasan pelunasan
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAlumni && unpaidAmount > 0 && onClearObligations && (
              <button
                type="button"
                onClick={() => onClearObligations(activeStudent.id, activeStudent.fullName)}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl text-xs transition flex items-center gap-1.5 shadow-sm cursor-pointer border border-emerald-400"
                title="Tandai lunas seluruh tagihan alumni ini dan terbitkan Surat Keterangan Bebas Tanggungan"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-200" />
                <span>Bebaskan Tanggungan (Lunaskan)</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-emerald-950 font-black rounded-xl text-xs transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              title="Cetak atau Unduh Dokumen A4"
            >
              <Printer className="h-4 w-4" />
              <span>Cetak / Simpan PDF (A4)</span>
            </button>

            {activeStudent.parentPhone && (
              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition flex items-center gap-1 shadow-sm cursor-pointer"
                title="Kirim ke WhatsApp Wali"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Kirim ke WA</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-emerald-200 hover:text-white hover:bg-emerald-800/60 rounded-xl transition cursor-pointer"
              title="Tutup Modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Optional Student Switcher Toolbar (if allStudents provided) */}
        {allStudents.length > 1 && (
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs print:hidden shrink-0">
            <div className="flex items-center gap-2 flex-1 min-w-[260px]">
              <User className="h-4 w-4 text-emerald-700 shrink-0" />
              <span className="font-bold text-gray-700 text-[11px] shrink-0">Pilih Santri:</span>
              <select
                value={activeStudent.id}
                onChange={(e) => {
                  const found = allStudents.find(s => s.id === e.target.value);
                  if (found) {
                    setSelectedStudentId(found.id);
                    if (onSelectStudent) onSelectStudent(found);
                  }
                }}
                className="px-2.5 py-1 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-800 focus:outline-none focus:ring-1 focus:ring-emerald-700 flex-1 max-w-sm"
              >
                {allStudents.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.status === 'Alumni' ? '🎓 [ALUMNI] ' : ''}{s.fullName} ({s.nis}) - {s.status === 'Alumni' ? `Lulus ${(s as any).tahunKeluar || ''}` : (s.class || s.gender)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-gray-500">
              <span className="font-medium">Total Tagihan: <strong className="text-gray-900">{studentBills.length} item</strong></span>
            </div>
          </div>
        )}

        {/* Scrollable Document Container */}
        <div className="p-3 sm:p-6 flex-1 overflow-y-auto bg-slate-100 print:bg-white print:p-0">
          <PrintGuideAlert />

          {/* Printable A4 Sheet Body */}
          <div
            id="student-billing-a4-printable-area"
            className="bg-white p-6 sm:p-10 rounded-xl shadow-md border border-gray-200 mx-auto max-w-[210mm] text-slate-900 font-sans print:shadow-none print:border-none print:p-0 print:max-w-none"
            style={{ minHeight: '297mm' }}
          >
            {/* 1. KOP SURAT RESMI */}
            <div className="border-b-4 border-double border-emerald-800 pb-4 mb-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  {(settings.logoUrl || '/pesantren_logo.jpg') ? (
                    <img
                      src={settings.logoUrl || '/pesantren_logo.jpg'}
                      alt="Logo Pesantren"
                      className="h-16 w-16 sm:h-20 sm:w-20 object-contain shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="h-16 w-16 bg-emerald-50 rounded-full border border-emerald-300 flex items-center justify-center text-3xl shrink-0">
                      🕌
                    </div>
                  )}

                  <div className="text-left space-y-0.5">
                    <p className="text-[10px] sm:text-[11px] font-black uppercase text-emerald-800 tracking-wider">
                      {settings.namaYayasan || "YAYASAN PONDOK PESANTREN AL-ASY'ARIYAH"}
                    </p>
                    <h2 className="text-base sm:text-xl font-black text-emerald-950 uppercase tracking-tight leading-tight">
                      {settings.schoolName || "Pondok Pesantren Al-Asy'ariyah"}
                    </h2>
                    <p className="text-[10px] sm:text-[11px] text-gray-600 leading-relaxed max-w-xl">
                      {settings.address || "Jl. Raya Modung, Langpanggang, Modung, Bangkalan, Jawa Timur"}
                    </p>
                    <p className="text-[9px] sm:text-[10px] text-gray-500">
                      {settings.phone ? `Telp/WA: ${settings.phone} | ` : ''} Email: {settings.email || "info@alasyariyah.sch.id"}
                    </p>
                    <p className="text-[9px] sm:text-[10px] text-emerald-700 font-extrabold italic mt-0.5">
                      {settings.tagline || "Mencetak Generasi Qur'ani, Berakhlakul Karimah, Unggul, dan Mandiri"}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0 border-l border-emerald-200 pl-4 space-y-1">
                  <span className={`inline-block px-3 py-1 rounded text-[10px] font-mono font-black uppercase tracking-widest leading-none border ${
                    isAlumni
                      ? (isAlumniBebasTanggungan ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'bg-amber-100 text-amber-900 border-amber-300')
                      : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                  }`}>
                    {isAlumni ? (isAlumniBebasTanggungan ? 'BEBAS TANGGUNGAN' : 'SISA TUNGGAKAN') : 'LEMBAR KEUANGAN'}
                  </span>
                  <div className="text-[10px] font-mono font-bold text-gray-600 mt-1">
                    No: {invoiceNumber}
                  </div>
                  <div className="text-[9px] text-gray-500 font-mono">
                    Tgl Cetak: {todayFormatted}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. JUDUL DOKUMEN */}
            <div className="text-center mb-6">
              <h3 className="text-base sm:text-lg font-black text-emerald-950 uppercase tracking-wide underline underline-offset-4">
                {isAlumni
                  ? (isAlumniBebasTanggungan ? 'SURAT KETERANGAN BEBAS TANGGUNGAN PENDIDIKAN' : 'REKAPITULASI SISA TUNGGAKAN MASA PENDIDIKAN ALUMNI')
                  : 'REKAPITULASI TAGIHAN & PEMBAYARAN SANTRI'}
              </h3>
              <div className="flex items-center justify-center gap-2 mt-1.5 flex-wrap">
                <span className="text-[11px] text-gray-500">
                  Tahun Akademik {(settings as any).academicYear || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`}
                </span>
                <span className="text-gray-300">•</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  isAlumni
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                }`}>
                  {isAlumni 
                    ? `🎓 ALUMNI (${(activeStudent as any).tahunKeluar ? `Angkatan ${(activeStudent as any).tahunKeluar}` : 'Telah Lulus'})` 
                    : '🟢 Santri Aktif'}
                </span>
              </div>
              {isAlumni && (
                <div className={`mt-3 p-3 rounded-xl text-left border text-xs ${
                  isAlumniBebasTanggungan 
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950 shadow-xs' 
                    : 'bg-amber-50 border-amber-300 text-amber-950 shadow-xs'
                }`}>
                  {isAlumniBebasTanggungan ? (
                    <div className="space-y-1 text-center">
                      <p className="font-black text-emerald-900 text-sm">
                        ✓ SURAT RESMI: BEBAS DARI SELURUH TANGGUNGAN (LUNAS 100%)
                      </p>
                      <p className="text-xs text-emerald-850 leading-relaxed max-w-xl mx-auto">
                        Menerangkan dengan sebenarnya bahwa Alumni atas nama <strong>{activeStudent.fullName}</strong> (NIS: {activeStudent.nis}) telah menyelesaikan seluruh kewajiban administrasi keuangan selama masa pendidikan di Pondok Pesantren dan dinyatakan <strong>BEBAS TANGGUNGAN</strong> untuk keperluan kelulusan, pengambilan ijazah/syahadah, maupun keperluan administrasi lainnya.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="font-extrabold text-amber-950 text-xs flex items-center justify-between flex-wrap gap-1">
                        <span>⚠️ CATATAN KEBIJAKAN ADMINISTRASI ALUMNI:</span>
                        <span className="font-mono text-rose-800 font-black">Sisa: Rp {unpaidAmount.toLocaleString('id-ID')}</span>
                      </p>
                      <p className="text-[11px] text-amber-900 leading-relaxed">
                        Siswa ini berstatus <strong>ALUMNI</strong> dan tidak lagi dibebankan tagihan syahriyah bulanan berjalan. Rincian tagihan di bawah ini merupakan sisa kewajiban dari masa aktif pendidikan yang belum terselesaikan.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 3. BIODATA SANTRI (CLEAN & SPACIOUS) */}
            <div className="border-t border-b border-slate-200 py-3.5 mb-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-3 gap-x-4 text-xs">
                <div>
                  <span className="block text-[9.5px] font-bold text-gray-500 uppercase tracking-wider">Nama Santri</span>
                  <strong className="block text-sm font-black text-slate-900 mt-0.5">{activeStudent.fullName}</strong>
                </div>

                <div>
                  <span className="block text-[9.5px] font-bold text-gray-500 uppercase tracking-wider">NIS (No. Induk)</span>
                  <span className="block font-mono font-bold text-slate-800 text-xs mt-0.5">{activeStudent.nis || '-'}</span>
                </div>

                <div>
                  <span className="block text-[9.5px] font-bold text-gray-500 uppercase tracking-wider">Kelas / Pendidikan</span>
                  <span className="block font-semibold text-gray-800 text-xs mt-0.5">
                    {activeStudent.class || `${activeStudent.classFormal || '-'} • ${activeStudent.classMadrasah || '-'}`}
                  </span>
                </div>

                <div>
                  <span className="block text-[9.5px] font-bold text-gray-500 uppercase tracking-wider">Kamar Asrama</span>
                  <span className="block font-bold text-slate-800 text-xs mt-0.5">
                    {activeStudent.kamar ? `Kamar ${activeStudent.kamar}` : 'Luar Pondok (Non-Asrama)'}
                  </span>
                </div>

                <div>
                  <span className="block text-[9.5px] font-bold text-gray-500 uppercase tracking-wider">Nama Wali</span>
                  <span className="block font-medium text-gray-800 text-xs mt-0.5">{activeStudent.parentName || '-'}</span>
                </div>

                <div>
                  <span className="block text-[9.5px] font-bold text-gray-500 uppercase tracking-wider">Kontak HP Wali</span>
                  <span className="block font-mono text-gray-800 text-xs mt-0.5">{activeStudent.parentPhone || '-'}</span>
                </div>

                <div>
                  <span className="block text-[9.5px] font-bold text-gray-500 uppercase tracking-wider">Jenis Kelamin</span>
                  <span className="block font-medium text-gray-800 text-xs mt-0.5">{activeStudent.gender}</span>
                </div>

                <div>
                  <span className="block text-[9.5px] font-bold text-gray-500 uppercase tracking-wider">Alamat Asal</span>
                  <span className="block text-gray-700 text-xs mt-0.5 truncate" title={activeStudent.address}>{activeStudent.address || '-'}</span>
                </div>
              </div>
            </div>

            {/* 4. RINGKASAN REKAPITULASI BIAYA (CLEAN METRIC ROW WITHOUT HEAVY BOXES) */}
            <div className="flex flex-wrap items-center justify-between gap-3 py-2.5 px-3.5 bg-slate-50 border border-slate-200 rounded-lg mb-5 text-xs">
              <div className="flex items-center gap-1.5 min-w-[120px]">
                <span className="text-[10px] uppercase font-bold text-slate-500">Total:</span>
                <span className="font-mono font-black text-slate-900 text-sm">Rp {totalAmount.toLocaleString('id-ID')}</span>
                <span className="text-[9px] text-slate-400">({studentBills.length} Pos)</span>
              </div>

              <div className="flex items-center gap-1.5 min-w-[130px]">
                <span className="text-[10px] uppercase font-bold text-emerald-700">Terbayar:</span>
                <span className="font-mono font-black text-emerald-800 text-sm">Rp {paidAmount.toLocaleString('id-ID')}</span>
                <span className="text-[9px] text-emerald-600 font-bold">({paymentPercentage}%)</span>
              </div>

              <div className="flex items-center gap-1.5 min-w-[130px]">
                <span className={`text-[10px] uppercase font-bold ${unpaidAmount > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>Sisa Tunggakan:</span>
                <span className={`font-mono font-black text-sm ${unpaidAmount > 0 ? 'text-rose-700' : 'text-emerald-800'}`}>
                  Rp {unpaidAmount.toLocaleString('id-ID')}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold text-slate-500">Status:</span>
                {hasNoObligations ? (
                  <span className="px-2 py-0.5 bg-emerald-700 text-white font-black text-[9.5px] rounded uppercase tracking-wider font-mono">
                    BEBAS TANGGUNGAN
                  </span>
                ) : isFullyPaid ? (
                  <span className="px-2 py-0.5 bg-emerald-600 text-white font-black text-[9.5px] rounded uppercase tracking-wider font-mono">
                    LUNAS 100%
                  </span>
                ) : isPendingVerification ? (
                  <span className="px-2 py-0.5 bg-amber-600 text-white font-black text-[9.5px] rounded uppercase tracking-wider font-mono">
                    VERIFIKASI
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-rose-600 text-white font-black text-[9.5px] rounded uppercase tracking-wider font-mono">
                    BELUM LUNAS
                  </span>
                )}
              </div>
            </div>

            {/* 5. TABEL RINCIAN SEMUA TAGIHAN SANTRI */}
            <div className="mb-6">
              <h4 className="text-xs font-black text-gray-700 uppercase tracking-wider mb-2">
                Rincian Tagihan & Riwayat Pembayaran Santri
              </h4>

              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-emerald-850 text-white text-[10px] uppercase font-extrabold tracking-wider">
                      <th className="py-2.5 px-3 text-center w-10">No</th>
                      <th className="py-2.5 px-3">Nama Tagihan / Pos Biaya</th>
                      <th className="py-2.5 px-3">Kategori</th>
                      <th className="py-2.5 px-3 text-right">Jumlah (Rp)</th>
                      <th className="py-2.5 px-3">Jatuh Tempo</th>
                      <th className="py-2.5 px-3">Tgl Bayar / Metode</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {studentBills.length > 0 ? (
                      studentBills.map((bill, index) => {
                        const isLunas = bill.status === 'Lunas';
                        const isPending = bill.status === 'Konfirmasi Pembayaran';
                        return (
                          <tr key={bill.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                            <td className="py-2 px-3 text-center font-mono text-[10px] text-gray-500 font-bold">
                              {index + 1}
                            </td>
                            <td className="py-2 px-3">
                              <strong className="block text-slate-900 leading-tight">{bill.title}</strong>
                              {(bill as any).notes && (
                                <span className="text-[9px] text-gray-400 block mt-0.5">{(bill as any).notes}</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-[11px] text-gray-600 font-medium">
                              {bill.category || 'SPP Syahriyah'}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-950">
                              Rp {Number(bill.amount).toLocaleString('id-ID')}
                            </td>
                            <td className="py-2 px-3 text-[10px] text-gray-500 font-mono">
                              {bill.dueDate || '-'}
                            </td>
                            <td className="py-2 px-3 text-[10px] text-gray-600">
                              {isLunas ? (
                                <div>
                                  <span className="font-bold text-emerald-800 block">{bill.paymentDate || bill.dueDate || '-'}</span>
                                  <span className="text-[9px] text-gray-400 font-mono">{bill.paymentMethod || 'Kas Bendahara'}</span>
                                </div>
                              ) : isPending ? (
                                <span className="text-amber-800 font-medium italic">Resi Diajukan</span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center">
                              {isLunas ? (
                                <span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-800 font-mono font-black text-[9px] rounded uppercase tracking-wider border border-emerald-300">
                                  LUNAS
                                </span>
                              ) : isPending ? (
                                <span className="inline-block px-2 py-0.5 bg-amber-100 text-amber-800 font-mono font-bold text-[9px] rounded uppercase tracking-wider border border-amber-300">
                                  VERIFIKASI
                                </span>
                              ) : (
                                <span className="inline-block px-2 py-0.5 bg-rose-100 text-rose-800 font-mono font-bold text-[9px] rounded uppercase tracking-wider border border-rose-300">
                                  BELUM LUNAS
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-8 text-center bg-emerald-50/40 text-emerald-900 text-xs">
                          <CheckCircle2 className="h-6 w-6 text-emerald-600 mx-auto mb-1.5" />
                          <strong className="block text-emerald-950 font-bold">Tidak Memiliki Beban Tanggungan</strong>
                          <span className="text-[11px] text-emerald-700">Alhamdulillah, santri ini tidak memiliki catatan tanggungan tagihan (Bebas Biaya / Nihil).</span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-emerald-50/80 font-black border-t-2 border-emerald-800 text-slate-950">
                      <td colSpan={3} className="py-2.5 px-3 text-right uppercase text-[10px] tracking-wider text-emerald-950">
                        TOTAL AKUMULASI TAGIHAN:
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-sm text-emerald-950">
                        Rp {totalAmount.toLocaleString('id-ID')}
                      </td>
                      <td colSpan={3} className="py-2.5 px-3 text-right text-[10px] text-gray-600">
                        Total Terbayar: <strong className="text-emerald-800 font-mono">Rp {paidAmount.toLocaleString('id-ID')}</strong> | Sisa: <strong className={unpaidAmount > 0 ? "text-rose-700 font-mono" : "text-emerald-700 font-mono"}>Rp {unpaidAmount.toLocaleString('id-ID')} {unpaidAmount === 0 ? '(Nihil / Lunas)' : ''}</strong>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* 6. CATATAN & REKENING RESMI PEMBAYARAN (CLEAN & MINIMAL) */}
            <div className="border-t border-slate-200 pt-3 mb-6 text-[10.5px] text-gray-600 space-y-1">
              <p className="leading-relaxed">
                • <strong>Rekening Resmi:</strong>{' '}
                {Array.isArray(settings.rekeningList) && settings.rekeningList.length > 0 ? (
                  <span className="text-emerald-950 font-bold">
                    {settings.rekeningList.map(r => `${r.bankName || (r as any).bank || 'Bank'} ${r.accountNumber} a.n. ${r.accountName || (r as any).holderName || "Pesantren"}`).join(' | ')}
                  </span>
                ) : (
                  <span className="text-emerald-950 font-bold">
                    {settings.pesantrenBankName || 'Bank Syariah Indonesia'} {settings.pesantrenBankAccountNumber || '7182938491'} a.n. {settings.pesantrenBankAccountName || "Pondok Pesantren Al-Asy'ariyah"}
                  </span>
                )}
              </p>
              <p className="text-[10px] text-gray-500 leading-relaxed">
                • Dokumen ini merupakan bukti rekapitulasi sah administrasi keuangan pesantren. Konfirmasi transfer dapat dilakukan melalui portal santri atau via WhatsApp ke Bendahara.
              </p>
            </div>

            {/* 7. PENGESAHAN DOKUMEN & TANDA TANGAN (SIGNATURE SECTION) */}
            <div className="pt-2">
              <div className="flex justify-between items-start text-xs">
                {/* Kolom Kiri: Mengetahui Orang Tua / Wali */}
                <div className="text-center w-56 space-y-1">
                  <p className="text-[10px] text-gray-500 font-medium">Mengetahui & Menyetujui,</p>
                  <p className="text-[11px] font-bold text-gray-900 uppercase tracking-wide">Orang Tua / Wali Santri</p>
                  <div className="h-20 flex items-end justify-center">
                    <div className="w-40 border-b border-gray-400"></div>
                  </div>
                  <p className="text-xs font-black text-gray-950 mt-1">
                    {activeStudent.parentName || '( ........................................ )'}
                  </p>
                  <p className="text-[9px] text-gray-400">Tanda Tangan Wali Santri</p>
                </div>

                {/* Kolom Kanan: Pengesahan Bendahara Resmi dengan TTD & Stempel */}
                <div className="text-left w-72 space-y-1 relative font-sans pl-6">
                  <p className="text-[10px] text-gray-500 font-medium">
                    {getCityFromAddress(settings.address)}, {todayFormatted}
                  </p>
                  <p className="text-[11px] text-gray-900 font-bold uppercase tracking-wide">
                    Pengesahan, {bendaharaJabatan}
                  </p>

                  <div className="h-20 w-full relative flex items-center justify-start select-none my-1">
                    {/* Tanda tangan di sebelah kiri */}
                    <div className="z-10 relative flex items-center justify-start">
                      {isImageUrl(bendaharaTtd) ? (
                        <img
                          src={bendaharaTtd}
                          alt={`TTD ${bendaharaJabatan}`}
                          className="h-16 max-w-[170px] object-contain mix-blend-multiply"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="text-sm font-serif text-slate-900 italic font-bold tracking-wide underline">
                          {bendaharaTtd || bendaharaName}
                        </span>
                      )}
                    </div>

                    {/* Stempel Pesantren / Bendahara yang bertumpuk */}
                    {bendaharaStempel && (
                      <div className="z-20 absolute -left-4 -top-1 pointer-events-none opacity-85">
                        {isImageUrl(bendaharaStempel) ? (
                          <img
                            src={bendaharaStempel}
                            alt={`Stempel ${bendaharaJabatan}`}
                            className="h-20 w-20 object-contain rotate-[-8deg] mix-blend-multiply"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="border-2 border-double border-emerald-600 text-emerald-800 rounded-full h-16 w-16 flex items-center justify-center text-[7px] font-extrabold uppercase rotate-[-8deg] leading-tight text-center bg-white/70 shadow-xs">
                            {bendaharaStempel}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <p className="text-xs font-black text-emerald-950 underline leading-none uppercase">
                    {bendaharaName}
                  </p>
                  <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wider mt-0.5">
                    Bagian Keuangan & Kas Pesantren
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Footer Actions (hidden on print) */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap justify-between items-center gap-2 print:hidden text-xs shrink-0">
          <div className="text-[11px] text-gray-500 flex items-center gap-2">
            <span className="font-semibold text-gray-700">Format Halaman:</span>
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 font-mono font-bold rounded text-[10px]">
              A4 Portrait (210 x 297 mm)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-xl font-bold transition cursor-pointer"
            >
              Tutup
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>Unduh HTML/PDF Luring</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="px-5 py-1.5 bg-gradient-to-r from-emerald-800 to-teal-900 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Cetak Sekarang ⎙</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
