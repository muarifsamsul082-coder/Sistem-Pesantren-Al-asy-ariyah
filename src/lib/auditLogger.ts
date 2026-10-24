import { SystemActivityLog } from '../types';

export interface RecordLogParams {
  actorName: string;
  actorRole: 'admin' | 'keamanan' | 'ketertiban' | 'kesehatan' | string;
  actorEmail?: string;
  actionType: string;
  actionTitle?: string;
  description: string;
  targetId?: string;
  targetName?: string;
}

export function recordStaffAuditLog(params: RecordLogParams): SystemActivityLog {
  const now = new Date();
  const timeFormatted = now.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const newLog: SystemActivityLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: timeFormatted,
    adminName: params.actorName,
    actorName: params.actorName,
    actorRole: params.actorRole,
    role: params.actorRole,
    email: params.actorEmail,
    actionType: params.actionType,
    actionTitle: params.actionTitle,
    description: params.description,
    targetId: params.targetId,
    targetName: params.targetName,
    createdAt: now.toISOString()
  };

  try {
    const raw = localStorage.getItem('pesantren_admin_activity_logs');
    const existing: SystemActivityLog[] = raw ? JSON.parse(raw) : [];
    const updated = [newLog, ...(Array.isArray(existing) ? existing : [])].slice(0, 1000);
    localStorage.setItem('pesantren_admin_activity_logs', JSON.stringify(updated));

    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const bc = new BroadcastChannel('pesantren_multi_device_sync');
        bc.postMessage({ type: 'ACTIVITY_LOGS_UPDATED', logs: updated });
        bc.close();
      } catch (e) {}
    }
  } catch (err) {
    console.warn('Gagal menyimpan log audit lokal:', err);
  }

  // Push to server-side persistence asynchronously
  fetch('/api/activity-logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newLog)
  }).catch(() => {});

  // Dispatch custom window event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('pesantren_activity_logged', { detail: newLog }));
  }

  return newLog;
}

export function getStoredAuditLogs(): SystemActivityLog[] {
  try {
    const raw = localStorage.getItem('pesantren_admin_activity_logs');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Error membaca log audit:', e);
  }
  return [];
}
