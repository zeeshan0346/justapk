import { useState } from "react";
import { Header } from "./components/Header";
import { SearchBar } from "./components/SearchBar";
import { SearchResults } from "./components/SearchResults";
import { AppDetail } from "./components/AppDetail";
import { SourceBadges } from "./components/SourceBadges";
import { Footer } from "./components/Footer";

export interface AppResult {
  package: string;
  name: string;
  version: string;
  source: string;
  icon_url?: string;
  description?: string;
}

export interface AppInfo {
  package: string;
  name: string;
  version: string;
  size?: number;
  size_formatted?: string;
  source: string;
  icon_url?: string;
  description?: string;
}

export interface DownloadInfo {
  url: string;
  filename: string;
  version: string;
  source: string;
  headers?: Record<string, string>;
}

type View = "search" | "results" | "detail";

export function App() {
  const [view, setView] = useState<View>("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AppResult[]>([]);
  const [selectedApp, setSelectedApp] = useState<AppInfo | null>(null);
  const [downloadInfo, setDownloadInfo] = useState<DownloadInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (q: string) => {
    setQuery(q);
    setError(null);
    setLoading(true);
    setView("results");
    setResults([]);

    try {
      const resp = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data.detail || "Search failed");
      }

      // If the API returned info directly (Play Store URL), go to detail
      if (data.info) {
        setSelectedApp(data.info);
        setView("detail");
        // Also fetch download URL
        fetchDownload(data.info.package);
        return;
      }

      setResults(data.results || []);
      if ((data.results || []).length === 0) {
        setError("No apps found. Try a different search term or a package name like com.whatsapp.");
      }
    } catch (e: any) {
      setError(e.message || "Search failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectApp = async (pkg: string) => {
    setError(null);
    setLoading(true);
    setDownloadInfo(null);
    setView("detail");

    try {
      const resp = await fetch(`/api/info/${encodeURIComponent(pkg)}`);
      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data.detail || "Failed to get app info");
      }

      setSelectedApp(data.info);
      fetchDownload(pkg);
    } catch (e: any) {
      setError(e.message || "Failed to get app info");
      setSelectedApp(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchDownload = async (pkg: string) => {
    try {
      // First get the download metadata (URL, filename, etc.)
      const resp = await fetch(`/api/download/${encodeURIComponent(pkg)}`);
      const data = await resp.json();
      if (resp.ok && data.download) {
        // Override the download URL to use our APK extraction endpoint
        // This ensures XAPK files are converted to pure APK automatically
        setDownloadInfo({
          ...data.download,
          url: `/api/download-apk/${encodeURIComponent(pkg)}`,
          filename: data.download.filename?.replace(/\.xapk$/i, ".apk") || `${pkg}.apk`,
        });
      }
    } catch {
      // Download info is optional, don't block
    }
  };

  const handleBack = () => {
    if (view === "detail") {
      if (results.length > 0) {
        setView("results");
      } else {
        setView("search");
      }
      setSelectedApp(null);
      setDownloadInfo(null);
      setError(null);
    } else {
      setView("search");
      setResults([]);
      setError(null);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Header />

      <main
        style={{
          flex: 1,
          width: "100%",
          maxWidth: "720px",
          margin: "0 auto",
          padding: "0 20px",
        }}
      >
        {view === "search" && (
          <div className="animate-fade-in" style={{ paddingTop: "80px" }}>
            <div style={{ textAlign: "center", marginBottom: "48px" }}>
              <h1
                style={{
                  fontSize: "clamp(2rem, 5vw, 3.5rem)",
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                  lineHeight: 1.1,
                  marginBottom: "16px",
                  color: "var(--text-primary)",
                }}
              >
                Download any APK
              </h1>
              <p
                style={{
                  fontSize: "1.125rem",
                  color: "var(--text-secondary)",
                  maxWidth: "480px",
                  margin: "0 auto",
                  lineHeight: 1.6,
                }}
              >
                Search by app name or paste a Google Play link.
                We search across multiple sources to find your APK.
              </p>
            </div>

            <SearchBar onSearch={handleSearch} loading={loading} />
            <SourceBadges onSearch={handleSearch} />
          </div>
        )}

        {view === "results" && (
          <div className="animate-fade-in" style={{ paddingTop: "32px" }}>
            <SearchBar
              onSearch={handleSearch}
              loading={loading}
              initialValue={query}
              compact
            />
            <div style={{ marginTop: "8px", marginBottom: "24px" }}>
              <button
                onClick={handleBack}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-tertiary)",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  fontFamily: "var(--font-sans)",
                  padding: "4px 0",
                }}
              >
                {"<-"} Back to search
              </button>
            </div>
            <SearchResults
              results={results}
              loading={loading}
              error={error}
              onSelect={handleSelectApp}
            />
          </div>
        )}

        {view === "detail" && (
          <div className="animate-fade-in" style={{ paddingTop: "32px" }}>
            <div style={{ marginBottom: "24px" }}>
              <button
                onClick={handleBack}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-tertiary)",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  fontFamily: "var(--font-sans)",
                  padding: "4px 0",
                }}
              >
                {"<-"} Back
              </button>
            </div>
            <AppDetail
              app={selectedApp}
              download={downloadInfo}
              loading={loading}
              error={error}
            />
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
