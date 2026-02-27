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
  groupSlug: string;
}

export function AdminPageContent({ groupSlug }: AdminPageContentProps) {
  const [passcodeInput, setPasscodeInput] = useState("");
  const [activePasscode, setActivePasscode] = useState<string | null>(null);
  const [initialSnapshot, setInitialSnapshot] = useState<EventSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [groupName, setGroupName] = useState("");

  // Change passcode state
  const [newPasscode, setNewPasscode] = useState("");
  const [changingPasscode, setChangingPasscode] = useState(false);

  const apiUrl = `/api/events/current?group=${encodeURIComponent(groupSlug)}`;

  const fetchData = useCallback(async () => {
    if (!activePasscode) return;
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
  }, [activePasscode, apiUrl]);

  // Fetch group name
  useEffect(() => {
    fetch(`/api/groups/${groupSlug}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.name) setGroupName(data.name);
      })
      .catch(() => {});
  }, [groupSlug]);

  useEffect(() => {
    if (activePasscode) {
      setAuthorized(true);
      fetchData();
    } else {
      setLoading(false);
    }
  }, [activePasscode, fetchData]);

  const handlePasscodeSubmit = () => {
    const trimmed = passcodeInput.trim();
    if (trimmed) {
      setActivePasscode(trimmed);
      setLoading(true);
    }
  };

  const handleReopen = async () => {
    if (!snapshot?.event || !confirm("Reopen this event? It will go back to voting.")) return;
    setReopening(true);
    try {
      const res = await fetch(`/api/events/${snapshot.event.id}/finalize`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${activePasscode}` },
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

  const handleChangePasscode = async () => {
    if (newPasscode.length !== 4) return;
    setChangingPasscode(true);
    try {
      const res = await fetch(`/api/groups/${groupSlug}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${activePasscode}`,
        },
        body: JSON.stringify({ newPasscode }),
      });
      if (res.ok) {
        setActivePasscode(newPasscode);
        setNewPasscode("");
        toast.success("Passcode updated!");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update passcode");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setChangingPasscode(false);
    }
  };

  const eventId = initialSnapshot?.event?.id || null;
  const { snapshot: liveSnapshot } = useEventStream(eventId, groupSlug);
  const snapshot = liveSnapshot || initialSnapshot;

  if (!authorized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <span className="material-symbols-outlined text-slate-300 text-[48px]">lock</span>
          <p className="text-slate-400">Enter group passcode</p>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={passcodeInput}
              onChange={(e) => setPasscodeInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
              onKeyDown={(e) => e.key === "Enter" && handlePasscodeSubmit()}
              placeholder="0000"
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400 text-center tracking-widest"
              autoFocus
            />
            <button
              type="button"
              onClick={handlePasscodeSubmit}
              disabled={passcodeInput.length !== 4}
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

  const headerTitle = groupName ? `${groupName} Admin` : "Admin";

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-orange-500/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-orange-500">lunch_dining</span>
          <h1 className="text-lg font-bold tracking-tight">{headerTitle}</h1>
        </div>
        <a
          href={`/g/${groupSlug}`}
          className="text-sm text-slate-400 hover:text-orange-500 transition-colors"
        >
          View group
        </a>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-6 pb-12">
        {!snapshot ? (
          <div className="pt-2">
            <CreateEventForm token={activePasscode!} onCreated={fetchData} groupSlug={groupSlug} />
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
                  token={activePasscode!}
                  onFinalized={fetchData}
                  groupSlug={groupSlug}
                />
              )}
            </div>

            <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
              <AdminLocationManager
                locations={snapshot.locations}
                eventId={snapshot.event.id}
                token={activePasscode!}
                onChanged={fetchData}
              />
              <AdminResponseManager
                responses={snapshot.responses}
                locations={snapshot.locations}
                eventId={snapshot.event.id}
                token={activePasscode!}
                onChanged={fetchData}
              />
            </div>

            {snapshot.event.status !== "open" && (
              <div className="pt-4">
                <CreateEventForm token={activePasscode!} onCreated={fetchData} groupSlug={groupSlug} />
              </div>
            )}
          </>
        )}

        {/* Change Passcode Section */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Change Passcode</h3>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={newPasscode}
              onChange={(e) => setNewPasscode(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="New 4-digit passcode"
              className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400"
            />
            <button
              type="button"
              onClick={handleChangePasscode}
              disabled={changingPasscode || newPasscode.length !== 4}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
            >
              {changingPasscode ? "..." : "Update"}
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
