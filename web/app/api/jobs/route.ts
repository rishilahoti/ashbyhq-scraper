import { NextRequest, NextResponse } from "next/server";
import { getJobs, getCompanies, getStats, getDepartments, getLocations } from "@/lib/query";
import { POSITIVE_TAG_OPTIONS } from "@/lib/scoring";
import type { JobFilters } from "@/lib/types";

const EMPLOYMENT_TYPES = new Set([
  "FullTime",
  "Intern",
  "Contract",
  "PartTime",
]);
const SORT_OPTIONS = new Set(["score", "newest", "oldest"]);
const MAX_SEARCH_LEN = 200;
const MAX_PAGE = 1000;
const MAX_LIMIT = 100;

function safeInt(value: string | null, def: number, max: number): number {
  if (value == null || value === "") return def;
  const n = parseInt(value, 10);
  if (!Number.isFinite(n) || n < 1) return def;
  return Math.min(n, max);
}

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

    if (sp.get("meta") === "departments") {
      const departments = await getDepartments();
      return NextResponse.json(
        { departments },
        { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
      );
    }

    if (sp.get("meta") === "locations") {
      const locations = await getLocations();
      return NextResponse.json(
        { locations },
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

    const searchRaw = sp.get("search");
    if (searchRaw != null) {
      const search = searchRaw.slice(0, MAX_SEARCH_LEN).trim();
      if (search) filters.search = search;
    }

    const companyRaw = sp.get("company");
    if (companyRaw) {
      const companies = await getCompanies();
      if (companies.includes(companyRaw)) filters.company = companyRaw;
    }

    if (sp.get("remote") === "true") filters.remote = true;

    filters.minScore = safeInt(sp.get("minScore"), 0, 1000);
    if (filters.minScore === 0) delete filters.minScore;

    const employmentType = sp.get("employmentType");
    if (employmentType && EMPLOYMENT_TYPES.has(employmentType)) {
      filters.employmentType = employmentType;
    }

    const department = sp.get("department")?.trim();
    if (department) filters.department = department.slice(0, 100);

    const team = sp.get("team")?.trim();
    if (team) filters.team = team.slice(0, 100);

    const locationRaw = sp.get("location");
    if (locationRaw) {
      const locations = await getLocations();
      if (locations.includes(locationRaw)) filters.location = locationRaw;
    }

    const tagsParam = sp.get("tags");
    if (tagsParam) {
      const tagSet = new Set(POSITIVE_TAG_OPTIONS.map((t) => t.toLowerCase()));
      const tags = tagsParam
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t && tagSet.has(t));
      if (tags.length > 0) filters.tags = [...new Set(tags)];
    }

    const sort = sp.get("sort");
    if (sort && SORT_OPTIONS.has(sort)) {
      filters.sort = sort as JobFilters["sort"];
    }

    filters.page = safeInt(sp.get("page"), 1, MAX_PAGE);
    const limit = safeInt(sp.get("limit"), 40, MAX_LIMIT);
    filters.limit = limit;

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
