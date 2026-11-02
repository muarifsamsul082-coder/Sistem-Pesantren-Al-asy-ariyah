/**
 * Date utility functions for Pesantren Portal and PPDB schedules
 */

/**
 * Normalizes any date string into standard ISO 'YYYY-MM-DD'
 * Handles:
 * - 'YYYY-MM-DD' -> 'YYYY-MM-DD'
 * - 'DD-MM-YYYY' or 'DD/MM/YYYY' -> 'YYYY-MM-DD'
 * - 'YYYY/MM/DD' -> 'YYYY-MM-DD'
 * - ISO string with time '2026-10-20T...' -> '2026-10-20'
 */
export function normalizeDateToYMD(dateStr?: string): string {
  if (!dateStr || !dateStr.trim()) return '';
  const clean = dateStr.trim();
  
  // Cut time if present
  const withoutTime = clean.split('T')[0].split(' ')[0];

  // Pattern DD-MM-YYYY or DD/MM/YYYY (Day 1-31, Month 1-12, Year 4 digits)
  const dmyMatch = withoutTime.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Pattern YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = withoutTime.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return withoutTime;
}

export function formatIndonesianDate(dateStr?: string): string {
  if (!dateStr || !dateStr.trim()) return '';
  try {
    const normalized = normalizeDateToYMD(dateStr);
    const parts = normalized.split('-');
    if (parts.length !== 3) return dateStr;
    const year = parts[0];
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const monthName = months[month - 1] || parts[1];
    if (!isNaN(day) && monthName && year) {
      return `${day} ${monthName} ${year}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

export interface PpdbActiveStatus {
  isActive: boolean;
  statusText: string;
  badgeText: string;
  unifiedNoticeText: string;
  reason: 'closed_manual' | 'not_started' | 'ended' | 'active';
  periodDetail: string;
  scheduleRangeText?: string;
  startDateFormatted?: string;
  endDateFormatted?: string;
}

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Checks if a given date string is more than 30 days / 1 month before current date
 */
export function isDateMoreThanOneMonthAgo(dateStr?: string): boolean {
  if (!dateStr || !dateStr.trim()) return false;
  try {
    const normalized = normalizeDateToYMD(dateStr);
    const targetDate = new Date(`${normalized}T00:00:00`);
    if (isNaN(targetDate.getTime())) return false;
    const now = new Date();
    const diffMs = now.getTime() - targetDate.getTime();
    const oneMonthMs = 30 * 24 * 60 * 60 * 1000;
    return diffMs > oneMonthMs;
  } catch {
    return false;
  }
}

/**
 * Ensures PPDB settings preserve user-configured start and end dates.
 * Tanggal pendaftaran ditutup dihapus jika tanggal sudah melewati satu bulan pada tanggal berjalan.
 */
export function autoAdjustPpdbSettings<T extends { ppdbOpen?: boolean; ppdbStartDate?: string; ppdbEndDate?: string }>(settings: T): T {
  if (!settings) return settings;
  const start = settings.ppdbStartDate ? normalizeDateToYMD(settings.ppdbStartDate) : '';
  let end = settings.ppdbEndDate ? normalizeDateToYMD(settings.ppdbEndDate) : '';
  
  // Jika tanggal pendaftaran ditutup sudah melewati 1 bulan dari tanggal sekarang, hapus tanggalnya
  if (end && isDateMoreThanOneMonthAgo(end)) {
    end = '';
  }

  return {
    ...settings,
    ppdbStartDate: start,
    ppdbEndDate: end,
  };
}

/**
 * Checks whether PPDB is currently open based on the manual toggle
 * and optional start/end dates.
 * If dates are defined:
 *   - today < start_date -> Automatically closed (Not yet open)
 *   - today > end_date -> Automatically closed (Expired/Ended & checkmark cleared)
 *   - start_date <= today <= end_date -> Open
 * If dates are empty, it relies purely on ppdbOpen boolean flag.
 */
export function isPpdbCurrentlyActive(settings?: {
  ppdbOpen?: boolean;
  ppdbStartDate?: string;
  ppdbEndDate?: string;
}): PpdbActiveStatus {
  if (!settings || settings.ppdbOpen === false) {
    return {
      isActive: false,
      statusText: 'Penerimaan Calon Santri Baru saat ini sedang ditutup oleh panitia.',
      badgeText: 'Pendaftaran Ditutup',
      unifiedNoticeText: 'Pendaftaran Calon Santri Baru Sedang Ditutup',
      reason: 'closed_manual',
      periodDetail: 'Jalur pendaftaran online sedang dinonaktifkan oleh panitia.',
    };
  }

  const start = settings.ppdbStartDate?.trim() || '';
  let end = settings.ppdbEndDate?.trim() || '';

  // Tanggal pada pendaftaran ditutup dihapus jika tanggal sudah melewati satu bulan pada tanggal berjalan
  if (end && isDateMoreThanOneMonthAgo(end)) {
    end = '';
  }

  const startFormatted = formatIndonesianDate(start);
  const endFormatted = formatIndonesianDate(end);

  // If no date range specified at all, rely on ppdbOpen=true
  if (!start && !end) {
    return {
      isActive: true,
      statusText: 'Penerimaan Calon Santri Baru saat ini sedang dibuka.',
      badgeText: 'Pendaftaran Dibuka',
      unifiedNoticeText: 'Pendaftaran Calon Santri Baru Dibuka',
      reason: 'active',
      periodDetail: 'Pendaftaran online dibuka tanpa batas tanggal khusus.',
      scheduleRangeText: 'Sedang Dibuka',
      startDateFormatted: '',
      endDateFormatted: ''
    };
  }

  const todayStr = getTodayDateString();

  if (start && todayStr < start) {
    return {
      isActive: false,
      statusText: `Pendaftaran belum dibuka. Pendaftaran akan resmi dibuka pada tanggal ${startFormatted}.`,
      badgeText: `Dibuka ${startFormatted}`,
      unifiedNoticeText: `Pendaftaran Calon Santri Baru Belum Dibuka (Mulai ${startFormatted})`,
      reason: 'not_started',
      periodDetail: `Pendaftaran online dimulai pada ${startFormatted}${end ? ` s/d ${endFormatted}` : ''}.`,
      scheduleRangeText: start && end ? `${startFormatted} s/d ${endFormatted}` : `Mulai ${startFormatted}`,
      startDateFormatted: startFormatted,
      endDateFormatted: endFormatted
    };
  }

  if (end && todayStr > end) {
    const isPastOneMonth = isDateMoreThanOneMonthAgo(end);
    if (isPastOneMonth) {
      return {
        isActive: false,
        statusText: 'Penerimaan Calon Santri Baru saat ini sedang ditutup.',
        badgeText: 'Pendaftaran Ditutup',
        unifiedNoticeText: 'Pendaftaran Calon Santri Baru Sedang Ditutup',
        reason: 'ended',
        periodDetail: 'Masa pendaftaran online periode ini sedang ditutup.',
        scheduleRangeText: 'Pendaftaran Ditutup',
        startDateFormatted: '',
        endDateFormatted: ''
      };
    }
    return {
      isActive: false,
      statusText: `Pendaftaran telah resmi berakhir dan ditutup pada tanggal ${endFormatted}.`,
      badgeText: `Ditutup sejak ${endFormatted}`,
      unifiedNoticeText: `Pendaftaran Calon Santri Baru Telah Ditutup (Berakhir ${endFormatted})`,
      reason: 'ended',
      periodDetail: `Masa pendaftaran online periode ini telah berakhir pada ${endFormatted}.`,
      scheduleRangeText: start && end ? `${startFormatted} s/d ${endFormatted}` : `Hingga ${endFormatted}`,
      startDateFormatted: startFormatted,
      endDateFormatted: endFormatted
    };
  }

  const periodDetail = start && end
    ? `${startFormatted} s/d ${endFormatted}`
    : start
    ? `Mulai ${startFormatted}`
    : `Hingga ${endFormatted}`;

  const unifiedNoticeText = start && end
    ? `Pendaftaran Calon Santri Baru Dimulai ${startFormatted} s/d ${endFormatted}`
    : start
    ? `Pendaftaran Calon Santri Baru Dimulai ${startFormatted}`
    : `Pendaftaran Calon Santri Baru Dibuka s/d ${endFormatted}`;

  return {
    isActive: true,
    statusText: `Penerimaan Calon Santri Baru sedang dibuka (${periodDetail}).`,
    badgeText: `Pendaftaran Dibuka (${periodDetail})`,
    unifiedNoticeText,
    reason: 'active',
    periodDetail: `Jadwal aktif pendaftaran: ${periodDetail}`,
    scheduleRangeText: periodDetail,
    startDateFormatted: startFormatted,
    endDateFormatted: endFormatted
  };
}
