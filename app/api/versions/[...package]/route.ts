import { NextRequest, NextResponse } from "next/server";
import { SOURCES, SOURCE_PRIORITY } from "@/lib/sources";

export const maxDuration = 60;

export async function GET(req: NextRequest, { params }: { params: Promise<{ package: string[] }> }) {
  const { package: pkgParts } = await params;
  const pkg = pkgParts.join("/");
  const source = req.nextUrl.searchParams.get("source");

  const allVersions: any[] = [];

  if (source && source in SOURCES) {
    try {
      const src = SOURCES[source as keyof typeof SOURCES];
      const vlist = await src.getVersions(pkg);
      allVersions.push(...vlist);
    } catch {}
  } else {
    const promises = SOURCE_PRIORITY.map(async (name) => {
      try {
        const src = SOURCES[name];
        const vlist = await src.getVersions(pkg);
        return vlist.map((v) => ({ ...v, source: name }));
      } catch {
        return [];
      }
    });
    const results = await Promise.allSettled(promises);
    for (const r of results) {
      if (r.status === "fulfilled") allVersions.push(...r.value);
    }
  }

  return NextResponse.json({ versions: allVersions, package: pkg });
}
