import type { Response, Location } from "@/lib/schemas";

interface AttendeeListProps {
  responses: Response[];
  locations: Location[];
  currentParticipantKey?: string | null;
}

function formatTime(time: string | null): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${displayH}:${m.toString().padStart(2, "0")} ${period}`;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function AttendeeList({ responses, locations, currentParticipantKey }: AttendeeListProps) {
  const locationMap = new Map(locations.map((l) => [l.id, l.name]));
  const inResponses = responses.filter((r) => r.isIn);
  const outResponses = responses.filter((r) => !r.isIn);

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-orange-500">groups</span>
          Who&apos;s coming?
        </h3>
        {inResponses.length > 0 && (
          <span className="text-xs font-bold text-orange-500 px-2 py-0.5 bg-orange-500/10 rounded-full">
            {inResponses.length} {inResponses.length === 1 ? "person" : "people"}
          </span>
        )}
      </div>
      <div className="space-y-2">
        {inResponses.map((r) => {
          const isMe = r.participantKey === currentParticipantKey;
          return (
          <div
            key={r.id}
            className={`flex items-center gap-4 bg-white p-2.5 rounded-xl shadow-sm ${
              isMe ? "border-2 border-orange-400 ring-1 ring-orange-400/20" : "border border-slate-50"
            }`}
          >
            <div className="relative">
              <div className={`size-10 rounded-full flex items-center justify-center text-sm font-bold border-2 border-white shadow-sm ${
                isMe ? "bg-orange-200 text-orange-800" : "bg-orange-100 text-orange-700"
              }`}>
                {getInitials(r.name)}
              </div>
              <div className="absolute -bottom-1 -right-1 size-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-[12px] font-bold">check</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start">
                <p className="font-bold text-sm truncate">
                  {r.name}
                  {isMe && <span className="text-[10px] text-orange-500 font-bold ml-1.5">(You)</span>}
                </p>
                {r.availableFrom && r.availableTo && (
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter whitespace-nowrap ml-2">
                    {formatTime(r.availableFrom)} - {formatTime(r.availableTo)}
                  </span>
                )}
              </div>
              {r.locationVotes.length > 0 && (
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {r.locationVotes.map((locId) => {
                    const isPreferred = r.preferredLocationId === locId;
                    return (
                      <span
                        key={locId}
                        className={`text-[11px] px-2 py-0.5 rounded-full ${
                          isPreferred
                            ? "bg-yellow-100 text-yellow-700 font-semibold"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {isPreferred && "★ "}{locationMap.get(locId) || "Unknown"}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          );
        })}
        {outResponses.length > 0 && (
          <>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-4 px-1">Not coming</p>
            {outResponses.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-4 bg-white/60 p-2.5 rounded-xl border border-slate-50 opacity-60"
              >
                <div className="relative">
                  <div className="size-10 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-400 border-2 border-white shadow-sm">
                    {getInitials(r.name)}
                  </div>
                  <div className="absolute -bottom-1 -right-1 size-5 bg-red-400 rounded-full border-2 border-white flex items-center justify-center">
                    <span className="material-symbols-outlined text-white text-[12px] font-bold">close</span>
                  </div>
                </div>
                <p className="font-medium text-sm text-slate-400">{r.name}</p>
              </div>
            ))}
          </>
        )}
        {responses.length === 0 && (
          <div className="text-center py-8">
            <span className="material-symbols-outlined text-slate-300 text-[48px] mb-2">group_add</span>
            <p className="text-slate-400 font-medium">No responses yet. Be the first!</p>
          </div>
        )}
      </div>
    </div>
  );
}
