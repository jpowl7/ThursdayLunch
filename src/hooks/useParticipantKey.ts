"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "thursday-lunch-participant-key";

/**
 * Must match hashParticipantKey() on the server (SHA-256 hex, first 16 chars).
 * The server only ever sends hashes, so this is how the client spots "me".
 */
async function hashKey(key: string): Promise<string> {
  const bytes = new TextEncoder().encode(key);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}

export function useParticipantKey() {
  const [key, setKeyState] = useState<string | null>(null);
  const [keyHash, setKeyHash] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    setKeyState(stored);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!key) {
      setKeyHash(null);
      return;
    }
    let cancelled = false;
    hashKey(key).then((h) => {
      if (!cancelled) setKeyHash(h);
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  const setParticipantKey = useCallback((newKey: string) => {
    localStorage.setItem(STORAGE_KEY, newKey);
    setKeyState(newKey);
  }, []);

  const clearParticipantKey = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setKeyState(null);
  }, []);

  return { key, keyHash, loaded, setParticipantKey, clearParticipantKey };
}
