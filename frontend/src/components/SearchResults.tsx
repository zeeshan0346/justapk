import type { AppResult } from "../App";

interface SearchResultsProps {
  results: AppResult[];
  loading: boolean;
  error: string | null;
  onSelect: (pkg: string) => void;
}

export function SearchResults({
  results,
  loading,
  error,
  onSelect,
}: SearchResultsProps) {
  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="animate-pulse"
            style={{
              background: "var(--bg-secondary)",
              borderRadius: "var(--radius)",
              border: "1px solid var(--border)",
              padding: "16px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "var(--radius-sm)",
                background: "var(--bg-tertiary)",
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1 }}>
              <div
                style={{
                  height: "16px",
                  width: `${60 + i * 10}%`,
                  background: "var(--bg-tertiary)",
                  borderRadius: "4px",
                  marginBottom: "8px",
                }}
              />
              <div
                style={{
                  height: "12px",
                  width: "50%",
                  background: "var(--bg-tertiary)",
                  borderRadius: "4px",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          background: "var(--bg-secondary)",
          borderRadius: "var(--radius)",
          border: "1px solid var(--border)",
          padding: "40px 24px",
          textAlign: "center",
        }}
      >
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--text-tertiary)"
          strokeWidth="1.5"
          style={{ margin: "0 auto 12px" }}
        >
          <circle cx="12" cy="12" r="10" />
          <path d="m15 9-6 6M9 9l6 6" />
        </svg>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem" }}>
          {error}
        </p>
      </div>
    );
  }

  if (results.length === 0) return null;

  return (
    <div>
      <p
        style={{
          color: "var(--text-tertiary)",
          fontSize: "0.8125rem",
          marginBottom: "12px",
          fontFamily: "var(--font-mono)",
        }}
      >
        {results.length} result{results.length !== 1 ? "s" : ""} found
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {results.map((r, i) => (
          <button
            key={`${r.package}-${r.source}-${i}`}
            onClick={() => onSelect(r.package)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "14px 16px",
              background: "var(--bg-secondary)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              cursor: "pointer",
              textAlign: "left",
              fontFamily: "var(--font-sans)",
              transition: "border-color 0.15s, background 0.15s",
              color: "var(--text-primary)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--border-hover)";
              e.currentTarget.style.background = "var(--bg-tertiary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.background = "var(--bg-secondary)";
            }}
          >
            {r.icon_url ? (
              <img
                src={r.icon_url}
                alt=""
                width={44}
                height={44}
                style={{
                  borderRadius: "var(--radius-sm)",
                  flexShrink: 0,
                  objectFit: "cover",
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--bg-tertiary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  color: "var(--text-tertiary)",
                  fontSize: "1.25rem",
                  fontWeight: 700,
                }}
              >
                {r.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: "0.9375rem",
                  marginBottom: "2px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {r.name}
              </div>
              <div
                style={{
                  fontSize: "0.8125rem",
                  color: "var(--text-tertiary)",
                  fontFamily: "var(--font-mono)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {r.package}
              </div>
            </div>
            <div
              style={{
                fontSize: "0.6875rem",
                color: "var(--text-tertiary)",
                background: "var(--bg-elevated)",
                padding: "3px 8px",
                borderRadius: "4px",
                fontFamily: "var(--font-mono)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                flexShrink: 0,
              }}
            >
              {r.source}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
