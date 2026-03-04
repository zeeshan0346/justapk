"use client";

interface AppInfo {
  package: string;
  name: string;
  version: string;
  size?: number;
  size_formatted?: string;
  source: string;
  icon_url?: string;
  description?: string;
}

interface DownloadInfo {
  url: string;
  filename: string;
  version: string;
  source: string;
}

interface VersionInfo {
  version_code: string;
  version_name: string;
  source?: string;
  size_formatted?: string;
}

interface Props {
  app: AppInfo | null;
  download: DownloadInfo | null;
  versions: VersionInfo[];
  selectedVersion: string;
  convertXapk: boolean;
  onVersionChange: (versionCode: string) => void;
  onConvertToggle: (convert: boolean) => void;
  loading: boolean;
  error: string | null;
}

const sourceColors: Record<string, string> = {
  apkpure: "#4ecdc4",
  apk20: "#f7b731",
  fdroid: "#1a73e8",
  uptodown: "#9b59b6",
};

export function AppDetail({
  app,
  download,
  versions,
  selectedVersion,
  convertXapk,
  onVersionChange,
  onConvertToggle,
  loading,
  error,
}: Props) {
  if (loading && !app) {
    return (
      <div className="animate-pulse" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: 12, background: "var(--muted)" }} />
          <div style={{ flex: 1 }}>
            <div style={{ height: 20, background: "var(--muted)", borderRadius: 6, marginBottom: 8, width: "60%" }} />
            <div style={{ height: 14, background: "var(--muted)", borderRadius: 4, width: "80%" }} />
          </div>
        </div>
        <div style={{ height: 120, background: "var(--muted)", borderRadius: "var(--radius)" }} />
      </div>
    );
  }

  if (error && !app) {
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

  if (!app) return null;

  const color = sourceColors[app.source] || "var(--accent)";

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* App header */}
      <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
        {app.icon_url ? (
          <img
            src={app.icon_url}
            alt={`${app.name} icon`}
            width={64}
            height={64}
            style={{ borderRadius: 12, flexShrink: 0 }}
            crossOrigin="anonymous"
          />
        ) : (
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 12,
              background: "var(--muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "1rem",
              color: "var(--accent)",
              flexShrink: 0,
            }}
          >
            APK
          </div>
        )}
        <div style={{ flex: 1, overflow: "hidden" }}>
          <h2
            style={{
              fontSize: "1.25rem",
              fontWeight: 700,
              letterSpacing: "-0.01em",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {app.name}
          </h2>
          <p
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "0.8125rem",
              color: "var(--muted-foreground)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {app.package}
          </p>
        </div>
      </div>

      {/* Info grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "12px",
        }}
      >
        {[
          { label: "Version", value: app.version || "N/A" },
          { label: "Size", value: app.size_formatted || "Unknown" },
          { label: "Source", value: app.source, color },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              padding: "12px 16px",
            }}
          >
            <div
              style={{
                fontSize: "0.6875rem",
                color: "var(--text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: "4px",
              }}
            >
              {item.label}
            </div>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: item.color || "var(--foreground)",
              }}
            >
              {item.value}
            </div>
          </div>
        ))}
      </div>

      {/* Version selector */}
      {versions.length > 0 && (
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: "16px 20px",
          }}
        >
          <label
            htmlFor="version-select"
            style={{
              fontSize: "0.75rem",
              color: "var(--text-tertiary)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              display: "block",
              marginBottom: "8px",
            }}
          >
            Select Version
          </label>
          <select
            id="version-select"
            value={selectedVersion}
            onChange={(e) => onVersionChange(e.target.value)}
            style={{
              width: "100%",
              background: "var(--muted)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "10px 12px",
              color: "var(--foreground)",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "0.8125rem",
              outline: "none",
              cursor: "pointer",
              appearance: "auto",
            }}
          >
            <option value="">Latest</option>
            {versions.map((v, i) => (
              <option key={`${v.version_code}-${i}`} value={v.version_code}>
                {v.version_name}
                {v.size_formatted && v.size_formatted !== "Unknown" ? ` (${v.size_formatted})` : ""}
                {v.source ? ` - ${v.source}` : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* XAPK toggle */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        <div>
          <div style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "2px" }}>
            Auto-convert XAPK to APK
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>
            Extract base.apk from split bundles for jadx/apktool analysis
          </div>
        </div>
        <button
          onClick={() => onConvertToggle(!convertXapk)}
          aria-label={convertXapk ? "Disable XAPK conversion" : "Enable XAPK conversion"}
          style={{
            width: 44,
            height: 24,
            borderRadius: 12,
            background: convertXapk ? "var(--accent)" : "var(--muted)",
            border: "none",
            cursor: "pointer",
            position: "relative",
            transition: "background 0.2s",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: "var(--foreground)",
              position: "absolute",
              top: 3,
              left: convertXapk ? 23 : 3,
              transition: "left 0.2s",
            }}
          />
        </button>
      </div>

      {/* Download section */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: "24px",
          textAlign: "center",
        }}
      >
        {download ? (
          <>
            <a
              href={download.url}
              download={download.filename}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "10px",
                background: "var(--accent)",
                color: "var(--accent-foreground)",
                padding: "14px 36px",
                borderRadius: "10px",
                fontWeight: 700,
                fontSize: "1rem",
                textDecoration: "none",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--accent-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "var(--accent)")}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download APK
            </a>
            <div
              style={{
                marginTop: "12px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "0.75rem",
                  color: "var(--text-tertiary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: "100%",
                }}
              >
                {download.filename}
              </span>
              {convertXapk && (
                <span
                  style={{
                    fontSize: "0.6875rem",
                    color: "var(--accent)",
                    background: "var(--accent-muted)",
                    padding: "3px 10px",
                    borderRadius: "4px",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  XAPK auto-converted to pure APK
                </span>
              )}
            </div>
          </>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
            <div
              className="animate-spin"
              style={{
                width: 16,
                height: 16,
                border: "2px solid var(--border)",
                borderTopColor: "var(--accent)",
                borderRadius: "50%",
              }}
            />
            <span style={{ color: "var(--muted-foreground)", fontSize: "0.875rem" }}>
              Fetching download link...
            </span>
          </div>
        )}
      </div>

      {/* Description */}
      {app.description && (
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: "16px 20px",
          }}
        >
          <div
            style={{
              fontSize: "0.6875rem",
              color: "var(--text-tertiary)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "8px",
            }}
          >
            Description
          </div>
          <p style={{ fontSize: "0.875rem", lineHeight: 1.6, color: "var(--muted-foreground)" }}>
            {app.description}
          </p>
        </div>
      )}
    </div>
  );
}
