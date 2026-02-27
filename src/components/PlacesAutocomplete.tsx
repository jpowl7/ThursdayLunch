"use client";

import { useState, useEffect, useRef } from "react";

interface PlaceSuggestion {
  placeId: string;
  mainText: string;
  secondaryText: string;
}

interface PlacesAutocompleteProps {
  value: string;
  onChange: (name: string, placeId: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  inputClassName?: string;
}

export function PlacesAutocomplete({
  value,
  onChange,
  placeholder = "Search for a place…",
  disabled,
  inputClassName,
}: PlacesAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [hasSelection, setHasSelection] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Fetch autocomplete suggestions
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 2 || hasSelection) {
      setSuggestions([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/places/autocomplete?input=${encodeURIComponent(value.trim())}`
        );
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data);
          setShowSuggestions(data.length > 0);
        }
      } catch {
        // ignore
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, hasSelection]);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selectSuggestion = (s: PlaceSuggestion) => {
    setHasSelection(true);
    setSuggestions([]);
    setShowSuggestions(false);
    onChange(s.mainText, s.placeId);
    inputRef.current?.focus();
  };

  const handleInputChange = (newValue: string) => {
    setHasSelection(false);
    onChange(newValue, null);
  };

  const defaultInputClass =
    "w-full bg-white border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none text-sm";

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
        placeholder={placeholder}
        disabled={disabled}
        className={inputClassName || defaultInputClass}
      />

      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-30 overflow-hidden"
        >
          {suggestions.map((s) => (
            <button
              key={s.placeId}
              type="button"
              onClick={() => selectSuggestion(s)}
              className="w-full text-left px-3 py-2 hover:bg-orange-50 transition-colors border-b border-slate-50 last:border-b-0"
            >
              <p className="text-sm font-semibold text-slate-800 truncate">{s.mainText}</p>
              <p className="text-xs text-slate-400 truncate">{s.secondaryText}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
