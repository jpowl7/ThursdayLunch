"use client";

import { useState, useRef, useCallback } from "react";
import type { NearbyRestaurant } from "@/lib/google-places";

function priceDollars(level: string | null): string {
  if (level === "PRICE_LEVEL_INEXPENSIVE") return "$";
  if (level === "PRICE_LEVEL_MODERATE") return "$$";
  return "";
}

function faviconUrl(websiteUri: string | null): string | null {
  if (!websiteUri) return null;
  try {
    const host = new URL(websiteUri).origin;
    return `${host}/favicon.ico`;
  } catch {
    return null;
  }
}

export function NearbyRestaurants() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const cacheRef = useRef<NearbyRestaurant[] | null>(null);
  const [results, setResults] = useState<NearbyRestaurant[]>([]);

  const fetchNearby = useCallback(async () => {
    if (cacheRef.current) {
      setResults(cacheRef.current);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/places/nearby");
      if (!res.ok) throw new Error("fetch failed");
      const data: NearbyRestaurant[] = await res.json();
      cacheRef.current = data;
      setResults(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next && !cacheRef.current) {
      fetchNearby();
    }
  };

  const visible = showAll ? results : results.slice(0, 5);

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white border border-slate-100 shadow-sm text-sm font-semibold text-slate-600 hover:text-orange-500 hover:border-orange-200 transition-colors"
      >
        <span className="material-symbols-outlined text-[20px]">near_me</span>
        Nearby Lunch Spots
        <span className="material-symbols-outlined text-[18px] text-slate-400">
          {open ? "expand_less" : "expand_more"}
        </span>
      </button>

      {open && (
        <div className="space-y-2">
          {loading && (
            <div className="flex items-center justify-center py-6">
              <span className="material-symbols-outlined text-orange-300 text-[32px] animate-pulse">
                restaurant
              </span>
            </div>
          )}

          {error && (
            <div className="text-center py-4">
              <p className="text-sm text-slate-400">Couldn&apos;t load nearby spots</p>
              <button
                type="button"
                onClick={fetchNearby}
                className="text-xs text-orange-500 font-semibold mt-1"
              >
                Try again
              </button>
            </div>
          )}

          {!loading && !error && results.length === 0 && (
            <p className="text-center text-sm text-slate-400 py-4">No nearby spots found</p>
          )}

          {!loading && !error && visible.map((r) => {
            const favicon = faviconUrl(r.websiteUri);
            const price = priceDollars(r.priceLevel);

            return (
              <div
                key={r.id}
                className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm"
              >
                <div className="flex items-start gap-2">
                  {favicon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={favicon}
                      alt=""
                      className="w-5 h-5 mt-0.5 rounded-sm flex-shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : (
                    <span className="material-symbols-outlined text-[20px] text-slate-300 mt-0.5 flex-shrink-0">
                      restaurant
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-sm truncate">{r.name}</p>
                      {price && (
                        <span className="text-[11px] font-bold text-green-600 flex-shrink-0">{price}</span>
                      )}
                    </div>
                    <a
                      href={r.mapsUri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-slate-400 hover:text-blue-500 truncate block"
                    >
                      {r.address}
                    </a>
                    {r.typeName && (
                      <span className="text-[10px] text-slate-300 uppercase tracking-wider">{r.typeName}</span>
                    )}
                  </div>
                  <a
                    href={r.mapsUri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 text-[10px] text-blue-500 hover:underline uppercase tracking-wider font-bold mt-1"
                  >
                    Map
                  </a>
                </div>
              </div>
            );
          })}

          {!loading && !error && results.length > 5 && (
            <button
              type="button"
              onClick={() => setShowAll(!showAll)}
              className="w-full py-2 text-xs font-semibold text-slate-400 hover:text-orange-500 transition-colors"
            >
              {showAll ? "Show less" : `Show ${results.length - 5} more`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
