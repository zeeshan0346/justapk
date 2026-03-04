import { NextRequest, NextResponse } from "next/server";
import { SOURCES, SOURCE_PRIORITY } from "@/lib/sources";
import { isXapk, extractBaseApk } from "@/lib/xapk";

export const maxDuration = 120;

export async function GET(req: NextRequest, { params }: { params: Promise<{ package: string[] }> }) {
  const { package: pkgParts } = await params;
  const pkg = pkgParts.join("/");
  const source = req.nextUrl.searchParams.get("source");
  const version = req.nextUrl.searchParams.get("version") || undefined;
  const convertXapk = req.nextUrl.searchParams.get("convert_xapk") !== "false";

  // Get download URL
  let dlInfo: any = null;
  const errors: string[] = [];

  if (source && source in SOURCES) {
    try {
      const src = SOURCES[source as keyof typeof SOURCES];
      dlInfo = await src.getDownloadUrl(pkg, version);
    } catch (e: any) {
      errors.push(`${source}: ${e.message}`);
    }
  } else {
    for (const name of SOURCE_PRIORITY) {
      try {
        const src = SOURCES[name];
        dlInfo = await src.getDownloadUrl(pkg, version);
        break;
      } catch (e: any) {
        errors.push(`${name}: ${e.message}`);
      }
    }
  }

  if (!dlInfo) {
    return NextResponse.json({ error: `All sources failed: ${errors.join("; ")}` }, { status: 404 });
  }

  // Download the file
  let fileData: Buffer;
  let originalFilename = dlInfo.filename || `${pkg}.apk`;

  try {
    const dlHeaders: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      ...dlInfo.headers,
    };
    const resp = await fetch(dlInfo.url, {
      headers: dlHeaders,
      signal: AbortSignal.timeout(120_000),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    fileData = Buffer.from(await resp.arrayBuffer());
  } catch (e: any) {
    return NextResponse.json({ error: `Download failed: ${e.message}` }, { status: 502 });
  }

  // Detect and convert XAPK if needed
  let fileType = "apk";
  let wasConverted = false;

  if (await isXapk(fileData)) {
    fileType = "xapk";
    if (convertXapk) {
      try {
        const result = await extractBaseApk(fileData);
        fileData = result.apk;
        originalFilename = result.filename;
        wasConverted = true;
      } catch (e: any) {
        return NextResponse.json({ error: `XAPK extraction failed: ${e.message}` }, { status: 500 });
      }
    } else {
      if (!originalFilename.endsWith(".xapk")) {
        originalFilename = originalFilename.replace(/\.[^.]+$/, ".xapk");
      }
    }
  }

  if (wasConverted && !originalFilename.endsWith(".apk")) {
    originalFilename = originalFilename.replace(/\.[^.]+$/, ".apk");
  }

  const mime = fileType === "apk" || wasConverted
    ? "application/vnd.android.package-archive"
    : "application/octet-stream";

  return new NextResponse(new Uint8Array(fileData) as unknown as BodyInit, {
    headers: {
      "Content-Type": mime,
      "Content-Disposition": `attachment; filename="${originalFilename}"`,
      "Content-Length": String(fileData.length),
      "X-Original-Type": fileType,
      "X-Was-Converted": String(wasConverted),
      "X-Filename": originalFilename,
    },
  });
}
