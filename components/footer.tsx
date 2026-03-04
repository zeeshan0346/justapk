"use client";

export function Footer() {
  return (
    <footer
      style={{
        padding: "24px",
        textAlign: "center",
        borderTop: "1px solid var(--border)",
        marginTop: "48px",
      }}
    >
      <p style={{ fontSize: "0.8125rem", color: "var(--text-tertiary)" }}>
        Made by{" "}
        <a
          href="https://www.linkedin.com/in/zeeshan1337/"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "var(--accent)", textDecoration: "none" }}
        >
          Zeeshan
        </a>
        {" "}&middot; Built for security researchers & bug bounty hunters
      </p>
    </footer>
  );
}
