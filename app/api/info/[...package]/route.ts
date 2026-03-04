import { NextRequest, NextResponse } from "next/server";
import { SOURCES, SOURCE_PRIORITY } from "@/lib/sources";

export const maxDuration = 60;

export async function GET(req: NextRequest, { params }: { params: Promise<{ package: string[] }> }) {
  const { package: pkgParts } = await params;
  const pkg = pkgParts.join("/");
  const source = req.nextUrl.searchParams.get("source");

  if (source && source in SOURCES) {
    try {
      const src = SOURCES[source as keyof typeof SOURCES];
      const info = await src.getInfo(pkg);
      if (info) return NextResponse.json({ info });
    } catch {}
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }

  for (const name of SOURCE_PRIORITY) {
    try {
      const src = SOURCES[name];
      const info = await src.getInfo(pkg);
      if (info) return NextResponse.json({ info });
    } catch {
      continue;
    }
  }

  return NextResponse.json({ error: "App not found" }, { status: 404 });
}
