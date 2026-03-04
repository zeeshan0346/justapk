"use client";

interface AppResult {
  package: string;
  name: string;
  version: string;
  source: string;
  icon_url?: string;
  description?: string;
}

interface Props {
  results: AppResult[];
  loading: boolean;
  error: string | null;
  onSelect: (pkg: string) => void;
}

const sourceColors: Record<string, string> = {
  apkpure: "#4ecdc4",
  apk20: "#f7b731",
  fdroid: "#1a73e8",
  uptodown: "#9b59b6",
};

export function SearchResults({ results, loading, error, onSelect }: Props) {
  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="animate-pulse"
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: "16px 20px",
              height: 72,
            }}
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: "32px",
          textAlign: "center",
          color: "var(--muted-foreground)",
        }}
      >
        <p>{error}</p>
      </div>
    );
  }

  if (!results.length) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <p
        style={{
          fontSize: "0.8125rem",
          color: "var(--text-tertiary)",
          marginBottom: "8px",
        }}
      >
        {results.length} result{results.length !== 1 ? "s" : ""} found
      </p>
      {results.map((app) => {
        const color = sourceColors[app.source] || "var(--accent)";
        return (
          <button
            key={`${app.package}-${app.source}`}
            onClick={() => onSelect(app.package)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: "14px 18px",
              cursor: "pointer",
              transition: "border-color 0.15s, background 0.15s",
              textAlign: "left",
              width: "100%",
              color: "var(--foreground)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--border-hover)";
              e.currentTarget.style.background = "var(--muted)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.background = "var(--card)";
            }}
          >
            {app.icon_url ? (
              <img
                src={app.icon_url}
                alt=""
                width={40}
                height={40}
                style={{ borderRadius: "8px", flexShrink: 0 }}
                crossOrigin="anonymous"
              />
            ) : (
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "8px",
                  background: "var(--muted)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "0.75rem",
                  color: "var(--accent)",
                  flexShrink: 0,
                }}
              >
                APK
              </div>
            )}
            <div style={{ flex: 1, overflow: "hidden" }}>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: "0.9375rem",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {app.name}
              </div>
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "0.75rem",
                  color: "var(--muted-foreground)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {app.package}
              </div>
            </div>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "0.6875rem",
                color,
                background: `${color}15`,
                padding: "3px 8px",
                borderRadius: "4px",
                border: `1px solid ${color}25`,
                flexShrink: 0,
              }}
            >
              {app.source}
            </span>
          </button>
        );
      })}
    </div>
  );
}
