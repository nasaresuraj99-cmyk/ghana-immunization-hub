import { ShieldAlert, ShieldCheck } from "lucide-react";
import { BACKUP_REMINDER_DAYS, daysSinceBackup, getLastBackupDate } from "@/lib/backupReminder";
import { formatDate } from "@/lib/utils";

interface BackupReminderProps {
  /** Number of records currently stored - no reminder shown when empty. */
  recordCount: number;
}

export function BackupReminder({ recordCount }: BackupReminderProps) {
  if (recordCount === 0) return null;

  const days = daysSinceBackup();
  const last = getLastBackupDate();
  const overdue = days === null || days >= BACKUP_REMINDER_DAYS;

  if (!overdue) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="text-sm text-muted-foreground">
          Last full backup: <span className="font-medium text-foreground">{last ? formatDate(last.toISOString()) : "-"}</span>
          {days === 0 ? " (today)" : ` (${days} day${days === 1 ? "" : "s"} ago)`}
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
      <p className="text-sm text-foreground">
        {days === null
          ? "You have never saved a full backup. Download one now to keep the records safe."
          : `Your last full backup was ${days} days ago (${last ? formatDate(last.toISOString()) : "-"}). Download a new one.`}
      </p>
    </div>
  );
}
