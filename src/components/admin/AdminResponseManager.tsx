"use client";

import type { Response, Location } from "@/lib/schemas";
import { toast } from "sonner";

type Status = "in" | "out" | "maybe";

interface AdminResponseManagerProps {
  responses: Response[];
  locations: Location[];
  eventId: string;
  token: string;
  onChanged: () => void;
}

const STATUS_ORDER: Status[] = ["in", "maybe", "out"];

function nextStatus(current: Status): Status {
  const idx = STATUS_ORDER.indexOf(current);
  return STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
}

export function AdminResponseManager({ responses, locations, eventId, token, onChanged }: AdminResponseManagerProps) {
  const locationNameById = new Map<string, string>();
  for (const loc of locations) {
    locationNameById.set(loc.id, loc.name);
  }

  const goingResponses = responses.filter((r) => r.status === "in");
  const maybeResponses = responses.filter((r) => r.status === "maybe");
  const outResponses = responses.filter((r) => r.status === "out");

  const handleToggle = async (responseId: string, currentStatus: Status) => {
    const newStatus = nextStatus(currentStatus);
    try {
      const res = await fetch(`/api/events/${eventId}/responses/${responseId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const labels: Record<Status, string> = { in: "Going", maybe: "Maybe", out: "Out" };
        toast.success(`Moved to ${labels[newStatus]}`);
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

  const renderRow = (r: Response) => {
    const statusColors: Record<Status, string> = {
      in: "bg-green-500",
      maybe: "bg-amber-400",
      out: "bg-slate-300",
    };
    const badgeColors: Record<Status, string> = {
      in: "bg-green-50 text-green-600 hover:bg-green-100",
      maybe: "bg-amber-50 text-amber-600 hover:bg-amber-100",
      out: "bg-slate-50 text-slate-500 hover:bg-slate-100",
    };
    const labels: Record<Status, string> = { in: "Going", maybe: "Maybe", out: "Out" };

    return (
      <div key={r.id} className="flex items-center gap-3 py-2">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${statusColors[r.status]}`}>
          {r.name.slice(0, 2).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{r.name}</p>
          {r.status === "in" && r.locationVotes.length > 0 && (
            <p className="text-[11px] text-slate-400 truncate">
              {r.locationVotes.map((id) => locationNameById.get(id)).filter(Boolean).join(", ")}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => handleToggle(r.id, r.status)}
          className={`px-2 py-1 text-xs font-semibold rounded-full transition-colors ${badgeColors[r.status]}`}
          title={`Click to move to ${labels[nextStatus(r.status)]}`}
        >
          {labels[r.status]}
        </button>

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
  };

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

      {maybeResponses.length > 0 && (
        <div>
          <p className="text-xs text-amber-500 font-semibold mb-1">Maybe ({maybeResponses.length})</p>
          <div className="divide-y divide-slate-50">
            {maybeResponses.map(renderRow)}
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
