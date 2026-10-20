import React, { useState, useMemo } from 'react';
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
  AlertCircle
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
Yth. Bapak/Ibu {nama_wali},
Wali dari ananda: *{nama_santri}* (NIS: {nis}, Kelas: {kelas}, Kamar: {kamar})

Semoga Bapak/Ibu sekeluarga senantiasa berada dalam lindungan dan limpahan rahmat Allah SWT.

Melalui pesan ini, kami dari bagian Keuangan / Bendahara ${school} menginformasikan catatan administrasi ananda yang saat ini masih *melewati batas jatuh tempo (menunggak)* dengan rincian sebagai berikut:

⚠️ *RINCIAN TUNGGAKAN PEMBAYARAN:*
• Total Kewajiban Menunggak: *{tunggakan}*
• Batas Akhir Pelunasan (Deadline): *{deadline}*

📋 *Pos Tagihan Tertunggak:*
{rincian_tunggakan}

Mohon bantuan Bapak/Ibu wali santri untuk dapat segera melunasi kewajiban tersebut sebelum batas deadline: *{deadline}* demi kelancaran kegiatan belajar, pembinaan ibadah, dan operasional santri di pesantren.

Pembayaran dapat ditunaikan secara tunai di kantor bendahara atau melalui transfer rekening resmi:
{info_rekening}

*Catatan:* Apabila Bapak/Ibu telah melakukan pembayaran sebelumnya, mohon kirimkan foto resi/bukti transfer melalui nomor ini agar kami sinkronkan pembukuannya.

Jazakumullah khairan katsiran atas perhatian, kerja sama, dan pengertian Bapak/Ibu.
Wassalamu'alaikum Wr. Wb.

-- ${bendahara} (Bendahara ${school}) --`
    },
    {
      id: 'surat_tagihan',
      label: '💰 Pemberitahuan Pembayaran Syahriyah / SPP',
      title: 'Pemberitahuan Pembayaran Syahriyah',
      body: `Assalamu'alaikum Wr. Wb.
Yth. Bapak/Ibu {nama_wali},
Wali dari ananda: *{nama_santri}* (NIS: {nis}, Kelas: {kelas}, Kamar: {kamar})

Diberitahukan perihal administrasi pembayaran syahriyah (SPP) dan kegiatan santri di ${school}:

📋 *RINCIAN TAGIHAN:*
• Total Tagihan: *{nominal_tagihan}*
• Batas Pembayaran (Jatuh Tempo): *{deadline}*
• Status Pembayaran: *{status_tagihan}*

Rincian pos biaya:
{rincian_tagihan}

Pembayaran dapat ditunaikan secara tunai di kantor bendahara atau ditransfer melalui rekening resmi pesantren:
{info_rekening}

Setelah melakukan transfer, bukti pembayaran dapat diunggah melalui Portal Santri resmi atau konfirmasikan ke nomor bendahara.

Jazakumullah khairan katsiran atas perhatian, kerja sama, dan dukungannya.
Wassalamu'alaikum Wr. Wb.

-- ${bendahara} (Bendahara ${school}) --`
    },
    {
      id: 'surat_undangan',
      label: '✉️ Undangan Pertemuan Wali Santri',
      title: 'Undangan Pertemuan Wali Santri',
      body: `Assalamu'alaikum Wr. Wb.
Yth. Bapak/Ibu {nama_wali},
Wali dari ananda: *{nama_santri}* (NIS: {nis}, Kelas: {kelas}, Kamar: {kamar})

Mengharap kehadiran Bapak/Ibu Wali Santri dalam agenda *Pertemuan & Silaturahmi Akbar Wali Santri* ${school} yang insya Allah akan diselenggarakan pada:

📅 Hari / Tanggal: {hari_tanggal}
⏰ Waktu: {waktu_agenda} WIB
📍 Tempat: Aula Pertemuan Utama ${school}
📌 Agenda: Evaluasi Perkembangan Santri, Laporan Pendidikan, & Musyawarah Wali

Kehadiran serta masukan dari Bapak/Ibu sekalian sangat berharga demi kemajuan pendidikan, akhlakul karimah, dan pembinaan ananda di pondok pesantren.

Atas perhatian dan kehadirannya, kami haturkan terima kasih.
Wassalamu'alaikum Wr. Wb.

-- ${pengasuh} (Pengasuh ${school}) --`
    },
    {
      id: 'surat_ujian',
      label: '📝 Pemberitahuan Waktu & Jadwal Ujian Santri',
      title: 'Pemberitahuan Waktu & Jadwal Ujian Santri',
      body: `Assalamu'alaikum Wr. Wb.
Yth. Bapak/Ibu {nama_wali},
Wali dari ananda: *{nama_santri}* (NIS: {nis}, Kelas: {kelas})

Diberitahukan kepada seluruh wali santri, khususnya wali dari ananda *{nama_santri}*, bahwa agenda *Ujian Semester (Imtihan Diniyah & Ujian Formal)* di ${school} akan segera dilaksanakan:

📅 Periode Pelaksanaan: {jadwal_ujian}
📖 Cakupan Materi: Kitab Kuning, Tahfidz Al-Qur'an, dan Akademik Sekolah

Mohon doa restu dan motivasi dari Bapak/Ibu agar ananda senantiasa diberikan kesehatan, ketenangan, kemudahan dalam belajar, serta memperoleh hasil ujian yang berkah dan memuaskan.

Wassalamu'alaikum Wr. Wb.

-- ${akademik} (${school}) --`
    },
    {
      id: 'surat_libur',
      label: '🌙 Maklumat Libur & Penjemputan Santri',
      title: 'Maklumat Libur & Penjemputan Santri',
      body: `Assalamu'alaikum Wr. Wb.
Yth. Bapak/Ibu {nama_wali},
Wali dari ananda: *{nama_santri}* (NIS: {nis}, Kelas: {kelas}, Kamar: {kamar})

Sehubungan dengan selesainya agenda pendidikan dan ujian di ${school}, kami menginformasikan jadwal perpulangan/libur semester santri:

📅 Mulai Penjemputan: {tanggal_libur}
📅 Batas Kembali ke Pesantren: {tanggal_kembali}

Ketentuan Perpulangan:
1. Menyelesaikan proses perizinan resmi di bagian Keamanan.
2. Menyelesaikan kewajiban administrasi syahriyah bagi yang masih memiliki tunggakan.
3. Menjaga sholat 5 waktu, adab, dan nama baik pesantren selama di lingkungan keluarga.

Demikian maklumat ini disampaikan. Terima kasih atas kerja samanya.
Wassalamu'alaikum Wr. Wb.

-- ${keamanan} (${school}) --`
    },
    {
      id: 'surat_tahfidz',
      label: '📖 Laporan Perkembangan Tahfidz Al-Qur\'an',
      title: 'Laporan Hafalan Al-Qur\'an Santri',
      body: `Assalamu'alaikum Wr. Wb.
Yth. Bapak/Ibu {nama_wali},
Wali dari ananda: *{nama_santri}* (NIS: {nis}, Kelas: {kelas})

Alhamdulillah, berikut kami sampaikan laporan mutaba'ah tahfidz Al-Qur'an ananda di ${school}:

📖 Capaian Hafalan: *{hafalan_santri}*
⭐ Predikat Setoran Terakhir: *{predikat_hafalan}*
📅 Tanggal Pembaruan: {tanggal_setoran}

Semoga ananda senantiasa istiqomah dalam murojaah, mengamalkan akhlak Qur'ani, dan membawa keberkahan bagi keluarga tercinta.

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

  // Filtered students list
  const filteredStudents = useMemo(() => {
    if (!Array.isArray(students)) return [];
    return students.filter(s => {
      if (!s || !s.id) return false;
      if (s.status !== 'Aktif') return false;

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
  }, [students, selectedClass, hasPhoneOnly, searchQuery]);

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
    if (!messageBody) return '';
    const waliName = std.parentName || std.fatherName || std.guardianName || 'Bapak/Ibu Wali Santri';
    
    // Resolve bills strictly belonging to this student
    const studentBills = (bills || []).filter(b => 
      b && (
        b.studentId === std.id ||
        (b.nis && std.nis && b.nis === std.nis) ||
        (b.studentName && std.fullName && b.studentName.trim().toLowerCase() === std.fullName.trim().toLowerCase())
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
        deadlineText = formatIndonesianDate(dates[0]);
      }
    }
    if (!deadlineText && studentBills.length > 0) {
      const dates = studentBills.map(b => b.dueDate).filter(Boolean);
      if (dates.length > 0) deadlineText = formatIndonesianDate(dates[0]);
    }
    if (!deadlineText) {
      const now = new Date();
      deadlineText = `10 ${now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`;
    }

    // Format rincian tagihan tertunggak
    const rincianTunggakanText = unpaidBills.length > 0
      ? unpaidBills.map((b, i) => `${i + 1}. *${b.title}* - Rp ${Number(b.amount || 0).toLocaleString('id-ID')} (Jatuh Tempo: ${formatIndonesianDate(b.dueDate) || b.dueDate || '-'})`).join('\n')
      : '• Tidak ada tagihan tertunggak (Nihil / Lunas)';

    // Format rincian semua tagihan
    const rincianTagihanText = studentBills.length > 0
      ? studentBills.map((b, i) => `${i + 1}. *${b.title}* - Rp ${Number(b.amount || 0).toLocaleString('id-ID')} [${b.status}]`).join('\n')
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

    // Tahfidz & Akademik info
    const hafalanText = std.currentHafalan || (std.tahfidzLogs && std.tahfidzLogs.length > 0 ? `${std.tahfidzLogs[0].juz} Juz (${std.tahfidzLogs[0].surah || ''})` : 'Target Kurikulum Tahfidz Aktif');
    const predikatHafalan = std.tahfidzLogs?.[0]?.grade || 'A (Istimewa)';
    const tglSetoran = std.tahfidzLogs?.[0]?.date 
      ? formatIndonesianDate(std.tahfidzLogs[0].date) 
      : new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

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
      .replace(/\{hafalan_santri\}/g, hafalanText)
      .replace(/\{predikat_hafalan\}/g, predikatHafalan)
      .replace(/\{tanggal_setoran\}/g, tglSetoran)
      .replace(/\{hari_tanggal\}/g, 'Ahad, 25 Oktober 2026')
      .replace(/\{waktu_agenda\}/g, '08.30 - 11.30')
      .replace(/\{jadwal_ujian\}/g, '15 s/d 22 November 2026')
      .replace(/\{tanggal_libur\}/g, '25 Desember 2026')
      .replace(/\{tanggal_kembali\}/g, '05 Januari 2027');
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
      // Mode Direct: Buka tab WhatsApp untuk santri terpilih
      selectedStudentsList.forEach((std, idx) => {
        setTimeout(() => {
          const msg = buildMessage(std);
          const phone = cleanPhone(std.parentPhone);
          window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
          saveWaLog(messageTitle || 'WhatsApp Direct', phone, `${std.parentName || 'Wali'} (${std.fullName})`, msg);
          setSendStatuses(prev => ({ ...prev, [std.id]: 'sent' }));
        }, idx * 400);
      });

      showAlert('success', `Membuka WhatsApp untuk ${selectedStudentsList.length} wali santri terpilih.`);
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
                  }}
                  className="text-[10px] text-rose-600 hover:underline font-bold cursor-pointer"
                >
                  Kosongkan Teks
                </button>
              )}
            </div>
            <select
              value=""
              onChange={(e) => {
                const val = e.target.value;
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
                    setMessageTitle(tmpl.title);
                    setMessageBody(tmpl.body);
                  }}
                  className={`text-[10.5px] px-2 py-0.5 rounded-lg border font-semibold transition cursor-pointer flex items-center gap-1 ${
                    messageTitle === tmpl.title
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

          {/* Tombol Kirim Broadcast */}
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

              <div className="flex items-center gap-2 w-full sm:w-auto">
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
              </div>
            </div>

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
    </div>
  );
}
