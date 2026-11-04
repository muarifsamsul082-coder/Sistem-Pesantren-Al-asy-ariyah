import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  Send, 
  CheckSquare, 
  Square, 
  Users, 
  Search, 
  MessageSquare, 
  Phone, 
  ExternalLink, 
  RefreshCw, 
  CheckCircle2,
  AlertCircle,
  X,
  Copy
} from 'lucide-react';
import { Student, Bill, PortalSettings, Room } from '../types';
import { formatIndonesianDate } from '../lib/dateUtils';

interface WhatsAppBroadcastPanelProps {
  students: Student[];
  bills: Bill[];
  settings: PortalSettings;
  saveWaLog: (type: string, phone: string, recipient: string, message: string) => void;
  logAdminActivity: (actionType: string, description: string, targetId?: string, targetName?: string) => void;
  showAlert: (type: 'success' | 'danger', message: string) => void;
  availableFormalClasses?: string[];
  availableMadrasahClasses?: string[];
  rooms?: Room[];
  currentAdminName?: string;
}

// Template surat & pemberitahuan resmi pesantren untuk broadcast WhatsApp
export const getLetterTemplates = (settings: PortalSettings) => {
  const school = settings.schoolName || "Pondok Pesantren Al-Asy'ariyah";
  const pengasuh = settings.namaPengasuh || "KH. Asy'ari Al-Hafidz";
  const bendahara = settings.namaBendaharaPutra || settings.namaBendahara || "Ustadz Ahmad Fauzi, S.E.";
  const akademik = settings.namaAkademik || "Bagian Pendidikan & Madrasah";
  const keamanan = settings.namaKeamanan || "Bagian Keamanan & Ketertiban";

  return [
    {
      id: 'surat_tunggakan',
      label: '⚠️ Peringatan Tunggakan & Batas Akhir (Deadline)',
      title: 'Peringatan Tunggakan Pembayaran',
      body: `Assalamu'alaikum Wr. Wb.
Yth. Bapak/Ibu {nama_wali} (Wali dari {nama_santri}, Kelas {kelas}).

Informasi kewajiban administrasi santri yang belum lunas di ${school}:
• Total Tunggakan: *{tunggakan}*
• Batas Pelunasan: *{deadline}*

Rincian:
{rincian_tunggakan}

Rekening Pembayaran:
{info_rekening}

Mohon konfirmasi bukti transfer via WhatsApp ini. Terima kasih atas kerja samanya.
Wassalamu'alaikum Wr. Wb.

-- Bendahara ${school} --`
    },
    {
      id: 'surat_tagihan',
      label: '💰 Pemberitahuan Pembayaran Syahriyah / SPP',
      title: 'Pemberitahuan Pembayaran Syahriyah',
      body: `Assalamu'alaikum Wr. Wb.
Yth. Bapak/Ibu {nama_wali} (Wali dari {nama_santri}, Kelas {kelas}).

Pemberitahuan tagihan syahriyah di ${school}:
• Total Tagihan: *{nominal_tagihan}*
• Jatuh Tempo: *{deadline}*
• Status: *{status_tagihan}*

Rincian:
{rincian_tagihan}

Rekening Pembayaran:
{info_rekening}

Konfirmasikan bukti transfer ke nomor ini atau via portal. Terima kasih.
Wassalamu'alaikum Wr. Wb.

-- Bendahara ${school} --`
    },
    {
      id: 'surat_undangan',
      label: '✉️ Undangan Pertemuan Wali Santri',
      title: 'Undangan Pertemuan Wali Santri',
      body: `Assalamu'alaikum Wr. Wb.
Yth. Bapak/Ibu {nama_wali} (Wali dari {nama_santri}).

Mengharap kehadiran Bapak/Ibu pada Pertemuan Wali Santri ${school}:
📅 Waktu: {hari_tanggal}, pukul {waktu_agenda} WIB
📍 Tempat: Aula Pertemuan Utama ${school}
📌 Agenda: Evaluasi Pendidikan & Silaturahmi

Kehadiran Bapak/Ibu sangat diharapkan. Terima kasih.
Wassalamu'alaikum Wr. Wb.

-- Pengasuh ${school} --`
    },
    {
      id: 'surat_ujian',
      label: '📝 Pemberitahuan Waktu & Jadwal Ujian Santri',
      title: 'Pemberitahuan Waktu & Jadwal Ujian Santri',
      body: `Assalamu'alaikum Wr. Wb.
Yth. Bapak/Ibu {nama_wali} (Wali dari {nama_santri}).

Pemberitahuan Ujian Semester di ${school}:
📅 Pelaksanaan: {jadwal_ujian}
📖 Materi: Kitab Kuning, Tahfidz & Formal

Mohon doa restu agar ananda diberikan kelancaran belajar. Terima kasih.
Wassalamu'alaikum Wr. Wb.

-- Bagian Akademik ${school} --`
    },
    {
      id: 'surat_libur',
      label: '🌙 Maklumat Libur & Penjemputan Santri',
      title: 'Maklumat Libur & Penjemputan Santri',
      body: `Assalamu'alaikum Wr. Wb.
Yth. Bapak/Ibu {nama_wali} (Wali dari {nama_santri}).

Jadwal Libur Semester Santri ${school}:
📅 Mulai Penjemputan: {tanggal_libur}
📅 Batas Kembali: {tanggal_kembali}

Catatan: Harap menyelesaikan perizinan di Keamanan dan administrasi sebelum kepulangan. Terima kasih.
Wassalamu'alaikum Wr. Wb.

-- Bagian Keamanan ${school} --`
    },
    {
      id: 'surat_tahfidz',
      label: '📖 Laporan Perkembangan Tahfidz Al-Qur\'an',
      title: 'Laporan Hafalan Al-Qur\'an Santri',
      body: `Assalamu'alaikum Wr. Wb.
Yth. Bapak/Ibu {nama_wali} (Wali dari {nama_santri}).

Laporan mutaba'ah tahfidz Al-Qur'an ananda di ${school}:
📖 Capaian: *{hafalan_santri}*
⭐ Predikat: *{predikat_hafalan}*
📅 Tanggal: {tanggal_setoran}

Semoga ananda istiqomah dan berkah bagi keluarga. Terima kasih.
Wassalamu'alaikum Wr. Wb.

-- Pembina Tahfidz ${school} --`
    }
  ];
};

export default function WhatsAppBroadcastPanel({
  students,
  bills,
  settings,
  saveWaLog,
  logAdminActivity,
  showAlert,
  availableFormalClasses = [],
  availableMadrasahClasses = [],
  rooms = [],
  currentAdminName = 'Admin Pesantren'
}: WhatsAppBroadcastPanelProps) {
  // Template list memoized with current settings
  const letterTemplates = useMemo(() => getLetterTemplates(settings), [settings]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('Semua');
  const [hasPhoneOnly, setHasPhoneOnly] = useState<boolean>(true);

  // Selection states
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  // Message compose states - Simple & tanpa penambahan kata-kata otomatis
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [messageTitle, setMessageTitle] = useState('Pemberitahuan Pesantren');
  const [messageBody, setMessageBody] = useState<string>('');

  // Sending progress states
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastProgress, setBroadcastProgress] = useState<{ current: number; total: number; success: number; failed: number }>({
    current: 0,
    total: 0,
    success: 0,
    failed: 0
  });
  const [sendStatuses, setSendStatuses] = useState<Record<string, 'pending' | 'sending' | 'sent' | 'failed'>>({});
  const [isDirectQueueOpen, setIsDirectQueueOpen] = useState(false);
  const [directQueueIndex, setDirectQueueIndex] = useState(0);

  // Prevent background scroll when queue modal is open
  React.useEffect(() => {
    if (isDirectQueueOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev || '';
      };
    }
  }, [isDirectQueueOpen]);

  // Helper format phone
  const cleanPhone = (phone: any): string => {
    let p = String(phone || '').replace(/[^0-9]/g, '');
    if (p.startsWith('0')) p = '62' + p.slice(1);
    else if (!p.startsWith('62') && p.length > 5) p = '62' + p;
    return p;
  };

  const isValidPhone = (phone?: any): boolean => {
    if (!phone) return false;
    const c = cleanPhone(phone);
    return c.length >= 10 && c.startsWith('62');
  };

  // Helper cek apakah sedang dalam mode broadcast penunggakan / tunggakan santri
  const isTunggakanBroadcast = useMemo(() => {
    const titleLower = (messageTitle || '').toLowerCase();
    const bodyLower = (messageBody || '').toLowerCase();
    return (
      selectedTemplateId === 'surat_tunggakan' ||
      titleLower.includes('tunggakan') ||
      titleLower.includes('belum lunas') ||
      titleLower.includes('menunggak') ||
      bodyLower.includes('{tunggakan}') ||
      bodyLower.includes('{rincian_tunggakan}') ||
      bodyLower.includes('{nominal_tunggakan}') ||
      bodyLower.includes('{total_tunggakan}')
    );
  }, [selectedTemplateId, messageTitle, messageBody]);

  // Helper kalkulasi tagihan & tunggakan per santri
  const getStudentUnpaidData = useCallback((std: Student) => {
    if (!std || !bills) return { unpaidBills: [], unpaidAmount: 0 };
    const studentBills = bills.filter(b => 
      b && (
        b.studentId === std.id ||
        (b.nis && std.nis && String(b.nis) === String(std.nis)) ||
        (b.studentName && std.fullName && String(b.studentName).trim().toLowerCase() === String(std.fullName).trim().toLowerCase())
      )
    );
    const unpaidBills = studentBills.filter(b => b.status === 'Belum Lunas');
    const unpaidAmount = unpaidBills.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
    return { unpaidBills, unpaidAmount };
  }, [bills]);

  // Filtered students list - Jika tentang penunggakan, HANYA TAMPILKAN SANTRI YANG MENUNGGAK
  const filteredStudents = useMemo(() => {
    if (!Array.isArray(students)) return [];
    return students.filter(s => {
      if (!s || !s.id) return false;
      if (s.status !== 'Aktif') return false;

      // Filter khusus tunggakan: hanya santri yang memiliki tunggakan/belum bayar (unpaidAmount > 0)
      if (isTunggakanBroadcast) {
        const { unpaidAmount } = getStudentUnpaidData(s);
        if (unpaidAmount <= 0) return false;
      }

      // Class filter
      if (selectedClass !== 'Semua') {
        const combinedClass = `${s.class || ''} ${s.classFormal || ''} ${s.classMadrasah || ''} ${s.classPagi || ''} ${s.classSore || ''}`.toLowerCase();
        if (!combinedClass.includes(selectedClass.toLowerCase())) return false;
      }

      // Has Phone filter
      if (hasPhoneOnly && !isValidPhone(s.parentPhone)) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = String(s.fullName || '').toLowerCase().includes(q);
        const matchNis = String(s.nis || '').toLowerCase().includes(q);
        const matchParent = String(s.parentName || s.fatherName || s.motherName || '').toLowerCase().includes(q);
        const matchPhone = String(s.parentPhone || '').includes(q);
        if (!matchName && !matchNis && !matchParent && !matchPhone) return false;
      }

      return true;
    });
  }, [students, selectedClass, hasPhoneOnly, searchQuery, isTunggakanBroadcast, getStudentUnpaidData]);

  // Auto-deselect santri yang tidak menunggak saat masuk mode penunggakan
  React.useEffect(() => {
    if (isTunggakanBroadcast) {
      setSelectedStudentIds(prev => {
        const next = new Set<string>();
        prev.forEach(id => {
          const s = students.find(x => x.id === id);
          if (s) {
            const { unpaidAmount } = getStudentUnpaidData(s);
            if (unpaidAmount > 0) next.add(id);
          }
        });
        return next;
      });
    }
  }, [isTunggakanBroadcast, students, getStudentUnpaidData]);

  // Selection handlers
  const handleToggleSelectAll = () => {
    const validFiltered = filteredStudents.filter(s => s && s.id && isValidPhone(s.parentPhone));
    if (selectedStudentIds.size >= validFiltered.length && validFiltered.length > 0) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(validFiltered.map(s => s.id)));
    }
  };

  const handleToggleStudent = (id: string) => {
    if (!id) return;
    const next = new Set(selectedStudentIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedStudentIds(next);
  };

  // Murni pesan admin dengan kalkulasi tunggakan, deadline, dan rincian resmi
  const buildMessage = (std: Student): string => {
    if (!std || !messageBody) return '';
    try {
      const waliName = std.parentName || std.fatherName || std.guardianName || 'Bapak/Ibu Wali Santri';
      
      // Resolve bills strictly belonging to this student safely
      const studentBills = (bills || []).filter(b => 
        b && (
          b.studentId === std.id ||
          (b.nis && std.nis && String(b.nis) === String(std.nis)) ||
          (b.studentName && std.fullName && String(b.studentName).trim().toLowerCase() === String(std.fullName).trim().toLowerCase())
        )
      );

      const totalAmount = studentBills.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
      const unpaidBills = studentBills.filter(b => b.status === 'Belum Lunas');
      const unpaidAmount = unpaidBills.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);

      // Format tunggakan
      const tunggakanText = unpaidAmount > 0 
        ? `Rp ${unpaidAmount.toLocaleString('id-ID')}` 
        : 'Rp 0 (Nihil / Bebas Tunggakan)';

      // Format deadline: ambil dari jatuh tempo tagihan tertunggak terdekat, atau default tanggal 10 bulan berjalan
      let deadlineText = '';
      if (unpaidBills.length > 0) {
        const dates = unpaidBills.map(b => b.dueDate).filter(Boolean);
        if (dates.length > 0) {
          try {
            deadlineText = formatIndonesianDate(dates[0]);
          } catch (e) {
            deadlineText = String(dates[0]);
          }
        }
      }
      if (!deadlineText && studentBills.length > 0) {
        const dates = studentBills.map(b => b.dueDate).filter(Boolean);
        if (dates.length > 0) {
          try {
            deadlineText = formatIndonesianDate(dates[0]);
          } catch (e) {
            deadlineText = String(dates[0]);
          }
        }
      }
      if (!deadlineText) {
        const now = new Date();
        deadlineText = `10 ${now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`;
      }

      // Format rincian tagihan tertunggak
      const rincianTunggakanText = unpaidBills.length > 0
        ? unpaidBills.map((b, i) => `${i + 1}. *${b.title || 'Tagihan'}* - Rp ${Number(b.amount || 0).toLocaleString('id-ID')} (Jatuh Tempo: ${b.dueDate ? formatIndonesianDate(b.dueDate) : '-'})`).join('\n')
        : '• Tidak ada tagihan tertunggak (Nihil / Lunas)';

      // Format rincian semua tagihan
      const rincianTagihanText = studentBills.length > 0
        ? studentBills.map((b, i) => `${i + 1}. *${b.title || 'Tagihan'}* - Rp ${Number(b.amount || 0).toLocaleString('id-ID')} [${b.status || 'Aktif'}]`).join('\n')
        : '• Tidak ada catatan tagihan terdaftar';

      // Status tagihan
      const statusTagihanText = studentBills.length === 0
        ? 'Bebas Tanggungan (Nihil Tagihan)'
        : unpaidAmount === 0
        ? 'LUNAS 100%'
        : `Belum Lunas (Sisa: Rp ${unpaidAmount.toLocaleString('id-ID')})`;

      // Bank accounts info
      const bankName = settings.pesantrenBankName || (settings.rekeningList?.[0]?.bankName) || 'Bank Syariah Indonesia (BSI)';
      const accNum = settings.pesantrenBankAccountNumber || (settings.rekeningList?.[0]?.accountNumber) || '7182930412';
      const accName = settings.pesantrenBankAccountName || (settings.rekeningList?.[0]?.accountName) || settings.schoolName || "PP. Al-Asy'ariyah";
      const infoRekeningText = `• Bank: *${bankName}*\n• No. Rekening: *${accNum}*\n• Atas Nama: *${accName}*`;

      // Capaian pembelajaran info
      const capaianText = std.classMadrasah || std.classFormal || 'Kurikulum Pembinaan Aktif';

      // Bendahara name based on gender
      const isPutra = std.gender === 'Laki-laki';
      const bendaharaName = isPutra
        ? (settings.namaBendaharaPutra || settings.namaBendahara || 'Ustadz Ahmad Fauzi, S.E.')
        : (settings.namaBendaharaPutri || settings.namaBendahara || 'Ustadzah Siti Aminah, S.E.');

      return messageBody
        .replace(/\{nama_santri\}/g, std.fullName || '')
        .replace(/\{nama_wali\}/g, waliName)
        .replace(/\{nis\}/g, std.nis || '-')
        .replace(/\{kelas\}/g, std.classFormal || std.classMadrasah || std.class || '-')
        .replace(/\{kamar\}/g, std.kamar ? `Kamar ${std.kamar}` : 'Non-Asrama')
        .replace(/\{pesantren\}/g, settings.schoolName || "Pondok Pesantren Al-Asy'ariyah")
        .replace(/\{pengasuh\}/g, settings.namaPengasuh || "KH. Asy'ari Al-Hafidz")
        .replace(/\{bendahara\}/g, bendaharaName)
        .replace(/\{akademik\}/g, settings.namaAkademik || "Bagian Pendidikan & Madrasah")
        .replace(/\{keamanan\}/g, settings.namaKeamanan || "Bagian Keamanan & Ketertiban")
        .replace(/\{tunggakan\}/g, tunggakanText)
        .replace(/\{nominal_tunggakan\}/g, tunggakanText)
        .replace(/\{total_tunggakan\}/g, tunggakanText)
        .replace(/\{deadline\}/g, deadlineText)
        .replace(/\{jatuh_tempo\}/g, deadlineText)
        .replace(/\{rincian_tunggakan\}/g, rincianTunggakanText)
        .replace(/\{nominal_tagihan\}/g, `Rp ${totalAmount.toLocaleString('id-ID')}`)
        .replace(/\{total_tagihan\}/g, `Rp ${totalAmount.toLocaleString('id-ID')}`)
        .replace(/\{rincian_tagihan\}/g, rincianTagihanText)
        .replace(/\{status_tagihan\}/g, statusTagihanText)
        .replace(/\{info_rekening\}/g, infoRekeningText)
        .replace(/\{hafalan_santri\}/g, capaianText)
        .replace(/\{capaian_santri\}/g, capaianText)
        .replace(/\{hari_tanggal\}/g, 'Ahad, 25 Oktober 2026')
        .replace(/\{waktu_agenda\}/g, '08.30 - 11.30')
        .replace(/\{jadwal_ujian\}/g, '15 s/d 22 November 2026')
        .replace(/\{tanggal_libur\}/g, '25 Desember 2026')
        .replace(/\{tanggal_kembali\}/g, '05 Januari 2027');
    } catch (err) {
      console.error('Error building message for student:', err);
      return messageBody.replace(/\{nama_santri\}/g, std?.fullName || '');
    }
  };

  const selectedStudentsList = useMemo(() => {
    return filteredStudents.filter(s => s && s.id && selectedStudentIds.has(s.id));
  }, [filteredStudents, selectedStudentIds]);

  // Gateway status check
  const isGatewayActive = Boolean(settings.waGatewayToken || localStorage.getItem('pesantren_wa_gateway_token'));

  // Kirim satu santri langsung via WhatsApp
  const handleSendSingleDirect = (std: Student) => {
    const textToSend = buildMessage(std).trim();
    if (!textToSend) {
      showAlert('danger', 'Tuliskan pesan WhatsApp terlebih dahulu sebelum mengirim.');
      return;
    }
    const phone = cleanPhone(std.parentPhone);
    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(textToSend)}`;
    window.open(waUrl, '_blank');
    saveWaLog(messageTitle || 'Pesan WhatsApp', phone, `${std.parentName || 'Wali'} (${std.fullName})`, textToSend);
    setSendStatuses(prev => ({ ...prev, [std.id]: 'sent' }));
  };

  // Salin seluruh nomor telepon wali terpilih (siap pakai untuk daftar siaran / broadcast group WA)
  const handleCopyAllSelectedPhones = () => {
    const validPhones = selectedStudentsList
      .map(s => cleanPhone(s.parentPhone))
      .filter(p => p && p.length >= 10);
    
    if (validPhones.length === 0) {
      showAlert('danger', 'Tidak ada nomor WhatsApp wali yang valid pada santri yang dipilih.');
      return;
    }

    const joined = validPhones.join(', ');
    navigator.clipboard.writeText(joined);
    showAlert('success', `Berhasil menyalin ${validPhones.length} nomor WhatsApp wali santri ke clipboard!`);
  };

  // Salin draf isi pesan WhatsApp
  const handleCopyMessageText = () => {
    const textToSend = messageBody.trim();
    if (!textToSend) {
      showAlert('danger', 'Isi pesan WhatsApp masih kosong!');
      return;
    }
    navigator.clipboard.writeText(textToSend);
    showAlert('success', 'Teks pesan berhasil disalin ke clipboard!');
  };

  // Eksekusi broadcast massal
  const handleBroadcast = async () => {
    const textToSend = messageBody.trim();
    if (!textToSend) {
      showAlert('danger', 'Isi pesan WhatsApp tidak boleh kosong!');
      return;
    }

    if (selectedStudentsList.length === 0) {
      showAlert('danger', 'Pilih minimal 1 wali santri untuk menerima pesan!');
      return;
    }

    const gwToken = settings.waGatewayToken || localStorage.getItem('pesantren_wa_gateway_token') || '';
    const gwUrl = settings.waGatewayUrl || localStorage.getItem('pesantren_wa_gateway_url') || 'https://api.fonnte.com/send';

    // Jika mode Gateway Otomatis
    if (isGatewayActive) {
      setIsBroadcasting(true);
      setBroadcastProgress({
        current: 0,
        total: selectedStudentsList.length,
        success: 0,
        failed: 0
      });

      const newStatuses: Record<string, 'pending' | 'sending' | 'sent' | 'failed'> = {};
      selectedStudentsList.forEach(s => { newStatuses[s.id] = 'pending'; });
      setSendStatuses(newStatuses);

      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < selectedStudentsList.length; i++) {
        const std = selectedStudentsList[i];
        const targetPhone = cleanPhone(std.parentPhone);

        if (!isValidPhone(std.parentPhone)) {
          newStatuses[std.id] = 'failed';
          setSendStatuses({ ...newStatuses });
          failCount++;
          setBroadcastProgress(prev => ({ ...prev, current: i + 1, failed: failCount }));
          continue;
        }

        newStatuses[std.id] = 'sending';
        setSendStatuses({ ...newStatuses });

        const msg = buildMessage(std);

        try {
          const res = await fetch('/api/send-wa', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              target: targetPhone,
              message: msg,
              token: gwToken,
              url: gwUrl
            })
          });

          const data = await res.json().catch(() => null);

          if (res.ok && data?.success) {
            newStatuses[std.id] = 'sent';
            successCount++;
            saveWaLog(messageTitle || 'Broadcast WhatsApp', targetPhone, `${std.parentName || 'Wali'} (${std.fullName})`, msg);
          } else {
            newStatuses[std.id] = 'failed';
            failCount++;
          }
        } catch (err) {
          newStatuses[std.id] = 'failed';
          failCount++;
        }

        setSendStatuses({ ...newStatuses });
        setBroadcastProgress({
          current: i + 1,
          total: selectedStudentsList.length,
          success: successCount,
          failed: failCount
        });

        if (i < selectedStudentsList.length - 1) {
          await new Promise(r => setTimeout(r, 600));
        }
      }

      setIsBroadcasting(false);
      logAdminActivity('BROADCAST_WHATSAPP', `Mengirim pesan WhatsApp ke ${successCount} wali santri`);
      showAlert('success', `Selesai! Pesan berhasil terkirim ke ${successCount} nomor wali.`);
    } else {
      // Mode Direct: Jika 1 santri langsung buka wa.me, jika lebih dari 1 buka antrean interaktif agar aman dari browser blocker
      if (selectedStudentsList.length === 1) {
        handleSendSingleDirect(selectedStudentsList[0]);
      } else {
        setDirectQueueIndex(0);
        setIsDirectQueueOpen(true);
      }
    }
  };

  return (
    <div className="space-y-4 text-left">
      {/* Header Sederhana */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
        <div>
          <h3 className="font-extrabold text-base sm:text-lg text-slate-900">
            Broadcast WhatsApp
          </h3>
          <p className="text-xs text-slate-500">
            Kirim pengumuman atau pesan langsung ke nomor WhatsApp wali santri.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className={`inline-block w-2 h-2 rounded-full ${isGatewayActive ? 'bg-emerald-500' : 'bg-blue-500'}`}></span>
          <span className="font-semibold text-slate-700">
            {isGatewayActive ? 'WhatsApp Gateway Aktif' : 'WhatsApp Direct (wa.me)'}
          </span>
        </div>
      </div>

      {/* Grid: 2 Kolom Bersih */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Kolom Kiri: Tulis Pesan (5 cols) */}
        <div className="lg:col-span-5 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4 text-emerald-700" /> Tulis Pesan
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {messageBody.length} karakter
            </span>
          </div>

          {/* Template Surat Pesantren */}
          <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-extrabold text-emerald-950 uppercase tracking-wide">
                Template Surat & Pemberitahuan
              </label>
              {messageBody && (
                <button
                  type="button"
                  onClick={() => {
                    setMessageBody('');
                    setMessageTitle('Pemberitahuan Pesantren');
                    setSelectedTemplateId('');
                  }}
                  className="text-[10px] text-rose-600 hover:underline font-bold cursor-pointer"
                >
                  Kosongkan Teks
                </button>
              )}
            </div>
            <select
              value={selectedTemplateId}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedTemplateId(val);
                if (!val) return;
                const tmpl = letterTemplates.find(t => t.id === val);
                if (tmpl) {
                  setMessageTitle(tmpl.title);
                  setMessageBody(tmpl.body);
                }
              }}
              className="w-full px-2.5 py-1.5 text-xs border border-emerald-300 rounded-lg bg-white text-slate-900 font-bold focus:outline-none focus:ring-1 focus:ring-emerald-700 cursor-pointer shadow-2xs"
            >
              <option value="">-- Pilih Template Surat Resmi Pesantren --</option>
              {letterTemplates.map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>

            {/* Quick Template Badge Pills */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {letterTemplates.map(tmpl => (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => {
                    setSelectedTemplateId(tmpl.id);
                    setMessageTitle(tmpl.title);
                    setMessageBody(tmpl.body);
                  }}
                  className={`text-[10.5px] px-2 py-0.5 rounded-lg border font-semibold transition cursor-pointer flex items-center gap-1 ${
                    selectedTemplateId === tmpl.id || messageTitle === tmpl.title
                      ? 'bg-emerald-800 text-white border-emerald-900 shadow-xs'
                      : 'bg-white hover:bg-emerald-100/70 text-emerald-950 border-emerald-200 shadow-2xs'
                  }`}
                  title={`Gunakan template: ${tmpl.title}`}
                >
                  <span>{tmpl.label}</span>
                </button>
              ))}
            </div>

            <p className="text-[10px] text-emerald-800 leading-tight">
              Klik salah satu tombol atau pilih di dropdown untuk mengisi template surat resmi pesantren secara instan.
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Judul Pesan (Catatan Log)
            </label>
            <input
              type="text"
              value={messageTitle}
              onChange={(e) => setMessageTitle(e.target.value)}
              placeholder="Contoh: Pengumuman Rapat Wali Santri"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-700 font-semibold text-slate-900"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-bold text-slate-700">
                Isi Pesan WhatsApp
              </label>
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-[9px] text-slate-400 font-medium mr-0.5">Tag:</span>
                <button
                  type="button"
                  onClick={() => setMessageBody(prev => prev + ' {nama_santri}')}
                  className="text-[10px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded cursor-pointer transition font-mono font-bold"
                  title="Sisipkan nama santri"
                >
                  +{'{nama_santri}'}
                </button>
                <button
                  type="button"
                  onClick={() => setMessageBody(prev => prev + ' {nama_wali}')}
                  className="text-[10px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded cursor-pointer transition font-mono font-bold"
                  title="Sisipkan nama wali"
                >
                  +{'{nama_wali}'}
                </button>
                <button
                  type="button"
                  onClick={() => setMessageBody(prev => prev + ' {nis}')}
                  className="text-[10px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded cursor-pointer transition font-mono font-bold"
                  title="Sisipkan NIS santri"
                >
                  +{'{nis}'}
                </button>
                <button
                  type="button"
                  onClick={() => setMessageBody(prev => prev + ' {kelas}')}
                  className="text-[10px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded cursor-pointer transition font-mono font-bold"
                  title="Sisipkan kelas santri"
                >
                  +{'{kelas}'}
                </button>
                <button
                  type="button"
                  onClick={() => setMessageBody(prev => prev + ' {kamar}')}
                  className="text-[10px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded cursor-pointer transition font-mono font-bold"
                  title="Sisipkan kamar asrama santri"
                >
                  +{'{kamar}'}
                </button>
                <button
                  type="button"
                  onClick={() => setMessageBody(prev => prev + ' {pesantren}')}
                  className="text-[10px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded cursor-pointer transition font-mono font-bold"
                  title="Sisipkan nama pesantren"
                >
                  +{'{pesantren}'}
                </button>
                <button
                  type="button"
                  onClick={() => setMessageBody(prev => prev + ' {tunggakan}')}
                  className="text-[10px] bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded cursor-pointer transition font-mono font-bold"
                  title="Sisipkan total nominal tunggakan"
                >
                  +{'{tunggakan}'}
                </button>
                <button
                  type="button"
                  onClick={() => setMessageBody(prev => prev + ' {deadline}')}
                  className="text-[10px] bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-300 px-1.5 py-0.5 rounded cursor-pointer transition font-mono font-bold"
                  title="Sisipkan tanggal deadline / batas bayar"
                >
                  +{'{deadline}'}
                </button>
                <button
                  type="button"
                  onClick={() => setMessageBody(prev => prev + ' {rincian_tunggakan}')}
                  className="text-[10px] bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded cursor-pointer transition font-mono font-bold"
                  title="Sisipkan daftar pos tagihan yang tertunggak"
                >
                  +{'{rincian_tunggakan}'}
                </button>
                <button
                  type="button"
                  onClick={() => setMessageBody(prev => prev + ' {nominal_tagihan}')}
                  className="text-[10px] bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 px-1.5 py-0.5 rounded cursor-pointer transition font-mono font-bold"
                  title="Sisipkan total nominal tagihan"
                >
                  +{'{nominal_tagihan}'}
                </button>
                <button
                  type="button"
                  onClick={() => setMessageBody(prev => prev + ' {info_rekening}')}
                  className="text-[10px] bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 px-1.5 py-0.5 rounded cursor-pointer transition font-mono font-bold"
                  title="Sisipkan data rekening resmi pesantren"
                >
                  +{'{info_rekening}'}
                </button>
              </div>
            </div>
            <textarea
              rows={9}
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              placeholder="Ketik pesan yang ingin dikirimkan ke wali santri di sini..."
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-700 font-normal text-slate-900 leading-relaxed resize-y"
            />
          </div>

          {/* Tombol Kirim Broadcast & Salin */}
          <div className="space-y-2">
            <button
              type="button"
              disabled={isBroadcasting || selectedStudentsList.length === 0 || !messageBody.trim()}
              onClick={handleBroadcast}
              className="w-full py-2.5 bg-emerald-800 hover:bg-emerald-900 active:scale-98 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition cursor-pointer disabled:opacity-50"
            >
              {isBroadcasting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin text-amber-300" />
                  <span>Mengirim ({broadcastProgress.current}/{broadcastProgress.total})...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Kirim ke {selectedStudentsList.length} Wali Santri Terpilih</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleCopyMessageText}
              disabled={!messageBody.trim()}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-40"
            >
              <Copy className="h-3.5 w-3.5" />
              <span>Salin Teks Pesan Ini</span>
            </button>
          </div>
        </div>

        {/* Kolom Kanan: Pilih Penerima Wali Santri (7 cols) */}
        <div className="lg:col-span-7 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3 flex flex-col justify-between">
          <div className="space-y-3">
            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row gap-2 items-center justify-between">
              <div className="relative w-full sm:flex-1">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama santri, wali, atau no WA..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-700 bg-slate-50/50"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-700 font-medium"
                >
                  <option value="Semua">Semua Kelas</option>
                  {availableFormalClasses.filter(c => c && c !== '-').map(cls => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shrink-0 transition cursor-pointer"
                >
                  {selectedStudentIds.size >= filteredStudents.filter(s => s && isValidPhone(s.parentPhone)).length && filteredStudents.length > 0 ? (
                    <>
                      <Square className="h-3 w-3" />
                      <span>Batal Pilih</span>
                    </>
                  ) : (
                    <>
                      <CheckSquare className="h-3 w-3" />
                      <span>Pilih Semua ({filteredStudents.filter(s => s && isValidPhone(s.parentPhone)).length})</span>
                    </>
                  )}
                </button>

                {selectedStudentsList.length > 0 && (
                  <button
                    type="button"
                    onClick={handleCopyAllSelectedPhones}
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shrink-0 transition cursor-pointer shadow-2xs"
                    title="Salin nomor WhatsApp seluruh santri terpilih untuk daftar siaran"
                  >
                    <Copy className="h-3 w-3" />
                    <span>Salin {selectedStudentsList.length} No. WA</span>
                  </button>
                )}
              </div>
            </div>

            {/* Banner Mode Khusus Tunggakan */}
            {isTunggakanBroadcast && (
              <div className="bg-amber-50 border border-amber-300 text-amber-900 px-3 py-2 rounded-lg text-xs flex items-center justify-between gap-2 shadow-2xs">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-amber-800">⚠️ Mode Penagihan Tunggakan:</span>
                  <span className="text-amber-900 font-medium">Hanya santri dengan tunggakan belum lunas yang ditampilkan ({filteredStudents.length} santri).</span>
                </div>
                <span className="text-[10px] font-bold bg-amber-200/90 text-amber-900 px-2 py-0.5 rounded shrink-0">
                  Terfilter Otomatis
                </span>
              </div>
            )}

            {/* List Penerima Ringkas */}
            <div className="border border-slate-200 rounded-lg overflow-hidden max-h-[360px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="p-2 w-8 text-center">Pilih</th>
                    <th className="p-2">Nama Santri</th>
                    <th className="p-2">Wali & WhatsApp</th>
                    <th className="p-2 text-center w-20">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-slate-400">
                        Tidak ada data santri yang cocok.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map(std => {
                      const hasPhone = isValidPhone(std.parentPhone);
                      const isSelected = selectedStudentIds.has(std.id);
                      const isSent = sendStatuses[std.id] === 'sent';
                      const unpaidData = isTunggakanBroadcast ? getStudentUnpaidData(std) : null;

                      return (
                        <tr 
                          key={std.id}
                          className={`hover:bg-slate-50 transition ${isSelected ? 'bg-emerald-50/40' : ''}`}
                        >
                          <td className="p-2 text-center">
                            <input
                              type="checkbox"
                              disabled={!hasPhone}
                              checked={isSelected}
                              onChange={() => handleToggleStudent(std.id)}
                              className="rounded border-slate-300 text-emerald-700 focus:ring-emerald-700 cursor-pointer disabled:opacity-30"
                            />
                          </td>
                          <td className="p-2">
                            <div className="font-bold text-slate-900 leading-tight">
                              {std.fullName}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              NIS: {std.nis || '-'} • {std.class || std.classFormal || '-'}
                            </div>
                            {unpaidData && unpaidData.unpaidAmount > 0 && (
                              <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                                <span>Tunggakan: Rp {unpaidData.unpaidAmount.toLocaleString('id-ID')}</span>
                              </div>
                            )}
                          </td>
                          <td className="p-2">
                            <div className="font-semibold text-slate-800 leading-tight">
                              {std.parentName || std.fatherName || 'Wali Santri'}
                            </div>
                            <div className="text-[10px] font-mono flex items-center gap-1 mt-0.5">
                              {hasPhone ? (
                                <span className="text-emerald-700 font-bold">
                                  {cleanPhone(std.parentPhone)}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">Tanpa No WA</span>
                              )}
                              {isSent && (
                                <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 rounded">
                                  Terkirim
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-2 text-center">
                            {hasPhone ? (
                              <button
                                type="button"
                                onClick={() => handleSendSingleDirect(std)}
                                className="px-2 py-1 bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-800 rounded font-semibold text-[10px] flex items-center justify-center gap-1 transition cursor-pointer mx-auto"
                                title="Kirim WA ke nomor ini"
                              >
                                <Send className="h-2.5 w-2.5" /> Kirim
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-300">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer Info Ringkas */}
          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 mt-2">
            <span>
              Terpilih: <strong className="text-slate-900 font-bold">{selectedStudentsList.length}</strong> dari {filteredStudents.length} santri
            </span>
            <span className="text-[11px] text-slate-400">
              Pesan dikirim langsung sesuai teks yang Anda ketik.
            </span>
          </div>
        </div>

      </div>

      {/* MODAL ANTREAN WHATSAPP DIRECT (Mencegah browser popup error & crash saat banyak santri dipilih) */}
      {isDirectQueueOpen && selectedStudentsList.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-lg w-full p-5 sm:p-6 border border-emerald-100 space-y-4 my-auto mx-auto max-h-[90vh] overflow-y-auto text-left">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
                <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                  Antrean Pengiriman WhatsApp Direct
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDirectQueueOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Stepper progress */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-emerald-900">
                  Antrean {directQueueIndex + 1} dari {selectedStudentsList.length} Santri Terpilih
                </span>
                <span className="text-slate-500 font-mono text-[11px]">
                  {Math.round(((directQueueIndex + 1) / selectedStudentsList.length) * 100)}%
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((directQueueIndex + 1) / selectedStudentsList.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Current Student Card */}
            {selectedStudentsList[directQueueIndex] && (() => {
              const currentStd = selectedStudentsList[directQueueIndex];
              const phone = cleanPhone(currentStd.parentPhone);
              const personalizedMsg = buildMessage(currentStd);
              const isSent = sendStatuses[currentStd.id] === 'sent';

              return (
                <div className="space-y-3">
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm">{currentStd.fullName}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isSent ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {isSent ? '✓ Sudah Dibuka' : 'Menunggu Kirim'}
                      </span>
                    </div>
                    <div className="text-slate-600 flex items-center justify-between text-[11px]">
                      <span>Wali: <strong>{currentStd.parentName || currentStd.fatherName || 'Wali'}</strong></span>
                      <span className="font-mono font-bold text-emerald-900">WA: {currentStd.parentPhone || '-'}</span>
                    </div>
                  </div>

                  {/* Message preview box */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Preview Pesan Terpersonalisasi:</label>
                    <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200/70 text-[11px] text-slate-800 font-mono whitespace-pre-wrap max-h-36 overflow-y-auto leading-relaxed">
                      {personalizedMsg}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(personalizedMsg)}`, '_blank');
                        saveWaLog(messageTitle || 'WhatsApp Direct', phone, `${currentStd.parentName || 'Wali'} (${currentStd.fullName})`, personalizedMsg);
                        setSendStatuses(prev => ({ ...prev, [currentStd.id]: 'sent' }));
                        
                        if (directQueueIndex < selectedStudentsList.length - 1) {
                          setDirectQueueIndex(prev => prev + 1);
                        } else {
                          showAlert('success', 'Seluruh antrean pesan WhatsApp telah selesai dikirim!');
                        }
                      }}
                      className="w-full py-3 bg-emerald-800 hover:bg-emerald-900 active:scale-98 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span>Buka Chat WhatsApp & Lanjut ({directQueueIndex + 1}/{selectedStudentsList.length})</span>
                    </button>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(personalizedMsg);
                          showAlert('success', `Teks pesan untuk ${currentStd.fullName} berhasil disalin!`);
                        }}
                        className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1"
                      >
                        <Copy className="h-3 w-3" />
                        <span>Salin Teks</span>
                      </button>

                      {directQueueIndex < selectedStudentsList.length - 1 ? (
                        <button
                          type="button"
                          onClick={() => setDirectQueueIndex(prev => prev + 1)}
                          className="flex-1 py-2 border border-slate-250 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
                        >
                          Lewati Santri Ini ➔
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsDirectQueueOpen(false)}
                          className="flex-1 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-xl text-xs font-bold transition cursor-pointer"
                        >
                          Selesai & Tutup
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyAllSelectedPhones}
                      className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200/80 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Copy className="h-3.5 w-3.5 text-emerald-700" />
                      <span>Salin Semua Nomor WA ({selectedStudentsList.length} Santri)</span>
                    </button>
                  </div>
                </div>
              );
            })()}

            <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-[10.5px] text-amber-900 leading-tight">
              💡 <strong>Ingin kirim otomatis ke semua santri sekaligus tanpa membuka tab?</strong> Hubungkan WhatsApp Gateway (Fonnte API Token) di menu Pengaturan Portal agar sistem dapat mengirim otomatis di latar belakang.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
