import { useEffect, useState } from 'react';

/**
 * Hook that ensures loading state displays for a minimum duration
 * to prevent skeleton flashing on fast connections
 * 
 * @param isLoading - The actual loading state from React Query or other source
 * @param minimumTime - Minimum time in milliseconds to display loading state (default: 200ms)
 * @returns Extended loading state that stays true for at least minimumTime
 */
export function useMinimumLoadingTime(
  isLoading: boolean,
  minimumTime: number = 200
): boolean {
  const [isMinimumLoading, setIsMinimumLoading] = useState(isLoading);
  const [loadingStartTime, setLoadingStartTime] = useState<number | null>(null);

  useEffect(() => {
    // When loading starts, record the start time
    if (isLoading && !loadingStartTime) {
      setLoadingStartTime(Date.now());
      setIsMinimumLoading(true);
    }

    // When loading finishes, check if minimum time has elapsed
    if (!isLoading && loadingStartTime) {
      const elapsedTime = Date.now() - loadingStartTime;
      const remainingTime = minimumTime - elapsedTime;

      if (remainingTime > 0) {
        // Keep showing loading for the remaining time
        const timer = setTimeout(() => {
          setIsMinimumLoading(false);
          setLoadingStartTime(null);
        }, remainingTime);

        return () => clearTimeout(timer);
      } else {
        // Minimum time already elapsed, stop loading immediately
        setIsMinimumLoading(false);
        setLoadingStartTime(null);
      }
    }
  }, [isLoading, loadingStartTime, minimumTime]);

  return isMinimumLoading;
}
