import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, CreditCard, Landmark, DollarSign, Calendar, Clock, AlertCircle, 
  CheckCircle2, Bell, ShieldAlert, Sparkles, Send, UploadCloud, Check, Printer, IdCard, X, Download
} from 'lucide-react';
import { Student, Bill, Announcement, PortalSettings, SecurityLog } from '../types';
import { downloadPrintableHTML, PrintGuideAlert } from './PrintHelper';
import { isSupabaseConfigured, pushStudentToSupabase, pushBillToSupabase, markLocalDataChanged } from '../lib/supabase';

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
  const [bank, setBank] = React.useState('Transfer BRI (Virtual Account)');
  const [proofUrl, setProofUrl] = React.useState('');
  const [success, setSuccess] = React.useState(false);
  const [senderBank, setSenderBank] = React.useState('Bank BRI');

  const [isSantriMenuOpen, setIsSantriMenuOpen] = React.useState(false);

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

    const updatedBill: Bill = {
      ...selectedBill,
      status: 'Konfirmasi Pembayaran',
      paymentMethod: bank,
      senderBank: senderBank,
      paymentProofUrl: proofUrl || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=200'
    };

    // Mutate bill status to pending approval using functional updater to prevent stale closures
    setBills(prevBills => {
      const updated = prevBills.map(b => b.id === selectedBill.id ? updatedBill : b);
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
    const updatedBill: Bill = {
      ...selectedBill,
      status: 'Lunas',
      paidDate: todayStr,
      paymentMethod: bank || 'Pembayaran Online (VA / QRIS)',
      senderBank: senderBank || 'Online Gateway Bank',
      paymentProofUrl: proofUrl || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=200'
    };

    setBills(prevBills => {
      const updated = prevBills.map(b => b.id === selectedBill.id ? updatedBill : b);
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
          if (s.id === student.id) {
            const hist = s.paymentHistory || [];
            const newHist = {
              id: 'pay-' + Date.now(),
              date: todayStr,
              amount: selectedBill.amount,
              description: `Pembayaran Online ${selectedBill.title}`,
              paymentMethod: bank || 'Online VA / QRIS',
              verifiedBy: 'Sistem Pembayaran Online'
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
                ✨ PORTAL RESMI WALI SANTRI
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
          <span>📌</span> LAYANAN AKTIF:
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
                            📥 Cari Kwitansi
                          </button>
                        ) : b.status === 'Konfirmasi Pembayaran' ? (
                          <span className="text-[10px] text-amber-600 italic font-medium">Menunggu Verifikasi</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setSelectedBill(b)}
                            className="px-4 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                          >
                            Bayar Online
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
                          💳
                        </div>
                        <div>
                          <h4 className="font-extrabold text-emerald-950 text-sm">
                            Bayar Online: {selectedBill.title}
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
                        <div className="text-3xl">🎉</div>
                        <h5 className="font-extrabold text-sm text-emerald-900">Pembayaran Berhasil Diproses!</h5>
                        <p className="text-xs text-emerald-700 leading-relaxed font-semibold">
                          Transaksi pembayaran Anda telah dicatat ke sistem keuangan pesantren dan disinkronkan ke cloud.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4 text-xs">
                        {/* Summary Tagihan */}
                        <div className="p-3.5 bg-gradient-to-r from-emerald-800 to-teal-900 text-white rounded-xl flex items-center justify-between shadow-sm">
                          <div>
                            <span className="text-[10px] uppercase font-mono tracking-wider text-emerald-200 block">Total Pembayaran</span>
                            <span className="text-lg font-black font-mono">Rp {selectedBill.amount.toLocaleString('id-ID')}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] bg-amber-400 text-emerald-950 font-black px-2 py-0.5 rounded-full uppercase">
                              {student.fullName}
                            </span>
                            <span className="text-[9px] text-emerald-200 block mt-0.5 font-mono">NIS: {student.nis}</span>
                          </div>
                        </div>

                        {/* Opsi 1: Bayar Instan Otomatis */}
                        <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2 text-left">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-emerald-900 flex items-center gap-1.5">
                              <span>⚡</span> Kanal 1: Bayar Online Instan (Gateway)
                            </span>
                            <span className="text-[9px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full">
                              Lunas Otomatis
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-snug">
                            Sistem akan langsung memvalidasi pembayaran tagihan secara real-time, menerbitkan kwitansi resmi, dan memperbarui buku kas.
                          </p>
                          <button
                            type="button"
                            onClick={handleInstantOnlinePay}
                            className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-black rounded-xl text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-2"
                          >
                            <span>✓</span>
                            <span>Proses Bayar Online Sekarang (Rp {selectedBill.amount.toLocaleString('id-ID')})</span>
                          </button>
                        </div>

                        {/* Divider */}
                        <div className="relative flex py-1 items-center">
                          <div className="flex-grow border-t border-slate-200"></div>
                          <span className="flex-shrink mx-3 text-slate-400 text-[10px] uppercase font-bold tracking-wider">Atau Unggah Bukti Manual</span>
                          <div className="flex-grow border-t border-slate-200"></div>
                        </div>

                        {/* Opsi 2: Transfer Bank & Kirim Bukti Manual */}
                        <form onSubmit={handlePaySimulate} className="space-y-3 text-left">
                          <div>
                            <label className="text-[10px] text-slate-600 font-bold block mb-1">Pilih Rekening Tujuan Transfer</label>
                            <select
                              value={bank}
                              onChange={(e) => setBank(e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-1 focus:ring-emerald-700 focus:outline-none"
                            >
                              {settings.rekeningList && settings.rekeningList.length > 0 ? (
                                settings.rekeningList.map((rek: any) => (
                                  <option key={rek.id} value={`Transfer ${rek.bankName}`}>
                                    {rek.bankName} - {rek.accountNumber} a.n. {rek.accountName} {rek.isMain ? '(Kanal Utama)' : ''}
                                  </option>
                                ))
                              ) : (
                                <>
                                  <option value={`Transfer ${settings.pesantrenBankName || 'BSI'}`}>
                                    {settings.pesantrenBankName || 'Bank Syariah Indonesia (BSI)'} - {settings.pesantrenBankAccountNumber || '718290182'} a.n. {settings.pesantrenBankAccountName || 'PONPES AL-ASYARIYAH'}
                                  </option>
                                  <option value="Transfer BRI (Virtual Account)">Transfer BRI (Virtual Account) - 88201982736</option>
                                  <option value="Transfer BNI (Virtual Account)">Transfer BNI (Virtual Account) - 98201982747</option>
                                </>
                              )}
                              <option value="Tunai ke Bendahara Pesantren">Bayar Tunai ke Bendahara Pesantren</option>
                            </select>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div>
                              <label className="text-[10px] text-slate-600 font-bold block mb-1">Unggah Struk / Bukti Transfer</label>
                              <div className="flex items-center gap-2">
                                <input
                                   type="file"
                                   accept="image/*"
                                   id="payment-proof-upload"
                                   onChange={(e) => {
                                     const file = e.target.files?.[0];
                                     if (file) {
                                       const reader = new FileReader();
                                       reader.onloadend = () => {
                                         if (typeof reader.result === 'string') {
                                           setProofUrl(reader.result);
                                         }
                                       };
                                       reader.readAsDataURL(file);
                                     }
                                   }}
                                   className="hidden"
                                />
                                <label
                                   htmlFor="payment-proof-upload"
                                   className="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 px-3 py-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition active:scale-95 w-full text-center"
                                >
                                   <UploadCloud className="h-4 w-4 text-emerald-700" /> {proofUrl ? 'Foto Terpilih ✓' : 'Pilih Foto Resi'}
                                </label>
                              </div>
                            </div>

                            <div>
                              <label className="text-[10px] text-slate-600 font-bold block mb-1">Bank Pengirim (Opsional)</label>
                              <input
                                type="text"
                                placeholder="Contoh: BCA / Mandiri / BSI"
                                value={senderBank}
                                onChange={(e) => setSenderBank(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-1 focus:ring-emerald-700 focus:outline-none"
                              />
                            </div>
                          </div>

                          <button
                            type="submit"
                            className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition cursor-pointer"
                          >
                            Kirim Bukti Pembayaran ke Bendahara
                          </button>
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
                                {log.status === 'Selesai' ? '✓ Selesai' :
                                 log.status === 'Sedang Mengurus' ? '⏳ Sedang Mengurus' :
                                 '⚡ Belum Diurus'}
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
                    <span className="text-sm">ℹ️</span>
                    <span>Pengajuan izin siap dikirim. Setelah mengeklik tombol di bawah, surat perizinan akan langsung dikirim & diajukan ke Pengurus Keamanan.</span>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-md uppercase tracking-wider active:scale-[0.98]"
                  >
                    <span>🚀</span> Kirim & Ajukan Surat Perizinan
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
                ✕ Keluar / Tutup Kwitansi
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

                <div className="flex justify-center">
                  {/* Column 1 (Left): Pengurus (with Stempel overlapping Signature) */}
                  <div className="text-center space-y-0.5 relative w-64">
                    <p className="text-[9px] text-gray-400 font-semibold">{getCityFromAddress(settings.address)}, {receiptBill.paymentDate || new Date().toISOString().split('T')[0]}</p>
                    <p className="text-[9px] text-emerald-900 font-extrabold uppercase tracking-wider">Mengetahui,</p>
                    
                    <div className="h-16 w-36 mx-auto relative flex items-center justify-center select-none">
                      {/* Tanda tangan rendered in background */}
                      <div className="z-10 absolute inset-0 flex items-center justify-center">
                        {isImageUrl(settings.ttdPengurusUrl) ? (
                          <img src={settings.ttdPengurusUrl} alt="TTD Pengurus" className="max-h-16 max-w-[120px] object-contain mix-blend-multiply" referrerPolicy="no-referrer" />
                        ) : (
                          <span className="text-[10px] font-mono text-emerald-800 italic font-extrabold tracking-wide">
                            {settings.ttdPengurusUrl || '✍️ Ahmad Wildan'}
                          </span>
                        )}
                      </div>

                      {/* Stempel rendered on top overlapping */}
                      {settings.stempelPesantrenUrl && (
                        <div className="z-20 absolute left-[-15px] top-[-5px] pointer-events-none opacity-85">
                          {isImageUrl(settings.stempelPesantrenUrl) ? (
                            <img src={settings.stempelPesantrenUrl} alt="Stempel Pesantren" className="h-20 w-20 object-contain rotate-[-12deg] mix-blend-multiply" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="border border-double border-emerald-600/60 text-emerald-700/90 rounded-full h-16 w-16 flex items-center justify-center text-[7px] font-extrabold uppercase rotate-[-12deg] leading-tight text-center bg-white/75 shadow-xs">
                              {settings.stempelPesantrenUrl}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <p className="text-xs font-black text-gray-900 underline leading-none">{settings.namaPengurus || 'Ustadz Ahmad Wildan, M.Pd'}</p>
                    <p className="text-[8.5px] text-gray-500 font-bold uppercase tracking-wider mt-1">Bendahara Pondok Pesantren</p>
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
                      
                      {/* Overlapping signature and stamp area */}
                      <div className="relative min-h-[42px] flex flex-col items-center justify-end select-none my-0.5 w-32">
                        {/* Signature: Berada DI ATAS nama pengasuh */}
                        <div className="z-10 mb-0.5 flex items-center justify-center">
                          {isImageUrl(settings.ttdPengasuhUrl) ? (
                            <img src={settings.ttdPengasuhUrl} alt="TTD Pengasuh" className="max-h-9 max-w-[85px] object-contain mix-blend-multiply" referrerPolicy="no-referrer" />
                          ) : (
                            <span className="text-[7.5px] font-mono text-blue-900 italic font-extrabold">
                              {"✒️ " + (settings.namaPengasuh || "KH. Ahmad Wildan")}
                            </span>
                          )}
                        </div>

                        {/* Stamp: Berada di SEBELAH KIRI nama pengasuh */}
                        {settings.stempelPengasuhUrl && (
                          <div className="z-20 absolute -left-3 -bottom-0.5 pointer-events-none opacity-85">
                            {isImageUrl(settings.stempelPengasuhUrl) ? (
                              <img src={settings.stempelPengasuhUrl} alt="Stempel Pengasuh" className="h-10 w-10 object-contain rotate-[-10deg] mix-blend-multiply" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="border border-double border-red-600/60 text-red-700/90 rounded-full h-8 w-8 flex items-center justify-center text-[5px] font-extrabold uppercase rotate-[-10deg] leading-none text-center bg-white/75">
                                {settings.stempelPengasuhUrl}
                              </div>
                            )}
                          </div>
                        )}

                        <p className="text-[8px] font-bold text-gray-900 underline leading-none uppercase truncate">{settings.namaPengasuh || "KH. Ahmad Wildan Asy'ari"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Decorative Watermark background leaf */}
                <div className="absolute -bottom-10 -right-10 opacity-[0.03] pointer-events-none text-emerald-900 select-none">
                  <span className="text-9xl">🌿</span>
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
                <Download className="h-3.5 w-3.5" /> Unduh HTML Offline 📥
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
