import { NextRequest, NextResponse } from "next/server";
import { SOURCES, SOURCE_PRIORITY, extractPackageFromPlayUrl } from "@/lib/sources";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  const source = req.nextUrl.searchParams.get("source");

  if (!q) {
    return NextResponse.json({ error: "Missing query parameter: q" }, { status: 400 });
  }

  // Check if input is a Google Play URL
  const pkg = extractPackageFromPlayUrl(q);
  if (pkg) {
    // Direct lookup
    for (const name of SOURCE_PRIORITY) {
      try {
        const src = SOURCES[name];
        const info = await src.getInfo(pkg);
        if (info) return NextResponse.json({ info, query: q });
      } catch {}
    }
    return NextResponse.json({ results: [], query: q });
  }

  if (source && source in SOURCES) {
    try {
      const src = SOURCES[source as keyof typeof SOURCES];
      const results = await src.search(q);
      return NextResponse.json({ results, query: q });
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
  }

  const allResults: any[] = [];
  const seen = new Set<string>();

  const promises = SOURCE_PRIORITY.map(async (name) => {
    try {
      const src = SOURCES[name];
      return await src.search(q);
    } catch {
      return [];
    }
  });

  const resultSets = await Promise.allSettled(promises);
  for (const r of resultSets) {
    if (r.status === "fulfilled") {
      for (const item of r.value) {
        if (item.package && !seen.has(item.package)) {
          seen.add(item.package);
          allResults.push(item);
        }
      }
    }
  }

  return NextResponse.json({ results: allResults, query: q });
}
