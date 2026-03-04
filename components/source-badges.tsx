"use client";

const sources = [
  { name: "APKPure", color: "#4ecdc4" },
  { name: "APK20", color: "#f7b731" },
  { name: "F-Droid", color: "#1a73e8" },
  { name: "Uptodown", color: "#9b59b6" },
];

interface Props {
  onSearch?: (query: string) => void;
}

export function SourceBadges({ onSearch }: Props) {
  return (
    <div style={{ marginTop: "32px", textAlign: "center" }}>
      <p
        style={{
          fontSize: "0.8125rem",
          color: "var(--text-tertiary)",
          marginBottom: "16px",
        }}
      >
        Aggregating results from
      </p>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "8px",
          justifyContent: "center",
          marginBottom: "24px",
        }}
      >
        {sources.map((s) => (
          <span
            key={s.name}
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "0.75rem",
              color: s.color,
              background: `${s.color}15`,
              padding: "4px 12px",
              borderRadius: "6px",
              border: `1px solid ${s.color}25`,
            }}
          >
            {s.name}
          </span>
        ))}
      </div>
      <p
        style={{
          fontSize: "0.8125rem",
          color: "var(--text-tertiary)",
          marginBottom: "12px",
        }}
      >
        Try searching for
      </p>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "8px",
          justifyContent: "center",
        }}
      >
        {["telegram", "whatsapp", "vlc", "firefox"].map((term) => (
          <button
            key={term}
            onClick={() => onSearch?.(term)}
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "0.8125rem",
              color: "var(--accent)",
              background: "var(--accent-muted)",
              padding: "4px 10px",
              borderRadius: "6px",
              border: "none",
              cursor: "pointer",
              transition: "background 0.15s",
            }}
          >
            {term}
          </button>
        ))}
      </div>
    </div>
  );
}
