"use client";

import { useState, useEffect, useCallback, use } from "react";
import { EventHeader } from "@/components/event/EventHeader";
import { CreateEventForm } from "@/components/admin/CreateEventForm";
import { SummaryPanel } from "@/components/admin/SummaryPanel";
import { FinalizeControls } from "@/components/admin/FinalizeControls";
import { FinalizedBanner } from "@/components/event/FinalizedBanner";
import { AttendeeList } from "@/components/event/AttendeeList";
import { useEventStream } from "@/hooks/useEventStream";
import type { EventSnapshot } from "@/types";

interface AdminPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default function AdminPage({ searchParams }: AdminPageProps) {
  const { token } = use(searchParams);
  const [initialSnapshot, setInitialSnapshot] = useState<EventSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/events/current");
      if (res.ok) {
        const data = await res.json();
        setInitialSnapshot(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // Validate token client-side by checking it's not empty
    // Real validation happens on API calls
    if (token) {
      setAuthorized(true);
      fetchData();
    } else {
      setLoading(false);
    }
  }, [token, fetchData]);

  const eventId = initialSnapshot?.event?.id || null;
  const { snapshot: liveSnapshot } = useEventStream(eventId);
  const snapshot = liveSnapshot || initialSnapshot;

  if (!authorized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <span className="material-symbols-outlined text-slate-300 text-[48px]">lock</span>
          <p className="text-slate-400 mt-2">Unauthorized. Add ?token=YOUR_TOKEN to the URL.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <span className="material-symbols-outlined text-orange-300 text-[48px] animate-pulse">lunch_dining</span>
          <p className="text-slate-400 mt-2 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-orange-500/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-orange-500">lunch_dining</span>
          <h1 className="text-lg font-bold tracking-tight">Thursday Lunch Admin</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-6 pb-12">
        {!snapshot ? (
          <div className="pt-2">
            <CreateEventForm token={token!} onCreated={fetchData} />
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-1 pt-2">
              <h2 className="text-2xl font-bold">Active Event Summary</h2>
              <p className="text-slate-500 text-sm">
                Managing lunch for{" "}
                {new Date(snapshot.event.date + "T00:00:00").toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>

            <EventHeader event={snapshot.event} />

            {snapshot.event.status === "finalized" && (
              <FinalizedBanner event={snapshot.event} locations={snapshot.locations} />
            )}

            <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
              <SummaryPanel snapshot={snapshot} />
              {snapshot.event.status === "open" && (
                <FinalizeControls
                  snapshot={snapshot}
                  token={token!}
                  onFinalized={fetchData}
                />
              )}
            </div>

            <AttendeeList responses={snapshot.responses} locations={snapshot.locations} />

            {snapshot.event.status !== "open" && (
              <div className="pt-4">
                <CreateEventForm token={token!} onCreated={fetchData} />
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
