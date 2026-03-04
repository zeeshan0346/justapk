import JSZip from "jszip";

export async function isXapk(data: Buffer): Promise<boolean> {
  if (data[0] !== 0x50 || data[1] !== 0x4b || data[2] !== 0x03 || data[3] !== 0x04) return false;
  try {
    const zip = await JSZip.loadAsync(data);
    const names = Object.keys(zip.files);
    const hasApks = names.some((n) => n.endsWith(".apk"));
    const hasManifest = names.includes("manifest.json");
    return hasApks && (hasManifest || names.filter((n) => n.endsWith(".apk")).length > 1);
  } catch {
    return false;
  }
}

export async function extractBaseApk(data: Buffer): Promise<{ apk: Buffer; filename: string }> {
  const zip = await JSZip.loadAsync(data);
  const names = Object.keys(zip.files);

  let packageName = "app";
  let version = "";
  if (zip.files["manifest.json"]) {
    try {
      const manifestText = await zip.files["manifest.json"].async("string");
      const manifest = JSON.parse(manifestText);
      packageName = manifest.package_name || "app";
      version = manifest.version_name || "";
    } catch {}
  }

  let baseApkName: string | null = null;

  if (zip.files["base.apk"]) {
    baseApkName = "base.apk";
  } else {
    for (const name of names) {
      if (name.endsWith("/base.apk") || name.toLowerCase() === "base.apk") {
        baseApkName = name;
        break;
      }
    }
  }

  if (!baseApkName) {
    for (const name of names) {
      if (name.endsWith(".apk") && name.includes(packageName)) {
        baseApkName = name;
        break;
      }
    }
  }

  if (!baseApkName) {
    const apkFiles = names.filter((n) => n.endsWith(".apk"));
    if (!apkFiles.length) throw new Error("No APK files found inside XAPK");
    let largest = apkFiles[0];
    let largestSize = 0;
    for (const name of apkFiles) {
      const info = zip.files[name];
      if (info && !info.dir) {
        const content = await info.async("uint8array");
        if (content.length > largestSize) {
          largestSize = content.length;
          largest = name;
        }
      }
    }
    baseApkName = largest;
  }

  const apkData = await zip.files[baseApkName].async("nodebuffer");
  const filename = version ? `${packageName}-${version}.apk` : `${packageName}.apk`;
  return { apk: apkData, filename };
}
