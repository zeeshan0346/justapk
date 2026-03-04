"use client";

import { useState, type FormEvent } from "react";

interface SearchBarProps {
  onSearch: (query: string) => void;
  loading?: boolean;
  initialValue?: string;
  compact?: boolean;
}

export function SearchBar({ onSearch, loading, initialValue = "", compact }: SearchBarProps) {
  const [value, setValue] = useState(initialValue);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    if (q) onSearch(q);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0",
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: compact ? "10px" : "14px",
          padding: compact ? "4px 4px 4px 16px" : "6px 6px 6px 20px",
          transition: "border-color 0.15s",
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--text-tertiary)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flexShrink: 0 }}
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="App name or Play Store URL..."
          aria-label="Search for an app"
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "var(--foreground)",
            fontSize: compact ? "0.9375rem" : "1rem",
            padding: compact ? "10px 12px" : "14px 16px",
            fontFamily: "inherit",
          }}
        />
        <button
          type="submit"
          disabled={loading || !value.trim()}
          style={{
            background: loading ? "var(--muted)" : "var(--accent)",
            color: loading ? "var(--muted-foreground)" : "var(--accent-foreground)",
            border: "none",
            borderRadius: compact ? "8px" : "10px",
            padding: compact ? "10px 20px" : "12px 28px",
            fontWeight: 600,
            fontSize: "0.875rem",
            cursor: loading ? "not-allowed" : "pointer",
            transition: "background 0.15s",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexShrink: 0,
          }}
        >
          {loading ? (
            <>
              <div
                style={{
                  width: 14,
                  height: 14,
                  border: "2px solid var(--muted-foreground)",
                  borderTopColor: "transparent",
                  borderRadius: "50%",
                }}
                className="animate-spin"
              />
              Searching
            </>
          ) : (
            "Search"
          )}
        </button>
      </div>
    </form>
  );
}
