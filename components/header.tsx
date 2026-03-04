"use client";

export function Header() {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 24px",
        borderBottom: "1px solid var(--border)",
        background: "var(--background)",
        position: "sticky",
        top: 0,
        zIndex: 50,
        backdropFilter: "blur(12px)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div
          style={{
            width: 28,
            height: 28,
            background: "var(--accent)",
            borderRadius: "6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 700,
            fontSize: "0.75rem",
            color: "var(--background)",
          }}
        >
          {"//"}
        </div>
        <span style={{ fontWeight: 700, fontSize: "1.125rem", letterSpacing: "-0.02em" }}>
          APKDrop
        </span>
      </div>
      <a
        href="https://www.linkedin.com/in/zeeshan1337/"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          color: "var(--text-tertiary)",
          fontSize: "0.8125rem",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          textDecoration: "none",
          transition: "color 0.15s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--foreground)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-tertiary)")}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
        by Zeeshan
      </a>
    </header>
  );
}
