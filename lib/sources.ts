import * as cheerio from "cheerio";
import crypto from "crypto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SearchResult {
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
  size_formatted: string;
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

export interface VersionInfo {
  version_code: string;
  version_name: string;
  source?: string;
  size?: number;
  size_formatted?: string;
}

// ---------------------------------------------------------------------------
// Shared utils
// ---------------------------------------------------------------------------

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const TIMEOUT = 30_000;

function formatSize(bytes: number | undefined | null): string {
  if (!bytes) return "Unknown";
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function parseSize(sizeStr: string): number | undefined {
  const m = sizeStr.match(/([\d.]+)\s*(MB|GB|KB)/i);
  if (!m) return undefined;
  const val = parseFloat(m[1]);
  const unit = m[2].toUpperCase();
  const mul: Record<string, number> = { GB: 1024 ** 3, MB: 1024 ** 2, KB: 1024 };
  return Math.floor(val * (mul[unit] || 1));
}

async function fetchText(url: string, opts?: RequestInit): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const resp = await fetch(url, {
      ...opts,
      signal: controller.signal,
      headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9", ...opts?.headers },
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return await resp.text();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJSON(url: string, opts?: RequestInit): Promise<any> {
  const text = await fetchText(url, opts);
  return JSON.parse(text);
}

export function extractPackageFromPlayUrl(url: string): string | null {
  const m = url.match(/id=([a-zA-Z0-9_.]+)/);
  return m ? m[1] : null;
}

// ---------------------------------------------------------------------------
// APK20 Source
// ---------------------------------------------------------------------------

const APK20_BASE = "https://www.apk20.com";
const APK20_FILE_SERVER = "https://srv01.apk20.com";

function parseRscApps(text: string): Array<{ packageName?: string; title?: string }> {
  const results: Array<{ packageName?: string; title?: string }> = [];
  const seen = new Set<string>();
  const regex = /self\.__next_f\.push\(\[1,"(.+?)"\]\)/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text))) {
    const chunk = m[1].replace(/\\"/g, '"').replace(/\\n/g, "\n").replace(/\\\\/g, "\\");
    const objRegex = /\{"packageName":"[^"]+?"[^}]*\}/g;
    let objM: RegExpExecArray | null;
    while ((objM = objRegex.exec(chunk))) {
      try {
        const item = JSON.parse(objM[0]);
        const pkg = item.packageName || "";
        if (pkg && !seen.has(pkg)) {
          seen.add(pkg);
          results.push(item);
        }
      } catch {}
    }
  }
  return results;
}

export const apk20 = {
  name: "apk20",

  async search(query: string): Promise<SearchResult[]> {
    const text = await fetchText(`${APK20_BASE}/search/${encodeURIComponent(query)}`);
    return parseRscApps(text).map((app) => ({
      package: app.packageName || "",
      name: app.title || app.packageName || "",
      version: "",
      source: "apk20",
    }));
  },

  async getInfo(pkg: string): Promise<AppInfo | null> {
    try {
      const text = await fetchText(`${APK20_BASE}/apk/${pkg}`);
      const $ = cheerio.load(text);
      const name = $("[itemprop='name']").attr("content") || $("[itemprop='name']").text().trim() || pkg;
      const version = $("[itemprop='softwareVersion']").attr("content") || $("[itemprop='softwareVersion']").text().trim() || "";
      const sizeText = $("[itemprop='fileSize']").attr("content") || $("[itemprop='fileSize']").text().trim() || "";
      const size = parseSize(sizeText);
      const iconUrl = $("img[itemprop='image']").attr("src") || undefined;
      return { package: pkg, name, version, size, size_formatted: formatSize(size), source: "apk20", icon_url: iconUrl };
    } catch {
      return null;
    }
  },

  async getVersions(pkg: string): Promise<VersionInfo[]> {
    try {
      const text = await fetchText(`${APK20_BASE}/apk/${pkg}`);
      const versions: VersionInfo[] = [];
      const seen = new Set<string>();
      const codeRegex = /"versionCode":\s*(\d+)/g;
      let m: RegExpExecArray | null;
      while ((m = codeRegex.exec(text))) {
        if (!seen.has(m[1])) {
          seen.add(m[1]);
          versions.push({ version_code: m[1], version_name: m[1], source: "apk20" });
        }
      }
      return versions;
    } catch {
      return [];
    }
  },

  async getDownloadUrl(pkg: string, versionCode?: string): Promise<DownloadInfo> {
    const text = await fetchText(`${APK20_BASE}/apk/${pkg}`);
    if (!versionCode) {
      const dlMatch = text.match(new RegExp(`/apk/${pkg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/download/(\\d+)`));
      if (dlMatch) {
        versionCode = dlMatch[1];
      } else {
        const codes = [...text.matchAll(/"versionCode":\s*(\d+)/g)].map((m) => m[1]);
        if (!codes.length) throw new Error(`No versions found for: ${pkg}`);
        versionCode = codes[0];
      }
    }
    const $ = cheerio.load(text);
    const version = $("[itemprop='softwareVersion']").attr("content") || $("[itemprop='softwareVersion']").text().trim() || "";
    const verifyData = await fetchJSON(`${APK20_BASE}/api/verify/${pkg}/${versionCode}`);
    if (!verifyData.success) throw new Error(`Verify failed: ${verifyData.message || "unknown"}`);
    const filename = verifyData.filename as string;
    const ext = filename.includes(".") ? "." + filename.split(".").pop() : ".apk";
    return {
      url: `${APK20_FILE_SERVER}/${filename}`,
      filename: `${pkg}-${version}${ext}`,
      version,
      source: "apk20",
    };
  },
};

// ---------------------------------------------------------------------------
// F-Droid Source
// ---------------------------------------------------------------------------

const FDROID_API = "https://f-droid.org/api/v1";
const FDROID_REPO = "https://f-droid.org/repo";
const FDROID_SEARCH = "https://search.f-droid.org/";

export const fdroid = {
  name: "fdroid",

  async search(query: string): Promise<SearchResult[]> {
    const text = await fetchText(`${FDROID_SEARCH}?q=${encodeURIComponent(query)}`);
    const $ = cheerio.load(text);
    const results: SearchResult[] = [];
    $("a[href*='/packages/']").each((_, el) => {
      const href = $(el).attr("href") || "";
      const m = href.match(/\/packages\/([^/]+)\/?/);
      if (!m) return;
      const pkg = m[1];
      const name = $(el).find("h4.package-name, .package-name").text().trim() || pkg;
      results.push({ package: pkg, name, version: "", source: "fdroid" });
    });
    return results;
  },

  async getInfo(pkg: string): Promise<AppInfo | null> {
    try {
      const data = await fetchJSON(`${FDROID_API}/packages/${pkg}`);
      const packages = data.packages || [];
      const latest = packages[0] || {};
      return {
        package: pkg,
        name: pkg,
        version: latest.versionName || "",
        size: latest.size,
        size_formatted: formatSize(latest.size),
        source: "fdroid",
      };
    } catch {
      return null;
    }
  },

  async getVersions(pkg: string): Promise<VersionInfo[]> {
    try {
      const data = await fetchJSON(`${FDROID_API}/packages/${pkg}`);
      return (data.packages || []).map((p: any) => ({
        version_code: String(p.versionCode || ""),
        version_name: p.versionName || String(p.versionCode || ""),
        size: p.size,
        size_formatted: formatSize(p.size),
        source: "fdroid",
      }));
    } catch {
      return [];
    }
  },

  async getDownloadUrl(pkg: string, versionCode?: string): Promise<DownloadInfo> {
    const data = await fetchJSON(`${FDROID_API}/packages/${pkg}`);
    const packages = data.packages || [];
    if (!packages.length) throw new Error(`No versions for: ${pkg}`);
    let vc: number;
    if (versionCode) {
      vc = parseInt(versionCode, 10);
    } else {
      vc = data.suggestedVersionCode || packages[0].versionCode;
    }
    let versionName = "";
    for (const p of packages) {
      if (p.versionCode === vc) {
        versionName = p.versionName || String(vc);
        break;
      }
    }
    return {
      url: `${FDROID_REPO}/${pkg}_${vc}.apk`,
      filename: `${pkg}-${versionName}.apk`,
      version: versionName,
      source: "fdroid",
    };
  },
};

// ---------------------------------------------------------------------------
// APKPure Source (mobile API)
// ---------------------------------------------------------------------------

const APKPURE_API = "https://tapi.pureapk.com/v3";
const APKPURE_AUTH_KEY = "qNKrYmW8SSUqJ73k3P2yfMxRTo3sJTR";
const APKPURE_SIGN_SECRET = "d33cb23fd17fda8ea38be504929b77ef";

function apkpureHeaders(): Record<string, string> {
  const deviceUuid = crypto.randomUUID();
  const projectA = JSON.stringify({
    device_info: {
      abis: ["arm64-v8a", "armeabi-v7a"],
      android_id: crypto.createHash("md5").update(deviceUuid).digest("hex").slice(0, 16),
      brand: "samsung", country: "United States", country_code: "US",
      imei: "", language: "en-US", manufacturer: "samsung", mode: "SM-G955F",
      os_ver: "34", os_ver_name: "14", platform: 1, product: "dream2lte",
      screen_height: 2888, screen_width: 1440,
    },
    host_app_info: {
      build_no: "873", channel: "", md5: "", pkg_name: "com.apkpure.aegon",
      sdk_ver: "3.20.6309", version_code: 3206397, version_name: "3.20.6309",
    },
    net_info: {
      carrier_code: 0, ipv4: "", ipv6: "", mac_address: "",
      net_type: 1, use_vpn: false, wifi_bssid: "", wifi_ssid: "",
    },
    user_info: {
      auth_key: APKPURE_AUTH_KEY, country: "United States", country_code: "US",
      guid: "", language: "en-US", qimei: "", qimei_token: "", user_id: "",
      uuid: deviceUuid,
    },
  });
  return {
    "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 14; SM-G955F Build/AP2A.240805.005); APKPure/3.20.6309 (Aegon)",
    "Ual-Access-Businessid": "projecta",
    "Ual-Access-ProjectA": projectA,
    "Ual-Access-Sequence": crypto.randomUUID(),
    "Ual-Access-Signature": "",
    "Ual-Access-Nonce": "0",
    "Ual-Access-Timestamp": "0",
    "Accept-Encoding": "gzip",
  };
}

function apkpureSignBody(headers: Record<string, string>, body: string): void {
  const ts = String(Date.now());
  const nonce = String(Math.floor(10000000 + Math.random() * 90000000));
  const sig = crypto.createHash("md5").update(body + ts + APKPURE_SIGN_SECRET + nonce).digest("hex");
  headers["Ual-Access-Signature"] = sig;
  headers["Ual-Access-Nonce"] = nonce;
  headers["Ual-Access-Timestamp"] = ts;
  headers["Content-Type"] = "application/json; charset=utf-8";
}

async function apkpureDetail(pkg: string): Promise<any | null> {
  const body = JSON.stringify({ package_name: pkg, hl: "en-US" });
  const headers = apkpureHeaders();
  apkpureSignBody(headers, body);
  try {
    const resp = await fetch(`${APKPURE_API}/get_app_detail`, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(TIMEOUT),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.app_detail || null;
  } catch {
    return null;
  }
}

export const apkpure = {
  name: "apkpure",

  async search(query: string): Promise<SearchResult[]> {
    const headers = apkpureHeaders();
    const url = `${APKPURE_API}/search_query_new?hl=en-US&key=${encodeURIComponent(query)}&page=1&search_type=active_search`;
    const data = await fetchJSON(url, { headers });
    const results: SearchResult[] = [];
    const seen = new Set<string>();
    for (const section of data?.data?.data || []) {
      for (const item of section?.data || []) {
        const ai = item.app_info || {};
        const pkg = ai.package_name || "";
        if (!pkg || seen.has(pkg)) continue;
        seen.add(pkg);
        results.push({
          package: pkg,
          name: ai.title || pkg,
          version: ai.version_name || "",
          source: "apkpure",
          icon_url: ai.icon || "",
          description: ai.description_short || "",
        });
      }
    }
    return results;
  },

  async getInfo(pkg: string): Promise<AppInfo | null> {
    const detail = await apkpureDetail(pkg);
    if (!detail) return null;
    const asset = detail.asset || {};
    return {
      package: pkg,
      name: detail.title || pkg,
      version: detail.version_name || "",
      size: asset.size,
      size_formatted: formatSize(asset.size),
      source: "apkpure",
      icon_url: detail.icon || "",
      description: detail.description_short || "",
    };
  },

  async getVersions(pkg: string): Promise<VersionInfo[]> {
    const detail = await apkpureDetail(pkg);
    if (!detail) return [];
    const versions: VersionInfo[] = [];
    const ver = detail.version_name || "";
    const vc = detail.version_code || "";
    const asset = detail.asset || {};
    if (ver || vc) {
      versions.push({
        version_code: String(vc || ver),
        version_name: ver || String(vc),
        size: asset.size,
        size_formatted: formatSize(asset.size),
        source: "apkpure",
      });
    }
    for (const item of detail.version_history || []) {
      const vn = item.version_name || "";
      const vcode = item.version_code || "";
      if (vn || vcode) {
        versions.push({
          version_code: String(vcode || vn),
          version_name: vn || String(vcode),
          source: "apkpure",
        });
      }
    }
    return versions;
  },

  async getDownloadUrl(pkg: string): Promise<DownloadInfo> {
    const detail = await apkpureDetail(pkg);
    if (!detail) throw new Error(`Package not found: ${pkg}`);
    const asset = detail.asset || {};
    const dlUrl = asset.url || "";
    if (!dlUrl) throw new Error(`No download URL for: ${pkg}`);
    const ver = detail.version_name || "latest";
    const fileType = (asset.type || "APK").toLowerCase();
    return {
      url: dlUrl,
      filename: `${pkg}-${ver}.${fileType}`,
      version: ver,
      source: "apkpure",
    };
  },
};

// ---------------------------------------------------------------------------
// Uptodown Source
// ---------------------------------------------------------------------------

const UTD_API = "https://www.uptodown.app/eapi";
const UTD_SECRET = "$(=a%\u00b7!45J&S";

function utdApiKey(): string {
  const now = Date.now();
  const d = new Date(now);
  const offsetMs = d.getUTCMinutes() * 60000 + d.getUTCSeconds() * 1000 + d.getUTCMilliseconds();
  const hourEpoch = Math.floor((now - offsetMs) / 1000);
  return crypto.createHash("sha256").update(UTD_SECRET + String(hourEpoch)).digest("hex");
}

async function utdApiGet(path: string): Promise<any> {
  return fetchJSON(`${UTD_API}${path}`, {
    headers: {
      "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 14; SM-G955F Build/AP2A.240805.005)",
      Identificador: "Uptodown_Android",
      "Identificador-Version": "707",
      APIKEY: utdApiKey(),
    },
  });
}

async function utdResolveAppId(pkg: string): Promise<string | null> {
  try {
    const data = await utdApiGet(`/apps/byPackagename/${pkg}`);
    const inner = data.data || data;
    return String(inner.appID || inner.id || "") || null;
  } catch {
    return null;
  }
}

async function utdGetDetail(appId: string): Promise<any | null> {
  try {
    const data = await utdApiGet(`/v3/apps/${appId}/device/0?countryIsoCode=US`);
    return data.data || data;
  } catch {
    return null;
  }
}

export const uptodown = {
  name: "uptodown",

  async search(query: string): Promise<SearchResult[]> {
    const data = await utdApiGet(`/v2/apps/search/${encodeURIComponent(query)}?page[limit]=30&page[offset]=0`);
    const items = data?.data?.results || [];
    return items.map((item: any) => ({
      package: item.packageName || item.packagename || "",
      name: item.name || item.packageName || "",
      version: "",
      source: "uptodown",
    }));
  },

  async getInfo(pkg: string): Promise<AppInfo | null> {
    const appId = await utdResolveAppId(pkg);
    if (!appId) return null;
    const detail = await utdGetDetail(appId);
    if (!detail) return null;
    return {
      package: detail.packagename || pkg,
      name: detail.name || pkg,
      version: detail.lastVersion || String(detail.lastVersionCode || ""),
      source: "uptodown",
      description: detail.shortDescription || "",
      icon_url: detail.icon || "",
      size: undefined,
      size_formatted: "Unknown",
    };
  },

  async getVersions(pkg: string): Promise<VersionInfo[]> {
    const appId = await utdResolveAppId(pkg);
    if (!appId) return [];
    const detail = await utdGetDetail(appId);
    if (!detail) return [];
    const ver = detail.lastVersion || "";
    const vc = detail.lastVersionCode || "";
    if (!ver && !vc) return [];
    return [{ version_code: String(vc || ver), version_name: ver || String(vc), source: "uptodown" }];
  },

  async getDownloadUrl(pkg: string): Promise<DownloadInfo> {
    const appId = await utdResolveAppId(pkg);
    if (!appId) throw new Error(`App not found: ${pkg}`);
    const detail = await utdGetDetail(appId);
    if (!detail) throw new Error(`Cannot get details for: ${pkg}`);
    const realPkg = detail.packagename || pkg;
    const ver = detail.lastVersion || String(detail.lastVersionCode || "");
    let slug = "";
    const urlShare = detail.urlShare || "";
    if (urlShare) {
      const m = urlShare.match(/https:\/\/([^.]+)\.uptodown\.com/);
      if (m) slug = m[1];
    }
    if (!slug) throw new Error(`Cannot determine slug for: ${pkg}`);
    const browserUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36";
    const referer = `https://${slug}.en.uptodown.com/`;
    const text = await fetchText(`https://${slug}.en.uptodown.com/android/download`, {
      headers: { "User-Agent": browserUA, Referer: referer },
    });
    const $ = cheerio.load(text);
    const btn = $("#detail-download-button");
    const dataUrl = btn.attr("data-url");
    if (!dataUrl) throw new Error(`No download button for: ${pkg}`);
    return {
      url: `https://dw.uptodown.com/dwn/${dataUrl}`,
      filename: ver ? `${realPkg}-${ver}.apk` : `${realPkg}.apk`,
      version: ver,
      source: "uptodown",
      headers: { Referer: referer, "User-Agent": browserUA },
    };
  },
};

// ---------------------------------------------------------------------------
// Source manager
// ---------------------------------------------------------------------------

export const SOURCES = { apkpure, apk20, fdroid, uptodown };
export const SOURCE_PRIORITY = ["apkpure", "apk20", "fdroid", "uptodown"] as const;
export type SourceName = (typeof SOURCE_PRIORITY)[number];
