"use client";

import { useState, useRef, useCallback, useEffect } from "react";

const THRESHOLD = 80;
const MAX_PULL = 120;

export function PullToRefresh({ children }: { children: React.ReactNode }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);

  const isAtTop = useCallback(() => {
    return window.scrollY <= 0;
  }, []);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (refreshing) return;
      if (isAtTop()) {
        startY.current = e.touches[0].clientY;
        pulling.current = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!pulling.current || refreshing) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy > 0 && isAtTop()) {
        // Apply resistance — diminishing returns as you pull further
        const distance = Math.min(dy * 0.4, MAX_PULL);
        setPullDistance(distance);
      } else {
        pulling.current = false;
        setPullDistance(0);
      }
    };

    const handleTouchEnd = () => {
      if (!pulling.current) return;
      pulling.current = false;
      if (pullDistance >= THRESHOLD) {
        setRefreshing(true);
        setPullDistance(THRESHOLD * 0.5);
        window.location.reload();
      } else {
        setPullDistance(0);
      }
    };

    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: true });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [pullDistance, refreshing, isAtTop]);

  const progress = Math.min(pullDistance / THRESHOLD, 1);

  return (
    <>
      {pullDistance > 0 && (
        <div
          className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none"
          style={{ height: pullDistance }}
        >
          <div
            className="mt-2 w-8 h-8 flex items-center justify-center"
            style={{
              opacity: progress,
              transform: `rotate(${progress * 360}deg)`,
            }}
          >
            <span
              className={`material-symbols-outlined text-orange-500 text-[24px] ${refreshing ? "animate-spin" : ""}`}
            >
              refresh
            </span>
          </div>
        </div>
      )}
      <div
        style={{
          transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined,
          transition: pulling.current ? "none" : "transform 0.2s ease-out",
        }}
      >
        {children}
      </div>
    </>
  );
}
