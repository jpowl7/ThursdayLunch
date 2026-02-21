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

  const [fromMinutes, setFromMinutes] = useState(
    availableFrom ? timeToMinutes(availableFrom) : minMinutes
  );
  const [toMinutes, setToMinutes] = useState(
    availableTo ? timeToMinutes(availableTo) : maxMinutes
  );

  // Track whether user is actively dragging to avoid SSE overwriting
  const isDragging = useRef(false);

  // Sync with prop changes (e.g., from SSE) when not dragging
  useEffect(() => {
    if (isDragging.current) return;
    const newFrom = availableFrom ? timeToMinutes(availableFrom) : minMinutes;
    const newTo = availableTo ? timeToMinutes(availableTo) : maxMinutes;
    setFromMinutes(newFrom);
    setToMinutes(newTo);
  }, [availableFrom, availableTo, minMinutes, maxMinutes]);

  const handleFromChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = Number(e.target.value);
      const clamped = Math.min(val, toMinutes - 15);
      setFromMinutes(clamped);
      onChange(minutesToTime(clamped), minutesToTime(toMinutes));
    },
    [toMinutes, onChange]
  );

  const handleToChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = Number(e.target.value);
      const clamped = Math.max(val, fromMinutes + 15);
      setToMinutes(clamped);
      onChange(minutesToTime(fromMinutes), minutesToTime(clamped));
    },
    [fromMinutes, onChange]
  );

  const handlePointerDown = () => {
    isDragging.current = true;
  };

  const handlePointerUp = () => {
    isDragging.current = false;
  };

  const rangePercent = {
    left: ((fromMinutes - minMinutes) / (maxMinutes - minMinutes)) * 100,
    width: ((toMinutes - fromMinutes) / (maxMinutes - minMinutes)) * 100,
  };

  // Determine which slider should be on top based on thumb positions
  const midpoint = (minMinutes + maxMinutes) / 2;
  const fromOnTop = fromMinutes > midpoint;

  return (
    <div className="space-y-3">
      <div className="flex justify-between text-sm font-medium">
        <span>Available: {formatTime(minutesToTime(fromMinutes))}</span>
        <span>to {formatTime(minutesToTime(toMinutes))}</span>
      </div>
      <div className="relative h-8">
        <div className="absolute inset-0 top-3 h-2 bg-gray-200 rounded-full" />
        <div
          className="absolute top-3 h-2 bg-orange-400 rounded-full"
          style={{ left: `${rangePercent.left}%`, width: `${rangePercent.width}%` }}
        />
        <input
          type="range"
          min={minMinutes}
          max={maxMinutes}
          step={15}
          value={fromMinutes}
          onChange={handleFromChange}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          disabled={disabled}
          className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-orange-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:relative"
          style={{ zIndex: fromOnTop ? 4 : 3 }}
        />
        <input
          type="range"
          min={minMinutes}
          max={maxMinutes}
          step={15}
          value={toMinutes}
          onChange={handleToChange}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          disabled={disabled}
          className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-orange-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:relative"
          style={{ zIndex: fromOnTop ? 3 : 4 }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{formatTime(earliestTime)}</span>
        <span>{formatTime(latestTime)}</span>
      </div>
    </div>
  );
}
