import { NextRequest, NextResponse } from "next/server";
import { getJobs, getCompanies, getStats } from "@/lib/query";
import type { JobFilters } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;

    if (sp.get("meta") === "companies") {
      const companies = await getCompanies();
      return NextResponse.json(
        { companies },
        { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
      );
    }

    if (sp.get("meta") === "stats") {
      const stats = await getStats();
      return NextResponse.json(
        stats,
        { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
      );
    }

    const filters: JobFilters = {};
    if (sp.has("search")) filters.search = sp.get("search")!;
    if (sp.has("company")) filters.company = sp.get("company")!;
    if (sp.has("remote")) filters.remote = sp.get("remote") === "true";
    if (sp.has("minScore"))
      filters.minScore = parseInt(sp.get("minScore")!, 10);
    if (sp.has("employmentType"))
      filters.employmentType = sp.get("employmentType")!;
    if (sp.has("page")) filters.page = parseInt(sp.get("page")!, 10);
    if (sp.has("limit")) filters.limit = parseInt(sp.get("limit")!, 10);

    const result = await getJobs(filters);
    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
