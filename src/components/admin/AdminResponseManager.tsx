"use client";

import type { Response, Location } from "@/lib/schemas";
import { toast } from "sonner";

interface AdminResponseManagerProps {
  responses: Response[];
  locations: Location[];
  eventId: string;
  token: string;
  onChanged: () => void;
}

export function AdminResponseManager({ responses, locations, eventId, token, onChanged }: AdminResponseManagerProps) {
  const locationNameById = new Map<string, string>();
  for (const loc of locations) {
    locationNameById.set(loc.id, loc.name);
  }

  const goingResponses = responses.filter((r) => r.isIn);
  const outResponses = responses.filter((r) => !r.isIn);

  const handleToggle = async (responseId: string, currentlyIn: boolean) => {
    try {
      const res = await fetch(`/api/events/${eventId}/responses/${responseId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isIn: !currentlyIn }),
      });
      if (res.ok) {
        toast.success(currentlyIn ? "Moved to Out" : "Moved to Going");
        onChanged();
      } else {
        toast.error("Failed to update");
      }
    } catch {
      toast.error("Network error");
    }
  };

  const handleRemove = async (responseId: string, name: string) => {
    if (!confirm(`Remove ${name}? Their response will be deleted.`)) return;
    try {
      const res = await fetch(`/api/events/${eventId}/responses/${responseId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success(`${name} removed`);
        onChanged();
      } else {
        toast.error("Failed to remove");
      }
    } catch {
      toast.error("Network error");
    }
  };

  const renderRow = (r: Response) => (
    <div key={r.id} className="flex items-center gap-3 py-2">
      {/* Initials avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${
        r.isIn ? "bg-green-500" : "bg-slate-300"
      }`}>
        {r.name.slice(0, 2).toUpperCase()}
      </div>

      {/* Name + details */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{r.name}</p>
        {r.isIn && r.locationVotes.length > 0 && (
          <p className="text-[11px] text-slate-400 truncate">
            {r.locationVotes.map((id) => locationNameById.get(id)).filter(Boolean).join(", ")}
          </p>
        )}
      </div>

      {/* Toggle button */}
      <button
        type="button"
        onClick={() => handleToggle(r.id, r.isIn)}
        className={`px-2 py-1 text-xs font-semibold rounded-full transition-colors ${
          r.isIn
            ? "bg-green-50 text-green-600 hover:bg-green-100"
            : "bg-slate-50 text-slate-500 hover:bg-slate-100"
        }`}
        title={r.isIn ? "Move to Out" : "Move to Going"}
      >
        {r.isIn ? "Going" : "Out"}
      </button>

      {/* Remove button */}
      <button
        type="button"
        onClick={() => handleRemove(r.id, r.name)}
        className="p-1 text-slate-300 hover:text-red-500 rounded transition-colors"
        title="Remove"
      >
        <span className="material-symbols-outlined text-[18px]">delete</span>
      </button>
    </div>
  );

  return (
    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Manage Responses</h3>

      {goingResponses.length > 0 && (
        <div>
          <p className="text-xs text-green-600 font-semibold mb-1">Going ({goingResponses.length})</p>
          <div className="divide-y divide-slate-50">
            {goingResponses.map(renderRow)}
          </div>
        </div>
      )}

      {outResponses.length > 0 && (
        <div>
          <p className="text-xs text-slate-400 font-semibold mb-1">Out ({outResponses.length})</p>
          <div className="divide-y divide-slate-50">
            {outResponses.map(renderRow)}
          </div>
        </div>
      )}

      {responses.length === 0 && (
        <p className="text-sm text-slate-400">No responses yet</p>
      )}
    </div>
  );
}
