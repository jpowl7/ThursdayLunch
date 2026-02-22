"use client";

type ConnectionState = "connecting" | "connected" | "polling" | "disconnected";

export function ConnectionStatus({ state }: { state: ConnectionState }) {
  if (state === "connected" || state === "polling") return null;

  const config = {
    connecting: { color: "bg-yellow-400", pulse: true, label: "Connecting..." },
    polling: { color: "bg-yellow-400", pulse: true, label: "Slow connection" },
    disconnected: { color: "bg-red-500", pulse: false, label: "Offline" },
  } as const;

  const { color, pulse, label } = config[state];

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-slate-800/80 px-3 py-1.5 text-xs text-white shadow-lg backdrop-blur-sm">
      <span className={`inline-block h-2 w-2 rounded-full ${color} ${pulse ? "animate-pulse" : ""}`} />
      {label}
    </div>
  );
}
