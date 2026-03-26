"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { PlacesAutocomplete } from "@/components/PlacesAutocomplete";

interface CreateEventFormProps {
  token: string;
  onCreated: () => void;
  groupSlug: string;
}

interface LocationInput {
  name: string;
  placeId: string | null;
}

export function CreateEventForm({ token, onCreated, groupSlug }: CreateEventFormProps) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [earliestTime, setEarliestTime] = useState("11:30");
  const [latestTime, setLatestTime] = useState("13:30");
  const [locations, setLocations] = useState<LocationInput[]>([]);
  const [delayEnabled, setDelayEnabled] = useState(false);
  const [delayWindow, setDelayWindow] = useState("30");
  const [delayStartTime, setDelayStartTime] = useState("");
  const [delayStartDate, setDelayStartDate] = useState("");
  const [deadlineEnabled, setDeadlineEnabled] = useState(false);
  const [deadlineTime, setDeadlineTime] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const addLocation = () => {
    setLocations([...locations, { name: "", placeId: null }]);
  };

  const removeLocation = (index: number) => {
    setLocations(locations.filter((_, i) => i !== index));
  };

  const updateLocation = (index: number, name: string, placeId: string | null) => {
    const updated = [...locations];
    updated[index] = { name, placeId };
    setLocations(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const validLocations = locations.filter((l) => l.name.trim());

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          date,
          earliestTime,
          latestTime,
          groupSlug,
          delayWindow: delayEnabled ? delayWindow : "none",
          delayStartTime: delayEnabled && delayStartTime ? delayStartTime : undefined,
          delayStartDate: delayEnabled && delayStartDate ? delayStartDate : undefined,
          votingDeadlineTime: deadlineEnabled && deadlineTime ? deadlineTime : undefined,
          locations: validLocations.map((l) => ({
            name: l.name.trim(),
            placeId: l.placeId || undefined,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create event");
        return;
      }

      onCreated();
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "w-full max-w-full bg-white border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none text-base box-border";

  return (
    <div className="bg-white rounded-xl p-4 sm:p-6 border border-orange-500/10 shadow-sm overflow-hidden">
      <h2 className="text-xl font-bold mb-1">Create New Event</h2>
      <p className="text-slate-400 text-sm mb-6">Set up a new event for the group</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium px-1">Title</Label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Thursday Lunch — Feb 27"
            required
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium px-1">Date</Label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5 min-w-0">
            <Label className="text-sm font-medium px-1">Earliest Time</Label>
            <input
              type="time"
              value={earliestTime}
              onChange={(e) => setEarliestTime(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5 min-w-0">
            <Label className="text-sm font-medium px-1">Latest Time</Label>
            <input
              type="time"
              value={latestTime}
              onChange={(e) => setLatestTime(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-3 px-1">
            <input
              type="checkbox"
              id="delay-toggle"
              checked={delayEnabled}
              onChange={(e) => setDelayEnabled(e.target.checked)}
              className="w-4 h-4 accent-orange-500"
            />
            <Label htmlFor="delay-toggle" className="text-sm font-medium cursor-pointer">
              Random go-live delay
            </Label>
          </div>
          {delayEnabled && (
            <div className="ml-7 space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-500">Start delay at</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="min-w-0">
                    <input
                      type="date"
                      value={delayStartDate}
                      onChange={(e) => setDelayStartDate(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="min-w-0">
                    <input
                      type="time"
                      value={delayStartTime}
                      onChange={(e) => setDelayStartTime(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
                <p className="text-xs text-slate-400">
                  {delayStartTime || delayStartDate ? "Delay timer begins at this date/time" : "Leave blank to start immediately"}
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-500">Random window</Label>
                <select
                  value={delayWindow}
                  onChange={(e) => setDelayWindow(e.target.value)}
                  className={inputClass}
                >
                  <option value="15">Up to 15 minutes</option>
                  <option value="30">Up to 30 minutes</option>
                  <option value="60">Up to 1 hour</option>
                  <option value="120">Up to 2 hours</option>
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-3 px-1">
            <input
              type="checkbox"
              id="deadline-toggle"
              checked={deadlineEnabled}
              onChange={(e) => setDeadlineEnabled(e.target.checked)}
              className="w-4 h-4 accent-orange-500"
            />
            <Label htmlFor="deadline-toggle" className="text-sm font-medium cursor-pointer">
              Auto-finalize at a set time
            </Label>
          </div>
          {deadlineEnabled && (
            <div className="ml-7 space-y-1">
              <Label className="text-xs font-medium text-slate-500">Close voting at</Label>
              <input
                type="time"
                value={deadlineTime}
                onChange={(e) => setDeadlineTime(e.target.value)}
                className={inputClass}
              />
              <p className="text-xs text-slate-400">
                Voting will automatically close and the top-voted venue will be selected at this time on the event date
              </p>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-medium px-1">Locations</Label>
          {locations.map((loc, i) => (
            <div key={i} className="bg-slate-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Location {i + 1}</span>
                {locations.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLocation(i)}
                    className="text-xs text-red-400 hover:text-red-600 font-medium transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
              <PlacesAutocomplete
                value={loc.name}
                onChange={(name, placeId) => updateLocation(i, name, placeId)}
                placeholder="Search for a restaurant…"
                inputClassName={inputClass}
                groupSlug={groupSlug}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={addLocation}
            className="w-full py-2 border-2 border-dashed border-slate-200 rounded-lg text-sm font-medium text-slate-400 hover:border-orange-500/50 hover:text-orange-500 transition-colors flex items-center justify-center gap-1"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Add Location
          </button>
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-4 rounded-full shadow-lg shadow-orange-500/30 transition-all flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined">add_circle</span>
          {submitting ? "Creating..." : "Create Event"}
        </button>
      </form>
    </div>
  );
}
