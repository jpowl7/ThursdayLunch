"use client";

import { useState, useEffect } from "react";
import type { LeaderboardData, LeaderboardEntry } from "@/types";

function rankLabel(index: number): string {
  if (index === 0) return "\u{1F947}";
  if (index === 1) return "\u{1F948}";
  if (index === 2) return "\u{1F949}";
  return `${index + 1}`;
}

function LeaderboardSection({
  title,
  icon,
  description,
  entries,
  currentName,
  unit,
}: {
  title: string;
  icon: string;
  description: string;
  entries: LeaderboardEntry[];
  currentName: string | null;
  unit: string;
}) {
  if (entries.length === 0) return null;

  return (
    <div>
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-slate-500 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[18px]">{icon}</span>
          {title}
        </h3>
        <p className="text-[11px] text-slate-400 ml-6">{description}</p>
      </div>
      <div className="space-y-1">
        {entries.map((entry, i) => {
          const isYou = currentName != null && entry.name.toLowerCase() === currentName.toLowerCase();
          return (
            <div
              key={entry.name}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
                isYou
                  ? "bg-orange-100 font-semibold text-orange-900"
                  : "text-slate-700"
              }`}
            >
              <span className="w-6 text-center shrink-0">{rankLabel(i)}</span>
              <span className="flex-1 truncate">
                {entry.name}
                {isYou && (
                  <span className="text-orange-500 ml-1 text-xs">(you)</span>
                )}
              </span>
              <span className="text-slate-400 tabular-nums shrink-0">
                {entry.count} {entry.count === 1 ? unit.replace(/(ch|sh|x|s)es$/, "$1").replace(/s$/, "") : unit}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function Leaderboard({ currentName, groupSlug }: { currentName: string | null; groupSlug: string }) {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch(`/api/leaderboard?group=${encodeURIComponent(groupSlug)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => setData(json))
      .catch(() => {});
  }, [groupSlug]);

  if (!data || data.totalEvents === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-orange-500/10 shadow-sm">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between w-full p-4"
      >
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-orange-500 text-[20px]">
            leaderboard
          </span>
          Leaderboard
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">
            {data.totalEvents} {data.totalEvents === 1 ? "lunch" : "lunches"}
          </span>
          <span className={`material-symbols-outlined text-slate-400 text-[20px] transition-transform ${open ? "rotate-180" : ""}`}>
            expand_more
          </span>
        </div>
      </button>

      {open && <div className="px-4 pb-4 space-y-4">
      <LeaderboardSection
        title="Most Loyal Luncher"
        icon="loyalty"
        description="Most lunches attended across all events"
        entries={data.attendance}
        currentName={currentName}
        unit="lunches"
      />
      <LeaderboardSection
        title="Perfect Attendance"
        icon="local_fire_department"
        description="Consecutive lunches attended in a row"
        entries={data.streaks}
        currentName={currentName}
        unit="streak"
      />
      <LeaderboardSection
        title="Tastemaker"
        icon="star"
        description="Top pick matched the final venue choice"
        entries={data.tastemaker}
        currentName={currentName}
        unit="picks"
      />
      <LeaderboardSection
        title="First Responder"
        icon="bolt"
        description="First person to RSVP for an event"
        entries={data.firstResponder}
        currentName={currentName}
        unit="wins"
      />
      <LeaderboardSection
        title="Speed Demon"
        icon="speed"
        description="Responded within 5 minutes of event creation"
        entries={data.speedDemon}
        currentName={currentName}
        unit="times"
      />
      <LeaderboardSection
        title="Fashionably Late"
        icon="schedule"
        description="Last person to RSVP for a finalized event"
        entries={data.fashionablyLate}
        currentName={currentName}
        unit="times"
      />
      <LeaderboardSection
        title="Trendsetter"
        icon="trending_up"
        description="First to vote for the winning restaurant"
        entries={data.trendsetter}
        currentName={currentName}
        unit="wins"
      />
      </div>}
    </div>
  );
}
