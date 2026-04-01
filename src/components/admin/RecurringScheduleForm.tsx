"use client";

import { useState, useEffect, useCallback } from "react";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface RecurringScheduleFormProps {
  groupSlug: string;
  token: string;
}

interface Schedule {
  id: string;
  dayOfWeek: number;
  titleTemplate: string;
  earliestTime: string;
  latestTime: string;
  createDaysBefore: number;
  delayWindow: string;
  delayStartTime: string | null;
  votingDeadlineTime: string | null;
  active: boolean;
  lastCreatedDate: string | null;
}

function getNextOccurrence(dayOfWeek: number): Date {
  const now = new Date();
  const today = now.getDay();
  let daysUntil = dayOfWeek - today;
  if (daysUntil <= 0) daysUntil += 7;
  const next = new Date(now);
  next.setDate(now.getDate() + daysUntil);
  return next;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

export function RecurringScheduleForm({ groupSlug, token }: RecurringScheduleFormProps) {
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [active, setActive] = useState(true);
  const [dayOfWeek, setDayOfWeek] = useState(4); // Thursday
  const [titleTemplate, setTitleTemplate] = useState("Thursday Lunch");
  const [earliestTime, setEarliestTime] = useState("11:30");
  const [latestTime, setLatestTime] = useState("13:30");
  const [createDaysBefore, setCreateDaysBefore] = useState(2);
  const [delayEnabled, setDelayEnabled] = useState(false);
  const [delayWindow, setDelayWindow] = useState("30");
  const [delayStartTime, setDelayStartTime] = useState("");
  const [deadlineEnabled, setDeadlineEnabled] = useState(false);
  const [deadlineTime, setDeadlineTime] = useState("");

  const loadSchedule = useCallback(async () => {
    try {
      const res = await fetch(`/api/groups/${groupSlug}/recurring`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.schedule) {
          setSchedule(data.schedule);
          setActive(data.schedule.active);
          setDayOfWeek(data.schedule.dayOfWeek);
          setTitleTemplate(data.schedule.titleTemplate);
          setEarliestTime(data.schedule.earliestTime);
          setLatestTime(data.schedule.latestTime);
          setCreateDaysBefore(data.schedule.createDaysBefore);
          setDelayEnabled(data.schedule.delayWindow !== "none");
          setDelayWindow(data.schedule.delayWindow === "none" ? "30" : data.schedule.delayWindow);
          setDelayStartTime(data.schedule.delayStartTime || "");
          setDeadlineEnabled(!!data.schedule.votingDeadlineTime);
          setDeadlineTime(data.schedule.votingDeadlineTime || "");
        }
      }
    } catch {
      // ignore
    } finally {
      setLoaded(true);
    }
  }, [groupSlug, token]);

  useEffect(() => { loadSchedule(); }, [loadSchedule]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/groups/${groupSlug}/recurring`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          dayOfWeek,
          titleTemplate,
          earliestTime,
          latestTime,
          createDaysBefore,
          delayWindow: delayEnabled ? delayWindow : "none",
          delayStartTime: delayEnabled && delayStartTime ? delayStartTime : null,
          votingDeadlineTime: deadlineEnabled && deadlineTime ? deadlineTime : null,
          active,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSchedule(data.schedule);
        toast.success(schedule ? "Schedule updated!" : "Recurring schedule created!");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save schedule");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/groups/${groupSlug}/recurring`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setSchedule(null);
        setActive(true);
        setDayOfWeek(4);
        setTitleTemplate("Thursday Lunch");
        setEarliestTime("11:30");
        setLatestTime("13:30");
        setCreateDaysBefore(2);
        setDelayEnabled(false);
        setDelayWindow("30");
        setDelayStartTime("");
        setDeadlineEnabled(false);
        setDeadlineTime("");
        toast.success("Recurring schedule removed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setDeleting(false);
    }
  };

  if (!loaded) return null;

  const nextEvent = getNextOccurrence(dayOfWeek);
  const createDate = new Date(nextEvent);
  createDate.setDate(createDate.getDate() - createDaysBefore);

  const inputClass = "w-full max-w-full bg-white border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none text-base box-border";

  return (
    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          Recurring Schedule
        </h3>
        {schedule && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            schedule.active
              ? "bg-green-100 text-green-700"
              : "bg-slate-100 text-slate-500"
          }`}>
            {schedule.active ? "Active" : "Paused"}
          </span>
        )}
      </div>

      {!schedule && (
        <p className="text-sm text-slate-500">
          Automatically create events on a weekly schedule. Participants suggest restaurants each week.
        </p>
      )}

      <div className="space-y-3">
        {/* Active toggle - only show when schedule exists */}
        {schedule && (
          <div className="flex items-center gap-3 px-1">
            <input
              type="checkbox"
              id="recurring-active"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="w-4 h-4 accent-orange-500"
            />
            <Label htmlFor="recurring-active" className="text-sm font-medium cursor-pointer">
              Auto-create events weekly
            </Label>
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="text-sm font-medium px-1">Day of week</Label>
          <select
            value={dayOfWeek}
            onChange={(e) => setDayOfWeek(Number(e.target.value))}
            className={inputClass}
          >
            {DAY_NAMES.map((name, i) => (
              <option key={i} value={i}>{name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium px-1">Event title</Label>
          <input
            value={titleTemplate}
            onChange={(e) => setTitleTemplate(e.target.value)}
            placeholder="Thursday Lunch"
            className={inputClass}
          />
          <p className="text-xs text-slate-400 px-1">
            Date is added automatically (e.g. &quot;{titleTemplate} &mdash; Apr 9&quot;)
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5 min-w-0">
            <Label className="text-sm font-medium px-1">Earliest time</Label>
            <input
              type="time"
              value={earliestTime}
              onChange={(e) => setEarliestTime(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5 min-w-0">
            <Label className="text-sm font-medium px-1">Latest time</Label>
            <input
              type="time"
              value={latestTime}
              onChange={(e) => setLatestTime(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium px-1">Create event</Label>
          <select
            value={createDaysBefore}
            onChange={(e) => setCreateDaysBefore(Number(e.target.value))}
            className={inputClass}
          >
            <option value={0}>Day of (morning)</option>
            <option value={1}>1 day before</option>
            <option value={2}>2 days before</option>
            <option value={3}>3 days before</option>
            <option value={4}>4 days before</option>
            <option value={5}>5 days before</option>
            <option value={6}>6 days before</option>
            <option value={7}>1 week before</option>
          </select>
        </div>

        {/* Random go-live delay */}
        <div className="space-y-2">
          <div className="flex items-center gap-3 px-1">
            <input
              type="checkbox"
              id="recurring-delay"
              checked={delayEnabled}
              onChange={(e) => setDelayEnabled(e.target.checked)}
              className="w-4 h-4 accent-orange-500"
            />
            <Label htmlFor="recurring-delay" className="text-sm font-medium cursor-pointer">
              Random go-live delay
            </Label>
          </div>
          {delayEnabled && (
            <div className="ml-7 space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-500">Start delay at</Label>
                <input
                  type="time"
                  value={delayStartTime}
                  onChange={(e) => setDelayStartTime(e.target.value)}
                  placeholder="09:00"
                  className={inputClass}
                />
                <p className="text-xs text-slate-400">
                  {delayStartTime ? `Delay window starts at ${delayStartTime} on event day` : "Leave blank to default to 9:00 AM"}
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

        {/* Auto-finalize */}
        <div className="space-y-2">
          <div className="flex items-center gap-3 px-1">
            <input
              type="checkbox"
              id="recurring-deadline"
              checked={deadlineEnabled}
              onChange={(e) => setDeadlineEnabled(e.target.checked)}
              className="w-4 h-4 accent-orange-500"
            />
            <Label htmlFor="recurring-deadline" className="text-sm font-medium cursor-pointer">
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
                Voting closes and top-voted venue is selected at this time on event day
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Next event preview */}
      <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600">
        <p>
          <span className="font-medium">Next event:</span> {formatDate(nextEvent)}
        </p>
        {createDaysBefore > 0 && (
          <p className="text-slate-400 text-xs mt-0.5">
            Will be created on {formatDate(createDate)}
          </p>
        )}
      </div>

      {/* Save / Delete */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !titleTemplate.trim()}
          className="flex-1 px-4 py-3 text-sm font-semibold rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving..." : schedule ? "Update Schedule" : "Enable Recurring"}
        </button>
        {schedule && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-3 text-sm font-semibold rounded-lg border border-slate-200 text-red-500 hover:bg-red-50 transition-colors"
          >
            {deleting ? "..." : "Remove"}
          </button>
        )}
      </div>
    </div>
  );
}
