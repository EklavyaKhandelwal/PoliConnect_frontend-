import { useCallback, useRef, useState, type TouchEvent } from "react";

const REFRESH_THRESHOLD = 56;

export function usePullToRefresh(refresh: () => Promise<void>, blocked: boolean) {
  const startY = useRef<number | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const onTouchStart = useCallback((event: TouchEvent<HTMLElement>) => {
    if (blocked || refreshing || window.scrollY > 0) {
      startY.current = null;
      return;
    }
    startY.current = event.touches[0]?.clientY ?? null;
  }, [blocked, refreshing]);

  const onTouchMove = useCallback((event: TouchEvent<HTMLElement>) => {
    if (startY.current === null || blocked || refreshing) return;
    const currentY = event.touches[0]?.clientY;
    if (currentY === undefined) return;
    setPullDistance(Math.min(Math.max(0, currentY - startY.current) * 0.6, 64));
  }, [blocked, refreshing]);

  const finishPull = useCallback(() => {
    const shouldRefresh = pullDistance >= REFRESH_THRESHOLD && !blocked && !refreshing;
    startY.current = null;
    setPullDistance(0);
    if (!shouldRefresh) return;
    setRefreshing(true);
    void refresh().finally(() => setRefreshing(false));
  }, [blocked, pullDistance, refreshing, refresh]);

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd: finishPull,
    onTouchCancel: finishPull,
    pullDistance,
    refreshing,
  };
}
