"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";

interface CreateEventFormProps {
  token: string;
  onCreated: () => void;
  groupSlug: string;
}

interface LocationInput {
  name: string;
  address: string;
  mapsUrl: string;
}

export function CreateEventForm({ token, onCreated, groupSlug }: CreateEventFormProps) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [earliestTime, setEarliestTime] = useState("11:30");
  const [latestTime, setLatestTime] = useState("13:30");
  const [locations, setLocations] = useState<LocationInput[]>([
    { name: "", address: "", mapsUrl: "" },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const addLocation = () => {
    setLocations([...locations, { name: "", address: "", mapsUrl: "" }]);
  };

  const removeLocation = (index: number) => {
    setLocations(locations.filter((_, i) => i !== index));
  };

  const updateLocation = (index: number, field: keyof LocationInput, value: string) => {
    const updated = [...locations];
    updated[index] = { ...updated[index], [field]: value };
    setLocations(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const validLocations = locations.filter((l) => l.name.trim());
    if (validLocations.length === 0) {
      setError("Add at least one location");
      setSubmitting(false);
      return;
    }

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
          locations: validLocations.map((l) => ({
            name: l.name.trim(),
            address: l.address.trim() || undefined,
            mapsUrl: l.mapsUrl.trim() || undefined,
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

  const inputClass = "w-full bg-white border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none text-sm";

  return (
    <div className="bg-white rounded-xl p-6 border border-orange-500/10 shadow-sm">
      <h2 className="text-xl font-bold mb-1">Create New Event</h2>
      <p className="text-slate-400 text-sm mb-6">Set up a new lunch for the group</p>

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

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium px-1">Earliest Time</Label>
            <input
              type="time"
              value={earliestTime}
              onChange={(e) => setEarliestTime(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium px-1">Latest Time</Label>
            <input
              type="time"
              value={latestTime}
              onChange={(e) => setLatestTime(e.target.value)}
              className={inputClass}
            />
          </div>
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
              <input
                value={loc.name}
                onChange={(e) => updateLocation(i, "name", e.target.value)}
                placeholder="Restaurant name"
                className={inputClass}
              />
              <input
                value={loc.address}
                onChange={(e) => updateLocation(i, "address", e.target.value)}
                placeholder="Address (optional)"
                className={inputClass}
              />
              <input
                value={loc.mapsUrl}
                onChange={(e) => updateLocation(i, "mapsUrl", e.target.value)}
                placeholder="Google Maps URL (optional)"
                className={inputClass}
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
