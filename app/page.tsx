"use client";

import { useState } from "react";
import { Header } from "@/components/header";
import { SearchBar } from "@/components/search-bar";
import { SearchResults } from "@/components/search-results";
import { AppDetail } from "@/components/app-detail";
import { SourceBadges } from "@/components/source-badges";
import { Footer } from "@/components/footer";

type View = "search" | "results" | "detail";

interface AppResult {
  package: string;
  name: string;
  version: string;
  source: string;
  icon_url?: string;
  description?: string;
}

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

export default function Home() {
  const [view, setView] = useState<View>("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AppResult[]>([]);
  const [selectedApp, setSelectedApp] = useState<AppInfo | null>(null);
  const [downloadInfo, setDownloadInfo] = useState<DownloadInfo | null>(null);
  const [versions, setVersions] = useState<VersionInfo[]>([]);
  const [selectedVersion, setSelectedVersion] = useState("");
  const [convertXapk, setConvertXapk] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDownload = async (pkg: string, versionCode?: string, convert?: boolean) => {
    const shouldConvert = convert ?? convertXapk;
    try {
      const resp = await fetch(`/api/download/${encodeURIComponent(pkg)}`);
      const data = await resp.json();
      if (resp.ok && data.download) {
        const params = new URLSearchParams();
        if (versionCode) params.set("version", versionCode);
        params.set("convert_xapk", String(shouldConvert));
        const qs = params.toString();
        setDownloadInfo({
          ...data.download,
          url: `/api/download-apk/${encodeURIComponent(pkg)}${qs ? `?${qs}` : ""}`,
          filename: shouldConvert
            ? (data.download.filename?.replace(/\.xapk$/i, ".apk") || `${pkg}.apk`)
            : (data.download.filename || `${pkg}.apk`),
        });
      }
    } catch {}
  };

  const fetchVersions = async (pkg: string) => {
    try {
      const resp = await fetch(`/api/versions/${encodeURIComponent(pkg)}`);
      const data = await resp.json();
      if (resp.ok && data.versions) setVersions(data.versions);
    } catch {}
  };

  const handleSearch = async (q: string) => {
    setQuery(q);
    setError(null);
    setLoading(true);
    setView("results");
    setResults([]);

    try {
      const resp = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Search failed");
      if (data.info) {
        setSelectedApp(data.info);
        setView("detail");
        fetchDownload(data.info.package);
        fetchVersions(data.info.package);
        return;
      }
      setResults(data.results || []);
      if (!(data.results || []).length) {
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
    setVersions([]);
    setSelectedVersion("");
    setView("detail");

    try {
      const resp = await fetch(`/api/info/${encodeURIComponent(pkg)}`);
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Failed to get app info");
      setSelectedApp(data.info);
      fetchDownload(pkg);
      fetchVersions(pkg);
    } catch (e: any) {
      setError(e.message || "Failed to get app info");
      setSelectedApp(null);
    } finally {
      setLoading(false);
    }
  };

  const handleVersionChange = (versionCode: string) => {
    setSelectedVersion(versionCode);
    if (selectedApp) {
      setDownloadInfo(null);
      fetchDownload(selectedApp.package, versionCode || undefined);
    }
  };

  const handleConvertToggle = (convert: boolean) => {
    setConvertXapk(convert);
    if (selectedApp) {
      setDownloadInfo(null);
      fetchDownload(selectedApp.package, selectedVersion || undefined, convert);
    }
  };

  const handleBack = () => {
    if (view === "detail") {
      if (results.length > 0) setView("results");
      else setView("search");
      setSelectedApp(null);
      setDownloadInfo(null);
      setVersions([]);
      setSelectedVersion("");
      setError(null);
    } else {
      setView("search");
      setResults([]);
      setError(null);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />
      <main style={{ flex: 1, width: "100%", maxWidth: 720, margin: "0 auto", padding: "0 20px" }}>
        {view === "search" && (
          <div className="animate-fade-in" style={{ paddingTop: 80 }}>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <h1
                style={{
                  fontSize: "clamp(2rem, 5vw, 3.5rem)",
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                  lineHeight: 1.1,
                  marginBottom: 16,
                }}
              >
                Download any APK
              </h1>
              <p
                style={{
                  fontSize: "1.125rem",
                  color: "var(--muted-foreground)",
                  maxWidth: 480,
                  margin: "0 auto",
                  lineHeight: 1.6,
                }}
              >
                Search by app name or paste a Google Play link. We search across multiple sources.
              </p>
            </div>
            <SearchBar onSearch={handleSearch} loading={loading} />
            <SourceBadges onSearch={handleSearch} />
          </div>
        )}

        {view === "results" && (
          <div className="animate-fade-in" style={{ paddingTop: 32 }}>
            <SearchBar onSearch={handleSearch} loading={loading} initialValue={query} compact />
            <div style={{ marginTop: 8, marginBottom: 24 }}>
              <button
                onClick={handleBack}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-tertiary)",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  fontFamily: "inherit",
                  padding: "4px 0",
                }}
              >
                {"<-"} Back to search
              </button>
            </div>
            <SearchResults results={results} loading={loading} error={error} onSelect={handleSelectApp} />
          </div>
        )}

        {view === "detail" && (
          <div className="animate-fade-in" style={{ paddingTop: 32 }}>
            <div style={{ marginBottom: 24 }}>
              <button
                onClick={handleBack}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-tertiary)",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  fontFamily: "inherit",
                  padding: "4px 0",
                }}
              >
                {"<-"} Back
              </button>
            </div>
            <AppDetail
              app={selectedApp}
              download={downloadInfo}
              versions={versions}
              selectedVersion={selectedVersion}
              convertXapk={convertXapk}
              onVersionChange={handleVersionChange}
              onConvertToggle={handleConvertToggle}
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
