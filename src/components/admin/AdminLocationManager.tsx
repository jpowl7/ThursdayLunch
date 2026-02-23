"use client";

import { useState } from "react";
import type { Location } from "@/lib/schemas";
import { toast } from "sonner";

interface AdminLocationManagerProps {
  locations: Location[];
  eventId: string;
  token: string;
  onChanged: () => void;
}

export function AdminLocationManager({ locations, eventId, token, onChanged }: AdminLocationManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const startEdit = (loc: Location) => {
    setEditingId(loc.id);
    setEditName(loc.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  const saveEdit = async (locationId: string) => {
    const trimmed = editName.trim();
    if (!trimmed) return;
    try {
      const res = await fetch(`/api/events/${eventId}/locations/${locationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: trimmed }),
      });
      if (res.ok) {
        toast.success("Location renamed");
        onChanged();
      } else {
        toast.error("Failed to rename");
      }
    } catch {
      toast.error("Network error");
    }
    cancelEdit();
  };

  const handleDelete = async (locationId: string, name: string) => {
    if (!confirm(`Delete "${name}"? This will remove it from voting.`)) return;
    try {
      const res = await fetch(`/api/events/${eventId}/locations/${locationId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success("Location deleted");
        onChanged();
      } else {
        toast.error("Failed to delete");
      }
    } catch {
      toast.error("Network error");
    }
  };

  return (
    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Manage Locations</h3>
      <div className="space-y-2">
        {locations.map((loc) => (
          <div key={loc.id} className="flex items-center gap-2 py-1.5">
            {editingId === loc.id ? (
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveEdit(loc.id);
                  if (e.key === "Escape") cancelEdit();
                }}
                className="flex-1 px-2 py-1 text-sm border border-orange-400 rounded focus:outline-none focus:ring-1 focus:ring-orange-400"
                autoFocus
              />
            ) : (
              <span
                className="flex-1 text-sm cursor-pointer hover:text-orange-500 transition-colors truncate"
                onClick={() => startEdit(loc)}
                title="Click to rename"
              >
                {loc.name}
              </span>
            )}

            {editingId === loc.id ? (
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => saveEdit(loc.id)}
                  className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                  title="Save"
                >
                  <span className="material-symbols-outlined text-[18px]">check</span>
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="p-1 text-slate-400 hover:bg-slate-50 rounded transition-colors"
                  title="Cancel"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            ) : (
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => startEdit(loc)}
                  className="p-1 text-slate-300 hover:text-orange-500 rounded transition-colors"
                  title="Rename"
                >
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(loc.id, loc.name)}
                  className="p-1 text-slate-300 hover:text-red-500 rounded transition-colors"
                  title="Delete"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
