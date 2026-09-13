import React from 'react';
import { PortalSettings, AcademicEvent } from '../types';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  MapPin, 
  Filter, 
  BookOpen, 
  Smile, 
  Sparkles, 
  HelpCircle,
  Megaphone
} from 'lucide-react';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const CATEGORY_META = {
  ujian: {
    label: 'Ujian / Akademik',
    bgColor: 'bg-rose-50 border-rose-200 text-rose-800',
    dotColor: 'bg-rose-500',
    activeBg: 'bg-rose-600'
  },
  libur: {
    label: 'Libur / Hari Besar',
    bgColor: 'bg-amber-50 border-amber-200 text-amber-800',
    dotColor: 'bg-amber-500',
    activeBg: 'bg-amber-500'
  },
  kegiatan: {
    label: 'Kegiatan / Haflah',
    bgColor: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    dotColor: 'bg-emerald-600',
    activeBg: 'bg-emerald-800'
  },
  ppdb: {
    label: 'Pendaftaran / PCSB',
    bgColor: 'bg-teal-50 border-teal-200 text-teal-800',
    dotColor: 'bg-teal-500',
    activeBg: 'bg-teal-600'
  }
};

const ACADEMIC_EVENTS: AcademicEvent[] = [
  {
    id: 'evt-1',
    title: 'Pendaftaran PCSB Mandiri Gelombang 2',
    description: 'Batas akhir pengunggahan berkas digital (KK, Akta Kelahiran, Rapor Asal) serta verifikasi berkas luring.',
    startDate: '2026-06-01',
    endDate: '2026-06-25',
    category: 'ppdb',
    location: 'Kantor Sekretariat PCSB Al-Asy\'ariyah'
  },
  {
    id: 'evt-2',
    title: 'Ujian Akhir Semester (PAS) Genap',
    description: 'Evaluasi tertulis mapel umum murni dan ujian lisan setoran kitab kuning (Imtihan Fathul Qarib).',
    startDate: '2026-06-22',
    endDate: '2026-06-27',
    category: 'ujian',
    location: 'Gedung Madrasah Barat & Timur'
  },
  {
    id: 'evt-3',
    title: 'Libur Akhir Tahun Ajaran & Idul Adha 1447 H',
    description: 'Santri diperkenankan pulang ke rumah (mudik massal) dengan pengawasan dari pengurus konsulat daerah.',
    startDate: '2026-06-29',
    endDate: '2026-07-12',
    category: 'libur',
    location: 'Kepulangan Konsulat Daerah'
  },
  {
    id: 'evt-4',
    title: 'Masa Ta\'aruf Santri Baru (MATSAMA) & Awal Masuk Kelas',
    description: 'Kuliah perdana pembukaan kitab kuning bersama Romo KH. Asy\'ari Ahmad dan orientasi santri baru.',
    startDate: '2026-07-13',
    endDate: '2026-07-15',
    category: 'kegiatan',
    location: 'Masjid Agung Al-Asy\'ariyah'
  },
  {
    id: 'evt-5',
    title: 'Pengambilan Kitab Kuning & Atribut Santri',
    description: 'Distribusikan kitab wajib semester ganjil, almari portabel, koper seragam, dan kartu anggota santri.',
    startDate: '2026-07-20',
    endDate: '2026-07-22',
    category: 'kegiatan',
    location: 'Koperasi & Unit Niaga Pesantren'
  },
  {
    id: 'evt-6',
    title: 'Upacara HUT RI ke-81 & Pekan Lomba Inter-Komplek',
    description: 'Peringatan kemerdekaan Indonesia dimeriahkan lomba debat bahasa Arab, khitobah, dan hadroh kolosal.',
    startDate: '2026-08-15',
    endDate: '2026-08-17',
    category: 'kegiatan',
    location: 'Lapangan Utama Pesantren'
  },
  {
    id: 'evt-7',
    title: 'Ujian Penilaian Tengah Semester (PTS) Ganjil',
    description: 'Ujian komprehensif tertulis untuk mengevaluasi pemahaman dini terhadap nahwu shorof dasar.',
    startDate: '2026-09-14',
    endDate: '2026-09-19',
    category: 'ujian',
    location: 'Auditorium Pesantren'
  },
  {
    id: 'evt-8',
    title: 'Peringatan Hari Santri Nasional (HSN) & Kirab Resolusi',
    description: 'Ziarah kubur para pendiri pesantren, kirab merah putih 10km, dan istighosah kubro untuk bangsa.',
    startDate: '2026-10-22',
    endDate: '2026-10-22',
    category: 'kegiatan',
    location: 'Alun-Alun Kota'
  },
  {
    id: 'evt-9',
    title: 'Peluncuran PCSB Online Gelombang 1 Tahun Ajaran 2027',
    description: 'Pembukaan resmi pendaftaran santri baru jalur prestasi dan beasiswa keagamaan.',
    startDate: '2026-11-01',
    endDate: '2026-11-30',
    category: 'ppdb',
    location: 'Aplikasi Portal Pondok Pesantren'
  },
  {
    id: 'evt-10',
    title: 'Ujian Penilaian Akhir Semester (PAS) Ganjil',
    description: 'Rangkaian tasmi\' hafalan nadzhom Imrithi dan ujian tulis fiqih mazhab Syafi\'i.',
    startDate: '2026-12-07',
    endDate: '2026-12-12',
    category: 'ujian',
    location: 'Madrasah Diniyah Komplek'
  },
  {
    id: 'evt-11',
    title: 'Libur Akhir Semester Ganjil & Haflah Khotmil Qur\'an',
    description: 'Acara puncak akhir semester sekaligus wisuda kelulusan santri Madrasah Diniyah.',
    startDate: '2026-12-14',
    endDate: '2026-12-31',
    category: 'libur',
    location: 'Gedung Pertemuan Utama H. Asy\'ari'
  }
];

interface AcademicCalendarProps {
  settings?: PortalSettings;
}

export default function AcademicCalendar({ settings }: AcademicCalendarProps) {
  const [currentYear, setCurrentYear] = React.useState<number>(2026);
  const [selectedMonthIdx, setSelectedMonthIdx] = React.useState<number>(6); // Default to July (index 6)
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');

  const [eventsList, setEventsList] = React.useState<AcademicEvent[]>(() => {
    try {
      const stored = localStorage.getItem('pesantren_events');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return ACADEMIC_EVENTS;
  });

  // Listen to localstorage & custom sync changes without continuous polling intervals
  React.useEffect(() => {
    const handleStorage = () => {
      try {
        const stored = localStorage.getItem('pesantren_events');
        if (stored) setEventsList(JSON.parse(stored));
      } catch (e) {
        console.error(e);
      }
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('pesantren_db_sync', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('pesantren_db_sync', handleStorage);
    };
  }, []);

  // Handle Month Changing boundaries seamlessly across years
  const handlePrevMonth = () => {
    if (selectedMonthIdx > 0) {
      setSelectedMonthIdx(prev => prev - 1);
    } else {
      setSelectedMonthIdx(11);
      setCurrentYear(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonthIdx < 11) {
      setSelectedMonthIdx(prev => prev + 1);
    } else {
      setSelectedMonthIdx(0);
      setCurrentYear(prev => prev + 1);
    }
  };

  // Days calculations helper
  const firstDayOfWeek = new Date(currentYear, selectedMonthIdx, 1).getDay(); // 0 is Sunday, 1 is Monday ...
  const numDaysInMonth = new Date(currentYear, selectedMonthIdx + 1, 0).getDate();
  const prevMonthNumDays = new Date(currentYear, selectedMonthIdx, 0).getDate();

  // Create dates structure for grid display (including padding days)
  const calendarDays: Array<{ day: number; type: 'current' | 'prev' | 'next'; fullDate: string }> = [];

  // 1. Pad preceding month days
  // If firstDayOfWeek is 0 (Sunday), let's say it starts on index 0. We'll start grid from Sunday
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const d = prevMonthNumDays - i;
    const prevMonthStr = String(selectedMonthIdx === 0 ? 12 : selectedMonthIdx).padStart(2, '0');
    const prevYearStr = selectedMonthIdx === 0 ? currentYear - 1 : currentYear;
    calendarDays.push({
      day: d,
      type: 'prev',
      fullDate: `${prevYearStr}-${prevMonthStr}-${String(d).padStart(2, '0')}`
    });
  }

  // 2. Add current month days
  for (let d = 1; d <= numDaysInMonth; d++) {
    const monthStr = String(selectedMonthIdx + 1).padStart(2, '0');
    calendarDays.push({
      day: d,
      type: 'current',
      fullDate: `${currentYear}-${monthStr}-${String(d).padStart(2, '0')}`
    });
  }

  // 3. Pad future month days to complete grid multiple of 7
  const remainingCells = 42 - calendarDays.length; // Max 6 rows
  for (let d = 1; d <= remainingCells; d++) {
    const nextMonthStr = String(selectedMonthIdx === 11 ? 1 : selectedMonthIdx + 2).padStart(2, '0');
    const nextYearStr = selectedMonthIdx === 11 ? currentYear + 1 : currentYear;
    calendarDays.push({
      day: d,
      type: 'next',
      fullDate: `${nextYearStr}-${nextMonthStr}-${String(d).padStart(2, '0')}`
    });
  }

  // Helper to safely parse YYYY-MM-DD date parts without timezone offset errors
  const parseDateParts = (str: string) => {
    const parts = (str || '').split('-').map(Number);
    const y = parts[0] || 2026;
    const m = parts[1] || 1;
    const d = parts[2] || 1;
    return { year: y, monthIdx: m - 1, day: d };
  };

  // Filter events by selected category and active month/year
  const filteredEvents = eventsList.filter(evt => {
    // Check category filter
    if (selectedCategory !== 'all' && evt.category !== selectedCategory) {
      return false;
    }
    
    // Check if event touches the current active year and month
    const startP = parseDateParts(evt.startDate);
    const endP = parseDateParts(evt.endDate);
    
    const currentMonthVal = currentYear * 12 + selectedMonthIdx;
    const startMonthVal = startP.year * 12 + startP.monthIdx;
    const endMonthVal = endP.year * 12 + endP.monthIdx;
    
    return currentMonthVal >= startMonthVal && currentMonthVal <= endMonthVal;
  });

  // Check if a date string lands inside an event's bounds
  const getEventsForDate = (dateStr: string) => {
    return eventsList.filter(evt => {
      return dateStr >= evt.startDate && dateStr <= evt.endDate;
    });
  };

  // Helper to determine status tag (Countdown or active)
  const getEventStatus = (evt: AcademicEvent) => {
    const today = new Date('2026-07-06'); // Mock context base time is 2026-07-06 (from metadata)
    const start = new Date(evt.startDate);
    const end = new Date(evt.endDate);

    if (today >= start && today <= end) {
      return { label: 'Sedang Berlangsung', color: 'bg-emerald-600 text-white animate-pulse' };
    } else if (today < start) {
      const diffTime = Math.abs(start.getTime() - today.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return { label: `Mulai ${diffDays} Hari Lagi`, color: 'bg-amber-100 text-amber-900 border border-amber-300' };
    } else {
      return { label: 'Telah Selesai', color: 'bg-gray-100 text-gray-500' };
    }
  };

  // Formatter for print-friendly date display
  const formatDateFriendly = (startStr: string, endStr: string) => {
    const s = parseDateParts(startStr);
    const e = parseDateParts(endStr);
    
    const startDay = s.day;
    const startMonthName = MONTH_NAMES[s.monthIdx] || 'Januari';
    
    const endDay = e.day;
    const endMonthName = MONTH_NAMES[e.monthIdx] || 'Januari';

    if (startStr === endStr) {
      return `${startDay} ${startMonthName} ${s.year}`;
    }

    if (s.monthIdx === e.monthIdx) {
      return `${startDay} - ${endDay} ${startMonthName} ${s.year}`;
    }

    return `${startDay} ${startMonthName} - ${endDay} ${endMonthName} ${e.year}`;
  };

  const today = new Date('2026-07-06'); // Base mock time is July 6, 2026
  const nextMonthYear = today.getFullYear();
  const nextMonthIdx = today.getMonth() + 1; // August (index 7)
  const nextMonthFirstDay = new Date(nextMonthYear, nextMonthIdx, 1);
  const diffTime = nextMonthFirstDay.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const nextMonthEvents = eventsList.filter(evt => {
    const start = new Date(evt.startDate);
    return start.getMonth() === nextMonthIdx && start.getFullYear() === nextMonthYear;
  });
  const hasUnconfirmedNextMonthEvents = nextMonthEvents.some(evt => !evt.confirmed);

  return (
    <div id="calendar-wrapper" className="bg-white rounded-2xl shadow-sm border border-emerald-50/60 p-6 md:p-8 space-y-8 text-left">
      
      {/* 1. Header & Title Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-150 pb-5">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 bg-[#f2faf6] px-3 py-1 rounded-full border border-emerald-100 text-emerald-850">
            <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
            <span className="text-[10px] font-black tracking-widest uppercase font-mono">KALENDER AKADEMIK</span>
          </div>
          <h3 className="text-xl font-extrabold text-emerald-950 font-sans tracking-tight">
            Agenda Kegiatan & Kalender Pendidikan
          </h3>
          <p className="text-xs text-gray-400 font-sans leading-relaxed">
            Informasi resmi jadwal belajar mengajar, pelaksanaan ujian, kepulangan, serta pendaftaran santri baru Al-Asy'ariyah.
          </p>
        </div>

        {/* Year Badge */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white rounded-xl p-3 px-5 text-center shadow-sm shrink-0 border border-emerald-700">
          <span className="text-[9px] uppercase tracking-wider font-extrabold block text-amber-300 font-mono">Tahun Ajaran</span>
          <span className="text-sm font-black font-mono">2026 / 2027</span>
        </div>
      </div>

      {/* 2. Custom Filtering Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 pb-2">
        <div className="text-xs font-bold text-gray-400 flex items-center gap-1 mr-2 font-mono uppercase">
          <Filter className="h-3.5 w-3.5 text-emerald-800" />
          Filter:
        </div>
        
        <button
          id="btn-filter-all"
          onClick={() => setSelectedCategory('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
            selectedCategory === 'all' 
              ? 'bg-emerald-900 text-white' 
              : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
          }`}
        >
          Semua Agenda
        </button>

        {Object.entries(CATEGORY_META).map(([key, value]) => (
          <button
            key={key}
            id={`btn-filter-${key}`}
            onClick={() => setSelectedCategory(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              selectedCategory === key 
                ? `${value.bgColor} font-black border-2 border-emerald-800` 
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${value.dotColor}`} />
            {value.label}
          </button>
        ))}
      </div>

      {/* 3. Main Split View Grid: Left: Calendar Grid, Right: Timeline list */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* LEFT COLUMN: MONTHLY MINI-CALENDAR GRID (5 Cols) */}
        <div className="lg:col-span-5 bg-gradient-to-b from-gray-50/50 to-white border border-gray-150 p-5 rounded-2xl flex flex-col justify-between">
          
          {/* Month Navigator Header */}
          <div className="flex items-center justify-between pb-4 border-b border-gray-150">
            <button
              id="btn-calendar-prev"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-700 bg-white hover:bg-emerald-50 hover:text-emerald-950 transition cursor-pointer"
              title="Bulan Sebelumnya"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="text-center">
              <h4 id="calendar-current-month" className="font-extrabold text-sm text-emerald-950 uppercase tracking-wider font-sans">
                {MONTH_NAMES[selectedMonthIdx]} {currentYear}
              </h4>
            </div>

            <button
              id="btn-calendar-next"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-700 bg-white hover:bg-emerald-50 hover:text-emerald-950 transition cursor-pointer"
              title="Bulan Berikutnya"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Calendar Grid Container */}
          <div className="mt-4 flex-1">
            {/* Days header of week */}
            <div className="grid grid-cols-7 text-center font-mono font-bold text-[10px] text-gray-400 uppercase tracking-widest pb-2">
              <span>Min</span>
              <span>Sen</span>
              <span>Sel</span>
              <span>Rab</span>
              <span>Kam</span>
              <span>Jum</span>
              <span>Sab</span>
            </div>

            {/* Days numbers matrix */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((cell, idx) => {
                const dayEvents = getEventsForDate(cell.fullDate);
                const hasEvents = dayEvents.length > 0;
                const isCurrentMonth = cell.type === 'current';
                
                // If it has multiple events, we take the color of the first one
                const mainCategory = hasEvents ? dayEvents[0].category : null;
                const meta = mainCategory ? CATEGORY_META[mainCategory] : null;

                return (
                  <div
                    key={idx}
                    className={`h-9 relative rounded-lg flex flex-col items-center justify-center border transition-all text-xs select-none ${
                      isCurrentMonth 
                        ? 'bg-white border-gray-105 hover:bg-emerald-50/50' 
                        : 'bg-gray-100/40 border-transparent text-gray-300'
                    } ${hasEvents ? 'font-black' : ''}`}
                    title={
                      hasEvents 
                        ? `${cell.fullDate} (${dayEvents.length} Acara): ${dayEvents.map(e => e.title).join(', ')}` 
                        : cell.fullDate
                    }
                  >
                    {/* Day number */}
                    <span className={`${isCurrentMonth ? 'text-gray-800' : 'text-gray-300'}`}>
                      {cell.day}
                    </span>

                    {/* Dot Indicator for Events inside the specific day */}
                    {hasEvents && (
                      <div className="absolute bottom-1 flex gap-0.5 justify-center">
                        {dayEvents.map((e, index) => {
                          const evMeta = CATEGORY_META[e.category];
                          return (
                            <span 
                              key={index}
                              className={`h-1.5 w-1.5 rounded-full ${evMeta?.dotColor || 'bg-emerald-800'}`} 
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend instructions */}
          <div className="mt-5 pt-4 border-t border-gray-100 text-[10px] space-y-1.5">
            <span className="font-extrabold uppercase text-gray-400 block tracking-wider">Keterangan Warna Mandatori</span>
            <div className="grid grid-cols-2 gap-1.5 font-medium text-gray-600">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                <span>Ujian Akademik</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                <span>Libur Santri</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-600 shrink-0" />
                <span>Kegiatan Pondok</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-teal-500 shrink-0" />
                <span>PCSB & Penerimaan</span>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: TIMELINE TIMED LIST OF EVENTS (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
          
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <h4 className="font-extrabold text-xs text-emerald-950 uppercase tracking-widest font-mono">
              Daftar Agenda Terjadwal ({MONTH_NAMES[selectedMonthIdx]})
            </h4>
            <span className="bg-[#f2faf6] border border-emerald-100 px-2 py-0.5 rounded text-emerald-800 text-[9px] font-mono font-bold">
              {filteredEvents.length} Agenda Ditemukan
            </span>
          </div>

          {/* Events Scroll list */}
          <div className="space-y-4 max-h-[380px] overflow-y-auto pr-2 scrollbar-thin">
            {filteredEvents.length === 0 ? (
              <div className="py-12 text-center rounded-2xl bg-gray-50/50 border border-dashed border-gray-200 p-8 flex flex-col items-center justify-center space-y-2 text-xs">
                <span className="text-2xl">💤</span>
                <p className="text-gray-400 font-bold">Tidak ada agenda besar pesantren di bulan ini.</p>
                <p className="text-[10px] text-gray-400 max-w-sm">Coba navigasikan bulan di atas (e.g., Juni atau Desember) atau hilangkan filter kategori untuk melihat agenda yang sedia ada.</p>
              </div>
            ) : (
              filteredEvents.map(evt => {
                const meta = CATEGORY_META[evt.category];
                const status = getEventStatus(evt);
                
                return (
                  <div 
                    key={evt.id} 
                    id={`calendar-event-${evt.id}`}
                    className="group bg-white hover:bg-gray-50/40 p-4 rounded-xl border border-gray-105 shadow-sm hover:shadow-md transition duration-200 flex flex-col sm:flex-row items-start justify-between gap-4 text-left"
                  >
                    <div className="space-y-2">
                      {/* Event category, Dates, Countdown */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2.5 py-0.5 text-[9px] font-extrabold uppercase rounded shadow-sm tracking-wider ${meta?.bgColor}`}>
                          {meta?.label}
                        </span>
                        
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black tracking-wide ${status.color}`}>
                          {status.label}
                        </span>
                      </div>

                      {/* Event Title */}
                      <strong className="text-emerald-950 font-sans text-sm font-black tracking-tight leading-tight block group-hover:text-emerald-900 transition">
                        {evt.title}
                      </strong>

                      {/* Description text */}
                      <p className="text-gray-600 text-[11px] leading-relaxed max-w-xl font-medium">
                        {evt.description}
                      </p>

                      {/* Location or detail pointers */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-[10px] text-gray-450 text-gray-500 font-medium">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-emerald-800" />
                          Tanggal: <strong>{formatDateFriendly(evt.startDate, evt.endDate)}</strong>
                        </span>
                        {evt.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-emerald-800" />
                            Lokasi: <strong>{evt.location}</strong>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>

      </div>

      {/* Konfirmasi agenda bulan selanjutnya */}
      <div className="border-t border-dashed border-emerald-100 pt-4 mt-2 text-center">
        <p className="text-xs font-bold text-emerald-800 flex items-center justify-center gap-1.5 bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100/50 w-max mx-auto">
          <CalendarIcon className="h-4 w-4 text-emerald-700 animate-pulse" />
          Konfirmasi agenda bulan selanjutnya
        </p>
      </div>

    </div>
  );
}
