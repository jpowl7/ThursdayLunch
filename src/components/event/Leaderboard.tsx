"use client";

import { useState, useEffect } from "react";
import type { LeaderboardData, LeaderboardEntry } from "@/types";

function rankLabel(index: number): string {
  if (index === 0) return "🥇";
  if (index === 1) return "🥈";
  if (index === 2) return "🥉";
  return `${index + 1}`;
}

function LeaderboardSection({
  title,
  icon,
  description,
  entries,
  participantKey,
  unit,
}: {
  title: string;
  icon: string;
  description: string;
  entries: LeaderboardEntry[];
  participantKey: string | null;
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
          const isYou = entry.participantKey === participantKey;
          return (
            <div
              key={entry.participantKey}
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

export function Leaderboard({ participantKey }: { participantKey: string | null }) {
  const [data, setData] = useState<LeaderboardData | null>(null);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => setData(json))
      .catch(() => {});
  }, []);

  if (!data || data.totalEvents === 0) return null;

  return (
    <div className="bg-white rounded-xl p-4 border border-orange-500/10 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-orange-500 text-[20px]">
            leaderboard
          </span>
          Leaderboard
        </h2>
        <span className="text-xs text-slate-400">
          {data.totalEvents} {data.totalEvents === 1 ? "lunch" : "lunches"}
        </span>
      </div>

      <LeaderboardSection
        title="Most Loyal Luncher"
        icon="loyalty"
        description="Most lunches attended across all events"
        entries={data.attendance}
        participantKey={participantKey}
        unit="lunches"
      />
      <LeaderboardSection
        title="Perfect Attendance"
        icon="local_fire_department"
        description="Consecutive lunches attended in a row"
        entries={data.streaks}
        participantKey={participantKey}
        unit="streak"
      />
      <LeaderboardSection
        title="Tastemaker"
        icon="star"
        description="Top pick matched the final venue choice"
        entries={data.tastemaker}
        participantKey={participantKey}
        unit="picks"
      />
      <LeaderboardSection
        title="First Responder"
        icon="bolt"
        description="First person to RSVP for an event"
        entries={data.firstResponder}
        participantKey={participantKey}
        unit="wins"
      />
      <LeaderboardSection
        title="Speed Demon"
        icon="speed"
        description="Responded within 5 minutes of event creation"
        entries={data.speedDemon}
        participantKey={participantKey}
        unit="times"
      />
      <LeaderboardSection
        title="Fashionably Late"
        icon="schedule"
        description="Last person to RSVP for a finalized event"
        entries={data.fashionablyLate}
        participantKey={participantKey}
        unit="times"
      />
      <LeaderboardSection
        title="Trendsetter"
        icon="trending_up"
        description="First to vote for the winning restaurant"
        entries={data.trendsetter}
        participantKey={participantKey}
        unit="wins"
      />
    </div>
  );
}
