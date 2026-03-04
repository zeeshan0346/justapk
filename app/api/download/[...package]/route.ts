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
      const result = await src.getDownloadUrl(pkg);
      return NextResponse.json({ download: result });
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
  }

  const errors: string[] = [];
  for (const name of SOURCE_PRIORITY) {
    try {
      const src = SOURCES[name];
      const result = await src.getDownloadUrl(pkg);
      return NextResponse.json({ download: result });
    } catch (e: any) {
      errors.push(`${name}: ${e.message}`);
    }
  }

  return NextResponse.json({ error: `All sources failed: ${errors.join("; ")}` }, { status: 404 });
}
