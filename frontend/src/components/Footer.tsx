export function Footer() {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--border)",
        padding: "24px 20px",
        marginTop: "60px",
        textAlign: "center",
      }}
    >
      <p
        style={{
          fontSize: "0.75rem",
          color: "var(--text-tertiary)",
          lineHeight: 1.6,
        }}
      >
        Powered by{" "}
        <a
          href="https://github.com/TheQmaks/justapk"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: "var(--text-secondary)",
            textDecoration: "underline",
            textUnderlineOffset: "2px",
          }}
        >
          justapk
        </a>{" "}
        &mdash; Multi-source APK downloader with automatic fallback
      </p>
      <p
        style={{
          fontSize: "0.6875rem",
          color: "var(--text-tertiary)",
          marginTop: "4px",
          opacity: 0.7,
        }}
      >
        For personal use only. Respect app developers and their licenses.
      </p>
    </footer>
  );
}
