import { useState, useEffect } from 'react';
import { RefreshCw, AlertTriangle, Clock, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface AutoRetryIndicatorProps {
  retryCount: number;
  maxRetries: number;
  isRetrying: boolean;
  nextRetryAt: Date | null;
  lastError: string | null;
  hasReachedMaxRetries: boolean;
  onManualRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function AutoRetryIndicator({
  retryCount,
  maxRetries,
  isRetrying,
  nextRetryAt,
  lastError,
  hasReachedMaxRetries,
  onManualRetry,
  onDismiss,
  className,
}: AutoRetryIndicatorProps) {
  const [timeUntilRetry, setTimeUntilRetry] = useState<number>(0);

  // Update countdown timer
  useEffect(() => {
    if (!nextRetryAt) {
      setTimeUntilRetry(0);
      return;
    }

    const updateTimer = () => {
      const remaining = Math.max(0, nextRetryAt.getTime() - Date.now());
      setTimeUntilRetry(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [nextRetryAt]);

  // Don't show if no retries needed
  if (retryCount === 0 && !isRetrying && !hasReachedMaxRetries) {
    return null;
  }

  const formatTime = (ms: number): string => {
    const seconds = Math.ceil(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-lg border transition-all',
        hasReachedMaxRetries
          ? 'bg-destructive/10 border-destructive/30 text-destructive'
          : isRetrying
          ? 'bg-info/10 border-info/30 text-info'
          : 'bg-warning/10 border-warning/30 text-warning',
        className
      )}
    >
      {/* Icon */}
      <div className="flex-shrink-0">
        {hasReachedMaxRetries ? (
          <XCircle className="w-5 h-5" />
        ) : isRetrying ? (
          <RefreshCw className="w-5 h-5 animate-spin" />
        ) : (
          <Clock className="w-5 h-5" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-sm font-medium">
            {hasReachedMaxRetries
              ? 'Sync failed - Max retries reached'
              : isRetrying
              ? 'Retrying sync...'
              : `Retry ${retryCount}/${maxRetries} scheduled`}
          </span>
          {!hasReachedMaxRetries && nextRetryAt && timeUntilRetry > 0 && (
            <span className="text-xs opacity-80">
              in {formatTime(timeUntilRetry)}
            </span>
          )}
        </div>

        {/* Progress bar for retries */}
        {!hasReachedMaxRetries && retryCount > 0 && (
          <Progress
            value={(retryCount / maxRetries) * 100}
            className="h-1.5 mt-1"
          />
        )}

        {/* Error message */}
        {lastError && (
          <p className="text-xs opacity-80 mt-1 truncate">
            {lastError}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {hasReachedMaxRetries && onManualRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onManualRetry}
            className="h-7 text-xs border-current hover:bg-current/10"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Retry now
          </Button>
        )}
        {onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="h-7 px-2 text-xs hover:bg-current/10"
          >
            Dismiss
          </Button>
        )}
      </div>
    </div>
  );
}
