import type { AppInfo, DownloadInfo } from "../App";

interface AppDetailProps {
  app: AppInfo | null;
  download: DownloadInfo | null;
  loading: boolean;
  error: string | null;
}

export function AppDetail({ app, download, loading, error }: AppDetailProps) {
  if (loading && !app) {
    return (
      <div
        className="animate-pulse"
        style={{
          background: "var(--bg-secondary)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border)",
          padding: "32px",
        }}
      >
        <div style={{ display: "flex", gap: "20px", marginBottom: "24px" }}>
          <div
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "var(--radius)",
              background: "var(--bg-tertiary)",
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1 }}>
            <div
              style={{
                height: "24px",
                width: "60%",
                background: "var(--bg-tertiary)",
                borderRadius: "6px",
                marginBottom: "12px",
              }}
            />
            <div
              style={{
                height: "16px",
                width: "40%",
                background: "var(--bg-tertiary)",
                borderRadius: "4px",
              }}
            />
          </div>
        </div>
        <div
          style={{
            height: "48px",
            background: "var(--bg-tertiary)",
            borderRadius: "var(--radius)",
          }}
        />
      </div>
    );
  }

  if (error && !app) {
    return (
      <div
        style={{
          background: "var(--bg-secondary)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border)",
          padding: "40px 24px",
          textAlign: "center",
        }}
      >
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--danger)"
          strokeWidth="1.5"
          style={{ margin: "0 auto 16px" }}
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem" }}>
          {error}
        </p>
      </div>
    );
  }

  if (!app) return null;

  return (
    <div
      className="animate-fade-in"
      style={{
        background: "var(--bg-secondary)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border)",
        overflow: "hidden",
      }}
    >
      {/* App Header */}
      <div
        style={{
          padding: "28px 28px 20px",
          display: "flex",
          gap: "20px",
          alignItems: "flex-start",
        }}
      >
        {app.icon_url ? (
          <img
            src={app.icon_url}
            alt=""
            width={72}
            height={72}
            style={{
              borderRadius: "var(--radius)",
              flexShrink: 0,
              objectFit: "cover",
              border: "1px solid var(--border)",
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "var(--radius)",
              background: "var(--bg-tertiary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              color: "var(--accent)",
              fontSize: "1.75rem",
              fontWeight: 800,
              border: "1px solid var(--border)",
            }}
          >
            {app.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              marginBottom: "4px",
              lineHeight: 1.2,
            }}
          >
            {app.name}
          </h2>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.8125rem",
              color: "var(--text-tertiary)",
              marginBottom: "12px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {app.package}
          </div>
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
            {app.version && (
              <InfoTag label="Version" value={app.version} />
            )}
            {app.size_formatted && app.size_formatted !== "Unknown" && (
              <InfoTag label="Size" value={app.size_formatted} />
            )}
            <InfoTag label="Source" value={app.source} />
          </div>
        </div>
      </div>

      {/* Description */}
      {app.description && (
        <div
          style={{
            padding: "0 28px 20px",
            color: "var(--text-secondary)",
            fontSize: "0.875rem",
            lineHeight: 1.6,
          }}
        >
          {app.description}
        </div>
      )}

      {/* Download Section */}
      <div
        style={{
          padding: "20px 28px 28px",
          borderTop: "1px solid var(--border)",
        }}
      >
        {download ? (
          <div>
            <a
              href={download.url}
              download={download.filename}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                width: "100%",
                padding: "14px 24px",
                background: "var(--accent)",
                color: "var(--bg-primary)",
                borderRadius: "var(--radius)",
                fontWeight: 700,
                fontSize: "0.9375rem",
                fontFamily: "var(--font-sans)",
                textDecoration: "none",
                transition: "background 0.15s, transform 0.1s",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--accent-hover)";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--accent)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7,10 12,15 17,10" />
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
                  fontFamily: "var(--font-mono)",
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
              <span
                style={{
                  fontSize: "0.6875rem",
                  color: "var(--accent)",
                  background: "var(--accent-muted)",
                  padding: "3px 10px",
                  borderRadius: "4px",
                  fontFamily: "var(--font-mono)",
                }}
              >
                XAPK auto-converted to pure APK
              </span>
            </div>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              padding: "14px 24px",
              background: "var(--bg-tertiary)",
              borderRadius: "var(--radius)",
              color: "var(--text-tertiary)",
              fontSize: "0.9375rem",
            }}
          >
            <svg
              className="animate-spin"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            Fetching download link...
          </div>
        )}
      </div>
    </div>
  );
}

function InfoTag({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        fontSize: "0.8125rem",
      }}
    >
      <span style={{ color: "var(--text-tertiary)" }}>{label}</span>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          color: "var(--text-primary)",
          background: "var(--bg-elevated)",
          padding: "2px 8px",
          borderRadius: "4px",
          fontSize: "0.75rem",
        }}
      >
        {value}
      </span>
    </div>
  );
}
