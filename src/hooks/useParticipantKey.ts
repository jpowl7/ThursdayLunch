"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "thursday-lunch-participant-key";

function generateKey(): string {
  return crypto.randomUUID();
}

export function useParticipantKey() {
  const [key, setKey] = useState<string | null>(null);

  useEffect(() => {
    let stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      stored = generateKey();
      localStorage.setItem(STORAGE_KEY, stored);
    }
    setKey(stored);
  }, []);

  return key;
}
