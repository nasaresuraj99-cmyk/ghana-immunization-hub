const KEY = "imu_last_full_backup";

/** Record that a full backup (JSON) was just downloaded. */
export function recordBackup(date: Date = new Date()) {
  try {
    localStorage.setItem(KEY, date.toISOString());
  } catch {
    /* storage unavailable - ignore */
  }
}

export function getLastBackupDate(): Date | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

/** Whole days since the last full backup, or null when never backed up. */
export function daysSinceBackup(): number | null {
  const last = getLastBackupDate();
  if (!last) return null;
  return Math.floor((Date.now() - last.getTime()) / 86400000);
}

export const BACKUP_REMINDER_DAYS = 7;
