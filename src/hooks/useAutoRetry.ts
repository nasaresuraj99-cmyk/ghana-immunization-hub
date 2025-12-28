import { useState, useCallback, useRef, useEffect } from 'react';

interface RetryConfig {
  maxRetries: number;
  baseDelay: number; // in milliseconds
  maxDelay: number; // maximum delay cap
  backoffMultiplier: number;
}

interface RetryState {
  retryCount: number;
  isRetrying: boolean;
  nextRetryAt: Date | null;
  lastError: string | null;
}

const DEFAULT_CONFIG: RetryConfig = {
  maxRetries: 5,
  baseDelay: 1000, // 1 second
  maxDelay: 60000, // 1 minute max
  backoffMultiplier: 2,
};

export function useAutoRetry(
  syncFn: () => Promise<{ success: boolean; error?: string }>,
  config: Partial<RetryConfig> = {}
) {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  
  const [state, setState] = useState<RetryState>({
    retryCount: 0,
    isRetrying: false,
    nextRetryAt: null,
    lastError: null,
  });

  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isOnlineRef = useRef(navigator.onLine);

  // Calculate delay with exponential backoff
  const calculateDelay = useCallback((retryCount: number): number => {
    const delay = fullConfig.baseDelay * Math.pow(fullConfig.backoffMultiplier, retryCount);
    // Add jitter (±10%) to prevent thundering herd
    const jitter = delay * 0.1 * (Math.random() * 2 - 1);
    return Math.min(delay + jitter, fullConfig.maxDelay);
  }, [fullConfig]);

  // Schedule a retry
  const scheduleRetry = useCallback(() => {
    if (state.retryCount >= fullConfig.maxRetries) {
      console.log('Max retries reached, stopping auto-retry');
      return;
    }

    if (!isOnlineRef.current) {
      console.log('Offline, waiting for connection before retry');
      return;
    }

    const delay = calculateDelay(state.retryCount);
    const nextRetryAt = new Date(Date.now() + delay);

    setState(prev => ({
      ...prev,
      nextRetryAt,
      isRetrying: true,
    }));

    console.log(`Scheduling retry ${state.retryCount + 1}/${fullConfig.maxRetries} in ${Math.round(delay / 1000)}s`);

    retryTimeoutRef.current = setTimeout(async () => {
      try {
        const result = await syncFn();
        
        if (result.success) {
          // Success! Reset retry state
          setState({
            retryCount: 0,
            isRetrying: false,
            nextRetryAt: null,
            lastError: null,
          });
        } else {
          // Failed, increment retry count and schedule next
          setState(prev => ({
            ...prev,
            retryCount: prev.retryCount + 1,
            lastError: result.error || 'Sync failed',
          }));
        }
      } catch (error) {
        setState(prev => ({
          ...prev,
          retryCount: prev.retryCount + 1,
          lastError: error instanceof Error ? error.message : 'Unknown error',
        }));
      }
    }, delay);
  }, [state.retryCount, fullConfig.maxRetries, calculateDelay, syncFn]);

  // Effect to handle retry scheduling when retry count changes
  useEffect(() => {
    if (state.retryCount > 0 && state.retryCount < fullConfig.maxRetries && isOnlineRef.current) {
      scheduleRetry();
    }
  }, [state.retryCount, fullConfig.maxRetries, scheduleRetry]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      isOnlineRef.current = true;
      // If we have pending retries, schedule one
      if (state.lastError && state.retryCount < fullConfig.maxRetries) {
        scheduleRetry();
      }
    };

    const handleOffline = () => {
      isOnlineRef.current = false;
      // Clear any pending retry
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      setState(prev => ({
        ...prev,
        isRetrying: false,
        nextRetryAt: null,
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [state.lastError, state.retryCount, fullConfig.maxRetries, scheduleRetry]);

  // Trigger a retry after a failed sync
  const triggerRetry = useCallback(() => {
    if (state.retryCount < fullConfig.maxRetries) {
      scheduleRetry();
    }
  }, [state.retryCount, fullConfig.maxRetries, scheduleRetry]);

  // Reset retry state (call after successful sync)
  const resetRetry = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    setState({
      retryCount: 0,
      isRetrying: false,
      nextRetryAt: null,
      lastError: null,
    });
  }, []);

  // Record a failed sync attempt
  const recordFailure = useCallback((error: string) => {
    setState(prev => ({
      ...prev,
      retryCount: prev.retryCount + 1,
      lastError: error,
    }));
  }, []);

  // Get time until next retry
  const getTimeUntilRetry = useCallback((): number | null => {
    if (!state.nextRetryAt) return null;
    return Math.max(0, state.nextRetryAt.getTime() - Date.now());
  }, [state.nextRetryAt]);

  return {
    retryCount: state.retryCount,
    maxRetries: fullConfig.maxRetries,
    isRetrying: state.isRetrying,
    nextRetryAt: state.nextRetryAt,
    lastError: state.lastError,
    hasReachedMaxRetries: state.retryCount >= fullConfig.maxRetries,
    triggerRetry,
    resetRetry,
    recordFailure,
    getTimeUntilRetry,
  };
}
