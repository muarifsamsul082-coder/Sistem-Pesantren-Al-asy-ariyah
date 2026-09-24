import React, { useState, useMemo } from 'react';
import { 
  Send, 
  CheckSquare, 
  Square, 
  Users, 
  Search, 
  Filter, 
  Sparkles, 
  AlertCircle, 
  Calendar, 
  DollarSign, 
  CheckCircle2, 
  XCircle, 
  MessageSquare, 
  Phone, 
  ArrowRight, 
  ExternalLink, 
  FileText, 
  RefreshCw, 
  Play, 
  Pause, 
  X,
  CreditCard,
  Copy,
  Info
} from 'lucide-react';
import { Student, Bill, PortalSettings, Room } from '../types';

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
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'Aktif' | 'Semua'>('Aktif');
  const [selectedFormalClass, setSelectedFormalClass] = useState<string>('Semua');
  const [selectedMadrasahClass, setSelectedMadrasahClass] = useState<string>('Semua');
  const [selectedRoom, setSelectedRoom] = useState<string>('Semua');
  const [selectedBillFilter, setSelectedBillFilter] = useState<'all' | 'with_unpaid' | 'paid_only'>('all');
  const [hasPhoneOnly, setHasPhoneOnly] = useState<boolean>(true);

  // Selection states
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  // Message compose states
  const [messageTitle, setMessageTitle] = useState('Pengumuman Pesantren');
  const [messageBody, setMessageBody] = useState<string>(
    `Assalamu'alaikum Wr. Wb.\n\n` +
    `Yth. Bapak/Ibu *{nama_wali}*\n` +
    `Wali dari Ananda: *{nama_santri}* (NIS: {nis})\n` +
    `Kelas: {kelas} | Kamar: {kamar}\n\n` +
    `Kami sampaikan pemberitahuan resmi dari *{nama_pesantren}*:\n\n` +
    `[Tuliskan pengumuman atau informasi Anda di sini...]\n\n` +
    `Demikian informasi ini kami sampaikan. Atas perhatian dan kerja samanya kami ucapkan terima kasih.\n\n` +
    `Jazakumullah Khairan Katsiran.\n` +
    `Wassalamu'alaikum Wr. Wb.\n` +
    `-- *Pengurus Pesantren* --`
  );

  // Preview sample student
  const [previewStudentId, setPreviewStudentId] = useState<string>('');

  // Sending progress & modal states
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastProgress, setBroadcastProgress] = useState<{ current: number; total: number; success: number; failed: number }>({
    current: 0,
    total: 0,
    success: 0,
    failed: 0
  });
  const [sendStatuses, setSendStatuses] = useState<Record<string, 'pending' | 'sending' | 'sent' | 'failed' | 'skipped'>>({});
  const [isPaused, setIsPaused] = useState(false);

  // Interactive direct sender modal (when no gateway is active or direct mode requested)
  const [directQueueModalOpen, setDirectQueueModalOpen] = useState(false);
  const [directQueueIndex, setDirectQueueIndex] = useState(0);

  // Helper format phone
  const cleanPhone = (phone: string): string => {
    let p = (phone || '').replace(/[^0-9]/g, '');
    if (p.startsWith('0')) p = '62' + p.slice(1);
    else if (!p.startsWith('62') && p.length > 5) p = '62' + p;
    return p;
  };

  const isValidPhone = (phone?: string): boolean => {
    if (!phone) return false;
    const c = cleanPhone(phone);
    return c.length >= 10 && c.startsWith('62');
  };

  // Calculate unpaid bills mapping for each student
  const studentUnpaidBillsMap = useMemo(() => {
    const map: Record<string, { count: number; total: number; items: Bill[] }> = {};
    bills.forEach(b => {
      if (b.status === 'Belum Lunas' || b.status === 'Konfirmasi Pembayaran') {
        const key = b.studentId || b.nis || b.studentName;
        if (!map[key]) {
          map[key] = { count: 0, total: 0, items: [] };
        }
        map[key].count += 1;
        map[key].total += Number(b.amount || 0);
        map[key].items.push(b);
      }
    });
    return map;
  }, [bills]);

  const getStudentUnpaidData = (std: Student) => {
    return studentUnpaidBillsMap[std.id] || studentUnpaidBillsMap[std.nis] || studentUnpaidBillsMap[std.fullName] || { count: 0, total: 0, items: [] };
  };

  // Filtered students list
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      // Status filter
      if (selectedStatus === 'Aktif' && s.status !== 'Aktif') return false;

      // Class Formal filter
      if (selectedFormalClass !== 'Semua') {
        const formalMatch = (s.classFormal || s.classSore || s.class || '').toLowerCase().includes(selectedFormalClass.toLowerCase());
        if (!formalMatch) return false;
      }

      // Class Madrasah filter
      if (selectedMadrasahClass !== 'Semua') {
        const madrasahMatch = (s.classMadrasah || s.classPagi || s.class || '').toLowerCase().includes(selectedMadrasahClass.toLowerCase());
        if (!madrasahMatch) return false;
      }

      // Room filter
      if (selectedRoom !== 'Semua') {
        if ((s.kamar || '').trim() !== selectedRoom.trim()) return false;
      }

      // Bill status filter
      const unpaid = getStudentUnpaidData(s);
      if (selectedBillFilter === 'with_unpaid' && unpaid.count === 0) return false;
      if (selectedBillFilter === 'paid_only' && unpaid.count > 0) return false;

      // Has Phone filter
      if (hasPhoneOnly && !isValidPhone(s.parentPhone)) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (s.fullName || '').toLowerCase().includes(q);
        const matchNis = (s.nis || '').toLowerCase().includes(q);
        const matchParent = (s.parentName || s.fatherName || s.motherName || '').toLowerCase().includes(q);
        const matchPhone = (s.parentPhone || '').includes(q);
        if (!matchName && !matchNis && !matchParent && !matchPhone) return false;
      }

      return true;
    });
  }, [students, selectedStatus, selectedFormalClass, selectedMadrasahClass, selectedRoom, selectedBillFilter, hasPhoneOnly, searchQuery, studentUnpaidBillsMap]);

  // Set default preview student
  React.useEffect(() => {
    if (filteredStudents.length > 0 && (!previewStudentId || !filteredStudents.some(s => s.id === previewStudentId))) {
      setPreviewStudentId(filteredStudents[0].id);
    }
  }, [filteredStudents, previewStudentId]);

  // Selection handlers
  const handleToggleSelectAll = () => {
    const validFiltered = filteredStudents.filter(s => isValidPhone(s.parentPhone));
    if (selectedStudentIds.size >= validFiltered.length && validFiltered.length > 0) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(validFiltered.map(s => s.id)));
    }
  };

  const handleToggleStudent = (id: string) => {
    const next = new Set(selectedStudentIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedStudentIds(next);
  };

  // Dynamic message template generator for a specific student
  const generatePersonalizedMessage = (template: string, std: Student): string => {
    const schoolName = settings.schoolName || "Pondok Pesantren Al-Asy'ariyah";
    const waliName = std.parentName || std.fatherName || std.guardianName || 'Bapak/Ibu Wali Santri';
    const unpaid = getStudentUnpaidData(std);
    
    // Bank accounts info
    const accounts = settings.rekeningList || [];
    const rekeningInfo = accounts.length > 0
      ? `💳 *Rekening Resmi Pesantren:*\n` + accounts.map(b => `• ${b.bankName}: *${b.accountNumber}* (a.n ${b.accountName})`).join('\n')
      : `💳 *Rekening Pembayaran:* Silakan konfirmasi ke Bendahara Pesantren.`;

    const rincianTagihanText = unpaid.items.length > 0
      ? unpaid.items.map((b, idx) => `  ${idx + 1}. ${b.title}: Rp ${Number(b.amount).toLocaleString('id-ID')} (Jatuh tempo: ${b.dueDate || '-'})`).join('\n')
      : '  (Tidak ada tunggakan tagihan / Sudah Lunas)';

    const totalTagihanText = `Rp ${Number(unpaid.total).toLocaleString('id-ID')}`;

    return template
      .replace(/\{nama_wali\}/g, waliName)
      .replace(/\{nama_santri\}/g, std.fullName)
      .replace(/\{nis\}/g, std.nis || '-')
      .replace(/\{kelas\}/g, std.classFormal || std.classMadrasah || std.class || '-')
      .replace(/\{kamar\}/g, std.kamar || '-')
      .replace(/\{total_tagihan\}/g, totalTagihanText)
      .replace(/\{rincian_tagihan\}/g, rincianTagihanText)
      .replace(/\{rekening_pesantren\}/g, rekeningInfo)
      .replace(/\{nama_pesantren\}/g, schoolName);
  };

  // Preset templates
  const applyPresetTemplate = (presetType: 'libur' | 'tagihan' | 'rapat' | 'semester_baru' | 'kesehatan' | 'kosong') => {
    const schoolName = settings.schoolName || "Pondok Pesantren Al-Asy'ariyah";
    
    if (presetType === 'libur') {
      setMessageTitle('Pengumuman Libur Pesantren & Kepulangan Santri');
      setMessageBody(
        `Assalamu'alaikum Wr. Wb.\n\n` +
        `Yth. Bapak/Ibu *{nama_wali}*\n` +
        `Wali dari Ananda *{nama_santri}* (Kelas: {kelas} | Kamar: {kamar})\n\n` +
        `Pemberitahuan Resmi dari *${schoolName}*:\n\n` +
        `Diberitahukan kepada seluruh bapak/ibu wali santri bahwa agenda kegiatan belajar mengajar semester ini telah selesai dan libur kepulangan santri akan dilaksanakan pada:\n\n` +
        `🌴 *Mulai Libur / Kepulangan:* [Tuliskan Tanggal, misal: Ahad, 28 Juni 2026]\n` +
        `⏰ *Waktu Penjemputan:* Pukul 08.00 - 16.00 WIB\n` +
        `📅 *Batas Waktu Kembali ke Pondok:* [Tuliskan Tanggal & Jam, misal: Ahad, 12 Juli 2026 maks pkl 17.00 WIB]\n\n` +
        `📌 *Catatan Penting:*\n` +
        `1. Santri wajib menyelesaikan seluruh tanggungan hafalan dan administrasi sebelum kepulangan.\n` +
        `2. Penjemputan wajib lapor ke Pos Keamanan Pesantren.\n` +
        `3. Mohon senantiasa membimbing ananda menjaga shalat berjamaah dan akhlakul karimah selama di rumah.\n\n` +
        `Jazakumullah Khairan Katsiran atas kerja sama dan kepercayaannya.\n\n` +
        `Wassalamu'alaikum Wr. Wb.\n` +
        `-- *Pengasuh & Pengurus Pesantren* --`
      );
    } else if (presetType === 'tagihan') {
      setMessageTitle('Pengingat Pembayaran Bulanan & Syahriyah Santri');
      setSelectedBillFilter('with_unpaid'); // auto filter to unpaid
      setMessageBody(
        `Assalamu'alaikum Wr. Wb.\n\n` +
        `Yth. Bapak/Ibu *{nama_wali}*\n` +
        `Wali dari Ananda: *{nama_santri}* (NIS: {nis})\n` +
        `Kamar/Asrama: {kamar}\n\n` +
        `Kami sampaikan pemberitahuan administrasi dan pengingat pembayaran iuran syahriyah / tagihan pesantren dari *${schoolName}*:\n\n` +
        `📋 *Rincian Tagihan Belum Selesai:*\n` +
        `{rincian_tagihan}\n\n` +
        `💰 *Total Nominal Tunggakan:* *{total_tagihan}*\n\n` +
        `{rekening_pesantren}\n\n` +
        `Bukti setoran atau transfer dapat diunggah melalui Portal Santri atau dikonfirmasikan langsung ke nomor Bendahara Pesantren.\n\n` +
        `Bagi yang telah melakukan pembayaran, mohon abaikan pesan pengingat ini. Terima kasih atas dukungan Bapak/Ibu demi kelancaran kegiatan santri.\n\n` +
        `Jazakumullah Khairan Katsiran.\n` +
        `Wassalamu'alaikum Wr. Wb.\n` +
        `-- *Bendahara Administrasi Pesantren* --`
      );
    } else if (presetType === 'rapat') {
      setMessageTitle('Undangan Pertemuan Wali Santri');
      setMessageBody(
        `Assalamu'alaikum Wr. Wb.\n\n` +
        `Yth. Bapak/Ibu *{nama_wali}*\n` +
        `Wali dari Ananda *{nama_santri}* (Kelas: {kelas})\n\n` +
        `Dengan memohon rahmat dan ridho Allah SWT, kami mengundang Bapak/Ibu sekeluarga untuk menghadiri agenda:\n\n` +
        `📢 *Agenda:* Pertemuan Rutin Wali Santri & Sosialisasi Program Pendidikan\n` +
        `📅 *Hari/Tanggal:* [Tuliskan Hari & Tanggal]\n` +
        `⏰ *Waktu:* Pukul 08.30 WIB - Selesai\n` +
        `📍 *Tempat:* Aula Utama ${schoolName}\n\n` +
        `Mengingat pentingnya agenda ini untuk perkembangan pendidikan putra-putri kita, kehadiran Bapak/Ibu sangat kami harapkan.\n\n` +
        `Wassalamu'alaikum Wr. Wb.\n` +
        `-- *Sekretariat Pesantren* --`
      );
    } else if (presetType === 'semester_baru') {
      setMessageTitle('Informasi Awal Masuk Semester Baru');
      setMessageBody(
        `Assalamu'alaikum Wr. Wb.\n\n` +
        `Yth. Bapak/Ibu *{nama_wali}*\n` +
        `Wali dari Ananda *{nama_santri}* (Kelas: {kelas})\n\n` +
        `Mengingatkan kembali bahwa kegiatan belajar mengajar semester baru di *${schoolName}* akan segera dimulai:\n\n` +
        `📅 *Waktu Kedatangan Santri:* [Hari, Tanggal]\n` +
        `🎒 *Perlengkapan:* Seragam lengkap, kitab kajian semester baru, serta perlengkapan pribadi.\n\n` +
        `Keterlambatan kembali tanpa izin pengurus akan dikenakan sanksi tata tertib ketertiban pesantren. Terima kasih.\n\n` +
        `Wassalamu'alaikum Wr. Wb.\n` +
        `-- *Biro Ketertiban Pesantren* --`
      );
    } else if (presetType === 'kesehatan') {
      setMessageTitle('Himbauan Kesehatan & Kebersihan Santri');
      setMessageBody(
        `Assalamu'alaikum Wr. Wb.\n\n` +
        `Yth. Bapak/Ibu *{nama_wali}* (Wali dari *{nama_santri}*),\n\n` +
        `Menyikapi perubahan musim dan demi menjaga kebugaran para santri di *${schoolName}*, Poskestren menghimbau agar wali santri senantiasa mengingatkan ananda menjaga pola makan, istirahat cukup, dan mencukupi asupan vitamin.\n\n` +
        `Semoga ananda senantiasa diberikan kesehatan lahir dan batin dalam menuntut ilmu agama. Aamiin.\n\n` +
        `Wassalamu'alaikum Wr. Wb.\n` +
        `-- *Tim Poskestren* --`
      );
    } else {
      setMessageTitle('Pesan Bebas Pesantren');
      setMessageBody('');
    }
  };

  // Insert variable into message textarea
  const insertPlaceholder = (tag: string) => {
    setMessageBody(prev => prev + tag);
  };

  // List of selected students as objects
  const selectedStudentsList = useMemo(() => {
    return filteredStudents.filter(s => selectedStudentIds.has(s.id));
  }, [filteredStudents, selectedStudentIds]);

  // Sample student for preview
  const previewStudent = useMemo(() => {
    return students.find(s => s.id === previewStudentId) || filteredStudents[0] || null;
  }, [students, previewStudentId, filteredStudents]);

  // Execute broadcast via Gateway (background sequential)
  const executeGatewayBroadcast = async () => {
    if (selectedStudentsList.length === 0) {
      showAlert('danger', 'Pilih minimal 1 wali santri untuk mengirim pesan!');
      return;
    }

    const gwToken = settings.waGatewayToken || localStorage.getItem('pesantren_wa_gateway_token') || '';
    const gwUrl = settings.waGatewayUrl || localStorage.getItem('pesantren_wa_gateway_url') || 'https://api.fonnte.com/send';

    setIsBroadcasting(true);
    setIsPaused(false);
    setBroadcastProgress({
      current: 0,
      total: selectedStudentsList.length,
      success: 0,
      failed: 0
    });

    const newStatuses: Record<string, 'pending' | 'sending' | 'sent' | 'failed' | 'skipped'> = {};
    selectedStudentsList.forEach(s => { newStatuses[s.id] = 'pending'; });
    setSendStatuses(newStatuses);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < selectedStudentsList.length; i++) {
      const std = selectedStudentsList[i];
      const targetPhone = cleanPhone(std.parentPhone);

      if (!isValidPhone(std.parentPhone)) {
        newStatuses[std.id] = 'skipped';
        setSendStatuses({ ...newStatuses });
        failCount++;
        setBroadcastProgress(prev => ({ ...prev, current: i + 1, failed: failCount }));
        continue;
      }

      newStatuses[std.id] = 'sending';
      setSendStatuses({ ...newStatuses });

      const msg = generatePersonalizedMessage(messageBody, std);

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
          saveWaLog(messageTitle || 'Broadcast Massal', targetPhone, `${std.parentName || 'Wali'} (${std.fullName})`, msg);
        } else {
          newStatuses[std.id] = 'failed';
          failCount++;
        }
      } catch (err) {
        console.error('Broadcast send error:', err);
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

      // Safe delay (800ms) between dispatches to avoid throttling/rate limit
      if (i < selectedStudentsList.length - 1) {
        await new Promise(r => setTimeout(r, 800));
      }
    }

    setIsBroadcasting(false);
    logAdminActivity(
      'BROADCAST_WHATSAPP',
      `Mengirimkan broadcast WhatsApp "${messageTitle}" ke ${successCount} wali santri terpilih (Gagal/Lewat: ${failCount})`
    );
    showAlert('success', `Broadcast selesai! Berhasil terkirim ke ${successCount} nomor wali santri.`);
  };

  // Launch direct queue modal (step-by-step or direct wa.me link)
  const openDirectQueue = () => {
    if (selectedStudentsList.length === 0) {
      showAlert('danger', 'Pilih minimal 1 wali santri untuk mengirim pesan!');
      return;
    }
    setDirectQueueIndex(0);
    setDirectQueueModalOpen(true);
  };

  // Dispatch current direct item in modal
  const handleSendCurrentDirect = (std: Student) => {
    const msg = generatePersonalizedMessage(messageBody, std);
    const phone = cleanPhone(std.parentPhone);
    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');
    saveWaLog(messageTitle || 'Broadcast Direct WA', phone, `${std.parentName || 'Wali'} (${std.fullName})`, msg);
    
    setSendStatuses(prev => ({ ...prev, [std.id]: 'sent' }));
    
    // Auto advance if not at end
    if (directQueueIndex < selectedStudentsList.length - 1) {
      setDirectQueueIndex(idx => idx + 1);
    }
  };

  const handleOpenAllDirectTabs = () => {
    if (!window.confirm(`Perhatian: Tindakan ini akan membuka ${selectedStudentsList.length} tab WhatsApp sekaligus di browser Anda. Pastikan browser mengizinkan pop-up. Lanjutkan?`)) {
      return;
    }

    selectedStudentsList.forEach((std, idx) => {
      setTimeout(() => {
        const msg = generatePersonalizedMessage(messageBody, std);
        const phone = cleanPhone(std.parentPhone);
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
        saveWaLog(messageTitle || 'Broadcast Direct WA', phone, `${std.parentName || 'Wali'} (${std.fullName})`, msg);
      }, idx * 400);
    });

    logAdminActivity(
      'BROADCAST_WHATSAPP_DIRECT',
      `Membuka ${selectedStudentsList.length} tab pesan WhatsApp langsung untuk wali santri terpilih`
    );
    showAlert('success', `${selectedStudentsList.length} pesan WhatsApp telah dibuka di tab baru!`);
    setDirectQueueModalOpen(false);
  };

  // Gateway status check
  const isGatewayActive = Boolean(settings.waGatewayToken || localStorage.getItem('pesantren_wa_gateway_token'));

  // Distinct rooms
  const allRoomsList = useMemo(() => {
    const fromRooms = rooms.map(r => r.name);
    const fromStudents = students.map(s => s.kamar).filter(Boolean) as string[];
    return Array.from(new Set([...fromRooms, ...fromStudents])).filter(r => r.trim() !== '');
  }, [rooms, students]);

  return (
    <div className="space-y-6 text-left">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-emerald-850 via-teal-900 to-emerald-950 text-white p-6 rounded-2xl shadow-md border border-emerald-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-700/60 rounded-xl text-amber-300 shadow-inner">
              <MessageSquare className="h-6 w-6" />
            </span>
            <h3 className="font-black text-lg sm:text-xl text-white tracking-wide">
              Kirim Pesan WhatsApp Massal ke Wali Santri
            </h3>
          </div>
          <p className="text-xs text-emerald-100/90 max-w-3xl leading-relaxed">
            Kirimkan pengumuman resmi jadwal libur pesantren, jadwal kembali, undangan rapat, hingga pengingat rincian tagihan syahriyah bulanan secara massal dan personal ke nomor WhatsApp orang tua/wali santri terpilih.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
          <div className="px-3.5 py-2 bg-white/10 backdrop-blur-xs rounded-xl border border-white/15 text-xs text-emerald-100 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Mode: <strong>{isGatewayActive ? 'Gateway Otomatis (Fonnte/API)' : 'Direct Link (wa.me)'}</strong></span>
          </div>
        </div>
      </div>

      {/* QUICK PRESET TEMPLATES BAR */}
      <div className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
              Template Pesan Cepat (1-Klik Terapkan):
            </h4>
          </div>
          <span className="text-[11px] text-gray-500 italic">Pilih template siap pakai untuk pengumuman atau tagihan</span>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => applyPresetTemplate('libur')}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-900 border border-emerald-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-3xs"
          >
            <span>🌴</span>
            <span>Pengumuman Jadwal Libur & Kepulangan</span>
          </button>

          <button
            type="button"
            onClick={() => applyPresetTemplate('tagihan')}
            className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100/80 text-amber-950 border border-amber-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-3xs"
          >
            <span>💰</span>
            <span>Pengingat Pembayaran / Tagihan Bulanan</span>
          </button>

          <button
            type="button"
            onClick={() => applyPresetTemplate('rapat')}
            className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100/80 text-blue-900 border border-blue-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-3xs"
          >
            <span>📢</span>
            <span>Undangan Rapat & Pertemuan Wali</span>
          </button>

          <button
            type="button"
            onClick={() => applyPresetTemplate('semester_baru')}
            className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100/80 text-purple-900 border border-purple-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-3xs"
          >
            <span>🎒</span>
            <span>Awal Masuk Asrama & Semester Baru</span>
          </button>

          <button
            type="button"
            onClick={() => applyPresetTemplate('kesehatan')}
            className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100/80 text-rose-900 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-3xs"
          >
            <span>🩺</span>
            <span>Himbauan Kesehatan & Poskestren</span>
          </button>

          <button
            type="button"
            onClick={() => applyPresetTemplate('kosong')}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            <span>✏️ Kosongkan Teks</span>
          </button>
        </div>
      </div>

      {/* TWO COLUMNS: COMPOSE (LEFT) & LIVE PREVIEW (RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* COMPOSE AREA (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-emerald-100 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">✍️</span>
              <h4 className="font-extrabold text-sm text-slate-900">Format & Teks Pesan WhatsApp</h4>
            </div>
            <span className="text-[11px] text-gray-500 font-mono">
              {messageBody.length} karakter
            </span>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-gray-500 block">Subjek / Judul Pesan (Catatan Log)</label>
            <input
              type="text"
              value={messageTitle}
              onChange={(e) => setMessageTitle(e.target.value)}
              placeholder="Contoh: Pengumuman Jadwal Libur Idul Fitri"
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-700 bg-slate-50/50"
            />
          </div>

          {/* Placeholders helper pills */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-extrabold text-emerald-800">
                Variabel Personal Otomatis (Klik untuk menyisipkan):
              </span>
              <span className="text-[9.5px] text-slate-400">Otomatis diganti sesuai data tiap santri</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {[
                { tag: '{nama_wali}', label: 'Nama Wali', desc: 'Nama orang tua/wali' },
                { tag: '{nama_santri}', label: 'Nama Santri', desc: 'Nama lengkap anak' },
                { tag: '{nis}', label: 'NIS', desc: 'Nomor Induk Santri' },
                { tag: '{kelas}', label: 'Kelas', desc: 'Kelas formal/diniyah' },
                { tag: '{kamar}', label: 'Kamar', desc: 'Asrama santri' },
                { tag: '{total_tagihan}', label: 'Total Tagihan', desc: 'Nominal tunggakan rupiah' },
                { tag: '{rincian_tagihan}', label: 'Rincian Tagihan', desc: 'Daftar nama & nominal tagihan' },
                { tag: '{rekening_pesantren}', label: 'Rekening Resmi', desc: 'Daftar rekening bank' },
                { tag: '{nama_pesantren}', label: 'Nama Pesantren', desc: 'Nama sekolah' }
              ].map(item => (
                <button
                  key={item.tag}
                  type="button"
                  onClick={() => insertPlaceholder(item.tag)}
                  title={`Klik untuk menyisipkan: ${item.desc}`}
                  className="px-2.5 py-1 bg-emerald-50/80 hover:bg-emerald-100 text-emerald-900 border border-emerald-200/80 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer active:scale-95 shadow-3xs"
                >
                  +{item.tag}
                </button>
              ))}
            </div>
          </div>

          {/* Message Body Textarea */}
          <div className="space-y-1 pt-1">
            <label className="text-[10px] uppercase font-bold text-gray-500 block">Isi Pesan WhatsApp</label>
            <textarea
              rows={11}
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              placeholder="Ketik teks pesan WhatsApp di sini..."
              className="w-full px-3.5 py-2.5 text-xs border border-gray-200 rounded-xl font-sans text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-700 bg-white leading-relaxed resize-y"
            />
            <div className="flex justify-between items-center text-[10px] text-gray-400 pt-1">
              <span>Tips formatting WA: *tebal*, _miring_, ~coret~</span>
              <span>Baris: {messageBody.split('\n').length}</span>
            </div>
          </div>
        </div>

        {/* LIVE PREVIEW AREA (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-emerald-100 p-5 sm:p-6 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">👁️</span>
                <h4 className="font-extrabold text-sm text-slate-900">Pratinjau Pesan Personal</h4>
              </div>
              <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                Live Preview
              </span>
            </div>

            {/* Select sample student */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-gray-500 block">Lihat Simulasi Untuk Santri:</label>
              <select
                value={previewStudentId}
                onChange={(e) => setPreviewStudentId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl font-bold text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-700"
              >
                {filteredStudents.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.fullName} ({s.nis || '-'}) - Wali: {s.parentName || s.fatherName || 'Wali'}
                  </option>
                ))}
              </select>
            </div>

            {/* Mock WhatsApp Chat Box */}
            <div className="rounded-2xl border border-emerald-200/80 bg-[#e5ddd5] overflow-hidden shadow-sm text-xs">
              {/* WA Header */}
              <div className="bg-[#075e54] text-white p-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-full bg-emerald-700 flex items-center justify-center font-bold text-xs uppercase border border-white/20">
                    {previewStudent?.parentName?.[0] || 'W'}
                  </div>
                  <div>
                    <h5 className="font-bold text-xs leading-none text-white">
                      {previewStudent?.parentName || 'Bapak/Ibu Wali Santri'}
                    </h5>
                    <p className="text-[9.5px] text-emerald-100/80 mt-0.5 font-mono">
                      +{cleanPhone(previewStudent?.parentPhone || '6281234567890')}
                    </p>
                  </div>
                </div>
                <div className="text-white/80 text-[10px] font-mono">WhatsApp</div>
              </div>

              {/* WA Chat Body */}
              <div className="p-3.5 space-y-2 max-h-[380px] overflow-y-auto bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px]">
                <div className="flex justify-center">
                  <span className="bg-white/80 backdrop-blur-xs text-[9px] text-slate-500 font-semibold px-2.5 py-0.5 rounded-full shadow-2xs">
                    HARI INI
                  </span>
                </div>

                <div className="bg-[#dcf8c6] text-slate-900 p-3 rounded-2xl rounded-tr-none shadow-xs text-[11px] leading-relaxed whitespace-pre-wrap font-sans border border-emerald-100 max-w-[95%] ml-auto">
                  {previewStudent ? (
                    generatePersonalizedMessage(messageBody, previewStudent)
                  ) : (
                    <span className="text-gray-400 italic">Pilih santri untuk melihat pratinjau pesan.</span>
                  )}
                  <div className="text-right text-[8.5px] text-emerald-900/60 font-mono mt-1">
                    {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} ✓✓
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick info footer */}
          <div className="bg-emerald-50/60 border border-emerald-100 p-3 rounded-xl text-[11px] text-emerald-950 flex items-start gap-2">
            <Info className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
            <p>
              Teks di atas adalah contoh nyata yang akan otomatis diterima oleh wali santri bersangkutan dengan seluruh tagihan dan namanya terisi tepat.
            </p>
          </div>
        </div>
      </div>

      {/* FILTER & RECIPIENTS SELECTION SECTION */}
      <div className="bg-white rounded-2xl border border-emerald-100 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
          <div>
            <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-700" />
              Pilih Target Wali Santri Penerima Broadcast
            </h4>
            <p className="text-xs text-gray-500 mt-0.5">
              Gunakan filter di bawah untuk menargetkan pesan ke santri kamar tertentu, jenjang kelas, atau khusus santri yang memiliki tunggakan SPP.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 bg-emerald-800 text-white rounded-xl text-xs font-black shadow-xs">
              Terpilih: {selectedStudentsList.length} dari {filteredStudents.length} Santri
            </span>
          </div>
        </div>

        {/* Filter controls row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
          {/* Search Input */}
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari santri, NIS, nama wali, atau no WA..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-700 bg-slate-50/50"
            />
          </div>

          {/* Filter Status Tagihan */}
          <div>
            <select
              value={selectedBillFilter}
              onChange={(e) => setSelectedBillFilter(e.target.value as any)}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700"
            >
              <option value="all">Semua Status Tagihan</option>
              <option value="with_unpaid">🔴 Punya Tunggakan Tagihan</option>
              <option value="paid_only">🟢 Sudah Lunas Semua</option>
            </select>
          </div>

          {/* Filter Kelas Formal */}
          <div>
            <select
              value={selectedFormalClass}
              onChange={(e) => setSelectedFormalClass(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700"
            >
              <option value="Semua">Semua Kelas Formal</option>
              {availableFormalClasses.filter(c => c && c !== '-').map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>

          {/* Filter Kamar */}
          <div>
            <select
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700"
            >
              <option value="Semua">Semua Kamar Asrama</option>
              {allRoomsList.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Selection Tools & Checkboxes Quick Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl text-xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleToggleSelectAll}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-3xs"
            >
              {selectedStudentIds.size >= filteredStudents.filter(s => isValidPhone(s.parentPhone)).length && filteredStudents.length > 0 ? (
                <>
                  <Square className="h-3.5 w-3.5" />
                  <span>Batal Pilih Semua</span>
                </>
              ) : (
                <>
                  <CheckSquare className="h-3.5 w-3.5" />
                  <span>Pilih Semua Hasil Filter ({filteredStudents.filter(s => isValidPhone(s.parentPhone)).length})</span>
                </>
              )}
            </button>

            <label className="flex items-center gap-1.5 text-gray-700 cursor-pointer font-medium select-none">
              <input
                type="checkbox"
                checked={hasPhoneOnly}
                onChange={(e) => setHasPhoneOnly(e.target.checked)}
                className="rounded border-gray-300 text-emerald-700 focus:ring-emerald-500"
              />
              <span>Hanya yang memiliki No. WhatsApp</span>
            </label>
          </div>

          <div className="flex items-center gap-2">
            {selectedStudentsList.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedStudentIds(new Set())}
                className="text-rose-600 hover:underline text-[11px] font-bold cursor-pointer"
              >
                Reset Pilihan (0)
              </button>
            )}
          </div>
        </div>

        {/* TABLE RECIPIENTS */}
        <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-3xs">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-bold border-b border-gray-200">
                <th className="px-3.5 py-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selectedStudentIds.size > 0 && selectedStudentIds.size >= filteredStudents.filter(s => isValidPhone(s.parentPhone)).length}
                    onChange={handleToggleSelectAll}
                    className="rounded border-gray-300 text-emerald-700 focus:ring-emerald-500 cursor-pointer"
                  />
                </th>
                <th className="px-3 py-3">Nama Santri & NIS</th>
                <th className="px-3 py-3">Kelas & Kamar</th>
                <th className="px-3 py-3">Wali Santri & No. WhatsApp</th>
                <th className="px-3 py-3">Status Tagihan SPP</th>
                <th className="px-3 py-3 text-center">Status Kirim</th>
                <th className="px-3 py-3 text-center">Aksi Cepat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400 italic">
                    Tidak ada santri yang cocok dengan kriteria filter saat ini.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((std) => {
                  const isSelected = selectedStudentIds.has(std.id);
                  const validPhone = isValidPhone(std.parentPhone);
                  const unpaid = getStudentUnpaidData(std);
                  const statusKirim = sendStatuses[std.id];

                  return (
                    <tr 
                      key={std.id} 
                      className={`transition ${isSelected ? 'bg-emerald-50/60 font-medium' : 'hover:bg-slate-50/60'}`}
                    >
                      <td className="px-3.5 py-3 text-center">
                        <input
                          type="checkbox"
                          disabled={!validPhone}
                          checked={isSelected}
                          onChange={() => handleToggleStudent(std.id)}
                          className="rounded border-gray-300 text-emerald-700 focus:ring-emerald-500 cursor-pointer disabled:opacity-30"
                        />
                      </td>

                      <td className="px-3 py-3">
                        <div className="font-extrabold text-slate-900 uppercase">
                          {std.fullName}
                        </div>
                        <div className="text-[10.5px] font-mono text-gray-500">
                          NIS: {std.nis || '-'}
                        </div>
                      </td>

                      <td className="px-3 py-3">
                        <div className="font-bold text-slate-800">
                          {std.classFormal || std.classMadrasah || std.class || '-'}
                        </div>
                        <div className="text-[10.5px] text-emerald-800 font-semibold">
                          Kamar: {std.kamar || '-'}
                        </div>
                      </td>

                      <td className="px-3 py-3">
                        <div className="font-bold text-slate-900">
                          {std.parentName || std.fatherName || std.guardianName || 'Wali Santri'}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {validPhone ? (
                            <span className="font-mono text-[11px] text-emerald-800 bg-emerald-100/60 px-1.5 py-0.2 rounded font-bold">
                              +{cleanPhone(std.parentPhone)}
                            </span>
                          ) : (
                            <span className="text-[10px] text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded font-bold">
                              ⚠️ Belum ada no WA
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-3 py-3">
                        {unpaid.count > 0 ? (
                          <div className="space-y-0.5">
                            <span className="inline-block text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                              🔴 {unpaid.count} Tagihan (Rp {unpaid.total.toLocaleString('id-ID')})
                            </span>
                            <div className="text-[9.5px] text-gray-400 truncate max-w-[150px]">
                              {unpaid.items.map(b => b.title).join(', ')}
                            </div>
                          </div>
                        ) : (
                          <span className="inline-block text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            🟢 Lunas Semua
                          </span>
                        )}
                      </td>

                      <td className="px-3 py-3 text-center">
                        {statusKirim === 'sent' && (
                          <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Terkirim
                          </span>
                        )}
                        {statusKirim === 'sending' && (
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full inline-flex items-center gap-1 animate-pulse">
                            <RefreshCw className="h-3 w-3 animate-spin" /> Mengirim...
                          </span>
                        )}
                        {statusKirim === 'failed' && (
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            <XCircle className="h-3 w-3" /> Gagal
                          </span>
                        )}
                        {statusKirim === 'skipped' && (
                          <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                            Dilewati
                          </span>
                        )}
                        {!statusKirim && (
                          <span className="text-[10px] text-gray-400 font-mono">
                            -
                          </span>
                        )}
                      </td>

                      <td className="px-3 py-3 text-center">
                        {validPhone ? (
                          <button
                            type="button"
                            onClick={() => {
                              const msg = generatePersonalizedMessage(messageBody, std);
                              const phone = cleanPhone(std.parentPhone);
                              window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
                              saveWaLog(messageTitle || 'Kirim Perorangan', phone, `${std.parentName} (${std.fullName})`, msg);
                            }}
                            className="px-2.5 py-1 bg-emerald-100/70 hover:bg-emerald-200 text-emerald-900 font-bold rounded-lg text-[10px] transition cursor-pointer flex items-center justify-center gap-1 mx-auto"
                            title="Buka WA langsung untuk wali ini"
                          >
                            <span>💬</span>
                            <span>Kirim WA</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-gray-300">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* BOTTOM ACTION BAR */}
        <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-gray-600">
            Total penerima siap kirim: <strong className="text-emerald-900 font-extrabold">{selectedStudentsList.length} Wali Santri</strong>
          </div>

          <div className="flex flex-wrap gap-2.5 items-center w-full sm:w-auto">
            {/* Primary Action Button */}
            {isGatewayActive ? (
              <button
                type="button"
                disabled={isBroadcasting || selectedStudentsList.length === 0}
                onClick={executeGatewayBroadcast}
                className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-emerald-800 to-teal-900 hover:from-emerald-700 hover:to-teal-850 text-white font-black rounded-xl text-xs shadow-md transition active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isBroadcasting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin text-amber-300" />
                    <span>Sedang Menyiarkan ({broadcastProgress.current}/{broadcastProgress.total})...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 text-amber-300" />
                    <span>Kirim Pesan Massal via Gateway Otomatis ({selectedStudentsList.length})</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                disabled={selectedStudentsList.length === 0}
                onClick={openDirectQueue}
                className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-emerald-800 to-teal-900 hover:from-emerald-700 hover:to-teal-850 text-white font-black rounded-xl text-xs shadow-md transition active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Send className="h-4 w-4 text-amber-300" />
                <span>Mulai Antrean Kirim WhatsApp ({selectedStudentsList.length} Wali)</span>
              </button>
            )}

            {/* Direct Web Alternative */}
            {isGatewayActive && (
              <button
                type="button"
                disabled={selectedStudentsList.length === 0}
                onClick={openDirectQueue}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                title="Gunakan jika ingin mengirim manual satu per satu lewat WhatsApp Web"
              >
                <ExternalLink className="h-3.5 w-3.5 text-slate-600" />
                <span>Kirim Manual (wa.me)</span>
              </button>
            )}
          </div>
        </div>

        {/* PROGRESS BAR IF BROADCASTING */}
        {isBroadcasting && (
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl space-y-2 animate-fadeIn">
            <div className="flex justify-between items-center text-xs font-bold text-emerald-950">
              <span className="flex items-center gap-1.5">
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-700" />
                Menyiarkan Pesan WhatsApp Massal ke Server Gateway...
              </span>
              <span>
                {broadcastProgress.current} / {broadcastProgress.total} Santri ({Math.round((broadcastProgress.current / (broadcastProgress.total || 1)) * 100)}%)
              </span>
            </div>

            <div className="w-full bg-emerald-200 h-2.5 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-700 h-full transition-all duration-300 rounded-full"
                style={{ width: `${Math.round((broadcastProgress.current / (broadcastProgress.total || 1)) * 100)}%` }}
              />
            </div>

            <div className="flex justify-between text-[11px] text-gray-600 pt-1">
              <span>Berhasil Terkirim: <strong className="text-emerald-700">{broadcastProgress.success}</strong></span>
              <span>Gagal / Tanpa No: <strong className="text-rose-600">{broadcastProgress.failed}</strong></span>
            </div>
          </div>
        )}
      </div>

      {/* DIRECT QUEUE INTERACTIVE MODAL */}
      {directQueueModalOpen && selectedStudentsList.length > 0 && (() => {
        const curStd = selectedStudentsList[directQueueIndex] || selectedStudentsList[0];
        const personalizedCurrentMsg = generatePersonalizedMessage(messageBody, curStd);
        const curPhone = cleanPhone(curStd.parentPhone);
        const isCurrentSent = sendStatuses[curStd.id] === 'sent';

        return (
          <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 font-sans animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-emerald-100 flex flex-col max-h-[90vh] overflow-hidden text-left">
              
              {/* Modal Header */}
              <div className="p-4 bg-gradient-to-r from-emerald-850 to-teal-950 text-white flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-sm uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                    <span>📱</span> Antrean Pengiriman WhatsApp Langsung
                  </h3>
                  <p className="text-[11px] text-emerald-100 mt-0.5">
                    Penerima ke-{directQueueIndex + 1} dari {selectedStudentsList.length} wali santri terpilih
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDirectQueueModalOpen(false)}
                  className="p-1 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Progress bar inside modal */}
              <div className="w-full bg-slate-100 h-1.5">
                <div 
                  className="bg-emerald-600 h-full transition-all duration-300"
                  style={{ width: `${Math.round(((directQueueIndex + 1) / selectedStudentsList.length) * 100)}%` }}
                />
              </div>

              {/* Modal Body */}
              <div className="p-5 space-y-4 overflow-y-auto text-xs">
                {/* Current Recipient Card */}
                <div className="bg-emerald-50/80 border border-emerald-200 p-4 rounded-xl space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] text-emerald-800 uppercase font-black tracking-wider block">
                        Penerima Saat Ini:
                      </span>
                      <h4 className="font-extrabold text-slate-900 text-sm">
                        {curStd.parentName || curStd.fatherName || 'Bapak/Ibu Wali'}
                      </h4>
                      <p className="text-gray-600 text-xs">
                        Wali dari: <strong>{curStd.fullName}</strong> (NIS: {curStd.nis || '-'})
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="font-mono text-xs font-bold text-emerald-850 bg-white px-2.5 py-1 rounded-lg border border-emerald-200 block">
                        +{curPhone}
                      </span>
                      {isCurrentSent ? (
                        <span className="text-[10px] text-emerald-700 font-bold mt-1 inline-block">
                          ✓ Sudah Dibuka
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-700 font-bold mt-1 inline-block">
                          ⏳ Menunggu Kirim
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-600 pt-1 border-t border-emerald-200/50 flex justify-between">
                    <span>Kelas: {curStd.classFormal || curStd.class || '-'}</span>
                    <span>Kamar: {curStd.kamar || '-'}</span>
                  </div>
                </div>

                {/* Message preview to be sent */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Teks Pesan Siap Kirim:</label>
                  <div className="p-3 bg-[#e5ddd5] rounded-xl border border-emerald-200 max-h-48 overflow-y-auto">
                    <div className="bg-[#dcf8c6] text-slate-900 p-3 rounded-xl shadow-2xs text-[11px] leading-relaxed whitespace-pre-wrap font-sans">
                      {personalizedCurrentMsg}
                    </div>
                  </div>
                </div>

                {/* Dispatch Button */}
                <div className="pt-2 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => handleSendCurrentDirect(curStd)}
                    className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-black rounded-xl text-xs transition cursor-pointer shadow-md flex items-center justify-center gap-2 active:scale-98"
                  >
                    <span>📲</span>
                    <span>Buka WhatsApp Sekarang untuk Wali Ini</span>
                    <ExternalLink className="h-4 w-4" />
                  </button>

                  <div className="flex gap-2 justify-between pt-1">
                    <button
                      type="button"
                      disabled={directQueueIndex === 0}
                      onClick={() => setDirectQueueIndex(idx => Math.max(0, idx - 1))}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition cursor-pointer disabled:opacity-40"
                    >
                      ⬅ Sebelumnya
                    </button>

                    <button
                      type="button"
                      disabled={directQueueIndex >= selectedStudentsList.length - 1}
                      onClick={() => setDirectQueueIndex(idx => Math.min(selectedStudentsList.length - 1, idx + 1))}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-xs transition cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
                    >
                      <span>Lanjut Berikutnya</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Option to open all tabs */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-gray-500">
                  <span>Ingin membuka tab seluruh santri sekaligus?</span>
                  <button
                    type="button"
                    onClick={handleOpenAllDirectTabs}
                    className="text-emerald-800 font-bold hover:underline cursor-pointer"
                  >
                    Buka Semua ({selectedStudentsList.length}) Tab Sekaligus ➜
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
