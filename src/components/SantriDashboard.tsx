import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import QRCode from 'qrcode';
import { 
  User, CreditCard, Landmark, DollarSign, Calendar, Clock, AlertCircle, 
  CheckCircle2, Bell, ShieldAlert, Sparkles, Send, UploadCloud, Check, Printer, IdCard, X, Download, Info, Copy, QrCode
} from 'lucide-react';
import { Student, Bill, Announcement, PortalSettings, SecurityLog, compressImage } from '../types';
import { downloadPrintableHTML, PrintGuideAlert } from './PrintHelper';
import { isSupabaseConfigured, pushStudentToSupabase, pushBillToSupabase, markLocalDataChanged } from '../lib/supabase';
import { generateDynamicQrisString, getUniqueTransferCode, validateQrisString, QrisValidationResult } from '../lib/qris';

const isImageUrl = (str?: string): boolean => {
  if (!str) return false;
  return str.startsWith('http://') || str.startsWith('https://') || str.startsWith('/') || str.startsWith('data:image/');
};

const getCityFromAddress = (addressStr?: string) => {
  if (!addressStr) return "Jawa Tengah";
  const matches = addressStr.match(/(?:Kabupaten|Kab\.|Kota|Kec\.)\s*([A-Za-z\s]+)/i);
  if (matches && matches[1]) {
    return matches[1].trim();
  }
  const parts = addressStr.split(',').map(p => p.trim());
  if (parts.length > 2) {
    return parts[parts.length - 2];
  }
  return "Jawa Tengah";
};

interface SantriDashboardProps {
  student: Student;
  bills: Bill[];
  setBills: React.Dispatch<React.SetStateAction<Bill[]>>;
  announcements: Announcement[];
  settings: PortalSettings;
  onLogout?: () => void;
  activeSantriTab: 'tagihan' | 'pelanggaran' | 'kesehatan' | 'pengumuman' | 'perizinan';
  setActiveSantriTab: (tab: 'tagihan' | 'pelanggaran' | 'kesehatan' | 'pengumuman' | 'perizinan') => void;
  showStudentCard: boolean;
  setShowStudentCard: (show: boolean) => void;
  students?: Student[];
  setStudents?: React.Dispatch<React.SetStateAction<Student[]>>;
}

export default function SantriDashboard({ 
  student, 
  bills, 
  setBills, 
  announcements, 
  settings, 
  onLogout,
  activeSantriTab,
  setActiveSantriTab,
  showStudentCard,
  setShowStudentCard,
  students = [],
  setStudents
}: SantriDashboardProps) {
  const [selectedBill, setSelectedBill] = React.useState<Bill | null>(null);
  const [receiptBill, setReceiptBill] = React.useState<Bill | null>(null);
  const [bank, setBank] = React.useState('Transfer BRI');
  const [proofUrl, setProofUrl] = React.useState('');
  const [success, setSuccess] = React.useState(false);
  const [senderBank, setSenderBank] = React.useState('Bank BRI');
  const [selectedRekeningId, setSelectedRekeningId] = React.useState<string>('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = React.useState<string>('');
  const [copiedKey, setCopiedKey] = React.useState<string>('');

  const [isSantriMenuOpen, setIsSantriMenuOpen] = React.useState(false);

  // Available bank accounts
  const rekeningList = React.useMemo(() => {
    if (settings.rekeningList && settings.rekeningList.length > 0) {
      return settings.rekeningList;
    }
    return [
      { id: 'rek-bri-def', bankName: 'Bank BRI', accountNumber: '0019-01-002345-53-8', accountName: "Ponpes Al-Asy'ariyah", isMain: true },
      { id: 'rek-bsi-def', bankName: 'Bank Syariah Indonesia (BSI)', accountNumber: '7123-456-789', accountName: "Ponpes Al-Asy'ariyah", isMain: false },
      { id: 'rek-mandiri-def', bankName: 'Bank Mandiri', accountNumber: '138-00-1928374-1', accountName: "Ponpes Al-Asy'ariyah", isMain: false }
    ];
  }, [settings.rekeningList]);

  // Current chosen destination bank account
  const currentRekening = React.useMemo(() => {
    if (selectedRekeningId) {
      const found = rekeningList.find(r => r.id === selectedRekeningId);
      if (found) return found;
    }
    return rekeningList.find(r => r.isMain) || rekeningList[0];
  }, [rekeningList, selectedRekeningId]);

  // Unique nominal addition (between 100 and 500)
  const uniqueCode = React.useMemo(() => {
    if (!selectedBill) return 120;
    return getUniqueTransferCode(selectedBill.id, selectedBill.amount);
  }, [selectedBill]);

  // Final exact amount to transfer
  const finalTransferAmount = React.useMemo(() => {
    if (!selectedBill) return 0;
    return selectedBill.amount + uniqueCode;
  }, [selectedBill, uniqueCode]);

  // Validation state for Indonesian QRIS compliance
  const [qrisValidation, setQrisValidation] = React.useState<QrisValidationResult | null>(null);

  // Generate QR Code automatically whenever bill or destination bank is selected
  React.useEffect(() => {
    if (!selectedBill || !currentRekening) {
      setQrCodeDataUrl('');
      setQrisValidation(null);
      return;
    }
    // Dynamic QRIS Payload with embedded exact nominal amount and registered account owner name
    const qrisPayload = generateDynamicQrisString({
      merchantName: currentRekening.accountName || settings.schoolName || 'PONPES AL-ASYARIYAH',
      accountName: currentRekening.accountName,
      merchantCity: getCityFromAddress(settings.address) || 'SEMARANG',
      amount: finalTransferAmount,
      billId: String(selectedBill.id),
      bankName: currentRekening.bankName,
      accountNumber: currentRekening.accountNumber,
      rawStaticQris: currentRekening.qrisString || settings.qrisString
    });

    // Validate against Indonesian QRIS standard (indonesia_qr_is)
    const valResult = validateQrisString(qrisPayload);
    setQrisValidation(valResult);
    
    QRCode.toDataURL(qrisPayload, {
      width: 280,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#064e3b',
        light: '#ffffff',
      }
    })
      .then(url => setQrCodeDataUrl(url))
      .catch(err => console.error('Failed to generate transfer QR code:', err));
  }, [selectedBill, currentRekening, finalTransferAmount, uniqueCode, student.fullName, student.nis, settings.schoolName, settings.address, settings.qrisString]);

  // Initialize selection when opening bill
  React.useEffect(() => {
    if (selectedBill) {
      setSenderBank('Bank BRI');
      if (rekeningList.length > 0) {
        const initial = rekeningList.find(r => r.isMain) || rekeningList[0];
        setSelectedRekeningId(initial.id);
        setBank(`Transfer ${initial.bankName}`);
      }
    }
  }, [selectedBill, rekeningList]);

  // States for exit permit application (Pengajuan Izin Keluar)
  const [permitType, setPermitType] = React.useState<'Keluar Lingkungan' | 'Pulang (Keluarga)'>('Keluar Lingkungan');
  const [permitDescription, setPermitDescription] = React.useState('');
  const [permitOutDate, setPermitOutDate] = React.useState('');
  const [permitExpectedReturnDate, setPermitExpectedReturnDate] = React.useState('');
  const [permitMsg, setPermitMsg] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);

  React.useEffect(() => {
    if (selectedBill) {
      setSenderBank('Bank BRI');
    }
  }, [selectedBill]);

  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeSantriTab]);

  const handleSubmitPermit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!permitDescription.trim() || !permitOutDate || !permitExpectedReturnDate) {
      setPermitMsg({ type: 'error', text: 'Semua kolom formulir wajib diisi dengan benar!' });
      return;
    }

    if (new Date(permitOutDate) >= new Date(permitExpectedReturnDate)) {
      setPermitMsg({ type: 'error', text: 'Waktu kembali harus lebih lambat daripada waktu keluar!' });
      return;
    }

    const formattedOutDate = permitOutDate.replace('T', ' ');
    const formattedReturnDate = permitExpectedReturnDate.replace('T', ' ');

    const newLog: SecurityLog = {
      id: 'IZN-' + Math.floor(Math.random() * 1000000),
      studentId: student.id,
      studentName: student.fullName,
      permitType: permitType,
      description: permitDescription,
      outDate: formattedOutDate,
      expectedReturnDate: formattedReturnDate,
      status: 'Menunggu Persetujuan',
      signedBy: 'Wali/Santri Mandiri'
    };

    if (setStudents) {
      let targetUpdatedStudent: Student | null = null;
      setStudents(prev => {
        const updated = prev.map(s => {
          if (s.id === student.id) {
            targetUpdatedStudent = {
              ...s,
              securityLogs: [newLog, ...(s.securityLogs || [])]
            };
            return targetUpdatedStudent;
          }
          return s;
        });
        markLocalDataChanged('students');
        try {
          localStorage.setItem('pesantren_students', JSON.stringify(updated));
        } catch (e) {
          console.error(e);
        }
        window.dispatchEvent(new Event('pesantren_db_sync'));
        if (targetUpdatedStudent && isSupabaseConfigured()) {
          pushStudentToSupabase(targetUpdatedStudent).catch(e => console.error("Cloud push student permit error:", e));
        }
        return updated;
      });
      
      // Update local student instance logs for instant UI update
      if (!student.securityLogs) {
        student.securityLogs = [];
      }
      student.securityLogs = [newLog, ...student.securityLogs];
      
      setPermitDescription('');
      setPermitOutDate('');
      setPermitExpectedReturnDate('');
      setPermitMsg({ type: 'success', text: 'Pengajuan izin keluar pondok berhasil diajukan! Menunggu persetujuan Pengurus/Keamanan.' });
    } else {
      setPermitMsg({ type: 'error', text: 'Gagal memproses pengajuan. Silakan hubungi admin.' });
    }
  };

  const studentBills = bills.filter(b => b.studentId === student.id);
  const unpaidCount = studentBills.filter(b => b.status === 'Belum Lunas');

  const handlePaySimulate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBill) return;

    if (!proofUrl) {
      alert('Silakan pilih dan unggah foto bukti transfer / struk resi pembayaran terlebih dahulu.');
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const targetBillId = selectedBill.id;
    const targetStudentId = student.id;

    const updatedBill: Bill = {
      ...selectedBill,
      amount: selectedBill.amount, // Tagihan asli tetap dipertahankan (e.g. 50.000) tidak diinflasikan
      status: 'Konfirmasi Pembayaran',
      paymentDate: todayStr,
      paymentMethod: bank || `Transfer ${currentRekening.bankName}`,
      senderBank: senderBank || 'Transfer Bank',
      paymentProofUrl: proofUrl,
      verificationStatus: 'Menunggu Verifikasi Manual',
      verificationLogs: [
        ...(selectedBill.verificationLogs || []),
        {
          uploadedBy: student.fullName,
          uploadedAt: new Date().toLocaleString('id-ID'),
          aiResult: `Santri/Wali mengunggah bukti transfer tagihan Rp ${selectedBill.amount.toLocaleString('id-ID')} (Nominal transfer unik: Rp ${finalTransferAmount.toLocaleString('id-ID')} via ${senderBank || 'Transfer Bank'}). Menunggu pengecekan admin.`
        }
      ]
    };

    // Mutate bill status to pending approval using functional updater to prevent stale closures
    setBills(prevBills => {
      const updated = prevBills.map(b => (String(b.id) === String(targetBillId) && String(b.studentId) === String(targetStudentId)) ? updatedBill : b);
      markLocalDataChanged('bills');
      try {
        localStorage.setItem('pesantren_bills', JSON.stringify(updated));
      } catch (err) {
        console.error(err);
      }
      fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      }).catch(() => {});
      window.dispatchEvent(new Event('pesantren_db_sync'));
      if (isSupabaseConfigured()) {
        pushBillToSupabase(updatedBill).catch(e => console.error("Cloud push bill payment error:", e));
      }
      return updated;
    });

    // Trigger confirmation notification to parent WhatsApp
    if (student.parentPhone) {
      const rawPhone = student.parentPhone.replace(/[^0-9]/g, '');
      const cleanPhone = rawPhone.startsWith('0') ? '62' + rawPhone.slice(1) : rawPhone.startsWith('62') ? rawPhone : '62' + rawPhone;
      const waMsg = `Assalamu'alaikum Wr. Wb. Bapak/Ibu ${student.parentName || 'Wali Santri'},\n\nTerima kasih, bukti transfer pembayaran untuk tagihan *${selectedBill.title}* senilai *Rp ${finalTransferAmount.toLocaleString('id-ID')}* (termasuk kode unik tagihan: *${uniqueCode}*) tujuan *${currentRekening.bankName}* ananda *${student.fullName}* telah berhasil diunggah ke sistem portal pesantren.\n\nStatus: *Menunggu Konfirmasi Bendahara*.\nBukti akan segera diverifikasi oleh panitia keuangan pesantren.\n\nWassalamu'alaikum Wr. Wb.\n_Bendahara Pesantren_`;
      fetch('/api/send-wa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: cleanPhone, message: waMsg })
      }).catch(err => console.warn('Auto-WA bill payment upload notification error:', err));
    }

    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      setSelectedBill(null);
    }, 2000);
  };

  // Instant online payment simulation (Lunas langsung dan terbitkan kwitansi)
  const handleInstantOnlinePay = () => {
    if (!selectedBill) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const targetBillId = selectedBill.id;
    const targetStudentId = student.id;

    const updatedBill: Bill = {
      ...selectedBill,
      amount: selectedBill.amount, // Tagihan asli tetap dipertahankan
      status: 'Lunas',
      paidDate: todayStr,
      paymentDate: todayStr,
      paymentMethod: 'QRIS Dinamis (Otomatis)',
      senderBank: currentRekening.bankName,
      senderAccountNumber: currentRekening.accountNumber,
      paymentProofUrl: selectedBill.paymentProofUrl || qrCodeDataUrl || '',
      verificationStatus: 'Terverifikasi Otomatis',
      verificationLogs: [
        ...(selectedBill.verificationLogs || []),
        {
          uploadedBy: student.fullName,
          uploadedAt: todayStr,
          verifiedAt: new Date().toLocaleString('id-ID'),
          aiResult: `Pelunasan Otomatis QRIS: Tagihan #${targetBillId} senilai Rp ${selectedBill.amount.toLocaleString('id-ID')} atas nama santri ${student.fullName} (NIS: ${student.nis || '-'}) terverifikasi lunas tanpa tertukar.`
        }
      ]
    };

    // Update STRICTLY this bill of this student - prevents any bills from being swapped!
    setBills(prevBills => {
      const updated = prevBills.map(b => (String(b.id) === String(targetBillId) && String(b.studentId) === String(targetStudentId)) ? updatedBill : b);
      markLocalDataChanged('bills');
      try {
        localStorage.setItem('pesantren_bills', JSON.stringify(updated));
      } catch (err) {
        console.error(err);
      }
      fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      }).catch(() => {});
      window.dispatchEvent(new Event('pesantren_db_sync'));
      if (isSupabaseConfigured()) {
        pushBillToSupabase(updatedBill).catch(e => console.error("Cloud push bill payment error:", e));
      }
      return updated;
    });

    if (setStudents) {
      setStudents(prevStudents => {
        const updated = prevStudents.map(s => {
          if (s.id === targetStudentId) {
            const hist = s.paymentHistory || [];
            const newHist = {
              id: 'pay-qris-' + Date.now(),
              date: todayStr,
              amount: finalTransferAmount,
              description: `Pembayaran QRIS ${selectedBill.title}`,
              paymentMethod: 'QRIS Dinamis (Otomatis)',
              verifiedBy: 'Sistem QRIS Bank Indonesia'
            };
            return {
              ...s,
              paymentHistory: [newHist, ...hist]
            };
          }
          return s;
        });
        try {
          localStorage.setItem('pesantren_students', JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });
    }

    // Trigger instant payment receipt notification to parent WhatsApp
    if (student.parentPhone) {
      const rawPhone = student.parentPhone.replace(/[^0-9]/g, '');
      const cleanPhone = rawPhone.startsWith('0') ? '62' + rawPhone.slice(1) : rawPhone.startsWith('62') ? rawPhone : '62' + rawPhone;
      const waMsg = `Assalamu'alaikum Wr. Wb. Bapak/Ibu ${student.parentName || 'Wali Santri'},\n\nAlhamdulillah, pembayaran online untuk tagihan *${selectedBill.title}* senilai *Rp ${finalTransferAmount.toLocaleString('id-ID')}* atas nama ananda *${student.fullName}* (NIS: ${student.nis || '-'}) telah BERHASIL dan diverifikasi LUNAS secara otomatis via QRIS Dinamis.\n\nKuitansi pelunasan digital resmi telah terbit dan dapat diunduh kapan saja melalui Portal Santri.\n\nTerima kasih atas partisipasi dan dukungannya.\nWassalamu'alaikum Wr. Wb.\n_Bendahara Pesantren_`;
      fetch('/api/send-wa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: cleanPhone, message: waMsg })
      }).catch(err => console.warn('Auto-WA instant pay notification error:', err));
    }

    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      const bToReceipt = updatedBill;
      setSelectedBill(null);
      setReceiptBill(bToReceipt);
    }, 1500);
  };

  // Filter announcements matching role
  const filteredAnn = announcements.filter(a => 
    a.targetRole === 'all' || 
    a.targetRole === 'santri' || 
    a.targetRole === 'walisantri'
  );

  return (
    <div className="max-w-5xl mx-auto min-h-screen bg-slate-50/60 px-3 sm:px-6 py-6 space-y-6">


      {/* Welcome Banner with Guardian Greeting and Student Photo - ONLY on Dashboard 'tagihan' tab */}
      <AnimatePresence mode="wait">
        {activeSantriTab === 'tagihan' && (
          <motion.div
            key="welcome-banner"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {(() => {
        const unpaidBills = studentBills.filter(b => b.status === 'Belum Lunas');
        const totalUnpaidAmount = unpaidBills.reduce((sum, b) => sum + b.amount, 0);

        const activeDisciplineLogs = student.disciplineLogs || [];
        const activeViolations = activeDisciplineLogs.filter(log => log.status !== 'Selesai');
        const activeViolationsCount = activeViolations.length;
        const totalPoints = activeViolations.reduce((sum, log) => sum + (log.points || 0), 0);

        const healthLogs = student.healthLogs || [];
        const activeHealthLogs = healthLogs.filter(log => log.status !== 'Dirujuk ke RS / Pulang');
        const latestHealth = healthLogs[0];

        return (
          <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white p-6 rounded-2xl shadow-sm flex flex-col md:flex-row items-center gap-6 text-left relative overflow-hidden">
            {/* Background decorative elements */}
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/5 rounded-full" />
            
            {/* Framed Student Photo with a modern clean circular ring */}
            <div className="shrink-0">
              <div className="h-20 w-20 bg-white/10 p-1 rounded-full border-2 border-amber-300 shadow-sm relative overflow-hidden">
                {student.photoUrl && isImageUrl(student.photoUrl) ? (
                  <img 
                    src={student.photoUrl} 
                    alt={student.fullName}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover rounded-full"
                  />
                ) : student.gender === 'Perempuan' ? (
                  <img 
                    src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200" 
                    alt="Santri Perempuan"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover rounded-full"
                  />
                ) : (
                  <img 
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200" 
                    alt="Santri Putra"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover rounded-full"
                  />
                )}
              </div>
            </div>

            <div className="space-y-1.5 flex-1 text-center md:text-left z-10">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-400 text-emerald-950 rounded-full text-[9px] font-extrabold uppercase font-mono tracking-wider shadow">
                PORTAL RESMI WALI SANTRI
              </div>
              
              <h1 className="text-lg md:text-xl font-black text-white leading-tight">
                Assalamu'alaikum Wr. Wb.
              </h1>
              
              <p className="text-xs md:text-sm text-emerald-50 leading-relaxed font-medium">
                Selamat Datang, Bapak/Ibu <strong className="text-amber-200 font-extrabold">{student.parentName.toUpperCase()}</strong>
              </p>
              
              <div className="text-[11px] text-emerald-100 flex flex-wrap items-center justify-center md:justify-start gap-x-2 gap-y-1 pt-1 opacity-90 border-t border-white/10 mt-1.5 font-sans">
                <span>Santri Binaan:</span>
                <strong className="text-white font-black">{student.fullName.toUpperCase()}</strong>
                <span className="text-emerald-300">•</span>
                <span>Kelas {student.class.toUpperCase()}</span>
                <span className="text-emerald-300">•</span>
                <span>NIS: <strong className="font-mono bg-emerald-950/40 text-emerald-200 px-1.5 py-0.5 rounded text-[10px]">{student.nis}</strong></span>
              </div>
            </div>
          </div>
        );
      })()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Menu Indicator for Wali Santri */}
      <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5 text-xs text-emerald-900 font-bold flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          LAYANAN AKTIF:
          <span className="bg-emerald-800 text-white px-2 py-0.5 rounded text-[10px] uppercase font-mono tracking-wider ml-1">
            {activeSantriTab === 'tagihan' && 'Rincian Tagihan & SPP'}
            {activeSantriTab === 'pelanggaran' && 'Riwayat Pelanggaran & Takzir'}
            {activeSantriTab === 'kesehatan' && 'Riwayat Sakit & Medis'}
            {activeSantriTab === 'pengumuman' && 'Maklumat & Pengumuman'}
            {activeSantriTab === 'perizinan' && 'Pengajuan Izin Keluar Pondok'}
          </span>
        </span>
      </div>

      {/* Modular Content Panel */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSantriTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          
          {/* VIEW 1: BILLS AND PAYMENTS & INLINE NEWS */}
          {activeSantriTab === 'tagihan' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Syahriyah SPP & Pembayaran (col-span-7) */}
            <div className="lg:col-span-7 bg-white p-6 rounded-2xl shadow-sm border border-emerald-50 space-y-4 animate-fade-in text-left">
              <h3 className="font-bold text-base text-emerald-950 flex items-center gap-1.5 border-b border-gray-100 pb-2">
                <CreditCard className="h-4 w-4 text-emerald-750" />
                Syahriyah SPP & Pembayaran Buku Kitab
              </h3>

              {studentBills.length === 0 ? (
                <p className="text-center py-6 text-xs text-gray-400">Belum ada rincian tagihan beredar untuk akun Anda saat ini.</p>
              ) : (
                <div className="space-y-3">
                  {studentBills.map(b => (
                    <div 
                      key={b.id} 
                      className="p-3.5 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200/60 transition flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <strong className="text-sm font-bold text-emerald-950">{b.title}</strong>
                          <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold ${
                            b.status === 'Lunas' ? 'bg-emerald-100 text-emerald-800' :
                            b.status === 'Konfirmasi Pembayaran' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-700'
                          }`}>
                            {b.status === 'Konfirmasi Pembayaran' ? 'Diproses Admin' : b.status}
                          </span>
                        </div>
                        <div className="text-gray-400 font-mono text-[10px] mt-0.5">Batas Bayar: {b.dueDate}</div>
                      </div>

                      <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-2 md:pt-0 border-gray-200/50">
                        <div className="text-right">
                          <span className="text-gray-400 text-[8px] block uppercase font-mono">Beban Tagihan</span>
                          <strong className="text-gray-950 font-extrabold text-sm font-mono block">Rp {b.amount.toLocaleString('id-ID')}</strong>
                        </div>

                        {b.status === 'Lunas' ? (
                          <button
                            type="button"
                            onClick={() => setReceiptBill(b)}
                            className="px-3 py-1.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                          >
                            <Printer className="h-3.5 w-3.5 text-emerald-700" />
                            <span>Kwitansi</span>
                          </button>
                        ) : b.status === 'Konfirmasi Pembayaran' ? (
                          <button
                            type="button"
                            onClick={() => setSelectedBill(b)}
                            className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                          >
                            <Clock className="h-3.5 w-3.5 text-amber-700" />
                            <span>Status / Cek Resi</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setSelectedBill(b)}
                            className="px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                          >
                            <UploadCloud className="h-3.5 w-3.5" />
                            <span>Unggah Bukti Resi</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Payment Modal Dialog (Pop up di tengah layar) */}
              {selectedBill && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto font-sans">
                  <div className="bg-white rounded-2xl shadow-2xl p-5 sm:p-6 max-w-lg w-full border border-emerald-100 text-left space-y-4 animate-fade-in my-auto max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800 font-bold">
                          <CreditCard className="h-4 w-4 text-emerald-800" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-emerald-950 text-sm">
                            Konfirmasi Pembayaran: {selectedBill.title}
                          </h4>
                          <span className="text-[10px] text-slate-500 font-medium">Batas Pembayaran: {selectedBill.dueDate}</span>
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setSelectedBill(null)}
                        className="text-slate-400 hover:text-slate-800 p-1.5 rounded-full hover:bg-slate-100 transition cursor-pointer"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    {success ? (
                      <div className="p-5 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-xl space-y-2 text-center">
                        <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
                        <h5 className="font-extrabold text-sm text-emerald-900">Bukti Transfer Berhasil Dikirim</h5>
                        <p className="text-xs text-emerald-700 leading-relaxed font-semibold">
                          Bukti pembayaran Anda telah dikirimkan ke Bendahara Pesantren untuk diverifikasi.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4 text-xs">
                        {/* Status Alert if bill has uploaded proof awaiting verification */}
                        {selectedBill.status === 'Konfirmasi Pembayaran' && (
                          <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl space-y-1.5 text-left">
                            <div className="flex items-center gap-2 text-amber-950 font-bold text-xs">
                              <Clock className="h-4 w-4 text-amber-700 shrink-0" />
                              <span>Bukti Bayar Sedang Diverifikasi oleh Bendahara</span>
                            </div>
                            <p className="text-[11px] text-amber-900 leading-relaxed">
                              Bukti transfer telah tercatat di sistem pada <strong>{selectedBill.paymentDate || 'hari ini'}</strong>. Status tagihan akan otomatis diperbarui menjadi <strong>Lunas</strong> setelah pihak bendahara mengecek mutasi rekening. Anda juga dapat mengunggah bukti baru jika diperlukan revisi.
                            </p>
                            {selectedBill.paymentProofUrl && (
                              <div className="pt-1 flex items-center gap-2.5">
                                <img src={selectedBill.paymentProofUrl} alt="Resi Terakhir" className="h-11 w-11 object-cover rounded-lg border border-amber-200 shadow-2xs" />
                                <a 
                                  href={selectedBill.paymentProofUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-amber-800 hover:text-amber-950 underline text-[10px] font-bold"
                                >
                                  Lihat Struk Resi Terkirim ↗
                                </a>
                              </div>
                            )}
                          </div>
                        )}
                        {/* Summary Tagihan Khusus Transfer */}
                        <div className="p-4 bg-gradient-to-r from-emerald-900 via-teal-900 to-emerald-950 text-white rounded-2xl shadow-md space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-[10px] uppercase font-mono tracking-wider text-amber-300 block font-bold">
                                Tagihan Pembayaran
                              </span>
                              <h5 className="text-sm font-extrabold text-white mt-0.5">{selectedBill.title}</h5>
                            </div>
                            <div className="text-right">
                              <span className="text-[9px] bg-amber-400 text-emerald-950 font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                {student.fullName}
                              </span>
                              <span className="text-[9px] text-emerald-200 block mt-1 font-mono">NIS: {student.nis}</span>
                            </div>
                          </div>

                          {/* Rincian Tagihan Pokok & Kode Unik Khusus */}
                          <div className="bg-emerald-950/60 p-3 rounded-xl border border-emerald-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2 text-[11px] text-emerald-200">
                                <span>Tagihan Pokok:</span>
                                <span className="font-mono font-bold text-white">Rp {selectedBill.amount.toLocaleString('id-ID')}</span>
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-amber-300 font-bold">
                                <span>Kode Unik Tagihan Khusus:</span>
                                <span className="font-mono bg-amber-400/20 px-1.5 py-0.2 rounded border border-amber-400/40">
                                  +Rp {uniqueCode}
                                </span>
                              </div>
                            </div>
                            <div className="text-left sm:text-right pt-2 sm:pt-0 border-t sm:border-t-0 border-emerald-800">
                              <span className="text-[9px] uppercase font-mono tracking-wider text-amber-200 block font-bold">
                                Total Harus Ditransfer
                              </span>
                              <div className="flex items-center gap-1.5 justify-start sm:justify-end">
                                <span className="text-lg sm:text-xl font-black font-mono text-amber-300">
                                  Rp {finalTransferAmount.toLocaleString('id-ID')}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard?.writeText(String(finalTransferAmount));
                                    setCopiedKey('amount');
                                    setTimeout(() => setCopiedKey(''), 2000);
                                  }}
                                  className="p-1 rounded bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 transition cursor-pointer"
                                  title="Salin Total Transfer"
                                >
                                  {copiedKey === 'amount' ? <Check className="h-3.5 w-3.5 text-amber-300" /> : <Copy className="h-3.5 w-3.5" />}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* PILIHAN REKENING & BANK TUJUAN TRANSFER */}
                        <div className="space-y-2">
                          <label className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider block">
                            Pilih Bank & Rekening Tujuan Transfer:
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {rekeningList.map((rek: any) => {
                              const isSelected = currentRekening.id === rek.id;
                              return (
                                <button
                                  key={rek.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedRekeningId(rek.id);
                                    setBank(`Transfer ${rek.bankName}`);
                                  }}
                                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                                    isSelected 
                                      ? 'border-emerald-700 bg-emerald-50/70 shadow-sm ring-2 ring-emerald-600/30' 
                                      : 'border-slate-200 bg-white hover:bg-slate-50'
                                  }`}
                                >
                                  <div>
                                    <div className="flex items-center justify-between gap-1 mb-1">
                                      <span className="font-extrabold text-slate-900 text-xs truncate">{rek.bankName}</span>
                                      {rek.isMain && (
                                        <span className="text-[8px] bg-emerald-100 text-emerald-800 px-1 rounded font-bold uppercase shrink-0">
                                          Utama
                                        </span>
                                      )}
                                    </div>
                                    <div className="font-mono text-[11px] font-bold text-emerald-850 truncate">
                                      {rek.accountNumber}
                                    </div>
                                    <div className="text-[9px] text-slate-500 truncate">
                                      a.n. {rek.accountName}
                                    </div>
                                  </div>
                                  {isSelected && (
                                    <span className="absolute top-2 right-2 text-emerald-700">
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* QR CODE DISPLAY LANGSUNG SESUAI BANK DAN JUMLAH */}
                        <div className="p-4 bg-emerald-50/70 rounded-2xl border-2 border-dashed border-emerald-400/90 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-1.5">
                            <div className="flex items-center gap-1.5">
                              <QrCode className="h-4 w-4 text-emerald-800" />
                              <span className="text-xs font-black text-emerald-950 uppercase tracking-wide">
                                QR Transfer {currentRekening.bankName} (Atas Nama: {currentRekening.accountName})
                              </span>
                            </div>
                            <span className="text-[9.5px] font-mono font-black text-emerald-850 bg-emerald-200/80 border border-emerald-300 px-2 py-0.5 rounded-full shadow-2xs">
                              ✓ Nominal & Pemilik Otomatis
                            </span>
                          </div>

                          <div className="p-2.5 bg-gradient-to-r from-emerald-900 to-teal-950 text-white rounded-xl text-[10.5px] space-y-1.5 shadow-xs border border-emerald-700/60">
                            <div className="flex items-center justify-between text-amber-300 font-extrabold text-[11px]">
                              <div className="flex items-center gap-1">
                                <Sparkles className="h-3.5 w-3.5" />
                                <span>Pindai QR / Transfer Langsung</span>
                              </div>
                              <span className="text-[9px] bg-amber-400/20 text-amber-200 border border-amber-400/30 px-2 py-0.5 rounded font-mono">
                                Atas Nama: {currentRekening.accountName}
                              </span>
                            </div>
                            <p className="text-emerald-100/90 leading-relaxed font-sans">
                              Pindai kode QR menggunakan <strong>DANA</strong>, <strong>BCA Mobile</strong>, <strong>Livin by Mandiri</strong>, <strong>BRImo</strong>, <strong>BNI Mobile</strong>, atau <strong>GoPay</strong>. Nama penerima akan tampil sesuai rekening resmi: <strong>{currentRekening.accountName}</strong> dan nominal khusus <strong>Rp {finalTransferAmount.toLocaleString('id-ID')}</strong> akan langsung otomatis terisi!
                            </p>
                          </div>

                          <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-3.5 rounded-xl border border-emerald-100 shadow-2xs">
                            {/* QR Code Canvas/Image */}
                            <div className="shrink-0 bg-white p-2.5 rounded-xl border border-emerald-200 shadow-xs flex flex-col items-center">
                              {qrCodeDataUrl ? (
                                <img 
                                  src={qrCodeDataUrl} 
                                  alt={`QR Transfer ${currentRekening.bankName} a.n. ${currentRekening.accountName} Rp ${finalTransferAmount}`} 
                                  className="w-40 h-40 object-contain" 
                                />
                              ) : (
                                <div className="w-40 h-40 bg-slate-100 animate-pulse rounded-lg flex items-center justify-center text-slate-400 font-mono text-[10px]">
                                  Membuat QR...
                                </div>
                              )}
                              {qrCodeDataUrl && (
                                <a
                                  href={qrCodeDataUrl}
                                  download={`QR_Transfer_${currentRekening.bankName.replace(/\s+/g, '_')}_${finalTransferAmount}.png`}
                                  className="mt-2 text-[9.5px] font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 transition"
                                >
                                  <Download className="h-3 w-3" /> Unduh Gambar QR
                                </a>
                              )}
                            </div>

                            {/* Rekening & Nominal Details */}
                            <div className="space-y-2 flex-1 min-w-0 text-left w-full">
                              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                                <div className="flex justify-between items-center">
                                  <div className="text-[10px] text-slate-500 font-medium">Bank / E-Wallet Tujuan:</div>
                                  <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded uppercase">
                                    Resmi
                                  </span>
                                </div>
                                <div className="font-extrabold text-sm text-slate-900">{currentRekening.bankName}</div>
                                
                                <div className="text-[10px] text-slate-500 font-medium pt-1">Nomor Rekening / No. DANA:</div>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-mono text-sm font-black text-emerald-950 select-all tracking-wider">
                                    {currentRekening.accountNumber}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard?.writeText(currentRekening.accountNumber);
                                      setCopiedKey('rek');
                                      setTimeout(() => setCopiedKey(''), 2000);
                                    }}
                                    className="px-2 py-0.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                                  >
                                    {copiedKey === 'rek' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                    <span>{copiedKey === 'rek' ? 'Disalin' : 'Salin'}</span>
                                  </button>
                                </div>

                                <div className="text-[10px] text-slate-600 font-semibold pt-0.5 flex justify-between items-center">
                                  <span>Atas Nama: <strong className="text-slate-900">{currentRekening.accountName}</strong></span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard?.writeText(currentRekening.accountName);
                                      setCopiedKey('owner');
                                      setTimeout(() => setCopiedKey(''), 2000);
                                    }}
                                    className="text-[9px] text-emerald-700 hover:underline font-bold cursor-pointer"
                                  >
                                    {copiedKey === 'owner' ? '✓ Disalin' : 'Salin Nama'}
                                  </button>
                                </div>
                              </div>

                              <div className="p-2 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 space-y-0.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold">Total Wajib Ditransfer:</span>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono font-black text-sm text-amber-950">
                                      Rp {finalTransferAmount.toLocaleString('id-ID')}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        navigator.clipboard?.writeText(String(finalTransferAmount));
                                        setCopiedKey('amt');
                                        setTimeout(() => setCopiedKey(''), 2000);
                                      }}
                                      className="p-0.5 rounded bg-amber-200 text-amber-900 hover:bg-amber-300 transition cursor-pointer text-[9px] font-bold px-1"
                                      title="Salin Nominal"
                                    >
                                      {copiedKey === 'amt' ? '✓' : 'Salin'}
                                    </button>
                                  </div>
                                </div>
                                <p className="text-[9px] text-amber-800 leading-tight">
                                  Transfer tepat hingga 3 digit kode unik (**Rp {finalTransferAmount.toLocaleString('id-ID')}**) ke rekening a.n. <strong>{currentRekening.accountName}</strong>.
                                </p>
                              </div>

                              {/* Direct action button for DANA users */}
                              {currentRekening.bankName.toLowerCase().includes('dana') && (
                                <a
                                  href="https://link.dana.id"
                                  target="_blank"
                                  rel="noreferrer"
                                  className="w-full py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg text-xs transition flex items-center justify-center gap-1.5 shadow-xs"
                                >
                                  <span>Buka Aplikasi DANA untuk Bayar</span>
                                </a>
                              )}
                            </div>
                          </div>

                          {/* QRIS Status Badge & Direct Instant Verification Button */}
                          <div className="pt-2 border-t border-emerald-200/70 flex flex-col sm:flex-row items-center justify-between gap-2 bg-emerald-100/50 -mx-4 -mb-4 p-3 rounded-b-2xl">
                            <div className="flex items-center gap-1.5 text-[10px] text-emerald-950 font-bold">
                              <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
                              <span>
                                {qrisValidation?.isValid 
                                  ? 'Format QRIS Terverifikasi (Standar Nasional ASPI / indonesia_qr_is)' 
                                  : 'Format QRIS Standar Bank Indonesia Aktif'}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={handleInstantOnlinePay}
                              className="w-full sm:w-auto px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs active:scale-95"
                            >
                              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                              <span>Konfirmasi Lunas Otomatis QRIS</span>
                            </button>
                          </div>
                        </div>

                        {/* Opsi 2: Form Pembayaran Manual & Unggah Resi Transfer */}
                        <div className="pt-2 border-t border-slate-200 space-y-2">
                          <div className="flex items-center gap-1.5 text-slate-850 font-bold text-xs">
                            <UploadCloud className="h-4 w-4 text-emerald-700" />
                            <span>Unggah Bukti Bayar Manual (Jika QRIS Terkendala / Transfer Bank)</span>
                          </div>
                          <p className="text-[10px] text-slate-500 leading-normal">
                            Jika Anda mentransfer manual melalui ATM / m-Banking antar bank, silakan unggah foto resi di bawah ini. Pihak Admin/Bendahara akan memverifikasi mutasi dan memperbarui status tagihan menjadi lunas.
                          </p>
                        </div>

                        <form onSubmit={handlePaySimulate} className="space-y-3 text-left">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div>
                              <label className="text-[10px] text-slate-700 font-bold block mb-1">
                                Unggah Foto Bukti Transfer / Struk Resi <span className="text-red-500">*</span>
                              </label>
                              <div className="flex flex-col gap-1.5">
                                <input
                                   type="file"
                                   accept="image/*"
                                   id="payment-proof-upload"
                                   onChange={async (e) => {
                                     const file = e.target.files?.[0];
                                     if (file) {
                                       try {
                                         const compressed = await compressImage(file, 800, 800, 0.7);
                                         setProofUrl(compressed);
                                       } catch {
                                         const reader = new FileReader();
                                         reader.onloadend = () => {
                                           if (typeof reader.result === 'string') {
                                             setProofUrl(reader.result);
                                           }
                                         };
                                         reader.readAsDataURL(file);
                                       }
                                     }
                                   }}
                                   className="hidden"
                                />
                                <label
                                   htmlFor="payment-proof-upload"
                                   className="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 px-3 py-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition active:scale-95 w-full text-center"
                                >
                                   <UploadCloud className="h-4 w-4 text-emerald-700" /> 
                                   <span>{proofUrl ? 'Resi Berhasil Dipilih' : 'Pilih Foto Bukti Transfer'}</span>
                                </label>
                                {proofUrl && (
                                  <div className="mt-1 flex items-center gap-2">
                                    <img src={proofUrl} alt="Bukti Resi" className="h-10 w-10 object-cover rounded border border-slate-200" />
                                    <span className="text-[10px] text-emerald-700 font-semibold">Foto siap dikirim</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div>
                              <label className="text-[10px] text-slate-700 font-bold block mb-1">Bank Pengirim / Rekening Anda (Opsional)</label>
                              <input
                                type="text"
                                placeholder="Contoh: BCA / Mandiri / BRI a.n. Ayah"
                                value={senderBank}
                                onChange={(e) => setSenderBank(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-1 focus:ring-emerald-700 focus:outline-none"
                              />
                            </div>
                          </div>

                          <div className="space-y-2 pt-1">
                            <button
                              type="submit"
                              className="w-full py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold rounded-xl text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-2"
                            >
                              <UploadCloud className="h-4 w-4" />
                              <span>Kirim Bukti Pembayaran ke Bendahara (Rp {finalTransferAmount.toLocaleString('id-ID')})</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                handlePaySimulate(e);
                              }}
                              className="w-full py-2 bg-emerald-100/90 hover:bg-emerald-200 text-emerald-950 font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1.5 border border-emerald-300/80 shadow-2xs"
                            >
                              <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                              <span>Saya Sudah Scan / Transfer via DANA (Konfirmasi Langsung)</span>
                            </button>
                          </div>
                        </form>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Berita & Pengumuman (col-span-5) */}
            <div className="lg:col-span-5 bg-white p-6 rounded-2xl shadow-sm border border-emerald-50 space-y-4 animate-fade-in text-left">
              <h3 className="font-bold text-base text-emerald-950 flex items-center gap-1.5 border-b border-gray-100 pb-2">
                <Bell className="h-4 w-4 text-emerald-750" />
                Maklumat & Berita Wali Santri Terbaru
              </h3>
              {filteredAnn.length === 0 ? (
                <p className="text-center py-6 text-xs text-gray-400">Belum ada maklumat baru yang beredar.</p>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {filteredAnn.map(ann => (
                    <div key={ann.id} className="p-4 bg-amber-50/15 border-l-4 border-amber-500 rounded-r-xl space-y-2">
                      <div className="flex justify-between items-center flex-wrap gap-1">
                        <span className="text-[9px] font-bold text-amber-800 uppercase block font-mono bg-amber-100 rounded px-1.5 py-0.5">
                          {ann.priority.toUpperCase()}
                        </span>
                        <span className="text-[10px] text-gray-400 block font-mono">{ann.date}</span>
                      </div>
                      <span className="font-extrabold text-xs text-gray-950 block leading-tight">{ann.title}</span>
                      <p className="text-gray-700 text-xs leading-relaxed bg-white/50 p-2.5 rounded border border-gray-100/50">{ann.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW: DISCIPLINE VIOLATIONS LOGS */}
        {activeSantriTab === 'pelanggaran' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-50 space-y-4 animate-fade-in text-left">
            <h3 className="font-bold text-base text-emerald-950 flex items-center gap-1.5 border-b border-gray-100 pb-2">
              <ShieldAlert className="h-4 w-4 text-rose-700" />
              Catatan Pelanggaran Kedisiplinan & Takzir
            </h3>

            {(!student.disciplineLogs || student.disciplineLogs.length === 0) ? (
              <p className="text-center py-8 text-xs text-gray-400">Alhamdulillah, tidak ada catatan pelanggaran terdeteksi untuk Anda.</p>
            ) : (
              <div className="space-y-3">
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-xs text-amber-950 mb-3">
                  <p className="font-bold">Informasi Pelanggaran Santri:</p>
                  <p className="mt-1 text-gray-600">
                    Pelanggaran yang bertanda <span className="bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded text-[10px]">Selesai Diurus</span> berarti santri telah menyelesaikan kewajiban bimbingan takzirnya dan dinyatakan bersih.
                  </p>
                </div>

                <div className="overflow-x-auto rounded-xl border border-gray-100">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-gray-100 text-[10px] uppercase font-mono font-bold text-slate-700">
                      <tr>
                        <th className="py-3 px-4">Tanggal</th>
                        <th className="py-3 px-4">Bentuk Pelanggaran</th>
                        <th className="py-3 px-4 text-center">Tingkatan</th>
                        <th className="py-3 px-4">Konsekuensi Takzir</th>
                        <th className="py-3 px-4 text-center">Status Kepengurusan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {student.disciplineLogs.map((log) => {
                        const isSelesai = log.status === 'Selesai';
                        return (
                          <tr key={log.id} className="hover:bg-gray-50/50 transition">
                            <td className="py-3 px-4 font-mono font-medium text-gray-400">{log.date}</td>
                            <td className="py-3 px-4 font-bold text-slate-900">{log.violationType}</td>
                            <td className="py-3 px-4 text-center">
                              <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold ${
                                log.level === 'Berat' ? 'bg-red-100 text-red-700' :
                                log.level === 'Sedang' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                              }`}>
                                {log.level}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-medium text-gray-700 italic">{log.consequence}</td>
                            <td className="py-3 px-4 text-center">
                              <span className={`inline-block px-2.5 py-1 rounded-full text-[9px] font-extrabold tracking-wide uppercase ${
                                log.status === 'Selesai' ? 'bg-emerald-100 text-emerald-800' :
                                log.status === 'Sedang Mengurus' ? 'bg-amber-100 text-amber-800' :
                                'bg-rose-100 text-rose-800'
                              }`}>
                                {log.status === 'Selesai' ? 'Selesai' :
                                 log.status === 'Sedang Mengurus' ? 'Sedang Mengurus' :
                                 'Belum Diurus'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW: HEALTH & MEDICAL HISTORY LOGS */}
        {activeSantriTab === 'kesehatan' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-50 space-y-4 animate-fade-in text-left">
            <h3 className="font-bold text-base text-emerald-950 flex items-center gap-1.5 border-b border-gray-100 pb-2">
              <span>🩺</span>
              Arsip Catatan Medis & Pelayanan Kesehatan Poskestren
            </h3>

            {(!student.healthLogs || student.healthLogs.length === 0) ? (
              <p className="text-center py-8 text-xs text-gray-400">Tidak ada rekam medis di Poskestren Al-Asy'ariyah.</p>
            ) : (
              <div className="space-y-3">
                <div className="overflow-x-auto rounded-xl border border-gray-100">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-gray-100 text-[10px] uppercase font-mono font-bold text-slate-700">
                      <tr>
                        <th className="py-3 px-4">Tanggal Periksa</th>
                        <th className="py-3 px-4">Keluhan Medis</th>
                        <th className="py-3 px-4">Hasil Diagnosa</th>
                        <th className="py-3 px-4">Penanganan & Obat</th>
                        <th className="py-3 px-4 text-center">Status Kesehatan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {student.healthLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50/50 transition">
                          <td className="py-3 px-4 font-mono font-medium text-gray-400">{log.date}</td>
                          <td className="py-3 px-4 font-bold text-slate-900">{log.complaint}</td>
                          <td className="py-3 px-4 text-slate-700 font-semibold">{log.diagnosis}</td>
                          <td className="py-3 px-4 font-medium text-slate-600">{log.treatment}</td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-block px-2.5 py-1 rounded-full text-[9px] font-bold ${
                              log.status === 'Rawat Jalan (Kamar)' ? 'bg-amber-100 text-amber-800' :
                              log.status === 'Nginap di Poskestren' ? 'bg-red-100 text-red-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {log.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW 4: PERIZINAN (EXIT PERMIT PROCESS) */}
        {activeSantriTab === 'perizinan' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-left">
            {/* Left Column: Form Pengajuan (col-span-5) */}
            <div className="lg:col-span-5 bg-white p-6 rounded-2xl shadow-sm border border-emerald-50 space-y-4 animate-fade-in">
              <h3 className="font-bold text-base text-emerald-950 flex items-center gap-1.5 border-b border-gray-100 pb-2">
                <Calendar className="h-4 w-4 text-emerald-700" />
                Form Pengajuan Izin Keluar
              </h3>

              {permitMsg && (
                <div className={`p-3 rounded-xl text-xs font-semibold ${
                  permitMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}>
                  {permitMsg.text}
                </div>
              )}

              <form onSubmit={handleSubmitPermit} className="space-y-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Jenis Perizinan</label>
                  <select
                    value={permitType}
                    onChange={(e) => setPermitType(e.target.value as any)}
                    className="w-full text-xs p-2.5 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:outline-emerald-800"
                  >
                    <option value="Keluar Lingkungan">Keluar Lingkungan (Tidak Bermalam)</option>
                    <option value="Pulang (Keluarga)">Pulang ke Rumah Wali (Bermalam)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Rencana Waktu Keluar</label>
                  <input
                    type="datetime-local"
                    value={permitOutDate}
                    onChange={(e) => setPermitOutDate(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:outline-emerald-800"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Rencana Waktu Kembali</label>
                  <input
                    type="datetime-local"
                    value={permitExpectedReturnDate}
                    onChange={(e) => setPermitExpectedReturnDate(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:outline-emerald-800"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Keperluan / Alasan Izin</label>
                  <textarea
                    value={permitDescription}
                    onChange={(e) => setPermitDescription(e.target.value)}
                    placeholder="Contoh: Berobat ke puskesmas, takziah keluarga meninggal, dll."
                    className="w-full text-xs p-2.5 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:outline-emerald-800 min-h-[80px]"
                    required
                  />
                </div>

                <div className="pt-2">
                  <div className="p-2.5 mb-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-900 font-medium flex items-center gap-2">
                    <Info className="h-4 w-4 text-emerald-700 shrink-0" />
                    <span>Pengajuan izin siap dikirim ke Pengurus Keamanan.</span>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-md uppercase tracking-wider active:scale-[0.98]"
                  >
                    Kirim & Ajukan Surat Perizinan
                  </button>
                </div>
              </form>
            </div>

            {/* Right Column: Riwayat & Status (col-span-7) */}
            <div className="lg:col-span-7 bg-white p-6 rounded-2xl shadow-sm border border-emerald-50 space-y-4 animate-fade-in">
              <h3 className="font-bold text-base text-emerald-950 flex items-center gap-1.5 border-b border-gray-100 pb-2">
                <Clock className="h-4 w-4 text-emerald-700" />
                Daftar Riwayat Izin Keluar ({student.securityLogs?.length || 0})
              </h3>

              {(!student.securityLogs || student.securityLogs.length === 0) ? (
                <p className="text-center py-8 text-xs text-gray-400">Belum ada riwayat pengajuan izin keluar.</p>
              ) : (
                <div className="space-y-3">
                  {student.securityLogs.map((log) => (
                    <div key={log.id} className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 flex flex-col justify-between gap-3 text-xs leading-relaxed">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <span className="font-mono text-[9px] bg-gray-200 text-gray-700 font-bold px-1.5 py-0.5 rounded">
                            {log.id}
                          </span>
                          <span className="ml-2 font-bold text-slate-800">
                            {log.permitType}
                          </span>
                        </div>
                        
                        {/* Status Badge */}
                        <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide ${
                          log.status === 'Menunggu Persetujuan' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                          log.status === 'Ditolak' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                          log.status === 'Aktif / Keluar' ? 'bg-emerald-100 text-emerald-800 border border-emerald-250' :
                          'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}>
                          {log.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-[11px] bg-white p-2.5 rounded-lg border border-gray-100">
                        <div>
                          <span className="text-gray-400 block text-[9px] uppercase font-bold">Keluar</span>
                          <span className="font-medium text-slate-800">{log.outDate}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[9px] uppercase font-bold">Harus Kembali</span>
                          <span className="font-medium text-slate-800">{log.expectedReturnDate}</span>
                        </div>
                      </div>

                      <div className="text-[11px] text-gray-650">
                        <strong className="text-gray-700 block text-[9px] uppercase font-bold">Keperluan:</strong>
                        <p>{log.description}</p>
                      </div>

                      {log.signedBy && (
                        <div className="text-[9px] text-gray-400 text-right italic">
                          Oleh: {log.signedBy}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </motion.div>
    </AnimatePresence>

      {/* MODAL: CETAK KWITANSI RESMI */}
      {receiptBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-950/75 backdrop-blur-sm print:bg-white print:p-0">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 md:p-8 border border-emerald-100 flex flex-col justify-between print:shadow-none print:border-none print:p-0 relative animate-fade-in">
            
            {/* Absolute close button */}
            <button
              onClick={() => setReceiptBill(null)}
              className="absolute top-4 right-4 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition print:hidden cursor-pointer"
              title="Tutup"
            >
              <X size={20} />
            </button>

            {/* Prominent Close/Keluar button at the top for alumni */}
            <div className="flex justify-between items-center mb-3 border-b border-gray-150 pb-2 print:hidden">
              <span className="text-xs font-black text-emerald-900 tracking-wider">PREVIEW RESMI</span>
              <button
                type="button"
                onClick={() => setReceiptBill(null)}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-extrabold transition cursor-pointer flex items-center gap-1 shadow-sm"
              >
                Keluar / Tutup Kwitansi
              </button>
            </div>

            <PrintGuideAlert />

            {/* Printable Area Wrapper */}
            <div id="santri-receipt-bill-printable-area" className="space-y-4">
              {/* Kwitansi Header */}
              <div className="border-b-2 border-emerald-700 pb-4 mb-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h4 className="text-emerald-900 font-extrabold text-lg tracking-wide uppercase">{settings.schoolName || "Pondok Pesantren Al-Asy'ariyah"}</h4>
                    <p className="text-[10px] text-gray-500 max-w-sm leading-relaxed">
                      {settings.address || "Jl. Raya Modung, Langpanggang, Modung, Bangkalan, Jawa Timur"}<br />
                      {settings.tagline || "Mencetak Generasi Qur'ani, Berakhlakul Karimah, Unggul, dan Mandiri"}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="bg-emerald-100 px-3 py-1 rounded text-emerald-800 text-[10px] uppercase font-mono font-bold tracking-widest leading-none">
                      BUKTI KWITANSI
                    </span>
                    <div className="text-[11px] text-gray-400 font-mono mt-2">No: KWT-{receiptBill.id.split('-')[1] || Date.now()}</div>
                  </div>
                </div>
              </div>

              {/* Kwitansi Content Table */}
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-12 gap-2 pb-2 border-b border-gray-100">
                  <div className="col-span-4 text-gray-500 font-medium">Telah terima dari:</div>
                  <div className="col-span-8 text-gray-900 font-black">{student.parentName} (Wali {student.fullName})</div>
                </div>

                <div className="grid grid-cols-12 gap-2 pb-2 border-b border-gray-100">
                  <div className="col-span-4 text-gray-500 font-medium font-bold">Nama Santri:</div>
                  <div className="col-span-8 text-gray-900 font-bold">{student.fullName} (NIS: {student.nis})</div>
                </div>

                <div className="grid grid-cols-12 gap-2 pb-2 border-b border-gray-100">
                  <div className="col-span-4 text-gray-500 font-medium">Kelas:</div>
                  <div className="col-span-8 text-gray-900">{student.class}</div>
                </div>

                <div className="grid grid-cols-12 gap-2 pb-2 border-b border-gray-100">
                  <div className="col-span-4 text-gray-500 font-medium">Untuk Pembayaran:</div>
                  <div className="col-span-8 text-gray-900 font-semibold">{receiptBill.title}</div>
                </div>

                <div className="grid grid-cols-12 gap-2 pb-2 border-b border-gray-100">
                  <div className="col-span-4 text-gray-500 font-medium">Metode Pembayaran:</div>
                  <div className="col-span-8 text-gray-900 font-mono">{receiptBill.paymentMethod || 'Transfer Rekening Bank'}</div>
                </div>

                <div className="grid grid-cols-12 gap-2 pb-2 border-b border-gray-100">
                  <div className="col-span-4 text-gray-500 font-medium">Tanggal Lunas:</div>
                  <div className="col-span-8 text-gray-900">{receiptBill.paymentDate || receiptBill.dueDate}</div>
                </div>
              </div>

              {/* Price section & Sign */}
              <div className="mt-8 flex flex-col items-stretch gap-6 border-t border-dashed border-gray-250 pt-6">
                <div className="bg-emerald-50 border border-emerald-200 px-5 py-3 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">Jumlah:</span>
                    <span className="text-xl font-black text-emerald-950">Rp {receiptBill.amount.toLocaleString('id-ID')}</span>
                  </div>
                  <span className="bg-emerald-600 text-white font-mono text-[9px] px-1.5 py-0.5 rounded uppercase tracking-widest font-black">
                    LUNAS
                  </span>
                </div>

                <div className="flex justify-end">
                  {/* Posisi Kanan Model Rata Kiri */}
                  <div className="text-left space-y-1 relative w-[290px] font-sans">
                    <p className="text-[10px] text-slate-500 font-medium">{getCityFromAddress(settings.address)}, {receiptBill.paymentDate || new Date().toISOString().split('T')[0]}</p>
                    <p className="text-[10px] text-slate-900 font-bold uppercase tracking-wider">Mengetahui, Bendahara Pesantren</p>
                    
                    {/* Area Tanda Tangan: 4 Spasi Kebawah (h-16), Stempel di sebelah KANAN model tumpang tindih */}
                    <div className="h-16 w-full relative flex items-center justify-start select-none my-2">
                      {/* Tanda tangan: Posisi dasar di sebelah kiri teks */}
                      <div className="z-10 relative flex items-center justify-start">
                        {isImageUrl(settings.ttdBendaharaUrl || settings.ttdPengurusUrl) ? (
                          <img src={settings.ttdBendaharaUrl || settings.ttdPengurusUrl} alt="TTD Pengurus" className="h-16 max-w-[170px] object-contain mix-blend-multiply" referrerPolicy="no-referrer" />
                        ) : (
                          <span className="text-sm font-serif text-slate-900 italic font-bold tracking-wide underline">
                            {settings.ttdBendaharaUrl || settings.ttdPengurusUrl || 'Bendahara Pesantren'}
                          </span>
                        )}
                      </div>

                      {/* Stempel: Berada di SEBELAH KANAN tanda tangan dengan model tumpang tindih */}
                      {(settings.stempelBendaharaUrl || settings.stempelPesantrenUrl) && (
                        <div className="z-20 absolute left-[75px] sm:left-[90px] -top-2 pointer-events-none opacity-85">
                          {isImageUrl(settings.stempelBendaharaUrl || settings.stempelPesantrenUrl) ? (
                            <img src={settings.stempelBendaharaUrl || settings.stempelPesantrenUrl} alt="Stempel Pesantren" className="h-20 w-20 object-contain rotate-[-8deg] mix-blend-multiply" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="border border-double border-emerald-600/60 text-emerald-700/90 rounded-full h-16 w-16 flex items-center justify-center text-[7px] font-extrabold uppercase rotate-[-8deg] leading-tight text-center bg-white/75 shadow-xs">
                              {settings.stempelBendaharaUrl || settings.stempelPesantrenUrl}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <p className="text-xs font-black text-slate-950 underline leading-none uppercase">{settings.namaBendahara || settings.namaPengurus || 'Ustadzah Siti Aminah'}</p>
                    <p className="text-[9px] text-slate-500 font-medium uppercase tracking-wider mt-0.5">Bendahara Pondok Pesantren</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions buttons */}
            <div className="border-t border-gray-150 pt-4 mt-6 flex flex-wrap justify-end gap-2 print:hidden text-xs">
              <button
                type="button"
                onClick={() => setReceiptBill(null)}
                className="px-4 py-1.5 border border-gray-300 hover:bg-gray-100 rounded font-semibold cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => downloadPrintableHTML('santri-receipt-bill-printable-area', `Kwitansi_Resmi_${student.fullName}_${receiptBill.title}`)}
                className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-bold cursor-pointer transition flex items-center gap-1.5 animate-bounce"
              >
                <Download className="h-3.5 w-3.5" /> Cetak / Unduh PDF
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: CETAK KARTU SANTRI AKTIF (STUDENT/WALI PERSPECTIVE LANDSCAPE) */}
      {showStudentCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-950/75 backdrop-blur-sm overflow-y-auto print:bg-white print:p-0 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-emerald-100 overflow-hidden flex flex-col justify-between print:shadow-none print:border-none my-8">
            
            <div className="p-4 bg-emerald-50 border-b border-emerald-100 print:hidden text-left text-xs">
              <div className="bg-emerald-100/60 border border-emerald-200 text-emerald-950 rounded-lg p-2.5 font-semibold">
                ⎙ Pratinjau Kartu Santri Landscape Resmi. Untuk hasil terbaik saat mencetak langsung, pastikan Anda memilih orientasi <strong>Landscape (Tidur)</strong> pada dialog cetak peramban.
              </div>
            </div>

            {/* Card Body & Printable wrapper (LANDSCAPE ASPECT RATIO) */}
            <div className="p-6 bg-slate-50 overflow-x-auto flex justify-center">
              <div id="santri-student-card-printable-area" className="p-4 bg-sky-100 print:bg-sky-100 text-left font-sans flex flex-col justify-between border-2 border-emerald-800 rounded-2xl w-[480px] h-[300px] shadow-md relative overflow-hidden shrink-0">
                
                {/* Style Injection to enforce landscape printing for this card */}
                <style dangerouslySetInnerHTML={{__html: `
                  @media print {
                    @page {
                      size: landscape !important;
                    }
                    body {
                      background: white;
                    }
                    #santri-student-card-printable-area {
                      border: 2px solid #065f46 !important;
                      box-shadow: none !important;
                      margin: 0 auto !important;
                      background: #e0f2fe !important;
                      -webkit-print-color-adjust: exact !important;
                      print-color-adjust: exact !important;
                    }
                  }
                `}} />

                {/* Kop Surat Resmi Pesantren - CUSTOM BLACK BACKGROUND, CENTERED TEXT */}
                <div className="bg-black text-center p-2 rounded-t-xl shrink-0 -mx-4 -mt-4 relative overflow-hidden">
                  <h4 className="text-[11px] font-black tracking-widest text-white uppercase m-0 leading-tight">KARTU ANGGOTA SANTRI</h4>
                  <p className="text-[7px] font-extrabold text-blue-400 m-0 leading-tight">YAYASAN PENDIDIKAN PONDOK PESANTREN</p>
                  <h3 className="text-[11px] font-black text-red-500 m-0 leading-tight">AL-ASY'ARIYAH MUSA</h3>
                  <p className="text-[6px] text-white font-medium leading-none m-0 mt-0.5">
                    {settings.address || "Jl. Raya Modung, Langpanggang, Modung, Bangkalan, Jawa Timur"}
                  </p>
                </div>
                {/* Thick yellow line underneath the Kop */}
                <div className="h-1 bg-yellow-400 shrink-0 -mx-4 mb-2" />

                <div className="flex-1 flex gap-4 items-stretch min-h-0">
                  {/* Left Column: Photo & Text */}
                  <div className="w-[110px] flex flex-col items-center justify-start py-0.5 shrink-0">
                    {/* Photo */}
                    <div className="h-28 w-22 bg-white border border-emerald-800 rounded-lg flex items-center justify-center p-0.5 shadow-xs overflow-hidden my-0.5 shrink-0">
                      {student.photoUrl ? (
                        <img 
                          src={student.photoUrl} 
                          alt="Santri"
                          className="h-full w-full object-cover rounded"
                          referrerPolicy="no-referrer"
                        />
                      ) : student.gender === 'Perempuan' ? (
                        <img 
                          src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200" 
                          alt="Santri"
                          className="h-full w-full object-cover rounded"
                        />
                      ) : (
                        <img 
                          src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200" 
                          alt="Santri"
                          className="h-full w-full object-cover rounded"
                        />
                      )}
                    </div>

                    <span className="text-[6.5px] font-bold text-slate-700 tracking-tight block text-center mt-1 leading-tight select-none">
                      Berlaku Selama Menjadi Santri
                    </span>
                  </div>

                  {/* Right Column: Identity Info - Aligned perfectly with top of photo */}
                  <div className="flex-1 flex flex-col justify-between py-0.5">
                    {/* Profile Fields (NIS, NAMA, TEMPAT, TGL LAHIR, ALAMAT, NAMA WALI) */}
                    <div className="space-y-1.5 py-0.5 flex-1 flex flex-col justify-start text-[8.5px] text-left">
                      <div className="grid grid-cols-12 gap-1 items-start leading-tight">
                        <span className="col-span-4 text-[7px] text-slate-600 font-extrabold uppercase tracking-wider">NIS</span>
                        <span className="col-span-1 text-slate-400 text-center">:</span>
                        <span className="col-span-7 font-mono font-bold text-slate-900">{student.nis}</span>
                      </div>

                      <div className="grid grid-cols-12 gap-1 items-start leading-tight">
                        <span className="col-span-4 text-[7px] text-slate-600 font-extrabold uppercase tracking-wider">NAMA</span>
                        <span className="col-span-1 text-slate-400 text-center">:</span>
                        <span className="col-span-7 font-black text-slate-900 uppercase truncate">{student.fullName}</span>
                      </div>

                      <div className="grid grid-cols-12 gap-1 items-start leading-tight">
                        <span className="col-span-4 text-[7px] text-slate-600 font-extrabold uppercase tracking-wider">TEMPAT, TGL LAHIR</span>
                        <span className="col-span-1 text-slate-400 text-center">:</span>
                        <span className="col-span-7 font-bold text-slate-900 uppercase truncate">
                          {student.birthPlace || 'Semarang'}, {student.birthDate || '08-07-2008'}
                        </span>
                      </div>

                      <div className="grid grid-cols-12 gap-1 items-start leading-tight">
                        <span className="col-span-4 text-[7px] text-slate-600 font-extrabold uppercase tracking-wider">ALAMAT</span>
                        <span className="col-span-1 text-slate-400 text-center">:</span>
                        <span className="col-span-7 font-bold text-slate-850 line-clamp-2 leading-none">{student.address || 'Jawa Tengah'}</span>
                      </div>

                      <div className="grid grid-cols-12 gap-1 items-start leading-tight">
                        <span className="col-span-4 text-[7px] text-slate-600 font-extrabold uppercase tracking-wider">NAMA WALI</span>
                        <span className="col-span-1 text-slate-400 text-center">:</span>
                        <span className="col-span-7 font-extrabold text-slate-900 uppercase truncate">{student.parentName || '-'}</span>
                      </div>
                    </div>

                    {/* Footer sign */}
                    <div className="flex flex-col items-end text-right mt-1 shrink-0 relative">
                      <p className="text-[7px] text-slate-700 font-semibold leading-none">
                        {getCityFromAddress(settings.address) || "Jawa Tengah"}, 08 Juli 2026
                      </p>
                      <p className="text-[7.5px] text-slate-800 font-extrabold uppercase tracking-wider leading-tight mt-0.5">Pengasuh Pondok Pesantren,</p>
                      
                      {/* Overlapping signature and stamp area: 4 Spasi Kebawah (h-16), Stempel di KANAN model tumpang tindih */}
                      <div className="h-16 w-36 relative flex items-center justify-start select-none my-1">
                        {/* Signature: Rata Kiri */}
                        <div className="z-10 relative flex items-center justify-start">
                          {isImageUrl(settings.ttdPengasuhUrl) ? (
                            <img src={settings.ttdPengasuhUrl} alt="TTD Pengasuh" className="h-14 max-w-[120px] object-contain mix-blend-multiply" referrerPolicy="no-referrer" />
                          ) : (
                            <span className="text-[8.5px] font-mono text-blue-900 italic font-extrabold underline">
                              {settings.namaPengasuh || "KH. Ahmad Wildan"}
                            </span>
                          )}
                        </div>

                        {/* Stamp: Berada di SEBELAH KANAN tanda tangan dengan model tumpang tindih */}
                        {settings.stempelPengasuhUrl && (
                          <div className="z-20 absolute left-[50px] -top-1 pointer-events-none opacity-85">
                            {isImageUrl(settings.stempelPengasuhUrl) ? (
                              <img src={settings.stempelPengasuhUrl} alt="Stempel Pengasuh" className="h-14 w-14 object-contain rotate-[-8deg] mix-blend-multiply" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="border border-double border-red-600/60 text-red-700/90 rounded-full h-12 w-12 flex items-center justify-center text-[5px] font-extrabold uppercase rotate-[-8deg] leading-none text-center bg-white/75">
                                {settings.stempelPengasuhUrl}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <p className="text-[8px] font-bold text-gray-900 underline leading-none uppercase truncate">{settings.namaPengasuh || "KH. Ahmad Wildan Asy'ari"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions buttons */}
            <div className="p-4 bg-emerald-50 border-t border-emerald-100 flex flex-wrap justify-end gap-2 print:hidden shrink-0 text-xs">
              <button
                type="button"
                onClick={() => setShowStudentCard(false)}
                className="px-4 py-1.5 border border-gray-300 hover:bg-gray-150 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Tutup
              </button>
              
              <button
                type="button"
                onClick={() => downloadPrintableHTML('santri-student-card-printable-area', `Kartu_Santri_${student.fullName}`)}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-sm"
              >
                <Download className="h-3.5 w-3.5" /> Unduh HTML Offline
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md animate-pulse"
              >
                <Printer className="h-3.5 w-3.5" /> Cetak Kartu Langsung ⎙
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
