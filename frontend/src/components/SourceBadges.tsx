const sources = [
  { name: "APKPure", color: "#4ecdc4" },
  { name: "APK20", color: "#f7b731" },
  { name: "F-Droid", color: "#1a73e8" },
  { name: "Uptodown", color: "#9b59b6" },
];

interface SourceBadgesProps {
  onSearch?: (query: string) => void;
}

export function SourceBadges({ onSearch }: SourceBadgesProps) {
  return (
    <div
      style={{
        marginTop: "40px",
        textAlign: "center",
      }}
    >
      <p
        style={{
          fontSize: "0.75rem",
          color: "var(--text-tertiary)",
          marginBottom: "12px",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          fontWeight: 500,
        }}
      >
        Searches across
      </p>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          flexWrap: "wrap",
        }}
      >
        {sources.map((s) => (
          <span
            key={s.name}
            style={{
              fontSize: "0.8125rem",
              fontWeight: 500,
              color: "var(--text-secondary)",
              background: "var(--bg-secondary)",
              border: "1px solid var(--border)",
              padding: "6px 14px",
              borderRadius: "20px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: s.color,
              }}
            />
            {s.name}
          </span>
        ))}
      </div>

      <div
        style={{
          marginTop: "32px",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          alignItems: "center",
        }}
      >
        <p style={{ color: "var(--text-tertiary)", fontSize: "0.8125rem" }}>
          Try searching:
        </p>
        <div
          style={{
            display: "flex",
            gap: "6px",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {["telegram", "whatsapp", "vlc", "firefox"].map((term) => (
            <button
              key={term}
              onClick={() => onSearch?.(term)}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.8125rem",
                color: "var(--accent)",
                background: "var(--accent-muted)",
                padding: "4px 10px",
                borderRadius: "6px",
                border: "none",
                cursor: "pointer",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(34, 197, 94, 0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--accent-muted)";
              }}
            >
              {term}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
