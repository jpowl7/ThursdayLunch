"use client";

import { useState, useEffect, useCallback } from "react";
import { EventHeader } from "@/components/event/EventHeader";
import { CreateEventForm } from "@/components/admin/CreateEventForm";
import { SummaryPanel } from "@/components/admin/SummaryPanel";
import { FinalizeControls } from "@/components/admin/FinalizeControls";
import { FinalizedBanner } from "@/components/event/FinalizedBanner";
import { AdminLocationManager } from "@/components/admin/AdminLocationManager";
import { AdminResponseManager } from "@/components/admin/AdminResponseManager";
import { useEventStream } from "@/hooks/useEventStream";
import { toast } from "sonner";
import type { EventSnapshot } from "@/types";

interface AdminPageContentProps {
  isDev?: boolean;
  urlToken?: string;
}

export function AdminPageContent({ isDev = false, urlToken }: AdminPageContentProps) {
  const [tokenInput, setTokenInput] = useState("");
  const [activeToken, setActiveToken] = useState<string | null>(urlToken ?? null);
  const [initialSnapshot, setInitialSnapshot] = useState<EventSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(isDev ? true : false);
  const [reopening, setReopening] = useState(false);

  const token = isDev ? "dev-sandbox" : activeToken;
  const apiUrl = `/api/events/current${isDev ? "?dev=true" : ""}`;

  const fetchData = useCallback(async () => {
    if (!isDev && !activeToken) return;
    try {
      const res = await fetch(apiUrl);
      if (res.ok) {
        const data = await res.json();
        setInitialSnapshot(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [isDev, activeToken, apiUrl]);

  useEffect(() => {
    if (isDev || activeToken) {
      setAuthorized(true);
      fetchData();
    } else {
      setLoading(false);
    }
  }, [isDev, activeToken, fetchData]);

  const handleTokenSubmit = () => {
    const trimmed = tokenInput.trim();
    if (trimmed) {
      setActiveToken(trimmed);
      setLoading(true);
    }
  };

  const handleReopen = async () => {
    if (!snapshot?.event || !confirm("Reopen this event? It will go back to voting.")) return;
    setReopening(true);
    try {
      const res = await fetch(`/api/events/${snapshot.event.id}/finalize`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to reopen");
        return;
      }
      toast.success("Event reopened!");
      fetchData();
    } catch {
      toast.error("Network error");
    } finally {
      setReopening(false);
    }
  };

  const eventId = initialSnapshot?.event?.id || null;
  const { snapshot: liveSnapshot } = useEventStream(eventId, isDev);
  const snapshot = liveSnapshot || initialSnapshot;

  if (!authorized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <span className="material-symbols-outlined text-slate-300 text-[48px]">lock</span>
          <p className="text-slate-400">Enter admin token</p>
          <div className="flex gap-2">
            <input
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleTokenSubmit()}
              placeholder="Token"
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400"
              autoFocus
            />
            <button
              type="button"
              onClick={handleTokenSubmit}
              disabled={!tokenInput.trim()}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
            >
              Go
            </button>
          </div>
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

  const headerTitle = isDev ? "Dev Sandbox Admin" : "Thursday Lunch Admin";

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-orange-500/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`material-symbols-outlined ${isDev ? "text-purple-500" : "text-orange-500"}`}>lunch_dining</span>
          <h1 className="text-lg font-bold tracking-tight">{headerTitle}</h1>
          {isDev && (
            <span className="bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Dev</span>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-6 pb-12">
        {!snapshot ? (
          <div className="pt-2">
            <CreateEventForm token={token!} onCreated={fetchData} isDev={isDev} />
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-1 pt-2">
              <h2 className="text-2xl font-bold">Active Event Summary</h2>
              <p className="text-slate-500 text-sm">
                Managing lunch for{" "}
                {(() => {
                  const d = new Date(snapshot.event.date.includes("T") ? snapshot.event.date : snapshot.event.date + "T12:00:00");
                  return isNaN(d.getTime()) ? snapshot.event.date : d.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                  });
                })()}
              </p>
            </div>

            <div className="mb-2">
              <EventHeader event={snapshot.event} />
            </div>

            {snapshot.event.status === "finalized" && (
              <>
                <FinalizedBanner event={snapshot.event} locations={snapshot.locations} />
                <button
                  onClick={handleReopen}
                  disabled={reopening}
                  className="w-full border-2 border-dashed border-orange-500/20 text-orange-500 font-semibold py-3 rounded-full hover:bg-orange-500/5 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[20px]">undo</span>
                  {reopening ? "Reopening..." : "Reopen for Voting"}
                </button>
              </>
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

            <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
              <AdminLocationManager
                locations={snapshot.locations}
                eventId={snapshot.event.id}
                token={token!}
                onChanged={fetchData}
              />
              <AdminResponseManager
                responses={snapshot.responses}
                locations={snapshot.locations}
                eventId={snapshot.event.id}
                token={token!}
                onChanged={fetchData}
              />
            </div>

            {snapshot.event.status !== "open" && (
              <div className="pt-4">
                <CreateEventForm token={token!} onCreated={fetchData} isDev={isDev} />
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
