"use client";

import { useState, useCallback, useEffect, useRef } from "react";

interface TimeRangeSliderProps {
  earliestTime: string;
  latestTime: string;
  availableFrom: string | null;
  availableTo: string | null;
  onChange: (from: string, to: string) => void;
  disabled?: boolean;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${displayH}:${m.toString().padStart(2, "0")} ${period}`;
}

export function TimeRangeSlider({
  earliestTime,
  latestTime,
  availableFrom,
  availableTo,
  onChange,
  disabled,
}: TimeRangeSliderProps) {
  const minMinutes = timeToMinutes(earliestTime);
  const maxMinutes = timeToMinutes(latestTime);
  const trackRef = useRef<HTMLDivElement>(null);

  const [fromMinutes, setFromMinutes] = useState(
    availableFrom ? timeToMinutes(availableFrom) : minMinutes
  );
  const [toMinutes, setToMinutes] = useState(
    availableTo ? timeToMinutes(availableTo) : maxMinutes
  );
  const [dragging, setDragging] = useState<"from" | "to" | null>(null);

  // Sync with prop changes (e.g., from SSE) when not dragging
  useEffect(() => {
    if (dragging) return;
    const newFrom = availableFrom ? timeToMinutes(availableFrom) : minMinutes;
    const newTo = availableTo ? timeToMinutes(availableTo) : maxMinutes;
    setFromMinutes(newFrom);
    setToMinutes(newTo);
  }, [availableFrom, availableTo, minMinutes, maxMinutes, dragging]);

  const pctFromValue = (val: number) =>
    ((val - minMinutes) / (maxMinutes - minMinutes)) * 100;

  const valueFromClientX = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return minMinutes;
      const rect = trackRef.current.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const raw = minMinutes + pct * (maxMinutes - minMinutes);
      return Math.round(raw / 15) * 15; // snap to 15min
    },
    [minMinutes, maxMinutes]
  );

  const handlePointerDown = useCallback(
    (handle: "from" | "to") => (e: React.PointerEvent) => {
      if (disabled) return;
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setDragging(handle);
    },
    [disabled]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      const val = valueFromClientX(e.clientX);
      if (dragging === "from") {
        const clamped = Math.min(val, toMinutes - 15);
        setFromMinutes(Math.max(minMinutes, clamped));
      } else {
        const clamped = Math.max(val, fromMinutes + 15);
        setToMinutes(Math.min(maxMinutes, clamped));
      }
    },
    [dragging, valueFromClientX, fromMinutes, toMinutes, minMinutes, maxMinutes]
  );

  const handlePointerUp = useCallback(() => {
    if (dragging) {
      onChange(minutesToTime(fromMinutes), minutesToTime(toMinutes));
      setDragging(null);
    }
  }, [dragging, fromMinutes, toMinutes, onChange]);

  const leftPct = pctFromValue(fromMinutes);
  const rightPct = 100 - pctFromValue(toMinutes);

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-bold flex items-center gap-2">
        <span className="material-symbols-outlined text-orange-500">schedule</span>
        When can you go?
      </h3>
      <div className="bg-white rounded-xl px-4 py-3 shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-3">
          <div className="text-center">
            <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5 tracking-widest">Earliest</p>
            <p className="text-orange-500 font-bold text-sm">{formatTime(minutesToTime(fromMinutes))}</p>
          </div>
          <div className="h-6 w-px bg-slate-100" />
          <div className="text-center">
            <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5 tracking-widest">Latest</p>
            <p className="text-orange-500 font-bold text-sm">{formatTime(minutesToTime(toMinutes))}</p>
          </div>
        </div>

        {/* Custom slider track */}
        <div
          ref={trackRef}
          className="relative h-8 flex items-center select-none touch-none"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {/* Background track */}
          <div className="absolute left-0 right-0 h-1.5 bg-slate-100 rounded-full" />

          {/* Active range track */}
          <div
            className="absolute h-1.5 bg-orange-500 rounded-full"
            style={{ left: `${leftPct}%`, right: `${rightPct}%` }}
          />

          {/* From handle */}
          <div
            className={`absolute -translate-x-1/2 size-6 bg-white border-2 border-orange-500 rounded-full shadow-md cursor-pointer flex items-center justify-center transition-shadow ${
              dragging === "from" ? "shadow-orange-500/30 scale-110" : ""
            }`}
            style={{ left: `${leftPct}%` }}
            onPointerDown={handlePointerDown("from")}
          >
            <div className="size-1.5 bg-orange-500 rounded-full" />
          </div>

          {/* To handle */}
          <div
            className={`absolute -translate-x-1/2 size-6 bg-white border-2 border-orange-500 rounded-full shadow-md cursor-pointer flex items-center justify-center transition-shadow ${
              dragging === "to" ? "shadow-orange-500/30 scale-110" : ""
            }`}
            style={{ left: `${100 - rightPct}%` }}
            onPointerDown={handlePointerDown("to")}
          >
            <div className="size-1.5 bg-orange-500 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
