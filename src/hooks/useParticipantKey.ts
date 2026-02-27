"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "thursday-lunch-participant-key";

function generateKey(): string {
  return crypto.randomUUID();
}

export function useParticipantKey() {
  const [key, setKeyState] = useState<string | null>(null);

  useEffect(() => {
    let stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      stored = generateKey();
      localStorage.setItem(STORAGE_KEY, stored);
    }
    setKeyState(stored);
  }, []);

  const setParticipantKey = useCallback((newKey: string) => {
    localStorage.setItem(STORAGE_KEY, newKey);
    setKeyState(newKey);
  }, []);

  return { key, setParticipantKey };
}
