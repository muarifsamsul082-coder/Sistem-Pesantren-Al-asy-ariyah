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

  // Murni pesan admin tanpa penambahan kata-kata otomatis
  const buildMessage = (std: Student): string => {
    if (!messageBody) return '';
    const waliName = std.parentName || std.fatherName || std.guardianName || 'Bapak/Ibu Wali Santri';
    return messageBody
      .replace(/\{nama_santri\}/g, std.fullName || '')
      .replace(/\{nama_wali\}/g, waliName)
      .replace(/\{nis\}/g, std.nis || '')
      .replace(/\{kelas\}/g, std.classFormal || std.classMadrasah || std.class || '');
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
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold text-slate-700">
                Isi Pesan WhatsApp
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setMessageBody(prev => prev + ' {nama_santri}')}
                  className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded cursor-pointer transition font-mono"
                  title="Sisipkan nama santri"
                >
                  +{'{nama_santri}'}
                </button>
                <button
                  type="button"
                  onClick={() => setMessageBody(prev => prev + ' {nama_wali}')}
                  className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded cursor-pointer transition font-mono"
                  title="Sisipkan nama wali"
                >
                  +{'{nama_wali}'}
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
