import { useState, type FormEvent } from "react";

interface SearchBarProps {
  onSearch: (query: string) => void;
  loading?: boolean;
  initialValue?: string;
  compact?: boolean;
}

export function SearchBar({
  onSearch,
  loading,
  initialValue = "",
  compact,
}: SearchBarProps) {
  const [value, setValue] = useState(initialValue);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed) {
      onSearch(trimmed);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ width: "100%" }}>
      <div
        style={{
          display: "flex",
          gap: "8px",
          width: "100%",
        }}
      >
        <div
          style={{
            flex: 1,
            position: "relative",
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
            style={{
              position: "absolute",
              left: "14px",
              top: "50%",
              transform: "translateY(-50%)",
              pointerEvents: "none",
            }}
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Search app name or paste Play Store link..."
            disabled={loading}
            style={{
              width: "100%",
              padding: compact ? "10px 14px 10px 42px" : "14px 16px 14px 44px",
              fontSize: compact ? "0.875rem" : "1rem",
              fontFamily: "var(--font-sans)",
              background: "var(--bg-secondary)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              color: "var(--text-primary)",
              outline: "none",
              transition: "border-color 0.15s, box-shadow 0.15s",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--accent)";
              e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-muted)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
        </div>
        <button
          type="submit"
          disabled={loading || !value.trim()}
          style={{
            padding: compact ? "10px 20px" : "14px 28px",
            fontSize: compact ? "0.875rem" : "0.9375rem",
            fontWeight: 600,
            fontFamily: "var(--font-sans)",
            background: loading ? "var(--bg-tertiary)" : "var(--accent)",
            color: loading ? "var(--text-tertiary)" : "var(--bg-primary)",
            border: "none",
            borderRadius: "var(--radius)",
            cursor: loading || !value.trim() ? "not-allowed" : "pointer",
            transition: "background 0.15s, transform 0.1s",
            whiteSpace: "nowrap",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
          onMouseEnter={(e) => {
            if (!loading) e.currentTarget.style.background = "var(--accent-hover)";
          }}
          onMouseLeave={(e) => {
            if (!loading) e.currentTarget.style.background = "var(--accent)";
          }}
        >
          {loading && (
            <svg
              className="animate-spin"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          )}
          {loading ? "Searching..." : "Search"}
        </button>
      </div>
    </form>
  );
}
