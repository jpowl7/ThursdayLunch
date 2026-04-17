"use client";

type ConnectionState = "polling" | "disconnected";

export function ConnectionStatus({ state }: { state: ConnectionState }) {
  if (state === "polling") return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-slate-800/80 px-3 py-1.5 text-xs text-white shadow-lg backdrop-blur-sm">
      <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
      Offline
    </div>
  );
}
