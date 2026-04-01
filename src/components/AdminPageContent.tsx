"use client";

import { useState, useEffect, useCallback } from "react";
import { EventHeader } from "@/components/event/EventHeader";
import { CreateEventForm } from "@/components/admin/CreateEventForm";
import { SummaryPanel } from "@/components/admin/SummaryPanel";
import { FinalizeControls } from "@/components/admin/FinalizeControls";
import { FinalizedBanner } from "@/components/event/FinalizedBanner";
import { AdminLocationManager } from "@/components/admin/AdminLocationManager";
import { RecurringScheduleForm } from "@/components/admin/RecurringScheduleForm";
import { AdminResponseManager } from "@/components/admin/AdminResponseManager";
import { PlacesAutocomplete } from "@/components/PlacesAutocomplete";
import { useEventStream } from "@/hooks/useEventStream";
import { toast } from "sonner";
import Link from "next/link";
import type { EventSnapshot } from "@/types";

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${displayH}:${m.toString().padStart(2, "0")} ${period}`;
}

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
  const [cancelling, setCancelling] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [isOpenGroup, setIsOpenGroup] = useState(false);

  // Scheduled event state
  const [scheduledSnapshot, setScheduledSnapshot] = useState<(EventSnapshot & { scheduled: boolean }) | null>(null);

  // Change passcode state
  const [newPasscode, setNewPasscode] = useState("");
  const [changingPasscode, setChangingPasscode] = useState(false);

  // Group location state
  const [groupLocationName, setGroupLocationName] = useState<string | null>(null);
  const [editingLocation, setEditingLocation] = useState(false);
  const [locationSearch, setLocationSearch] = useState("");
  const [selectedLocationPlaceId, setSelectedLocationPlaceId] = useState<string | null>(null);
  const [savingLocation, setSavingLocation] = useState(false);

  const apiUrl = `/api/events/current?group=${encodeURIComponent(groupSlug)}`;

  const fetchData = useCallback(async () => {
    if (!activePasscode && !isOpenGroup) return;
    try {
      const res = await fetch(apiUrl);
      if (res.ok) {
        const data = await res.json();
        setInitialSnapshot(data);
        setScheduledSnapshot(null);
      } else {
        setInitialSnapshot(null);
        // No live event — check for scheduled
        const schedRes = await fetch(
          `/api/events/scheduled?group=${encodeURIComponent(groupSlug)}`,
          { headers: { Authorization: `Bearer ${activePasscode}` } }
        );
        if (schedRes.ok) {
          const schedData = await schedRes.json();
          setScheduledSnapshot(schedData?.scheduled ? schedData : null);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [activePasscode, isOpenGroup, apiUrl, groupSlug]);

  // Fetch group info — auto-authorize if no passcode required
  useEffect(() => {
    fetch(`/api/groups/${groupSlug}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.name) setGroupName(data.name);
        if (data?.locationName) setGroupLocationName(data.locationName);
        if (data?.requiresPasscode === false) {
          setIsOpenGroup(true);
          setActivePasscode("");
          setAuthorized(true);
        }
      })
      .catch(() => {});
  }, [groupSlug]);

  useEffect(() => {
    if (activePasscode !== null) {
      setAuthorized(true);
      fetchData();
    } else {
      setLoading(false);
    }
  }, [activePasscode, fetchData]);

  // Poll while a scheduled event is waiting to go live
  useEffect(() => {
    if (!scheduledSnapshot) return;
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [scheduledSnapshot, fetchData]);

  const handlePasscodeSubmit = async () => {
    const trimmed = passcodeInput.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/groups/${groupSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: trimmed }),
      });
      const data = await res.json();
      if (data.valid) {
        setActivePasscode(trimmed);
      } else {
        toast.error("Wrong passcode");
        setLoading(false);
      }
    } catch {
      toast.error("Network error");
      setLoading(false);
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

  const handleCancel = async () => {
    const eventToCancel = snapshot?.event || scheduledSnapshot?.event;
    if (!eventToCancel || !confirm("Cancel this event? All responses will be kept but the event will end.")) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/events/${eventToCancel.id}/cancel`, {
        method: "POST",
        headers: { Authorization: `Bearer ${activePasscode}` },
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to cancel");
        return;
      }
      toast.success("Event cancelled");
      fetchData();
    } catch {
      toast.error("Network error");
    } finally {
      setCancelling(false);
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
      <div className="flex items-center justify-center min-h-screen w-full overflow-hidden px-4">
        <div className="text-center space-y-4 w-full max-w-[280px]">
          <span className="material-symbols-outlined text-slate-300 text-[48px]">lock</span>
          <p className="text-slate-400">Enter group passcode</p>
          <div className="flex gap-2 justify-center">
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={passcodeInput}
              onChange={(e) => setPasscodeInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
              onKeyDown={(e) => e.key === "Enter" && handlePasscodeSubmit()}
              placeholder="0000"
              className="w-24 px-3 py-2 text-base border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400 text-center tracking-widest"
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
      <div className="flex items-center justify-center min-h-screen w-full overflow-hidden">
        <div className="text-center">
          <span className="material-symbols-outlined text-orange-300 text-[48px] animate-pulse">lunch_dining</span>
          <p className="text-slate-400 mt-2 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  const headerTitle = groupName ? `${groupName} Admin` : "Admin";

  return (
    <div className="flex justify-center min-h-screen max-w-[100vw] overflow-hidden">
      <main className="w-full max-w-[430px] min-h-screen shadow-2xl bg-[#f8f7f5] overflow-hidden min-w-0">
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-orange-500/10 px-4 py-4 flex items-center justify-between min-w-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="material-symbols-outlined text-orange-500 shrink-0">lunch_dining</span>
            <h1 className="text-lg font-bold tracking-tight truncate">{headerTitle}</h1>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link href="/" className="text-sm text-slate-400 hover:text-orange-500 transition-colors whitespace-nowrap">Home</Link>
            <a href={`/g/${groupSlug}`} className="text-sm text-slate-400 hover:text-orange-500 transition-colors whitespace-nowrap">Group</a>
          </div>
        </header>

        <div className="px-4 pb-12 pt-4 space-y-6 overflow-hidden">
        {isOpenGroup && (
          <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-purple-500 text-[20px]">science</span>
            <p className="text-sm text-purple-700">
              <span className="font-semibold">Demo group</span> — anyone can manage events here. No passcode required.
            </p>
          </div>
        )}

        {!snapshot && scheduledSnapshot ? (
          <div className="pt-2 space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-500">schedule</span>
                  <h3 className="font-bold text-amber-800">Event Scheduled</h3>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-amber-800">{scheduledSnapshot.event.title}</p>
                <p className="text-sm text-amber-700">
                  {(() => {
                    const d = new Date(scheduledSnapshot.event.date.includes("T") ? scheduledSnapshot.event.date : scheduledSnapshot.event.date + "T12:00:00");
                    return isNaN(d.getTime()) ? scheduledSnapshot.event.date : d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
                  })()}
                  {" · "}
                  {scheduledSnapshot.event.earliestTime && scheduledSnapshot.event.latestTime && (
                    <>{formatTime(scheduledSnapshot.event.earliestTime)} – {formatTime(scheduledSnapshot.event.latestTime)}</>
                  )}
                </p>
                <p className="text-sm text-amber-700">
                  Goes live at{" "}
                  <strong>{new Date(scheduledSnapshot.event.goLiveAt!).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</strong>
                </p>
                {scheduledSnapshot.locations.length > 0 && (
                  <p className="text-xs text-amber-600 pt-1">
                    {scheduledSnapshot.locations.length} location{scheduledSnapshot.locations.length !== 1 ? "s" : ""}: {scheduledSnapshot.locations.map(l => l.name).join(", ")}
                  </p>
                )}
              </div>
              <p className="text-xs text-amber-500">
                Participants won&apos;t see it until then. Push notifications will be sent automatically.
              </p>
            </div>
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="w-full border border-red-200 text-red-400 font-medium py-2.5 rounded-full hover:bg-red-50 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <span className="material-symbols-outlined text-[18px]">cancel</span>
              {cancelling ? "Cancelling..." : "Cancel Scheduled Event"}
            </button>
          </div>
        ) : !snapshot ? (
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

            <div className="grid gap-6 grid-cols-1">
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

            <div className="grid gap-6 grid-cols-1">
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
                eventStatus={snapshot.event.status}
                onChanged={fetchData}
              />
            </div>

            {snapshot.event.status === "open" && (
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="w-full border border-red-200 text-red-400 font-medium py-2.5 rounded-full hover:bg-red-50 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <span className="material-symbols-outlined text-[18px]">cancel</span>
                {cancelling ? "Cancelling..." : "Cancel Event"}
              </button>
            )}

            {snapshot.event.status !== "open" && (
              <div className="pt-4">
                <CreateEventForm token={activePasscode!} onCreated={fetchData} groupSlug={groupSlug} />
              </div>
            )}
          </>
        )}

        {/* Group Location Section */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Group Location</h3>
          <p className="text-sm text-slate-600">
            Restaurant search results are biased toward:{" "}
            <span className="font-semibold">{groupLocationName || "Granger, IN (default)"}</span>
          </p>
          {!editingLocation ? (
            <button
              type="button"
              onClick={() => setEditingLocation(true)}
              className="text-sm text-orange-500 font-semibold hover:text-orange-600 transition-colors"
            >
              Change
            </button>
          ) : (
            <div className="space-y-2">
              <PlacesAutocomplete
                value={locationSearch}
                onChange={(name, placeId) => {
                  setLocationSearch(name);
                  setSelectedLocationPlaceId(placeId);
                }}
                placeholder="Search for a city, zip, or workplace…"
                types="locality,sublocality,neighborhood,postal_code,establishment"
              />
              <p className="text-xs text-slate-400">Try a city, zip code, neighborhood, or your workplace</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (!selectedLocationPlaceId) {
                      toast.error("Select a location from the suggestions");
                      return;
                    }
                    setSavingLocation(true);
                    try {
                      // Get place details for lat/lng
                      const detailsRes = await fetch(`/api/places/details?placeId=${encodeURIComponent(selectedLocationPlaceId)}`);
                      if (!detailsRes.ok) {
                        toast.error("Could not resolve location");
                        return;
                      }
                      const details = await detailsRes.json();

                      const res = await fetch(`/api/groups/${groupSlug}/location`, {
                        method: "PATCH",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: `Bearer ${activePasscode}`,
                        },
                        body: JSON.stringify({
                          lat: details.lat,
                          lng: details.lng,
                          name: locationSearch,
                        }),
                      });
                      if (res.ok) {
                        const data = await res.json();
                        setGroupLocationName(data.locationName);
                        setEditingLocation(false);
                        setLocationSearch("");
                        setSelectedLocationPlaceId(null);
                        toast.success("Group location updated!");
                      } else {
                        const data = await res.json();
                        toast.error(data.error || "Failed to update");
                      }
                    } catch {
                      toast.error("Network error");
                    } finally {
                      setSavingLocation(false);
                    }
                  }}
                  disabled={savingLocation || !selectedLocationPlaceId}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
                >
                  {savingLocation ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingLocation(false);
                    setLocationSearch("");
                    setSelectedLocationPlaceId(null);
                  }}
                  className="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Recurring Schedule Section */}
        {activePasscode && (
          <RecurringScheduleForm groupSlug={groupSlug} token={activePasscode} />
        )}

        {/* Change Passcode Section — hidden for open/demo groups */}
        {!isOpenGroup && <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Change Passcode</h3>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={newPasscode}
              onChange={(e) => setNewPasscode(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="New 4-digit passcode"
              className="flex-1 px-3 py-2 text-base border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400"
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
        </div>}
        </div>
      </main>
    </div>
  );
}
