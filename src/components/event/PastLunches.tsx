"use client";

import { useState, useEffect } from "react";

interface PastLunch {
  id: string;
  date: string;
  chosenTime: string | null;
  locationName: string | null;
  locationAddress: string | null;
  locationMapsUrl: string | null;
  attendees: string[];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatTime(time: string | null): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${displayH}:${m.toString().padStart(2, "0")} ${period}`;
}

export function PastLunches({ groupSlug }: { groupSlug: string }) {
  const [lunches, setLunches] = useState<PastLunch[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch(`/api/lunches?group=${encodeURIComponent(groupSlug)}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        setLunches(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [groupSlug]);

  if (loading || lunches.length === 0) return null;

  const visible = expanded ? lunches : lunches.slice(0, 3);

  return (
    <div className="bg-white rounded-xl border border-orange-500/10 shadow-sm">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between w-full p-4"
      >
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-orange-500 text-[20px]">history</span>
          Past Lunches
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">
            {lunches.length} {lunches.length === 1 ? "lunch" : "lunches"}
          </span>
          <span className={`material-symbols-outlined text-slate-400 text-[20px] transition-transform ${open ? "rotate-180" : ""}`}>
            expand_more
          </span>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-2">
          {visible.map((lunch) => (
            <div
              key={lunch.id}
              className="bg-slate-50 rounded-xl p-3 border border-slate-100"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-orange-500">{formatDate(lunch.date)}</span>
                    {lunch.chosenTime && (
                      <span className="text-xs text-slate-400">{formatTime(lunch.chosenTime)}</span>
                    )}
                  </div>
                  <p className="font-semibold text-sm mt-0.5 truncate">
                    {lunch.locationName || "Unknown venue"}
                  </p>
                  {lunch.locationAddress && (
                    <p className="text-[11px] text-slate-400 truncate">{lunch.locationAddress}</p>
                  )}
                </div>
                {lunch.locationMapsUrl && (
                  <a
                    href={lunch.locationMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 text-[10px] text-blue-500 hover:underline uppercase tracking-wider font-bold mt-1"
                  >
                    Map
                  </a>
                )}
              </div>
              {lunch.attendees.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {lunch.attendees.map((name, i) => (
                    <span
                      key={i}
                      className="inline-block px-2 py-0.5 text-[11px] font-medium bg-slate-50 text-slate-500 rounded-full"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}

          {lunches.length > 3 && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="w-full py-2 text-xs font-semibold text-slate-400 hover:text-orange-500 transition-colors"
            >
              {expanded ? "Show less" : `Show ${lunches.length - 3} more`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
