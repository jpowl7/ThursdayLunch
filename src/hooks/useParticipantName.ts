"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "thursday-lunch-participant-name";

export function useParticipantName() {
  const [name, setNameState] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    setNameState(stored);
    setLoaded(true);
  }, []);

  const setName = useCallback((newName: string) => {
    localStorage.setItem(STORAGE_KEY, newName);
    setNameState(newName);
  }, []);

  return { name, loaded, setName };
}
