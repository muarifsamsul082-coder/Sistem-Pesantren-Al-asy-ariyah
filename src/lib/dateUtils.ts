/**
 * Date utility functions for Pesantren Portal and PPDB schedules
 */

export function formatIndonesianDate(dateStr?: string): string {
  if (!dateStr || !dateStr.trim()) return '';
  try {
    const parts = dateStr.trim().split('-');
    if (parts.length !== 3) return dateStr;
    const year = parts[0];
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const monthName = months[month - 1] || parts[1];
    return `${day} ${monthName} ${year}`;
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

export function autoAdjustPpdbSettings<T extends { ppdbOpen?: boolean; ppdbEndDate?: string }>(settings: T): T {
  if (!settings) return settings;
  const todayStr = getTodayDateString();
  const end = settings.ppdbEndDate?.trim() || '';
  if (end && todayStr > end && settings.ppdbOpen) {
    return { ...settings, ppdbOpen: false };
  }
  return settings;
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
  const end = settings.ppdbEndDate?.trim() || '';

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
