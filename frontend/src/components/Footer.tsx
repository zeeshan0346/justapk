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
        Made by{" "}
        <a
          href="https://www.linkedin.com/in/zeeshan1337/"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: "var(--accent)",
            textDecoration: "underline",
            textUnderlineOffset: "2px",
          }}
        >
          Zeeshan
        </a>{" "}
        &mdash; Multi-source APK downloader for security researchers
      </p>
      <p
        style={{
          fontSize: "0.6875rem",
          color: "var(--text-tertiary)",
          marginTop: "4px",
          opacity: 0.7,
        }}
      >
        For authorized security testing only. Respect app developers and their licenses.
      </p>
    </footer>
  );
}
