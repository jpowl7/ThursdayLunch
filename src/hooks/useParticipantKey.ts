"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "thursday-lunch-participant-key";

export function useParticipantKey() {
  const [key, setKeyState] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    setKeyState(stored);
    setLoaded(true);
  }, []);

  const setParticipantKey = useCallback((newKey: string) => {
    localStorage.setItem(STORAGE_KEY, newKey);
    setKeyState(newKey);
  }, []);

  const clearParticipantKey = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setKeyState(null);
  }, []);

  return { key, loaded, setParticipantKey, clearParticipantKey };
}
