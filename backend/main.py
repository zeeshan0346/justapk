from __future__ import annotations

import hashlib
import json
import re
import sys
import tempfile
import time
import uuid
from pathlib import Path

import shutil
import zipfile

import fastapi
import fastapi.middleware.cors
import fastapi.responses
import requests
from bs4 import BeautifulSoup

app = fastapi.FastAPI()

app.add_middleware(
    fastapi.middleware.cors.CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Shared utilities
# ---------------------------------------------------------------------------

UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
)
HTTP_TIMEOUT = 30


def _session() -> requests.Session:
    s = requests.Session()
    s.headers.update({"User-Agent": UA, "Accept-Language": "en-US,en;q=0.9"})
    return s


def _extract_package_from_play_url(url: str) -> str | None:
    """Extract package name from a Google Play URL."""
    m = re.search(r"id=([a-zA-Z0-9_.]+)", url)
    return m.group(1) if m else None


def _parse_size(size_str: str) -> int | None:
    m = re.match(r"([\d.]+)\s*(MB|GB|KB)", size_str, re.IGNORECASE)
    if not m:
        return None
    val = float(m.group(1))
    unit = m.group(2).upper()
    multipliers = {"GB": 1024**3, "MB": 1024**2, "KB": 1024}
    return int(val * multipliers.get(unit, 1))


def _format_size(size_bytes: int | None) -> str:
    if size_bytes is None:
        return "Unknown"
    if size_bytes >= 1024**3:
        return f"{size_bytes / 1024**3:.1f} GB"
    if size_bytes >= 1024**2:
        return f"{size_bytes / 1024**2:.1f} MB"
    if size_bytes >= 1024:
        return f"{size_bytes / 1024:.1f} KB"
    return f"{size_bytes} B"


# ---------------------------------------------------------------------------
# APK20 Source
# ---------------------------------------------------------------------------

class APK20:
    name = "apk20"
    BASE = "https://www.apk20.com"
    FILE_SERVER = "https://srv01.apk20.com"

    def __init__(self):
        self.session = _session()

    def _parse_rsc_apps(self, text: str) -> list[dict]:
        results = []
        seen = set()
        for m in re.finditer(r'self\.__next_f\.push\(\[1,"(.+?)"\]\)', text):
            chunk = m.group(1).replace('\\"', '"').replace("\\n", "\n").replace("\\\\", "\\")
            for obj_m in re.finditer(r'\{"packageName":"[^"]+?"[^}]*\}', chunk):
                try:
                    item = json.loads(obj_m.group(0))
                    pkg = item.get("packageName", "")
                    if pkg and pkg not in seen:
                        seen.add(pkg)
                        results.append(item)
                except (json.JSONDecodeError, ValueError):
                    pass
        return results

    def search(self, query: str) -> list[dict]:
        resp = self.session.get(f"{self.BASE}/search/{query}", timeout=HTTP_TIMEOUT)
        resp.raise_for_status()
        apps = self._parse_rsc_apps(resp.text)
        return [
            {
                "package": app.get("packageName", ""),
                "name": app.get("title", app.get("packageName", "")),
                "version": "",
                "source": self.name,
            }
            for app in apps
        ]

    def get_info(self, package: str) -> dict | None:
        resp = self.session.get(f"{self.BASE}/apk/{package}", timeout=HTTP_TIMEOUT)
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "lxml")
        name = package
        version = ""
        size = None
        name_el = soup.select_one("[itemprop='name']")
        if name_el:
            name = name_el.get("content", "") or name_el.get_text(strip=True) or name
        ver_el = soup.select_one("[itemprop='softwareVersion']")
        if ver_el:
            version = ver_el.get("content", "") or ver_el.get_text(strip=True)
        size_el = soup.select_one("[itemprop='fileSize']")
        if size_el:
            size_text = size_el.get("content", "") or size_el.get_text(strip=True)
            size = _parse_size(size_text)
        icon_el = soup.select_one("img[itemprop='image']")
        icon_url = icon_el.get("src", "") if icon_el else None
        return {
            "package": package,
            "name": name,
            "version": version,
            "size": size,
            "size_formatted": _format_size(size),
            "source": self.name,
            "icon_url": icon_url,
        }

    def get_download_url(self, package: str) -> dict:
        resp = self.session.get(f"{self.BASE}/apk/{package}", timeout=HTTP_TIMEOUT)
        if resp.status_code == 404:
            raise RuntimeError(f"Package not found: {package}")
        resp.raise_for_status()

        m = re.search(rf'/apk/{re.escape(package)}/download/(\d+)', resp.text)
        if not m:
            codes = re.findall(r'"versionCode":\s*(\d+)', resp.text)
            if not codes:
                raise RuntimeError(f"No versions found for: {package}")
            version_code = codes[0]
        else:
            version_code = m.group(1)

        soup = BeautifulSoup(resp.text, "lxml")
        name = package
        version = ""
        name_el = soup.select_one("[itemprop='name']")
        if name_el:
            name = name_el.get("content", "") or name_el.get_text(strip=True) or name
        ver_el = soup.select_one("[itemprop='softwareVersion']")
        if ver_el:
            version = ver_el.get("content", "") or ver_el.get_text(strip=True)

        verify_resp = self.session.get(
            f"{self.BASE}/api/verify/{package}/{version_code}", timeout=HTTP_TIMEOUT
        )
        verify_resp.raise_for_status()
        verify_data = verify_resp.json()

        if not verify_data.get("success"):
            raise RuntimeError(f"Verify failed: {verify_data.get('message', 'unknown')}")

        filename = verify_data["filename"]
        dl_url = f"{self.FILE_SERVER}/{filename}"
        ext = "." + filename.rsplit(".", 1)[-1] if "." in filename else ".apk"

        return {
            "url": dl_url,
            "filename": f"{package}-{version}{ext}",
            "version": version,
            "source": self.name,
        }


# ---------------------------------------------------------------------------
# F-Droid Source
# ---------------------------------------------------------------------------

class FDroid:
    name = "fdroid"
    API_BASE = "https://f-droid.org/api/v1"
    REPO_BASE = "https://f-droid.org/repo"
    SEARCH_URL = "https://search.f-droid.org/"

    def __init__(self):
        self.session = _session()

    def search(self, query: str) -> list[dict]:
        resp = self.session.get(self.SEARCH_URL, params={"q": query}, timeout=HTTP_TIMEOUT)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "lxml")
        results = []
        for item in soup.select("a[href*='/packages/']"):
            href = item.get("href", "")
            m = re.search(r"/packages/([^/]+)/?", href)
            if not m:
                continue
            pkg = m.group(1)
            name_el = item.select_one("h4.package-name, .package-name")
            name = name_el.get_text(strip=True) if name_el else pkg
            results.append({"package": pkg, "name": name, "version": "", "source": self.name})
        return results

    def get_info(self, package: str) -> dict | None:
        resp = self.session.get(f"{self.API_BASE}/packages/{package}", timeout=HTTP_TIMEOUT)
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        data = resp.json()
        packages = data.get("packages", [])
        latest = packages[0] if packages else {}
        return {
            "package": package,
            "name": package,
            "version": latest.get("versionName", ""),
            "size": latest.get("size"),
            "size_formatted": _format_size(latest.get("size")),
            "source": self.name,
            "icon_url": None,
        }

    def get_download_url(self, package: str) -> dict:
        resp = self.session.get(f"{self.API_BASE}/packages/{package}", timeout=HTTP_TIMEOUT)
        if resp.status_code == 404:
            raise RuntimeError(f"Package not found: {package}")
        resp.raise_for_status()
        data = resp.json()
        packages = data.get("packages", [])
        if not packages:
            raise RuntimeError(f"No versions for: {package}")
        version_code = data.get("suggestedVersionCode") or packages[0]["versionCode"]
        version_name = ""
        for pkg in packages:
            if pkg["versionCode"] == version_code:
                version_name = pkg.get("versionName", str(version_code))
                break
        url = f"{self.REPO_BASE}/{package}_{version_code}.apk"
        return {
            "url": url,
            "filename": f"{package}-{version_name}.apk",
            "version": version_name,
            "source": self.name,
        }


# ---------------------------------------------------------------------------
# APKPure Source (mobile API)
# ---------------------------------------------------------------------------

_APKPURE_API_BASE = "https://tapi.pureapk.com/v3"
_APKPURE_AUTH_KEY = "qNKrYmW8SSUqJ73k3P2yfMxRTo3sJTR"
_APKPURE_SIGN_SECRET = "d33cb23fd17fda8ea38be504929b77ef"


def _apkpure_headers() -> dict[str, str]:
    device_uuid = str(uuid.uuid4())
    project_a = json.dumps({
        "device_info": {
            "abis": ["arm64-v8a", "armeabi-v7a"],
            "android_id": hashlib.md5(device_uuid.encode()).hexdigest()[:16],
            "brand": "samsung", "country": "United States",
            "country_code": "US", "imei": "", "language": "en-US",
            "manufacturer": "samsung", "mode": "SM-G955F",
            "os_ver": "34", "os_ver_name": "14", "platform": 1,
            "product": "dream2lte", "screen_height": 2888, "screen_width": 1440,
        },
        "host_app_info": {
            "build_no": "873", "channel": "", "md5": "",
            "pkg_name": "com.apkpure.aegon", "sdk_ver": "3.20.6309",
            "version_code": 3206397, "version_name": "3.20.6309",
        },
        "net_info": {
            "carrier_code": 0, "ipv4": "", "ipv6": "", "mac_address": "",
            "net_type": 1, "use_vpn": False, "wifi_bssid": "", "wifi_ssid": "",
        },
        "user_info": {
            "auth_key": _APKPURE_AUTH_KEY, "country": "United States",
            "country_code": "US", "guid": "", "language": "en-US",
            "qimei": "", "qimei_token": "", "user_id": "",
            "uuid": device_uuid,
        },
    }, separators=(",", ":"))
    return {
        "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 14; SM-G955F Build/AP2A.240805.005); APKPure/3.20.6309 (Aegon)",
        "Ual-Access-Businessid": "projecta",
        "Ual-Access-ProjectA": project_a,
        "Ual-Access-Sequence": str(uuid.uuid4()),
        "Ual-Access-Signature": "",
        "Ual-Access-Nonce": "0",
        "Ual-Access-Timestamp": "0",
        "Accept-Encoding": "gzip",
    }


def _apkpure_sign_body(headers: dict[str, str], body: str) -> None:
    import random
    ts = str(int(time.time() * 1000))
    nonce = str(random.randint(10000000, 99999999))
    sig = hashlib.md5((body + ts + _APKPURE_SIGN_SECRET + nonce).encode()).hexdigest()
    headers["Ual-Access-Signature"] = sig
    headers["Ual-Access-Nonce"] = nonce
    headers["Ual-Access-Timestamp"] = ts
    headers["Content-Type"] = "application/json; charset=utf-8"


class APKPure:
    name = "apkpure"

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update(_apkpure_headers())

    def search(self, query: str) -> list[dict]:
        resp = self.session.get(
            f"{_APKPURE_API_BASE}/search_query_new",
            params={"hl": "en-US", "key": query, "page": "1", "search_type": "active_search"},
            timeout=HTTP_TIMEOUT,
        )
        resp.raise_for_status()
        data = resp.json()
        results = []
        seen = set()
        for section in data.get("data", {}).get("data", []):
            for item in section.get("data", []):
                ai = item.get("app_info", {})
                pkg = ai.get("package_name", "")
                if not pkg or pkg in seen:
                    continue
                seen.add(pkg)
                results.append({
                    "package": pkg,
                    "name": ai.get("title", pkg),
                    "version": ai.get("version_name", ""),
                    "source": self.name,
                    "icon_url": ai.get("icon", ""),
                    "description": ai.get("description_short", ""),
                })
        return results

    def _get_detail(self, package: str) -> dict | None:
        body = json.dumps({"package_name": package, "hl": "en-US"})
        headers = dict(self.session.headers)
        _apkpure_sign_body(headers, body)
        resp = self.session.post(
            f"{_APKPURE_API_BASE}/get_app_detail",
            data=body, headers=headers, timeout=HTTP_TIMEOUT,
        )
        if resp.status_code != 200:
            return None
        data = resp.json()
        return data.get("app_detail")

    def get_info(self, package: str) -> dict | None:
        detail = self._get_detail(package)
        if not detail:
            return None
        asset = detail.get("asset", {})
        size = asset.get("size")
        return {
            "package": package,
            "name": detail.get("title", package),
            "version": detail.get("version_name", ""),
            "size": size,
            "size_formatted": _format_size(size),
            "source": self.name,
            "icon_url": detail.get("icon", ""),
            "description": detail.get("description_short", ""),
        }

    def get_download_url(self, package: str) -> dict:
        detail = self._get_detail(package)
        if not detail:
            raise RuntimeError(f"Package not found: {package}")
        asset = detail.get("asset", {})
        dl_url = asset.get("url", "")
        if not dl_url:
            raise RuntimeError(f"No download URL for: {package}")
        ver = detail.get("version_name", "") or "latest"
        file_type = asset.get("type", "APK").lower()
        return {
            "url": dl_url,
            "filename": f"{package}-{ver}.{file_type}",
            "version": ver,
            "source": self.name,
        }


# ---------------------------------------------------------------------------
# Uptodown Source
# ---------------------------------------------------------------------------

_UTD_API_BASE = "https://www.uptodown.app/eapi"
_UTD_SECRET = "$(=a%\u00b7!45J&S"


def _utd_apikey() -> str:
    from datetime import UTC, datetime
    now = datetime.now(UTC)
    epoch_ms = int(now.timestamp() * 1000)
    offset_ms = now.minute * 60000 + now.second * 1000 + now.microsecond // 1000
    hour_epoch = (epoch_ms - offset_ms) // 1000
    raw = _UTD_SECRET + str(hour_epoch)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


class Uptodown:
    name = "uptodown"

    def __init__(self):
        self.session = requests.Session()

    def _api_get(self, path: str) -> requests.Response:
        return self.session.get(
            f"{_UTD_API_BASE}{path}",
            headers={
                "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 14; SM-G955F Build/AP2A.240805.005)",
                "Identificador": "Uptodown_Android",
                "Identificador-Version": "707",
                "APIKEY": _utd_apikey(),
            },
            timeout=30,
        )

    def search(self, query: str) -> list[dict]:
        resp = self._api_get(f"/v2/apps/search/{query}?page[limit]=30&page[offset]=0")
        resp.raise_for_status()
        data = resp.json()
        items = data.get("data", {}).get("results", [])
        results = []
        for item in items:
            pkg = item.get("packageName") or item.get("packagename", "")
            name = item.get("name", pkg)
            results.append({"package": pkg, "name": name, "version": "", "source": self.name})
        return results

    def _resolve_app_id(self, package: str) -> str | None:
        resp = self._api_get(f"/apps/byPackagename/{package}")
        if resp.status_code == 200:
            data = resp.json()
            inner = data.get("data", data)
            app_id = inner.get("appID") or inner.get("id")
            if app_id:
                return str(app_id)
        return None

    def _get_detail(self, app_id: str) -> dict | None:
        resp = self._api_get(f"/v3/apps/{app_id}/device/0?countryIsoCode=US")
        if resp.status_code != 200:
            return None
        data = resp.json()
        return data.get("data", data)

    def get_info(self, package: str) -> dict | None:
        app_id = self._resolve_app_id(package)
        if not app_id:
            return None
        detail = self._get_detail(app_id)
        if not detail:
            return None
        return {
            "package": detail.get("packagename") or package,
            "name": detail.get("name", package),
            "version": detail.get("lastVersion", "") or str(detail.get("lastVersionCode", "")),
            "source": self.name,
            "description": detail.get("shortDescription", ""),
            "icon_url": detail.get("icon", ""),
            "size": None,
            "size_formatted": "Unknown",
        }

    def get_download_url(self, package: str) -> dict:
        app_id = self._resolve_app_id(package)
        if not app_id:
            raise RuntimeError(f"App not found: {package}")
        detail = self._get_detail(app_id)
        if not detail:
            raise RuntimeError(f"Cannot get details for: {package}")
        real_pkg = detail.get("packagename") or package
        ver = detail.get("lastVersion", "") or str(detail.get("lastVersionCode", ""))
        slug = ""
        url_share = detail.get("urlShare", "")
        if url_share:
            m = re.match(r"https://([^.]+)\.uptodown\.com", url_share)
            if m:
                slug = m.group(1)
        if not slug:
            raise RuntimeError(f"Cannot determine slug for: {package}")
        browser_ua = (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36"
        )
        referer = f"https://{slug}.en.uptodown.com/"
        resp = self.session.get(
            f"https://{slug}.en.uptodown.com/android/download",
            headers={"User-Agent": browser_ua, "Referer": referer},
            timeout=30,
        )
        if resp.status_code != 200:
            raise RuntimeError(f"Cannot access download page for: {package}")
        soup = BeautifulSoup(resp.text, "lxml")
        btn = soup.select_one("#detail-download-button")
        if not btn or not btn.get("data-url"):
            raise RuntimeError(f"No download button for: {package}")
        dl_url = f"https://dw.uptodown.com/dwn/{btn['data-url']}"
        return {
            "url": dl_url,
            "filename": f"{real_pkg}-{ver}.apk" if ver else f"{real_pkg}.apk",
            "version": ver,
            "source": self.name,
            "headers": {"Referer": referer, "User-Agent": browser_ua},
        }


# ---------------------------------------------------------------------------
# XAPK → APK extraction (for bug bounty / source code analysis)
# ---------------------------------------------------------------------------

def _extract_base_apk_from_xapk(xapk_bytes: bytes) -> tuple[bytes, str]:
    """Extract the base APK from an XAPK bundle (ZIP archive).

    XAPK files are ZIP archives containing:
      - manifest.json (package info)
      - base.apk (the main APK we want)
      - config.*.apk (split APKs for density/arch/locale)

    For bug bounty analysis, we only need base.apk since it contains
    all the app code, AndroidManifest.xml, and main resources.

    Returns (apk_bytes, filename).
    """
    import io

    with zipfile.ZipFile(io.BytesIO(xapk_bytes), "r") as zf:
        names = zf.namelist()

        # Read manifest for naming
        package_name = "app"
        version = ""
        if "manifest.json" in names:
            try:
                manifest = json.loads(zf.read("manifest.json"))
                package_name = manifest.get("package_name", "app")
                version = manifest.get("version_name", "")
            except (json.JSONDecodeError, KeyError):
                pass

        # Find base APK - prioritize exact "base.apk" match
        base_apk_name = None

        # 1. Look for base.apk in root
        if "base.apk" in names:
            base_apk_name = "base.apk"
        else:
            # 2. Look for base.apk in subdirectories
            for name in names:
                if name.endswith("/base.apk") or name.lower() == "base.apk":
                    base_apk_name = name
                    break

        if not base_apk_name:
            # 3. Look for any .apk file named after the package
            for name in names:
                if name.endswith(".apk") and package_name in name:
                    base_apk_name = name
                    break

        if not base_apk_name:
            # 4. Find the largest APK (likely the base)
            apk_files = [n for n in names if n.endswith(".apk")]
            if not apk_files:
                raise RuntimeError("No APK files found inside XAPK")
            base_apk_name = max(apk_files, key=lambda n: zf.getinfo(n).file_size)

        apk_data = zf.read(base_apk_name)
        filename = f"{package_name}-{version}.apk" if version else f"{package_name}.apk"
        return apk_data, filename


def _is_xapk(data: bytes) -> bool:
    """Check if the downloaded data is an XAPK (ZIP with APKs inside)."""
    if not data[:4] == b"PK\x03\x04":  # ZIP magic bytes
        return False
    try:
        import io
        with zipfile.ZipFile(io.BytesIO(data), "r") as zf:
            names = zf.namelist()
            # XAPK contains .apk files and usually manifest.json
            has_apks = any(n.endswith(".apk") for n in names)
            has_manifest = "manifest.json" in names
            return has_apks and (has_manifest or sum(1 for n in names if n.endswith(".apk")) > 1)
    except zipfile.BadZipFile:
        return False


def _is_valid_apk(data: bytes) -> bool:
    """Check if bytes are a valid APK (ZIP with AndroidManifest.xml)."""
    if not data[:4] == b"PK\x03\x04":
        return False
    try:
        import io
        with zipfile.ZipFile(io.BytesIO(data), "r") as zf:
            return "AndroidManifest.xml" in zf.namelist()
    except zipfile.BadZipFile:
        return False


# ---------------------------------------------------------------------------
# Source manager
# ---------------------------------------------------------------------------

SOURCES = {
    "apkpure": APKPure,
    "apk20": APK20,
    "fdroid": FDroid,
    "uptodown": Uptodown,
}
SOURCE_PRIORITY = ["apkpure", "apk20", "fdroid", "uptodown"]


# ---------------------------------------------------------------------------
# API Routes
# ---------------------------------------------------------------------------

@app.get("/api/health")
async def health():
    return {"status": "ok", "sources": SOURCE_PRIORITY}


@app.get("/api/search")
async def search(q: str, source: str | None = None):
    """Search for apps by name or package."""
    # Check if input is a Google Play URL
    pkg = _extract_package_from_play_url(q)
    if pkg:
        # Direct lookup by package name
        return await info(pkg, source)

    if source and source in SOURCES:
        try:
            src = SOURCES[source]()
            return {"results": src.search(q), "query": q}
        except Exception as e:
            raise fastapi.HTTPException(status_code=500, detail=str(e))

    all_results = []
    seen = set()
    for name in SOURCE_PRIORITY:
        try:
            src = SOURCES[name]()
            for r in src.search(q):
                key = r.get("package", "")
                if key and key not in seen:
                    seen.add(key)
                    all_results.append(r)
        except Exception:
            pass

    return {"results": all_results, "query": q}


@app.get("/api/info/{package:path}")
async def info(package: str, source: str | None = None):
    """Get app info by package name."""
    if source and source in SOURCES:
        try:
            src = SOURCES[source]()
            result = src.get_info(package)
            if result:
                return {"info": result}
        except Exception:
            pass
        raise fastapi.HTTPException(status_code=404, detail="App not found")

    for name in SOURCE_PRIORITY:
        try:
            src = SOURCES[name]()
            result = src.get_info(package)
            if result:
                return {"info": result}
        except Exception:
            continue
    raise fastapi.HTTPException(status_code=404, detail="App not found")


@app.get("/api/download/{package:path}")
async def download(package: str, source: str | None = None):
    """Get download URL for a package."""
    if source and source in SOURCES:
        try:
            src = SOURCES[source]()
            result = src.get_download_url(package)
            return {"download": result}
        except Exception as e:
            raise fastapi.HTTPException(status_code=500, detail=str(e))

    errors = []
    for name in SOURCE_PRIORITY:
        try:
            src = SOURCES[name]()
            result = src.get_download_url(package)
            return {"download": result}
        except Exception as e:
            errors.append(f"{name}: {e}")

    raise fastapi.HTTPException(
        status_code=404,
        detail=f"All sources failed: {'; '.join(errors)}"
    )


@app.get("/api/download-apk/{package:path}")
async def download_apk(package: str, source: str | None = None):
    """Download and return a pure APK file.

    If the source provides an XAPK (split bundle), this endpoint
    automatically extracts the base APK from it. This is what you
    want for bug bounty / source code analysis with tools like
    jadx, apktool, or MobSF.
    """
    # Get download URL from sources
    dl_info = None
    errors = []

    if source and source in SOURCES:
        try:
            src = SOURCES[source]()
            dl_info = src.get_download_url(package)
        except Exception as e:
            errors.append(f"{source}: {e}")
    else:
        for name in SOURCE_PRIORITY:
            try:
                src = SOURCES[name]()
                dl_info = src.get_download_url(package)
                break
            except Exception as e:
                errors.append(f"{name}: {e}")

    if not dl_info:
        raise fastapi.HTTPException(
            status_code=404,
            detail=f"All sources failed: {'; '.join(errors)}"
        )

    # Download the file
    try:
        dl_headers = dl_info.get("headers", {})
        dl_headers.setdefault("User-Agent", UA)
        resp = requests.get(
            dl_info["url"],
            headers=dl_headers,
            timeout=120,
            stream=True,
        )
        resp.raise_for_status()

        # Read entire content (needed for XAPK detection/extraction)
        file_data = resp.content
        original_filename = dl_info.get("filename", f"{package}.apk")

    except Exception as e:
        raise fastapi.HTTPException(
            status_code=502,
            detail=f"Download failed: {e}"
        )

    # Detect file type and convert if needed
    file_type = "apk"
    if _is_xapk(file_data):
        file_type = "xapk"
        try:
            file_data, extracted_name = _extract_base_apk_from_xapk(file_data)
            original_filename = extracted_name
        except Exception as e:
            raise fastapi.HTTPException(
                status_code=500,
                detail=f"XAPK extraction failed: {e}"
            )
    elif not _is_valid_apk(file_data):
        # Might be a regular APK that just doesn't validate - serve it anyway
        pass

    # Ensure filename ends with .apk
    if not original_filename.endswith(".apk"):
        original_filename = original_filename.rsplit(".", 1)[0] + ".apk"

    return fastapi.responses.Response(
        content=file_data,
        media_type="application/vnd.android.package-archive",
        headers={
            "Content-Disposition": f'attachment; filename="{original_filename}"',
            "Content-Length": str(len(file_data)),
            "X-Original-Type": file_type,
            "X-Filename": original_filename,
        },
    )


@app.get("/api/sources")
async def sources():
    return {"sources": [{"name": n, "priority": i + 1} for i, n in enumerate(SOURCE_PRIORITY)]}
